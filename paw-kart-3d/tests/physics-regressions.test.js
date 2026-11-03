import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../dist/vendor/three.module.js";
import { Race, Track, sweptContact } from "../dist/race.js";
const ready = (opts = {}) => {
  const r = new Race({ seed: 42, ...opts });
  r.phase = "racing";
  return r;
};
const alone = (r) =>
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -200 - i * 10;
    x.lane = 0;
  });
test("positive lane projects to screen right around every track", () => {
  for (let k = 0; k < 3; k++) {
    const t = new Track(k);
    for (let d = 0; d < t.length; d += 11) {
      const c = new T.PerspectiveCamera(57, 390 / 844, 0.1, 700);
      c.position.copy(t.sample(d - 9).p).add(new T.Vector3(0, 5, 0));
      c.lookAt(t.sample(d + 11).p);
      c.updateMatrixWorld();
      const left = t.sample(d, -1).p.project(c),
        right = t.sample(d, 1).p.project(c);
      assert(right.x > left.x);
    }
  }
});
test("stationary manual steering does not slide sideways", () => {
  const r = ready();
  alone(r);
  const before = r.player.lane;
  for (let i = 0; i < 120; i++) r.step(1 / 60, { steer: 1, throttle: false });
  assert.equal(r.player.lane, before);
});
test("continuous collision sees fast crossings without false side hits", () => {
  assert(sweptContact(-10, 0, 10, 0, 2, 1));
  assert(!sweptContact(-10, 3, 10, 3, 2, 1));
  const r = ready();
  alone(r);
  const p = r.player,
    b = r.boxes[0];
  p.distance = b.distance - 4;
  p.lane = b.lane;
  p.speed = 160;
  r.step(0.05, { assist: false });
  assert(p.item);
});
test("boosting against either rail stays on the track without teleporting", () => {
  for (let track = 0; track < 3; track++)
    for (const steer of [-1, 1]) {
      const r = ready({ track });
      alone(r);
      r.player.boost = 100;
      for (let i = 0; i < 1200; i++) {
        r.step(1 / 60, { steer, assist: false });
        assert(Math.abs(r.player.lane) <= r.track.width / 2 + 1.051);
        assert.equal(r.player.rescue, 0);
      }
    }
});
test("coincident karts separate even near a rail", () => {
  for (const lane of [0, 8.9, -8.9]) {
    const r = ready();
    alone(r);
    const a = r.player,
      b = r.racers[1];
    a.distance = b.distance = 100;
    a.lane = b.lane = lane;
    for (let i = 0; i < 20; i++) r.step(1 / 60, { throttle: false, assist: false });
    const dx = r.gap(a.distance, b.distance),
      dy = a.lane - b.lane;
    assert((dx / 2.65) ** 2 + (dy / 1.95) ** 2 > 0.85);
    assert(Math.abs(a.lane) <= 9.051 && Math.abs(b.lane) <= 9.051);
  }
});
test("off-track rescue preserves progress and resumes driving", () => {
  const r = ready();
  alone(r);
  r.player.distance = 125;
  r.player.lane = 50;
  r.step(1 / 60);
  assert.equal(r.player.distance, 125);
  assert(r.player.rescue > 0);
  for (let i = 0; i < 150; i++) r.step(1 / 60);
  assert(r.player.distance > 125);
  assert.equal(r.player.rescue, 0);
});
test("hit and rail cancel drift without gifting a boost", () => {
  const r = ready();
  alone(r);
  const p = r.player;
  p.drifting = true;
  p.drift = 2;
  r.hit(p, 1);
  assert.equal(p.drift, 0);
  assert.equal(p.boost, 0);
  p.invincible = p.stun = 0;
  p.drifting = true;
  p.drift = 2;
  p.lane = 10;
  r.constrain(p);
  assert.equal(p.boost, 0);
  assert.equal(p.drifting, false);
});
test("shell targets physically ahead across the lap boundary and hits once", () => {
  const r = ready();
  alone(r);
  const p = r.player,
    t = r.racers[1];
  p.distance = r.track.length - 10;
  p.lane = t.lane = 0;
  t.distance = 15;
  p.item = "shell";
  assert(r.useItem());
  assert.equal(r.projectiles[0].target, 1);
  for (let i = 0; i < 150; i++) r.step(1 / 60);
  assert.equal(t.hits, 1);
  assert.equal(r.projectiles.length, 0);
});
test("banana cannot hit owner and shield consumes hazard exactly once", () => {
  const r = ready();
  alone(r);
  const p = r.player,
    t = r.racers[1];
  p.distance = 100;
  p.lane = 0;
  p.item = "banana";
  r.useItem();
  t.distance = 95.8;
  t.lane = 0;
  t.shield = 6;
  r.step(1 / 60);
  assert.equal(p.hits, 0);
  assert.equal(t.hits, 0);
  assert.equal(t.shield, 0);
  assert.equal(r.hazards.length, 0);
});
test("three-track mixed-input stress keeps simulation finite within rails", () => {
  for (let track = 0; track < 3; track++)
    for (let seed = 1; seed <= 10; seed++) {
      const r = ready({ track, seed });
      for (let i = 0; i < 2400; i++) {
        r.step(1 / 60, {
          steer: Math.sin(i * 0.013),
          drift: i % 210 < 130,
          assist: Math.floor(i / 600) % 2 === 0,
        });
        if (r.player.item && r.player.roulette === 0) r.useItem();
        for (const p of r.racers) {
          assert(Number.isFinite(p.distance) && Number.isFinite(p.lane) && Number.isFinite(p.speed));
          assert(Math.abs(p.lane) <= r.track.width / 2 + 1.051);
        }
      }
    }
});
