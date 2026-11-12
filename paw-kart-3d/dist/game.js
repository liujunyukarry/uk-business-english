import * as T from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { Race, Track, TRACKS, CHARACTERS, ITEMS, SPECIALS, DRIFT, NITRO_RULES, DRAFT, KARTS, START, SPECIAL_GUARD, driftLevel, clamp } from "./race.js?v=e52b2ef9";
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
  createShowroomKart,
  speedTrail,
  boostRing,
  updateBoxShimmer,
  kartMood,
  previewTransform,
  emote,
  setEnvironment,
  setKartFade,
  setCompatibilityMode,
  NITRO,
  ATMOS,
  boostPad,
  updateWorldFx,
} from "./art.js?v=e52b2ef9";
import { createPost, createSprites, createSkids, LOOKS, GLOW, PUFF, STAR, CARD } from "./fx.js?v=e52b2ef9";
import { KartAudio } from "./audio.js?v=e52b2ef9";
import { bindTouchControls, CONTROLS } from "./input.js?v=e52b2ef9";
import { SoftwareRenderer } from "./software-renderer.js?v=e52b2ef9";
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
  kart: "classic", // kart body (车型), see KARTS
  specialsTotal: 0, // the "use your special" coaching stops after a few
  fx: true, // bloom, colour grade and the boost blur (v2.7)
  haptics: true, // vibration ticks, where the phone has them
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
if (!KARTS[save.kart]) save.kart = "classic";
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
// Khronos "neutral" tone mapping keeps colours as painted and only rolls off
// the highlights. (ACES, used up to v2.6 with lights bright enough to sit on
// its shoulder, washed the pastel scenery out.)
renderer.toneMapping = T.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = !renderer.software;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.background = new T.Color(0xe3ede0);
scene.fog = new T.Fog(0xe3ede0, 150, 340);
const camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 700);
// Garage lighting; each track brings its own (ATMOS in art.js). The garage
// takes a hint of the chosen track's time of day: warm for the sunset bay,
// cool for the night road.
const GARAGE = { sun: [0xfff2d7, 2.3], hemi: [0xfff7e5, 0x9db894, 1.25] },
  GARAGE_MOOD = [
    { sun: [0xfff2d7, 2.3], hemi: [0xfff7e5, 0x9db894, 1.25] },
    { sun: [0xffd2a6, 2.35], hemi: [0xffe6e0, 0xe2b49c, 1.2] },
    { sun: [0xd9e0ff, 2.2], hemi: [0xe2e6ff, 0x959fd6, 1.15] },
  ];
const hemi = new T.HemisphereLight(GARAGE.hemi[0], GARAGE.hemi[1], GARAGE.hemi[2]);
scene.add(hemi);
const sun = new T.DirectionalLight(GARAGE.sun[0], GARAGE.sun[1]);
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
  scene.environmentIntensity = 0.3;
  setEnvironment(env.texture); // glossy kart paint and chrome (v2.6)
  pmrem.dispose();
}
// Post-processing chain (null when the device cannot run it), sprite
// particles and tyre marks (v2.7, fx.js). The compatibility renderer has none.
const post = createPost(renderer),
  sprites = renderer.software ? null : createSprites(),
  skids = renderer.software ? null : createSkids();
if (sprites) scene.add(sprites.group);
if (skids) scene.add(skids.mesh);
post?.look(LOOKS.garage);
let fxAuto = true; // cleared when the phone cannot keep the frame rate with it
const lobby = createLobby();
scene.add(lobby.group);
const kartCache = new Map();
function kart(key, kind, num, body = "classic") {
  key += "@" + body;
  if (!kartCache.has(key)) kartCache.set(key, createKart(kind, num, body));
  return kartCache.get(key);
}
// Garage copy for the kart bodies: what each one is good at, and the change
// to the speed / acceleration / handling bars it makes.
const KART_INFO = {
  classic: { tag: "均衡 · 好上手", perk: "四项均衡", bars: [0, 0, 0], morph: "弹出大尾翼和双推进器" },
  thunder: { tag: "极速型", perk: "极速更高 · 起步稍慢", bars: [1, -1, 0], morph: "尾翼升起 · 侧刃弹出 · 鸭翼展开" },
  jet: { tag: "冲刺型", perk: "所有加速多 12%", bars: [0, 1, -1], morph: "后掠翼展开 · 火箭外推 · 涡轮全开" },
  phantom: { tag: "操控型", perk: "集气快 15% · 抓地稳", bars: [-1, 0, 1], morph: "车轮收起变悬浮 · X 翼展开" },
};
let selected = kart("hero-" + save.character, save.character, 1, save.kart);
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
let startTap = false; // a start press not yet seen by a physics step
// Drift tier colours (none / blue / orange / purple), as in Mario Kart.
const DRIFT_COLOURS = ["#fff1c9", "#7fdcff", "#ffa64a", "#f47be0"],
  DRIFT_SPARKS = [0xfff1c9, 0x7fdcff, 0xffa64a, 0xf47be0];
let lastRank = 0,
  lastPassCue = 0,
  lastWallTip = -99,
  wasIncoming = false,
  nitroTipShown = false,
  progressDots = [],
  targetMarks = [],
  specialTargets = [], // racer ids the player's special would hit right now
  trails = [], // boost light trails from the player's rear corners
  ring = null, // boost ignition shock ring
  lastBoostCount = 0;
// Where the light trails leave the kart (body space): the rear corners.
const TRAIL_ANCHORS = [new T.Vector3(-0.82, 0.22, -0.95), new T.Vector3(0.82, 0.22, -0.95)],
  RING_ANCHOR = new T.Vector3(0, 0.95, -1.7);
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
// Render resolution (v2.6): adaptive, to stay smooth. It starts where V2.5
// sat (1.5x on phones, 1.8x on desktops; "精致" starts sharper), steps up by
// a quarter while frames keep coming on time, and steps down at once when
// frames start to drop, never climbing back past a level that dropped
// frames. Shadows go off only as a last resort (adaptiveLow, under 26 fps).
// (v2.7: with the post chain on, the resolution only steps down to 1.25x; if
// frames still drop there the chain is switched off and the resolution may
// climb back, since a sharp picture matters more than the glow.)
const SCALE = { step: 0.25, min: 1, max: 2, fxFloor: 1.25 };
let renderScale = null,
  scaleCap = SCALE.max,
  scaleCalm = 0,
  scaleSettle = 0;
const intervals = [];
function quality() {
  const low = save.quality === "low" || (save.quality === "auto" && adaptiveLow),
    top = Math.min(devicePixelRatio, SCALE.max);
  if (renderScale === null) renderScale = Math.min(top, save.quality === "high" ? 2 : coarse ? 1.5 : 1.8);
  renderScale = Math.max(Math.min(1, top), Math.min(renderScale, scaleCap, top));
  renderer.setPixelRatio(renderer.software ? 0.85 : low ? Math.min(devicePixelRatio, 1) : renderScale);
  renderer.shadowMap.enabled = !low && !renderer.software;
  scaleSettle = 30; // ignore the frames right after a change (buffer realloc)
  intervals.length = 0;
  resize();
}
// Called each 3 s of steady racing with the frame intervals seen.
function adaptScale() {
  if (renderer.software || save.quality === "low" || adaptiveLow || intervals.length < 120) return (intervals.length = 0);
  const sorted = [...intervals].sort((a, b) => a - b),
    expected = sorted[Math.floor(sorted.length * 0.25)],
    late = intervals.filter((x) => x > Math.max(expected * 1.6, 0.022)).length / intervals.length,
    top = Math.min(devicePixelRatio, SCALE.max);
  intervals.length = 0;
  const slow = late > 0.1 || expected > 0.021;
  if (slow && fxOn() && renderScale <= SCALE.fxFloor) {
    fxAuto = false;
    scaleCap = Math.min(top, 1.5);
    scaleCalm = 0;
    quality();
  } else if (slow && renderScale > SCALE.min) {
    scaleCap = Math.max(SCALE.min, renderScale - SCALE.step);
    renderScale = scaleCap;
    scaleCalm = 0;
    quality();
  } else if (late < 0.012 && expected < 0.0175 && renderScale + SCALE.step <= Math.min(scaleCap, top) + 1e-6) {
    if (++scaleCalm >= 2) {
      renderScale += SCALE.step;
      scaleCalm = 0;
      quality();
    }
  } else scaleCalm = 0;
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  syncPost();
}
// The post chain runs when the device supports it, the player has not
// turned it off, and the frame rate holds with it.
const fxOn = () => !!post && post.ok && fxAuto && save.fx !== false && save.quality !== "low" && !adaptiveLow;
const bufferSize = new T.Vector2();
function syncPost() {
  const on = fxOn();
  if (post) {
    if (on) {
      renderer.getDrawingBufferSize(bufferSize);
      post.setSize(bufferSize.x, bufferSize.y);
    } else post.dispose(); // frees its targets while it is off
  }
  const hdr = fxOn(); // (setSize may have found the device cannot do it)
  sprites?.setGain(hdr ? 1.7 : 1);
  document.documentElement.dataset.fx = hdr ? "on" : !post || !post.ok ? "unsupported" : "off";
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
// Haptic ticks, best effort. Android vibrates. iOS has no vibration API; a
// switch-style checkbox being toggled gives a light system tick on recent
// iOS, so a hidden one is toggled instead. Nothing happens where neither
// works.
const hapticSwitch = (() => {
  try {
    const l = document.createElement("label"),
      i = document.createElement("input");
    i.type = "checkbox";
    i.setAttribute("switch", "");
    i.tabIndex = -1;
    l.id = "haptic";
    l.setAttribute("aria-hidden", "true");
    l.append(i);
    document.body.append(l);
    return l;
  } catch {
    return null;
  }
})();
let lastHaptic = 0;
function haptic(ms = 12) {
  if (save.haptics === false) return;
  const now = performance.now();
  if (now - lastHaptic < 45) return;
  lastHaptic = now;
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
    else if (hapticSwitch) {
      hapticSwitch.click();
      // (Clicking a label also focuses its control; hand the focus back.)
      const box = hapticSwitch.firstChild;
      if (document.activeElement === box) box.blur();
    }
  } catch {}
}
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
  startTap = false;
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
  document.querySelectorAll("[data-kart]").forEach((b) => {
    const active = b.dataset.kart === save.kart;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  const c = CHARACTERS.find((x) => x.id === save.character),
    idx = CHARACTERS.indexOf(c),
    body = KART_INFO[save.kart];
  $("driver-name").innerHTML = c.name + "<span>READY TO ROLL</span>";
  $("driver-tag").textContent =
    String(idx + 1).padStart(2, "0") +
    " / " +
    String(CHARACTERS.length).padStart(2, "0") +
    " · " +
    c.tag +
    " · " +
    KARTS[save.kart].name;
  // The bars show the driver on the chosen body; a changed bar is marked.
  $("driver-stats").innerHTML = ["速度", "加速", "操控"]
    .map((v, i) => {
      const n = clamp(c.stats[i] + body.bars[i], 1, 5),
        delta = body.bars[i];
      return (
        "<div>" +
        v +
        '<span class="stat-bars">' +
        Array.from({ length: 5 }, (_, j) => '<i class="' + (j < n ? "on" : "") + '"></i>').join("") +
        "</span>" +
        (delta ? '<em class="' + (delta > 0 ? "up" : "down") + '">' + (delta > 0 ? "▲" : "▼") + "</em>" : "") +
        "</div>"
      );
    })
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
  if (mode === "home") {
    const mood = GARAGE_MOOD[raceMode === "cup" ? 0 : save.track];
    sun.color.set(mood.sun[0]);
    sun.intensity = mood.sun[1];
    hemi.color.set(mood.hemi[0]);
    hemi.groundColor.set(mood.hemi[1]);
    hemi.intensity = mood.hemi[2];
  }
  persist();
}
function chooseKart(id) {
  if (mode !== "home" || !KARTS[id]) return;
  lobby.group.remove(selected);
  save.kart = id;
  selected = kart("hero-" + save.character, save.character, 1, id);
  selected.position.set(0, 0.08, 0);
  lobby.group.add(selected);
  orbit = -0.3;
  audio.cue("tap");
  // Show what this body turns into for a boost.
  previewTransform(selected, 2.6);
  audio.cue("transform");
  notify("⚡ 加速变形：" + KART_INFO[id].morph, 2.4);
  updateHome();
}
// Garage tabs: drivers (车手) or kart bodies (车型).
function garageTab(tab) {
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  show("characters", tab === "characters");
  show("karts", tab === "karts");
}
function chooseCharacter(id) {
  if (mode !== "home") return;
  lobby.group.remove(selected);
  save.character = id;
  selected = kart("hero-" + id, id, 1, save.kart);
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
      " · " +
      ["正午", "夕阳", "星夜"][i] +
      "</small></button>"
    );
  }).join("");
  $("karts").innerHTML = Object.entries(KARTS)
    .map(
      ([id, k]) =>
        '<button class="character-card kart-card" data-kart="' +
        id +
        '" aria-label="选择车型：' +
        k.name +
        "，" +
        KART_INFO[id].perk +
        "，加速变形：" +
        KART_INFO[id].morph +
        '"><img alt="' +
        k.name +
        '"><b>' +
        k.name +
        "</b><small>" +
        KART_INFO[id].perk +
        "</small></button>",
    )
    .join("");
  document
    .querySelectorAll("[data-character]")
    .forEach((b) => (b.onclick = () => chooseCharacter(b.dataset.character)));
  document.querySelectorAll("[data-kart]").forEach((b) => (b.onclick = () => chooseKart(b.dataset.kart)));
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        audio.cue("tap");
        garageTab(b.dataset.tab);
      }),
  );
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
  // Kart body thumbnails: the empty kart, three-quarter view.
  const kc = new T.PerspectiveCamera(34, 1, 0.1, 50);
  kc.position.set(3.9, 2.6, 4.6);
  kc.lookAt(0, 0.45, 0.15);
  for (const id of Object.keys(KARTS)) {
    const k = createShowroomKart(id);
    k.rotation.y = -0.35;
    ps.add(k);
    if (renderer.software) renderer.last = 0;
    renderer.render(ps, kc);
    document.querySelector('[data-kart="' + id + '"] img').src = renderer.domElement.toDataURL("image/png");
    ps.remove(k);
  }
  lobby.group.add(selected);
  quality();
  updateHome();
}
buildMenu();
// Particles. With WebGL they are camera-facing sprites (fx.js): sparks that
// glow and streak with their motion, sparkles, smoke and confetti. The
// compatibility renderer keeps small spheres.
const particles = [],
  particleGeo = new T.SphereGeometry(1, 6, 4),
  particleMat = new T.MeshBasicMaterial({ vertexColors: false });
const particleMesh = new T.InstancedMesh(particleGeo, particleMat, 140);
particleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
particleMesh.frustumCulled = false;
if (!sprites) scene.add(particleMesh);
particleMesh.count = 0;
const dummy = new T.Object3D(),
  color = new T.Color();
// Particles spawned from a moving kart inherit its velocity (`carry`) and
// then slow down with air drag. V2 left them standing in world space, so at
// race speed they shot back past the chase camera as large blobs.
function burst(position, n = 15, col = 0xffdd88, carry = null) {
  if (sprites) {
    for (let i = 0; i < n; i++) {
      const star = i % 3 === 0;
      sprites.add(
        star ? STAR : GLOW,
        position.x,
        position.y,
        position.z,
        (Math.random() - 0.5) * 7 + (carry?.x || 0),
        2 + Math.random() * 6 + (carry?.y || 0),
        (Math.random() - 0.5) * 7 + (carry?.z || 0),
        0.5 + Math.random() * 0.6,
        (star ? 0.42 : 0.24) + Math.random() * 0.26,
        col,
        1,
        0,
        2.2,
        10,
        star ? 0 : 0.016,
        star ? 4 + Math.random() * 4 : 0,
      );
    }
    return;
  }
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
// Smoke and dust: soft puffs that swell, rise a little and thin out.
function puff(at, colour, alpha, size, carry, lift = 1.2) {
  if (!sprites) return;
  sprites.add(
    PUFF,
    at.x + (Math.random() - 0.5) * 0.3,
    at.y,
    at.z + (Math.random() - 0.5) * 0.3,
    (carry?.x || 0) + (Math.random() - 0.5) * 1.2,
    lift * (0.4 + Math.random() * 0.8),
    (carry?.z || 0) + (Math.random() - 0.5) * 1.2,
    0.45 + Math.random() * 0.35,
    size * (0.7 + Math.random() * 0.5),
    colour,
    alpha,
    size * 2.6,
    3.2,
    -0.6,
    0,
    0,
    0.12,
  );
}
// Paper confetti: flat cards in every colour that tumble as they fall.
const CONFETTI = [0xff6b6b, 0xffd166, 0x6bd6ff, 0x8affb0, 0xd38bff, 0xffffff];
function confetti(at, carry, n = 70, spread = 11) {
  if (!sprites) return burst(at, n, 0xffdc7b, carry);
  for (let i = 0; i < n; i++)
    sprites.add(
      CARD,
      at.x,
      at.y,
      at.z,
      (Math.random() - 0.5) * spread + (carry?.x || 0) * 0.6,
      4 + Math.random() * 8,
      (Math.random() - 0.5) * spread + (carry?.z || 0) * 0.6,
      1.7 + Math.random() * 1.3,
      0.17 + Math.random() * 0.12,
      CONFETTI[i % CONFETTI.length],
      1,
      0,
      1.3,
      7,
      0,
      5 + Math.random() * 6,
    );
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
  who.textContent = racer.name + " · 必杀技 · 无敌 " + (SPECIAL_GUARD[racer.character.id] ?? SPECIAL_GUARD.base) + " 秒";
  cutInEl.append(icon, text, who);
  cutInEl.style.setProperty("--accent", racer.character.color);
  cutInEl.classList.remove("on");
  void cutInEl.offsetWidth;
  if (!save.reduced) cutInEl.classList.add("on");
  else banner(sp.icon + " " + sp.name, racer.name, 1.2);
}
const camVel = new T.Vector3(),
  camLast = new T.Vector3();
function particleUpdate(dt) {
  if (sprites) {
    // Sparks streak along their motion as the camera sees it, so the
    // camera's own velocity is taken out.
    if (dt > 0) {
      camVel.copy(camera.position).sub(camLast).divideScalar(dt);
      if (camVel.lengthSq() > 14400) camVel.set(0, 0, 0); // a cut, not motion
    }
    camLast.copy(camera.position);
    sprites.update(dt, camVel.x, camVel.y, camVel.z);
    skids?.update(clock);
    return;
  }
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
// The light, haze and colour grade of a track (ATMOS in art.js), or of the
// garage (null).
const sunDir = new T.Vector3(-0.36, 0.8, 0.45).normalize();
function applyAtmosphere(a) {
  if (!a) {
    sun.color.set(GARAGE.sun[0]);
    sun.intensity = GARAGE.sun[1];
    hemi.color.set(GARAGE.hemi[0]);
    hemi.groundColor.set(GARAGE.hemi[1]);
    hemi.intensity = GARAGE.hemi[2];
    sunDir.set(-0.36, 0.8, 0.45).normalize();
    scene.fog.near = 150;
    scene.fog.far = 340;
    post?.look(LOOKS.garage);
    skids?.setGlow(false);
    return;
  }
  scene.background.set(a.sky[1][1]);
  scene.fog.color.set(a.fog[0]);
  scene.fog.near = a.fog[1];
  scene.fog.far = a.fog[2];
  sun.color.set(a.sun.colour);
  sun.intensity = a.sun.intensity;
  sunDir.set(...a.sun.dir).normalize();
  hemi.color.set(a.hemi[0]);
  hemi.groundColor.set(a.hemi[1]);
  hemi.intensity = a.hemi[2];
  post?.look(a.look);
  // On the night track tyre marks are lines of light in the drift's colour.
  skids?.setGlow(a.name === "night", 1);
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
  sprites?.clear();
  skids?.clear();
}
// Scene changes open with an iris: the screen is covered at once and a
// circle of the new scene grows from the middle. Nothing waits for it.
const wipeEl = document.createElement("div");
wipeEl.id = "wipe";
wipeEl.setAttribute("aria-hidden", "true");
document.body.append(wipeEl);
function wipe() {
  if (save.reduced) return;
  wipeEl.classList.remove("on");
  void wipeEl.offsetWidth;
  wipeEl.classList.add("on");
}
// Paper confetti over the result card (a canvas inside the dialog, so it is
// drawn above it), for a podium finish.
let confettiRun = 0;
// (The canvas lives in the dialog, which outlasts the result card: it is
// removed when the card is left, or the pause menu would show stale confetti.)
function stopConfetti() {
  confettiRun++;
  document.getElementById("confetti")?.remove();
}
function celebrate(count) {
  stopConfetti();
  const run = confettiRun;
  if (save.reduced || !count) return;
  const c = document.createElement("canvas"),
    ratio = Math.min(devicePixelRatio || 1, 2),
    w = innerWidth,
    h = innerHeight,
    ctx = c.getContext("2d"),
    colours = ["#ff6b6b", "#ffd166", "#6bd6ff", "#8affb0", "#d38bff", "#fff4c6"],
    bits = Array.from({ length: count }, (_, i) => ({
      x: w * (0.1 + Math.random() * 0.8),
      y: -20 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 90,
      vy: 150 + Math.random() * 190,
      s: 6 + Math.random() * 6,
      a: Math.random() * 7,
      spin: (Math.random() - 0.5) * 9,
      c: colours[i % colours.length],
    }));
  c.id = "confetti";
  c.setAttribute("aria-hidden", "true");
  c.width = Math.round(w * ratio);
  c.height = Math.round(h * ratio);
  $("dialog").append(c);
  let last = performance.now(),
    age = 0;
  const tick = (now) => {
    if (run !== confettiRun || !c.isConnected) return void c.remove();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    age += dt;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, (4.2 - age) / 0.8);
    for (const b of bits) {
      b.x += (b.vx + Math.sin(age * 3 + b.a) * 30) * dt;
      b.y += b.vy * dt;
      b.a += b.spin * dt;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, (-b.s / 2) * Math.cos(b.a * 1.7), b.s, b.s * Math.cos(b.a * 1.7));
      ctx.restore();
    }
    if (age < 4.2) requestAnimationFrame(tick);
    else c.remove();
  };
  requestAnimationFrame(tick);
}
// A number that counts up to its value (the result card's finish time).
function countUp(el, value, format, seconds = 0.8) {
  if (save.reduced) return void (el.textContent = format(value));
  const start = performance.now();
  const tick = (now) => {
    if (!el.isConnected) return;
    const t = Math.min(1, (now - start) / (seconds * 1000));
    el.textContent = format(value * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = format(0);
  requestAnimationFrame(tick);
}
function startRace(trackIndex = save.track) {
  inputClear();
  stopConfetti();
  wipe();
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
    kart: save.kart,
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
    const k = kart("race-" + r.id + "-" + r.character.id, r.character.id, r.id + 1, r.kart);
    raceGroup.add(k);
    // Karts are reused between races: start folded, calm and quiet.
    const v = k.userData.vis;
    v.morph = v.morphV = v.guard = v.kick = v.nitro = 0;
    v.moodTime = 0;
    v.active = false;
    if (k.userData.emote) k.userData.emote.life = 0;
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
      g = boostPad();
    g.position.copy(s.p);
    g.position.y += 0.09;
    g.rotation.set(-Math.asin(s.t.y), s.yaw, 0, "YXZ");
    raceGroup.add(g);
  }
  const tc = TRACKS[trackIndex];
  applyAtmosphere(world.atmos);
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
  // Boost effects for the player's kart (not in the CPU renderer, which has
  // no blending): two light trails and the ignition ring.
  trails = renderer.software ? [] : TRAIL_ANCHORS.map(() => speedTrail());
  ring = renderer.software ? null : boostRing();
  for (const t of trails) raceGroup.add(t.mesh);
  if (ring) raceGroup.add(ring.mesh);
  lastBoostCount = 0;
  // Lock-on reticles for attack specials (Nova can mark three karts).
  targetMarks = [0, 1, 2].map(() => {
    const m = makeTargetMark();
    raceGroup.add(m);
    return m;
  });
  mapCache = null;
  minimapFitted = false;
  fitMinimap();
  measureHUD();
  lastDriftFill = -1;
  $("ranking").dataset.order = "";
  if (speedRace) notify("⚡ 竞速赛：没有道具，漂移攒氮气，满了点 N₂O 喷射；紧跟前车能吸尾流", 3.2);
  show("accelerate", !save.autoGas);
  document.body.classList.toggle("manual-gas", !save.autoGas);
  show("countdown", true);
  $("start-hint").textContent = touchLayout() ? "就是现在！倒数一结束就点屏幕 → 起步加速" : "就是现在！倒数一结束就按 ↑ 或空格 → 起步加速";
  lastCount = 0;
  updateHUD();
  // Compile every shader the race can need (flames, shields, fade dither,
  // particles) now, during the countdown, instead of stalling the first time
  // a boost or shield appears mid-race.
  if (!renderer.software) {
    cars.slice(1).forEach((k) => setKartFade(k, k.userData.fade ?? 1));
    // compile() only sees visible objects: briefly show what is hidden until
    // a boost or a special (flames, the 必杀无敌 aura, transform parts, the
    // emote bubble) so the first one does not stall a frame.
    const shownForCompile = [];
    const reveal = (o) => {
      if (o && !o.visible) {
        o.visible = true;
        shownForCompile.push(o);
      }
    };
    for (const k of cars) {
      const d = k.userData;
      reveal(d.aura);
      d.exhaust.forEach((f) => reveal(f.nozzle));
      d.rig?.parts.forEach((part) => reveal(part.obj));
    }
    emote(cars[0], "!", 0);
    reveal(cars[0].userData.emote.sprite);
    try {
      // (The post chain draws into its own target, which has its own
      // programs.)
      if (fxOn()) post.compile(scene, camera);
      else renderer.compile(scene, camera);
    } catch {}
    shownForCompile.forEach((o) => (o.visible = false));
  }
}
function goHome() {
  mode = "home";
  stopConfetti();
  wipe();
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
  show("start-hint", false);
  show("banner", false);
  show("status-effect", false);
  $("speed-lines").classList.remove("active");
  document.body.classList.remove("speed-race");
  lobby.group.visible = true;
  applyAtmosphere(null);
  sun.position.copy(sunDir).multiplyScalar(56);
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
  show("start-hint", false);
  modal(
    '<span class="dialog-eyebrow">A LITTLE PIT STOP</span><h2>进站，歇一会儿。</h2><p>比赛已暂停。准备好了，继续向终点出发。</p><div class="dialog-actions"><button class="primary" id="resume">继续比赛</button><button class="secondary" id="restart">重新开始</button></div><div class="dialog-actions"><button class="secondary" id="race-settings">驾驶设置</button><button class="secondary" id="home">返回车库</button></div><div class="modal-footer">版本 2.7 · ' + BUILD + '</div>',
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
    '<button class="dialog-close" id="close-dialog" aria-label="关闭">×</button><span class="dialog-eyebrow">YOUR FIRST LAP</span><h2>快乐超车，从这里开始。</h2><p>默认自动油门，专心转向和使用道具。跑完三圈即冲线，杯赛累积三站积分；竞速赛没有道具，比拼漂移和氮气。</p><div class="help-grid"><div><b>01 / 转向与过弯</b><p>手机：按住屏幕左半边左转，右半边右转。急弯会把车往外甩，只靠方向会掉速、贴外侧，漂移过弯更快。键盘 ← → 或 A / D。</p></div><div><b>02 / 漂移</b><p>手机：进弯按住方向就会漂移，一直按着保持，火花变蓝、橙、紫后松开，冲刺一次比一次猛；也可以点一下漂移键开始。键盘：转向时按住 Shift。漂移会掉一点速度，只有过弯时集气快：直道上一直漂、贴着护栏漂都会越漂越慢，出弯就松手。</p></div><div><b>03 / 道具（两个槽）</b><p>撞碎问号箱抽道具，最多存两个，点道具框（键盘空格）使用。问号箱每人一份；越落后道具越强，最后几名还可能抽到火箭。</p></div><div><b>04 / 必杀技</b><p>每位车手都有专属必杀技。漂移加速、吃金币、打中对手都会给必杀槽充能，满了点必杀键（键盘 E）释放。放必杀时金光护体、车子变形，3 秒内无敌（小金毛 3.6 秒）：任何攻击都打不动你，撞车也是对方被弹开。流星雨、熊抱冲撞这类攻击必杀会用红圈标出要打的车；前面没人可打时不让你白放。</p></div><div><b>05 / 竞速赛与尾流</b><p>竞速赛没有道具和必杀：漂移给氮气槽充能，最多存两管，点 N₂O 键（键盘空格）喷射。两种比赛都有尾流：紧跟在别的车正后方一小会儿，就会被吸着加速超过去。</p></div><div><b>06 / 小地图与后方雷达</b><p>右上角小地图：方格线是终点，黄色箭头是你，彩色圆点是对手，离你近的会描白边；下方进度条显示每个人离终点多远。屏幕下方的雷达会提示从后面逼近的车和距离。</p></div><div><b>07 / 起步加速</b><p>倒数快结束时屏幕中间会提示「就是现在」：倒数结束的瞬间点一下屏幕（键盘 ↑ 或空格），就能起步加速，越准越猛；按得太早就没有。</p></div><div><b>08 / 车型与变形</b><p>车库点「车型」可以换车：经典卡丁（均衡）、闪电 GT（极速更高、起步稍慢）、喷射火箭（所有加速多 12%）、幻影星舰（集气快 15%、抓地稳）。每次加速都会变形：尾翼升起、侧翼展开、火箭外推，幻影星舰还会收起车轮变成悬浮模式。</p></div><div><b>09 / 碰撞</b><p>护栏和其他车都会把你弹开：撞得越正越减速，漂移也会被打断。贴着护栏开会一路碰撞、越来越慢，记得松开方向回到路中间。</p></div><div><b>10 / 画面与手感</b><p>三条赛道分别是正午、夕阳和星夜。设置（⚙）里可以开关「画面特效」（泛光、调色、冲刺光晕）、「震动反馈」和「减少镜头变化」（开场运镜、镜头侧倾）。手机卡顿时游戏会先自动降低清晰度，还不够就关掉特效。</p></div></div><div class="help-items">' +
      Object.entries(ITEMS)
        .map(([k, v]) => "<div><span>" + v.icon + "</span><b>" + v.name + "</b>" + v.desc + "</div>")
        .join("") +
      '</div><p>关闭自动油门后：W / ↑ 或屏幕油门键加速，S / ↓ 刹车。P / Esc 暂停；切换应用会自动暂停。</p><div class="dialog-actions sticky-actions"><button id="got-it" class="primary">准备好啦</button></div><div class="modal-footer">非官方同人作品 · 角色造型参考，原创赛道与音乐 · 版本 2.7 · ' + BUILD + '</div>',
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
        ["reduced", "减少镜头变化", "关闭开场运镜、镜头侧倾和屏幕光效"],
        ["fx", "画面特效", "泛光、调色和冲刺光晕；手机发热或卡顿时可关闭"],
        ["haptics", "震动反馈", "漂移、撞击时轻震；Android 支持，新系统的 iPhone 多半没有"],
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
            (save[id] !== false && (save[id] || id === "fx" || id === "haptics") ? "checked" : "") +
            "></label>",
        )
        .join("") +
      '<label class="setting"><span>音乐与音效</span><input type="range" id="volume" min="0" max="100" value="' +
      save.volume * 100 +
      '"></label><label class="setting"><span>画面质量</span><select id="quality"><option value="auto">自动 · 推荐</option><option value="high">精致 · 动态阴影</option><option value="low">流畅 · 节省电量</option></select></label><p>成绩保存在当前浏览器。手机横屏视野更宽，竖屏也可以完整游玩。</p><div class="dialog-actions sticky-actions"><button class="primary" id="done-settings">保存并返回</button></div>',
  );
  $("quality").value = save.quality;
  for (const k of ["autoGas", "autoDrift", "assist", "reduced", "fx", "haptics"])
    $("setting-" + k).onchange = (e) => {
      save[k] = e.target.checked;
      persist();
      show("accelerate", !save.autoGas);
      document.body.classList.toggle("manual-gas", !save.autoGas);
      if (k === "fx") {
        fxAuto = true; // asked for again: try it, whatever the frame rate did before
        quality();
      }
      if (k === "haptics" && save.haptics) haptic(15);
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
    renderScale = null; // start again from this choice
    scaleCap = SCALE.max;
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
    // A new press on any control also counts as a start press, latched until
    // the next physics step sees it: a quick tap can begin and end between
    // two frames on a slow phone.
    if (CONTROLS.some((k) => s[k] && !touch[k])) startTap = true;
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
  if (!e.repeat && ["ArrowUp", "KeyW", "Space", "ShiftLeft", "ShiftRight"].includes(e.code)) startTap = true;
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
    // Start boost: a press anywhere on the screen (steering halves, drift,
    // gas) or ↑ / W / Space / Shift, at the moment the countdown runs out.
    start:
      startTap ||
      touch.left ||
      touch.right ||
      touch.drift ||
      touch.gas ||
      keys.has("ArrowUp") ||
      keys.has("KeyW") ||
      keys.has("Space") ||
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
      if (e.type === "wall" || e.type === "hit" || e.type === "driftLevel" || e.type === "drift" || e.type === "pickup" || e.type === "special")
        haptic(e.type === "hit" ? 40 : e.type === "wall" ? 22 : 10);
      if (e.type === "wall") {
        // Bounced off the rail: sparks off the wheels on the rail side (more
        // for a square hit), a jolt of the camera and a startled face. The
        // tip only comes now and then, not on every bounce.
        const side = e.side || Math.sign(race.player.lane) || 1,
          impact = e.impact || 0;
        if (e.drift > 0) notify("撞墙啦！漂移被打断，没有加速", 1.3);
        else if (clock - lastWallTip > 6) notify("碰到护栏会反弹减速，松开方向调整一下", 1.3);
        lastWallTip = clock;
        // (Body -x is the kart's right, +lane.) Sparks fly back off the rail.
        const away = race.track.sample(race.player.distance, race.player.lane).right.multiplyScalar(-side * 4).add(kartVelocity(race.player));
        for (const w of cars[0].userData.wheels) {
          if (Math.sign(w.pivot.position.x) === side) continue;
          w.mesh.getWorldPosition(wheelWorld);
          for (let j = 0; j < 3 + Math.round(impact * 6); j++) spark(wheelWorld, j % 3 ? 0xffc36b : 0xfff3d0, 0, away);
        }
        if (!save.reduced) cam.shake = Math.max(cam.shake, 0.35 + 0.5 * impact);
        kartMood(cars[0], "surprise", 0.7);
        emote(cars[0], impact > 0.4 ? "💥" : "💦", 0.9);
      }
      if (e.type === "bump") {
        const strength = e.strength || 0.3;
        if (!save.reduced && strength > 0.45) cam.shake = Math.max(cam.shake, 0.25 * strength);
        if (strength > 0.5) emote(cars[0], "💢", 0.8);
      }
      if (e.type === "guardBlock") {
        notify("✨ 必杀无敌！攻击无效", 1.1);
        burst(cars[0].position.clone().add(new T.Vector3(0, 1.2, 0)), 22, 0xffe37a, kartVelocity(race.player));
        emote(cars[0], "✨", 0.9);
      }
      if (e.type === "rescue") notify("正在返回赛道…", 1.2);
      if (e.type === "hit") {
        notify("打滑啦！短暂无敌保护中", 1.7);
        emote(cars[0], "💫", 1.2);
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
      if (e.type === "rocketStart") {
        banner(e.perfect ? "完美起步！" : "起步加速！", e.perfect ? "PERFECT START · 时机完美" : "NICE START", 1.3);
        kartMood(cars[0], "happy", 1.2);
        emote(cars[0], e.perfect ? "✨" : "♪", 1.1);
      }
      if (e.type === "startEarly") notify(touchLayout() ? "按早啦！倒数结束的瞬间再点屏幕" : "按早啦！倒数结束的瞬间再按 ↑ 或空格", 1.8);
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
        emote(cars[0], e.rank <= 3 ? "❤" : "♪", 3);
        // Confetti in every colour.
        const at = cars[0].position.clone().add(new T.Vector3(0, 2.4, 0)),
          carry = kartVelocity(race.player);
        if (sprites) confetti(at, carry, e.rank <= 3 ? 110 : 50, 13);
        else for (const col of CONFETTI) burst(at, 12, col, carry);
        banner("第 " + e.rank + " 名 · 冲线！", "等待其他伙伴抵达终点", 3);
        burst(cars[0].position.clone().add(new T.Vector3(0, 2, 0)), 70, 0xffdc7b, kartVelocity(race.player));
      }
    }
    // Feedback for what happens around the player, not only to it (V2 showed
    // nothing when the player's shell or banana hit someone).
    if (e.type === "hit" && e.owner === 0 && e.racer !== 0) landed.push(race.racers[e.racer].name);
    // Other karts bouncing off the rail or shrugging off a hit nearby.
    if (e.racer > 0 && cars[e.racer]) {
      const who = race.racers[e.racer];
      if (e.type === "wall" && near(who.distance, 45)) {
        const k = cars[e.racer];
        const away = race.track.sample(who.distance, who.lane).right.multiplyScalar(-(e.side || 1) * 4).add(kartVelocity(who));
        for (let j = 0; j < 4 + Math.round((e.impact || 0) * 5); j++) spark(k.position.clone().add(new T.Vector3(0, 0.4, 0)), 0xffc36b, 0, away);
        if (near(who.distance, 25)) audio.cue("wallFar", e);
        kartMood(k, "surprise", 0.6);
      }
      if (e.type === "guardBlock" && near(who.distance, 60)) {
        burst(cars[e.racer].position.clone().add(new T.Vector3(0, 1.2, 0)), 14, 0xffe37a, kartVelocity(who));
        emote(cars[e.racer], "✨", 0.8);
      }
      if (e.type === "hit") emote(cars[e.racer], "💫", 1.1);
    }
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
        emote(cars[e.racer], "✨", 1);
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
  const displayRank = finalCup ? overall.findIndex((r) => r.id === 0) + 1 : rank,
    podium = displayRank <= 3,
    delta = previous ? Math.abs(p.finish - previous).toFixed(2) : null;
  modal(
    '<div class="result-top rank-' +
      Math.min(displayRank, 4) +
      '"><span class="dialog-eyebrow">' +
      (finalCup ? "PAW CUP · FINAL RESULTS" : speedRace ? "SPEED RACE · FINISH LINE" : "FINISH LINE, HAPPY TIMES") +
      '</span><div class="medal" aria-hidden="true"><i></i><b>' +
      displayRank +
      "</b><em>" +
      (displayRank === 1 ? "WINNER" : podium ? "PODIUM" : "FINISH") +
      "</em></div><h2>" +
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
      (newRecord
        ? '<div class="new-record">✦ 刷新个人最佳纪录！' + (delta ? "<small>比之前快 " + delta + " 秒</small>" : "") + "</div>"
        : '<div class="record-gap">个人最佳 ' + timeText(previous) + " · 这次慢 " + delta + " 秒</div>") +
      '</div><div class="result-stats"><div><small>' +
      (finalCup ? "末站用时" : "完赛时间") +
      '</small><b id="result-time">' +
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
            '" style="--i:' +
            i +
            '"><td>' +
            String(i + 1).padStart(2, "0") +
            '</td><td><i style="background:' +
            r.character.color +
            '"></i>' +
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
  // The card celebrates: the time counts up, and a podium gets confetti.
  countUp($("result-time"), p.finish, timeText);
  celebrate(displayRank === 1 ? 120 : podium ? 60 : 0);
  if (podium) haptic(30);
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
// Write text only when it changes: an unchanged textContent write still
// replaces the node and costs a style and layout pass (V2.5 did ~30 of
// those ten times a second).
function setText(el, text) {
  if (typeof el === "string") el = $(el);
  text = String(text);
  if (el.textContent !== text) el.textContent = text;
}
function setVar(el, name, value) {
  if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}
// Every frame: the parts of the HUD that move — the drift meter, the charge
// rings, the progress strip and the radar chips — so they glide at the frame
// rate instead of jumping ten times a second. Transforms only (no layout).
let hudBox = { progress: 0, radar: 0 },
  lastDriftFill = -1;
function measureHUD() {
  hudBox = { progress: $("progress").clientWidth, radar: $("radar").clientWidth };
}
addEventListener("resize", () => race && measureHUD());
function hudFrame() {
  const p = race.player,
    fill = $("drift-fill"),
    x = Math.min(1, p.drift / DRIFT.levels[3]);
  if (Math.abs(x - lastDriftFill) > 0.002) {
    fill.style.transform = "scaleX(" + x.toFixed(4) + ")";
    lastDriftFill = x;
  }
  if (race.rules === "speed") {
    const pct = p.nitroCharges >= NITRO_RULES.max ? 100 : p.nitro;
    setVar($("item-button"), "--gauge", pct.toFixed(1) + "%");
  } else setVar($("special-button"), "--gauge", p.special.toFixed(1) + "%");
  updateProgress();
  updateRadar();
}
function updateHUD() {
  if (!race) return;
  const p = race.player,
    rank = race.rank();
  setText("rank", rank);
  setText("lap", Math.min(3, Math.max(1, Math.floor(Math.max(0, p.distance) / race.track.length) + 1)));
  setText("race-time", timeText(p.finish ?? race.time));
  setText("coins", String(p.coins).padStart(2, "0"));
  setText($("speed").querySelector("b"), Math.round(p.speed * 3.6));
  const ib = $("item-button");
  if (race.rules === "speed") {
    // Nitro: the frame fills as drifting charges it; up to two charges.
    const charges = p.nitroCharges,
      pct = charges >= NITRO_RULES.max ? 100 : Math.floor(p.nitro);
    setText("item-icon", "N₂O");
    setText("item-name", charges > 0 ? "喷射氮气！" : "漂移充能 " + pct + "%");
    setText("item-key", "●".repeat(charges) + "○".repeat(NITRO_RULES.max - charges));
    setText("item-next", charges > 1 ? "×" + charges : "");
    $("item-next").classList.toggle("on", charges > 1);
    ib.classList.toggle("ready", charges > 0 && race.phase === "racing" && p.finish === null);
    ib.classList.remove("spinning");
    ib.setAttribute("aria-label", charges > 0 ? "喷射氮气，还有 " + charges + " 管" : "氮气充能 " + pct + "%");
    specialTargets = [];
  } else {
    const itemKeys = Object.keys(ITEMS),
      item = p.roulette > 0 ? itemKeys[Math.floor(clock * 14) % itemKeys.length] : p.item;
    setText("item-icon", item ? ITEMS[item].icon : "?");
    setText("item-name", p.roulette > 0 ? "惊喜抽取中…" : item ? ITEMS[item].name : "寻找道具箱");
    ib.classList.toggle("ready", !!p.item && p.roulette === 0);
    ib.classList.toggle("spinning", p.roulette > 0);
    const next = p.roulette2 > 0 ? itemKeys[Math.floor(clock * 14 + 3) % itemKeys.length] : p.item2;
    setText("item-next", next ? ITEMS[next].icon : "");
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
    setText("special-icon", sp.icon);
    setText("special-name", !ready ? "必杀 " + pct + "%" : wasted === "noTarget" ? "前方没人" : wasted === "slotsFull" ? "道具满了" : "放必杀！");
    setText("special-key", ready && p.character.id === "bear" && !specialTargets.length ? "没目标 · 只冲刺" : sp.name + (touchLayout() ? "" : " · E"));
    setVar(sb, "--accent", p.character.color);
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
  if (fill.dataset.level !== String(level)) {
    fill.dataset.level = level;
    fill.style.background = DRIFT_COLOURS[level];
    fill.style.boxShadow = "0 0 9px " + DRIFT_COLOURS[level];
  }
  const speedRace = race.rules === "speed";
  setText(
    "drift-label",
    // A drift down a straight (no bend to follow) only loses speed: say so.
    p.drifting && p.driftBend < 0.2 && p.speed > 16
      ? "直道漂移会掉速 · " + (level > 0 ? "快松开释放加速！" : "出弯就松开")
      : level > 0
        ? (p.driftAuto || save.autoDrift ? "松开方向！" : "松手！") + "释放" + ["", "蓝色", "橙色超级", "紫色完美"][level] + "加速"
        : p.drifting
          ? speedRace
            ? "保持住，过弯漂移攒氮气最快"
            : "保持住，火花变色就能加速"
          : touchLayout()
            ? save.autoDrift
              ? speedRace
                ? "进弯按住方向漂移 · 弯道漂移攒氮气"
                : "进弯按住方向就会漂移 · 按着保持 · 出弯松开加速"
              : speedRace
                ? "转向时按住漂移键 · 弯道漂移攒氮气"
                : "转向时按住漂移键 · 松手加速"
          : speedRace
            ? "按住 Shift 转向漂移 · 弯道漂移攒氮气"
            : "按住 Shift 转向漂移 · 松手加速",
  );
  const incoming = race.projectiles.some(
    (x) => x.target === 0 && race.gap(p.distance, x.distance) > 0 && race.gap(p.distance, x.distance) < 45,
  );
  // A shell locks on: the driver startles ("!").
  if (incoming && !wasIncoming && p.guard <= 0 && p.star <= 0) {
    emote(cars[0], "!", 1.1);
    kartMood(cars[0], "surprise", 1);
  }
  wasIncoming = incoming;
  const effect =
    p.rescue > 0
      ? "正在返回赛道…"
      : p.guard > 0
        ? "✨ 必杀无敌 " + p.guard.toFixed(1) + "s"
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
  setText("status-effect", effect);
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
      emote(cars[0], "♪", 0.9);
      if (rank <= 3 || lastRank - rank > 1) notify("超越！第 " + rank + " 名", 1);
    } else if (rank > lastRank) {
      // Whoever just passed us glances back with a grin (and a little song);
      // our driver looks put out.
      const by = race.standings()[rank - 2];
      if (by && by.id !== 0) {
        kartMood(cars[by.id], "happy", 0.8);
        emote(cars[by.id], "♪", 0.8);
      }
      kartMood(cars[0], "surprise", 0.5);
    }
  }
  lastRank = rank;
  const sorted = race.standings(),
    order = sorted.map((r) => r.id + (r.finish !== null ? "f" : "")).join(",");
  // Rebuilt only when the order changes (V2.5 rebuilt it ten times a second).
  if ($("ranking").dataset.order !== order) {
    $("ranking").dataset.order = order;
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
  }
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
    const [x, y] = point(race.track.sampleInto(r.distance, r.lane * 0.4, sMap).p),
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
  const [px, py] = point(race.track.sampleInto(p.distance, p.lane * 0.4, sMap).p);
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
    total = race.laps * race.track.length,
    w = hudBox.progress;
  race.racers.forEach((r, i) => {
    const f = r.finish !== null ? 1 : clamp(r.distance / total, 0, 1);
    if (progressDots[i]) progressDots[i].style.transform = "translate3d(" + (f * w).toFixed(1) + "px,0,0)";
  });
  setVar($("progress"), "--me", clamp(p.distance / total, 0, 1).toFixed(4));
  const left = Math.max(0, total - Math.max(0, p.distance));
  setText(
    "to-finish",
    p.finish !== null ? "🏁 已冲线" : "距终点 " + (left >= 1000 ? (left / 1000).toFixed(2) + " km" : Math.ceil(left) + " m"),
  );
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
    // Placed with the translate property (no layout), every frame.
    chip.style.translate = ((x / 100) * hudBox.radar).toFixed(1) + "px " + -row * 26 + "px";
    setVar(chip, "--c", t.o.character.color);
    chip.style.opacity = (0.55 + 0.45 * (1 - t.g / RADAR_RANGE)).toFixed(2);
    chip.classList.toggle("close", t.g < 8);
    setText(chip, Math.round(t.g) + "m");
    if (chip.dataset.racer !== String(t.o.id)) chip.dataset.racer = t.o.id;
  });
  if (el.dataset.count !== String(behind.length)) el.dataset.count = behind.length;
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
// Scratch track samples for the per-frame loops (Track.sampleInto), so
// drawing a frame makes no garbage for the collector to pause on.
const scratch = () => ({ p: new T.Vector3(), t: new T.Vector3(), right: new T.Vector3(), yaw: 0 });
const sKart = scratch(),
  sCam = scratch(),
  sAnchor = scratch(),
  sItem = scratch(),
  sMap = scratch(),
  sStep = scratch();
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
    roll: 0,
    ahead: 7,
    aimY: 1.25,
    wasBoost: false,
  },
  camPrev = { ...cam };
// Framing (v2.7). A phone held upright sees a tall, narrow slice of the
// world: behind v2.6's lens (66° tall, so 33° wide) the kart filled half the
// screen's width and hid the road. The portrait camera now sits further back
// and higher behind a wider lens and aims further up the road, so the kart
// is about a third of the width, sits lower in the frame, and the road ahead
// and the karts on it are in view.
const FRAMING = {
  portrait: { back: 9.6, height: 5.3, fov: 76, ahead: 13, aimY: 1 },
  landscape: { back: 7.1, height: 3.25, fov: 59, ahead: 7, aimY: 1.25 },
};
const framing = () => (innerHeight > innerWidth ? FRAMING.portrait : FRAMING.landscape);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const sLead = scratch();
function camStep(dt) {
  const p = race.player,
    s = race.track.sampleInto(p.distance, p.lane, sStep),
    F = framing(),
    finished = p.finish !== null,
    boostOn = (p.boost > 0 || p.star > 0 || p.rocket > 0) && p.rescue <= 0,
    boost = !save.reduced && boostOn,
    fast = Math.min(1, p.speed / 46),
    drifting = p.drifting && p.speed > 10,
    // Heading follows the track tangent plus part of the kart's own slip and
    // drift angle, so the camera swings gently into drifts like KartRider.
    swing = Math.atan2(p.lateral, Math.max(8, p.speed)) * 0.9 + (drifting ? (p.driftDirection || 1) * 0.42 : 0),
    // Opening shot (v2.7): through the countdown the camera cranes down from
    // high behind the grid, swinging in to its chase position half a second
    // before GO. Skipped with "reduce camera motion".
    intro = race.phase === "countdown" && !save.reduced ? 1 - smoothstep(0, 1, 1 - (race.countdown - 0.5) / 2.7) : 0;
  const back = F.back + (boost ? 0.6 : 0) + fast * 0.4 + intro * 8,
    height = F.height + (boost ? -0.12 : 0) + intro * 5.5,
    fov = F.fov + (boost ? (p.rocket > 0 ? 10 : 6.5) : 0) + fast * 3.5 - intro * 8;
  if (!cam.ready || !cameraReady) {
    Object.assign(cam, {
      ready: true,
      heading: s.yaw,
      lane: clamp(p.lane, -(race.track.width / 2 - 1.2), race.track.width / 2 - 1.2),
      y: s.p.y,
      back,
      height,
      fov,
      orbit: intro * -0.75,
      swing: 0,
      punch: 0,
      pf: 0,
      pb: 0,
      shake: 0,
      sx: 0,
      sy: 0,
      roll: 0,
      ahead: F.ahead,
      aimY: F.aimY,
      wasBoost: boostOn,
      boostCount: p.boostCount || 0,
    });
    Object.assign(camPrev, cam);
    cameraReady = true;
    return;
  }
  Object.assign(camPrev, cam);
  cam.swing = easeTo(cam.swing, swing, 6, dt);
  // Look into the bend (v2.7): the heading leads toward where the road goes
  // in the next 14 m, so the inside of a corner is in view before the kart
  // turns in. (v2.6 trailed the tangent and so looked at the outside.) A
  // drift already swings the view in, so it leads less.
  const next = race.track.sampleInto(p.distance + 14, 0, sLead).yaw,
    lead = clamp(Math.atan2(Math.sin(next - s.yaw), Math.cos(next - s.yaw)), -0.5, 0.5) * (drifting ? 0.4 : 0.7);
  cam.heading = angleTo(cam.heading, s.yaw + (finished ? 0 : lead) - cam.swing * 0.45, 6, dt);
  // The camera stays over the road: a kart scraping a rail is watched from a
  // little inside it, instead of the camera ending up in the trackside
  // balloons and trees (v2.6, now that drifts can reach the rails). It
  // follows the kart sideways a touch more loosely than v2.6 (6.5 against
  // 9), so steering moves the kart on the screen and not only the world.
  const roadside = race.track.width / 2 - 1.2;
  cam.lane = easeTo(cam.lane, clamp(p.lane, -roadside, roadside), 6.5, dt);
  cam.y = easeTo(cam.y, s.p.y, 7, dt);
  const settle = intro > 0 ? 14 : 1; // the opening shot is followed exactly
  cam.back = easeTo(cam.back, back, (boost ? 3.5 : 2.2) * settle, dt);
  cam.height = easeTo(cam.height, height, 3 * settle, dt);
  cam.fov = easeTo(cam.fov, fov, (boost ? 4 : 2.5) * settle, dt);
  cam.ahead = easeTo(cam.ahead, finished ? 0 : F.ahead, 3, dt);
  cam.aimY = easeTo(cam.aimY, finished ? 1.3 : F.aimY, 3, dt);
  // (The crane swings in from the side away from the grandstand.)
  cam.orbit = race.phase === "countdown" ? intro * -0.75 : angleTo(cam.orbit, finished ? Math.PI * 0.92 : 0, 1.1, dt);
  // Lean into the turn: steering, the bend's side force and a drift tip the
  // horizon by up to about three degrees.
  const side = clamp(-race.track.curvature(p.distance) * p.speed * p.speed * 0.011, -0.5, 0.5),
    turn = clamp(p.steer * 0.35 + side + (drifting ? (p.driftDirection || 0) * 0.5 : 0), -1, 1);
  cam.roll = easeTo(cam.roll, save.reduced || finished || race.phase !== "racing" ? 0 : -turn * 0.05, 3.5, dt);
  // Boost punch: when a boost fires, the view widens and pulls back for a
  // moment (a half sine over 0.55 s, so it starts and ends smoothly) — the
  // "push in the back" that sells a mini-turbo.
  // A new boost on top of a running one (a nitro after a drift) punches too.
  const newBoost = p.boost > 0 && (p.boostCount || 0) !== cam.boostCount;
  cam.boostCount = p.boostCount || 0;
  if (((boostOn && !cam.wasBoost) || newBoost) && !save.reduced) cam.punch = 1e-6;
  cam.wasBoost = boostOn;
  if (cam.punch > 0) cam.punch = cam.punch + dt > 0.55 ? 0 : cam.punch + dt;
  const k = cam.punch > 0 ? Math.sin((Math.PI * cam.punch) / 0.55) : 0,
    big = p.rocket > 0 || /drift3|item|nitro|start/.test(p.boostKind) ? 1.35 : p.boostKind === "draft" ? 0.7 : 1;
  cam.pf = k * 5 * big;
  cam.pb = k * 0.75 * big;
  // Hit shake: short and decaying, computed per physics step.
  if (cam.shake > 0) {
    cam.shake = Math.max(0, cam.shake - dt / 0.45);
    const t = (1 - cam.shake) * 0.45,
      a = cam.shake * cam.shake * 0.2;
    cam.sx = Math.sin(t * 61) * a;
    cam.sy = Math.cos(t * 47) * a * 0.7;
  } else cam.sx = cam.sy = 0;
  // Speed rumble: a fine tremble at full speed, a little more in a boost.
  const rumble = save.reduced || finished ? 0 : boostOn ? 0.014 : Math.max(0, (p.speed - 38) / 14) * 0.006;
  if (rumble > 0) {
    cam.sx += Math.sin(race.time * 53.1) * rumble;
    cam.sy += Math.sin(race.time * 71.3 + 1.3) * rumble * 0.8;
  }
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
let lastPlayerBoost = false,
  lastMorph = 0,
  lastTransformCue = -9;
const wheelWorld = new T.Vector3(),
  sparkVelocity = new T.Vector3();
function spark(at, colour, side, carry) {
  if (sprites) {
    sprites.add(
      GLOW,
      at.x,
      at.y,
      at.z,
      (Math.random() - 0.5) * 2.5 + side * 1.5 + (carry?.x || 0),
      1.2 + Math.random() * 2.2 + (carry?.y || 0),
      (Math.random() - 0.5) * 2.5 + (carry?.z || 0),
      0.24 + Math.random() * 0.22,
      0.2 + Math.random() * 0.14,
      colour,
      1,
      0,
      2.2,
      10,
      0.028,
    );
    return;
  }
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
// Tyre smoke takes a tint of the drift tier; marks are dark rubber by day.
const SMOKE = [0xf2efe8, 0xd2efff, 0xffdfba, 0xf8caf2],
  RUBBER = new T.Color(0.04, 0.04, 0.055),
  TIER_RGB = DRIFT_SPARKS.map((c) => new T.Color(c)),
  carry3 = new T.Vector3(),
  smokeNow = [...SMOKE],
  smokeTint = new T.Color(),
  tmpTint = new T.Color();
let smokeFor = null;
const carryOf = (s, speed) => carry3.copy(s.t).multiplyScalar(speed);
let skidGlow = false,
  emberDebt = 0,
  windDebt = 0;
function renderRace(dt) {
  const p = race.player;
  skidGlow = race.track.index === 2;
  if (smokeFor !== world.atmos) {
    smokeFor = world.atmos;
    SMOKE.forEach((c, i) => (smokeNow[i] = smokeTint.set(c).multiply(tmpTint.set(world.atmos.smoke)).getHex()));
  }
  race.racers.forEach((r, i) => {
    const at = shown(r, i),
      s = race.track.sampleInto(at.d, at.l, sKart),
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
          const dust = race.track.index === 1 ? 0xf3d9c4 : race.track.index === 2 ? 0x8a93c8 : 0x9bc46e;
          if (sprites) puff(wheelWorld, dust, 0.5, 0.55, carryOf(s, r.speed * 0.35), 1.6);
          else spark(wheelWorld, dust, 0, s.t.clone().multiplyScalar(r.speed * 0.7));
        }
    // Tyre marks and smoke from the rear wheels of a drifting kart (v2.7).
    if (skids && dt > 0) {
      const wheels = k.userData.wheels,
        near = k.position.distanceToSquared(camera.position) < 3600,
        marking = near && r.drifting && r.speed > 14 && r.jump <= 0 && r.rescue <= 0 && k.userData.vis.hop < 0.35 && Math.abs(r.lane) < race.track.width / 2 + 0.6,
        tier = driftLevel(r.drift),
        mark = skidGlow ? TIER_RGB[tier] : RUBBER;
      for (let w = 0; w < wheels.length; w++) {
        if (wheels[w].front) continue;
        if (!marking) {
          skids.lift(i * 8 + w);
          continue;
        }
        wheels[w].mesh.getWorldPosition(wheelWorld);
        skids.mark(i * 8 + w, wheelWorld.x, s.p.y + 0.066, wheelWorld.z, s.right.x, s.right.z, skidGlow ? 0.09 : 0.125, mark.r, mark.g, mark.b, skidGlow ? 0.3 : 0.4, clock);
        if (Math.random() < dt * (r.id === 0 ? 24 : 9)) {
          wheelWorld.y = s.p.y + 0.2;
          puff(wheelWorld, smokeNow[tier], r.id === 0 ? 0.3 : 0.24, 0.5, carryOf(s, r.speed * 0.3));
        }
      }
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
    boosting = (p.boost > 0 || p.star > 0 || p.rocket > 0) && p.rescue <= 0,
    freshBoost = p.boost > 0 && (p.boostCount || 0) !== lastBoostCount;
  lastBoostCount = p.boostCount || 0;
  const boostKind = p.star > 0 ? "star" : p.rocket > 0 ? "rocket" : p.boostKind || "item",
    boostColour = NITRO[boostKind]?.outer ?? 0x3fd2ff;
  if (ring && freshBoost && dt > 0)
    ring.fire(boostColour, /start|nitro|drift3|rocket|item/.test(boostKind) ? 1.25 : boostKind === "draft" ? 0.7 : 0.95);
  // The kart unfolding for a boost (变形) gets its own mechanical sound.
  const morph = playerKart.userData.vis.morph,
    unfolding = (boosting || p.guard > 0 || p.charge > 0) && morph < 0.25 && lastMorph < 0.25 && dt > 0;
  if (unfolding && clock - lastTransformCue > 0.6) {
    audio.cue("transform");
    lastTransformCue = clock;
  }
  lastMorph = morph;
  if (((boosting && !lastPlayerBoost) || (freshBoost && lastPlayerBoost)) && dt > 0) {
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
  if (trails.length || ring) {
    playerKart.updateMatrixWorld();
    const bm = playerKart.userData.body.matrixWorld;
    trails.forEach((tr, i) => {
      if (p.rescue > 0) return tr.clear(); // lifted back onto the road: no streak across
      tr.update(wheelWorld.copy(TRAIL_ANCHORS[i]).applyMatrix4(bm), boosting && p.speed > 12, boostColour, clock);
    });
    ring?.update(wheelWorld.copy(RING_ANCHOR).applyMatrix4(bm), camera.quaternion, dt);
  }
  // Embers streaming from the exhausts through a boost (v2.7).
  if (sprites && boosting && dt > 0) {
    emberDebt = Math.min(6, emberDebt + dt * 36);
    const here = race.track.sampleInto(p.distance, p.lane, sItem);
    while (emberDebt >= 1) {
      emberDebt--;
      playerKart.userData.exhaust[Math.random() < 0.5 ? 0 : 1].nozzle.getWorldPosition(wheelWorld);
      sprites.add(
        GLOW,
        wheelWorld.x,
        wheelWorld.y,
        wheelWorld.z,
        here.t.x * p.speed * 0.5 + (Math.random() - 0.5) * 3,
        0.5 + Math.random() * 2.5,
        here.t.z * p.speed * 0.5 + (Math.random() - 0.5) * 3,
        0.28 + Math.random() * 0.25,
        0.16 + Math.random() * 0.1,
        boostColour,
        1,
        0,
        1.5,
        3,
        0.03,
      );
    }
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
    mesh.position.copy(race.track.sampleInto(item.distance, item.lane, sItem).p);
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
      p0 = race.track.sampleInto(at.d, at.l, sItem).p;
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
    anchor = race.track.sampleInto(at.d, lane, sAnchor).p,
    yaw = mixAngle("heading") + mixAngle("orbit"),
    finished = p.finish !== null,
    s = race.track.sampleInto(at.d, at.l, sCam);
  camFwd.set(Math.sin(yaw), 0, Math.cos(yaw));
  camTarget.copy(anchor).addScaledVector(camFwd, -(mix("back") + mix("pb")));
  camTarget.y = mix("y") + mix("height") + mix("sy");
  camTarget.x += Math.cos(yaw) * mix("sx");
  camTarget.z -= Math.sin(yaw) * mix("sx");
  camAim.copy(anchor).addScaledVector(camFwd, mix("ahead"));
  camAim.y = mix("y") + mix("aimY");
  camera.position.copy(camTarget);
  camera.lookAt(camAim);
  const roll = mix("roll");
  if (roll) camera.rotateZ(roll);
  camera.fov = mix("fov") + mix("pf");
  camera.updateProjectionMatrix();
  world.sky.position.copy(camera.position);
  // Wind at speed (v2.7): thin streaks of light hang in the air ahead and the
  // kart rushes through them — a few at top speed, a rush of them in a boost.
  if (sprites && dt > 0 && !save.reduced && !finished && race.phase === "racing") {
    const wind = boosting ? 1 : clamp((p.speed - 34) / 12, 0, 1) * 0.45;
    windDebt = Math.min(8, windDebt + dt * wind * 64);
    while (windDebt >= 1) {
      windDebt--;
      const lat = (Math.random() < 0.5 ? -1 : 1) * (1.9 + Math.random() * 5.5),
        f = 12 + Math.random() * 30;
      sprites.add(
        GLOW,
        s.p.x + s.t.x * f + s.right.x * lat,
        s.p.y + 0.5 + Math.random() * 4.2,
        s.p.z + s.t.z * f + s.right.z * lat,
        0,
        0,
        0,
        0.55,
        0.05,
        boosting ? boostColour : 0xffffff,
        boosting ? 0.55 : 0.4,
        0,
        0,
        0,
        0.05,
        0,
        0.15,
      );
    }
  }
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
  sun.position.copy(s.p).addScaledVector(sunDir, 56);
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
    if (scaleSettle > 0) scaleSettle--;
    else {
      intervals.push(raw);
      if (intervals.length >= 180) adaptScale();
    }
  }
  if (fpsTime > 4) {
    slowWindows = fpsFrames / fpsTime < 26 ? slowWindows + 1 : 0;
    if (slowWindows >= 2 && save.quality === "auto" && !adaptiveLow) {
      // Under 26 fps: the post chain goes first, then shadows and resolution.
      if (fxOn()) {
        fxAuto = false;
        slowWindows = 0;
      } else adaptiveLow = true;
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
          const input = getInput();
          startTap = false; // a latched tap is a press for exactly one step
          race.step(STEP, input);
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
          // In the start-boost window the steering labels give way to "now!".
          const now = race.countdown <= START.window;
          show("start-hint", now);
          $("hud").dataset.start = now ? "now" : "";
          if (count !== lastCount) {
            audio.cue("tick");
            lastCount = count;
            // Each number lands with a pop.
            const el = $("countdown");
            el.classList.remove("pop");
            void el.offsetWidth;
            el.classList.add("pop");
            haptic(8);
          }
        } else {
          lastCount = -1; // the "go" event shows the banner (see processEvents)
          show("countdown", false);
          show("start-hint", false);
          $("hud").dataset.start = "";
        }
      }
    }
    renderRace(mode === "paused" || resumeTimer > 0 ? 0 : dt);
    // The map and the moving HUD parts follow every frame (V2.5: the map at
    // 30 Hz, the gauges and markers at 10 Hz, which read as stutter).
    drawMap();
    hudFrame();
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
  updateWorldFx(clock);
  if (post) {
    // Boost rush: the frame's edges streak (off with reduced motion).
    const rushing = mode === "race" && pl && !save.reduced && (pl.boost > 0 || pl.star > 0 || pl.rocket > 0) && pl.rescue <= 0;
    post.uniforms.rush.value = easeTo(post.uniforms.rush.value, rushing ? (pl.rocket > 0 || /drift3|item|nitro|start/.test(pl.boostKind) ? 1 : 0.6) : 0, rushing ? 9 : 4, dt);
  }
  if (!(fxOn() && post.render(scene, camera))) {
    if (post && !post.ok && document.documentElement.dataset.fx === "on") syncPost(); // it just failed: plain drawing from here on
    renderer.render(scene, camera);
  }
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
