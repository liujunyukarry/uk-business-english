// v2.3: two item slots, boxes that always break, character specials and
// cornering that rewards drifting.
import test from "node:test";
import assert from "node:assert/strict";
import { Race, SPECIALS, GAUGE, CHARACTERS, cornerPush } from "../dist/race.js";

const quiet = (opts = {}) => {
  const r = new Race({ seed: 21, ...opts });
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.lane = 0;
    x.item = null;
    x.aiItem = 1e9;
    x.aiSpecial = 1e9;
  });
  r.boxes.forEach((b) => b.taken.fill(1e9, 1));
  return r;
};
const steps = (r, n, input = {}) => {
  const ev = [];
  for (let i = 0; i < n; i++) {
    r.step(1 / 60, input);
    ev.push(...r.events);
  }
  return ev;
};
const driveTo = (r, box) => {
  const p = r.player;
  p.distance = box.distance - 6;
  p.lane = p.previousLane = box.lane;
  p.speed = 30;
  return steps(r, 30, { assist: false });
};

test("two item slots: the second box fills slot 2, using one moves slot 2 up", () => {
  const r = quiet(),
    p = r.player;
  driveTo(r, r.boxes[2]);
  assert(p.item && !p.item2);
  steps(r, 50);
  driveTo(r, r.boxes[7]);
  assert(p.item && p.item2, "both slots full");
  steps(r, 50);
  const second = p.item2;
  assert(r.useItem());
  assert.equal(p.item, second, "slot 2 moved up");
  assert.equal(p.item2, null);
});

test("a box always breaks on contact, even with both slots full", () => {
  const r = quiet(),
    p = r.player;
  p.item = "banana";
  p.item2 = "shield";
  const box = r.boxes[12],
    ev = driveTo(r, box);
  assert(ev.some((e) => e.type === "boxBreak" && e.box === box.id && e.racer === 0), "it breaks");
  assert(box.taken[0] > 0, "gone for this racer, so it is drawn broken");
  assert.equal(p.item, "banana");
  assert.equal(p.item2, "shield");
});

test("every character has a special with a name, icon and description", () => {
  for (const c of CHARACTERS) {
    const sp = SPECIALS[c.id];
    assert(sp && sp.name && sp.icon && sp.desc, c.id);
  }
});

test("the special gauge fills from drifts, coins, landed hits and time, and fires once when full", () => {
  const r = quiet(),
    p = r.player;
  r.gain(p, GAUGE.drift[3]);
  r.gain(p, GAUGE.coin);
  assert.equal(p.special, GAUGE.drift[3] + GAUGE.coin);
  const o = r.racers[1];
  o.distance = p.distance + 20;
  r.hit(o, 0);
  assert.equal(p.special, GAUGE.drift[3] + GAUGE.coin + GAUGE.landed, "landing a hit fills it");
  p.special = 99;
  const ev = steps(r, 60);
  assert(ev.some((e) => e.type === "specialReady" && e.racer === 0));
  assert.equal(p.special, 100);
  assert(r.useSpecial());
  assert.equal(p.special, 0);
  assert.equal(r.useSpecial(), false, "not again until it refills");
});

// Race with the player as `kind`, special charged, the field parked.
const withSpecial = (kind) => {
  const r = quiet({ character: kind }),
    p = r.player;
  p.distance = 120;
  p.lane = p.previousLane = 0;
  p.speed = 32;
  p.special = 100;
  return { r, p };
};

test("小金毛 元气三连冲: three dashes in a row", () => {
  const { r, p } = withSpecial("gold");
  assert(r.useSpecial());
  assert(p.boost > 1);
  const dashes = steps(r, 170, { assist: true }).filter((e) => e.type === "dash" && e.racer === 0);
  assert.equal(dashes.length, 2, "two more dashes after the first");
});

test("小白 完美漂移: drifts start fully charged for 8 s", () => {
  const { r, p } = withSpecial("white");
  assert(r.useSpecial());
  assert.equal(p.perfectDrift, 8);
  const ev = steps(r, 12, { steer: 1, drift: true, assist: true });
  assert(p.drifting && p.drift >= 2, `instant purple (${p.drift})`);
  assert(ev.some((e) => e.type === "driftLevel" && e.level === 3));
});

test("哆啦 A 梦 四次元口袋: two items at once", () => {
  const { r, p } = withSpecial("dora");
  p.item = p.item2 = null;
  assert(r.useSpecial());
  assert(p.item && p.item2);
  assert.notEqual(p.item, "rocket");
});

test("马里奥 火球连发: three fireballs ahead, one knocks the kart in line", () => {
  const { r, p } = withSpecial("mario"),
    o = r.racers[1];
  Object.assign(o, { distance: p.distance + 30, lane: 0, previousLane: 0, speed: 25, aiTimer: 99, aiLane: 0 });
  assert(r.useSpecial());
  assert.equal(r.projectiles.filter((x) => x.kind === "fire").length, 3);
  steps(r, 60, { assist: true });
  assert.equal(o.hits, 1);
});

test("桃桃兔 蹦蹦跳: airborne over karts and bananas, then lands", () => {
  const { r, p } = withSpecial("bunny"),
    o = r.racers[1];
  assert(r.useSpecial());
  assert(p.jump > 0);
  r.hazards.push({ id: 999, owner: 1, distance: p.distance + 10, lane: p.lane, life: 22 });
  Object.assign(o, { distance: p.distance + 4, lane: p.lane, previousLane: p.lane, speed: 20, aiTimer: 99, aiLane: p.lane });
  assert.equal(r.hit(p, 1), false, "immune while airborne");
  steps(r, 40, { assist: true });
  assert.equal(p.hits, 0, "sailed over the banana and the kart");
  steps(r, 120, { assist: true });
  assert.equal(p.jump, 0, "landed");
});

test("薄荷熊 熊抱冲撞: homes in on the kart ahead and knocks it", () => {
  const { r, p } = withSpecial("bear"),
    o = r.racers[1];
  Object.assign(o, { distance: p.distance + 25, lane: 4, previousLane: 4, speed: 26, aiTimer: 99, aiLane: 4 });
  assert(r.useSpecial());
  assert.equal(p.chargeTarget, 1);
  steps(r, 150, { assist: true });
  assert.equal(o.hits, 1, "rammed");
  assert.equal(p.hits, 0);
});

test("星星队长 流星雨: meteors hit the three nearest karts ahead, not those behind", () => {
  const { r, p } = withSpecial("nova");
  [1, 2, 3, 4].forEach((id, i) => Object.assign(r.racers[id], { distance: p.distance + 20 + i * 30, aiTimer: 99 }));
  r.racers[5].distance = p.distance - 20;
  assert(r.useSpecial());
  steps(r, 120, { assist: true });
  assert.deepEqual([1, 2, 3, 4, 5].map((id) => r.racers[id].hits), [1, 1, 1, 0, 0]);
});

test("泡泡探险家 泡泡护航: a big bubble that absorbs two hits", () => {
  const { r, p } = withSpecial("milo");
  assert(r.useSpecial());
  // v2.6: every special starts with a moment of 必杀无敌; the bubble is what
  // is left after it.
  assert.equal(r.hit(p, 1), false);
  assert.equal(p.shieldHits, 2, "the guard took that one, not the bubble");
  p.guard = 0;
  assert.equal(r.hit(p, 1), false);
  p.invincible = 0;
  assert.equal(r.hit(p, 1), false);
  p.invincible = 0;
  assert.equal(r.hit(p, 1), true, "third hit lands");
});

test("cornering: a tight bend flat out pushes wide; a drift through it is faster than steering", () => {
  const sharp = (r) => {
    let best = 0,
      at = 0;
    for (let d = 40; d < r.track.length - 40; d += 2) {
      const c = Math.abs(r.track.curvature(d));
      if (c > best) [best, at] = [c, d];
    }
    return at;
  };
  // Pushed wide without steering.
  const r0 = quiet({ track: 1 }),
    p0 = r0.player;
  const apex = sharp(r0),
    c = r0.track.curvature(apex);
  assert(Math.abs(cornerPush(c, 35, false)) > 7, "a real hairpin");
  // Same start, through the bend: plain steering vs holding into it (auto-drift).
  const run = (autoDrift) => {
    const r = quiet({ track: 1 }),
      p = r.player;
    p.distance = apex - 60;
    p.lane = p.previousLane = Math.sign(c) * 3; // outside of the bend
    p.speed = 34;
    let t = 0;
    while (p.distance < apex + 40 && t < 600) {
      const cv = r.track.curvature(p.distance + 4),
        into = Math.abs(cv) > 0.012 ? -Math.sign(cv) : -p.lane * 0.2;
      r.step(1 / 60, { steer: into, autoDrift, assist: true });
      t++;
    }
    return { frames: t, drifts: p.drifts };
  };
  const plain = run(false),
    drift = run(true);
  assert(drift.drifts >= 1, "it drifted");
  assert(drift.frames < plain.frames, `drift ${drift.frames} vs steering ${plain.frames} frames`);
  void p0;
});
