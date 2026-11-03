// Six-item audit: each item consumed once, effect and duration as specified,
// and the events the renderer needs for visual / audio feedback.
import test from "node:test";
import assert from "node:assert/strict";
import { Race, ITEMS } from "../dist/race.js";

const ready = (opts = {}) => {
  const r = new Race({ seed: 7, ...opts });
  r.phase = "racing";
  // Park the field far away unless a test places karts itself.
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.lane = 0;
    x.item = null;
    x.aiItem = 1e9;
  });
  // ...and keep it from collecting items on its own: boxes are per racer, so
  // the parked field would otherwise pick some up and use them.
  r.boxes.forEach((b) => b.taken.fill(1e9, 1));
  return r;
};
const run = (r, seconds, input = { assist: true }) => {
  const all = [];
  for (let i = 0; i < seconds * 60; i++) {
    r.step(1 / 60, input);
    all.push(...r.events);
  }
  return all;
};

test("seven items exist with names, icons and descriptions", () => {
  assert.deepEqual(Object.keys(ITEMS), ["boost", "shell", "banana", "shield", "star", "bolt", "rocket"]);
  for (const v of Object.values(ITEMS)) assert(v.name && v.icon && v.desc);
});

test("mushroom: 2.5 s boost tagged for the orange flame, faster than cruising", () => {
  const r = ready(),
    p = r.player;
  p.distance = 100;
  run(r, 2);
  const cruise = p.speed;
  p.item = "boost";
  assert(r.useItem());
  assert.equal(p.boost, 2.5);
  assert.equal(p.boostKind, "item");
  run(r, 1.2);
  assert(p.speed > cruise * 1.2, `boosted ${p.speed.toFixed(1)} vs ${cruise.toFixed(1)}`);
  run(r, 1.5);
  assert.equal(p.boost, 0, "boost runs out");
});

test("star: 5 s immunity, clears stun and shrink, knocks over karts it touches", () => {
  const r = ready(),
    p = r.player,
    o = r.racers[1];
  p.distance = 100;
  p.stun = 0.8;
  p.small = 2;
  p.item = "star";
  assert(r.useItem());
  assert.equal(p.star, 5);
  assert.equal(p.stun, 0);
  assert.equal(p.small, 0);
  assert.equal(r.hit(p, 1), false, "immune");
  o.distance = p.distance + 1.2;
  o.lane = p.lane;
  const ev = run(r, 0.2);
  assert(o.hits >= 1, "star ram knocks the other kart");
  assert(ev.some((e) => e.type === "hit" && e.racer === 1 && e.owner === 0), "hit event names the player as owner");
  run(r, 5);
  assert.equal(p.star, 0, "star wears off after 5 s");
});

test("shield: 6 s, absorbs exactly one hit, then gone", () => {
  const r = ready(),
    p = r.player;
  p.item = "shield";
  assert(r.useItem());
  assert.equal(p.shield, 6);
  assert.equal(r.hit(p, 1), false);
  assert.equal(p.shield, 0);
  assert.equal(p.hits, 0);
  p.invincible = 0;
  assert.equal(r.hit(p, 1), true, "second hit lands");
});

test("banana: dropped behind, spares its owner, spins the next kart once", () => {
  const r = ready(),
    p = r.player,
    o = r.racers[1];
  p.distance = 100;
  p.lane = 0;
  p.item = "banana";
  assert(r.useItem());
  const h = r.hazards[0];
  assert(h.distance < p.distance, "behind the owner");
  o.distance = h.distance - 6;
  o.lane = h.lane;
  o.speed = 30;
  o.dodgeId = h.id; // force a straight line: this test is about the hit
  o.dodgeSide = 0;
  const ev = run(r, 0.6, { throttle: false, assist: true });
  assert.equal(p.hits, 0);
  assert.equal(o.hits, 1);
  assert.equal(r.hazards.length, 0, "used up");
  assert(ev.some((e) => e.type === "pop" && Number.isFinite(e.distance) && Number.isFinite(e.lane)), "impact position for the burst");
});

test("homing shell: targets the nearest kart ahead, hits it once, reports owner", () => {
  const r = ready(),
    p = r.player,
    o = r.racers[1];
  p.distance = 100;
  p.lane = 0;
  o.distance = 160;
  o.lane = 3;
  p.item = "shell";
  assert(r.useItem());
  assert.equal(r.projectiles[0].target, 1);
  const ev = run(r, 3, { throttle: false, assist: true });
  assert.equal(o.hits, 1);
  assert.equal(r.projectiles.length, 0);
  assert(ev.some((e) => e.type === "hit" && e.racer === 1 && e.owner === 0));
});

test("lightning: shrinks and stuns everyone ahead for 3 s, spares those behind", () => {
  const r = ready(),
    p = r.player;
  p.distance = 100;
  r.racers[1].distance = 140;
  r.racers[2].distance = 160;
  r.racers[2].shield = 6;
  r.racers[3].distance = 60;
  p.item = "bolt";
  assert(r.useItem());
  assert.equal(r.racers[1].small, 3);
  assert.equal(r.racers[2].small, 0, "shield blocks it");
  assert.equal(r.racers[3].small, 0, "behind is unaffected");
  assert.equal(p.small, 0, "not the user");
});

test("item box: picked up at speed, slot fills after the roulette, box respawns", () => {
  const r = ready(),
    p = r.player,
    b = r.boxes[4];
  p.distance = b.distance - 3;
  p.lane = b.lane;
  p.speed = 60; // well above top speed: swept contact must still catch it
  const ev = run(r, 0.2, { throttle: true, assist: false });
  const pick = ev.find((e) => e.type === "pickup" && e.racer === 0);
  assert(pick, "picked up");
  assert.equal(pick.box, b.id, "event names the box for its burst");
  assert(p.item && p.roulette > 0);
  assert.equal(r.useItem(), false, "cannot use during the roulette");
  run(r, 0.8);
  assert.equal(p.roulette, 0);
  assert(Object.keys(ITEMS).includes(p.item));
  assert(b.taken[0] > 0 && b.taken[0] <= 4, "gone for the player, respawns");
});

test("AI usually steers round a banana in its line", () => {
  let hits = 0,
    tries = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = new Race({ seed, difficulty: "normal" });
    r.phase = "racing";
    r.racers.forEach((x, i) => {
      x.distance = -400 - i * 20;
      x.item = null;
      x.aiItem = 1e9;
    });
    const o = r.racers[1];
    o.distance = 200;
    o.lane = 0.3;
    o.speed = 32;
    o.aiLane = 0.3;
    o.aiTimer = 10;
    r.hazards.push({ id: 999, owner: 0, distance: 225, lane: 0, life: 22 });
    for (let i = 0; i < 120; i++) r.step(1 / 60, { throttle: false });
    tries++;
    hits += o.hits;
  }
  assert(hits <= 9, `hit the banana in ${hits} of ${tries} runs`);
});
