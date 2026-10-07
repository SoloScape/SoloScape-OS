# SoloScape Web Client

This directory is an implementation scaffold for running a SoloScape-compatible
client directly in a modern browser, including Safari on iPhone/iPad.

The current branch implements the browser transport plus the first real OSRS
protocol slice: revision 240 JS5 connection bootstrap and master-index retrieval.
It does not yet implement game login or rendering.

## Target

- Server protocol revision: 240
- Matching client target used by this repository: 240.2
- SoloScape game TCP endpoint: 127.0.0.1:43594 by default
- Browser transport: binary WebSocket
- Browser rendering target: Canvas/WebGL, with WASM available for hot paths later

Use Client/protocol/osrs-240, Client/cache and the existing desktop client in this
repository as the source of truth for packet ids, packet lengths, transforms,
JS5 behavior, login behavior and revision-specific constants.

Do not copy packet ids from a different OSRS revision.

## Architecture

    Safari / desktop browser
              |
              | ws:// or wss://
              v
    WebClient/gateway
              |
              | raw TCP stream
              v
    SoloScape server :43594

The gateway intentionally does not parse, encrypt, frame or reinterpret OSRS
traffic. Every browser WebSocket connection receives its own TCP connection to
the game server.

That allows the browser implementation to open separate connections for JS5 and
game/login flows when required by the revision 240 client behavior.

WebSocket messages are not OSRS packet boundaries. The JS5 stream decoder
reassembles arbitrary WebSocket chunks and handles the protocol's 512-byte
response blocks independently.

## Current JS5 bootstrap

When Connect is pressed, the browser now:

1. opens a binary WebSocket to the gateway;
2. sends login opcode 15 followed by revision 240 and four 32-bit JS5 key words;
3. waits for the one-byte JS5 login status;
4. on status 0, requests the master index at archive 255, group 255;
5. reconstructs the cache container while removing 0xff block delimiters;
6. stores the raw cache container in IndexedDB;
7. leaves the JS5 socket open for subsequent archive/group requests.

The four key words default to zero and are an explicit argument to Js5Client so
they can be changed without altering the stream decoder if a target requires
different values.

For development, the active JS5 client is also exposed as:

    window.soloscapeJs5

For example, after the master index has loaded:

    window.soloscapeJs5.requestGroup(2, 10)

This is only a debugging convenience. Production client code should request
groups through a cache/bootstrap layer rather than directly from the global.

## Run locally

Requirements:

- Node.js 20 or newer
- SoloScape server running locally

From WebClient:

    npm install

Terminal 1, start the TCP bridge:

    npm run dev:gateway

Terminal 2, start the browser dev server:

    npm run dev:web

Then open:

    http://localhost:5173

To type-check and run the JS5 framing tests:

    npm run typecheck
    npm run test:protocol

## Test from iPhone Safari on the same Wi-Fi

By default the gateway binds to loopback for safety. Bind it to the PC LAN
interface when testing from another device.

PowerShell, using port 8765 as an example:

    $env:WS_HOST="0.0.0.0"
    $env:WS_PORT="8765"
    npm run dev:gateway

Command Prompt:

    set WS_HOST=0.0.0.0
    set WS_PORT=8765
    npm run dev:gateway

The Vite dev server already listens on all interfaces. Find the PC LAN address,
for example 192.168.1.50, and open this on the iPhone:

    http://192.168.1.50:5173

Set the gateway field to the same port:

    ws://192.168.1.50:8765

The browser remembers the last gateway field value in localStorage.

Allow ports 5173 and the selected gateway port through the local firewall for
private-network access if required.

Do not expose the unauthenticated development gateway directly to the public
internet.

For an internet-facing deployment, serve the web client over HTTPS and place the
gateway behind a TLS reverse proxy so Safari connects with WSS. Add origin
restrictions and authentication before public exposure.

## Gateway configuration

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| WS_HOST | 127.0.0.1 | WebSocket bind address |
| WS_PORT | 8080 | WebSocket port |
| GAME_HOST | 127.0.0.1 | SoloScape TCP host |
| GAME_PORT | 43594 | SoloScape TCP port |
| WS_ALLOWED_ORIGIN | unset | Optional exact browser Origin allow-list |

Example:

    WS_HOST=0.0.0.0 WS_PORT=8765 GAME_HOST=127.0.0.1 GAME_PORT=43594 npm run dev:gateway

## Expected bootstrap log

A successful first pass should look roughly like:

    Connecting JS5 socket to ws://192.168.0.129:8765
    TX JS5 init: opcode=15 revision=240 key=[0, 0, 0, 0]
    RX JS5 handshake status=0
    TX JS5 request 255:255 priority=urgent
    RX JS5 group 255:255 compression=... size=... container=... bytes
    Master index payload available: ... bytes.
    JS5 bootstrap complete.
    Cached JS5 group 255:255 in IndexedDB.

If the status is non-zero, keep the numeric status in the bug report. If the
socket closes before a status arrives, inspect the SoloScape server console at
the same time.

## Implementation milestones

### M0 - transport scaffold

Included:

- Vite + TypeScript browser shell
- iPhone safe-area and landscape-friendly layout
- binary WebSocket transport
- raw WebSocket-to-TCP gateway
- protocol/client revision constants
- mobile-web-app manifest

### M1 - JS5/cache bootstrap

Included:

- revision 240 JS5 init packet
- configurable four-word JS5 handshake key
- one-byte handshake response handling
- archive/group request encoder
- incremental response stream decoder
- 512-byte JS5 block and 0xff delimiter handling
- master-index request at 255:255
- IndexedDB raw group persistence
- protocol tests for fragmentation and continuation blocks

Still to implement in M1:

- master-index structure decoding
- compression codecs for compressed cache containers
- archive reference-table decoding
- cache validation/version metadata
- request scheduler, retries and concurrency
- loading required startup archives into typed definitions

### M2 - login

Port and validate:

- initial login handshake
- server seed handling
- login block construction
- RSA step
- ISAAC seed derivation/ciphers
- login response handling

Do not put RSA private material in the browser. The browser only needs the
client-side public-key behavior expected by the server.

### M3 - packet framing

Add a revision 240 packet table from the repository's protocol module and
implement:

- fixed-size packets
- byte-length variable packets
- short-length variable packets
- ISAAC opcode decoding
- incremental stream parsing

Add fixtures for packet framing before implementing gameplay handlers.

### M4 - scene bootstrap

Implement enough cache and protocol support to reach an in-game scene:

- rebuild region
- terrain
- location/object placement
- local player
- camera
- basic software Canvas or WebGL renderer

Rendering should consume a client-side world model rather than decode packets
inside drawing code.

### M5 - entities and input

Add:

- player updates
- NPC updates
- walking
- object/NPC/player interactions
- pointer coordinate conversion
- long-press context menu
- camera drag
- pinch zoom

Keep logical game coordinates based on the 765x503 viewport and scale only at
the presentation edge.

### M6 - interfaces and usability

Add:

- widgets/interfaces
- inventory/equipment
- varps/varbits
- chat
- fonts/sprites
- audio
- virtual keyboard handling
- reconnect/error UX

### M7 - Safari/PWA hardening

Validate on current iOS Safari:

- memory pressure and cache eviction behavior
- WebGL context loss/recovery
- background/foreground socket behavior
- touch-action and gesture conflicts
- landscape safe areas
- Add to Home Screen behavior

Then add production HTTPS/WSS deployment documentation.

## Suggested source layout as implementation grows

    WebClient/
      gateway/              WebSocket to TCP bridge
      src/
        cache/              JS5, archives, IndexedDB
        crypto/             ISAAC/RSA helpers
        net/                browser transports
        protocol/
          rev240/           packet tables and state machines
        scene/              world model and region state
        render/             Canvas/WebGL/WASM boundary
        input/              mouse, touch and keyboard mapping
        ui/                 shell and client UI
        wasm/               optional Rust/WASM integration boundary

Prefer TypeScript first for correctness and iteration speed. Move measured hot
paths such as model transforms, rasterization, animation or cache codecs into
Rust/WASM only when profiling justifies it.

## Definition of the first playable slice

A useful first vertical slice is:

1. Safari loads the page.
2. Browser completes JS5/cache bootstrap.
3. Browser completes revision 240 login.
4. Server places the local player.
5. Browser renders one region.
6. Tapping terrain sends walking.
7. Player movement updates render correctly.

Once that works, grow packet and interface coverage incrementally rather than
attempting a full desktop-client port in one pass.
