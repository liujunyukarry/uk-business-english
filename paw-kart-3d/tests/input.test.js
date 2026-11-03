import test from "node:test";
import assert from "node:assert/strict";
import { ControlState, hitControl } from "../dist/input.js";

const rects = {
  left: { left: 20, top: 300, right: 86, bottom: 364 },
  right: { left: 96, top: 300, right: 162, bottom: 364 },
  drift: { left: 680, top: 296, right: 748, bottom: 364 },
};

test("control state is derived from live contacts only", () => {
  const s = new ControlState();
  s.press("t1", "left");
  s.press("t2", "drift");
  assert.deepEqual(s.snapshot(), { left: true, right: false, drift: true, gas: false });
  s.release("t1");
  assert.equal(s.pressed("left"), false, "lifting one finger never leaves its key on");
  assert.equal(s.pressed("drift"), true, "the other finger keeps working");
  // Re-using an id for a different key cannot strand the old key (V2 could).
  s.press("t2", "right");
  assert.deepEqual(s.snapshot(), { left: false, right: true, drift: false, gas: false });
});

test("ghost contacts are dropped by reconciliation with the live touch list", () => {
  const s = new ControlState();
  s.press("t1", "left", "touch");
  s.press("p1", "right", "pointer");
  assert.equal(s.reconcile("touch", new Set(["t7"])), true);
  assert.equal(s.pressed("left"), false);
  assert.equal(s.pressed("right"), true, "mouse contacts are not touched by touch reconciliation");
});

test("contacts follow the finger within their group", () => {
  const s = new ControlState();
  s.press("t1", "left");
  s.move("t1", "right");
  assert.equal(s.pressed("right"), true);
  s.move("t1", "drift"); // a steering thumb never turns into a drift press
  assert.equal(s.pressed("drift"), false);
  assert.equal(s.pressed("right"), false);
  s.move("t1", "left");
  assert.equal(s.pressed("left"), true, "sliding back re-engages");
  s.clear();
  assert.deepEqual(s.snapshot(), { left: false, right: false, drift: false, gas: false });
});

test("hit testing uses a small tolerance and the nearest button", () => {
  assert.equal(hitControl(rects, 50, 330), "left");
  assert.equal(hitControl(rects, 130, 330), "right");
  assert.equal(hitControl(rects, 91, 330), "left", "gap between buttons goes to the nearer centre");
  assert.equal(hitControl(rects, 50, 290), "left", "slightly above still holds");
  assert.equal(hitControl(rects, 50, 200), null, "far up on the road releases");
  assert.equal(hitControl(rects, 700, 330, "steer"), null, "group filter");
  assert.equal(hitControl(rects, 700, 330), "drift");
});
