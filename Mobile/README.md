# SoloScape Mobile (TSPS port)

> **Status: planning/scaffolding only.** A playable SoloScape mobile client has **not** been ported yet. The current `Client/` desktop RSProx launcher and `Server/` Kotlin game server remain unchanged.

This directory will house a mobile-first browser client based on [RSPSApp/tsps](https://github.com/RSPSApp/tsps), which provides a React/TypeScript/WebGL OSRS-style game client. Track the work in [issue #32](https://github.com/SoloScape/SoloScape-OS/issues/32).

## Source baseline

- Upstream project: `RSPSApp/tsps`
- Reviewed upstream commit: [`b9ca431be440174fce5adf0efbb7afa992358916`](https://github.com/RSPSApp/tsps/commit/b9ca431be440174fce5adf0efbb7afa992358916)
- Relevant upstream paths:
  - [`client/`](https://github.com/RSPSApp/tsps/tree/main/client): TypeScript WebGL game client, UI, network layer and cache loading
  - [`client/game/GamePage.tsx`](https://github.com/RSPSApp/tsps/blob/main/client/game/GamePage.tsx): browser game entry point
  - [`client/network/serverConnection/`](https://github.com/RSPSApp/tsps/tree/main/client/network/serverConnection): client/server integration to audit
  - [`client/index.css`](https://github.com/RSPSApp/tsps/blob/main/client/index.css): dynamic viewport and iOS Safari landscape support
  - [`client/public/index.html`](https://github.com/RSPSApp/tsps/blob/main/client/public/index.html): PWA and mobile viewport metadata

TSPS's repository license is **BSD 2-Clause**; retain its copyright notices, license conditions and disclaimer when porting code, and audit third-party dependencies/assets separately. Do not copy cache dumps, API secrets or copyrighted game assets without appropriate rights.

## Compatibility boundary

SoloScape's existing `Client/` is **RSProx**, a desktop OSRS traffic proxy/launcher, **not** a browser client. SoloScape's `Server/` is a Kotlin OpenRune/RSMod-derived server and documents OSRS revision **240.2**. TSPS currently targets its own TypeScript server and ships an example localhost world at port `43594`. Do **not** assume TSPS packets, client revision, encryption, caches or session flow match SoloScape's server.

A browser cannot open the game's raw TCP socket directly. A compatible WebSocket endpoint or gateway may be needed; confirm the transport and handshake before adopting a design. Production connections must use secure transport and configurable addresses. Never ship development localhost addresses or embedded credentials as production defaults.

## Proposed milestones

1. **Audit:** Record the upstream client architecture, dependencies, supported mobile browsers, licensing and precise protocol/cache mismatches.
2. **Create a runnable client:** Bring the required upstream `client/` files into an isolated `Mobile/` workspace, with tracked provenance, a consistent Node 22+ / Yarn setup and build/typecheck instructions. Keep RSProx/Kotlin projects intact.
3. **Make connections compatible:** Implement the minimum supported SoloScape handshake, authentication, transport and game packet mapping, with a browser-safe gateway if required.
4. **Touch-first controls:** Validate movement/tap, camera gestures, menus/long press, chat/keyboard, usable UI scaling, screen orientation and safe-area handling on Android Chrome and iOS Safari.
5. **Test and document:** Confirm real login, rendering, movement, chat and disconnect/reconnect against a local SoloScape test server. Add repeatable CI builds and a mobile smoke-test checklist.

## Current run instructions

None yet. This folder is an integration plan and deliberately does **not** pretend to be an installed or working copy of TSPS. Follow issue #32 as implementation is added.

## Scope

The mobile client should be additive. Avoid replacing `Client/`, changing SoloScape's existing desktop-client launch flows, or porting the whole TSPS TypeScript game server unless a specific compatibility requirement is established.
