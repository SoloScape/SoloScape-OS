# SoloScape Web Client

This directory contains the browser-native SoloScape client work targeting
Safari on iPhone/iPad and modern desktop browsers.

The current branch implements browser transport, a validated/bounded JS5 cache
client, the rev-240 game-login handshake, server game-packet framing,
normal/instanced region rebuild decoding, and the static terrain/loc/model
asset pipeline for OSRS protocol revision 240 / client 240.2.

## Mobile OSRS HUD (layout scaffold)

Once the region scene is loaded, the browser now presents a landscape,
edge-to-edge game HUD modelled on the November 2024 OSRS mobile redesign:

- Five left-side hotkeys, with cycling PvM, Bossing and Skilling profiles.
- Two columns of right-side Side Stones (collapse the secondary column),
  with switching panels for inventory, skills, equipment, prayer, magic,
  combat and the remaining main tabs.
- Top-right circular minimap plus surrounding status orbs. The minimap draws
  a **terrain-only approximation** from the live downloaded map-square
  underlay/overlay ids, centred on the decoded local-player coordinates; it is
  not yet the Jagex mapscene sprite renderer.
- Camera compass and zoom controls, collapsible top-left chat/keyboard,
  a bottom-left hidden/compact/full popout, and a connection-backed logout.

This is the **OSRS mobile layout shell**, not pixel-perfect Jagex UI artwork
or a complete game interface implementation. HUD icons are provisional
vectors. Inventory items, actual skill levels, prayer points, hitpoints,
special energy, chat sending, item actions and popout content need their
relevant game-packet decoders/handlers before they can be functional. These
unsynchronised values are deliberately shown as empty/unknown rather than
pretending to contain live game data. Tap-to-drop/run toggles currently affect
the UI only. The cache-backed title/login screen remains unchanged and the
HUD is shown only after successfully entering the world.

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
      -> derive opcode-0 procedural terrain heights from absolute tiles
      -> assemble the 13x13-zone scene (including rotated instance chunks)
      -> transform loc models by shape/orientation/scale/offset
      -> upload terrain + loc triangle buffers once per rebuild
      -> enter the browser runtime
      -> advance client state on fixed 20ms simulation ticks
      -> draw resident GPU meshes with requestAnimationFrame

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
modern opcode ranges. Opcode-0 heights are resolved during scene assembly with
RuneScape's canonical multi-octave procedural noise seeded by absolute world
tile coordinates. Higher implicit planes inherit the previous plane minus 240
client-height units; explicit height byte 1 is normalized to zero.

Location definitions retain model ids/types, dimensions, rotations,
scale/translation, recolors/retextures and transform chains. Model decoding
retains vertex coordinates, triangle indices, face colors/textures,
transparency/render types and type-0 texture triangles.

Raw model group bytes are released after geometry decoding to avoid keeping a
second copy of the scene's model payloads in memory on mobile.

Scene assembly clips normal rebuilds to the 13x13-zone scene window and copies
8x8 source chunks for instanced rebuilds with destination rotation. Static loc
geometry applies model-type selection, wall/corner multi-model placement,
orientation/mirroring, definition scale/translation, and tile-footprint height
placement before rebasing the final mesh around the scene origin.

The WebGL2 renderer now resolves cache-backed scene materials. Floor underlay
(group 2:1) and overlay (2:4) definitions replace the earlier generated debug
colors, archive 9:0 texture definitions resolve their archive-8 indexed sprite
sources, and those sprites are gamma-corrected/expanded into 128x128 RGBA
texture-array layers. Model faces preserve their texture-coordinate/axis index
and type-0 P/M/N anchor triangle so loc/player geometry can emit UVs alongside
the cache texture id. Terrain uses the classic Jagex shaped-overlay triangle
tables rather than painting every overlay across the whole tile.

The shader keeps a color fallback for a texture that is not resident yet.
Modern model texture render types 1..3 still fall back to color until their
extra scale/rotation/translation metadata is retained, and multi-sprite texture
definitions currently use the first sprite layer (matching the current
Olden-Shire texture path). Animated texture scrolling, animated entities, tap-to-walk packet/raycast
wiring, and occlusion remain later fidelity/playability milestones.

## Browser game runtime

Gameplay presentation is no longer event-triggered/static. The browser now
splits simulation from rendering in the same shape as the original client:

    server/game state
      -> fixed 20ms client tick (50 Hz)
      -> update dynamic player/camera state
      -> requestAnimationFrame (display refresh rate)
      -> recompute camera + entity model matrices
      -> draw already-resident terrain / loc / player GPU buffers

`BrowserGameLoop` owns a fixed-step accumulator and bounds catch-up work after
an unusually slow frame. Safari/iOS visibility changes reset wall-clock
accumulation so returning from a suspended tab does not replay seconds of stale
simulation ticks.

`WebGlSceneRenderer.render(scene)` is now an upload/rebuild boundary rather
than the frame loop: terrain and static loc buffers remain resident until the
next region rebuild. `renderFrame(alpha)` performs presentation only.

The local player and orbit camera both keep previous/current 20ms simulation
state and are sampled at requestAnimationFrame time. The camera ports
Olden-Shire's classic follow behaviour: its orbit centre eases toward the
player by 1/16 each tick (or snaps beyond +/-500 units), arrow-key velocities
approach +/-24 yaw and +/-12 pitch with /2 damping, pitch clamps to 128..383,
and camera distance follows `pitch * 3 + 600 + zoomDelta`. The browser input
layer adds one-pointer drag rotation, two-pointer pinch zoom, mouse-wheel zoom,
and arrow keys while keeping all camera simulation on the fixed 20ms tick.

Viewport taps now use the same 48-degree WebGL camera basis to cast a ray into
the decoded terrain height field. The hit is converted back to an absolute
world tile and sent as revision-240 `MOVE_GAMECLICK` through the live client
ISAAC stream. The packet definition is taken from rsprot revision 240:
opcode 102, VAR_BYTE payload, with `z:p2Alt3`, `keyCombination:p1Alt2`,
then `x:p2Alt3`. The server remains authoritative for collision/pathfinding;
the browser does not locally teleport or invent a route after a click.

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

Inspect the live fixed-step runtime:

    window.soloscapeGameLoop?.getStats()

Inspect the requestAnimationFrame-interpolated player state:

    window.soloscapeLocalPlayerRenderState

Inspect the mutable/interpolated orbit camera:

    window.soloscapeOrbitCamera?.snapshot()
    window.soloscapeOrbitCameraState

Inspect the last terrain hit selected by a viewport walk tap:

    window.soloscapeLastViewportTap
    window.soloscapeLastWalkDestination

The exposed render state is presentation-only; sampling alpha at 60/120 Hz
does not mutate the fixed 20ms movement/camera simulation state.

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
    window.soloscapeScene

Normal rebuilds expose center zone, world-area id, and the static mapsquares
covering the 13x13-zone scene window. Instanced rebuilds expose all 676
destination slots, each populated slot's source plane/zone/rotation, and the
deduplicated source mapsquares required to assemble the instance.

`soloscapeSceneMaps` contains decoded terrain and static loc placements.
`soloscapeSceneAssets` contains the required loc definitions and decoded
archive-7 model geometry. `soloscapeSceneMaterials` contains decoded floor
materials and cache-backed texture-array layers. `soloscapeScene` contains the assembled terrain/loc
vertex buffers, world-tile origin, scene bounds, and assembly statistics used
by the WebGL2 renderer.

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
rev-240 terrain/location decoding, loc model metadata/transforms, old/type
1/type 2/type 3 model geometry, canonical implicit-height vectors, normal scene
assembly, and rotated instanced-zone placement.

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
- canonical opcode-0 procedural terrain height derivation
- normal 13x13-zone scene clipping + terrain mesh assembly
- rotated 8x8 instanced-zone terrain/object assembly
- loc shape/model selection, mirroring, orientation, scaling and translation
- static terrain/model vertex buffers with scene-local rebasing
- cache-backed floor underlay/overlay materials and archive-8/9 texture layers
- classic shaped terrain overlays plus model type-0 texture UV mapping
- persistent WebGL2 terrain + loc GPU buffers
- fixed 20ms browser simulation loop + requestAnimationFrame presentation
- classic fine-coordinate local-player route movement + render interpolation
- Olden-Shire-style orbit follow camera with drag/pinch/wheel/arrow controls
- viewport terrain raycast + ISAAC-encrypted rev-240 MOVE_GAMECLICK walking
- `window.soloscapeSceneMaps` / `window.soloscapeSceneAssets` / `window.soloscapeSceneMaterials` / `window.soloscapeScene` debug state

Revision 240's rebuild packets do not append XTEA key blocks; the browser follows
the rsprot rev-240 encoders exactly. The rebuild vectors cover transformed
headers, complete 676-slot instance streams, duplicate mapsquares, and header
mapsquare-count validation.

Next:

- retain/render modern model texture transform metadata (types 1..3)
- add texture animation and the original terrain HSL/light averaging pass
- add map-click feedback / destination flag and minimap walking
- wire sequence/skeleton animation onto the moving player model
- decode NPC update streams and continue actor animation/skinning work
- add occlusion

## Reference format

The reference-table parser follows the modern JS5 index field order used by the
cache implementation in this repository and OpenRS2-compatible tooling.

Do not import packet ids or transforms from unrelated OSRS revisions.
