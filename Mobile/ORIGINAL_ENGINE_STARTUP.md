# Original OpenOSRS engine startup — isolated milestone 1

This is an **offline/local development diagnostic**, not the active mobile client,
a distributable OSRS build, or evidence of playable RuneLite parity.
The existing `npm run dev` homepage and `browser/teavm-world.mjs` are unchanged.

## What is wired

- `teavm-poc/engine-src/EngineBridge.java` constructs the pinned rev-240
  `client`, supplies its `net.runelite.api.ClientConfiguration` **before**
  `client.initialize()`, and exposes startup stage/error and original
  `Client.getGameCycle()`/client-thread telemetry.
- `EngineConfiguration.java` implements the actual 1.12.x game-engine
  contract: codebase, named client parameters, and error reporting.
- All source remains compiled locally to the ignored
  `teavm-poc/target/engine/javascript/engine.js`. It is **not** imported
  by the public homepage or served by `browser/dev-server.mjs`.
- A separate loopback-only `scripts/run-original-engine.mjs` runs the
  diagnostic and native JS5 WebSocket gateway at `http://127.0.0.1:3097/`.
  The isolated HTTP host reads the original local `Server/.data/cache/LIVE`
  cache on demand, while browser memory contains a private writable copy.
  **Neither the user's native cache nor the pinned gamepack is modified.**
  The isolated `scripts/engine-smoke-server.mjs` still permits a minimal
  no-cache/no-network test.
- The diagnostic uses the original compiled engine and its Canvas 2D
  framebuffer. It does **not** instantiate `TeaVmWorldBridge`, inject
  synthetic game cycles, fabricate packets, or show placeholder world art.

## How to run

Use the exact pinned local gamepack/API described in `REFERENCE_OPENOSRS.md`.
On the development machine, from `Mobile/`:

```powershell
npm run verify:openosrs-reference
npm run build:openosrs-engine
npm run test:openosrs-engine
npm run dev:original-engine
```

Have the local SoloScape **native revision-240 JS5 server** listening
on `127.0.0.1:43594` (the existing server). Open `http://127.0.0.1:3097/`.
Click **Initialize original engine**. The diagnostic fills in the safe public
startup parameters and, when launched with `npm run dev:original-engine`,
the loopback-only gateway routes automatically. The local development host
reads **only** `Server/.data/client.key` (the generated public RSA key), serves
its exponent/modulus on a loopback-only endpoint, and configures the pinned
original gamepack's login RSA before the original Java engine initializes.
The server's private `game.key` is never read or served by this harness.
`SOLOSCAPE_ENGINE_PUBLIC_RSA_KEY_FILE` can override the public-key path.
The event log reports only whether public RSA was configured, not key bytes.
The title diagnostic also supplies public `jav_config.ws` parameter **9**. The
original revision-240 gamepack writes this value into its login packet; leaving
it out caused a null-string crash (`bsU`/`bsX`/`bsY` across TeaVM builds).
This is public client bootstrap data, **not a password or session token**.
Original startup parameter **4** is the one-byte native login **client type**, not
its TCP port. For rsprot revision 240, `DESKTOP` is **1**. Setting parameter 4
to `43594` made the login header send `43594 % 256 = 74`, causing the server
to reject it as an unknown client type. TCP port `43594` belongs only in the
separately configured loopback gateway routes.
The original gamepack subsequently reached **`LOGGED_IN`** on the local SoloScape
server and rendered native terrain, buildings, the local player, minimap, chat
and game interfaces (manual Chrome evidence, October 2026). This is a genuine
original-engine login/world milestone, **not yet a stable gameplay pass**.
Original browser input events are delivered directly by `NativeCanvas`; there is no
desktop AWT event-dispatch thread. The browser `EventQueue` must therefore not
accumulate the original game's dummy post-draw `ActionEvent`. Before this
adaptation, `tq.afd` would wait up to 50 times per frame on an undrainable
queue; each one-millisecond browser sleep could be delayed to 12–16 ms,
drastically reducing actual frame presentation while game cycles caught up.
The fixed browser shim discards these desktop-only events and keeps the
original Java renderer and game tick loop unchanged. Title and gameplay FPS
must be remeasured in a visible Chrome window.

A following JavaScript null-string crash was traced to the pinned `af.fk` NPC
menu path, where a missing optional cache action was compared without a null
check. The TeaVM bytecode adapter now replaces only those two comparisons with
`NullSafeStrings.equalsIgnoreCase`; sustained authenticated gameplay still needs
manual verification. Do not use a main account password or expose this plaintext
loopback diagnostic over LAN or the internet.
The standalone title-only test host may omit RSA; never enter credentials there. It loads an in-browser
snapshot of `Server/.data/cache/LIVE`, then displays the actual gamepack's
RuneScape title screen with the original logo, background, welcome panel,
and **New User / Existing User** buttons. Do not enter account credentials
or tokens into diagnostic fields.

For repeatable Chrome **title framebuffer** verification:

```powershell
npm run test:original-title
```

The title-specific test locates Chrome automatically on the tested Windows
machine, uses the local pinned cache/JS5 server, captures
`teavm-poc/target/engine/captures/title/original-engine-canvas.png`, and
fails unless the genuine client state is `LOGIN_SCREEN`, the frame has
substantial image content, cycles advance, and no callback fatal is reported.
Use `CHROME_BIN`, `SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT`, or
`SOLOSCAPE_GAME_TCP_PORT` to override local installation paths.

For just the no-network engine-loop contract, set `CHROME_BIN` and run
`npm run test:original-browser`. Stop the interactive diagnostic before
running the title test, since both use the dedicated loopback WebSocket port.

The headless probe starts a separate ephemeral, loopback-only host. If needed,
supply `SOLOSCAPE_ENGINE_SMOKE_CODEBASE`,
`SOLOSCAPE_ENGINE_SMOKE_PARAMETERS` (JSON object of public string values), and
`SOLOSCAPE_ENGINE_SMOKE_GATEWAYS` (JSON array of host/port/WebSocket URL).
These variables are never baked into the client or written by the probe.
The test deliberately exits nonzero unless it observes **both** advancing
original `getGameCycle()` values and a changed original canvas pixel signature.

The normal SoloScape gateway requires a separate local server. A successful
byte-stream handshake does not establish game login, rendering or client parity.

## Important verification boundary

There are multiple independent gates:

1. **Compiler:** TeaVM parses and emits the original gamepack (already works).
2. **Node host contract:** The module exports configuration/cycle methods,
   validates preflight setup, and explicitly rejects missing IndexedDB.
3. **Chrome initialization:** IndexedDB mounts, the original `client` is
   constructed, configured, and `initialize()` returns without errors.
4. **Real game-cycle progress:** `getGameCycle()` increases across samples
   and the original client's thread is present.
5. **Original framebuffer:** The original Canvas 2D pixels change after
   startup. Neither a synthetic render nor the custom JS renderer counts.
6. **Live gameplay:** Native revision-240 packets/authentication and
   interaction must be verified separately. This milestone cannot claim it.

The browser diagnostics print the precise startup step, parameter **names
and presence only**, and available Java exception details if Chrome
initialization fails. An `initialized` callback alone is not a gameplay pass.

**Verified on 9 October 2026:** the pinned engine compiles and imports.
Headless Chrome mounts IndexedDB and initializes the original client with the
public revision-240 startup parameters, including `7=0` (LIVE).
In an isolated **10-second stability run** (`SOLOSCAPE_ENGINE_STABILITY_MS=10000`),
`Client.getGameCycle()` advanced from **3 to 118**, the original client thread
was present, the original Canvas 2D framebuffer changed, and both initialization
and callback error strings stayed empty. The browser probe returned
`passed: true`; there were no synthetic cycles or custom gameplay renderer.

The local compiler normalizes thirteen duplicate-name/different-descriptor JVM
gamepack fields (without touching the pinned source); `BrowserEngineCallbacks`
provides built-in non-plugin callbacks; Java `java.vendor` defaults to
`Browser` if absent; the cooperative `ThreadPoolExecutor` accepts the legal
zero-core/one-maximum pool used by the pinned client. The local JVM field-collision
fixture and browser smoke tests guard against these regressions.

**Original title framebuffer visually verified, 9 October 2026.**
An isolated Chrome title-gated test returned `passed:true`, the native
`LOGIN_SCREEN` state, an active client thread, original cycles **3 → 35**,
**285 sampled framebuffer colors**, changed real Canvas2D pixels, and no
JavaScript exceptions or callback errors. The actual **765 × 503 PNG** showed
the pinned OpenOSRS RuneScape logo, original autumn hall background,
the brown framed welcome panel, and both New User/Existing User buttons.
The verified original-engine-generated capture lives locally at
`teavm-poc/target/engine/original-title-final-captures/original-engine-canvas.png`
(and can be reproduced with `npm run test:original-title` in the canonical
capture folder). No title art was substituted or regenerated. The decisive
fix was porting the desktop `Hooks.draw(MainBufferProvider,...)` final
software-buffer blit into the built-in `BrowserEngineCallbacks.draw`.

**Milestone 1 startup/title gate is complete for the isolated Chrome harness.**
This is visual verification from the authentic pinned client, **not** an
independent pixel-by-pixel comparison with a separately captured desktop
RuneLite title frame. It does not establish login, live server gameplay,
touch-device input, mobile deployment, or RuneLite GPU parity. Those require
their own milestones and test evidence.

No original gamepack, cache data or TeaVM-generated gamepack JavaScript is
tracked or intended for redistribution. Confirm legal permission before
shipping an adapted engine.
