# SoloScape Mobile (TSPS port)

> **Status: experimental TSPS integration, not yet a playable SoloScape client.** The pinned upstream source and a configurable dev/build launcher are present. A playable SoloScape mobile client has **not** been ported yet. The current `Client/` desktop RSProx launcher and `Server/` Kotlin game server remain unchanged.

This directory integrates the pinned upstream browser client as a Git submodule at `tsps-upstream/`, based on [RSPSApp/tsps](https://github.com/RSPSApp/tsps), which provides a React/TypeScript/WebGL OSRS-style game client. Track the work in [issue #32](https://github.com/SoloScape/SoloScape-OS/issues/32).

## Source baseline

- Upstream project: `RSPSApp/tsps`, pinned as the `Mobile/tsps-upstream/` Git submodule (initialise it when cloning).
- Reviewed upstream commit: [`b9ca431be440174fce5adf0efbb7afa992358916`](https://github.com/RSPSApp/tsps/commit/b9ca431be440174fce5adf0efbb7afa992358916)
- Relevant upstream paths:
  - [`client/`](https://github.com/RSPSApp/tsps/tree/main/client): TypeScript WebGL game client, UI, network layer and cache loading
  - [`client/game/GamePage.tsx`](https://github.com/RSPSApp/tsps/blob/main/client/game/GamePage.tsx): browser game entry point
  - [`client/network/serverConnection/`](https://github.com/RSPSApp/tsps/tree/main/client/network/serverConnection): client/server integration to audit
  - [`client/index.css`](https://github.com/RSPSApp/tsps/blob/main/client/index.css): dynamic viewport and iOS Safari landscape support
  - [`client/public/index.html`](https://github.com/RSPSApp/tsps/blob/main/client/public/index.html): PWA and mobile viewport metadata

TSPS's repository license is **BSD 2-Clause**; retain its copyright notices, license conditions and disclaimer when porting code, and audit third-party dependencies/assets separately. Do not copy cache dumps, API secrets or copyrighted game assets without appropriate rights.

## Compatibility boundary

SoloScape's existing `Client/` is **RSProx**, a desktop OSRS traffic proxy/launcher, **not** a browser client. SoloScape's `Server/` is a Kotlin OpenRune/RSMod-derived server and documents OSRS revision **240.2**. TSPS currently targets its own TypeScript server and ships an example localhost world at port `43594`. The pinned TSPS cache target is **OSRS revision 241** (`server/target.txt`) versus SoloScape's documented **240.2**. The new launcher prints a warning if they differ. Do **not** assume TSPS packets, client revision, encryption, caches or session flow match SoloScape's server.

A browser cannot open the game's raw TCP socket directly. The native stream gateway under `Mobile/gateway/` now provides a guarded WebSocket-to-raw-TCP transport **for clients that already speak native OSRS**. TSPS does **not**: its own opcode 200 HELLO/204 LOGIN framing is incompatible with rsprot. The gateway rejects those TSPS frames before opening the upstream socket. A separate protocol adapter and cache/revision mapping remain necessary. Production connections must use secure transport and configurable addresses. Never ship development localhost addresses or embedded credentials as production defaults.

## Proposed milestones

1. **Audit:** Record the upstream client architecture, dependencies, supported mobile browsers, licensing and precise protocol/cache mismatches.
2. **Create a runnable client:** Bring the required upstream `client/` files into an isolated `Mobile/` workspace, with tracked provenance, a consistent Node 22+ / Yarn setup and build/typecheck instructions. Keep RSProx/Kotlin projects intact.
3. **Make connections compatible:** Implement the minimum supported SoloScape handshake, authentication, transport and game packet mapping, with a browser-safe gateway if required.
4. **Touch-first controls:** Validate movement/tap, camera gestures, menus/long press, chat/keyboard, usable UI scaling, screen orientation and safe-area handling on Android Chrome and iOS Safari.
5. **Test and document:** Confirm real login, rendering, movement, chat and disconnect/reconnect against a local SoloScape test server. Add repeatable CI builds and a mobile smoke-test checklist.

## First experimental run

**Prerequisites:** Node.js 22.16+ and Git. These instructions launch the **upstream TSPS web client**, configured with your explicit test endpoint. They do **not** establish protocol compatibility or a working SoloScape login.

1. Clone the repository including submodules, or from an existing checkout run:

   ```bash
   git submodule update --init Mobile/tsps-upstream
   ```

2. Install the upstream dependencies (the upstream setup may download sizeable dependencies and cache data):

   ```bash
   cd Mobile/tsps-upstream
   npm run setup
   cd ..
   ```

3. From `Mobile/`, set the WebSocket URL of an actual **browser-compatible** test server/gateway, then launch the browser app:

   ```bash
   SOLOSCAPE_GAME_URL=ws://192.168.1.10:43594 npm run dev
   ```

   In Windows PowerShell:

   ```powershell
   $env:SOLOSCAPE_GAME_URL = 'ws://192.168.1.10:43594'
   npm run dev
   ```

   The web dev server defaults to **port 3001**, bound to `0.0.0.0` for LAN device testing. Open `http://YOUR_PC_LAN_IP:3001` on Android or iOS. A phone opening `localhost` would connect to the phone itself, not your PC. Mobile PWAs and some browser capabilities may require HTTPS or a trusted local certificate. **Do not expose the development server publicly.**

   There is no known working SoloScape browser gateway yet. A raw TCP game port cannot be consumed directly by a browser, so the URL example is illustrative until a WebSocket-compatible adapter exists.

4. To validate launcher configuration independently of the upstream runtime:

   ```bash
   npm test
   ```

### Supported environment variables

| Variable | Meaning |
| --- | --- |
| `SOLOSCAPE_GAME_URL` | **Required:** explicit `ws://` or `wss://` browser game endpoint (no path, credentials or query) |
| `SOLOSCAPE_CACHE_BASE_URL` | Optional in development; explicit `http(s)://` cache URL. Required over HTTPS for production builds |
| `SOLOSCAPE_SERVER_NAME` | Name shown on the upstream server selector |
| `SOLOSCAPE_WEB_PORT` | Dev HTTP port, default `3001` |
| `SOLOSCAPE_WEB_HOST` | Dev listen address, default `0.0.0.0` |

The launcher maps these to the upstream client’s `REACT_APP_*` variables. **Anything with `REACT_APP_` is public in browser code—never put API tokens or credentials there.** TSPS still uses its own cache by default in development, which is **not** guaranteed compatible with SoloScape.

A production bundle can be attempted from `Mobile/` with `npm run build` after supplying `SOLOSCAPE_GAME_URL=wss://...` and `SOLOSCAPE_CACHE_BASE_URL=https://.../caches/`. This only builds the upstream client; it does **not** add the missing server protocol integration. Upstream packages require their own setup first.

## Native WebSocket-to-TCP gateway (transport foundation)

The standalone `gateway/` is deliberately a **raw byte transport**, not a converter. Its purpose is to provide a browser-compatible transport for a future native-OSRS client encoder/decoder. Unlike a blanket TCP proxy, it validates the initial native login/JS5 handshake opcode before allowing TCP forwarding and refuses TSPS's proprietary HELLO (200) or LOGIN (204). **Do not point the unmodified TSPS client at it expecting to log in.**

To start it locally once dependencies have been installed:

```bash
cd Mobile
npm install
SOLOSCAPE_GATEWAY_ENABLE_NATIVE=1 \
SOLOSCAPE_GAME_TCP_PORT=43594 \
SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS=http://localhost:3001 \
npm run gateway
```

Set `SOLOSCAPE_GAME_TCP_PORT` to the **actual SoloScape game TCP port** from your local server configuration; `43594` above is just an example and is not confirmed as SoloScape's configured port. Native gateway default: `127.0.0.1:43595`, upstream default host `127.0.0.1`. There is no open-proxy capability: the destination is fixed at process start.

| Gateway variable | Purpose |
| --- | --- |
| `SOLOSCAPE_GATEWAY_ENABLE_NATIVE=1` | Mandatory acknowledgment that **native OSRS byte streams**, not TSPS, are supported |
| `SOLOSCAPE_GAME_TCP_HOST` | Fixed upstream game host (default `127.0.0.1`) |
| `SOLOSCAPE_GAME_TCP_PORT` | **Required** upstream game TCP port |
| `SOLOSCAPE_GATEWAY_HOST` | Gateway bind host (default `127.0.0.1`) |
| `SOLOSCAPE_GATEWAY_PORT` | Browser-facing WebSocket port (default `43595`) |
| `SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS` | **Required** comma-separated exact browser origins, e.g. `http://localhost:3001` |
| `SOLOSCAPE_GATEWAY_ALLOW_LAN=1` | Explicit opt-in when binding beyond loopback |

The gateway checks origin and path at upgrade, uses binary-only WebSocket frames, caps message sizes/queues, and closes failed or incompatible connections. Default HTTP transport is **not encrypted**: for a production deployment, bind on loopback behind a properly configured TLS reverse proxy and connect with `wss://`. Do not expose plaintext `ws://` to the public Internet or use it for real accounts.

`npm test` includes a TCP echo integration test that verifies native bytes are carried intact, TSPS HELLO is rejected, and cross-origin requests fail. This does **not** validate native client gameplay, rsprot login or TSPS integration.

### Credential-free cache protocol check

Before implementing native login, you can probe a **running local** SoloScape TCP server's JS5 response without sending account credentials:

```bash
cd Mobile
SOLOSCAPE_GAME_TCP_PORT=43594 SOLOSCAPE_NATIVE_REVISION=240 npm run probe
```

Use the actual `gamePort` and native cache **major revision** from your running SoloScape configuration. The example `240` follows the documented `240.2` version; do not assume it matches a deployed server. The probe sends exactly the standard JS5 start opcode (15) and a four-byte big-endian revision. A response code 0 means the initial JS5 handshake was accepted, **not** that assets can be loaded or a player can log in. The Node integration tests run against mock TCP endpoints; the real SoloScape service has not been probed yet.

See [protocol compatibility notes](PROTOCOL.md) for the packet differences and further work.

## Known incompatibilities / next engineering work

- TSPS upstream revision **241** versus SoloScape's documented **240.2**: align supported protocol, game packets, cache ids and interface definitions.
- The native WebSocket-to-TCP gateway is implemented, but **TSPS cannot use it yet** because its proprietary application packets require a real native OSRS encoder/decoder + authentication and cache adapter.
- TSPS's cache and build scripts depend on portions of the TSPS server project. Those scripts run **in the upstream submodule**, while SoloScape's Kotlin server stays unchanged.
- TSPS's existing touch gestures, PWA, iOS landscape handling and WebGL renderer are available in the pinned source; Android/iOS real-device smoke tests and SoloScape branding still remain.

CI checks the launcher configuration and syntax; it does not yet prove the TSPS client can render or connect to SoloScape.

## Scope

The mobile client should be additive. Avoid replacing `Client/`, changing SoloScape's existing desktop-client launch flows, or porting the whole TSPS TypeScript game server unless a specific compatibility requirement is established.
