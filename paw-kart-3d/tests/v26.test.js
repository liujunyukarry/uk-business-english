// v2.6: drifting pays for its boost (no more winning by holding one drift or
// scraping along a rail), solid rails and karts that bounce, and 必杀无敌
// (invincibility while a special fires).
import test from "node:test";
import assert from "node:assert/strict";
import {
  Race,
  CHARACTERS,
  DRIFT_ECON,
  WALL,
  BUMP,
  SPECIAL_GUARD,
  NITRO_RULES,
  driftBend,
  driftLevel,
  clamp,
  cornerPush,
} from "../dist/race.js";

const DT = 1 / 60;
// The player alone on the road (the field parked far away, holding fire).
const quiet = (opts = {}) => {
  const r = new Race({ seed: 26, ...opts });
  r.phase = "racing";
  r.racers.slice(1).forEach((x, i) => {
    x.distance = -300 - i * 15;
    x.lane = 0;
    x.item = null;
    x.aiItem = 1e9;
    x.aiSpecial = 1e9;
    x.aiNitro = 1e9;
  });
  r.boxes.forEach((b) => b.taken.fill(1e9, 1));
  r.pads = [];
  return r;
};
const steps = (r, n, input = {}, each = null) => {
  const ev = [];
  for (let i = 0; i < n; i++) {
    each?.(r);
    r.step(DT, input);
    ev.push(...r.events);
  }
  return ev;
};
// A steady piece of road: a bend of curvature `c` (0 = a straight).
const road = (r, c) => (r.track.curvature = () => c);

test("drift economy: a drift charges at full rate through a bend into it, a trickle on a straight", () => {
  assert.equal(driftBend(-0.02, 1), 1, "steering right into a right-hand bend");
  assert.equal(driftBend(0.02, 1), 0, "against the bend");
  assert.equal(driftBend(0, -1), 0, "a straight");
  assert(Math.abs(driftBend(-DRIFT_ECON.bendRef / 2, 1) - 0.5) < 1e-9);
  const charge = (c) => {
    const r = quiet(),
      p = r.player;
    p.distance = 120;
    steps(r, 90, { assist: true });
    road(r, c);
    steps(r, 60, { steer: 1, drift: true, assist: true }, () => (p.lane = p.previousLane = 0));
    return p.drift;
  };
  const bend = charge(-0.02),
    straight = charge(0);
  // Steering into the drift charges 1.25 s per second (the drift starts a
  // couple of steps into the second).
  assert(bend > 1.15 && bend <= 1.25, `bend ${bend.toFixed(2)} s of charge in 1 s`);
  assert(Math.abs(straight / bend - DRIFT_ECON.straightCharge) < 0.02, `straight ${straight.toFixed(2)}`);
  assert.equal(driftLevel(straight), 0, "a second down a straight is not even a blue spark");
});

test("drift economy: drifting down a straight is slower than driving it; through a bend it is faster", () => {
  const run = (c, input) => {
    const r = quiet(),
      p = r.player;
    p.distance = 120;
    p.lane = p.previousLane = 0;
    road(r, c);
    steps(r, 150, { assist: true }, () => (p.lane = p.previousLane = 0)); // up to speed
    let travelled = p.distance;
    steps(r, 120, { assist: true, ...input }, () => (p.lane = p.previousLane = 0));
    travelled = p.distance - travelled;
    return { speed: p.speed, travelled };
  };
  const straightDrift = run(0, { steer: 1, drift: true }),
    straightDrive = run(0, {});
  assert(straightDrive.speed - straightDrift.speed > 2.5, `straight: ${straightDrive.speed.toFixed(1)} vs drifting ${straightDrift.speed.toFixed(1)} m/s`);
  const bendDrift = run(-0.02, { steer: 1, drift: true }),
    bendSteer = run(-0.02, { steer: 1 });
  assert(bendDrift.travelled > bendSteer.travelled, `bend: drifting ${bendDrift.travelled.toFixed(1)} m vs steering ${bendSteer.travelled.toFixed(1)} m`);
});

test("speed race: holding a drift down a straight barely charges nitro; a bend charges it fast", () => {
  const nitro = (c) => {
    const r = quiet({ rules: "speed" }),
      p = r.player;
    p.distance = 120;
    steps(r, 90, { assist: true });
    road(r, c);
    steps(r, 120, { steer: 1, drift: true, assist: true }, () => (p.lane = p.previousLane = 0));
    return p.nitro + p.nitroCharges * 100;
  };
  const bend = nitro(-0.02),
    straight = nitro(0);
  assert(bend >= NITRO_RULES.perDriftSecond * 2 * 0.95, `bend ${bend.toFixed(0)}`);
  assert(straight <= NITRO_RULES.perDriftSecond * 2 * (DRIFT_ECON.straightNitro + 0.02), `straight ${straight.toFixed(0)}`);
});

test("a drift aimed at the rail reaches it, bounces off and loses its charge (assist on)", () => {
  const r = quiet(),
    p = r.player,
    half = r.track.width / 2;
  road(r, 0);
  p.distance = 150;
  p.lane = p.previousLane = half - 4;
  p.speed = 34;
  let wall = null,
    worst = 0,
    after = 0;
  for (let i = 0; i < 300 && after < 30; i++) {
    const before = p.lane,
      charge = p.drift;
    r.step(DT, { steer: 1, drift: true, assist: true });
    worst = Math.max(worst, Math.abs(p.lane - before));
    const e = r.events.find((x) => x.type === "wall" && x.racer === 0);
    if (e && !wall) wall = { e, charge, speed: p.speed };
    if (wall) after++;
    if (wall && after === 1) {
      assert.equal(p.drifting, false, "the rail ends the drift");
      assert.equal(p.boost, 0, "without gifting its boost");
      assert(p.rebound < -1, `bounced back off the rail (${p.rebound.toFixed(2)} m/s)`);
    }
  }
  assert(wall, "the drift reached the rail");
  assert(wall.charge > 0, "it was charging when it hit");
  assert(p.lane < half + 1.05 - 0.3, `came off the rail (lane ${p.lane.toFixed(2)})`);
  assert(worst < 0.35, `no teleport: ${worst.toFixed(3)} m in one step`);
});

test("rail bounce: a square hit costs more speed and bounces harder than a graze", () => {
  const hitRail = (lateral) => {
    const r = quiet(),
      p = r.player,
      half = r.track.width / 2;
    p.speed = 40;
    p.lateral = lateral;
    p.lane = half + 1.1;
    r.constrain(p);
    return { loss: 40 - p.speed, rebound: p.rebound, lane: p.lane, events: r.events };
  };
  const graze = hitRail(1),
    square = hitRail(12);
  for (const h of [graze, square]) {
    assert(h.rebound < 0, "pushed back toward the road");
    assert(Math.abs(h.rebound) <= WALL.max + 1e-9);
    assert(h.events.some((e) => e.type === "wall" && e.racer === 0));
  }
  assert(square.loss > graze.loss * 2, `square ${square.loss.toFixed(1)} vs graze ${graze.loss.toFixed(1)} m/s`);
  assert(square.loss <= WALL.maxLoss + 1e-9, "never a dead stop in one step");
  assert(Math.abs(square.rebound) > Math.abs(graze.rebound));
  // The other rail bounces the other way.
  const r = quiet(),
    p = r.player;
  p.speed = 40;
  p.lateral = -6;
  p.lane = -(r.track.width / 2 + 1.2);
  r.constrain(p);
  assert(p.rebound > 0);
});

test("mindless driving no longer wins: holding a drift along the rail, or drifting everywhere", () => {
  // Same race three ways: a driver who drifts the bends, one who holds a
  // drift and a direction the whole way (pinned to the rail), and one who
  // drifts everywhere, releasing at purple.
  const race = (driver) => {
    const r = new Race({ track: 0, seed: 7, difficulty: "normal", rules: "speed" });
    while (r.phase === "countdown") r.step(DT, {});
    let letGo = 0,
      side = 1;
    for (let f = 0; f < 18000 && r.phase !== "finished"; f++) {
      const p = r.player,
        c = r.track.curvature(p.distance + 4);
      let input;
      if (driver === "bends") {
        const need = -cornerPush(c, p.speed, p.drifting) / (7.8 * p.character.grip);
        let steer = clamp(need - p.lane * 0.18, -1, 1);
        if (Math.abs(c) > 0.012) steer = -Math.sign(c);
        input = { steer: Math.abs(steer) < 0.15 ? 0 : steer, assist: true, autoDrift: true };
      } else {
        if (driver === "everywhere" && Math.abs(c) > 0.004) side = -Math.sign(c);
        if (letGo > 0) letGo--;
        else if (p.drifting && driftLevel(p.drift) >= 3) letGo = 8;
        input = { steer: letGo ? 0 : side, drift: !letGo, assist: true, autoDrift: true };
      }
      r.step(DT, input);
      if (p.nitroCharges > 0 && (driver !== "bends" || Math.abs(r.track.curvature(p.distance + 25)) < 0.012)) r.useNitro();
    }
    return { rank: r.rank(), time: r.player.finish };
  };
  const bends = race("bends"),
    rail = race("rail"),
    everywhere = race("everywhere");
  assert(bends.rank <= 2, `drifting the bends: ${bends.rank}`);
  assert(rail.rank >= 7, `holding one drift along the rail: ${rail.rank}`);
  assert(everywhere.rank > bends.rank && everywhere.time > bends.time + 2, `drifting everywhere: ${everywhere.rank} (${everywhere.time?.toFixed(1)} s vs ${bends.time.toFixed(1)} s)`);
});

test("kart contact: a side hit bounces both karts apart; a rear-end slows the kart behind and shoves the one in front", () => {
  const side = quiet(),
    a = side.player,
    b = side.racers[1];
  road(side, 0);
  a.distance = b.distance = 150;
  a.lane = a.previousLane = -0.9;
  b.lane = b.previousLane = 0.9;
  a.speed = b.speed = 32;
  a.lateral = 4; // swerving into b
  const ev = steps(side, 1, { assist: false, throttle: true });
  assert(a.rebound <= -BUMP.side * 0.95, `a bounced left (${a.rebound.toFixed(2)})`);
  assert(b.rebound >= BUMP.side * 0.95, `b bounced right (${b.rebound.toFixed(2)})`);
  const bump = ev.find((e) => e.type === "bump" && e.racer === 0);
  assert(bump && bump.strength > 0, "the player feels it");
  steps(side, 30, { assist: false, throttle: true });
  assert(b.lane - a.lane > 2.6, `clear of each other (${(b.lane - a.lane).toFixed(2)} m)`);

  const rear = quiet(),
    p = rear.player,
    o = rear.racers[1];
  road(rear, 0);
  o.distance = 150;
  p.distance = 148;
  p.lane = p.previousLane = o.lane = o.previousLane = 0;
  p.speed = 42;
  o.speed = 26;
  steps(rear, 1, { assist: false, throttle: true });
  assert(p.speed < 42 - BUMP.rearMax + 0.5, `the kart behind bounced off (${p.speed.toFixed(1)} m/s)`);
  assert(o.speed > 26 + BUMP.frontMax - 0.5, `the kart in front was shoved (${o.speed.toFixed(1)} m/s)`);
  assert(42 - p.speed < 12, "no dead stop in one step");
});

test("必杀无敌: every special makes its driver immune to attacks for a moment", () => {
  for (const c of CHARACTERS) {
    const r = quiet({ character: c.id }),
      p = r.player;
    p.distance = 200;
    r.racers[1].distance = 230; // someone ahead, so attack specials have a target
    r.racers[1].lane = p.lane;
    p.special = 100;
    assert(r.useSpecial(), c.id);
    const guard = SPECIAL_GUARD[c.id] ?? SPECIAL_GUARD.base;
    assert.equal(p.guard, guard, `${c.id} guard ${p.guard}`);
    const hitsBefore = p.hits;
    assert.equal(r.hit(p, 1), false, `${c.id} is immune`);
    assert.equal(p.hits, hitsBefore);
    assert(r.events.some((e) => e.type === "guardBlock" && e.racer === 0), "the block is reported");
    steps(r, Math.ceil(guard * 60) + 2, { assist: true });
    assert.equal(p.guard, 0, "and it wears off");
  }
});

test("必杀无敌: AI drivers get it too; a guarded kart shrugs off bumps; AI hold attacks meant for it", () => {
  const r = quiet(),
    ai = r.racers[1];
  ai.distance = 80;
  ai.special = 100;
  assert(r.useSpecial(ai));
  assert(ai.guard > 0);
  assert.equal(r.hit(ai, 0), false);
  // Side contact: the guarded kart barely moves, the other is bounced away.
  const s = quiet(),
    a = s.player,
    b = s.racers[1];
  road(s, 0);
  a.distance = b.distance = 150;
  a.lane = a.previousLane = -0.9;
  b.lane = b.previousLane = 0.9;
  a.speed = b.speed = 32;
  a.guard = 3;
  steps(s, 1, { assist: false });
  assert(Math.abs(b.rebound) > Math.abs(a.rebound) * 3, `guarded ${a.rebound.toFixed(2)} vs ${b.rebound.toFixed(2)}`);
  // An AI holding a shell for the player waits while the player is immune.
  const w = quiet(),
    p = w.player,
    shooter = w.racers[1];
  road(w, 0);
  p.distance = 220;
  shooter.distance = 200;
  shooter.lane = p.lane = 0;
  shooter.item = "shell";
  shooter.aiItem = 0;
  shooter.itemPatient = true;
  p.guard = 2;
  steps(w, 30, { assist: true }, () => (w.racers.slice(2).forEach((x) => (x.distance = -300))));
  assert.equal(shooter.item, "shell", "kept the shell");
  assert.equal(w.projectiles.length, 0);
});

test("rails and bounces keep every kart on the road and finite through full races", () => {
  for (let track = 0; track < 3; track++) {
    const r = new Race({ track, seed: 3 + track, difficulty: "hard" });
    while (r.phase === "countdown") r.step(DT, {});
    let walls = 0;
    for (let f = 0; f < 18000 && r.phase !== "finished"; f++) {
      // A careless driver: weaves into both rails with the drift held.
      r.step(DT, { steer: Math.sin(f * 0.02) > 0 ? 1 : -1, drift: f % 300 < 200, assist: f % 1200 < 600 });
      walls += r.events.filter((e) => e.type === "wall" && e.racer === 0).length;
      for (const k of r.racers) {
        assert(Number.isFinite(k.lane) && Number.isFinite(k.speed) && Number.isFinite(k.rebound));
        assert(Math.abs(k.lane) <= r.track.width / 2 + 1.051);
        assert(Math.abs(k.rebound) <= Math.max(WALL.max, BUMP.max, 7) + 1e-9);
      }
    }
    assert(walls > 5, `track ${track}: the weaving driver met the rails (${walls})`);
  }
});

test("specials aim past karts that are immune right now (star, rocket, 必杀无敌)", () => {
  const r = quiet({ character: "bear" }),
    p = r.player;
  p.distance = 200;
  const [a, b] = [r.racers[1], r.racers[2]];
  a.distance = 215;
  b.distance = 240;
  a.lane = b.lane = p.lane;
  assert.deepEqual(r.specialTargets(), [a.id], "the nearest kart");
  a.guard = 2;
  assert.deepEqual(r.specialTargets(), [b.id], "passes over a guarded kart");
  a.guard = 0;
  a.star = 3;
  assert.deepEqual(r.specialTargets(), [b.id], "and one under a star");
  // A shell still homes on whoever is next (and is wasted on a guarded kart).
  a.star = 0;
  a.guard = 2;
  p.item = "shell";
  r.useItem();
  assert.equal(r.projectiles[0].target, a.id);
});
