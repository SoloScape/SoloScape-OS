# TSPS → SoloScape protocol interoperability

Status: **native revision-240 browser login and native player/NPC update decoding implemented; TSPS protocol remains incompatible**. Synthetic account login is verified against the installed rsprot decoder and gateway. A real local authentication and game packet stream were previously observed, and the NPC renderer has now been confirmed working in a live local client. Native OPNPC_V2 interaction requests are implemented but still require live testing.

## Audited versions

- TSPS pinned at [`b9ca431be440174fce5adf0efbb7afa992358916`](https://github.com/RSPSApp/tsps/commit/b9ca431be440174fce5adf0efbb7afa992358916). Its `server/target.txt` is `osrs-241_2026-09-30`.
- SoloScape's Kotlin server `Server/AGENTS.md` and `Server/README.md` document revision `240.2` and networking via `net.rsprot.protocol.api.NetworkService`.
- Actual deployed SoloScape revision/ports/cache must be confirmed from local `game.yml` and generated/runtime data; documentation may not match a given deployment.

## Wire-level mismatch (verified from source)

| Dimension | TSPS client | SoloScape server |
| --- | --- | --- |
| Transport | Browser `WebSocket` / WebRTC game channel (`client/network/serverConnection/connection/init.ts`) | `rsprot` Netty network service on configured raw TCP `config.gamePort` (`Server/api/net/.../NetworkFactory.kt`) |
| Session hello | Proprietary binary `HELLO=200`, null-terminated client/version (`client/common/packets/ClientPacketId.ts`, `ClientBinaryEncoder.ts`) | Native OSRS login/JS5 handshakes via `rsprot`, not TSPS HELLO |
| Login | Proprietary `LOGIN=204`: null-terminated username and password followed by 32-bit revision in clear inside the game channel | `rsprot` login block with RSA/cryptographic native login path, password or token auth, plus server-side account verification (`ConnectionHandler.kt`) |
| Client movement | TSPS `WALK=210`, x/y shorts + flags byte | Native OSRS movement packets decoded into `MoveGameClickHandler`/`MoveMinimapClickHandler` |
| Outbound packets | Custom packet IDs (e.g. `LOGIN_RESPONSE=3`, `PLAYER_SYNC=20`, `REBUILD_REGION=140`), defined in `client/common/packets/ServerPacketId.ts` | Native OSRS server packet encoders under `rsprot` |
| Cache | OpenRS2-based cache target 241, client-side JS5 and interface definitions | SoloScape cache 240.2 in server configuration/docs, with custom gamevals and generated data |
| UI | TSPS uses its own React/WebGL interface model plus browser host dependencies | Server sends native OSRS interface IDs/scripts and revision-specific CS2 |

TSPS's numeric packet IDs and lengths are **not** interchangeable with native OSRS packet opcodes. A WebSocket wrapping raw TCP does **not** perform semantic packet translation. Blindly passing TSPS login bytes would risk exposing account credentials to an unintended protocol parser; the gateway therefore rejects the first TSPS frame.

## Implemented in this branch

- Pinned TSPS source as a submodule.
- A configurable browser launcher with explicit server/cache URLs, secure-build checks and tests.
- `Mobile/gateway/`: an opt-in, fixed-upstream, binary-only WebSocket-to-raw-TCP transport for clients that already speak native OSRS. Includes explicit origin checks, first-frame native handshake gating, message/queue bounds, backpressure and integration tests with a mock TCP server. Rejects the TSPS 200 HELLO before connecting to upstream.

The gateway currently recognises initial native login / JS5 byte candidates `14, 15, 16, 18`. **This is a transport safety allowlist, not a validated rsprot implementation.** Confirm the exact native revision-240 handshake with real rsprot before production usage. Do not infer successful game login from an echo test.

## Confirmed native rsprot revision-240 JS5 request framing

Inspected the upstream [rsprot `InitJs5RemoteConnectionDecoder.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/codec/InitJs5RemoteConnectionDecoder.kt) and [`LoginClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/prot/LoginClientProt.kt):

- Login opcode: `15` (`INIT_JS5REMOTE_CONNECTION`).
- Fixed payload length: **20 bytes**.
- Layout: 4-byte big-endian **revision** followed by **four 4-byte seed integers** (16 bytes).
- Total request size: **21 bytes**. No length prefix in this fixed-size message.
- The `Mobile/gateway/js5-probe.mjs` implementation now sends this complete request; it generates 16 random seed bytes and logs **no seed material**. The incomplete former implementation wrote only opcode + revision (5 bytes), which leaves rsprot waiting for the remaining 16 bytes and causes a timeout.
- rsprot's `LoginChannelHandler.kt` compares the revision to `RSProtConstants.REVISION`, validates the JS5 source via its address validator, then writes a login response. A successful initial handshake is not proof of completed cache transfer or gameplay.

The user confirmed a local Java 21 process listening at `127.0.0.1:43594` and local `Server/game.yml` setting `game-port: 43594`, `revision: 240`. An initial **five-byte** probe timed out; repeat using the corrected **21-byte** probe before inferring anything about deployed JS5. This observation is not evidence that login works.

## Native game-init pre-authentication framing

The rsprot revision-240 [`LoginClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/prot/LoginClientProt.kt) defines `INIT_GAME_CONNECTION` as opcode **14**, fixed payload **0**. [`LoginChannelHandler.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-api/src/main/kotlin/net/rsprot/protocol/api/login/LoginChannelHandler.kt) issues `LoginResponse.Successful(sessionId)` after address validation. The revision-240 response encoder writes opcode **0** and then an **8-byte** session ID for this flow. `Mobile/gateway/game-probe.mjs` checks the full nine-byte response (including TCP fragmentation), never exposes the session ID, and never sends credentials. This probes a native TCP endpoint, not the TSPS custom WebSocket protocol. The server's live response must be tested separately from CI mocks.

### Verified local native pre-authentication behavior (8 October 2026)

The local user confirmed the Java 21 SoloScape server with `game-port: 43594` and `revision: 240` returns **response 0** to the corrected 21-byte native JS5 request and **response 0 plus a session ID** to the one-byte native game-init request. Neither request sent any account credentials. These are observations of the direct TCP port, not the WebSocket gateway or TSPS.

`Mobile/gateway/gateway-probe.mjs` now checks both same requests end-to-end through our native WebSocket gateway, using two independent WebSocket sessions and a fixed `Origin`. Its mock-backed integration tests verify forwarding while not leaking the session ID in the result. Live gateway probing is still pending.

## Bounded JS5 master-index transport milestone

Revision-240 rsprot [`Js5ClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/js5/incoming/prot/Js5ClientProt.kt) declares `URGENT_REQUEST` as opcode 1, payload length 3; its [decoder](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/js5/incoming/codec/UrgentRequestDecoder.kt) reads archive u8 and group u16. [`Js5Service.getMasterIndex()`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-api/src/main/kotlin/net/rsprot/protocol/api/js5/Js5Service.kt) reads provider group `255:255`; `prepareJs5Buffer()` prefixes archive+group and inserts `0xFF` every 512-byte wire block as continuation.

The `Mobile/gateway/js5-cache.mjs` implementation makes one **pre-authenticated** JS5 connection, requests the `255:255` master-index group (`01 ff 00 ff`), reassembles a bounded cache container and returns it **in memory only**. The CLI reports the length, compression and SHA-256, without writing cache files or decompressing/rendering them. Mock TCP↔WebSocket integration tests check segmented responses, wrong IDs, invalid continuation blocks, unsafe lengths, timeouts and Origin rejection. This is the first real *cache delivery* diagnostic but not a complete revision-240 asset loader. Live result still requires a running SoloScape server + gateway.

**Native browser login is now implemented** in `browser/native-login.mjs`, using the desktop revision-240 format accepted by `Server/api/net/.../NetworkFactory.kt`. It uses the generated public `client.key`, raw RSA password/OTP authentication, XTEA login fields and independent ISAAC game ciphers. The gateway remains a byte transport; TSPS's proprietary `LOGIN=204` is still incompatible. Plaintext WebSockets are limited to loopback; remote connections require `wss://`.

### Native account login wire contract

The source baseline is installed `net.rsprot` **1.0.0-ALPHA-20260912**, checked against [rsprot source 5144f569](https://github.com/blurite/rsprot/tree/5144f569d41a7c2cf77f2b44a8d6e5bca41366d0).

1. Send opcode 14 and await response 0 plus the complete eight-byte session ID.
2. Send opcode 16, u16 payload length, revision 240, subversion 1, server version 0, desktop client type 1, default platform 0 and external authenticator 0.
3. The u16-length RSA block contains check byte 1, four cryptographically random seed words, the server session ID, OTP mode (none or untrusted six-digit code), and password authentication. Ciphertext includes Java BigInteger's positive sign byte when needed.
4. XTEA encrypts complete blocks in the remaining payload, retaining an incomplete tail. Fields include username, resizable viewport dimensions, ephemeral 24-byte identifier, neutral platform statistics and the 23 cache-index CRCs from the same server's master manifest. CRC order and byte transforms match `DesktopLoginCrcDecoder`.
5. Handle optional response 69 SHA-256 hashcash and reply 19 with an eight-byte nonce. Challenge type/version, size, difficulty, work duration and cancellation are bounded. The shared 1,024-byte challenge limit accommodates rsprot's default salt (495 random bytes encoded as hexadecimal plus timestamp/world); the earlier 512-byte limit rejected the live server's 1,007-byte challenge before solving. Tests cover full-size salts through the gateway and Chrome, byte-by-byte challenge fragmentation, and rejection outside the size bounds.
6. Response 2 advertises size 37, followed by 34 bytes of account metadata. The next bytes are the first game packet header, not additional account metadata. Trusted-computer token bytes consume four inbound ISAAC words only when their flag is set; tokens and account hashes are not persisted.
7. Client-to-server ISAAC uses the four original seeds; server-to-client ISAAC uses each seed plus 50. All 151 supported server opcodes use the generated revision-240 framing table, including encrypted one/two-byte smart headers and fixed/u8/u16 lengths. Global player updates decode the four aligned GPI passes, appearance/customisation masks, server movement, rebuilds, plane transitions and classic cache-backed idle/walk/run animation. Ground clicks send server-authoritative `MOVE_GAMECLICK`; collision and pathfinding remain server-owned. Instanced region templates, NPCs, interfaces and chat are not part of this milestone. Encrypted `NO_TIMEOUT` packets keep the connection alive; disconnect clears pending credentials and cipher buffers.

`npm test` covers independent Node RSA decryption, known XTEA vectors, JVM ISAAC vectors across eight refills, real gateway fragmentation/coalescing, OTP token cipher alignment, SHA-256 challenges, rejection, timeout and cancellation. With `CHROME_BIN` set on Windows, a real Chrome session also completes this flow through the actual gateway using synthetic credentials. `npm run test:rsprot` runs both password and OTP packets through the installed JVM decoder and compares every generated packet definition. No production credentials, private keys or game payload captures are committed.

Live revision-240 JS5 and game-init handshakes passed through the local gateway, and the live master manifest supplied all 23 login CRCs. The generated public RSA configuration also validated. The user authenticated a real native session and received 506 game packets; the new decoder handles player/region payloads and server movement. Reconnect, token/SSO authentication, instanced regions, NPCs, interfaces and chat remain subsequent work.

### Live cache-group result and metadata interpretation

The user completed `npm run probe:cache` on **8 October 2026**, using their
revision-240 SoloScape Java server through the local WebSocket gateway. Native
JS5 master-index group `255:255` returned 205 bytes of cache container,
compression 0 and 200 bytes of uncompressed payload. SHA-256 of the in-memory
container: `d45568eb3b832e4794eb58dcca479b815ce93b63422ad2bafc976355c2c52f6b`.
No cache files were written. This is **verified live cache metadata transfer**
but not a complete asset loader.

In the traditional CRC/version master-index format each archive entry is
8 bytes (CRC32 plus reference-table version). The 200-byte result is
consistent with 25 entries. `Mobile/gateway/js5-master-index.mjs` parses
that bounded uncompressed layout. It performs structural parsing **only**;
no CRC comparison against reference-table groups has been implemented and
the bytes may not be compatible with TSPS's revision-241 cache conventions.
The next cache milestone is to download one selected archive reference
table `255:<archive>` and cross-check its container CRC/version metadata.

### Cross-checking one archive reference-table checksum

In the [upstream OpenRune cache provider](https://github.com/OpenRune/OpenRune-Server/blob/main/or-cache/src/main/kotlin/dev/openrune/net/CacheJs5GroupProvider.kt), the master index `255:255` is the `cache.versionTable`, and archive reference-table sectors `255:<index>` are transmitted with `stripVersion = false`. The underlying [`VersionTableBuilder`](https://github.com/OpenRune/OpenRune-FileStore/blob/main/filesystem/src/main/kotlin/dev/openrune/filesystem/util/secure/VersionTableBuilder.kt) places each sector's standard CRC32 and version at offsets `5 + index * 8` in the master-index cache container. The [`CRC` implementation](https://github.com/OpenRune/OpenRune-FileStore/blob/main/filesystem/src/main/kotlin/dev/openrune/filesystem/util/secure/CRC.kt) implements standard CRC32; the reference-table sector CRC is over the complete container bytes, including the compression header, without excluding any trailing bytes.

`Mobile/gateway/js5-reference-verify.mjs` validates group `255:0` (the first archive reference table) against the CRC32 stored in the freshly fetched master index. A separate `npm run probe:cache:verify` diagnostic performs the two bounded in-memory downloads and **exits with failure on mismatch**. Tests cover canonical CRC32, metadata pair layout, compressed containers, gateway forwarding, corruption, Origin rejection, and index bounds. The version field is printed but **not independently verified**. The live reference-table CRC result is **not yet known**.

### Revision and reference-table header validation

On 8 October 2026, the live `255:0` reference-table group was received through the WebSocket gateway (107,328 bytes), and its standard CRC32 (`0x05cf8665`) matched the master-index entry. The master-index revision field was `1790003854`, but **its independent verification is pending**.

The upstream [OpenRune `ReadOnlyCache.archiveData`](https://github.com/OpenRune/OpenRune-FileStore/blob/main/filesystem/src/main/kotlin/dev/openrune/filesystem/ReadOnlyCache.kt) parses cache reference-table formats 5–7. Formats 6–7 include an embedded 32-bit revision after the format byte; v7 then encodes archive counts and delta IDs with big-smart integers. The new `Mobile/gateway/js5-reference-header.mjs` performs bounded gzip decompression (or accepts an uncompressed container), checks the declared length, parses only the header and archive-ID deltas, and lets the CLI **reject a mismatch** between embedded and master-index revision. It does not parse archive file manifests, perform cryptographic verification, persist cache bytes, or render game assets. Run the live probe again to validate this header/revision check.

### First real archive-0 group data verification

With the upstream OpenRune `ReadOnlyCache` format-7 reference table,
the archive-group IDs are delta-coded big-smart integers, optionally
followed by the same number of 32-bit name hashes (flag 1), and then
32-bit group CRCs. `Mobile/gateway/js5-reference-header.mjs` now has a
bounded optional `decodeReferenceTableGroupCrcs()` extractor. The
`fetchJs5Archive0Group()` function requests one group in **archive 0
only** and retains the same 2-MiB compressed-container ceiling as our
metadata probes. `verifyArchive0GroupCrc()` compares CRC32 of the **full
JS5 cache container** received (the server's underlying provider removes
the trailing two-byte sector version for archive data) with the catalog CRC.

`npm run probe:asset` performs three independent WS-to-native JS5
transfers: master `255:255`, index-0 reference `255:0`, then the
first listed archive-0 group (expected `0:0`). Each metadata integrity
check precedes the asset request; the data remains in memory only.
This is an intentionally narrow initial test, not a reference-table
or asset decoder suitable for TSPS, and it is **not yet verified live**.

### Browser-native cache service: renderer integration groundwork

User's final standalone live JS5 test on **8 October 2026** successfully
retrieved archive-0 group `0:0` over the native WS gateway; the **196-byte**
cache container matched CRC32 `0x68527d89` in archive 0's verified
format-7 reference table. This closes the planned TCP/WebSocket/JS5
diagnostic phase without establishing a playable game client.

The actual **browser-side** asset-loading service now lives in
`Mobile/browser/native-js5.mjs`, with a small loopback-only browser
development shell. It performs 21-byte native JS5 handshake, strict
512-byte group framing, master-index validation, per-index CRC/revision
checks, browser-native gzip metadata parsing, and group CRC checks.
Its reusable `NativeJs5Cache.loadIndex()` and `loadGroup()` methods
return in-memory JS5 cache-container bytes; no copies of licensed cache
assets are committed or written by this service. Integration tests use
Node `ws` only to simulate browser WebSockets against a mock native TCP
server through the real gateway, and do **not** replace an actual mobile
browser smoke test.

The pinned TSPS renderer already has `CacheIndex`, `CacheStore` and
`ReferenceTable` abstractions in its own revision-241 cache pipeline.
A real renderer integration must adapt these **revision-240 verified
containers** to those interfaces (and reconcile revision-specific
decoding, metadata, XTEAs and asset formats); merely changing the TSPS
game server URL to the raw WS gateway will not work. TSPS proprietary
HELLO/LOGIN remain blocked. The separate native browser login flow above
provides encrypted account authentication; the TSPS shell cannot use it directly.

### Typed-array cache store bridge for TSPS decoder integration

Live browser user confirmation (8 Oct 2026): revision-240 master index,
archive-0 reference catalog (10,948 groups) and archive group `0:0`
(196 bytes) were successfully downloaded and validated in a **real
browser**, not only in Node integration tests.

The pinned TSPS `client/rs/cache/CacheIndex.ts` defines
`CacheIndexDat2.fromStore(id, store)`, which calls
`store.read(255, id)` synchronously to decode a reference table.
`CacheStore.read(indexId, archiveId)` returns an `Int8Array` of the
**complete compressed container**, and subsequent archive-group decode
calls `store.read(id, archiveId)`. The new isolated
`browser/TspsCacheStoreAdapter` implements this exact structural
read contract with preloaded verified native JS5 groups. It maintains
full reference-table containers separately from group containers,
rejects missing groups without implicit network or data substitution,
and returns defensive `Int8Array` copies for compatibility with TSPS
ByteBuffer. Preloading remains asynchronous; the synchronous method is
only valid for previously verified containers. This still needs
integration into TSPS's actual loader and revision-240 decoder review,
especially reference-table flags and asset format/version differences.

### First graphical asset decoding (isolated Canvas preview)

The upstream TSPS [`SpriteLoader.load()`](https://github.com/RSPSApp/tsps/blob/b9ca431be440174fce5adf0efbb7afa992358916/client/rs/sprite/SpriteLoader.ts)
parses indexed sprites with a final sprite count, image dimensions,
per-frame offsets, a 24-bit palette, row/column pixel order and optional
alpha. `Mobile/browser/sprite-preview.mjs` provides a bounded compatible
decoder and Canvas RGBA painter; the real sprite bytes come only from the
CRC32-validated native JS5 revision-240 archive index 8. The cache
reference-table parser also checks file counts/IDs and selects only
**single-file** groups for this initial rendering path, avoiding
assumptions about multi-file archive chunk packing.

The browser UI offers `Render verified SoloScape sprite`, which retrieves
up to 8 candidate groups from the verified sprite catalog, decodes the
first supported frame, and draws the **actual game asset** as a bitmap
(Canvas, not TSPS's WebGL scene renderer). There is no fallback fake
graphic and no need for another standalone JS5 probe. The live
sprite-rendering outcome is **pending**.

### Native browser scene renderer implementation

`Mobile/browser/terrain-world.mjs` implements the actual
revision-240 OSRS map terrain decoding path (not a probe): it resolves
`mX_Y` through the signed 31x DJB2 name hash of archive/index 5,
fetches the CRC-verified terrain group, uses the 16-bit terrain opcodes
of TSPS `SceneBuilder.newTerrainFormat` (rev 209+), and reconstructs
four planes of height/underlay/overlay metadata. Base tile heights use
the same noise/interpolation algorithm as pinned TSPS `HeightCalc`.
The first native WebGL viewport draws real geometry with orbiting and
camera panning and provisional material tints. Index reference-table
CRC and revision, plus terrain group CRC, are checked by
`NativeJs5Cache` before decoding. No map objects, region player
state, ISAAC/RSA login or TSPS proprietary protocol are sent.

As of this implementation `npm run dev` starts the new native WebGL
client; the diagnostic UI is moved to `/diagnostics`.
`npm run dev:tsps` retains the incompatible original TSPS launcher for
reference, not for playable SoloScape authentication. Live WebGL
terrain visualization still needs confirmation on the user's
revision-240 server, while CI validates synthetic map and mesh
fixtures. This work is client construction, not a new stand-alone
network probe.

### Map index availability and packed multi-file group support

The initial live native WebGL client failed with `No single-file
terrain map group for region 50,50`. This happens after loading
native index-5 reference metadata; it must not be presented as a
WebSocket or game-server outage. OSRS map archives can have more than
one file. The map reference parser now retains the group file IDs;
the terrain loader supports the native single/multi-chunk archive
table, extracts only unencrypted terrain file ID 0, and verifies
bounded lengths. On initial startup it can choose the closest
actually catalogued named `mX_Y` terrain region when the default
m50_50 is missing; manual travel remains exact. No additional
standalone probes and no fabricated region data.

### Terrain tile byte-consumption compatibility

The upstream pinned TSPS `SceneBuilder.decodeTerrain` loops over
4 planes × 64 × 64 tiles and does not assert the input buffer
is at EOF. The SoloScape native loader previously imposed that
extra assertion and rejected a live map with `Unexpected trailing
terrain bytes`. The decoder now accepts a **fully parsed** modern
revision-240 (u16) tile grid with a remaining suffix, exposes
`consumedBytes`/`trailingBytes`, and limits all reads using the
existing 16 MiB decompression and size caps. It will also accept
legacy u8 tile data only if that decoding consumes **the complete
file**, to support custom RSPS caches. The client still reports
unparsed suffix bytes and does not claim they were decoded as
terrain objects. CRC integrity and the correctly packed file ID 0
remain mandatory. Synthetic CI coverage includes both formats
and adversarial truncation. **Live browser result pending.**

### Cache-backed OSRS floor colour decoding

TSPS's `Dat2CacheLoaderFactory` fetches underlay definitions from
cache **index 2, group 1** and overlays from **index 2, group 4**;
tile fields are **1-based IDs** (overlay high flag masked to 15 bits).
The native client now loads both groups only as required, validates
their reference-table revision and JS5 group CRC through
`NativeJs5Cache`, unpacks selected file IDs from the native
multi-chunk archive format, and decodes relevant OSRS RGB/secondary RGB
and texture metadata. Flat colours replace deterministic placeholder
tints for matched floor definitions in the WebGL mesh. There is no
texture sampling, underlay HSL blending or accurate OSRS floor lighting
yet; unsupported materials are visibly labelled as fallbacks.

The first live WebGL region success was `m50_50`, native group `5:12850`,
**13,519 compressed bytes**, **60,239 decoded**, complete u16 terrain
grid at **60,238 consumed bytes** and one trailing uninterpreted byte.
The real floor-colour decoder has synthetic CI coverage, but its
live browser result has not been confirmed.

### Nonblocking scene startup and module graph integrity

The floor RGB feature introduced a missing static route for
`floor-materials.mjs`; this prevented the browser's ES module
graph from evaluating and left the initial loading screen up.
The preview server now serves that route. A CI test starts the
actual dev server on a randomly allocated local TCP port and
verifies the app's critical module URLs return JavaScript.

Optional floor materials must never gate the **first real WebGL
terrain paint**. `world-startup.mjs` shows verified revision-240
terrain immediately after cache decoding and only then starts
async index-2 colour loads. Material failures retain the visible
world and are shown in the status line, and responses from earlier
regions cannot overwrite a later Travel. Recolouring does not
reset the user's camera target. This does not change the existing
CRC/revision verification or make native RSA/ISAAC login available.

## Remaining protocol and gameplay work

1. **Verify live account login.** The native revision-240 encoder, public RSA config and ISAAC framing are implemented and decoder verified. Confirm account authentication against the running SoloScape server and account service.
2. **Decide native protocol adapter placement.** Prefer implementing a native OSRS packet encoder/decoder within a client-compatible TSPS fork for fidelity. A server-side custom-to-native translator would need to maintain full ISAAC/RSA session state, re-encode scene/entity updates, maps, varps, interfaces and inventory; it is not a simple opcode remap.
3. **Extend native sessions.** Implement reconnect and token/SSO authentication if needed. Keep remote sessions on `wss://` and fail closed on revision mismatch. TSPS high-level login frames must not be forwarded as native packets.
4. **Align assets.** Resolve cache 241 vs 240.2 and adjust JS5, client scripts, packet tables and map definitions consistently. Do not force the wrong revision value only to suppress the warning.
5. **Game loop milestones.** Validate JS5 cache manifest, handshake, login response, initial region rebuild, player/NPC sync, click-to-walk, UI/inventory, chat and logout/reconnect. Use captured test data stripped of usernames/passwords/tokens.
6. **Mobile verification.** Test viewport/touch/virtual keyboard on modern Android Chrome and iOS Safari after the core native session is stable.

### Acceptance gates

- A real revision-compatible native client completes the game handshake against the SoloScape test server through the WebSocket gateway with no credential leakage in logs.
- TSPS client can subsequently perform login, cache loading, scene rendering and movement with protocol conversion in place.
- Interoperability and mobile smoke tests run in isolated environments; production credentials and cache assets are excluded from commits.

## Security notes

The gateway exposes a raw game TCP stream only to an exact origin allowlist; it is **not** a proxy that authenticates players, protects native credentials, or upgrades existing traffic to an encrypted protocol by itself. Prefer TLS termination and a properly secured server network. No user accounts, secrets or tokens should be committed to the repository.
