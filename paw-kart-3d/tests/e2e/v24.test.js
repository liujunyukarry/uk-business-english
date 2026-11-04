// v2.4 in the real page: the map panel in the top-right corner, the rear
// radar, the special's lock-on (and holding back a special that would be
// wasted), and the speed race with its nitro button.
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

// An iPhone 14 Pro Max, with its notch / home-indicator safe areas.
const PHONE = {
  portrait: { width: 430, height: 932, insets: { top: 59, right: 0, bottom: 34, left: 0 } },
  landscape: { width: 932, height: 430, insets: { top: 0, right: 59, bottom: 21, left: 59 } },
};
async function phoneRace(t, orient, save = {}) {
  const { width, height, insets } = PHONE[orient];
  const r = await openRace(browser, server.url, {
    width,
    height,
    init: new Function(`localStorage.setItem("paw-kart-v1", ${JSON.stringify(JSON.stringify(save))});`),
  });
  t.after(() => r.ctx.close());
  await r.cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
  await r.page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 30000 });
  // Quiet field: AI items off, everyone well behind unless a test moves them.
  await r.page.evaluate(() => {
    const race = window.__pk.race,
      p = race.player;
    race.racers.slice(1).forEach((x, i) => {
      x.distance = p.distance - 150 - i * 12;
      x.aiItem = x.aiNitro = 1e9;
      x.special = 0;
    });
  });
  return { ...r, insets, width, height };
}
const rect = (page, sel) =>
  page.$eval(sel, (el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
  });
const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

for (const orient of ["portrait", "landscape"]) {
  test(`map panel (${orient}): top-right corner, inside the safe area, clear of the buttons, never blocks steering`, async (t) => {
    const { page, finger, input, insets, width, height } = await phoneRace(t, orient);
    const map = await rect(page, "#mapbox");
    assert(map.right <= width - insets.right && map.right > width - insets.right - 40, `right edge ${map.right}`);
    assert(map.top >= insets.top && map.bottom < height * 0.5, `top ${map.top}..${map.bottom}`);
    for (const sel of ["#pause", "#item-button", "#special-button", "#drift-button", ".position", ".race-info"])
      assert(!overlaps(map, await rect(page, sel)), `map overlaps ${sel}`);
    // Sharp on a 3x screen: the canvas is backed at device resolution.
    const canvas = await page.$eval("#minimap", (c) => ({ w: c.width, css: c.getBoundingClientRect().width }));
    assert(canvas.w >= Math.round(canvas.css) - 1, `canvas ${canvas.w} for ${canvas.css} css px`);
    await page.waitForTimeout(250);
    assert.match(await page.$eval("#to-finish", (e) => e.textContent), /距终点 \d/);
    assert.equal(await page.$$eval("#progress .pk", (els) => els.length), 8, "a progress marker per racer");
    // The panel is see-through to touch: a thumb on it still steers right.
    await finger.down(1, { x: (map.left + map.right) / 2, y: (map.top + map.bottom) / 2 });
    await page.waitForTimeout(60);
    assert.equal((await input()).steer, 1);
    await finger.up(1);
  });
}

test("progress strip and distance to go follow the race", async (t) => {
  const { page } = await phoneRace(t, "portrait");
  const read = () =>
    page.evaluate(() => {
      // Where the marker is drawn along the strip (v2.6 moves it with a
      // transform every frame), in % of the strip.
      const bar = document.querySelector("#progress").getBoundingClientRect(),
        dot = document.querySelector("#progress .pk.me").getBoundingClientRect();
      return { me: ((dot.left + dot.width / 2 - bar.left) / bar.width) * 100, text: document.querySelector("#to-finish").textContent };
    });
  await page.evaluate(() => {
    const race = window.__pk.race;
    race.player.distance = race.track.length * 1.5; // halfway through the race
  });
  await page.waitForTimeout(300);
  const half = await read();
  assert(Math.abs(half.me - 50) < 2, `player marker at ${half.me}%`);
  const left = await page.evaluate(() => window.__pk.race.track.length * 1.5);
  const shown = half.text.includes("km") ? parseFloat(half.text.split(" ")[1]) * 1000 : parseFloat(half.text.split(" ")[1]);
  assert(Math.abs(shown - left) < 40, `"${half.text}" for ${Math.round(left)} m`);
});

test("rear radar: a kart closing from behind shows on its side, with its distance", async (t) => {
  const { page } = await phoneRace(t, "portrait");
  const place = (gap, lane) =>
    page.evaluate(
      ([gap, lane]) => {
        const race = window.__pk.race,
          p = race.player,
          o = race.racers[3];
        Object.assign(o, { distance: p.distance - gap, previous: p.distance - gap, lane: p.lane + lane, previousLane: p.lane + lane, speed: p.speed, aiTimer: 9, aiLane: p.lane + lane });
      },
      [gap, lane],
    );
  const chips = () =>
    page.$$eval("#radar b:not([hidden])", (els) =>
      els.map((b) => {
        // Where the chip is drawn across the radar, in % (v2.6 places it with
        // the translate property every frame).
        const r = b.parentElement.getBoundingClientRect(),
          c = b.getBoundingClientRect();
        return { text: b.textContent, left: ((c.left + c.width / 2 - r.left) / r.width) * 100, racer: Number(b.dataset.racer) };
      }),
    );
  await place(10, 4);
  await page.waitForTimeout(250);
  let c = await chips();
  assert.equal(c.length, 1, JSON.stringify(c));
  assert.equal(c[0].racer, 3);
  assert.match(c[0].text, /^\d+m$/);
  assert(c[0].left > 55, `right-hand side: ${c[0].left}%`);
  await place(10, -4);
  await page.waitForTimeout(250);
  c = await chips();
  assert(c[0].left < 45, `left-hand side: ${c[0].left}%`);
  await place(60, 0);
  await page.waitForTimeout(250);
  assert.equal((await chips()).length, 0, "nothing shown for a kart far behind");
});

test("special lock-on: Nova's targets are marked; with nobody ahead the special is held back", async (t) => {
  const { page, finger } = await phoneRace(t, "portrait", { character: "nova" });
  const ahead = (n) =>
    page.evaluate((n) => {
      const race = window.__pk.race,
        p = race.player;
      race.racers.slice(1).forEach((x, i) => {
        x.distance = i < n ? p.distance + 40 + i * 30 : p.distance - 150 - i * 12;
        x.previous = x.distance;
      });
      p.special = 100;
    }, n);
  const state = () =>
    page.evaluate(() => {
      const b = document.querySelector("#special-button");
      return {
        cls: b.className,
        lock: b.dataset.lock,
        name: document.querySelector("#special-name").textContent,
        marks: window.__pk.marks.filter((m) => m.visible).length,
        used: window.__pk.race.player.specialsUsed,
        toast: document.querySelector("#toast").textContent,
        tip: getComputedStyle(document.querySelector("#special-tip")).display,
      };
    });
  await ahead(2);
  await page.waitForTimeout(300);
  let s = await state();
  assert.match(s.cls, /ready/);
  assert.match(s.cls, /locked/);
  assert.equal(s.lock, "🎯 2");
  assert.equal(s.marks, 2, "a reticle over each target");
  assert.equal(s.name, "放必杀！");
  assert.notEqual(s.tip, "none", "first time: the coaching bubble points at the button");
  // Everyone behind: meteors would have nothing to hit.
  await ahead(0);
  await page.waitForTimeout(300);
  s = await state();
  assert.match(s.cls, /blocked/);
  assert.equal(s.name, "前方没人");
  assert.equal(s.marks, 0);
  await finger.down(8, "#special-button");
  await finger.up(8);
  await page.waitForTimeout(120);
  s = await state();
  assert.equal(s.used, 0, "not fired");
  assert.match(s.toast, /前方没有对手/);
  // Someone ahead again: it fires, and the meteors are on their way.
  await ahead(1);
  await page.waitForTimeout(300);
  await finger.down(8, "#special-button");
  await finger.up(8);
  await page.waitForTimeout(120);
  s = await state();
  assert.equal(s.used, 1);
  assert(await page.evaluate(() => window.__pk.race.meteors.length >= 1 || window.__pk.race.racers.some((x) => x.hits > 0)));
});

test("speed race: nitro button fires stored charges; no specials or coins; separate record", async (t) => {
  const { page, finger } = await phoneRace(t, "portrait", { mode: "speed" });
  const s = () =>
    page.evaluate(() => {
      const race = window.__pk.race,
        p = race.player;
      return {
        rules: race.rules,
        body: document.body.classList.contains("speed-race"),
        special: getComputedStyle(document.querySelector("#special-button")).display,
        coins: getComputedStyle(document.querySelector(".coins")).display,
        icon: document.querySelector("#item-icon").textContent,
        pips: document.querySelector("#item-key").textContent,
        charges: p.nitroCharges,
        used: p.nitroUsed,
        kind: p.boostKind,
        boost: p.boost,
        toast: document.querySelector("#toast").textContent,
        status: document.querySelector("#status-effect").textContent,
        boxes: race.boxes.length,
      };
    });
  let v = await s();
  assert.equal(v.rules, "speed");
  assert(v.body);
  assert.equal(v.special, "none");
  assert.equal(v.coins, "none");
  assert.equal(v.boxes, 0);
  assert.equal(v.icon, "N₂O");
  await page.evaluate(() => (window.__pk.race.player.nitroCharges = 2));
  await page.waitForTimeout(200);
  assert.equal((await s()).pips, "●●");
  await finger.down(9, "#item-button");
  await finger.up(9);
  await page.waitForTimeout(150);
  v = await s();
  assert.equal(v.charges, 1);
  assert.equal(v.used, 1);
  assert.equal(v.kind, "nitro");
  assert(v.boost > 1.5);
  assert.match(v.status, /氮气/);
  await finger.down(9, "#item-button");
  await finger.up(9);
  await page.waitForTimeout(100);
  await finger.down(9, "#item-button");
  await finger.up(9);
  await page.waitForTimeout(100);
  v = await s();
  assert.equal(v.used, 2, "only the two stored charges fire");
  assert.match(v.toast, /氮气还没攒满/);
  // Finish the race: results show nitro / slipstream, record kept apart.
  await page.evaluate(() => {
    const race = window.__pk.race,
      total = race.laps * race.track.length;
    race.racers.forEach((x, i) => {
      x.distance = x.previous = total - 2 - i * 0.5;
      x.aiNitro = 1e9;
    });
  });
  await page.waitForFunction(() => window.__pk.mode === "result", null, { timeout: 15000 });
  const result = await page.$eval("#dialog-content", (e) => e.textContent);
  assert.match(result, /竞速赛/);
  assert.match(result, /氮气 · 尾流/);
  const records = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("paw-kart-v1")).records));
  assert(records.some((k) => k.startsWith("speed-")), JSON.stringify(records));
  assert(!records.some((k) => /^\d/.test(k)), "no item-race record from a speed race");
  // Back home, the speed race is still the chosen mode.
  await page.click("#back-home");
  await page.waitForTimeout(200);
  assert.equal(await page.$eval('[data-mode="speed"]', (b) => b.getAttribute("aria-pressed")), "true");
  assert.match(await page.$eval("#start-copy", (e) => e.textContent), /竞速/);
  assert.match(await page.$eval("#record", (e) => e.textContent), /竞速最佳/);
});
