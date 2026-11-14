// Premium kart bodies (车型) for the garage: 闪电 GT, 喷射火箭 and 幻影星舰.
// The classic body is the Kenney kart (kart-assets.js). These are built from
// extruded profiles, lathes and primitives, then merged per material so each
// body costs a handful of draw calls. Body space matches the Kenney kart:
// +z forward, y up, ground at y = 0, the seat around z = -0.2 and the steering
// column near (0, 0.9, 0.2), so every driver fits every body. (+x is the
// kart's left side.)
//
// v2.6: every body transforms for a boost (变形). Its moving parts are built
// as their own small merged groups with a folded pose and a deployed pose
// (`rig.parts`), plus spinners (`rig.spin`), wheels that fold flat for hover
// mode (`rig.tilt`) and a ride-height change (`rig.lift`); animateKart blends
// between the poses with a springy 0..1 transform amount. Exhaust flames have
// a deployed tip too (`tip1`), so they follow pipes that slide out.
import * as T from "./vendor/three.module.js";
import { mergeGeometries } from "./vendor/utils/BufferGeometryUtils.js";

const cache = new Map();
// Reflections (v2.6): paint and metal reflect the scene's environment map
// at their own strength (the scene default is a faint 0.24), so the bodies
// read as glossy car paint and chrome rather than flat plastic.
let environment = null;
export function setEnvironment(texture) {
  environment = texture;
  for (const m of cache.values())
    if (m.userData.reflect) {
      m.envMap = texture;
      m.needsUpdate = true;
    }
}
const std = (key, opts, reflect = 0) => {
  if (!cache.has(key)) {
    const m = new T.MeshStandardMaterial(opts);
    if (reflect) {
      m.userData.reflect = true;
      m.envMap = environment;
      m.envMapIntensity = reflect;
    }
    cache.set(key, m);
  }
  return cache.get(key);
};
// Car paint: a clear coat over a metallic base.
const paint = (key, color, { metalness = 0.45, roughness = 0.34, reflect = 1.1 } = {}) => {
  if (!cache.has(key)) {
    const m = new T.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: 1, clearcoatRoughness: 0.07 });
    m.userData.reflect = true;
    m.envMap = environment;
    m.envMapIntensity = reflect;
    cache.set(key, m);
  }
  return cache.get(key);
};
// Neon parts glow brighter during a boost: each body keeps its own copies of
// its glowing materials so one kart's boost does not light up the others.
const glowing = (colour, extra = {}) => {
  const m = new T.MeshBasicMaterial({ color: colour, toneMapped: false, ...extra });
  m.userData.noShadow = true;
  return m;
};
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
    bevelSegments: 4,
    curveSegments: 14,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // shape x -> body z, extrusion -> body x
  g.computeVertexNormals();
  return g;
}
// A smooth profile from a spline through the points.
function smoothProfile(points, width, bevel = 0.05, samples = 56) {
  const curve = new T.SplineCurve(points.map(([z, y]) => new T.Vector2(z, y)));
  return profile(
    curve.getPoints(samples).map((v) => [v.x, v.y]),
    width,
    bevel,
  );
}
// A flat plate seen from above: an (x, z) outline, `thick` tall, centred on
// y = 0, with softened edges. For wings and fins that lie in the x-z plane.
function plate(points, thick, bevel = 0.012) {
  const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, z)));
  const g = new T.ExtrudeGeometry(shape, {
    depth: Math.max(0.004, thick - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 8,
  });
  g.rotateX(Math.PI / 2); // shape y -> body z; extrusion -> -y
  g.translate(0, thick / 2 - bevel, 0);
  g.computeVertexNormals();
  return g;
}
// Solid of revolution about the z axis (radius, z pairs).
function lathe(points, segments = 36) {
  const g = new T.LatheGeometry(
    points.map(([r, z]) => new T.Vector2(Math.max(0.0001, r), z)),
    segments,
  );
  g.rotateX(Math.PI / 2); // lathe axis y -> body z
  return g;
}
const unitBox = new T.BoxGeometry(1, 1, 1),
  unitCyl = new T.CylinderGeometry(1, 1, 1, 28),
  unitSphere = new T.SphereGeometry(1, 24, 16);
// A box with rounded edges (unit size, scaled by the matrix).
const softBox = (() => {
  const s = new T.Shape(),
    r = 0.18;
  s.moveTo(-0.5 + r, -0.5);
  s.lineTo(0.5 - r, -0.5);
  s.quadraticCurveTo(0.5, -0.5, 0.5, -0.5 + r);
  s.lineTo(0.5, 0.5 - r);
  s.quadraticCurveTo(0.5, 0.5, 0.5 - r, 0.5);
  s.lineTo(-0.5 + r, 0.5);
  s.quadraticCurveTo(-0.5, 0.5, -0.5, 0.5 - r);
  s.lineTo(-0.5, -0.5 + r);
  s.quadraticCurveTo(-0.5, -0.5, -0.5 + r, -0.5);
  const g = new T.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -0.4);
  g.computeVertexNormals();
  return g;
})();

// --- Transformation rig ----------------------------------------------------------
// A moving part: its own merged group at `at`, built by `build(parts)`, posed
// between `from` (folded) and `to` (deployed): { p: offset, r: euler, s: scale }.
// `span` staggers it within the transform (0..1), so parts unfold in sequence.
function piece(g, at, build, from = {}, to = {}, span = [0, 1]) {
  const obj = new T.Group();
  obj.position.set(...at);
  g.add(obj);
  const parts = new Parts();
  build(parts);
  parts.build(obj, { shadows: false }); // small moving parts: no shadow pass draw calls
  const pose = (o) => ({
    p: new T.Vector3(...(o.p || [0, 0, 0])).add(obj.position),
    r: o.r || [0, 0, 0],
    s: o.s || [1, 1, 1],
  });
  const part = { obj, from: pose(from), to: pose(to), span };
  poseRig({ parts: [part], spin: [], tilt: 0, lift: 0 }, 0);
  return part;
}
const smooth = (x) => x * x * (3 - 2 * x);
// Pose a rig at transform amount m (0 folded .. 1 deployed; a little more
// while the spring overshoots, which every part follows past its pose).
export function poseRig(rig, m) {
  for (const part of rig.parts) {
    const [a, b] = part.span,
      k = m <= 1 ? smooth(Math.min(1, Math.max(0, (m - a) / (b - a)))) : 1 + (m - 1) * 1.4,
      { from, to, obj } = part;
    obj.position.lerpVectors(from.p, to.p, k);
    obj.rotation.set(from.r[0] + (to.r[0] - from.r[0]) * k, from.r[1] + (to.r[1] - from.r[1]) * k, from.r[2] + (to.r[2] - from.r[2]) * k);
    obj.scale.set(from.s[0] + (to.s[0] - from.s[0]) * k, from.s[1] + (to.s[1] - from.s[1]) * k, from.s[2] + (to.s[2] - from.s[2]) * k);
    obj.visible = !part.hideFolded || k > 0.02;
  }
}

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
    36,
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
// Each wheel sits in a tilt group so a hover body can fold it flat.
function mountWheels(body, spec) {
  const wheels = [];
  for (const [front, x, y, z, r, w] of spec.layout) {
    for (const side of [-1, 1]) {
      const pivot = new T.Group(),
        tilt = new T.Group();
      pivot.position.set(side * x, y, z);
      body.add(pivot);
      pivot.add(tilt);
      const mesh = wheel({ r, w, side, ...spec.style });
      tilt.add(mesh);
      wheels.push({ pivot, tilt, mesh, front, side });
    }
  }
  return wheels;
}

// --- 闪电 GT: a low red sports kart with a big rear wing ------------------------
// Transforms: the rear wing rises on telescoping struts and tilts into attack,
// carbon blades slide out of the side pods, the front wing's endplates flip
// out like canards, and the tail pipes extend.
// Liveries (v2.8 series): each body takes a `trim` of colours; the default
// is the original look. Materials are cached per colour.
const hex = (n) => n.toString(16);
function thunder(trim = {}) {
  const t = { paint: 0xd42a3c, stripe: 0xf5f3ee, tail: 0xff3046, under: 0xff4d6a, rim: 0xe3e8ee, metal: 0.5, ...trim };
  const g = new T.Group(),
    p = new Parts(),
    red = paint("gt-paint-" + hex(t.paint), t.paint, { metalness: t.metal, roughness: 0.3 }),
    pearl = paint("gt-pearl-" + hex(t.stripe), t.stripe, { metalness: 0.2 + (t.stripe === 0xf5f3ee ? 0 : 0.5), roughness: 0.28, reflect: 0.9 }),
    carbon = std("carbon", { color: 0x24282d, metalness: 0.35, roughness: 0.42 }, 0.6),
    chrome = t.rim === 0xe3e8ee ? std("chrome", { color: 0xe3e8ee, metalness: 1, roughness: 0.14 }, 1.5) : std("rim-" + hex(t.rim), { color: t.rim, metalness: 0.9, roughness: 0.2 }, 1.3),
    lights = glowing(0xfff6d8),
    tail = glowing(t.tail),
    under = underglow(t.under, 0.5);
  // Nose: a wedge rising to the cowl in front of the driver.
  p.add(smoothProfile([[0.25, 0.24], [1.0, 0.2], [1.62, 0.2], [1.86, 0.3], [1.66, 0.42], [1.1, 0.55], [0.55, 0.74], [0.25, 0.74]], 0.92, 0.08), red);
  // White racing stripes over the nose.
  for (const x of [-0.13, 0.13])
    p.add(smoothProfile([[0.3, 0.7], [0.55, 0.755], [1.1, 0.565], [1.66, 0.43], [1.6, 0.4], [1.05, 0.535], [0.5, 0.72], [0.3, 0.67]], 0.1, 0.01), pearl, M([x, 0.003, 0]));
  // Side pods between the wheels, with black intakes and a neon slit (the
  // blades come out of it).
  for (const s of [-1, 1]) {
    p.add(smoothProfile([[-0.34, 0.22], [0.48, 0.22], [0.5, 0.42], [0.2, 0.6], [-0.34, 0.64]], 0.5, 0.07), red, M([s * 0.7, 0, 0]));
    p.add(softBox, carbon, M([s * 0.7, 0.36, 0.5], [0, 0, 0], [0.4, 0.2, 0.05]));
    p.add(unitBox, pearl, M([s * 0.955, 0.42, 0.06], [0, 0, 0], [0.02, 0.06, 0.66]));
    p.add(unitBox, tail, M([s * 0.957, 0.45, 0.1], [0, 0, 0], [0.012, 0.018, 0.5]));
  }
  // Floor and seat back / engine cover sloping to the tail.
  p.add(unitBox, carbon, M([0, 0.24, -0.08], [0, 0, 0], [0.92, 0.08, 1.0]));
  p.add(smoothProfile([[-1.22, 0.3], [-0.5, 0.28], [-0.48, 0.8], [-0.56, 1.02], [-0.78, 1.0], [-1.0, 0.82], [-1.24, 0.6]], 0.98, 0.08), red);
  p.add(unitBox, carbon, M([0, 0.3, -1.2], [0, 0, 0], [1.1, 0.16, 0.12]));
  // Rear diffuser fins and a full-width LED bar under the wing.
  for (const x of [-0.36, -0.12, 0.12, 0.36]) p.add(unitBox, carbon, M([x, 0.2, -1.22], [0, 0, 0], [0.03, 0.14, 0.22]));
  p.add(unitBox, tail, M([0, 0.88, -1.235], [0, 0, 0], [0.9, 0.05, 0.02]));
  // Strut sleeves (the struts telescope out of them).
  for (const s of [-1, 1]) p.add(unitCyl, carbon, M([s * 0.38, 0.95, -1.08], [0, 0, 0], [0.06, 0.32, 0.06]));
  // Front wing with its centre section (the endplates move).
  p.add(softBox, carbon, M([0, 0.16, 1.7], [0, 0, 0], [2.0, 0.05, 0.36]));
  // Exhaust shrouds, headlights, taillights, neon underglow.
  for (const s of [-1, 1]) {
    p.add(lathe([[0.11, 0.0], [0.12, -0.12], [0.11, -0.3]]), carbon, M([s * 0.56, 0.6, -1.06], [-0.42, 0, 0]));
    p.add(unitBox, lights, M([s * 0.28, 0.34, 1.82], [0, 0, 0], [0.18, 0.05, 0.02]));
    p.add(unitBox, tail, M([s * 0.32, 0.5, -1.27], [0, 0, 0], [0.26, 0.06, 0.02]));
  }
  p.add(new T.PlaneGeometry(2.6, 4.2), under, M([0, 0.04, 0.2], [-Math.PI / 2, 0, 0]));
  p.build(g);
  const parts = [];
  // Rear wing: struts, the wing, endplates and stripes, rising and tilting.
  parts.push(
    piece(
      g,
      [0, 1.33, -1.08],
      (q) => {
        for (const s of [-1, 1]) q.add(unitCyl, chrome, M([s * 0.38, -0.3, 0], [0, 0, 0], [0.035, 0.5, 0.035]));
        q.add(smoothProfile([[-0.24, -0.03], [-0.1, 0.03], [0.18, 0.07], [0.26, 0.04], [0.08, -0.01], [-0.22, -0.06]], 2.0, 0.02), red);
        for (const s of [-1, 1]) {
          q.add(softBox, pearl, M([s * 1.0, -0.01, 0], [0, Math.PI / 2, 0], [0.56, 0.3, 0.05]));
          q.add(unitBox, pearl, M([s * 0.62, 0.075, 0.02], [0, 0, 0], [0.16, 0.012, 0.42]));
          q.add(unitBox, tail, M([s * 1.025, -0.01, 0], [0, 0, 0], [0.012, 0.22, 0.4]));
        }
      },
      {},
      { p: [0, 0.3, -0.06], r: [-0.26, 0, 0] },
      [0, 0.7],
    ),
  );
  // Rear blades: carbon wings with a red neon edge that slide out of the
  // engine cover over the rear wheels.
  for (const s of [-1, 1]) {
    const blade = piece(
      g,
      [s * 0.22, 0.98, -0.9],
      (q) => {
        q.add(plate([[s * -0.2, 0.22], [s * 0.42, 0.12], [s * 0.46, -0.2], [s * -0.2, -0.26]], 0.04), carbon);
        q.add(unitBox, tail, M([s * 0.45, 0, -0.04], [0, 0, 0], [0.025, 0.05, 0.32]));
        q.add(unitBox, tail, M([s * 0.1, 0.022, -0.02], [0, 0, 0], [0.5, 0.008, 0.03]));
      },
      { s: [0.4, 1, 0.9] },
      { p: [s * 0.62, 0.02, 0], r: [0, 0, s * -0.12] },
      [0.2, 0.85],
    );
    blade.hideFolded = true;
    parts.push(blade);
  }
  // Front wing endplates flip out like canards.
  for (const s of [-1, 1])
    parts.push(
      piece(
        g,
        [s * 0.98, 0.16, 1.7],
        (q) => {
          q.add(softBox, red, M([s * 0.02, 0.06, 0], [0, Math.PI / 2, 0], [0.42, 0.16, 0.04]));
        },
        {},
        { r: [0, 0, -s * 1.1], p: [s * 0.04, 0.03, 0] },
        [0.35, 1],
      ),
    );
  // Tail pipes slide out of their shrouds.
  const pipeDir = [0, Math.sin(-0.42), -Math.cos(-0.42)];
  parts.push(
    piece(
      g,
      [0, 0.6, -1.06],
      (q) => {
        for (const s of [-1, 1]) {
          q.add(unitCyl, chrome, M([s * 0.56, 0.06, -0.2], [-1.15, 0, 0], [0.08, 0.34, 0.08]));
          q.add(new T.TorusGeometry(0.075, 0.018, 8, 20), tail, M([s * 0.56, 0.115, -0.36], [-0.42, 0, 0]));
        }
      },
      {},
      { p: pipeDir.map((v) => v * 0.2) },
      [0.1, 0.6],
    ),
  );
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.86, 0.4, 0.9, 0.4, 0.38],
        [false, 0.88, 0.46, -0.76, 0.46, 0.5],
      ],
      style: { rim: chrome, spokes: 5 },
    }),
    exhaust: [-1, 1].map((s) => ({
      tip: new T.Vector3(s * 0.56, 0.74, -1.4),
      tip1: new T.Vector3(s * 0.56, 0.74 - 0.08, -1.4 - 0.18),
      dir: new T.Vector3(s * 0.45, 0.6, -0.66).normalize(),
      size: 1.12,
    })),
    glow: [under, tail],
    rig: { parts, spin: [], tilt: 0, lift: 0.04 },
    plate: [0, 0.31, 1.88],
    antenna: [-0.7, 0.62, -1.0],
  };
}

// --- 喷射火箭: twin side rockets and a glowing turbine behind the seat ---------
// Transforms: delta wings swing out from upright fins, the side rockets slide
// outward on their pylons, the tail fins spread, and the turbine spools up.
function jet(trim = {}) {
  const t = { body: 0xf7f6f2, accent: 0xff7a1a, fire: 0xff9a3a, under: 0xff8a3a, rim: 0xf0b543, ...trim };
  const g = new T.Group(),
    p = new Parts(),
    white = paint("jet-white-" + hex(t.body), t.body, { metalness: 0.25, roughness: 0.24, reflect: 0.9 }),
    orange = paint("jet-orange-" + hex(t.accent), t.accent, { metalness: 0.4, roughness: 0.3 }),
    steel = std("jet-steel", { color: 0x9aa3ad, metalness: 0.9, roughness: 0.26 }, 1.3),
    carbon = std("carbon", { color: 0x24282d, metalness: 0.35, roughness: 0.42 }, 0.6),
    chrome = std("chrome", { color: 0xe3e8ee, metalness: 1, roughness: 0.14 }, 1.5),
    fire = glowing(t.fire),
    under = underglow(t.under, 0.45);
  // Central tub with a pointed nose.
  p.add(smoothProfile([[-0.62, 0.24], [0.6, 0.22], [1.45, 0.24], [1.95, 0.34], [1.5, 0.5], [0.8, 0.66], [0.32, 0.72], [-0.62, 0.62]], 0.86, 0.1), white);
  p.add(smoothProfile([[0.9, 0.62], [1.45, 0.49], [1.9, 0.36], [1.94, 0.33], [1.46, 0.45], [0.9, 0.58]], 0.5, 0.02), orange, M([0, 0.01, 0]));
  // Pylon roots on the tub (the rockets slide out along them).
  for (const s of [-1, 1]) p.add(softBox, white, M([s * 0.47, 0.44, -0.3], [0, 0, 0], [0.12, 0.09, 0.9]));
  // Seat back and the turbine: housing, intake ring, glowing exhaust.
  p.add(smoothProfile([[-0.95, 0.3], [-0.5, 0.3], [-0.46, 0.86], [-0.6, 1.0], [-0.95, 0.88]], 0.84, 0.08), white);
  p.add(lathe([[0.36, 0.26], [0.42, 0.18], [0.44, 0], [0.42, -0.38], [0.34, -0.5]], 40), steel, M([0, 0.86, -1.0]));
  p.add(new T.TorusGeometry(0.39, 0.05, 12, 36), chrome, M([0, 0.86, -0.74]));
  p.add(new T.CircleGeometry(0.3, 32), fire, M([0, 0.86, -1.51], [0, Math.PI, 0]));
  p.add(new T.TorusGeometry(0.33, 0.04, 10, 36), chrome, M([0, 0.86, -1.5]));
  p.add(unitBox, carbon, M([0, 0.24, -0.1], [0, 0, 0], [0.86, 0.08, 1.0]));
  p.add(new T.PlaneGeometry(2.5, 4.2), under, M([0, 0.04, 0.15], [-Math.PI / 2, 0, 0]));
  p.build(g);
  const parts = [],
    spin = [];
  // Side rockets slide outward on their pylons.
  for (const s of [-1, 1])
    parts.push(
      piece(
        g,
        [s * 0.6, 0.56, 0],
        (q) => {
          q.add(lathe([[0, 0.62], [0.07, 0.55], [0.15, 0.4], [0.2, 0.18], [0.21, -0.2], [0.21, -0.95], [0.18, -1.08]]), steel);
          q.add(lathe([[0.215, 0.12], [0.22, -0.05], [0.215, -0.1]]), orange);
          q.add(lathe([[0.215, -0.6], [0.22, -0.72], [0.215, -0.76]]), orange);
          q.add(new T.TorusGeometry(0.17, 0.04, 10, 28), steel, M([0, 0, -1.08]));
          q.add(new T.CircleGeometry(0.15, 24), fire, M([0, 0, -1.09], [0, Math.PI, 0]));
          q.add(softBox, steel, M([s * -0.18, -0.1, -0.3], [0, 0, 0], [0.3, 0.06, 0.5]));
        },
        {},
        { p: [s * 0.23, 0, -0.12], r: [0, s * 0.05, 0] },
        [0, 0.6],
      ),
    );
  // Swing wings, F-14 style: swept back along the rockets when folded,
  // swinging out wide for a boost.
  for (const s of [-1, 1])
    parts.push(
      piece(
        g,
        [s * 0.4, 0.84, -0.42],
        (q) => {
          q.add(plate([[0, 0.3], [s * 1.12, -0.02], [s * 1.16, -0.24], [0, -0.36]], 0.045), white);
          q.add(plate([[s * 0.82, 0.03], [s * 1.13, -0.03], [s * 1.16, -0.24], [s * 0.82, -0.27]], 0.05), orange);
          q.add(unitBox, fire, M([s * 0.58, 0, 0.145], [0, s * -0.29, 0], [1.2, 0.03, 0.025]));
          q.add(lathe([[0, 0.16], [0.045, 0.1], [0.05, -0.14], [0.03, -0.18]], 16), orange, M([s * 1.16, 0, -0.08]));
        },
        { r: [0, s * 1.32, 0], s: [0.85, 1, 1] },
        { r: [0, s * 0.12, s * -0.05] },
        [0.12, 1],
      ),
    );
  // Tail fins spread.
  for (const s of [-1, 1])
    parts.push(
      piece(
        g,
        [s * 0.3, 1.18, 0],
        (q) => q.add(profile([[-0.9, 0.0], [-0.55, 0.0], [-1.25, 0.55], [-1.38, 0.55]], 0.05, 0.015), orange),
        { r: [0, 0, s * 0.35] },
        { r: [0, 0, s * 0.85] },
        [0.3, 0.9],
      ),
    );
  // Turbine fan: spins all the time, much faster while boosting.
  const fan = new T.Group();
  fan.position.set(0, 0.86, -0.76);
  g.add(fan);
  const fp = new Parts();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    fp.add(unitBox, carbon, M([Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0], [0, 0, a + 0.5], [0.34, 0.06, 0.02]));
  }
  fp.add(unitCyl, carbon, M([0, 0, 0.01], [Math.PI / 2, 0, 0], [0.07, 0.04, 0.07]));
  fp.build(fan, { shadows: false });
  spin.push({ obj: fan, axis: "z", idle: 3, boost: 42 });
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.9, 0.38, 0.95, 0.38, 0.34],
        [false, 0.98, 0.45, -0.78, 0.45, 0.46],
      ],
      style: { rim: std("rim-" + hex(t.rim), { color: t.rim, metalness: 0.9, roughness: 0.22 }, 1.3), spokes: 6 },
    }),
    exhaust: [
      { tip: new T.Vector3(0, 0.9, -1.56), dir: new T.Vector3(0, 0.62, -0.78).normalize(), size: 1.5 },
      ...[-1, 1].map((s) => ({
        tip: new T.Vector3(s * 0.6, 0.58, -1.12),
        tip1: new T.Vector3(s * 0.83, 0.58, -1.24),
        dir: new T.Vector3(s * 0.38, 0.5, -0.78).normalize(),
        size: 0.75,
      })),
    ],
    glow: [fire, under],
    rig: { parts, spin, tilt: 0, lift: 0.06 },
    plate: [0, 0.36, 1.86],
    antenna: [-0.42, 0.66, -0.5],
  };
}

// --- 幻影星舰: a black glossy body traced with neon -------------------------------
// Transforms into hover mode: the wheels fold flat into glowing hover pads and
// the body rises, the wing foils split into an X, and the thrusters extend.
function phantom(trim = {}) {
  const t = { paint: 0x15171c, graphite: 0x2b2f38, glass: 0x1f3b5a, neon: 0x3ff4ff, neon2: 0xb46bff, ...trim };
  const g = new T.Group(),
    p = new Parts(),
    black = paint("ph-black-" + hex(t.paint), t.paint, { metalness: 0.7, roughness: 0.24, reflect: 1.3 }),
    graphite = std("ph-graphite-" + hex(t.graphite), { color: t.graphite, metalness: 0.6, roughness: 0.33 }, 0.9),
    glass = std("ph-glass-" + hex(t.glass), { color: t.glass, metalness: 0.4, roughness: 0.04 }, 1.6),
    cyan = glowing(t.neon),
    violet = glowing(t.neon2),
    under = underglow(t.neon, 0.5);
  // Long low nose, flowing into the cowl; a windscreen arc above it.
  p.add(smoothProfile([[0.25, 0.24], [1.2, 0.2], [1.75, 0.22], [1.95, 0.28], [1.7, 0.36], [1.05, 0.5], [0.55, 0.68], [0.25, 0.7]], 0.96, 0.09), black);
  p.add(new T.CylinderGeometry(0.5, 0.5, 0.06, 32, 1, true, -1.0, 2.0), glass, M([0, 0.62, 0.42], [Math.PI / 2 - 0.75, 0, 0], [1, 1, 0.55]));
  // Blade-like side pods with a neon edge.
  for (const s of [-1, 1]) {
    p.add(smoothProfile([[-0.4, 0.22], [0.5, 0.22], [0.42, 0.4], [0.05, 0.58], [-0.4, 0.6]], 0.42, 0.06), graphite, M([s * 0.68, 0, 0]));
    p.add(unitBox, cyan, M([s * 0.9, 0.5, 0.04], [0.36, 0, 0], [0.02, 0.025, 0.86]));
    p.add(unitBox, cyan, M([s * 0.47, 0.6, 1.1], [0.29, 0, 0], [0.02, 0.025, 1.12]));
  }
  // Seat back and tail.
  p.add(smoothProfile([[-1.25, 0.3], [-0.5, 0.28], [-0.47, 0.84], [-0.58, 1.0], [-0.85, 0.96], [-1.28, 0.62]], 0.96, 0.08), black);
  for (const s of [-1, 1]) {
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
  const parts = [];
  // Wing foils over the rear wheels: two per side, lying flat together,
  // splitting into an X, each with a neon edge and an emitter at its tip.
  for (const s of [-1, 1])
    for (const up of [1, -1])
      parts.push(
        piece(
          g,
          [s * 0.46, 0.86, -0.62],
          (q) => {
            const skin = up > 0 ? black : graphite,
              neon = up > 0 ? cyan : violet;
            q.add(plate([[0, 0.34], [s * 0.86, 0.06], [s * 0.9, -0.2], [0, -0.32]], 0.035), skin);
            q.add(unitBox, neon, M([s * 0.88, 0, -0.07], [0, 0, 0], [0.025, 0.045, 0.3]));
            q.add(unitCyl, skin, M([s * 0.9, 0, 0.0], [Math.PI / 2, 0, 0], [0.035, 0.42, 0.035]));
            q.add(new T.SphereGeometry(0.05, 10, 8), neon, M([s * 0.9, 0, 0.22]));
          },
          { r: [0, 0, s * -0.12], s: [0.55, 1, 1] },
          { r: [0, 0, s * up * 0.44] },
          [0.25, 1],
        ),
      );
  // Twin square thrusters slide back and open up.
  parts.push(
    piece(
      g,
      [0, 0.68, -1.2],
      (q) => {
        for (const s of [-1, 1]) {
          q.add(softBox, graphite, M([s * 0.46, 0, 0], [0, 0, 0], [0.36, 0.28, 0.3]));
          q.add(unitBox, violet, M([s * 0.46, 0, -0.16], [0, 0, 0], [0.28, 0.18, 0.02]));
          q.add(new T.TorusGeometry(0.12, 0.022, 6, 4), violet, M([s * 0.46, 0, -0.17], [0, 0, Math.PI / 4], [1.2, 0.8, 1]));
        }
      },
      {},
      { p: [0, 0.02, -0.26], s: [1.06, 1.12, 1] },
      [0, 0.55],
    ),
  );
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.84, 0.39, 0.92, 0.39, 0.36],
        [false, 0.88, 0.44, -0.78, 0.44, 0.46],
      ],
      style: { rim: graphite, spokes: 3, glow: cyan },
    }),
    exhaust: [-1, 1].map((s) => ({
      tip: new T.Vector3(s * 0.46, 0.7, -1.4),
      tip1: new T.Vector3(s * 0.46, 0.72, -1.66),
      dir: new T.Vector3(s * 0.42, 0.58, -0.7).normalize(),
      size: 1.1,
    })),
    glow: [cyan, violet, under],
    rig: { parts, spin: [], tilt: 1.2, lift: 0.2 },
    plate: [0, 0.31, 1.94],
    antenna: [-0.68, 0.62, -0.95],
  };
}

// --- 经典卡丁 (Kenney kart) add-ons ------------------------------------------------
// The classic kart gets its own transformation: a spoiler in the driver's
// colour flips up off the rear deck, and two mini boosters slide out from
// between the wheels.
export function classicRig(accent = 0xeeae55) {
  const g = new T.Group(),
    accentPaint = paint("classic-accent-" + accent, accent, { metalness: 0.3, roughness: 0.3, reflect: 0.9 }),
    chrome = std("chrome", { color: 0xe3e8ee, metalness: 1, roughness: 0.14 }, 1.5),
    carbon = std("carbon", { color: 0x24282d, metalness: 0.35, roughness: 0.42 }, 0.6),
    neon = glowing(0x8ff3ff),
    flame = glowing(0xffb14a);
  const parts = [];
  // A big GT wing: hinged at the rear deck, lying back (hidden) when folded,
  // flipping up on twin struts above the rear wheels.
  const wing = piece(
    g,
    [0, 1.02, -1.12],
    (q) => {
      for (const s of [-1, 1]) q.add(softBox, carbon, M([s * 0.42, 0.36, -0.05], [0.12, 0, 0], [0.07, 0.74, 0.12]));
      q.add(smoothProfile([[-0.26, 0.7], [-0.04, 0.78], [0.22, 0.8], [0.27, 0.76], [0.02, 0.71], [-0.24, 0.66]], 1.72, 0.025), accentPaint);
      q.add(smoothProfile([[-0.25, 0.69], [0.0, 0.66], [0.26, 0.73], [0.0, 0.69]], 1.66, 0.01), carbon, M([0, -0.035, 0]));
      for (const s of [-1, 1]) {
        q.add(softBox, carbon, M([s * 0.87, 0.71, -0.01], [0, Math.PI / 2, 0], [0.58, 0.32, 0.04]));
        q.add(unitBox, neon, M([s * 0.895, 0.71, -0.01], [0, 0, 0], [0.012, 0.26, 0.5]));
      }
      q.add(unitBox, neon, M([0, 0.7, -0.27], [0, 0, 0], [1.6, 0.022, 0.02]));
    },
    { r: [-1.45, 0, 0], s: [0.9, 0.5, 1] },
    { r: [0.04, 0, 0] },
    [0, 0.7],
  );
  wing.hideFolded = true;
  parts.push(wing);
  // Twin rear boosters: slide back out of the bumper and spread apart.
  for (const s of [-1, 1]) {
    const pod = piece(
      g,
      [s * 0.4, 0.62, -1.0],
      (q) => {
        q.add(lathe([[0, 0.22], [0.08, 0.17], [0.13, 0.04], [0.13, -0.3], [0.11, -0.36]], 24), chrome);
        q.add(new T.TorusGeometry(0.11, 0.025, 8, 24), chrome, M([0, 0, -0.34]));
        q.add(new T.CircleGeometry(0.095, 22), flame, M([0, 0, -0.365], [0, Math.PI, 0]));
        q.add(softBox, chrome, M([s * -0.14, -0.06, 0], [0, 0, 0], [0.2, 0.06, 0.2]));
      },
      { s: [0.5, 0.5, 0.5] },
      { p: [s * 0.3, 0.02, -0.36] },
      [0.2, 0.9],
    );
    pod.hideFolded = true;
    parts.push(pod);
  }
  return { group: g, glow: [neon, flame], rig: { parts, spin: [], tilt: 0, lift: 0.03 } };
}

// --- 棉花糖 (v2.8): a round sweet-shop kart --------------------------------------
// A glossy rounded tub with a cream rim, a button nose and chunky wheels.
// Transforms: two cotton-candy clouds puff out at its sides, a pair of candy
// rockets slide out of the tail, and a lollipop swirl turns behind the seat.
function puff(trim = {}) {
  const t = { shell: 0xffa9c2, cream: 0xfff4ea, accent: 0xff6f9f, glow: 0xffc1dc, under: 0xff8fbd, ...trim };
  const g = new T.Group(),
    p = new Parts(),
    shell = paint("puff-shell-" + hex(t.shell), t.shell, { metalness: 0.15, roughness: 0.22, reflect: 0.8 }),
    // (The tub is seen from inside too: both faces drawn, lit the right way.)
    tubPaint = (() => {
      const key = "puff-tub-" + hex(t.shell);
      if (!cache.has(key)) {
        const m = shell.clone();
        m.side = T.DoubleSide;
        cache.set(key, m);
      }
      return cache.get(key);
    })(),
    seat = std("puff-seat-" + hex(t.shell), { color: new T.Color(t.shell).multiplyScalar(0.78), roughness: 0.6 }, 0.3),
    cream = std("puff-cream-" + hex(t.cream), { color: t.cream, metalness: 0, roughness: 0.55 }, 0.4),
    accent = paint("puff-accent-" + hex(t.accent), t.accent, { metalness: 0.3, roughness: 0.25, reflect: 0.9 }),
    carbon = std("carbon", { color: 0x24282d, metalness: 0.35, roughness: 0.42 }, 0.6),
    chrome = std("chrome", { color: 0xe3e8ee, metalness: 1, roughness: 0.14 }, 1.5),
    lights = glowing(0xfff6e8),
    sweet = glowing(t.glow),
    under = underglow(t.under, 0.45);
  // The tub: the lower half of a squashed egg, open at the top (the driver
  // sits in it), with a floor inside; and a cream rim round its edge.
  const tub = new T.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  p.add(tub, tubPaint, M([0, 0.82, 0.1], [0, 0, 0], [0.86, 0.6, 1.55]));
  p.add(new T.CircleGeometry(1, 40), seat, M([0, 0.5, 0.1], [-Math.PI / 2, 0, 0], [0.8, 1.45, 1]));
  // A rounded hood over the front half, like a scoop of ice cream.
  const dome = new T.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  p.add(dome, shell, M([0, 0.8, 0.98], [0, 0, 0], [0.8, 0.34, 0.66]));
  p.add(new T.TorusGeometry(1, 0.075, 10, 64), cream, M([0, 0.83, 0.1], [Math.PI / 2, 0, 0], [0.86, 1.55, 1]));
  // Cream drips over the rim, and a row of sprinkles on the nose.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2,
      x = Math.sin(a) * 0.86,
      z = 0.1 + Math.cos(a) * 1.55;
    p.add(unitSphere, cream, M([x * 1.01, 0.76, z], [0, 0, 0], [0.09, 0.13 + (i % 3) * 0.03, 0.09]));
  }
  for (let i = 0; i < 6; i++) p.add(unitBox, [accent, cream, sweet][i % 3], M([(i - 2.5) * 0.12, 0.62 + Math.abs(i - 2.5) * -0.012, 1.58 - Math.abs(i - 2.5) * 0.02], [0.4, i * 0.7, 0.3], [0.035, 0.035, 0.11]));
  // Button nose bumper and round headlights.
  p.add(unitSphere, accent, M([0, 0.5, 1.68], [0, 0, 0], [0.22, 0.18, 0.14]));
  for (const s of [-1, 1]) p.add(unitSphere, lights, M([s * 0.42, 0.68, 1.45], [0, 0, 0], [0.11, 0.09, 0.06]));
  // Seat cushion, and two round tail lights.
  p.add(softBox, cream, M([0, 0.98, -0.68], [-0.2, 0, 0], [0.82, 0.5, 0.22]));
  for (const s of [-1, 1]) p.add(unitSphere, sweet, M([s * 0.34, 0.66, -1.42], [0, 0, 0], [0.12, 0.1, 0.05]));
  p.add(new T.PlaneGeometry(2.4, 4), under, M([0, 0.04, 0.1], [-Math.PI / 2, 0, 0]));
  p.build(g);
  const parts = [],
    spin = [];
  // Cotton-candy clouds puff out at the sides.
  for (const s of [-1, 1]) {
    const cloud = piece(
      g,
      [s * 0.7, 0.86, -0.35],
      (q) => {
        for (const [x, y, z, r] of [[0.32, 0.05, 0.1, 0.3], [0.62, 0.12, -0.12, 0.26], [0.45, 0.3, -0.05, 0.24], [0.85, 0.02, -0.3, 0.2], [0.2, 0.22, -0.25, 0.2]])
          q.add(unitSphere, cream, M([s * x, y, z], [0, 0, 0], [r, r * 0.85, r]));
        q.add(unitSphere, sweet, M([s * 0.98, 0.0, -0.4], [0, 0, 0], [0.08, 0.08, 0.08]));
      },
      { s: [0.15, 0.15, 0.15] },
      { p: [s * 0.08, 0.06, 0] },
      [0.1, 0.9],
    );
    cloud.hideFolded = true;
    parts.push(cloud);
  }
  // Candy rockets slide out of the tail.
  for (const s of [-1, 1]) {
    const rocket = piece(
      g,
      [s * 0.36, 0.62, -1.1],
      (q) => {
        q.add(lathe([[0, 0.3], [0.08, 0.24], [0.13, 0.1], [0.13, -0.22], [0.11, -0.28]], 20), accent);
        q.add(lathe([[0.132, 0.02], [0.135, -0.08], [0.132, -0.1]], 20), cream);
        q.add(new T.TorusGeometry(0.1, 0.022, 8, 20), chrome, M([0, 0, -0.28]));
        q.add(new T.CircleGeometry(0.09, 18), sweet, M([0, 0, -0.29], [0, Math.PI, 0]));
      },
      { s: [0.5, 0.5, 0.5] },
      { p: [s * 0.18, 0.02, -0.3] },
      [0.2, 0.85],
    );
    rocket.hideFolded = true;
    parts.push(rocket);
  }
  // A lollipop swirl on a stick behind the seat: turns slowly, fast in a boost.
  const swirl = new T.Group();
  swirl.position.set(0, 1.55, -0.92);
  g.add(swirl);
  const sp = new Parts();
  sp.add(unitCyl, cream, M([0, -0.32, 0], [0, 0, 0], [0.025, 0.5, 0.025]));
  sp.add(new T.CylinderGeometry(0.26, 0.26, 0.06, 28), cream, M([0, 0, 0], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 3; i++) sp.add(new T.TorusGeometry(0.07 + i * 0.07, 0.022, 6, 24, Math.PI * 1.6), [accent, sweet, accent][i], M([0, 0, 0.035], [0, 0, i * 1.2]));
  sp.build(swirl, { shadows: false });
  spin.push({ obj: swirl, axis: "z", idle: 1.2, boost: 14 });
  return {
    group: g,
    wheels: mountWheels(g, {
      layout: [
        [true, 0.86, 0.36, 0.98, 0.36, 0.34],
        [false, 0.9, 0.42, -0.82, 0.42, 0.44],
      ],
      style: { rim: cream, spokes: 4, hub: accent },
    }),
    exhaust: [-1, 1].map((s) => ({
      tip: new T.Vector3(s * 0.36, 0.64, -1.38),
      tip1: new T.Vector3(s * 0.54, 0.66, -1.68),
      dir: new T.Vector3(s * 0.4, 0.58, -0.7).normalize(),
      size: 0.9,
    })),
    glow: [sweet, under],
    rig: { parts, spin, tilt: 0, lift: 0.05 },
    plate: [0, 0.44, 1.66],
    antenna: [-0.62, 0.86, -0.9],
  };
}

const BUILDERS = { thunder, jet, phantom, puff };
export const PREMIUM_BODIES = Object.keys(BUILDERS);
// Build a premium body: { group, wheels, exhaust: [{tip, tip1?, dir, size}],
// glow, rig, plate, antenna }. Glowing materials are fresh per kart (they
// pulse with that kart's boosts); everything else is shared. `trim`: the
// livery's colours (v2.8).
export function buildBody(id, trim) {
  const make = BUILDERS[id];
  return make ? make(trim) : null;
}
