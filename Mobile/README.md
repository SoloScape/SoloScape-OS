# SoloScape Mobile (TSPS port)

> **Status: experimental TSPS integration, not yet a playable SoloScape client.** The pinned upstream source and a configurable dev/build launcher are present. A playable SoloScape mobile client has **not** been ported yet. The current `Client/` desktop RSProx launcher and `Server/` Kotlin game server remain unchanged.

This directory integrates the pinned upstream browser client as a Git submodule at `tsps-upstream/`, based on [RSPSApp/tsps](https://github.com/RSPSApp/tsps), which provides a React/TypeScript/WebGL OSRS-style game client. Track the work in [issue #32](https://github.com/SoloScape/SoloScape-OS/issues/32).

## The actual native WebGL client (current active development)

**Starting 8 October 2026**, `npm run dev` (also `npm run dev:native`)
starts **SoloScape's own WebGL world client** at
`http://localhost:3001/`, not the collection of JS5 diagnostic buttons.
This uses the already live-tested browser-native revision-240 JS5 cache
loader and renders a **real map-region terrain height mesh** (default:
Lumbridge region `m50_50`) in WebGL with touch/mouse camera orbiting,
mouse-wheel zoom and WASD/arrow camera panning.

The implementation lives in `Mobile/browser/terrain-world.mjs`,
`world-webgl.mjs` and the main `app.mjs`. Terrain region names are
resolved using TSPS's 31x DJB2 map name hash from the **CRC-verified**
index-5 reference table. Map-height opcodes are decoded in the **OSRS
revision-240 (u16) tile format**, following the pinned TSPS
`SceneBuilder` logic, including four planes and procedural base heights.
All group data is CRC-validated before parsing; only one selected
**unencrypted terrain** group is downloaded into memory. Provisional
floor tints make the geometry visible pending true underlay/overlay
materials. No fabricated terrain fallback is used if a region is absent.

**Run locally** with native Kotlin server running on `127.0.0.1:43594`
and native WS gateway at `127.0.0.1:43595`, Origin allowlist
`http://localhost:3001`:

```powershell
cd Mobile
git pull --ff-only origin feature/mobile
npm run dev
```

`http://localhost:3001/` should start loading map region `50,50`
automatically. Change X/Y and press **Travel** to view other regions.
The first live m50_50 attempt failed to find a **single-file**
terrain group; that is a map reference/index lookup failure, not proof
that the native gateway or server is offline. The client now supports
**multi-file native map groups**, extracting the terrain file with ID
0 using the OSRS archive chunk table. On initial startup only, if
m50_50 is unavailable, it chooses the nearest available **real,
named map terrain group** from the verified index-5 catalog, displays
the actual coordinates, and updates the region controls. Manually
requested regions remain exact, with a clear failure if absent.
No mock map or stand-in terrain is rendered.

Touch/drag or mouse/drag rotates the camera; wheel zooms; WASD/arrows
pan. If cache geometry is not available, the page displays the actual
network/format error and leaves the viewport empty. The renderer needs
a real browser/live-server verification; GitHub CI uses synthetic map
fixtures and validates mesh generation.

**Important scope:** This is **real client/world renderer development**,
not a playable native OSRS session: no loc models, floor textures,
player entities, auth or native game packets yet. Native RSA/ISAAC and
revision-240 packet mapping are later dedicated work. Do not ask users
for credentials before trusted TLS and a reviewed native login path.
The upstream TSPS revision-241 React/WebGL application is still
available separately via `npm run dev:tsps` (requires its submodule
setup), but does **not** speak SoloScape's native protocol and is
not the main development entry point. The old cache diagnostics are
available only under `http://localhost:3001/diagnostics`.

### Terrain stream completeness: align with upstream SceneBuilder

The first native WebGL client could retrieve map data but rejected
some regions with `Unexpected trailing terrain bytes`. The original
TSPS `SceneBuilder.decodeTerrain()` reads the fixed four-plane,
64x64-tile grid without requiring the file to end immediately at
the final tile. SoloScape's browser decoder now follows that rule
**only after a complete, bounds-checked tile-grid decode**. It
retains the byte count consumed and the number of unparsed trailing
bytes in the world-status message, instead of silently discarding
or interpreting those suffix bytes. The existing JS5 index and
per-group CRC validation remain mandatory.

The revision-240 default remains the 16-bit terrain opcode format.
For custom archives that retain legacy 8-bit terrain encoding, the
decoder recognises that encoding **only when it consumes the file
exactly**; a partial legacy parse does not qualify. Truncated tiles
or unsupported opcode streams remain errors. No fallback artwork,
fabricated maps, new credential flows, or standalone probes were
introduced. Live rendering still requires browser confirmation.

### Cache-derived floor colours (work in progress)

The live browser has now decoded real `m50_50` terrain: cache group
`5:12850` was **13,519 CRC-verified container bytes**, decompressed
to **60,239 bytes**, of which the full u16 four-plane grid consumed
**60,238 bytes** with one unparsed suffix byte. This confirms the
revision-240 world mesh; it is still not a logged-in game.

`browser/floor-materials.mjs` now provides flat colour definitions
from SoloScape's **CRC-verified config index 2**, underlay group `2:1`
and overlay group `2:4`, following the pinned TSPS
`Dat2CacheLoaderFactory`, `UnderlayFloorType` and
`OverlayFloorType` sources. It extracts only the region's referenced
file IDs from bounded multi-file OSRS archive containers, then
decodes primary/secondary RGB, transparency markers, and relevant
material opcodes. The WebGL triangle mesh uses these actual definition
colours, with a status count of matched definitions. Unsupported or
missing definitions keep **explicitly labelled temporary tints** so
a colour mismatch never blocks viewing valid geometry. This is a
flat-shaded intermediate representation: TSPS blended HSL,
texture sampling, tile overlays/shapes and scene objects remain
unimplemented.

Keep the Java server and gateway running, from `Mobile/` run
`git pull --ff-only origin feature/mobile`, restart `npm run dev`,
then hard-refresh `http://localhost:3001/`. The visual colour
result against the real server remains **pending live confirmation**.

### World startup must not block on optional floor materials

A real browser screenshot showed the static **Opening SoloScape world**
overlay and **Connecting to local cache** status after adding floor
colours. Two distinct implementation bugs were identified:

1. The loopback preview server did not serve
   `/floor-materials.mjs`, even though `app.mjs` imported it.
   A failed ECMAScript import prevented the entire app from executing,
   leaving the static loading overlay indefinitely visible.
2. The world loader awaited optional index-2 underlay/overlay
   definitions **before** making the already CRC-verified terrain
   visible. Slow or unsupported materials were therefore blocking
   an otherwise functional world.

The preview server now serves the complete module graph. A CI
test launches it on an ephemeral **loopback** port and requests the
main app and all its native modules, including the floor decoder.
The client now draws verified terrain and clears its initial
loading overlay **before** issuing any optional floor requests.
Colours are applied asynchronously to that scene if available;
failure leaves the terrain visible with a clear fallback message.
Stale floor responses cannot overwrite a newer Travel destination,
and recolouring does not reset the camera.

To run the updated client, stop the existing `npm run dev`,
`git pull --ff-only origin feature/mobile`, restart
`npm run dev`, and hard-refresh
`http://localhost:3001/` (Ctrl+Shift+R). The new code still
requires the native revision-240 Java server and origin-restricted
loopback WebSocket gateway; it adds no credentials or probes.

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

## Native browser cache client — first reusable asset-loader component

**Status (8 October 2026):** the final credential-free live JS5 diagnostic
passed. Archive 0's first group `0:0` was fetched through the gateway,
**196 bytes**, with CRC32 `0x68527d89` matching its format-7 reference
catalog. The master/index revision, group catalog and network transport
were already verified on the local revision-240 SoloScape server. There are
no further standalone probes planned.

The new **browser-native** cache service in `browser/native-js5.mjs` does
not depend on Node `Buffer`, Node `ws`, or the incompatible TSPS packet
format. It provides a renderer-facing `NativeJs5Cache` API:

- `await cache.loadMaster()` — validated master-index CRC/version entries
- `await cache.loadIndex(indexId)` — validates a reference table against
  master CRC/version, decodes its group IDs and CRCs using browser gzip
- `await cache.loadGroup(indexId, groupId)` — fetches one native JS5 group,
  verifies catalog CRC32, and memoizes the intact container **in memory**

The service uses browser `WebSocket`, `crypto.getRandomValues` and
`DecompressionStream`, validates the 512-byte JS5 framing, enforces
strict compressed/decompressed size limits, allows plaintext WS **only on
loopback**, and never handles credentials. CRC32 detects accidental changes,
not malicious tampering. Uncompressed and gzip containers are supported;
bzip2, large groups and full asset decoding are not yet supported.

A standalone **browser development shell** lets us use this client-side
library in an actual browser without altering the pinned TSPS submodule.
With the Java server running on native TCP 43594 and the gateway running on
WS 43595, from `Mobile/` open another PowerShell window:

```powershell
git pull --ff-only origin feature/mobile
npm install
npm run dev:native
```

Open **`http://localhost:3001/`** (not 127.0.0.1, as the gateway requires
the exact browser Origin `http://localhost:3001`). Select archive index
`0`, load its catalog, then load group `0` into the browser's memory.
This exercises a real on-demand asset-loading **application component**,
rather than running another Node CLI probe. It does not yet display
sprites/models or integrate with TSPS's WebGL renderer.

The preview only binds to `127.0.0.1:3001`; it cannot be opened from
a phone over LAN. The TSPS upstream development app also defaults to
port 3001, so stop it before launching the native browser shell. Future
integration will adapt this native JS5 service to TSPS's `CacheStore` /
`CacheIndex` interfaces and reconcile the revision-241 decode profile
before attempting rendering. Neither TSPS login nor native game login
has been implemented. This is **not yet a playable client**.

### Bridging verified JS5 containers into TSPS's CacheStore interface

**Live browser verification (8 Oct 2026):** the browser itself loaded
25 master-index archives, parsed archive 0's 10,948-group catalog with
reference revision `1790003854`, then downloaded and CRC32-verified the
196-byte group `0:0`. These are real in-browser results, not just Node
mock tests. Rendering, login, and gameplay are not yet implemented.

`browser/tsps-cache-store.mjs` now provides `TspsCacheStoreAdapter`,
which structurally matches the synchronous `CacheStore<ApiType.SYNC>`
interface in the pinned TSPS sources. The TSPS `CacheIndexDat2` class
synchronously requests the index table with `read(255, indexId)` and
group containers with `read(indexId, groupId)`. Because the native JS5
transport is asynchronous, our adapter **requires explicit preload** of
each verified reference table or group before a synchronous read:

```javascript
import { NativeJs5Cache } from "./native-js5.mjs";
import { TspsCacheStoreAdapter } from "./tsps-cache-store.mjs";

const native = new NativeJs5Cache();
const store = new TspsCacheStoreAdapter(native);
await store.preloadIndex(0);
const referenceContainer = store.read(255, 0); // Int8Array, full JS5 container
await store.preloadGroup(0, 0);
const groupContainer = store.read(0, 0);        // Int8Array, full JS5 container
```

The adapter is **fail-closed**: a synchronous read for an unpreloaded
group throws rather than making a network request or serving unverified
bytes. Every read returns a **defensive copy** so TSPS's mutable
ByteBuffer/Container/XTEA decoding cannot corrupt the CRC-verified bytes.
The browser dev shell now exercises this interface and reports the
prepared signed-byte buffer sizes in its existing catalog/group UI.

**Important:** This is not yet wired into TSPS's actual React/WebGL
runtime. Its `CacheIndexDat2.fromStore()` is a potential integration
point once the pinned submodule is adapted through a separately reviewed
client fork/integration mechanism. Revision-240 asset metadata and
decoders still need a compatibility review; do not assume the
revision-241 client renders assets correctly.

### First real graphical asset: revision-240 indexed sprite on Canvas

After confirming the browser's native JS5 cache loader and synchronous
TSPS-compatible `CacheStore` bridge against the running SoloScape server,
the next integration step is a **visible, real cache-derived sprite**.
`browser/sprite-preview.mjs` implements the pinned TSPS
`SpriteLoader` indexed-palette format (row/column pixel layouts and optional
alpha) with strict bounds and no external graphics dependencies.

The new **Render verified SoloScape sprite** button in the existing
`http://localhost:3001/` browser development page:

1. Fetches the **sprite** cache index 8 reference table through native JS5,
   checks its master-index CRC32/revision, and parses per-group file counts
   using OpenRune format-7 reference metadata;
2. Checks at most **eight single-file sprite groups** from the verified
   catalog, fetching and CRC32-checking each before bounded gzip
   decompression; and
3. Converts the first supported indexed-sprite frame to RGBA and displays
   it on HTML Canvas, **preserving offsets, transparency and alpha**.

The renderer never writes assets to disk, sends credentials, downloads the
whole cache, or substitutes an unrelated placeholder if decoding fails.
If the initial candidates use an unsupported format, it reports an error
rather than claiming a graphic was rendered. The tests use synthetic
OSRS sprite data and a mocked cache transport; **actual sprite visibility
against the live server remains unverified** until the page is refreshed.

PowerShell from `Mobile/` (with the Java server and native WS gateway still
running):

```powershell
git pull --ff-only origin feature/mobile
# Stop the previous `npm run dev:native` with Ctrl+C first.
npm run dev:native
```

Open `http://localhost:3001/` and click
**Render verified SoloScape sprite**. No extra standalone probe required.
This isolated Canvas preview **does not** yet invoke TSPS's WebGL scene
renderer, nor does it implement map reconstruction, native game login,
mobile gameplay or a playable SoloScape session.

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

The gateway checks origin and path at upgrade, uses binary-only WebSocket frames, caps message sizes/queues, and closes failed or incompatible connections. The gateway pins a patched `ws` release (`8.22.0`) to address known 2026 denial-of-service and disclosure advisories; CI runs `npm audit --audit-level=high` along with transport integration tests. If you installed the previous version, run `npm install` again after pulling this change. Do not use `npm audit fix --force` unless you've reviewed its proposed dependency changes. Default HTTP transport is **not encrypted**: for a production deployment, bind on loopback behind a properly configured TLS reverse proxy and connect with `wss://`. Do not expose plaintext `ws://` to the public Internet or use it for real accounts.

`npm test` includes a TCP echo integration test that verifies native bytes are carried intact, TSPS HELLO is rejected, and cross-origin requests fail. This does **not** validate native client gameplay, rsprot login or TSPS integration.

### Credential-free cache protocol check

Before implementing native login, you can probe a **running local** SoloScape TCP server's JS5 response without sending account credentials:

```powershell
# From the Mobile directory on Windows PowerShell
$env:SOLOSCAPE_GAME_TCP_PORT = '43594'
$env:SOLOSCAPE_NATIVE_REVISION = '240'
npm run probe
```

After pulling the latest `feature/mobile` branch (for example, `git pull origin feature/mobile`), rerun `npm run probe` using these environment settings. If the response is still a timeout, inspect the game server logs and verify the deployed rsprot version; a successful TCP port check alone only confirms a listener.

Use the actual `gamePort` and native cache **major revision** from your running SoloScape configuration. The example `240` follows the documented `240.2` version; do not assume it matches a deployed server. The rsprot revision-240 JS5 handshake is **21 bytes total**: native opcode `15`, a four-byte big-endian revision, and four four-byte seed integers (16 cryptographically random bytes). The old five-byte probe was incomplete and resulted in a timeout even with a running server. A response code `0` means the initial JS5 handshake was accepted, **not** that assets can be loaded or a player can log in. The Node integration tests use a mock TCP endpoint that explicitly waits for the entire 21-byte request. **Live result on 8 Oct 2026:** the user verified response code `0` against their local Java server at `127.0.0.1:43594` with `revision: 240`.

### Credential-free native game connection check

The next pre-authentication test is the OSRS `INIT_GAME_CONNECTION` handshake.
Upstream rsprot revision 240 defines it as a **single byte, opcode 14**, with
a server success reply of opcode 0 plus an **opaque eight-byte session ID**.
The probe checks that all nine reply bytes arrive, discards the session ID
without printing it, and closes the socket. **No username, password,
native login block or gameplay packet is sent.**

Run from the `Mobile` directory after pulling the latest `feature/mobile`:

```powershell
$env:SOLOSCAPE_GAME_TCP_PORT = '43594'
npm run probe:game
```

`SOLOSCAPE_NATIVE_REVISION` is not needed for the one-byte game-init probe.
The TCP port should match your own `Server/game.yml`; the code defaults to
loopback host `127.0.0.1`. A successful result confirms **only** the game
connection/session-ID stage, not account authentication. The session ID must
never be logged or shared. This check currently runs **directly against the
local native TCP server**, not through the browser WebSocket gateway.

See [protocol compatibility notes](PROTOCOL.md) for the packet differences and further work.

### Credential-free WebSocket gateway pre-login test

The native TCP probes above prove the local game server's pre-login endpoints work. To test that **the WebSocket gateway carries the same native handshakes**, start the gateway in one PowerShell window (from `Mobile/`):

```powershell
$env:SOLOSCAPE_GATEWAY_ENABLE_NATIVE = '1'
$env:SOLOSCAPE_GAME_TCP_PORT = '43594'
$env:SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS = 'http://localhost:3001'
npm run gateway
```

Then, in a **second** PowerShell window, from `Mobile/`, run:

```powershell
$env:SOLOSCAPE_NATIVE_REVISION = '240'
npm run probe:gateway
```

This uses `ws://127.0.0.1:43595/` and `Origin: http://localhost:3001` by default. You can override these using `SOLOSCAPE_GATEWAY_URL` and `SOLOSCAPE_GATEWAY_ORIGIN`; the Origin must match the gateway allowlist. The probe refuses non-loopback plaintext WebSockets. It sends a full native JS5 request (15 plus revision and four random seed integers), opens a **separate connection** to send native game-init (14), verifies response 0 and the full session response, and never reveals the session ID. It does **not** send TSPS packets, passwords or a native game login block. Even when both pass, **TSPS compatibility is not yet implemented**.

### In-memory revision-240 cache master-index fetch

After the live JS5 and game-init handshakes passed through the gateway on
8 October 2026, the next test is **one bounded native JS5 archive-group
download**, not a full asset/cache distribution. The CLI requests the **cache
master index**, archive `255`, group `255`, using rsprot's
`URGENT_REQUEST` (opcode 1, archive byte 255, group short 255) **after**
the 21-byte JS5 connection handshake. It reconstructs 512-byte JS5 blocks
and their `0xFF` continuation markers, checks the cache-container header,
applies a 2 MiB compressed-container ceiling and reports only the size,
compression type and SHA-256 fingerprint. **No asset or cache files are
written**. Compressed cache content is not yet decompressed or interpreted.

With the **gateway still running** from the previous step, update the branch
and run this from a second PowerShell window in `Mobile/`:

```powershell
git pull --ff-only origin feature/mobile
npm install
$env:SOLOSCAPE_NATIVE_REVISION = '240'
npm run probe:cache
```

The gateway defaults to `ws://127.0.0.1:43595/` with Origin
`http://localhost:3001`. A successful download proves that native JS5 can
serve **one cache metadata group** over WebSocket. The parser can also interpret a valid uncompressed legacy CRC/version master-index as eight-byte records (archive CRC and archive reference-table version); it does **not** validate those values against downloaded reference tables. It does not establish that
all game assets are present, that cache contents have correct checksums, or
that the upstream TSPS revision-241 renderer can consume the revision-240
data. No authenticated account or login attempt is involved.

### Confirmed live cache milestone

On 8 October 2026, the local SoloScape server with revision `240` served the
`255:255` JS5 master index over the WebSocket gateway. The probe reported
**205 container bytes**, compression `0`, **200 decoded bytes** and SHA-256
`d45568eb3b832e4794eb58dcca479b815ce93b63422ad2bafc976355c2c52f6b`.
No cache files were saved. Interpreting the 200-byte data as legacy
CRC/version pairs implies **25 archive index entries**; this is now supported
by an eight-byte parser with tests, but individual reference-table checksums
have **not** been cross-checked against those entries. Re-run
`npm run probe:cache` to display the inferred entry count.

### Archive reference-table CRC32 integrity check

The live `npm run probe:cache` output on 8 October 2026 confirmed **25**
CRC/version metadata entries in the 200-byte master-index payload. The
next diagnostic fetches **one reference table**, archive index `0`, group
`255:0`, over a **second native JS5 connection through the gateway**.
OpenRune's cache provider sends the index-255 reference-table sector without
stripping a revision suffix, so its CRC32 is calculated over the complete
returned container (including its header). The test compares that CRC32
against archive 0's entry in the freshly fetched `255:255` master index.

Keep the Java game server and WebSocket gateway running. From the `Mobile`
directory in a separate PowerShell window:

```powershell
git pull --ff-only origin feature/mobile
$env:SOLOSCAPE_NATIVE_REVISION = '240'
npm run probe:cache:verify
```

The command prints the archive 0 CRC32, number of container bytes, and
reference-table version from the master index. It **fails with a nonzero
exit code** if the checksum differs, and it never saves or decompresses
asset data. This validates a single **CRC32 integrity** relationship, not
cryptographic authenticity, version equivalence, archive completeness,
TSPS compatibility, native authentication, or playable mobile gameplay.
**Live result (8 Oct 2026):** archive 0's `255:0` reference table arrived at 107,328 bytes and CRC32 matched the master index (`0x05cf8665`). The master-index archive-0 revision field was `1790003854`; that was not yet checked against the decompressed reference-table header.

The probe now also decompresses **only** a bounded (16 MiB) uncompressed/gzip reference-table header, checks format 5–7 and the archive-ID deltas, and compares the table's embedded revision to the master-index revision. Gzip output and archive counts are bounded, bzip2 is not supported, and no asset files are written. This **header/revision comparison has not yet been run against the live server**: after pulling `feature/mobile`, rerun `npm run probe:cache:verify` with revision 240.

### First actual archive group: native JS5 integrity probe

**Live metadata result (8 Oct 2026):** archive 0 reference-table format 7,
revision `1790003854`, **10,948 groups**, IDs 0–14,568, and 640,116
decompressed metadata bytes. Master-index and reference-table CRC32/revision
were both cross-checked against the live SoloScape server.

The new `npm run probe:asset` validates the `255:255` master index, fetches
the `255:0` archive-0 reference table, verifies its checksum and revision,
parses the **archive-group IDs and CRC32 values**, then requests exactly the
**first listed archive-0 group** (expected `0:0`) over the native WS gateway.
The response's container CRC32 is compared with the per-group reference-table
CRC32. This is a **one-group, at-most-2-MiB compressed-container** probe, not
a bulk cache downloader. The group stays in memory, is **not decompressed**
or written to disk, and is not delivered to the TSPS browser renderer.

From `Mobile`, with the Java game server and native WebSocket gateway
still running in their own terminals:

```powershell
git pull --ff-only origin feature/mobile
$env:SOLOSCAPE_NATIVE_REVISION = '240'
npm run probe:asset
```

A verified CRC32 establishes **one actual archive group** can be delivered
intact via WebSocket; a failed response can mean the group is missing,
exceeds the strict 2-MiB limit or has inconsistent CRC metadata. The
live result is **pending**. CRC32 is not cryptographic authenticity and
this does not implement native login or playable mobile gameplay.

## Known incompatibilities / next engineering work

- TSPS upstream revision **241** versus SoloScape's documented **240.2**: align supported protocol, game packets, cache ids and interface definitions.
- The native WebSocket-to-TCP gateway is implemented, but **TSPS cannot use it yet** because its proprietary application packets require a real native OSRS encoder/decoder + authentication and cache adapter.
- TSPS's cache and build scripts depend on portions of the TSPS server project. Those scripts run **in the upstream submodule**, while SoloScape's Kotlin server stays unchanged.
- TSPS's existing touch gestures, PWA, iOS landscape handling and WebGL renderer are available in the pinned source; Android/iOS real-device smoke tests and SoloScape branding still remain.

CI checks the launcher configuration and syntax; it does not yet prove the TSPS client can render or connect to SoloScape.

## Scope

The mobile client should be additive. Avoid replacing `Client/`, changing SoloScape's existing desktop-client launch flows, or porting the whole TSPS TypeScript game server unless a specific compatibility requirement is established.
