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

# v2.4 Verification — 2026-11-04

Build id at the bottom of the pause / help dialogs ("版本 2.4 · <id>"). Same container environment (headless Chrome 153, CPU renderer for the regression tests, SwiftShader WebGL for screenshots; no phone).

## What changed and how it was checked

| Request | Change | Evidence |
|---|---|---|
| Special button hard to notice | Round 92–96 px button with a charge ring in the driver's colour; when full it brightens, the ring spins, the label reads 放必杀！; a coaching bubble points at it the first few times | `tests/e2e/items.test.js` (gauge text, fires only when full, cut-in), `tests/e2e/v24.test.js` (bubble shown when first ready) |
| Specials fired blindly | Attack specials (流星雨, 熊抱冲撞, 火球连发) mark their targets with red reticles over the karts and on the map, plus a lock count on the button; 流星雨 / 火球 with nobody ahead, or 四次元口袋 with both item slots full, are held back with a message instead of being wasted | `tests/v24.test.js` (targets are exactly the karts the special hits; wasted cases), `tests/e2e/v24.test.js` (Nova with two karts ahead: a reticle over each and "🎯 2"; nobody ahead → 前方没人, tap does nothing; someone ahead → fires) |
| Map in a top corner; distance to the finish; where everyone is | Map panel top right: chequered finish line, direction arrows, player arrow, rivals in their colours (within 30 m outlined); a whole-race progress strip with a marker per racer; 距终点 X km / m. Canvas drawn at device resolution; the static track layer is cached; touches pass through to steering | `tests/e2e/v24.test.js`: inside the iPhone 14 Pro Max safe area in both orientations, no overlap with pause / item / special / drift / rank, canvas backed at device pixels, 8 progress markers, marker at 50 % and distance within 40 m of the truth at mid-race, a touch on the map still steers right |
| Overtaken without warning | Rear radar: karts within 25 m behind show as a chip in their colour on their side, with the distance (pulsing within 8 m; same-side chips stack) | `tests/e2e/v24.test.js`: right / left side follows the rival's lane, nothing shown for a kart 60 m back |
| Speed race (竞速赛) | Third mode on the home screen (remembered). No boxes, coins or specials; drifting fills a nitro gauge (32 / s while drifting plus 6 / 10 / 15 on release), up to two charges, the item frame becomes the N₂O button (Space on a keyboard), 2.3 s boost; AI use nitro on straights. Separate best times (`speed-<track>-<class>`); results show nitro / slipstream counts | `tests/v24.test.js` (rules, gauge, two charges, AI use nitro on all tracks, everyone finishes), `tests/e2e/v24.test.js` (mode, hidden special / coins, N₂O button fires exactly the stored charges, results text, record key, home screen remembers the mode) |
| Slipstream (both modes) | 3.5–16 m behind a kart within 1.8 m of its line for 1.1 s → 1 s boost; wind streaks and a charge readout while tucked in | `tests/v24.test.js` |
| — | Two boosts in the same physics step give one speed kick (no 13 m/s jumps). The bear's ram (marked as a lock-on) now always connects: it locks the nearest kart within 60 m, chases until it lands (at most 4.5 s, at least 18 m/s faster than the target) and a hug reaches 2.9 m sideways. Before, a target boosting away from 40 m was missed: the bear arrived 1.3–2.3 m to its side at 64 m/s and passed it | `tests/v24.test.js` (targets 25 / 45 / 58 m ahead while boosting: rammed within 4.5 s, the charge ends on contact; no target: plain 3 s dash) |

## Balance (simulation, 9–15 races per row, three tracks)

Bots as in v2.3 (always-drift = holds into every bend, which is what auto-drift does on a phone). Item race 100cc: always-drift 1st on average, steering-only 3.6; 150cc: 3.0 / 6.8. Speed race 100cc: always-drift 1.2, 7–8 nitros per race (AI 4–5). 150cc speed race at the item-race AI pace put the always-drift bot 6.7th with no wins, because nothing slows the leaders without items; 150cc speed-race AI pace is now 1.015 (item races keep 1.07): always-drift 2.8th on average, 2 wins in 15. Steering-only finishes last in speed races at 100cc: drifting is the point of that mode. Final build (after the bear change): item race always-drift 1.2 (100cc) / 2.7 (150cc), 2.7–3.9 hits on the player per race; speed race 1.2 / 3.0.

## Mobile layout audit (emulated safe areas)

Chrome's `Emulation.setSafeAreaInsetsOverride` with real inset values, portrait and landscape: iPhone 14 Pro Max, 16 Pro Max, 15, 13 mini, SE, Pixel 7, 360-wide Android, iPad mini, iPad Air. Screens checked: home (three race modes), item race HUD with the special ready (coaching bubble and lock badge showing) and karts behind (radar chips), pause, speed race HUD (two nitro charges), settings. Checks: every control and panel inside the safe area, no overlaps, buttons ≥ 44 px. Fixed on the way: speed readout vs drift meter (narrow portrait phones), radar vs speed readout (SE), status line vs drift meter (portrait) and vs radar (landscape), N₂O badge in the notch side (13 mini landscape), coaching bubble off screen (iPad landscape), toasts over the map and the coin readout (portrait), radar chips under the bottom-right buttons (desktop). Result: no issues left on any device. Desktop (1024–1440 wide): map top right, item and special bottom right, radar under the kart. `docs/qa-2.4/hud-iphone-14-pro-max.jpg` (item race: lock-on, map, radar) and `docs/qa-2.4/speed-race.jpg` (N₂O button, slipstream) were taken with WebGL at 14 Pro Max sizes; the two licensed-character karts were checked to be off screen.

## Tests and play

`npm test` 71/71, `npm run test:e2e` 31/31 on the final build (screen acceleration p95 0.12, worst 0.17 NDC/s²). The jitter test now clears the boost pads and waits for any running boost to end before measuring: with v2.4's slipstream off the start the player sometimes reached the first pad inside the window, and the pad's FOV punch (unchanged since v2.2; v2.3 measures the same 2.6–3.2 when a pad is forced into the window) read as jitter. Six repeats afterwards: p95 0.08–0.12. Real-time touch playthroughs to the results screen on the final build: 430×932 星光云端公路 150cc speed race with 小白 (5th, 57.4 s, 10 nitros, 18 drift boosts, 1 slipstream; AI 5–6 nitros each) and 932×430 花田晴空环线 100cc item race with 薄荷熊 (1st, 53.6 s, 20 items, 3 rams, 11 drift boosts, hit twice). Earlier builds: 430×932 花田晴空环线 100cc speed race (1st, 8 nitros) and 932×430 蜜桃糖果海湾 100cc item race with 星星队长 (1st, 3 specials, all fired with targets ahead). No page errors in any run.

## Not verified — needs a real phone

Readability of the map and radar at arm's length on the 14 Pro Max; touch feel of the round special button and the N₂O button; sound; frame rate and heat with the map redrawn up to 30 times a second (it copies a cached track layer and draws only the dots).

# v2.5 Verification — 2026-11-04

Build id at the bottom of the pause / help dialogs ("版本 2.5 · <id>"). Same container environment (headless Chrome, CPU renderer for the regression tests, SwiftShader WebGL for screenshots and draw-call counts; no phone).

## What changed and how it was checked

| Request | Change | Evidence |
|---|---|---|
| Tap the screen at zero for a start boost (KartRider) | The latest press counts, not a hold through GO. Any touch on the steering halves or the drift button (↑ / Space / Shift on a keyboard). Perfect within 0.3 s before GO or 0.12 s after; good from 0.9 s before to 0.35 s after; earlier, or held from earlier, is no boost and a "按早啦" toast. A tap is latched until the next physics step, so a quick tap between two frames on a slow phone is not lost. In the last 0.9 s a yellow "就是现在！" hint replaces the steering labels | `tests/v25.test.js` (tap 0.2 s before → perfect with its own flames; 0.6 s → good; 0.04 s after → perfect; 0.25 s after → good; 0.5 s after → nothing; early tap → no boost + told; held from 2 s → no boost; early tap then a tap in time → perfect). `tests/e2e/v25.test.js` (a real touch on the right half at 0.2 s → perfect, banner, hint shown with the labels hidden; a touch that starts and ends with no frame in between → still a start; a touch at 2 s → too early, toast). The old "hold when 1 shows" test (`tests/v22.test.js`) still passes |
| A cooler boost | Every new boost (also one on top of another) fires a shock ring behind the kart, a flame pop and a nose lift (bigger for start / nitro / purple / mushroom / rocket), and lays two light trails from the rear wheels along the road; the camera punch also fires for a boost on top of a boost; the premium bodies' neon and underglow flare up | Screenshots `docs/qa-2.5/start-and-boost.jpg` (WebGL). Trails, ring and flares are off in the CPU renderer (no blending there) |
| Charging felt slow (集气) | Nitro: 42 per second of drifting (was 32), 8 / 13 / 19 on release (was 6 / 10 / 15), +20 from a slipstream; AI factor 0.9 → 0.72. Special gauge: drift boosts 9 / 13 / 19 (was 6 / 9 / 13), coin 6, landed hit 15, being hit 12, 1.5 per second (was 1.2); AI factor 0.45 → 0.34 | Simulation below: the always-drift bot fires about 10 nitros per speed race (was 7.6) and about 4.5 specials per item race (was about 3); AI stay at about 5–6 nitros and 1 special each |
| Premium karts to choose | Garage tab 车型 with four bodies: 经典卡丁 (the Kenney kart), 闪电 GT, 喷射火箭, 幻影星舰, each built from merged extrusions / lathes (a handful of draw calls each), with their own exhaust layout, wheels and neon. Small trade-offs (player only): GT top speed +1.5 % / acceleration −12 %; 火箭 boosts +12 % / grip −6 %; 幻影 charging +15 % / grip +8 %. The choice is saved; the lobby preview and the stat bars (▲▼) follow it. AI ride assorted bodies for looks, untuned | `tests/v25.test.js` (tuned copy of the driver, CHARACTERS untouched, AI untuned, jet boost and phantom charge factors), `tests/e2e/v25.test.js` (tab, four rendered thumbnails, choice saved and raced, four wheels and exhaust on every kart, assorted field) |

## Balance (simulation, always-drift bot, 9 races per row, three tracks)

| Body | Item 100cc | Item 150cc | Speed 100cc | Speed 150cc |
|---|---|---|---|---|
| 经典卡丁 | 59.0 s · 1.4 | 57.0 s · 3.3 | 56.2 s · 1.1 | 55.8 s · 2.4 |
| 闪电 GT | 57.2 s · 1.1 | 56.8 s · 3.8 | 55.3 s · 1.0 | 55.5 s · 2.7 |
| 喷射火箭 | 56.8 s · 1.0 | 57.4 s · 3.3 | 55.8 s · 1.0 | 55.8 s · 3.3 |
| 幻影星舰 | 57.5 s · 1.1 | 57.0 s · 2.8 | 55.3 s · 1.0 | 55.4 s · 2.2 |

(time · average place). A first tuning made 闪电 GT and 喷射火箭 2 s faster than the classic in speed races and nitro too plentiful (12–15 a race, 150cc speed races won every time); both were toned down to the table above. Hits on the player stay at 3–4.5 per item race.

## Draw calls

WebGL, 932×430, high quality: about 500–545 per frame with assorted bodies in the field (v2.4: about 410 with classic karts only); the premium bodies merge their parts per material and their wheels use two materials.

## Mobile layout audit (emulated safe areas)

Same nine devices and safe areas as v2.4, portrait and landscape: home with the 车手 tab and with the 车型 tab (four kart cards), item race HUD (special ready, lock badge, radar), pause, speed race HUD, settings. Fixed on the way: the garage tabs and cards under the home indicator on notched iPhones (portrait), a radar chip touching the drift button (13 mini landscape). Also fixed, outside the audit: on laptop-height desktops (≤ 800 px tall) the hero blurb ran under the setup panel, and in landscape the three race-mode buttons wrapped onto two lines. Result: no issues on any device. `docs/qa-2.5/garage-karts.jpg` shows the 车型 tab on the 14 Pro Max in both orientations.

## Tests and play

`npm test` 78/78 and `npm run test:e2e` 35/35 on the final build (screen acceleration p95 0.13 NDC/s²). Real-time touch playthroughs to the results screen on the final build, starting with a real tap on a steering half: 430×932 星光云端公路 150cc item race with 小金毛 on 喷射火箭 (good start, 2nd, 60.5 s, 19 items, 4 specials, 10 drift boosts, hit 4 times) and 932×430 花田晴空环线 100cc speed race with 薄荷熊 on 经典卡丁 (1st, 54.5 s, 10 nitros, 12 drift boosts, 2 slipstreams; AI 4–6 nitros). Earlier v2.5 builds: 430×932 item race on 闪电 GT (good start, 3rd) and 932×430 speed race on 幻影星舰 (1st, 16 nitros). No page errors in any run. In this test browser a frame takes up to a quarter of a second, so a tap timed in real time can miss the 1.25 s start window; the e2e tests hold race time still while the finger lands.

## Not verified — needs a real phone

The start-boost timing feel on the 14 Pro Max (60 / 120 Hz), how the light trails and neon read on the phone screen, touch feel of the garage tabs, frame rate and heat with the premium bodies.

# v2.6 Verification — 2026-11-04

Build id at the bottom of the pause / help dialogs ("版本 2.6 · <id>"). Same container environment as before (headless Chrome; the CPU renderer for the regression tests and real-time playthroughs, SwiftShader WebGL for screenshots and draw-call counts; no phone).

## What changed and how it was checked

| Request | Change | Evidence |
|---|---|---|
| A special should make you invincible | Firing a special gives 必杀无敌 for 3 s (金毛 3.6 s, covering its three dashes), AI included. Any attack (shell, banana, lightning, meteor, fireball, bear hug, star or rocket ram) bounces off with a "✨ 必杀无敌！攻击无效" toast. In kart contact the guarded kart is heavy: the other kart takes the bounce. Golden aura shell and rings, a status countdown ("✨ 必杀无敌 2.3s") that blinks before it ends, and "无敌 N 秒" on the cut-in. AI hold attacks meant for an immune player; attack specials pick targets that are not immune (shells still home on whoever is next) | `tests/v26.test.js`: every character's special guards its driver for its time and the block is reported; it wears off; the AI get it too; a guarded kart shrugs off a side bump (the other kart bounces at least 3× as hard); an AI keeps a shell while the player is immune; specials pass over guarded or starred karts. `tests/e2e/v26.test.js`: a real tap on the special button shows the countdown and the cut-in, and an attack in the next step bounces off with the toast. The milo bubble test now clears the guard first |
| Holding a very long drift wins mindlessly, even scraping the wall | A drift now costs speed: about 2 % through a bend it follows, 12 % down a straight (player only; the AI only drift real bends). Spark charge runs at 30 % of the bend rate on a straight, nitro at 12 %. A drift that follows a bend keeps the full rail assist, since hugging the inside is the racing line and a touch drift always turns in fully. A drift that is not following a bend gets only 35 % of the assist, so aimed at the rail down a straight it reaches the rail and bounces off, losing its charge. The drift is no longer cancelled silently at the kerb | `tests/v26.test.js`: charge rate in a bend vs on a straight (×0.3); drifting down a straight is slower than driving it while drifting a bend beats steering it; nitro in a bend vs on a straight; a drift aimed at the rail reaches it, bounces, loses its charge with no boost and no teleport; a full race where the bend driver places ≤ 2nd, the hold-along-the-rail driver ≥ 7th and the drift-everywhere driver is slower. Tier, gauge and nitro tests from v2.2–v2.5 now drift through a steady bend (`track.curvature` stubbed) because a straight no longer charges at full rate |
| Walls and other karts should bounce | Rails are solid. A kart that reaches one bounces back: sideways speed × 0.55 plus up to 3 m/s from forward speed, at most 9 m/s. It loses 5–22 % of its speed by how square it hit (at most 9 m/s at once) and its drift charge. Side contact springs both karts apart at 2.4 m/s plus half the closing speed (at most 6.5). A rear-end costs the kart behind most of its closing speed (at most 8 m/s) and shoves the one in front (at most 3). Bounces are a decaying sideways speed, so motion stays continuous. Sparks fly back off the rail; camera shake and sound scale with the impact; startled faces and emotes. The chase camera stays over the road while a kart scrapes a rail (it used to end up in the trackside balloons) | `tests/v26.test.js`: a square hit costs more than twice a graze and bounces harder; both rails; side bump bounces both and clears; rear-end slows and shoves within limits; full races with a careless weaving driver stay finite and on the road with bounded bounces. `tests/continuity.test.js` unchanged and passing (lane step < 0.35 m, along-track < 0.15 m, speed change < 12 m/s per step) |
| Rough models; no cool transforming boost | Every body transforms for a boost, a special, a star, a rocket or the bear's ram. A spring drives a quick unfold with a small overshoot and a softer fold back, and a servo sound plays. Moving parts are separate small merged groups that cast no shadows. 经典卡丁: a GT wing flips up and twin boosters slide out of the rear. 闪电 GT: the wing rises on telescoping struts and tilts, rear blades slide out, the canards flip out and the tail pipes extend. 喷射火箭: swing wings sweep out, the side rockets slide out and the turbine spools up. 幻影星舰: the wheels fold flat into glowing hover pads and the body rises, the wing foils split into an X and the thrusters extend. Flames follow the pipes. The garage preview transforms every few seconds and at once when a body is picked, with a toast saying how. Materials: premium paint is a clear coat over metal with environment reflections; the classic kart gets a sheen; more curve segments and bevels | `docs/qa-2.6/transform-bodies.jpg` (folded, top; transformed, bottom; WebGL). `tests/e2e/v26.test.js` (picking a body shows the transformation toast; the cards' labels describe it) |
| Livelier, more detailed faces | The four plush drivers share one face rig: catchlights; blinks every 2–5 s (sometimes double); eyes that follow the steering and a rival alongside. Moods are eased, never snapped: happy is "^ ^" with blush and an open smile with tongue; focus (deep drift) knits the brows and grits the teeth; surprise lifts the brows and opens an "o"; hurt spins "x x" eyes; excited (special, star, rocket) gives starry catchlights and a big smile. Emote bubbles are vector-drawn, so no emoji font is needed: ♪ when passing, 💥 / 💦 off a rail, 💢 when bumped hard, ! when a shell locks on, ✨ for a special, 💫 when hit, ❤ on a podium finish. Ears stream back with speed and flap in the boost wind, and the driver is pushed back into the seat at ignition. Faces past 16 m stop animating and hide their catchlights | `docs/qa-2.6/faces-and-emotes.jpg` (WebGL). The licensed characters' models are unchanged |
| More frames, smoother | The drift meter, charge rings, progress markers and radar chips move every frame with transforms instead of jumping 10 times a second. The map redraws every frame (was 30 Hz). Text is written only when it changes, and the ranking list is rebuilt only when the order changes. Speed streaks flow outward continuously (were `steps(4)`). Render resolution adapts: it starts at 1.5× on phones and steps up by 0.25 to 2× while frames arrive on time; it drops as soon as frames are late and never climbs back past a level that dropped frames. Curvature is a table lookup and the render loop samples the track into scratch objects, so no garbage per frame. Shaders hidden until a boost or special (aura, flames, transform parts, emote) are compiled during the countdown | `tests/e2e/v26.test.js` (the drift fill changes on consecutive frames; the progress markers use transforms). The progress and radar e2e tests now read the drawn positions instead of `style.left`. Curvature from the table matches the old two-sample formula to within its own segment noise (the old value stepped by up to 0.011 between 0.7 m segments) |

## The exploit, before and after (simulation, 9 races per row: three tracks × three seeds)

Time (s) · average place, 100cc / 150cc. "Bends" drifts every real bend and releases on the exit, like a good player. "Everywhere" holds the drift and the direction of the last bend all the time, letting go for 8 frames at purple. "Rail" does the same steering right. "Hold" never lets go.

| Driver | v2.5 item | v2.5 speed | v2.6 item | v2.6 speed |
|---|---|---|---|---|
| Bends | 59.0 · 1.4 / 57.0 · 3.3 | 56.2 · 1.1 / 55.8 · 2.4 | 56.1 · 1.0 / 55.0 · 2.2 | 56.0 · 1.0 / 55.8 · 1.9 |
| Everywhere | 52.4 · 1.0 / 51.4 · 1.0 | 48.0 · 1.0 / 48.0 · 1.0 | 63.1 · 3.4 / 60.5 · 6.8 | 61.4 · 3.8 / 61.8 · 7.7 |
| Rail | 57.1 · 1.0 / 56.3 · 2.9 | 51.7 · 1.0 / 51.6 · 1.0 | 102.5 · 8 / 103.8 · 8 | 110.4 · 8 / 112.0 · 8 |
| Hold | 67.9 · 6.0 / 63.4 · 7.6 | 54.1 · 1.0 / 54.1 · 1.0 | 110.7 · 8 / 112.1 · 8 | 112.1 · 8 / 113.1 · 8 |

In v2.5 a boost was active 87–96 % of the time for the mindless drivers, against about 60 % for the bend driver. The AI pace (`AI_PACE`) is unchanged.

The same comparison in the real page, with real touch input in real time: holding the drift button and the right half for a whole 100cc speed race on 花田晴空环线. The fingers jiggle by a pixel, as a thumb does; a perfectly still test finger is released by the input watchdog after a few seconds.
- v2.5: 1st, 53.5 s, 21 nitros.
- v2.6: 8th, 112.1 s, 101 rail bounces.

In both runs the script checked that drift and steering stayed held. One earlier run whose drift press had not registered was discarded.

## Draw calls

WebGL, 932×430, high quality.
- In a race: about 535–630 per frame, depending on how many premium bodies the field has (v2.5: about 500–545).
- Worst case, all eight karts transformed and under the aura at once: about 650–750.
- One kart, shadow pass and ground included, folded → boosting: classic 43 → 64, 闪电 GT 60 → 78, 喷射火箭 68 → 89, 幻影星舰 65 → 79.

## Mobile layout audit (emulated safe areas)

Same nine devices, portrait and landscape, same screens as v2.5 (home with both garage tabs, item race HUD with the special ready and the radar, pause, speed race HUD, settings): no issues. The help dialog's ninth card spans the row.

## Tests and play

`npm test` 89/89, `npm run test:e2e` 39/39 on the final build. In-race screenshots (WebGL), with the two licensed-character karts parked out of view and checked off screen:
- `docs/qa-2.6/race-hover-and-guard.jpg`: 幻影星舰 in hover mode mid-boost, and 小金毛 under 必杀无敌 with the countdown.
- `docs/qa-2.6/race-jet-and-rail.jpg`: 喷射火箭 transformed with purple flames, and a kart bounced off the rail with the toast.

Real-time touch playthroughs to the results screen on the final build, each starting with a real tap on a steering half:
- 430×932, 星光云端公路, 150cc item race, 薄荷熊 on 幻影星舰: perfect start, 6th in 58.8 s, in a field that finished within 56.0–58.9 s. 20 items, 4 specials, 15 drift boosts, hit 4 times, no rail hits.
- 430×932, 花田晴空环线, 150cc item race, 小金毛 on 闪电 GT: perfect start, 2nd in 53.0 s. 21 items, 5 specials (two attacks bounced off 必杀无敌), 17 drift boosts, hit twice, 1 rail hit.
- 932×430, 花田晴空环线, 100cc speed race, 桃桃兔 on 喷射火箭: good start, 2nd in 57.5 s, 0.1 s behind 1st. 9 nitros, 16 drift boosts, 2 rail hits.

Earlier v2.6 builds, before the bend-assist fix: the same touch driver hit the inside rail 6–7 times a race and finished 5th and 6th. After the fix it hit no rails and finished 1st (speed race, 58.2 s) and 2nd (150cc item race, 54.5 s).

No page errors in any run.

## Not verified — needs a real phone

How the transformation, the aura and the faces read at phone size and arm's length; whether the adaptive resolution settles at 1.75–2× on the 14 Pro Max (it can only be measured there); frame rate and heat; the feel of rail bounces and of drifting with touch.
