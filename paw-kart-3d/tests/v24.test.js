// v2.4: speed race (竞速赛) with drift-charged nitro, and slipstream.
import test from "node:test";
import assert from "node:assert/strict";
import { Race, NITRO_RULES, DRAFT, BEAR_RAM } from "../dist/race.js";

const steps = (r, n, input = {}) => {
  const ev = [];
  for (let i = 0; i < n; i++) {
    r.step(1 / 60, input);
    ev.push(...r.events);
  }
  return ev;
};
const speedRace = (opts = {}) => {
  const r = new Race({ seed: 31, rules: "speed", ...opts });
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.aiNitro = 1e9;
  });
  return r;
};

test("a speed race has no item boxes, coins, items or specials", () => {
  const r = speedRace(),
    p = r.player;
  assert.equal(r.rules, "speed");
  assert.equal(r.boxes.length, 0);
  assert.equal(r.coins.length, 0);
  p.item = "boost";
  assert.equal(r.useItem(), true, "items can still be used if handed over by a test");
  p.special = 100;
  assert.equal(r.useSpecial(), false, "no specials");
  r.gain(p, 50);
  assert.equal(p.special, 100, "the special gauge does not fill");
  assert.equal(new Race({ seed: 1 }).rules, "item", "item race by default");
});

test("drifting fills the nitro gauge; charges stack to two; nitro fires a boost", () => {
  const r = speedRace(),
    p = r.player;
  p.distance = 100;
  p.lane = p.previousLane = -5;
  steps(r, 60, { assist: true });
  // v2.6: nitro charges with the bend a drift takes: drift through a steady
  // bend into the drift (steering right: curvature < 0).
  r.track.curvature = () => -0.02;
  const ev = [];
  for (let i = 0; i < 6 * 60; i++) {
    p.lane = p.previousLane = 0; // hold the line: this checks the gauge
    r.step(1 / 60, { steer: 1, drift: true, assist: true });
    ev.push(...r.events);
    if (p.drift >= 2) {
      r.step(1 / 60, { steer: 0, drift: false, assist: true }); // release, then go again
      ev.push(...r.events);
    }
  }
  assert.equal(p.nitroCharges, NITRO_RULES.max, "two charges stored");
  assert.equal(ev.filter((e) => e.type === "nitroReady" && e.racer === 0).length, 2);
  const before = p.speed;
  steps(r, 1);
  assert(r.useNitro());
  assert.equal(p.nitroCharges, 1);
  assert.equal(p.boostKind, "nitro");
  assert(p.boost > 2 && p.speed > before + NITRO_RULES.kick - 1);
  assert(r.useNitro());
  assert.equal(r.useNitro(), false, "empty");
  assert.equal(p.nitroUsed, 2);
});

test("AI racers charge and fire nitro in a full speed race; everyone finishes", () => {
  for (let track = 0; track < 3; track++) {
    const r = new Race({ track, seed: 5, rules: "speed" });
    while (r.phase !== "finished") r.step(1 / 60, { assist: true });
    assert.equal(r.finishes.length, 8);
    const ai = r.racers.slice(1).filter((x) => x.nitroUsed > 0).length;
    assert(ai >= 5, `${ai} AI racers used nitro on track ${track}`);
  }
});

test("slipstream: tucked in behind a kart for a moment pulls you past", () => {
  const r = new Race({ seed: 9 });
  r.phase = "racing";
  r.racers.slice(2).forEach((x, i) => (x.distance = -300 - i * 15));
  const p = r.player,
    o = r.racers[1];
  Object.assign(o, { distance: 300, lane: 0, previousLane: 0, speed: 30, aiTimer: 99, aiLane: 0, item: null, aiItem: 1e9 });
  Object.assign(p, { distance: 300 - (DRAFT.min + DRAFT.max) / 2, lane: 0, previousLane: 0, speed: 30 });
  let drafted = null;
  for (let i = 0; i < 120 && !drafted; i++) {
    p.distance = o.distance - (DRAFT.min + DRAFT.max) / 2; // hold the gap
    p.lane = o.lane;
    r.step(1 / 60, { assist: true });
    drafted = r.events.find((e) => e.type === "draft" && e.racer === 0);
  }
  assert(drafted, "slipstream boost");
  assert.equal(p.boostKind, "draft");
  assert(p.boost > 0.8);
});

test("two boosts landing in the same physics step give one speed kick, not two", () => {
  const r = speedRace(),
    p = r.player;
  steps(r, 30);
  let before = p.speed;
  r.inStep = true; // as if both fired inside one step()
  r.stepNo++;
  r.startBoost(p, 1, "pad", 5);
  r.startBoost(p, 1, "drift2", 5);
  r.inStep = false;
  assert(Math.abs(p.speed - before - 5) < 1e-9, "one kick inside a step");
  before = p.speed;
  r.startBoost(p, 1, "item", 6); // the player's tap between steps
  assert(Math.abs(p.speed - before - 6) < 1e-9, "a tap always kicks");
});

test("special targets: what an attack special would hit, and when firing would be wasted", () => {
  const setup = (character) => {
    const r = new Race({ seed: 4, character });
    r.phase = "racing";
    const p = r.player;
    p.distance = 300;
    p.lane = 0;
    r.racers.slice(1).forEach((x, i) => (x.distance = 100 - i * 10)); // all behind
    return r;
  };
  // Nova: the three nearest ahead within 220 m; nobody ahead = wasted.
  let r = setup("nova");
  assert.deepEqual(r.specialTargets(), []);
  assert.equal(r.specialWasted(), "noTarget");
  [1, 2, 3, 4].forEach((id, i) => (r.racers[id].distance = 330 + i * 40));
  assert.deepEqual(r.specialTargets(), [1, 2, 3]);
  assert.equal(r.specialWasted(), null);
  r.player.special = 100;
  assert(r.useSpecial());
  assert.deepEqual(r.meteors.map((m) => m.target), [1, 2, 3], "the marked karts are the ones hit");
  // Bear: the nearest ahead within 70 m; with none it is still a dash.
  r = setup("bear");
  assert.equal(r.specialWasted(), null);
  r.racers[5].distance = 340;
  assert.deepEqual(r.specialTargets(), [5]);
  r.player.special = 100;
  r.useSpecial();
  assert.equal(r.player.chargeTarget, 5);
  // Fireballs: karts ahead in the three lines only.
  r = setup("mario");
  assert.equal(r.specialWasted(), "noTarget");
  Object.assign(r.racers[1], { distance: 330, lane: 1 });
  Object.assign(r.racers[2], { distance: 340, lane: 7 });
  assert.deepEqual(r.specialTargets(), [1]);
  assert.equal(r.specialWasted(), null);
  // Pocket with both item slots full would throw an item away.
  r = setup("dora");
  assert.equal(r.specialWasted(), null);
  Object.assign(r.player, { item: "boost", item2: "shell" });
  assert.equal(r.specialWasted(), "slotsFull");
  // Non-attack specials never lock on.
  assert.deepEqual(setup("gold").specialTargets(), []);
});

test("熊抱冲撞: a locked-on ram connects even with a target boosting away at the edge of range", () => {
  for (const gap of [25, 45, BEAR_RAM.range - 2]) {
    const r = new Race({ seed: 8, character: "bear" });
    r.phase = "racing";
    r.racers.slice(2).forEach((x, i) => (x.distance = -300 - i * 15));
    const p = r.player,
      o = r.racers[1];
    Object.assign(p, { distance: 200, lane: 0, previousLane: 0, speed: 32, special: 100 });
    Object.assign(o, { distance: 200 + gap, previous: 200 + gap, lane: 3, previousLane: 3, speed: 38, aiTimer: 99, aiLane: 3, aiItem: 1e9 });
    r.startBoost(o, 2.5, "item", 0); // the target is mid-boost
    assert.deepEqual(r.specialTargets(), [1], "marked as the target");
    assert(r.useSpecial());
    let t = 0;
    for (; t < 6 * 60 && !o.hits; t++) r.step(1 / 60, { assist: true });
    assert.equal(o.hits, 1, `rammed from ${gap} m`);
    assert(t / 60 <= BEAR_RAM.chase, `in ${(t / 60).toFixed(1)} s`);
    for (let i = 0; i < 30; i++) r.step(1 / 60, { assist: true });
    assert.equal(p.charge, 0, "the charge ends once it lands");
  }
  // No target: just the 3 s dash, as before.
  const r = new Race({ seed: 8, character: "bear" });
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => (x.distance = -300 - i * 15));
  Object.assign(r.player, { distance: 200, special: 100 });
  assert(r.useSpecial());
  assert.equal(r.player.chargeTarget, null);
  assert.equal(r.player.charge, 3);
});
