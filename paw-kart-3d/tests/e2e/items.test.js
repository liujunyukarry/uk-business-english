// Each of the six items used through the real item button (touch), checking
// the feedback the player sees: slot, status line, toast, flames, flash.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { launch, openRace, serve } from "./browser.js";

let server, browser, r;
before(async () => {
  server = await serve();
  browser = await launch();
  r = await openRace(browser, server.url);
  await r.page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 30000 });
});
after(async () => {
  await r?.ctx.close();
  await browser?.close();
  server?.close();
});

// Clear the road, hand the player an item, and tap the item slot.
async function useItem(item, setup = () => {}) {
  await r.page.evaluate(
    ([item, setup]) => {
      const race = window.__pk.race,
        p = race.player;
      race.hazards.length = race.projectiles.length = 0;
      race.boxes.forEach((b) => (b.cooldown = 99)); // no surprise pickups mid-test
      race.racers.slice(1).forEach((x, i) => {
        x.distance = p.distance - 300 - i * 20;
        x.item = null;
        x.aiItem = 1e9;
        x.small = x.stun = x.invincible = x.shield = x.star = 0;
      });
      p.item = item;
      p.roulette = 0;
      p.invincible = p.stun = p.small = 0;
      new Function("race", "p", setup)(race, p);
    },
    [item, `(${setup.toString()})(race, p)`],
  );
  await r.page.waitForTimeout(200); // HUD refresh shows the item
  const slot = await r.page.$eval("#item-name", (e) => e.textContent);
  await r.finger.down(9, "#item-button");
  await r.finger.up(9);
  return slot;
}
const state = () =>
  r.page.evaluate(() => {
    const race = window.__pk.race,
      p = race.player;
    return {
      item: p.item,
      used: p.itemsUsed,
      status: document.querySelector("#status-effect").textContent,
      toast: document.querySelector("#toast").textContent,
      flash: document.querySelector("#flash")?.classList.contains("on"),
      nitro: window.__pk.cars[0].userData.vis.nitro,
      others: race.racers.slice(1).map((x) => ({ hits: x.hits, small: x.small })),
    };
  });

test("mushroom: slot shows it, tap uses it once, flames and boost status appear", async () => {
  const before = (await state()).used,
    slot = await useItem("boost");
  assert.match(slot, /冲刺蘑菇/);
  await r.page.waitForTimeout(400);
  const s = await state();
  assert.equal(s.item, null, "slot emptied");
  assert.equal(s.used, before + 1, "used exactly once");
  assert.match(s.status, /冲刺/);
  assert(s.nitro > 0.5, `flames at ${s.nitro}`);
});

test("homing shell: hits the kart ahead and the player is told", async () => {
  await useItem("shell", (race, p) => {
    const o = race.racers[1];
    o.distance = p.distance + 45;
    o.lane = p.lane;
  });
  await r.page.waitForFunction(() => window.__pk.race.racers[1].hits > 0, null, { timeout: 5000 });
  await r.page.waitForTimeout(150);
  assert.match((await state()).toast, /命中/);
});

test("banana: dropped behind; a kart running into it is knocked and it bursts", async () => {
  await useItem("banana");
  await r.page.waitForTimeout(100);
  const dropped = await r.page.evaluate(() => {
    const race = window.__pk.race,
      p = race.player,
      h = race.hazards[0],
      o = race.racers[2];
    if (!h) return false;
    // A kart 10 m behind the banana, in its lane, told not to dodge: this
    // checks the hit and its feedback, not the AI's avoidance.
    o.distance = h.distance - 10;
    o.previous = o.distance;
    o.lane = o.previousLane = o.aiLane = h.lane;
    o.speed = 32;
    o.dodgeId = h.id;
    o.dodgeSide = 0;
    o.aiTimer = 10;
    p.distance = Math.max(p.distance, h.distance + 40); // not in the way
    return h.distance < p.distance;
  });
  assert(dropped, "banana is on the track behind the player");
  await r.page.waitForFunction(() => window.__pk.race.racers[2].hits > 0, null, { timeout: 5000 });
  await r.page.waitForTimeout(150);
  assert.match((await state()).toast, /命中/);
});

test("shield: status shows the shield and its time", async () => {
  await useItem("shield");
  await r.page.waitForTimeout(250);
  assert.match((await state()).status, /护盾/);
});

test("star: invincibility status and flames", async () => {
  await useItem("star");
  await r.page.waitForTimeout(400);
  const s = await state();
  assert.match(s.status, /无敌/);
  assert(s.nitro > 0.5);
});

test("lightning: screen flash, karts ahead shrink, player unaffected", async () => {
  await useItem("bolt", (race, p) => {
    const o = race.racers[3];
    o.distance = p.distance + 30;
    o.lane = p.lane + 3;
  });
  await r.page.waitForTimeout(120);
  const s = await state();
  assert.equal(s.flash, true, "flash shown");
  assert(s.others[2].small > 0, "kart ahead shrinks");
  const p = await r.page.evaluate(() => window.__pk.race.player.small);
  assert.equal(p, 0);
});

test("rocket: banner, status line and big flames", async () => {
  const slot = await useItem("rocket");
  assert.match(slot, /火箭冲刺/);
  await r.page.waitForTimeout(400);
  const s = await state();
  assert.match(s.status, /火箭/);
  assert(s.nitro > 0.5, `flames at ${s.nitro}`);
  assert.match(await r.page.$eval("#banner", (e) => e.textContent), /火箭冲刺/);
  await r.page.evaluate(() => (window.__pk.race.player.rocket = 0.01)); // end it for the next test
  await r.page.waitForTimeout(300);
});

test("two slots: the queued item shows as a badge and moves up after use", async () => {
  await r.page.evaluate(() => {
    const race = window.__pk.race,
      p = race.player;
    race.boxes.forEach((b) => (b.cooldown = 99));
    Object.assign(p, { item: "boost", item2: "shield", roulette: 0, roulette2: 0 });
  });
  await r.page.waitForTimeout(200);
  assert.equal(await r.page.$eval("#item-next", (e) => e.textContent), "🫧");
  await r.finger.down(9, "#item-button");
  await r.finger.up(9);
  await r.page.waitForTimeout(200);
  assert.match(await r.page.$eval("#item-name", (e) => e.textContent), /泡泡护盾/);
  assert.equal(await r.page.$eval("#item-next", (e) => e.textContent), "");
  await r.page.evaluate(() => (window.__pk.race.player.item = null));
});

test("special: the button shows the gauge and fires only when full, with a cut-in", async () => {
  const player = () =>
    r.page.evaluate(() => {
      const p = window.__pk.race.player;
      return { used: p.specialsUsed, gauge: p.special };
    });
  await r.page.evaluate(() => (window.__pk.race.player.special = 40));
  await r.page.waitForTimeout(200);
  assert.match(await r.page.$eval("#special-name", (e) => e.textContent), /4\d%/);
  await r.finger.down(8, "#special-button");
  await r.finger.up(8);
  await r.page.waitForTimeout(100);
  assert.equal((await player()).used, 0, "not before the gauge is full");
  await r.page.evaluate(() => (window.__pk.race.player.special = 100));
  await r.page.waitForTimeout(200);
  assert(await r.page.$eval("#special-button", (e) => e.classList.contains("ready")), "glows when ready");
  await r.finger.down(8, "#special-button");
  await r.finger.up(8);
  await r.page.waitForTimeout(150);
  const s = await player();
  assert.equal(s.used, 1);
  assert(s.gauge < 5, "gauge emptied");
  assert.match(await r.page.$eval("#cutin", (e) => e.textContent), /元气三连冲/);
});

test("empty slot: tapping tells the player how to get an item", async () => {
  await r.page.evaluate(() => {
    const race = window.__pk.race,
      p = race.player;
    race.boxes.forEach((b) => (b.cooldown = 99));
    p.item = null;
    p.roulette = 0;
  });
  await r.finger.down(9, "#item-button");
  await r.finger.up(9);
  await r.page.waitForTimeout(100);
  assert.match((await state()).toast, /问号箱/);
});
