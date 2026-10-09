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
| Rendering | Independent WebGL projection, scene and model rendering; original OpenOSRS scene loop is not running | Same-camera/cache frame comparisons for geometry, textures, transparency, roofs, lighting, animated scenery and effects |
| Audio | Title music exists; complete in-game sound/music behaviour unverified | Matched sound triggers, volume, position and music transitions |
| Mobile input | Touch is a browser adaptation of desktop input | Phone tests for tap, hold, drag, multiple pointers, cancellation, focus changes and orientation changes |

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
