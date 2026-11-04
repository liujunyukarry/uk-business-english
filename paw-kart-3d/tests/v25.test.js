// v2.5: start boost on a press at GO (KartRider style), kart bodies, and
// faster charging of nitro and the special gauge.
import test from "node:test";
import assert from "node:assert/strict";
import { Race, CHARACTERS, KARTS, START, NITRO_RULES, GAUGE } from "../dist/race.js";

const DT = 1 / 60;
// Run a countdown where `pressed(t)` says whether the start input is down,
// with t = time left on the countdown (negative after GO). Runs until 1 s
// after GO and returns the player and every event.
function start(pressed, opts = {}) {
  const r = new Race({ seed: 3, ...opts }),
    ev = [];
  // An open road ahead, so the start is measured, not the queue in front.
  r.racers.slice(1).forEach((x, i) => (x.distance = x.previous = -120 - i * 10));
  let after = 0;
  while (after < 1) {
    const t = r.phase === "countdown" ? r.countdown : -after;
    r.step(DT, { start: pressed(t) });
    ev.push(...r.events);
    if (r.phase === "racing") after += DT;
  }
  return { r, p: r.player, ev };
}
const tap = (at) => (t) => t <= at && t > at - 0.05; // a short tap (3 steps)

test("start boost: a tap right before GO is perfect, a little earlier is good", () => {
  const perfect = start(tap(0.2));
  assert(perfect.ev.some((e) => e.type === "rocketStart" && e.perfect));
  assert.equal(perfect.p.startBoosted, "perfect");
  assert.equal(perfect.p.boostKind, "start", "the perfect start has its own flames");
  const good = start(tap(0.6));
  assert(good.ev.some((e) => e.type === "rocketStart" && !e.perfect));
  assert.equal(good.p.startBoosted, "good");
  assert(perfect.p.distance > good.p.distance + 1, "perfect pulls further ahead");
});

test("start boost: a tap just after GO still counts (perfect within a beat, then good)", () => {
  const justAfter = start(tap(-0.04));
  assert(justAfter.ev.some((e) => e.type === "rocketStart" && e.perfect));
  const later = start(tap(-0.25));
  assert(later.ev.some((e) => e.type === "rocketStart" && !e.perfect));
  const tooLate = start(tap(-0.5));
  assert(!tooLate.ev.some((e) => e.type === "rocketStart"));
  assert(!tooLate.ev.some((e) => e.type === "startEarly"), "a late tap is not called early");
});

test("start boost: too early is no boost; a held press from early is no boost; tapping again in time works", () => {
  const early = start(tap(1.6));
  assert(!early.ev.some((e) => e.type === "rocketStart"));
  assert(early.ev.some((e) => e.type === "startEarly"), "told it was early (after the late window)");
  assert.equal(early.p.boost, 0);
  const held = start((t) => t <= 2 && t > -1);
  assert(!held.ev.some((e) => e.type === "rocketStart"));
  assert(held.ev.some((e) => e.type === "startEarly"));
  const again = start((t) => (t <= 1.6 && t > 1.5) || (t <= 0.15 && t > 0.1));
  assert(again.ev.some((e) => e.type === "rocketStart" && e.perfect), "the latest press counts");
  const none = start(() => false);
  assert(!none.ev.some((e) => e.type === "rocketStart" || e.type === "startEarly"));
  assert(START.window > START.perfect && START.late > START.latePerfect);
});

test("kart bodies: the player's body tunes a copy of the driver; AI ride assorted bodies, untuned", () => {
  const before = JSON.stringify(CHARACTERS);
  for (const [id, k] of Object.entries(KARTS)) {
    const r = new Race({ seed: 2, character: "gold", kart: id }),
      p = r.player,
      gold = CHARACTERS.find((c) => c.id === "gold");
    assert.equal(p.kart, id);
    assert.equal(p.character.id, "gold");
    assert(Math.abs(p.character.speed - gold.speed * k.speed) < 1e-9);
    assert(Math.abs(p.character.accel - gold.accel * k.accel) < 1e-9);
    assert(Math.abs(p.character.grip - gold.grip * k.grip) < 1e-9);
    for (const o of r.racers.slice(1)) {
      assert(KARTS[o.kart], "a known body");
      assert.equal(o.boostScale, 1);
      assert.equal(o.chargeScale, 1);
      assert.equal(o.character, CHARACTERS.find((c) => c.id === o.character.id), "AI use the shared stats");
    }
  }
  assert.equal(JSON.stringify(CHARACTERS), before, "CHARACTERS untouched");
  assert.equal(new Race({ kart: "nope" }).player.kart, "classic");
  const looks = new Set();
  for (let seed = 1; seed < 6; seed++) new Race({ seed }).racers.slice(1).forEach((o) => looks.add(o.kart));
  assert(looks.size >= 3, "the field shows several bodies");
});

test("kart bodies: 喷射火箭 boosts last longer, 幻影星舰 charges faster", () => {
  const boostFor = (kart) => {
    const r = new Race({ seed: 2, kart });
    r.phase = "racing";
    r.startBoost(r.player, 2, "item", 0);
    return r.player.boost;
  };
  assert(Math.abs(boostFor("jet") - 2 * KARTS.jet.boost) < 1e-9);
  assert.equal(boostFor("classic"), 2);
  const gauge = (kart) => {
    const r = new Race({ seed: 2, kart, rules: "speed" });
    r.phase = "racing";
    r.gainNitro(r.player, 50);
    return r.player.nitro;
  };
  assert(Math.abs(gauge("phantom") - 50 * KARTS.phantom.charge) < 1e-9);
  assert.equal(gauge("classic"), 50);
});

test("faster charging: one long drift fills a nitro charge; three purple drifts fill most of the special gauge", () => {
  // Speed race: about two seconds of drifting into a bend gives a charge.
  const r = new Race({ seed: 31, rules: "speed" }),
    p = r.player;
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.aiNitro = 1e9;
  });
  p.distance = 100;
  for (let i = 0; i < 60; i++) r.step(DT, { assist: true });
  let charged = false;
  for (let i = 0; i < 2.3 * 60 && !charged; i++) {
    p.lane = p.previousLane = 0;
    r.step(DT, { steer: 1, drift: true, assist: true });
    charged = r.events.some((e) => e.type === "nitroReady" && e.racer === 0);
  }
  if (!charged) {
    r.step(DT, { steer: 0, drift: false, assist: true }); // the release bonus
    r.step(DT, { steer: 0, drift: false, assist: true });
  }
  assert(p.nitroCharges >= 1, `nitro ${p.nitro.toFixed(0)}%, charges ${p.nitroCharges}`);
  // Item race: three purple drift boosts plus 20 s of racing.
  assert(3 * GAUGE.drift[3] + 20 * GAUGE.perSecond >= 85);
  assert(NITRO_RULES.perDriftSecond * 2 + NITRO_RULES.release[3] >= 100);
});

test("every boost is counted, so a new boost on top of one still shows", () => {
  const r = new Race({ seed: 4 });
  r.phase = "racing";
  const p = r.player,
    n = p.boostCount || 0;
  r.startBoost(p, 1, "drift1", 0);
  r.startBoost(p, 1, "item", 0);
  assert.equal(p.boostCount, n + 2);
});
