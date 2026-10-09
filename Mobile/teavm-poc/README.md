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
working SoloScape browser client. The page needs a running JS5 gateway.
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
