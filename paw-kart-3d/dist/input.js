// Touch / mouse control state for the on-screen driving controls.
//
// Layout (v2.2): the left and right halves of the screen are the steering
// controls ("zones"): touch anywhere on the left half to steer left, on the
// right half to steer right. Drift (and gas, when auto-gas is off) are
// ordinary buttons placed over the zones; a touch that starts on a button is
// that button, never steering.
//
// Design rules (each one closes a way V2 could leave a key "stuck"):
// 1. A control is pressed if and only if some live contact currently holds it.
//    Nothing is cached per button, so a release that arrives anywhere always
//    clears the visual and the steering state together.
// 2. Every touch event carries the browser's list of fingers still on the
//    screen (TouchEvent.touches). Any contact that is not in that list is a
//    ghost (its touchend was swallowed by the OS / host app) and is dropped.
// 3. A contact follows the finger: sliding from the left half to the right
//    half switches direction, sliding off a button releases it, sliding back
//    re-engages it.
// 4. Pause, blur, backgrounding and rotation clear every contact. A finger
//    that is still down afterwards must be lifted and pressed again.
// 5. Last resort for in-app browsers: a contact that no touch event has
//    mentioned for `staleMs` is set aside (released). A finger that really is
//    still down reports itself with its next tiny movement and is re-attached
//    at once, so a false release lasts a frame; a true ghost cannot outlive
//    the timeout even if no other touch ever arrives.
// 6. Holding both halves steers toward the half touched most recently, so a
//    quick tap on the other side corrects without lifting the first thumb.

export const CONTROLS = ["left", "right", "drift", "gas"];
const GROUP = { left: "steer", right: "steer", drift: "drift", gas: "gas" };

export class ControlState {
  constructor() {
    this.contacts = new Map(); // id -> { control, group, kind } in press order
  }
  press(id, control, kind = "touch") {
    if (!GROUP[control]) return false;
    this.contacts.delete(id); // re-insert: the newest press is last
    this.contacts.set(id, { control, group: GROUP[control], kind });
    return true;
  }
  // Re-target an existing contact. `control` may be null (finger is off every
  // control of its group); the contact stays tracked so sliding back works.
  move(id, control) {
    const c = this.contacts.get(id);
    if (!c) return false;
    const next = control && GROUP[control] === c.group ? control : null;
    if (next === c.control) return false;
    c.control = next;
    if (next) {
      // Moving onto a control counts as the newest press of its group.
      this.contacts.delete(id);
      this.contacts.set(id, c);
    }
    return true;
  }
  release(id) {
    return this.contacts.delete(id);
  }
  // Drop contacts of `kind` whose id is not among the live ids.
  reconcile(kind, liveIds) {
    let changed = false;
    for (const [id, c] of this.contacts)
      if (c.kind === kind && !liveIds.has(id)) {
        this.contacts.delete(id);
        changed = true;
      }
    return changed;
  }
  clear() {
    const had = this.contacts.size > 0;
    this.contacts.clear();
    return had;
  }
  // Steering reports only the newest held direction; other groups report any.
  pressed(control) {
    if (GROUP[control] === "steer") {
      let last = null;
      for (const c of this.contacts.values()) if (c.group === "steer" && c.control) last = c.control;
      return last === control;
    }
    for (const c of this.contacts.values()) if (c.control === control) return true;
    return false;
  }
  snapshot() {
    const s = {};
    for (const k of CONTROLS) s[k] = this.pressed(k);
    return s;
  }
}

// Pick the control under (x, y). Rects are {left, top, right, bottom, zone}.
// Buttons win over zones: a button counts while the finger is within
// `margin` px of it (a little more for drift / gas), and the nearest button
// centre wins; zones (the steering halves) count only strictly inside.
export function hitControl(rects, x, y, group = null, margin = 12) {
  let best = null,
    bestDistance = Infinity;
  for (const [control, r] of Object.entries(rects)) {
    if (!r || r.zone || (group && GROUP[control] !== group)) continue;
    const m = GROUP[control] === "steer" ? margin : margin + 14;
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
    const d = (x - (r.left + r.right) / 2) ** 2 + (y - (r.top + r.bottom) / 2) ** 2;
    if (d < bestDistance) {
      best = control;
      bestDistance = d;
    }
  }
  if (best) return best;
  for (const [control, r] of Object.entries(rects)) {
    if (!r || !r.zone || (group && GROUP[control] !== group)) continue;
    if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return control;
  }
  return null;
}

// Wire the state to the DOM. `buttons` maps control -> element; elements with
// the class "zone" are steering zones.
export function bindTouchControls({
  root,
  buttons,
  isActive,
  onChange,
  onItem,
  itemButton,
  onSpecial,
  specialButton,
  win = window,
  staleMs = 4000,
}) {
  const state = new ControlState();
  const doc = win.document;
  const hasTouchEvents = "ontouchstart" in win;
  const now = () => win.performance.now();
  const rects = () => {
    const out = {};
    for (const [k, el] of Object.entries(buttons)) {
      if (!el || el.offsetParent === null) continue; // hidden controls cannot be hit
      const b = el.getBoundingClientRect();
      out[k] = { left: b.left, top: b.top, right: b.right, bottom: b.bottom, zone: el.classList.contains("zone") };
    }
    return out;
  };
  const sync = () => {
    for (const [k, el] of Object.entries(buttons)) el?.classList.toggle("pressed", state.pressed(k));
    onChange?.(state.snapshot());
  };
  const changed = (did) => {
    if (did) sync();
  };
  const seen = new Map(), // touch id -> last time any touch event listed it
    dormant = new Map(); // touch id -> group, set aside by the watchdog
  const liveTouchIds = (e) => {
    const ids = new Set(),
      t = now();
    for (const touch of e.touches) {
      const id = "t" + touch.identifier;
      ids.add(id);
      seen.set(id, t);
    }
    for (const id of dormant.keys()) if (!ids.has(id)) dormant.delete(id);
    for (const id of seen.keys()) if (!ids.has(id) && !state.contacts.has(id)) seen.delete(id);
    return ids;
  };
  const controlRoot = root || doc.body;

  if (hasTouchEvents) {
    // Fingers that begin on a driving control.
    controlRoot.addEventListener(
      "touchstart",
      (e) => {
        let did = state.reconcile("touch", liveTouchIds(e));
        if (!isActive()) return changed(did);
        const r = rects();
        for (const t of e.changedTouches) {
          const control = hitControl(r, t.clientX, t.clientY);
          if (!control) continue;
          // preventDefault stops scrolling, zoom, callouts and the synthetic
          // mouse/click sequence that iOS would otherwise send afterwards.
          if (e.cancelable) e.preventDefault();
          dormant.delete("t" + t.identifier);
          did = state.press("t" + t.identifier, control, "touch") || did;
        }
        changed(did);
      },
      { passive: false },
    );
    // Moves and ends are observed on the window so nothing depends on which
    // element the browser decides to deliver them to.
    win.addEventListener(
      "touchmove",
      (e) => {
        let did = state.reconcile("touch", liveTouchIds(e));
        const r = state.contacts.size || dormant.size ? rects() : null;
        for (const t of e.changedTouches) {
          const id = "t" + t.identifier,
            c = state.contacts.get(id);
          if (c) did = state.move(id, hitControl(r, t.clientX, t.clientY, c.group)) || did;
          else if (dormant.has(id) && isActive()) {
            // A finger the watchdog set aside is still down: re-attach it.
            const group = dormant.get(id),
              control = hitControl(r, t.clientX, t.clientY, group);
            dormant.delete(id);
            if (control) did = state.press(id, control, "touch") || did;
          }
        }
        changed(did);
      },
      { passive: true },
    );
    const end = (e) => {
      let did = false;
      for (const t of e.changedTouches) {
        did = state.release("t" + t.identifier) || did;
        dormant.delete("t" + t.identifier);
      }
      did = state.reconcile("touch", liveTouchIds(e)) || did;
      changed(did);
    };
    win.addEventListener("touchend", end, { passive: true });
    win.addEventListener("touchcancel", end, { passive: true });
    // Any touch anywhere on the page also heals ghost contacts.
    win.addEventListener("touchstart", (e) => changed(state.reconcile("touch", liveTouchIds(e))), {
      passive: true,
      capture: true,
    });
    // Watchdog (rule 5).
    win.setInterval(() => {
      const t = now();
      let did = false;
      for (const [id, c] of state.contacts)
        if (c.kind === "touch" && t - (seen.get(id) ?? t) > staleMs) {
          state.release(id);
          dormant.set(id, c.group);
          did = true;
        }
      changed(did);
    }, 250);
  }

  // Mouse / pen (and touch on browsers without Touch Events).
  for (const [control, el] of Object.entries(buttons)) {
    if (!el) continue;
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" && hasTouchEvents) return;
      if (!isActive()) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      changed(state.press("p" + e.pointerId, control, "pointer"));
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  win.addEventListener("pointermove", (e) => {
    const c = state.contacts.get("p" + e.pointerId);
    if (c) changed(state.move("p" + e.pointerId, hitControl(rects(), e.clientX, e.clientY, c.group)));
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    win.addEventListener(type, (e) => changed(state.release("p" + e.pointerId)), true);

  // Item and special: fire on the first touch / press, not on click. iOS may
  // not deliver a click for a tap made while another finger is steering.
  const tapButton = (button, onPress) => {
    if (!button) return;
    let lastFast = -1e9;
    const fast = (e) => {
      if (e.type === "pointerdown" && e.pointerType === "touch" && hasTouchEvents) return;
      if (e.cancelable) e.preventDefault();
      lastFast = now();
      onPress?.();
    };
    if (hasTouchEvents) button.addEventListener("touchstart", fast, { passive: false });
    button.addEventListener("pointerdown", fast);
    // Keyboard activation (Enter / Space on the focused button) still works.
    button.addEventListener("click", () => {
      if (now() - lastFast > 700) onPress?.();
    });
  };
  tapButton(itemButton, onItem);
  tapButton(specialButton, onSpecial);

  return {
    state,
    clear() {
      state.clear();
      dormant.clear();
      sync();
    },
    sync,
  };
}
