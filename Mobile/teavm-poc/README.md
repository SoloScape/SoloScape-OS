# TeaVM browser feasibility spike — not yet OpenOSRS

The isolated probe compiles original SoloScape Java bytecode to an ES2015
JavaScript module with **TeaVM 0.15.0**, then uses the browser's existing native
revision-240 JS5 gateway to fetch a real master-index container. It checks that
CRC32 computed in TeaVM-generated Java matches the native browser result.
It also verifies OSRS map-square math and Java-to-JavaScript exported functions.

## Build on the Windows development machine

Use JDK 17+ and Maven 3.9+:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
cd Mobile\teavm-poc
mvn package
node scripts\verify.mjs
```

The generated module is `target/javascript/bridge.js` (not committed).
The public homepage **/** is now the fullscreen SoloScape client.
It uses original cache-backed title assets, genuine encrypted native OSRS
login and the same authenticated session for WebGL world and player display.
The public `/legacy`, `/teavm/lab` and `/diagnostics` routes have been
removed. The historic bytecode feasibility and model projects remain in the
local source tree and are verified by `npm run test:teavm`, but are not pages
served to users. The `/teavm` alias opens the same fullscreen client as `/`.

The home page shares `NativeTitleScreen` with the native browser renderer:
verified revision-240 title artwork, bitmap fonts, rune fire, Scape Main,
mute, username toggles and the world selector. The title fills the browser
window with proportionally cropped background artwork. Its classic 765x503 UI
and transparent input targets scale together and remain centred without
stretching or cropping the controls. Ordinary login contains only username and password,
with the original connecting screen retained until native authentication.
TeaVM title-state exports and `TitleLoginSession` still control authentication
and attach the world before its first same-frame rebuild packet. Cache music
failure does not block login. Exact visual parity needs a live side-by-side
OpenOSRS/cache comparison; the automated homepage smoke uses fixture assets
and a simulated native session.

The browser's native JS login/game networking and WebGL scene remain distinct
from the original OpenOSRS Java scene renderer, which is not yet ported. The
original gamepack and its derived artifacts must not be redistributed.

## Why this is not an OpenOSRS engine port

The entire pinned client now has an independent compilation probe:
`npm run build:openosrs-engine` from `Mobile`. It verifies the untouched local
gamepack and `../Client/runelite-api/build/libs/runelite-api-1.2.0.jar`.
Override those paths with `SOLOSCAPE_OPENOSRS_GAMEPACK` and
`SOLOSCAPE_OPENOSRS_API`; `SOLOSCAPE_OPENOSRS_ROOT` changes the default
reference checkout. The gamepack digest must match `openosrs-reference.json`.

The probe compiles `engine-src/EngineBridge.java` using `engine-pom.xml`,
separately from the existing renderer bridge. It first creates an ignored
local adaptation of the pinned archive, lowering dynamic constants to lazy
calls to their original helper methods without stripping engine methods.
The adapter uses ASM 9.8 from the local Maven repository; set
`SOLOSCAPE_MAVEN_REPOSITORY` to override that repository's location.
TeaVM 0.15.0 then parses every method, including those outside startup
reachability. All 735 classes and 18,979 adapted methods now parse successfully.
Synthetic JVM fixtures verify the adaptation in
`tests/openosrs-engine-constants.test.mjs`.

The full engine still fails runtime dependency checking: AWT, executor/queue
APIs, dynamic class/resource loading, logging binding and a regex overload
need browser-compatible implementations. See `../OPENOSRS_PARITY.md` for
the evidence and remaining porting gates. SLF4J/Guava API versions match the
reference build. A small Java 8-source classlib implementation supplies the
standard BootstrapMethodError type missing from TeaVM; Maven still runs
under JDK 17 or newer.
`target/engine/report.json` and `compiler.log` contain the local outcome;
failure exits nonzero and removes any partially emitted engine module.
Even a successful build is `compiled-unverified`.
The probe does not serve its generated module or change the active homepage.

The separate local OpenOSRS `injected-client.oprs` is a compiled desktop
JVM game engine. It cannot be directly embedded in the mobile browser; TeaVM
supports only part of the Java standard library. A local dependency audit of
the supplied revision-240 binary found 735 classes, including 43 with AWT
references, 28 with Java networking references, 17 thread references and
7 reflection references. These are heuristic byte markers, not a compile
diagnosis or proof every API is reachable from the engine's entry point.

To reproduce the real OpenOSRS engine, further milestones require:
1. Establish legal rights to adapt and redistribute the game engine's bytes.
2. Isolate/rewrite AWT canvas, input, audio, networking, resources, reflection,
   and dynamic class loading for browser APIs.
3. Transpile and verify genuine game logic/renderer classes, not a substitute
   engine; measure fidelity and memory/FPS on a phone.
4. Integrate the transpiled engine's loading/login/game loop separately from
   SoloScape's current JavaScript renderer.

Run the non-copying local diagnostic if you have access to the reference:
```powershell
py -3 scripts\audit_gamepack.py 'C:\path\to\injected-client.oprs'
```
No binary gamepack, extracted proprietary bytecode, or gamepack-derived TeaVM
output is committed, exposed over HTTPS or included in this experiment.

TeaVM references:
https://teavm.org/docs/runtime/js-modules.html
https://teavm.org/docs/intro/overview.html

## Authentic revision-240 Rasterizer2D milestone

The proof now transpiles actual software-rendering **bytecode** from the pinned
local OpenOSRS client (`gamepack.properties` revision 240, SHA-256
`25f42961c400bd9dfff1554402441c0ba6d1cffd011163cb9b0b4c42ae194f85`).

`npm run build:teavm` automatically selects JDK 17+, checks the exact
gamepack SHA, and uses ASM locally to isolate the original `yw.dn` (clip)
and `yw.fn` (fill rectangle) bytecode in a tiny generated JAR. No replacement
rasterizer or hand-written recreation of these methods is used. This isolation
avoids TeaVM failures in otherwise unrelated desktop/JVM methods of the
injected client. `RendererBridge.java` sets the original rasterizer's pixel
buffer, runs those methods to draw a diagnostic test pattern, and exposes
the actual resulting 256x160 RGB framebuffer via the compiled JavaScript module.

`/teavm` converts only the pixels to Canvas2D ImageData and calls
`putImageData`. It does **not** use JavaScript draw primitives to fake the
rasterizer's result. The Canvas diagnostic works without a JS5 gateway;
the existing live master-index CRC32 check is separate and optional.

Run `npm run test:teavm` after building: it verifies pixel colors,
draw order, exact clipping, and verifies the full buffer hash against a
separate JVM execution of the **unmodified** `yw` class in the original
`injected-client.oprs`, not the stripped JAR.

The local OpenOSRS checkout is expected at
`../Client/runelite-client/src/main/resources/injected-client.oprs`
relative to the GitHub repositories directory. To override the path set
`SOLOSCAPE_OPENOSRS_GAMEPACK`. Original bytes, generated subset JARs,
and generated gamepack-derived JS stay under ignored `teavm-poc/target/`.
**Do not redistribute** those outputs without the applicable rights.

This is a proof that **one original software-rendering primitive runs in
TeaVM and draws the same pixels as the JVM**. It is *not* the OpenOSRS scene
renderer, texture pipeline, title screen, login or game loop. Expansion to
authentic models, depth buffers, scene composition and browser input is
still substantial work.

## Real JS5 model viewer (current step)

The `/teavm` page now also attempts to load an **actual rev-240 model**
from validated JS5 archive index **7** using SoloScape's existing
`NativeJs5Cache`, `decodeGroup`, and `decodeModel` utilities.
It starts around model group 1000 and checks nearby present groups for
usable geometry. Enter a different model group ID and press **Load verified
model** to try another. Drag the Rotate slider and release to change yaw.
A running **native JS5 WebSocket gateway** is required for model downloads.

The model's real vertex positions, face indices and packed-HSL colors
are sent to compiled TeaVM Java. The new `ModelView` class performs a
bounded projection, back-to-front triangle sorting and scanline coverage.
Every painted horizontal span goes through the **unaltered rev-240
`yw.fn` OpenOSRS bytecode** isolated in the previous milestone.
The RGB framebuffer is copied to Canvas2D; no streaming or JavaScript
Canvas triangle drawing is used.

**Accuracy boundary:** The original OpenOSRS 3D triangle entry point
`ff.al` currently fails TeaVM bytecode parsing. So the 3D projection,
span coverage, and painter ordering are *new Java bridge code*, not a
completed port of OpenOSRS's `Rasterizer3D`. Textures, non-opaque faces,
advanced shading, clipping and depth buffering are omitted in this viewer.
This is real JS5 geometry displayed by TeaVM plus original 2D rasterizer
bytecode, **not** yet pixel-perfect game-engine rendering.

`npm run test:teavm` renders the same model geometry fixture at four
camera angles with (1) TeaVM and original 2D pixel writer and (2)
a JVM process using the **original untouched `yw.class` in the pinned
gamepack**. Their complete framebuffer hashes must agree. These tests
do not substitute for live JS5 or mobile FPS validation.

## Authenticated world and local-player rendering

After authenticating at `/`, the browser now keeps the **same** native
revision-240 WebSocket session for gameplay. It attaches the existing
`NativeGameplay` decoder **synchronously in the native onAuthenticated
callback**, before the gateway can deliver the first `REBUILD_NORMAL_V2`
and `PLAYER_INFO` packets in the same frame. No second login is needed.

`TeaVmWorldBridge` is deliberately a separate, disposable adapter: the
server determines the map/plane/appearance, the existing CRC-verified
`NativeJs5Cache` downloads real terrain/floor/scenery/model/animation
assets, and SoloScape's established `NativeTerrainViewport` draws them
using WebGL. The loading cover remains until both the original cache-backed
player and map are prepared and a real WebGL scene frame is drawn. Disconnect
cancels outstanding cache work, tears down the viewport, and returns to the
title screen. Pointer/touch camera orbit and ground clicks use the existing
native viewer input and server movement protocol.

**Porting boundary:** This is an integrated *native JavaScript/WebGL*
rendering bridge under the TeaVM title shell, not yet OpenOSRS's Java
`Rasterizer3D`, Java input handler, or full original game loop compiled by
TeaVM. The isolated original renderer bytecode proof in the local source tree
remains a separate milestone. This adapter intentionally doesn't try to
reimplement unported server interface widgets or advanced menus. All models
and assets must come from the real revision-240 cache, never from a fake
demo world. Full visual verification on a phone still requires an actual
account login; automated tests use only fixture accounts and mock packets.
