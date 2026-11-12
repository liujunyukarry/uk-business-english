// v2.7 in the real page: the portrait framing, the camera's look into bends
// and its opening shot, one atmosphere per track, the post-processing chain
// with its fallbacks (WebGL), tyre marks and smoke, the result card, the
// iris between scenes and haptic ticks.
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
const racing = (page) => page.waitForFunction(() => window.__pk.race.phase === "racing", null, { timeout: 180000 });
const saved = (o) => `localStorage.setItem("paw-kart-v1", JSON.stringify(${JSON.stringify(o)}))`;
// Where the player's kart is drawn: its width as a fraction of the screen's,
// its height on the screen (0 top .. 1 bottom), and where a point on the road
// `ahead` metres on is.
const framing = (page, ahead = 40) =>
  page.evaluate((ahead) => {
    const { cars, camera, race } = window.__pk,
      k = cars[0],
      V = k.position.constructor,
      e = camera.matrixWorld.elements,
      right = new V(e[0], e[1], e[2]),
      project = (v) => {
        const n = v.clone().project(camera);
        return { x: (n.x + 1) / 2, y: (1 - n.y) / 2, z: n.z };
      },
      l = project(k.position.clone().addScaledVector(right, -0.95).add(new V(0, 0.6, 0))),
      r = project(k.position.clone().addScaledVector(right, 0.95).add(new V(0, 0.6, 0))),
      c = project(k.position.clone().add(new V(0, 0.8, 0))),
      road = project(race.track.sample(race.player.distance + ahead, 0).p),
      // How much of the screen's width the road takes 20 m ahead of the kart.
      span = Math.abs(project(race.track.sample(race.player.distance + 20, race.track.width / 2).p).x - project(race.track.sample(race.player.distance + 20, -race.track.width / 2).p).x);
    return { width: Math.abs(r.x - l.x), x: c.x, y: c.y, road, span };
  }, ahead);
// Put the player 30 m before the sharpest bend of the lap, at speed.
const toBend = (page) =>
  page.evaluate(() => {
    const race = window.__pk.race,
      t = race.track,
      p = race.player;
    let best = 0,
      at = 0;
    for (let d = 60; d < t.length - 60; d += 4) if (Math.abs(t.curvature(d)) > Math.abs(best)) (best = t.curvature(d)), (at = d);
    race.racers.slice(1).forEach((x, i) => (x.distance = x.previous = at - 260 - i * 12));
    p.distance = p.previous = at - 30;
    p.lane = p.previousLane = 0;
    p.speed = 30;
    return { at, curve: best };
  });
// Finish the race with the player in `rank`-th place.
const finishAs = (page, rank) =>
  page.evaluate((rank) => {
    const race = window.__pk.race,
      total = race.track.length * race.laps;
    race.racers.forEach((r, i) => {
      if (i) r.distance = r.previous = total - (i < rank ? 1 : 70 + i * 12);
    });
    const p = race.player;
    p.distance = p.previous = total - 22;
    p.speed = 30;
  }, rank);

test("portrait framing: the kart is under 30% of the screen's width, low in the frame, with the road and its verges in view", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  await r.page.waitForTimeout(900);
  // (On a straight, so that the road ahead is measured square on.)
  await r.page.evaluate(() => {
    const race = window.__pk.race,
      t = race.track,
      p = race.player;
    let at = 0;
    for (let d = 40; d < t.length - 80; d += 5) {
      let bend = 0;
      for (let k = -10; k <= 40; k += 5) bend = Math.max(bend, Math.abs(t.curvature(d + k)));
      if (bend < 0.002) {
        at = d;
        break;
      }
    }
    p.distance = p.previous = at;
    p.lane = p.previousLane = 0;
    race.racers.slice(1).forEach((x, i) => (x.distance = x.previous = at + 14 + i * 9));
  });
  await r.page.waitForTimeout(1200);
  const f = await framing(r.page);
  // Measured across the 1.9 m body: 24% in v2.7, 34% in v2.6.
  assert(f.width > 0.17 && f.width < 0.29, "kart body is " + (f.width * 100).toFixed(0) + "% of the screen's width");
  assert(f.span > 0.45 && f.span < 0.8, "the road 20 m ahead leaves room for its verges: " + (f.span * 100).toFixed(0) + "% of the width (v2.6: 92%)");
  assert(Math.abs(f.x - 0.5) < 0.12, "centred");
  assert(f.y > 0.56 && f.y < 0.74, "kart at " + (f.y * 100).toFixed(0) + "% of the height");
  assert(f.road.z < 1 && f.road.x > 0 && f.road.x < 1, "the road 40 m ahead is on screen");
  assert(f.road.y > 0.3 && f.road.y < f.y - 0.1, "well above the kart: " + (f.road.y * 100).toFixed(0) + "%");
  assert.equal(await r.page.evaluate(() => document.documentElement.dataset.fx), "unsupported", "no post chain in the compatibility renderer");
  assert.deepEqual(r.errors, []);
});

test("landscape framing is kept: a small kart and a wide road", async (t) => {
  const r = await openRace(browser, server.url, { width: 844, height: 390 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  await r.page.waitForTimeout(900);
  const f = await framing(r.page);
  assert(f.width > 0.08 && f.width < 0.2, "kart width " + (f.width * 100).toFixed(0) + "%");
  assert(f.y > 0.5 && f.y < 0.75, "kart at " + (f.y * 100).toFixed(0) + "% of the height");
  assert(f.road.y > 0.2 && f.road.y < f.y, "road ahead in view");
  assert.deepEqual(r.errors, []);
});

test("the camera looks into a bend and leans with it; with reduced motion it does not lean", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  await racing(r.page);
  const bend = await toBend(r.page);
  await r.page.waitForFunction((at) => window.__pk.race.player.distance > at - 6, bend.at, { timeout: 10000 });
  const cam = await r.page.evaluate(() => {
    const { race, cam } = window.__pk,
      p = race.player,
      wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)),
      here = race.track.sample(p.distance).yaw;
    return { lead: wrap(cam.heading - here), turn: wrap(race.track.sample(p.distance + 14).yaw - here), roll: cam.roll };
  });
  assert.equal(Math.sign(cam.lead), Math.sign(cam.turn), "the heading leads the way the road turns");
  assert(Math.abs(cam.lead) > 0.05, "by a visible amount: " + cam.lead.toFixed(3) + " rad");
  assert.equal(Math.sign(cam.roll), Math.sign(bend.curve), "and the horizon leans into the bend");
  assert(Math.abs(cam.roll) > 0.004 && Math.abs(cam.roll) <= 0.0501, "a few degrees at most: " + cam.roll.toFixed(4));
  assert.deepEqual(r.errors, []);
  const calm = await openRace(browser, server.url, { width: 430, height: 932, init: saved({ reduced: true }) });
  t.after(() => calm.ctx.close());
  await racing(calm.page);
  const b = await toBend(calm.page);
  await calm.page.waitForFunction((at) => window.__pk.race.player.distance > at - 6, b.at, { timeout: 10000 });
  assert.equal(await calm.page.evaluate(() => window.__pk.cam.roll), 0, "no lean with reduced motion");
  assert.deepEqual(calm.errors, []);
});

test("opening shot: the camera cranes down through the countdown and is in place before GO", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  const high = await r.page.evaluate(() => {
    const { cam, race, framing } = window.__pk,
      F = innerHeight > innerWidth ? framing.portrait : framing.landscape;
    return { countdown: race.countdown, up: cam.height - F.height, back: cam.back - F.back, orbit: cam.orbit };
  });
  assert(high.countdown > 2.4, "sampled early in the countdown (" + high.countdown.toFixed(2) + " s left)");
  assert(high.up > 3 && high.back > 4, "starts high behind the grid: +" + high.up.toFixed(1) + " m up, +" + high.back.toFixed(1) + " m back");
  assert(high.orbit < -0.3, "and to one side");
  const f = await framing(r.page);
  assert(f.x > 0.05 && f.x < 0.95 && f.y > 0.05 && f.y < 0.95, "the player's kart stays in the picture");
  await r.page.waitForFunction(() => window.__pk.race.countdown < 0.35, null, { timeout: 15000 });
  const low = await r.page.evaluate(() => {
    const { cam, framing } = window.__pk,
      F = innerHeight > innerWidth ? framing.portrait : framing.landscape;
    return { up: cam.height - F.height, back: cam.back - F.back, orbit: cam.orbit };
  });
  assert(Math.abs(low.up) < 0.3 && Math.abs(low.back) < 0.5 && Math.abs(low.orbit) < 0.03, "settled behind the kart before GO: " + JSON.stringify(low));
  assert.deepEqual(r.errors, []);
  // With "reduce camera motion" the race opens on the chase view.
  const calm = await openRace(browser, server.url, { width: 430, height: 932, init: saved({ reduced: true }) });
  t.after(() => calm.ctx.close());
  const still = await calm.page.evaluate(() => {
    const { cam, framing } = window.__pk;
    return { up: cam.height - framing.portrait.height, orbit: cam.orbit };
  });
  assert(Math.abs(still.up) < 0.3 && still.orbit === 0, "no crane with reduced motion");
  assert.deepEqual(calm.errors, []);
});

test("each track has its own time of day: light, haze and sun direction", async (t) => {
  const seen = [];
  for (const track of [0, 1, 2]) {
    const r = await openRace(browser, server.url, { width: 430, height: 932, init: saved({ track }) });
    t.after(() => r.ctx.close());
    const a = await r.page.evaluate(() => {
      const { world, scene, sun } = window.__pk,
        d = sun.position.clone().sub(sun.target.position).normalize();
      return {
        name: world.atmos.name,
        fog: scene.fog.color.getHex(),
        range: [scene.fog.near, scene.fog.far],
        sun: sun.color.getHex(),
        power: sun.intensity,
        elevation: (Math.asin(d.y) * 180) / Math.PI,
        want: world.atmos.sun.dir,
        dir: [d.x, d.y, d.z],
      };
    });
    const n = Math.hypot(...a.want);
    a.want.forEach((v, i) => assert(Math.abs(v / n - a.dir[i]) < 0.02, "the shadows fall away from the painted sun"));
    assert(a.range[0] < a.range[1]);
    seen.push(a);
    assert.deepEqual(r.errors, []);
  }
  assert.deepEqual(seen.map((a) => a.name), ["noon", "sunset", "night"]);
  assert.equal(new Set(seen.map((a) => a.fog)).size, 3, "three different hazes");
  assert.equal(new Set(seen.map((a) => a.sun)).size, 3, "three different lights");
  assert(seen[0].elevation > 40, "noon: a high sun");
  assert(seen[1].elevation < 25, "sunset: a low sun (" + seen[1].elevation.toFixed(0) + "°)");
  assert(seen[2].power < seen[0].power, "night: moonlight is dimmer than the sun");
});

test("result card: medal, time counting up, record note, confetti for a podium; none for 5th; inside the safe area", async (t) => {
  // A phone 852 px tall with a Dynamic Island: the card is taller than in
  // v2.6 and must not slide under the island or the home indicator.
  const r = await openRace(browser, server.url, { width: 393, height: 852 });
  t.after(() => r.ctx.close());
  await r.cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 59, right: 0, bottom: 34, left: 0 } });
  await racing(r.page);
  await finishAs(r.page, 1);
  await r.page.waitForFunction(() => window.__pk.mode === "result", null, { timeout: 60000 });
  const card = await r.page.evaluate(() => ({
    rank: document.querySelector(".medal b").textContent,
    top: document.querySelector(".result-top").className,
    confetti: !!document.querySelector("#dialog #confetti"),
    record: document.querySelector(".new-record")?.textContent || "",
    rows: document.querySelectorAll(".result-table tr").length,
    dots: document.querySelectorAll(".result-table td i").length,
  }));
  assert.equal(card.rank, "1");
  assert.match(card.top, /rank-1/);
  assert(card.confetti, "confetti over the card");
  assert.match(card.record, /刷新个人最佳纪录/);
  assert.equal(card.rows, 8);
  assert.equal(card.dots, 8, "each driver's colour");
  // The time counts up to the finish time.
  const want = await r.page.evaluate(() => {
    const t = window.__pk.race.player.finish,
      m = Math.floor(t / 60),
      s = Math.floor(t % 60),
      ms = Math.floor((t % 1) * 1000);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + String(ms).padStart(3, "0");
  });
  await r.page.waitForFunction((want) => document.querySelector("#result-time").textContent === want, want, { timeout: 5000 });
  // The buttons are on screen, and the confetti never takes a tap meant for them.
  const next = await r.page.$eval("#next-race", (b) => {
    const box = b.getBoundingClientRect(),
      hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { bottom: box.bottom, hit: hit === b || b.contains(hit) };
  });
  assert(next.bottom <= 852 - 34 && next.hit, "再来一场 is visible and tappable");
  const edges = await r.page.$eval("#dialog", (d) => {
    const b = d.getBoundingClientRect();
    return [b.top, b.bottom];
  });
  assert(edges[0] >= 59 - 0.5 && edges[1] <= 852 - 34 + 0.5, "the card is inside the safe area: " + edges.map(Math.round));
  assert.deepEqual(r.errors, []);

  // A slower run than the personal best says by how much; 5th place gets no confetti.
  const slow = await openRace(browser, server.url, { width: 844, height: 390, init: saved({ records: { "0-normal": 0.2 } }) }); // (a time no run can beat)
  t.after(() => slow.ctx.close());
  await slow.cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 0, right: 47, bottom: 21, left: 47 } });
  await racing(slow.page);
  await finishAs(slow.page, 5);
  await slow.page.waitForFunction(() => window.__pk.mode === "result", null, { timeout: 60000 });
  const second = await slow.page.evaluate(() => ({
    rank: document.querySelector(".medal b").textContent,
    top: document.querySelector(".result-top").className,
    confetti: !!document.querySelector("#confetti"),
    gap: document.querySelector(".record-gap")?.textContent || "",
    fresh: !!document.querySelector(".new-record"),
    kept: JSON.parse(localStorage.getItem("paw-kart-v1")).records["0-normal"],
  }));
  assert.equal(second.rank, "5");
  assert.match(second.top, /rank-4/, "outside the podium: the plain medal");
  assert(!second.confetti && !second.fresh);
  assert.match(second.gap, /个人最佳 00:00\.200 · 这次慢 \d+\.\d\d 秒/);
  assert.equal(second.kept, 0.2, "the record stands");
  const reach = await slow.page.$eval("#next-race", (b) => b.getBoundingClientRect().bottom),
    foot = await slow.page.$eval("#dialog", (d) => d.getBoundingClientRect().bottom);
  assert(reach <= 390 - 21 + 0.5, "the buttons stay reachable on a landscape phone");
  assert(foot <= 390 - 21 + 0.5, "and the card ends above the home indicator: " + Math.round(foot));
  assert.deepEqual(slow.errors, []);
});

test("iris between scenes: plays when a race starts, never takes touches, and is gone within a second", async (t) => {
  const r = await openRace(browser, server.url, { width: 430, height: 932 });
  t.after(() => r.ctx.close());
  const w = await r.page.$eval("#wipe", (e) => ({ on: e.classList.contains("on"), events: getComputedStyle(e).pointerEvents }));
  assert(w.on, "started with the race");
  assert.equal(w.events, "none");
  await r.page.waitForTimeout(900);
  assert.equal(await r.page.$eval("#wipe", (e) => getComputedStyle(e).opacity), "0", "finished");
  // Steering works under it from the first moment of the next scene too.
  await racing(r.page);
  await r.finger.down(1, { x: 60, y: 500 });
  assert.equal(await r.lit(), "left");
  await r.finger.up(1);
  assert.deepEqual(r.errors, []);
});

test("haptics: a wall hit ticks where the phone can vibrate; the setting turns it off; steering is never disturbed", async (t) => {
  const stub = "window.__vib=[];navigator.vibrate=(ms)=>{window.__vib.push(ms);return true;};";
  const wall = (page) =>
    page.evaluate(() => {
      const race = window.__pk.race,
        p = race.player;
      race.racers.slice(1).forEach((x, i) => (x.distance = x.previous = p.distance - 200 - i * 10));
      p.lane = p.previousLane = race.track.width / 2 + 0.9;
      p.lateral = 9;
      p.speed = 34;
    });
  const on = await openRace(browser, server.url, { width: 430, height: 932, init: stub });
  t.after(() => on.ctx.close());
  await racing(on.page);
  await on.page.evaluate(() => (window.__vib.length = 0));
  await wall(on.page);
  await on.page.waitForFunction(() => window.__pk.race.player.walls > 0, null, { timeout: 5000 });
  await on.page.waitForFunction(() => window.__vib.length > 0, null, { timeout: 3000 });
  assert(await on.page.evaluate(() => window.__vib.every((ms) => ms > 0 && ms <= 40)), "short ticks");
  assert.deepEqual(on.errors, []);

  const off = await openRace(browser, server.url, { width: 430, height: 932, init: stub + saved({ haptics: false }) });
  t.after(() => off.ctx.close());
  await racing(off.page);
  await off.page.evaluate(() => (window.__vib.length = 0));
  await wall(off.page);
  await off.page.waitForFunction(() => window.__pk.race.player.walls > 0, null, { timeout: 5000 });
  await off.page.waitForTimeout(300);
  assert.equal(await off.page.evaluate(() => window.__vib.length), 0, "silent when switched off");
  assert.deepEqual(off.errors, []);

  // No vibration API (iOS): the hidden switch is toggled instead, and a thumb
  // that is steering stays down.
  const ios = await openRace(browser, server.url, { width: 430, height: 932, init: "Object.defineProperty(Navigator.prototype,'vibrate',{value:undefined,configurable:true});" });
  t.after(() => ios.ctx.close());
  await racing(ios.page);
  await ios.finger.down(1, { x: 60, y: 500 });
  assert.equal(await ios.lit(), "left");
  const toggled = await ios.page.evaluate(() => {
    const box = document.querySelector("#haptic input"),
      was = box.checked;
    window.__pk.haptic(10);
    return { changed: box.checked !== was, focus: document.activeElement === box };
  });
  assert(toggled.changed, "the switch was toggled");
  assert(!toggled.focus, "without taking focus");
  await ios.finger.move(1, { x: 61, y: 500 });
  assert.equal(await ios.lit(), "left", "still steering");
  assert.equal((await ios.input()).steer, -1);
  await ios.finger.up(1);
  assert.deepEqual(ios.errors, []);
});

// --- WebGL ------------------------------------------------------------------
// True when the frame on screen is not blank (read right after it is drawn).
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
const fx = (page) => page.evaluate(() => document.documentElement.dataset.fx);

test("post chain (WebGL): on in the garage and in a race, switchable in settings, the picture never blank", { timeout: 420000 }, async (t) => {
  const r = await openRace(gl, server.url, { width: 360, height: 640, start: false, slow: true });
  t.after(() => r.ctx.close());
  assert.equal(await fx(r.page), "on", "bloom and grade run in the garage");
  assert((await lit(r.page)) > 200, "the garage is drawn");
  const info = await r.page.evaluate(() => ({ ok: window.__pk.post.ok, samples: window.__pk.post.samples, size: window.__pk.post.size }));
  assert(info.ok && info.size[0] > 0 && info.size[1] > 0);
  assert([0, 4].includes(info.samples), "multisampled when the GPU can, plain when not");
  // The switch in settings.
  await r.page.tap("#settings");
  assert(await r.page.$eval("#setting-fx", (e) => e.checked), "画面特效 starts on");
  await r.page.tap("#setting-fx");
  assert.equal(await fx(r.page), "off");
  assert((await lit(r.page)) > 200, "still drawn without it");
  assert.equal(await r.page.evaluate(() => JSON.parse(localStorage.getItem("paw-kart-v1")).fx), false, "remembered");
  await r.page.tap("#setting-fx");
  assert.equal(await fx(r.page), "on");
  await r.page.tap("#done-settings");
  // A race: its own look, and the frame is drawn.
  await r.page.tap("#start");
  await racing(r.page);
  assert.equal(await fx(r.page), "on");
  assert((await lit(r.page)) > 200, "the race is drawn through the chain");
  const look = await r.page.evaluate(() => ({ bloom: window.__pk.post.uniforms.bloom.value, calls: window.__pk.post.calls }));
  assert(look.bloom > 0 && look.calls > 50, "the scene went through the chain (" + look.calls + " draw calls)");
  assert.deepEqual(r.errors, []);
});

test("post chain (WebGL): a failure, or frames that come out blank, fall back to plain drawing for good", { timeout: 600000 }, async (t) => {
  // The chain is built, and its first frames checked, in the garage, and
  // again whenever the screen changes size (a rotation).
  const r = await openRace(gl, server.url, { width: 360, height: 640, start: false, slow: true });
  t.after(() => r.ctx.close());
  assert.equal(await fx(r.page), "on");
  // From now on the chain's frames read back blank after a rebuild, as on a
  // GPU that draws nothing into float targets.
  await r.page.evaluate(() => (window.__pk.post.verify = () => false));
  await r.page.setViewportSize({ width: 375, height: 667 });
  await r.page.waitForFunction(() => document.documentElement.dataset.fx === "unsupported", null, { timeout: 120000 });
  const state = await r.page.evaluate(() => ({ ok: window.__pk.post.ok, reason: window.__pk.post.reason }));
  assert.deepEqual(state, { ok: false, reason: "blank frame" });
  assert((await lit(r.page)) > 200, "the garage is drawn directly from the same frame on");
  // A race after that is drawn directly too, and the chain is not tried again.
  await r.page.tap("#start");
  await racing(r.page);
  assert((await lit(r.page)) > 200, "the race is drawn");
  assert.equal(await fx(r.page), "unsupported");
  assert.deepEqual(r.errors, []);
  await r.ctx.close();

  // An error inside the chain does the same.
  const b = await openRace(gl, server.url, { width: 640, height: 360, start: false, slow: true });
  t.after(() => b.ctx.close());
  assert.equal(await fx(b.page), "on");
  await b.page.evaluate(() => window.__pk.post.fail("test"));
  await b.page.waitForFunction(() => document.documentElement.dataset.fx === "unsupported", null, { timeout: 120000 });
  assert((await lit(b.page)) > 200, "drawn after an error in the chain");
  assert.equal(await b.page.evaluate(() => window.__pk.post.reason), "test");
  assert.deepEqual(b.errors, []);
});

test("drifting (WebGL): tyre marks and smoke by day, lines of light on the night track", { timeout: 600000 }, async (t) => {
  for (const track of [0, 2]) {
    const r = await openRace(gl, server.url, { width: 360, height: 640, init: saved({ track }), slow: true });
    await racing(r.page);
    // A drift held through a steady right-hand bend, in slow motion: on the
    // CPU a frame takes a second or more, and marks are laid frame by frame
    // (a wheel that moved more than 6 m between two frames is a teleport).
    await r.page.evaluate(() => {
      const race = window.__pk.race,
        p = race.player,
        step = race.step.bind(race);
      race.racers.slice(1).forEach((x, i) => (x.distance = x.previous = p.distance - 200 - i * 12));
      race.track.curvature = () => -0.02;
      p.lane = p.previousLane = 0;
      p.speed = 28;
      Object.assign(p, { drifting: true, driftDirection: 1, driftAuto: true, drift: 0.3 });
      race.step = (dt, input) => step(dt * 0.05, input);
    });
    await r.finger.down(1, { x: 300, y: 330 }); // the right half: holds the drift
    let seen;
    for (let i = 0; i < 60; i++) {
      await r.page.waitForTimeout(150);
      await r.finger.move(1, { x: 300 + (i % 2), y: 330 }); // (a perfectly still finger is released by the watchdog)
      seen = await r.page.evaluate(() => ({
        laid: window.__pk.skids.laid,
        smoke: window.__pk.sprites.layers[1].n,
        additive: window.__pk.skids.mesh.material.blending === 2,
        drifting: window.__pk.race.player.drifting,
      }));
      if (seen.laid > 4 && seen.smoke > 0) break;
    }
    await r.finger.up(1);
    assert(seen.drifting, "the drift was held");
    assert(seen.laid > 4, "tyre marks were laid (" + seen.laid + " pieces)");
    assert(seen.smoke > 0, "with smoke from the rear tyres");
    assert.equal(seen.additive, track === 2, track === 2 ? "glowing on the night track" : "dark rubber by day");
    assert.deepEqual(r.errors, []);
    await r.ctx.close(); // one WebGL page at a time: each is slow enough alone
  }
});
