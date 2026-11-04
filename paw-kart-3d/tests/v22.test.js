// v2.2: items you can actually reach from the back, drift boosts you can
// feel, automatic drifting for touch, the rocket start and the rocket item.
import test from "node:test";
import assert from "node:assert/strict";
import { Race, DRIFT, START, BOX_LANES, driftLevel } from "../dist/race.js";

// The player alone on the road: the field is parked far away and can neither
// collect nor use items.
const quiet = (opts = {}) => {
  const r = new Race({ seed: 11, ...opts });
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.lane = 0;
    x.item = null;
    x.aiItem = 1e9;
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
// First stretch of track (from `from`) whose bend has this sign and size.
const bend = (r, sign, min = 0.012, from = 60) => {
  for (let d = from; d < r.track.length; d += 2) if (r.track.curvature(d) * sign > min) return d;
  throw new Error("no bend");
};
// The tracks are all flowing curves; the Candy Coast back straight (track 1)
// is the one stretch that stays nearly straight for 60 m.
const straight = (r, from = 40) => {
  for (let d = from; d < r.track.length; d += 2) {
    let ok = true;
    for (let k = 0; k < 60 && ok; k += 3) ok = Math.abs(r.track.curvature(d + k)) < 0.003;
    if (ok) return d;
  }
  throw new Error("no straight");
};

test("every box row spans the road: any line on the tarmac collects an item", () => {
  assert.equal(BOX_LANES.length, 5);
  for (let lane = -7.5; lane <= 7.5; lane += 0.5) {
    const r = quiet(),
      p = r.player,
      row = r.boxes[0];
    p.distance = row.distance - 6;
    p.lane = p.previousLane = lane;
    p.speed = 30;
    steps(r, 30, { assist: false });
    assert(p.item, `no item driving through at lane ${lane}`);
  }
});

test("a box the kart ahead just took is still there for the player", () => {
  const r = new Race({ seed: 3 });
  r.phase = "racing";
  const row = r.boxes.find((b) => b.lane === 0),
    p = r.player,
    ai = r.racers[1];
  r.racers.slice(2).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.aiItem = 1e9;
  });
  Object.assign(ai, { distance: row.distance - 6, lane: 0, previousLane: 0, speed: 30, item: null, aiTimer: 99, aiLane: 0, aiItem: 1e9 });
  Object.assign(p, { distance: row.distance - 30, lane: 0, previousLane: 0, speed: 30 });
  steps(r, 120, { assist: false });
  assert(ai.item, "the kart ahead got one");
  assert(p.item, "and so did the player, from the same row");
});

test("item odds: leader gets defence, far behind gets catch-up items and the rocket", () => {
  const r = quiet(),
    p = r.player;
  r.racers.slice(1).forEach((x, i) => (x.distance = 300 - i * 10));
  p.distance = 500;
  const lead = r.itemOdds(p);
  assert.equal(lead.rocket, 0);
  assert.equal(lead.star, 0);
  assert.equal(lead.bolt, 0);
  assert(lead.banana > lead.boost);
  p.distance = 120;
  const last = r.itemOdds(p);
  assert(last.rocket > 0, "rocket when far behind");
  assert(last.star > last.banana && last.boost > last.banana);
  // Last but close to the pack: strong items, but no rocket yet.
  p.distance = 262;
  assert.equal(r.itemOdds(p).rocket, 0);
});

test("rocket: autopilot to the middle, top speed, immune, knocks karts aside", () => {
  const r = quiet(),
    p = r.player,
    o = r.racers[1];
  p.distance = 100;
  p.lane = p.previousLane = 5;
  p.speed = 30;
  p.item = "rocket";
  assert(r.useItem());
  assert.equal(p.rocket, 3.2);
  steps(r, 60, { steer: 1, assist: true }); // input is ignored
  assert(Math.abs(p.lane) < 4, `steered toward the middle (lane ${p.lane.toFixed(2)})`);
  assert(p.speed > 50, `rocket speed ${p.speed.toFixed(1)}`);
  assert.equal(r.hit(p, 1), false, "immune");
  Object.assign(o, { distance: p.distance + 6, lane: p.lane, previousLane: p.lane, speed: 30, aiTimer: 99, aiLane: p.lane });
  steps(r, 30, { assist: true });
  assert.equal(o.hits, 1, "knocked");
  assert(Math.abs(o.lane - p.lane) > 1.5, "shoved aside, not pushed along");
  assert(p.speed > 45, "the rocket was not slowed by the hit");
  steps(r, 150, { assist: true });
  assert.equal(p.rocket, 0, "wears off");
});

test("drift tiers: each release grants its boost time and an instant kick", () => {
  for (const level of [1, 2, 3]) {
    const r = quiet(),
      p = r.player;
    p.distance = 100;
    p.lane = p.previousLane = -6;
    steps(r, 90, { assist: true }); // cruise
    const hold = Math.ceil(((DRIFT.levels[level] + 0.06) / 1.25) * 60) + 8;
    // Keep the kart in the middle of the road while it charges: this checks
    // the tiers, not the drift's line across the road.
    const ev = [];
    for (let i = 0; i < hold; i++) {
      p.lane = p.previousLane = 0;
      r.step(1 / 60, { steer: 1, drift: true, assist: true });
      ev.push(...r.events);
    }
    assert.equal(driftLevel(p.drift), level, `charged to tier ${level} (${p.drift.toFixed(2)})`);
    const ups = ev.filter((e) => e.type === "driftLevel").map((e) => e.level);
    assert.deepEqual(ups, [1, 2, 3].slice(0, level), "one sound cue per tier");
    const before = p.speed;
    const out = steps(r, 1, { steer: 0, drift: false, assist: true });
    assert(out.some((e) => e.type === "drift" && e.level === level));
    assert(Math.abs(p.boost - (DRIFT.boost[level] - 1 / 60)) < 0.02, `boost ${p.boost}`);
    assert(p.speed - before > DRIFT.kick[level] - 0.6, `kick ${(p.speed - before).toFixed(2)}`);
    assert.equal(p.boostKind, "drift" + level);
  }
});

test("a drift boost is felt for longer than it lasts: glide back to cruising", () => {
  // Same race twice from the same moment, with and without the boost.
  const make = () => {
    const r = quiet();
    r.player.distance = 300; // clear of the boost pads
    r.player.lane = 0;
    steps(r, 120, { assist: true });
    return r;
  };
  const boosted = make(),
    plain = make(),
    p = boosted.player,
    q = plain.player;
  boosted.startBoost(p, DRIFT.boost[2], "drift2", DRIFT.kick[2]);
  steps(boosted, 40, { assist: true });
  steps(plain, 40, { assist: true });
  assert(p.speed > q.speed * 1.25, `peak ${p.speed.toFixed(1)} vs ${q.speed.toFixed(1)}`);
  const after = Math.round(DRIFT.boost[2] * 60) - 40 + 30; // 0.5 s after it ends
  steps(boosted, after, { assist: true });
  steps(plain, after, { assist: true });
  assert(p.speed > q.speed + 4, `still carrying ${(p.speed - q.speed).toFixed(1)} m/s`);
});

// In a bend with curvature c the inside is the -sign(c) side, so steering
// "into the bend" means steer = -sign(c).
test("auto-drift: holding a direction into a bend drifts, letting go boosts", () => {
  for (const sign of [-1, 1]) {
    const r = quiet(),
      p = r.player;
    p.distance = bend(r, sign) - 12;
    p.lane = p.previousLane = sign * 3; // start on the outside
    p.speed = 33;
    const ev = steps(r, 66, { steer: -sign, autoDrift: true, assist: true });
    assert(ev.some((e) => e.type === "driftStart"), "started on its own");
    assert(p.drifting && p.driftAuto && p.driftDirection === -sign, "drifting toward the inside");
    const out = steps(r, 12, { steer: 0, autoDrift: true, assist: true });
    assert.equal(p.drifting, false, "released");
    assert(out.some((e) => e.type === "drift"), "boost on release");
    assert(p.boost > 0);
  }
});

test("auto-drift stays off on straights, against the bend, and when switched off", () => {
  const r = quiet({ track: 1 }),
    p = r.player;
  p.distance = straight(r);
  p.lane = p.previousLane = -4;
  p.speed = 33;
  steps(r, 60, { steer: 1, autoDrift: true, assist: true });
  assert.equal(p.drifting, false, "a lane change on a straight is not a drift");
  const r1 = quiet(),
    p1 = r1.player;
  p1.distance = bend(r1, 1) - 12;
  p1.lane = p1.previousLane = -4;
  p1.speed = 33;
  steps(r1, 60, { steer: 1, autoDrift: true, assist: true });
  assert.equal(p1.drifting, false, "steering out of a bend is not a drift");
  const r2 = quiet(),
    p2 = r2.player;
  p2.distance = bend(r2, 1) - 12;
  p2.speed = 33;
  steps(r2, 66, { steer: 1, autoDrift: false, assist: true });
  assert.equal(p2.drifting, false);
});

test("drift button in a bend without steering drifts toward the inside", () => {
  for (const sign of [-1, 1]) {
    const r = quiet(),
      p = r.player;
    p.distance = bend(r, sign, 0.012) + 2;
    p.lane = p.previousLane = 0;
    p.speed = 33;
    steps(r, 20, { steer: 0, drift: true, assist: true });
    assert(p.drifting, "drifting");
    assert.equal(p.driftDirection, -sign, "toward the inside of the bend");
  }
});

test("rocket start: press when the countdown shows 1; perfect late, nothing if early", () => {
  const go = (pressAt) => {
    const r = new Race({ seed: 5 }),
      ev = [];
    while (r.phase === "countdown") {
      r.step(1 / 60, { start: pressAt !== null && r.countdown <= pressAt });
      ev.push(...r.events);
    }
    return { r, ev, p: r.player };
  };
  const perfect = go(START.perfect - 0.1);
  assert(perfect.ev.some((e) => e.type === "rocketStart" && e.perfect));
  assert(perfect.p.boost >= 1.4 && perfect.p.speed >= 15);
  const good = go(START.window - 0.1);
  assert(good.ev.some((e) => e.type === "rocketStart" && !e.perfect));
  assert(good.p.boost > 0.8 && good.p.speed >= 10);
  const early = go(3);
  assert(early.ev.some((e) => e.type === "startEarly"));
  assert.equal(early.p.boost, 0);
  const none = go(null);
  assert(!none.ev.some((e) => e.type === "rocketStart" || e.type === "startEarly"));
  // Holding from the start, letting go and pressing again in time still works.
  const r = new Race({ seed: 5 }),
    ev = [];
  while (r.phase === "countdown") {
    r.step(1 / 60, { start: r.countdown > 2.5 || r.countdown <= 0.6 });
    ev.push(...r.events);
  }
  assert(ev.some((e) => e.type === "rocketStart"));
});
