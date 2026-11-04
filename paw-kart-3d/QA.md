# v2 Verification — 2026-11-03

## Scope and recovery
The unpublished v2 working copy was removed by automatic workspace maintenance. It was restored from v1 and the exact implementation/tool records. The restored source passed the same 18 tests again; final normal-speed browser verification is recorded below. The original GitHub dog game is untouched.

## Automated checks
18 deterministic tests cover all three tracks and difficulties through complete races; screen-space steering; stationary manual control; swept pickups/projectiles; sustained rail pressure; coincident-car separation; off-track rescue; drift cancellation; wraparound shell targeting; shield/banana behavior; and 30 seeded mixed-input stress runs (72,000 steps). Syntax and self-contained asset/module checks are also required before packaging.

## Browser evidence from this v2 implementation (before workspace cleanup)
- 390×844 portrait and 844×390 landscape inspected through the real browser UI using the CPU fallback, because the QA browser disables WebGL.
- Right held: lane -3.551 to +1.548. Left + Shift held: lane to -1.406. Released drift: count 1, steer -0.000; clear button state.
- Pause/settings preserved the timer exactly at 00:09.066. Resume countdown and orientation-triggered pause worked.
- Manual-gas portrait six control rectangles: pause 44×44, steering 58×62 each, gas 58×58, drift 67×67, item 86×91. No overlap. Landscape all six also nonoverlapping, minimum 44×44.
- Full three-round cup completed through real UI with temporary local 24× simulation: points 8 → 10 → 14. Final placement 7; total points 174; tie broken by last-race placing; return to garage verified.
- Result dialog scrollTop 0 (height 365, scrollHeight 705), title visible at opening.
- Temporary speed modification removed; production uses accum += dt and at most 15 fixed steps/frame.

## Limits
Physical iPhone Safari, real simultaneous fingers, WebGL GPU frame rate, thermal behavior, and speaker audio remain unverified. CPU browser screenshots do not certify GPU visual fidelity. This is a private fan project, not a pixel-identical commercial Mario Kart clone or a commercially cleared release.

## Final restored-source browser verification
- Loaded all eight character previews; normal-speed race through second lap, no temporary speed multiplier.
- Naturally acquired a star from an item box at race time 00:29.016. Clicked Use Star: HUD item cleared immediately, itemsUsed became exactly 1, and status showed 5.0 seconds of invincibility. Continued racing at 156 km/h with visible gold protection rings.
- No application runtime errors were observed after fallback initialization; WebGL-disabled and browser-extension diagnostics are environment limitations.
- Screenshot: `docs/paw-kart-v2-verified-20261103.jpg`.
- All local imports resolve (query strings removed for filesystem validation), five GLBs have embedded images and four wheels, syntax passes, production fixed timestep confirmed.

---

# v2.1 Verification — 2026-11-03

Branch `fix/paw-kart-v2-controls-nitro-camera-drivers`, based on the V2 import (`0a2b864`). Media in `docs/qa-2.1/`.

## Test environment (all in a Linux container; no phone)

- Google Chrome for Testing 153 driven by playwright-core 1.64 through the DevTools protocol. Touches go through Chrome's own touch pipeline (`Input.dispatchTouchEvent`): real hit testing, pointer capture and event order.
- Two renderers: **WebGL 2 on SwiftShader** (CPU emulation, ~1 fps) for visual stills and a virtual-time clip; the game's **compatibility renderer** (~10 fps, game time runs at real speed) for normal-speed play.
- Phone viewports: 844×390 landscape and 390×844 portrait, `isMobile` + touch.
- V2 reference: the same tests run against a checkout of `0a2b864` (`PAWKART_URL=…`, `RACE_JS=…`).

## Automated

| Suite | This build | V2 |
|---|---|---|
| `npm test` (26: V2's 18 + 4 input + 4 continuity) | 26/26 pass | continuity: 3 of 4 fail |
| `npm run test:e2e` controls (8) | 8/8 pass | fails "lift never heard → next touch heals" and "slide off releases" |
| `npm run test:e2e` motion (2) | 2/2 pass | both fail |

Measured numbers behind those tests:

- Player in contact with an AI: **18.6 % of physics steps → under 3 %** (≈1.1 % in the 12-race sweep). AI rear-ending the player: 369 steps → ~15.
- Worst single-step correction: 0.44 m sideways / 0.40 m along-track → 0.24 m (including normal lateral travel) / under 0.15 m. Worst one-step speed change outside item hits: 31.9 m/s → under 12 m/s.
- Player's on-screen jerk with ~1/3 of frames dropped at random: **p95 0.025–0.031 → ~0.001** (NDC units, 3 runs each).
- Nearby karts popping back into view: V2 > 0, this build 0.

## Normal-speed play through the real UI

A script read the race state but drove only by touching the on-screen ‹ › / 漂移 / 道具 buttons (compatibility renderer, real-time game clock).

| Run | Result |
|---|---|
| 844×390, 桃桃兔, 花田晴空环线 | 3 laps in 73.2 s (wall clock matched), 12 drift boosts, 4 items, 14 player overtakes, 0 pop-ins, no lit/held key after the last lift; result buttons on screen; 返回车库 OK |
| 390×844, 小白, 星光云端公路 | 72.7 s, 14 drift boosts, 7 items, 19 overtakes, 0 pop-ins; result buttons on screen (bottom 740 of 844); 返回车库 OK |
| 844×390, 薄荷熊, 三站杯赛 | three tracks in order via 下一站, cup final 45 pts, standings shown, 返回车库 OK, no application console errors |

Found and fixed during play: on a landscape phone the result dialog was taller than the screen and 再来一场 / 下一站 / 返回车库 were below the fold. They now stick to the bottom of the dialog.

## Visual checks (WebGL)

- `tools/inspect.html`: 小金毛, 小白, 桃桃兔, 薄荷熊, 星星队长, 泡泡探险家 from front, ¾ and side (`drivers-front-3q-side.jpg`, `dogs-hands-on-wheel.jpg`).
- Flames for drift tiers, mushroom, star from chase and rear-¾ views (`nitro-types.jpg`), V2 vs now (`nitro-before-after.jpg`), portrait (`portrait-boost-webgl.jpg`).
- `nitro-drift-demo.mp4`: 5 s rendered on virtual time (each frame exactly 1/30 s): cruise → drift (yaw, sparks, charge) → release with twin flames, speed streaks, camera ease-back → pad boost.

## Not verified — needs an iPhone

- The original embedded entry (ChatGPT Sites page inside the app): not reachable from this environment.
- Real two-finger feel, iOS-specific touch delivery (the ghost-lift test injects the fault; it cannot reproduce the iOS trigger itself), Safari pinch/edge gestures.
- GPU frame rate, heat and battery: SwiftShader timings say nothing about an iPhone GPU. New per-frame costs: the screen-door dither shader on fading karts, one point light, flame billboards.
- Sound by ear (new boost whoosh and bump thud are code-checked only).
- 马里奥 / 哆啦A梦 models were not changed.

## Known risks

- AIs now avoid the player and only mini-turbo in real corners; in the scripted runs the player won some 100cc races by several seconds. Difficulty may need retuning after human play.
- The camera framing (distance, height, FOV) was tuned on screenshots, not by hand on a phone.

## v2.1 round 2 — review, six items, UI audit (2026-11-03)

Build `bf2094ff` (shown at the bottom of the pause and help dialogs).

**Review fixes**: only a real rotation pauses (Safari/in-app toolbar resizes no longer pause or snap the camera); every race shader is compiled during the countdown instead of on the first boost; auto quality ignores one-off stalls and needs two slow 4-second windows before dropping to low; pause reacts on touch release while another finger steers; karts stop animating during the resume countdown; item-box bobbing and the minimap outline are cached instead of recomputed every frame.

**Six items** — `tests/items.test.js` (9) and `tests/e2e/items.test.js` (7, through the real item button):

| Item | Checked | Fixed |
|---|---|---|
| 🍄 冲刺蘑菇 | used once, slot empties, 2.5 s, orange flames, boost status | — |
| 🐢 追踪红壳 | targets nearest kart ahead, hits once, warning when incoming | player now told "命中 …" + burst + sound |
| 🍌 捣蛋香蕉 | dropped behind, spares owner, spins next kart once | AI dodges (≈53 / 78 / 98 % on 50 / 100 / 150cc); burst + hit feedback |
| 🫧 泡泡护盾 | 6 s, absorbs exactly one hit | — |
| ⭐ 无敌星星 | 5 s immunity, clears stun/shrink, rams knock karts over | hit feedback for rams |
| ⚡ 惊喜闪电 | shrinks/stuns karts ahead 3 s, shields block, spares those behind | screen flash + zap; shrink/regrow animate |
| ? 道具箱 | swept pickup at 60 m/s, roulette, 3 s respawn | box bursts when taken |

**UI audit** at 375×667, 390×844, 430×932 in both orientations (overlap / off-screen / touch-target / clipped-text checks + screenshots of home, help, settings, countdown, race HUD, pause, results). Fixed: home mode tabs and difficulty picker 25–32 px → 44 px; help/settings primary button below the fold in landscape → sticky; 44 px volume slider and quality picker, larger checkboxes, compact landscape settings; drift meter overlapping the speed on small landscape phones; compact landscape results. Accepted: landscape settings need a small scroll to reach 画面质量; landscape results scroll for the full standings (buttons stay on screen); checkboxes sit in full-row labels, so the tap target is the whole row.

**Cache-safe build**: `npm run stamp` stamps every local module and the stylesheet with a content hash; `tests/build.test.js` fails if it is stale.

**Totals**: `npm test` 36/36, `npm run test:e2e` 17/17. Normal-speed playthroughs through the real touch UI on this build: 844×390 桃桃兔 蜜桃糖果海湾 (3rd, 14 drift boosts, 12 items), 390×844 小金毛 花田晴空环线 (3rd, 13 boosts, 8 items), full cup with 泡泡探险家 (2nd / 6th / 4th → cup 3rd); 0 pop-ins, no held key after the last lift, result buttons on screen, back to garage, no application errors.

# v2.2 Verification — 2026-11-03

Build id is shown at the bottom of the pause and help dialogs ("版本 2.2 · <id>"). Same container environment as v2.1 (headless Chrome; no phone).

## What changed and how it was checked

| Area | Change | Evidence |
|---|---|---|
| Touch steering | Left / right halves of the screen steer; newest touch wins when both are held; drift and item are separate big buttons; countdown / banners no longer swallow touches | `tests/input.test.js` (5), `tests/e2e/controls.test.js` (13: any point on a half, both halves, drift never steers, slide off / back / across, lost lift, cancel, pause, background, rotation, mouse) |
| Lost-lift watchdog | A touch no event has mentioned for 4 s is released; a finger that is really still down re-attaches on its next move | e2e: lost lift with no other touch → released after 4 s; still finger → steering again on the next move |
| Item boxes | 6 rows × 5 boxes span the road; per-racer availability; odds weighted by distance behind; rocket only far behind | `tests/v22.test.js`: every line from lane −7.5 to 7.5 collects; a box the kart ahead took is still there; leader vs far-behind odds. Simulation (45 races, 100cc): 18 pickups per race for the player (every row) |
| AI items | AI hold items 3–9 s | Simulation with a banana-dodging bot, 15 races: player hit 2.67 times per race (4.00 before this tuning) |
| Drift boost | Tiers 1/2/3: kick 3.5 / 5 / 7 m/s, boost 1.0 / 1.6 / 2.3 s, glide back after; charge faster when steering in; MK-style committed drift line | `tests/v22.test.js`: each tier's kick and duration, one cue per tier, still +4 m/s over a non-boosted twin 0.5 s after the boost ends |
| Auto-drift | Holding one direction ≥ 0.28 s in a bend (curvature > 0.008) drifts; letting go boosts; off on straights, against the bend, or when disabled | `tests/v22.test.js` (both directions, straight, opposite, off) |
| Rocket start | Hold drift / gas when "1" shows: ≤ 0.45 s perfect, ≤ 1.0 s good, earlier = no boost | `tests/v22.test.js` (perfect / good / early / none / re-press) |
| Rocket item | Autopilot to the middle, 1.62× speed, immune, knocks karts aside without being slowed | `tests/v22.test.js`, `tests/e2e/items.test.js` (banner, status, flames) |
| Contact | Star / rocket plough through (no positional correction or speed exchange) | `tests/continuity.test.js` unchanged limits (no jumps; plain rear-ends < 60 steps) |
| Privacy | Generic guard: e-mails, phone numbers, tokens, home paths, personal-site and account links, image/video metadata | `tests/privacy.test.js` (2); planted fake data was caught, then removed |

Totals: `npm test` 49/49, `npm run test:e2e` 23/23 (screen jerk p95 ≈ 0.0013, worst ≈ 0.0025; 0 pop-ins).

## Normal-speed play through the real touch UI (compatibility renderer, real time)

Bot steering only by touching the screen halves, using every item through the item button, rocket start by holding the drift button:

| Viewport | Track / class | Start | Items | Drift boosts | Hit | Result |
|---|---|---|---|---|---|---|
| 844×390 | 花田晴空环线 100cc | good start | 18 | 14 | 2 | 1st, 59.7 s |
| 390×844 | 蜜桃糖果海湾 100cc | perfect start | 18 | 16 | 4 | 1st, 65.5 s |
| 844×390 | 星光云端公路 150cc | (pressed late) | 18 | 15 | 2 | 4th, 60.6 s |

Result dialog reached every time; no page errors.

## Visual checks (WebGL, SwiftShader)

`docs/qa-2.2/`: controls coaching in portrait, purple drift sparks and flames, boost with the rainbow item row, driver expressions (neutral / happy / dizzy / focused / cheering) and dizzy stars after a hit. Screenshots keep the two licensed-character karts out of frame.

## Not verified — needs an iPhone

Real touch feel of the half-screen steering and the watchdog inside the in-app browser; music and effect mix on the phone speaker (the synthesis was only checked to run without errors); frame rate and heat with the new sky, ranges, crowd and road texture.

# v2.3 Verification — 2026-11-04

Build id at the bottom of the pause / help dialogs ("版本 2.3 · <id>"). Same container environment (headless Chrome 153; no phone).

## Findings fixed in this round

| Problem | Cause | Fix | Evidence |
|---|---|---|---|
| Drifting felt pointless; plain steering took every bend | Bends barely pushed karts wide (0.012·κ·v²), the assist held any line | Outward push κ·v²·0.098 (capped 8.5 m/s), drift grips better (push ×0.6), no corner slowdown while drifting | `tests/v23.test.js` hairpin: drift faster than steering; 27-race simulation (100cc): always-drift bot 58.2 s / rank 1.2, steering-only 65.4 s / rank 3.0, no input 67.6 s / rank 4.6 |
| Touch drift "awkward" | v2.2 auto-drift fired when steering *out* of a bend (sign error); AI drift pose pointed the nose outward | Inside of a bend is −sign(curvature); one-thumb drift (start by holding into the bend or a tap on 漂移, hold the direction to keep it) | `tests/v22.test.js` / `tests/v23.test.js` direction tests |
| Driving through a box sometimes did nothing ("passing through") | With an item held the box stayed and was ignored | Two slots; a box always breaks on contact (`boxBreak` when both slots are full) | `tests/v23.test.js`, `tests/e2e/items.test.js` (badge, slot moves up) |
| Karts overlapping under star / rocket | v2.2 ghosted those contacts | The victim is knocked and pushed out (once per step, ≤ 0.09 m) | `tests/continuity.test.js` |
| Near-camera karts flickering in the CPU renderer | The fade value was recomputed from 1 every frame | Persist the eased value | `tests/e2e/motion.test.js` (pop-ins now also exclude the intended fade) |
| Game failed to load on iOS before 16.4 | `DecompressionStream` missing | `dist/inflate.js` gunzip fallback | `tests/inflate.test.js` (byte-identical to zlib on the shipped archive; stored / fixed / dynamic blocks); page loads with `DecompressionStream` deleted |
| ~900 draw calls per frame | Scenery batched per colour per 35 m tile; boxes 6 meshes each, coins 2 each; every tiny kart part cast a shadow | Vertex-colour batches per 90 m tile, instanced boxes and coins, no shadows for parts < 0.14 m | WebGL `renderer.info`: 865–911 → 410–413 calls per frame on all three tracks |

## Specials (必杀技)

Each of the eight checked in `tests/v23.test.js` (13 tests): triple dash, instant purple drifts for 8 s, two items, three fireballs (one knocks the kart in line), airborne over karts and bananas, homing ram, meteors on the three nearest karts ahead only, a bubble that absorbs two hits. Gauge: drift tiers 6 / 9 / 13, coin 5, landed hit 12, being hit 10, 1.2 per second, AI ×0.45. AI attacks aimed at the player fire on a difficulty roll (30 / 50 / 70 %) and are otherwise kept for another victim: about 3–5 hits on the player per race in simulation (always-drift bot, 100cc), 3 specials per race for the player.

## Mobile layout audit (emulated safe areas)

Chrome's `Emulation.setSafeAreaInsetsOverride` with real inset values, portrait and landscape, home / race HUD / pause / settings: iPhone 14 Pro Max (59 / 34 portrait, 59 / 59 / 21 landscape), 16 Pro Max, 15, 13 mini, SE, Pixel 7, 360-wide Android, iPad mini, iPad Air. Checks: every control inside the safe area, no overlapping controls, buttons ≥ 44 px. Fixed: drift meter vs drift button (portrait), minimap vs item frame (SE), minimap and home setup panel inside the notch side (landscape), iPad landscape drift button off the bottom edge. Result: no issues left (the horizontally scrolling driver strip is excluded by design). `docs/qa-2.3/hud-iphone-14-pro-max.jpg` shows both orientations with the Dynamic Island / home-bar insets.

## Tests and play

`npm test` 64/64, `npm run test:e2e` 25/25 (screen acceleration p95 ≈ 0.18 NDC/s²; the same test measures V2 at ≈ 2). Real-time touch playthroughs to the results screen with item and special buttons: 430×932 花田晴空环线 100cc (1st, 21 items, 3 specials, 11 drift boosts), 932×430 蜜桃糖果海湾 100cc (1st, 21 items, 3 specials, 15 drift boosts), 932×430 星光云端公路 150cc on the final build, after raising the 150cc AI pace (4th, 19 items, 2 specials, 8 drift boosts); no page errors.

## Not verified — needs a real phone

Touch feel of one-thumb drifting and the button positions on the 14 Pro Max; sound on the phone speaker; frame rate and heat (draw calls are now ~410 per frame).
