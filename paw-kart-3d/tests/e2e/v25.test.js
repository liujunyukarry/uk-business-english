// v2.5 in the real page: the start boost from a tap on the screen as the
// countdown runs out (KartRider style), and the kart bodies (车型) in the
// garage and on the track.
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

// The test browser draws a frame only every few hundred ms, far coarser than
// the start window, so race time is held still (steps run with dt = 0: input
// is still read) while the finger lands, then let go.
async function frozenAt(page, countdown) {
  await page.evaluate((countdown) => {
    const race = window.__pk.race,
      step = race.step.bind(race);
    window.__freeze = true;
    race.countdown = countdown;
    race.step = (dt, input) => step(window.__freeze ? 0 : dt, input);
  }, countdown);
  await page.waitForTimeout(200); // a frame or two at the held time
}
const unfreeze = (page) => page.evaluate(() => (window.__freeze = false));

test("start boost: tapping a steering half as the countdown runs out gives a perfect start", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  await frozenAt(r.page, 0.2);
  await r.page.waitForTimeout(500); // the labels fade out over 0.4 s
  // In the start window the hint replaces the steering labels.
  const hint = await r.page.evaluate(() => ({
    shown: !document.querySelector("#start-hint").classList.contains("hidden"),
    text: document.querySelector("#start-hint").textContent,
    labels: getComputedStyle(document.querySelector(".zone span")).opacity,
  }));
  assert(hint.shown, "start hint shown");
  assert.match(hint.text, /点屏幕/);
  assert.equal(hint.labels, "0", "steering labels give way");
  await r.finger.down(1, '[data-control="right"]');
  await r.page.waitForTimeout(120);
  await r.finger.up(1);
  await unfreeze(r.page);
  await r.page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 15000 });
  await r.page.waitForTimeout(200);
  const s = await r.page.evaluate(() => ({
    started: window.__pk.race.player.startBoosted,
    kind: window.__pk.race.player.boostKind,
    banner: document.querySelector("#banner").textContent,
    hint: document.querySelector("#start-hint").classList.contains("hidden"),
  }));
  assert.equal(s.started, "perfect");
  assert.equal(s.kind, "start");
  assert.match(s.banner, /完美起步/);
  assert(s.hint, "hint gone after GO");
});

test("start boost: a quick tap that begins and ends between frames still counts", async (t) => {
  const r = await openRace(browser, server.url, { width: 844, height: 390 });
  t.after(() => r.ctx.close());
  await frozenAt(r.page, 0.5);
  // Down and up with no frame in between: only the latch can see it.
  await r.page.evaluate(() => {
    const raf = window.requestAnimationFrame;
    window.__held = [];
    window.requestAnimationFrame = (cb) => raf((t) => (window.__hold ? window.__held.push(cb) : cb(t)));
    window.__hold = true;
  });
  await r.finger.down(1, '[data-control="left"]');
  await r.finger.up(1);
  await r.page.evaluate(() => {
    window.__hold = false;
    for (const cb of window.__held.splice(0)) requestAnimationFrame(cb);
  });
  await unfreeze(r.page);
  await r.page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 15000 });
  await r.page.waitForTimeout(150);
  assert.equal(await r.page.evaluate(() => window.__pk.race.player.startBoosted), "good");
});

test("start boost: a tap long before GO is too early, and the player is told", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  await frozenAt(r.page, 2);
  await r.finger.down(1, '[data-control="left"]');
  await r.page.waitForTimeout(120);
  await r.finger.up(1);
  await unfreeze(r.page);
  await r.page.waitForFunction(() => window.__pk.race.phase === "racing" && window.__pk.race.lateStart <= 0, null, { timeout: 20000 });
  await r.page.waitForTimeout(250);
  const s = await r.page.evaluate(() => ({ started: window.__pk.race.player.startBoosted, toast: document.querySelector("#toast").textContent }));
  assert.equal(s.started, "");
  assert.match(s.toast, /按早啦/);
});

test("garage: the 车型 tab shows four bodies; the choice is remembered and raced", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932, start: false });
  t.after(() => r.ctx.close());
  const { page } = r;
  assert.equal(await page.$eval("#karts", (e) => e.classList.contains("hidden")), true, "drivers first");
  await page.click('[data-tab="karts"]');
  const cards = await page.$$eval("#karts [data-kart]", (els) =>
    els.map((b) => ({ id: b.dataset.kart, img: (b.querySelector("img").src || "").startsWith("data:image/png"), text: b.textContent })),
  );
  assert.deepEqual(cards.map((c) => c.id), ["classic", "thunder", "jet", "phantom"]);
  assert(cards.every((c) => c.img), "each body has a rendered thumbnail");
  assert.equal(await page.$eval("#characters", (e) => e.classList.contains("hidden")), true);
  await page.click('[data-kart="jet"]');
  assert.equal(await page.$eval('[data-kart="jet"]', (b) => b.getAttribute("aria-pressed")), "true");
  assert.match(await page.$eval("#driver-tag", (e) => e.textContent), /喷射火箭/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("paw-kart-v1")).kart), "jet");
  await page.click("#start");
  await page.waitForFunction(() => window.__pk?.mode === "race", null, { timeout: 30000 });
  const race = await page.evaluate(() => ({
    kart: window.__pk.race.player.kart,
    body: window.__pk.cars[0].userData.bodyId,
    wheels: window.__pk.cars.map((k) => k.userData.wheels.length),
    exhaust: window.__pk.cars.map((k) => k.userData.exhaust.length),
    field: window.__pk.cars.map((k) => k.userData.bodyId),
  }));
  assert.equal(race.kart, "jet");
  assert.equal(race.body, "jet");
  assert(race.wheels.every((n) => n === 4), "four wheels on every kart");
  assert(race.exhaust.every((n) => n >= 2), "every kart has its exhaust flames");
  assert(new Set(race.field).size >= 2, "the AI field rides assorted bodies");
  assert.equal(r.errors.length, 0, r.errors.join("; "));
});
