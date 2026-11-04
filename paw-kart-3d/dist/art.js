import * as T from "./vendor/three.module.js";
import { kartAsset } from "./kart-assets.js?v=c9d5e852";
import { buildBody } from "./kart-bodies.js?v=c9d5e852";
import { dog, animateDog, reactDog, material, ellipsoid, roundedBox, star as starMesh } from "./models.js?v=c9d5e852";
import { CHARACTERS, seeded } from "./race.js?v=c9d5e852";
const scenerySphere = new T.SphereGeometry(1, 12, 8);
const sphere = new T.SphereGeometry(1, 24, 18),
  unitBox = new T.BoxGeometry(1, 1, 1),
  cylinder = new T.CylinderGeometry(1, 1, 1, 20);
const mcache = new Map();
export function mat(c, rough = 0.7) {
  const k = c + ":" + rough;
  if (!mcache.has(k)) mcache.set(k, new T.MeshStandardMaterial({ color: c, roughness: rough }));
  return mcache.get(k);
}
export function ball(g, c, p, s) {
  const m = new T.Mesh(sphere, typeof c === "number" ? mat(c) : c);
  m.position.set(...p);
  m.scale.set(...s);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export function box(g, c, p, s) {
  const m = new T.Mesh(unitBox, typeof c === "number" ? mat(c) : c);
  m.position.set(...p);
  m.scale.set(...s);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export function cyl(g, c, p, s) {
  const m = new T.Mesh(cylinder, typeof c === "number" ? mat(c) : c);
  m.position.set(...p);
  m.scale.set(...s);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function line(g, points, r, c = 0x342c2a) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  const mesh = new T.Mesh(new T.TubeGeometry(curve, 16, r, 6, false), mat(c));
  g.add(mesh);
  return mesh;
}
export function label(text, { bg = "#fff9e9", fg = "#333e40", w = 512, h = 180 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 " + Math.floor(h * 0.54) + "px Arial, sans-serif";
  ctx.fillText(text, w / 2, h / 2, w * 0.93);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function badge(g, text, p, w = 1, h = 0.4, bg = "#fff8df", fg = "#284642") {
  const mesh = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map: label(text, { bg, fg }), transparent: true, side: T.DoubleSide }),
  );
  mesh.position.set(...p);
  g.add(mesh);
  return mesh;
}
function eyes(g, y, z, x = 0.23, size = 0.065) {
  return [-1, 1].map((side) => {
    const e = ball(g, 0x242733, [side * x, y, z], [size, size * 1.35, 0.035]);
    ball(e, 0xffffff, [-0.28, 0.28, 0.8], [0.23, 0.23, 0.2]);
    return e;
  });
}
// Expression set for the bunny and the bear, matching the dogs' face rig:
// happy "^ ^" eyes, dizzy "x x" eyes, focused brows, and a grin / "o" mouth.
function expressions(head, eyeList, smile) {
  const dark = 0x2a2d36,
    happy = [],
    hurt = [],
    brows = [];
  for (const e of eyeList) {
    const x = e.position.x,
      y = e.position.y,
      z = e.position.z + 0.02;
    const arc = new T.Mesh(new T.TorusGeometry(0.055, 0.016, 6, 14, Math.PI), mat(dark));
    arc.position.set(x, y - 0.02, z);
    arc.visible = false;
    head.add(arc);
    happy.push(arc);
    const cross = new T.Group();
    cross.position.set(x, y, z);
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const bar = box(cross, dark, [0, 0, 0], [0.13, 0.024, 0.02]);
      bar.rotation.z = a;
    }
    cross.visible = false;
    head.add(cross);
    hurt.push(cross);
    const brow = box(head, dark, [x, y + 0.13, z - 0.01], [0.12, 0.026, 0.02]);
    brow.rotation.z = (x > 0 ? 1 : -1) * 0.38; // inner ends down: determined
    brow.visible = false;
    brows.push(brow);
  }
  const grin = ball(head, 0x4a2b2e, [0, -0.25, 0.54], [0.12, 0.07, 0.03]);
  grin.visible = false;
  const oh = ball(head, 0x4a2b2e, [0, -0.26, 0.545], [0.05, 0.065, 0.03]);
  oh.visible = false;
  return { eyes: eyeList, happy, hurt, brows, smile, grin, oh };
}
function character(kind) {
  if (kind === "gold" || kind === "white") {
    const d = dog(kind, true);
    d.userData.kartDog = true;
    d.scale.setScalar(0.68);
    d.position.set(0, 0.48, -0.28);
    d.userData.bag.visible = false;
    d.userData.strap.visible = false;
    return d;
  }
  const root = new T.Group(),
    head = new T.Group();
  root.add(head);
  head.position.y = 1.73;
  const eyeList = [];
  const ears = [];
  if (kind === "dora") {
    ball(root, 0x159cd4, [0, 1.05, -0.12], [0.54, 0.62, 0.44]);
    ball(root, 0xfaf7ef, [0, 1.02, 0.29], [0.41, 0.43, 0.16]);
    ball(head, 0x149fd6, [0, 0, 0], [0.78, 0.73, 0.65]);
    ball(head, 0xfffcf4, [0, -0.12, 0.29], [0.67, 0.56, 0.42]);
    for (const s of [-1, 1]) {
      ball(head, 0xffffff, [s * 0.18, 0.24, 0.59], [0.19, 0.25, 0.09]);
      const e = ball(head, 0x252936, [s * 0.1, 0.22, 0.674], [0.048, 0.08, 0.023]);
      eyeList.push(e);
    }
    ball(head, 0xe64547, [0, 0.035, 0.745], [0.13, 0.12, 0.1]);
    ball(head, 0xffffff, [-0.035, 0.075, 0.82], [0.03, 0.025, 0.012]);
    line(
      head,
      [
        [0, -0.08, 0.72],
        [0, -0.26, 0.69],
      ],
      0.018,
    );
    line(
      head,
      [
        [-0.44, -0.2, 0.62],
        [-0.28, -0.4, 0.65],
        [0, -0.46, 0.66],
        [0.28, -0.4, 0.65],
        [0.44, -0.2, 0.62],
      ],
      0.022,
    );
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++)
        line(
          head,
          [
            [s * 0.3, -0.02 - i * 0.11, 0.69],
            [s * 0.63, 0.03 - i * 0.18, 0.57],
          ],
          0.012,
        );
    const collar = new T.Mesh(new T.TorusGeometry(0.44, 0.065, 8, 36), mat(0xea444c));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.26;
    root.add(collar);
    ball(root, 0xffce45, [0, 1.23, 0.47], [0.115, 0.13, 0.105]);
    line(
      root,
      [
        [-0.075, 1.25, 0.55],
        [0.075, 1.25, 0.55],
      ],
      0.012,
    );
    ball(root, 0x4d4234, [0, 1.19, 0.57], [0.02, 0.02, 0.014]);
    line(
      root,
      [
        [-0.26, 1.05, 0.448],
        [-0.21, 0.84, 0.45],
        [0, 0.77, 0.46],
        [0.21, 0.84, 0.45],
        [0.26, 1.05, 0.448],
        [-0.26, 1.05, 0.448],
      ],
      0.015,
    );
    for (const s of [-1, 1]) {
      ball(root, 0xffffff, [s * 0.37, 0.63, 0.2], [0.27, 0.15, 0.36]);
      ball(root, 0x159cd4, [s * 0.48, 1.03, 0.12], [0.16, 0.3, 0.16]);
      ball(root, 0xffffff, [s * 0.49, 0.96, 0.43], [0.18, 0.18, 0.18]);
    }
    ball(root, 0xe94c53, [0, 0.88, -0.59], [0.12, 0.12, 0.12]);
  } else if (kind === "mario") {
    ball(root, 0x276bc5, [0, 0.99, -0.06], [0.49, 0.51, 0.35]);
    ball(root, 0xe74b43, [0, 1.2, -0.05], [0.48, 0.3, 0.34]);
    for (const s of [-1, 1]) {
      box(root, 0x2869c5, [s * 0.26, 1.2, 0.26], [0.13, 0.41, 0.08]);
      ball(root, 0xffd563, [s * 0.26, 1.12, 0.32], [0.055, 0.055, 0.024]);
      ball(root, 0x48312b, [s * 0.29, 0.57, 0.27], [0.26, 0.18, 0.36]);
      ball(root, 0xe4483f, [s * 0.49, 1.13, 0.12], [0.19, 0.31, 0.18]);
      ball(root, 0xfff5ea, [s * 0.49, 0.97, 0.43], [0.19, 0.18, 0.19]);
    }
    ball(head, 0xf4bf92, [0, 0, 0.02], [0.62, 0.59, 0.52]);
    ball(head, 0x573729, [0, 0.12, -0.18], [0.63, 0.51, 0.42]);
    ball(head, 0xf6c59c, [0, -0.05, 0.16], [0.57, 0.48, 0.47]);
    for (const s of [-1, 1]) {
      ball(head, 0xf2b68b, [s * 0.59, -0.02, 0.02], [0.14, 0.2, 0.14]);
      ball(head, 0xffffff, [s * 0.2, 0.13, 0.59], [0.11, 0.17, 0.04]);
      ball(head, 0x267bb4, [s * 0.2, 0.12, 0.625], [0.06, 0.09, 0.02]);
      eyeList.push(ball(head, 0x202830, [s * 0.2, 0.12, 0.648], [0.028, 0.06, 0.015]));
      line(
        head,
        [
          [s * 0.09, 0.31, 0.55],
          [s * 0.21, 0.36, 0.55],
          [s * 0.32, 0.31, 0.52],
        ],
        0.035,
        0x563529,
      );
    }
    for (let i = 0; i < 6; i++)
      ball(head, 0x4a3028, [(i - 2.5) * 0.11, -0.17 + Math.abs(i - 2.5) * 0.014, 0.6], [0.095, 0.11, 0.06]);
    ball(head, 0xf5bf8f, [0, -0.015, 0.69], [0.19, 0.17, 0.19]);
    ball(head, 0xe8473d, [0, 0.42, -0.03], [0.66, 0.32, 0.55]);
    ball(head, 0xed5042, [0, 0.32, 0.42], [0.58, 0.08, 0.37]);
    ball(head, 0xfff5e4, [0, 0.48, 0.48], [0.19, 0.18, 0.055]);
    badge(head, "M", [0, 0.48, 0.54], 0.24, 0.22, "#fff5e4", "#de4741");
  } else {
    const bunny = kind === "bunny",
      color = bunny ? 0xffe4e7 : 0x9dd4bf;
    ball(root, color, [0, 1.02, -0.1], [0.49, 0.54, 0.37]);
    ball(root, 0xfff4db, [0, 1.02, 0.23], [0.31, 0.32, 0.12]);
    ball(head, color, [0, 0, 0], [0.68, 0.6, 0.53]);
    for (const s of [-1, 1]) {
      const ear = new T.Group();
      ear.position.set(s * 0.43, 0.44, 0);
      head.add(ear);
      ball(ear, color, [0, bunny ? 0.38 : 0.03, 0], bunny ? [0.18, 0.58, 0.18] : [0.23, 0.23, 0.15]);
      ball(
        ear,
        bunny ? 0xefacbc : 0xe3ead7,
        [0, bunny ? 0.39 : 0.03, 0.13],
        bunny ? [0.09, 0.4, 0.06] : [0.13, 0.13, 0.05],
      );
      ears.push(ear);
      // Arms and legs are fitted to the kart's wheel in createKart().
      ball(head, 0xeaa2a7, [s * 0.43, -0.14, 0.44], [0.13, 0.07, 0.04]);
    }
    eyeList.push(...eyes(head, 0.04, 0.52, 0.23, 0.052));
    ball(head, 0x4e4a43, [0, -0.13, 0.58], [0.065, 0.045, 0.04]);
    const smile = line(
      head,
      [
        [-0.12, -0.23, 0.53],
        [0, -0.27, 0.55],
        [0.12, -0.23, 0.53],
      ],
      0.018,
    );
    root.userData.face = expressions(head, eyeList, smile);
    const band = new T.Mesh(new T.TorusGeometry(0.37, 0.07, 8, 28), mat(bunny ? 0xd8819f : 0xffdc6c));
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.29;
    root.add(band);
  }
  root.userData = { ...root.userData, head, eyes: eyeList, ears };
  if (kind === "bunny" || kind === "bear") root.userData.limbs = { color: kind === "bunny" ? 0xffe4e7 : 0x9dd4bf };
  return root;
}
// ---------------------------------------------------------------------------
// Kart assembly
// ---------------------------------------------------------------------------
// Exhaust pipe caps measured from the Kenney kart mesh (identical in all five
// variants): model (±0.224, 0.623, -0.552), axis (0, 0.71, -0.71), scaled by
// 2.05. V2 put its flame balls at (±0.35, 0.48, -1.28), low behind the bumper,
// where the kart itself hid them from the chase camera.
const EXHAUST_TIPS = [-1, 1].map((s) => new T.Vector3(s * 0.459, 1.283, -1.138));
// Flames leave close to the pipe axis (up and back), so from the raised chase
// camera they rise above the stacks instead of pointing straight at the lens.
// Each flame also fans outward, so from straight behind the pair reads as a V
// on either side of the driver rather than two dots pointing at the lens.
const EXHAUST_DIRS = [-1, 1].map((side) => new T.Vector3(side * 0.42, 0.62, -0.66).normalize());
const WHITE = new T.Color(0xffffff),
  UP = new T.Vector3(0, 1, 0);
export const NITRO = {
  drift1: { outer: 0x1aa8ff, core: 0xe4f8ff, len: 1.15 },
  drift2: { outer: 0xff7a12, core: 0xfff0b8, len: 1.35 },
  drift3: { outer: 0xf03cc8, core: 0xffe8ff, len: 1.6 },
  item: { outer: 0xff5410, core: 0xffe39a, len: 1.7 },
  pad: { outer: 0x12c9ff, core: 0xeaffff, len: 1.3 },
  star: { outer: 0xffc21a, core: 0xffffff, len: 1.45 },
  rocket: { outer: 0xff6a1a, core: 0xfff7d6, len: 2.3 },
  nitro: { outer: 0x3fd2ff, core: 0xf2fdff, len: 2.1 },
  start: { outer: 0x5ce1ff, core: 0xffffff, len: 2.3 },
  draft: { outer: 0xbfeaff, core: 0xffffff, len: 0.95 },
};
let compatibility = false;
// The CPU fallback renderer has no blending or texture alpha: flames there are
// drawn as solid cones only.
export function setCompatibilityMode(on) {
  compatibility = !!on;
}
// Teardrop flame body: wide at the nozzle, tapering to a point (around +y).
const flameGeo = new T.LatheGeometry(
  [
    [0.0, -0.02],
    [0.62, 0.0],
    [0.95, 0.07],
    [1.0, 0.16],
    [0.86, 0.36],
    [0.58, 0.6],
    [0.28, 0.83],
    [0.0, 1.0],
  ].map(([x, y]) => new T.Vector2(x, y)),
  14,
);
// Axial billboard: a quad from the nozzle (y=0) to the tip (y=1) that turns
// about the flame axis to face the camera, so the flame reads from any angle.
const boardGeo = new T.PlaneGeometry(1, 1);
boardGeo.translate(0, 0.5, 0);
for (const geo of [flameGeo, boardGeo]) geo.userData.shared = true;
const canvasTexture = (w, h, paint) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d"),
    img = x.createImageData(w, h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const a = paint((i + 0.5) / w, 1 - (j + 0.5) / h),
        k = (j * w + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
    }
  x.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
};
let flameTex = null,
  glowTex = null;
const smooth01 = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
function flameMap() {
  // Soft tongue: full width just above the nozzle, tapering to a wisp.
  return (flameTex ||= canvasTexture(48, 128, (u, v) => {
    const width = Math.pow(1 - v, 0.75) * smooth01(0, 0.12, v) * 0.5 + 0.02,
      edge = 1 - smooth01(width * 0.35, width, Math.abs(u - 0.5));
    return edge * Math.pow(1 - v, 0.55);
  }));
}
function glowMap() {
  return (glowTex ||= canvasTexture(64, 64, (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2;
    return Math.pow(Math.max(0, 1 - r), 2.2);
  }));
}
const fx = (color, opacity, blending, map) =>
  new T.MeshBasicMaterial({
    color,
    map: map || null,
    transparent: true,
    opacity,
    blending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    side: T.DoubleSide,
  });
function exhaustFlame(body) {
  const nozzle = new T.Group(),
    turn = new T.Group(); // spins about the axis to face the camera
  const outer = new T.Mesh(boardGeo, fx(0x1aa8ff, 0.95, T.NormalBlending, flameMap())),
    inner = new T.Mesh(boardGeo, fx(0xe4f8ff, 1, T.AdditiveBlending, flameMap())),
    core = new T.Mesh(flameGeo, fx(0xe4f8ff, 0.9, T.AdditiveBlending)),
    solid = new T.Mesh(flameGeo, new T.MeshBasicMaterial({ color: 0x1aa8ff, fog: false })),
    glow = new T.Sprite(
      new T.SpriteMaterial({
        map: glowMap(),
        color: 0x1aa8ff,
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
  for (const m of [outer, inner, core, glow]) m.renderOrder = 5;
  turn.add(outer, inner);
  nozzle.add(turn, core, glow, solid);
  body.add(nozzle);
  nozzle.visible = false;
  return { nozzle, turn, outer, inner, core, solid, glow };
}

// A small three-spoke wheel on a column. The kart model ships without one, so
// in V2 no driver had anything to hold.
const wheelRim = new T.TorusGeometry(0.2, 0.034, 10, 36),
  wheelSpoke = new T.BoxGeometry(0.2, 0.04, 0.03),
  wheelHub = new T.CylinderGeometry(0.06, 0.07, 0.07, 18),
  wheelColumn = new T.CylinderGeometry(0.03, 0.04, 1, 10);
for (const geo of [wheelRim, wheelSpoke, wheelHub, wheelColumn]) geo.userData.shared = true;
const WHEEL_TILT = 0.52; // column runs forward-down; rim top leans away, as in a real kart
function steeringWheel(body, centre, accent) {
  const mount = new T.Group();
  mount.position.copy(centre);
  mount.rotation.x = WHEEL_TILT;
  body.add(mount);
  const spin = new T.Group();
  mount.add(spin);
  const rim = new T.Mesh(wheelRim, mat(0x30363a, 0.45));
  rim.castShadow = true;
  spin.add(rim);
  for (const a of [Math.PI / 2, Math.PI * (7 / 6), Math.PI * (11 / 6)]) {
    const spoke = new T.Mesh(wheelSpoke, mat(0x5b6468, 0.4));
    spoke.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0);
    spoke.rotation.z = a;
    spin.add(spoke);
  }
  const hub = new T.Mesh(wheelHub, mat(accent, 0.45));
  hub.rotation.x = Math.PI / 2;
  spin.add(hub);
  // Column runs from the hub forward and down into the dash.
  const col = new T.Mesh(wheelColumn, mat(0x4a5256, 0.45));
  col.scale.y = 0.5;
  col.rotation.x = Math.PI / 2;
  col.position.z = 0.25;
  mount.add(col);
  mount.updateMatrix();
  return { mount, spin };
}
// Where a hand holds the rim (10 and 2 o'clock), in body coordinates, for a
// given wheel rotation.
const gripLocal = new T.Vector3();
function gripPoint(wheel, side, spin, out) {
  const a = Math.PI / 2 + side * -1.05 + spin;
  gripLocal.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.0);
  wheel.mount.updateMatrix();
  return out.copy(gripLocal).applyMatrix4(wheel.mount.matrix);
}

// Two-segment limb made of rounded capsules: shoulder -> elbow -> hand.
const capsule = new T.CapsuleGeometry(1, 1, 6, 12);
capsule.userData.shared = true;
const yAxis = new T.Vector3(0, 1, 0),
  tmpA = new T.Vector3(),
  tmpB = new T.Vector3(),
  tmpC = new T.Vector3();
function segment(group, color, radius) {
  const m = new T.Mesh(capsule, typeof color === "number" ? mat(color, 0.72) : color);
  m.castShadow = true;
  m.userData.radius = radius;
  group.add(m);
  return m;
}
function placeSegment(m, a, b) {
  const len = Math.max(0.001, a.distanceTo(b)),
    r = m.userData.radius;
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(yAxis, tmpC.copy(b).sub(a).normalize());
  // The unit capsule (radius 1, body 1) is 3 tall: scale it to span a..b,
  // caps included, with thickness r.
  m.scale.set(r, Math.max(r * 0.8, len / 3), r);
}
// Bend the elbow outwards and down so arms never pass through the torso.
function elbow(shoulder, hand, side, upper, fore, out) {
  const d = shoulder.distanceTo(hand),
    reach = Math.min(d, upper + fore - 0.001),
    along = (upper * upper - fore * fore + reach * reach) / (2 * reach),
    h = Math.sqrt(Math.max(0, upper * upper - along * along));
  const dir = tmpA.copy(hand).sub(shoulder).normalize(),
    bend = tmpB.set(side * 0.75, -0.62, -0.2);
  bend.addScaledVector(dir, -bend.dot(dir)).normalize(); // perpendicular to the arm
  return out.copy(shoulder).addScaledVector(dir, along).addScaledVector(bend, h);
}

// Limbs live in `space` (the driver for the plush characters, the kart body
// for the Kenney drivers, whose single-mesh figures were modelled armless).
function fitLimbs(space, color, opts = {}) {
  const s = opts.scale || 1;
  const arms = [-1, 1].map((side) => ({
    side,
    shoulder: new T.Vector3(...(opts.shoulder || [0.43, 1.2, 0.04])).multiply(new T.Vector3(side, 1, 1)),
    upper: segment(space, color, 0.115 * s),
    fore: segment(space, color, 0.105 * s),
    hand: ball(space, color, [0, 0, 0], [0.135 * s, 0.12 * s, 0.14 * s]),
    lengths: [0.36 * s, 0.34 * s],
    elbow: new T.Vector3(),
    target: new T.Vector3(),
  }));
  if (opts.legs !== false)
    for (const side of [-1, 1]) {
      const hip = new T.Vector3(side * 0.22, 0.66, 0.08),
        knee = new T.Vector3(side * 0.26, 0.74, 0.5),
        ankle = new T.Vector3(side * 0.26, 0.5, 0.78);
      placeSegment(segment(space, color, 0.15), hip, knee);
      placeSegment(segment(space, color, 0.12), knee, ankle);
      ball(space, color, [side * 0.26, 0.47, 0.86], [0.15, 0.12, 0.21]);
    }
  return { arms, space };
}

export function createKart(kind = "gold", number = 1, bodyId = "classic") {
  const g = new T.Group(),
    body = new T.Group();
  g.add(body);
  // A premium body (闪电 GT, 喷射火箭, 幻影星舰) or the classic Kenney kart.
  const premium = bodyId && bodyId !== "classic" ? buildBody(bodyId) : null;
  let asset;
  if (premium) {
    body.add(premium.group);
    let nativeDriver = null;
    if (["nova", "milo"].includes(kind)) {
      // These two drivers come with the Kenney kart: lift them out of it,
      // keeping their seat position, and drop the kart itself.
      const k = kartAsset(kind);
      body.add(k.model);
      body.updateMatrixWorld(true);
      nativeDriver = k.nativeDriver;
      body.attach(nativeDriver);
      body.remove(k.model);
    }
    asset = { model: premium.group, wheels: premium.wheels, nativeDriver };
  } else {
    asset = kartAsset(kind);
    body.add(asset.model);
  }
  const driver = asset.nativeDriver || character(kind);
  const info = CHARACTERS.find((c) => c.id === kind);
  let limbs = null;
  if (!asset.nativeDriver) {
    if (!driver.userData.kartDog) {
      driver.scale.setScalar(0.82);
      driver.position.set(0, -0.02, -0.24);
    } else {
      // Sit the dogs a touch higher and further forward so shoulders clear
      // the side pods and the paws can reach the wheel.
      driver.position.set(0, 0.52, -0.22);
      driver.scale.setScalar(0.7);
    }
    body.add(driver);
  }
  // Steering wheel in front of the chest; position depends on the driver's
  // reach (measured in body coordinates).
  const wheelAt = driver.userData.kartDog ? new T.Vector3(0, 0.98, 0.16) : new T.Vector3(0, 0.86, 0.38);
  const wheel = steeringWheel(body, wheelAt, info ? new T.Color(info.color).getHex() : 0xeeae55);
  // The Kenney figures are modelled with a full-face helmet and no arms; a
  // wheel cannot sit under the helmet without reading as part of the face,
  // so they keep their original design.
  wheel.mount.visible = !asset.nativeDriver;
  if (driver.userData.kartDog) {
    // The sculpted arms are short: extend each with a forearm and paw so the
    // paws actually rest on the rim (they ended inside the cowl in V2).
    const u = driver.userData,
      fur = material(u.kind === "gold" ? 0xf1d5ba : 0xf8f6f2, 0.76);
    u.kartPaws = [-1, 1].map(() => ({
      fore: segment(u.rig, fur, 0.105),
      paw: ellipsoid(u.rig, fur, [0, 0, 0], [0.13, 0.115, 0.14]),
    }));
  }
  if (driver.userData.limbs) limbs = fitLimbs(driver, driver.userData.limbs.color);

  // Antenna pennant in the driver's colour and a race-number plate, so each
  // kart reads as its driver's at a glance (the five Kenney karts are shared
  // between the eight racers).
  const accent = info ? new T.Color(info.color).getHex() : 0xeeae55,
    antenna = new T.Group();
  antenna.position.set(...(premium?.antenna || [-0.62, 1.05, -1.0]));
  body.add(antenna);
  cyl(antenna, 0x4a4f55, [0, 0.62, 0], [0.024, 1.25, 0.024]);
  ball(antenna, accent, [0, 1.27, 0], [0.065, 0.065, 0.065]);
  const flag = new T.Mesh(pennantGeo, new T.MeshStandardMaterial({ color: accent, roughness: 0.55, side: T.DoubleSide }));
  flag.position.y = 1.2;
  flag.castShadow = true;
  antenna.add(flag);
  const plate = new T.Mesh(
    new T.PlaneGeometry(0.46, 0.28),
    new T.MeshBasicMaterial({ map: label(String(number), { bg: "#fffaf0", fg: info?.color || "#2f4a40", w: 256, h: 156 }) }),
  );
  plate.position.set(...(premium?.plate || [0, 0.62, 1.715]));
  body.add(plate);
  const exhaust = (premium?.exhaust || EXHAUST_TIPS.map((tip, i) => ({ tip, dir: EXHAUST_DIRS[i], size: 1 }))).map((e) => {
    const f = exhaustFlame(body);
    f.nozzle.position.copy(e.tip);
    f.nozzle.quaternion.setFromUnitVectors(yAxis, e.dir);
    f.size = e.size;
    return f;
  });
  // Neon parts that flare up during a boost (premium bodies).
  const glow = (premium?.glow || []).map((m) => ({ m, colour: m.color.clone(), opacity: m.opacity }));
  const shadow = new T.Mesh(
    new T.CircleGeometry(1, 32),
    new T.MeshBasicMaterial({ color: 0x33463e, transparent: true, opacity: 0.26, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.scale.set(1.14, 1.45, 1);
  g.add(shadow);
  const shield = new T.Mesh(
    new T.SphereGeometry(1, 24, 16),
    new T.MeshStandardMaterial({
      color: 0x7fe8ff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.15,
      metalness: 0.2,
      depthWrite: false,
    }),
  );
  shield.position.y = 1.12;
  shield.scale.set(1.44, 1.48, 1.68);
  shield.visible = false;
  g.add(shield);
  const protection = new T.Group();
  for (const y of [0.65, 1.3]) {
    const ring = new T.Mesh(
      new T.TorusGeometry(1.35, 0.035, 6, 40),
      new T.MeshBasicMaterial({ color: 0x7fe8ff }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    protection.add(ring);
  }
  g.add(protection);
  protection.visible = false;
  // Dizzy stars circling the driver's head after a hit.
  const dizzy = new T.Group();
  dizzy.position.y = driver.userData.kartDog ? 2.45 : 2.3;
  for (let i = 0; i < 3; i++) {
    const st = starMesh();
    st.scale.setScalar(0.42);
    st.position.set(Math.cos((i * Math.PI * 2) / 3) * 0.55, 0, Math.sin((i * Math.PI * 2) / 3) * 0.55);
    dizzy.add(st);
  }
  dizzy.visible = false;
  g.add(dizzy);
  const marker = new T.Mesh(new T.ConeGeometry(0.19, 0.38, 4), new T.MeshBasicMaterial({ color: 0x7df5ff }));
  marker.rotation.z = Math.PI;
  marker.position.y = 3.05;
  marker.visible = false;
  g.add(marker);
  // Small parts (eyes, noses, rivets...) do not need to cast shadows; the
  // shadow pass is a second draw call per caster.
  g.updateMatrixWorld(true);
  const ws = new T.Vector3();
  g.traverse((o) => {
    if (!o.isMesh || !o.castShadow) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.getWorldScale(ws);
    if (o.geometry.boundingSphere.radius * Math.max(ws.x, ws.y, ws.z) < 0.14) o.castShadow = false;
  });
  g.userData = {
    body,
    driver,
    wheels: asset.wheels,
    nativeDriver: !!asset.nativeDriver,
    exhaust,
    wheel,
    limbs,
    shield,
    protection,
    marker,
    dizzy,
    flag,
    kind,
    bodyId: premium ? bodyId : "classic",
    glow,
    // Smoothed visual pose (heading slip, drift yaw, lean, pitch, nitro).
    vis: {
      slip: 0,
      drift: 0,
      roll: 0,
      pitch: 0,
      wheel: 0,
      speed: 0,
      accel: 0,
      nitro: 0,
      kick: 0,
      active: false,
      kind: "item",
      hop: 0, // drift-start hop, 1 -> 0
      wasDrifting: false,
      mood: "", // timed mood set from the game (overtake, landed a hit)
      moodTime: 0,
      look: 0, // head turn toward a rival alongside
      cheer: 0,
    },
    fade: 1,
  };
  return g;
}

// Fade a kart smoothly while it is right in front of the camera, using an
// ordered 4x4 screen-door dither (as console kart games do for near-camera
// objects): opaque rendering, no sorting artefacts, a stable fine pattern
// instead of noise, and no shader recompile when the amount changes.
const ditherPatch = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "void main() {",
    `const float pawBayer[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
void main() {
  {
    ivec2 cell = ivec2(mod(gl_FragCoord.xy, 4.0));
    if (opacity < 0.999 && opacity * 16.0 <= pawBayer[cell.x + cell.y * 4] + 0.5) discard;
  }`,
  );
};
export function setKartFade(g, a) {
  const d = g.userData;
  if (!d.fadeMaterials) {
    d.fadeMaterials = [];
    const seen = new Map();
    g.traverse((o) => {
      if (!o.isMesh || o.material.blending === T.AdditiveBlending || o.material.transparent) return;
      if (!seen.has(o.material)) {
        const m = o.material.clone();
        m.onBeforeCompile = ditherPatch;
        m.customProgramCacheKey = () => "paw-dither";
        seen.set(o.material, m);
        d.fadeMaterials.push(m);
      }
      o.material = seen.get(o.material);
    });
    for (const gl of d.glow || []) gl.m = seen.get(gl.m) || gl.m;
  }
  if (Math.abs(d.fade - a) < 0.004) return;
  d.fade = a;
  for (const m of d.fadeMaterials) m.opacity = a;
}

const ease = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-dt * rate));
const tmpGrip = new T.Vector3(),
  tmpLocal = new T.Vector3(),
  tmpRest = new T.Vector3(),
  tmpDir = new T.Vector3(),
  tmpQ = new T.Quaternion(),
  tmpM = new T.Matrix4();

// A short-lived mood from a game event: "happy" after an overtake or a hit
// landed (the dogs also glance back), for `seconds`.
export function kartMood(g, mood, seconds = 0.9) {
  const v = g.userData.vis;
  v.mood = mood;
  v.moodTime = seconds;
  v.faceMood = null; // re-apply the face next frame
}
export function animateKart(g, t, r, dt = 1 / 60, showcase = false, ctx = {}) {
  const d = g.userData,
    driver = d.driver,
    v = d.vis;
  const speed = r?.speed || 0,
    steer = r?.steer || 0,
    curve = ctx.curve || 0,
    drifting = !!r?.drifting && speed > 10;
  // --- Body pose --------------------------------------------------------
  // Slip: the nose follows the actual direction of travel (lane velocity),
  // so steering visibly turns the kart instead of sliding it sideways.
  const slipTarget = showcase ? 0 : Math.atan2(r?.lateral || 0, Math.max(8, speed)) * 0.9;
  v.slip = ease(v.slip, slipTarget, 10, dt);
  // Drift: KartRider-style angle into the corner, modulated by steering.
  const driftTarget = drifting ? (r.driftDirection || Math.sign(steer) || 1) * (0.42 + steer * (r.driftDirection || 1) * 0.12) : 0;
  v.drift = ease(v.drift, driftTarget, drifting ? 7 : 5, dt);
  // Drift hop: a little jump as a drift starts, as in Mario Kart.
  if (drifting && !v.wasDrifting && !showcase) v.hop = 1;
  v.wasDrifting = drifting;
  v.hop = Math.max(0, v.hop - dt * 4);
  const hop = v.hop > 0 ? Math.sin((1 - v.hop) * Math.PI) * 0.3 : 0;
  // Mood drives the faces: dizzy after a hit, cheering past the line, happy
  // while boosting or after an overtake / a hit landed, focused deep in a
  // drift. Timed moods come from kartMood().
  v.moodTime = Math.max(0, v.moodTime - dt);
  const mood = showcase
    ? ""
    : r?.stun > 0
      ? "hurt"
      : r && r.finish !== null && r.finish !== undefined
        ? "cheer"
        : v.moodTime > 0
          ? v.mood
          : r?.rocket > 0 || r?.star > 0 || (v.active && v.kick > 0.2)
            ? "happy"
            : drifting && (r?.drift ?? 0) >= 1.25
              ? "focus"
              : "";
  v.cheer = ease(v.cheer, mood === "cheer" ? 1 : 0, 3, dt);
  v.look = ease(v.look, ctx.look || 0, 4, dt);
  // Lean into turns (driver weight) and squat/lift with acceleration.
  const accel = dt > 0 ? (speed - v.speed) / dt : 0;
  v.speed = speed;
  v.accel = ease(v.accel, clampN(accel, -40, 40), 6, dt);
  const lateralG = curve * speed * speed;
  v.roll = ease(v.roll, clampN(-steer * 0.045 - lateralG * 0.0016 - v.drift * 0.08, -0.14, 0.14), 8, dt);
  v.pitch = ease(v.pitch, clampN(-v.accel * 0.0035, -0.07, 0.07), 7, dt);
  const bump = r?.bump > 0 ? r.bump : 0,
    wobble = bump > 0 ? Math.sin((0.35 - bump) * 38) * bump * 0.5 : 0;
  d.body.position.y =
    Math.sin(t * (showcase ? 2 : 14)) * (showcase ? 0.025 : 0.015) * Math.min(1, 0.2 + speed / 25) +
    Math.abs(wobble) * 0.15 +
    hop +
    Math.abs(Math.sin(t * 6)) * 0.14 * v.cheer;
  d.body.position.x = wobble * (r?.bumpSide || 0) * 0.35;
  d.body.rotation.set(
    v.pitch - v.kick * (0.1 + 0.09 * (v.big || 0)) - hop * 0.15, // nose lifts at ignition (more for big boosts) and on the hop
    -v.slip - v.drift + (r?.stun > 0 ? (1 - r.stun / 1.1) * Math.PI * 4 : 0),
    v.roll + wobble * (r?.bumpSide || 0) * 0.5,
    "YXZ",
  );
  // --- Steering wheel and wheels ----------------------------------------
  const wheelTarget = showcase ? Math.sin(t * 0.9) * 0.18 : -(steer * 0.85) + (drifting ? v.drift * 0.6 : 0);
  v.wheel = ease(v.wheel, wheelTarget, 14, dt);
  d.wheel.spin.rotation.z = v.wheel;
  d.wheels.forEach((w) => {
    w.mesh.rotation.x += (speed * dt) / 0.43;
    // Counter-steer the front wheels while drifting, as karts do.
    if (w.front) w.pivot.rotation.y = drifting ? v.drift * 0.55 : -steer * 0.32;
  });
  // --- Driver -------------------------------------------------------------
  if (!d.nativeDriver) driver.rotation.z = -steer * 0.06 - v.drift * 0.05;
  if (driver.userData.kartDog) {
    const u = driver.userData;
    // Faces: the dogs' own rig (^ ^ happy eyes and blush, x x when hurt,
    // raised brows for focus). A timed happy mood also makes them glance
    // back over the shoulder, as Mario Kart drivers do after a pass.
    if (mood !== v.faceMood) {
      v.faceMood = mood;
      const timed = v.moodTime > 0 && mood === v.mood;
      reactDog(
        driver,
        mood === "hurt" ? "hurt" : mood === "happy" || mood === "cheer" ? "happy" : mood === "focus" ? "surprise" : "normal",
        timed ? v.moodTime : 99,
      );
    }
    u.head.rotation.y -= v.lookApplied || 0;
    animateDog(driver, t, mood === "cheer" ? "cheer" : "idle", { dt, turn: steer });
    v.lookApplied = showcase ? 0 : v.look * 0.45;
    u.head.rotation.y += v.lookApplied;
    u.legs.forEach((a) => (a.rotation.x = -1.25)); // seated: thighs forward
    u.head.rotation.y = showcase ? Math.sin(t * 0.8) * 0.13 : -steer * 0.18;
    u.ears.forEach((e, i) => {
      e.rotation.x = Math.sin(t * 7 + i) * 0.06 + speed * 0.002;
    });
    u.tail.rotation.z = Math.sin(t * 10) * 0.5;
    // Aim each arm bone at its grip on the rim, so paws stay on the wheel as
    // it turns. Rest direction of the sculpted arm is down and slightly out.
    // Past the finish line the paws leave the wheel for the cheer pose.
    const cheering = mood === "cheer";
    u.kartPaws.forEach((p) => (p.fore.visible = p.paw.visible = !cheering));
    driver.updateMatrixWorld(true);
    tmpM.copy(u.rig.matrixWorld).invert();
    if (!cheering) u.arms.forEach((a, i) => {
      const side = i ? 1 : -1;
      gripPoint(d.wheel, side, v.wheel, tmpGrip);
      tmpLocal.copy(tmpGrip).applyMatrix4(d.body.matrixWorld).applyMatrix4(tmpM).sub(a.position);
      tmpRest.set(side * 0.22, -1, 0.1).normalize();
      const reach = tmpLocal.length();
      tmpDir.copy(tmpLocal).normalize();
      a.quaternion.setFromUnitVectors(tmpRest, tmpDir);
      const p = u.kartPaws[i],
        tip = tmpA.copy(a.position).addScaledVector(tmpDir, Math.min(0.3, reach * 0.6)),
        grip = tmpB.copy(a.position).add(tmpLocal);
      placeSegment(p.fore, tip, grip);
      p.paw.position.copy(grip);
    });
  } else if (!d.nativeDriver) {
    const u = driver.userData;
    u.head.rotation.z = Math.sin(t * 2) * 0.035;
    u.head.rotation.y = showcase ? Math.sin(t * 0.75) * 0.12 : steer * 0.2 + (u.face ? v.look * 0.45 : 0);
    if (u.face) {
      const f = u.face,
        happy = mood === "happy" || mood === "cheer",
        hurt = mood === "hurt";
      f.eyes.forEach((e) => (e.visible = !happy && !hurt));
      f.happy.forEach((e) => (e.visible = happy));
      f.hurt.forEach((e) => (e.visible = hurt));
      f.brows.forEach((e) => (e.visible = mood === "focus"));
      f.smile.visible = !happy && !hurt;
      f.grin.visible = happy;
      f.oh.visible = hurt;
    }
    u.eyes.forEach(
      (e) =>
        (e.scale.y =
          (t % 4.6 > 4.43 ? 0.1 : 1) *
          (u.face && mood === "focus" ? 0.55 : 1) *
          (g.userData.kind === "mario" ? 0.06 : g.userData.kind === "dora" ? 0.08 : 0.0702)),
    );
    u.ears.forEach((e, i) => (e.rotation.z = Math.sin(t * 3 + i) * 0.06));
  }
  if (d.limbs) {
    // Hands follow the rim; elbows bend outwards and down.
    const space = d.limbs.space;
    if (space === d.body) tmpM.identity();
    else {
      space.updateMatrix();
      tmpM.copy(space.matrix).invert();
    }
    for (const arm of d.limbs.arms) {
      gripPoint(d.wheel, arm.side, v.wheel, tmpGrip);
      arm.target.copy(tmpGrip).applyMatrix4(tmpM);
      if (v.cheer > 0.01) {
        // Cheer: hands up and waving, blended from the wheel grip.
        const reach = (arm.lengths[0] + arm.lengths[1]) * 0.92;
        tmpDir.set(arm.side * 0.45, 1, 0.25 + Math.sin(t * 8 + arm.side) * 0.12).normalize();
        tmpRest.copy(arm.shoulder).addScaledVector(tmpDir, reach);
        arm.target.lerp(tmpRest, v.cheer);
      }
      elbow(arm.shoulder, arm.target, arm.side, arm.lengths[0], arm.lengths[1], arm.elbow);
      placeSegment(arm.upper, arm.shoulder, arm.elbow);
      placeSegment(arm.fore, arm.elbow, arm.target);
      arm.hand.position.copy(arm.target);
    }
  }
  // --- Nitro ---------------------------------------------------------------
  const active = (r?.boost > 0 || r?.star > 0) && !(r?.rescue > 0);
  if (active && (!v.active || (r.boostCount ?? 0) !== v.boostCount)) {
    v.kick = 1; // ignition pop, also for a new boost on top of one
    v.kind = r.star > 0 ? "star" : r.boostKind || "item";
    v.big = /start|nitro|drift3|rocket|item/.test(v.kind) ? 1 : 0.4;
  }
  v.boostCount = r?.boostCount ?? 0;
  if (active) v.kind = r.star > 0 ? "star" : r.boostKind || v.kind;
  v.active = active;
  v.nitro = ease(v.nitro, active ? 1 : 0, active ? 22 : 7, dt);
  v.kick = Math.max(0, v.kick - dt * 5.5);
  const cfg = NITRO[v.kind] || NITRO.item,
    on = v.nitro > 0.02,
    fade = d.fade ?? 1;
  if (on && ctx.camera) d.body.updateMatrixWorld();
  d.exhaust.forEach((f, i) => {
    f.nozzle.visible = on;
    if (!on) return;
    const flicker =
        1 + Math.sin(t * 47 + i * 1.7) * 0.09 + Math.sin(t * 83 + i * 0.6) * 0.07 + Math.sin(t * 19 + i) * 0.05,
      pop = v.kick > 0 ? 1 + Math.sin((1 - v.kick) * Math.PI) * 0.5 : 1,
      size = f.size || 1,
      len = cfg.len * v.nitro * flicker * pop * (0.8 + Math.min(1, speed / 45) * 0.3) * size,
      width = 0.5 * (0.55 + 0.45 * v.nitro) * (1 + (pop - 1) * 0.6) * size,
      strength = Math.min(1, v.nitro * 1.5) * fade;
    // Face the camera about the flame axis.
    if (ctx.camera) {
      tmpLocal.copy(ctx.camera.position);
      f.nozzle.worldToLocal(tmpLocal);
      f.turn.rotation.y = Math.atan2(tmpLocal.x, tmpLocal.z);
    }
    const outerColour =
      v.kind === "star" ? f.outer.material.color.setHSL((t * 1.6 + i * 0.12) % 1, 1, 0.55) : f.outer.material.color.setHex(cfg.outer);
    f.inner.material.color.setHex(cfg.core);
    f.core.material.color.setHex(cfg.core);
    f.glow.material.color.copy(outerColour);
    f.solid.material.color.copy(outerColour);
    f.outer.scale.set(width, len, 1);
    f.inner.scale.set(width * 0.5, len * 0.62, 1);
    f.core.scale.set(0.09, len * 0.45, 0.09);
    f.solid.scale.set(0.13, len * 0.8, 0.13);
    f.glow.scale.setScalar((0.62 + 0.3 * v.nitro) * (1 + (pop - 1) * 0.8) * size);
    f.outer.material.opacity = 0.95 * strength;
    f.inner.material.opacity = strength;
    f.core.material.opacity = 0.9 * strength;
    f.glow.material.opacity = 0.85 * strength;
    f.turn.visible = f.core.visible = f.glow.visible = !compatibility;
    f.solid.visible = compatibility;
  });
  // Neon trims and underglow flare up with the boost.
  if (d.glow?.length) {
    const flare = Math.min(1, v.nitro) * (1 + (v.kick > 0 ? v.kick * 0.6 : 0));
    for (const gl of d.glow) {
      if (gl.m.transparent) gl.m.opacity = Math.min(0.95, gl.opacity * (1 + 1.4 * flare));
      else gl.m.color.copy(gl.colour).lerp(WHITE, 0.45 * Math.min(1, flare));
    }
  }
  // --- Status effects --------------------------------------------------------
  // Rings: gold for a star, red for the bear's ram, blue for a shield.
  const ram = r?.charge > 0;
  d.protection.visible = r?.shield > 0 || r?.star > 0 || ram;
  d.protection.rotation.y = t * (ram ? 4 : 1);
  d.protection.children.forEach((m) => m.material.color.set(r?.star > 0 ? 0xffda5d : ram ? 0xff4a3a : 0x7fe8ff));
  // Bunny's hop: a barrel roll in the air.
  if (r?.jump > 0) d.body.rotation.z += Math.PI * 2 * Math.min(1, (1 - r.jump / 1.6) * 1.25);
  // Pennant flutter, faster with speed.
  d.flag.rotation.y = Math.sin(t * (6 + speed * 0.3)) * (0.1 + Math.min(0.35, speed * 0.008));
  d.flag.rotation.x = Math.sin(t * 4.3) * 0.05 - Math.min(0.25, speed * 0.005);
  d.dizzy.visible = !showcase && mood === "hurt";
  if (d.dizzy.visible) {
    d.dizzy.rotation.y = t * 5;
    d.dizzy.children.forEach((st, i) => {
      st.position.y = Math.sin(t * 7 + i * 2.1) * 0.08;
      st.rotation.y = -t * 5;
    });
  }
  d.marker.visible = !showcase && r?.id === 0;
  d.marker.position.y = 3.05 + Math.sin(t * 3) * 0.06;
  d.shield.visible = r?.shield > 0 || r?.star > 0;
  d.shield.material.color.set(r?.star > 0 ? 0xffda5d : r?.shieldHits > 1 ? 0xff9fd6 : 0x7fe8ff);
  // Milo's double bubble is bigger and gently pulses.
  d.shield.scale.set(1.44, 1.48, 1.68).multiplyScalar(r?.shieldHits > 1 ? 1.18 + Math.sin(t * 5) * 0.03 : 1);
  // Lightning shrink and regrow animate instead of popping between sizes.
  v.scale = ease(v.scale ?? 1, r?.small > 0 ? 0.7 : 1, 9, dt);
  g.scale.setScalar(v.scale);
}
const clampN = (n, a, b) => Math.max(a, Math.min(b, n));
function ribbon(track, offset, width, color, y = 0.04) {
  const pos = [],
    uv = [],
    idx = [],
    n = 720;
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * track.length;
    for (const s of [-1, 1]) {
      const p = track.sample(d, offset + (s * width) / 2).p;
      pos.push(p.x, p.y + y, p.z);
      uv.push(s < 0 ? 0 : 1, d / 8);
    }
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, typeof color === "number" ? mat(color) : color);
  mesh.receiveShadow = true;
  return mesh;
}
function tree(g, theme, rng) {
  const trunk = theme === 1 ? 0xf3eee0 : 0x967952;
  cyl(g, trunk, [0, 1.5, 0], [0.4, 3, 0.4]);
  const color =
    theme === 1
      ? [0xf2b6cb, 0xeed393, 0xb4d7c5][Math.floor(rng() * 3)]
      : theme === 2
        ? [0x7d85b4, 0x626fa6, 0x8b9cc7][Math.floor(rng() * 3)]
        : [0x54a76c, 0x87be55, 0x3c956e][Math.floor(rng() * 3)];
  ball(g, color, [0, 4.4, 0], [2.8, 3.2, 2.6]);
  ball(g, color, [1.8, 3.9, 0.2], [1.8, 2, 1.8]);
  ball(g, color, [-1.4, 4, 0.4], [1.8, 2.1, 1.8]);
}
function flower(g, rng) {
  const col = [0xffe3a4, 0xf3c0c0, 0xfff6dc][Math.floor(rng() * 3)];
  for (let j = 0; j < 5; j++)
    ball(g, col, [Math.cos(j * 1.257) * 0.25, 0.12, Math.sin(j * 1.257) * 0.25], [0.2, 0.09, 0.2]);
  ball(g, 0xe9b650, [0, 0.15, 0], [0.14, 0.11, 0.14]);
}
function cloud(g, p, s = 1) {
  const c = new T.Group();
  c.position.set(...p);
  c.scale.setScalar(s);
  ball(c, 0xfffbed, [0, 0, 0], [4, 1.5, 1.8]);
  ball(c, 0xfffbed, [-1.4, 0.9, 0], [1.7, 1.8, 1.4]);
  ball(c, 0xfffbed, [1, 0.8, 0], [2.3, 2, 1.7]);
  g.add(c);
}
function windmill(g) {
  cyl(g, 0xffebd2, [0, 3.8, 0], [1.9, 7.6, 1.9]);
  const cone = new T.Mesh(new T.ConeGeometry(2.4, 2.5, 16), mat(0xda9775));
  cone.position.y = 8.8;
  g.add(cone);
  const sails = new T.Group();
  sails.position.set(0, 6.7, 2);
  g.add(sails);
  for (let i = 0; i < 4; i++) {
    const wing = new T.Group();
    wing.rotation.z = (i * Math.PI) / 2;
    sails.add(wing);
    box(wing, 0xf8e6bc, [0, 2.5, 0], [0.3, 5, 0.25]);
    box(wing, 0xfff4d8, [0.55, 2.7, 0], [0.85, 3.4, 0.2]);
  }
  ball(sails, 0xab7957, [0, 0, 0.18], [0.43, 0.43, 0.35]);
  return sails;
}
// Merge static scenery into a few large meshes. Plain-colour materials (the
// mat() cache) share one vertex-coloured material per roughness and are
// batched by 90 m tiles, so the crowd, bunting, trees and rails cost a few
// dozen draw calls instead of the ~700 V2.2 needed (it batched per colour
// per 35 m tile), which matters on older phones.
const batchMats = new Map();
function batchMaterial(rough) {
  if (!batchMats.has(rough)) batchMats.set(rough, new T.MeshStandardMaterial({ vertexColors: true, roughness: rough }));
  return batchMats.get(rough);
}
function staticBatch(group) {
  group.updateMatrixWorld(true);
  const batches = new Map(),
    at = new T.Vector3();
  group.traverse((o) => {
    if (
      o.isMesh &&
      !Array.isArray(o.material) &&
      o.geometry.attributes.position &&
      o.geometry.attributes.normal
    ) {
      const m = o.material,
        plain = m.isMeshStandardMaterial && !m.map && !m.transparent && !m.vertexColors && m.emissive.getHex() === 0 && m.metalness === 0;
      at.setFromMatrixPosition(o.matrixWorld);
      const key = (plain ? "plain:" + m.roughness : m.uuid) + ":" + Math.floor(at.x / 90) + ":" + Math.floor(at.z / 90);
      if (!batches.has(key)) batches.set(key, { p: [], n: [], c: [], mat: plain ? batchMaterial(m.roughness) : m, plain });
      const b = batches.get(key),
        source = o.geometry === sphere ? scenerySphere : o.geometry,
        geo = source.index ? source.toNonIndexed() : source.clone();
      geo.applyMatrix4(o.matrixWorld);
      b.p.push(geo.attributes.position.array);
      b.n.push(geo.attributes.normal.array);
      if (plain) {
        const n = geo.attributes.position.count,
          col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          col[i * 3] = m.color.r;
          col[i * 3 + 1] = m.color.g;
          col[i * 3 + 2] = m.color.b;
        }
        b.c.push(col);
      }
      geo.dispose();
    }
  });
  const root = new T.Group();
  for (const [, b] of batches) {
    const m = b.mat;
    const merge = (arrays) => {
      const a = new Float32Array(arrays.reduce((s, v) => s + v.length, 0));
      let i = 0;
      for (const v of arrays) {
        a.set(v, i);
        i += v.length;
      }
      return a;
    };
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(merge(b.p), 3));
    geo.setAttribute("normal", new T.BufferAttribute(merge(b.n), 3));
    if (b.plain) geo.setAttribute("color", new T.BufferAttribute(merge(b.c), 3));
    const mesh = new T.Mesh(geo, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
// Asphalt: fine grain, darker racing line, white edge lines. Painted in the
// track's road colour; v repeats every 8 m along the road.
function paintTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function roadMaterial(hex, theme) {
  const base = new T.Color(hex),
    tex = paintTexture(128, 256, (ctx, w, h) => {
      const rng = seeded(31 + theme);
      ctx.fillStyle = "#" + base.getHexString();
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const v = rng();
        ctx.fillStyle = v < 0.5 ? "rgba(0,0,0," + (0.05 + v * 0.08) + ")" : "rgba(255,255,255," + (v - 0.5) * 0.12 + ")";
        ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 1.5, 1 + rng() * 2);
      }
      // Rubbered-in racing line, slightly off-centre on each side.
      for (const x of [0.32, 0.68]) {
        const gr = ctx.createLinearGradient((x - 0.08) * w, 0, (x + 0.08) * w, 0);
        gr.addColorStop(0, "rgba(0,0,0,0)");
        gr.addColorStop(0.5, "rgba(0,0,0,0.09)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr;
        ctx.fillRect((x - 0.08) * w, 0, 0.16 * w, h);
      }
      ctx.fillStyle = theme === 2 ? "#cfd8ff" : "#fffaf0";
      ctx.fillRect(0.035 * w, 0, 0.022 * w, h);
      ctx.fillRect(0.943 * w, 0, 0.022 * w, h);
    });
  tex.wrapS = T.ClampToEdgeWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.anisotropy = 4;
  const m = new T.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0 });
  return m;
}
// Gradient sky dome (follows the camera) with a soft sun glow; stars at night.
function skyDome(theme, horizonHex) {
  const top = [0x4aa3e4, 0x86c9ee, 0x070a24][theme],
    horizon = new T.Color(horizonHex),
    zenith = new T.Color(top),
    geo = new T.SphereGeometry(560, 32, 16),
    colors = [],
    p = geo.attributes.position,
    sun = new T.Vector3(-0.55, 0.32, 0.77).normalize(),
    glow = new T.Color(theme === 2 ? 0x8f7dff : 0xfff3d6),
    c = new T.Color(),
    v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const h = Math.max(0, v.y);
    c.copy(horizon).lerp(zenith, Math.pow(h, 0.55));
    if (v.y < 0) c.copy(horizon);
    c.lerp(glow, Math.pow(Math.max(0, v.dot(sun)), 12) * 0.6);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const dome = new T.Mesh(
    geo,
    new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -10;
  if (theme === 2) {
    const rng = seeded(404),
      star = [];
    for (let i = 0; i < 700; i++) {
      v.set(rng() * 2 - 1, rng() * 0.9 + 0.08, rng() * 2 - 1).normalize().multiplyScalar(540);
      star.push(v.x, v.y, v.z);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(star, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ color: 0xfff6d8, size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false }));
    pts.renderOrder = -9;
    dome.add(pts);
  }
  return dome;
}
// Distant ranges around the circuit, tinted toward the horizon colour with
// distance (no fog on them, so they stay as a silhouette layer).
function ranges(track, theme, horizonHex) {
  const g = new T.Group(),
    rng = seeded(77 + theme),
    pts = track.points,
    cx = pts.reduce((s, p) => s + p.x, 0) / pts.length,
    cz = pts.reduce((s, p) => s + p.z, 0) / pts.length,
    horizon = new T.Color(horizonHex),
    palettes = [
      [0x5f9b7a, 0x7fae86, 0x4f8a76],
      [0xf2b6c8, 0xbfe3d4, 0xf7d59c],
      [0x2c2f63, 0x3b3477, 0x252a55],
    ][theme];
  const mats = new Map(),
    matFor = (col) => {
      const key = col.getHex();
      if (!mats.has(key)) mats.set(key, new T.MeshBasicMaterial({ color: key, fog: false }));
      return mats.get(key);
    };
  for (let ring = 0; ring < 2; ring++)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + ring * 0.17 + rng() * 0.12,
        r = 360 + ring * 70 + rng() * 40,
        h = (theme === 1 ? 40 : 70) + rng() * (theme === 1 ? 40 : 90),
        w = 60 + rng() * 70,
        col = new T.Color(palettes[Math.floor(rng() * 3)]).lerp(horizon, 0.35 + ring * 0.25);
      col.setHex(col.getHex()); // quantise so materials can be shared
      const geo = theme === 1 ? new T.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2) : new T.ConeGeometry(1, 1, 6 + Math.floor(rng() * 3));
      const m = new T.Mesh(geo, matFor(col));
      m.position.set(cx + Math.cos(a) * r, theme === 1 ? -6 : h / 2 - 8, cz + Math.sin(a) * r);
      m.scale.set(w, theme === 1 ? h : h, w * (0.7 + rng() * 0.5));
      m.rotation.y = rng() * Math.PI;
      g.add(m);
      if (theme === 0 && h > 120) {
        // Snow caps on the tallest peaks.
        const cap = new T.Mesh(new T.ConeGeometry(1, 1, m.geometry.parameters.radialSegments), matFor(new T.Color(0xf6fbff).lerp(horizon, 0.2)));
        cap.position.copy(m.position);
        cap.position.y += h * 0.32;
        cap.scale.set(w * 0.36, h * 0.36, m.scale.z * 0.36);
        cap.rotation.y = m.rotation.y;
        g.add(cap);
      }
    }
  return g;
}
// Grandstand with a cheering crowd, flags and balloons by the start line.
function grandstand(g, decor, track, theme, moving) {
  const c = track.config,
    rng = seeded(500 + theme),
    s = track.sample(-18, c.width / 2 + 13),
    stand = new T.Group();
  stand.position.copy(s.p);
  stand.rotation.y = s.yaw + Math.PI / 2;
  decor.add(stand);
  const wood = theme === 2 ? 0x7d86c4 : 0xf2e2c4,
    trim = theme === 2 ? 0xb8c2ff : theme === 1 ? 0xf09cbc : 0xe8a35f;
  for (let tier = 0; tier < 4; tier++) box(stand, tier % 2 ? wood : 0xfff6e3, [tier * 1.6, 0.5 + tier * 0.9, 0], [1.6, 1 + tier * 1.8, 34]);
  box(stand, trim, [6.6, 5.2, 0], [0.4, 0.5, 34.4]);
  box(stand, trim, [3.2, 7.4, 0], [8, 0.3, 35]).rotation.z = -0.18;
  const shirts = [0xe85d5d, 0x4f8fe0, 0xf3c34b, 0x5cc08a, 0xb17ae8, 0xff9f5a, 0xffffff];
  for (let tier = 0; tier < 4; tier++)
    for (let k = 0; k < 15; k++) {
      if (rng() < 0.12) continue;
      const z = -15.5 + k * 2.2 + rng() * 0.6,
        x = tier * 1.6 + 0.2,
        y = 1.1 + tier * 1.8;
      ball(stand, shirts[Math.floor(rng() * shirts.length)], [x, y + 0.45, z], [0.42, 0.5, 0.36]);
      ball(stand, [0xf2c9a0, 0xe0ac7e, 0xfff0e0, 0xc98e63][Math.floor(rng() * 4)], [x, y + 1.08, z], [0.27, 0.28, 0.27]);
      if (rng() < 0.3) box(stand, shirts[Math.floor(rng() * shirts.length)], [x - 0.1, y + 1.6, z + 0.25], [0.04, 0.5, 0.7]);
    }
  // Bunting along the rails either side of the start.
  for (const side of [-1, 1])
    for (let i = 0; i < 26; i++) {
      const a = track.sample(-40 + i * 3.2, side * (c.width / 2 + 2.2)),
        flag = new T.Mesh(new T.ConeGeometry(0.32, 0.7, 3), mat(shirts[i % shirts.length]));
      flag.position.copy(a.p);
      flag.position.y += 1.55;
      flag.rotation.set(Math.PI, a.yaw, 0);
      decor.add(flag);
    }
  // Balloons bobbing above the start (animated).
  for (let i = 0; i < 7; i++) {
    const b = track.sample(-6 + (i % 2) * 4, (i - 3) * 3.4 + (i > 3 ? 4 : -4) * Math.sign(i - 3 || 1)),
      grp = new T.Group();
    grp.position.copy(b.p);
    grp.position.y += 9 + rng() * 2;
    const balloon = ball(grp, shirts[i % shirts.length], [0, 0, 0], [0.8, 1, 0.8]);
    balloon.material = balloon.material.clone();
    balloon.material.roughness = 0.25;
    cyl(grp, 0xf5f0e0, [0, -2.2, 0], [0.02, 3.4, 0.02]);
    g.add(grp);
    moving.push({ mesh: grp, type: "balloon", y: grp.position.y, phase: rng() * 6 });
  }
}
export function createWorld(track) {
  const g = new T.Group(),
    decor = new T.Group(),
    moving = [],
    theme = track.index,
    c = track.config,
    rng = seeded(9812 + theme);
  g.add(ribbon(track, 0, c.width + 24, c.ground, -0.03));
  g.add(ribbon(track, 0, c.width, roadMaterial(c.road, theme), 0.04));
  g.add(ribbon(track, 0, c.width + 2.8, c.curb, 0.02));
  g.add(ribbon(track, 0, c.width + 6, theme === 2 ? 0x626d99 : 0xb7c18d, 0));
  const terrainGeo = new T.PlaneGeometry(650, 650, 80, 80);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(65, 0, 0);
  const groundPoints = track.points.filter((_, i) => i % 8 === 0),
    pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    let nearest = Infinity,
      height = 0;
    for (const p of groundPoints) {
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < nearest) {
        nearest = d;
        height = p.y;
      }
    }
    const mix = Math.exp(-Math.max(0, Math.sqrt(nearest) - 15) / 28);
    pos.setY(i, (height - 0.45) * mix + (-1.4 + Math.sin(x * 0.027) * Math.cos(z * 0.023) * 1.3) * (1 - mix));
  }
  terrainGeo.computeVertexNormals();
  const terrain = new T.Mesh(terrainGeo, mat(c.ground));
  terrain.receiveShadow = true;
  g.add(terrain);
  for (let i = 0; i < 230; i++)
    for (const side of [-1, 1]) {
      const a = track.sample((i / 230) * track.length, side * (c.width / 2 + 2.2)).p,
        b = track.sample(((i + 1) / 230) * track.length, side * (c.width / 2 + 2.2)).p,
        d = b.clone().sub(a),
        mid = a.clone().add(b).multiplyScalar(0.5);
      const rail = box(
        decor,
        theme === 2 ? 0x9daee7 : 0xffedce,
        [mid.x, mid.y + 0.67, mid.z],
        [0.26, 0.34, d.length() + 0.08],
      );
      rail.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d.normalize());
      if (i % 3 === 0)
        box(decor, theme === 2 ? 0x8397cd : 0xe7c48e, [a.x, a.y + 0.43, a.z], [0.38, 0.86, 0.38]);
    }
  const water = new T.Mesh(
    new T.PlaneGeometry(4000, 4000),
    mat(theme === 2 ? 0x222d51 : theme === 1 ? 0x9cced0 : 0xa7d6d9),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -3;
  g.add(water);
  for (let i = 0; i < 260; i++) {
    const d = (i / 260) * track.length;
    for (const side of [-1, 1]) {
      const s = track.sample(d, side * (c.width / 2 + 0.55));
      const curb = box(
        decor,
        i % 2 ? 0xfff6e4 : c.curb,
        [s.p.x, s.p.y + 0.1, s.p.z],
        [1.05, 0.18, (track.length / 260) * 0.99],
      );
      curb.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
    }
  }
  for (let i = 0; i < 70; i++) {
    const s = track.sample((i / 70) * track.length);
    const dash = box(
      decor,
      theme === 2 ? 0xb7c2f5 : 0xe2d9be,
      [s.p.x, s.p.y + 0.065, s.p.z],
      [0.17, 0.025, 2.4],
    );
    dash.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
  }
  for (let i = 0; i < 72; i++) {
    const d = (i / 72) * track.length;
    for (const side of [-1, 1]) {
      const s = track.sample(d, side * (c.width / 2 + 6 + rng() * 13)),
        tr = new T.Group();
      tr.position.copy(s.p);
      tr.position.y -= 0.35;
      tr.scale.setScalar(0.8 + rng() * 0.6);
      tree(tr, theme, rng);
      decor.add(tr);
      if (i % 2 === 0) {
        const fl = new T.Group();
        fl.position.copy(track.sample(d, side * (c.width / 2 + 2 + rng() * 3)).p);
        fl.scale.setScalar(1.2 + rng());
        flower(fl, rng);
        decor.add(fl);
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const s = track.sample((i / 18) * track.length, (i % 2 ? 1 : -1) * (35 + rng() * 45));
    ball(
      decor,
      theme === 2 ? 0x495c89 : theme === 1 ? 0xe7b9bc : 0x92bc73,
      [s.p.x, 1, s.p.z],
      [11 + rng() * 13, 8 + rng() * 12, 13 + rng() * 10],
    );
  }
  for (let i = 0; i < 14; i++)
    cloud(decor, [rng() * 500 - 180, 45 + rng() * 50, rng() * 500 - 250], 1 + rng() * 2);
  for (const f of [0.18, 0.54, 0.82]) {
    const s = track.sample(f * track.length, track.width / 2 + 14),
      w = new T.Group();
    w.position.copy(s.p);
    w.rotation.y = s.yaw;
    g.add(w);
    if (theme === 0) moving.push({ mesh: windmill(w), type: "mill" });
    else if (theme === 1) {
      cyl(w, 0xfff3df, [0, 4, 0], [0.35, 8, 0.35]);
      const lol = ball(w, 0xe797b9, [0, 9, 0], [3, 3, 0.6]);
      const ring = new T.Mesh(new T.TorusGeometry(1.8, 0.24, 8, 32), mat(0xffead1));
      ring.position.set(0, 9, 0.63);
      w.add(ring);
      moving.push({ mesh: lol, type: "lollipop" });
    } else {
      const hoop = new T.Mesh(
        new T.TorusGeometry(3, 0.2, 8, 40),
        new T.MeshBasicMaterial({ color: 0xffdc8d }),
      );
      hoop.position.y = 6;
      w.add(hoop);
      moving.push({ mesh: hoop, type: "halo" });
    }
  }
  const start = track.sample(0),
    arch = new T.Group();
  arch.position.copy(start.p);
  arch.rotation.set(-Math.asin(start.t.y), start.yaw, 0, "YXZ");
  g.add(arch);
  for (const s of [-1, 1]) {
    cyl(arch, 0xfff0d2, [s * (c.width / 2 + 1), 3.5, 0], [0.35, 7, 0.35]);
    ball(arch, 0xe8ae65, [s * (c.width / 2 + 1), 7.1, 0], [0.6, 0.6, 0.6]);
  }
  roundedBox(arch, 0xfff1d1, 0, 6.8, 0, c.width + 2, 0.95, 0.5, 0.15);
  badge(arch, "PAW KART", [0, 6.85, 0.26], 8, 0.75, "#fff1d1", "#345c51");
  badge(arch, "PAW KART", [0, 6.85, -0.26], 8, 0.75, "#fff1d1", "#345c51").rotation.y = Math.PI;
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 2; j++) {
      const mesh = box(
        arch,
        (i + j) % 2 ? 0xfff4d9 : 0x4c5a59,
        [-c.width / 2 + ((i + 0.5) * c.width) / 16, 0.07, j * 0.8 - 0.4],
        [c.width / 16, 0.025, 0.8],
      );
    }
  for (let i = 0; i < 16; i++) {
    const a = track.sample((i / 16) * track.length, (i % 2 ? 1 : -1) * (c.width / 2 + 3)),
      sign = new T.Group();
    sign.position.copy(a.p);
    sign.rotation.y = a.yaw;
    g.add(sign);
    sign.rotation.y += Math.PI;
    cyl(sign, 0xd7c49c, [0, 1.4, 0], [0.08, 2.8, 0.08]);
    badge(
      sign,
      i % 3 === 0 ? "PAWS & GO" : track.curvature((i / 16) * track.length + 12) > 0 ? "‹ ‹ ‹" : "› › ›",
      [0, 2.8, 0],
      3,
      1,
      theme === 2 ? "#919de0" : "#fff2cb",
      theme === 2 ? "#ffffff" : "#5c7562",
    );
  }
  grandstand(g, decor, track, theme, moving);
  g.add(ranges(track, theme, c.fog));
  const sky = skyDome(theme, c.fog);
  g.add(sky);
  g.add(staticBatch(decor));
  return { group: g, moving, sky };
}
// Item boxes share one material whose colour cycles through the rainbow,
// like Mario Kart's boxes; the edges glow in the complementary hue.
const boxGeo = new T.BoxGeometry(1.7, 1.7, 1.7),
  boxEdgesGeo = new T.EdgesGeometry(boxGeo),
  boxMat = new T.MeshStandardMaterial({
    color: 0xa6e4e8,
    emissive: 0x335a66,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.78,
  }),
  boxEdgeMat = new T.LineBasicMaterial({ color: 0xf3ffff });
export function updateBoxShimmer(t) {
  boxMat.color.setHSL((t * 0.18) % 1, 0.75, 0.68);
  boxMat.emissive.setHSL((t * 0.18 + 0.08) % 1, 0.7, 0.18);
  boxEdgeMat.color.setHSL((t * 0.18 + 0.5) % 1, 0.9, 0.85);
}
// Pennant: a triangle trailing back from the antenna tip.
const pennantGeo = (() => {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute([0, 0, 0, 0, -0.34, 0, 0, -0.17, -0.62], 3));
  g.computeVertexNormals();
  return g;
})();
// A bold "?" with a dark outline on every side of the box.
const boxFaceGeo = new T.PlaneGeometry(1.3, 1.3);
let boxFace = null;
function boxFaceMat() {
  if (!boxFace) {
    const tex = paintTexture(128, 128, (ctx, w, h) => {
      ctx.font = "900 112px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#3a3f63";
      ctx.strokeText("?", w / 2, h / 2 + 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("?", w / 2, h / 2 + 6);
    });
    boxFace = new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide, depthWrite: false });
  }
  return boxFace;
}
// Merge a few geometries (each with its matrix, and an optional flat colour)
// into one indexed geometry.
function mergeParts(parts) {
  const pos = [],
    nor = [],
    uv = [],
    col = [],
    idx = [];
  let base = 0;
  for (const { geo, matrix, color } of parts) {
    const g = geo.clone().applyMatrix4(matrix),
      p = g.attributes.position,
      n = g.attributes.normal,
      u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
      if (color) col.push(color.r, color.g, color.b);
    }
    const index = g.index ? g.index.array : [...Array(p.count).keys()];
    for (const k of index) idx.push(k + base);
    base += p.count;
    g.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
  out.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  if (col.length) out.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}
const instanced = (geo, material, n) => {
  const m = new T.InstancedMesh(geo, material, n);
  m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  m.frustumCulled = false; // instances are spread round the whole track
  return m;
};
// All the item boxes of a race in two instanced meshes (rainbow cubes and
// their "?" cards): 2 draw calls instead of six per box.
let boxCardsGeo = null;
export function itemBoxField(n) {
  boxCardsGeo ||= mergeParts(
    [0, 1, 2, 3].map((i) => ({
      geo: boxFaceGeo,
      matrix: new T.Matrix4().makeRotationY((i * Math.PI) / 2).multiply(new T.Matrix4().makeTranslation(0, 0, 0.87)),
    })),
  );
  const cubes = instanced(boxGeo, boxMat, n),
    cards = instanced(boxCardsGeo, boxFaceMat(), n),
    group = new T.Group();
  group.add(cubes, cards);
  return {
    group,
    set(i, matrix) {
      cubes.setMatrixAt(i, matrix);
      cards.setMatrixAt(i, matrix);
    },
    commit() {
      cubes.instanceMatrix.needsUpdate = cards.instanceMatrix.needsUpdate = true;
    },
  };
}
// All the coins of a race in one instanced mesh (gold disc with a pale rim).
let coinGeo = null;
const coinMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25 });
export function coinField(n) {
  coinGeo ||= mergeParts([
    {
      geo: new T.CylinderGeometry(0.43, 0.43, 0.12, 24),
      matrix: new T.Matrix4().makeRotationX(Math.PI / 2),
      color: new T.Color(0xf6c85a),
    },
    { geo: new T.TorusGeometry(0.31, 0.035, 6, 24), matrix: new T.Matrix4().makeTranslation(0, 0, 0.075), color: new T.Color(0xffe7a1) },
    { geo: new T.TorusGeometry(0.31, 0.035, 6, 24), matrix: new T.Matrix4().makeTranslation(0, 0, -0.075), color: new T.Color(0xffe7a1) },
  ]);
  const mesh = instanced(coinGeo, coinMat, n);
  return {
    group: mesh,
    set: (i, matrix) => mesh.setMatrixAt(i, matrix),
    commit() {
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
export function makeItemBox() {
  const g = new T.Group();
  const m = new T.Mesh(boxGeo, boxMat);
  g.add(m);
  const edges = new T.LineSegments(boxEdgesGeo, boxEdgeMat);
  g.add(edges);
  for (let i = 0; i < 4; i++) {
    const face = new T.Mesh(boxFaceGeo, boxFaceMat());
    face.rotation.y = (i * Math.PI) / 2;
    face.position.set(Math.sin((i * Math.PI) / 2) * 0.87, 0, Math.cos((i * Math.PI) / 2) * 0.87);
    g.add(face);
  }
  return g;
}
export function makeCoin() {
  const g = new T.Group();
  cyl(g, 0xf6c85a, [0, 0, 0], [0.43, 0.12, 0.43]).rotation.x = Math.PI / 2;
  const ring = new T.Mesh(new T.TorusGeometry(0.31, 0.035, 6, 24), mat(0xffe7a1));
  ring.position.z = 0.075;
  g.add(ring);
  return g;
}
export function makeBanana() {
  const g = new T.Group();
  for (let i = 0; i < 3; i++) {
    const part = new T.Group();
    part.rotation.y = (i * Math.PI * 2) / 3;
    g.add(part);
    line(
      part,
      [
        [0, 0.4, 0],
        [0, 0.25, 0.35],
        [0, 0.06, 0.64],
      ],
      0.1,
      0xf6d34f,
    );
  }
  cyl(g, 0x866b3d, [0, 0.49, 0], [0.05, 0.18, 0.05]);
  return g;
}
// Mario's fireball: a hot core in an orange glow.
export function makeFireball() {
  const g = new T.Group(),
    glow = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false })),
    core = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: 0xffe27a, toneMapped: false }));
  glow.scale.setScalar(0.62);
  core.scale.setScalar(0.38);
  g.add(glow, core);
  return g;
}
// Nova's meteor: a warning ring on the target and the glowing rock above it.
export function makeMeteor() {
  const g = new T.Group(),
    ring = new T.Mesh(
      new T.RingGeometry(0.8, 1, 32),
      new T.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.75, side: T.DoubleSide, depthWrite: false, toneMapped: false }),
    ),
    rock = new T.Group(),
    stone = new T.Mesh(new T.DodecahedronGeometry(0.9, 0), new T.MeshStandardMaterial({ color: 0x8a5a3c, emissive: 0xff5a1a, emissiveIntensity: 0.6, roughness: 0.8, flatShading: true })),
    flame = new T.Mesh(new T.ConeGeometry(0.75, 3.2, 10, 1, true), new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  flame.position.set(0, 1.9, 0.6);
  flame.rotation.x = -0.3;
  rock.add(stone, flame);
  g.add(ring, rock);
  g.userData = { ring, rock };
  return g;
}
// An empty kart for the garage thumbnails (no driver).
export function createShowroomKart(bodyId = "classic") {
  const g = new T.Group(),
    premium = bodyId !== "classic" ? buildBody(bodyId) : null;
  g.add(premium ? premium.group : kartAsset("gold").model);
  return g;
}
// Light trail for boosts: a flat ribbon of light laid along the kart's path
// from a point on the kart (a rear wheel), fading out over `life` seconds,
// so from the raised chase camera it reads as a streak on the road. Points
// are sampled at most 60 times a second and recycled (no per-frame garbage).
export function speedTrail({ points = 24, life = 0.36, width = 0.2 } = {}) {
  const pos = new Float32Array(points * 6),
    col = new Float32Array(points * 8),
    geo = new T.BufferGeometry(),
    index = [];
  for (let i = 0; i < points - 1; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  geo.setIndex(index);
  geo.setAttribute("position", new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute("color", new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage));
  const mesh = new T.Mesh(
    geo,
    new T.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
      toneMapped: false,
      fog: false,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;
  const pool = Array.from({ length: points }, () => ({ p: new T.Vector3(), t: 0, c: new T.Color() }));
  let count = 0,
    head = 0; // pool[head] is the newest point
  const tan = new T.Vector3(),
    side = new T.Vector3();
  const at = (i) => pool[(head + i) % points];
  return {
    mesh,
    clear() {
      count = 0;
      mesh.visible = false;
    },
    update(anchor, active, colour, now, eye) {
      if (count && at(0).p.distanceToSquared(anchor) > 400) count = 0; // a teleport: start over
      if (active) {
        if (!count || now - at(0).t >= 1 / 60) {
          head = (head + points - 1) % points;
          count = Math.min(points, count + 1);
        }
        const n = at(0);
        n.p.copy(anchor);
        n.t = now;
        n.c.setHex(colour);
      }
      while (count && now - at(count - 1).t > life) count--;
      mesh.visible = count > 1;
      if (!mesh.visible) return;
      for (let i = 0; i < points; i++) {
        if (i >= count) {
          col[i * 8 + 3] = col[i * 8 + 7] = 0;
          pos.copyWithin(i * 6, Math.max(0, count - 1) * 6, Math.max(0, count - 1) * 6 + 6);
          continue;
        }
        const h = at(i),
          o = at(Math.min(count - 1, i + 1)),
          age = Math.min(1, (now - h.t) / life),
          fade = (1 - age) * (1 - age);
        tan.subVectors(h.p, o.p);
        if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
        side.crossVectors(tan, UP).normalize().multiplyScalar(width * (1 - age * 0.6));
        pos[i * 6] = h.p.x + side.x;
        pos[i * 6 + 1] = h.p.y + side.y;
        pos[i * 6 + 2] = h.p.z + side.z;
        pos[i * 6 + 3] = h.p.x - side.x;
        pos[i * 6 + 4] = h.p.y - side.y;
        pos[i * 6 + 5] = h.p.z - side.z;
        for (const k of [0, 4]) {
          col[i * 8 + k] = h.c.r;
          col[i * 8 + k + 1] = h.c.g;
          col[i * 8 + k + 2] = h.c.b;
          col[i * 8 + k + 3] = 0.9 * fade;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
// Shock ring at boost ignition: expands and fades behind the kart, facing
// the camera.
export function boostRing() {
  const mesh = new T.Mesh(
    new T.RingGeometry(0.62, 0.8, 48),
    new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
      toneMapped: false,
      fog: false,
    }),
  );
  mesh.renderOrder = 6;
  mesh.visible = false;
  let t = 1,
    size = 1;
  return {
    mesh,
    fire(colour, strength = 1) {
      t = 0;
      size = strength;
      mesh.material.color.setHex(colour);
    },
    update(at, facing, dt) {
      if (t >= 1) return void (mesh.visible = false);
      t = Math.min(1, t + dt / 0.45);
      mesh.visible = true;
      mesh.position.copy(at);
      mesh.quaternion.copy(facing);
      mesh.scale.setScalar((0.6 + 2.8 * (1 - (1 - t) ** 3)) * size);
      mesh.material.opacity = 0.9 * (1 - t) ** 1.3;
    },
  };
}
// Lock-on marker for an attack special: a red reticle with a pointer that
// hovers over the kart it would hit. Drawn over everything (no depth test)
// so it shows through scenery; the game turns it to face the camera.
export function makeTargetMark() {
  const red = new T.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.95, side: T.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false }),
    white = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: T.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false }),
    g = new T.Group(),
    reticle = new T.Group();
  reticle.add(new T.Mesh(new T.RingGeometry(0.6, 0.78, 36), red), new T.Mesh(new T.RingGeometry(0.78, 0.86, 36), white));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2,
      tick = new T.Mesh(new T.PlaneGeometry(0.13, 0.42), red);
    tick.position.set(Math.sin(a) * 1.02, Math.cos(a) * 1.02, 0);
    tick.rotation.z = -a;
    reticle.add(tick);
  }
  const pointer = new T.Mesh(new T.ConeGeometry(0.3, 0.5, 3), red);
  pointer.rotation.z = Math.PI; // points down at the kart
  pointer.position.y = -1.35;
  g.add(reticle, pointer);
  g.traverse((o) => (o.renderOrder = 20));
  g.userData = { reticle, pointer };
  g.visible = false;
  return g;
}
export function makeShell() {
  const g = new T.Group();
  ball(g, 0xe4564d, [0, 0.3, 0], [0.57, 0.4, 0.65]);
  const r = new T.Mesh(new T.TorusGeometry(0.53, 0.1, 8, 24), mat(0xfff5db));
  r.rotation.x = Math.PI / 2;
  r.position.y = 0.12;
  g.add(r);
  return g;
}
export function createLobby() {
  const g = new T.Group(),
    decor = new T.Group();
  const ground = new T.Mesh(new T.PlaneGeometry(180, 180, 24, 24), mat(0xd8e5cf));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.58;
  ground.receiveShadow = true;
  g.add(ground);
  const base = cyl(g, 0xd4e1ca, [0, -0.3, 0], [5.6, 0.5, 4.4]);
  const road = cyl(g, 0x7e9b8a, [0, -0.04, 0], [5.1, 0.08, 4]);
  const ring = new T.Mesh(new T.TorusGeometry(4.6, 0.06, 8, 80), mat(0xfaf1c8));
  ring.rotation.x = Math.PI / 2;
  ring.scale.y = 0.78;
  ring.position.y = 0.02;
  g.add(ring);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2,
      m = box(
        g,
        i % 2 ? 0xfff7da : 0xeab67a,
        [Math.sin(a) * 5.25, -0.02, Math.cos(a) * 4.15],
        [0.55, 0.22, 0.55],
      );
    m.rotation.y = a;
  }
  const rng = seeded(77);
  for (let i = 0; i < 9; i++) {
    const tr = new T.Group();
    tr.position.set((i - 4) * 4.5, -0.6, -7 - Math.abs(i - 4) * 0.7);
    tr.scale.setScalar(0.42 + rng() * 0.22);
    tree(tr, 0, rng);
    decor.add(tr);
  }
  for (let i = 0; i < 15; i++) {
    const fl = new T.Group();
    fl.position.set(rng() * 14 - 7, -0.1, rng() * 5 - 4);
    flower(fl, rng);
    decor.add(fl);
  }
  cloud(decor, [-7, 5, -8], 0.8);
  cloud(decor, [5, 7, -12], 1);
  const backdrop = staticBatch(decor);
  g.add(backdrop);
  const mill = new T.Group();
  mill.position.set(7, -0.5, -9);
  mill.scale.setScalar(0.75);
  g.add(mill);
  const moving = windmill(mill);
  return { group: g, moving, backdrop };
}
