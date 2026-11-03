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
