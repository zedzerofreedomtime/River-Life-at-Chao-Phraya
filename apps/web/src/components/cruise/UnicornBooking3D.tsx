import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Check,
  Eye,
  Info,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  ScanSearch,
  Ship,
  View,
} from "lucide-react";
import type { PreviewDeck, PreviewTable } from "../../data/bookingPreviewPlan";
import type { Language } from "../../data/i18n";
import "../../UnicornBooking3D.css";

type Props = {
  deck: PreviewDeck;
  tables: PreviewTable[];
  selected: string[];
  seatMode: boolean;
  language: Language;
  onToggle: (id: string) => void;
  onFallback: () => void;
};
type Status = "loading" | "ready" | "error";
type Pick = { tableId: string; seatId?: string };
type FurniturePart = {
  tableId: string;
  seatId?: string;
  surfaces: THREE.Mesh[];
  label?: THREE.Sprite;
};
type Runtime = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  controls: OrbitControls;
  furniture: THREE.Group;
  parts: FurniturePart[];
  schedule: () => void;
  fit: () => void;
  focus: (table: PreviewTable) => void;
  resetFraming: () => void;
  renderSize: () => { width: number; height: number };
};

const DECK_Y: Record<PreviewDeck, number> = { upper: 5.25, lower: 2.55 };
const COLORS = {
  available: "#2f7e80",
  selected: "#edc573",
  unavailable: "#9ca8ae",
};

function seatAvailable(table: PreviewTable, id: string) {
  return (
    !table.unavailable &&
    (table.seatPrice ?? 0) > 0 &&
    (!table.availableSeats || table.availableSeats.includes(id))
  );
}

function disposeObjects(root: THREE.Object3D) {
  const geometry = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite))
      return;
    if (object instanceof THREE.Mesh) geometry.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  geometry.forEach((value) => value.dispose());
  materials.forEach((value) => value.dispose());
  textures.forEach((value) => value.dispose());
}

function textTexture(
  text: string,
  background: string,
  foreground: string,
  width = 256,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.fillStyle = background;
  context.fillRect(0, 0, width, 128);
  context.fillStyle = foreground;
  context.font = "600 68px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFurniture(tables: PreviewTable[], deck: PreviewDeck) {
  const root = new THREE.Group();
  const parts: FurniturePart[] = [];
  if (!tables.length) return { root, parts };
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const mergedBoxes = (
    boxes: { size: [number, number, number]; at: [number, number, number] }[],
  ) => {
    const pieces = boxes.map(({ size, at }) =>
      boxGeometry
        .clone()
        .scale(...size)
        .translate(...at),
    );
    const merged = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    return merged;
  };
  // Shared baked chair geometries avoid a draw call for every individual leg.
  // IDs remain attached to each complete chair so raycast selection is unchanged.
  const chairBodyGeometry = mergedBoxes([
    { size: [0.65, 0.15, 0.61], at: [0, 0.49, 0] },
    { size: [0.65, 0.64, 0.11], at: [0, 0.88, 0.27] },
  ]);
  const chairFrameGeometry = mergedBoxes(
    [-0.25, 0.25].flatMap((x) =>
      [-0.23, 0.23].map((z) => ({
        size: [0.075, 0.45, 0.075] as [number, number, number],
        at: [x, 0.225, z] as [number, number, number],
      })),
    ),
  );
  const wood = new THREE.MeshStandardMaterial({
    color: "#4e4840",
    roughness: 0.7,
  });
  const runner = new THREE.MeshStandardMaterial({
    color: "#27363a",
    roughness: 0.7,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#b79b60",
    metalness: 0.65,
    roughness: 0.35,
  });
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const shadowContext = shadowCanvas.getContext("2d")!;
  shadowContext.translate(128, 128);
  shadowContext.scale(1, 0.56);
  const shadowGradient = shadowContext.createRadialGradient(
    0,
    0,
    15,
    0,
    0,
    123,
  );
  shadowGradient.addColorStop(0, "rgba(10, 24, 30, 0.32)");
  shadowGradient.addColorStop(0.45, "rgba(10, 24, 30, 0.17)");
  shadowGradient.addColorStop(1, "rgba(10, 24, 30, 0)");
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(-128, -256, 256, 512);
  const contactShadow = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shadowCanvas),
    transparent: true,
    depthWrite: false,
  });
  const box = (
    parent: THREE.Object3D,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    pick?: Pick,
  ) => {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.receiveShadow = true;
    if (pick) mesh.userData = pick;
    parent.add(mesh);
    return mesh;
  };
  for (const table of tables) {
    const x = (table.x - 500) * 0.04;
    const z = (table.y - 290) * 0.018;
    const y = DECK_Y[deck];
    const group = new THREE.Group();
    group.position.set(x, y, z);
    root.add(group);
    const shadow = new THREE.Mesh(planeGeometry, contactShadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.018;
    shadow.scale.set(4.7, 3.6, 1);
    group.add(shadow);
    const pick = { tableId: table.id };
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: "#f4eee1",
      roughness: 0.86,
    });
    const top = box(
      group,
      [3.25, 0.16, 0.95],
      [0, 0.86, 0],
      tableMaterial,
      pick,
    );
    box(group, [3.26, 0.025, 0.35], [0, 0.955, 0], runner, pick);
    for (const legX of [-1.25, 1.25]) {
      box(group, [0.13, 0.8, 0.64], [legX, 0.4, 0], wood, pick);
    }
    box(group, [0.14, 0.25, 0.14], [0, 1.08, 0], brass, pick);
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textTexture(table.id, "#102a3c", "#ffffff"),
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
      }),
    );
    label.position.set(0, 1.5, 0);
    label.scale.set(2.25, 1.125, 1);
    label.renderOrder = 5;
    label.userData = pick;
    group.add(label);
    parts.push({ tableId: table.id, surfaces: [top], label });

    const perSide = Math.ceil(table.seats / 2);
    for (let index = 0; index < table.seats; index++) {
      const firstSide = index < perSide;
      const count = firstSide ? perSide : Math.floor(table.seats / 2);
      const offsetX =
        count === 1 ? 0 : -27 + ((index % perSide) * 54) / (count - 1);
      const offsetZ = firstSide ? -44 : 44;
      const chair = new THREE.Group();
      chair.position.set(offsetX * 0.04, 0, offsetZ * 0.018);
      if (firstSide) chair.rotation.y = Math.PI;
      group.add(chair);
      const seatId = `${table.id}:${index + 1}`;
      const chairPick = { tableId: table.id, seatId };
      const cushion = new THREE.MeshStandardMaterial({
        color: COLORS.available,
        roughness: 0.72,
      });
      const seat = new THREE.Mesh(chairBodyGeometry, cushion);
      seat.userData = chairPick;
      chair.add(seat);
      const frame = new THREE.Mesh(chairFrameGeometry, wood);
      frame.userData = chairPick;
      chair.add(frame);
      const number = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: textTexture(String(index + 1), "#183640", "#ffffff", 128),
          depthTest: false,
          depthWrite: false,
        }),
      );
      number.position.set(0, 1.34, 0);
      number.scale.set(0.46, 0.46, 1);
      number.renderOrder = 6;
      number.userData = chairPick;
      chair.add(number);
      parts.push({ tableId: table.id, seatId, surfaces: [seat] });
    }
  }
  return { root, parts };
}

export default function UnicornBooking3D(props: Props) {
  const { deck, tables, selected, seatMode, language, onToggle, onFallback } =
    props;
  const en = language === "en";
  const t = (th: string, english: string) => (en ? english : th);
  const [status, setStatus] = useState<Status>("loading");
  const [exterior, setExterior] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [focusedId, setFocusedId] = useState("");
  const [lastPick, setLastPick] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const model = exterior ? "exterior" : deck;
  const layoutKey = JSON.stringify(
    tables.map(({ id, seats, x, y }) => [id, seats, x, y]),
  );
  const activeTable =
    tables.find((table) => table.id === activeId) ??
    tables.find((table) => !table.unavailable) ??
    tables[0];
  const price = (value: number) =>
    new Intl.NumberFormat(en ? "en-GB" : "th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    setStatus("loading");
    setFocusedId("");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setStatus("error");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.setAttribute(
      "aria-label",
      en
        ? "Interactive Unicorn Cruise vessel; drag to rotate. Choose chairs with the controls below."
        : "เรือ Unicorn Cruise สามมิติ ลากเพื่อหมุน เลือกเก้าอี้จากปุ่มด้านล่างได้",
    );
    renderer.domElement.setAttribute("role", "img");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const room = new RoomEnvironment();
    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    const environmentTarget = environmentGenerator.fromScene(room, 0.04);
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.4;
    room.dispose();
    environmentGenerator.dispose();
    const camera = new THREE.OrthographicCamera(-24, 24, 18, -18, 0.1, 250);
    const floor = DECK_Y[deck];
    camera.position.set(-5, floor + 29, 27);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, exterior ? 3 : floor, 0);
    controls.enableDamping = false;
    controls.enablePan = false;
    // Explicit zoom buttons keep the page wheel and mobile vertical scroll usable.
    controls.enableZoom = false;
    controls.rotateSpeed = 0.55;
    controls.minPolarAngle = 0.03;
    controls.maxPolarAngle = Math.PI * 0.44;
    renderer.domElement.style.touchAction = "pan-y";
    controls.update();
    scene.add(new THREE.HemisphereLight("#d5eaf8", "#697c87", 0.75));
    const key = new THREE.DirectionalLight("#fff3db", 3);
    key.position.set(-16, 35, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -27,
      right: 27,
      top: 27,
      bottom: -27,
      near: 1,
      far: 90,
    });
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.07;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);
    const rim = new THREE.DirectionalLight("#b7dcff", 1);
    rim.position.set(12, 18, -25);
    scene.add(rim);
    const furniture = new THREE.Group();
    furniture.visible = !exterior;
    scene.add(furniture);
    let disposed = false;
    let frame = 0;
    let visible = true;
    let assetLoaded = false;
    let signaledReady = false;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let focused = false;
    function fit() {
      const aspect = Math.max(width / Math.max(height, 1), 0.1);
      camera.updateMatrixWorld();
      if (focused) {
        const vertical = Math.max(3.5, 4.3 / aspect);
        camera.left = -vertical * aspect;
        camera.right = vertical * aspect;
        camera.top = vertical;
        camera.bottom = -vertical;
        camera.updateProjectionMatrix();
        return;
      }
      let maxX = 0;
      let maxY = 0;
      for (const x of [-21, 21])
        for (const z of [-5.5, 5.5])
          for (const y of [0, exterior ? 9 : floor + 2]) {
            const point = new THREE.Vector3(x, y, z).applyMatrix4(
              camera.matrixWorldInverse,
            );
            maxX = Math.max(maxX, Math.abs(point.x));
            maxY = Math.max(maxY, Math.abs(point.y));
          }
      const vertical = Math.max(maxY * 1.12, (maxX * 1.12) / aspect);
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical;
      camera.bottom = -vertical;
      camera.updateProjectionMatrix();
    }
    function draw() {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      try {
        renderer.render(scene, camera);
        if (assetLoaded && !signaledReady) {
          signaledReady = true;
          setStatus("ready");
        }
      } catch {
        setStatus("error");
      }
    }
    function schedule() {
      if (!disposed && visible && !document.hidden && !frame)
        frame = requestAnimationFrame(draw);
    }
    runtime.current = {
      scene,
      camera,
      controls,
      furniture,
      parts: [],
      schedule,
      fit,
      renderSize: () => ({ width, height }),
      focus: (table) => {
        const x = (table.x - 500) * 0.04;
        const z = (table.y - 290) * 0.018;
        focused = true;
        camera.position.set(x - 1.5, floor + 8, z + 5.5);
        camera.zoom = 1;
        controls.target.set(x, floor + 0.5, z);
        controls.update();
        fit();
        schedule();
        setFocusedId(table.id);
      },
      resetFraming: () => {
        focused = false;
        setFocusedId("");
      },
    };
    function resize() {
      width = element!.clientWidth;
      height = element!.clientHeight;
      renderer.setSize(width, height, false);
      fit();
      schedule();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    visibilityObserver.observe(element);
    const visibilityChanged = () => {
      if (!document.hidden) schedule();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    const changed = () => {
      // Orbit changes the projected silhouette, especially when the long vessel
      // turns upright. Refit without changing the guest's explicit zoom.
      fit();
      schedule();
    };
    controls.addEventListener("change", changed);
    resize();

    new GLTFLoader().load(
      `/models/unicorn/unicorn-${model}.glb`,
      (gltf) => {
        if (disposed) {
          disposeObjects(gltf.scene);
          return;
        }
        scene.add(gltf.scene);
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        assetLoaded = true;
        renderer.shadowMap.needsUpdate = true;
        schedule();
      },
      undefined,
      () => {
        if (!disposed) setStatus("error");
      },
    );

    const raycaster = new THREE.Raycaster();
    let pointer: { x: number; y: number; id: number; moved: boolean } | null =
      null;
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (pointer) {
        pointer.moved = true;
        return;
      }
      pointer = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
        moved: false,
      };
    };
    const move = (event: PointerEvent) => {
      if (
        pointer &&
        Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6
      )
        pointer.moved = true;
    };
    const cancel = () => {
      pointer = null;
    };
    const up = (event: PointerEvent) => {
      const start = pointer;
      pointer = null;
      if (
        !start ||
        start.id !== event.pointerId ||
        start.moved ||
        exterior ||
        !assetLoaded
      )
        return;
      const bounds = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster
        .intersectObjects(furniture.children, true)
        .find((intersection) => intersection.object.userData.tableId);
      if (!hit) return;
      const { tableId, seatId } = hit.object.userData as Pick;
      const current = latest.current;
      const table = current.tables.find((value) => value.id === tableId);
      if (!table) return;
      setActiveId(tableId);
      if (current.seatMode) {
        if (seatId && seatAvailable(table, seatId)) {
          current.onToggle(seatId);
          setLastPick(seatId);
        } else if (!seatId) runtime.current?.focus(table);
      } else if (!table.unavailable) {
        current.onToggle(tableId);
        setLastPick(tableId);
      }
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    const lostContext = (event: Event) => {
      event.preventDefault();
      if (!disposed) setStatus("error");
    };
    renderer.domElement.addEventListener("webglcontextlost", lostContext);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      controls.removeEventListener("change", changed);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("webglcontextlost", lostContext);
      disposeObjects(scene);
      environmentTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      runtime.current = null;
    };
  }, [deck, model, en]);

  useEffect(() => {
    const active = runtime.current;
    if (!active) return;
    for (const child of [...active.furniture.children]) {
      disposeObjects(child);
      active.furniture.remove(child);
    }
    const result = createFurniture(latest.current.tables, deck);
    result.root.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.material.transparent)
        object.castShadow = true;
    });
    active.furniture.add(result.root);
    active.parts = result.parts;
    active.schedule();
  }, [layoutKey, deck, model, en]);

  useEffect(() => {
    const active = runtime.current;
    if (!active) return;
    const selectedIds = new Set(selected);
    const inventory = new Map(tables.map((table) => [table.id, table]));
    for (const part of active.parts) {
      const table = inventory.get(part.tableId);
      if (!table) continue;
      const id = seatMode ? part.seatId : part.tableId;
      const chosen = id
        ? selectedIds.has(id)
        : selected.some((value) => value.startsWith(part.tableId + ":"));
      const available =
        part.seatId && seatMode
          ? seatAvailable(table, part.seatId)
          : !table.unavailable;
      for (const surface of part.surfaces) {
        const material = surface.material as THREE.MeshStandardMaterial;
        material.color.set(
          chosen
            ? COLORS.selected
            : !available
              ? COLORS.unavailable
              : part.seatId
                ? COLORS.available
                : "#f4eee1",
        );
      }
    }
    active.schedule();
  }, [tables, selected, seatMode, deck, model, en, layoutKey]);

  useEffect(() => {
    const active = runtime.current;
    if (!active) return;
    for (const part of active.parts) {
      if (!part.label) continue;
      part.label.visible = !focusedId || part.tableId === focusedId;
      part.label.scale.set(
        focusedId ? 1.45 : 2.25,
        focusedId ? 0.725 : 1.125,
        1,
      );
    }
    active.schedule();
  }, [focusedId, layoutKey, deck, model, en]);

  function cameraView(top: boolean) {
    const active = runtime.current;
    if (!active) return;
    const y = exterior ? 3 : DECK_Y[deck];
    active.resetFraming();
    active.camera.position.set(
      top ? 0 : -5,
      y + (top ? 42 : 29),
      top ? 0.01 : 27,
    );
    active.controls.target.set(0, y, 0);
    active.camera.zoom = 1;
    active.controls.update();
    active.fit();
    active.schedule();
  }

  function zoom(factor: number) {
    const active = runtime.current;
    if (!active) return;
    active.camera.zoom = Math.min(
      3,
      Math.max(0.7, active.camera.zoom * factor),
    );
    active.camera.updateProjectionMatrix();
    active.schedule();
  }

  return (
    <section
      className="unicorn-3d font-semibold"
      data-testid="unicorn-booking-3d"
      data-state={status}
      data-model={model}
      aria-label={t(
        "เลือกที่นั่งบนเรือสามมิติ",
        "Choose seats on the 3D vessel",
      )}
    >
      <div className="u3d-controls">
        <div className="u3d-mode">
          <button
            type="button"
            aria-pressed={!exterior}
            onClick={() => setExterior(false)}
          >
            <View size={15} />
            {t("เลือกที่นั่ง", "Choose seats")}
          </button>
          <button
            type="button"
            aria-pressed={exterior}
            onClick={() => setExterior(true)}
          >
            <Ship size={15} />
            {t("ชมเรือทั้งลำ", "Explore vessel")}
          </button>
        </div>
        <div className="u3d-camera">
          <button
            type="button"
            aria-label={t("ย่อเรือ 3D", "Zoom 3D vessel out")}
            onClick={() => zoom(0.8)}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            aria-label={t("ขยายเรือ 3D", "Zoom 3D vessel in")}
            onClick={() => zoom(1.25)}
          >
            <Plus size={16} />
          </button>
          <button type="button" onClick={() => cameraView(true)}>
            <Eye size={15} />
            {t("มุมบน", "Top")}
          </button>
          <button
            type="button"
            aria-label={t("คืนมุมมองเรือ 3D", "Reset 3D vessel view")}
            onClick={() => cameraView(false)}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div className="u3d-stage" data-focused-table={focusedId}>
        <div className="u3d-canvas" ref={host} />
        <div className="u3d-title" aria-hidden="true">
          <span>UNICORN CRUISE</span>
          <strong>
            {exterior
              ? t("ล่องไปกับค่ำคืนพิเศษ", "A special evening on the river")
              : deck === "upper"
                ? t("ดาดฟ้า · วิวเปิดโล่ง", "Upper deck · Open-air views")
                : t("ห้องอาหาร · ชั้นล่าง", "Dining room · Lower deck")}
          </strong>
        </div>
        {status === "loading" && (
          <div className="u3d-loading" role="status">
            <Ship size={26} />
            <span>{t("กำลังเตรียมโมเดลเรือ…", "Preparing your vessel…")}</span>
          </div>
        )}
        {status === "error" && (
          <div className="u3d-fallback" role="status">
            <Info size={25} />
            <strong>
              {t("เปิดมุมมอง 3D ไม่สำเร็จ", "The 3D view could not be opened")}
            </strong>
            <p>
              {t(
                "เลือกที่นั่งต่อในผังปกติได้ รายการที่เลือกยังอยู่ครบ",
                "Continue with the deck plan. Your selections are preserved.",
              )}
            </p>
            <button type="button" onClick={onFallback}>
              <MapIcon size={16} />
              {t("กลับไปเลือกในผัง", "Use the deck plan")}
            </button>
          </div>
        )}
        {status === "ready" && (
          <div className="u3d-canvas-help">
            {exterior
              ? t(
                  "ลากเพื่อชมรอบลำ · กลับไปเลือกที่นั่งได้ทุกเมื่อ",
                  "Drag to explore · Return to seat selection anytime",
                )
              : t(
                  "ลากเพื่อหมุน · แตะเก้าอี้เพื่อเลือก · ใช้ + เพื่อขยาย",
                  "Drag to orbit · Tap a chair to select · + to zoom",
                )}
          </div>
        )}
      </div>
      <div className="u3d-caption">
        <Info size={14} />
        <p>
          {t(
            "โมเดลอ้างอิงภาพถ่าย รูปทรงและตำแหน่งเป็นภาพประกอบ โปรดดูรหัสที่นั่งและรายละเอียดรอบก่อนจอง",
            "Photo-informed model; dimensions and positions are illustrative. Check seat IDs and sailing details before booking.",
          )}
        </p>
      </div>
      {!exterior && activeTable && (
        <div className="u3d-picker">
          <div className="u3d-picker-heading">
            <label>
              {t("โต๊ะที่ต้องการดู", "Explore a table")}
              <select
                aria-label={t("โต๊ะในมุมมอง 3D", "Table in the 3D view")}
                value={activeTable.id}
                onChange={(event) => setActiveId(event.target.value)}
              >
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.id} ·{" "}
                    {table.unavailable
                      ? t("ไม่ว่าง", "Unavailable")
                      : `${table.seats} ${t("ที่นั่ง", "seats")}`}
                  </option>
                ))}
              </select>
            </label>
            <div className="u3d-price">
              <span>
                {seatMode
                  ? t("ราคา / เก้าอี้", "Price / chair")
                  : t("ราคา / โต๊ะ", "Price / table")}
              </span>
              <strong>
                {price(
                  seatMode ? (activeTable.seatPrice ?? 0) : activeTable.price,
                )}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="u3d-focus"
            onClick={() => {
              if (focusedId === activeTable.id) cameraView(false);
              else {
                runtime.current?.focus(activeTable);
                host.current?.scrollIntoView({
                  block: "center",
                  behavior: "auto",
                });
              }
            }}
          >
            <ScanSearch size={16} />
            {focusedId === activeTable.id
              ? t("กลับไปดูทั้งชั้น", "See the whole deck")
              : `${t("ดูโต๊ะนี้ใกล้ ๆ", "Focus on table")} ${activeTable.id}`}
          </button>
          {seatMode ? (
            <div
              className="u3d-seats"
              aria-label={t(
                "เลือกเก้าอี้ในมุมมอง 3D",
                "Select chairs in the 3D view",
              )}
            >
              {Array.from({ length: activeTable.seats }, (_, index) => {
                const id = `${activeTable.id}:${index + 1}`;
                const available = seatAvailable(activeTable, id);
                const chosen = selected.includes(id);
                return (
                  <button
                    type="button"
                    key={id}
                    aria-label={`${t("เก้าอี้ 3D", "3D seat")} ${id}`}
                    aria-pressed={chosen}
                    disabled={!available}
                    onClick={() => {
                      onToggle(id);
                      setLastPick(id);
                    }}
                  >
                    <span>{id}</span>
                    <small>
                      {chosen ? (
                        <>
                          <Check size={13} />
                          {t("เลือกแล้ว", "Selected")}
                        </>
                      ) : available ? (
                        t("ว่าง", "Available")
                      ) : (
                        t("ไม่ว่าง", "Unavailable")
                      )}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              className="u3d-whole"
              disabled={activeTable.unavailable}
              aria-pressed={selected.includes(activeTable.id)}
              onClick={() => {
                onToggle(activeTable.id);
                setLastPick(activeTable.id);
              }}
            >
              {selected.includes(activeTable.id)
                ? t("นำโต๊ะออก", "Remove table")
                : t("เลือกทั้งโต๊ะ", "Choose whole table")}{" "}
              {activeTable.id}
            </button>
          )}
          <div className="u3d-key">
            <span>
              <i />
              {t("ว่าง", "Available")}
            </span>
            <span>
              <i className="chosen" />
              {t("เลือกแล้ว", "Selected")}
            </span>
            <span>
              <i className="blocked" />
              {t("ไม่ว่าง", "Unavailable")}
            </span>
          </div>
          <p className="u3d-picked" aria-live="polite">
            {lastPick &&
              (selected.includes(lastPick)
                ? `${t("เลือกแล้ว", "Selected")} ${lastPick}`
                : `${t("นำออกแล้ว", "Removed")} ${lastPick}`)}
          </p>
        </div>
      )}
    </section>
  );
}
