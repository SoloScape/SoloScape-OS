# SoloScape Web Client

This directory contains the browser-native SoloScape client work targeting
Safari on iPhone/iPad and modern desktop browsers.

The current branch implements the browser transport, JS5 cache-index bootstrap
and cache-container decoding for OSRS protocol revision 240 / client 240.2.
Game login and rendering are not implemented yet.

## Current cache bootstrap

A successful Connect now performs:

    WebSocket connect
      -> JS5 opcode 15 + revision 240
      -> status 0
      -> request 255:255
      -> decode master-index container
      -> parse archive CRC/version metadata
      -> request every present 255:<archive> reference table
      -> decode all returned cache containers
      -> persist raw groups + parsed master metadata in IndexedDB
      -> JS5 index ready

For the currently observed SoloScape cache, the master index has 25 archive
slots. Slots 16 and 23 are empty (crc=0/version=0), leaving 23 present archive
reference tables.

## Cache container decoder

Implemented container types:

- compression 0: uncompressed/stored payload
- compression 2: gzip payload via the browser-native Compression Streams API

Compression 1 (bzip2) is deliberately rejected until a bzip2 implementation is
added.

Container layout:

    compression      u8
    compressedSize   u32
    uncompressedSize u32   # compressed containers only
    payload

The decoder validates:

- minimum header size
- exact container byte length
- maximum output size
- declared gzip uncompressed size against actual decoded output

The default maximum decoded payload is 64 MiB.

The JS5 client now keeps the decoded reference-table payloads in memory for the
next archive-reference-table parser milestone:

    window.soloscapeJs5.getArchiveIndexPayload(2)

returns a copy of the decoded payload for archive 2 after bootstrap.

## Browser requirement

Gzip decoding uses:

    DecompressionStream('gzip')

Current Safari versions supporting the Compression Streams API can decode these
containers without shipping a JavaScript gzip library. If the API is missing,
the client fails with an explicit compatibility error rather than accepting
corrupt data.

## Run locally

From WebClient:

    npm install
    npm run typecheck
    npm run test:protocol
    npm run build

Start the gateway in PowerShell:

    $env:WS_HOST="0.0.0.0"
    $env:WS_PORT="8765"
    npm run dev:gateway

Start Vite in another terminal:

    npm run dev:web

Then open from the iPhone:

    http://YOUR-PC-LAN-IP:5173

and connect to:

    ws://YOUR-PC-LAN-IP:8765

## Expected log

The new decoder milestone should add lines similar to:

    Decoded JS5 master index container: compression=0 200 -> 200 bytes.
    ...
    Reference table 7 received (.../23) ...
    Decoded reference table 7: compression=2 518772 -> <size> bytes (.../23 decoded).
    ...
    Decoded reference table 20: compression=0 46364 -> 46364 bytes (.../23 decoded).
    ...
    JS5 cache index bootstrap complete: master index + 23 present archive reference tables received and decoded.

The order of gzip completion is not assumed.

## IndexedDB

Database:

    soloscape-web-cache

Stores:

    js5-groups
    js5-metadata

Raw reconstructed containers are persisted. Decompressed reference-table payloads
are currently session-memory data; the next parser milestone will persist useful
structured group/file metadata instead of duplicating decompressed blobs.

## Debug API

The active JS5 client is available as:

    window.soloscapeJs5

Request a group manually:

    window.soloscapeJs5.requestGroup(2, 10)

Inspect a decoded archive reference-table payload:

    window.soloscapeJs5.getArchiveIndexPayload(2)

## M1 status

Complete so far:

- revision 240 JS5 handshake
- master-index parsing
- empty archive-slot handling
- archive reference-table downloads
- type 0 cache-container decoding
- type 2 gzip cache-container decoding
- strict container length validation
- gzip output-size validation
- IndexedDB raw-container persistence
- protocol/container tests

Next:

- archive reference-table structure decoding
- CRC/version validation
- request scheduler/retries/concurrency limits
- typed startup definitions

## Source of truth

Revision-specific behavior should continue to be derived from this repository,
especially:

- Client/cache
- Client/protocol/osrs-240
- existing desktop/proxy client
- Server/or-cache
- Server/game.example.yml

Do not import packet ids or transforms from unrelated OSRS revisions.
