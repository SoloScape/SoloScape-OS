# SoloScape Web Client

This directory contains the browser-native SoloScape client work targeting
Safari on iPhone/iPad and modern desktop browsers.

The current branch implements the browser transport and the JS5 cache-index
bootstrap for OSRS protocol revision 240 / client 240.2. Game login and rendering
are not implemented yet.

## Current cache bootstrap

A successful Connect now performs:

    WebSocket connect
      -> JS5 opcode 15 + revision 240
      -> status 0
      -> request 255:255
      -> parse master index
      -> request 255:0 through 255:N
      -> reconstruct every archive reference-table container
      -> persist raw groups + parsed master metadata in IndexedDB
      -> JS5 index ready

For the currently observed SoloScape cache, the master-index payload is 200 bytes.
The master-index format is 8 bytes per archive entry, so this build exposes 25
archives.

Each record contains:

    crc:     u32
    version: u32

The record position is the archive id.

CRC values are recorded and displayed for diagnostics, but are not yet enforced
against the returned reference-table bytes. That validation belongs with the
cache-container/reference-table decoder so it can checksum the same byte range
as the original cache implementation.

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

The gateway does not parse OSRS traffic. Every browser WebSocket connection maps
to its own TCP connection.

WebSocket frames are treated as arbitrary chunks of a continuous byte stream.
The browser JS5 decoder independently reconstructs 512-byte JS5 blocks and
removes 0xff continuation delimiters.

## Run locally

From WebClient:

    npm install
    npm run typecheck
    npm run test:protocol
    npm run build

Start the gateway:

PowerShell:

    $env:WS_HOST="0.0.0.0"
    $env:WS_PORT="8765"
    npm run dev:gateway

Start Vite in another terminal:

    npm run dev:web

Then open from the iPhone:

    http://YOUR-PC-LAN-IP:5173

and use:

    ws://YOUR-PC-LAN-IP:8765

The browser remembers the last gateway URL in localStorage.

## Expected log

The new milestone should produce a sequence similar to:

    TX JS5 init: opcode=15 revision=240 key=[0, 0, 0, 0]
    RX JS5 handshake status=0
    TX JS5 request 255:255 priority=urgent
    RX JS5 group 255:255 compression=0 size=200 container=205 bytes
    Parsed JS5 master index: 25 archives from 200 bytes.
    Archive 0 crc=0x........ version=...
    ...
    Archive 24 crc=0x........ version=...
    TX JS5 archive reference-table requests: 25 groups (255:0..255:24).
    Reference table 0 received (1/25) ...
    ...
    Reference table 24 received (25/25) ...
    JS5 cache index bootstrap complete: master index + 25 archive reference tables received.

The exact response order is not assumed. Completion is tracked by archive id.

## IndexedDB

Database:

    soloscape-web-cache

Stores:

    js5-groups
    js5-metadata

js5-groups contains reconstructed raw cache containers keyed by archive:group.

js5-metadata currently contains the parsed master index with CRC/version metadata.

The database schema is version 2. Existing development databases created by the
previous scaffold upgrade automatically.

## Debug API

The active JS5 client remains available in the browser console:

    window.soloscapeJs5

After bootstrap you can still request a specific cache group manually:

    window.soloscapeJs5.requestGroup(2, 10)

## Implementation milestones

### M0 - transport

Complete:

- Vite + TypeScript browser shell
- mobile/Safari viewport
- binary WebSocket transport
- raw WebSocket-to-TCP gateway

### M1 - JS5/cache bootstrap

Complete so far:

- revision 240 JS5 init
- master-index request
- master-index CRC/version parser
- automatic archive reference-table requests
- incremental JS5 response framing
- IndexedDB persistence
- fragmented-stream protocol tests

Next M1 work:

- cache-container decompression
- archive reference-table decoding
- CRC/version validation
- request scheduler/retries/concurrency limits
- typed startup definitions

### M2 - game login

Still to implement:

- initial game connection / server seed
- login block
- RSA
- ISAAC
- login response handling

### M3 - game stream

Still to implement:

- revision 240 packet table
- fixed/variable packet framing
- ISAAC opcode decoding
- gameplay packet state machine

### M4+ - playable client

Still to implement:

- regions/terrain/objects
- models/animations
- player/NPC updates
- interfaces/inventory/chat
- walking/interactions
- touch controls
- WebGL renderer
- optional WASM hot paths
- HTTPS/WSS production deployment
- iOS lifecycle/memory hardening

## Source of truth

Revision-specific behavior should continue to be derived from this repository,
especially:

- Client/cache
- Client/protocol/osrs-240
- existing desktop/proxy client
- Server/or-cache
- Server/game.example.yml

Do not import packet ids or transforms from unrelated OSRS revisions.
