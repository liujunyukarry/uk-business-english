import test from "node:test";
import assert from "node:assert/strict";
import { ControlState, hitControl } from "../dist/input.js";

// An 844 x 390 landscape phone: the steering halves start below the top HUD
// bar; drift is a button over the right half.
const rects = {
  left: { left: 0, top: 70, right: 422, bottom: 390, zone: true },
  right: { left: 422, top: 70, right: 844, bottom: 390, zone: true },
  drift: { left: 740, top: 200, right: 820, bottom: 280 },
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

test("both halves held: the half touched most recently steers", () => {
  const s = new ControlState();
  s.press("t1", "left");
  s.press("t2", "right");
  assert.deepEqual([s.pressed("left"), s.pressed("right")], [false, true], "newest wins");
  s.release("t2");
  assert.equal(s.pressed("left"), true, "lifting it hands back to the first thumb");
  s.press("t2", "right");
  s.move("t1", "right"); // first thumb slides across: still right
  s.move("t1", "left"); // ...and back: now the newest steering move
  assert.equal(s.pressed("left"), true);
  assert.equal(s.pressed("right"), false);
});

test("hit testing: buttons first (with a margin), then the steering halves", () => {
  assert.equal(hitControl(rects, 100, 300), "left", "anywhere on the left half");
  assert.equal(hitControl(rects, 600, 120), "right", "anywhere on the right half");
  assert.equal(hitControl(rects, 421, 300), "left");
  assert.equal(hitControl(rects, 423, 300), "right");
  assert.equal(hitControl(rects, 780, 240), "drift", "the drift button sits over the right half");
  assert.equal(hitControl(rects, 730, 240), "drift", "a finger just off the button still holds it");
  assert.equal(hitControl(rects, 690, 240), "right", "further out it is steering again");
  assert.equal(hitControl(rects, 200, 40), null, "the top HUD bar is not steering");
  assert.equal(hitControl(rects, 780, 240, "steer"), "right", "a steering thumb sliding over drift keeps steering");
  assert.equal(hitControl(rects, 100, 300, "drift"), null, "group filter");
});
