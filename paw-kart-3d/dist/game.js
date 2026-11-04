import * as T from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { Race, Track, TRACKS, CHARACTERS, ITEMS, SPECIALS, DRIFT, NITRO_RULES, DRAFT, driftLevel, clamp } from "./race.js?v=0c6ed773";
import {
  createKart,
  animateKart,
  createWorld,
  createLobby,
  itemBoxField,
  coinField,
  makeBanana,
  makeShell,
  makeFireball,
  makeMeteor,
  makeTargetMark,
  updateBoxShimmer,
  kartMood,
  setKartFade,
  setCompatibilityMode,
  NITRO,
  box,
  mat,
  label,
} from "./art.js?v=0c6ed773";
import { KartAudio } from "./audio.js?v=0c6ed773";
import { bindTouchControls, CONTROLS } from "./input.js?v=0c6ed773";
import { SoftwareRenderer } from "./software-renderer.js?v=0c6ed773";
// Build id stamped by tools/stamp.mjs; shown in the pause and help dialogs so
// a tester can tell exactly which version is running.
const BUILD = document.querySelector('meta[name="paw-build"]')?.content || "dev";
document.documentElement.dataset.build = BUILD;
const $ = (id) => document.getElementById(id),
  show = (id, on) => $(id).classList.toggle("hidden", !on),
  KEY = "paw-kart-v1";
const defaults = {
  character: "gold",
  track: 0,
  difficulty: "normal",
  assist: true,
  autoGas: true,
  autoDrift: matchMedia("(pointer:coarse)").matches,
  muted: false,
  volume: 0.45,
  quality: "auto",
  reduced: matchMedia("(prefers-reduced-motion:reduce)").matches,
  records: {},
  races: 0,
  mode: "single", // 道具赛 (single), 竞速赛 (speed) or 杯赛 (cup)
  specialsTotal: 0, // the "use your special" coaching stops after a few
};
let save = { ...defaults };
try {
  const v = JSON.parse(localStorage.getItem(KEY) || "null");
  if (v && typeof v === "object")
    save = { ...defaults, ...v, records: v.records && typeof v.records === "object" ? v.records : {} };
} catch {}
if (!CHARACTERS.some((c) => c.id === save.character)) save.character = "gold";
save.track = clamp(Number(save.track) || 0, 0, 2);
if (!["easy", "normal", "hard"].includes(save.difficulty)) save.difficulty = "normal";
if (!["single", "speed", "cup"].includes(save.mode)) save.mode = "single";
save.volume = clamp(Number(save.volume) || 0, 0, 1);
let storageWarned = false;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    if (!storageWarned) {
      notify("当前浏览器无法保存纪录，仍可正常游玩");
      storageWarned = true;
    }
  }
}
let renderer;
try {
  renderer = new T.WebGLRenderer({
    canvas: $("scene"),
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
} catch {
  renderer = new SoftwareRenderer($("scene"));
}
document.documentElement.dataset.renderer = renderer.software ? "compatibility" : "webgl2";
setCompatibilityMode(renderer.software);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = !renderer.software;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.background = new T.Color(0xe3ede0);
scene.fog = new T.Fog(0xe3ede0, 150, 340);
const camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 700);
const hemi = new T.HemisphereLight(0xfff7e5, 0x8eab85, 2.5);
scene.add(hemi);
const sun = new T.DirectionalLight(0xfff2d7, 3.0);
sun.position.set(-20, 45, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.camera.far = 150;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
let env = { texture: null };
if (!renderer.software) {
  const pmrem = new T.PMREMGenerator(renderer);
  env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.24;
  pmrem.dispose();
}
const lobby = createLobby();
scene.add(lobby.group);
const kartCache = new Map();
function kart(key, kind, num) {
  if (!kartCache.has(key)) kartCache.set(key, createKart(kind, num));
  return kartCache.get(key);
}
let selected = kart("hero-" + save.character, save.character, 1);
lobby.group.add(selected);
selected.position.y = 0.08;
let orbit = -0.3,
  drag = null;
let world = null,
  race = null,
  raceGroup = null,
  cars = [],
  pickupMeshes = [],
  coinMeshes = [],
  boxField = null,
  coins = null,
  dynamicMeshes = new Map(),
  mode = "home",
  raceMode = save.mode,
  cup = null,
  ended = false,
  clock = 0,
  last = performance.now(),
  accum = 0,
  uiTimer = 0,
  toastTimer = 0,
  bannerTimer = 0,
  lastCount = 0,
  resumeTimer = 0,
  look = new T.Vector3(),
  cameraReady = false;
const keys = new Set(),
  touch = { left: false, right: false, drift: false, gas: false };
// Drift tier colours (none / blue / orange / purple), as in Mario Kart.
const DRIFT_COLOURS = ["#fff1c9", "#7fdcff", "#ffa64a", "#f47be0"],
  DRIFT_SPARKS = [0xfff1c9, 0x7fdcff, 0xffa64a, 0xf47be0];
let lastRank = 0,
  lastPassCue = 0,
  nitroTipShown = false,
  progressDots = [],
  targetMarks = [],
  specialTargets = []; // racer ids the player's special would hit right now
// Specials that hit someone: their targets are marked before firing.
const ATTACK_SPECIALS = new Set(["bear", "nova", "mario"]);
const audio = new KartAudio();
audio.muted = save.muted;
audio.volume = save.volume;
let fpsFrames = 0,
  fpsTime = 0,
  slowWindows = 0,
  adaptiveLow = false;
const coarse = matchMedia("(pointer:coarse)").matches;
const touchLayout = () => coarse || innerWidth <= 900 || innerHeight <= 520;
function quality() {
  const low = save.quality === "low" || (save.quality === "auto" && adaptiveLow);
  renderer.setPixelRatio(renderer.software ? 0.85 : Math.min(devicePixelRatio, low ? 1 : coarse ? 1.5 : 1.8));
  renderer.shadowMap.enabled = !low && !renderer.software;
  resize();
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
// Only a real rotation pauses the race. Safari and in-app browsers also fire
// resize when their toolbars slide in or out; V2 paused (and snapped the
// camera) on every one of those.
let landscape = innerWidth > innerHeight;
addEventListener("resize", () => {
  const now = innerWidth > innerHeight;
  if (now !== landscape && mode === "race") pause();
  landscape = now;
  resize();
});
quality();
function notify(text, seconds = 2.5) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  toastTimer = seconds;
}
function banner(text, sub = "", seconds = 2.1) {
  $("banner").textContent = text;
  if (sub) {
    const s = document.createElement("small");
    s.textContent = sub;
    $("banner").append(s);
  }
  show("banner", true);
  bannerTimer = seconds;
}
// Best times per track, class and rules. Item races keep the original key,
// so records set before the speed race existed still count.
const recordKey = (track, rules) => (rules === "speed" ? "speed-" : "") + track + "-" + save.difficulty;
function timeText(t) {
  const m = Math.floor(t / 60),
    s = Math.floor(t % 60),
    ms = Math.floor((t % 1) * 1000);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + String(ms).padStart(3, "0");
}
function inputClear() {
  keys.clear();
  controls.clear(); // also clears the .pressed visuals
  for (const k in touch) touch[k] = false;
}
function updateHome() {
  document.querySelectorAll("[data-character]").forEach((b) => {
    const active = b.dataset.character === save.character;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-track]").forEach((b) => {
    const active = raceMode === "cup" || Number(b.dataset.track) === save.track;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  $("difficulty").value = save.difficulty;
  const c = CHARACTERS.find((x) => x.id === save.character),
    idx = CHARACTERS.indexOf(c);
  $("driver-name").innerHTML = c.name + "<span>READY TO ROLL</span>";
  $("driver-tag").textContent =
    String(idx + 1).padStart(2, "0") + " / " + String(CHARACTERS.length).padStart(2, "0") + " · " + c.tag;
  $("driver-stats").innerHTML = ["速度", "加速", "操控"]
    .map(
      (v, i) =>
        "<div>" +
        v +
        '<span class="stat-bars">' +
        Array.from({ length: 5 }, (_, j) => '<i class="' + (j < c.stats[i] ? "on" : "") + '"></i>').join("") +
        "</span></div>",
    )
    .join("");
  document.querySelectorAll("[data-mode]").forEach((x) => {
    const on = x.dataset.mode === raceMode;
    x.classList.toggle("active", on);
    x.setAttribute("aria-pressed", String(on));
  });
  $("start-copy").textContent =
    raceMode === "cup"
      ? "出发 · 挑战三站冠军"
      : (raceMode === "speed" ? "竞速 · " : "出发 · ") + TRACKS[save.track].name;
  const rec = save.records[recordKey(save.track, raceMode === "speed" ? "speed" : "item")];
  $("record").textContent =
    raceMode === "cup"
      ? "三条赛道 · 积分争冠"
      : rec
        ? (raceMode === "speed" ? "竞速最佳 " : "个人最佳 ") + timeText(rec)
        : raceMode === "speed"
          ? "没有道具 · 漂移攒氮气 · 拼技术"
          : "三圈决胜 · 约 90 秒一局";
  $("sound").textContent = save.muted ? "♩" : "♫";
  $("sound").setAttribute("aria-label", save.muted ? "开启声音" : "关闭声音");
  scene.background.set([0xe3ede0, 0xf1e3dd, 0xd5ddec][save.track]);
  scene.fog.color.copy(scene.background);
  persist();
}
function chooseCharacter(id) {
  if (mode !== "home") return;
  lobby.group.remove(selected);
  save.character = id;
  selected = kart("hero-" + id, id, 1);
  selected.position.set(0, 0.08, 0);
  lobby.group.add(selected);
  orbit = -0.3;
  audio.cue("tap");
  updateHome();
}
function buildMenu() {
  $("characters").innerHTML = CHARACTERS.map(
    (c) =>
      '<button class="character-card" data-character="' +
      c.id +
      '" aria-label="选择' +
      c.name +
      '"><img alt="' +
      c.name +
      '的 3D 赛车"><b>' +
      c.name +
      "</b><small>" +
      c.tag +
      "</small></button>",
  ).join("");
  $("tracks").innerHTML = TRACKS.map((t, i) => {
    const tr = new Track(i);
    const pts = tr.points.filter((_, j) => j % 30 === 0);
    const xs = pts.map((p) => p.x),
      zs = pts.map((p) => p.z),
      minX = Math.min(...xs),
      minZ = Math.min(...zs),
      w = Math.max(...xs) - minX,
      h = Math.max(...zs) - minZ;
    const path =
      pts
        .map(
          (p, j) =>
            (j ? "L" : "M") +
            (((p.x - minX) / w) * 85 + 7).toFixed(1) +
            "," +
            (((p.z - minZ) / h) * 33 + 4).toFixed(1),
        )
        .join(" ") + "Z";
    return (
      '<button class="track-card" data-track="' +
      i +
      '" aria-label="选择' +
      t.name +
      '"><svg viewBox="0 0 100 42"><path d="' +
      path +
      '" fill="none" stroke="' +
      t.accent +
      '" stroke-width="3.5" stroke-linecap="round"/></svg><b>' +
      t.name +
      "</b><small>" +
      t.level +
      "</small></button>"
    );
  }).join("");
  document
    .querySelectorAll("[data-character]")
    .forEach((b) => (b.onclick = () => chooseCharacter(b.dataset.character)));
  document.querySelectorAll("[data-track]").forEach(
    (b) =>
      (b.onclick = () => {
        if (raceMode === "cup") notify("杯赛会依次游玩全部三条赛道");
        else {
          save.track = Number(b.dataset.track);
          audio.cue("tap");
          updateHome();
        }
      }),
  );
  document.querySelectorAll("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        raceMode = save.mode = b.dataset.mode;
        audio.cue("tap");
        updateHome();
      }),
  );
  $("difficulty").onchange = () => {
    save.difficulty = $("difficulty").value;
    updateHome();
  };
  const ps = new T.Scene();
  ps.background = new T.Color(0xe7e9db);
  ps.environment = env.texture;
  ps.environmentIntensity = 0.4;
  ps.add(new T.HemisphereLight(0xfff8e6, 0x98a987, 2.5));
  const pl = new T.DirectionalLight(0xffedce, 3);
  pl.position.set(-3, 6, 4);
  ps.add(pl);
  const pc = new T.PerspectiveCamera(38, 1, 0.1, 50);
  pc.position.set(3.6, 2.8, 4.8);
  pc.lookAt(0, 1.25, 0);
  renderer.setPixelRatio(1);
  renderer.setSize(180, 180, false);
  CHARACTERS.forEach((c, i) => {
    const k = kart("hero-" + c.id, c.id, 1);
    ps.add(k);
    k.rotation.y = -0.3;
    animateKart(k, 1, null, 1 / 60, true);
    if (renderer.software) renderer.last = 0;
    renderer.render(ps, pc);
    document.querySelector('[data-character="' + c.id + '"] img').src =
      renderer.domElement.toDataURL("image/png");
    ps.remove(k);
  });
  lobby.group.add(selected);
  quality();
  updateHome();
}
buildMenu();
const particles = [],
  particleGeo = new T.SphereGeometry(1, 6, 4),
  particleMat = new T.MeshBasicMaterial({ vertexColors: false });
const particleMesh = new T.InstancedMesh(particleGeo, particleMat, 140);
particleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
particleMesh.frustumCulled = false;
scene.add(particleMesh);
particleMesh.count = 0;
const dummy = new T.Object3D(),
  color = new T.Color();
// Particles spawned from a moving kart inherit its velocity (`carry`) and
// then slow down with air drag. V2 left them standing in world space, so at
// race speed they shot back past the chase camera as large blobs.
function burst(position, n = 15, col = 0xffdd88, carry = null) {
  for (let i = 0; i < n && particles.length < 140; i++) {
    const v = new T.Vector3((Math.random() - 0.5) * 7, 2 + Math.random() * 6, (Math.random() - 0.5) * 7);
    if (carry) v.add(carry);
    particles.push({
      p: position.clone(),
      v,
      life: 0.5 + Math.random() * 0.6,
      max: 1,
      size: 0.06 + Math.random() * 0.11,
      color: col,
    });
  }
}
function kartVelocity(r) {
  const s = race.track.sample(r.distance);
  return s.t.clone().multiplyScalar(r.speed * 0.92);
}
// Item-box shards: little rainbow cubes that fly apart and tumble when a box
// is taken (the "you got it" moment), carried along with the kart.
const shards = [],
  shardMesh = new T.InstancedMesh(
    new T.BoxGeometry(0.3, 0.3, 0.3),
    new T.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85 }),
    120,
  ),
  shardColour = new T.Color(),
  shardQ = new T.Quaternion(),
  shardAxis = new T.Vector3();
shardMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
shardMesh.frustumCulled = false;
shardMesh.count = 0;
scene.add(shardMesh);
function shatter(at, n, carry = null) {
  for (let i = 0; i < n && shards.length < 120; i++) {
    const v = new T.Vector3((Math.random() - 0.5) * 9, 3 + Math.random() * 6, (Math.random() - 0.5) * 9);
    if (carry) v.addScaledVector(carry, 0.85);
    shards.push({
      p: at.clone(),
      v,
      axis: new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spin: 6 + Math.random() * 10,
      angle: 0,
      life: 0.7 + Math.random() * 0.4,
      hue: Math.random(),
    });
  }
}
function shardUpdate(dt) {
  const drag = Math.exp(-dt * 1.6);
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.life -= dt;
    if (s.life <= 0) {
      shards.splice(i, 1);
      continue;
    }
    s.v.multiplyScalar(drag);
    s.v.y -= dt * 14;
    s.p.addScaledVector(s.v, dt);
    s.angle += s.spin * dt;
  }
  shards.forEach((s, i) => {
    dummy.position.copy(s.p);
    dummy.quaternion.copy(shardQ.setFromAxisAngle(shardAxis.copy(s.axis), s.angle));
    const lens = clamp((s.p.distanceTo(camera.position) - 2.5) / 3, 0, 1);
    dummy.scale.setScalar(Math.min(1, s.life * 2.5) * lens);
    dummy.updateMatrix();
    shardMesh.setMatrixAt(i, dummy.matrix);
    shardMesh.setColorAt(i, shardColour.setHSL((s.hue + clock * 0.3) % 1, 0.8, 0.65));
  });
  dummy.quaternion.identity();
  shardMesh.count = shards.length;
  shardMesh.instanceMatrix.needsUpdate = true;
  if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
}
// Special cut-in, KartRider style: the driver's name and the move slide in.
const cutInEl = document.createElement("div");
cutInEl.id = "cutin";
cutInEl.setAttribute("aria-hidden", "true");
document.body.append(cutInEl);
function cutIn(racer, sp) {
  cutInEl.innerHTML = "";
  const icon = document.createElement("span"),
    text = document.createElement("b"),
    who = document.createElement("small");
  icon.textContent = sp.icon;
  text.textContent = sp.name;
  who.textContent = racer.name + " · 必杀技";
  cutInEl.append(icon, text, who);
  cutInEl.style.setProperty("--accent", racer.character.color);
  cutInEl.classList.remove("on");
  void cutInEl.offsetWidth;
  if (!save.reduced) cutInEl.classList.add("on");
  else banner(sp.icon + " " + sp.name, racer.name, 1.2);
}
function particleUpdate(dt) {
  const drag = Math.exp(-dt * 2.2);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.v.multiplyScalar(drag);
    p.v.y -= dt * 10;
    p.p.addScaledVector(p.v, dt);
  }
  particles.forEach((p, i) => {
    dummy.position.copy(p.p);
    // Shrink sparks that drift right up to the lens instead of letting them
    // fill the screen as big blobs as the camera passes them.
    const lens = clamp((p.p.distanceTo(camera.position) - 2.5) / 3, 0, 1);
    dummy.scale.setScalar(p.size * Math.min(1, p.life * 4) * lens);
    dummy.updateMatrix();
    particleMesh.setMatrixAt(i, dummy.matrix);
    particleMesh.setColorAt(i, color.set(p.color));
  });
  particleMesh.count = particles.length;
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
}
function clearRace() {
  if (raceGroup) scene.remove(raceGroup);
  if (world) {
    scene.remove(world.group);
    world.group.traverse((o) => {
      if (o.isMesh && o.geometry && !o.geometry.userData.shared && o.geometry.type === "BufferGeometry")
        o.geometry.dispose();
    });
  }
  world = null;
  raceGroup = null;
  dynamicMeshes.clear();
  pickupMeshes = [];
  coinMeshes = [];
  particles.length = 0;
  shards.length = 0;
}
function startRace(trackIndex = save.track) {
  inputClear();
  toastTimer = 0;
  $("toast").classList.remove("show");
  $("toast").textContent = "";
  $("dialog").close();
  clearRace();
  mode = "race";
  ended = false;
  resumeTimer = 0;
  cameraReady = false;
  accum = 0;
  audio.unlock();
  show("lobby", false);
  show("header", false);
  show("hud", true);
  show("banner", false);
  lobby.group.visible = false;
  camera.clearViewOffset();
  race = new Race({
    track: trackIndex,
    character: save.character,
    difficulty: save.difficulty,
    rules: raceMode === "speed" ? "speed" : "item",
  });
  const speedRace = race.rules === "speed";
  document.body.classList.toggle("speed-race", speedRace);
  nitroTipShown = false;
  specialTargets = [];
  snapshot();
  renderAlpha = 1;
  cam.ready = false;
  camStep(STEP);
  lastPlayerBoost = false;
  lastRank = 0;
  lastPassCue = 0;
  audio.startRace(trackIndex);
  world = createWorld(race.track);
  scene.add(world.group);
  raceGroup = new T.Group();
  scene.add(raceGroup);
  cars = race.racers.map((r) => {
    const k = kart("race-" + r.id + "-" + r.character.id, r.character.id, r.id + 1);
    raceGroup.add(k);
    return k;
  });
  // Boxes and coins are drawn as instanced meshes; these placeholders hold
  // each one's position and pop / regrow state.
  boxField = itemBoxField(race.boxes.length);
  raceGroup.add(boxField.group);
  pickupMeshes = race.boxes.map((b) => {
    const o = new T.Object3D(),
      s = race.track.sample(b.distance, b.lane);
    o.position.copy(s.p);
    o.position.y += 1.6;
    o.userData.baseY = o.position.y;
    return o;
  });
  coins = coinField(race.coins.length);
  raceGroup.add(coins.group);
  coinMeshes = race.coins.map((c) => {
    const o = new T.Object3D(),
      s = race.track.sample(c.distance, c.lane);
    o.position.copy(s.p);
    o.position.y += 0.95;
    return o;
  });
  for (const pad of race.pads) {
    const s = race.track.sample(pad.distance, pad.lane),
      g = new T.Group();
    g.position.copy(s.p);
    g.position.y += 0.09;
    g.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
    raceGroup.add(g);
    box(g, 0xeeb967, [0, 0, 0], [4.8, 0.04, 7]);
    for (let j = 0; j < 3; j++) {
      const a = box(g, 0xfff2b0, [-0.7, 0.03, (j - 1) * 1.7], [1.9, 0.025, 0.25]);
      a.rotation.y = -0.5;
      const b = box(g, 0xfff2b0, [0.7, 0.03, (j - 1) * 1.7], [1.9, 0.025, 0.25]);
      b.rotation.y = 0.5;
    }
  }
  const tc = TRACKS[trackIndex];
  scene.background.set(tc.sky);
  scene.fog.color.set(tc.fog);
  sun.color.set(trackIndex === 2 ? 0xc8d5ff : 0xfff2d7);
  sun.intensity = trackIndex === 2 ? 2.4 : 3;
  hemi.intensity = trackIndex === 2 ? 1.8 : 2.5;
  $("track-title").textContent = tc.name;
  $("cup-progress").textContent = cup
    ? "PAW CUP · 第 " + (cup.round + 1) + " / 3 站"
    : (speedRace ? "SPEED RACE · " : "ITEM RACE · ") + { easy: "50", normal: "100", hard: "150" }[save.difficulty] + "cc";
  $("item-key").textContent = touchLayout() ? "点击使用" : "SPACE";
  $("kb-item").textContent = speedRace ? "氮气" : "道具";
  // Race progress strip: one marker per racer (the player's on top).
  $("progress").querySelectorAll(".pk").forEach((e) => e.remove());
  progressDots = race.racers.map((r) => {
    const dot = document.createElement("i");
    dot.className = "pk" + (r.id === 0 ? " me" : "");
    dot.style.background = r.character.color;
    $("progress").append(dot);
    return dot;
  });
  // Lock-on reticles for attack specials (Nova can mark three karts).
  targetMarks = [0, 1, 2].map(() => {
    const m = makeTargetMark();
    raceGroup.add(m);
    return m;
  });
  mapCache = null;
  minimapFitted = false;
  fitMinimap();
  if (speedRace) notify("⚡ 竞速赛：没有道具，漂移攒氮气，满了点 N₂O 喷射；紧跟前车能吸尾流", 3.2);
  show("accelerate", !save.autoGas);
  document.body.classList.toggle("manual-gas", !save.autoGas);
  show("countdown", true);
  lastCount = 0;
  updateHUD();
  // Compile every shader the race can need (flames, shields, fade dither,
  // particles) now, during the countdown, instead of stalling the first time
  // a boost or shield appears mid-race.
  if (!renderer.software) {
    cars.slice(1).forEach((k) => setKartFade(k, k.userData.fade ?? 1));
    try {
      renderer.compile(scene, camera);
    } catch {}
  }
}
function goHome() {
  mode = "home";
  inputClear();
  toastTimer = 0;
  $("toast").classList.remove("show");
  $("toast").textContent = "";
  $("dialog").close();
  clearRace();
  race = null;
  cup = null;
  show("lobby", true);
  show("header", true);
  show("hud", false);
  show("countdown", false);
  show("banner", false);
  show("status-effect", false);
  $("speed-lines").classList.remove("active");
  document.body.classList.remove("speed-race");
  lobby.group.visible = true;
  sun.color.set(0xfff2d7);
  sun.intensity = 3;
  hemi.intensity = 2.5;
  sun.position.set(-20, 45, 25);
  sun.target.position.set(0, 0, 0);
  cameraReady = false;
  camera.fov = 40;
  audio.menu();
  updateHome();
}
$("start").onclick = () => {
  cup = raceMode === "cup" ? { round: 0, scores: Array(8).fill(0) } : null;
  startRace(cup ? 0 : save.track);
};
function modal(html) {
  $("dialog-content").innerHTML = html;
  if (!$("dialog").open) $("dialog").showModal();
  $("dialog-content").querySelector("button")?.focus({ preventScroll: true });
  $("dialog").scrollTop = 0;
}
function pause() {
  if (mode !== "race") return;
  mode = "paused";
  inputClear();
  show("countdown", false);
  modal(
    '<span class="dialog-eyebrow">A LITTLE PIT STOP</span><h2>进站，歇一会儿。</h2><p>比赛已暂停。准备好了，继续向终点出发。</p><div class="dialog-actions"><button class="primary" id="resume">继续比赛</button><button class="secondary" id="restart">重新开始</button></div><div class="dialog-actions"><button class="secondary" id="race-settings">驾驶设置</button><button class="secondary" id="home">返回车库</button></div><div class="modal-footer">版本 2.4 · ' + BUILD + '</div>',
  );
  $("resume").onclick = resume;
  $("restart").onclick = () => startRace(race.track.index);
  $("home").onclick = goHome;
  $("race-settings").onclick = settings;
}
function resume() {
  if (!race) return;
  $("dialog").close();
  mode = "race";
  resumeTimer = 1.5;
  inputClear();
  audio.unlock();
  show("countdown", true);
}
$("pause").onclick = pause;
// Respond on the touch itself too, so pausing works while another finger is
// still steering (iOS may not synthesise a click during multi-touch).
$("pause").addEventListener("pointerup", (e) => {
  if (e.pointerType !== "mouse") pause();
});
function help() {
  if (mode === "race") pause();
  modal(
    '<button class="dialog-close" id="close-dialog" aria-label="关闭">×</button><span class="dialog-eyebrow">YOUR FIRST LAP</span><h2>快乐超车，从这里开始。</h2><p>默认自动油门，专心转向和使用道具。跑完三圈即冲线，杯赛累积三站积分；竞速赛没有道具，比拼漂移和氮气。</p><div class="help-grid"><div><b>01 / 转向与过弯</b><p>手机：按住屏幕左半边左转，右半边右转。急弯会把车往外甩，只靠方向会掉速、贴外侧，漂移过弯更快。键盘 ← → 或 A / D。</p></div><div><b>02 / 漂移</b><p>手机：进弯按住方向就会漂移，一直按着保持，火花变蓝、橙、紫后松开，冲刺一次比一次猛；也可以点一下漂移键开始。键盘：转向时按住 Shift。</p></div><div><b>03 / 道具（两个槽）</b><p>撞碎问号箱抽道具，最多存两个，点道具框（键盘空格）使用。问号箱每人一份；越落后道具越强，最后几名还可能抽到火箭。</p></div><div><b>04 / 必杀技</b><p>每位车手都有专属必杀技。漂移加速、吃金币、打中对手都会给必杀槽充能，满了点必杀键（键盘 E）释放。流星雨、熊抱冲撞这类攻击必杀会用红圈标出要打的车；前面没人可打时不让你白放。倒计时到「1」时按住漂移键可以起步加速。</p></div><div><b>05 / 竞速赛与尾流</b><p>竞速赛没有道具和必杀：漂移给氮气槽充能，最多存两管，点 N₂O 键（键盘空格）喷射。两种比赛都有尾流：紧跟在别的车正后方一小会儿，就会被吸着加速超过去。</p></div><div><b>06 / 小地图与后方雷达</b><p>右上角小地图：方格线是终点，黄色箭头是你，彩色圆点是对手，离你近的会描白边；下方进度条显示每个人离终点多远。屏幕下方的雷达会提示从后面逼近的车和距离。</p></div></div><div class="help-items">' +
      Object.entries(ITEMS)
        .map(([k, v]) => "<div><span>" + v.icon + "</span><b>" + v.name + "</b>" + v.desc + "</div>")
        .join("") +
      '</div><p>关闭自动油门后：W / ↑ 或屏幕油门键加速，S / ↓ 刹车。P / Esc 暂停；切换应用会自动暂停。</p><div class="dialog-actions sticky-actions"><button id="got-it" class="primary">准备好啦</button></div><div class="modal-footer">非官方同人作品 · 角色造型参考，原创赛道与音乐 · 版本 2.4 · ' + BUILD + '</div>',
  );
  $("got-it").onclick = closeModal;
  $("close-dialog").onclick = closeModal;
}
function closeModal() {
  if (mode === "paused") resume();
  else $("dialog").close();
}
$("help").onclick = help;
function settings() {
  if (mode === "race") pause();
  modal(
    '<button class="dialog-close" id="close-dialog" aria-label="关闭">×</button><span class="dialog-eyebrow">MAKE YOURSELF COMFORTABLE</span><h2>按你的节奏来。</h2>' +
      [
        ["autoGas", "自动油门", "推荐开启，只管转向和漂移"],
        ["autoDrift", "弯道自动漂移", "进弯按住方向就会漂移，按着保持，松开加速"],
        ["assist", "辅助转向", "在赛道边缘轻轻帮你一把"],
        ["reduced", "减少镜头变化", "关闭冲刺镜头拉远和屏幕光效"],
      ]
        .map(
          ([id, n, d]) =>
            '<label class="setting"><span>' +
            n +
            "<small>" +
            d +
            '</small></span><input type="checkbox" id="setting-' +
            id +
            '" ' +
            (save[id] ? "checked" : "") +
            "></label>",
        )
        .join("") +
      '<label class="setting"><span>音乐与音效</span><input type="range" id="volume" min="0" max="100" value="' +
      save.volume * 100 +
      '"></label><label class="setting"><span>画面质量</span><select id="quality"><option value="auto">自动 · 推荐</option><option value="high">精致 · 动态阴影</option><option value="low">流畅 · 节省电量</option></select></label><p>成绩保存在当前浏览器。手机横屏视野更宽，竖屏也可以完整游玩。</p><div class="dialog-actions sticky-actions"><button class="primary" id="done-settings">保存并返回</button></div>',
  );
  $("quality").value = save.quality;
  for (const k of ["autoGas", "autoDrift", "assist", "reduced"])
    $("setting-" + k).onchange = (e) => {
      save[k] = e.target.checked;
      persist();
      show("accelerate", !save.autoGas);
      document.body.classList.toggle("manual-gas", !save.autoGas);
    };
  $("volume").oninput = (e) => {
    save.volume = Number(e.target.value) / 100;
    audio.volume = save.volume;
    audio.unlock();
    persist();
  };
  $("quality").onchange = (e) => {
    save.quality = e.target.value;
    adaptiveLow = false;
    quality();
    persist();
  };
  $("close-dialog").onclick = closeModal;
  $("done-settings").onclick = closeModal;
}
$("settings").onclick = settings;
$("sound").onclick = () => {
  save.muted = !save.muted;
  audio.muted = save.muted;
  audio.unlock();
  audio.mix();
  updateHome();
};
$("dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  if (mode !== "result") closeModal();
});
function useItem() {
  if (mode !== "race" || resumeTimer > 0 || race.phase !== "racing") return;
  if (race.rules === "speed") {
    // Speed race: the item button fires a stored nitro charge.
    if (race.useNitro()) {
      processEvents();
      updateHUD();
    } else if (race.player.finish === null)
      notify("氮气还没攒满（" + Math.floor(race.player.nitro) + "%）· 漂移过弯就能充能", 1.4);
    return;
  }
  if (!race.useItem()) notify(race.player.roulette > 0 ? "惊喜马上揭晓…" : "撞进问号箱就能获得道具");
  else {
    processEvents();
    updateHUD();
  }
}
function useSpecial() {
  if (mode !== "race" || resumeTimer > 0 || race.phase !== "racing" || race.rules !== "item") return;
  const p = race.player;
  // Don't let a full gauge go to waste: meteors or fireballs with nobody
  // ahead, or the pocket with both item slots full.
  const wasted = p.special >= 100 && p.finish === null ? race.specialWasted() : null;
  if (wasted) {
    audio.cue("deny");
    notify(
      wasted === "slotsFull" ? "道具槽满了 · 先用掉一个道具，再掏口袋" : "前方没有对手 · 必杀先留着，追上去再放",
      1.8,
    );
    return;
  }
  if (!race.useSpecial()) notify("必杀槽 " + Math.floor(p.special) + "% · 漂移、吃金币、打中对手都能加速充能", 1.6);
  else {
    save.specialsTotal = (save.specialsTotal || 0) + 1;
    persist();
    processEvents();
    updateHUD();
  }
}
const controls = bindTouchControls({
  root: $("touch-controls"),
  buttons: Object.fromEntries(
    [...document.querySelectorAll("[data-control]")].map((b) => [b.dataset.control, b]),
  ),
  isActive: () => mode === "race",
  onChange: (s) => {
    Object.assign(touch, s);
    $("hud").dataset.touch = CONTROLS.filter((k) => s[k]).join(" ");
  },
  itemButton: $("item-button"),
  onItem: useItem,
  specialButton: $("special-button"),
  onSpecial: useSpecial,
});
addEventListener("keydown", (e) => {
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "ShiftLeft", "ShiftRight"].includes(
      e.code,
    ) &&
    mode === "race"
  )
    e.preventDefault();
  if (e.code === "Escape" && $("dialog").open) return;
  if (e.code === "KeyP" || e.code === "Escape") {
    e.preventDefault();
    if (mode === "race") pause();
    else if (mode === "paused") resume();
    return;
  }
  if (mode !== "race") return;
  keys.add(e.code);
  if (e.code === "Space" && !e.repeat) useItem();
  if (e.code === "KeyE" && !e.repeat) useSpecial();
});
addEventListener("keyup", (e) => keys.delete(e.code));
// Leaving the page in any way releases every key and finger.
function leave() {
  inputClear();
  if (mode === "race") pause();
}
addEventListener("blur", leave);
addEventListener("pagehide", leave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) leave();
});
$("scene").addEventListener("pointerdown", (e) => {
  if (mode === "home") {
    drag = { id: e.pointerId, x: e.clientX };
    $("scene").setPointerCapture(e.pointerId);
  }
});
$("scene").addEventListener("pointermove", (e) => {
  if (drag && e.pointerId === drag.id) {
    orbit += (e.clientX - drag.x) * 0.012;
    drag.x = e.clientX;
  }
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
  $("scene").addEventListener(ev, () => (drag = null));
function getInput() {
  return {
    steer:
      Number(touch.right || keys.has("ArrowRight") || keys.has("KeyD")) -
      Number(touch.left || keys.has("ArrowLeft") || keys.has("KeyA")),
    drift: touch.drift || keys.has("ShiftLeft") || keys.has("ShiftRight"),
    throttle: save.autoGas || touch.gas || keys.has("ArrowUp") || keys.has("KeyW"),
    brake: keys.has("ArrowDown") || keys.has("KeyS"),
    assist: save.assist,
    autoDrift: save.autoDrift,
    // Rocket start: drift or gas held when the countdown shows "1".
    start:
      touch.drift ||
      touch.gas ||
      keys.has("ArrowUp") ||
      keys.has("KeyW") ||
      keys.has("ShiftLeft") ||
      keys.has("ShiftRight"),
  };
}
// Short full-screen flash for lightning (skipped with reduced motion).
const flashEl = document.createElement("div");
flashEl.id = "flash";
flashEl.setAttribute("aria-hidden", "true");
document.body.append(flashEl);
function flash() {
  if (save.reduced) return;
  flashEl.classList.remove("on");
  void flashEl.offsetWidth; // restart the transition
  flashEl.classList.add("on");
}
// Red edge flash when the player is hit.
const hitEl = document.createElement("div");
hitEl.id = "hit-vignette";
hitEl.setAttribute("aria-hidden", "true");
document.body.append(hitEl);
function hitFlash() {
  hitEl.classList.remove("on");
  void hitEl.offsetWidth;
  hitEl.classList.add("on");
}
const near = (distance, metres) => Math.abs(race.gap(distance, race.player.distance)) < metres;
function processEvents() {
  const landed = [];
  for (const e of race.events) {
    if (e.racer === 0 || e.type === "go") {
      audio.cue(e.type, e);
      if (e.type === "pickup") {
        $("item-button").classList.remove("got");
        void $("item-button").offsetWidth;
        $("item-button").classList.add("got");
        if (race.player.itemsUsed === 0 && e.slot === 1) notify(touchLayout() ? "获得道具！点道具框使用" : "获得道具！按空格使用", 1.6);
      }
      if (e.type === "nitroReady") {
        $("item-button").classList.remove("got");
        void $("item-button").offsetWidth;
        $("item-button").classList.add("got");
        if (!nitroTipShown) {
          nitroTipShown = true;
          notify("⚡ 氮气就绪！" + (touchLayout() ? "点 N₂O 键喷射" : "按空格喷射") + " · 最多存 2 管", 1.8);
        }
      }
      if (e.type === "nitro") {
        const carry = kartVelocity(race.player);
        for (const f of cars[0].userData.exhaust) {
          f.nozzle.getWorldPosition(wheelWorld);
          for (let j = 0; j < 8; j++) spark(wheelWorld, j % 2 ? 0x3fd2ff : 0xf2fdff, f.nozzle.position.x > 0 ? 1 : -1, carry);
        }
      }
      if (e.type === "draft") notify("💨 尾流加速！", 0.9);
      if (e.type === "specialReady") {
        notify(SPECIALS[race.player.character.id].icon + " 必杀技就绪！" + (touchLayout() ? "点必杀键释放" : "按 E 释放"), 1.6);
      }
      if (e.type === "dash") burst(cars[0].position.clone().add(new T.Vector3(0, 1, 0)), 14, 0xffd36b, kartVelocity(race.player));
      if (e.type === "item") {
        notify(ITEMS[e.item].icon + " " + ITEMS[e.item].name + "！", 1.3);
        if (e.item === "bolt") burst(cars[0].position.clone().add(new T.Vector3(0, 2, 0)), 25, 0xffec8c, kartVelocity(race.player));
      }
      if (e.type === "wall") {
        notify("碰到护栏，松开方向调整一下", 1.1);
        // Sparks off the wheels on the rail side.
        const side = Math.sign(race.player.lane) || 1;
        for (const w of cars[0].userData.wheels) {
          w.mesh.getWorldPosition(wheelWorld);
          for (let j = 0; j < 3; j++) spark(wheelWorld, 0xffc36b, side, kartVelocity(race.player));
        }
      }
      if (e.type === "rescue") notify("正在返回赛道…", 1.2);
      if (e.type === "hit") {
        notify("打滑啦！短暂无敌保护中", 1.7);
        cam.shake = save.reduced ? 0 : 1;
        hitFlash();
        burst(cars[0].position.clone().add(new T.Vector3(0, 1, 0)), 18, 0xffbf80, kartVelocity(race.player));
      }
      if (e.type === "block") notify("泡泡护盾挡住了攻击！", 1.8);
      if (e.type === "drift") {
        notify(["", "蓝色加速！", "橙色超级加速！", "紫色完美加速！"][e.level], 1.1);
        burst(cars[0].position, 10 + e.level * 8, DRIFT_SPARKS[e.level], kartVelocity(race.player));
      }
      if (e.type === "driftLevel") {
        // The tier changes colour with a pop of sparks from the rear wheels.
        const carry = kartVelocity(race.player);
        for (const w of cars[0].userData.wheels)
          if (!w.front) {
            w.mesh.getWorldPosition(wheelWorld);
            for (let j = 0; j < 5 + e.level * 2; j++) spark(wheelWorld, DRIFT_SPARKS[e.level], w.mesh.position.x > 0 ? 1 : -1, carry);
          }
      }
      if (e.type === "go") banner("出发！", "LET THE GOOD TIMES ROLL", 0.8);
      if (e.type === "rocketStart") banner(e.perfect ? "完美起步！" : "起步加速！", e.perfect ? "PERFECT START" : "NICE START", 1.2);
      if (e.type === "startEarly") notify("按早啦！倒计时到「1」时再按住漂移键", 1.8);
      if (e.type === "item" && e.item === "rocket") banner("🚀 火箭冲刺！", "自动驾驶 · 撞开挡路的车", 1.3);
      if (e.type === "lap" && e.lap === 3) audio.finalLap();
      if (e.type === "lap")
        banner(
          e.lap === 3 ? "最后一圈！" : "第 " + e.lap + " 圈",
          e.lap === 3 ? "把快乐留到终点线" : "NICE DRIVING",
          1.9,
        );
      if (e.type === "finish") {
        audio.finish(e.rank);
        kartMood(cars[0], "happy", 3);
        // Confetti in every colour.
        const at = cars[0].position.clone().add(new T.Vector3(0, 2.4, 0)),
          carry = kartVelocity(race.player);
        for (const col of [0xff6b6b, 0xffd166, 0x6bd6ff, 0x8affb0, 0xd38bff]) burst(at, 12, col, carry);
        banner("第 " + e.rank + " 名 · 冲线！", "等待其他伙伴抵达终点", 3);
        burst(cars[0].position.clone().add(new T.Vector3(0, 2, 0)), 70, 0xffdc7b, kartVelocity(race.player));
      }
    }
    // Feedback for what happens around the player, not only to it (V2 showed
    // nothing when the player's shell or banana hit someone).
    if (e.type === "hit" && e.owner === 0 && e.racer !== 0) landed.push(race.racers[e.racer].name);
    if (e.type === "pop" && near(e.distance, 70)) {
      const at = race.track.sample(e.distance, e.lane).p.add(new T.Vector3(0, 0.9, 0));
      burst(at, 14, 0xffe0a6, kartVelocity(race.racers.find((r) => Math.abs(r.distance - e.distance) < 0.01) || race.player));
      if (near(e.distance, 40)) audio.cue("pop");
    }
    if ((e.type === "pickup" || e.type === "boxBreak") && e.box != null) {
      const i = race.boxes.findIndex((b) => b.id === e.box);
      if (i >= 0 && near(race.boxes[i].distance, 60)) {
        // The box bursts into rainbow shards; yours flies apart bigger.
        const mine = e.racer === 0;
        shatter(pickupMeshes[i].position, mine ? 14 : 7, mine ? kartVelocity(race.player) : null);
        burst(pickupMeshes[i].position, mine ? 10 : 4, 0xffffff);
        // Someone else's pickup: the box pops and regrows at once (it is
        // still there for you; boxes are per racer).
        if (!mine) pickupMeshes[i].userData.pop = 0;
      }
    }
    if (e.type === "special") {
      const who = race.racers[e.racer],
        sp = SPECIALS[e.kind];
      if (e.racer === 0) {
        cutIn(who, sp); // (its sound plays with the player's other events above)
        burst(cars[0].position.clone().add(new T.Vector3(0, 1.6, 0)), 30, new T.Color(who.character.color).getHex(), kartVelocity(who));
      } else if (near(who.distance, 60)) {
        notify(sp.icon + " " + who.name + " · " + sp.name + "！", 1.2);
        audio.cue("specialFar");
      }
      if (e.kind === "bear" && who.chargeTarget === 0 && e.racer !== 0) notify("⚠ " + who.name + "冲过来了！快躲开", 1.6);
      if (e.kind === "nova" && e.racer !== 0 && race.meteors.some((m) => m.target === 0)) notify("☄ 流星来袭！", 1.4);
    }
    if (e.type === "meteor" && near(e.distance, 90)) {
      const at = race.track.sample(e.distance, e.lane).p.add(new T.Vector3(0, 0.6, 0));
      burst(at, 22, 0xff8a3a);
      burst(at, 10, 0xffe08a);
      if (e.racer !== 0) audio.cue("meteor");
      else cam.shake = save.reduced ? 0 : 1;
    }
    if (e.type === "coin" && e.racer !== 0 && e.coin != null) {
      const i = race.coins.findIndex((c) => c.id === e.coin);
      if (i >= 0 && near(race.coins[i].distance, 50)) coinMeshes[i].userData.pop = 0;
    }
    if (e.type === "item" && e.item === "bolt") {
      flash();
      audio.cue("zap");
    }
    if (e.type === "end") showResult();
  }
  if (landed.length) {
    notify("🎯 命中 " + (landed.length > 2 ? landed.length + " 位对手" : landed.join("、")) + "！", 1.5);
    audio.cue("score");
    kartMood(cars[0], "happy", 0.9);
  }
  race.events = [];
}
function showResult() {
  if (ended) return;
  ended = true;
  mode = "result";
  inputClear();
  show("countdown", false);
  show("banner", false);
  const p = race.player,
    rank = race.rank(),
    key = recordKey(race.track.index, race.rules),
    speedRace = race.rules === "speed",
    previous = save.records[key],
    newRecord = !previous || p.finish < previous;
  if (newRecord) save.records[key] = p.finish;
  save.races++;
  persist();
  const standings = race.standings();
  if (cup) {
    const pts = [15, 12, 10, 8, 6, 4, 2, 1];
    standings.forEach((r, i) => (cup.scores[r.id] += pts[i]));
  }
  const finalCup = cup && cup.round === 2,
    overall = cup
      ? [...race.racers].sort(
          (a, b) => cup.scores[b.id] - cup.scores[a.id] || standings.indexOf(a) - standings.indexOf(b),
        )
      : null;
  const displayRank = finalCup ? overall.findIndex((r) => r.id === 0) + 1 : rank;
  modal(
    '<div class="result-top"><span class="dialog-eyebrow">' +
      (finalCup ? "PAW CUP · FINAL RESULTS" : speedRace ? "SPEED RACE · FINISH LINE" : "FINISH LINE, HAPPY TIMES") +
      '</span><div class="trophy">' +
      (displayRank === 1 ? "🏆" : displayRank <= 3 ? "🏅" : "🏁") +
      "</div><h2>" +
      (finalCup
        ? "三站杯赛 · 第 " + displayRank + " 名！"
        : rank === 1
          ? "冠军！快乐领跑。"
          : "第 " + rank + " 名 · 跑得漂亮！") +
      "</h2><p>" +
      race.track.config.name +
      " · " +
      { easy: "50", normal: "100", hard: "150" }[save.difficulty] +
      (speedRace ? "cc · 竞速赛</p>" : "cc</p>") +
      (newRecord ? '<div class="new-record">✦ 刷新个人最佳纪录！</div>' : "") +
      '</div><div class="result-stats"><div><small>' +
      (finalCup ? "末站用时" : "完赛时间") +
      "</small><b>" +
      timeText(p.finish) +
      "</b></div><div><small>漂移加速</small><b>" +
      p.drifts +
      (speedRace
        ? " 次</b></div><div><small>氮气 · 尾流</small><b>" + p.nitroUsed + " · " + p.drafts
        : " 次</b></div><div><small>道具 · 必杀</small><b>" + p.itemsUsed + " · " + p.specialsUsed) +
      ' 次</b></div></div><table class="result-table"><tbody>' +
      (finalCup ? overall : standings)
        .map(
          (r, i) =>
            '<tr class="' +
            (r.id === 0 ? "me" : "") +
            '"><td>' +
            String(i + 1).padStart(2, "0") +
            "</td><td>" +
            r.name +
            (r.id === 0 ? " · 你" : "") +
            "</td><td>" +
            (finalCup ? cup.scores[r.id] + " 分" : r.finish !== null ? timeText(r.finish) : "未完赛") +
            "</td></tr>",
        )
        .join("") +
      "</tbody></table>" +
      (cup && !finalCup
        ? '<p class="cup-summary">你的杯赛积分：' +
          cup.scores[0] +
          " 分 · 下一站 " +
          TRACKS[cup.round + 1].name +
          "</p>"
        : "") +
      '<div class="dialog-actions sticky-actions"><button id="next-race" class="primary">' +
      (cup && !finalCup ? "下一站 · 继续争冠" : "再来一场") +
      '</button><button id="back-home" class="secondary">返回车库</button></div>',
  );
  $("back-home").onclick = goHome;
  $("next-race").onclick = () => {
    if (cup && !finalCup) {
      cup.round++;
      startRace(cup.round);
    } else {
      cup = raceMode === "cup" ? { round: 0, scores: Array(8).fill(0) } : null;
      startRace(cup ? 0 : race.track.index);
    }
  };
}
function updateHUD() {
  if (!race) return;
  const p = race.player,
    rank = race.rank();
  $("rank").textContent = rank;
  $("lap").textContent = Math.min(
    3,
    Math.max(1, Math.floor(Math.max(0, p.distance) / race.track.length) + 1),
  );
  $("race-time").textContent = timeText(p.finish ?? race.time);
  $("coins").textContent = String(p.coins).padStart(2, "0");
  $("speed").querySelector("b").textContent = Math.round(p.speed * 3.6);
  const ib = $("item-button");
  if (race.rules === "speed") {
    // Nitro: the frame fills as drifting charges it; up to two charges.
    const charges = p.nitroCharges,
      pct = charges >= NITRO_RULES.max ? 100 : Math.floor(p.nitro);
    $("item-icon").textContent = "N₂O";
    $("item-name").textContent = charges > 0 ? "喷射氮气！" : "漂移充能 " + pct + "%";
    $("item-key").textContent = "●".repeat(charges) + "○".repeat(NITRO_RULES.max - charges);
    $("item-next").textContent = charges > 1 ? "×" + charges : "";
    $("item-next").classList.toggle("on", charges > 1);
    ib.style.setProperty("--gauge", pct + "%");
    ib.classList.toggle("ready", charges > 0 && race.phase === "racing" && p.finish === null);
    ib.classList.remove("spinning");
    ib.setAttribute("aria-label", charges > 0 ? "喷射氮气，还有 " + charges + " 管" : "氮气充能 " + pct + "%");
    specialTargets = [];
  } else {
    const itemKeys = Object.keys(ITEMS),
      item = p.roulette > 0 ? itemKeys[Math.floor(clock * 14) % itemKeys.length] : p.item;
    $("item-icon").textContent = item ? ITEMS[item].icon : "?";
    $("item-name").textContent = p.roulette > 0 ? "惊喜抽取中…" : item ? ITEMS[item].name : "寻找道具箱";
    ib.classList.toggle("ready", !!p.item && p.roulette === 0);
    ib.classList.toggle("spinning", p.roulette > 0);
    const next = p.roulette2 > 0 ? itemKeys[Math.floor(clock * 14 + 3) % itemKeys.length] : p.item2;
    $("item-next").textContent = next ? ITEMS[next].icon : "";
    $("item-next").classList.toggle("on", !!next);
    ib.setAttribute("aria-label", p.item ? "使用" + ITEMS[p.item].name : "道具槽为空，寻找问号箱");
    // Special: a charge ring in the driver's colour; when full it glows,
    // locks on to what it would hit, and says so if it would be wasted.
    const sp = SPECIALS[p.character.id],
      sb = $("special-button"),
      pct = Math.floor(p.special),
      ready = p.special >= 100 && race.phase === "racing" && p.finish === null,
      wasted = ready ? race.specialWasted() : null;
    specialTargets = ready && ATTACK_SPECIALS.has(p.character.id) ? race.specialTargets() : [];
    $("special-icon").textContent = sp.icon;
    $("special-name").textContent = !ready
      ? "必杀 " + pct + "%"
      : wasted === "noTarget"
        ? "前方没人"
        : wasted === "slotsFull"
          ? "道具满了"
          : "放必杀！";
    $("special-key").textContent =
      ready && p.character.id === "bear" && !specialTargets.length ? "没目标 · 只冲刺" : sp.name + (touchLayout() ? "" : " · E");
    sb.style.setProperty("--gauge", pct + "%");
    sb.style.setProperty("--accent", p.character.color);
    sb.classList.toggle("ready", ready);
    sb.classList.toggle("blocked", !!wasted);
    sb.classList.toggle("locked", specialTargets.length > 0);
    sb.dataset.lock = specialTargets.length ? "🎯 " + specialTargets.length : "";
    sb.classList.toggle("tip", ready && !wasted && p.specialsUsed === 0 && (save.specialsTotal || 0) < 3);
    sb.setAttribute(
      "aria-label",
      !ready
        ? "必杀技充能 " + pct + "%"
        : wasted
          ? sp.name + "：" + (wasted === "noTarget" ? "前方没有对手" : "道具槽已满")
          : "释放必杀技：" + sp.name + (specialTargets.length ? "，锁定 " + specialTargets.length + " 位对手" : ""),
    );
  }
  const fill = $("drift-fill");
  const level = driftLevel(p.drift);
  fill.style.width = Math.min(100, (p.drift / DRIFT.levels[3]) * 100) + "%";
  fill.style.background = DRIFT_COLOURS[level];
  fill.style.boxShadow = "0 0 9px " + DRIFT_COLOURS[level];
  const speedRace = race.rules === "speed";
  $("drift-label").textContent =
    level > 0
      ? (p.driftAuto || save.autoDrift ? "松开方向！" : "松手！") + "释放" + ["", "蓝色", "橙色超级", "紫色完美"][level] + "加速"
      : p.drifting
        ? speedRace
          ? "保持住，漂移越久氮气攒得越多"
          : "保持住，火花变色就能加速"
        : touchLayout()
          ? save.autoDrift
            ? speedRace
              ? "进弯按住方向漂移 · 漂移攒氮气"
              : "进弯按住方向就会漂移 · 按着保持 · 松开加速"
            : speedRace
              ? "转向时按住漂移键 · 漂移攒氮气"
              : "转向时按住漂移键 · 松手加速"
          : speedRace
            ? "按住 Shift 转向漂移 · 漂移攒氮气"
            : "按住 Shift 转向漂移 · 松手加速";
  const incoming = race.projectiles.some(
    (x) => x.target === 0 && race.gap(p.distance, x.distance) > 0 && race.gap(p.distance, x.distance) < 45,
  );
  const effect =
    p.rescue > 0
      ? "正在返回赛道…"
      : p.rocket > 0
        ? "🚀 火箭冲刺 " + p.rocket.toFixed(1) + "s"
      : incoming
        ? "⚠ 追踪红壳接近！"
        : p.star > 0
          ? "⭐ 无敌 " + p.star.toFixed(1) + "s"
          : p.shield > 0
            ? "🫧 护盾 " + p.shield.toFixed(1) + "s"
            : p.boost > 0
              ? (p.boostKind === "nitro" ? "🔥 氮气 " : p.boostKind === "draft" ? "💨 尾流加速 " : "✦ 冲刺 ") +
                p.boost.toFixed(1) +
                "s"
              : p.stun > 0
                ? "正在恢复…"
                : p.small > 0
                  ? "⚡ 缩小 " + p.small.toFixed(1) + "s"
                  : p.draft > 0.25
                    ? "💨 吸尾流中… " + Math.min(100, Math.round((p.draft / DRAFT.charge) * 100)) + "%"
                    : "";
  show("status-effect", !!effect);
  $("status-effect").textContent = effect;
  const lines = $("speed-lines");
  // Tucked into a slipstream: faint wind streaks build up before the pull.
  const drafting = p.draft > 0.3 && p.boost <= 0;
  lines.classList.toggle("active", !save.reduced && (p.boost > 0 || p.star > 0 || p.rocket > 0 || drafting));
  lines.classList.toggle("strong", !save.reduced && (p.rocket > 0 || (p.boost > 0 && /drift3|item|rocket|nitro/.test(p.boostKind))));
  lines.dataset.kind = p.rocket > 0 ? "rocket" : p.star > 0 ? "star" : drafting ? "draft" : p.boostKind || "";
  // Overtakes, MK style: the position number pops and a cue plays.
  if (race.phase === "racing" && p.finish === null && lastRank && rank !== lastRank) {
    const el = $("rank").parentElement;
    el.classList.remove("up", "down");
    void el.offsetWidth;
    el.classList.add(rank < lastRank ? "up" : "down");
    if (rank < lastRank && clock - lastPassCue > 0.6) {
      lastPassCue = clock;
      audio.cue("pass");
      kartMood(cars[0], "happy", 0.8);
      if (rank <= 3 || lastRank - rank > 1) notify("超越！第 " + rank + " 名", 1);
    } else if (rank > lastRank) {
      // Whoever just passed us glances back with a grin.
      const by = race.standings()[rank - 2];
      if (by && by.id !== 0) kartMood(cars[by.id], "happy", 0.8);
    }
  }
  lastRank = rank;
  const sorted = race.standings();
  $("ranking").innerHTML = sorted
    .map(
      (r, i) =>
        '<div class="' +
        (r.id === 0 ? "me" : "") +
        '"><b>' +
        String(i + 1).padStart(2, "0") +
        '</b><i style="background:' +
        r.character.color +
        '"></i><span>' +
        r.character.name +
        "</span><small>" +
        (r.id === 0 ? "你" : r.finish !== null ? "✓" : "") +
        "</small></div>",
    )
    .join("");
  updateProgress();
  updateRadar();
  $("hud").dataset.phase = race.phase;
  $("hud").dataset.drifting = p.drifting ? String(level) : "";
  $("hud").dataset.distance = p.distance.toFixed(1);
  $("hud").dataset.drift = p.drift.toFixed(2);
  $("hud").dataset.item = p.item || "";
  $("hud").dataset.lane = p.lane.toFixed(3);
  $("hud").dataset.steer = p.steer.toFixed(3);
  $("hud").dataset.itemsUsed = String(p.itemsUsed);
  $("hud").dataset.drifts = String(p.drifts);
}
// Map panel (top-right): the track, its chequered finish line and direction
// arrows, every racer in their colour (the ones near you outlined), red rings
// on whoever the special would hit, and you as an arrow. Drawn in a fixed
// 220 x 250 space scaled to the canvas's real pixels, so it stays sharp.
const MAP_W = 220,
  MAP_H = 250;
let mapCache = null,
  mapTimer = 0,
  minimapFitted = false;
function fitMinimap() {
  const c = $("minimap"),
    box = c.getBoundingClientRect();
  if (!box.width) return;
  minimapFitted = true;
  const ratio = clamp(devicePixelRatio || 1, 1, 3),
    w = Math.round(box.width * ratio),
    h = Math.round(box.height * ratio);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
}
addEventListener("resize", () => race && fitMinimap());
const heading = (d) => {
  const [ax, ay] = mapCache.point(race.track.sample(d).p),
    [bx, by] = mapCache.point(race.track.sample(d + 4).p);
  return Math.atan2(by - ay, bx - ax);
};
function drawMap() {
  if (!minimapFitted) fitMinimap(); // e.g. the race began in a background tab
  const c = $("minimap"),
    ctx = c.getContext("2d");
  if (!mapCache || mapCache.track !== race.track) {
    const pts = race.track.points,
      xs = pts.map((p) => p.x),
      zs = pts.map((p) => p.z),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs),
      pad = 17,
      scale = Math.min((MAP_W - pad * 2) / (maxX - minX), (MAP_H - pad * 2) / (maxZ - minZ)),
      tx = MAP_W / 2 - ((maxX + minX) / 2) * scale,
      tz = MAP_H / 2 - ((maxZ + minZ) / 2) * scale,
      point = (p) => [tx + p.x * scale, tz + p.z * scale],
      outline = new Path2D();
    pts.forEach((p, i) => {
      const [x, y] = point(p);
      i ? outline.lineTo(x, y) : outline.moveTo(x, y);
    });
    outline.closePath();
    mapCache = { track: race.track, point };
    mapCache.outline = outline;
    mapCache.finish = [...point(race.track.sample(0).p), heading(0)];
    mapCache.arrows = [0.16, 0.5, 0.83].map((f) => {
      const d = f * race.track.length;
      return [...point(race.track.sample(d).p), heading(d)];
    });
  }
  // The road, arrows and finish line never change in a race: draw them once
  // per canvas size into a layer, then copy it each frame.
  if (!mapCache.layer || mapCache.layer.width !== c.width || mapCache.layer.height !== c.height) {
    mapCache.layer = document.createElement("canvas");
    mapCache.layer.width = c.width;
    mapCache.layer.height = c.height;
    drawMapLayer(mapCache.layer.getContext("2d"), c.width, c.height);
  }
  const { point } = mapCache;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(mapCache.layer, 0, 0);
  ctx.setTransform(c.width / MAP_W, 0, 0, c.height / MAP_H, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawRacersOnMap(ctx, point);
}
function drawMapLayer(ctx, w, h) {
  const { outline, finish, arrows } = mapCache;
  ctx.setTransform(w / MAP_W, 0, 0, h / MAP_H, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#0f241dcc";
  ctx.lineWidth = 13;
  ctx.stroke(outline);
  ctx.strokeStyle = "#f7f2df";
  ctx.lineWidth = 8;
  ctx.stroke(outline);
  // Direction of travel.
  ctx.strokeStyle = "#5d8a70";
  ctx.lineWidth = 2;
  for (const [x, y, a] of arrows) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-2.2, -2.8);
    ctx.lineTo(1.6, 0);
    ctx.lineTo(-2.2, 2.8);
    ctx.stroke();
    ctx.restore();
  }
  // Chequered finish line across the road.
  ctx.save();
  ctx.translate(finish[0], finish[1]);
  ctx.rotate(finish[2]);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#1b1b1b" : "#ffffff";
      ctx.fillRect(-3 + j * 3, -6 + i * 3, 3, 3);
    }
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3, -6, 6, 12);
  ctx.restore();
}
function drawRacersOnMap(ctx, point) {
  // Rivals, far ones first; within 30 m of you they are bigger and outlined.
  const p = race.player,
    rivals = race.racers
      .filter((r) => r.id !== 0)
      .map((r) => ({ r, g: Math.abs(race.gap(r.distance, p.distance)) }))
      .sort((a, b) => b.g - a.g);
  for (const { r, g } of rivals) {
    const [x, y] = point(race.track.sample(r.distance, r.lane * 0.4).p),
      close = g < 30 && r.finish === null && p.finish === null;
    ctx.beginPath();
    ctx.arc(x, y, close ? 6.6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = r.character.color;
    ctx.fill();
    ctx.lineWidth = close ? 2.6 : 1.4;
    ctx.strokeStyle = close ? "#ffffff" : "#ffffffcc";
    ctx.stroke();
    if (specialTargets.includes(r.id)) {
      const rr = 10.5 + Math.sin(clock * 10) * 1.3;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff3b3b";
      ctx.lineWidth = 2.6;
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (rr - 1), y + Math.sin(a) * (rr - 1));
        ctx.lineTo(x + Math.cos(a) * (rr + 4), y + Math.sin(a) * (rr + 4));
        ctx.stroke();
      }
    }
  }
  // You: an arrow pointing the way you are going, with a soft glow.
  const [px, py] = point(race.track.sample(p.distance, p.lane * 0.4).p);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(heading(p.distance));
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff2a84d";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9.5, 0);
  ctx.lineTo(-6.5, -7);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6.5, 7);
  ctx.closePath();
  ctx.fillStyle = "#fff2a8";
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#24413a";
  ctx.stroke();
  ctx.restore();
}
// Progress over the whole race for everyone, and the distance still to go.
function updateProgress() {
  const p = race.player,
    total = race.laps * race.track.length;
  race.racers.forEach((r, i) => {
    const f = r.finish !== null ? 1 : clamp(r.distance / total, 0, 1);
    if (progressDots[i]) progressDots[i].style.left = (f * 100).toFixed(2) + "%";
  });
  $("progress").style.setProperty("--me", (clamp(p.distance / total, 0, 1) * 100).toFixed(2) + "%");
  const left = Math.max(0, total - Math.max(0, p.distance));
  $("to-finish").textContent =
    p.finish !== null
      ? "🏁 已冲线"
      : "距终点 " + (left >= 1000 ? (left / 1000).toFixed(2) + " km" : Math.ceil(left) + " m");
}
// Rear radar: karts closing in from behind (within 25 m), placed left or right
// by which side of you they are on, nearest first.
const RADAR_RANGE = 25;
function updateRadar() {
  const p = race.player,
    el = $("radar");
  const behind =
    p.finish !== null || race.phase !== "racing"
      ? []
      : race.racers
          .filter((o) => o.id !== 0 && o.finish === null && o.rescue <= 0)
          .map((o) => ({ o, g: race.gap(p.distance, o.distance) }))
          .filter((x) => x.g > 1 && x.g < RADAR_RANGE)
          .sort((a, b) => a.g - b.g)
          .slice(0, 3);
  while (el.children.length < behind.length) el.append(document.createElement("b"));
  const placed = [];
  [...el.children].forEach((chip, i) => {
    const t = behind[i];
    chip.hidden = !t;
    if (!t) return;
    const x = 50 + clamp((t.o.lane - p.lane) / 8, -1, 1) * 42,
      // Two karts on the same side: stack the farther one above.
      row = placed.filter((q) => Math.abs(q - x) < 14).length;
    placed.push(x);
    chip.style.left = x.toFixed(1) + "%";
    chip.style.bottom = row * 26 + "px";
    chip.style.setProperty("--c", t.o.character.color);
    chip.style.opacity = (0.55 + 0.45 * (1 - t.g / RADAR_RANGE)).toFixed(2);
    chip.classList.toggle("close", t.g < 8);
    chip.textContent = Math.round(t.g) + "m";
    chip.dataset.racer = t.o.id;
  });
  el.dataset.count = behind.length;
}
// ---------------------------------------------------------------------------
// Race rendering
// ---------------------------------------------------------------------------
// Physics runs at a fixed 60 Hz while the display runs at whatever the phone
// gives (60/120 Hz, or less when busy). V2 drew the latest physics state
// directly, so on uneven frames karts advanced 0, 1 or 2 steps per frame and
// visibly stuttered. We draw the state interpolated between the last two
// steps instead (alpha = leftover time / step), which keeps motion smooth at
// any frame rate.
const STEP = 1 / 60;
let prevState = [],
  renderAlpha = 1;
function snapshot() {
  prevState = race.racers.map((r) => ({ d: r.distance, l: r.lane }));
}
function shown(r, i) {
  const a = prevState[i];
  // Rescues and other deliberate teleports are drawn as they are.
  if (!a || Math.abs(r.distance - a.d) > 6 || Math.abs(r.lane - a.l) > 2.5) return { d: r.distance, l: r.lane };
  return { d: a.d + (r.distance - a.d) * renderAlpha, l: a.l + (r.lane - a.l) * renderAlpha };
}
// Chase camera, KartRider style: anchored to the kart, not lagging behind it.
// V2 lerped the camera's world position toward a point on the track, so the
// camera fell further back as speed rose (about 6.6 m extra during a boost),
// letting other karts end up between camera and player at full size.
const cam = {
    ready: false,
    heading: 0,
    lane: 0,
    y: 0,
    back: 0,
    height: 0,
    fov: 57,
    orbit: 0,
    swing: 0,
    // Boost punch (FOV / distance bump) and hit shake, also interpolated.
    punch: 0,
    pf: 0,
    pb: 0,
    shake: 0,
    sx: 0,
    sy: 0,
    wasBoost: false,
  },
  camPrev = { ...cam };
function camStep(dt) {
  const p = race.player,
    s = race.track.sample(p.distance, p.lane),
    portrait = innerHeight > innerWidth,
    finished = p.finish !== null,
    boostOn = (p.boost > 0 || p.star > 0 || p.rocket > 0) && p.rescue <= 0,
    boost = !save.reduced && boostOn,
    // Heading follows the track tangent plus part of the kart's own slip and
    // drift angle, so the camera swings gently into drifts like KartRider.
    swing =
      Math.atan2(p.lateral, Math.max(8, p.speed)) * 0.9 +
      (p.drifting && p.speed > 10 ? (p.driftDirection || 1) * 0.42 : 0);
  const back = (portrait ? 8.4 : 7.0) + (boost ? 0.6 : 0) + Math.min(1, p.speed / 46) * 0.35,
    height = (portrait ? 4.1 : 3.2) + (boost ? -0.12 : 0),
    fov = (portrait ? 66 : 58) + (boost ? (p.rocket > 0 ? 11 : 7) : 0) + Math.min(1, p.speed / 46) * 2;
  if (!cam.ready || !cameraReady) {
    Object.assign(cam, {
      ready: true,
      heading: s.yaw,
      lane: p.lane,
      y: s.p.y,
      back,
      height,
      fov,
      orbit: 0,
      swing: 0,
      punch: 0,
      pf: 0,
      pb: 0,
      shake: 0,
      sx: 0,
      sy: 0,
      wasBoost: boostOn,
    });
    Object.assign(camPrev, cam);
    cameraReady = true;
    return;
  }
  Object.assign(camPrev, cam);
  cam.swing = easeTo(cam.swing, swing, 6, dt);
  cam.heading = angleTo(cam.heading, s.yaw - cam.swing * 0.45, 5.5, dt);
  cam.lane = easeTo(cam.lane, p.lane, 9, dt);
  cam.y = easeTo(cam.y, s.p.y, 7, dt);
  cam.back = easeTo(cam.back, back, boost ? 3.5 : 2.2, dt);
  cam.height = easeTo(cam.height, height, 3, dt);
  cam.fov = easeTo(cam.fov, fov, boost ? 4 : 2.5, dt);
  cam.orbit = angleTo(cam.orbit, finished ? Math.PI * 0.92 : 0, 1.1, dt);
  // Boost punch: when a boost fires, the view widens and pulls back for a
  // moment (a half sine over 0.55 s, so it starts and ends smoothly) — the
  // "push in the back" that sells a mini-turbo.
  if (boostOn && !cam.wasBoost && !save.reduced) cam.punch = 1e-6;
  cam.wasBoost = boostOn;
  if (cam.punch > 0) cam.punch = cam.punch + dt > 0.55 ? 0 : cam.punch + dt;
  const k = cam.punch > 0 ? Math.sin((Math.PI * cam.punch) / 0.55) : 0,
    big = p.rocket > 0 || p.boostKind === "drift3" || p.boostKind === "item" ? 1.35 : 1;
  cam.pf = k * 6 * big;
  cam.pb = k * 0.75 * big;
  // Hit shake: short and decaying, computed per physics step.
  if (cam.shake > 0) {
    cam.shake = Math.max(0, cam.shake - dt / 0.45);
    const t = (1 - cam.shake) * 0.45,
      a = cam.shake * cam.shake * 0.2;
    cam.sx = Math.sin(t * 61) * a;
    cam.sy = Math.cos(t * 47) * a * 0.7;
  } else cam.sx = cam.sy = 0;
}
// Ease-out with a small overshoot, for things that pop into view.
const backOut = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const camTarget = new T.Vector3(),
  camAim = new T.Vector3(),
  camFwd = new T.Vector3();
const easeTo = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-dt * rate));
const angleTo = (current, target, rate, dt) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * (1 - Math.exp(-dt * rate));
const nitroLight = new T.PointLight(0x38c4ff, 0, 7, 1.6);
scene.add(nitroLight);
let lastPlayerBoost = false;
const wheelWorld = new T.Vector3(),
  sparkVelocity = new T.Vector3();
function spark(at, colour, side, carry) {
  if (particles.length >= 140) return;
  sparkVelocity.set((Math.random() - 0.5) * 2.5 + side * 1.5, 1.2 + Math.random() * 2.2, (Math.random() - 0.5) * 2.5);
  if (carry) sparkVelocity.add(carry);
  particles.push({ p: at.clone(), v: sparkVelocity.clone(), life: 0.22 + Math.random() * 0.2, max: 1, size: 0.05 + Math.random() * 0.05, color: colour });
}
// Which side a rival is on when one is right alongside (-1 left .. 1 right),
// so drivers glance at each other while racing wheel to wheel.
function rivalSide(r) {
  let best = 0,
    bestGap = 4.5;
  for (const o of race.racers) {
    if (o === r || o.finish !== null) continue;
    const g = Math.abs(race.gap(o.distance, r.distance)),
      side = o.lane - r.lane;
    if (g < bestGap && Math.abs(side) < 4 && Math.abs(side) > 0.6) {
      bestGap = g;
      best = Math.sign(side) * (1 - g / 4.5);
    }
  }
  return best;
}
function renderRace(dt) {
  const p = race.player;
  race.racers.forEach((r, i) => {
    const at = shown(r, i),
      s = race.track.sample(at.d, at.l),
      k = cars[i];
    k.position.copy(s.p);
    k.position.y +=
      0.08 +
      (r.rescue > 0 ? Math.sin((r.rescue / 1.1) * Math.PI) * 2 : 0) +
      (r.jump > 0 ? Math.sin((1 - r.jump / 1.6) * Math.PI) * 2.6 : 0); // bunny's big hop
    k.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
    // Invincibility blink, as before; karts are never hidden for being close.
    k.visible = r.id === 0 || (r.invincible > 0 && r.star <= 0 && r.stun <= 0 ? Math.floor(clock * 10) % 5 !== 0 : true);
    animateKart(k, clock + i, r, dt, false, { curve: race.track.curvature(at.d), camera, look: rivalSide(r) });
    // Grass / sand thrown up when a kart runs wide off the road.
    if (dt > 0 && Math.abs(r.lane) > race.track.width / 2 - 0.2 && r.speed > 8 && k.position.distanceToSquared(camera.position) < 700)
      for (const w of k.userData.wheels)
        if (!w.front && Math.random() < dt * 14) {
          w.mesh.getWorldPosition(wheelWorld);
          wheelWorld.y = s.p.y + 0.15;
          spark(wheelWorld, race.track.index === 1 ? 0xf3d9c4 : race.track.index === 2 ? 0x8a93c8 : 0x9bc46e, 0, s.t.clone().multiplyScalar(r.speed * 0.7));
        }
    // Drift sparks from the rear wheels, coloured by charge.
    if (dt > 0 && r.drifting && r.speed > 14 && k.position.distanceToSquared(camera.position) < 900) {
      const level = driftLevel(r.drift),
        colour = DRIFT_SPARKS[level];
      for (const w of k.userData.wheels)
        if (!w.front && Math.random() < dt * (r.id === 0 ? 40 : 12) * (0.35 + level * 0.45)) {
          w.mesh.getWorldPosition(wheelWorld);
          wheelWorld.y = s.p.y + 0.12;
          spark(wheelWorld, colour, w.mesh.position.x > 0 ? 1 : -1, s.t.clone().multiplyScalar(r.speed * 0.9));
        }
    }
  });
  // Player boost: ignition burst, exhaust light, whoosh.
  const playerKart = cars[0],
    boosting = (p.boost > 0 || p.star > 0 || p.rocket > 0) && p.rescue <= 0;
  if (boosting && !lastPlayerBoost && dt > 0) {
    if (p.boostKind !== "nitro" && p.boostKind !== "draft") audio.cue("boost"); // those have their own cues
    const carry = kartVelocity(p),
      colour = NITRO[p.star > 0 ? "star" : p.boostKind || "item"].outer;
    for (const f of playerKart.userData.exhaust) {
      f.nozzle.getWorldPosition(wheelWorld);
      for (let j = 0; j < 5; j++) spark(wheelWorld, colour, f.nozzle.position.x > 0 ? 1 : -1, carry);
    }
  }
  lastPlayerBoost = boosting;
  const nitro = playerKart.userData.vis.nitro;
  nitroLight.visible = !renderer.software;
  nitroLight.intensity = nitro * 4.5;
  if (nitro > 0.01) {
    playerKart.userData.exhaust[0].nozzle.getWorldPosition(nitroLight.position);
    nitroLight.position.lerp(playerKart.userData.exhaust[1].nozzle.getWorldPosition(wheelWorld), 0.5);
    nitroLight.color.setHex(NITRO[playerKart.userData.vis.kind]?.outer || 0x38c4ff);
  }
  // Lock-on reticles over the karts the player's special would hit.
  targetMarks.forEach((m, i) => {
    const id = specialTargets[i],
      k = id !== undefined ? cars[id] : null;
    m.visible = !!k && mode !== "result";
    if (!m.visible) return;
    m.position.copy(k.position);
    const far = k.position.distanceTo(camera.position);
    m.position.y += 3 + Math.sin(clock * 6 + i) * 0.15;
    m.quaternion.copy(camera.quaternion);
    m.scale.setScalar(clamp(far / 22, 0.8, 4.5));
    m.userData.reticle.rotation.z = clock * 2.2;
  });
  // Boxes and coins are per racer: what you see is what you can still take.
  // One you just took regrows when it respawns for you; one another kart
  // took pops and regrows at once (it is still yours to take).
  pickupMeshes.forEach((m, i) => {
    const b = race.boxes[i],
      u = m.userData,
      mine = b.cooldown <= 0 && !(b.taken[0] > 0);
    if (mine && u.mine === false) u.pop = 0;
    u.mine = mine;
    if (dt > 0) u.pop = Math.min(1, (u.pop ?? 1) + dt * 2.4);
    const grow = mine ? backOut(u.pop) : 0;
    m.visible = grow > 0.02;
    m.scale.setScalar(m.visible ? grow : 0);
    m.rotation.y = clock * 0.8 + i;
    m.rotation.z = Math.sin(clock * 1.3 + i) * 0.12;
    m.position.y = u.baseY + Math.sin(clock * 2 + i) * 0.15;
    m.updateMatrix();
    boxField.set(i, m.matrix);
  });
  boxField.commit();
  updateBoxShimmer(clock);
  coinMeshes.forEach((m, i) => {
    const c = race.coins[i],
      u = m.userData,
      mine = c.cooldown <= 0 && !(c.taken[0] > 0);
    if (mine && u.mine === false) u.pop = 0;
    u.mine = mine;
    if (dt > 0) u.pop = Math.min(1, (u.pop ?? 1) + dt * 3);
    const grow = mine ? backOut(u.pop) : 0;
    m.visible = grow > 0.02;
    m.scale.setScalar(m.visible ? grow : 0);
    m.rotation.y = clock * 2 + i;
    m.updateMatrix();
    coins.set(i, m.matrix);
  });
  coins.commit();
  const live = new Set();
  for (const item of [
    ...race.hazards.map((x) => ({ ...x, type: "banana" })),
    ...race.projectiles.map((x) => ({ ...x, type: x.kind === "fire" ? "fire" : "shell" })),
  ]) {
    live.add(item.id);
    let mesh = dynamicMeshes.get(item.id);
    if (!mesh) {
      mesh = item.type === "banana" ? makeBanana() : item.type === "fire" ? makeFireball() : makeShell();
      dynamicMeshes.set(item.id, mesh);
      raceGroup.add(mesh);
    }
    mesh.position.copy(race.track.sample(item.distance, item.lane).p);
    mesh.position.y += item.type === "fire" ? 0.75 + Math.abs(Math.sin(clock * 9 + item.id)) * 0.6 : 0.12;
    mesh.rotation.y = clock * (item.type === "banana" ? 1 : 8);
    if (item.type === "fire" && dt > 0 && Math.random() < dt * 30) spark(mesh.position, Math.random() < 0.5 ? 0xff7a1a : 0xffd65a, 0, null);
  }
  // Meteors: a warning ring on the target, the rock falling onto it.
  for (const m of race.meteors) {
    const t = race.racers[m.target];
    if (!t) continue;
    live.add(m.id);
    let mesh = dynamicMeshes.get(m.id);
    if (!mesh) {
      mesh = makeMeteor();
      dynamicMeshes.set(m.id, mesh);
      raceGroup.add(mesh);
    }
    const at = shown(t, m.target),
      p0 = race.track.sample(at.d, at.l).p;
    mesh.position.copy(p0);
    mesh.userData.ring.position.y = 0.1;
    mesh.userData.rock.position.set(0, 1 + m.t * 34, -m.t * 10);
    mesh.userData.ring.scale.setScalar(1.6 + Math.sin(clock * 12) * 0.15);
    if (dt > 0 && Math.random() < dt * 40) {
      mesh.userData.rock.getWorldPosition(wheelWorld);
      spark(wheelWorld, 0xff9a3a, 0, null);
    }
  }
  for (const [id, m] of dynamicMeshes)
    if (!live.has(id)) {
      raceGroup.remove(m);
      dynamicMeshes.delete(id);
    }
  world.moving.forEach((o) => {
    if (o.type === "mill") o.mesh.rotation.z = clock * 0.22;
    else if (o.type === "halo") o.mesh.rotation.y = clock * 0.3;
    else if (o.type === "balloon") {
      o.mesh.position.y = o.y + Math.sin(clock * 1.1 + o.phase) * 0.45;
      o.mesh.rotation.z = Math.sin(clock * 0.9 + o.phase) * 0.08;
    }
  });
  // --- Camera ---------------------------------------------------------------
  // Smoothed in the fixed physics step (camStep) and interpolated here, so the
  // amount of smoothing lag cannot wobble with uneven frame times.
  const a = renderAlpha,
    mix = (k) => camPrev[k] + (cam[k] - camPrev[k]) * a,
    mixAngle = (k) => camPrev[k] + Math.atan2(Math.sin(cam[k] - camPrev[k]), Math.cos(cam[k] - camPrev[k])) * a;
  const at = shown(p, 0),
    lane = mix("lane"),
    anchor = race.track.sample(at.d, lane).p,
    yaw = mixAngle("heading") + mixAngle("orbit"),
    finished = p.finish !== null,
    s = race.track.sample(at.d, at.l);
  camFwd.set(Math.sin(yaw), 0, Math.cos(yaw));
  camTarget.copy(anchor).addScaledVector(camFwd, -(mix("back") + mix("pb")));
  camTarget.y = mix("y") + mix("height") + mix("sy");
  camTarget.x += Math.cos(yaw) * mix("sx");
  camTarget.z -= Math.sin(yaw) * mix("sx");
  camAim.copy(anchor).addScaledVector(camFwd, finished ? 0 : 6.5);
  camAim.y = mix("y") + (finished ? 1.3 : 1.25);
  camera.position.copy(camTarget);
  camera.lookAt(camAim);
  camera.fov = mix("fov") + mix("pf");
  camera.updateProjectionMatrix();
  world.sky.position.copy(camera.position);
  // --- Near-camera fade -----------------------------------------------------
  // Instead of V2's hide-then-pop (karts 0.8–11 m behind the player were made
  // invisible, then reappeared beside you), a kart fades only while it is
  // right in front of the lens or covering the player, and back in smoothly.
  const playerScreen = playerKart.position.clone().project(camera),
    playerDistance = playerKart.position.distanceTo(camera.position);
  for (let i = 1; i < cars.length; i++) {
    const k = cars[i],
      dist = k.position.distanceTo(camera.position);
    let target = clamp((dist - 2.2) / 2.6, 0, 1);
    if (dist < playerDistance - 0.5) {
      const q = k.position.clone().project(camera);
      if (Math.hypot(q.x - playerScreen.x, (q.y - playerScreen.y) * 0.8) < 0.22) target = Math.min(target, 0.45);
    }
    const now = k.userData.fade ?? 1,
      next = dt > 0 ? easeTo(now, target, 10, dt) : now;
    if (renderer.software) {
      // CPU renderer: no dissolve, so hide below half. Keep the eased value
      // (V2.2 recomputed it from 1 every frame, so a kart flickered with the
      // frame time instead of fading once).
      k.userData.fade = next;
      k.visible = k.visible && next > 0.5;
    } else setKartFade(k, next);
  }
  sun.position.copy(s.p).add(new T.Vector3(-22, 46, 24));
  sun.target.position.copy(s.p);
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000,
    dt = Math.min(0.25, Math.max(0, raw));
  last = now;
  if (mode !== "paused") clock += dt;
  // Auto quality: judge only steady racing (one-off stalls such as loading or
  // shader compilation are ignored) and drop to "low" after two slow windows
  // in a row, so a single hitch at the start cannot cost the whole session.
  if (mode === "race" && resumeTimer <= 0 && race?.phase === "racing" && raw < 0.25) {
    fpsFrames++;
    fpsTime += raw;
  }
  if (fpsTime > 4) {
    slowWindows = fpsFrames / fpsTime < 26 ? slowWindows + 1 : 0;
    if (slowWindows >= 2 && save.quality === "auto" && !adaptiveLow) {
      adaptiveLow = true;
      quality();
    }
    fpsFrames = 0;
    fpsTime = 0;
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) {
      $("toast").classList.remove("show");
      $("toast").textContent = "";
    }
  }
  if (bannerTimer > 0 && mode !== "paused") {
    bannerTimer -= dt;
    if (bannerTimer <= 0) show("banner", false);
  }
  if (mode === "home") {
    camera.fov = 40;
    const mobile = innerWidth <= 900 && innerHeight > 520,
      landscape = innerHeight <= 520;
    lobby.backdrop.visible = !mobile;
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      -innerWidth * (mobile ? 0.04 : landscape ? -0.02 : 0.17),
      innerHeight * (mobile ? 0.105 : landscape ? 0.03 : 0.1),
      innerWidth,
      innerHeight,
    );
    camera.position.set(mobile ? 8 : 6.5, mobile ? 5.2 : 4.4, mobile ? 13 : 9.5);
    camera.lookAt(0, 1.05, 0);
    selected.rotation.y = orbit + (!drag ? Math.sin(clock * 0.4) * 0.035 : 0);
    animateKart(selected, clock, null, dt, true);
    lobby.moving.rotation.z = clock * 0.18;
  } else if (race) {
    if (mode === "race") {
      if (resumeTimer > 0) {
        resumeTimer -= dt;
        $("countdown").textContent = Math.max(1, Math.ceil(resumeTimer));
        if (resumeTimer <= 0) show("countdown", false);
      } else {
        accum += dt;
        let steps = 0;
        while (accum >= STEP && steps < 15 && mode === "race") {
          snapshot();
          race.step(STEP, getInput());
          camStep(STEP);
          processEvents();
          accum -= STEP;
          steps++;
        }
        if (accum > STEP) accum = STEP; // after a long stall, do not try to catch up
        renderAlpha = clamp(accum / STEP, 0, 1);
        if (race.phase === "countdown") {
          const count = Math.min(3, Math.ceil(race.countdown));
          $("countdown").textContent = count;
          show("countdown", true);
          if (count !== lastCount) {
            audio.cue("tick");
            lastCount = count;
          }
        } else {
          lastCount = -1; // the "go" event shows the banner (see processEvents)
          show("countdown", false);
        }
      }
    }
    renderRace(mode === "paused" || resumeTimer > 0 ? 0 : dt);
    mapTimer += dt;
    if (mapTimer >= 1 / 30) {
      drawMap();
      mapTimer = 0;
    }
    uiTimer += dt;
    if (uiTimer > 0.1) {
      updateHUD();
      uiTimer = 0;
    }
  }
  particleUpdate(mode === "paused" ? 0 : dt);
  shardUpdate(mode === "paused" ? 0 : dt);
  const pl = race?.player;
  audio.update(pl?.speed || 0, mode === "race" && race.phase === "racing" && resumeTimer <= 0, {
    boost: !!pl && (pl.boost > 0 || pl.star > 0 || pl.rocket > 0),
    drift: pl?.drifting && pl.finish === null ? driftLevel(pl.drift) : -1,
    paused: mode === "paused",
  });
  renderer.render(scene, camera);
}
// Garage music starts with the first tap or key press (browsers only allow
// sound after a user gesture).
audio.menu();
const firstGesture = () => {
  audio.unlock();
  for (const type of ["pointerup", "touchend", "keydown"]) removeEventListener(type, firstGesture, true);
};
for (const type of ["pointerup", "touchend", "keydown"]) addEventListener(type, firstGesture, true);
show("loading", false);
$("start").disabled = false;
document.documentElement.dataset.ready = "true";
requestAnimationFrame(frame);
$("scene").addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  if (mode === "race") pause();
  notify("画面连接暂时中断，正在恢复…", 7);
});
$("scene").addEventListener("webglcontextrestored", () => {
  quality();
  notify("画面已恢复，可继续比赛");
});
