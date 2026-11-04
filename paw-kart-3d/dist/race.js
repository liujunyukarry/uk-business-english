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
export const GAUGE = { drift: [0, 6, 9, 13], coin: 5, landed: 12, hurt: 10, perSecond: 1.2, ai: 0.45 };
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
// Rocket start: hold drift / gas when the countdown shows "1".
export const START = { window: 1.0, perfect: 0.45 };
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
  }
  sample(distance, lane = 0) {
    const u = ((((distance % this.length) + this.length) % this.length) / this.length) * 1200,
      i = Math.floor(u),
      f = u - i,
      a = this.points[i],
      b = this.points[(i + 1) % 1200];
    const p = a.clone().lerp(b, f),
      t = b.clone().sub(a).normalize(),
      right = new T.Vector3(-t.z, 0, t.x).normalize();
    p.addScaledVector(right, lane);
    return { p, t, right, yaw: Math.atan2(t.x, t.z) };
  }
  curvature(d) {
    const a = this.sample(d - 3).yaw,
      b = this.sample(d + 3).yaw;
    return Math.atan2(Math.sin(b - a), Math.cos(b - a)) / 6;
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
  constructor({ track = 0, character = "gold", difficulty = "normal", seed = Date.now(), laps = 3 } = {}) {
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
    this.nextId = 1;
    this.racers = [];
    const order = [character, ...CHARACTERS.map((c) => c.id).filter((id) => id !== character)].slice(0, 8);
    for (let i = 0; i < 8; i++) {
      const c = CHARACTERS.find((c) => c.id === order[i]),
        distance = -5 - (3 - Math.floor(i / 2)) * 5,
        lane = (i % 2 ? 1 : -1) * 2.2;
      this.racers.push({
        id: i,
        character: c,
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
        startPress: null, // countdown time left when start was pressed
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
    for (const f of BOX_ROWS)
      for (const lane of BOX_LANES)
        this.boxes.push({
          id: this.nextId++,
          distance: this.track.length * f,
          lane,
          cooldown: 0,
          taken: new Float32Array(8),
        });
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
        r.drifts++;
        this.event("drift", { racer: r.id, level });
      }
      return this.clearDrift(r);
    }
    const was = driftLevel(r.drift);
    r.drift = Math.min(2.6, r.drift + dt * (0.75 + 0.5 * clamp(steer * r.driftDirection, -0.5, 1)));
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
    if (r.finish !== null) return;
    const before = r.special;
    r.special = Math.min(100, r.special + amount * (r.id === 0 ? 1 : GAUGE.ai));
    if (before < 100 && r.special >= 100) this.event("specialReady", { racer: r.id });
  }
  // Every boost goes through here: the timer, the flame colour, and an
  // instant speed kick so the push is felt the moment it starts.
  startBoost(r, seconds, kind, kick = 0) {
    r.boost = Math.max(r.boost, seconds);
    r.boostKind = kind;
    if (kick > 0) r.speed = Math.min(Math.max(0, r.speed) + kick, 58);
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
    if (
      r.finish !== null ||
      r.rescue > 0 ||
      r.invincible > 0 ||
      r.star > 0 ||
      r.rocket > 0 ||
      r.jump > 0 ||
      r.charge > 0
    )
      return false;
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
  nearestAhead(r, range = 200, count = 1) {
    return this.racers
      .filter((o) => o !== r && o.finish === null && o.rescue <= 0)
      .map((o) => ({ o, g: this.gap(o.distance, r.distance) }))
      .filter((x) => x.g > 1.5 && x.g < range)
      .sort((a, b) => a.g - b.g)
      .slice(0, count)
      .map((x) => x.o);
  }
  useSpecial(r = this.player) {
    if (this.phase !== "racing" || r.special < 100 || r.finish !== null || r.rescue > 0) return false;
    const kind = r.character.id;
    r.special = 0;
    r.stun = 0;
    r.specialsUsed++;
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
      const target = this.nearestAhead(r, 70)[0];
      r.charge = 2.6;
      r.chargeTarget = target?.id ?? null;
      this.clearDrift(r);
      this.startBoost(r, 2.6, "item", 7);
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
    if (what === "shell" || what === "special:bear" || what === "special:mario")
      return this.nearestAhead(r, what === "shell" ? 180 : 70)[0] === p;
    if (what === "special:nova") return this.nearestAhead(r, 220, 3).includes(p);
    return false;
  }
  // When an AI fires its special: only when it would do something.
  aiSpecialUseful(r) {
    const kind = r.character.id;
    if (kind === "mario") return this.nearestAhead(r, 60).length > 0;
    if (kind === "bear") return this.nearestAhead(r, 60).length > 0;
    if (kind === "nova") return this.nearestAhead(r, 220).length > 0;
    if (kind === "dora") return !r.item2;
    if (kind === "white") return Math.abs(this.track.curvature(r.distance + 25)) > 0.012;
    return true;
  }
  // A star or rocket knocks the kart it touches aside (spin-out plus a
  // sideways shove), so it clears the way instead of pushing it along.
  knock(victim, attacker) {
    if (!this.hit(victim, attacker.id)) return false;
    const side = Math.sign(victim.lane - attacker.lane) || (victim.id % 2 ? 1 : -1);
    victim.lateral += side * 7;
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
      r.speed = 0;
      r.rescue = 1.1;
      r.invincible = 2.5;
      this.clearDrift(r);
      this.event("rescue", { racer: r.id });
      return;
    }
    if (Math.abs(r.lane) > limit) {
      const side = Math.sign(r.lane);
      r.lane = side * limit;
      if (r.lateral * side > 0) r.lateral *= -0.18;
      if (r.wallCooldown <= 0) {
        r.speed *= 0.78;
        r.wallCooldown = 0.65;
        this.event("wall", { racer: r.id });
      }
      this.clearDrift(r);
    }
  }
  step(dt, input = {}) {
    dt = clamp(dt, 0, 0.05);
    this.events = [];
    if (this.phase === "finished") return;
    if (this.phase === "countdown") {
      // Rocket start (MK / KartRider): press and hold drift or gas once the
      // countdown shows "1". The first moment of the current hold counts, so
      // holding from the start is too early.
      const p = this.player;
      if (input.start && p.startPress === null) p.startPress = this.countdown;
      if (!input.start) p.startPress = null;
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = "racing";
        this.event("go");
        if (p.startPress !== null && p.startPress <= START.window) {
          const perfect = p.startPress <= START.perfect;
          this.startBoost(p, perfect ? 1.5 : 0.9, perfect ? "drift2" : "drift1", perfect ? 16 : 11);
          this.event("rocketStart", { racer: 0, perfect });
        } else if (p.startPress !== null) this.event("startEarly", { racer: 0 });
        const chance = { easy: 0.15, normal: 0.3, hard: 0.5 }[this.difficulty] ?? 0.3;
        for (const r of this.racers.slice(1)) if (this.rng() < chance) this.startBoost(r, 0.9, "drift1", 10);
      }
      return;
    }
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
      ])
        r[k] = Math.max(0, r[k] - dt);
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
          if (this.aimsAtPlayer(r, r.item) && (r.itemPatient || this.rng() > (AGGRESSION[this.difficulty] ?? 0.5))) {
            r.itemPatient = true;
            r.aiItem = 1.5 + this.rng() * 2;
          } else this.useItem(r);
        }
        if (r.special >= 100 && (r.aiSpecial -= dt) <= 0) {
          r.aiSpecial = 1 + this.rng() * 3;
          const attack = this.aimsAtPlayer(r, "special:" + r.character.id);
          if (this.aiSpecialUseful(r) && (!attack || this.rng() < (AGGRESSION[this.difficulty] ?? 0.5)))
            this.useSpecial(r);
        }
        // Corner mini-turbo: the AI visibly drifts through a real corner and
        // releases a short boost on exit, instead of V2's random mid-corner
        // speed spikes that read as karts "teleporting" past.
        if (r.cornerDrift > 0) {
          r.cornerDrift += dt;
          r.drift = Math.min(2.6, r.cornerDrift);
          if (Math.abs(curve) < 0.004 || r.cornerDrift > 1.9 || r.stun > 0 || r.speed < 14) {
            if (r.stun <= 0 && r.cornerDrift >= DRIFT.levels[1]) {
              const level = r.perfectDrift > 0 ? 3 : Math.min(2, driftLevel(r.cornerDrift));
              this.startBoost(r, DRIFT.boost[level], "drift" + level, DRIFT.kick[level]);
              this.gain(r, GAUGE.drift[level]);
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
        steer = t && t.finish === null ? clamp((t.lane - r.lane) * 0.6, -1, 1) : 0;
        drift = false;
        throttle = true;
        r.cornerDrift = 0;
      }
      let base = 35 * r.character.speed + Math.min(10, r.coins) * 0.22;
      if (!isPlayer && r.finish === null)
        base *=
          ({ easy: 0.86, normal: 0.97, hard: 1.07 }[this.difficulty] || 0.97) +
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
      if (r.rocket > 0) base *= 1.62;
      else if (r.boost > 0) base *= 1.4;
      else if (r.star > 0) base *= 1.25;
      // Bends cost speed unless you drift through them; hard steering scrubs
      // a little more.
      base *= 1 - Math.min(0.12, Math.abs(curve) * 2.5) * (sliding ? 0.25 : 1);
      if (isPlayer && !sliding) base *= 1 - CORNER.scrub * Math.abs(r.steer) * clamp(r.speed / 35, 0, 1);
      if (r.stun > 0) base *= 0.25;
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
      r.steer += ((r.stun > 0 ? steer * 0.25 : steer) - r.steer) * (1 - Math.exp(-dt * 11));
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
        // toward it.
        const near = clamp((Math.abs(r.lane) - (half - 2)) / 1.5, 0, 1),
          side = Math.sign(r.lane);
        if (turn * side > 0) turn *= 1 - near;
        if (push * side > 0) push *= 1 - 0.35 * near;
        turn -= side * near * 3;
      }
      // Sideways speed stays within what reads as a slide, never a dart.
      const desired = clamp((turn + push) * clamp(r.speed / 12, 0, 1), -12, 12);
      r.lateral += (desired - r.lateral) * (1 - Math.exp(-dt * (playerSlide ? 5 : 9)));
      r.lane += r.lateral * dt;
      this.constrain(r);
      const valid = r.speed > 14 && r.stun <= 0 && !offroad && r.wallCooldown <= 0;
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
    let playerBumped = false;
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
            if (!handled.has(i * 8 + j)) {
              handled.add(i * 8 + j); // once per step: a firm shove, never a jump
              vic.lane += side * Math.min(Math.max(0, pen), 0.09);
              if (vic.lateral * side < 4) vic.lateral = side * 4;
              this.constrain(vic);
            }
            continue;
          }
          const first = !handled.has(i * 8 + j);
          handled.add(i * 8 + j);
          if (Math.abs(dy) > 0.25 || Math.abs(dx) < 0.25) {
            const dir = dy ? Math.sign(dy) : i % 2 ? 1 : -1,
              pen = Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2)) * ry - Math.abs(dy),
              push = Math.min(pen * 0.5, 0.045);
            a.lane += dir * push;
            b.lane -= dir * push;
            if (first) {
              // Equal-mass lateral impulse: cancel the closing speed and leave
              // a gentle separating speed, never a launch.
              const separating = (a.lateral - b.lateral) * dir;
              if (separating < 1.6) {
                const k = (1.6 - separating) / 2;
                a.lateral += dir * k;
                b.lateral -= dir * k;
              }
              const strength = clamp(Math.abs(separating - 1.6) / 6, 0.25, 1);
              bumpKart(a, 0.35, -dir * strength);
              bumpKart(b, 0.35, dir * strength);
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
                closing = rear.speed - front.speed;
              // Momentum exchange: the rear kart gives up most of its closing
              // speed and the front kart is nudged forward, KartRider style.
              // Spread over a few steps so a hard hit is still felt but no kart
              // ever stops dead in a single frame.
              if (closing > 0) {
                rear.speed -= Math.min(closing * 0.62, 5.5);
                front.speed += Math.min(closing * 0.3, 2.6);
              }
              bumpKart(rear, 0.3, 0);
              bumpKart(front, 0.3, 0);
            }
          }
          this.constrain(a);
          this.constrain(b);
        }
    if (playerBumped) this.event("bump", { racer: 0 });
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
