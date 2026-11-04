// On-screen motion regressions for "the kart behind suddenly appears in front
// of me and the whole picture shakes". Uses the real game loop in Chrome with
// deliberately uneven frame pacing (frames are dropped at random, as on a busy
// phone) and measures what the player sees.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { launch, openRace, serve } from "./browser.js";

let server, browser;
before(async () => {
  server = await serve();
  browser = await launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

// Drop roughly one frame in three so dt alternates between 1x, 2x and 3x.
const unevenFrames = () => {
  const raf = window.requestAnimationFrame.bind(window);
  let n = 0;
  window.requestAnimationFrame = (cb) =>
    raf(function tick(t) {
      if (++n % 3 === 0 || Math.random() < 0.15) return raf(tick);
      cb(t);
    });
};

async function record(page, seconds) {
  return page.evaluate(
    (seconds) =>
      new Promise((done) => {
        const { camera, cars, race } = window.__pk,
          samples = [],
          v = cars[0].position.clone(),
          start = performance.now();
        let lastClock = -1;
        const tick = () => {
          // Sample only frames the game actually drew (the sampler's own frame
          // callbacks are dropped independently).
          if (window.__pk.clock === lastClock) return requestAnimationFrame(tick);
          lastClock = window.__pk.clock;
          v.copy(cars[0].position).project(camera);
          samples.push({
            t: window.__pk.clock,
            x: v.x,
            y: v.y,
            visible: cars.map((k) => k.visible),
            // The near-camera fade (a dissolve with WebGL; on/off at 50 % in
            // the CPU renderer these tests use) is intended, not a pop-in.
            fading: cars.map((k) => (k.userData.fade ?? 1) < 0.999),
            invincible: race.racers.map((r) => r.invincible > 0 && r.star <= 0 && r.stun <= 0),
            near: race.racers.map((r) => Math.abs(race.gap(r.distance, race.player.distance)) < 15),
            // A real rail or kart impact is supposed to be felt; exclude it.
            impact:
              race.player.wallCooldown > 0.4 ||
              race.player.bump > 0 ||
              race.player.rescue > 0 ||
              race.player.stun > 0,
          });
          if (performance.now() - start < seconds * 1000) requestAnimationFrame(tick);
          else done(samples);
        };
        requestAnimationFrame(tick);
      }),
    seconds,
  );
}

test("nearby karts never vanish and pop back in", async (t) => {
  const { ctx, page } = await openRace(browser, server.url, { init: unevenFrames });
  t.after(() => ctx.close());
  await page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 30000 });
  // Pack the field just behind the player, in its lane, so karts close in and
  // pass: exactly where V2 hid them (0.8–11 m behind) and then showed them.
  await page.evaluate(() => {
    const r = window.__pk.race,
      p = r.player;
    r.racers.slice(1).forEach((x, i) => {
      x.distance = p.distance - 3 - i * 2.2;
      x.lane = p.lane + (i % 2 ? 0.4 : -0.4);
      x.speed = p.speed + 6;
      x.boost = 2;
    });
  });
  const samples = await record(page, 8);
  let pops = 0;
  for (let i = 1; i < samples.length; i++)
    for (let k = 1; k < 8; k++)
      // Invincibility blinking (including its last blink as it wears off)
      // is deliberate, not a pop-in.
      if (
        !samples[i - 1].visible[k] &&
        samples[i].visible[k] &&
        samples[i].near[k] &&
        !samples[i].invincible[k] &&
        !samples[i - 1].invincible[k] &&
        !samples[i].fading[k] &&
        !samples[i - 1].fading[k]
      )
        pops++;
  assert.equal(pops, 0, `${pops} pop-ins of karts within 15 m`);
});

test("the player kart holds still on screen when frames are dropped", async (t) => {
  const { ctx, page } = await openRace(browser, server.url, { init: unevenFrames });
  t.after(() => ctx.close());
  await page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 30000 });
  await page.waitForTimeout(2500); // up to speed
  await page.evaluate(() => {
    const r = window.__pk.race; // clear road: measure the camera, not traffic
    r.racers.slice(1).forEach((x, i) => {
      x.distance = r.player.distance - 400 - i * 20;
      x.item = null; // no lightning or shells from the far-away field
      x.aiItem = 1e9;
    });
    r.hazards.length = r.projectiles.length = 0;
    // No boost pads either: a boost's FOV punch is intended camera motion,
    // not jitter (with v2.4's slipstream start the player can reach the
    // first pad inside this window).
    r.pads.length = 0;
  });
  // Let a boost already running (e.g. a slipstream off the start) and its
  // camera punch wear off before measuring.
  await page.waitForFunction(() => window.__pk.race.player.boost <= 0, null, { timeout: 10000 });
  await page.waitForTimeout(1200);
  const samples = await record(page, 6);
  // Time-aware acceleration of the kart's screen position (NDC units / s²):
  // velocity between drawn frames divided by the real time between them, so
  // smooth motion across the screen (v2.3 bends make an idle kart slide
  // wide) does not count, while frame-to-frame jitter does. Measured on the
  // same machine: V2 p95 ≈ 2 (worst ≈ 2.6), v2.3 p95 ≈ 0.2.
  const jumps = [];
  for (let i = 2; i < samples.length; i++) {
    if (samples.slice(Math.max(0, i - 4), i + 1).some((x) => x.impact)) continue;
    const [a, b, c] = [samples[i - 2], samples[i - 1], samples[i]],
      d1 = b.t - a.t,
      d2 = c.t - b.t;
    if (d1 <= 0 || d2 <= 0) continue;
    const ax = ((c.x - b.x) / d2 - (b.x - a.x) / d1) / ((d1 + d2) / 2),
      ay = ((c.y - b.y) / d2 - (b.y - a.y) / d1) / ((d1 + d2) / 2);
    jumps.push(Math.hypot(ax, ay));
  }
  jumps.sort((a, b) => a - b);
  const p95 = jumps[Math.floor(jumps.length * 0.95)],
    worst = jumps[jumps.length - 1];
  console.log(`screen acceleration p95=${p95.toFixed(2)} worst=${worst.toFixed(2)} NDC/s² over ${jumps.length} frames`);
  assert(p95 < 0.8, `p95 screen acceleration ${p95.toFixed(2)} NDC/s²`);
  assert(worst < 1.5, `worst screen acceleration ${worst.toFixed(2)} NDC/s²`);
});
