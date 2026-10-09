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
On your LAN visit **https://192.168.0.129:3443/** for the new
cache-backed title bootstrap. **/legacy** is the previous working native
WebGL/mobile client. **/teavm/lab** hosts the previous rasterizer/model lab,
and **/teavm** aliases the new homepage. The title screen needs the native JS5
gateway; the old renderer lab works without a gateway (its live tests are optional).
Only after you explicitly submit the login form, the browser sends a native
RSA/XTEA-encrypted revision-240 login packet to SoloScape over the existing
WSS-to-TCP gateway. The adapter reuses `NativeGameSession` and validates the
same JS5 master CRC manifest as `/legacy`. Password and 2FA inputs are cleared
on submission, and the session can be disconnected; no credentials are
persisted in browser storage or sent to ChatGPT. Login success keeps an
independent WebSocket session open and shows the server's player slot, **but
the original Java OpenOSRS game loop and gameplay are not running**. To play,
disconnect and log in separately via `/legacy`. The compiled Java gamepack is
never bundled into Git.

## Why this is not an OpenOSRS engine port

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
