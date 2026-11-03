// Touch / mouse control state for the on-screen driving buttons.
//
// Design rules (each one closes a way V2 could leave a key "stuck"):
// 1. A control is pressed if and only if some live contact currently holds it.
//    Nothing is cached per button, so a release that arrives anywhere always
//    clears the visual and the steering state together.
// 2. Every touch event carries the browser's list of fingers still on the
//    screen (TouchEvent.touches). Any contact that is not in that list is a
//    ghost (its touchend was swallowed by the OS / host app) and is dropped.
// 3. A contact follows the finger: sliding from ‹ to › switches direction,
//    sliding off a button releases it, sliding back re-engages it.
// 4. Pause, blur, backgrounding and rotation clear every contact. A finger
//    that is still down afterwards must be lifted and pressed again.

export const CONTROLS = ["left", "right", "drift", "gas"];
const GROUP = { left: "steer", right: "steer", drift: "drift", gas: "gas" };

export class ControlState {
  constructor() {
    this.contacts = new Map(); // id -> { control, group, kind }
  }
  press(id, control, kind = "touch") {
    if (!GROUP[control]) return false;
    this.contacts.set(id, { control, group: GROUP[control], kind });
    return true;
  }
  // Re-target an existing contact. `control` may be null (finger is off every
  // button of its group); the contact stays tracked so sliding back works.
  move(id, control) {
    const c = this.contacts.get(id);
    if (!c) return false;
    const next = control && GROUP[control] === c.group ? control : null;
    if (next === c.control) return false;
    c.control = next;
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
  pressed(control) {
    for (const c of this.contacts.values()) if (c.control === control) return true;
    return false;
  }
  snapshot() {
    const s = {};
    for (const k of CONTROLS) s[k] = this.pressed(k);
    return s;
  }
}

// Pick the control under (x, y). Rects are DOMRect-like {left,top,right,bottom}.
// The finger may drift `margin` px outside a button and still hold it; when two
// steering buttons both qualify, the nearer centre wins.
export function hitControl(rects, x, y, group = null, margin = 18) {
  let best = null,
    bestDistance = Infinity;
  for (const [control, r] of Object.entries(rects)) {
    if (!r || (group && GROUP[control] !== group)) continue;
    const m = GROUP[control] === "steer" ? margin : margin + 10;
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
    const cx = (r.left + r.right) / 2,
      cy = (r.top + r.bottom) / 2,
      d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < bestDistance) {
      best = control;
      bestDistance = d;
    }
  }
  return best;
}

// Wire the state to the DOM. `buttons` maps control -> element.
export function bindTouchControls({ root, buttons, isActive, onChange, onItem, itemButton, win = window }) {
  const state = new ControlState();
  const doc = win.document;
  const hasTouchEvents = "ontouchstart" in win;
  const rects = () => {
    const out = {};
    for (const [k, el] of Object.entries(buttons)) {
      if (!el || el.offsetParent === null) continue; // hidden buttons cannot be hit
      out[k] = el.getBoundingClientRect();
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
  const liveTouchIds = (e) => new Set([...e.touches].map((t) => "t" + t.identifier));
  const controlRoot = root || doc.body;

  if (hasTouchEvents) {
    // Fingers that begin on a driving button.
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
        if (state.contacts.size) {
          const r = rects();
          for (const t of e.changedTouches) {
            const c = state.contacts.get("t" + t.identifier);
            if (c) did = state.move("t" + t.identifier, hitControl(r, t.clientX, t.clientY, c.group)) || did;
          }
        }
        changed(did);
      },
      { passive: true },
    );
    const end = (e) => {
      let did = false;
      for (const t of e.changedTouches) did = state.release("t" + t.identifier) || did;
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

  // Item: fire on the first touch / press, not on click. iOS may not deliver a
  // click for a tap made while another finger is steering.
  if (itemButton) {
    let lastFast = -1e9;
    const fast = (e) => {
      if (e.type === "pointerdown" && e.pointerType === "touch" && hasTouchEvents) return;
      if (e.cancelable) e.preventDefault();
      lastFast = performance.now();
      onItem?.();
    };
    if (hasTouchEvents) itemButton.addEventListener("touchstart", fast, { passive: false });
    itemButton.addEventListener("pointerdown", fast);
    // Keyboard activation (Enter / Space on the focused button) still works.
    itemButton.addEventListener("click", () => {
      if (performance.now() - lastFast > 700) onItem?.();
    });
  }

  return {
    state,
    clear() {
      state.clear();
      sync();
    },
    sync,
  };
}
