# OpenOSRS revision-240: primary SoloScape client reference

**Reference source:** C:\Users\Callum\Documents\GitHub\Client on the development machine, normally ../../Client relative to Mobile. Upstream: https://github.com/OOSRS/OOSRS. The inspected tree identifies as **OpenOSRS 1.2.0**; gamepack.properties identifies **revision 240**, game dependency version **1.12.39** and its digest. This local copy has **no Git metadata**, so SHA-256 source hashes—not an invented commit ID—are recorded in openosrs-reference.json.

## Source-of-truth policy

OpenOSRS is the **primary behavioral reference** for future SoloScape revision-240 client changes: menus, mouse input, camera, context interactions, client state, scene concepts, roof handling, and GPU scene interfaces. Review this local source before TSPS; consult official RuneLite APIs where useful. Use SoloScape's own verified **revision-240** cache and rsprot/server protocol as the authority on packets and decoded assets. OpenOSRS's plugin API alone does not specify every native packet byte.

Previously imported TSPS-derived runtime adapters are **legacy compatibility dependencies, not the primary behavioral reference**. The current login lifecycle, movement, terrain and rendering contain working TSPS-generated code. Replace those dependencies **incrementally**, adding parity tests first. Do not delete tsps-upstream, tsps-runtime or generation scripts in a mass edit.

**Architecture limitation:** OpenOSRS is a Java desktop client. Its original game implementation is supplied as a separately downloaded injected binary, not editable source here. Its GPU plugin uploads data from that game's internal scene. It cannot be imported directly into a browser WebGL client. Adapt compatible algorithms, APIs and observable behavior with revision-240 tests rather than copying Java bytecode or proprietary game assets.

**Licensing:** the repository source is BSD-2-Clause with individual attribution headers, but its injected game dependency and third-party assets have separate terms. Do not bundle them into SoloScape.

## Where to look first

| Area | Primary OpenOSRS files | Present SoloScape status |
| --- | --- | --- |
| Camera and mouse | runelite-client/src/main/java/net/runelite/client/plugins/camera/CameraPlugin.java and CameraConfig.java; plugins/mousesettings/MouseSettingsConfig.java | Input handling implemented; live option parity untested |
| NPC/object/menu interaction | runelite-client/src/main/java/net/runelite/client/menus/MenuManager.java; input/cursor/DestinationResolver.java; runelite-api MenuEntry/MenuAction | Cache-backed context menu and native packet handling implemented, not complete target parity |
| Login/game states | runelite-api/src/main/java/net/runelite/api/GameState.java; runelite-client/src/main/java/net/runelite/client/rs/ClientLoader.java | Native protocol retained; TSPS lifecycle is a legacy adapter |
| 3D scene and GPU | runelite-client/src/main/java/net/runelite/client/plugins/gpu/GpuPlugin.java and SceneUploader.java | Standalone WebGL renderer, NOT the desktop GPU pipeline |
| Actors/movement/animations | runelite-api actor/model interfaces and scene events | TSPS-derived runtime controller remains until replacement passes tests |
| Cache and protocol | OpenOSRS scene/definition APIs, cross-checked with SoloScape rsprot and cache | SoloScape's rev-240 cache and server remain authoritative |

## Verify this specific local source

Run from Mobile:

~~~powershell
npm run verify:openosrs-reference
~~~

Override the local folder with SOLOSCAPE_OPENOSRS_ROOT or pass a custom path to node scripts/verify-openosrs-reference.mjs --root PATH. The offline script validates thirteen source-file SHA-256 values and the declared revision, game dependency version and hash. The pin includes GPU alpha sorting, shader colour conversion and GPU defaults. The source tree is not tracked by Git, so re-audit after any failed fingerprint before updating openosrs-reference.json. The script makes no network requests and does not read credentials or copy game binaries.

Regular npm test does not require the external source checkout, and remains CI-compatible.

## Migration order

1. Use OpenOSRS input/camera/menu implementations to test and refine existing native mouse controls. Preserve verified revision-240 packet payloads.
2. Migrate the current TSPS-derived login lifecycle and map-ready logic to reference-equivalent state contracts, preserving the authenticated native flow.
3. Adapt scene geometry, roofs, textures and lighting piecewise to the OpenOSRS GPU scene APIs, taking care that its internal game engine is not available as source.
4. Replace actor movement/animation shims only after equivalent implementations pass regression and real-login checks; remove unused TSPS generators and submodule last.

**This change selects the primary reference.** It does not claim that the Java client or proprietary injected game engine has been transplanted into the browser. A live OpenOSRS-versus-SoloScape visual/input benchmark is still needed.
