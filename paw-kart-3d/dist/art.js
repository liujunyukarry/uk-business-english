import * as T from "./vendor/three.module.js";
import { kartAsset } from "./kart-assets.js";
import { dog, animateDog, material, ellipsoid, roundedBox } from "./models.js";
import { CHARACTERS, seeded } from "./race.js";
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
      ball(root, color, [s * 0.47, 1.03, 0.25], [0.18, 0.27, 0.2]);
      ball(root, color, [s * 0.3, 0.6, 0.24], [0.24, 0.17, 0.31]);
      ball(head, 0xeaa2a7, [s * 0.43, -0.14, 0.44], [0.13, 0.07, 0.04]);
    }
    eyeList.push(...eyes(head, 0.04, 0.52, 0.23, 0.052));
    ball(head, 0x4e4a43, [0, -0.13, 0.58], [0.065, 0.045, 0.04]);
    line(
      head,
      [
        [-0.12, -0.23, 0.53],
        [0, -0.27, 0.55],
        [0.12, -0.23, 0.53],
      ],
      0.018,
    );
    const band = new T.Mesh(new T.TorusGeometry(0.37, 0.07, 8, 28), mat(bunny ? 0xd8819f : 0xffdc6c));
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.29;
    root.add(band);
  }
  root.userData = { head, eyes: eyeList, ears };
  return root;
}
export function createKart(kind = "gold", number = 1) {
  const g = new T.Group(),
    body = new T.Group();
  g.add(body);
  const asset = kartAsset(kind);
  body.add(asset.model);
  const driver = asset.nativeDriver || character(kind);
  if (!asset.nativeDriver) {
    if (!driver.userData.kartDog) {
      driver.scale.setScalar(0.82);
      driver.position.set(0, -0.02, -0.24);
    }
    body.add(driver);
  }
  const exhaust = [];
  for (const side of [-1, 1]) {
    const flame = ball(
      body,
      new T.MeshBasicMaterial({ color: 0x8bf3ff }),
      [side * 0.35, 0.48, -1.28],
      [0.13, 0.14, 0.38],
    );
    flame.visible = false;
    exhaust.push(flame);
  }
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
  const marker = new T.Mesh(new T.ConeGeometry(0.19, 0.38, 4), new T.MeshBasicMaterial({ color: 0x7df5ff }));
  marker.rotation.z = Math.PI;
  marker.position.y = 3.05;
  marker.visible = false;
  g.add(marker);
  g.userData = {
    body,
    driver,
    wheels: asset.wheels,
    nativeDriver: !!asset.nativeDriver,
    exhaust,
    shield,
    protection,
    marker,
    kind,
  };
  return g;
}
export function animateKart(g, t, r, dt = 1 / 60, showcase = false) {
  const d = g.userData,
    driver = d.driver;
  const speed = r?.speed || 0,
    steer = r?.steer || 0;
  d.body.position.y =
    Math.sin(t * (showcase ? 2 : 14)) * (showcase ? 0.025 : 0.015) * Math.min(1, 0.2 + speed / 25);
  d.body.rotation.z = steer * 0.055;
  d.body.rotation.y = (r?.drifting ? -steer * 0.24 : 0) + (r?.stun > 0 ? Math.sin(t * 18) * 0.3 : 0);
  if (driver.userData.kartDog) {
    animateDog(driver, t, "idle", { dt, turn: steer });
    const u = driver.userData;
    u.arms.forEach((a, i) => {
      a.rotation.x = -1.15;
      a.rotation.z = (i ? 1 : -1) * -0.12;
    });
    u.legs.forEach((a) => (a.rotation.x = -0.7));
    u.head.rotation.y = showcase ? Math.sin(t * 0.8) * 0.13 : -steer * 0.18;
    u.ears.forEach((e, i) => {
      e.rotation.x = Math.sin(t * 7 + i) * 0.06 + speed * 0.002;
    });
    u.tail.rotation.z = Math.sin(t * 10) * 0.5;
  } else if (!d.nativeDriver) {
    const u = driver.userData;
    u.head.rotation.z = Math.sin(t * 2) * 0.035;
    u.head.rotation.y = showcase ? Math.sin(t * 0.75) * 0.12 : steer * 0.2;
    u.eyes.forEach(
      (e) =>
        (e.scale.y =
          (t % 4.6 > 4.43 ? 0.1 : 1) *
          (g.userData.kind === "mario" ? 0.06 : g.userData.kind === "dora" ? 0.08 : 0.0702)),
    );
    u.ears.forEach((e, i) => (e.rotation.z = Math.sin(t * 3 + i) * 0.06));
  }
  d.wheels.forEach((w) => {
    w.mesh.rotation.x += (speed * dt) / 0.43;
    if (w.front) w.pivot.rotation.y = -steer * 0.3;
  });
  d.protection.visible = r?.shield > 0 || r?.star > 0;
  d.protection.rotation.y = t;
  d.protection.children.forEach((m) => m.material.color.set(r?.star > 0 ? 0xffda5d : 0x7fe8ff));
  d.marker.visible = !showcase && r?.id === 0;
  d.marker.position.y = 3.05 + Math.sin(t * 3) * 0.06;
  d.exhaust.forEach((m, i) => {
    m.visible = r?.boost > 0 || r?.star > 0;
    m.scale.z = 0.3 + Math.sin(t * 35 + i) * 0.12;
  });
  d.shield.visible = r?.shield > 0 || r?.star > 0;
  d.shield.material.color.set(r?.star > 0 ? 0xffda5d : 0x7fe8ff);
  if (r?.small > 0) g.scale.setScalar(0.7);
  else g.scale.setScalar(1);
}
function ribbon(track, offset, width, color, y = 0.04) {
  const pos = [],
    idx = [],
    n = 720;
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * track.length;
    for (const s of [-1, 1]) {
      const p = track.sample(d, offset + (s * width) / 2).p;
      pos.push(p.x, p.y + y, p.z);
    }
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, mat(color));
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
function staticBatch(group) {
  group.updateMatrixWorld(true);
  const batches = new Map(),
    meshes = [];
  group.traverse((o) => {
    if (
      o.isMesh &&
      !Array.isArray(o.material) &&
      o.geometry.attributes.position &&
      o.geometry.attributes.normal
    ) {
      meshes.push(o);
      const m = o.material;
      const tile = new T.Vector3().setFromMatrixPosition(o.matrixWorld);
      const key = m.uuid + ":" + Math.floor(tile.x / 35) + ":" + Math.floor(tile.z / 35);
      if (!batches.has(key)) batches.set(key, { p: [], n: [], mat: m });
      const b = batches.get(key),
        source = o.geometry === sphere ? scenerySphere : o.geometry,
        geo = source.index ? source.toNonIndexed() : source.clone();
      geo.applyMatrix4(o.matrixWorld);
      b.p.push(geo.attributes.position.array);
      b.n.push(geo.attributes.normal.array);
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
    const mesh = new T.Mesh(geo, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
export function createWorld(track) {
  const g = new T.Group(),
    decor = new T.Group(),
    moving = [],
    theme = track.index,
    c = track.config,
    rng = seeded(9812 + theme);
  g.add(ribbon(track, 0, c.width + 24, c.ground, -0.03));
  g.add(ribbon(track, 0, c.width, c.road, 0.04));
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
  g.add(staticBatch(decor));
  return { group: g, moving };
}
export function makeItemBox() {
  const g = new T.Group();
  const m = new T.Mesh(
    new T.BoxGeometry(1.7, 1.7, 1.7),
    new T.MeshStandardMaterial({
      color: 0xa6e4e8,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.82,
    }),
  );
  g.add(m);
  const edges = new T.LineSegments(
    new T.EdgesGeometry(m.geometry),
    new T.LineBasicMaterial({ color: 0xf3ffff }),
  );
  g.add(edges);
  for (let i = 0; i < 4; i++) {
    const face = badge(g, "?", [0, 0, 0], 1.25, 1.25, "#a6e4e8", "#ffffff");
    face.rotation.y = (i * Math.PI) / 2;
    face.position.set(Math.sin((i * Math.PI) / 2) * 0.86, 0, Math.cos((i * Math.PI) / 2) * 0.86);
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
