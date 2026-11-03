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
};
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
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
      });
    }
    this.player = this.racers[0];
    this.boxes = [];
    this.coins = [];
    this.pads = [];
    for (let row = 0; row < 5; row++)
      for (let j = -1; j <= 1; j++)
        this.boxes.push({
          id: this.nextId++,
          distance: this.track.length * (0.09 + row * 0.18),
          lane: j * 4,
          cooldown: 0,
        });
    for (let row = 0; row < 12; row++)
      for (let j = 0; j < 3; j++)
        this.coins.push({
          id: this.nextId++,
          distance: this.track.length * (0.04 + row * 0.078) + j * 4,
          lane: Math.sin(row * 1.7) * 4,
          cooldown: 0,
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
  }
  giveItem(r, box = null) {
    const rank = this.rank(r),
      pool =
        rank <= 2
          ? ["banana", "shield", "boost", "shell"]
          : rank <= 5
            ? ["boost", "shell", "shield", "star", "banana"]
            : ["boost", "star", "bolt", "shell", "boost"];
    r.item = pool[Math.floor(this.rng() * pool.length)];
    r.roulette = 0.7;
    r.aiItem = 1.3 + this.rng() * 3.5;
    this.event("pickup", { racer: r.id, box: box?.id ?? null });
  }
  useItem(r = this.player) {
    if (this.phase !== "racing" || !r.item || r.roulette > 0 || r.finish !== null || r.rescue > 0)
      return false;
    const type = r.item;
    r.item = null;
    r.itemsUsed++;
    if (type === "boost") {
      r.boost = Math.max(r.boost, 2.5);
      r.boostKind = "item";
    }
    if (type === "star") {
      r.star = 5;
      r.stun = 0;
      r.small = 0;
    }
    if (type === "shield") r.shield = 6;
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
    if (r.finish !== null || r.rescue > 0 || r.invincible > 0 || r.star > 0) return false;
    if (r.shield > 0) {
      r.shield = 0;
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
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = "racing";
        this.event("go");
      }
      return;
    }
    this.time += dt;
    for (const a of [...this.boxes, ...this.coins]) a.cooldown = Math.max(0, a.cooldown - dt);
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
      ])
        r[k] = Math.max(0, r[k] - dt);
      this.constrain(r);
      if (r.rescue > 0) continue;
      const isPlayer = r.id === 0 && r.finish === null,
        curve = this.track.curvature(r.distance),
        half = this.track.width / 2;
      let steer = isPlayer ? input.steer || 0 : 0,
        drift = isPlayer && input.drift,
        throttle = isPlayer ? input.throttle !== false : true;
      let blocker = null,
        blockGap = Infinity;
      if (!isPlayer) {
        r.aiTimer -= dt;
        if (r.aiTimer <= 0) {
          r.aiTimer = 1.3 + this.rng() * 2.2;
          const next = this.boxes
            .filter(
              (b) =>
                b.cooldown <= 0 &&
                this.gap(b.distance, r.distance) > 3 &&
                this.gap(b.distance, r.distance) < 65,
            )
            .sort((a, b) => this.gap(a.distance, r.distance) - this.gap(b.distance, r.distance))[0];
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
        steer = clamp((targetLane - r.lane) * 0.45 - (curve * r.speed * r.speed * 0.012) / 8, -0.8, 0.8);
        r.aiItem -= dt;
        if (r.aiItem <= 0 && r.item) this.useItem(r);
        // Corner mini-turbo: the AI visibly drifts through a real corner and
        // releases a short boost on exit, instead of V2's random mid-corner
        // speed spikes that read as karts "teleporting" past.
        if (r.cornerDrift > 0) {
          r.cornerDrift += dt;
          r.drift = Math.min(2.6, r.cornerDrift);
          if (Math.abs(curve) < 0.004 || r.cornerDrift > 1.9 || r.stun > 0 || r.speed < 14) {
            if (r.stun <= 0 && r.cornerDrift >= 0.65) {
              const level = r.cornerDrift >= 1.2 ? 2 : 1;
              r.boost = Math.max(r.boost, [0, 0.75, 1.25][level]);
              r.boostKind = "drift" + level;
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
          if (this.rng() < ({ easy: 0.35, normal: 0.6, hard: 0.85 }[this.difficulty] || 0.6)) {
            r.cornerDrift = dt;
            r.drifting = true;
            r.driftDirection = Math.sign(curve);
          }
        }
      }
      let base = 35 * r.character.speed + Math.min(10, r.coins) * 0.22;
      if (!isPlayer && r.finish === null)
        base *=
          ({ easy: 0.86, normal: 0.97, hard: 1.055 }[this.difficulty] || 0.97) +
          (r.id - 4) * 0.006 +
          clamp((this.player.distance - r.distance) / 220, -0.025, 0.035);
      // Close behind a kart still in our line: ease off to its pace rather
      // than bump-and-push. The cap rises smoothly with the gap.
      if (blocker && Math.abs(blocker.lane - r.lane) < 2.2) {
        // Only bites while actually closing in, so it never slows a standing
        // start or a kart that is merely following at the same pace.
        const allowed = blocker.speed + 0.4 + Math.max(0, blockGap - 3.4) * 1.3;
        if (r.speed > allowed) base = Math.min(base, allowed);
      }
      const offroad = Math.abs(r.lane) > half - 0.2;
      if (offroad && r.boost <= 0 && r.star <= 0) base *= 0.6;
      if (r.small > 0) base *= 0.74;
      if (r.boost > 0) base *= 1.39;
      else if (r.star > 0) base *= 1.25;
      base *= 1 - Math.min(0.12, Math.abs(curve) * 2.5);
      if (r.stun > 0) base *= 0.25;
      if (!throttle || (input.brake && isPlayer)) base = 0;
      r.speed += (base - r.speed) * (1 - Math.exp(-dt * (base > r.speed ? 1.6 * r.character.accel : 3.8)));
      r.steer += ((r.stun > 0 ? steer * 0.25 : steer) - r.steer) * (1 - Math.exp(-dt * 11));
      let desired =
        (r.steer * (drift ? 5.7 : 7.8) * r.character.grip + curve * r.speed * r.speed * 0.012) *
        clamp(r.speed / 12, 0, 1);
      if (!isPlayer || input.assist !== false) {
        const near = clamp((Math.abs(r.lane) - (half - 2)) / 1.5, 0, 1),
          side = Math.sign(r.lane);
        if (desired * side > 0) desired *= 1 - near;
        desired -= side * near * 3;
      }
      r.lateral += (desired - r.lateral) * (1 - Math.exp(-dt * (drift ? 5 : 9)));
      r.lane += r.lateral * dt;
      this.constrain(r);
      const valid = r.speed > 14 && r.stun <= 0 && !offroad && r.wallCooldown <= 0;
      if (r.cornerDrift > 0) {
        r.drifting = true; // AI corner drift is handled above; keep the pose
        r.driftDirection ||= Math.sign(curve) || 1;
      } else if (drift && valid && (r.drifting || Math.abs(r.steer) > 0.18)) {
        r.drifting = true;
        r.driftDirection ||= Math.sign(r.steer);
        r.drift = Math.min(2.6, r.drift + dt);
      } else if (r.drifting) {
        if (!drift && valid && r.drift >= 0.65) {
          const level = r.drift >= 2 ? 3 : r.drift >= 1.2 ? 2 : 1;
          r.boost = Math.max(r.boost, [0, 0.75, 1.25, 1.85][level]);
          r.boostKind = "drift" + level;
          r.drifts++;
          this.event("drift", { racer: r.id, level });
        }
        this.clearDrift(r);
      }
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
      for (const b of this.boxes)
        if (b.cooldown <= 0 && !r.item && this.contact(r, b, 2.3, 1.7)) {
          b.cooldown = 3;
          this.giveItem(r, b);
        }
      for (const c of this.coins)
        if (c.cooldown <= 0 && this.contact(r, c, 1.8, 1.4)) {
          c.cooldown = 6;
          r.coins = Math.min(10, r.coins + 1);
          this.event("coin", { racer: r.id });
        }
      for (const p of this.pads)
        if (this.time > r.padUntil && this.contact(r, p, 4, 2.5)) {
          r.boost = Math.max(r.boost, 1.2);
          r.boostKind = "pad";
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
          if (a.star > 0) this.hit(b, a.id);
          else if (b.star > 0) this.hit(a, b.id);
          this.constrain(a);
          this.constrain(b);
        }
    if (playerBumped) this.event("bump", { racer: 0 });
    for (const h of this.hazards) {
      h.life -= dt;
      for (const r of this.racers)
        if (r.id !== h.owner && r.finish === null && r.rescue <= 0 && this.contact(r, h, 1.9, 1.4)) {
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
        p.lane += (target.lane - p.lane) * (1 - Math.exp(-dt * 5));
        p.distance += dt * Math.max(62, target.speed + 22);
      } else p.distance += dt * 62;
      const eligible = this.racers
        .filter((r) => r.id !== p.owner && r.finish === null && r.rescue <= 0)
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
