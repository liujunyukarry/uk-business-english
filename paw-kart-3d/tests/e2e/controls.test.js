// Touch steering regressions for the stuck-left report from iPhone play.
// Run: npm run test:e2e   (PAWKART_URL=http://host/ to test another build)
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

const settle = (page) => page.waitForTimeout(120);

async function race(t) {
  const r = await openRace(browser, server.url);
  t.after(() => r.ctx.close());
  return r;
}

test("press and lift: left steers left, lifting releases at once", async (t) => {
  const { page, finger, input, lit, errors } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await settle(page);
  assert.equal((await input()).steer, -1);
  assert.equal(await lit(), "left");
  await finger.up(1);
  await settle(page);
  assert.equal((await input()).steer, 0);
  assert.equal(await lit(), "");
  await finger.down(2, '[data-control="right"]');
  await settle(page);
  assert.equal((await input()).steer, 1, "right steers right");
  await finger.up(2);
  await settle(page);
  assert.equal((await input()).steer, 0);
  assert.deepEqual(errors, []);
});

test("a lift the page never hears about is healed by the next touch", async (t) => {
  // The OS / host app swallows the end of the left-button touch. V2 kept
  // `touch.left` cached as true with the button lit, and nothing could clear it.
  const { page, finger, input, lit } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await settle(page);
  await page.evaluate(() => (window.__dropEnds = true));
  await finger.up(1);
  await settle(page);
  await page.evaluate(() => (window.__dropEnds = false));
  // Next interaction: tap right. The browser's live touch list no longer
  // contains finger 1, so its contact must be dropped.
  await finger.down(2, '[data-control="right"]');
  await settle(page);
  assert.equal((await input()).steer, 1, "right works while healing the ghost left");
  assert.equal(await lit(), "right");
  await finger.up(2);
  await settle(page);
  assert.equal((await input()).steer, 0, "no residual left after all fingers are up");
  assert.equal(await lit(), "");
});

test("system cancel releases every held control", async (t) => {
  const { page, finger, input, lit } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await finger.down(2, '[data-control="drift"]');
  await settle(page);
  assert.equal((await input()).drift, true);
  await finger.cancel();
  await settle(page);
  const s = await input();
  assert.equal(s.steer, 0);
  assert.equal(s.drift, false);
  assert.equal(await lit(), "");
});

test("sliding off the steering half releases it; sliding back re-engages; left to right switches", async (t) => {
  const { page, finger, input, lit, centre } = await race(t);
  const left = await centre('[data-control="left"]');
  await finger.down(1, left);
  await settle(page);
  assert.equal((await input()).steer, -1);
  // Thumb slides all the way up into the top HUD bar, off the steering half.
  await finger.move(1, { x: left.x, y: 20 });
  await settle(page);
  assert.equal((await input()).steer, 0, "off the steering half means not steering");
  assert.equal(await lit(), "");
  await finger.move(1, left);
  await settle(page);
  assert.equal((await input()).steer, -1, "back on the left half");
  // Roll the same thumb across the middle onto the right half.
  await finger.move(1, '[data-control="right"]');
  await settle(page);
  assert.equal((await input()).steer, 1, "rolled onto the right half steers right");
  assert.equal(await lit(), "right");
  await finger.up(1);
  await settle(page);
  assert.equal((await input()).steer, 0);
  assert.equal(await lit(), "");
});

test("big steering halves: any point on a half steers that way", async (t) => {
  const { page, finger, input } = await race(t);
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const spots = [
    [30, h - 30, -1], // bottom-left corner
    [w / 2 - 25, h * 0.45, -1], // just left of the middle
    [w * 0.25, 120, -1], // high on the left half
    [w - 30, h - 30, 1], // bottom-right corner
    [w / 2 + 25, h * 0.45, 1], // just right of the middle
    [w * 0.75, 120, 1],
  ];
  for (const [x, y, steer] of spots) {
    await finger.down(1, { x, y });
    await settle(page);
    assert.equal((await input()).steer, steer, `touch at ${Math.round(x)},${Math.round(y)}`);
    await finger.up(1);
    await settle(page);
    assert.equal((await input()).steer, 0);
  }
});

test("both halves held: the newer touch steers, lifting it hands back", async (t) => {
  const { page, finger, input, lit } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await settle(page);
  await finger.down(2, '[data-control="right"]');
  await settle(page);
  assert.equal((await input()).steer, 1, "quick correction with the other thumb");
  assert.equal(await lit(), "right");
  await finger.up(2);
  await settle(page);
  assert.equal((await input()).steer, -1, "first thumb still steering left");
  await finger.up(1);
  await settle(page);
  assert.equal((await input()).steer, 0);
});

test("the drift button sits over the right half but never steers", async (t) => {
  const { page, finger, input, lit } = await race(t);
  await finger.down(1, '[data-control="drift"]');
  await settle(page);
  const s = await input();
  assert.equal(s.drift, true);
  assert.equal(s.steer, 0, "a touch on drift is not a right turn");
  assert.equal(await lit(), "drift");
  await finger.up(1);
  await settle(page);
  assert.equal((await input()).drift, false);
});

test("watchdog: a lost lift is released even if no other touch ever comes", async (t) => {
  const { page, finger, input, lit } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await settle(page);
  await page.evaluate(() => (window.__dropEnds = true));
  await finger.up(1); // the page never hears about it
  await page.evaluate(() => (window.__dropEnds = false));
  await settle(page);
  assert.equal((await input()).steer, -1, "ghost still held right after the lost lift");
  await page.waitForTimeout(4600);
  assert.equal((await input()).steer, 0, "released by the watchdog");
  assert.equal(await lit(), "");
});

test("watchdog: a finger held perfectly still is re-attached by its next move", async (t) => {
  const { page, finger, input, centre } = await race(t);
  const left = await centre('[data-control="left"]');
  await finger.down(1, left);
  await page.waitForTimeout(4600); // no events at all: set aside
  await finger.move(1, { x: left.x + 1, y: left.y }); // the finger is still there
  await settle(page);
  assert.equal((await input()).steer, -1, "steering again at once");
  await finger.up(1);
  await settle(page);
  assert.equal((await input()).steer, 0);
});

test("two fingers: lifting one leaves the other working", async (t) => {
  const { page, finger, input, lit } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await finger.down(2, '[data-control="drift"]');
  await settle(page);
  let s = await input();
  assert.equal(s.steer, -1);
  assert.equal(s.drift, true);
  await finger.up(1);
  await settle(page);
  s = await input();
  assert.equal(s.steer, 0, "left released");
  assert.equal(s.drift, true, "drift still held by the other finger");
  assert.equal(await lit(), "drift");
  await finger.down(3, '[data-control="right"]');
  await settle(page);
  s = await input();
  assert.equal(s.steer, 1);
  assert.equal(s.drift, true);
  await finger.up(2);
  await settle(page);
  s = await input();
  assert.equal(s.steer, 1, "right still held");
  assert.equal(s.drift, false);
  await finger.up(3);
  await settle(page);
  assert.equal(await lit(), "");
});

test("item tap with a second finger does not disturb steering", async (t) => {
  const { page, finger, input } = await race(t);
  await finger.down(1, '[data-control="left"]');
  await finger.down(2, "#item-button");
  await finger.up(2);
  await settle(page);
  assert.equal((await input()).steer, -1, "still steering left");
  await finger.up(1);
  await settle(page);
  assert.equal((await input()).steer, 0);
});

test("pause, backgrounding and rotation leave no residual input", async (t) => {
  const { page, finger, input, lit } = await race(t);
  // Pause while holding left.
  await finger.down(1, '[data-control="left"]');
  await settle(page);
  await page.keyboard.press("KeyP");
  await settle(page);
  assert.equal((await input()).mode, "paused");
  assert.equal(await lit(), "");
  await page.click("#resume");
  await settle(page);
  assert.equal((await input()).steer, 0, "resume does not resurrect the held key");
  await finger.up(1);
  await settle(page);
  // Backgrounding.
  await finger.down(2, '[data-control="right"]');
  await settle(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await settle(page);
  let s = await input();
  assert.equal(s.mode, "paused");
  assert.equal(s.steer, 0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
  await finger.up(2);
  await page.click("#resume");
  // Rotation while holding drift.
  await finger.down(3, '[data-control="drift"]');
  await settle(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  s = await input();
  assert.equal(s.mode, "paused", "rotation pauses");
  assert.equal(s.drift, false);
  assert.equal(await lit(), "");
  await finger.up(3);
  await page.click("#resume");
  await page.waitForTimeout(200);
  await finger.down(4, '[data-control="left"]');
  await settle(page);
  assert.equal((await input()).steer, -1, "portrait controls work after rotating");
  await finger.up(4);
  await settle(page);
  assert.equal((await input()).steer, 0);
});

test("mouse: release outside and lost capture both release", async (t) => {
  const { page, input, centre } = await race(t);
  const left = await centre('[data-control="left"]');
  await page.mouse.move(left.x, left.y);
  await page.mouse.down();
  await settle(page);
  assert.equal((await input()).steer, -1);
  await page.mouse.move(left.x, 20); // up into the top bar, off the half
  await page.mouse.up();
  await settle(page);
  assert.equal((await input()).steer, 0);
  await page.mouse.move(left.x, left.y);
  await page.mouse.down();
  await settle(page);
  await page.$eval('[data-control="left"]', (el) =>
    el.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: 1, bubbles: true })),
  );
  await settle(page);
  assert.equal((await input()).steer, 0, "lost capture releases");
  await page.mouse.up();
});
