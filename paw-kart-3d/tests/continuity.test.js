// Motion continuity regressions for "the kart behind suddenly jumps up and the
// whole screen shakes". RACE_JS=/path/to/race.js runs them against another build.
import test from "node:test";
import assert from "node:assert/strict";

const { Race, clamp } = await import(process.env.RACE_JS || "../dist/race.js");

// A plain racing line follower standing in for the player.
const driver = (r) => {
  const p = r.player;
  return {
    steer: clamp(-p.lane * 0.4 + (r.track.curvature(p.distance) * p.speed * p.speed * 0.021) / 9, -1, 1),
    assist: true,
  };
};

function run(track, seed, each) {
  const r = new Race({ track, seed, difficulty: "normal" });
  while (r.phase === "countdown") r.step(1 / 60);
  for (let f = 0; f < 18000 && r.phase !== "finished"; f++) {
    const before = r.racers.map((x) => ({ d: x.distance, l: x.lane, s: x.speed, hits: x.hits, rescue: x.rescue }));
    r.step(1 / 60, driver(r));
    each(r, before);
  }
  return r;
}

test("no kart jumps: per-step motion stays continuous outside item hits and rescues", () => {
  let worstLane = 0,
    worstAlong = 0,
    worstSpeed = 0;
  for (let track = 0; track < 3; track++)
    for (const seed of [1, 2, 3, 4])
      run(track, seed, (r, before) =>
        r.racers.forEach((x, i) => {
          const b = before[i];
          if (x.rescue > 0 || b.rescue > 0 || x.finish !== null || x.hits !== b.hits) return;
          // Travel must lie within what the speeds before/after the step allow;
          // anything outside that band is a positional correction (a jump).
          const scale = clamp(1 + x.lane * r.track.curvature(b.d), 0.65, 1.35),
            lo = (Math.min(b.s, x.speed) / 60 / scale) * 0.97 - 0.005,
            hi = (Math.max(b.s, x.speed) / 60 / scale) * 1.03 + 0.005,
            moved = x.distance - b.d;
          worstLane = Math.max(worstLane, Math.abs(x.lane - b.l));
          worstAlong = Math.max(worstAlong, moved - hi, lo - moved);
          worstSpeed = Math.max(worstSpeed, Math.abs(x.speed - b.s));
        }),
      );
  // V2: 0.44 m sideways, 0.40 m along-track and 31.9 m/s in a single 1/60 s step.
  assert(worstLane < 0.3, `sideways step ${worstLane.toFixed(3)} m`);
  assert(worstAlong < 0.15, `along-track correction ${worstAlong.toFixed(3)} m`);
  assert(worstSpeed < 12, `speed change ${worstSpeed.toFixed(1)} m/s in one step`);
});

test("AI karts race around the player instead of pushing into it", () => {
  let steps = 0,
    contact = 0,
    rammed = 0;
  for (let track = 0; track < 3; track++)
    for (const seed of [1, 2, 3, 4])
      run(track, seed, (r) => {
        if (r.player.finish !== null) return;
        steps++;
        const p = r.player;
        for (const o of r.racers.slice(1)) {
          const dx = r.gap(p.distance, o.distance),
            dy = p.lane - o.lane;
          if ((dx / 2.65) ** 2 + (dy / 1.95) ** 2 < 1.02) {
            contact++;
            // A star or rocket ploughing into the player is an attack, not
            // racecraft; only count ordinary rear-ends.
            if (dx > 0.25 && Math.abs(dy) <= 0.25 && !(o.star > 0 || o.rocket > 0)) rammed++;
          }
        }
      });
  // V2: in contact with an AI on 19.4 % of all steps, rear-ended 369 times.
  assert(contact / steps < 0.03, `player in contact ${((contact / steps) * 100).toFixed(1)} % of steps`);
  assert(rammed < 60, `rear-ended by AI on ${rammed} steps`);
});

test("a faster AI arriving from behind passes on a side, without contact", () => {
  for (let track = 0; track < 3; track++) {
    const r = new Race({ track, seed: 5 });
    r.phase = "racing";
    r.racers.slice(2).forEach((x, i) => {
      x.distance = -300 - i * 15;
    });
    const p = r.player,
      ai = r.racers[1];
    p.distance = 200;
    p.lane = 0;
    p.speed = 26;
    ai.distance = 186;
    ai.lane = 0.2;
    ai.speed = 40;
    ai.boost = 3; // arrives fast
    let touched = 0,
      passed = false;
    for (let i = 0; i < 600; i++) {
      r.step(1 / 60, { steer: clamp(-p.lane * 0.4, -1, 1), throttle: true, assist: true });
      p.speed = Math.min(p.speed, 26);
      const dx = r.gap(p.distance, ai.distance),
        dy = p.lane - ai.lane;
      if ((dx / 2.65) ** 2 + (dy / 1.95) ** 2 < 1) touched++;
      if (dx < -4) passed = true;
    }
    assert(passed, `track ${track}: AI never got past`);
    assert(touched <= 3, `track ${track}: touched for ${touched} steps`);
  }
});

test("side contact pushes apart continuously and settles", () => {
  const r = new Race({ seed: 9 });
  r.phase = "racing";
  r.racers.slice(2).forEach((x, i) => (x.distance = -300 - i * 15));
  const a = r.player,
    b = r.racers[1];
  a.distance = b.distance = 150;
  a.lane = -0.6;
  b.lane = 0.6;
  a.speed = b.speed = 30;
  let last = a.lane - b.lane;
  for (let i = 0; i < 40; i++) {
    r.step(1 / 60, { throttle: true, assist: false });
    const now = a.lane - b.lane;
    assert(Math.abs(now - last) < 0.3, "no snap apart");
    last = now;
  }
  assert(Math.abs(a.lane - b.lane) > 1.9, "karts end up clear of each other");
});
