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
With the existing SoloScape LAN preview, visit
**https://192.168.0.129:3443/teavm**. The preview only serves the generated
module and the static, original-source probe page; `/` remains the existing
working SoloScape browser client. The renderer diagnostic works without a JS5 gateway; only the optional live
master-index validation requires a running gateway.
It never sends account credentials or bundles OpenOSRS gamepack classes.

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
