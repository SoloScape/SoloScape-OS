# SoloScape Mobile (TSPS port)

> **Status: experimental TSPS integration, not yet a playable SoloScape client.** The pinned upstream source and a configurable dev/build launcher are present. A playable SoloScape mobile client has **not** been ported yet. The current `Client/` desktop RSProx launcher and `Server/` Kotlin game server remain unchanged.

This directory integrates the pinned upstream browser client as a Git submodule at `tsps-upstream/`, based on [RSPSApp/tsps](https://github.com/RSPSApp/tsps), which provides a React/TypeScript/WebGL OSRS-style game client. Track the work in [issue #32](https://github.com/SoloScape/SoloScape-OS/issues/32).

## The actual native WebGL client (current active development)

**Starting 8 October 2026**, `npm run dev` (also `npm run dev:native`)
starts **SoloScape's own WebGL world client** at
`http://localhost:3001/`, not the collection of JS5 diagnostic buttons.
The landing page is now the classic title screen. It uses the server's
**revision-240 `titlewide.jpg` from cache index 10**, mirrored into the full
1089×671 artwork cropped to the classic 765×503 title screen, plus the cache
logo, title box, buttons and fonts. The title screen is centred in the browser,
with the stone login panel centred within it and mute in its bottom-right
corner. It draws into a native 765×503 framebuffer at integer coordinates,
with one-pixel font shadows. Only the finished image scales down proportionally
when the viewport is smaller; device density does not resample individual glyphs.
The red loading bar advances as those verified assets and music metadata
finish loading. **New User** is intentionally inactive. **Existing User** opens
the ordinary login/password form; the authenticator field is removed from this
screen. The form requests no browser autofill and supplies password-manager
ignore hints; browser extensions can override these. Login labels, typed text and the blinking caret use the welcome
text's bold cache font. Selection is disabled and the title cursor stays an arrow. Original TSPS rune-fire code drives
the animation. **Scape Main** comes from cache index 6 and plays through the
ported TSPS MIDI synthesizer with index-15 patches and index-4/14 samples.
Browser autoplay rules require the first click/tap/key before music starts;
the cache mute button controls it. Music stops on entering the game.

Login retains the cache title artwork and masked fields while connecting,
with a small top-left "Loading - Please wait." badge. The login buttons are
hidden while connecting. The initial map build completes before switching
to the full-viewport game; disconnect returns to the title.
The top bar, sidebar and development overlays are hidden in ordinary play.
**F10** opens the developer panel with region travel, floor controls,
disconnect, cache-interface preview and diagnostics. No terrain preview
starts automatically before login. No cache artwork or music captures are
committed. Reproduce the
original fire/music modules with `node scripts/adapt-title-runtime.mjs` after
initializing the pinned TSPS submodule. No additional npm dependency is needed.

The client uses the already live-tested browser-native revision-240 JS5 cache
loader and renders a **real map-region terrain height mesh** in WebGL with touch/mouse camera orbiting,
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

`http://localhost:3001/` loads the cache title screen. Log in to enter your
server location, or open **F10**, change X/Y and press **Travel** for a
developer-only region preview.
The first live m50_50 attempt failed to find a **single-file**
terrain group; that is a map reference/index lookup failure, not proof
that the native gateway or server is offline. The client now supports
**multi-file native map groups**, extracting the terrain file with ID
0 using the OSRS archive chunk table. The cache loader retains support for
choosing the nearest real named region when fallback is requested explicitly.
Developer Travel requests remain exact, with a clear failure if absent.
No mock map or stand-in terrain is rendered.

Touch/drag or mouse/drag rotates the camera; wheel zooms; WASD/arrows
pan along map axes (W/up north, S/down south, A/left west, D/right east).
The native camera starts 12 tiles from its target, with wheel zoom bounded
between 6 and 24 tiles. Ctrl + wheel restores the default. Login resets the
distance before player assets load; walking and map rebuilds preserve your zoom.
Terrain, scenery and actors use the classic 25-tile draw window around the
camera tile. Ground and NPC picking obey the same window. Whole neighbouring
map regions remain loaded for movement; loaded map area does not set visibility.
The camera maps cache north to negative WebGL Z alongside upward height,
preserving map handedness across terrain, scenery and textured batches.
At yaw zero, north appears up and east right; orbiting changes the view.
If cache geometry is not available, the page displays the actual
network/format error and leaves the viewport empty. The renderer needs
a real browser/live-server verification; GitHub CI uses synthetic map
fixtures and validates mesh generation.

**Important scope:** This is **real client/world renderer development**,
with static scenery, textures, native encrypted login, server-authoritative
player rendering and click-to-move. Revision-240 global player updates,
appearance composition, classic locomotion animation, collision-owned
movement requests, rebuilds and plane changes are decoded from the live
game stream. The native client also decodes revision-240 NPC V6 updates,
loads verified NPC cache definitions/models and renders nearby NPCs
using classic idle/walk/run
and action animation. Left-click or quick-tap an NPC to use its first
available action; right-click or touch-and-hold opens the full menu. Instanced regions, dynamic NPC
transforms and specialised
customisation, interfaces and chat remain
incomplete; NPC interaction packets still need live server verification.
Do not ask users
for credentials before trusted TLS and a reviewed native login path.

### Cache-backed native interface renderer (developer preview)

The native browser now decodes verified **revision-240 cache index 3**
interface groups (IF1 and IF3) from their real widget files. It preserves
the original widget hierarchy, cached sizing/position alignment, clipping
and scroll offsets. A read-only canvas renderer draws supported components
(containers, filled/outlined rectangles, text, sprites and lines) using
real sprite images from cache index 8 and bitmap fonts/metrics from
indices 8/13. It never fabricates absent assets or interface graphics.
A developer-only **Verified cache interface group** selector in the
sidebar lets you inspect any group that actually exists in the cache;
select a group number and click **Preview interface**. **Close** restores
the unobstructed world. The interface preview is not a new RuneScape
dialogue and does not simulate server behaviour.

When authenticated, the native game stream now owns the interface canvas.
`IF_OPENTOP`, `IF_OPENSUB`, `IF_CLOSESUB`, `IF_MOVESUB` and `IF_RESYNC_V2`
open, attach, move, close and reconcile real cache groups. Mounted groups
inherit their destination component's position and clipping. Server text,
colour, visibility, position, scrolling and event-flag updates apply even
when they arrive before cache loading completes. Cache definitions remain
immutable; disconnect clears session state and cancels stale loads.

Supported buttons send revision-240 `IF_BUTTON`, `IF_BUTTONX`,
`RESUME_PAUSEBUTTON` or `CLOSE_MODAL` packets through the authenticated
ISAAC stream. IF3 action permissions follow the server's event flags.
Interface clicks do not also trigger world movement. The developer preview
is disabled during login/gameplay and remains read-only outside a session.

NPC/player dialogue now consumes `RUNCLIENTSCRIPT`, `IF_SETNPCHEAD`,
`IF_SETNPCHEAD_ACTIVE`, `IF_SETPLAYERHEAD`, `IF_SETANIM` and varp updates.
Verified CS2 scripts 58/600/2379 and their dependencies create the choice
rows, align wrapped text and reset dialogue background state. Execution,
calls, stacks and dynamic widget counts are bounded; unknown operations
abort. The native dialogue branch reveals the real chatbox modal and cache
background while hiding history, following scripts 113/923. Cached widget
definitions remain unchanged and closing the dialogue restores visibility.
Cache chathead parts, appearance colours/customisations, textures and classic
animations render inside the inherited clipping rectangle. Unavailable
animation leaves the cache head at rest; no replacement art is generated.
Continue uses the server's pause-button permission; choices retain their
dynamic child IDs. Click/tap, Space/Enter and keys 1–5 share that path, with
duplicate submissions blocked until the next page arrives.

General CS1/CS2 listeners, inventory/item models, chat history/input and
varbit-transformed NPC heads remain unsupported. Portraits use a bounded
software rasterizer; pixel parity with the full client is not established.
Live cache scripts/fonts and animated NPC heads were exercised locally;
a logged-in dialogue walkthrough and physical-phone validation remain pending.

`npm test` covers wire vectors, nested mounts, updates, event permissions,
button encoding, cancellation, pointer routing and real Chrome canvas
painting. With Java 21+ and the installed server libraries available,
`npm run test:interfaces:rsprot` checks all 18 supported incoming layouts
against actual JVM encoders and sends synthetic IF1/IF3/Continue button
payloads through the JVM decoders. Set `JAVA_BIN` if needed; no account
credentials or captured cache/game data are used.

### Native NPC V6 synchronization and rendering

The authenticated native scene consumes `SET_NPC_UPDATE_ORIGIN` and
`NPC_INFO_SMALL_V6` / `NPC_INFO_LARGE_V6` from rsprot revision 240.
NPCs spawn at server-supplied world coordinates, step, run/crawl, turn,
change definition and despawn; malformed packets do not partially replace
the previous NPC state. Cache index 2/group 9 provides NPC definitions,
and verified index 7 models share the player's texture and classic
animation loaders. Up to 48 nearby NPCs in loaded map regions are drawn
alongside the local player. The login status reports synchronized and
rendered NPC counts.

NPC rendering was confirmed working in a live local client on 8 October
2026; newly implemented NPC interactions still need a live server check.
Right-click an NPC on desktop, or hold a finger on an NPC for 475 ms
on mobile, to open its native, canvas-rendered Choose Option menu
(Talk-to, Trade, Attack, etc. when available), followed by Examine and
Cancel. The former HTML/CSS mock menu has been removed. Native cache index
8 (font glyphs) and 13 (font metrics), group 496 (b12_full), provide
the original game bitmap font. Layout, dimensions, colours, shadow and
hover behaviour are ported from the pinned TSPS Choose Option renderer,
rather than approximated with browser CSS buttons.
Left-click or short-tap performs the first visible primary action; if
none exists, it opens the menu with Examine. Holding while dragging
cancels the menu gesture, preserving camera orbit controls. The
server-controlled visibility mask is respected.
The selected primary slot uses OPNPC1_V2 through OPNPC5_V2; Examine
uses opcode 101 (OPNPC6) with the NPC's cache type ID. The client
shows the cache description until native chat is implemented, and the
server remains responsible for authoritative examines, NPC pathing
and available action scripts.
Tapping ground or Cancel dismisses the menu; no action is sent for an
NPC that despawned or changed type. Dynamic varbit/varp-driven NPC morphs,
specialised model customisation, skeletal sequences, effects, and NPCs
in instanced worlds are not yet supported. The full TSPS MenuEngine
(including its interface, object, player, and ground-item entries) has not
yet been integrated; the native menu currently covers grounded walking
and NPC actions with revision-240 packet encoding. Live cache-font
display and touch interaction still require an authenticated browser check. Missing/unsupported models
are skipped, never replaced with fabricated geometry. Run
`npm test` from `Mobile/` for fixture and gateway integration checks;
set `CHROME_BIN` to an accessible Chrome executable to enable the
separate Chrome/WebGL smoke tests.

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

## Native revision-240 account login

The world preview now includes a native login form with username, password and
an optional six-digit authenticator code. The browser speaks the desktop
revision-240 login format accepted by the Kotlin server, through the existing
WebSocket gateway. Login does not yet place a visible player or enable movement.

The preview reads **only** the generated public `Server/.data/client.key` and
serves its exponent/modulus as `/login-config.json`. If the key is missing or
invalid, the form stays disabled with an explanation. The private `game.key`
stays on the game server. For a server installed elsewhere, set these before
starting `npm run dev`:

```powershell
$env:SOLOSCAPE_RSA_PUBLIC_KEY_FILE = 'C:\path\to\server\.data\client.key'
$env:SOLOSCAPE_NATIVE_GATEWAY_URL = 'ws://127.0.0.1:43595/'
npm run dev
```

The Java server, its account service and the gateway must be running. Keep the
gateway's fixed TCP upstream pointed at that server and allow the preview's
exact Origin (`http://localhost:3001`). The login cache manifest is fetched from
the same gateway as the account connection. Remote gateways require `wss://`;
plaintext `ws://` is accepted only for loopback development.

Login uses raw RSA for password/OTP and session seeds, XTEA for the remaining
login block, the native SHA-256 challenge and independent ISAAC streams for game
packet framing. The UI reports server rejection codes or authenticated status,
then receives framed game packets and sends encrypted keepalives. Password/OTP
fields are cleared on submit; credentials, trusted-computer tokens and account
hashes are not saved or logged. Disconnect, timeout and page exit clear the
session buffers. Cancellation during cache loading cannot open a stale session.

Validation uses synthetic credentials and ephemeral RSA keys. The installed
`rsprot` **1.0.0-ALPHA-20260912** JVM decoder accepted password and OTP packets,
including every mixed-endian cache CRC, and all **151** generated server packet
definitions match the installed library. The test suite also checks independent
RSA decryption, XTEA/JVM ISAAC vectors, fragmented/coalesced native TCP through
the actual gateway, rejection, cancellation and real Chrome login/keepalives.
Run it with:

```powershell
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test
$env:JAVA_BIN = 'C:\path\to\jdk-21\bin\java.exe'
npm run test:rsprot
```

The JVM check uses the existing server distribution's `lib` directory; override
it with `SOLOSCAPE_RSPROT_LIB_DIR` if necessary. Normal tests need no Java or
upstream TSPS build. `scripts/generate-native-protocol.mjs` reproducibly generates
the framing table from pinned rsprot source and retains its MIT licence.

**Live account login is unverified:** live revision-240 JS5/game-init handshakes,
the 23-entry login CRC manifest and public RSA configuration passed through the
local gateway, but successful account-service authentication still needs a test
account. Player/region packet interpretation, movement, reconnect, token/SSO
authentication and actual-phone validation remain outstanding.

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

### Cache-defined floor topology (8 October 2026)

The native terrain decoder retains overlay paths and rotations from each map
opcode: path `(opcode - 2) >> 2`, rotation `(opcode - 2) & 3`. The format is
cross-checked against [RuneLite MapLoader](https://github.com/runelite/runelite/blob/master/cache/src/main/java/net/runelite/cache/definitions/loaders/MapLoader.java).
The WebGL mesh uses the pinned
[TSPS SceneTileModel](https://github.com/RSPSApp/tsps/blob/b9ca431be440174fce5adf0efbb7afa992358916/client/rs/scene/SceneTileModel.ts)
vertex/face tables, corner rotation, and integer midpoint heights, with its
BSD notice retained in the adapted source. Underlay and overlay faces now occupy
their cache-defined portions of each tile instead of a full-square replacement.

Invented ID-derived tints, elevation-based shading and blue fog are removed.
Before floor definitions arrive, the viewport shows a **debug wireframe** of
cache geometry. When definitions arrive it shows raw **primary RGB** on known,
untextured faces; secondary RGB belongs to the minimap and is no longer used
as the scene colour. Missing definitions, magenta transparent overlays and
textured faces are omitted, without substituted colours.

This is an intermediate scene renderer, **not verified mobile-client parity**.
OSRS HSL blending/lighting, textures, region seams (the final row/column requires
neighbour-region heights), upper planes/bridges, objects, native login, entities
and mobile controls remain incomplete. Existing controls and the region selector
are development tools, not a recreation of RuneScape Mobile. No generated game
assets or standalone probes are introduced. CI fixtures cover all 48 encoded
path/rotation combinations, all 52 model topologies, diagonal face colours,
midpoint heights, transparency and missing materials. Live visual verification
against SoloScape and the official mobile client remains required.

### Packed HSL blending and vertex lighting (8 October 2026)

The ground renderer now replaces raw RGB fills with the client colour pipeline:

- RGB channels are divided by 256, producing weighted underlay hue, saturation,
  lightness and hue multiplier; overlay hue is calculated separately.
- Underlay colours use the radius-five sliding blend window (offsets -4 through
  +5), weighting hue by its multiplier. One blended base HSL is used per tile,
  as in the Java client; vertex brightness varies with the height-field normals.
- Lighting uses the original integer divisions, normal scale 65536, direction
  (-50, -10, -50), base 96 and intensity factor 768. Flat unoccluded terrain
  evaluates to 84. The TypeScript upstream's combined floating-point expression
  would instead round it to 83; that discrepancy is not carried over.
- Midpoint vertices average already-lit packed HSL integers. The fragment shader
  interpolates the packed colour in screen space and then looks it up in a
  65,536-entry palette, rather than blending RGB or adding arbitrary shading.
- The palette uses the pinned client brightness preset 0.8, with nearest-neighbour
  sampling. It includes entry 65535, which the upstream's 65535-element array omitted.

Sources are the pinned TSPS
[ColorUtil](https://github.com/RSPSApp/tsps/blob/b9ca431be440174fce5adf0efbb7afa992358916/client/rs/util/ColorUtil.ts)
and the deobfuscated Java client
[terrain builder](https://github.com/open-osrs/runelite/blob/915fb55c0a2a1c000dc04a431e68f3bbb29a40cf/runescape-client/src/main/java/class134.java),
[SceneTileModel](https://github.com/open-osrs/runelite/blob/915fb55c0a2a1c000dc04a431e68f3bbb29a40cf/runescape-client/src/main/java/SceneTileModel.java)
and [Rasterizer3D](https://github.com/open-osrs/runelite/blob/915fb55c0a2a1c000dc04a431e68f3bbb29a40cf/runescape-client/src/main/java/Rasterizer3D.java).
Floor conversion is also cross-checked against RuneLite's
[UnderlayDefinition](https://github.com/runelite/runelite/blob/master/cache/src/main/java/net/runelite/cache/definitions/UnderlayDefinition.java)
and [OverlayDefinition](https://github.com/runelite/runelite/blob/master/cache/src/main/java/net/runelite/cache/definitions/OverlayDefinition.java).
The Java reference is historical desktop client evidence, not proof of current
official mobile pixel parity.

The selected region now loads a verified eight-region halo asynchronously.
Neighbour heights complete its final north/east tile row and column, including
the diagonal corner. Height normals use the surrounding samples, and underlay
blend windows include neighbouring floor IDs at offsets -4 through +5. Only
definitions used in that border band are decoded. First geometry and floor
rendering do not await the halo; enrichment preserves the camera and discards
results after Travel selects a different region.

Absent or corrupt neighbours are reported and never replaced with copied or
generated heights. Tiles without all four height corners stay omitted; normals
without surrounding heights remain unset, and blend windows use only available
data. The status shows the number of neighbours loaded, so partial edges remain
explicitly incomplete. A fully available halo renders all 64 by 64 ground tiles.
Missing in-region floor definitions suppress affected blends rather than adding
guessed colours. Object shadows remain absent until locations/models supply
occlusion data; the existing client occlusion calculation is supported but no
shadow values are invented. Textured faces remain omitted. This change does not
implement mobile brightness settings, Java software-rasterizer scanline
quantization, textures, world models or account sessions. WebGL fragment high
precision is required for packed-colour interpolation. Live comparison against
the user's revision-240 scene and official mobile client remains outstanding.

The existing CI floor tests cover RGB-to-HSL golden vectors, saturation thresholds,
lightness clamps, Java integer-lighting values, occlusion weights, blend-window
removal boundaries, missing-definition handling, per-vertex mesh HSL and rotated
midpoint averaging. The preview-server test also requests the new lighting module.
Region-edge fixtures compare adjacent meshes in world coordinates, shared border
normals, and weighted blends against an independent radius-five reference. They
also verify CRC rejection, missing neighbours, diagonal corners, cancellation and
late material responses. Live visual confirmation of this edge implementation
against the running SoloScape server is still required.

### Cache-backed static scenery (8 October 2026)

After initial terrain and neighbour loading, the native viewport reads location
data from a named `lX_Y` group, or file 1 of a combined `mX_Y` group. Delta-coded
object IDs, four-plane positions, shapes and rotations are bounds checked. Object
definitions come from verified index 2 group 6; models come from verified index 7.
Only definitions and models needed by the selected region's ground plane are
decoded. Missing or corrupt assets are omitted and counted rather than replaced.

`model-codec.mjs` adapts the four decoder formats from the pinned BSD-2-Clause
TSPS `ModelData`, retaining its licence. Its strict byte reader rejects invalid
offsets/truncation, and face indices are checked before use. The checked-in
decoder has no upstream runtime dependencies. To reproduce it with the pinned
submodule present, run `node scripts/adapt-model-codec.mjs` from `Mobile`.

Placement selects models by shape, swaps footprints on odd orientations, handles
mirroring and corner/decoration pairs, and applies recolour/retexture mappings,
scale, offsets, integer rotations, footprint-centre height and supported ground
contouring. Multipart coincident vertices share lighting normals. Opaque,
untextured faces use client integer normal lighting and packed HSL palette
colours. Both terrain heights and models now use **128 units per tile**, removing
the earlier fourfold terrain-height exaggeration. Scenery has a separate WebGL
buffer; recolouring preserves it, Travel clears it, and late loads are discarded.

For encrypted location archives, set `SOLOSCAPE_XTEA_FILE` to a local JSON file
before starting `npm run dev`. Accepted layouts are a region-ID-to-four-word-key
object, or arrays containing `mapsquare`/`key` or `region`/`keys`. The loopback
preview exposes these configured keys at `/region-keys.json`, with no-store
headers; do not configure a credential file or commit map keys. No keys are
downloaded automatically. With no file, the mapping is empty. CRC validation is
performed on encrypted bytes before XTEA decrypts complete blocks starting at
container offset 5, including the expansion-length word. Decompression bounds
are enforced after decryption. A zero key means unencrypted data; a missing or
wrong required key leaves scenery unavailable while terrain remains visible.

Live verification against the local revision-240 server decoded **4,726 locations**
in `m50_50`, using combined JS5 group `5:12850` without a key. The browser rendered
**2,839 static ground-plane placements from 224 models**, with no asset/placement
errors. The running desktop client was inspected alongside the browser's
Lumbridge castle area. This was a limited visual comparison, not parity: textured
castle walls and foliage, 1,559 upper-plane locations, 328 unsupported/dynamic
placements and 12,341 textured/alpha/unsupported faces remain omitted. Animation,
varp/varbit transforms, bridges, cross-object normal merging, object shadows,
textures, alpha sorting and software-rasterizer priority ordering still need work.
The user-selected courtyard is the ongoing comparison target. No login or
gameplay session has been implemented. Encrypted-region handling is fixture
verified; this live region did not require XTEA.

Tests cover all four model formats, signed vertex deltas, strict locations and
definitions, XTEA header/tail handling, native CRC rejection, shape/rotation
mapping, footprint heights and contouring, stale Travel results, omitted material
paths, and actual headless WebGL scenery depth, recolouring and buffer disposal.

### Textures, upper planes and bridges (8 October 2026)

The native scene now reads CRC-verified texture definitions from index 9/group 0
and their indexed sprites from index 8. Revision 233+ uses the pinned client's
seven-byte simplified texture layout; the older definition decoder retains its
sprite lists, palette transforms and animation metadata. Normalized 64/128-pixel
sprites keep transparent cutouts and use the client brightness preset 0.8. No
generated texture images are checked in. Texture animation remains frozen at its
first frame; blended alpha faces remain omitted.

`texture-mapper.mjs` is a standalone BSD-licensed adaptation of the pinned TSPS
mapper, including mapping triangles and cylindrical/planar/spherical mappings.
To regenerate it, run `node scripts/adapt-texture-mapper.mjs` from `Mobile` with
the pinned submodule present. UVs stay attached to face corners through mirroring,
rotation, scaling, retexture mappings and multipart welding. Invalid mappings or
missing/corrupt texture assets omit their faces rather than substituting colours.
The textured WebGL path uses perspective-correct repeating UVs, client vertex
light intensities, nearest sampling, depth testing and alpha cutouts. Terrain
textures share the same verified assets. Texture buffers/images are released on
replacement, Travel and disposal.

Terrain decoding retains all four physical planes, including their render flags,
floor IDs and topology. Upper-plane terrain lighting samples the matching plane
of verified neighbours. Scenery uses each location's original plane heights;
wall-decoration displacement lookup also stays within that plane. The bridge
flag (bit 2 on plane 1) demotes logical scene levels at each tile/location origin
without changing physical heights or emitting replicas. The original base
terrain remains below the bridge. This supplies static bridge rendering, not
movement/collision or an authenticated player's plane transitions.

The **Floor view** selector starts at **Ground + bridges**. Higher views include
successive logical levels, ending at **All floors + roofs**, without reloading
assets or resetting the camera. This is a development cutaway control, not the
desktop client's automatic roof-visibility algorithm.

Live m50_50 now loads **22 textures and 305 models**, rendering **4,395 static
placements across four map planes**, with **zero asset/placement errors**.
The 331 remaining placements and 4,312 faces are omitted for dynamic/state,
alpha or unsupported rendering paths. Its 40 bridge-flagged tiles retain both
surface height and underlying terrain. Browser ground and all-floor views were
compared with the supplied desktop courtyard image: walls, tree canopies, water,
bridge surfaces and upper battlements are visible. Exact camera/pixel parity,
object shadows, cross-object normals, blended transparency, animation and login
remain outstanding.

Tests cover revision-dependent definitions, normalized/tinted sprite pixels,
non-default UV preservation, retexture/mirroring, four-plane decoding, bridge
level demotion and physical heights, same-plane halo sampling, native texture
CRC rejection and stale Travel. The real Chrome WebGL check also proves lit
texture pixels, upper-level visibility, transparent cutouts and GPU resource
cleanup. On Windows, set `CHROME_BIN` to an installed Chrome executable to run
that check locally; Linux CI runs it by default.

### Native player movement: pinned TSPS controllers

Authenticated revision-240 `PLAYER_INFO` and `REBUILD_NORMAL_V2` packets now feed
the original pinned TSPS `PlayerMovementSync` and `PlayerEcs` queue.
The same client's `PlayerAnimController` advances movement and action
sequences. The simulation runs at fixed **20 ms client ticks**, independently
of JS5/cache-loading promises and WebGL draw timing. The renderer samples
the ECS's sub-tile location, stepped rotation, movement sequence and action
frame; it never positions the local player directly at a new packet endpoint.

Stationary GPI packets leave an active path segment intact; new server
steps append to the queued path; teleports, region/plane changes and invalid
displacements clear the path. Client animation sets come from the verified
revision-240 appearance and sequence definitions. The renderer poses classic
frames selected by the upstream animation controller. The existing
revision-240 wire decoder, native login, path request encoding and NPC
interaction packets remain unchanged.

`browser/tsps-runtime/` is generated from the pinned TSPS submodule with
Node's TypeScript transformer, **not manually maintained**. Regenerate with:

```powershell
cd Mobile
npm run generate:tsps-movement
npm test
```

The original TSPS BSD-2-Clause licence remains in the pinned submodule,
and the generated files identify their upstream sources. This integrates
the pinned **player** controller rules, not the entire reference client:
revision-240 GPI endpoints do not always transmit the intermediate order
of two-tile run steps, and mobile does not yet supply TSPS's collision flags
for the optional run-route reconstruction. NPC V6s still use the native
interpolator, and skeletal action models/forced-movement effects remain
outside this parity change. Test in an authenticated browser and on a
physical device before claiming full OSRS movement parity.

### Authenticated login-to-world loading (revised)

The native revision-240 login keeps the classic loading screen while the login
challenge and the **required, CRC-verified four-plane terrain** finish. The
world is now acknowledged with `MAP_BUILD_COMPLETE` once its terrain grid
is available, and the first actor pass runs before revealing gameplay.
Optional underlay/overlay material upgrades, texture sprites and location
models load **after** that transition, rendering progressively; they do not
hold the login screen. Pending work cannot paint a replaced region or a
closed session. Missing optional scenery is reported without inventing data.

The pinned TSPS client tracks handshake and map-data readiness separately,
and streams map squares. It also has a 500 ms minimum loading-overlay display.
SoloScape retains its native server's protocol rather than copying TSPS login
packets. Mobile coalesces concurrent requests for the same JS5 group or index,
while maintaining the original reference-index and group CRC checks.

Use the browser developer console to distinguish `[native-login] Authenticated
in ... ms` from `[native-login] First playable map in ... ms`. Those values
contain no credentials. Cold logins can still be slower than warm runs because
the browser cache service currently keeps verified groups only in memory and
each distinct group uses its own authenticated native JS5 gateway connection.
A persistent, multiplexed cache stream and disk caching remain future work;
no specific live-account speedup is claimed without a measured walkthrough.
