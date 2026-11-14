// v2.8: nine tracks in five themes, three cups, the 大师 class, per-track AI
// pace, and thirteen karts in five series.
import test from "node:test";
import assert from "node:assert/strict";
import { Race, Track, TRACKS, THEMES, CUPS, DIFFICULTIES, AI_SKILL, AI_PACE, KARTS, SERIES, CHARACTERS, themeOf, clamp, cornerPush } from "../dist/race.js";

test("tracks: nine, each in a theme, drivable — no bend tighter than the old hairpin, no two parts of the lap too close", () => {
  assert.equal(TRACKS.length, 9);
  assert.equal(THEMES.length, 5);
  assert.deepEqual(TRACKS.slice(0, 3).map((t) => [t.id, t.theme]), [["meadow", 0], ["candy", 1], ["starlight", 2]], "the first three are unchanged");
  assert.equal(new Set(TRACKS.map((t) => t.id)).size, 9, "ids are unique");
  for (let i = 0; i < TRACKS.length; i++) {
    const c = TRACKS[i],
      t = new Track(i),
      n = 1200;
    assert(c.theme >= 0 && c.theme < THEMES.length, c.name + " has a theme");
    assert.equal(themeOf(i), c.theme);
    assert(c.name && c.tag && c.desc && c.level && /^#[0-9a-f]{6}$/i.test(c.accent), c.name + " has its garage copy");
    assert(t.length > 780 && t.length < 1150, c.name + " lap " + t.length.toFixed(0) + " m");
    let tightest = 0,
      clear = Infinity;
    for (let k = 0; k < n; k++) tightest = Math.max(tightest, Math.abs(t.curvature((k / n) * t.length)));
    // (The tightest bend up to v2.7 is 蜜桃糖果海湾's hairpin, radius 9.1 m.)
    assert(1 / tightest >= 9, c.name + " tightest radius " + (1 / tightest).toFixed(1) + " m");
    for (let a = 0; a < n; a += 4)
      for (let b = a + 4; b < n; b += 4) {
        if (Math.min(b - a, n - (b - a)) * (t.length / n) < 60) continue;
        clear = Math.min(clear, Math.hypot(t.points[a].x - t.points[b].x, t.points[a].z - t.points[b].z));
      }
    // Room for both roads, their verges and the scenery between them.
    assert(clear >= 44, c.name + ": parts of the lap come within " + clear.toFixed(1) + " m");
    // The new tracks start on a straight (the first three line up in a
    // gentle bend, as they always have).
    if (i >= 3) for (const d of [-20, -10, 0, 10]) assert(Math.abs(t.curvature(d)) < 0.016, c.name + " grid at " + d + " m is straight enough");
  }
  for (let th = 0; th < THEMES.length; th++) assert(TRACKS.some((t) => t.theme === th), THEMES[th].name + " has a track");
});

test("boost pads: the new tracks place theirs on straights; the old three keep their spots", () => {
  for (let i = 0; i < TRACKS.length; i++) {
    const r = new Race({ track: i, seed: 1 }),
      L = r.track.length;
    assert.equal(r.pads.length, 3);
    if (i < 3) assert.deepEqual(r.pads.map((p) => [+(p.distance / L).toFixed(2), p.lane]), [[0.2, 3], [0.48, -3], [0.77, 3]]);
    else {
      assert.deepEqual(r.pads.map((p) => [+(p.distance / L).toFixed(3), p.lane]), TRACKS[i].pads);
      for (const p of r.pads) for (let d = -4; d <= 14; d += 2) assert(Math.abs(r.track.curvature(p.distance + d)) < 0.013, TRACKS[i].name + " pad at " + (p.distance / L).toFixed(2) + " is not in a bend");
    }
  }
});

test("cups: three cups of three races; every track is in exactly one", () => {
  assert.deepEqual(CUPS.map((c) => c.id), ["sunny", "adventure", "master"]);
  assert.deepEqual(CUPS[0].tracks, [0, 1, 2], "晴空杯 is the cup of v2.7");
  const all = CUPS.flatMap((c) => c.tracks);
  assert.deepEqual([...all].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  for (const c of CUPS) assert(c.tracks.length === 3 && c.name && c.icon && c.level);
});

test("classes: 大师 joins 50 / 100 / 150cc; the first three behave exactly as before", () => {
  assert.deepEqual(DIFFICULTIES, ["easy", "normal", "hard", "master"]);
  // (The values that were spread over race.js up to v2.7.)
  assert.deepEqual(
    ["easy", "normal", "hard"].map((d) => [AI_SKILL[d].aggression, AI_SKILL[d].dodge, AI_SKILL[d].cornerDrift, AI_SKILL[d].start, AI_SKILL[d].ahead, AI_SKILL[d].behind, AI_SKILL[d].nitro]),
    [
      [0.3, 0.45, 0.35, 0.15, 0.025, 0.035, [0.8, 2.5]],
      [0.5, 0.75, 0.6, 0.3, 0.025, 0.035, [0.8, 2.5]],
      [0.7, 0.95, 0.85, 0.5, 0.025, 0.035, [0.8, 2.5]],
    ],
  );
  assert.deepEqual([AI_PACE.item.easy, AI_PACE.item.normal, AI_PACE.item.hard, AI_PACE.speed.easy, AI_PACE.speed.normal, AI_PACE.speed.hard], [0.86, 0.97, 1.07, 0.86, 0.97, 1.015]);
  const m = AI_SKILL.master,
    h = AI_SKILL.hard;
  assert(AI_PACE.item.master > AI_PACE.item.hard && AI_PACE.speed.master > AI_PACE.speed.hard, "faster");
  assert(m.cornerDrift > h.cornerDrift && m.start > h.start && m.dodge >= h.dodge, "sharper");
  assert(m.ahead < h.ahead, "and they barely ease off when ahead");
  assert(m.nitro[0] < h.nitro[0], "nitro as soon as a straight opens");
  // An unknown class falls back to 100cc rather than breaking.
  const r = new Race({ seed: 1, difficulty: "nonsense" });
  while (r.phase === "countdown") r.step(1 / 60, {});
  for (let i = 0; i < 120; i++) r.step(1 / 60, {});
  assert(r.racers[3].speed > 5);
});

// The racer bot of the balance simulations: steers the line, drifts every
// bend (auto-drift), takes a perfect start, fires nitro on straights.
function botRace(track, difficulty, rules, seed) {
  const r = new Race({ track, seed, difficulty, rules });
  while (r.phase === "countdown") r.step(1 / 60, r.countdown <= 0.25 ? { start: true, steer: 0 } : {});
  for (let f = 0; f < 18000 && r.phase !== "finished"; f++) {
    const p = r.player,
      c = r.track.curvature(p.distance + 4),
      need = -cornerPush(c, p.speed, p.drifting) / (7.8 * p.character.grip);
    let steer = clamp(need - p.lane * 0.18, -1, 1);
    if (Math.abs(c) > 0.012) steer = -Math.sign(cornerPush(c, p.speed, false)) || steer;
    r.step(1 / 60, { assist: true, autoDrift: true, steer: Math.abs(steer) < 0.15 ? 0 : steer });
    if (rules === "item") {
      if (p.item && p.roulette === 0) r.useItem();
      if (p.special >= 100 && !r.specialWasted()) r.useSpecial();
    } else if (p.nitroCharges > 0 && Math.abs(r.track.curvature(p.distance + 25)) < 0.012) r.useNitro();
  }
  return r;
}

test("大师 speed race: the field is faster than at 150cc on every track, and a good driver can still reach the podium", () => {
  let podiums = 0,
    races = 0;
  for (let track = 0; track < TRACKS.length; track++) {
    const best = (d) => {
      let sum = 0;
      for (const seed of [1, 2]) {
        const r = botRace(track, d, "speed", seed);
        assert.equal(r.phase, "finished", TRACKS[track].name + " " + d + " finishes");
        assert.equal(r.player.walls, 0, "the bot keeps off the rails on " + TRACKS[track].name);
        sum += Math.min(...r.racers.slice(1).map((x) => x.finish ?? 999));
        if (d === "master") {
          races++;
          if (r.rank() <= 3) podiums++;
        }
      }
      return sum / 2;
    };
    const hard = best("hard"),
      master = best("master");
    assert(master < hard - 0.2, TRACKS[track].name + ": the fastest AI takes " + master.toFixed(1) + " s at 大师, " + hard.toFixed(1) + " s at 150cc");
  }
  assert(podiums >= 3, "the bot reached the podium in " + podiums + " of " + races + " 大师 races");
  assert(podiums < races, "but not every time: it is the hardest class");
});

test("AI pace per track: the same class is about as hard on every track", () => {
  // The AI's best time against the bot's, 150cc speed race: within a few
  // per cent on all nine tracks (without `aiPace` the new tracks ranged from
  // 2.5% faster than the bot to 7% slower). The two tracks with the most
  // bends are left a little easier for a perfect drifter on purpose: a thumb
  // on a phone loses more time there than this bot does.
  for (let track = 0; track < TRACKS.length; track++) {
    let ratio = 0;
    for (const seed of [1, 2, 3]) {
      const r = botRace(track, "hard", "speed", seed);
      ratio += Math.min(...r.racers.slice(1).map((x) => x.finish)) / r.player.finish / 3;
    }
    const technical = ["icecanyon", "redrock"].includes(TRACKS[track].id);
    assert(ratio > 0.965 && ratio < (technical ? 1.05 : 1.025), TRACKS[track].name + ": AI best / bot = " + ratio.toFixed(3));
    const f = TRACKS[track].aiPace;
    assert(track < 3 ? f === undefined : f > 0.9 && f < 1.15, TRACKS[track].name + " aiPace " + f);
  }
});

test("karts: thirteen in five series; each tunes the player within small bounds; the first four are unchanged", () => {
  assert.equal(Object.keys(KARTS).length, 13);
  assert.deepEqual(SERIES.map((s) => s.id), ["classic", "thunder", "jet", "phantom", "puff"]);
  assert.deepEqual(
    ["classic", "thunder", "jet", "phantom"].map((id) => [KARTS[id].speed, KARTS[id].accel, KARTS[id].grip, KARTS[id].boost, KARTS[id].charge]),
    [
      [1, 1, 1, 1, 1],
      [1.015, 0.88, 0.98, 1, 1],
      [0.99, 1, 0.94, 1.12, 1],
      [0.99, 1.03, 1.08, 1, 1.15],
    ],
  );
  const gold = CHARACTERS.find((c) => c.id === "gold");
  for (const [id, k] of Object.entries(KARTS)) {
    assert(SERIES.some((s) => s.id === k.series), id + " is in a series");
    assert(id === "classic" ? !k.body : ["thunder", "jet", "phantom", "puff"].includes(k.body), id + " has a body");
    assert(k.name.length > 2);
    assert(k.speed >= 0.98 && k.speed <= 1.02 && k.accel >= 0.85 && k.accel <= 1.1 && k.grip >= 0.93 && k.grip <= 1.1 && k.boost >= 1 && k.boost <= 1.17 && k.charge >= 1 && k.charge <= 1.2, id + " stays within bounds");
    const p = new Race({ seed: 3, character: "gold", kart: id }).player;
    assert.equal(p.kart, id);
    assert(Math.abs(p.character.speed - gold.speed * k.speed) < 1e-9 && p.boostScale === k.boost && p.chargeScale === k.charge);
  }
  for (const s of SERIES) assert.equal(Object.values(KARTS).filter((k) => k.series === s.id).length, s.id === "classic" ? 1 : 3, s.name + " has its karts");
  // No kart is plainly better than another of its series.
  for (const s of SERIES) {
    const ks = Object.values(KARTS).filter((k) => k.series === s.id),
      stats = (k) => [k.speed, k.accel, k.grip, k.boost, k.charge];
    for (const a of ks)
      for (const b of ks) {
        if (a === b) continue;
        const A = stats(a),
          B = stats(b);
        assert(!(A.every((v, i) => v >= B[i]) && A.some((v, i) => v > B[i])), a.name + " is not simply better than " + b.name);
      }
  }
});
