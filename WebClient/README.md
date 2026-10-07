# SoloScape Web Client scaffold

This directory is an implementation scaffold for running a SoloScape-compatible
client directly in a modern browser, including Safari on iPhone/iPad.

It does not yet implement the OSRS game protocol or renderer. The first commit
deliberately establishes the browser, transport and development boundaries so
revision-specific protocol work can be added without replacing the networking
layer later.

## Target

- Server protocol revision: 240
- Matching client target used by this repository: 240.2
- SoloScape game TCP endpoint: 127.0.0.1:43594 by default
- Browser transport: binary WebSocket
- Browser rendering target: Canvas/WebGL, with WASM available for hot paths later

Use Client/protocol/osrs-240 and the existing desktop client in this repository
as the source of truth for packet ids, packet lengths, transforms, JS5 behavior,
login behavior and revision-specific constants.

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

WebSocket messages are not OSRS packet boundaries. The browser includes
ByteQueue for stream reassembly and protocol decoders must consume from that
queue based on their current state.

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

The page currently proves the browser-to-gateway transport only. It will connect
but intentionally sends no OSRS handshake yet.

## Test from iPhone Safari on the same Wi-Fi

By default the gateway binds to loopback for safety. Bind it to the PC LAN
interface when testing from another device.

PowerShell:

    $env:WS_HOST="0.0.0.0"
    npm run dev:gateway

Command Prompt:

    set WS_HOST=0.0.0.0
    npm run dev:gateway

The Vite dev server already listens on all interfaces. Find the PC LAN address,
for example 192.168.1.50, and open this on the iPhone:

    http://192.168.1.50:5173

The page will default its gateway URL to:

    ws://192.168.1.50:8080

Allow ports 5173 and 8080 through the local firewall for private-network access
if required.

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

    WS_HOST=0.0.0.0 GAME_HOST=127.0.0.1 GAME_PORT=43594 npm run dev:gateway

## Implementation milestones

### M0 - transport scaffold

Included in this branch:

- Vite + TypeScript browser shell
- iPhone safe-area and landscape-friendly layout
- binary WebSocket transport
- stream-oriented ByteQueue
- raw WebSocket-to-TCP gateway
- protocol/client revision constants
- mobile-web-app manifest
- clear boundary between transport and revision-specific protocol code

### M1 - JS5/cache bootstrap

Implement the revision 240 JS5 handshake and archive request/response state
machine.

Recommended browser storage:

- IndexedDB for persistent cache blobs and metadata
- in-memory decoded definitions for the active session

Keep cache decoding separate from the transport. The browser should be able to
feed captured or fixture bytes into decoders without a live socket.

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
- incremental parsing from ByteQueue

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
