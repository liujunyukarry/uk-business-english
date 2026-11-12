import * as T from "./vendor/three.module.js";
export const CHARACTERS = [
  {
    id: "gold",
    name: "小金毛",
    tag: "元气领跑员",
    color: "#eeae55",
    speed: 1,
    accel: 1.08,
    grip: 1.05,
    stats: [4, 5, 4],
  },
  {
    id: "white",
    name: "小白",
    tag: "漂移小天才",
    color: "#74b8b2",
    speed: 0.985,
    accel: 1.03,
    grip: 1.2,
    stats: [4, 4, 5],
  },
  {
    id: "dora",
    name: "哆啦 A 梦",
    tag: "口袋里的惊喜",
    color: "#36a4df",
    speed: 1,
    accel: 1.15,
    grip: 1,
    stats: [4, 5, 4],
  },
  {
    id: "mario",
    name: "马里奥",
    tag: "全能老司机",
    color: "#e65f53",
    speed: 1.025,
    accel: 1,
    grip: 1.05,
    stats: [5, 4, 4],
  },
  {
    id: "bunny",
    name: "桃桃兔",
    tag: "轻巧弯道王",
    color: "#e99fbe",
    speed: 0.975,
    accel: 1.14,
    grip: 1.18,
    stats: [3, 5, 5],
  },
  {
    id: "bear",
    name: "薄荷熊",
    tag: "稳稳向前冲",
    color: "#71bbae",
    speed: 1.035,
    accel: 0.92,
    grip: 1.08,
    stats: [5, 3, 5],
  },
  {
    id: "nova",
    name: "星星队长",
    tag: "星际赛车手",
    color: "#f5ba46",
    speed: 1.01,
    accel: 1.06,
    grip: 1.08,
    stats: [4, 4, 4],
  },
  {
    id: "milo",
    name: "泡泡探险家",
    tag: "快乐巡航员",
    color: "#a388d5",
    speed: 0.99,
    accel: 1.12,
    grip: 1.13,
    stats: [4, 5, 4],
  },
];
export const TRACKS = [
  {
    id: "meadow",
    name: "花田晴空环线",
    tag: "FLOWER VALLEY",
    desc: "大风车、花田与长长的加速直道",
    level: "推荐首赛",
    width: 16,
    sky: 0x8bd5f0,
    fog: 0xc3e6ed,
    ground: 0x7abc57,
    road: 0x5c7083,
    curb: 0xf3a981,
    accent: "#e8a057",
    points: [
      [0, 0, 0],
      [8, 0, 95],
      [80, 3, 158],
      [158, 6, 130],
      [188, 4, 48],
      [137, 1, -15],
      [157, 0, -88],
      [75, 1, -125],
      [-18, 3, -87],
    ],
  },
  {
    id: "candy",
    name: "蜜桃糖果海湾",
    tag: "CANDY COAST",
    desc: "奶油弯道、糖果路灯与薄荷海",
    level: "弯道练习",
    width: 16,
    sky: 0xccecf2,
    fog: 0xefe6ee,
    ground: 0xeccab1,
    road: 0x87738d,
    curb: 0xf0abc8,
    accent: "#dc86ad",
    points: [
      [0, 1, 0],
      [5, 1, 88],
      [70, 4, 132],
      [142, 6, 98],
      [172, 3, 25],
      [102, 1, -19],
      [157, 2, -90],
      [110, 0, -153],
      [23, 0, -113],
      [-46, 2, -50],
    ],
  },
  {
    id: "starlight",
    name: "星光云端公路",
    tag: "STARDUST WAY",
    desc: "在发光的弯道上追逐流星",
    level: "进阶挑战",
    width: 17,
    sky: 0x202747,
    fog: 0x303757,
    ground: 0x37446e,
    road: 0x5b658a,
    curb: 0x93a4f5,
    accent: "#8f9fe9",
    points: [
      [0, 3, 0],
      [0, 6, 87],
      [62, 14, 141],
      [133, 18, 118],
      [169, 11, 43],
      [113, 5, -18],
      [149, 12, -100],
      [70, 18, -144],
      [-22, 10, -100],
      [-52, 4, -48],
    ],
  },
];
export const ITEMS = {
  boost: { name: "冲刺蘑菇", icon: "🍄", desc: "短时极速冲刺" },
  shell: { name: "追踪红壳", icon: "🐢", desc: "追击前方最近的车手" },
  banana: { name: "捣蛋香蕉", icon: "🍌", desc: "留在身后，让对手打滑" },
  shield: { name: "泡泡护盾", icon: "🫧", desc: "6 秒内抵挡一次攻击" },
  star: { name: "无敌星星", icon: "⭐", desc: "5 秒加速，免疫攻击" },
  bolt: { name: "惊喜闪电", icon: "⚡", desc: "干扰前方车手" },
  rocket: { name: "火箭冲刺", icon: "🚀", desc: "落后时才会出现：自动高速冲刺，撞开挡路的车" },
};
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// Touch steering is on or off, so its feel is in how fast the wheel follows
// the thumb (rates per second; v2.6 used 11 both ways and 9 for the tyres).
// Turning in is a little quicker, and letting go centres the wheel faster
// still. Measured on a straight: the kart reaches half its sideways speed in
// 150 ms (167 before); lifting the thumb at full lock it coasts 1.1 m
// further across (1.5 before); a 0.1 s tap moves it 0.7 m (0.8 before). Top
// sideways speed, and so the line through a bend, are unchanged.
export const STEER = { turn: 13, release: 17, grip: 10.5 };
// Drift tiers (blue / orange / purple), shared with the HUD and effects.
// Mario Kart mini-turbo / KartRider instant boost: the longer the drift is
// held (faster when steering into it), the bigger the release. Each tier
// grants a boost time and an instant speed kick, the "push in the back" V2
// lacked: it only raised the target speed and eased toward it at 1.6/s, so
// a blue boost was over before it was felt.
export const DRIFT = {
  levels: [0, 0.65, 1.25, 2.0], // seconds of charge
  boost: [0, 1.0, 1.6, 2.3], // seconds of boost
  kick: [0, 3.5, 5, 7], // m/s added on release
};
export const driftLevel = (charge) =>
  charge >= DRIFT.levels[3] ? 3 : charge >= DRIFT.levels[2] ? 2 : charge >= DRIFT.levels[1] ? 1 : 0;
// Character specials (必杀技), Double Dash / KartRider style: a gauge fills
// from drift boosts, coins, landing hits (and a little from being hit or
// from time); when full, the special fires from its own button.
export const SPECIALS = {
  gold: { name: "元气三连冲", icon: "💨", desc: "连续三次冲刺，一次比一次远" },
  white: { name: "完美漂移", icon: "🌀", desc: "8 秒内每次漂移直接满紫火" },
  dora: { name: "四次元口袋", icon: "🎒", desc: "从口袋里掏出两个好道具" },
  mario: { name: "火球连发", icon: "🔥", desc: "向前方三条线发射火球" },
  bunny: { name: "蹦蹦跳", icon: "🐰", desc: "高高跳起，越过一切障碍并加速" },
  bear: { name: "熊抱冲撞", icon: "🐻", desc: "锁定前方最近的车冲过去撞飞它" },
  nova: { name: "流星雨", icon: "☄️", desc: "流星砸向前方最近的三位车手" },
  milo: { name: "泡泡护航", icon: "🫧", desc: "8 秒大泡泡，可挡两次攻击并加速" },
};
// Gauge gains (out of 100).
export const GAUGE = { drift: [0, 9, 13, 19], coin: 6, landed: 15, hurt: 12, perSecond: 1.5, ai: 0.34 };
// How readily an AI fires an attack whose victim would be the player (it
// waits a few seconds otherwise): about 2-3 hits on the player per race.
const AGGRESSION = { easy: 0.3, normal: 0.5, hard: 0.7 };
// Cornering: the outward push in a bend is curvature x speed^2 x PUSH (in
// lane metres per second). Plain steering can hold an ordinary bend; a
// tight one taken flat out needs a drift (or lifting off), as in KartRider.
export const CORNER = { push: 0.098, max: 8.5, driftPush: 0.6, scrub: 0.05 };
// Outward push of a bend (lane m/s), capped just above what full steering
// can hold, so the tightest hairpins call for a drift but never fling a kart.
export const cornerPush = (curve, speed, drifting) =>
  clamp(curve * speed * speed * CORNER.push, -CORNER.max, CORNER.max) * (drifting ? CORNER.driftPush : 1);
// Speed race (竞速赛), KartRider style: no items, coins or specials; drifting
// fills a nitro gauge that stores up to two charges, fired from a button.
export const NITRO_RULES = { perDriftSecond: 42, release: [0, 8, 13, 19], draft: 20, max: 2, boost: 2.3, kick: 8, ai: 0.72 };
// Bear's ram (熊抱冲撞): locks on to the nearest kart ahead within `range` m
// and closes on it at least `closing` m/s faster than it is going.
// The chase lasts until it connects (at most `chase` s; 3 s with no target).
export const BEAR_RAM = { range: 60, closing: 18, top: 64, chase: 4.5, reach: 2.9 };
// AI pace by class. Speed races have no items to slow the leaders down, so
// 150cc runs a touch slower there to stay winnable for a good drifter.
export const AI_PACE = {
  item: { easy: 0.86, normal: 0.97, hard: 1.07 },
  speed: { easy: 0.86, normal: 0.97, hard: 1.015 },
};
// Slipstream (尾流), both modes: sit close behind a kart in its line for a
// moment and you are pulled past with a short boost.
export const DRAFT = { min: 3.5, max: 16, lane: 1.8, charge: 1.1, boost: 1, kick: 3 };
// Kart bodies (车型), chosen in the garage: small trade-offs on top of the
// driver's own stats. speed / accel / grip multiply the driver's; boost
// stretches every boost; charge speeds up drift sparks, nitro and the
// special gauge. AI racers ride assorted bodies for looks only.
export const KARTS = {
  classic: { name: "经典卡丁", speed: 1, accel: 1, grip: 1, boost: 1, charge: 1 },
  thunder: { name: "闪电 GT", speed: 1.015, accel: 0.88, grip: 0.98, boost: 1, charge: 1 },
  jet: { name: "喷射火箭", speed: 0.99, accel: 1, grip: 0.94, boost: 1.12, charge: 1 },
  phantom: { name: "幻影星舰", speed: 0.99, accel: 1.03, grip: 1.08, boost: 1, charge: 1.15 },
};
// Start boost (起步加速), KartRider style: press (touch anywhere on the
// steering halves, the drift button, or ↑ / Space / Shift) at the moment the
// countdown runs out. A press up to `window` s before GO counts (`perfect`
// within the last moment), and so does one up to `late` s after GO
// (`latePerfect` right at it). Holding on from earlier than that is too early.
export const START = { window: 0.9, perfect: 0.3, late: 0.35, latePerfect: 0.12 };
// Drift economy (v2.6). A drift pays for its boost, as in KartRider: it
// scrubs speed, a lot on a straight and little through a bend it follows,
// and it charges (sparks and nitro) in proportion to how much bend it is
// taking. Drifting every bend wins; holding one drift down a straight or
// along a rail no longer does. `bendRef` is the curvature counted as a full
// bend; `straight*` are the rates on a straight (x the full rate); `drag` is
// the speed scrub in a full bend .. on a straight.
export const DRIFT_ECON = { bendRef: 0.012, straightCharge: 0.3, straightNitro: 0.12, drag: [0.02, 0.12] };
// How far into a bend a drift is turning: 1 through a proper bend, 0 on a
// straight or against the bend.
export const driftBend = (curve, direction) => clamp((-(direction || 0) * curve) / DRIFT_ECON.bendRef, 0, 1);
// The rails are solid (v2.6): a kart that reaches one bounces off it (the
// sideways speed comes back, scaled by `restitution`, plus up to `kick` m/s
// from the forward speed), loses speed by how square it hit (`graze` .. `hard`
// of its speed, at most `maxLoss` m/s at once) and loses its drift charge.
export const WALL = { restitution: 0.55, kick: 3, max: 9, graze: 0.05, hard: 0.22, maxLoss: 9, cooldown: 0.35 };
// Kart contact (v2.6): karts bounce off each other. A side hit sends both
// apart at `side` m/s plus `closing` x the closing speed (at most `max`); a
// rear-end costs the kart behind most of its closing speed and shoves the one
// in front. Sideways bounces decay over about `decay`^-1 s.
export const BUMP = { side: 2.4, closing: 0.5, max: 6.5, rear: 0.75, rearMin: 1.2, rearMax: 8, front: 0.35, frontMax: 3, decay: 5 };
// Firing a special makes its driver invincible (必杀无敌) for a moment:
// nothing can hit or knock it, and it shrugs off bumps. Gold's covers its
// three dashes.
export const SPECIAL_GUARD = { base: 3, gold: 3.6 };
// Item box rows span the road; see the constructor.
export const BOX_ROWS = [0.07, 0.23, 0.39, 0.55, 0.71, 0.87];
export const BOX_LANES = [-6, -3, 0, 3, 6];
export function seeded(seed = 123) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Track {
  constructor(index = 0) {
    this.index = index;
    this.config = TRACKS[index];
    this.width = this.config.width;
    this.curve = new T.CatmullRomCurve3(
      this.config.points.map((p) => new T.Vector3(...p)),
      true,
      "catmullrom",
      0.48,
    );
    this.curve.arcLengthDivisions = 2400;
    this.length = this.curve.getLength();
    this.points = this.curve.getSpacedPoints(1200);
    // Curvature at every spaced point (the yaw change over 6 m, as before),
    // so curvature() — called many times per physics step — is a table
    // lookup with no garbage instead of two fresh samples.
    this.curv = new Float32Array(1200);
    for (let i = 0; i < 1200; i++) this.curv[i] = this.curvatureAt((i / 1200) * this.length);
  }
  sample(distance, lane = 0) {
    return this.sampleInto(distance, lane, { p: new T.Vector3(), t: new T.Vector3(), right: new T.Vector3(), yaw: 0 });
  }
  // The same as sample(), written into `out` ({p, t, right, yaw}): for the
  // per-frame render loop, which would otherwise allocate every call.
  sampleInto(distance, lane, out) {
    const u = ((((distance % this.length) + this.length) % this.length) / this.length) * 1200,
      i = Math.floor(u),
      f = u - i,
      a = this.points[i],
      b = this.points[(i + 1) % 1200];
    out.p.copy(a).lerp(b, f);
    out.t.copy(b).sub(a).normalize();
    out.right.set(-out.t.z, 0, out.t.x).normalize();
    out.p.addScaledVector(out.right, lane);
    out.yaw = Math.atan2(out.t.x, out.t.z);
    return out;
  }
  curvatureAt(d) {
    const a = this.sample(d - 3).yaw,
      b = this.sample(d + 3).yaw;
    return Math.atan2(Math.sin(b - a), Math.cos(b - a)) / 6;
  }
  curvature(d) {
    const u = ((((d % this.length) + this.length) % this.length) / this.length) * 1200,
      i = Math.floor(u) % 1200,
      f = u - Math.floor(u);
    return this.curv[i] + (this.curv[(i + 1) % 1200] - this.curv[i]) * f;
  }
}
// Continuous relative contact prevents fast pickups and projectiles tunnelling.
export function sweptContact(ax, ay, bx, by, rx, ry) {
  ax /= rx;
  bx /= rx;
  ay /= ry;
  by /= ry;
  const dx = bx - ax,
    dy = by - ay,
    a = dx * dx + dy * dy,
    t = a ? clamp(-(ax * dx + ay * dy) / a, 0, 1) : 0;
  return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 <= 1;
}
export class Race {
  constructor({
    track = 0,
    character = "gold",
    difficulty = "normal",
    seed = Date.now(),
    laps = 3,
    rules = "item", // "item" (道具赛) or "speed" (竞速赛)
    kart = "classic", // the player's kart body (KARTS)
  } = {}) {
    this.rules = rules === "speed" ? "speed" : "item";
    this.track = new Track(track);
    this.rng = seeded(seed);
    this.difficulty = difficulty;
    this.laps = laps;
    this.time = 0;
    this.countdown = 3.2;
    this.phase = "countdown";
    this.events = [];
    this.projectiles = [];
    this.hazards = [];
    this.finishes = [];
    this.finishWait = 0;
    this.lateStart = 0; // seconds left to press for a start boost after GO
    this.earlyPress = false;
    this.nextId = 1;
    this.racers = [];
    const order = [character, ...CHARACTERS.map((c) => c.id).filter((id) => id !== character)].slice(0, 8);
    const kartId = KARTS[kart] ? kart : "classic",
      looks = Object.keys(KARTS);
    this.kart = kartId;
    for (let i = 0; i < 8; i++) {
      const base = CHARACTERS.find((c) => c.id === order[i]),
        k = i === 0 ? KARTS[kartId] : KARTS.classic,
        // The player's body tunes its driver (a copy: CHARACTERS is shared).
        c = i === 0 ? { ...base, speed: base.speed * k.speed, accel: base.accel * k.accel, grip: base.grip * k.grip } : base,
        distance = -5 - (3 - Math.floor(i / 2)) * 5,
        lane = (i % 2 ? 1 : -1) * 2.2;
      this.racers.push({
        id: i,
        character: c,
        kart: i === 0 ? kartId : looks[(i * 3 + Math.floor(this.rng() * 4)) % looks.length],
        boostScale: k.boost,
        chargeScale: k.charge,
        name: c.name,
        distance,
        previous: distance,
        lane,
        previousLane: lane,
        lateral: 0,
        speed: 0,
        steer: 0,
        boost: 0,
        boostKind: "", // drift1..3 / item / pad: picks the exhaust flame colour
        star: 0,
        shield: 0,
        stun: 0,
        invincible: 0,
        small: 0,
        drift: 0,
        driftDirection: 0,
        drifting: false,
        item: null,
        roulette: 0,
        aiItem: 3 + this.rng() * 5,
        aiLane: (this.rng() - 0.5) * 7,
        aiTimer: 0,
        coins: 0,
        finish: null,
        padUntil: 0,
        hits: 0,
        drifts: 0,
        itemsUsed: 0,
        wallCooldown: 0,
        rescue: 0,
        // AI racecraft: committed passing side, and corner mini-turbo state.
        passSide: 0,
        passTimer: 0,
        dodgeId: 0, // hazard currently being dodged (0 = none / decided not to)
        dodgeSide: 0,
        cornerDrift: 0,
        cornerCooldown: 0,
        // Last contact, for visual bump feedback (side and seconds remaining).
        bump: 0,
        bumpSide: 0,
        rocket: 0, // catch-up rocket: seconds remaining
        // Player drift: how long one steering direction has been held (for
        // auto-drift), whether the drift was started automatically, and how
        // long its hold condition has been broken.
        holdSteer: 0,
        holdDir: 0,
        driftAuto: false,
        driftRelease: 0,
        startPress: null, // countdown time left at the latest start press
        startHeld: false,
        startBoosted: "",
        item2: null, // second item slot (KartRider style)
        roulette2: 0,
        special: 0, // gauge 0..100
        specialsUsed: 0,
        aiSpecial: 1 + this.rng() * 3,
        dashLeft: 0, // gold: remaining dashes
        dashTimer: 0,
        perfectDrift: 0, // white: seconds of instant purple drifts
        jump: 0, // bunny: seconds airborne
        charge: 0, // bear: seconds of the homing ram
        chargeTarget: null,
        shieldHits: 0, // hits the current shield still absorbs
        nitro: 0, // speed race: gauge 0..100
        nitroCharges: 0,
        nitroUsed: 0,
        aiNitro: 1 + this.rng() * 2,
        draft: 0, // seconds spent in a slipstream
        draftCooldown: 0,
        drafts: 0,
        guard: 0, // seconds of special invincibility (必杀无敌)
        rebound: 0, // sideways bounce speed (lane m/s) from a rail or a kart
        walls: 0, // rail hits
        driftBend: 0, // how much bend the current drift is taking (0..1)
      });
    }
    this.player = this.racers[0];
    this.meteors = [];
    this.boxes = [];
    this.coins = [];
    this.pads = [];
    // Item boxes, Mario Kart / KartRider style: every row spans the road and
    // a box one racer takes is gone for that racer only (it stays live for
    // the others). V2 had three shared boxes per row on a 3 s respawn, so
    // the pack ahead emptied each row before the player, who starts at the
    // back, got there. `cooldown` still switches a box off for everyone.
    // A speed race has no item boxes or coins.
    if (this.rules === "item")
      for (const f of BOX_ROWS)
      for (const lane of BOX_LANES)
        this.boxes.push({
          id: this.nextId++,
          distance: this.track.length * f,
          lane,
          cooldown: 0,
          taken: new Float32Array(8),
        });
    if (this.rules === "item")
      for (let row = 0; row < 12; row++)
        for (let j = 0; j < 3; j++)
        this.coins.push({
          id: this.nextId++,
          distance: this.track.length * (0.04 + row * 0.078) + j * 4,
          lane: Math.sin(row * 1.7) * 4,
          cooldown: 0,
          taken: new Float32Array(8),
        });
    for (const f of [0.2, 0.48, 0.77])
      this.pads.push({ distance: this.track.length * f, lane: f === 0.48 ? -3 : 3 });
  }
  event(type, data = {}) {
    this.events.push({ type, ...data });
  }
  standings() {
    return [...this.racers].sort((a, b) =>
      a.finish !== null && b.finish !== null
        ? a.finish - b.finish || a.id - b.id
        : a.finish !== null
          ? -1
          : b.finish !== null
            ? 1
            : b.distance - a.distance || a.id - b.id,
    );
  }
  rank(r = this.player) {
    return this.standings().findIndex((x) => x.id === r.id) + 1;
  }
  gap(a, b) {
    let d = (a - b) % this.track.length;
    if (d > this.track.length / 2) d -= this.track.length;
    if (d < -this.track.length / 2) d += this.track.length;
    return d;
  }
  contact(r, o, rx, ry) {
    const end = this.gap(r.distance, o.distance);
    return sweptContact(
      end - (r.distance - r.previous),
      r.previousLane - o.lane,
      end,
      r.lane - o.lane,
      rx,
      ry,
    );
  }
  clearDrift(r) {
    r.drift = 0;
    r.drifting = false;
    r.driftDirection = 0;
    r.driftAuto = false;
    r.driftRelease = 0;
  }
  // Player drift. Manual: hold drift (button / Shift) while steering, or in a
  // bend without steering (it then drifts toward the inside). Automatic, for
  // touch: keep holding one direction through a bend. Release to boost; the
  // charge grows faster while steering into the drift.
  playerDrift(r, steer, held, curve, valid, input, dt) {
    if (!r.drifting) {
      if (!valid || r.speed < 16) return;
      // The inside of a bend is the -sign(curve) side (its push is outward,
      // toward +sign(curve)); "into the bend" means steering that way.
      const dir = Math.sign(steer) || (Math.abs(curve) > 0.003 ? -Math.sign(curve) : 0),
        manual = held && dir !== 0 && (steer === 0 || Math.abs(r.steer) > 0.18),
        auto =
          !held &&
          !!input.autoDrift &&
          r.speed > 20 &&
          r.holdSteer >= 0.28 &&
          -Math.sign(steer) * curve > 0.008;
      if (!manual && !auto) return;
      r.drifting = true;
      r.driftDirection = manual ? dir : Math.sign(steer);
      r.driftAuto = !manual;
      r.drift = 0;
      r.driftRelease = 0;
      this.event("driftStart", { racer: r.id, direction: r.driftDirection });
      if (r.perfectDrift > 0) {
        // White's special: every drift starts fully charged.
        r.drift = DRIFT.levels[3];
        this.event("driftLevel", { racer: r.id, level: 3 });
      }
      return;
    }
    // One-thumb drifting on touch: once a drift has started (on its own in a
    // bend, or from a tap on the drift button), keeping the steering
    // direction held keeps it going; letting go releases the boost. With a
    // keyboard (auto-drift off) the drift key itself must stay held.
    const steerHolds = (r.driftAuto || input.autoDrift) && Math.sign(steer) === r.driftDirection,
      holding = held || steerHolds;
    r.driftRelease = holding ? 0 : r.driftRelease + dt;
    if (!valid) return this.clearDrift(r);
    // A touch drift tolerates a finger flicker of a few frames.
    if (r.driftRelease > (r.driftAuto || input.autoDrift ? 0.1 : 0)) {
      const level = driftLevel(r.drift);
      if (level) {
        this.startBoost(r, DRIFT.boost[level], "drift" + level, DRIFT.kick[level]);
        this.gain(r, GAUGE.drift[level]);
        this.gainNitro(r, NITRO_RULES.release[level]);
        r.drifts++;
        this.event("drift", { racer: r.id, level });
      }
      return this.clearDrift(r);
    }
    const was = driftLevel(r.drift),
      bend = (r.driftBend = driftBend(curve, r.driftDirection));
    // Sparks and nitro charge with the bend the drift is taking: full rate
    // through a bend, a trickle on a straight (DRIFT_ECON).
    r.drift = Math.min(
      2.6,
      r.drift +
        dt *
          (0.75 + 0.5 * clamp(steer * r.driftDirection, -0.5, 1)) *
          (r.chargeScale || 1) *
          (DRIFT_ECON.straightCharge + (1 - DRIFT_ECON.straightCharge) * bend),
    );
    this.gainNitro(r, NITRO_RULES.perDriftSecond * dt * (DRIFT_ECON.straightNitro + (1 - DRIFT_ECON.straightNitro) * bend));
    const now = driftLevel(r.drift);
    if (now > was) this.event("driftLevel", { racer: r.id, level: now });
  }
  // Item odds by how far behind the racer is, Mario Kart style: the leader
  // mostly gets defensive items, the back of the pack gets catch-up items
  // (stars, lightning, and the rocket only when far behind).
  itemOdds(r) {
    const field = this.racers.filter((x) => x.finish === null),
      leader = Math.max(r.distance, ...field.map((x) => x.distance)),
      behind = clamp((leader - r.distance) / 140, 0, 1),
      rank = this.rank(r),
      t = Math.max(behind, ((rank - 1) / 7) * 0.85);
    return {
      banana: 3 - 2.6 * t,
      shell: 2.2 - 0.4 * t,
      shield: 2 - 1.3 * t,
      boost: 1.2 + 1.8 * t,
      star: t < 0.45 ? 0 : 1.7 * t,
      bolt: t < 0.6 ? 0 : 1.0 * t,
      rocket: rank >= 6 && behind > 0.5 ? 3.5 * (behind - 0.4) : 0,
    };
  }
  rollItem(odds) {
    const total = Object.values(odds).reduce((s, w) => s + w, 0);
    let pick = this.rng() * total;
    for (const [item, w] of Object.entries(odds)) if ((pick -= w) < 0) return item;
    return "boost";
  }
  // Two item slots, KartRider style: a box fills the first free slot.
  giveItem(r, box = null) {
    const item = this.rollItem(this.itemOdds(r));
    let slot = 1;
    if (!r.item) {
      r.item = item;
      r.roulette = 0.7;
    } else {
      r.item2 = item;
      r.roulette2 = 0.7;
      slot = 2;
    }
    // AI racers hold an item for a few seconds (and so skip some box rows)
    // instead of firing everything at once: about two hits on the player per
    // race at 100cc, not one every ten seconds.
    if (slot === 1) r.aiItem = 3 + this.rng() * 6;
    this.event("pickup", { racer: r.id, box: box?.id ?? null, slot });
  }
  // Special gauge.
  gain(r, amount) {
    if (r.finish !== null || this.rules !== "item") return;
    const before = r.special;
    r.special = Math.min(100, r.special + amount * (r.id === 0 ? r.chargeScale || 1 : GAUGE.ai));
    if (before < 100 && r.special >= 100) this.event("specialReady", { racer: r.id });
  }
  // Every boost goes through here: the timer, the flame colour, and an
  // instant speed kick so the push is felt the moment it starts.
  startBoost(r, seconds, kind, kick = 0) {
    r.boost = Math.max(r.boost, seconds * (r.boostScale || 1));
    r.boostCount = (r.boostCount || 0) + 1; // lets the renderer see each new boost
    if (!(r.rocket > 0) || kind === "rocket") r.boostKind = kind; // a rocket keeps its flames
    // One kick per physics step: an item and a drift release landing in the
    // same 1/60 s must not add up to a jolt. (A tap between steps, from the
    // player, always kicks.)
    if (kick > 0 && !(this.inStep && r.lastKick === this.stepNo)) {
      r.lastKick = this.inStep ? this.stepNo : -1;
      r.speed = Math.min(Math.max(0, r.speed) + kick, 58);
    }
  }
  useItem(r = this.player) {
    if (this.phase !== "racing" || !r.item || r.roulette > 0 || r.finish !== null || r.rescue > 0)
      return false;
    const type = r.item;
    r.itemPatient = false;
    // The second slot moves up (with whatever is left of its roulette).
    r.item = r.item2;
    r.roulette = r.roulette2;
    r.item2 = null;
    r.roulette2 = 0;
    if (r.item && r.id !== 0) r.aiItem = 2 + this.rng() * 4;
    r.itemsUsed++;
    if (type === "boost") this.startBoost(r, 2.5, "item", 6);
    if (type === "star") {
      r.star = 5;
      r.stun = 0;
      r.small = 0;
    }
    if (type === "rocket") {
      r.rocket = 3.2;
      r.stun = 0;
      r.small = 0;
      this.clearDrift(r);
      this.startBoost(r, 3.2, "rocket", 8);
    }
    if (type === "shield") {
      r.shield = Math.max(r.shield, 6);
      r.shieldHits = Math.max(r.shieldHits, 1);
    }
    if (type === "banana")
      this.hazards.push({
        id: this.nextId++,
        owner: r.id,
        distance: r.distance - 4.2,
        lane: r.lane,
        life: 22,
      });
    if (type === "shell") {
      const ahead = this.racers
        .filter(
          (o) =>
            o !== r &&
            o.finish === null &&
            this.gap(o.distance, r.distance) > 2 &&
            this.gap(o.distance, r.distance) < 180,
        )
        .sort((a, b) => this.gap(a.distance, r.distance) - this.gap(b.distance, r.distance))[0];
      this.projectiles.push({
        id: this.nextId++,
        owner: r.id,
        target: ahead?.id ?? null,
        distance: r.distance + 3,
        lane: r.lane,
        life: 6,
      });
    }
    if (type === "bolt")
      for (const other of this.racers)
        if (other.distance > r.distance && other !== r && other.finish === null) {
          if (this.hit(other, r.id, 0.5)) other.small = 3;
        }
    this.event("item", { racer: r.id, item: type });
    return true;
  }
  hit(r, owner, stun = 1.1) {
    if (r.finish !== null || r.rescue > 0 || r.invincible > 0 || r.star > 0 || r.rocket > 0) return false;
    if (r.guard > 0 || r.jump > 0 || r.charge > 0) {
      // 必杀无敌: the attack bounces off.
      this.event("guardBlock", { racer: r.id, owner });
      return false;
    }
    if (r.shield > 0) {
      if (--r.shieldHits <= 0) {
        r.shield = 0;
        r.shieldHits = 0;
      }
      r.invincible = 0.7;
      this.event("block", { racer: r.id });
      return false;
    }
    r.stun = stun;
    r.invincible = 2.6;
    r.speed *= 0.5;
    r.lateral *= 0.25;
    r.coins = Math.max(0, r.coins - 2);
    this.clearDrift(r);
    r.hits++;
    this.event("hit", { racer: r.id, owner });
    this.gain(r, GAUGE.hurt);
    const by = this.racers[owner];
    if (by && by !== r) this.gain(by, GAUGE.landed);
    return true;
  }
  // --- Character specials ----------------------------------------------------
  // The nearest karts ahead. Specials pick ones they can hurt: a kart under
  // a star, a rocket or 必杀无敌 is passed over (it would only bounce off).
  nearestAhead(r, range = 200, count = 1, vulnerable = true) {
    return this.racers
      .filter((o) => o !== r && o.finish === null && o.rescue <= 0 && !(vulnerable && (o.guard > 0 || o.star > 0 || o.rocket > 0)))
      .map((o) => ({ o, g: this.gap(o.distance, r.distance) }))
      .filter((x) => x.g > 1.5 && x.g < range)
      .sort((a, b) => a.g - b.g)
      .slice(0, count)
      .map((x) => x.o);
  }
  rocketStart(p, perfect) {
    this.startBoost(p, perfect ? 1.6 : 0.9, perfect ? "start" : "drift1", perfect ? 16 : 11);
    p.startBoosted = perfect ? "perfect" : "good";
    this.event("rocketStart", { racer: 0, perfect });
  }
  // --- Speed race: nitro --------------------------------------------------------
  gainNitro(r, amount) {
    if (this.rules !== "speed" || r.finish !== null || r.nitroCharges >= NITRO_RULES.max) return;
    r.nitro += amount * (r.id === 0 ? r.chargeScale || 1 : NITRO_RULES.ai);
    while (r.nitro >= 100 && r.nitroCharges < NITRO_RULES.max) {
      r.nitro -= 100;
      r.nitroCharges++;
      this.event("nitroReady", { racer: r.id, charges: r.nitroCharges });
    }
    if (r.nitroCharges >= NITRO_RULES.max) r.nitro = 0;
  }
  useNitro(r = this.player) {
    if (this.rules !== "speed" || this.phase !== "racing" || r.nitroCharges <= 0 || r.finish !== null || r.rescue > 0)
      return false;
    r.nitroCharges--;
    r.nitroUsed++;
    r.stun = 0;
    this.startBoost(r, NITRO_RULES.boost, "nitro", NITRO_RULES.kick);
    this.event("nitro", { racer: r.id });
    return true;
  }
  useSpecial(r = this.player) {
    if (this.rules !== "item" || this.phase !== "racing" || r.special < 100 || r.finish !== null || r.rescue > 0)
      return false;
    const kind = r.character.id;
    r.special = 0;
    r.stun = 0;
    r.small = 0;
    r.specialsUsed++;
    r.guard = Math.max(r.guard, SPECIAL_GUARD[kind] ?? SPECIAL_GUARD.base);
    if (kind === "gold") {
      this.startBoost(r, 1.3, "item", 6);
      r.dashLeft = 2;
      r.dashTimer = 1.15;
    } else if (kind === "white") {
      r.perfectDrift = 8;
      this.startBoost(r, 0.8, "drift3", 4);
    } else if (kind === "dora") {
      const odds = { ...this.itemOdds(r), banana: 0.4, rocket: 0 },
        a = this.rollItem(odds),
        b = this.rollItem(odds);
      if (!r.item) {
        r.item = a;
        r.roulette = 0.5;
        r.item2 = b;
        r.roulette2 = 0.5;
      } else {
        r.item2 = a;
        r.roulette2 = 0.5;
      }
    } else if (kind === "mario") {
      const half = this.track.width / 2;
      for (const off of [-3.2, 0, 3.2])
        this.projectiles.push({
          id: this.nextId++,
          owner: r.id,
          target: null,
          kind: "fire",
          distance: r.distance + 3,
          lane: clamp(r.lane + off, -half + 1, half - 1),
          life: 2.2,
        });
    } else if (kind === "bunny") {
      r.jump = 1.6;
      this.clearDrift(r);
      this.startBoost(r, 2, "pad", 5);
    } else if (kind === "bear") {
      const target = this.nearestAhead(r, BEAR_RAM.range)[0];
      r.charge = target ? BEAR_RAM.chase : 3;
      r.chargeTarget = target?.id ?? null;
      this.clearDrift(r);
      this.startBoost(r, 3, "item", 7);
    } else if (kind === "nova") {
      this.nearestAhead(r, 220, 3).forEach((o, i) =>
        this.meteors.push({ id: this.nextId++, owner: r.id, target: o.id, t: 0.75 + i * 0.25 }),
      );
    } else if (kind === "milo") {
      r.shield = Math.max(r.shield, 8);
      r.shieldHits = 2;
      this.startBoost(r, 1.5, "pad", 4);
    }
    this.event("special", { racer: r.id, kind });
    return true;
  }
  // Would this AI's attack land on the player?
  aimsAtPlayer(r, what) {
    const p = this.player;
    if (p.finish !== null) return false;
    if (what === "bolt") return this.gap(p.distance, r.distance) > 0;
    if (what === "shell") return this.nearestAhead(r, 180, 1, false)[0] === p; // a shell homes on whoever is next
    if (what === "special:bear" || what === "special:mario")
      return this.nearestAhead(r, what === "special:bear" ? BEAR_RAM.range : 70)[0] === p;
    if (what === "special:nova") return this.nearestAhead(r, 220, 3).includes(p);
    return false;
  }
  // When an AI fires its special: only when it would do something.
  aiSpecialUseful(r) {
    const kind = r.character.id;
    if (kind === "mario") return this.nearestAhead(r, 60).length > 0;
    if (kind === "bear") return this.nearestAhead(r, BEAR_RAM.range).length > 0;
    if (kind === "nova") return this.nearestAhead(r, 220).length > 0;
    if (kind === "dora") return !r.item2;
    if (kind === "white") return Math.abs(this.track.curvature(r.distance + 25)) > 0.012;
    return true;
  }
  // Who an attack special would hit if fired now (racer ids), so the HUD can
  // mark them before the player commits: the bear's charge target, Nova's
  // three meteor targets, and karts in the fireballs' three lines.
  specialTargets(r = this.player) {
    const kind = r.character.id;
    if (kind === "bear") return this.nearestAhead(r, BEAR_RAM.range).map((o) => o.id);
    if (kind === "nova") return this.nearestAhead(r, 220, 3).map((o) => o.id);
    if (kind === "mario")
      return this.nearestAhead(r, 70, 7)
        .filter((o) => Math.abs(o.lane - r.lane) < 4.7)
        .map((o) => o.id);
    return [];
  }
  // Why firing the special now would be wasted, or null. Meteors and
  // fireballs with nobody ahead do nothing; the pocket with both item slots
  // full would throw an item away.
  specialWasted(r = this.player) {
    const kind = r.character.id;
    if (kind === "nova" && !this.nearestAhead(r, 220).length) return "noTarget";
    if (kind === "mario" && !this.nearestAhead(r, 70).length) return "noTarget";
    if (kind === "dora" && r.item && r.item2 && r.roulette <= 0 && r.roulette2 <= 0) return "slotsFull";
    return null;
  }
  // A star or rocket knocks the kart it touches aside (spin-out plus a
  // sideways shove), so it clears the way instead of pushing it along.
  knock(victim, attacker) {
    if (!this.hit(victim, attacker.id)) return false;
    const side = Math.sign(victim.lane - attacker.lane) || (victim.id % 2 ? 1 : -1);
    victim.rebound = side * 7;
    victim.bump = 0.35;
    victim.bumpSide = side;
    return true;
  }
  constrain(r) {
    const half = this.track.width / 2,
      limit = half + 1.05;
    if (!Number.isFinite(r.lane) || Math.abs(r.lane) > half + 4) {
      r.lane = Number.isFinite(r.lane) ? clamp(r.lane, -half + 2, half - 2) : 0;
      r.previousLane = r.lane;
      r.lateral = 0;
      r.rebound = 0;
      r.speed = 0;
      r.rescue = 1.1;
      r.invincible = 2.5;
      this.clearDrift(r);
      this.event("rescue", { racer: r.id });
      return;
    }
    if (Math.abs(r.lane) > limit) {
      // Solid rail: bounce back off it (WALL).
      const side = Math.sign(r.lane),
        into = Math.max(0, ((r.lateral || 0) + (r.rebound || 0)) * side);
      r.lane = side * limit;
      if (r.lateral * side > 0) r.lateral = 0;
      if (into > 0 || r.rebound * side > 0)
        r.rebound = -side * Math.min(WALL.max, into * WALL.restitution + WALL.kick * clamp(r.speed / 30, 0, 1));
      if (r.wallCooldown <= 0) {
        const impact = clamp(into / 10, 0, 1);
        r.speed -= Math.min(WALL.maxLoss, Math.max(0, r.speed) * (WALL.graze + (WALL.hard - WALL.graze) * impact));
        r.wallCooldown = WALL.cooldown;
        r.walls++;
        r.bump = 0.35;
        r.bumpSide = -side * (0.6 + impact);
        this.event("wall", { racer: r.id, side, impact, drift: r.drifting ? driftLevel(r.drift) : 0 });
      }
      this.clearDrift(r);
    }
  }
  step(dt, input = {}) {
    this.stepNo = (this.stepNo || 0) + 1;
    this.inStep = true;
    try {
      this.advance(dt, input);
    } finally {
      this.inStep = false;
    }
  }
  advance(dt, input) {
    dt = clamp(dt, 0, 0.05);
    this.events = [];
    if (this.phase === "finished") return;
    if (this.phase === "countdown") {
      // Start boost (KartRider / MK): the moment of the latest press counts,
      // so a tap right at GO works, and a hold from long before does not.
      const p = this.player,
        pressed = !!input.start && !p.startHeld;
      p.startHeld = !!input.start;
      if (pressed) p.startPress = this.countdown;
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = "racing";
        this.event("go");
        if (p.startPress !== null && p.startPress <= START.window) this.rocketStart(p, p.startPress <= START.perfect);
        else if (p.startHeld) this.event("startEarly", { racer: 0 });
        else {
          // Not pressed yet (or an early tap was let go): a press in the
          // next moment still counts.
          this.lateStart = START.late;
          this.earlyPress = p.startPress !== null;
        }
        const chance = { easy: 0.15, normal: 0.3, hard: 0.5 }[this.difficulty] ?? 0.3;
        for (const r of this.racers.slice(1)) if (this.rng() < chance) this.startBoost(r, 0.9, "drift1", 10);
      }
      return;
    }
    if (this.lateStart > 0) {
      const p = this.player,
        pressed = !!input.start && !p.startHeld;
      this.lateStart -= dt;
      if (pressed) {
        this.rocketStart(p, START.late - this.lateStart <= START.latePerfect);
        this.lateStart = 0;
      } else if (this.lateStart <= 0 && this.earlyPress) this.event("startEarly", { racer: 0 });
    }
    this.player.startHeld = !!input.start;
    this.time += dt;
    for (const a of this.boxes) {
      a.cooldown = Math.max(0, a.cooldown - dt);
      for (let i = 0; i < 8; i++) if (a.taken[i] > 0) a.taken[i] = Math.max(0, a.taken[i] - dt);
    }
    for (const a of this.coins) {
      a.cooldown = Math.max(0, a.cooldown - dt);
      for (let i = 0; i < 8; i++) if (a.taken[i] > 0) a.taken[i] = Math.max(0, a.taken[i] - dt);
    }
    for (const r of this.racers) {
      r.previous = r.distance;
      r.previousLane = r.lane;
      for (const k of [
        "boost",
        "star",
        "shield",
        "stun",
        "invincible",
        "small",
        "roulette",
        "wallCooldown",
        "rescue",
        "passTimer",
        "cornerCooldown",
        "bump",
        "rocket",
        "roulette2",
        "perfectDrift",
        "jump",
        "charge",
        "guard",
      ])
        r[k] = Math.max(0, r[k] - dt);
      r.rebound *= Math.exp(-dt * BUMP.decay);
      if (Math.abs(r.rebound) < 0.05) r.rebound = 0;
      this.constrain(r);
      if (r.rescue > 0) continue;
      if (r.finish === null) this.gain(r, GAUGE.perSecond * dt);
      // Gold's triple dash: the next two dashes fire on their own.
      if (r.dashLeft > 0 && (r.dashTimer -= dt) <= 0) {
        r.dashLeft--;
        r.dashTimer = 1.15;
        this.startBoost(r, 1.3, "item", 6);
        this.event("dash", { racer: r.id });
      }
      const isPlayer = r.id === 0 && r.finish === null,
        curve = this.track.curvature(r.distance),
        half = this.track.width / 2;
      let steer = isPlayer ? clamp(input.steer || 0, -1, 1) : 0,
        drift = isPlayer && !!input.drift,
        throttle = isPlayer ? input.throttle !== false : true;
      if (isPlayer) {
        const dir = Math.sign(steer);
        r.holdSteer = dir && dir === r.holdDir ? r.holdSteer + dt : dir ? dt : 0;
        r.holdDir = dir;
      }
      let blocker = null,
        blockGap = Infinity;
      if (!isPlayer) {
        r.aiTimer -= dt;
        if (r.aiTimer <= 0) {
          r.aiTimer = 1.3 + this.rng() * 2.2;
          // Nearest row ahead, and the box in it closest to our line.
          const next = this.boxes
            .filter(
              (b) =>
                b.cooldown <= 0 &&
                !(b.taken[r.id] > 0) &&
                this.gap(b.distance, r.distance) > 3 &&
                this.gap(b.distance, r.distance) < 65,
            )
            .sort(
              (a, b) =>
                this.gap(a.distance, r.distance) - this.gap(b.distance, r.distance) ||
                Math.abs(a.lane - r.lane) - Math.abs(b.lane - r.lane),
            )[0];
          r.aiLane = !r.item && next ? next.lane : (this.rng() - 0.5) * 8;
        }
        // Racecraft: a kart ahead in our line is passed on a committed side
        // instead of being rammed (V2 AIs drove straight into the player).
        for (const o of this.racers) {
          if (o === r || o.rescue > 0) continue;
          const g = this.gap(o.distance, r.distance);
          if (g > 0.5 && g < 16 && g < blockGap && Math.abs(o.lane - r.lane) < 2.7) {
            blocker = o;
            blockGap = g;
          }
        }
        let targetLane = r.aiLane;
        if (blocker && r.speed > blocker.speed - 1.5) {
          const room = half - 1.7,
            canLeft = blocker.lane - 3 > -room,
            canRight = blocker.lane + 3 < room;
          let side = r.passSide;
          if (!side || (side < 0 && !canLeft) || (side > 0 && !canRight))
            side = canLeft && canRight ? (r.lane <= blocker.lane ? -1 : 1) : canLeft ? -1 : 1;
          r.passSide = side;
          r.passTimer = 0.9;
        }
        if (r.passTimer > 0 && r.passSide) {
          const ref = blocker ? blocker.lane : r.lane - r.passSide * 3;
          targetLane = clamp(ref + r.passSide * 3, -half + 1.7, half - 1.7);
        } else r.passSide = 0;
        // Side by side: hold a lane gap instead of drifting into the other kart.
        for (const o of this.racers) {
          if (o === r || o.rescue > 0) continue;
          const g = this.gap(o.distance, r.distance),
            gapLane = r.lane - o.lane;
          if (Math.abs(g) > 3.4 || Math.abs(gapLane) > 3.4) continue;
          const side = Math.sign(gapLane) || (r.id % 2 ? 1 : -1),
            keep = o.lane + side * 3;
          if (Math.abs(keep) < half - 1.2)
            targetLane = side > 0 ? Math.max(targetLane, keep) : Math.min(targetLane, keep);
        }
        // Bananas in our line: most of the time (more often on harder
        // difficulties) steer round them, decided once per banana.
        let hazard = null,
          hazardGap = 22;
        for (const h of this.hazards) {
          const g = this.gap(h.distance, r.distance);
          if (g > 0 && g < hazardGap && Math.abs(h.lane - r.lane) < 2.4) {
            hazard = h;
            hazardGap = g;
          }
        }
        if (hazard && r.dodgeId !== hazard.id) {
          r.dodgeId = hazard.id;
          const dodge = this.rng() < ({ easy: 0.45, normal: 0.75, hard: 0.95 }[this.difficulty] || 0.75);
          const roomLeft = hazard.lane - 2.8 > -half + 1.4,
            roomRight = hazard.lane + 2.8 < half - 1.4;
          let side = r.lane <= hazard.lane ? -1 : 1; // keep to the side we are already on
          if (side < 0 && !roomLeft) side = 1;
          else if (side > 0 && !roomRight) side = -1;
          r.dodgeSide = dodge ? side : 0;
        }
        if (hazard && r.dodgeId === hazard.id && r.dodgeSide)
          targetLane = clamp(hazard.lane + r.dodgeSide * 2.8, -half + 1.4, half - 1.4);
        // Counter-steer the bend's outward push (see CORNER), as a driver would.
        const lean = cornerPush(curve, r.speed, r.cornerDrift > 0) / (7.8 * r.character.grip);
        steer = clamp((targetLane - r.lane) * 0.45 - lean, -1, 1);
        r.aiItem -= dt;
        if (r.aiItem <= 0 && r.item) {
          // An attack that would land on the player is fired only on a
          // successful roll; otherwise the AI keeps it for another victim.
          // Nobody wastes one on a player under a star or 必杀无敌.
          const aimed = this.aimsAtPlayer(r, r.item),
            immune = this.player.guard > 0 || this.player.star > 0;
          if (aimed && immune) r.aiItem = 0.5 + this.rng() * 0.5;
          else if (aimed && (r.itemPatient || this.rng() > (AGGRESSION[this.difficulty] ?? 0.5))) {
            r.itemPatient = true;
            r.aiItem = 1.5 + this.rng() * 2;
          } else this.useItem(r);
        }
        if (r.nitroCharges > 0 && (r.aiNitro -= dt) <= 0) {
          r.aiNitro = 0.8 + this.rng() * 2.5;
          if (Math.abs(this.track.curvature(r.distance + 25)) < 0.012 && r.stun <= 0) this.useNitro(r);
        }
        if (r.special >= 100 && (r.aiSpecial -= dt) <= 0) {
          r.aiSpecial = 1 + this.rng() * 3;
          const attack = this.aimsAtPlayer(r, "special:" + r.character.id),
            immune = this.player.guard > 0 || this.player.star > 0;
          if (this.aiSpecialUseful(r) && (!attack || (!immune && this.rng() < (AGGRESSION[this.difficulty] ?? 0.5))))
            this.useSpecial(r);
        }
        // Corner mini-turbo: the AI visibly drifts through a real corner and
        // releases a short boost on exit, instead of V2's random mid-corner
        // speed spikes that read as karts "teleporting" past.
        if (r.cornerDrift > 0) {
          r.cornerDrift += dt;
          r.drift = Math.min(2.6, r.cornerDrift);
          r.driftBend = driftBend(curve, r.driftDirection);
          this.gainNitro(r, NITRO_RULES.perDriftSecond * dt * (DRIFT_ECON.straightNitro + (1 - DRIFT_ECON.straightNitro) * r.driftBend));
          if (Math.abs(curve) < 0.004 || r.cornerDrift > 1.9 || r.stun > 0 || r.speed < 14) {
            if (r.stun <= 0 && r.cornerDrift >= DRIFT.levels[1]) {
              const level = r.perfectDrift > 0 ? 3 : Math.min(2, driftLevel(r.cornerDrift));
              this.startBoost(r, DRIFT.boost[level], "drift" + level, DRIFT.kick[level]);
              this.gain(r, GAUGE.drift[level]);
              this.gainNitro(r, NITRO_RULES.release[level]);
              this.event("drift", { racer: r.id, level });
            }
            r.cornerDrift = 0;
            r.cornerCooldown = 2.5;
            this.clearDrift(r);
          }
        } else if (
          r.cornerCooldown <= 0 &&
          Math.abs(curve) > 0.007 &&
          r.speed > 22 &&
          r.stun <= 0 &&
          r.finish === null
        ) {
          r.cornerCooldown = 2.5;
          // Tight bends always get a drift (plain steering cannot hold them
          // flat out); gentler ones sometimes, more often on harder classes.
          if (
            Math.abs(curve) > 0.03 ||
            this.rng() < ({ easy: 0.35, normal: 0.6, hard: 0.85 }[this.difficulty] || 0.6)
          ) {
            r.cornerDrift = dt;
            r.drifting = true;
            r.driftDirection = -Math.sign(curve); // nose toward the inside
          }
        }
      }
      // Rocket: autopilot along the middle of the road, input ignored.
      if (r.rocket > 0) {
        steer = clamp(-r.lane * 0.3, -0.6, 0.6);
        drift = false;
        throttle = true;
        r.cornerDrift = 0;
      }
      // Bear's ram: homes in on its target's line.
      if (r.charge > 0) {
        const t = this.racers[r.chargeTarget];
        // The chase ends once its target is gone or has been passed.
        if (r.chargeTarget !== null && (!t || t.finish !== null || t.rescue > 0 || this.gap(t.distance, r.distance) < -2)) {
          r.chargeTarget = null;
          r.charge = Math.min(r.charge, 0.3);
        }
        steer = t && t.finish === null ? clamp((t.lane - r.lane) * 0.9, -1, 1) : 0;
        drift = false;
        throttle = true;
        r.cornerDrift = 0;
      }
      // Slipstream (尾流): close behind a kart in its line, charge up; then a
      // short boost pulls you past.
      r.draftCooldown = Math.max(0, r.draftCooldown - dt);
      let drafting = false;
      if (r.draftCooldown <= 0 && r.speed > 20 && r.stun <= 0 && r.boost <= 0 && r.finish === null)
        for (const o of this.racers) {
          if (o === r || o.finish !== null || o.rescue > 0 || o.jump > 0) continue;
          const g = this.gap(o.distance, r.distance);
          if (g > DRAFT.min && g < DRAFT.max && Math.abs(o.lane - r.lane) < DRAFT.lane) {
            drafting = true;
            break;
          }
        }
      r.draft = drafting ? r.draft + dt : Math.max(0, r.draft - dt * 2);
      if (r.draft >= DRAFT.charge) {
        r.draft = 0;
        r.draftCooldown = 2.5;
        r.drafts++;
        this.startBoost(r, DRAFT.boost, "draft", DRAFT.kick);
        this.gainNitro(r, NITRO_RULES.draft);
        this.event("draft", { racer: r.id });
      }
      let base = 35 * r.character.speed + Math.min(10, r.coins) * 0.22;
      if (!isPlayer && r.finish === null)
        base *=
          (AI_PACE[this.rules][this.difficulty] || 0.97) +
          (r.id - 4) * 0.006 +
          clamp((this.player.distance - r.distance) / 220, -0.025, 0.035);
      // Close behind a kart still in our line: ease off to its pace rather
      // than bump-and-push. The cap rises smoothly with the gap.
      let capped = false;
      if (blocker && Math.abs(blocker.lane - r.lane) < 2.2) {
        // Only bites while actually closing in, so it never slows a standing
        // start or a kart that is merely following at the same pace.
        const allowed = blocker.speed + 0.4 + Math.max(0, blockGap - 3.4) * 1.3;
        if (r.speed > allowed) {
          base = Math.min(base, allowed);
          capped = true;
        }
      }
      const offroad = Math.abs(r.lane) > half - 0.2 && r.jump <= 0,
        boosted = r.boost > 0 || r.star > 0 || r.rocket > 0,
        sliding = (isPlayer && r.drifting && r.cornerDrift <= 0) || r.cornerDrift > 0;
      if (offroad && !boosted) base *= 0.6;
      if (r.small > 0) base *= 0.74;
      if (r.rocket > 0 || r.charge > 0) base *= 1.62; // rocket and bear's ram
      else if (r.boost > 0) base *= 1.4;
      else if (r.star > 0) base *= 1.25;
      // Bends cost speed unless you drift through them; hard steering scrubs
      // a little more.
      base *= 1 - Math.min(0.12, Math.abs(curve) * 2.5) * (sliding ? 0.25 : 1);
      if (isPlayer && !sliding) base *= 1 - CORNER.scrub * Math.abs(r.steer) * clamp(r.speed / 35, 0, 1);
      // A drift scrubs speed too: little through a bend it follows, a lot on a
      // straight (DRIFT_ECON), so its boost has to be earned. (AI karts only
      // drift through real bends; their pace is tuned in AI_PACE.)
      if (sliding && isPlayer) {
        const bend = driftBend(curve, r.driftDirection);
        base *= 1 - (DRIFT_ECON.drag[1] + (DRIFT_ECON.drag[0] - DRIFT_ECON.drag[1]) * bend);
      }
      if (r.stun > 0) base *= 0.25;
      // The bear's ram always closes on its target, even one boosting away,
      // so a locked-on charge connects.
      if (r.charge > 0 && r.stun <= 0) {
        const t = this.racers[r.chargeTarget];
        if (t && t.finish === null && this.gap(t.distance, r.distance) > 0)
          base = Math.max(base, Math.min(t.speed + BEAR_RAM.closing, BEAR_RAM.top));
      }
      const braking = !throttle || (input.brake && isPlayer);
      if (braking) base = 0;
      // Boosts pull hard toward their top speed; afterwards the kart glides
      // back to cruising speed over about a second instead of shedding the
      // gain at once. Real slowdowns (grass, hits, brakes) still bite fast.
      const rate =
        base > r.speed
          ? (boosted ? 3.4 : 1.6) * r.character.accel
          : braking || offroad || capped || r.stun > 0 || r.small > 0
            ? 3.8
            : 1.25;
      r.speed += (base - r.speed) * (1 - Math.exp(-dt * rate));
      // Steering response (v2.7, STEER): the player's wheel turns in a little
      // faster than v2.6's, and centres faster still when the thumb lifts or
      // crosses over. AI karts keep the old rate.
      const wheel = r.stun > 0 ? steer * 0.25 : steer,
        easing = wheel * r.steer < 0 || Math.abs(wheel) < Math.abs(r.steer);
      r.steer += (wheel - r.steer) * (1 - Math.exp(-dt * (!isPlayer ? 11 : easing ? STEER.release : STEER.turn)));
      // Cornering, KartRider style: a bend pushes the kart toward its outside
      // (curvature x speed^2). Ordinary steering holds an ordinary bend; a
      // tight bend flat out slides you wide unless you drift (a drift grips
      // better and keeps turning in on its own) or lift off. A player drift is
      // committed to its side: steering in tightens it, steering out widens.
      const playerSlide = isPlayer && r.drifting && r.cornerDrift <= 0;
      let push = cornerPush(curve, r.speed, sliding),
        turn = (playerSlide ? r.driftDirection * 3.5 + r.steer * 4 : r.steer * 7.8) * r.character.grip;
      if (!isPlayer || input.assist !== false) {
        // Assist: never steer into the rail, and soften (not cancel) a slide
        // toward it. A drift through a bend keeps it (hugging the inside of a
        // bend is the racing line, and on touch a drift always turns in
        // fully), but a drift that is not following a bend gets only a little
        // of it: aimed at the rail down a straight, it reaches the rail and
        // bounces off. V2.5's full assist let such a drift ride the rail
        // forever.
        const near = clamp((Math.abs(r.lane) - (half - 2)) / 1.5, 0, 1),
          side = Math.sign(r.lane),
          help = playerSlide ? 0.35 + 0.65 * driftBend(curve, r.driftDirection) : 1;
        if (turn * side > 0) turn *= 1 - near * help;
        if (push * side > 0) push *= 1 - 0.35 * near * help;
        turn -= side * near * 3 * help;
      }
      // Sideways speed stays within what reads as a slide, never a dart.
      const desired = clamp((turn + push) * clamp(r.speed / 12, 0, 1), -12, 12);
      r.lateral += (desired - r.lateral) * (1 - Math.exp(-dt * (playerSlide ? 5 : isPlayer ? STEER.grip : 9)));
      r.lane += clamp(r.lateral + r.rebound, -12.5, 12.5) * dt;
      this.constrain(r);
      // A drift survives running wide over the kerb and grass (slowly: the
      // grass bites) and ends at the rail, with a bounce (v2.5 cancelled it
      // silently at the kerb, so a drift could ride along the edge).
      const valid = r.speed > 14 && r.stun <= 0 && r.wallCooldown <= 0;
      if (r.cornerDrift > 0) {
        r.drifting = true; // AI corner drift is handled above; keep the pose
        r.driftDirection ||= -Math.sign(curve) || 1;
      } else if (isPlayer && r.rocket <= 0) this.playerDrift(r, steer, drift, curve, valid, input, dt);
      else if (r.drifting) this.clearDrift(r);
      const before = r.distance;
      r.distance += (r.speed * dt) / clamp(1 + r.lane * curve, 0.65, 1.35);
      if (r.finish === null && r.distance >= this.track.length * this.laps) {
        r.finish =
          this.time - dt + dt * clamp((this.track.length * this.laps - before) / (r.distance - before), 0, 1);
        this.finishes.push(r.id);
        this.event("finish", { racer: r.id, rank: this.rank(r) });
      }
      if (r.finish !== null) continue;
      const lapBefore = Math.max(0, Math.floor(before / this.track.length)),
        lapAfter = Math.max(0, Math.floor(r.distance / this.track.length));
      if (lapAfter > lapBefore) this.event("lap", { racer: r.id, lap: lapAfter + 1 });
      // Boxes and coins are per racer: taking one hides it for you only. A
      // box you drive into always breaks, even with both slots full (V2.2
      // let you pass straight through it, which read as a glitch).
      for (const b of this.boxes)
        if (b.cooldown <= 0 && !(b.taken[r.id] > 0) && this.contact(r, b, 2.3, 1.7)) {
          b.taken[r.id] = 4;
          if (!r.item || !r.item2) this.giveItem(r, b);
          else this.event("boxBreak", { racer: r.id, box: b.id });
        }
      for (const c of this.coins)
        if (c.cooldown <= 0 && !(c.taken[r.id] > 0) && this.contact(r, c, 1.8, 1.4)) {
          c.taken[r.id] = 8;
          r.coins = Math.min(10, r.coins + 1);
          this.gain(r, GAUGE.coin);
          this.event("coin", { racer: r.id, coin: c.id });
        }
      for (const p of this.pads)
        if (this.time > r.padUntil && this.contact(r, p, 4, 2.5)) {
          this.startBoost(r, 1.4, "pad", 5);
          r.padUntil = this.time + 2;
          this.event("pad", { racer: r.id });
        }
    }
    // Bear hug: a charging bear that reaches its target alongside (within a
    // wider reach than an ordinary bump, as a hug would) knocks it.
    for (const r of this.racers) {
      if (!(r.charge > 0) || r.chargeTarget === null || r.stun > 0) continue;
      const t = this.racers[r.chargeTarget];
      if (!t || t.finish !== null || t.rescue > 0 || t.jump > 0) continue;
      if (this.contact(t, r, 2.65, BEAR_RAM.reach)) {
        this.knock(t, r);
        r.chargeTarget = null;
        r.charge = Math.min(r.charge, 0.3);
      }
    }
    // Kart contact. V2 removed the whole overlap in one step (up to ~0.45 m of
    // instant sideways/forward jump) and clamped the rear kart's speed to the
    // front one's (up to 32 m/s lost in one step), which read as karts
    // snapping and the screen shaking. Now each pass corrects at most a few
    // centimetres and the rest is resolved with velocity impulses, so karts
    // bump apart over a few frames, firmly but continuously.
    const handled = new Set(),
      bumpKart = (r, time, side) => {
        if (r.bump > 0.15) return;
        r.bump = time;
        r.bumpSide = side;
        if (r.id === 0) playerBumped = true;
      };
    let playerBumped = false,
      bumpStrength = 0;
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < 8; i++)
        for (let j = i + 1; j < 8; j++) {
          const a = this.racers[i],
            b = this.racers[j];
          if (a.finish !== null || b.finish !== null || a.rescue > 0 || b.rescue > 0) continue;
          const dx = this.gap(a.distance, b.distance),
            dy = a.lane - b.lane,
            rx = 2.65,
            ry = 1.95;
          if ((dx / rx) ** 2 + (dy / ry) ** 2 >= 1) continue;
          if (a.jump > 0 || b.jump > 0) continue; // airborne: sails over
          // A star, rocket or bear ram ploughs on at full speed: the other
          // kart is knocked aside (spin plus a sideways shove) and pushed out
          // of the way, so the two never sit inside each other.
          const ram = (k) => k.star > 0 || k.rocket > 0 || k.charge > 0;
          if (ram(a) !== ram(b)) {
            const att = ram(a) ? a : b,
              vic = att === a ? b : a,
              side = Math.sign(vic.lane - att.lane) || (vic.id % 2 ? 1 : -1),
              pen = Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2)) * ry - Math.abs(dy);
            this.knock(vic, att);
            // The bear's ram has done its job once it lands on its target.
            if (att.charge > 0 && att.chargeTarget === vic.id) {
              att.chargeTarget = null;
              att.charge = Math.min(att.charge, 0.3);
            }
            if (!handled.has(i * 8 + j)) {
              handled.add(i * 8 + j); // once per step: a firm shove, never a jump
              vic.lane += side * Math.min(Math.max(0, pen), 0.09);
              if (vic.rebound * side < 5) vic.rebound = side * 5;
              this.constrain(vic);
            }
            continue;
          }
          const first = !handled.has(i * 8 + j);
          handled.add(i * 8 + j);
          // A kart under 必杀无敌 is heavy: it shrugs the bump off and the
          // other kart takes the bounce.
          const wa = a.guard > 0 && !(b.guard > 0) ? 0.25 : 1,
            wb = b.guard > 0 && !(a.guard > 0) ? 0.25 : 1,
            ka = (2 * wa) / (wa + wb), // each kart's share of the bounce
            kb = (2 * wb) / (wa + wb);
          if (Math.abs(dy) > 0.25 || Math.abs(dx) < 0.25) {
            const dir = dy ? Math.sign(dy) : i % 2 ? 1 : -1,
              pen = Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2)) * ry - Math.abs(dy),
              // The bounce below does most of the separating, so the overlap
              // itself is corrected gently (a few centimetres per pass).
              push = Math.min(pen * 0.5, 0.03);
            a.lane += dir * push;
            b.lane -= dir * push;
            if (first) {
              // Bounce (v2.6): both karts spring apart, harder the harder they
              // came together, as a sideways speed that decays over a few
              // tenths of a second (continuous, never a jump).
              const closing = Math.max(0, ((b.lateral + b.rebound) - (a.lateral + a.rebound)) * dir),
                kick = Math.min(BUMP.max, BUMP.side + closing * BUMP.closing);
              // Cancel the closing slide, then bounce.
              if (a.lateral * dir < 0) a.lateral *= 0.3;
              if (b.lateral * dir > 0) b.lateral *= 0.3;
              a.rebound = dir * Math.max(a.rebound * dir, Math.min(WALL.max, kick * ka));
              b.rebound = -dir * Math.max(-b.rebound * dir, Math.min(WALL.max, kick * kb));
              const strength = clamp(kick / BUMP.max, 0.3, 1);
              bumpKart(a, 0.35, -dir * strength * Math.min(1, ka));
              bumpKart(b, 0.35, dir * strength * Math.min(1, kb));
              if (a.id === 0 || b.id === 0) bumpStrength = Math.max(bumpStrength, strength);
            }
          } else {
            const dir = Math.sign(dx),
              pen = Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)) * rx - Math.abs(dx),
              push = Math.min(pen * 0.5, 0.06);
            a.distance += dir * push;
            b.distance -= dir * push;
            if (first) {
              const rear = dx > 0 ? b : a,
                front = dx > 0 ? a : b,
                kr = rear === a ? ka : kb,
                kf = front === a ? ka : kb,
                closing = rear.speed - front.speed;
              // Rear-end (v2.6): the kart behind bounces back off the one in
              // front (losing most of its closing speed, and a bit more) and
              // the one in front is shoved forward, KartRider style. Never a
              // dead stop in one step. A little sideways bounce sends them
              // clear instead of letting them stay nose to tail.
              if (closing > 0) {
                rear.speed -= Math.min(BUMP.rearMax, (closing * BUMP.rear + BUMP.rearMin) * kr);
                front.speed += Math.min(BUMP.frontMax, closing * BUMP.front * kf);
              }
              const off = Math.sign(dy) || (i % 2 ? 1 : -1),
                glance = clamp(1.2 + Math.max(0, closing) * 0.12, 1.2, 2.6);
              a.rebound = clamp(a.rebound + off * glance * ka * 0.5, -BUMP.max, BUMP.max);
              b.rebound = clamp(b.rebound - off * glance * kb * 0.5, -BUMP.max, BUMP.max);
              const strength = clamp(Math.max(0, closing) / 10, 0.3, 1);
              bumpKart(rear, 0.3, 0);
              bumpKart(front, 0.3, 0);
              if (a.id === 0 || b.id === 0) bumpStrength = Math.max(bumpStrength, strength);
            }
          }
          this.constrain(a);
          this.constrain(b);
        }
    if (playerBumped) this.event("bump", { racer: 0, strength: bumpStrength || 0.3 });
    for (const h of this.hazards) {
      h.life -= dt;
      for (const r of this.racers)
        if (r.id !== h.owner && r.finish === null && r.rescue <= 0 && r.jump <= 0 && this.contact(r, h, 1.9, 1.4)) {
          this.hit(r, h.owner);
          h.life = 0;
          this.event("pop", { distance: r.distance, lane: r.lane });
          break;
        }
    }
    for (const p of this.projectiles) {
      p.life -= dt;
      const before = p.distance,
        lane = p.lane,
        target = this.racers[p.target];
      if (target && target.finish === null) {
        const close = clamp(1 - this.gap(target.distance, p.distance) / 30, 0, 1);
        p.lane += (target.lane - p.lane) * (1 - Math.exp(-dt * (5 + 11 * close)));
        p.distance += dt * Math.max(62, target.speed + 22);
      } else p.distance += dt * 62;
      const eligible = this.racers
        .filter((r) => r.id !== p.owner && r.finish === null && r.rescue <= 0 && r.jump <= 0)
        .sort((a, b) => Math.abs(this.gap(a.previous, before)) - Math.abs(this.gap(b.previous, before)));
      for (const r of eligible) {
        const end = this.gap(p.distance, r.distance),
          start = end - (p.distance - before) + (r.distance - r.previous);
        if (sweptContact(start, lane - r.previousLane, end, p.lane - r.lane, 2.1, 1.5)) {
          this.hit(r, p.owner);
          p.life = 0;
          this.event("pop", { distance: r.distance, lane: r.lane });
          break;
        }
      }
    }
    // Nova's meteors land on their targets after a short fall.
    for (const m of this.meteors) {
      m.t -= dt;
      const t = this.racers[m.target];
      if (m.t <= 0 && t && t.finish === null) {
        this.hit(t, m.owner, 1.2);
        this.event("meteor", { racer: t.id, owner: m.owner, distance: t.distance, lane: t.lane });
      }
    }
    this.meteors = this.meteors.filter((m) => m.t > 0);
    this.hazards = this.hazards.filter((x) => x.life > 0);
    this.projectiles = this.projectiles.filter((x) => x.life > 0);
    if (this.player.finish !== null) {
      this.finishWait += dt;
      if (this.finishes.length === 8 || this.finishWait > 10) {
        this.phase = "finished";
        this.event("end");
      }
    }
  }
}
