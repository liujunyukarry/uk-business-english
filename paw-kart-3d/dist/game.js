import * as T from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { Race, Track, TRACKS, CHARACTERS, ITEMS, clamp } from "./race.js";
import {
  createKart,
  animateKart,
  createWorld,
  createLobby,
  makeItemBox,
  makeCoin,
  makeBanana,
  makeShell,
  setKartFade,
  setCompatibilityMode,
  NITRO,
  box,
  mat,
  label,
} from "./art.js";
import { KartAudio } from "./audio.js";
import { bindTouchControls, CONTROLS } from "./input.js";
import { SoftwareRenderer } from "./software-renderer.js";
const $ = (id) => document.getElementById(id),
  show = (id, on) => $(id).classList.toggle("hidden", !on),
  KEY = "paw-kart-v1";
const defaults = {
  character: "gold",
  track: 0,
  difficulty: "normal",
  assist: true,
  autoGas: true,
  muted: false,
  volume: 0.45,
  quality: "auto",
  reduced: matchMedia("(prefers-reduced-motion:reduce)").matches,
  records: {},
  races: 0,
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
  dynamicMeshes = new Map(),
  mode = "home",
  raceMode = "single",
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
  $("start-copy").textContent =
    raceMode === "cup" ? "出发 · 挑战三站冠军" : "出发 · " + TRACKS[save.track].name;
  const rec = save.records[save.track + "-" + save.difficulty];
  $("record").textContent =
    raceMode === "cup"
      ? "三条赛道 · 积分争冠"
      : rec
        ? "个人最佳 " + timeText(rec)
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
        raceMode = b.dataset.mode;
        document.querySelectorAll("[data-mode]").forEach((x) => {
          x.classList.toggle("active", x === b);
          x.setAttribute("aria-pressed", String(x === b));
        });
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
    dummy.scale.setScalar(p.size * Math.min(1, p.life * 4));
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
  race = new Race({ track: trackIndex, character: save.character, difficulty: save.difficulty });
  snapshot();
  renderAlpha = 1;
  cam.ready = false;
  camStep(STEP);
  lastPlayerBoost = false;
  world = createWorld(race.track);
  scene.add(world.group);
  raceGroup = new T.Group();
  scene.add(raceGroup);
  cars = race.racers.map((r) => {
    const k = kart("race-" + r.id + "-" + r.character.id, r.character.id, r.id + 1);
    raceGroup.add(k);
    return k;
  });
  pickupMeshes = race.boxes.map((b) => {
    const mesh = makeItemBox(),
      s = race.track.sample(b.distance, b.lane);
    mesh.position.copy(s.p);
    mesh.position.y += 1.6;
    raceGroup.add(mesh);
    return mesh;
  });
  coinMeshes = race.coins.map((c) => {
    const mesh = makeCoin(),
      s = race.track.sample(c.distance, c.lane);
    mesh.position.copy(s.p);
    mesh.position.y += 0.95;
    raceGroup.add(mesh);
    return mesh;
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
    : "QUICK RACE · " + { easy: "50", normal: "100", hard: "150" }[save.difficulty] + "cc";
  $("item-key").textContent = touchLayout() ? "点击使用" : "SPACE";
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
  lobby.group.visible = true;
  sun.color.set(0xfff2d7);
  sun.intensity = 3;
  hemi.intensity = 2.5;
  sun.position.set(-20, 45, 25);
  sun.target.position.set(0, 0, 0);
  cameraReady = false;
  camera.fov = 40;
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
    '<span class="dialog-eyebrow">A LITTLE PIT STOP</span><h2>进站，歇一会儿。</h2><p>比赛已暂停。准备好了，继续向终点出发。</p><div class="dialog-actions"><button class="primary" id="resume">继续比赛</button><button class="secondary" id="restart">重新开始</button></div><div class="dialog-actions"><button class="secondary" id="race-settings">驾驶设置</button><button class="secondary" id="home">返回车库</button></div>',
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
    '<button class="dialog-close" id="close-dialog" aria-label="关闭">×</button><span class="dialog-eyebrow">YOUR FIRST LAP</span><h2>快乐超车，从这里开始。</h2><p>默认自动油门，专心转向和使用道具。跑完三圈即冲线，杯赛累积三站积分。</p><div class="help-grid"><div><b>01 / 转向</b><p>键盘 ← → 或 A / D。手机按住左下方向键。草地会减速，辅助转向会帮你留在赛道附近。</p></div><div><b>02 / 漂移</b><p>转向时按住 Shift / 漂移键。蓄力变蓝、橙、粉后松手，获得不同强度的冲刺。</p></div><div><b>03 / 道具</b><p>撞进问号箱，抽取道具。空格 / 点击道具槽释放。排名靠后更容易获得追赶道具。</p></div><div><b>04 / 抢先一步</b><p>金币略微提高极速，上限 10 枚。踩金色加速带冲刺。每次受击后有短暂无敌保护。</p></div></div><div class="help-items">' +
      Object.entries(ITEMS)
        .map(([k, v]) => "<div><span>" + v.icon + "</span><b>" + v.name + "</b>" + v.desc + "</div>")
        .join("") +
      '</div><p>关闭自动油门后：W / ↑ 或屏幕油门键加速，S / ↓ 刹车。P / Esc 暂停；切换应用会自动暂停。</p><div class="dialog-actions"><button id="got-it" class="primary">准备好啦</button></div><div class="modal-footer">非官方同人作品 · 角色造型参考，原创赛道与音乐</div>',
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
      '"></label><label class="setting"><span>画面质量</span><select id="quality"><option value="auto">自动 · 推荐</option><option value="high">精致 · 动态阴影</option><option value="low">流畅 · 节省电量</option></select></label><p>成绩保存在当前浏览器。手机横屏视野更宽，竖屏也可以完整游玩。</p><div class="dialog-actions"><button class="primary" id="done-settings">保存并返回</button></div>',
  );
  $("quality").value = save.quality;
  for (const k of ["autoGas", "assist", "reduced"])
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
  if (!race.useItem()) notify(race.player.roulette > 0 ? "惊喜马上揭晓…" : "撞进问号箱就能获得道具");
  else {
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
const near = (distance, metres) => Math.abs(race.gap(distance, race.player.distance)) < metres;
function processEvents() {
  const landed = [];
  for (const e of race.events) {
    if (e.racer === 0 || e.type === "go") {
      audio.cue(e.type);
      if (e.type === "pickup") notify("获得道具！空格 / 点击右侧释放", 1.6);
      if (e.type === "item") {
        notify(ITEMS[e.item].icon + " " + ITEMS[e.item].name + "！", 1.3);
        if (e.item === "bolt") burst(cars[0].position.clone().add(new T.Vector3(0, 2, 0)), 25, 0xffec8c, kartVelocity(race.player));
      }
      if (e.type === "wall") notify("碰到护栏，松开方向调整一下", 1.1);
      if (e.type === "rescue") notify("正在返回赛道…", 1.2);
      if (e.type === "hit") {
        notify("打滑啦！短暂无敌保护中", 1.7);
        burst(cars[0].position.clone().add(new T.Vector3(0, 1, 0)), 18, 0xffbf80, kartVelocity(race.player));
      }
      if (e.type === "block") notify("泡泡护盾挡住了攻击！", 1.8);
      if (e.type === "drift") {
        notify(["", "蓝色漂移 · 加速！", "超级漂移 · 加速！", "完美漂移 · 全速冲刺！"][e.level], 1.2);
        burst(cars[0].position, 16, [0, 0x91e4ff, 0xffc170, 0xf1a4e0][e.level], kartVelocity(race.player));
      }
      if (e.type === "lap")
        banner(
          e.lap === 3 ? "最后一圈！" : "第 " + e.lap + " 圈",
          e.lap === 3 ? "把快乐留到终点线" : "NICE DRIVING",
          1.9,
        );
      if (e.type === "finish") {
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
    if (e.type === "pickup" && e.box != null) {
      const i = race.boxes.findIndex((b) => b.id === e.box);
      if (i >= 0 && near(race.boxes[i].distance, 60)) burst(pickupMeshes[i].position, e.racer === 0 ? 12 : 6, 0xbff3ff);
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
    key = race.track.index + "-" + save.difficulty,
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
      (finalCup ? "PAW CUP · FINAL RESULTS" : "FINISH LINE, HAPPY TIMES") +
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
      "cc</p>" +
      (newRecord ? '<div class="new-record">✦ 刷新个人最佳纪录！</div>' : "") +
      '</div><div class="result-stats"><div><small>' +
      (finalCup ? "末站用时" : "完赛时间") +
      "</small><b>" +
      timeText(p.finish) +
      "</b></div><div><small>漂移加速</small><b>" +
      p.drifts +
      " 次</b></div><div><small>使用道具</small><b>" +
      p.itemsUsed +
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
  const item = p.roulette > 0 ? Object.keys(ITEMS)[Math.floor(clock * 14) % 6] : p.item;
  $("item-icon").textContent = item ? ITEMS[item].icon : "?";
  $("item-name").textContent = p.roulette > 0 ? "惊喜抽取中…" : item ? ITEMS[item].name : "寻找道具箱";
  $("item-button").classList.toggle("ready", !!p.item && p.roulette === 0);
  $("item-button").setAttribute(
    "aria-label",
    p.item ? "使用" + ITEMS[p.item].name : "道具槽为空，寻找问号箱",
  );
  const fill = $("drift-fill");
  fill.style.width = (p.drift / 2.5) * 100 + "%";
  fill.style.background = p.drift > 2 ? "#f5a3e0" : p.drift > 1.2 ? "#ffc77c" : "#a7f1ff";
  $("drift-label").textContent =
    p.drift > 0.65
      ? "松手！释放" + (p.drift > 2 ? "完美" : p.drift > 1.2 ? "超级" : "蓝色") + "加速"
      : p.drifting
        ? "保持转向，积攒漂移能量"
        : touchLayout()
          ? "按住漂移 + 转向 · 松手加速"
          : "按住 Shift 转向漂移 · 松手加速";
  const incoming = race.projectiles.some(
    (x) => x.target === 0 && race.gap(p.distance, x.distance) > 0 && race.gap(p.distance, x.distance) < 45,
  );
  const effect =
    p.rescue > 0
      ? "正在返回赛道…"
      : incoming
        ? "⚠ 追踪红壳接近！"
        : p.star > 0
          ? "⭐ 无敌 " + p.star.toFixed(1) + "s"
          : p.shield > 0
            ? "🫧 护盾 " + p.shield.toFixed(1) + "s"
            : p.boost > 0
              ? "✦ 冲刺 " + p.boost.toFixed(1) + "s"
              : p.stun > 0
                ? "正在恢复…"
                : p.small > 0
                  ? "⚡ 缩小 " + p.small.toFixed(1) + "s"
                  : "";
  show("status-effect", !!effect);
  $("status-effect").textContent = effect;
  $("speed-lines").classList.toggle("active", !save.reduced && (p.boost > 0 || p.star > 0));
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
  drawMap();
  $("hud").dataset.phase = race.phase;
  $("hud").dataset.distance = p.distance.toFixed(1);
  $("hud").dataset.drift = p.drift.toFixed(2);
  $("hud").dataset.item = p.item || "";
  $("hud").dataset.lane = p.lane.toFixed(3);
  $("hud").dataset.steer = p.steer.toFixed(3);
  $("hud").dataset.itemsUsed = String(p.itemsUsed);
  $("hud").dataset.drifts = String(p.drifts);
}
function drawMap() {
  const c = $("minimap"),
    ctx = c.getContext("2d"),
    pts = race.track.points,
    xs = pts.map((p) => p.x),
    zs = pts.map((p) => p.z),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  const scale = Math.min(230 / (maxX - minX), 205 / (maxZ - minZ)),
    tx = (280 - (maxX + minX) * scale) / 2,
    tz = (250 - (maxZ + minZ) * scale) / 2,
    point = (p) => [tx + p.x * scale, tz + p.z * scale];
  ctx.clearRect(0, 0, 280, 260);
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [x, y] = point(p);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = "#edf6df90";
  ctx.lineWidth = 12;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = "#4e7562";
  ctx.lineWidth = 6;
  ctx.stroke();
  const st = point(pts[0]);
  ctx.fillStyle = "#fff6c7";
  ctx.fillRect(st[0] - 5, st[1] - 5, 10, 10);
  [...race.racers].reverse().forEach((r) => {
    const [x, y] = point(race.track.sample(r.distance).p);
    ctx.beginPath();
    ctx.arc(x, y, r.id === 0 ? 8 : 5, 0, Math.PI * 2);
    ctx.fillStyle = r.id === 0 ? "#fff2a8" : r.character.color;
    ctx.fill();
    ctx.strokeStyle = r.id === 0 ? "#364f45" : "#fff";
    ctx.lineWidth = r.id === 0 ? 3 : 1;
    ctx.stroke();
  });
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
const cam = { ready: false, heading: 0, lane: 0, y: 0, back: 0, height: 0, fov: 57, orbit: 0, swing: 0 },
  camPrev = { ...cam };
function camStep(dt) {
  const p = race.player,
    s = race.track.sample(p.distance, p.lane),
    portrait = innerHeight > innerWidth,
    finished = p.finish !== null,
    boost = !save.reduced && (p.boost > 0 || p.star > 0) && p.rescue <= 0,
    // Heading follows the track tangent plus part of the kart's own slip and
    // drift angle, so the camera swings gently into drifts like KartRider.
    swing =
      Math.atan2(p.lateral, Math.max(8, p.speed)) * 0.9 +
      (p.drifting && p.speed > 10 ? (p.driftDirection || 1) * 0.42 : 0);
  const back = (portrait ? 8.4 : 7.0) + (boost ? 0.6 : 0) + Math.min(1, p.speed / 46) * 0.35,
    height = (portrait ? 4.1 : 3.2) + (boost ? -0.12 : 0),
    fov = (portrait ? 66 : 58) + (boost ? 6 : 0) + Math.min(1, p.speed / 46) * 2;
  if (!cam.ready || !cameraReady) {
    Object.assign(cam, { ready: true, heading: s.yaw, lane: p.lane, y: s.p.y, back, height, fov, orbit: 0, swing: 0 });
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
}
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
function renderRace(dt) {
  const p = race.player;
  race.racers.forEach((r, i) => {
    const at = shown(r, i),
      s = race.track.sample(at.d, at.l),
      k = cars[i];
    k.position.copy(s.p);
    k.position.y += 0.08 + (r.rescue > 0 ? Math.sin((r.rescue / 1.1) * Math.PI) * 2 : 0);
    k.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
    // Invincibility blink, as before; karts are never hidden for being close.
    k.visible = r.id === 0 || (r.invincible > 0 && r.star <= 0 && r.stun <= 0 ? Math.floor(clock * 10) % 5 !== 0 : true);
    animateKart(k, clock + i, r, dt, false, { curve: race.track.curvature(at.d), camera });
    // Drift sparks from the rear wheels, coloured by charge.
    if (dt > 0 && r.drifting && r.speed > 14 && k.position.distanceToSquared(camera.position) < 900) {
      const level = r.drift > 2 ? 3 : r.drift > 1.2 ? 2 : r.drift > 0.65 ? 1 : 0,
        colour = [0xfff1c9, 0x7fdcff, 0xffa64a, 0xf47be0][level];
      for (const w of k.userData.wheels)
        if (!w.front && Math.random() < dt * (r.id === 0 ? 32 : 12) * (0.4 + level * 0.35)) {
          w.mesh.getWorldPosition(wheelWorld);
          wheelWorld.y = s.p.y + 0.12;
          spark(wheelWorld, colour, w.mesh.position.x > 0 ? 1 : -1, s.t.clone().multiplyScalar(r.speed * 0.9));
        }
    }
  });
  // Player boost: ignition burst, exhaust light, whoosh.
  const playerKart = cars[0],
    boosting = (p.boost > 0 || p.star > 0) && p.rescue <= 0;
  if (boosting && !lastPlayerBoost && dt > 0) {
    audio.cue("boost");
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
  pickupMeshes.forEach((m, i) => {
    m.visible = race.boxes[i].cooldown <= 0;
    m.rotation.y = clock * 0.8 + i;
    m.rotation.z = Math.sin(clock * 1.3 + i) * 0.12;
    m.position.y = race.track.sample(race.boxes[i].distance).p.y + 1.6 + Math.sin(clock * 2 + i) * 0.15;
  });
  coinMeshes.forEach((m, i) => {
    m.visible = race.coins[i].cooldown <= 0;
    m.rotation.y = clock * 2 + i;
  });
  const live = new Set();
  for (const item of [
    ...race.hazards.map((x) => ({ ...x, type: "banana" })),
    ...race.projectiles.map((x) => ({ ...x, type: "shell" })),
  ]) {
    live.add(item.id);
    let mesh = dynamicMeshes.get(item.id);
    if (!mesh) {
      mesh = item.type === "banana" ? makeBanana() : makeShell();
      dynamicMeshes.set(item.id, mesh);
      raceGroup.add(mesh);
    }
    mesh.position.copy(race.track.sample(item.distance, item.lane).p);
    mesh.position.y += 0.12;
    mesh.rotation.y = clock * (item.type === "shell" ? 8 : 1);
  }
  for (const [id, m] of dynamicMeshes)
    if (!live.has(id)) {
      raceGroup.remove(m);
      dynamicMeshes.delete(id);
    }
  world.moving.forEach((o) => {
    if (o.type === "mill") o.mesh.rotation.z = clock * 0.22;
    else if (o.type === "halo") o.mesh.rotation.y = clock * 0.3;
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
  camTarget.copy(anchor).addScaledVector(camFwd, -mix("back"));
  camTarget.y = mix("y") + mix("height");
  camAim.copy(anchor).addScaledVector(camFwd, finished ? 0 : 6.5);
  camAim.y = mix("y") + (finished ? 1.3 : 1.25);
  camera.position.copy(camTarget);
  camera.lookAt(camAim);
  camera.fov = mix("fov");
  camera.updateProjectionMatrix();
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
    if (renderer.software) k.visible = k.visible && next > 0.5;
    else setKartFade(k, next);
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
          if (lastCount !== -1) {
            lastCount = -1;
            banner("出发！", "LET THE GOOD TIMES ROLL", 0.8);
          }
          show("countdown", false);
        }
      }
    }
    renderRace(mode === "paused" || resumeTimer > 0 ? 0 : dt);
    uiTimer += dt;
    if (uiTimer > 0.1) {
      updateHUD();
      uiTimer = 0;
    }
  }
  particleUpdate(mode === "paused" ? 0 : dt);
  audio.update(race?.player.speed || 0, mode === "race" && race.phase === "racing" && resumeTimer <= 0);
  renderer.render(scene, camera);
}
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
