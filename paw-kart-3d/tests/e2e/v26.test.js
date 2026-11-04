// v2.6 in the real page: 必杀无敌 when a special fires, karts that bounce
// off the rails, the HUD gauges moving every frame, and the garage showing a
// body's boost transformation (变形).
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
const racing = (page) => page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 30000 });
// Every toast shown from now on (another one, such as an overtake, can
// replace a toast within the same frame).
const watchToasts = (page) =>
  page.evaluate(() => {
    window.__toasts = [];
    const el = document.querySelector("#toast");
    // (Read the added text from each record: by the time the observer runs,
    // a later toast in the same frame may already have replaced it.)
    new MutationObserver((records) =>
      records.forEach((m) => m.addedNodes.forEach((n) => n.textContent && window.__toasts.push(n.textContent))),
    ).observe(el, { childList: true });
  });
const toasted = (page, re) => page.waitForFunction((src) => window.__toasts.some((t) => new RegExp(src).test(t)), re.source, { timeout: 5000 });

test("必杀无敌: firing the special shows its countdown, and an attack bounces off with a toast", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  await r.page.evaluate(() => (window.__pk.race.player.special = 100));
  await r.page.waitForFunction(() => document.querySelector("#special-button").classList.contains("ready"), null, { timeout: 10000 });
  await r.finger.down(8, "#special-button");
  await r.finger.up(8);
  await r.page.waitForFunction(() => window.__pk.race.player.guard > 0, null, { timeout: 5000 });
  await r.page.waitForTimeout(250);
  const status = await r.page.$eval("#status-effect", (e) => e.textContent);
  assert.match(status, /必杀无敌 \d\.\ds/);
  assert.match(await r.page.$eval("#cutin", (e) => e.textContent), /无敌 3\.6 秒/, "the cut-in says so");
  const before = await r.page.evaluate(() => window.__pk.race.player.hits);
  await watchToasts(r.page);
  // The hit lands inside a physics step, as a real one would (events raised
  // between steps are cleared by the next step).
  await r.page.evaluate(() => {
    const race = window.__pk.race,
      step = race.step.bind(race);
    let once = true;
    race.step = (dt, input) => {
      step(dt, input);
      if (once) race.hit(race.player, 1);
      once = false;
    };
  });
  await toasted(r.page, /攻击无效/);
  assert.equal(await r.page.evaluate(() => window.__pk.race.player.hits), before, "not hit");
  assert.deepEqual(r.errors, []);
});

test("rails: a kart steered into the rail bounces back off it and the player is told", async (t) => {
  const r = await openRace(browser, server.url, { width: 844, height: 390 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  await watchToasts(r.page);
  await r.page.evaluate(() => {
    const race = window.__pk.race,
      p = race.player;
    race.racers.slice(1).forEach((x, i) => (x.distance = x.previous = p.distance - 200 - i * 10));
    p.lane = p.previousLane = race.track.width / 2 + 0.9;
    p.lateral = 9;
    p.speed = 34;
  });
  await r.page.waitForFunction(() => window.__pk.race.player.walls > 0, null, { timeout: 5000 });
  const at = await r.page.evaluate(() => ({ lane: window.__pk.race.player.lane, rebound: window.__pk.race.player.rebound }));
  await r.page.waitForFunction((lane) => window.__pk.race.player.lane < lane - 0.3, at.lane, { timeout: 5000 });
  await toasted(r.page, /护栏|撞墙/);
  assert.deepEqual(r.errors, []);
});

test("HUD: the drift meter and the progress markers move every frame, not ten times a second", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  // Read the drawn drift fill and the player's progress marker on each of
  // several consecutive frames while the charge and distance keep changing.
  const samples = await r.page.evaluate(
    () =>
      new Promise((done) => {
        const race = window.__pk.race,
          p = race.player,
          out = [];
        race.track.curvature = () => -0.02; // a steady bend into the drift
        p.drifting = true;
        p.driftDirection = 1;
        p.drift = 0.2;
        const tick = () => {
          p.drifting = true;
          p.drift = Math.min(1.9, p.drift + 0.05);
          out.push({
            fill: getComputedStyle(document.querySelector("#drift-fill")).transform,
            dot: document.querySelector("#progress .pk.me").style.transform,
          });
          if (out.length < 6) requestAnimationFrame(tick);
          else done(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  const fills = new Set(samples.slice(1).map((s) => s.fill));
  assert(fills.size >= 4, "drift fill changed on (nearly) every frame: " + JSON.stringify(samples.map((s) => s.fill)));
  assert(samples.every((s) => /translate3d/.test(s.dot)), "progress markers are moved with transforms");
  assert.deepEqual(r.errors, []);
});

test("garage: picking a body plays its boost transformation and says what it does", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932, start: false });
  t.after(() => r.ctx.close());
  await r.page.tap('[data-tab="karts"]');
  await r.page.tap('[data-kart="jet"]');
  await r.page.waitForFunction(() => /变形/.test(document.querySelector("#toast").textContent), null, { timeout: 5000 });
  assert.match(await r.page.$eval("#toast", (e) => e.textContent), /后掠翼/);
  const label = await r.page.$eval('[data-kart="phantom"]', (b) => b.getAttribute("aria-label"));
  assert.match(label, /加速变形：车轮收起变悬浮/);
  assert.deepEqual(r.errors, []);
});
