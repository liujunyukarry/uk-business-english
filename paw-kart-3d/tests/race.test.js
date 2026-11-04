import test from "node:test";
import assert from "node:assert/strict";
import { Race, Track, ITEMS } from "../dist/race.js";
const ready = (options = {}) => {
  const r = new Race({ seed: 42, ...options });
  while (r.phase === "countdown") r.step(1 / 60);
  return r;
};
test("all tracks are closed, finite and smooth at the finish line", () => {
  for (let i = 0; i < 3; i++) {
    const t = new Track(i);
    assert(t.length > 600 && t.length < 1400);
    assert(t.sample(0).p.distanceTo(t.sample(t.length).p) < 1e-5);
    assert(t.sample(-2).p.distanceTo(t.sample(t.length - 2).p) < 1e-5);
    for (let d = 0; d < t.length; d += 5) {
      const s = t.sample(d);
      assert(Number.isFinite(s.yaw));
      assert(Math.abs(t.curvature(d)) < 0.15);
    }
  }
});
test("every track and difficulty completes three laps with eight distinct ranks", () => {
  for (let track = 0; track < 3; track++)
    for (const difficulty of ["easy", "normal", "hard"]) {
      const r = ready({ track, difficulty });
      for (let f = 0; f < 18000 && r.phase !== "finished"; f++) {
        const p = r.player,
          steer = Math.max(
            -1,
            Math.min(1, -p.lane * 0.4 + (r.track.curvature(p.distance) * p.speed * p.speed * 0.021) / 9),
          );
        r.step(1 / 60, { steer, assist: true });
        if (p.item && p.roulette <= 0) r.useItem();
        for (const x of r.racers) assert(Number.isFinite(x.distance) && Number.isFinite(x.lane));
      }
      assert.equal(r.phase, "finished");
      assert(r.player.finish > 30 && r.player.finish < 180);
      assert.equal(new Set(r.standings().map((x) => x.id)).size, 8);
      assert(r.player.distance >= r.track.length * 3);
    }
});
test("drift charges while steering, releases once, and grants boost", () => {
  const r = ready();
  r.player.distance = 40;
  r.player.speed = 32;
  r.racers.slice(1).forEach((x) => (x.distance = -200));
  // v2.6: a drift charges with the bend it takes, so hold it through a
  // steady right-hand bend (the inside is -sign(curvature)).
  r.track.curvature = () => -0.02;
  for (let i = 0; i < 60; i++) r.step(1 / 60, { steer: 0.35, drift: true });
  assert(r.player.drift >= 0.65);
  r.step(1 / 60, { steer: 0, drift: false });
  assert(r.player.boost > 0);
  assert.equal(r.player.drifts, 1);
  r.step(1 / 60, {});
  assert.equal(r.player.drifts, 1);
});
test("shield blocks once; star and post-hit invulnerability prevent repeated stun", () => {
  const r = ready(),
    p = r.player;
  p.shield = 6;
  assert.equal(r.hit(p, 1), false);
  assert.equal(p.shield, 0);
  assert.equal(p.hits, 0);
  p.invincible = 0;
  assert.equal(r.hit(p, 1), true);
  assert.equal(r.hit(p, 2), false);
  assert.equal(p.hits, 1);
  p.invincible = 0;
  p.star = 5;
  assert.equal(r.hit(p, 2), false);
});
test("all items consume exactly once and cannot be used during countdown", () => {
  for (const item of Object.keys(ITEMS)) {
    const r = ready();
    r.player.item = item;
    r.player.roulette = 0;
    assert(r.useItem());
    assert.equal(r.player.item, null);
    assert.equal(r.player.itemsUsed, 1);
    assert.equal(r.useItem(), false);
  }
  const r = new Race();
  r.player.item = "boost";
  assert.equal(r.useItem(), false);
});
test("homing shell reaches the actual opponent and banana leaves a live hazard", () => {
  const r = ready();
  r.player.distance = 0;
  r.player.lane = 0;
  for (let i = 1; i < 8; i++) {
    r.racers[i].distance = 50 + i * 30;
    r.racers[i].lane = 0;
  }
  r.player.item = "shell";
  r.useItem();
  for (let i = 0; i < 250; i++) r.step(1 / 60, { assist: true });
  assert(r.racers.some((x) => x.id !== 0 && x.hits > 0));
  r.player.item = "banana";
  r.player.roulette = 0;
  r.useItem();
  assert(r.hazards.length > 0);
});
test("no input and no throttle does not move a manual-control player", () => {
  const r = ready();
  const d = r.player.distance;
  for (let i = 0; i < 120; i++) r.step(1 / 60, { throttle: false });
  assert.equal(r.player.distance, d);
});
test("difficulty ordering rewards active driving, not idle autopilot", () => {
  const positions = [];
  for (const difficulty of ["easy", "normal", "hard"]) {
    const r = ready({ difficulty });
    for (let f = 0; f < 18000 && r.phase !== "finished"; f++) r.step(1 / 60, { assist: true });
    positions.push(r.rank());
  }
  assert(positions[0] <= positions[2]);
});
