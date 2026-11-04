// Premium kart bodies (车型) for the garage: 闪电 GT, 喷射火箭 and 幻影星舰.
// The classic body is the Kenney kart (kart-assets.js). These are built from
// extruded profiles, lathes and primitives, then merged per material so each
// body costs a handful of draw calls. Body space matches the Kenney kart:
// +z forward, y up, ground at y = 0, the seat around z = -0.2 and the steering
// column near (0, 0.9, 0.2), so every driver fits every body.
import * as T from "./vendor/three.module.js";
import { mergeGeometries } from "./vendor/utils/BufferGeometryUtils.js";

const cache = new Map();
const std = (key, opts) => {
  if (!cache.has(key)) cache.set(key, new T.MeshStandardMaterial(opts));
  return cache.get(key);
};
const basic = (key, opts) => {
  if (!cache.has(key)) cache.set(key, new T.MeshBasicMaterial({ toneMapped: false, ...opts }));
  return cache.get(key);
};
// Neon parts glow brighter during a boost: each body keeps its own copies of
// its glowing materials so one kart's boost does not light up the others.
const glowing = (colour, extra = {}) => new T.MeshBasicMaterial({ color: colour, toneMapped: false, ...extra });
// Soft oval light pool for the neon underglow (shared texture).
let poolTexture = null;
function pool() {
  if (!poolTexture) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const x = c.getContext("2d"),
      grad = x.createRadialGradient(32, 64, 0, 32, 64, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    x.setTransform(1, 0, 0, 2, 0, -64); // stretch the circle into an oval
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 128);
    poolTexture = new T.CanvasTexture(c);
  }
  return poolTexture;
}
const underglow = (colour, opacity) =>
  glowing(colour, { map: pool(), transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });

const M = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) =>
  new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler(...r)), new T.Vector3(...s));

// Collect geometry parts per material; build() merges each set into one mesh.
class Parts {
  constructor() {
    this.sets = new Map();
  }
  add(geo, mat, matrix = null) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute("uv", new T.Float32BufferAttribute(new Float32Array((g.attributes.position.count * 2) | 0), 2));
    if (!this.sets.has(mat)) this.sets.set(mat, []);
    this.sets.get(mat).push(g);
    return this;
  }
  build(group, { shadows = true } = {}) {
    for (const [mat, geos] of this.sets) {
      const mesh = new T.Mesh(mergeGeometries(geos), mat);
      mesh.castShadow = shadows && !mat.userData.noShadow;
      mesh.receiveShadow = !mat.userData.noShadow;
      group.add(mesh);
    }
    return group;
  }
}

// A side profile (z, y pairs) extruded across x, centred, with rounded edges.
function profile(points, width, bevel = 0.05) {
  const shape = new T.Shape(points.map(([z, y]) => new T.Vector2(z, y)));
  const g = new T.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, width - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 10,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // shape x -> body z, extrusion -> body x
  g.computeVertexNormals();
  return g;
}
// A smooth profile from a spline through the points.
function smoothProfile(points, width, bevel = 0.05, samples = 40) {
  const curve = new T.SplineCurve(points.map(([z, y]) => new T.Vector2(z, y)));
  return profile(
    curve.getPoints(samples).map((v) => [v.x, v.y]),
    width,
    bevel,
  );
}
// Solid of revolution about the z axis (radius, z pairs).
function lathe(points, segments = 28) {
  const g = new T.LatheGeometry(
    points.map(([r, z]) => new T.Vector2(Math.max(0.0001, r), z)),
    segments,
  );
  g.rotateX(Math.PI / 2); // lathe axis y -> body z
  return g;
}
const unitBox = new T.BoxGeometry(1, 1, 1),
  unitCyl = new T.CylinderGeometry(1, 1, 1, 24),
  unitSphere = new T.SphereGeometry(1, 20, 14),
  unitCone = new T.ConeGeometry(1, 1, 24);

// --- Wheels -------------------------------------------------------------------
// A racing wheel: rounded tyre, rim with spokes, hub cap; the axle is along x
// so animateKart can spin it about x.
function wheel({ r, w, rim, spokes = 5, hub, glow = null, side }) {
  const g = new T.Group(),
    parts = new Parts(),
    rIn = r * 0.66,
    e = Math.min(0.07, w * 0.18);
  const tyre = new T.LatheGeometry(
    [
      [rIn, -w / 2],
      [r - e, -w / 2],
      [r - e * 0.25, -w / 2 + e * 0.35],
      [r, -w / 2 + e],
      [r, w / 2 - e],
      [r - e * 0.25, w / 2 - e * 0.35],
      [r - e, w / 2],
      [rIn, w / 2],
    ].map(([a, b]) => new T.Vector2(a, b)),
    30,
  );
  tyre.rotateZ(Math.PI / 2);
  parts.add(tyre, std("tyre", { color: 0x1c1e21, roughness: 0.92 }));
  const out = side * (w / 2 - 0.05);
  parts.add(unitCyl, rim, M([out * 0.6, 0, 0], [0, 0, Math.PI / 2], [rIn * 0.98, w * 0.5, rIn * 0.98]));
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    parts.add(unitBox, rim, M([out, Math.sin(a) * rIn * 0.5, Math.cos(a) * rIn * 0.5], [a, 0, 0], [0.05, rIn * 0.9, 0.07]));
  }
  parts.add(unitCyl, hub || rim, M([out + side * 0.03, 0, 0], [0, 0, Math.PI / 2], [rIn * 0.3, 0.06, rIn * 0.3]));
  parts.build(g);
  if (glow) {
    const ring = new T.Mesh(new T.TorusGeometry(rIn * 0.9, 0.03, 8, 40), glow);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = out + side * 0.02;
    g.add(ring);
  }
  return g;
}
// Four wheels on pivots (front ones steer); returns the animateKart format.
function mountWheels(body, spec) {
  const wheels = [];
  for (const [front, x, y, z, r, w] of spec.layout) {
    for (const side of [-1, 1]) {
      const pivot = new T.Group();
      pivot.position.set(side * x, y, z);
      body.add(pivot);
      const mesh = wheel({ r, w, side, ...spec.style });
      pivot.add(mesh);
      wheels.push({ pivot, mesh, front });
    }
  }
  return wheels;
}

// --- 闪电 GT: a low red sports kart with a big rear wing ------------------------
function thunder() {
  const g = new T.Group(),
    p = new Parts(),
    paint = std("gt-paint", { color: 0xd42a3c, metalness: 0.55, roughness: 0.26 }),
    pearl = std("gt-pearl", { color: 0xf5f3ee, metalness: 0.25, roughness: 0.3 }),
    carbon = std("carbon", { color: 0x24282d, metalness: 0.35, roughness: 0.45 }),
    chrome = std("chrome", { color: 0xe3e8ee, metalness: 1, roughness: 0.16 }),
    lights = glowing(0xfff6d8),
    tail = glowing(0xff3046),
    under = underglow(0xff4d6a, 0.5);
  under.userData.noShadow = lights.userData.noShadow = tail.userData.noShadow = true;
  // Nose: a wedge rising to the cowl in front of the driver.
  p.add(smoothProfile([[0.25, 0.24], [1.0, 0.2], [1.62, 0.2], [1.86, 0.3], [1.66, 0.42], [1.1, 0.55], [0.55, 0.74], [0.25, 0.74]], 0.92, 0.08), paint);
  // White racing stripes over the nose.
  for (const x of [-0.13, 0.13])
    p.add(smoothProfile([[0.3, 0.7], [0.55, 0.755], [1.1, 0.565], [1.66, 0.43], [1.6, 0.4], [1.05, 0.535], [0.5, 0.72], [0.3, 0.67]], 0.1, 0.01), pearl, M([x, 0.003, 0]));
  // Side pods between the wheels, with black intakes.
  for (const s of [-1, 1]) {
    p.add(smoothProfile([[-0.34, 0.22], [0.48, 0.22], [0.5, 0.42], [0.2, 0.6], [-0.34, 0.64]], 0.5, 0.07), paint, M([s * 0.7, 0, 0]));
    p.add(unitBox, carbon, M([s * 0.7, 0.36, 0.5], [0, 0, 0], [0.4, 0.2, 0.04]));
    p.add(unitBox, pearl, M([s * 0.955, 0.42, 0.06], [0, 0, 0], [0.02, 0.06, 0.66]));
  }
  // Floor and seat back / engine cover sloping to the tail.
  p.add(unitBox, carbon, M([0, 0.24, -0.08], [0, 0, 0], [0.92, 0.08, 1.0]));
  p.add(smoothProfile([[-1.22, 0.3], [-0.5, 0.28], [-0.48, 0.8], [-0.56, 1.02], [-0.78, 1.0], [-1.0, 0.82], [-1.24, 0.6]], 0.98, 0.08), paint);
  p.add(unitBox, carbon, M([0, 0.3, -1.2], [0, 0, 0], [1.1, 0.16, 0.12]));
  // Rear diffuser fins and a full-width LED bar under the wing.
  for (const x of [-0.36, -0.12, 0.12, 0.36]) p.add(unitBox, carbon, M([x, 0.2, -1.22], [0, 0, 0], [0.03, 0.14, 0.22]));
  p.add(unitBox, tail, M([0, 0.88, -1.235], [0, 0, 0], [0.9, 0.05, 0.02]));
  // Rear wing on two struts, endplates in white.
  for (const s of [-1, 1]) p.add(unitBox, carbon, M([s * 0.38, 1.08, -1.04], [0.25, 0, 0], [0.07, 0.6, 0.12]));
  p.add(smoothProfile([[-1.32, 1.3], [-1.18, 1.36], [-0.9, 1.4], [-0.82, 1.37], [-1.0, 1.32], [-1.3, 1.27]], 2.0, 0.02), paint);
  for (const s of [-1, 1]) p.add(unitBox, pearl, M([s * 1.0, 1.32, -1.08], [0, 0, 0], [0.04, 0.3, 0.56]));
  // Front wing with endplates.
  p.add(unitBox, carbon, M([0, 0.16, 1.7], [0, 0, 0], [2.0, 0.05, 0.36]));
  for (const s of [-1, 1]) p.add(unitBox, paint, M([s * 1.0, 0.22, 1.7], [0, 0, 0], [0.04, 0.16, 0.42]));
  // Twin chrome exhausts, headlights, taillights, neon underglow.
  for (const s of [-1, 1]) {
    p.add(unitCyl, chrome, M([s * 0.56, 0.66, -1.24], [-1.15, 0, 0], [0.085, 0.36, 0.085]));
    p.add(unitBox, lights, M([s * 0.28, 0.34, 1.82], [0, 0, 0], [0.18, 0.05, 0.02]));
    p.add(unitBox, tail, M([s * 0.32, 0.5, -1.27], [0, 0, 0], [0.26, 0.06, 0.02]));
    p.add(unitBox, pearl, M([s * 0.62, 1.405, -1.06], [0, 0, 0], [0.16, 0.012, 0.42]));
  }
  p.add(new T.PlaneGeometry(2.6, 4.2), under, M([0, 0.04, 0.2], [-Math.PI / 2, 0, 0]));
  p.build(g);
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.86, 0.4, 0.9, 0.4, 0.38],
        [false, 0.88, 0.46, -0.76, 0.46, 0.5],
      ],
      style: { rim: chrome, spokes: 5 },
    }),
    exhaust: [-1, 1].map((s) => ({ tip: new T.Vector3(s * 0.56, 0.74, -1.4), dir: new T.Vector3(s * 0.45, 0.6, -0.66).normalize(), size: 1.12 })),
    glow: [under, tail],
    plate: [0, 0.31, 1.88],
    antenna: [-0.7, 0.62, -1.0],
  };
}

// --- 喷射火箭: twin side rockets and a glowing turbine behind the seat ---------
function jet() {
  const g = new T.Group(),
    p = new Parts(),
    white = std("jet-white", { color: 0xf7f6f2, metalness: 0.3, roughness: 0.22 }),
    orange = std("jet-orange", { color: 0xff7a1a, metalness: 0.35, roughness: 0.3 }),
    steel = std("jet-steel", { color: 0x9aa3ad, metalness: 0.9, roughness: 0.28 }),
    carbon = std("carbon", { color: 0x24282d, metalness: 0.35, roughness: 0.45 }),
    chrome = std("chrome", { color: 0xe3e8ee, metalness: 1, roughness: 0.16 }),
    fire = glowing(0xff9a3a),
    under = underglow(0xff8a3a, 0.45);
  fire.userData.noShadow = under.userData.noShadow = true;
  // Central tub with a pointed nose.
  p.add(smoothProfile([[-0.62, 0.24], [0.6, 0.22], [1.45, 0.24], [1.95, 0.34], [1.5, 0.5], [0.8, 0.66], [0.32, 0.72], [-0.62, 0.62]], 0.86, 0.1), white);
  p.add(smoothProfile([[0.9, 0.62], [1.45, 0.49], [1.9, 0.36], [1.94, 0.33], [1.46, 0.45], [0.9, 0.58]], 0.5, 0.02), orange, M([0, 0.01, 0]));
  // Side rockets: body tube, nose cone, nozzle ring, glowing core.
  for (const s of [-1, 1]) {
    p.add(lathe([[0, 0.62], [0.07, 0.55], [0.15, 0.4], [0.2, 0.18], [0.21, -0.2], [0.21, -0.95], [0.18, -1.08]]), steel, M([s * 0.6, 0.56, 0]));
    p.add(lathe([[0.215, 0.12], [0.22, -0.05], [0.215, -0.1]]), orange, M([s * 0.6, 0.56, 0]));
    p.add(lathe([[0.215, -0.6], [0.22, -0.72], [0.215, -0.76]]), orange, M([s * 0.6, 0.56, 0]));
    p.add(new T.TorusGeometry(0.17, 0.04, 8, 24), chrome, M([s * 0.6, 0.56, -1.08]));
    p.add(new T.CircleGeometry(0.15, 20), fire, M([s * 0.6, 0.56, -1.09], [0, Math.PI, 0]));
    p.add(unitBox, white, M([s * 0.5, 0.44, -0.3], [0, 0, 0], [0.12, 0.08, 0.9]));
  }
  // Seat back and the turbine: housing, intake ring, fan, glowing exhaust.
  p.add(smoothProfile([[-0.95, 0.3], [-0.5, 0.3], [-0.46, 0.86], [-0.6, 1.0], [-0.95, 0.88]], 0.84, 0.08), white);
  p.add(lathe([[0.36, 0.26], [0.42, 0.18], [0.44, 0], [0.42, -0.38], [0.34, -0.5]], 30), steel, M([0, 0.86, -1.0]));
  p.add(new T.TorusGeometry(0.39, 0.05, 10, 30), chrome, M([0, 0.86, -0.74]));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.add(unitBox, carbon, M([Math.cos(a) * 0.18, 0.86 + Math.sin(a) * 0.18, -0.76], [0, 0, a + 0.5], [0.34, 0.06, 0.02]));
  }
  p.add(new T.CircleGeometry(0.3, 28), fire, M([0, 0.86, -1.51], [0, Math.PI, 0]));
  p.add(new T.TorusGeometry(0.33, 0.04, 8, 30), chrome, M([0, 0.86, -1.5]));
  // Tail fins in orange.
  for (const s of [-1, 1])
    p.add(profile([[-0.9, 0.0], [-0.55, 0.0], [-1.25, 0.55], [-1.38, 0.55]], 0.05, 0.015), orange, M([s * 0.3, 1.18, 0], [0, 0, s * 0.35]));
  p.add(unitBox, carbon, M([0, 0.24, -0.1], [0, 0, 0], [0.86, 0.08, 1.0]));
  p.add(new T.PlaneGeometry(2.5, 4.2), under, M([0, 0.04, 0.15], [-Math.PI / 2, 0, 0]));
  p.build(g);
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.9, 0.38, 0.95, 0.38, 0.34],
        [false, 0.98, 0.45, -0.78, 0.45, 0.46],
      ],
      style: { rim: std("gold-rim", { color: 0xf0b543, metalness: 0.9, roughness: 0.25 }), spokes: 6 },
    }),
    exhaust: [
      { tip: new T.Vector3(0, 0.9, -1.56), dir: new T.Vector3(0, 0.62, -0.78).normalize(), size: 1.5 },
      ...[-1, 1].map((s) => ({ tip: new T.Vector3(s * 0.6, 0.58, -1.12), dir: new T.Vector3(s * 0.38, 0.5, -0.78).normalize(), size: 0.75 })),
    ],
    glow: [fire, under],
    plate: [0, 0.36, 1.86],
    antenna: [-0.42, 0.66, -0.5],
  };
}

// --- 幻影星舰: a black glossy body traced with neon -------------------------------
function phantom() {
  const g = new T.Group(),
    p = new Parts(),
    black = std("ph-black", { color: 0x15171c, metalness: 0.75, roughness: 0.22 }),
    graphite = std("ph-graphite", { color: 0x2b2f38, metalness: 0.6, roughness: 0.35 }),
    glass = std("ph-glass", { color: 0x1f3b5a, metalness: 0.4, roughness: 0.05 }),
    cyan = glowing(0x3ff4ff),
    violet = glowing(0xb46bff),
    under = underglow(0x3ff4ff, 0.5);
  cyan.userData.noShadow = violet.userData.noShadow = under.userData.noShadow = true;
  // Long low nose, flowing into the cowl; a windscreen arc above it.
  p.add(smoothProfile([[0.25, 0.24], [1.2, 0.2], [1.75, 0.22], [1.95, 0.28], [1.7, 0.36], [1.05, 0.5], [0.55, 0.68], [0.25, 0.7]], 0.96, 0.09), black);
  p.add(new T.CylinderGeometry(0.5, 0.5, 0.06, 24, 1, true, -1.0, 2.0), glass, M([0, 0.62, 0.42], [Math.PI / 2 - 0.75, 0, 0], [1, 1, 0.55]));
  // Blade-like side pods with a neon edge, and swept hover fins.
  for (const s of [-1, 1]) {
    p.add(smoothProfile([[-0.4, 0.22], [0.5, 0.22], [0.42, 0.4], [0.05, 0.58], [-0.4, 0.6]], 0.42, 0.06), graphite, M([s * 0.68, 0, 0]));
    p.add(unitBox, cyan, M([s * 0.9, 0.5, 0.04], [0.36, 0, 0], [0.02, 0.025, 0.86]));
    p.add(unitBox, cyan, M([s * 0.47, 0.6, 1.1], [0.29, 0, 0], [0.02, 0.025, 1.12]));
    p.add(profile([[-0.15, 0], [0.45, 0], [-0.25, 0.12], [-0.55, 0.12]], 0.05, 0.01), black, M([s * 1.03, 0.55, -0.1], [0, 0, s * -1.25]));
    p.add(unitBox, violet, M([s * 1.18, 0.46, -0.32], [0, 0, 0], [0.025, 0.025, 0.42]));
  }
  // Seat back and tail with twin square thrusters.
  p.add(smoothProfile([[-1.25, 0.3], [-0.5, 0.28], [-0.47, 0.84], [-0.58, 1.0], [-0.85, 0.96], [-1.28, 0.62]], 0.96, 0.08), black);
  for (const s of [-1, 1]) {
    p.add(unitBox, graphite, M([s * 0.46, 0.68, -1.2], [0, 0, 0], [0.36, 0.28, 0.3]));
    p.add(unitBox, violet, M([s * 0.46, 0.68, -1.36], [0, 0, 0], [0.28, 0.18, 0.02]));
    // Vertical tail fins traced in neon.
    p.add(profile([[-0.7, 0], [-0.95, 0], [-1.3, 0.55], [-1.12, 0.55]], 0.05, 0.012), black, M([s * 0.7, 0.62, 0]));
    p.add(unitBox, cyan, M([s * 0.7, 0.9, -1.12], [0.57, 0, 0], [0.06, 0.025, 0.62]));
  }
  // Full-width light bar across the tail and a cyan strip under it.
  p.add(unitBox, cyan, M([0, 0.95, -0.98], [0, 0, 0], [0.94, 0.035, 0.03]));
  p.add(unitBox, cyan, M([0, 0.5, -1.33], [0, 0, 0], [0.62, 0.03, 0.02]));
  p.add(unitBox, graphite, M([0, 0.24, -0.1], [0, 0, 0], [0.92, 0.08, 1.0]));
  p.add(new T.PlaneGeometry(2.6, 4.3), under, M([0, 0.04, 0.2], [-Math.PI / 2, 0, 0]));
  p.build(g);
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.84, 0.39, 0.92, 0.39, 0.36],
        [false, 0.88, 0.44, -0.78, 0.44, 0.46],
      ],
      style: { rim: graphite, spokes: 3, glow: cyan },
    }),
    exhaust: [-1, 1].map((s) => ({ tip: new T.Vector3(s * 0.46, 0.7, -1.4), dir: new T.Vector3(s * 0.42, 0.58, -0.7).normalize(), size: 1.1 })),
    glow: [cyan, violet, under],
    plate: [0, 0.31, 1.94],
    antenna: [-0.68, 0.62, -0.95],
  };
}

const BUILDERS = { thunder, jet, phantom };
export const PREMIUM_BODIES = Object.keys(BUILDERS);
// Build a premium body: { group, wheels, exhaust: [{tip, dir, size}], glow,
// plate, antenna }. Glowing materials are fresh per kart (they pulse with
// that kart's boosts); everything else is shared.
export function buildBody(id) {
  const make = BUILDERS[id];
  return make ? make() : null;
}
