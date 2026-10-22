import * as THREE from "three";
import type { PreviewDeck, PreviewTable } from "../../data/tablePreview";

// An editable, photo-informed visual model, NOT a measured vessel/safety plan.
// Keep all selectable IDs and capacity in the shared catalogue, never in geometry.
export const DECK_HEIGHT = { upper: 3.55, lower: 0.95 };
export function tablePosition(table: PreviewTable) {
  return new THREE.Vector3(
    (table.x - 50) * 0.105,
    DECK_HEIGHT[table.deck] + 0.83,
    (table.y - 50) * 0.3,
  );
}

function outline(scale = 1) {
  const s = new THREE.Shape();
  s.moveTo(0, 14.8);
  s.bezierCurveTo(1.5, 14.0, 3.7, 11.5, 3.9, 7.4);
  s.lineTo(3.9, -12.2);
  s.quadraticCurveTo(3.9, -14.2, 2.5, -14.2);
  s.lineTo(-2.5, -14.2);
  s.quadraticCurveTo(-3.9, -14.2, -3.9, -12.2);
  s.lineTo(-3.9, 7.4);
  s.bezierCurveTo(-3.7, 11.5, -1.5, 14.0, 0, 14.8);
  if (scale !== 1) {
    const points = s.getPoints(64).map((p) => p.multiplyScalar(scale));
    return new THREE.Shape(points);
  }
  return s;
}

export function createVessel(tables: PreviewTable[]) {
  const root = new THREE.Group();
  const upper = new THREE.Group();
  const lower = new THREE.Group();
  const material = (color: string, roughness = 0.6, metalness = 0.1) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const white = material("#e2e5e3", 0.38, 0.25);
  const trim = material("#172b40", 0.38, 0.45);
  const floor = material("#b9b7ac", 0.95);
  const silver = material("#bac6ce", 0.28, 0.8);
  const dark = material("#25313d");
  const chair = material("#394743");
  const glass = new THREE.MeshStandardMaterial({
    color: "#668c99",
    transparent: true,
    opacity: 0.3,
    metalness: 0.45,
    roughness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lamp = new THREE.MeshBasicMaterial({ color: "#f4cf85" });
  const blue = new THREE.MeshBasicMaterial({ color: "#4098bb" });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const box = (
    parent: THREE.Group,
    size: number[],
    pos: number[],
    mat: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(boxGeometry, mat);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const slab = (
    parent: THREE.Group,
    height: number,
    depth: number,
    mat: THREE.Material,
    scale = 1,
    stairs = false,
  ) => {
    const shape = outline(scale);
    if (stairs)
      for (const side of [-1, 1]) {
        const hole = new THREE.Path();
        const x = side * 2.9;
        hole.moveTo(x - 0.56, -10);
        hole.lineTo(x - 0.56, -13.1);
        hole.lineTo(x + 0.56, -13.1);
        hole.lineTo(x + 0.56, -10);
        hole.closePath();
        shape.holes.push(hole);
      }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.06,
      curveSegments: 24,
    });
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.y = height;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  };
  const rail = (
    parent: THREE.Group,
    height: number,
    mat: THREE.Material,
    scale = 0.98,
  ) => {
    const points = outline(scale)
      .getPoints(100)
      .map((p) => new THREE.Vector3(p.x, height, -p.y));
    const curve = new THREE.CatmullRomCurve3(points, true);
    parent.add(
      new THREE.Mesh(new THREE.TubeGeometry(curve, 140, 0.035, 5, true), mat),
    );
  };
  const posts = (
    parent: THREE.Group,
    y: number,
    count: number,
    height: number,
  ) => {
    const path = outline(0.98).getSpacedPoints(count);
    const mesh = new THREE.InstancedMesh(boxGeometry, silver, path.length);
    const matrix = new THREE.Matrix4();
    path.forEach((p, i) => {
      matrix.compose(
        new THREE.Vector3(p.x, y + height / 2, -p.y),
        new THREE.Quaternion(),
        new THREE.Vector3(0.045, height, 0.045),
      );
      mesh.setMatrixAt(i, matrix);
    });
    parent.add(mesh);
  };
  slab(root, -0.65, 0.9, trim, 0.92);
  slab(root, 0.22, 0.55, white);
  rail(root, 0.5, blue);
  slab(lower, DECK_HEIGHT.lower - 0.15, 0.15, floor, 0.97);
  // Window band and regular structural pillars make this a two-level river cruiser.
  for (const side of [-1, 1]) {
    box(lower, [0.12, 0.38, 22], [side * 3.78, 1.17, 0.5], white);
    box(lower, [0.055, 1.45, 22], [side * 3.8, 2.08, 0.5], glass);
    for (let z = -10; z <= 11; z += 2.7)
      box(lower, [0.14, 2.1, 0.13], [side * 3.8, 2.08, z], white);
    box(lower, [0.15, 0.13, 22], [side * 3.8, 3.14, 0.5], white);
  }
  slab(upper, DECK_HEIGHT.upper - 0.18, 0.18, floor, 1, true);
  rail(upper, DECK_HEIGHT.upper - 0.06, white);
  rail(upper, DECK_HEIGHT.upper + 0.68, silver);
  rail(upper, DECK_HEIGHT.upper + 0.39, silver);
  rail(upper, DECK_HEIGHT.upper + 0.09, lamp);
  posts(upper, DECK_HEIGHT.upper, 55, 0.7);
  rail(lower, DECK_HEIGHT.lower + 0.12, silver, 0.97);
  // Tile joints, not a raster boat image; both decks have their own real geometry.
  for (const [group, deck] of [
    [upper, "upper"],
    [lower, "lower"],
  ] as const) {
    const vertices: number[] = [];
    for (let z = -9; z <= 12; z += 0.9)
      vertices.push(
        -3.65,
        DECK_HEIGHT[deck] + 0.075,
        z,
        3.65,
        DECK_HEIGHT[deck] + 0.075,
        z,
      );
    for (let x = -3.3; x <= 3.3; x += 0.85)
      vertices.push(
        x,
        DECK_HEIGHT[deck] + 0.076,
        -9,
        x,
        DECK_HEIGHT[deck] + 0.076,
        12,
      );
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    group.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({
          color: "#8d9697",
          transparent: true,
          opacity: 0.3,
        }),
      ),
    );
  }
  // Proposed bow stage. This is deliberately labelled a proposal in the UI.
  box(upper, [4.65, 0.32, 2.8], [0, DECK_HEIGHT.upper + 0.16, -10.6], dark);
  for (const side of [-1, 1]) {
    box(
      upper,
      [0.62, 1.05, 0.65],
      [side * 2.5, DECK_HEIGHT.upper + 0.53, -10.1],
      trim,
    );
    box(
      upper,
      [0.09, 1.7, 0.09],
      [side * 2.5, DECK_HEIGHT.upper + 0.85, -11.7],
      silver,
    );
  }
  box(upper, [5.1, 0.09, 0.09], [0, DECK_HEIGHT.upper + 1.7, -11.7], silver);
  // A compact enclosed forward wheelhouse sits below the proposed open foredeck.
  box(lower, [3.6, 1.8, 2.2], [0, 1.85, -10.8], white);
  box(lower, [3.65, 0.8, 0.04], [0, 2.15, -11.93], glass);
  // Buffet island is the defining lower-deck feature visible in the supplied photo.
  box(lower, [1.42, 0.72, 13.8], [0, DECK_HEIGHT.lower + 0.36, 0.5], dark);
  box(lower, [1.58, 0.08, 14], [0, DECK_HEIGHT.lower + 0.76, 0.5], silver);
  for (let z = -5.3; z < 7; z += 1.2) {
    box(lower, [0.85, 0.19, 0.72], [0, DECK_HEIGHT.lower + 0.9, z], silver);
    box(lower, [0.7, 0.025, 0.52], [0, DECK_HEIGHT.lower + 1.01, z], white);
  }
  // Aft stair pair; no fixtures are placed in either stair opening.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++)
      box(
        upper,
        [0.9, 0.13, 0.29],
        [side * 2.9, 1.1 + i * 0.25, 12.6 - i * 0.28],
        white,
      );
    box(upper, [0.05, 0.08, 3], [side * 3.4, 3.65, 11.45], silver).rotation.x =
      -0.65;
  }
  // Low aft service counter, rail lamps and life rings give a recognisable cruiser silhouette.
  box(upper, [3.25, 0.85, 1.2], [0, DECK_HEIGHT.upper + 0.425, 11.9], white);
  box(upper, [3.4, 0.08, 1.35], [0, DECK_HEIGHT.upper + 0.89, 11.9], dark);
  box(upper, [0.7, 0.08, 0.5], [0.8, DECK_HEIGHT.upper + 0.95, 11.9], silver);
  const plantMaterial = material("#355d47", 0.9);
  const potMaterial = material("#9faaa6", 0.65, 0.25);
  const potGeometry = new THREE.CylinderGeometry(0.19, 0.14, 0.4, 10);
  const leavesGeometry = new THREE.IcosahedronGeometry(0.26, 1);
  for (const side of [-1, 1])
    for (const z of [-8, -3, 3, 8.7]) {
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.set(side * 3.56, DECK_HEIGHT.upper + 0.2, z);
      upper.add(pot);
      const leaves = new THREE.Mesh(leavesGeometry, plantMaterial);
      leaves.scale.set(1, 1.6, 1);
      leaves.position.set(side * 3.56, DECK_HEIGHT.upper + 0.65, z);
      upper.add(leaves);
      box(
        upper,
        [0.15, 0.1, 0.15],
        [side * 3.7, DECK_HEIGHT.upper + 0.7, z],
        lamp,
      );
    }
  const ringGeometry = new THREE.TorusGeometry(0.29, 0.075, 6, 20);
  const orange = material("#d47e43");
  for (const side of [-1, 1])
    for (const z of [-6, 6]) {
      const ring = new THREE.Mesh(ringGeometry, orange);
      ring.position.set(side * 3.92, 1.7, z);
      ring.rotation.y = Math.PI / 2;
      lower.add(ring);
    }
  // Instanced seats keep draw calls low on mobile. Tables themselves remain pickable.
  const tableMeshes = new Map<string, THREE.Mesh>();
  const tableGroups = { upper, lower };
  for (const deck of ["upper", "lower"] as const) {
    const fixtures = tables.filter((t) => t.deck === deck);
    const seats = new THREE.InstancedMesh(
      boxGeometry,
      chair,
      fixtures.length * 8,
    );
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const table of fixtures) {
      const p = tablePosition(table);
      const group = tableGroups[deck];
      const topMaterial = material("#62b9b2", 0.45, 0.15);
      const top = box(
        group,
        [1.25, 0.13, table.kind === "banquet" ? 2.4 : 1.45],
        [p.x, p.y - 0.08, p.z],
        topMaterial,
      );
      top.userData.tableId = table.id;
      tableMeshes.set(table.id, top);
      box(group, [0.13, 0.72, 0.13], [p.x, p.y - 0.48, p.z], silver);
      for (const side of [-1, 1])
        for (const dz of [-0.45, 0.45]) {
          for (const [size, pos] of [
            [
              [0.45, 0.12, 0.43],
              [p.x + side * 0.91, p.y - 0.38, p.z + dz],
            ],
            [
              [0.08, 0.56, 0.43],
              [p.x + side * 1.1, p.y - 0.16, p.z + dz],
            ],
          ]) {
            matrix.compose(
              new THREE.Vector3(...(pos as [number, number, number])),
              new THREE.Quaternion(),
              new THREE.Vector3(...(size as [number, number, number])),
            );
            seats.setMatrixAt(index++, matrix);
          }
        }
    }
    seats.castShadow = true;
    seats.receiveShadow = true;
    tableGroups[deck].add(seats);
  }
  root.add(lower, upper);
  return { root, upper, lower, tableMeshes };
}

export function disposeVessel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry);
      for (const m of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
