# Whole-client OpenOSRS parity

Requested baseline: the local OpenOSRS revision-240 client recorded in
`openosrs-reference.json`, with browser touch controls retained. The requested
connecting text, friendly offline error and black loading screen remain explicit
SoloScape requirements. They take precedence over reference presentation.

This is an implementation tracker, not a declaration that the browser runs the
OpenOSRS engine. The active homepage uses `teavm-poc/site/title.html`,
`title-client.mjs`, `TitleLoginSession` and `TeaVmWorldBridge`. Improvements must
reach that path rather than only the older `browser/app.mjs`.

## Completed first integration

- Attach the existing server-interface renderer before authenticated game packets
  drain. Server mounts, updates, dialogue permissions and interface input now
  reach the active homepage. Attach synchronized dialogue portraits.
- Connect NPC, object and ground menus to the authenticated gameplay instance.
  Route actions and Examine through existing native protocol encoders.
- Keep menu input outside the interface capture surface. Close menus on region
  loading and dispose menus/interfaces on disconnect. Cover all UI with the
  black loading screen until the first world frame is drawn.
- Clamp camera pitch using `CameraService.MIN_PITCH/MAX_PITCH`: 1024–3064
  JAU14, or approximately 22.5–67.3 degrees. Wrap yaw through one full turn.
- Use `CameraController`'s drag conversion: horizontal mouse movement negates
  yaw; vertical movement increases pitch; 16 JAU14 units per pixel. This is the
  reference controller's estimate, not a measured native-engine calibration.
- Change arrows/WASD from target panning to rotation and tilt around the player.
  Keyboard step timing remains a browser implementation.

## Work remaining before whole-client parity

### Whole-engine compilation attempt

`npm run build:openosrs-engine` now compiles a separate whole-engine entry
point: `EngineBridge.initialize()` constructs the unstripped pinned `client`
and invokes its original `initialize()`. It checks the gamepack SHA-256 from
`openosrs-reference.json`, uses the built local RuneLite API and JDK 17+, and
keeps output separate from the existing rasterizer proof and active homepage.

The October 9, 2026 local attempt compiled the Java bridge but **failed in
TeaVM 0.15.0's bytecode parser** with `IllegalArgumentException` at
`ProgramParser$1.visitLdcInsn` (line 745). Inspection with JDK 17 `javap -v`
confirmed `ConstantDynamic` entries in `client`, including
`ConstantBootstraps.invoke` calls returning string arrays, boolean arrays,
properties and strings. The parser stack does not identify the individual
constant it rejected; dynamic constants are the leading diagnosis, not yet
a proven fix. This failure prevents a browser engine module from being built.

The command returns a failure exit code and writes local diagnostics to
`teavm-poc/target/engine/report.json` and `compiler.log`. All gamepack-derived
output remains ignored. A successful future compilation is labelled
`compiled-unverified`; it cannot mark any parity row complete.

Next engine-port gates, in order:

1. Support the original dynamic-constant bootstrap semantics and prove any
   bytecode adaptation against JVM fixtures, including caching and failures.
   Do not strip the failing methods or replace constants with placeholders.
2. Re-run whole-engine reachability and enumerate actual missing runtime APIs.
   Replace reachable desktop canvas/input, scheduling, audio, sockets,
   resources and reflection with browser contracts.
3. Run the original initialization and game loop, exposing real framebuffers
   and connecting the verified JS5/game transport. Integrate on the active
   homepage while retaining touch and the explicit SoloScape loading/login UI.
4. Supply the matched tick, packet, widget, audio and frame comparisons below,
   plus real-phone performance/input checks, before claiming engine parity.

| Area | Current limit | Required proof |
| --- | --- | --- |
| Camera | Browser key-repeat timing; tile-distance zoom; no inversion/remapping preferences, compass control or native camera packet handling | Native-vs-browser traces for held keys, drag direction, sensitivity, compass, zoom and server-directed camera changes |
| Menus | Limited entity menu composition; no full player/item targeting and widget menu behaviour | Same default action, ordering, permissions and packets for each entity/action combination |
| Interfaces | Renderer supports a subset of cache widgets; scripting invokes only selected dialogue entry points | Inventory, equipment, bank, minimap, chat, tabs, dialogs and drag actions compared with the same reference cache and packets |
| Scripts and state | Bounded partial CS2 interpreter; many scripts and runtime state dependencies absent | Execute required revision-240 scripts and compare widget trees and actions, without silently accepting unsupported behaviour |
| Movement and actors | Legacy TSPS controller; incomplete actor overlays, effects and animation coverage | Matched tick traces for walking, running, turning, teleporting, forced movement, animations and combat overlays |
| World updates | Not all revision-240 game packets have gameplay handlers | Every required packet mutates the same client state; unknown/unsupported packets remain explicitly tracked |
| Rendering | WebGL now renders translucent models, classic animated locations and actor spot effects; projection, priority ordering, skeletal animation and world effects still differ or are missing; original OpenOSRS scene loop is not running | Same-camera/cache frame comparisons for geometry, textures, transparency, roofs, lighting, animated scenery and effects; see rendering status below |
| Audio | Title music exists; complete in-game sound/music behaviour unverified | Matched sound triggers, volume, position and music transitions |
| Mobile input | Touch is a browser adaptation of desktop input | Phone tests for tap, hold, drag, multiple pointers, cancellation, focus changes and orientation changes |

## Rendering implementation status (9 October 2026)

The active `TeaVmWorldBridge` -> `NativeGameplay` -> `NativeTerrainViewport`
path now includes:

- Unsigned cache face transparency, including animation-driven actor alpha,
  with opacity `1 - alpha / 255`, matching OpenOSRS `SceneUploader` and
  `gpu/vert.glsl`. Opaque and cutout surfaces render first; translucent
  triangles sort across materials and owners by camera depth, test against
  opaque depth, blend, and leave depth writes disabled only during that pass.
  Fully transparent faces have no drawn or clickable triangles.
- Coloured and textured translucent scenery/actors, region offsets, physical
  heights, bridge levels, roof filtering, and retained picking geometry. NPC
  picking now consumes the scene geometry supplied by authenticated gameplay.
- Verified animated location models rather than skipping every location with
  a sequence. Classic frames use the declared loop tail, pose immutable merged
  models, update picking with the visible pose, and reuse GPU buffers between
  frame changes. The initial dynamic scene is prepared during map loading.
- Player/NPC spot-effect slots from existing revision-240 sync masks, cache
  group `2:13` definitions, verified models/textures, classic finite or looping
  sequences, delayed starts, height offsets, scaling, rotation and recolouring.
  Explicit slot updates restart/cancel effects; omitted slots continue. Despawn,
  rebuild and disconnect invalidate pending work and release scene geometry.
- OpenOSRS integer-tick texture scrolling and its textured lightness divisor
  of 127. Water remains a classic scrolling texture, without HD material passes.
- Explicit diagnostics for unsupported animated locations, missing spot assets
  and varp/varbit-dependent locations. Failures do not fabricate materials or
  assert reference equivalence.

### Rendering proof still required

| Component | Current evidence | Remaining implementation / proof |
| --- | --- | --- |
| Geometry and projection | All existing tile-shape, region-offset, bridge and compass tests; real WebGL landmark pixels | Native viewport scale/projection, clipping/culling, instanced scenes, occluders and matched camera/cache captures |
| Textures | Verified JS5 definitions/sprites; UV fixtures; integer-tick scrolling; real WebGL cutout and textured-alpha pixels | Native texture filtering, brightness/settings and texture-mapping quantisation compared with matched reference frames |
| Transparency and priority | Real WebGL blend, order reversal, opaque occlusion, roof filtering and resource cleanup checks | Native per-model priority 10/11 interleaving, face bias and intersecting translucent geometry; current global centroid sort and existing depth layers are an approximation |
| Roofs | Existing flag/bridge/line-of-sight tests; dynamic and alpha passes share roof filtering | Native roof preferences and occlusion decisions in same-state indoor/outdoor frames |
| Lighting | Existing floor normals/HSL/halo fixtures; model lighting and cache priorities retained | Native merged scenery normals, actor lighting and GPU colour interpolation/settings matched to captures |
| Animated scenery | Verified location/model loading; classic loop timing, immutable poses, picking and buffer reuse tests | Skeletal sequences, native random initial frames, server animation replacements and varp/varbit-driven transforms |
| Effects | Classic player/NPC spot slots, delay/expiry/restart/loop tests and stale-cache cancellation | World spot effects, projectiles, skeletal effects, remote-player effects and tick-matched combat captures |
| Runtime | Active homepage import routes and Chrome WebGL/login fixtures | Live server tests and phone GPU/performance/orientation tests |

These checks prove the browser implementation's behavior on fixtures. No
same-state OpenOSRS screenshot set has been captured by this change. The
rendering row remains **incomplete** until the missing runtime behavior and
frame comparisons above pass; this is not whole-engine rendering parity.

Validation: `npm test` with Windows Chrome supplied through `CHROME_BIN`
passes all 323 tests, with no skips, including the WebGL pixel and encrypted
login fixtures. `npm run verify:openosrs-reference` verifies the pinned local
revision-240 source fingerprints. No live server or phone comparison was run.

## Validation boundary

The initial integration passes all 307 runnable tests in the mobile suite
(three browser-dependent tests skip without `CHROME_BIN`), plus a separate
Chrome homepage smoke and focused interface/dialogue tests. Unit and fixture
tests prove protocol routing and lifecycle behaviour, not complete OpenOSRS
parity. A live server/phone and same-state OpenOSRS comparison are still needed.

The local reference has readable plugin/API source. Its original scene/game
engine is supplied as compiled desktop bytecode, and the current TeaVM bridge
does not run that complete engine. Reaching full parity requires implementing
or porting those missing runtime behaviours; wiring the existing browser
adapters cannot establish complete engine equivalence.
