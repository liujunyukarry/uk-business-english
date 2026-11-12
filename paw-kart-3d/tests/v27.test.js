// v2.7: steering response (touch feel), and the effects whose logic runs
// without a GPU — sprite particles and tyre marks (dist/fx.js).
import test from "node:test";
import assert from "node:assert/strict";
import { Race, STEER } from "../dist/race.js";
import { createSprites, createSkids, createPost, GLOW, PUFF, STAR, CARD, LOOKS } from "../dist/fx.js";

const DT = 1 / 60;
// The player alone on a straight road, up to speed.
const alone = () => {
  const r = new Race({ seed: 27 });
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.item = null;
    x.aiItem = x.aiSpecial = x.aiNitro = 1e9;
  });
  r.boxes.forEach((b) => b.taken.fill(1e9, 1));
  r.pads = [];
  r.track.curvature = () => 0;
  const p = r.player;
  p.distance = 120;
  for (let i = 0; i < 120; i++) r.step(DT, { assist: true });
  p.lane = p.previousLane = 0;
  p.lateral = 0;
  p.steer = 0;
  return r;
};
const run = (r, seconds, input) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) r.step(DT, { assist: true, ...input });
};

test("steering: the wheel turns in faster than v2.6 and centres faster still when the thumb lifts", () => {
  assert(STEER.turn > 11 && STEER.release > STEER.turn && STEER.grip > 9, "quicker than v2.6's 11 / 11 / 9");
  const r = alone(),
    p = r.player;
  run(r, 0.1, { steer: 1 });
  assert(p.steer > 1 - Math.exp(-0.1 * 12), "after 0.1 s the wheel is further over than at v2.6's rate: " + p.steer.toFixed(3));
  run(r, 0.5, { steer: 1 });
  const held = p.steer;
  assert(held > 0.99, "full lock when held");
  run(r, 0.1, {});
  assert(p.steer < held * Math.exp(-0.1 * 15), "0.1 s after lifting it has centred further than v2.6 would: " + p.steer.toFixed(3));
  // Crossing straight over to the other side also uses the quick rate.
  const q = alone();
  run(q, 0.5, { steer: 1 });
  run(q, 0.1, { steer: -1 });
  assert(q.player.steer < 1 - 2 * (1 - Math.exp(-0.1 * 15)), "a reversal comes off the old side quickly: " + q.player.steer.toFixed(3));
});

test("steering: a tap is a small correction, and the kart stops moving across sooner; top sideways speed is unchanged", () => {
  // A 0.1 s tap moves the kart a small, bounded distance.
  const r = alone(),
    p = r.player;
  run(r, 0.1, { steer: 1 });
  run(r, 1, {});
  assert(p.lane > 0.25 && p.lane < 1.2, "a tap moves the kart a fraction of its width: " + p.lane.toFixed(2) + " m");
  assert(Math.abs(p.lateral) < 0.05, "and it has stopped moving across");
  // Held, the kart reaches the same sideways speed as before (7.8 m/s x grip).
  const h = alone(),
    hp = h.player;
  run(h, 0.7, { steer: 1 });
  assert(Math.abs(hp.lateral - 7.8 * hp.character.grip) < 0.25, "top sideways speed: " + hp.lateral.toFixed(2));
  // Released at full sideways speed, it coasts across less far than v2.6 did
  // (v2.6: 7.8 x (1/9 + 1/11) = 1.58 m for grip 1).
  hp.lane = hp.previousLane = 0;
  const before = hp.lateral;
  run(h, 1.2, {});
  assert(hp.lane < before * (1 / 9 + 1 / 11) * 0.85, "coasts " + hp.lane.toFixed(2) + " m after release");
  assert(hp.lane > before * 0.08, "but still glides to a stop, not a snap");
});

test("steering: quick left-right taps still move the kart smoothly, never in jumps", () => {
  const r = alone(),
    p = r.player;
  let worst = 0,
    last = p.lane;
  for (let i = 0; i < 240; i++) {
    r.step(DT, { assist: true, steer: i % 40 < 20 ? 1 : -1 });
    worst = Math.max(worst, Math.abs(p.lane - last));
    last = p.lane;
  }
  assert(worst < 0.22, "no step moves the kart sideways by more than " + worst.toFixed(3) + " m");
});

test("sprites: particles live, move, fade and are removed; the pool recycles the one nearest its end", () => {
  const s = createSprites({ glow: 4, solid: 3 });
  assert.equal(s.count, 0);
  s.add(GLOW, 0, 1, 0, 2, 0, 0, 1, 0.3, 0xffffff, 1, 0, 0, 0);
  s.add(STAR, 0, 2, 0, 0, 0, 0, 0.2, 0.3, 0xff0000);
  s.add(PUFF, 5, 0, 0, 0, 1, 0, 0.5, 0.4, 0x808080, 0.5, 1, 0, 0);
  s.add(CARD, 6, 3, 0, 0, 0, 0, 0.5, 0.2, 0x00ff00);
  assert.equal(s.layers[0].n, 2, "glow and sparkle add light");
  assert.equal(s.layers[1].n, 2, "smoke and confetti blend");
  s.update(0.1);
  const g = s.layers[0];
  assert(Math.abs(g.a.pos[0] - 0.2) < 1e-6, "moved with its velocity (no drag, no gravity)");
  assert.equal(g.geo.instanceCount, 2);
  // The short-lived sparkle dies; the survivor keeps its own data.
  s.update(0.15);
  assert.equal(g.n, 1, "the 0.2 s particle is gone");
  assert(Math.abs(g.a.pos[0] - 0.5) < 1e-6 && Math.abs(g.a.pos[1] - 1) < 1e-6, "the other is untouched");
  // Smoke grows and thins out.
  const smoke = s.layers[1];
  assert(smoke.size[0] > 0.4, "the puff has grown");
  assert(smoke.a.col[3] > 0 && smoke.a.col[3] <= 0.5, "and is drawn at its alpha");
  // A full pool replaces the particle closest to its end.
  for (let i = 0; i < 3; i++) s.add(GLOW, i, 0, 0, 0, 0, 0, 5, 0.3, 0xffffff);
  assert.equal(g.n, 4, "full");
  const index = s.add(GLOW, 9, 9, 9, 0, 0, 0, 5, 0.3, 0xffffff);
  assert.equal(g.n, 4, "still full, nothing overflowed");
  assert.equal(index, 0, "the oldest (0.75 s left) made way");
  assert.equal(g.a.pos[0], 9);
  s.update(6);
  assert.equal(s.count, 0, "all gone in the end");
  s.add(GLOW, 0, 0, 0, 0, 0, 0, 1, 0.3, 0xffffff);
  s.clear();
  assert.equal(s.count, 0);
});

test("sprites: streaks follow the motion relative to the camera", () => {
  const s = createSprites({ glow: 4, solid: 2 });
  // Hanging still in the air while the camera drives past at 40 m/s.
  s.add(GLOW, 0, 2, 30, 0, 0, 0, 1, 0.05, 0xffffff, 0.5, 0, 0, 0, 0.05);
  s.update(1 / 60, 0, 0, 40);
  const v = s.layers[0].a.vel;
  assert.deepEqual([v[0], v[1], v[2]], [0, 0, -40], "it rushes at the camera");
  assert.equal(s.layers[0].a.par[1], Math.fround(0.05), "with its streak length kept");
  // Glowing kinds are drawn brighter when the frame is HDR.
  s.setGain(1.7);
  assert.equal(s.layers[0].mesh.material.uniforms.gain.value, 1.7);
  assert.equal(s.layers[1].mesh.material.uniforms.gain.value, 1, "smoke is not");
});

test("tyre marks: a marking wheel lays pieces as it moves, a lifted wheel leaves a gap, a jump draws no line", () => {
  const k = createSkids({ quads: 6, life: 2 });
  // Rolling forward 0.2 m a step for 1 m: a piece about every 0.3 m.
  for (let i = 0; i <= 5; i++) k.mark(1, 0, 0.07, i * 0.2, 1, 0, 0.12, 0, 0, 0, 0.4, i * 0.02);
  assert.equal(k.laid, 2, "pieces are laid 0.3 m apart or more, not every step");
  // Lift, move 1 m, set down again: nothing bridges the gap.
  k.lift(1);
  k.mark(1, 0, 0.07, 2.2, 1, 0, 0.12, 0, 0, 0, 0.4, 0.2);
  assert.equal(k.laid, 2, "the first touch after a lift only records where the wheel is");
  k.mark(1, 0, 0.07, 2.6, 1, 0, 0.12, 0, 0, 0, 0.4, 0.22);
  assert.equal(k.laid, 3);
  // A teleport (rescue, respawn) while marking draws no streak across.
  k.mark(1, 40, 0.07, 80, 1, 0, 0.12, 0, 0, 0, 0.4, 0.3);
  assert.equal(k.laid, 3, "no piece 90 m long");
  // The newest piece spans the wheel's last two positions at the mark's width.
  const p = k.mesh.geometry.attributes.position.array,
    o = 2 * 12;
  assert.deepEqual([p[o], p[o + 2], p[o + 3], p[o + 5]].map((x) => +x.toFixed(2)), [-0.12, 2.2, 0.12, 2.2], "from the last edge");
  assert.deepEqual([p[o + 6], p[o + 8], p[o + 9], p[o + 11]].map((x) => +x.toFixed(2)), [-0.12, 2.6, 0.12, 2.6], "to the new one");
  // More pieces than the ring holds: the oldest are reused, never overflowed.
  for (let i = 0; i < 40; i++) k.mark(2, 5, 0.07, i * 0.5, 1, 0, 0.12, 0, 0, 0, 0.4, 1 + i * 0.01);
  assert.equal(k.laid, 3 + 39);
  assert.equal(p.length, 6 * 12);
  // Glow mode (the night track) adds light; clear() empties the ring.
  k.setGlow(true, 1.6);
  assert.equal(k.mesh.material.uniforms.gain.value, 1.6);
  k.update(3);
  assert.equal(k.mesh.material.uniforms.time.value, 3);
  k.clear();
  assert(k.mesh.geometry.attributes.born.array.every((b) => b < -1e5), "every piece is retired");
});

test("post chain: not created for the compatibility renderer or without float targets; the garage look is mild", () => {
  assert.equal(createPost({ software: true }), null);
  assert.equal(createPost({ capabilities: { isWebGL2: true }, extensions: { has: () => false } }), null, "no float colour buffers: plain drawing");
  const g = LOOKS.garage;
  assert(g.bloom > 0 && g.bloom < 1 && g.threshold >= 0.8 && g.vignette < 0.3 && g.saturation < 1.2);
});
