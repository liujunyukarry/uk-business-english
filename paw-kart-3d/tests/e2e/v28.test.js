// v2.8 in the real page: rules and format chosen apart (so a cup can be a
// speed cup), theme tabs and their tracks, three cups with trophies, the
// 大师 class, the snow and desert themes with their weather, and the kart
// series in the garage.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { launch, openRace, serve } from "./browser.js";

let server, browser, gl;
before(async () => {
  server = await serve();
  browser = await launch();
  gl = await launch({ webgl: true }); // SwiftShader: slow, so only the test that needs a GPU uses it
});
after(async () => {
  await browser?.close();
  await gl?.close();
  server?.close();
});
const racing = (page) => page.waitForFunction(() => window.__pk.race?.phase === "racing", null, { timeout: 300000 });
const saved = (o) => `localStorage.setItem("paw-kart-v1", JSON.stringify(${JSON.stringify(o)}))`;
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("paw-kart-v1")));
const text = (page, sel) => page.$eval(sel, (e) => e.textContent);
// Track cards on show, by id order.
const shown = (page) => page.$$eval("#tracks [data-track]:not(.hidden)", (els) => els.map((b) => Number(b.dataset.track)));
// Finish the race with the player in `rank`-th place.
const finishAs = async (page, rank) => {
  await page.evaluate((rank) => {
    const race = window.__pk.race,
      total = race.track.length * race.laps;
    race.racers.forEach((r, i) => {
      if (i) r.distance = r.previous = total - (i < rank ? 1 : 70 + i * 12);
    });
    const p = race.player;
    p.distance = p.previous = total - 22;
    p.speed = 30;
  }, rank);
  await page.waitForFunction(() => window.__pk.mode === "result", null, { timeout: 90000 });
};

test("garage: rules and theme tabs; a theme shows its tracks; the class list has 大师; an old save's mode carries over", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932, start: false });
  t.after(() => r.ctx.close());
  const { page } = r;
  assert.equal(await page.$eval('[data-rules="item"]', (b) => b.getAttribute("aria-pressed")), "true", "item rules by default");
  assert.deepEqual(await page.$$eval("#themes [role=tab]", (els) => els.map((b) => b.textContent)), ["🏆杯赛", "🌼花田", "🍑海湾", "✨星光", "❄️冰雪", "🌵沙漠"]);
  assert.equal(await page.$eval('[data-theme-tab="0"]', (b) => b.getAttribute("aria-selected")), "true");
  assert.deepEqual(await shown(page), [0], "花田 has one track");
  // Snow: two tracks; the tab picks the first.
  await page.tap('[data-theme-tab="3"]');
  assert.deepEqual(await shown(page), [4, 6]);
  assert.equal((await stored(page)).track, 4);
  assert.match(await text(page, "#start-copy"), /出发 · 雪绒花滑道/);
  assert.match(await text(page, '[data-track="6"]'), /冰晶峡谷.*大师杯 · 清晨/);
  await page.tap('[data-track="6"]');
  assert.equal(await page.$eval('[data-track="6"]', (b) => b.getAttribute("aria-pressed")), "true");
  // Back on the theme it is already on: the chosen track is kept.
  await page.tap('[data-theme-tab="3"]');
  assert.equal((await stored(page)).track, 6);
  await page.tap('[data-rules="speed"]');
  assert.match(await text(page, "#start-copy"), /竞速 · 冰晶峡谷/);
  // Four classes.
  assert.deepEqual(await page.$$eval("#difficulty option", (els) => els.map((o) => o.value)), ["easy", "normal", "hard", "master"]);
  await page.selectOption("#difficulty", "master");
  assert.equal((await stored(page)).difficulty, "master");
  // Every tab and card is a full-size touch target, inside the panel.
  const targets = await page.$$eval("#themes button, #tracks [data-track]:not(.hidden), [data-rules]", (els) =>
    els.map((b) => {
      const q = b.getBoundingClientRect();
      return { h: Math.round(q.height), w: Math.round(q.width) };
    }),
  );
  assert(targets.every((q) => q.h >= 32 && q.w >= 40), JSON.stringify(targets));
  // The race: speed rules, 大师, the snow track.
  await page.tap("#start");
  await racing(page);
  const race = await page.evaluate(() => ({ rules: window.__pk.race.rules, difficulty: window.__pk.race.difficulty, track: window.__pk.race.track.index, atmos: window.__pk.world.atmos.name, pads: window.__pk.race.pads.length }));
  assert.deepEqual(race, { rules: "speed", difficulty: "master", track: 6, atmos: "snow", pads: 3 });
  assert.equal(await text(page, "#cup-progress"), "SPEED RACE · 大师");
  assert.deepEqual(r.errors, []);

  // A v2.7 save: "mode" was one of single / speed / cup.
  for (const [mode, rules, format] of [
    ["speed", "speed", "single"],
    ["cup", "item", "cup"],
  ]) {
    const old = await openRace(browser, server.url, { width: 430, height: 932, start: false, init: saved({ mode, track: 2, difficulty: "hard" }) });
    t.after(() => old.ctx.close());
    const s = await stored(old.page);
    assert.deepEqual([s.rules, s.format, s.track, s.difficulty, "mode" in s], [rules, format, 2, "hard", false], "from mode " + mode);
    assert.equal(await old.page.$eval('[data-rules="' + rules + '"]', (b) => b.getAttribute("aria-pressed")), "true");
    assert.equal(await old.page.$eval("[data-format]", (b) => b.getAttribute("aria-selected")), String(format === "cup"));
    if (format === "single") assert.deepEqual(await shown(old.page), [2, 8], "星光's two tracks");
    assert.deepEqual(old.errors, []);
    await old.ctx.close();
  }
});

test("a speed cup: three races of the 冒险杯 under speed rules, points add up, and first place wins the gold trophy", { timeout: 300000 }, async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932, start: false, init: saved({ rules: "speed", format: "cup", cup: 0, difficulty: "hard" }) });
  t.after(() => r.ctx.close());
  const { page } = r;
  assert.equal(await page.$eval("[data-format]", (b) => b.getAttribute("aria-selected")), "true");
  assert.equal(await page.$eval("#tracks", (e) => e.classList.contains("hidden")), true, "cups instead of tracks");
  assert.deepEqual(await page.$$eval("#cups [data-cup] b", (els) => els.map((b) => b.textContent)), ["晴空杯", "冒险杯", "大师杯"]);
  await page.tap('[data-cup="1"]');
  assert.equal((await stored(page)).cup, 1);
  assert.match(await text(page, "#toast"), /冒险杯：棉花糖码头 → 雪绒花滑道 → 金沙绿洲/);
  assert.match(await text(page, "#start-copy"), /竞速 · 冒险杯 · 三站/);
  assert.match(await text(page, "#record"), /棉花糖码头 · 雪绒花滑道 · 金沙绿洲/);
  await page.tap("#start");
  const rounds = [
    [3, 1, "雪绒花滑道"],
    [4, 2, "金沙绿洲"],
    [5, 1, null],
  ];
  for (const [n, [track, rank, next]] of rounds.entries()) {
    await racing(page);
    const at = await page.evaluate(() => ({ track: window.__pk.race.track.index, rules: window.__pk.race.rules }));
    assert.deepEqual(at, { track, rules: "speed" }, "race " + (n + 1));
    assert.equal(await text(page, "#cup-progress"), "冒险杯 · 第 " + (n + 1) + " / 3 站 · 150cc");
    await finishAs(page, rank);
    if (next) {
      assert.match(await text(page, ".cup-summary"), new RegExp("你的杯赛积分：\\d+ 分 · 下一站 " + next));
      assert.match(await text(page, "#next-race"), /下一站/);
      await page.tap("#next-race");
    }
  }
  // 15 + 12 + 15 points: first overall.
  assert.match(await text(page, ".result-top h2"), /冒险杯 · 总第 1 名/);
  assert.match(await text(page, ".result-top .dialog-eyebrow"), /ADVENTURE CUP · FINAL RESULTS/);
  assert.match(await text(page, ".trophy-won"), /🥇 获得冒险杯金杯！150cc · 竞速/);
  assert.match(await text(page, ".result-table tr.me"), /42 分/);
  const s = await stored(page);
  assert.equal(s.cups["adventure-speed-hard"], 1, "the trophy is saved by cup, rules and class");
  assert(Object.keys(s.records).some((k) => k === "speed-5-hard"), "and each race keeps its own best time: " + Object.keys(s.records));
  // The garage shows it; the item cup and other classes have none yet.
  await page.tap("#back-home");
  assert.equal(await text(page, '[data-cup="1"] .trophy'), "🥇");
  assert.equal(await text(page, '[data-cup="0"] .trophy'), "");
  assert.match(await text(page, "#record"), /最好成绩 🥇 第 1 名 · 150cc 竞速/);
  await page.tap('[data-rules="item"]');
  assert.equal(await text(page, '[data-cup="1"] .trophy'), "", "no trophy for the item cup");
  assert.deepEqual(r.errors, []);
});

test("kart series: thirteen karts in five series in the garage; a new one is chosen, remembered and raced", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932, start: false });
  t.after(() => r.ctx.close());
  const { page } = r;
  await page.tap('[data-tab="karts"]');
  const row = await page.$$eval("#karts > *", (els) => els.map((e) => (e.classList.contains("series-label") ? "#" + e.querySelector("b").textContent : e.dataset.kart)));
  assert.deepEqual(row, ["#经典", "classic", "#闪电", "thunder", "thunder2", "thunder3", "#火箭", "jet", "jet2", "jet3", "#幻影", "phantom", "phantom2", "phantom3", "#棉花糖", "puff", "puff2", "puff3"]);
  const thumbs = await page.$$eval("#karts [data-kart] img", (els) => els.map((i) => i.src.slice(0, 22) + i.src.length));
  assert(thumbs.every((s) => s.startsWith("data:image/png;base64,")), "every kart has a rendered thumbnail");
  assert(new Set(thumbs).size >= 12, "and the liveries differ in their pictures");
  // The row scrolls sideways to the last series.
  await page.$eval('[data-kart="puff2"]', (b) => b.scrollIntoView({ inline: "center", block: "nearest" }));
  await page.tap('[data-kart="puff2"]');
  assert.equal((await stored(page)).kart, "puff2");
  assert.match(await text(page, "#driver-tag"), /棉花糖·薄荷/);
  await page.waitForFunction(() => /变形/.test(document.querySelector("#toast").textContent), null, { timeout: 5000 });
  assert.match(await text(page, "#toast"), /棉花糖云朵鼓起/);
  assert.match(await page.$eval('[data-kart="thunder2"]', (b) => b.getAttribute("aria-label")), /闪电 GT·黑金，极速最高/);
  await page.tap("#start");
  await racing(page);
  const race = await page.evaluate(() => {
    const { race, cars } = window.__pk;
    return { kart: race.player.kart, body: cars[0].userData.bodyId, parts: cars[0].userData.rig.parts.length, spin: cars[0].userData.rig.spin.length, ai: race.racers.slice(1).map((x) => x.kart), boost: race.player.boostScale };
  });
  assert.equal(race.kart, "puff2");
  assert.equal(race.body, "puff2");
  assert(race.parts === 4 && race.spin === 1, "two clouds, two rockets and the lollipop swirl");
  assert.equal(race.boost, 1);
  assert(race.ai.every((k) => typeof k === "string" && k.length), "AI drivers ride karts from the list");
  // A boost transforms it without errors.
  await page.evaluate(() => window.__pk.race.startBoost(window.__pk.race.player, 2, "item", 6));
  await page.waitForFunction(() => window.__pk.cars[0].userData.vis.morph > 0.5, null, { timeout: 10000 });
  assert.deepEqual(r.errors, []);
});

test("every track starts and runs in its theme; themes pick the music", { timeout: 300000 }, async (t) => {
  const r = await openRace(browser, server.url, { width: 844, height: 390, start: false });
  t.after(() => r.ctx.close());
  const { page } = r,
    want = ["noon", "sunset", "night", "sunset", "snow", "desert", "snow", "desert", "night"];
  for (let i = 0; i < 9; i++) {
    await page.evaluate((i) => window.__pk.startRace(i), i);
    await racing(page);
    const s = await page.evaluate(
      () =>
        new Promise((done) => {
          const { race, world } = window.__pk,
            from = race.player.distance;
          setTimeout(() => done({ atmos: world.atmos.name, moved: race.player.distance - from, title: document.querySelector("#track-title").textContent, name: race.track.config.name }), 700);
        }),
    );
    assert.equal(s.atmos, want[i], s.name);
    assert.equal(s.title, s.name);
    assert(s.moved > 3, s.name + " is being driven: " + s.moved.toFixed(1) + " m");
  }
  assert.deepEqual(r.errors, []);
});

test("snow and desert (WebGL): the picture is drawn, snow falls and sand blows, the marshmallow kart is in it", { timeout: 900000 }, async (t) => {
  const lit = (page) =>
    page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => {
            const g = document.querySelector("#scene").getContext("webgl2"),
              px = new Uint8Array(4);
            let sum = 0;
            for (const [x, y] of [[0.5, 0.5], [0.2, 0.8], [0.8, 0.8], [0.3, 0.3], [0.7, 0.3], [0.5, 0.1]]) {
              g.readPixels(Math.floor(g.drawingBufferWidth * x), Math.floor(g.drawingBufferHeight * y), 1, 1, g.RGBA, g.UNSIGNED_BYTE, px);
              sum += px[0] + px[1] + px[2];
            }
            done(sum);
          }),
        ),
    );
  for (const [track, atmos] of [
    [4, "snow"],
    [5, "desert"],
  ]) {
    const r = await openRace(gl, server.url, { width: 360, height: 640, slow: true, init: saved({ track, kart: "puff" }) });
    await racing(r.page);
    const s = await r.page.evaluate(() => {
      const { world, cars, renderer } = window.__pk,
        air = world.moving.find((o) => o.type === "weather");
      return { atmos: world.atmos.name, weather: !!air, points: air?.mesh.isPoints, flakes: air?.mesh.geometry.attributes.seed.count, time: air?.mesh.material.uniforms.time.value, scale: air?.mesh.material.uniforms.scale.value, body: cars[0].userData.bodyId, fx: document.documentElement.dataset.fx };
    });
    assert.equal(s.atmos, atmos);
    assert(s.weather && s.points && s.flakes > 300, "weather is in the world: " + JSON.stringify(s));
    assert(s.time > 0 && s.scale > 100, "and it is being moved each frame");
    assert.equal(s.body, "puff");
    assert.equal(s.fx, "on");
    assert((await lit(r.page)) > 400, atmos + " is drawn");
    // Leaving frees the weather with the rest of the track.
    const freed = await r.page.evaluate(() => {
      const before = window.__pk.diag.freed;
      window.__pk.goHome();
      return window.__pk.diag.freed - before;
    });
    assert(freed > 20, "the track was freed: " + freed);
    assert.deepEqual(r.errors, []);
    await r.ctx.close();
  }
});
