# SoloScape Web Client

This directory contains the browser-native SoloScape client work targeting
Safari on iPhone/iPad and modern desktop browsers.

The current branch implements browser transport, a validated/bounded JS5 cache
client, the rev-240 game-login handshake, server game-packet framing,
normal/instanced region rebuild decoding, and the static terrain/loc/model
asset pipeline for OSRS protocol revision 240 / client 240.2.

## Current game-login flow

Game login uses a second WebSocket/TCP connection after JS5 bootstrap:

    JS5 ready
      -> collect the 23 present master-index CRCs
      -> game init opcode 14
      -> status 0 + 8-byte server session id
      -> generate four login/ISAAC seeds
      -> construct rev-240 RSA authentication block
      -> RSA encrypt with the SoloScape public key
      -> construct desktop login metadata + transformed cache CRC block
      -> XTEA encrypt the metadata block
      -> game login opcode 16
      -> initialize client/server ISAAC streams
      -> decode login response
      -> retain the server ISAAC state
      -> decode ISAAC-encrypted smart 1-or-2-byte server opcodes
      -> read fixed / VAR_BYTE / VAR_SHORT packet lengths
      -> emit framed server game packets
      -> decode REBUILD_NORMAL_V2 / REBUILD_REGION_V2
      -> expose required mapsquares + instance zone placements
      -> resolve archive-5 mX_Z / lX_Z groups
      -> decode terrain + static loc placements
      -> load loc definitions from 2:6
      -> resolve/download model groups from archive 7
      -> decode model vertices + triangles

The gateway reads the public RSA key from:

    Server/.data/client.key

and sends the exponent/modulus to the browser as a small text control frame.
JS5 ignores this frame and continues to use binary frames exactly as before.
Override key discovery with `RSA_PUBLIC_KEY_FILE`, or provide
`RSA_MODULUS` / `RSA_EXPONENT` directly.

The rev-240 success response advertises a size of 37, while the login metadata
encoder actually emits 34 bytes. The browser consumes only those 34 metadata
bytes and passes any subsequent bytes directly into the game-packet framer using
the already-advanced server ISAAC stream; the cipher is never reseeded.

Password values are never stored in localStorage. The username may be retained
for convenience; the password input is cleared after submission.

## Current JS5 flow

A successful Connect now performs:

    WebSocket connect
      -> rev-240 JS5 handshake
      -> master index 255:255
      -> parse archive CRC/version metadata
      -> bounded/retried 255:<archive> reference-table queue
      -> decode type 0/type 2 cache containers
      -> parse reference-table structure
      -> validate reference-table CRC + version
      -> persist validated reference tables
      -> JS5 index ready

After bootstrap, client code can select an archive/group:

    reference tables
      -> select archive/group
      -> bounded JS5 request queue
      -> receive group container
      -> validate group CRC
      -> restore + validate group version trailer
      -> decode container
      -> unpack group into reference-table file ids
      -> persist validated group
      -> typed startup definition loading

The observed SoloScape cache has 25 master-index slots. Slots 16 and 23 are
empty, leaving 23 present archive reference tables.

## Static scene asset pipeline

The browser JS5 connection is backed by SoloScape's `.data/cache/LIVE` cache.
That is distinct from the server's processed `.data/cache/SERVER` map layout:
the browser therefore follows the live OSRS cache naming convention rather than
the server-side repacked mapsquare groups.

For every mapsquare required by a rebuild:

    archive 5 reference table
      -> hash/resolve m<X>_<Z> terrain group
      -> hash/resolve l<X>_<Z> location group
      -> validated JS5 download
      -> decode 4 x 64 x 64 terrain tiles
      -> decode delta/smart-compressed loc placements
      -> collect unique loc ids
      -> load archive 2 / group 6 loc definitions once
      -> follow loc transform definitions
      -> collect unique model ids
      -> validated archive-7 model downloads
      -> decode old/type1/type2/type3 model geometry

The rev-240 terrain decoder follows SoloScape's server decoder: tile opcodes are
16-bit, overlays are signed 16-bit ids, and render flags/underlays use the
modern opcode ranges. Opcode-0 terrain heights remain marked implicit so the
renderer/scene builder can derive the procedural absolute height from the
world tile coordinates.

Location definitions retain model ids/types, dimensions, rotations,
scale/translation, recolors/retextures and transform chains. Model decoding
retains vertex coordinates, triangle indices, face colors/textures,
transparency/render types and type-0 texture triangles.

Raw model group bytes are released after geometry decoding to avoid keeping a
second copy of the scene's model payloads in memory on mobile.

## Request scheduler

Js5RequestScheduler owns post-master-index JS5 requests.

Defaults:

    max in flight: 8
    request timeout: 10 seconds
    retries: 2

The scheduler:

- bounds simultaneous requests;
- queues excess work;
- deduplicates callers requesting the same archive/group;
- accepts out-of-order responses;
- retries timed-out requests;
- cancels queued/in-flight work when the connection closes.

The same scheduler now handles reference-table bootstrap traffic and ordinary
asset groups.

## Development ports

The embedded Central HTTP service uses port 8080. The WebSocket gateway therefore
defaults to 8081 and forwards to the game/JS5 TCP service on 43594:

    Central HTTP       127.0.0.1:8080
    WebSocket gateway  127.0.0.1:8081
    Game/JS5 TCP       127.0.0.1:43594

Override the gateway with WS_HOST / WS_PORT and the upstream with GAME_HOST /
GAME_PORT when needed.

## Reference-table CRC/version validation

Each master-index entry contains:

    crc      u32
    version  u32

For each returned 255:<archive> reference table the web client:

1. reconstructs the raw cache container from JS5 framing;
2. decodes and parses the reference table;
3. computes IEEE CRC-32 over the complete reconstructed cache container;
4. compares the result with the master-index CRC;
5. compares the parsed reference-table version with the master-index version;
6. only then stores the raw container and structured metadata in IndexedDB.

The CRC covers:

    compression byte
    compressed-size field
    uncompressed-size field when present
    compressed/stored payload

It does not include JS5's 512-byte transport framing or 0xff continuation bytes.

## Ordinary cache-group validation

Reference-table group entries supply the expected group checksum and version.

SoloScape's server deliberately strips the two-byte cache-sector version trailer
from ordinary groups before transmitting them over JS5. The browser therefore:

1. validates CRC-32 over the received reconstructed container;
2. restores the two-byte trailer from the low 16 bits of the reference-table
   group version;
3. validates that trailer;
4. decodes the container;
5. persists the validated wire container plus the restored on-disk cache form.

This matches the repository's OpenRS2-compatible cache code, which strips the
version trailer for JS5 delivery and restores it for disk-cache storage.

## Group/file unpacking

After container validation and decompression, ordinary groups are split using
the same layout as OpenRS2 Group.unpack():

- single-file groups map the complete decoded payload to the one reference-table
  file id;
- multi-file groups read the final stripe-count byte;
- the preceding signed 32-bit delta table reconstructs each file's length for
  every stripe;
- sparse reference-table file ids are preserved.

downloadGroup() now returns a files map keyed by the real file id, and
downloadFile(archive, group, file) returns an individual file.

## Typed startup definitions/assets

Once the reference-table bootstrap reaches ready, the browser automatically
loads the same config groups used by Client/cache/OldSchoolCache.kt:

    archive 2 / group 9   NPC definition files
    archive 2 / group 14  varbit definitions

NPC files are exposed as typed definition assets ready for the future NPC
decoder. Varbits are fully decoded into id/baseVar/startBit/endBit records using
the revision-240 opcode format already implemented by the desktop cache client.

The resulting object is exposed as:

    window.soloscapeStartupAssets

with:

    npcDefinitionFiles
    varbitDefinitions

## Archive reference-table parser

Implemented protocols:

- protocol 5: original format using unsigned 16-bit counts/deltas
- protocol 6: versioned format using unsigned 16-bit counts/deltas
- protocol 7: smart format using unsigned 2-or-4-byte counts/deltas

Supported flags:

- 0x01: group/file name hashes
- 0x02: 64-byte Whirlpool group digests
- 0x04: compressed and uncompressed group lengths
- 0x08: uncompressed group checksums

For each archive the parser exposes group IDs, CRCs, versions, file IDs and all
optional metadata indicated by those flags.

## Cache container decoder

Implemented:

- compression 0: stored/uncompressed
- compression 2: gzip through DecompressionStream('gzip')

Compression 1 (bzip2) is still explicitly unsupported.

## IndexedDB

Database:

    soloscape-web-cache

Stores:

    js5-groups
    js5-metadata

js5-groups records now include validation state, CRC, version, the reconstructed
wire container, and (for ordinary archive groups) cacheFile with the restored
two-byte version trailer.

js5-metadata contains:

    master-index
    reference-table:<archive>

## Debug API

The live client remains exposed as:

    window.soloscapeJs5

Get a parsed reference table:

    window.soloscapeJs5.getArchiveReferenceTable(2)

Inspect scheduler state:

    window.soloscapeJs5.getRequestQueueStatus()

Download, validate, decode, and persist an actual group:

    const group = await window.soloscapeJs5.downloadGroup(2, 9)
    group.crc
    group.version
    group.data
    group.files.get(0)

Fetch one file directly:

    const file = await window.soloscapeJs5.downloadFile(2, 9, 0)

After automatic startup loading:

    window.soloscapeStartupAssets?.npcDefinitionFiles
    window.soloscapeStartupAssets?.varbitDefinitions

After a region rebuild packet is received:

    window.soloscapeRegionRebuild
    window.soloscapeSceneMaps
    window.soloscapeSceneAssets

Normal rebuilds expose center zone, world-area id, and the static mapsquares
covering the 13x13-zone scene window. Instanced rebuilds expose all 676
destination slots, each populated slot's source plane/zone/rotation, and the
deduplicated source mapsquares required to assemble the instance.

`soloscapeSceneMaps` contains decoded terrain and static loc placements.
`soloscapeSceneAssets` contains the required loc definitions and decoded
archive-7 model geometry.

## Expected live log

Reference bootstrap is now bounded:

    Queued JS5 archive reference tables: 23 present groups; skipped 2 empty slots; max-in-flight=8.
    TX JS5 scheduled request 255:0 attempt=1 priority=urgent in-flight=1/8.
    ...
    JS5 cache index bootstrap complete: master index + 23 present archive reference tables received, decoded, parsed and validated.

An ordinary group download adds:

    Queued JS5 cache group 2:9 expected-crc=0x........ version=...
    TX JS5 scheduled request 2:9 attempt=1 priority=urgent in-flight=1/8.
    Validated JS5 cache group 2:9: crc=0x........ version=... trailer=...
    Decoded, unpacked and cached JS5 group 2:9: compression=2 ... -> ... bytes; files=...
    Loading typed startup definition groups 2:9 (npc) and 2:14 (varbit).
    Typed startup definitions ready: ... NPC definition files; ... varbit definitions.

CRC/version or group-unpack failures are rejected and invalid groups are not
exposed as startup assets.

## Tests / CI

From WebClient:

    npm run typecheck
    npm run test:protocol
    npm run build

`.github/workflows/webclient.yml` runs dependency installation, strict
TypeScript checking, the protocol/cache test suite, and the Vite production
build on WebClient pushes and pull requests.

Tests cover stream fragmentation/continuations, master-index parsing,
container decoding, reference-table parsing, CRC/version validation, version
trailer handling, scheduler concurrency/deduplication, timeout retries,
cancellation, single/multi-stripe group unpacking, sparse file ids, typed
startup varbit decoding, game-login crypto/framing, byte-at-a-time rev-240
server packet fragmentation, transformed rebuild headers, 676-slot instance
bitstreams, source/destination instance-zone mapping, JS5 map-name hashing,
rev-240 terrain/location decoding, loc model metadata/transforms, and old/type
1/type 2/type 3 model geometry.

## M1 status

Complete so far:

- rev-240 JS5 handshake
- master-index parsing
- empty archive-slot handling
- bounded/retried archive reference-table downloads
- type 0/type 2 cache-container decoding
- archive reference-table parsing
- reference-table CRC/version validation
- bounded ordinary cache-group download scheduler
- per-group CRC/version-trailer validation
- validated group persistence in IndexedDB
- structured reference-table persistence in IndexedDB
- group/file unpacking with sparse file-id preservation
- typed startup definition assets
- revision-240 varbit definition decoding

## M2 status

Implemented:

- initial game connection / server seed
- rev-240 login block construction
- textbook RSA with the server-generated public modulus
- XTEA encryption of the post-RSA login block
- ISAAC client/server stream initialization
- rev-240 desktop cache CRC transform/order
- login response decoding, including the 37-declared/34-byte success quirk
- preservation and direct handoff of trailing game-stream bytes to M3 framing
- browser username/password login controls
- gateway RSA public-key handoff

Known follow-ups outside the normal password-login path:

- proof-of-work challenges are detected and reported but not solved yet
- authenticator-required responses are decoded/reported; OTP entry is not wired yet

## M3 packet / static-scene asset status

Implemented:

- rev-240 desktop server packet registry from rsprot packet ids/sizes
- ISAAC-encrypted smart 1-or-2-byte server opcode decoding
- fixed-size, VAR_BYTE, and VAR_SHORT packet framing
- arbitrary WebSocket/byte-stream fragmentation handling
- direct framing of bytes buffered behind the login-success metadata
- framed packet logging/debug callback for the browser client
- REBUILD_NORMAL_V2 transformed-short decoding
- REBUILD_REGION_V2 transformed header + 676-slot bitstream decoding
- ReferenceZone source plane/zone/rotation unpacking
- destination instance-zone coordinate retention
- normal/static and instanced/source mapsquare discovery
- `window.soloscapeRegionRebuild` debug state
- live archive-5 `mX_Z` / `lX_Z` mapsquare resolution
- rev-240 16-bit terrain opcode decoding
- smart/delta static location decoding
- archive 2 / group 6 loc model-definition decoding
- loc transform-chain traversal and model-id deduplication
- validated archive-7 model loading
- old/type1/type2/type3 model geometry decoding
- `window.soloscapeSceneMaps` / `window.soloscapeSceneAssets` debug state

Revision 240's rebuild packets do not append XTEA key blocks; the browser follows
the rsprot rev-240 encoders exactly. The rebuild vectors cover transformed
headers, complete 676-slot instance streams, duplicate mapsquares, and header
mapsquare-count validation.

Next:

- assemble terrain/model instances into renderable scene coordinates, derive
  implicit/procedural terrain heights, and feed the first static scene into the
  WebGL renderer

## Reference format

The reference-table parser follows the modern JS5 index field order used by the
cache implementation in this repository and OpenRS2-compatible tooling.

Do not import packet ids or transforms from unrelated OSRS revisions.
