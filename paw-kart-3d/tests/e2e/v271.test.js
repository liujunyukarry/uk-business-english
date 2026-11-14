// v2.7.1 in the real page: what made v2.7 freeze and stutter on a phone,
// and the guards added around it. Races left behind their track (and every
// new AI kart combination stayed cached), the post chain and the shadows
// were switched in the middle of a race (every shader recompiled in one
// frame), and an error in a frame or a lost GPU context left a frozen
// picture with nothing said.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { launch, openRace, serve } from "./browser.js";

let server, browser, gl;
before(async () => {
  server = await serve();
  browser = await launch();
  gl = await launch({ webgl: true }); // SwiftShader: slow, so only the tests that need a GPU use it
});
after(async () => {
  await browser?.close();
  await gl?.close();
  server?.close();
});
const racing = (page) => page.waitForFunction(() => window.__pk.race?.phase === "racing", null, { timeout: 300000 });
const saved = (o) => `localStorage.setItem("paw-kart-v1", JSON.stringify(${JSON.stringify(o)}))`;
const frames = (page, n) =>
  page.evaluate(
    (n) =>
      new Promise((done) => {
        let k = 0;
        const f = () => (++k >= n ? done() : requestAnimationFrame(f));
        requestAnimationFrame(f);
      }),
    n,
  );
const fx = (page) => page.evaluate(() => document.documentElement.dataset.fx);
const crashMark = (page) => page.evaluate(() => localStorage.getItem("paw-kart-crash"));
// The sum of a few pixels of the frame on screen (WebGL pages).
const lit = (page) =>
  page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => {
          const c = document.querySelector("#scene"),
            g = c.getContext("webgl2"),
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

test("leaving a race frees its track and props; the kart cache keeps at most 12 karts, and the last race's", async (t) => {
  const r = await openRace(browser, server.url, { width: 390, height: 844, start: false });
  t.after(() => r.ctx.close());
  // Mark what gets freed.
  await r.page.evaluate(() => {
    const { T } = window.__pk;
    for (const C of [T.BufferGeometry, T.Texture]) {
      const free = C.prototype.dispose;
      C.prototype.dispose = function () {
        this.__gone = true;
        return free.call(this);
      };
    }
  });
  for (let n = 0; n < 5; n++) {
    // AI drivers ride a random body in every race: new kart combinations.
    await r.page.evaluate((n) => window.__pk.startRace(n % 3), n);
    await frames(r.page, 3);
    const state = await r.page.evaluate(() => {
      const pk = window.__pk,
        old = { world: pk.world.group, props: pk.raceGroup, cars: [...pk.cars] };
      pk.goHome();
      // What the garage draws with now (may share a resource with the track).
      const inUse = new Set();
      pk.scene.traverse((o) => o.geometry && inUse.add(o.geometry));
      const kartParts = new Set();
      old.cars.forEach((k) => k.traverse((o) => kartParts.add(o)));
      const left = [];
      for (const root of [old.world, old.props])
        root.traverse((o) => {
          const g = o.geometry;
          if (!g || kartParts.has(o) || g.__gone || inUse.has(g) || g.userData.shared || g.userData.cached) return;
          left.push(g.type);
        });
      const cached = [...pk.kartCache.values()];
      return { left, cache: cached.length, kept: old.cars.every((k) => cached.includes(k)), freed: pk.diag.freed };
    });
    assert.deepEqual(state.left, [], "race " + (n + 1) + ": every geometry of the track and the props was freed");
    assert(state.cache <= 12, "race " + (n + 1) + ": " + state.cache + " karts cached");
    assert(state.kept, "the karts of the race just run stay cached");
    assert(state.freed > 0);
  }
  // The garage and another race still work.
  await r.page.tap("#start");
  await racing(r.page);
  assert.deepEqual(r.errors, []);
});

test("an error in a frame is caught and counted and the game carries on; frames failing in a row offer a reload", async (t) => {
  const r = await openRace(browser, server.url, { width: 390, height: 844 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  const before = await r.page.evaluate(() => window.__pk.clock);
  await r.page.evaluate(() => {
    const rd = window.__pk.renderer,
      render = rd.render;
    window.__restore = () => (rd.render = render);
    let once = 1;
    rd.render = function (...a) {
      if (once-- > 0) throw new Error("test: one bad frame");
      return render.apply(this, a);
    };
  });
  await frames(r.page, 12);
  const one = await r.page.evaluate(() => ({ errors: window.__pk.diag.errors, last: window.__pk.diag.lastError, clock: window.__pk.clock, mode: window.__pk.mode }));
  assert.equal(one.errors, 1, "counted");
  assert.equal(one.last, "test: one bad frame");
  assert(one.clock > before, "the game kept running");
  assert.equal(one.mode, "race", "and the race goes on");
  assert.equal(await r.page.$("#reload"), null, "no dialog for one bad frame");
  // Every frame failing: within a couple of seconds the race pauses and a
  // reload is offered instead of a frozen picture.
  await r.page.evaluate(() => {
    window.__pk.renderer.render = () => {
      throw new Error("test: every frame");
    };
  });
  await r.page.waitForSelector("#reload", { timeout: 30000 });
  assert.equal(await r.page.evaluate(() => window.__pk.mode), "paused");
  await r.page.evaluate(() => window.__restore());
  assert.deepEqual(r.errors, [], "nothing escaped to the page");
});

test("crash guard: after a session that died mid-race, the post chain starts off and the player is told; turning it on again clears that", async (t) => {
  const r = await openRace(browser, server.url, { width: 390, height: 844, start: false, init: `localStorage.setItem("paw-kart-crash", "1")` });
  t.after(() => r.ctx.close());
  const state = await r.page.evaluate(() => ({ guard: window.__pk.diag.crashGuard, fxAuto: window.__pk.fxAuto, fxNext: window.__pk.fxNext, toast: document.querySelector("#toast").textContent }));
  assert.equal(state.guard, true);
  assert.equal(state.fxAuto, false, "the chain starts off");
  assert.equal(state.fxNext, false);
  assert.match(state.toast, /上次比赛时画面意外中断.*画面特效/);
  // The player turns it back on in settings: the guard is cleared.
  await r.page.tap("#settings");
  await r.page.tap("#setting-fx"); // off
  await r.page.tap("#setting-fx"); // on again
  const after = await r.page.evaluate(() => ({ guard: window.__pk.diag.crashGuard, fxAuto: window.__pk.fxAuto, saved: JSON.parse(localStorage.getItem("paw-kart-v1")).fx }));
  assert.deepEqual(after, { guard: false, fxAuto: true, saved: true });
  assert.deepEqual(r.errors, []);
});

test("diagnostics: settings → 运行诊断 shows the build, the renderer, frame times, resources and errors", async (t) => {
  const r = await openRace(browser, server.url, { width: 390, height: 844 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  await frames(r.page, 30);
  await r.page.tap("#pause");
  await r.page.tap("#race-settings");
  await r.page.tap("#diag summary");
  const text = await r.page.$eval("#diag-text", (e) => e.textContent);
  for (const line of [/^版本 2\.\d+(\.\d+)? · \w+/m, /^渲染：兼容模式/m, /^屏幕：390×844/m, /^画面特效：不支持/m, /^帧率：.* · 比赛中最慢一帧 \d+ ms/m, /^画面中断：0 次/m, /^资源：.*车辆缓存 \d+/m, /^错误：0$/m])
    assert.match(text, line);
  const box = await r.page.$eval("#diag summary", (e) => {
    const b = e.getBoundingClientRect(),
      d = document.querySelector("#dialog").getBoundingClientRect();
    return { h: b.height, inside: b.left >= d.left && b.right <= d.right };
  });
  assert(box.h >= 44, "a full-size touch target: " + box.h);
  assert(box.inside);
  assert.equal(await r.page.$eval("#diag-text", (e) => getComputedStyle(e).userSelect), "text", "the text can be selected");
  assert.deepEqual(r.errors, []);
});

test("slow frames mid-race (WebGL): the post chain and shadows are booked off for the next scene; nothing is recompiled mid-race", { timeout: 900000 }, async (t) => {
  const r = await openRace(gl, server.url, { width: 360, height: 640, slow: true, init: saved({ mode: "speed", track: 1 }) });
  t.after(() => r.ctx.close());
  await racing(r.page);
  assert.equal(await fx(r.page), "on");
  assert.equal(await crashMark(r.page), "1", "marked while racing with the chain on");
  const programs = () => r.page.evaluate(() => window.__pk.renderer.info.programs.length);
  const p0 = await programs();
  // Frames dropping at the lowest resolution the chain allows (what
  // adaptScale and the 26 fps check call).
  await r.page.evaluate(() => window.__pk.lighten());
  await frames(r.page, 3);
  const mid = await r.page.evaluate(() => ({ fxAuto: window.__pk.fxAuto, fxNext: window.__pk.fxNext, scale: window.__pk.renderScale, deferred: window.__pk.diag.deferred }));
  assert.deepEqual(mid, { fxAuto: true, fxNext: false, scale: 1, deferred: 1 });
  assert.equal(await fx(r.page), "on", "the chain stays for the rest of this race");
  assert.equal(await programs(), p0, "no shader was compiled mid-race (v2.7 recompiled every one here)");
  // Still too slow: the shadows are booked off too, and also stay for now.
  await r.page.evaluate(() => window.__pk.lighten());
  const low = await r.page.evaluate(() => ({ next: window.__pk.lowNext, now: window.__pk.adaptiveLow, shadows: window.__pk.renderer.shadowMap.enabled }));
  assert.deepEqual(low, { next: true, now: false, shadows: true });
  await frames(r.page, 2);
  assert.equal(await programs(), p0);
  // Back in the garage both apply.
  await r.page.evaluate(() => window.__pk.goHome());
  await frames(r.page, 2);
  assert.equal(await fx(r.page), "off");
  assert.equal(await r.page.evaluate(() => window.__pk.renderer.shadowMap.enabled), false);
  assert.equal(await crashMark(r.page), null, "the mark is cleared on leaving the race");
  assert((await lit(r.page)) > 200, "the garage is drawn");
  // The next race compiles in its countdown and then stays steady.
  await r.page.tap("#start");
  await racing(r.page);
  const a = await programs();
  await frames(r.page, 4);
  assert.equal(await programs(), a, "no shader compiled once racing");
  assert((await lit(r.page)) > 200, "the race is drawn");
  assert.equal(await crashMark(r.page), null, "no mark without the chain");
  assert.deepEqual(r.errors, []);
});

test("a lost GPU context (WebGL): the race pauses, a reload is offered if it does not come back, and it comes back drawn without the post chain", { timeout: 900000 }, async (t) => {
  const r = await openRace(gl, server.url, { width: 360, height: 640, slow: true });
  t.after(() => r.ctx.close());
  await racing(r.page);
  assert.equal(await fx(r.page), "on");
  await r.page.evaluate(() => {
    window.__lose = window.__pk.renderer.getContext().getExtension("WEBGL_lose_context");
    window.__lose.loseContext();
  });
  await r.page.waitForFunction(() => window.__pk.diag.lost === 1);
  assert.equal(await r.page.evaluate(() => window.__pk.mode), "paused");
  assert.match(await r.page.$eval("#toast", (e) => e.textContent), /画面连接暂时中断/);
  assert.equal(await crashMark(r.page), "1", "a reload from here starts without the chain");
  // Nothing back after a few seconds: a reload is offered.
  await r.page.waitForSelector("#reload", { timeout: 60000 });
  // Then the context comes back.
  await r.page.evaluate(() => window.__lose.restoreContext());
  await r.page.waitForFunction(() => window.__pk.diag.restored === 1, null, { timeout: 300000 });
  assert.equal(await fx(r.page), "off", "the chain stays off for this session");
  assert.equal(await r.page.$("#reload"), null, "the reload offer is withdrawn");
  assert(await r.page.$("#resume"), "back to the pause menu");
  assert.equal(await crashMark(r.page), null);
  await r.page.tap("#resume");
  await r.page.waitForFunction(() => window.__pk.mode === "race");
  await frames(r.page, 3);
  assert((await lit(r.page)) > 200, "the race is drawn again");
  assert.equal(await crashMark(r.page), null, "and not marked: the chain is off");
  assert.deepEqual(r.errors, []);
});
