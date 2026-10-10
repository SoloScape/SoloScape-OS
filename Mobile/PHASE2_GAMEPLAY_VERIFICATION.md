# Phase 2 original-engine gameplay verification — 10 October 2026

## Scope and evidence boundary

This report covers the **pinned revision-240 original OpenOSRS Java gamepack**
compiled to JavaScript by TeaVM, its **original Java software renderer**, and
the real local SoloScape Kotlin/RSMod server through the loopback gateway.
It is not testing the separate TSPS/WebGL mobile renderer.

The player logged into a disposable test account **manually**. Verification
uses the Stage 2 Desktop Commander controller and real original-client canvas
screenshots. No credentials, login packets, RSA private keys, or other account
secrets are recorded.

## Authenticated interaction checklist

| Area | Current verification | Evidence and follow-up |
| --- | --- | --- |
| Login and original framebuffer | **Observed pass** | `LOGGED_IN`, real terrain, NPCs/other actors, player, minimap, chat, inventory and original game cycles confirmed by controller and screenshots |
| Click-to-move | **Observed pass** | Safe ground click shifted the world/camera around the player; independently previously confirmed by the user |
| Inventory context menu | **Observed pass** | Right-clicked a grimy guam leaf: gamepack showed `Use`, `Drop`, `Examine`. Choosing `Examine` subsequently produced original chat text `It needs cleaning.` |
| Interface switching | **Observed pass** | Skills tab displayed authentic skill icons/levels and total level 43; switching is handled by the original client |
| NPC interaction | **Passed (user-confirmed)** | The player confirmed talking to NPCs and successfully interacting with them in the real original client. This supersedes the earlier automated attempts that could not reliably target moving actors |
| Banking | **Not verified** | Need to reach a banker, open an original bank interface, and safely deposit/withdraw disposable items |
| Dialogue | **Basic NPC talking passed (user-confirmed)** | Player confirms NPC conversations and interaction work. Extended dialogue-option branching, multi-step advance/close and quest-specific dialogues remain unverified |
| Chat text input | **Observed pass after Enter fix** | First session: typed `phase2` but Java Enter did not submit. Browser-only NativeCanvas now maps DOM Enter 13 to Java AWT VK_ENTER 10; original gamepack and renderer unchanged. After rebuilding, sent `p2check`: original game showed the overhead chat bubble, a chat-log message and a cleared input (ignored screenshot `world-1791598354594-50921444.png`). Physical keyboard Enter has not been independently compared |
| Region transition | **Not verified** | Character moves normally, but no new region/base-coordinate or cache-region transition has yet been proven |
| Disconnect/reconnect | **Not verified** | Test after the sustained session, with a safe browser-only connection interruption and manual reauthentication where necessary; do not bounce the shared local game server |
| Native mouse / keyboard | **Observed pass for tested CDP actions** | World clicks, inventory context menu, skills tab, letter entry and rebuilt-client Enter chat submission all verified. Physical-keyboard differences and touch input remain out of scope |

## New gameplay defects reported after endurance test

- **Combat: FAIL, rat attack crashes original game loop.** User reproduced an
  attack against a rat. The controller observed `phase:error`, with
  `LOGGED_IN` frozen at game cycle 20,525, zero presented FPS, and a
  `java.lang.RuntimeException; TypeError; null property: bxQ`. Sanitized
  frames begin `BQ1:21440:419 | CkQ:19055:476 | C2y:16675:225`.
  Bytecode inspection of the pinned source confirmed that `BQ1` is the
  original `au.as(Ldz;Ldh;IIIIIIB)V` hitsplat/actor overlay method and that
  `ym.aa` is its sprite-offset field. A narrowly scoped TeaVM-only build
  guard skips absent optional sprites in this original overlay, keeping the
  original Java drawing paths for any sprite that exists. **Do not mark this
  fixed until the rebuilt client has survived an actual rat attack.**
- **Static world scenery: FAIL (user-reported).** Stairs, tables, cabinets,
  cooking ranges and other world objects are missing even while terrain,
  walls, player models and NPCs render. This is a *separate* scene/region-loc
  loading problem; the cause has not been verified. The existing cache has
  `main_file_cache.dat2` and numbered `idx` files, but file presence is
  not proof that the right map object archives decoded or spawned. Verify
  original scene object counts, cache archive decoding, region XTEA keys and
  server/client map-square expectations before modifying rendering.
- **NPC actions: PASS (user-confirmed).** The player can talk to and interact
  with NPCs; this overrides the previous `Not verified` automation result.
  Banking, longer dialogue chains and specific scene-object interactions
  still require independent verification.

**Do not mark an unobserved gameplay feature as passing based on test names,
server availability, a sent click, or the engine merely remaining logged in.**

## Sustained original-world runtime and memory

A dedicated **20-minute** authenticated sampler started at
`2026-10-10T01:45:51.643Z`, requesting sanitized game state, original game
cycles, software frames presented, FPS and callback errors at approximately
10-second intervals. Its local JSON report is written to the ignored
`teavm-poc/target/engine/phase2-reports/` directory.

A separate **15-minute** Chrome-only memory sampler reads Windows process
private/working-set bytes for the **bridge-owned visible Chrome profile**
only, excluding other user browsing. The profile and session secrets are
never printed into public reports. These measurements are total Chrome-process
memory, not the TeaVM Java heap alone, and may fluctuate with Chrome's GC
and compositor. A monotonic rise would indicate a need for longer investigation,
not conclusively prove a leak.

### Final measured results — FAILED

The authenticated run **completed** and produced
`teavm-poc/target/engine/phase2-reports/phase2-1791597951654.json`.
It returned `FAILED_OR_INCOMPLETE` (exit 1), not `PASS_RUNTIME_ONLY`.

- **Duration:** 120 collected samples, about **19 min 53 s** between first
  and final sample (20 minutes requested).
- **Original world runtime:** median **24.6 software frames/s**, median
  **50.0 original game cycles/s**; original game cycle increased by 54,805
  and presented software frames increased by 27,197.
- **Performance degradation:** nine authenticated samples showed
  severe slowdown (software FPS below 5 or game cycles/s below 35),
  including shorter dips at approximately minutes 3.7 and 10.4. Around
  minute 18 a much longer slowdown dropped performance to roughly **1 FPS /
  10 cycles/s** and eventually **0.1 FPS / 1.1 cycles/s**. This is a genuine
  instability signal even without a Java callback exception.
- **Connection loss:** five samples were no longer `LOGGED_IN`. The game
  entered `CONNECTION_LOST` at approximately 19 min 13 s, then fell back to
  `LOGIN_SCREEN`. Client-thread telemetry remained present and callback
  errors stayed empty. **Automatic reconnection was not demonstrated.**
- **Clock evidence:** a subsequent sample showed an approximately **999 ms
  game-loop gap / 994 ms wait** rather than ~20 ms. Browser scheduling or
  background/minimized-window throttling is strongly suspected, but the
  session did not record `document.visibilityState` or focus, so this is not
  yet conclusively established. A repeat with the Chrome window visible
  **and focused** is required. Read-only focus/visibility telemetry was added
  after the run; the rebuilt title screen reported `visible` and `pageFocused:false`.
  This later observation does not establish its state during the earlier stall.

The **separate 15-minute visible Chrome memory monitor completed** with
44 samples, watching nine browser processes. Private-memory totals were
**1,029.7 MB initial, 1,058.6 MB final (+28.9 MB), peak 1,099.6 MB**.
Source: ignored `phase2-reports/chrome-memory-20261010-030341.csv`.
This does **not** demonstrate monotonic memory growth or prove a leak.
The totals include Chrome's other processes and cannot predict phone memory
consumption. JavaScript heap sampling was unavailable in the controller
process loaded for the **20-minute run**. After restarting the controller
and rebuilding the original Java client, the new allowlisted `heap` command
reported **173,611,940 bytes used (about 166 MiB)** in a separate
logged-in session. A single later heap reading is not a longitudinal
memory-leak test and is not combined with the 15-minute process-memory
series.

**Phase 2 sign-off is blocked:** nine severe authenticated performance samples,
late connection loss/timer throttling, and still-unverified
NPC/banking/dialogue/region/reconnect interactions. **Chat submission is
confirmed fixed in a new authenticated session** after the Java AWT Enter
adapter correction. That shorter second session does not replace the failing
20-minute endurance result.
Passing simulation and renderer checks for most of the run is not full
gameplay or mobile-device parity.

## Reproduce

Start the normal SoloScape game server separately, then from `Mobile/`:

```powershell
npm run build:openosrs-engine
npm run dev:original-engine
node dev-bridge/controller-cli.mjs start
node dev-bridge/controller-cli.mjs initialize
node dev-bridge/controller-cli.mjs wait LOGIN_SCREEN
# Log in manually with a disposable test account in the owned Chrome window.
node dev-bridge/controller-cli.mjs wait LOGGED_IN
node dev-bridge/verify-gameplay.mjs 20
powershell -NoProfile -File dev-bridge/verify-chrome-memory.ps1 -Minutes 15
```

The controller can be started separately using
`npm run dev:desktop-controller`. The monitor is intentionally local-only.
Never commit screenshot artifacts, raw logs, cache files or private runtime
session descriptors. The user-provided native game cache and original Java
gamepack remain unchanged.
