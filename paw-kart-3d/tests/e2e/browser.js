// Shared helpers for the browser regression tests (npm run test:e2e).
// They drive the real page in Chrome through the DevTools protocol, so touches
// go through the browser's own hit testing, pointer capture and event order.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".glb": "model/gltf-binary",
  ".txt": "text/plain",
  ".json": "application/json",
};

// PAWKART_URL lets the same tests run against another build (for example the
// V2 import) to show which of them fail there.
export async function serve() {
  if (process.env.PAWKART_URL) return { url: process.env.PAWKART_URL, close() {} };
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^\/+/, ""),
      file = path && !path.endsWith("/") ? path : path + "index.html";
    if (file.startsWith("..")) return res.writeHead(403).end();
    try {
      const body = await readFile(join(DIST, file));
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

// Appended to game.js in the browser only, never on disk: exposes module state
// so tests can read the exact input the race receives.
const HOOK = `
;window.__pk={get race(){return race},get mode(){return mode},getInput,touch,get cars(){return cars},camera,get clock(){return clock},get marks(){return typeof targetMarks==="undefined"?[]:targetMarks},
  // v2.7: the chase camera's state, the effects, the scene's light and haze.
  get cam(){return typeof cam==="undefined"?null:cam},get post(){return typeof post==="undefined"?null:post},get sprites(){return typeof sprites==="undefined"?null:sprites},get skids(){return typeof skids==="undefined"?null:skids},
  get world(){return typeof world==="undefined"?null:world},get scene(){return typeof scene==="undefined"?null:scene},get sun(){return typeof sun==="undefined"?null:sun},get save(){return save},
  get framing(){return typeof FRAMING==="undefined"?null:FRAMING},haptic:typeof haptic==="undefined"?null:haptic,
  // v2.7.1: the renderer (GPU resource counts), scene changes, the adaptive
  // quality's booked switches, the kart cache and the diagnostics.
  renderer,T,startRace,goHome,quality,get raceGroup(){return raceGroup},get world(){return world},
  setFxAuto(v){fxAuto=fxNext=v;quality()},get fxAuto(){return fxAuto},get fxNext(){return typeof fxNext==="undefined"?null:fxNext},
  get lowNext(){return typeof lowNext==="undefined"?null:lowNext},get adaptiveLow(){return adaptiveLow},get renderScale(){return renderScale},
  lighten:typeof lighten==="undefined"?null:lighten,get kartCache(){return kartCache},
  get diag(){return typeof diag==="undefined"?null:diag},diagText:typeof diagText==="undefined"?null:diagText};
`;

export async function launch({ webgl = false } = {}) {
  const args = ["--no-first-run", "--disable-background-networking", "--disable-component-update"];
  if (webgl) args.push("--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader");
  else args.push("--disable-3d-apis"); // compatibility renderer keeps tests fast on CPU-only machines
  const opts = { args, headless: true };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  else opts.channel = "chrome";
  return chromium.launch(opts);
}

// `slow`: generous timeouts, for pages drawn with WebGL on the CPU
// (SwiftShader), where a frame can take a second or two.
export async function openRace(browser, url, { width = 844, height = 390, init, start = true, slow = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  if (slow) ctx.setDefaultTimeout(180000);
  // Fault injection switch, installed before the game so it runs first: while
  // window.__dropEnds is true, every end-of-contact event is swallowed, as when
  // the OS or a host app takes a touch without telling the page.
  await ctx.addInitScript(() => {
    window.__dropEnds = false;
    for (const t of ["touchend", "touchcancel", "pointerup", "pointercancel", "lostpointercapture"])
      window.addEventListener(
        t,
        (e) => {
          if (window.__dropEnds) e.stopImmediatePropagation();
        },
        true,
      );
  });
  if (init) await ctx.addInitScript(init);
  await ctx.route(/\/game\.js(\?.*)?$/, async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()) + HOOK,
      headers: { ...r.headers(), "content-type": "text/javascript" },
    });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, {
    timeout: 120000,
  });
  // start: false stops at the garage (home screen) instead of starting a race.
  if (start) {
    await page.click("#start");
    await page.waitForFunction(() => window.__pk?.mode === "race", null, { timeout: slow ? 180000 : 30000 });
  }
  const cdp = await ctx.newCDPSession(page);
  const fingers = new Map();
  // Chrome treats the points listed in a touchEnd as the ones being lifted.
  const send = (type, lifted = []) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? lifted : type === "touchCancel" ? [] : [...fingers.values()],
    });
  const centre = async (selector) =>
    page.$eval(selector, (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  const finger = {
    async down(id, at) {
      const p = typeof at === "string" ? await centre(at) : at;
      fingers.set(id, { id, x: p.x, y: p.y });
      await send("touchStart");
    },
    async move(id, at) {
      const p = typeof at === "string" ? await centre(at) : at;
      fingers.set(id, { id, x: p.x, y: p.y });
      await send("touchMove");
    },
    async up(id) {
      const p = fingers.get(id);
      fingers.delete(id);
      await send("touchEnd", [p]);
    },
    async cancel() {
      fingers.clear();
      await send("touchCancel");
    },
  };
  const input = () => page.evaluate(() => ({ ...window.__pk.getInput(), mode: window.__pk.mode }));
  const lit = () =>
    page.$$eval("[data-control].pressed", (els) => els.map((e) => e.dataset.control).sort().join(" "));
  return { ctx, page, cdp, finger, input, lit, errors, centre };
}
