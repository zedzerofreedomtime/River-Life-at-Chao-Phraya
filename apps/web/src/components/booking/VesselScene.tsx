import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createVessel,
  DECK_HEIGHT,
  disposeVessel,
  tablePosition,
} from "./vesselModel";
import { PreviewTableButton } from "./PreviewDeckMap";
import {
  previewTables,
  type PreviewDeck,
  type PreviewTable,
} from "../../data/tablePreview";
import type { Language } from "../../data/i18n";

type Props = {
  deck: PreviewDeck;
  tables: PreviewTable[];
  selected: string[];
  onSelect: (id: string) => void;
  language: Language;
  topView: boolean;
  zoom: number;
  resetKey: number;
  onUnavailable: () => void;
};
type SceneUpdate = (props: Props) => void;

export default function VesselScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const update = useRef<SceneUpdate>(() => undefined);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const host = mount.current;
    if (!host || !overlay.current) return;
    const labels: HTMLDivElement = overlay.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 200);
    camera.position.set(24, 29, 25);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.enableZoom = false; // Page wheel / pinch must never become trapped.
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minPolarAngle = 0.03;
    controls.maxPolarAngle = Math.PI * 0.41;
    controls.rotateSpeed = 0.6;
    renderer.domElement.style.touchAction = "pan-y";
    scene.add(new THREE.HemisphereLight("#d7e8f7", "#4c554a", 1.8));
    const key = new THREE.DirectionalLight("#fff0d0", 2.5);
    key.position.set(-8, 25, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -22;
    key.shadow.camera.right = 22;
    key.shadow.camera.top = 22;
    key.shadow.camera.bottom = -22;
    key.shadow.normalBias = 0.035;
    scene.add(key);
    const fill = new THREE.DirectionalLight("#9bc7ed", 1.2);
    fill.position.set(12, 10, -14);
    scene.add(fill);
    const vessel = createVessel(previewTables);
    scene.add(vessel.root);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({
        color: "#0c2331",
        roughness: 0.52,
        metalness: 0.25,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.72;
    scene.add(water);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.71;
    shadow.receiveShadow = true;
    scene.add(shadow);
    // A quiet geometric wake gives depth without an expensive continuous render loop.
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const points = [
          new THREE.Vector3(side * (4 + i * 0.25), -0.68, -8),
          new THREE.Vector3(side * (4.5 + i * 0.45), -0.68, 5),
          new THREE.Vector3(side * (5.8 + i * 0.75), -0.68, 18),
        ];
        const curve = new THREE.CatmullRomCurve3(points);
        scene.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
            new THREE.LineBasicMaterial({
              color: "#4c8090",
              transparent: true,
              opacity: 0.16 - i * 0.035,
            }),
          ),
        );
      }
    let width = host.clientWidth,
      height = host.clientHeight,
      frame = 0,
      visible = true,
      disposed = false;
    let previousDeck: PreviewDeck | undefined;
    let previousTop: boolean | undefined;
    let previousReset = -1;
    let targetUpperLift = 0;
    let moving = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targetCamera = new THREE.Vector3();
    let cameraMoving = false;
    let targetZoom = 1;
    let currentZoom = 1;
    const projected = new THREE.Vector3();
    function fitCamera() {
      const aspect = width / height;
      // Fit projected hull corners, rather than a brittle fixed CSS scale.
      camera.updateMatrixWorld();
      const inv = camera.matrixWorldInverse;
      let maxX = 0,
        maxY = 0;
      for (const x of [-4.5, 4.5])
        for (const z of [-15.2, 15.2])
          for (const y of [-0.8, 5.4]) {
            const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
            maxX = Math.max(maxX, Math.abs(p.x));
            maxY = Math.max(maxY, Math.abs(p.y));
          }
      const vertical = Math.max(maxY * 1.17, (maxX * 1.17) / aspect);
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical;
      camera.bottom = -vertical;
      camera.zoom = currentZoom;
      camera.updateProjectionMatrix();
    }
    function projectLabels() {
      const current = latest.current;
      const nodes = labels.querySelectorAll<HTMLElement>("[data-table-anchor]");
      nodes.forEach((node) => {
        const table = previewTables.find(
          (t) => t.id === node.dataset.tableAnchor,
        );
        if (!table) return;
        projected.copy(tablePosition(table));
        projected.y += 0.18;
        projected.project(camera);
        node.style.transform = `translate(${(projected.x * 0.5 + 0.5) * width}px,${(-projected.y * 0.5 + 0.5) * height}px) translate(-50%,-50%)`;
        const clipped =
          Math.abs(projected.x) > 1.02 ||
          Math.abs(projected.y) > 1.02 ||
          projected.z > 1;
        node.style.visibility =
          clipped || table.deck !== current.deck ? "hidden" : "visible";
      });
      labels
        .querySelectorAll<HTMLElement>("[data-service-anchor]")
        .forEach((node) => {
          projected
            .set(
              0,
              DECK_HEIGHT[current.deck] +
                (current.deck === "upper" ? 0.65 : 1.2),
              current.deck === "upper" ? -10.7 : 0.5,
            )
            .project(camera);
          node.style.transform = `translate(${(projected.x * 0.5 + 0.5) * width}px,${(-projected.y * 0.5 + 0.5) * height}px) translate(-50%,-50%)`;
          node.style.visibility =
            Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1
              ? "hidden"
              : "visible";
        });
      const bow = labels.querySelector<HTMLElement>("[data-bow-anchor]");
      if (bow) {
        projected
          .set(0, DECK_HEIGHT[current.deck] + 0.3, -15.1)
          .project(camera);
        bow.style.transform = `translate(${(projected.x * 0.5 + 0.5) * width}px,${(-projected.y * 0.5 + 0.5) * height}px) translate(-50%,-100%)`;
        bow.style.visibility =
          Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1
            ? "hidden"
            : "visible";
      }
    }
    function schedule() {
      if (!frame && !disposed && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function draw() {
      frame = 0;
      if (disposed) return;
      moving = false;
      if (cameraMoving) {
        camera.position.lerp(targetCamera, reduced.matches ? 1 : 0.16);
        cameraMoving = camera.position.distanceTo(targetCamera) > 0.015;
        if (!cameraMoving) camera.position.copy(targetCamera);
        controls.update();
        moving ||= cameraMoving;
      }
      const diff = targetUpperLift - vessel.upper.position.y;
      if (Math.abs(diff) > 0.01) {
        vessel.upper.position.y += diff * (reduced.matches ? 1 : 0.14);
        moving = true;
      }
      vessel.upper.visible = vessel.upper.position.y < 6;
      // Lift off the top deck when exploring the interior. It cannot obscure lower labels.
      if (latest.current.deck === "lower" && vessel.upper.visible)
        labels.style.opacity = "0";
      else labels.style.opacity = "1";
      currentZoom += (targetZoom - currentZoom) * 0.2;
      if (Math.abs(targetZoom - currentZoom) > 0.001) moving = true;
      const damped = controls.update();
      // Landscape plan on desktop; upright plan on a phone. Labels stay screen-facing.
      if (latest.current.topView && width > 600) camera.rotateZ(-Math.PI / 2);
      fitCamera();
      projectLabels();
      renderer.render(scene, camera);
      if (moving || damped) schedule();
    }
    update.current = (current) => {
      targetZoom = current.zoom;
      const changedView =
        current.topView !== previousTop || current.resetKey !== previousReset;
      const changedDeck = current.deck !== previousDeck;
      if (changedView) {
        const mobile = width < 580;
        // Keep the target inside OrbitControls' polar bounds, otherwise interpolation
        // and the controls fight forever and selectable labels never become stable.
        targetCamera.copy(
          current.topView
            ? new THREE.Vector3(0, 48, 1.5)
            : mobile
              ? new THREE.Vector3(12, 38, 25)
              : new THREE.Vector3(36, 29, 12),
        );
        cameraMoving = true;
        if (previousTop === undefined || reduced.matches) {
          camera.position.copy(targetCamera);
          cameraMoving = false;
        }
        controls.enabled = !current.topView;
        controls.update();
      }
      if (changedDeck) {
        targetUpperLift = current.deck === "upper" ? 0 : 11;
        if (previousDeck === undefined || reduced.matches)
          vessel.upper.position.y = targetUpperLift;
      }
      const entries = new Map(current.tables.map((t) => [t.id, t]));
      vessel.tableMeshes.forEach((mesh, id) => {
        const table = entries.get(id);
        mesh.visible = Boolean(table);
        const selected = current.selected.includes(id);
        const color = selected
          ? "#e4c78f"
          : table?.status === "available"
            ? "#66c6ba"
            : "#5b656b";
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(color);
        mat.emissive.set(color);
        mat.emissiveIntensity = selected ? 0.16 : 0;
      });
      previousDeck = current.deck;
      previousTop = current.topView;
      previousReset = current.resetKey;
      schedule();
    };
    const resize = new ResizeObserver(() => {
      width = host.clientWidth;
      height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      schedule();
    });
    resize.observe(host);
    controls.addEventListener("change", schedule);
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let startX = 0,
      startY = 0;
    const down = (event: PointerEvent) => {
      startX = event.clientX;
      startY = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 5)
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hits = ray.intersectObjects(
        [...vessel.tableMeshes.values()].filter((m) => m.visible),
      );
      const id = hits[0]?.object.userData.tableId;
      if (
        id &&
        latest.current.tables.find((t) => t.id === id)?.status === "available"
      )
        latest.current.onSelect(id);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    const lost = (event: Event) => {
      event.preventDefault();
      latest.current.onUnavailable();
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(host);
    document.addEventListener("visibilitychange", visibility);
    update.current(latest.current);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      update.current = () => undefined;
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      controls.dispose();
      disposeVessel(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    update.current(props);
  });
  const en = props.language === "en";
  return (
    <div
      ref={mount}
      className={`vessel-scene ${props.topView ? "is-top-view" : ""}`}
      data-deck={props.deck}
    >
      <div ref={overlay} className="vessel-labels">
        {props.tables.map((table) => (
          <div
            key={table.id}
            data-table-anchor={table.id}
            className="vessel-label-anchor"
          >
            <PreviewTableButton
              table={table}
              selected={props.selected.includes(table.id)}
              onSelect={props.onSelect}
              language={props.language}
              map
            />
          </div>
        ))}
        <div
          data-service-anchor
          className={`vessel-service ${props.deck === "upper" ? "preview-front-stage" : "vessel-buffet"}`}
        >
          {props.deck === "upper"
            ? en
              ? "Proposed bow stage"
              : "เวทีเสนอ · หัวเรือ"
            : en
              ? "Central buffet"
              : "ไลน์บุฟเฟต์กลางห้อง"}
        </div>
        <span data-bow-anchor className="vessel-bow-label">
          {en ? "BOW / FRONT" : "หัวเรือ / ด้านหน้า"}
        </span>
      </div>
    </div>
  );
}
