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

# v2.7 Verification — 2026-11-12

Build id `e52b2ef9`. Same container environment as before: headless Chrome on a two-core machine, no phone. The CPU renderer runs most regression tests and the real-time playthroughs. SwiftShader WebGL (the GPU pipeline run on the CPU, one to two seconds a frame here) runs the post-chain tests, the screenshots and the draw-call counts.

## What was asked and how it was checked

The request was another round of polish for playing on a phone: user experience, picture and handling feel.

| Area | Change | Evidence |
|---|---|---|
| The view on a phone held upright | The portrait camera sits further back and higher behind a wider lens. The camera looks into bends, leans with them, and opens each race with a crane shot. | `tests/e2e/v27.test.js` (portrait framing, landscape framing, bend, opening shot). The framing table below. `docs/qa-2.7/framing-before-after.jpg`. |
| Picture | Each track has its own time of day (noon, sunset, night) with a painted sky. Tone mapping and lights rebalanced. A post chain: bloom, colour grade, vignette, edge streaks in a boost. | `tests/e2e/v27.test.js` (atmospheres, post chain on and off, post chain fallbacks). `docs/qa-2.7/three-tracks.jpg`, `landscape.jpg`. |
| Effects | Tyre marks and smoke in a drift, glowing sprite particles, thinner boost trails, embers, wind streaks. | `tests/v27.test.js` (sprites, tyre marks). `tests/e2e/v27.test.js` (drifting). `docs/qa-2.7/drift-and-boost.jpg`. |
| Handling feel | Quicker steering response, the kart's nose turns in at once, haptic ticks where the phone has them, wind sound. | `tests/v27.test.js` (steering, three tests). `tests/e2e/v27.test.js` (haptics). The steering table and balance check below. |
| Interface | Result card with a medal, counting time, record note and confetti. An iris between scenes. Countdown numbers pop. Dialogs stay inside the safe area. | `tests/e2e/v27.test.js` (result card, iris). Layout audit. `docs/qa-2.7/result-card.jpg`. |

## Framing, measured in the page

Measured in the running page at the same spot of 花田晴空环线 at racing speed. "Kart" is the 1.9 m kart body as a share of the screen's width (wheels and wings make it look wider). "Road" is the share of the screen's width that the 16 m road takes 20 m ahead of the kart: the lower it is, the more of the verges and of the bend's shape is in view.

| Viewport | v2.6 kart · road | v2.7 kart · road |
|---|---|---|
| 430×932 | 34% · 92% | 24% · 70% |
| 393×852 | 34% · 92% | 24% · 70% |
| 375×667 | 28% · 76% | 20% · 58% |
| 932×430 | 10% · 24% | 10% · 23% |
| 844×390 | 10% · 24% | 10% · 23% |

The whole kart as drawn (the screen box of every visible mesh: wheels, wings and driver included), width × height as shares of the screen:

| Viewport, body | v2.6 | v2.7 |
|---|---|---|
| 430×932, 经典卡丁 | 47% × 33% | 27% × 19% |
| 430×932, 闪电 GT | 57% × 35% | 39% × 25% |
| 932×430, 经典卡丁 | 15% × 47% | 13% × 40% |

- In portrait the kart with its wheels took about half the screen's width; it takes between a quarter and four tenths now, and covers about a third of the area it did.
- The view 20 m ahead is about 30% wider.
- The gain is sideways. The kart's height on screen (63% → 65% of the way down) and where the road 40 m ahead is drawn (44% → 46%) are almost unchanged.
- The portrait framing test fails on the v2.6 build with "kart body is 34% of the screen's width".

## Steering response

Deterministic simulation on a straight, the player alone (`STEER` in `dist/race.js`).

| | v2.6 | v2.7 |
|---|---|---|
| Time to half the top sideways speed | 167 ms | 150 ms |
| Time from release to 10% sideways speed | 333 ms | 267 ms |
| Coast across after releasing at full lock | 1.52 m | 1.13 m |
| A 0.1 s tap moves the kart | 0.82 m | 0.71 m |
| Top sideways speed | 7.72 m/s | 7.72 m/s |

Balance, same bots as the v2.6 table (mean time · mean place; the number of races is in brackets):

| Driving | v2.6 | v2.7 |
|---|---|---|
| Speed race 100cc, drifting every bend (9) | 56.0 s · 1.0 | 56.1 s · 1.0 |
| Speed race 150cc, drifting every bend (9) | 55.8 s · 1.9 | 56.0 s · 2.3 |
| Item race 150cc, drifting every bend (27) | 55.2 s · 2.0 | 55.7 s · 2.3 |
| Speed race 100cc, drifting everywhere (27) | 62.0 s · 3.7 | 62.7 s · 4.4 |
| Item race 100cc, drifting everywhere (27) | 62.9 s · 2.8 | 62.2 s · 2.3 |
| Along the rail, or one long drift | 8th every time | 8th in all 72 races, 102–115 s |

The quicker steering leaves results where they were, within the spread between runs: proper driving still wins every 100cc race, drifting everywhere is still about six seconds slower than that, and the rail strategies v2.6 closed still finish last.

Real-time touch playthroughs (CPU renderer, 430×932, 150cc speed race, 小金毛 in 闪电 GT, the same scripted fingers on both builds):

| Track | v2.6 | v2.7 |
|---|---|---|
| 花田晴空环线 | 6th, 57.4 s, 1 rail hit, 14 drifts | 6th, 58.3 s, 0 rail hits, 15 drifts |
| 蜜桃糖果海湾 | 4th, 59.4 s, 2 rail hits, 12 drifts | 4th, 58.9 s, 2 rail hits, 14 drifts |
| 星光云端公路 | 3rd, 57.7 s, 1 rail hit, 18 drifts | 5th, 58.1 s, 1 rail hit, 16 drifts |

Times are within a second of v2.6 and rail hits are no higher. Three more v2.7 races were played to the result card with no page errors: a 150cc item race with 薄荷熊 in 幻影星舰 on 花田 (6th, 56.9 s, field 54.5–57.4 s), a 150cc item race with 小金毛 in 闪电 GT on 蜜桃 (4th, 60.2 s), and a 100cc speed race in landscape with 桃桃兔 in 喷射火箭 on 星光 (3rd, 61.6 s).

## Post chain

- `tests/e2e/v27.test.js` runs it for real under SwiftShader: on in the garage and in a race, the frame read back is not blank, 画面特效 in settings turns it off and on, and the choice is saved.
- Fallbacks, also under SwiftShader. When the chain's frames read back blank after a rebuild, or the chain throws, it is switched off for good and the same frame is drawn directly. A race started after that is drawn directly too.
- The chain is not created for the CPU renderer or when the browser has no float colour buffers (`tests/v27.test.js`).
- Cost on SwiftShader at 430×932, the same spots with the chain on and off: 1.75–2.4 s a frame with it, 1.0–1.8 s without. This is CPU rasterising and says little about a phone's GPU.

Draw calls and triangles per frame at three spots of each lap (SwiftShader, 430×932, 精致 quality):

| | v2.6 | v2.7 |
|---|---|---|
| Draw calls | 372–522 | 481–568 |
| Triangles | 338k–405k | 366k–465k |

## Mobile layout audit

Nine devices, portrait and landscape (18 combinations): iPhone 14 Pro Max, iPhone 16 Pro Max, iPhone 15, iPhone 13 mini, iPhone SE, Pixel 7, a small Android, iPad mini, iPad Air. Screens: home with both garage tabs, help, item race HUD, pause, speed race HUD, settings and the result card. No overlap, nothing outside the safe area, no page errors.

- The first run found the result card outside the safe area on eight combinations. The card is taller in v2.7 and the dialog was sized to 90% of the screen: on a phone 852 px tall its top edge sat 15 px under the Dynamic Island inset, and in landscape its foot sat 8 px into the home-indicator strip. Dialogs are now placed and sized inside the safe area, and the result-card test checks it.
- The same run measured the settings rows at 37 px tall. They are 44 px or more on portrait phones now, and stay compact (34 px) on landscape phones where the dialog would otherwise need more scrolling.

## Tests

- `npm test`: 96 of 96 pass. New in `tests/v27.test.js`: steering response and release, a tap as a small correction, continuity through quick taps, sprite particles, streaks relative to the camera, tyre marks, and when the post chain is not created.
- `npm run test:e2e`: 50 of 50 pass, in about 11 minutes on this machine (the three WebGL tests take most of it). New in `tests/e2e/v27.test.js`: portrait and landscape framing, the look into a bend and the lean, the opening shot, a time of day per track, the result card, the iris, haptics, the post chain on and off, the post chain's fallbacks, tyre marks and smoke.
- In the first full run four of the new tests did not pass.
  - A product bug: the haptic switch took keyboard focus when toggled. Fixed.
  - A test mistake: the seeded personal best was one the forced finish beat.
  - The two slowest WebGL tests: one ran past its time limit and starved the next. They were split up and given longer limits.
  - Rerun, the drift test showed that at one frame every two seconds no tyre marks join up at full speed, so it now holds the drift in slow motion.

## Screenshots

SwiftShader WebGL with the post chain on, at 430×932 and 932×430. The two licensed-character karts are parked out of view in every race shot, and the script checks that they are off screen.

- `docs/qa-2.7/framing-before-after.jpg`: the same spot of 花田晴空环线 in v2.6 and in v2.7.
- `docs/qa-2.7/three-tracks.jpg`: noon, sunset and night.
- `docs/qa-2.7/drift-and-boost.jpg`: a drift with tyre marks by day, a drift with lines of light at night, and a boost at sunset.
- `docs/qa-2.7/landscape.jpg`: the sunset bay, and a boost on the night road.
- `docs/qa-2.7/result-card.jpg`: the head of the result card after a win.

The drifts were started by a held touch and then run in slow motion for the shot. SwiftShader draws about one frame every two seconds here, and tyre marks are laid frame by frame, so at full speed no marks would join up.

## Not verified — needs a real phone

No phone was used, so none of this is confirmed on the iPhone 14 Pro Max.

- Frame rate and heat with the post chain on, and where the adaptive resolution settles.
- That the phone's GPU draws into multisampled half-float targets. The fallbacks were exercised only under SwiftShader.
- How the bloom, grade and night track read on the phone's screen, indoors and in daylight.
- Whether the camera's lean, its look into bends and the opening shot feel comfortable, and whether the quicker steering feels better in the hand.
- Haptics. iOS has no vibration API; the switch-toggle method reportedly stopped working in iOS 26.5, so a current iPhone most likely gives no ticks.
- Loudness of the new wind sound against the music.


# v2.7.1 Verification — 2026-11-13

Build id `c995fd2b`. A hotfix for a report from the iPhone 14 Pro Max: on v2.7 the game sometimes froze in the middle of a race, and sometimes stuttered. Same container environment as before (headless Chrome on two CPU cores, no phone). The freeze itself could not be reproduced here: it happens on the phone's GPU. What follows are the causes found in the code and measured in the container, the fixes, and the guards added in case something else is behind it.

## Causes found, and the measurements

| Cause | Measured here on v2.7 | Fix in v2.7.1 |
|---|---|---|
| Frames dropping in a race switched the post chain off (and later the shadows) on the spot. Both change the shader of every material in the scene, so all of them were compiled in one frame. | SwiftShader, 360×640, 蜜桃 speed race: switching the chain off mid-race compiled 35 new shader programs (61 → 96) and the next two frames took 12.9 s, against about 2 s before and after. A phone compiles faster, but it is still a stop of a second or more in the middle of a race. | Mid-race the switches are only booked (`fxNext`, `lowNext`) and the resolution drops to 1x at once. They take effect at the next race start (compiled during the countdown) or on return to the garage. Test: no new shader program while racing after the switch is booked. |
| A race's track and props were not freed when it ended: only geometries of the plain `BufferGeometry` type were, so the ground, sky dome, cones, arches, labels, item boxes, coins and boost pads stayed in GPU memory. | Geometries held by the renderer, in the garage after each of six races on 花田 (SwiftShader, 320×568): 166 at start, then 350, 507, 573, 709, 765, 822, rising with every race; textures 27 → 88. | Leaving a race frees what its track and props drew with, except what the garage, a cached kart or a cached material still uses. Test: every geometry of the old track and props is freed, five races in a row. |
| Every new driver and kart-body pair was built and cached for good. AI drivers ride a random body each race, so the cache grew by about one kart (with its driver model) per AI driver per race. | (included in the row above) | At most 12 karts are kept, least recently used first out, never one the current race uses. The same six races: 166, then 327, 403, 373, 349, 386, 468 geometries (it moves with which karts are cached, within the cap); textures 27 → 48. A separate trace of five races found the last textures that piled up (the bone textures of dropped drivers' skeletons, now freed); with that fix the textures held stayed at 25–26 from the third race on. |
| With the chain on, the resolution could climb to 2x after a few calm windows. | — | Capped at 1.5x with the chain on (less heat). |
| The blank-frame check read pixels back after every rebuild of the chain's targets (a read makes the CPU wait for the GPU). | — | Only the first frames the chain ever draws are read back, and again after a context restore. |
| The iris between scenes was a 6vmax circle with a 220vmax box shadow scaled 42 times: a compositing layer thousands of pixels wide on a 3x screen at every race start. | — | A plain opacity fade of a screen-sized layer. |
| Sprite particle, tyre-mark and boost-trail shaders were compiled the first time one appeared mid-race. | — | Revealed for the countdown's compile. |
| On iOS a hidden switch control was clicked (and focused) for each haptic tick, mid-race. The trick reportedly stopped working in iOS 26.5. | — | Removed. Haptics only where the browser can vibrate (Android); the 震动反馈 setting is hidden elsewhere. |

## Guards

- An error thrown in a frame no longer leaves a frozen picture: it is caught and counted, the post chain is switched off, and the game carries on. If frames keep failing for about 1.5 s the race pauses and offers a reload.
- A lost WebGL context pauses the race. When the context comes back the chain stays off for the session and the pause menu returns. If nothing comes back within 6 s, a reload is offered (records are already saved).
- Crash guard: a mark is kept in storage while a race runs with the chain on, and cleared when the race ends or the page is left normally. A page that loads and finds the mark starts with the chain off and says so; turning 画面特效 on again in settings clears it.
- 运行诊断 in settings: version and build, renderer and GPU name, screen size, device pixel ratio and render scale, post chain state (and why it is off), shadows, median frame rate, the slowest frame of the current session's racing, context losses and restores, size changes, GPU resource counts and karts cached, errors and the last message, and the user agent. It can be copied. It is shown on the phone only and sent nowhere.

## Tests

- `npm test`: 96 of 96 pass.
- `npm run test:e2e`: 56 of 56 pass, in about 10.5 minutes. The last full run caught the fade test reading the layer after it had already switched itself off; the test now records each time the fade starts and passed three reruns in a row. New in `tests/e2e/v271.test.js` (6 tests): leaving a race frees its track and props and the kart cache stays at 12 or fewer (five races); an error in one frame is caught and the race goes on, and frames failing in a row offer a reload; the crash guard; the diagnostics; (WebGL) slow frames book the chain and the shadows off without compiling anything mid-race, and both apply in the garage; (WebGL) a lost context pauses the race, offers a reload, and comes back drawn without the chain.
- Changed: the haptics test (nothing at all, and no setting, where the browser cannot vibrate), the fallback test (frames are read back on the first build and after a restore, so it calls `recheck()`), and the fade test (was the iris).
- Layout audit, 9 devices × 2 orientations, with 运行诊断 opened in settings: no issues, no page errors. `docs/qa-2.7.1/diagnostics.jpg` is the panel on a 430×932 page (CPU renderer, so it says 兼容模式 and shows no GPU counts).

## Not verified — needs the phone

- That the freeze is gone on the iPhone 14 Pro Max. The fixes remove the causes found here. If it happens again, a screenshot of 设置 → 运行诊断 right after it shows the slowest frame, context losses and errors.
- Frame rate and heat at the 1.5x cap with the chain on.

# v2.8 Verification — 2026-11-14

Build id `5d11c32d`. Same container environment as before (headless Chrome on two CPU cores, no phone): the CPU renderer for most tests, the layout audit and the real-time playthroughs; SwiftShader WebGL for the screenshots and the theme test.

## What was asked and how it was checked

The requests: a speed-rules cup (the cup was item races only); more karts, more tracks and more difficulty, a harder one for speed races above all; tracks grouped by theme and karts in series, as KartRider does; and more review passes of my own.

| Asked | Change | Evidence |
|---|---|---|
| A cup under speed rules | Rules (item / speed) and format (single race / cup) are chosen apart. Three cups of three races. Trophies by cup, rules and class. Old saves' `mode` is converted. | `tests/e2e/v28.test.js` (garage; a speed cup run to its final standings). |
| More tracks, by theme | Nine tracks in five themes; a row of tabs (cups, then themes) in the garage. Two new themes: snow and desert. | `tests/v28.test.js` (geometry of every track), `tests/e2e/v28.test.js` (every track starts and is driven; snow and desert drawn under WebGL). The track table below. `docs/qa-2.8/`. |
| More karts, in series | Thirteen karts in five series: liveries for the three premium bodies, and a new marshmallow body with its own transformation. | `tests/v28.test.js` (bounds; no kart beats another of its series on every count), `tests/e2e/v28.test.js` (garage row; the new body chosen, raced and transformed). The kart table below. |
| More difficulty, speed races above all | A fourth class, 大师. The first three classes are unchanged. | `tests/v28.test.js` (the old values; the field is faster at 大师 on every track; a good driver still reaches the podium). The balance tables below. |

## Tracks

| # | Track | Theme | Lap | Tightest bend | Bends | Climb | Steepest | Clearance | AI pace |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 花田晴空环线 | 花田 | 816 m | 14.0 m | 5 | 6 m | 4.4% | 52 m | — |
| 1 | 蜜桃糖果海湾 | 糖果海湾 | 856 m | 9.1 m | 6 | 6 m | 4.7% | 44 m | — |
| 2 | 星光云端公路 | 星光 | 846 m | 13.8 m | 6 | 15 m | 10.7% | 51 m | — |
| 3 | 棉花糖码头 | 糖果海湾 | 914 m | 17.9 m | 5 | 3 m | 2.7% | 53 m | 0.984 |
| 4 | 雪绒花滑道 | 冰雪 | 905 m | 13.0 m | 5 | 13 m | 5.3% | 51 m | 0.961 |
| 5 | 金沙绿洲 | 沙漠 | 979 m | 16.1 m | 4 | 2 m | 1.8% | 53 m | 0.965 |
| 6 | 冰晶峡谷 | 冰雪 | 1076 m | 14.2 m | 9 | 11 m | 6.1% | 53 m | 1.09 |
| 7 | 赤岩峡谷 | 沙漠 | 1007 m | 11.5 m | 7 | 7 m | 4.4% | 48 m | 1.065 |
| 8 | 银河天梯 | 星光 | 1130 m | 11.1 m | 9 | 20 m | 6.2% | 49 m | 0.967 |

Climb is the height between the lowest and highest point of the lap; steepest is the steepest grade.

- The first three are unchanged. The six new ones are longer and start on a straight.
- Tightest bend: no new track is tighter than the 9.1 m hairpin of 蜜桃糖果海湾.
- Clearance is the closest two parts of a lap come to each other (centre lines, more than 60 m apart along the lap). The scenery generator needs about 44 m.
- Two layouts were thrown away on the way: a spiral that crossed itself (the terrain cannot do a bridge) and a canyon with a 5.2 m bend.
- Boost pads on the new tracks sit on the straightest stretch near 20%, 50% and 80% of the lap.

## Balance

All figures come from the simulation's racer bot: it steers the line, drifts every bend with auto-drift and fires nitro on straights. "With start" adds a perfect start boost. Ranks are of eight.

**Per-track AI pace.** Without it, the same class was easy on one track and hard on the next: at 150cc the AI's best time against the bot's ran from 2.5% faster (银河天梯) to 7% slower (冰晶峡谷), because AI karts lose more than a drifting player in tight bends and less on flowing tracks. Each new track has an `aiPace` factor set so that this ratio is close to that of the first three tracks.

150cc, six seeds per track and rules (ranks in seed order). A ratio above 1: the fastest AI is slower than the bot.

| Track | Speed race: AI best / bot | Bot's ranks | Item race: AI best / bot | Bot's ranks |
|---|---|---|---|---|
| 花田晴空环线 | 0.990 | 254631 | 1.004 | 413323 |
| 蜜桃糖果海湾 | 1.004 | 311121 | 1.004 | 314111 |
| 星光云端公路 | 0.993 | 221133 | 0.981 | 718412 |
| 棉花糖码头 | 0.991 | 523331 | 0.997 | 173313 |
| 雪绒花滑道 | 0.995 | 342114 | 0.977 | 245441 |
| 金沙绿洲 | 0.991 | 223313 | 1.004 | 715121 |
| 冰晶峡谷 | 1.004 | 211111 | 1.010 | 122114 |
| 赤岩峡谷 | 1.007 | 111121 | 0.990 | 216351 |
| 银河天梯 | 0.985 | 254573 | 0.995 | 331222 |

- Speed races: 0.985–1.007 on all nine tracks (the first three: 0.990–1.004). Item races spread more (0.977–1.010; the first three 0.981–1.004): items add chance.

- 冰晶峡谷 and 赤岩峡谷 are left a little easier for the bot on purpose: a thumb on a phone loses more time in their bends than the bot does (see the playthroughs below).

**大师.** AI pace 1.09 in item races (150cc: 1.07) and 1.03 in speed races (150cc: 1.015). They also drift 97% of gentler bends (85%), take a start boost 85% of the time (50%), ease off by at most 1% when ahead of the player (2.5%), and look for a straight to fire nitro on every 0.25–1.15 s (0.8–3.3 s).

Nine tracks × six seeds = 54 races per row.

| Rules | Class | Avg rank | Wins | Podiums | Avg rank, perfect start | Wins | Podiums |
|---|---|---|---|---|---|---|---|
| 竞速 | 100cc | 1.00 | 54/54 | 54/54 | 1.00 | 54/54 | 54/54 |
| 竞速 | 150cc | 2.37 | 21/54 | 44/54 | 2.13 | 18/54 | 47/54 |
| 竞速 | 大师 | 4.11 | 6/54 | 20/54 | 3.24 | 10/54 | 30/54 |
| 道具 | 100cc | 1.06 | 51/54 | 54/54 | 1.02 | 53/54 | 54/54 |
| 道具 | 150cc | 2.72 | 19/54 | 39/54 | 2.35 | 22/54 | 43/54 |
| 道具 | 大师 | 3.22 | 18/54 | 31/54 | 3.52 | 14/54 | 29/54 |

- Speed races: 大师 is the clear step up. The bot wins 6 of 54 without a start boost and 10 of 54 with a perfect one (150cc: 21 and 18), and averages 4.1 and 3.2.
- Item races: the step is smaller (average rank 3.2–3.5 against 2.4–2.7 at 150cc). Items reshuffle the field whatever the class.
- 50cc, 100cc and 150cc are unchanged from v2.7 (the unit test pins their values); the figures above for those classes include the new tracks.

**Karts.** The player's kart, 150cc, all nine tracks, three seeds each, with a perfect start.

| Kart | Speed race: avg time | Avg rank | Item race: avg time | Avg rank |
|---|---|---|---|---|
| 经典卡丁 | 63.0 s | 2.26 | 62.7 s | 2.48 |
| 闪电 GT | 62.2 s | 1.81 | 62.2 s | 2.19 |
| 闪电 GT·黑金 | 61.9 s | 1.78 | 62.1 s | 1.93 |
| 闪电 GT·冰蓝 | 62.4 s | 1.93 | 62.1 s | 1.89 |
| 喷射火箭 | 62.7 s | 2.04 | 62.6 s | 2.00 |
| 喷射火箭·烈焰 | 62.5 s | 1.78 | 63.1 s | 2.52 |
| 喷射火箭·星尘 | 62.6 s | 1.89 | 61.7 s | 1.74 |
| 幻影星舰 | 62.6 s | 1.59 | 61.8 s | 2.19 |
| 幻影星舰·暗夜 | 62.5 s | 1.52 | 61.7 s | 1.78 |
| 幻影星舰·极光 | 63.0 s | 2.22 | 62.5 s | 2.07 |
| 棉花糖·蜜桃 | 62.9 s | 2.22 | 63.4 s | 2.52 |
| 棉花糖·薄荷 | 63.2 s | 2.44 | 62.6 s | 1.81 |
| 棉花糖·葡萄 | 62.8 s | 2.48 | 62.5 s | 2.19 |

- Race times span 61.9–63.2 s in speed races and 61.7–63.4 s in item races, about 2% and 2.7%. Ranks move with the items and the field as much as with the kart.

- The bot never crashes, so acceleration (the marshmallow series) counts for less here than it does in play.

## Real-time touch playthroughs

The page in Chrome at normal speed, CPU renderer, a scripted thumb: it holds the inside half of the screen through bends (which starts and holds a drift), lets go on exit, taps for a start boost and for nitro.

| Track | Class | Rules | Kart | Screen | Finish | Time | AI times | Start boost | Drifts | Rail hits |
|---|---|---|---|---|---|---|---|---|---|---|
| 棉花糖码头 | 100cc | speed | 喷射火箭·星尘 | 430×932 | 1st | 64.2 s | 65.6–69.8 s | missed | 14 | 0 |
| 雪绒花滑道 | 150cc | item | 棉花糖·蜜桃 | 430×932 | 5th | 64.6 s | 62.1–65.3 s | good | 8 | 1 |
| 金沙绿洲 | 大师 | speed | 闪电 GT·黑金 | 430×932 | 6th | 69.6 s | 67.3–70.1 s | missed | 10 | 2 |
| 冰晶峡谷 | 150cc | speed | 经典卡丁 | 430×932 | 7th | 73.5 s | 68.9–74.0 s | perfect | 16 | 4 |
| 赤岩峡谷 | 150cc | speed | 经典卡丁 | 430×932 | 6th | 69.7 s | 65.5–70.0 s | good | 18 | 2 |
| 银河天梯 | 大师 | speed | 幻影星舰·暗夜 | 932×430 | 7th | 80.4 s | 77.4–80.7 s | missed | 13 | 5 |

- The scripted thumb is a rough driver. It never lifts off or picks a line, and it hit the rails two to five times on the technical tracks. Read its results as a floor, not as a target.
- In v2.7 the same driver finished 4th–6th at 150cc on the first three tracks.
- 冰晶峡谷 and 赤岩峡谷 were played three times while their `aiPace` was being set. With 1.121 / 1.054 (the bot's exact figures) the thumb finished 8th of 8 on both. With 1.06 / 1.04 the bot won every race. The kept values, 1.09 / 1.065, gave 7th and 6th above.

No page errors in any of them.

## New art

- Snow: a valley between snow-capped ranges (the ground rises away from the road), snowy pines, snowmen, ice crystals, an ice arch, a frozen lake in the infield, a turning snowflake. Desert: dunes, mesas with a paler band, saguaros and shrubs, rock spires, sandstone arches with pennants, two pyramids, an oasis with palms in the infield, a windpump.
- Weather is one `Points` object of 900 flakes (560 grains of sand) in a box that follows the camera. The vertex shader moves and wraps them, so a frame costs three uniform writes and one draw call.
- Each theme has its song; snow and desert are new (the desert one in a scale with a minor second and a major third).
- Draw calls and triangles on the new tracks: SwiftShader, 430×932, three spots of the lap each, with the post chain on and off (min–max)

| Track | Draw calls | Triangles |
|---|---|---|
| 花田晴空环线 (for comparison) | 439–617 | 356k–491k |
| 棉花糖码头 | 326–572 | 306k–459k |
| 雪绒花滑道 | 461–562 | 328k–400k |
| 金沙绿洲 | 523–600 | 387k–434k |
| 冰晶峡谷 | 319–571 | 237k–400k |
| 赤岩峡谷 | 373–571 | 300k–409k |
| 银河天梯 | 466–543 | 364k–417k |

The new tracks are no heavier than the first one. Frame times under SwiftShader (1.0–2.4 s) say nothing about a phone.

## Garage layout audit

Nine devices, portrait and landscape (18 combinations), now also every state of the tab row (three themes and the cups), the kart row with its series labels, and that nothing covers the start button.

- The first run stopped on the iPhone 13 mini in landscape (812×375): with the tab row added, the panel was taller than the space above the garage row, and the start button sat under it. On screens up to 400 px high the track cards now drop their outline and the spacing tightens.
- The next full run flagged the iPhone SE and a 780×360 Android phone in landscape, and the heading "撒欢。" running into the panel in the desktop layout on an iPad mini on its side (1133×744). All fixed, and each device re-checked on its own before the final run.
- Theme tabs are 44 px tall on phones held upright and 36 px on landscape phones.
- Final run, on the final build: 18 of 18 combinations clean, no page errors.

## Tests

- `npm test`: 103 of 103 pass. New in `tests/v28.test.js` (7 tests): track geometry, boost pads, cups, the classes (old values unchanged), 大师 against 150cc on every track, AI pace per track, the karts.
- `npm run test:e2e`: on the final build 60 of 61 passed in 17 minutes. The one failure was a v2.5 test that waited a fixed 0.5 s for a 0.4 s fade and read an opacity of 0.004 instead of 0. It now waits for the fade; its file then passed three runs in a row. New in `tests/e2e/v28.test.js` (5 tests): the garage (rules, tabs, themes, classes, old saves), a speed cup of three races to its trophy, the kart series, all nine tracks started and driven, snow and desert under WebGL with their weather and the marshmallow kart.
- Changed: the v2.4 test reads the speed button by its new attribute; the v2.5 test expects the four original bodies among the thirteen; the v2.7.1 diagnostics test accepts any version number.

## Screenshots

SwiftShader WebGL, 430×932 and 932×430. The two licensed-character karts are parked out of view in every race shot and the script checks that they are off screen; the garage shots have the 车型 tab open, so no driver cards are on screen.

- `snow-and-desert.jpg`: 雪绒花滑道 (棉花糖·蜜桃), 冰晶峡谷 (闪电 GT·冰蓝), 金沙绿洲 (闪电 GT·黑金), 赤岩峡谷 (喷射火箭·烈焰). Snowflakes are visible as white specks on the snow tracks.
- `pier-ladder-marshmallow.jpg`: 棉花糖码头, 银河天梯, and the marshmallow kart in a boost (clouds out, rockets lit).
- `landscape.jpg`: 冰晶峡谷 and 赤岩峡谷 at 932×430.
- `garage.jpg`: the garage with a theme open (two snow tracks), and with the cups open under speed rules and 大师, two trophies earned.
- Not in the repo: the start grid of 花田晴空环线 and 雪绒花滑道 in the opening crane shot, checked for the grandstand. It now runs along the verge, facing the road.

## Not verified — needs the phone

- Frame rate on the new tracks, and what the weather layer costs on the phone's GPU.
- Whether 大师 is the right step up for the player. It was set against a simulated driver and one scripted thumb.
- How the snow track reads in daylight (white ground at full brightness), and the marshmallow kart at phone size.
- The two new songs through the phone's speaker.
- v2.7.1's fix for the freeze is still unconfirmed on the phone.
