import * as T from "./vendor/three.module.js";
import { kartAsset } from "./kart-assets.js?v=39cf6a4b";
import { buildBody, classicRig, poseRig, setEnvironment as setBodyEnvironment } from "./kart-bodies.js?v=39cf6a4b";
import { dog, animateDog, reactDog, material, ellipsoid, roundedBox, star as starMesh, faceDepth } from "./models.js?v=39cf6a4b";
import { CHARACTERS, KARTS, seeded } from "./race.js?v=39cf6a4b";
const scenerySphere = new T.SphereGeometry(1, 12, 8);
const sphere = new T.SphereGeometry(1, 24, 18),
  unitBox = new T.BoxGeometry(1, 1, 1),
  cylinder = new T.CylinderGeometry(1, 1, 1, 20),
  unitCone = new T.ConeGeometry(1, 1, 10);
// (Shared by everything: never freed when a race is cleared up.)
for (const geo of [scenerySphere, sphere, unitBox, cylinder, unitCone]) geo.userData.shared = true;
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
export function cone(g, c, p, s) {
  const m = new T.Mesh(unitCone, typeof c === "number" ? mat(c) : c);
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
// Expression rig for the bunny and the bear, matching the dogs' (see
// faceRig): eyes with catchlights that blink, glance and widen; happy "^ ^"
// and dizzy "x x" eyes; brows that knit or lift; an open mouth that smiles,
// gasps or grits its teeth; and a blush.
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
    brow.visible = false;
    brows.push(brow);
  }
  const blush = [-1, 1].map((s) => {
    const b = ball(head, 0xff9fb0, [s * 0.36, -0.1, 0.5], [0.1, 0.05, 0.02]);
    b.visible = false;
    return b;
  });
  const mouth = openMouth(head, [0, -0.29, 0.52]);
  return faceRig({ eyes: eyeList, happy, hurt, brows, smile, mouth, blush, look: 0.03 });
}
// A mouth that opens: dark inside, a tongue and a row of teeth, as one group
// scaled to the shape (w, h); hidden while closed.
// Two shapes: a round "o" and a "◡" smile (the lower half of a sphere, flat
// along the top), so a grin reads as a grin and a gasp as a gasp.
const mouthSphere = new T.SphereGeometry(1, 20, 14),
  mouthHalf = new T.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
  mouthMat = new T.MeshStandardMaterial({ color: 0x5b1f27, roughness: 0.6, side: T.DoubleSide });
function openMouth(head, at) {
  const g = new T.Group();
  g.position.set(...at);
  head.add(g);
  const round = new T.Mesh(mouthSphere, mouthMat),
    smile = new T.Mesh(mouthHalf, mouthMat),
    tongue = new T.Mesh(mouthSphere, mat(0xf2899a, 0.55)),
    teeth = new T.Mesh(unitBox, mat(0xffffff, 0.35));
  smile.position.y = 0.5; // flat top at the mouth line
  tongue.position.set(0, -0.32, 0.45);
  tongue.scale.set(0.62, 0.42, 0.5);
  teeth.position.set(0, 0.3, 0.62);
  teeth.scale.set(1.5, 0.36, 0.3);
  g.add(round, smile, tongue, teeth);
  g.visible = false;
  g.userData = { round, smile, tongue, teeth };
  return g;
}
// Pivot an object about the centre of its own bounds so it can be scaled or
// turned in place (the dogs' face parts are built at the head's origin).
function pivotize(o) {
  const box3 = new T.Box3(),
    b = new T.Box3();
  o.updateMatrix();
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox();
    b.copy(m.geometry.boundingBox).applyMatrix4(m === o ? m.matrix : m.matrix.clone().premultiply(o.matrix));
    box3.union(b);
  });
  const c = box3.getCenter(new T.Vector3()),
    pivot = new T.Group();
  pivot.position.copy(c);
  o.parent.add(pivot);
  pivot.add(o);
  o.position.sub(c);
  pivot.visible = o.visible;
  pivot.userData.pivot = true;
  o.visible = true;
  return pivot;
}
// Mood presets for the face rigs: eye opening, "^ ^" / "x x", mouth shape
// (w, h), teeth, brow angle (> 0 knits them: determined) and lift, blush and
// sparkle (bigger catchlights). Every value is eased, so a face changes
// smoothly instead of snapping.
const FACE = {
  "": { eye: 1, happy: 0, hurt: 0, mouth: [0, 0], teeth: 0, brow: 0, lift: 0, blush: 0, sparkle: 0 },
  happy: { eye: 1, happy: 1, hurt: 0, mouth: [0.125, 0.085], teeth: 0, brow: 0, lift: 0.01, blush: 1, sparkle: 0 },
  cheer: { eye: 1, happy: 1, hurt: 0, mouth: [0.135, 0.1], teeth: 0, brow: 0, lift: 0.02, blush: 1, sparkle: 0 },
  excited: { eye: 1.1, happy: 0, hurt: 0, mouth: [0.135, 0.095], teeth: 0, brow: -0.12, lift: 0.015, blush: 1, sparkle: 1 },
  focus: { eye: 0.62, happy: 0, hurt: 0, mouth: [0.11, 0.05], teeth: 1, brow: 0.4, lift: -0.01, blush: 0, sparkle: 0 },
  surprise: { eye: 1.3, happy: 0, hurt: 0, mouth: [0.05, 0.064], teeth: 0, brow: -0.3, lift: 0.035, blush: 0, sparkle: 0 },
  hurt: { eye: 1, happy: 0, hurt: 1, mouth: [0.07, 0.03], teeth: 0, brow: -0.32, lift: 0.02, blush: 0, sparkle: 0 },
};
const catchGeo = new T.SphereGeometry(1, 12, 8),
  catchMat = new T.MeshBasicMaterial({ color: 0xffffff });
// Wrap a character's face parts into an animated rig (see updateFace).
function faceRig({ eyes, happy, hurt, brows, smile = null, mouth, blush = [], look = 0.022, tongue = null }) {
  const f = {
    eyes,
    happy,
    hurt,
    brows,
    smile,
    mouth,
    blush,
    tongue,
    lookRange: look,
    base: eyes.map((e) => ({ p: e.position.clone(), s: e.scale.clone() })),
    browBase: brows.map((b) => ({ p: b.position.clone(), s: b.scale.clone(), side: Math.sign(b.position.x) || 1 })),
    happyBase: happy.map((h) => h.scale.clone()),
    hurtBase: hurt.map((h) => h.scale.clone()),
    sparks: [],
    state: { eye: 1, happy: 0, hurt: 0, mw: 0, mh: 0, teeth: 0, brow: 0, lift: 0, blush: 0, sparkle: 0, look: 0 },
    blink: 0,
    nextBlink: 1 + Math.random() * 3,
    blinks: 0,
  };
  // Two catchlights per eye (the dogs' eyes had none): a big one up-left and
  // a small one down-right, unlit so they always shine.
  for (const e of eyes) {
    if (!e.children.length) {
      const big = new T.Mesh(catchGeo, catchMat);
      big.position.set(-0.3, 0.36, 0.8);
      big.scale.set(0.34, 0.31, 0.3);
      e.add(big);
    }
    const small = new T.Mesh(catchGeo, catchMat);
    small.position.set(0.32, -0.32, 0.8);
    small.scale.setScalar(0.15);
    e.add(small);
    f.sparks.push(e.children[0], small);
  }
  return f;
}
const easeN = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-dt * rate));
// Faces only matter close to the camera: far away the catchlights (four
// draw calls per face) are hidden and the rig is not animated.
const faceAt = new T.Vector3();
function faceNear(g, f, ctx, showcase) {
  const near = showcase || !ctx.camera || g.getWorldPosition(faceAt).distanceToSquared(ctx.camera.position) < 16 * 16;
  if (near !== f.near) {
    f.near = near;
    f.sparks.forEach((c) => (c.visible = near));
  }
  return near;
}
// Pose a face rig for a mood. `look` turns the eyes (-1 .. 1).
function updateFace(f, mood, look, dt, t) {
  const p = FACE[mood] || FACE[""],
    s = f.state,
    k = dt;
  s.eye = easeN(s.eye, p.eye, 16, k);
  s.happy = easeN(s.happy, p.happy, 18, k);
  s.hurt = easeN(s.hurt, p.hurt, 18, k);
  s.mw = easeN(s.mw, p.mouth[0], 16, k);
  s.mh = easeN(s.mh, p.mouth[1], 16, k);
  s.teeth = easeN(s.teeth, p.teeth, 16, k);
  s.brow = easeN(s.brow, p.brow, 14, k);
  s.lift = easeN(s.lift, p.lift, 14, k);
  s.blush = easeN(s.blush, p.blush, 8, k);
  s.sparkle = easeN(s.sparkle, p.sparkle, 10, k);
  s.look = easeN(s.look, look, 8, k);
  // Blinks: every 2-5 s, quick to close and a touch slower to open, now and
  // then twice in a row.
  f.nextBlink -= dt;
  if (f.nextBlink <= 0) {
    f.blink = 0.14;
    f.blinks = f.blinks > 0 ? 0 : Math.random() < 0.22 ? 1 : 0;
    f.nextBlink = f.blinks ? 0.2 : 2 + Math.random() * 3;
  }
  f.blink = Math.max(0, f.blink - dt);
  const b = f.blink > 0 ? (f.blink > 0.09 ? (0.14 - f.blink) / 0.05 : f.blink / 0.09) : 0,
    lid = 1 - 0.9 * Math.min(1, b),
    open = 1 - s.happy - s.hurt;
  f.eyes.forEach((e, i) => {
    const base = f.base[i];
    e.visible = open > 0.04;
    e.position.set(base.p.x + s.look * f.lookRange, base.p.y + s.lift * 0.4, base.p.z);
    const w = 1 + (s.eye - 1) * 0.6;
    e.scale.set(base.s.x * w, base.s.y * s.eye * lid * Math.max(0.05, open), base.s.z);
  });
  // Bigger catchlights when excited (starry eyes), a twinkle on top.
  const sp = 1 + s.sparkle * (0.75 + Math.sin(t * 9) * 0.15);
  f.sparks.forEach((c, i) => c.scale.setScalar((i % 2 ? 0.15 : 0.32) * sp));
  f.happy.forEach((h, i) => {
    const hb = f.happyBase[i];
    h.visible = s.happy > 0.04;
    if (h.userData.pivot) h.children[0].visible = true; // (the dog rig toggles the part itself)
    h.scale.set(hb.x, hb.y * Math.max(0.05, s.happy), hb.z);
  });
  f.hurt.forEach((h, i) => {
    const hb = f.hurtBase[i];
    h.visible = s.hurt > 0.04;
    if (h.userData.pivot) h.children[0].visible = true;
    h.scale.copy(hb).multiplyScalar(Math.max(0.05, s.hurt));
    h.rotation.z = t * 6 * s.hurt; // spinning dizzy eyes
  });
  const browOn = Math.min(1, Math.abs(s.brow) * 4 + Math.max(0, s.lift) * 40);
  f.brows.forEach((br, i) => {
    const bb = f.browBase[i];
    br.visible = browOn > 0.05;
    if (br.userData.pivot) br.children[0].visible = true;
    br.rotation.z = bb.side * s.brow;
    br.position.set(bb.p.x + s.look * f.lookRange * 0.6, bb.p.y + s.lift, bb.p.z);
    br.scale.set(bb.s.x * Math.max(0.05, browOn), bb.s.y, bb.s.z);
  });
  const opened = Math.max(s.mw, 0) > 0.012 && s.mh > 0.008;
  f.mouth.visible = opened;
  if (opened) {
    const mu = f.mouth.userData,
      round = s.mh > s.mw * 0.8; // a gasp; otherwise a grin
    f.mouth.scale.set(s.mw, s.mh, 0.035);
    mu.round.visible = round;
    mu.smile.visible = !round;
    mu.teeth.visible = s.teeth > 0.3;
    mu.tongue.visible = s.teeth < 0.3 && s.mh > 0.04;
  }
  if (f.smile) f.smile.visible = s.mh < 0.03;
  if (f.tongue) f.tongue.visible = false;
  f.blush.forEach((m) => {
    m.visible = s.blush > 0.05;
    m.scale.x = (m.userData.bx ??= m.scale.x) * (0.6 + 0.4 * s.blush);
  });
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
// Emote bubbles (v2.6): a little speech bubble pops up over a driver's head —
// "!" when startled, a crash star off a rail, an anger mark when bumped,
// sparkles under 必杀无敌, dizzy swirls after a hit. Drawn as vector icons
// (no emoji font needed) into one shared atlas.
// ---------------------------------------------------------------------------
const EMOTES = ["!", "?", "♪", "💢", "💦", "💥", "✨", "💫", "❤"];
let emoteAtlas = null;
function emoteTexture() {
  if (emoteAtlas) return emoteAtlas;
  const n = EMOTES.length,
    S = 128,
    c = document.createElement("canvas");
  c.width = S * n;
  c.height = S;
  const x = c.getContext("2d");
  const star = (cx, cy, r, spikes = 4, inner = 0.32) => {
    x.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i * Math.PI) / spikes - Math.PI / 2,
        rr = i % 2 ? r * inner : r;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
  };
  const drop = (cx, cy, r) => {
    x.beginPath();
    x.moveTo(cx, cy - r * 1.6);
    x.bezierCurveTo(cx + r * 0.2, cy - r * 0.9, cx + r, cy - r * 0.3, cx + r, cy + r * 0.25);
    x.arc(cx, cy + r * 0.25, r, 0, Math.PI);
    x.bezierCurveTo(cx - r, cy - r * 0.3, cx - r * 0.2, cy - r * 0.9, cx, cy - r * 1.6);
    x.closePath();
  };
  EMOTES.forEach((icon, i) => {
    const ox = i * S,
      cx = ox + 64,
      cy = 58;
    // Bubble with a tail, soft outline.
    x.save();
    x.lineJoin = "round";
    x.lineWidth = 6;
    x.strokeStyle = "#2e3b3a";
    x.fillStyle = "#fffdf5";
    x.beginPath();
    x.arc(cx, cy, 44, 0.62 * Math.PI, 0.38 * Math.PI + 2 * Math.PI);
    x.lineTo(cx + 6, cy + 62);
    x.closePath();
    x.fill();
    x.stroke();
    x.restore();
    x.save();
    x.lineCap = "round";
    x.lineJoin = "round";
    if (icon === "!" || icon === "?") {
      x.fillStyle = icon === "!" ? "#ff4b3e" : "#3c8dff";
      x.font = "900 68px Arial, Helvetica, sans-serif";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(icon, cx, cy + 3);
    } else if (icon === "♪") {
      x.fillStyle = "#7a5cff";
      x.beginPath();
      x.ellipse(cx - 12, cy + 18, 13, 10, -0.4, 0, Math.PI * 2);
      x.fill();
      x.fillRect(cx - 2, cy - 26, 7, 46);
      x.beginPath();
      x.moveTo(cx + 5, cy - 26);
      x.quadraticCurveTo(cx + 26, cy - 18, cx + 20, cy - 2);
      x.quadraticCurveTo(cx + 18, cy - 12, cx + 5, cy - 14);
      x.fill();
    } else if (icon === "💢") {
      x.strokeStyle = "#ff3d4e";
      x.lineWidth = 9;
      for (let q = 0; q < 4; q++) {
        x.save();
        x.translate(cx, cy);
        x.rotate((q * Math.PI) / 2);
        x.beginPath();
        x.moveTo(8, -24);
        x.quadraticCurveTo(8, -8, 24, -8);
        x.stroke();
        x.restore();
      }
    } else if (icon === "💦") {
      x.fillStyle = "#3fb3ff";
      drop(cx - 12, cy + 2, 13);
      x.fill();
      drop(cx + 16, cy - 8, 9);
      x.fill();
    } else if (icon === "💥") {
      x.fillStyle = "#ffb627";
      star(cx, cy, 34, 8, 0.5);
      x.fill();
      x.fillStyle = "#ff5a2a";
      star(cx, cy, 18, 8, 0.5);
      x.fill();
    } else if (icon === "✨") {
      x.fillStyle = "#ffcf2e";
      star(cx - 8, cy + 6, 26);
      x.fill();
      star(cx + 20, cy - 18, 13);
      x.fill();
    } else if (icon === "💫") {
      x.strokeStyle = "#ffb627";
      x.lineWidth = 7;
      x.beginPath();
      for (let a = 0; a < Math.PI * 3.2; a += 0.15) x.lineTo(cx + Math.cos(a) * a * 6.5, cy + Math.sin(a) * a * 5);
      x.stroke();
      x.fillStyle = "#ffcf2e";
      star(cx + 24, cy - 22, 12, 5, 0.45);
      x.fill();
    } else if (icon === "❤") {
      x.fillStyle = "#ff4f7a";
      x.beginPath();
      x.moveTo(cx, cy + 26);
      x.bezierCurveTo(cx - 40, cy, cx - 22, cy - 34, cx, cy - 14);
      x.bezierCurveTo(cx + 22, cy - 34, cx + 40, cy, cx, cy + 26);
      x.fill();
    }
    x.restore();
  });
  emoteAtlas = new T.CanvasTexture(c);
  emoteAtlas.colorSpace = T.SRGBColorSpace;
  return emoteAtlas;
}
// Show an emote over a kart's driver for `seconds`.
export function emote(g, icon, seconds = 1) {
  const d = g.userData,
    i = Math.max(0, EMOTES.indexOf(icon));
  if (!d.emote) {
    const tex = emoteTexture().clone();
    tex.repeat.set(1 / EMOTES.length, 1);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    sprite.renderOrder = 8;
    sprite.visible = false;
    g.add(sprite);
    d.emote = { sprite, tex, t: 0, life: 0 };
  }
  const e = d.emote;
  e.tex.offset.x = i / EMOTES.length;
  e.t = 0;
  e.life = seconds;
  e.side = Math.random() < 0.5 ? -1 : 1;
}
function animateEmote(d, dt, t) {
  const e = d.emote;
  if (!e) return;
  e.t += dt;
  const on = e.t < e.life;
  e.sprite.visible = on;
  if (!on) return;
  const pop = Math.min(1, e.t / 0.22),
    grow = 1 + 2.70158 * (pop - 1) ** 3 + 1.70158 * (pop - 1) ** 2, // ease out with a bounce
    fade = Math.min(1, (e.life - e.t) / 0.25);
  e.sprite.scale.setScalar(0.95 * grow * (0.85 + 0.15 * fade));
  e.sprite.position.set(e.side * 0.55, (d.emoteY || 2.55) + e.t * 0.25 + Math.sin(t * 7) * 0.03, -0.1);
  e.sprite.material.opacity = fade;
  e.sprite.material.rotation = Math.sin(t * 5) * 0.08;
}
// 必杀无敌 aura: a golden energy shell (bright at the rim, see-through in the
// middle, with bands running up it) and two spinning rings.
const auraVertex = `
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y;
  gl_Position = projectionMatrix * mv;
}`;
const auraFragment = `
uniform vec3 colour; uniform float opacity; uniform float time;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
  float rim = pow(1.0 - abs(dot(vN, vV)), 2.6);
  float bands = 0.6 + 0.4 * sin(vY * 18.0 - time * 9.0);
  gl_FragColor = vec4(colour * (rim * 1.25 * bands + 0.03), 1.0) * opacity;
}`;
function makeAura(colour = 0xffbf3a) {
  const g = new T.Group(),
    shell = new T.Mesh(
      new T.SphereGeometry(1, 32, 20),
      new T.ShaderMaterial({
        uniforms: { colour: { value: new T.Color(colour) }, opacity: { value: 0 }, time: { value: 0 } },
        vertexShader: auraVertex,
        fragmentShader: auraFragment,
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
  shell.position.y = 1.0;
  shell.scale.set(1.45, 1.2, 1.9);
  shell.renderOrder = 7;
  const ringMat = new T.MeshBasicMaterial({ color: 0xffc84a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    rings = [0.45, -0.6].map((tilt, i) => {
      // A tilted ring turning about the vertical: it precesses like a gyro.
      const holder = new T.Group(),
        r = new T.Mesh(new T.TorusGeometry(1.6, 0.028, 6, 64), ringMat);
      holder.position.y = 0.95 + i * 0.25;
      r.rotation.set(Math.PI / 2 + tilt, 0, 0);
      r.renderOrder = 7;
      holder.add(r);
      return holder;
    });
  g.add(shell, ...rings);
  g.visible = false;
  g.userData = { shell, rings, ringMat };
  return g;
}
// Environment reflections for kart bodies (set once by the game, before
// karts are built): glossy paint and chrome on the premium bodies, and a toy
// sheen on the classic Kenney kart.
let envTexture = null;
export function setEnvironment(texture) {
  envTexture = texture;
  setBodyEnvironment(texture);
}
const glossed = new WeakSet();
function glossKenney(model) {
  if (!envTexture) return;
  model.traverse((o) => {
    if (!o.isMesh || glossed.has(o.material) || !o.material.isMeshStandardMaterial) return;
    glossed.add(o.material);
    o.material.envMap = envTexture;
    o.material.envMapIntensity = o.name.startsWith("wheel") ? 0.35 : 0.75;
    o.material.roughness = Math.min(o.material.roughness, o.name.startsWith("wheel") ? 0.8 : 0.42);
    o.material.needsUpdate = true;
  });
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
  const info = CHARACTERS.find((c) => c.id === kind),
    accent = info ? new T.Color(info.color).getHex() : 0xeeae55;
  // A premium body (闪电 GT, 喷射火箭, 幻影星舰) or the classic Kenney kart.
  // (v2.8: a kart id names a body and its livery.)
  const spec = KARTS[bodyId],
    premium = bodyId && bodyId !== "classic" ? buildBody(spec?.body || bodyId, spec?.trim) : null;
  let asset,
    rig = premium?.rig || null,
    extraGlow = [];
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
    glossKenney(asset.model);
    // The classic kart's transformation parts (spoiler, mini boosters).
    const extra = classicRig(accent);
    body.add(extra.group);
    rig = extra.rig;
    extraGlow = extra.glow;
  }
  const driver = asset.nativeDriver || character(kind);
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
  const antenna = new T.Group();
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
    // Where the flame sits once the body has transformed (pipes slide out).
    f.tip0 = e.tip.clone();
    f.tip1 = e.tip1 ? e.tip1.clone() : null;
    return f;
  });
  // Neon parts that flare up during a boost.
  const glow = [...(premium?.glow || []), ...extraGlow].map((m) => ({ m, colour: m.color.clone(), opacity: m.opacity }));
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
  // 必杀无敌 aura (not drawn by the compatibility renderer).
  const aura = compatibility ? null : makeAura();
  if (aura) g.add(aura);
  // Face rigs: the dogs' sculpted faces get catchlights, an open mouth and
  // brows that move; the bunny and bear have theirs from expressions().
  if (driver.userData.kartDog) {
    const u = driver.userData,
      y = -0.33;
    u.face2 = faceRig({
      eyes: u.eyes,
      happy: u.happyEyes.map(pivotize),
      hurt: u.hurtEyes.map(pivotize),
      brows: u.eyebrows.map(pivotize),
      mouth: openMouth(u.head, [0, y, faceDepth(0, y) + 0.006]),
      blush: u.blush,
      tongue: u.tongue,
    });
  }
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
  if (rig) poseRig(rig, 0);
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
    rig,
    aura,
    emoteY: driver.userData.kartDog ? 2.75 : 2.6,
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
      morph: 0, // boost transformation (变形), 0 folded .. 1 deployed (springy)
      morphV: 0,
      guard: 0, // 必杀无敌 aura strength
      squash: 0, // ignition squash and stretch
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
// Garage: show the transformation now, for `seconds`.
export function previewTransform(g, seconds = 2.5) {
  g.userData.vis.preview = seconds;
}
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
  // The nose also turns in with the wheel at once (v2.7), before the kart
  // has started to move across: a touch on the screen shows immediately.
  const slipTarget = showcase ? 0 : Math.atan2(r?.lateral || 0, Math.max(8, speed)) * 0.9 + (drifting ? 0 : steer * 0.075 * Math.min(1, speed / 10));
  v.slip = ease(v.slip, slipTarget, 12, dt);
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
  // In the garage the kart shows off its transformation every few seconds
  // (and at once when it is picked, see previewTransform).
  v.preview = Math.max(0, (v.preview || 0) - dt);
  const showMorph = showcase && (t % 6.5 > 3.6 || v.preview > 0);
  const mood = showcase
    ? showMorph
      ? "excited"
      : t % 13 > 10.8
        ? "happy"
        : ""
    : r?.stun > 0
      ? "hurt"
      : r && r.finish !== null && r.finish !== undefined
        ? "cheer"
        : v.moodTime > 0
          ? v.mood
          : r?.guard > 0 || r?.rocket > 0 || r?.star > 0
            ? "excited"
            : v.active && v.kick > 0.2
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
  // --- Boost transformation (变形) -----------------------------------------
  // A spring drives the transform amount: a quick unfold with a little
  // overshoot (the parts "clack" into place), a softer fold back. Specials,
  // stars, rockets and the bear's ram transform the kart too.
  const transformed = showcase
    ? showMorph
    : (r?.boost > 0 || r?.star > 0 || r?.rocket > 0 || r?.guard > 0 || r?.charge > 0) && !(r?.rescue > 0);
  for (let left = Math.min(dt, 0.1); left > 1e-6; left -= 1 / 120) {
    const h = Math.min(left, 1 / 120),
      stiff = transformed ? 260 : 120,
      damp = transformed ? 20 : 19;
    v.morphV += ((transformed ? 1 : 0) - v.morph) * stiff * h - v.morphV * damp * h;
    v.morph = Math.max(-0.05, v.morph + v.morphV * h);
  }
  const m = Math.max(0, v.morph),
    m1 = Math.min(1.1, m);
  if (d.rig) {
    poseRig(d.rig, m);
    for (const sp of d.rig.spin) sp.obj.rotation[sp.axis] += (sp.idle + (sp.boost - sp.idle) * m1) * dt;
    if (d.rig.tilt) for (const w of d.wheels) if (w.tilt) w.tilt.rotation.z = -(w.side || 1) * d.rig.tilt * m1;
    d.body.position.y += d.rig.lift * m1;
  }
  // Ignition squash and stretch: the body stretches forward and squats.
  const pulse = v.kick > 0 ? Math.sin((1 - v.kick) * Math.PI) : 0,
    sq = pulse * (0.45 + 0.55 * (v.big || 0.4));
  d.body.scale.set(1 - 0.035 * sq, 1 - 0.06 * sq, 1 + 0.09 * sq);
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
  if (!d.nativeDriver) {
    driver.rotation.z = -steer * 0.06 - v.drift * 0.05 + wobble * (r?.bumpSide || 0) * 0.25;
    driver.rotation.x = -0.1 * pulse * (v.big || 0.4); // pushed back into the seat
  }
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
        mood === "hurt" ? "hurt" : mood === "happy" || mood === "cheer" || mood === "excited" ? "happy" : mood === "focus" ? "surprise" : "normal",
        timed ? v.moodTime : 99,
      );
    }
    u.head.rotation.y -= v.lookApplied || 0;
    animateDog(driver, t, mood === "cheer" ? "cheer" : "idle", { dt, turn: steer });
    v.lookApplied = showcase ? 0 : v.look * 0.45;
    u.head.rotation.y += v.lookApplied;
    u.legs.forEach((a) => (a.rotation.x = -1.25)); // seated: thighs forward
    u.head.rotation.y = showcase ? Math.sin(t * 0.8) * 0.13 : -steer * 0.18;
    // Ears stream back with speed and flap in the boost wind.
    u.ears.forEach((e, i) => {
      e.rotation.x = Math.sin(t * (7 + speed * 0.25) + i) * (0.06 + v.nitro * 0.1) + speed * 0.002 - v.nitro * 0.12;
    });
    if (u.face2) faceNear(g, u.face2, ctx, showcase) && updateFace(u.face2, mood, clampN(-(steer * 0.8 + v.look), -1, 1), dt, t);
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
    if (u.face) faceNear(g, u.face, ctx, showcase) && updateFace(u.face, mood, clampN(-(steer * 0.8 + v.look), -1, 1), dt, t);
    else
      u.eyes.forEach(
        (e) => (e.scale.y = (t % 4.6 > 4.43 ? 0.1 : 1) * (g.userData.kind === "mario" ? 0.06 : g.userData.kind === "dora" ? 0.08 : 0.0702)),
      );
    // Long ears stream back with speed and flap in the boost wind.
    u.ears.forEach((e, i) => {
      e.rotation.z = Math.sin(t * 3 + i) * 0.06;
      e.rotation.x = -Math.min(0.5, speed * 0.009) - v.nitro * 0.14 + Math.sin(t * (6 + speed * 0.3) + i * 1.7) * (0.03 + v.nitro * 0.07);
    });
    // A gasp of joy (head back) when a boost fires.
    u.head.rotation.x = -0.18 * pulse * (v.big || 0.4);
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
  // (In the garage the transformed kart lights its jets too.)
  const active = showcase ? showMorph : (r?.boost > 0 || r?.star > 0) && !(r?.rescue > 0);
  if (active && (!v.active || (r?.boostCount ?? 0) !== v.boostCount)) {
    v.kick = 1; // ignition pop, also for a new boost on top of one
    v.kind = !r ? "nitro" : r.star > 0 ? "star" : r.boostKind || "item";
    v.big = /start|nitro|drift3|rocket|item/.test(v.kind) ? 1 : 0.4;
  }
  v.boostCount = r?.boostCount ?? 0;
  if (active && r) v.kind = r.star > 0 ? "star" : r.boostKind || v.kind;
  v.active = active;
  v.nitro = ease(v.nitro, active ? (r ? 1 : 0.7) : 0, active ? 22 : 7, dt);
  v.kick = Math.max(0, v.kick - dt * 5.5);
  const cfg = NITRO[v.kind] || NITRO.item,
    on = v.nitro > 0.02,
    fade = d.fade ?? 1;
  if (on && ctx.camera) d.body.updateMatrixWorld();
  d.exhaust.forEach((f, i) => {
    if (f.tip1) f.nozzle.position.lerpVectors(f.tip0, f.tip1, m1);
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
  // 必杀无敌: the golden aura fades in, runs bands up its shell, and blinks
  // as it is about to run out.
  if (d.aura) {
    const guarded = r?.guard > 0;
    v.guard = ease(v.guard, guarded ? 1 : 0, guarded ? 12 : 6, dt);
    d.aura.visible = v.guard > 0.01 && !showcase;
    if (d.aura.visible) {
      const a = d.aura.userData,
        ending = guarded && r.guard < 0.7 ? 0.55 + 0.45 * Math.sin(t * 28) : 1,
        o = v.guard * ending * (d.fade ?? 1);
      a.shell.material.uniforms.opacity.value = 0.85 * o;
      a.shell.material.uniforms.time.value = t;
      a.rings[0].rotation.y = t * 2.6;
      a.rings[1].rotation.y = -t * 2.0;
      a.ringMat.opacity = 0.8 * o;
      d.aura.scale.setScalar(1 + (1 - v.guard) * 0.3 + Math.sin(t * 8) * 0.015);
    }
  }
  d.emoteY ??= 2.6;
  animateEmote(d, dt, t);
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
  if (theme === 3) {
    // Snowy pine: three tiers, each with snow on its top.
    cyl(g, 0x6e5038, [0, 0.9, 0], [0.32, 1.8, 0.32]);
    const green = [0x2f6b52, 0x3a7a5c, 0x2a5f4c][Math.floor(rng() * 3)];
    for (const [y, r, h] of [[2.4, 2.3, 2.6], [3.9, 1.75, 2.3], [5.2, 1.15, 2]]) {
      cone(g, green, [0, y, 0], [r, h, r]);
      cone(g, 0xf7fbff, [0, y + h * 0.28, 0], [r * 0.62, h * 0.45, r * 0.62]);
    }
    return;
  }
  if (theme === 4) {
    if (rng() < 0.62) {
      // Saguaro cactus with two arms.
      const green = [0x5f9a4c, 0x6aa257, 0x548c45][Math.floor(rng() * 3)],
        h = 4.2 + rng() * 2;
      cyl(g, green, [0, h / 2, 0], [0.42, h, 0.42]);
      ball(g, green, [0, h, 0], [0.42, 0.42, 0.42]);
      for (const s of [-1, 1]) {
        const y = h * (0.35 + rng() * 0.25),
          up = 1.2 + rng() * 1.2;
        cyl(g, green, [s * 0.7, y, 0], [0.26, 1.1, 0.26]).rotation.z = Math.PI / 2;
        cyl(g, green, [s * 1.2, y + up / 2, 0], [0.26, up, 0.26]);
        ball(g, green, [s * 1.2, y + up, 0], [0.26, 0.26, 0.26]);
      }
      if (rng() < 0.4) ball(g, 0xff7aa6, [0, h + 0.4, 0], [0.22, 0.16, 0.22]);
    } else {
      // Dry shrub on a sandy rock.
      ball(g, 0xc99a63, [0, 0.4, 0], [1.4, 0.7, 1.2]);
      ball(g, [0x9aa35a, 0xa8a05c][Math.floor(rng() * 2)], [0.2, 1.1, 0], [1.2, 0.9, 1.1]);
    }
    return;
  }
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
function flower(g, rng, theme = 0) {
  if (theme === 3) {
    // A little drift of snow, sometimes with an ice shard in it.
    ball(g, 0xf7fbff, [0, 0.05, 0], [0.6, 0.28, 0.5]);
    if (rng() < 0.4) cone(g, 0xbfe6ff, [0.15, 0.35, 0], [0.14, 0.7, 0.14]);
    return;
  }
  if (theme === 4) {
    // Pebbles.
    ball(g, [0xc98a5a, 0xb9784a, 0xd9a676][Math.floor(rng() * 3)], [0, 0.08, 0], [0.34, 0.22, 0.3]);
    ball(g, 0xd9a676, [0.42, 0.05, 0.1], [0.2, 0.14, 0.18]);
    return;
  }
  const col = [0xffe3a4, 0xf3c0c0, 0xfff6dc][Math.floor(rng() * 3)];
  for (let j = 0; j < 5; j++)
    ball(g, col, [Math.cos(j * 1.257) * 0.25, 0.12, Math.sin(j * 1.257) * 0.25], [0.2, 0.09, 0.2]);
  ball(g, 0xe9b650, [0, 0.15, 0], [0.14, 0.11, 0.14]);
}
// Clouds glow a little of their own colour, so that seen from below (they
// float above the track) they are bright, not grey.
const cloudMats = new Map();
function cloud(g, p, s = 1, colour = 0xfffbed) {
  if (!cloudMats.has(colour)) cloudMats.set(colour, new T.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.42, roughness: 1 }));
  const c = new T.Group(),
    m = compatibility ? colour : cloudMats.get(colour);
  c.position.set(...p);
  c.scale.setScalar(s);
  for (const [at, size] of [
    [[0, 0, 0], [4, 1.5, 1.8]],
    [[-1.4, 0.9, 0], [1.7, 1.8, 1.4]],
    [[1, 0.8, 0], [2.3, 2, 1.7]],
  ])
    ball(c, m, at, size).castShadow = false;
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
      if (!batches.has(key)) batches.set(key, { p: [], n: [], c: [], u: [], mat: plain ? batchMaterial(m.roughness) : m, plain, mapped: !plain && !!m.map, cast: false });
      const b = batches.get(key),
        source = o.geometry === sphere ? scenerySphere : o.geometry,
        geo = source.index ? source.toNonIndexed() : source.clone();
      geo.applyMatrix4(o.matrixWorld);
      b.cast ||= o.castShadow;
      b.p.push(geo.attributes.position.array);
      b.n.push(geo.attributes.normal.array);
      // Textured materials (the candy-cane arches) keep their UVs.
      if (b.mapped) b.u.push(geo.attributes.uv ? geo.attributes.uv.array : new Float32Array(geo.attributes.position.count * 2));
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
    if (b.mapped) geo.setAttribute("uv", new T.BufferAttribute(merge(b.u), 2));
    const mesh = new T.Mesh(geo, m);
    // Lights (neon rails, lanterns) and clouds cast no shadows, which also
    // keeps them out of the shadow pass.
    mesh.castShadow = b.cast && !m.isMeshBasicMaterial;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
// ---------------------------------------------------------------------------
// Atmosphere (v2.7)
// ---------------------------------------------------------------------------
// Each track has its own time of day — sky, sun, ambient light, haze, palette
// and colour grade — where v2.6 had three tints of one pale, hazy look:
// a clear summer noon, a golden-hour bay, and a neon night above the clouds.
// `sky` lists [elevation in degrees, colour] from below the horizon up;
// `fog` is [colour, near, far]; `sun.dir` points at the sun (or the moon);
// `hemi` is [sky colour, ground bounce, intensity]; `look` goes to the post
// chain (fx.js).
export const ATMOS = [
  {
    name: "noon",
    sky: [
      [-6, "#d9f1fb"],
      [0, "#cfecfa"],
      [7, "#a6d9f8"],
      [24, "#5fb0f2"],
      [70, "#2476dc"],
    ],
    fog: [0xc6e7f7, 170, 540],
    sun: { dir: [-0.5, 0.72, 0.48], colour: 0xfff0d0, intensity: 2.5 },
    hemi: [0xd4e9ff, 0x7dbf63, 1.2],
    disc: { colour: [1.9, 1.75, 1.3], size: 150 },
    cloud: ["#ffffff", "#c6e0f5", 26, 0xfffdf4],
    ranges: [0x5aa57a, 0x79b889, 0x4a9480],
    ground: 0x63b94b,
    verge: ["#6ec653", "#5db345"],
    shoulder: 0xcdc391,
    road: 0x566373,
    curb: 0xf07a5f,
    rail: [0xfff0d6, 0xe7c48e],
    water: 0x6cc4dc,
    hills: 0x7fc266,
    smoke: 0xffffff,
    look: { bloom: 0.5, threshold: 0.96, exposure: 1, saturation: 1.12, contrast: 0.2, vignette: 0.18, gain: [1, 1, 0.985], lift: [0, 0.004, 0.012] },
  },
  {
    name: "sunset",
    sky: [
      [-6, "#ffdcb2"],
      [0, "#ffd3a8"],
      [5, "#ffb9a8"],
      [14, "#f59bc0"],
      [32, "#a88ae0"],
      [70, "#5a6fd2"],
    ],
    fog: [0xffcdb0, 150, 500],
    sun: { dir: [-0.6, 0.33, 0.73], colour: 0xffb777, intensity: 2.45 },
    hemi: [0xf3b6e0, 0xffc89a, 1.1],
    disc: { colour: [2.5, 1.55, 0.8], size: 230 },
    cloud: ["#ffe9d2", "#ec8fb6", 22, 0xffe2d0],
    ranges: [0xe59ab8, 0xb78fd6, 0xf2b08a],
    ground: 0xf3c9a0,
    verge: ["#f8d5ae", "#f1c399"],
    shoulder: 0xfde6c9,
    road: 0x6c5180,
    curb: 0xf08fb6,
    rail: [0xfff1dc, 0xf3b6c9],
    water: 0x3fb5cf,
    hills: 0xf0b6a4,
    smoke: 0xffe9de,
    look: { bloom: 0.5, threshold: 1, exposure: 1, saturation: 1.1, contrast: 0.24, vignette: 0.24, gain: [1.02, 0.99, 0.97], lift: [0.012, 0, 0.018] },
  },
  {
    name: "night",
    sky: [
      [-6, "#3d2e80"],
      [0, "#372a7c"],
      [8, "#1f1f5e"],
      [26, "#0d1238"],
      [70, "#04061a"],
    ],
    fog: [0x2d2769, 120, 430],
    sun: { dir: [0.36, 0.74, 0.57], colour: 0xa8baff, intensity: 1.5 },
    hemi: [0x6a78d8, 0x2b2160, 1.05],
    disc: { colour: [1.25, 1.3, 1.5], size: 84, moon: true },
    cloud: ["#4a56a8", "#232a66", 12, 0x8f9bd8],
    ranges: [0x2c2f6b, 0x3b3480, 0x252a5c],
    ground: 0x34407a,
    verge: ["#3b4788", "#313c76"],
    shoulder: 0x4d5aa0,
    road: 0x2a3058,
    curb: 0x3a3f7c,
    rail: [0x8f9fe0, 0x6f7fc4],
    water: 0x1c2452,
    hills: 0x46558c,
    smoke: 0x5a64ad, // smoke is unlit: at night it takes the night's colour
    // (The threshold sits above anything the moon lights: the neon glows,
    // white karts and drivers do not.)
    look: { bloom: 0.85, threshold: 0.95, exposure: 1.05, saturation: 1.15, contrast: 0.24, vignette: 0.3, gain: [0.98, 0.99, 1.04], lift: [0.008, 0, 0.024] },
  },
  // v2.8: a crisp snowy morning under a deep blue sky.
  {
    name: "snow",
    sky: [
      [-6, "#eef6fd"],
      [0, "#e4f1fc"],
      [6, "#cbe4fa"],
      [22, "#8cc2f2"],
      [70, "#3f86de"],
    ],
    fog: [0xdeebf8, 160, 520],
    sun: { dir: [-0.42, 0.5, 0.64], colour: 0xfff1e2, intensity: 2.1 },
    hemi: [0xd4e6ff, 0xaec4da, 1.15],
    disc: { colour: [2, 1.9, 1.7], size: 160 },
    cloud: ["#ffffff", "#cddff1", 20, 0xffffff],
    ranges: [0x8ea8c6, 0x7d98ba, 0xa6bcd6],
    ground: 0xe3ecf6,
    verge: ["#eef5fd", "#dce8f5"],
    shoulder: 0xd2e0ee,
    road: 0x505d75,
    curb: 0x3d8fe0,
    rail: [0xffffff, 0x8db7e2],
    water: 0xb7dcef, // a frozen lake
    hills: 0xe9f1fa,
    smoke: 0xffffff,
    // (White snow in full sun sits near 1: the threshold is above it, so
    // only lights and boosts glow.)
    look: { bloom: 0.4, threshold: 1.08, exposure: 0.96, saturation: 1.1, contrast: 0.22, vignette: 0.2, gain: [0.98, 1, 1.03], lift: [0, 0.006, 0.018] },
  },
  // v2.8: a golden afternoon in the desert, red mesas on the horizon.
  {
    name: "desert",
    sky: [
      [-6, "#f6dab0"],
      [0, "#f3d4a6"],
      [6, "#ecd7b4"],
      [20, "#9ccae6"],
      [70, "#3a8ad4"],
    ],
    fog: [0xeed4a8, 170, 560],
    sun: { dir: [0.46, 0.6, 0.55], colour: 0xffe0b2, intensity: 2.5 },
    hemi: [0xcfe0ef, 0xd49a60, 1.12],
    disc: { colour: [2.3, 1.95, 1.4], size: 190 },
    cloud: ["#fff6ea", "#efd0ad", 8, 0xfff2e4],
    ranges: [0xc4653a, 0xd5854c, 0xb25632],
    ground: 0xe3bd84,
    verge: ["#ecca92", "#e1bd80"],
    shoulder: 0xefd7a6,
    road: 0x675244,
    curb: 0xdc5236,
    rail: [0xfff0d8, 0xc7884f],
    water: 0x2aaea6, // the oasis
    hills: 0xe5b97a,
    smoke: 0xf2d9b0, // dust
    look: { bloom: 0.45, threshold: 1, exposure: 1, saturation: 1.14, contrast: 0.22, vignette: 0.22, gain: [1.03, 1, 0.95], lift: [0.012, 0.004, 0] },
  },
];
const smooth = (a, b, x) => {
  const t = clampN((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function paintTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
// Textures and materials made per track are kept for the session (v2.6 made
// a new road texture for every race and never freed it).
const worldCache = new Map();
// (Flagged, so the game never frees them when a race is cleared up.)
const cached = (key, make) => {
  if (!worldCache.has(key)) {
    const made = make();
    if (made?.userData) made.userData.cached = true;
    worldCache.set(key, made);
  }
  return worldCache.get(key);
};
// Unlit and brighter than white: reads as a light source, and glows when the
// post chain's bloom is on.
function neon(hex, k = 1.7) {
  return cached("neon" + hex + ":" + k, () => new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(k) }));
}
const glowSprite = () =>
  cached("glowSprite", () =>
    paintTexture(64, 64, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.55)");
      g.addColorStop(0.6, "rgba(255,255,255,0.12)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    }),
  );
// Asphalt: fine grain, a darker racing line and edge lines, in the track's
// road colour; v repeats every 8 m along the road. On the night track the
// edge lines are lit.
function roadMaterial(theme) {
  return cached("road" + theme + compatibility, () => {
    const base = new T.Color(ATMOS[theme].road),
      edges = (ctx, w, h, colour) => {
        ctx.fillStyle = colour;
        ctx.fillRect(0.035 * w, 0, 0.022 * w, h);
        ctx.fillRect(0.943 * w, 0, 0.022 * w, h);
      },
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
        edges(ctx, w, h, theme === 2 ? "#c8f6ff" : "#fffaf0");
      });
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.anisotropy = 4;
    const m = new T.MeshStandardMaterial({ map: tex, roughness: theme === 2 ? 0.6 : 0.86, metalness: 0 });
    if (theme === 2 && !compatibility) {
      const lit = paintTexture(128, 8, (ctx, w, h) => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        edges(ctx, w, h, "#fff");
      });
      lit.wrapT = T.RepeatWrapping;
      m.emissiveMap = lit;
      m.emissive = new T.Color(0x49dcff);
      m.emissiveIntensity = 1.8;
    }
    return m;
  });
}
// The ground: the track's colour, mottled so that it does not read as one
// flat fill (tiles every ~23 m).
function groundMaterial(theme) {
  const a = ATMOS[theme];
  if (compatibility) return mat(a.ground);
  return cached("ground" + theme, () => {
    const tex = paintTexture(256, 256, (ctx, w, h) => {
      const rng = seeded(610 + theme);
      ctx.fillStyle = "#" + new T.Color(a.ground).getHexString();
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = rng() * w,
          y = rng() * h,
          r = 14 + rng() * 34,
          tone = rng() < 0.5 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
        // (Drawn again one tile over, so the pattern wraps without seams.)
        for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, tone);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
        ctx.fillRect(rng() * w, rng() * h, 1.5, 1.5 + rng() * 2);
      }
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(28, 28);
    tex.anisotropy = 4;
    return new T.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  });
}
// The strip either side of the road: mown in bands across the track (lawn,
// raked sand, or cloud), which also makes speed easier to read.
function vergeMaterial(theme) {
  const a = ATMOS[theme];
  if (compatibility) return mat(new T.Color(a.verge[0]).getHex());
  return cached("verge" + theme, () => {
    const tex = paintTexture(64, 128, (ctx, w, h) => {
      const rng = seeded(640 + theme);
      ctx.fillStyle = a.verge[0];
      ctx.fillRect(0, 0, w, h / 2);
      ctx.fillStyle = a.verge[1];
      ctx.fillRect(0, h / 2, w, h / 2);
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(rng() * w, rng() * h, 1.5, 1 + rng() * 2);
      }
    });
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(1, 0.5); // one light and one dark band every 16 m
    tex.anisotropy = 4;
    return new T.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  });
}
// Three rows of flowers, one colour each, laid along the track like a tulip
// field (one ribbon and one texture for the three).
function flowerRows(hues) {
  return cached("flowers" + hues.join(), () => {
    const tex = paintTexture(192, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      hues.forEach((hex, row) => {
        const rng = seeded(hex % 977),
          petal = "#" + new T.Color(hex).getHexString(),
          light = "#" + new T.Color(hex).lerp(new T.Color(0xffffff), 0.45).getHexString();
        for (let i = 0; i < 7; i++) {
          const x = row * 64 + 12 + rng() * 40,
            y = 6 + ((i * 9 + rng() * 5) % 52),
            r = 4.6 + rng() * 2.2;
          ctx.fillStyle = "#3f9440";
          ctx.fillRect(x - r * 1.2, y + r * 0.5, r * 2.4, 2.2);
          ctx.fillStyle = petal;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 7);
          ctx.fill();
          ctx.fillStyle = light;
          ctx.beginPath();
          ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.45, 0, 7);
          ctx.fill();
        }
      });
    });
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(1, 4); // a 2 m tile along the track
    return new T.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.8 });
  });
}
// Painted sky, wrapped on a dome that follows the camera: the gradient,
// stylised clouds, and at night stars, a band of milky way and an aurora.
// It covers elevations SKY_LOW..SKY_HIGH; above that the top colour repeats.
const SKY_W = 4096,
  SKY_H = 800,
  SKY_LOW = -6,
  SKY_HIGH = 70;
const skyY = (deg) => SKY_H * (1 - (deg - SKY_LOW) / (SKY_HIGH - SKY_LOW));
function paintCloud(ctx, x, base, w, h, light, shade, rng) {
  const n = 4 + Math.floor(rng() * 4),
    lobes = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n,
      r = h * (0.5 + 0.62 * Math.sin(t * Math.PI)) * (0.75 + rng() * 0.4);
    lobes.push([(t - 0.5) * w * 0.9, r]);
  }
  for (const shift of [0, SKY_W, -SKY_W]) {
    if (x + shift + w < 0 || x + shift - w > SKY_W) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + shift - w, base - h * 2.4, w * 2, h * 2.4); // flat underside
    ctx.clip();
    const g = ctx.createLinearGradient(0, base - h * 1.5, 0, base);
    g.addColorStop(0, light);
    g.addColorStop(1, shade);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (const [dx, r] of lobes) {
      ctx.moveTo(x + shift + dx + r * 1.25, base - r * 0.35);
      ctx.ellipse(x + shift + dx, base - r * 0.35, r * 1.25, r, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}
function paintNight(ctx, W, H, rng) {
  ctx.globalCompositeOperation = "lighter";
  // Milky way: a tilted band of faint dust.
  for (let i = 0; i < 260; i++) {
    const t = rng(),
      x = t * W,
      y = skyY(34 + Math.sin(t * Math.PI * 2 + 0.6) * 18 + (rng() - 0.5) * 16),
      r = 30 + rng() * 80,
      g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rng() < 0.5 ? "rgba(120,140,255,0.05)" : "rgba(200,140,255,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    // (Also one sky-width over, so the band has no seam where the texture
    // wraps round.)
    for (const shift of [0, W, -W]) {
      ctx.setTransform(1, 0, 0, 1, shift, 0);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // Aurora: curtains of light low in the sky, teal at the foot fading to
  // violet above.
  for (const [phase, lift, alpha] of [
    [0.4, 13, 0.34],
    [2.3, 20, 0.24],
    [4.4, 9, 0.2],
  ])
    for (let x = 0; x < W; x += 5) {
      const u = (x / W) * Math.PI * 2,
        // (Whole numbers of waves round the sky, so it meets itself.)
        on = Math.max(0, Math.sin(u * 2 + phase) * 0.7 + Math.sin(u * 4 + phase * 2) * 0.3);
      if (on < 0.05) continue;
      const foot = skyY(lift + Math.sin(u * 3 + phase) * 3.5 + Math.sin(u * 11 + phase) * 0.8),
        tall = (110 + 90 * Math.sin(u * 7 + phase * 3)) * (0.6 + on * 0.6),
        g = ctx.createLinearGradient(0, foot, 0, foot - tall),
        a = alpha * on * (0.75 + 0.25 * Math.sin(x * 0.9));
      g.addColorStop(0, "rgba(60,255,200," + a.toFixed(3) + ")");
      g.addColorStop(0.35, "rgba(80,200,255," + (a * 0.6).toFixed(3) + ")");
      g.addColorStop(1, "rgba(190,90,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, foot - tall, 6, tall);
    }
  // Stars: many faint, a few bright with a soft glow and a cross flare.
  for (let i = 0; i < 2600; i++) {
    const y = Math.pow(rng(), 1.4) * skyY(1),
      s = 0.7 + rng() * 1.5;
    ctx.fillStyle = "rgba(" + (rng() < 0.3 ? "190,210,255" : "255,246,224") + "," + (0.25 + rng() * 0.7).toFixed(2) + ")";
    ctx.fillRect(rng() * W, y, s, s);
  }
  for (let i = 0; i < 46; i++) {
    const x = rng() * W,
      y = rng() * skyY(8),
      r = 5 + rng() * 8,
      g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.25, "rgba(200,220,255,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(x - r * 1.3, y - 0.5, r * 2.6, 1);
    ctx.fillRect(x - 0.5, y - r * 1.3, 1, r * 2.6);
  }
  ctx.globalCompositeOperation = "source-over";
}
function skyTexture(theme) {
  // One sky at a time: a 4096 x 800 texture is 13 MB, so the last track's is
  // freed when another track's is painted.
  for (const [key, tex] of worldCache)
    if (key.startsWith("sky") && key !== "sky" + theme) {
      tex.dispose();
      worldCache.delete(key);
    }
  return cached("sky" + theme, () => {
    const a = ATMOS[theme],
      rng = seeded(1200 + theme),
      tex = paintTexture(SKY_W, SKY_H, (ctx, W, H) => {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        for (const [deg, col] of a.sky) g.addColorStop(clampN(skyY(deg) / H, 0, 1), col);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        if (theme === 2) paintNight(ctx, W, H, rng);
        // Clouds: far rows small and low, nearer ones bigger and higher.
        const [light, shade, count] = a.cloud;
        ctx.globalAlpha = theme === 2 ? 0.55 : 0.96;
        for (let i = 0; i < count; i++) {
          const near = rng(),
            deg = 2.5 + near * near * 30 + rng() * 3,
            w = 120 + near * 380 + rng() * 80;
          paintCloud(ctx, rng() * W, skyY(deg), w, w * (0.2 + rng() * 0.1), light, shade, rng);
        }
        ctx.globalAlpha = 1;
        // Haze: the horizon colour laid softly over the lowest clouds.
        const haze = ctx.createLinearGradient(0, skyY(7), 0, skyY(0));
        haze.addColorStop(0, "rgba(255,255,255,0)");
        haze.addColorStop(1, a.sky[1][1]);
        ctx.fillStyle = haze;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(0, skyY(7), W, H - skyY(7));
        ctx.globalAlpha = 1;
      });
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.ClampToEdgeWrapping;
    // Sphere uv.y is 0.5 + elevation / 180°; map SKY_LOW..SKY_HIGH to 0..1.
    tex.repeat.set(1, 180 / (SKY_HIGH - SKY_LOW));
    tex.offset.set(0, -(90 + SKY_LOW) / (SKY_HIGH - SKY_LOW));
    tex.generateMipmaps = false;
    tex.minFilter = T.LinearFilter;
    return tex;
  });
}
// The sun: a small hot core in a wide soft halo. The moon: a pale disc with
// a few craters, and a halo of its own.
function discTexture(moon) {
  return cached("disc" + moon, () =>
    paintTexture(256, 256, (ctx, w) => {
      const c = w / 2,
        g = ctx.createRadialGradient(c, c, 0, c, c, c);
      if (moon) {
        g.addColorStop(0, "rgba(190,205,255,0.5)");
        g.addColorStop(0.4, "rgba(150,170,255,0.16)");
        g.addColorStop(1, "rgba(120,140,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
        const d = ctx.createRadialGradient(c - 10, c - 12, 4, c, c, 46);
        d.addColorStop(0, "#ffffff");
        d.addColorStop(1, "#cfd8ff");
        ctx.fillStyle = d;
        ctx.beginPath();
        ctx.arc(c, c, 44, 0, 7);
        ctx.fill();
        ctx.fillStyle = "rgba(150,165,225,0.5)";
        for (const [x, y, r] of [[-14, -8, 9], [12, 10, 12], [16, -18, 5], [-8, 20, 6], [-24, 8, 4]]) {
          ctx.beginPath();
          ctx.arc(c + x, c + y, r, 0, 7);
          ctx.fill();
        }
      } else {
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.09, "rgba(255,255,255,1)");
        g.addColorStop(0.16, "rgba(255,255,255,0.5)");
        g.addColorStop(0.4, "rgba(255,255,255,0.14)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
      }
    }),
  );
}
function skyDome(theme) {
  const a = ATMOS[theme];
  if (compatibility) return flatSky(theme, new T.Color(a.sky[1][1]).getHex());
  const dome = new T.Mesh(
    new T.SphereGeometry(560, 48, 24),
    new T.MeshBasicMaterial({ map: skyTexture(theme), side: T.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -10;
  const disc = new T.Sprite(
    new T.SpriteMaterial({
      map: discTexture(!!a.disc.moon),
      color: new T.Color(...a.disc.colour),
      blending: a.disc.moon ? T.NormalBlending : T.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  disc.position.set(...a.sun.dir).normalize().multiplyScalar(520);
  disc.scale.setScalar(a.disc.size);
  disc.renderOrder = -8;
  dome.add(disc);
  return dome;
}
// Vertex-coloured gradient dome, for the compatibility renderer.
function flatSky(theme, horizonHex) {
  const top = [0x2476dc, 0x5a6fd2, 0x070a24, 0x3f86de, 0x3a8ad4][theme],
    horizon = new T.Color(horizonHex),
    zenith = new T.Color(top),
    geo = new T.SphereGeometry(560, 32, 16),
    colors = [],
    p = geo.attributes.position,
    c = new T.Color(),
    v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    c.copy(horizon).lerp(zenith, Math.pow(Math.max(0, v.y), 0.55));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const dome = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10;
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
    palettes = ATMOS[theme].ranges;
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
        mesa = theme === 4,
        h = mesa ? 26 + rng() * 44 : (theme === 1 ? 40 : 70) + rng() * (theme === 1 ? 40 : 90) + (theme === 3 ? 30 : 0),
        w = (mesa ? 50 : 60) + rng() * 70,
        col = new T.Color(palettes[Math.floor(rng() * 3)]).lerp(horizon, 0.3 + ring * 0.28);
      col.setHex(col.getHex()); // quantise so materials can be shared
      // Hills by the bay, flat-topped mesas in the desert, peaks elsewhere.
      const geo =
        theme === 1
          ? new T.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
          : mesa
            ? new T.CylinderGeometry(0.82, 1, 1, 7)
            : new T.ConeGeometry(1, 1, 6 + Math.floor(rng() * 3));
      const m = new T.Mesh(geo, matFor(col));
      m.position.set(cx + Math.cos(a) * r, theme === 1 ? -6 : h / 2 - 8, cz + Math.sin(a) * r);
      m.scale.set(w, theme === 1 ? h : h, w * (0.7 + rng() * 0.5));
      m.rotation.y = rng() * Math.PI;
      g.add(m);
      if (mesa) {
        // A paler band of rock near the top.
        const band = new T.Mesh(new T.CylinderGeometry(0.835, 0.86, 1, 7), matFor(new T.Color(0xe9b07a).lerp(horizon, 0.3 + ring * 0.28)));
        band.position.copy(m.position);
        band.position.y += h * 0.3;
        band.scale.set(w, h * 0.12, m.scale.z);
        band.rotation.y = m.rotation.y;
        g.add(band);
      }
      if ((theme === 0 && h > 120) || theme === 3) {
        // Snow caps on the tallest peaks.
        const cap = new T.Mesh(new T.ConeGeometry(1, 1, m.geometry.parameters.radialSegments), matFor(new T.Color(0xf6fbff).lerp(horizon, 0.2)));
        cap.position.copy(m.position);
        cap.position.y += h * 0.32;
        // (A little wider than the peak under it: the same slope would be
        // coplanar with it and flicker, as v2.6's caps did.)
        cap.scale.set(w * 0.395, h * 0.36, m.scale.z * 0.395);
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
  const wood = theme === 2 ? 0x7d86c4 : theme === 3 ? 0xdfe9f4 : 0xf2e2c4,
    trim = theme === 2 ? 0xb8c2ff : theme === 1 ? 0xf09cbc : theme === 3 ? 0x3d8fe0 : theme === 4 ? 0xd9673f : 0xe8a35f;
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
// An arch over the road, one kind per track: a flower arch, a candy cane, or
// a neon hoop. Driving through them every few seconds gives the eye
// something to judge speed by.
function gate(theme, width, index) {
  const g = new T.Group(),
    R = width / 2 + 1.9,
    arch = (radius, tube, material) => {
      const m = new T.Mesh(new T.TorusGeometry(radius, tube, 10, 44, Math.PI), material);
      m.castShadow = true;
      g.add(m);
      return m;
    };
  if (theme === 0) {
    arch(R, 0.34, mat(0x4f9d54));
    const petals = [0xff6f7d, 0xffd447, 0xff9fd0, 0xffffff, 0xb48cff, 0xff9c45];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      ball(g, petals[(i + index) % petals.length], [Math.cos(a) * R, Math.sin(a) * R, i % 2 ? 0.22 : -0.22], [0.62, 0.62, 0.62]);
    }
  } else if (theme === 1) {
    const stripes = cached("cane", () => {
      const tex = paintTexture(64, 64, (ctx, w, h) => {
        ctx.fillStyle = "#fffaf2";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f2557f";
        for (let k = -1; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(k * 32, 0);
          ctx.lineTo(k * 32 + 16, 0);
          ctx.lineTo(k * 32 + 16 + 64, h);
          ctx.lineTo(k * 32 + 64, h);
          ctx.fill();
        }
      });
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(9, 1);
      return compatibility ? mat(0xf7a3b8) : new T.MeshStandardMaterial({ map: tex, roughness: 0.35 });
    });
    arch(R, 0.5, stripes);
    for (const s of [-1, 1]) ball(g, [0xffd36e, 0x9ee6d4][(index + (s > 0 ? 1 : 0)) % 2], [s * R, 0.7, 0], [1.1, 1.1, 1.1]);
  } else if (theme === 3) {
    // Ice: a glassy arch crowned with crystals.
    const ice = compatibility ? mat(0xbfe6ff) : cached("iceArch", () => new T.MeshStandardMaterial({ color: 0xc4ecff, emissive: 0x2f7fb0, emissiveIntensity: 0.25, roughness: 0.12, metalness: 0.05 }));
    arch(R, 0.42, ice);
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      const shard = cone(g, ice, [Math.cos(a) * (R + 0.55), Math.sin(a) * (R + 0.55), 0], [0.28, 1.3 + ((i + index) % 3) * 0.35, 0.28]);
      shard.rotation.z = a - Math.PI / 2;
    }
  } else if (theme === 4) {
    // Sandstone arch, with pennants on top.
    arch(R, 0.62, mat(0xcf8a55, 0.95));
    arch(R + 0.5, 0.18, mat(0xe8b47e, 0.95)).position.z = 0.3;
    const pennant = [0xdc5236, 0x2aaea6, 0xf3c24b];
    for (let i = 1; i < 6; i++) {
      const a = (i / 6) * Math.PI,
        f = cone(g, pennant[(i + index) % 3], [Math.cos(a) * (R + 1.2), Math.sin(a) * (R + 1.2), 0], [0.26, 0.9, 0.06]);
      f.rotation.z = a - Math.PI / 2;
    }
  } else {
    const colour = [0x4de3ff, 0xff5fd0, 0xffd95e][index % 3];
    // (Kept modest: the kart passes right under these, where a brighter
    // tube would flood the top of the screen with glow.)
    arch(R, 0.2, neon(colour, 1.45));
    arch(R + 0.75, 0.07, neon(colour, 1.15)).position.z = -0.5;
    arch(R - 0.7, 0.07, neon(0xffffff, 1.05)).position.z = 0.5;
  }
  return g;
}
// A boost pad: an orange plate with chevrons of light running forward.
let padArrows = null;
export function boostPad() {
  const g = new T.Group();
  if (compatibility) {
    box(g, 0xeeb967, [0, 0, 0], [4.8, 0.04, 7]);
    for (let j = 0; j < 3; j++)
      for (const s of [-1, 1]) box(g, 0xfff2b0, [s * 0.7, 0.03, (j - 1) * 1.7], [1.9, 0.025, 0.25]).rotation.y = s * 0.5;
    return g;
  }
  if (!padArrows) {
    padArrows = paintTexture(128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 17;
      for (const y of [-32, 32, 96, 160]) {
        ctx.beginPath();
        ctx.moveTo(10, y + 24);
        ctx.lineTo(64, y - 24);
        ctx.lineTo(118, y + 24);
        ctx.stroke();
      }
    });
    padArrows.wrapT = T.RepeatWrapping;
    padArrows.repeat.set(1, 2);
  }
  const plane = cached("padGeo", () => {
      const p = new T.PlaneGeometry(4.8, 7);
      p.rotateX(-Math.PI / 2);
      p.rotateY(Math.PI); // texture "up" runs forward (+z)
      p.userData.shared = true;
      return p;
    }),
    base = new T.Mesh(plane, cached("padBase", () => new T.MeshBasicMaterial({ color: new T.Color(0xff8a1f).multiplyScalar(1.05), transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }))),
    arrows = new T.Mesh(
      plane,
      cached("padArrows", () => new T.MeshBasicMaterial({ map: padArrows, color: new T.Color(0xfff0a0).multiplyScalar(1.7), transparent: true, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })),
    );
  base.renderOrder = 1;
  arrows.renderOrder = 2;
  arrows.position.y = 0.012;
  g.add(base, arrows);
  return g;
}
// Things in the world that move on their own (the pads' running lights).
export function updateWorldFx(t) {
  if (padArrows) padArrows.offset.y = -((t * 1.25) % 1);
}
// Falling snow, or sand blowing across the desert (v2.8): points in a box
// that follows the camera, moved and wrapped round entirely on the GPU, so
// it costs one draw call and no work per frame beyond three uniforms.
const WEATHER_VERT = `
uniform float time; uniform vec3 centre; uniform vec3 box; uniform float size; uniform float scale; uniform vec3 wind;
attribute vec4 seed;
varying float vAlpha;
void main(){
  vec3 p = seed.xyz * box + wind * time;
  p.x += sin(time * 0.9 + seed.w * 6.283) * 0.7;
  p.z += cos(time * 0.7 + seed.w * 6.283) * 0.7;
  p = mod(p - centre, box) - box * 0.5 + centre; // wrapped round the camera
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  gl_PointSize = size * (0.55 + seed.w * 0.9) * scale / max(d, 0.5);
  // Fade out right at the lens and towards the edge of the box.
  vAlpha = smoothstep(0.6, 3.0, d) * (1.0 - smoothstep(box.z * 0.32, box.z * 0.48, d));
}`;
const WEATHER_FRAG = `
uniform vec3 colour; uniform float opacity;
varying float vAlpha;
void main(){
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.12, r) * vAlpha * opacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(colour, a);
}`;
export function weather(kind) {
  if (compatibility) return null;
  const snow = kind === "snow",
    n = snow ? 900 : 560,
    rng = seeded(snow ? 71 : 72),
    seeds = new Float32Array(n * 4),
    geo = new T.BufferGeometry();
  for (let i = 0; i < seeds.length; i++) seeds[i] = rng();
  geo.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 3), 3)); // (placed by the shader)
  geo.setAttribute("seed", new T.BufferAttribute(seeds, 4));
  const uniforms = {
    time: { value: 0 },
    centre: { value: new T.Vector3() },
    box: { value: new T.Vector3(70, 34, 70) },
    size: { value: snow ? 0.17 : 0.1 },
    scale: { value: 800 },
    wind: { value: snow ? new T.Vector3(1.1, -2.4, 0.6) : new T.Vector3(7.5, -0.3, 2.2) },
    colour: { value: new T.Color(snow ? 0xffffff : 0xf8e2b8) },
    opacity: { value: snow ? 0.92 : 0.38 },
  };
  const mesh = new T.Points(geo, new T.ShaderMaterial({ vertexShader: WEATHER_VERT, fragmentShader: WEATHER_FRAG, uniforms, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return {
    mesh,
    type: "weather",
    // `pixels`: drawing-buffer pixels per unit of point size at 1 m.
    update(camera, t, pixels) {
      uniforms.time.value = t;
      uniforms.centre.value.copy(camera.position);
      uniforms.scale.value = pixels;
    },
  };
}
// The widest open spot inside a lap (for a lake or an oasis): the point of
// the track's bounding box furthest from the road, if it is far enough.
function infield(track) {
  const pts = track.points.filter((_, i) => i % 6 === 0),
    xs = pts.map((p) => p.x),
    zs = pts.map((p) => p.z);
  let best = null;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 6)
    for (let z = Math.min(...zs); z <= Math.max(...zs); z += 6) {
      let d = Infinity;
      for (const p of pts) d = Math.min(d, (x - p.x) ** 2 + (z - p.z) ** 2);
      d = Math.sqrt(d);
      // Inside the lap: a ray to +x crosses the centre line an odd number of times.
      let crossings = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          b = pts[(i + 1) % pts.length];
        if (a.z > z !== b.z > z && x < a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x)) crossings++;
      }
      if (crossings % 2 && (!best || d > best.d)) best = { x, z, d };
    }
  return best && best.d > 38 ? { x: best.x, z: best.z, r: Math.min(46, best.d - 18) } : null;
}
export function createWorld(track) {
  const g = new T.Group(),
    decor = new T.Group(),
    moving = [],
    theme = track.config.theme ?? track.index,
    c = track.config,
    a = ATMOS[theme],
    rng = seeded(9812 + theme);
  g.add(ribbon(track, 0, c.width + 24, vergeMaterial(theme), -0.03));
  g.add(ribbon(track, 0, c.width, roadMaterial(theme), 0.04));
  g.add(ribbon(track, 0, c.width + 2.8, a.curb, 0.02));
  g.add(ribbon(track, 0, c.width + 6, a.shoulder, 0));
  if (theme === 0 && !compatibility) {
    // Tulip-field rows either side of the road.
    for (const side of [-1, 1])
      g.add(ribbon(track, side * (c.width / 2 + 7.7), 6.6, flowerRows(side > 0 ? [0xff5a66, 0xffd23f, 0xa779ff] : [0xff8fc7, 0xffffff, 0xff9838]), 0.02));
  }
  const terrainGeo = new T.PlaneGeometry(650, 650, 80, 80);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(65, 0, 0);
  const groundPoints = track.points.filter((_, i) => i % 8 === 0),
    pos = terrainGeo.attributes.position,
    // A frozen lake (snow) or an oasis (desert) in the infield.
    lake = theme === 3 || theme === 4 ? infield(track) : null;
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
    const dist = Math.sqrt(nearest),
      mix = Math.exp(-Math.max(0, dist - 15) / 28),
      // The candy coast is a strip of land in a bay: away from the road the
      // ground runs down under the sea.
      sink = theme === 1 ? smooth(38, 100, dist) * 4.6 : 0,
      // Snow: a valley, the slopes rising away from the road. Desert: dunes.
      rise = theme === 3 ? smooth(45, 170, dist) * 26 : 0,
      dunes = theme === 4 ? (Math.sin(x * 0.045 + z * 0.012) * 2.2 + Math.sin(z * 0.06 - x * 0.02) * 1.4 + 1.2) * smooth(26, 70, dist) : 0,
      pond = lake ? smooth(lake.r, lake.r * 0.45, Math.hypot(x - lake.x, z - lake.z)) * 4.4 : 0;
    pos.setY(i, (height - 0.45) * mix + (-1.4 - sink + rise + dunes - pond + Math.sin(x * 0.027) * Math.cos(z * 0.023) * 1.3) * (1 - mix));
  }
  terrainGeo.computeVertexNormals();
  const terrain = new T.Mesh(terrainGeo, groundMaterial(theme));
  terrain.receiveShadow = true;
  g.add(terrain);
  const railMat = theme === 2 && !compatibility ? neon(0x4de3ff, 1.5) : a.rail[0];
  for (let i = 0; i < 230; i++)
    for (const side of [-1, 1]) {
      const p0 = track.sample((i / 230) * track.length, side * (c.width / 2 + 2.2)).p,
        p1 = track.sample(((i + 1) / 230) * track.length, side * (c.width / 2 + 2.2)).p,
        d = p1.clone().sub(p0),
        mid = p0.clone().add(p1).multiplyScalar(0.5);
      const rail = box(decor, railMat, [mid.x, mid.y + 0.67, mid.z], [theme === 2 ? 0.16 : 0.26, theme === 2 ? 0.16 : 0.34, d.length() + 0.08]);
      rail.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d.normalize());
      if (i % 3 === 0) box(decor, a.rail[1], [p0.x, p0.y + 0.43, p0.z], [0.38, 0.86, 0.38]);
    }
  const water = new T.Mesh(
    new T.PlaneGeometry(4000, 4000),
    compatibility ? mat(a.water) : cached("water" + theme, () => new T.MeshStandardMaterial({ color: a.water, roughness: 0.16, metalness: 0.1 })),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -3;
  water.receiveShadow = true;
  g.add(water);
  // Kerbs: on the night track every other block is lit.
  const kerbLit = theme === 2 && !compatibility ? neon(0xff5fd0, 1.5) : null;
  for (let i = 0; i < 260; i++) {
    const d = (i / 260) * track.length;
    for (const side of [-1, 1]) {
      const s = track.sample(d, side * (c.width / 2 + 0.55));
      const curb = box(decor, i % 2 ? (kerbLit ?? 0xfff6e4) : a.curb, [s.p.x, s.p.y + 0.1, s.p.z], [1.05, 0.18, (track.length / 260) * 0.99]);
      curb.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
    }
  }
  const dashMat = theme === 2 && !compatibility ? neon(0xfff0a8, 1.5) : theme === 1 ? 0xfff0dc : 0xeee6cf;
  for (let i = 0; i < 70; i++) {
    const s = track.sample((i / 70) * track.length);
    const dash = box(decor, dashMat, [s.p.x, s.p.y + 0.065, s.p.z], [0.17, 0.025, 2.4]);
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
        flower(fl, rng, theme);
        decor.add(fl);
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const s = track.sample((i / 18) * track.length, (i % 2 ? 1 : -1) * (35 + rng() * 45));
    ball(decor, a.hills, [s.p.x, 1, s.p.z], [11 + rng() * 13, 8 + rng() * 12, 13 + rng() * 10]);
  }
  for (let i = 0; i < (theme === 2 ? 0 : 14); i++) cloud(decor, [rng() * 500 - 180, 45 + rng() * 50, rng() * 500 - 250], 1 + rng() * 2, a.cloud[3]);
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
    } else if (theme === 3) {
      // A great snowflake on a pole, turning slowly.
      cyl(w, 0xdfe9f4, [0, 4, 0], [0.3, 8, 0.3]);
      const flake = new T.Group();
      flake.position.y = 9.2;
      w.add(flake);
      const ice = mat(0xeaf6ff, 0.25);
      for (let k = 0; k < 6; k++) {
        const arm = new T.Group();
        arm.rotation.z = (k * Math.PI) / 3;
        flake.add(arm);
        box(arm, ice, [0, 1.5, 0], [0.32, 3, 0.18]);
        for (const y of [1.3, 2.2])
          for (const sd of [-1, 1]) box(arm, ice, [sd * 0.38, y + 0.3, 0], [0.16, 0.9, 0.14]).rotation.z = sd * 0.75;
      }
      moving.push({ mesh: flake, type: "halo" });
    } else if (theme === 4) {
      // A windpump: lattice tower, a bladed wheel turning in the wind.
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = box(w, 0x8a6a4a, [sx * 0.8, 4, sz * 0.8], [0.16, 8.2, 0.16]);
        leg.rotation.set(sz * 0.08, 0, -sx * 0.08);
      }
      for (const y of [2.5, 5]) box(w, 0x8a6a4a, [0, y, 0], [1.9 - y * 0.12, 0.12, 1.9 - y * 0.12]);
      const wheel = new T.Group();
      wheel.position.set(0, 8.6, 0.9);
      w.add(wheel);
      for (let k = 0; k < 12; k++) {
        const blade = new T.Group();
        blade.rotation.z = (k / 12) * Math.PI * 2;
        wheel.add(blade);
        box(blade, k % 2 ? 0xf2e6d0 : 0xdc5236, [0, 1.35, 0], [0.42, 1.5, 0.05]).rotation.y = 0.35;
      }
      ball(wheel, 0x6b5442, [0, 0, 0.05], [0.3, 0.3, 0.3]);
      box(w, 0xf2e6d0, [0, 8.6, -1.2], [0.08, 0.9, 1.6]);
      moving.push({ mesh: wheel, type: "mill" });
    } else {
      const hoop = new T.Mesh(new T.TorusGeometry(3, 0.2, 8, 40), neon(0xffdc8d, 1.6));
      hoop.position.y = 6;
      w.add(hoop);
      moving.push({ mesh: hoop, type: "halo" });
    }
  }
  // Arches over the road around the lap.
  [0.13, 0.27, 0.41, 0.55, 0.69, 0.83, 0.93].forEach((f, i) => {
    const s = track.sample(f * track.length),
      arch = gate(theme, c.width, i);
    arch.position.copy(s.p);
    arch.position.y -= 0.3;
    arch.rotation.set(0, s.yaw, 0);
    decor.add(arch);
  });
  // Trackside lights (dusk and night): lanterns on posts, each with a halo.
  if (theme === 1 || theme === 2) {
    const halos = [],
      bulbs = theme === 1 ? [neon(0xffc66e, 1.9)] : [neon(0x4de3ff, 1.9), neon(0xff5fd0, 1.9)],
      post = theme === 1 ? 0xfff3df : 0x5560a8;
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? 1 : -1,
        s = track.sample(((i + 0.5) / 40) * track.length, side * (c.width / 2 + 3.3)),
        lamp = new T.Group();
      lamp.position.copy(s.p);
      lamp.rotation.y = s.yaw;
      cyl(lamp, post, [0, 2.3, 0], [0.09, 4.6, 0.09]);
      box(lamp, post, [side * 0.55, 4.5, 0], [1.1, 0.09, 0.09]);
      const bulb = ball(lamp, bulbs[i % bulbs.length], [side * 1.05, 4.2, 0], [0.34, 0.42, 0.34]);
      bulb.castShadow = false;
      decor.add(lamp);
      lamp.updateMatrixWorld(true);
      halos.push(...bulb.getWorldPosition(new T.Vector3()).toArray());
    }
    if (!compatibility) {
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(halos, 3));
      const pts = new T.Points(
        geo,
        // (Small and faint: a large halo right beside the camera, on the
        // inside of a bend, washed out that whole side of the picture.)
        new T.PointsMaterial({ map: glowSprite(), color: new T.Color(theme === 1 ? 0xffb65e : 0x9a8cff).multiplyScalar(0.5), size: 2.4, transparent: true, blending: T.AdditiveBlending, depthWrite: false }),
      );
      pts.renderOrder = 3;
      g.add(pts);
    }
  }
  if (theme === 0) {
    // Hot-air balloons over the valley.
    const hues = [0xff6b6b, 0xffc94d, 0x4fc3c8, 0xa685f0, 0xff9a4d, 0x6fb7ff],
      cx = track.points.reduce((s, p) => s + p.x, 0) / track.points.length,
      cz = track.points.reduce((s, p) => s + p.z, 0) / track.points.length;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + rng(),
        r = 250 + rng() * 150,
        b = new T.Group(),
        k = 1.5 + rng() * 1.2;
      b.position.set(cx + Math.cos(ang) * r, 55 + rng() * 80, cz + Math.sin(ang) * r);
      b.scale.setScalar(k);
      ball(b, hues[i % hues.length], [0, 0, 0], [5, 6, 5]);
      ball(b, 0xfffbf0, [0, -0.4, 0], [5.06, 1.3, 5.06]);
      cyl(b, hues[i % hues.length], [0, -5.6, 0], [1.6, 2.2, 1.6]);
      box(b, 0xb9895c, [0, -8.6, 0], [1.5, 1.2, 1.5]);
      decor.add(b);
    }
  } else if (theme === 2 && !compatibility) {
    // Crystals glowing by the roadside, and star lanterns floating above.
    const gems = [neon(0x6ff3ff, 1.5), neon(0xff7be0, 1.5), neon(0xb69bff, 1.5)],
      gem = new T.OctahedronGeometry(1, 0);
    for (let i = 0; i < 34; i++) {
      const s = track.sample(rng() * track.length, (rng() < 0.5 ? 1 : -1) * (c.width / 2 + 4.5 + rng() * 11)),
        m = new T.Mesh(gem, gems[i % 3]),
        k = 0.5 + rng() * 1.1;
      m.position.copy(s.p);
      m.position.y += k * 1.1;
      m.scale.set(k * 0.6, k * 1.7, k * 0.6);
      m.rotation.set(rng() * 0.5 - 0.25, rng() * 3, rng() * 0.5 - 0.25);
      decor.add(m);
    }
    const lantern = neon(0xffe39a, 1.6),
      starGeo = starMesh().geometry;
    for (let i = 0; i < 40; i++) {
      const s = track.sample(rng() * track.length, (rng() - 0.5) * 70),
        m = new T.Mesh(starGeo, lantern);
      m.scale.setScalar(2.2 + rng() * 2.2);
      m.position.copy(s.p);
      m.position.y += 16 + rng() * 26;
      m.rotation.set(rng(), rng() * 3, rng());
      decor.add(m);
    }
  }
  if (theme === 3) {
    // Snowmen along the road, and clusters of ice crystals.
    for (let i = 0; i < 8; i++) {
      const s = track.sample(((i + 0.3) / 8) * track.length, (i % 2 ? 1 : -1) * (c.width / 2 + 7 + rng() * 5)),
        sm = new T.Group();
      sm.position.copy(s.p);
      sm.rotation.y = s.yaw + (i % 2 ? -1 : 1) * 1.2;
      ball(sm, 0xf7fbff, [0, 0.9, 0], [1.1, 1, 1.1]);
      ball(sm, 0xf7fbff, [0, 2.2, 0], [0.8, 0.75, 0.8]);
      ball(sm, 0xf7fbff, [0, 3.2, 0], [0.55, 0.55, 0.55]);
      cone(sm, 0xff8a3d, [0, 3.2, 0.62], [0.1, 0.5, 0.1]).rotation.x = Math.PI / 2;
      for (const sd of [-1, 1]) ball(sm, 0x2a2f3a, [sd * 0.2, 3.38, 0.48], [0.07, 0.07, 0.05]);
      cyl(sm, 0x2a2f3a, [0, 3.85, 0], [0.42, 0.55, 0.42]);
      cyl(sm, 0x2a2f3a, [0, 3.6, 0], [0.62, 0.06, 0.62]);
      box(sm, [0xdc5236, 0x3d8fe0, 0xf3c24b][i % 3], [0, 2.75, 0.1], [1.1, 0.2, 0.9]);
      decor.add(sm);
    }
    const ice = compatibility ? mat(0xbfe6ff) : cached("iceArch", () => new T.MeshStandardMaterial({ color: 0xc4ecff, emissive: 0x2f7fb0, emissiveIntensity: 0.25, roughness: 0.12, metalness: 0.05 }));
    for (let i = 0; i < 26; i++) {
      const s = track.sample(rng() * track.length, (rng() < 0.5 ? 1 : -1) * (c.width / 2 + 5 + rng() * 12));
      for (let k = 0; k < 3; k++) {
        const h = 1 + rng() * 2.6,
          m = cone(decor, ice, [s.p.x + (rng() - 0.5) * 1.6, s.p.y + h * 0.4, s.p.z + (rng() - 0.5) * 1.6], [0.32 + rng() * 0.2, h, 0.32 + rng() * 0.2]);
        m.rotation.set((rng() - 0.5) * 0.6, rng() * 3, (rng() - 0.5) * 0.6);
      }
    }
  } else if (theme === 4) {
    // Hoodoos (stacked rock spires) and two pyramids on the horizon.
    for (let i = 0; i < 16; i++) {
      const s = track.sample(rng() * track.length, (rng() < 0.5 ? 1 : -1) * (c.width / 2 + 9 + rng() * 16)),
        h = 3 + rng() * 5;
      let y = s.p.y;
      for (let k = 0; k < 3; k++) {
        const r = (1.6 - k * 0.35) * (0.8 + rng() * 0.4);
        ball(decor, [0xc4653a, 0xd5854c, 0xe0a067][k], [s.p.x, y + h * 0.18, s.p.z], [r, h * 0.2, r]);
        y += h * 0.33;
      }
    }
    const cx = track.points.reduce((sum, p) => sum + p.x, 0) / track.points.length,
      cz = track.points.reduce((sum, p) => sum + p.z, 0) / track.points.length;
    [[250, 0.8, 70], [300, 1.15, 46]].forEach(([r, ang, h]) => {
      const py = new T.Mesh(new T.ConeGeometry(h * 1.1, h, 4), mat(0xe8bf84, 0.95));
      py.position.set(cx + Math.cos(ang) * r, h / 2 - 4, cz + Math.sin(ang) * r);
      py.rotation.y = Math.PI / 4;
      g.add(py);
    });
  }
  if (lake) {
    // Round the water: palms at the oasis, snowy rocks by the frozen lake.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rng() * 0.3,
        r = lake.r * (0.92 + rng() * 0.25),
        at = new T.Group();
      at.position.set(lake.x + Math.cos(a) * r, -1.2, lake.z + Math.sin(a) * r);
      if (theme === 4) {
        const lean = (rng() - 0.5) * 0.5;
        for (let k = 0; k < 6; k++) cyl(at, 0x9b7652, [lean * k * 0.25, 0.6 + k * 1.1, 0], [0.28 - k * 0.02, 1.15, 0.28 - k * 0.02]);
        for (let k = 0; k < 6; k++) {
          const leaf = ball(at, [0x4f9a45, 0x5daa4e][k % 2], [lean * 1.5 + Math.cos((k / 6) * 6.28) * 1.4, 7.1, Math.sin((k / 6) * 6.28) * 1.4], [1.9, 0.18, 0.55]);
          leaf.rotation.y = -(k / 6) * 6.28;
          leaf.rotation.z = -0.35;
        }
      } else {
        ball(at, 0xf3f8fd, [0, 0.6, 0], [1.4 + rng(), 0.8, 1.2 + rng()]);
      }
      decor.add(at);
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
    for (let j = 0; j < 2; j++)
      box(arch, (i + j) % 2 ? 0xfff4d9 : 0x4c5a59, [-c.width / 2 + ((i + 0.5) * c.width) / 16, 0.07, j * 0.8 - 0.4], [c.width / 16, 0.025, 0.8]);
  for (let i = 0; i < 16; i++) {
    const at = track.sample((i / 16) * track.length, (i % 2 ? 1 : -1) * (c.width / 2 + 3)),
      sign = new T.Group();
    sign.position.copy(at.p);
    sign.rotation.y = at.yaw;
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
  const air = theme === 3 ? weather("snow") : theme === 4 ? weather("sand") : null;
  if (air) {
    g.add(air.mesh);
    moving.push(air);
  }
  g.add(ranges(track, theme, new T.Color(a.sky[1][1]).getHex()));
  const sky = skyDome(theme);
  g.add(sky);
  g.add(staticBatch(decor));
  return { group: g, moving, sky, atmos: a };
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
    premium = bodyId !== "classic" ? buildBody(KARTS[bodyId]?.body || bodyId, KARTS[bodyId]?.trim) : null;
  g.add(premium ? premium.group : kartAsset("gold").model);
  if (premium?.rig) poseRig(premium.rig, 0);
  return g;
}
// Light trail for boosts: a ribbon of light laid along the kart's path from a
// point on the kart (a rear corner), fading out over `life` seconds, so from
// the raised chase camera it reads as a streak on the road. Each point has an
// edge, a centre and an edge vertex: the centre is bright and the edges are
// clear, which gives the ribbon a soft outline, and it narrows to a point at
// its tail (v2.6 drew two flat, hard-edged bands). Points are sampled at most
// 60 times a second and recycled (no per-frame garbage).
export function speedTrail({ points = 26, life = 0.42, width = 0.17 } = {}) {
  const pos = new Float32Array(points * 9),
    col = new Float32Array(points * 12),
    geo = new T.BufferGeometry(),
    index = [];
  for (let i = 0; i < points - 1; i++) {
    const a = i * 3,
      b = a + 3;
    index.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
  }
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
    update(anchor, active, colour, now) {
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
        const o9 = i * 9,
          o12 = i * 12;
        if (i >= count) {
          // Unused points collapse onto the tail, invisible.
          const last = Math.max(0, count - 1) * 9;
          pos.copyWithin(o9, last, last + 9);
          col[o12 + 3] = col[o12 + 7] = col[o12 + 11] = 0;
          continue;
        }
        const h = at(i),
          o = at(Math.min(count - 1, i + 1)),
          age = Math.min(1, (now - h.t) / life),
          fade = (1 - age) * (1 - age),
          // Thin at the kart, widest a little way back, a point at the tail.
          w = width * Math.min(1, 0.35 + age * 5) * (1 - age);
        tan.subVectors(h.p, o.p);
        if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
        side.crossVectors(tan, UP).normalize().multiplyScalar(w);
        pos[o9] = h.p.x + side.x;
        pos[o9 + 1] = h.p.y + side.y;
        pos[o9 + 2] = h.p.z + side.z;
        pos[o9 + 3] = h.p.x;
        pos[o9 + 4] = h.p.y;
        pos[o9 + 5] = h.p.z;
        pos[o9 + 6] = h.p.x - side.x;
        pos[o9 + 7] = h.p.y - side.y;
        pos[o9 + 8] = h.p.z - side.z;
        for (let k = 0; k < 3; k++) {
          // The centre runs brighter than white so the bloom catches it.
          const gain = k === 1 ? 1.5 : 1;
          col[o12 + k * 4] = h.c.r * gain;
          col[o12 + k * 4 + 1] = h.c.g * gain;
          col[o12 + k * 4 + 2] = h.c.b * gain;
          col[o12 + k * 4 + 3] = k === 1 ? 0.85 * fade : 0;
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
