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
