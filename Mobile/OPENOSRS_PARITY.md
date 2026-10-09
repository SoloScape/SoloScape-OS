# Whole-client OpenOSRS parity

Requested baseline: the local OpenOSRS revision-240 client recorded in
`openosrs-reference.json`, with browser touch controls retained. The requested
connecting text, friendly offline error and black loading screen remain explicit
SoloScape requirements. They take precedence over reference presentation.

Rendering baseline clarified on 9 October 2026: the built-in RuneLite GPU
renderer is included; HD and other visual plugins are excluded. Exact parity
requires the same cache revision, scene state, camera, brightness and GPU
settings, followed by reference image comparisons. Passing unit/browser tests
alone is not evidence of whole-scene pixel parity.

### Indexed mobile transparency (9 October 2026)

The active touch renderer now sorts alpha triangles and uploads their order
to retained element buffers, replacing whole-material centroid sorting.
The local `gpu/Zone.java` sorts static alpha faces into `alphaElements` and
uses `glDrawElements`; `ModelUploader.java` depth-sorts dynamic alpha models.
SoloScape preserves its existing vertex and picking snapshots, merges only
consecutive draws from the same VBO, and retains EBO capacity across ordering
changes. Source VBO replacement/unload and viewport disposal release EBOs.
Real Chrome WebGL pixels verify reversed faces within one material blend in
the correct order on the touch path, with opaque depth and GL state retained.

This is not the full reference renderer. Alpha still lacks reference zone/model
submission order and integer depth buckets; special priority/no-depth render
modes, GPU colour interpolation, object shadows and joined normals, skeletal
animations, varp/varbit loc morphs and instanced worlds remain parity gaps.

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

### Mobile performance comparison: original OpenOSRS GPU vs browser WebGL (9 October 2026)

Source audited: the locally SHA-256-verified OpenOSRS 1.2.0 / revision-240
`Client/runelite-client/src/main/java/net/runelite/client/plugins/gpu/GpuPlugin.java`
and `SceneUploader.java`, plus `ModelUploader.java`, `Zone.java`, `VAO.java` and
`runelite-api/src/main/java/net/runelite/api/AnimationController.java`
(see `REFERENCE_OPENOSRS.md`).
This **does not** mean the WebGL renderer is running OpenOSRS Java code.

| Concern | OpenOSRS desktop GPU | Active mobile WebGL |
| --- | --- | --- |
| Static world upload | Uploads 8×8-tile zones, reuses initialized VAO/VBOs across scene rebuilds | WebGL 2 uses conservative 64×64-world-tile opaque spatial chunks grouped by material/level, culling offscreen bounding boxes while preserving picking and alpha buffers |
| Dynamic actors | Uploads temporary/sorted model buffers during native engine render callbacks; `ModelUploader` retains reusable scratch arrays | Rebuilds player/NPC meshes and allocates geometry in JavaScript on a separate ~20 Hz touch timer; reference client cadence isn't directly equivalent |
| Scene visibility | Uses scene zones, roof/level filtering, and draw-distance settings | Uses a 25-tile render window and now culls NPC model work conservatively beyond visible bounds (10-tile padding) |
| Transparency | Keeps separate opaque/alpha buffers, sorted alpha models and indexed static alpha | Touch sorts individual faces into retained EBOs and combines consecutive ranges; reference zone/model ordering and depth quantisation remain outstanding |
| Opaque rendering | Retained per-zone VAO/VBOs and native OpenGL draw ranges | WebGL 2 now retains per-buffer/per-shader VAOs, culls opaque chunks and skips duplicate full-scene GPU uploads on mobile; 64×64 chunks trade coarser culling for fewer Safari draw calls |
| Rendering model | Native desktop OpenGL and game engine | iOS Safari WebGL 2 (GLSL ES 3.00 only; no WebGL 1 fallback) plus JavaScript/async model work; timings not directly comparable |

**Measured user's iPhone samples, different views**:
2.7 FPS / 532.3 ms DRAW initially; 24.2 FPS / 10.4 ms DRAW with
mobile transparency batching; 18.1 FPS / 11.5 ms DRAW, 582 GL calls and
55.1 ms RAF interval in a different camera view. These are not controlled
benchmarks. Frame interval minus DRAW is *not* exclusively actor time:
browser compositing, GPU stalls, timer callbacks and asset work also contribute.

Performance HUD ACT is the rolling wall-clock time for asynchronous
`NativeGameplay.drawActors()` (including awaited work), **not** CPU-only
or network latency. Stage timings break ACT into **PLR** (player models/animation/effects),
**NPC** (NPC work and final CPU mesh assembly), **UP** (actor WebGL upload), and
**SCN** (animated scenery computation/upload). Each is a 12-sample rolling average
of elapsed wall time and may include async waits. Stage timings can differ
slightly from ACT because ACT also includes readiness/status bookkeeping.
TICK is server packet arrival interval, and NET is the browser preview
HTTPS RTT, not the game's ping.

Current incremental CPU optimizations: touch actor updates at ~20 Hz;
skip rebuilding distant NPC models, cache stable scene animation sequence
lookups and bounded immutable classic animation poses, avoid re-uploading
dynamic scenery with identical mesh and pick references, and reuse actor
WebGL vertex buffers across same-size updates via `bufferSubData`.
All animation-frame changes still produce distinct poses, and newly visible
actors can trigger buffer growth. The latest optimization also retains an
unchanged animated-location scene across actor updates (rechecking visible
animation frames and conservative tile-cell visibility, rather than invalidating
on every fractional movement), and caches the region-local NPC
mesh for unchanged pose, position, facing and terrain. Off-region actor
mesh translation now copies vertices to avoid mutating these caches; scene
rebuilds and disconnects clear them. Preserve gameplay/server tick cadence.
The pinned animation controller advances stored frame/cycle state; SoloScape
previously allocated frame-length arrays/totals for every location frame lookup.
These are now cached per immutable sequence (with looping-tail durations).
Scene visibility now changes at conservative tile boundaries, not every
fractional player interpolation sample, reducing SCN array rebuilding and
GPU/picking churn while preserving animation-frame invalidation.

**Further structural mismatches**: SoloScape now retains WebGL 2 VAOs per
shader/VBO, releasing them on replacement and disconnect. Opaque terrain and
scenery use 64×64 world-unit zones with accurate per-chunk bounds and shader
clipping, instead of OpenOSRS's more granular 8×8 zones. Moving actors
reuse rotated poses and tile-local lit/triangulated templates, then allocate
new position-adjusted vertex snapshots to preserve picking correctness.
The renderer still lacks true GPU instancing and animation-on-GPU.
Watch for a tradeoff between culling fewer vertices and submitting more draw
calls on Safari; compare per-pass GL counts, GPU/compositor time and ACT/NPC
in the *same camera view*. These are source-driven changes, not a claimed
60-FPS result.

Device screenshots and on-device profiling remain necessary to validate actual FPS gains and
animation smoothness; lower actor cadence can make movement less fluid.

### JavaScript CS2 interpreter expansion (9 October 2026)

The active browser interpreter (`browser/native-scripts.mjs`) now delegates
additional opcode families to `browser/cs2-pure-ops.mjs` and
`browser/cs2-widget-ops.mjs`. This first incremental port covers core
long/array stack operations, fixed-size int arrays, varp/varbit and int/string
varcs, arithmetic/bitwise and string instructions, and cache-widget property
setters/getters including IF_ UID variants and action labels. State mutations
respect the existing server-patch precedence callback. Varcs are kept on the
authenticated interface session and cleared on disconnect.

**This is not every OpenOSRS opcode.** General server-triggered CS2 remains
whitelisted to the verified dialogue entry points (58, 600, 2379); unsupported
client operations, inventory/event/DB/game-state handlers, other script
entry points, and full model/widget rendering remain incomplete. Unsupported
instructions throw explicitly instead of being declared implemented. Some
ported property setters update widget state that the current renderer cannot
yet draw. Opcode numbering was cross-checked against the pinned BSD TSPS
reference; matching rev-240 OpenOSRS gamepack behavior still needs traces.

`tests/cs2-extended.test.mjs` exercises stack ordering, arithmetic overflow,
varbits/varcs, arrays, nested long calls, widget updates and bounds failures.
The broader mobile Node suite is required before any parity claim. Authenticated
bank/shop/inventory paths and physical-phone testing have not been verified.

### Whole-engine compilation progress

`npm run build:openosrs-engine` now compiles a separate whole-engine entry
point: `EngineBridge.initialize()` constructs the unstripped pinned `client`
and invokes its original `initialize()`. It checks the original gamepack SHA-256 from
`openosrs-reference.json`, uses the built local RuneLite API and JDK 17+, and
keeps output separate from the existing rasterizer proof and active homepage.

The October 9, 2026 parser failure is now reproduced and fixed by a local
compiler adaptation. The original archive has 735 classes, 18,967 methods
and 24 methods that TeaVM cannot parse. Its 85 dynamic-constant loads refer
to nine constant-pool entries in two classes. `NormalizeEngine` lowers those
entries into synchronized, lazy cached calls to the original static helpers;
three string-concatenation sites with dynamic bootstrap arguments are lowered
to equivalent builder calls. Existing methods are retained. Unsupported
bootstrap signatures fail explicitly rather than producing placeholders.

Synthetic JVM traces agree between original and adapted bytecode on JDK 17
and 21 for array identity/mutation, string/boolean/properties arrays, null,
long values, successful caching, exception wrapping, linkage-error caching,
non-linkage Error retries and concatenation. Error retry behaviour follows
the observed HotSpot reference. TeaVM parses **all 735 classes and 18,979
methods in the adapted archive with zero failures**; the extra 12 methods
are generated constant getters and concatenation helpers. This proves the
bytecode parsing gate, not engine runtime parity.

The five initial platform dependency groups now have browser adapters.
`AdaptEnginePlatform` rewrites both the normalized gamepack and API jar so
platform types remain consistent across interface descriptors. Original game
methods remain present; the optional `client.tx()` reflection-JAR loader is
replaced by the ahead-of-time browser class-loader contract.

- AWT: component bounds, containment and listeners, Canvas 2D drawing,
  ARGB framebuffer upload/readback, input consumption and font measurement.
  `configureCanvas(elementId)` selects the host canvas before initialization.
- Executors: cooperative FIFO workers, fixed worker pools, futures, queued
  cancellation, timeouts, fixed-rate scheduling, queues, semaphores and
  reentrant locks. These yield through TeaVM threads rather than native threads.
- Classes/resources: linked classes and registered byte resources, fresh
  streams, relative class lookups and resource URL enumeration. Hosts call
  `registerResource(name, hex)` before startup. External reflectcheck JARs
  fail explicitly because browser modules cannot execute downloaded Java code.
- Logging: cached SLF4J loggers write formatted messages and exceptions to
  the browser console without desktop binding/resource discovery.
- Regex: functional replacement uses TeaVM's existing matcher with group
  substitution, escaping and zero-length matches. This targets the engine's
  pure stack-trace callback; visible matcher mutations are rejected, but
  TeaVM exposes no modification counter for complete JDK mutation detection.

`npm run test:engine-platform` compiles a separate adapter proof and executes
the emitted JavaScript. With `CHROME_BIN`, it also checks actual Chrome
canvas pixels/readback and DOM keyboard consumption. JVM transform fixtures
check method retention, receiver/descriptor rewriting and resource bytes.
The proof is separate from the engine and cannot establish gameplay parity.
Desktop window management is not reproduced; clipboard ownership is local
to the module, and font metrics use browser fonts.

The whole-engine build now **succeeds** and emits a syntactically valid
`engine.js`. The remaining dependency groups have these implementations:

- Filesystem: a sandboxed byte filesystem hydrated from IndexedDB before
  constructing the client, with random access, file streams, paths, properties
  output, transactional checkpoints and deletion. It cannot access OS files;
  storage quota and cache memory/performance still need phone testing.
- Networking: byte streams over explicitly configured WebSocket gateway
  routes, including queue limits and read timeouts. HTTP/HTTPS requests use
  Fetch, preserve response status/error bodies, and obey browser TLS/CORS.
  JVM TLS factories cannot install a custom browser trust policy.
- Reflection: a generated manifest limits access to original compiled engine
  types, excluding host bridge/proof methods. Static primitive fields and
  methods with scalar/String parameters retain TeaVM reflection access.
  Java serialization is decoded for strings, boxed primitives and supported
  arrays/references, with length/depth limits. Arbitrary classes and custom
  serialization fail explicitly rather than constructing Java objects.
- Crypto and JSON: SHA-1/SHA-256/SHA-512 use Web Crypto, including the missing
  MessageDigest entry point used by unmodified Guava. Digests need a secure
  context. The real JSON-Java dependency supplies parsing and encoding.
- Images/audio: PNG/JPEG/GIF/BMP decoding uses the browser decoder and returns
  ARGB buffers. Signed 16-bit mono/stereo PCM uses bounded Web Audio scheduling.
  The host must unlock audio from a user gesture; autoplay is not bypassed.
- JVM-only paths: checked byte blocks replace the engine's Unsafe allocation
  and copy operations. Native library/RLICN calls throw UnsatisfiedLinkError;
  canvas listeners supply browser input. Process/GC data are unavailable,
  not fabricated. The memory limit uses browser telemetry when available,
  otherwise a 256 MiB budget. Exit reports status and stops its Java thread.

`npm run test:engine-services` (with `CHROME_BIN`) compiles a separate proof
and verifies IndexedDB persistence, Fetch status/body handling, binary
WebSocket streams, SHA-256 and Guava hashing, reflected fields/methods,
JVM-generated serialization, PNG pixels, secure entropy, JSON precision and
Web Audio PCM. JVM fixtures also compare wire decoding against ObjectOutputStream
and check overlapping memory copies, freed/range errors and properties output.

TeaVM's readable aliases exposed a JVM class named `do` as a JavaScript
keyword. Minified aliases avoid that name; a native canvas helper also avoids
colliding with short parameter aliases. The build now parses the complete
emitted ES module before reporting success, deleting invalid output on failure.
`npm run test:openosrs-engine` imports the actual full module and checks its
cooperative startup callback and explicit missing-storage error.

The command writes local diagnostics to
`teavm-poc/target/engine/report.json` and `compiler.log`, plus normalization and
all-method parser logs. The report separates parser results from concrete
missing runtime classes/methods. All gamepack-derived output remains ignored;
failed compilation or syntax validation removes any partially emitted `engine.js`. Successful compilation is labelled
`compiled-unverified`; it cannot mark any parity row complete.

Next engine-port gates, in order:

1. Keep the passing all-method parser and JVM adaptation proofs as build gates.
   Extend the adapter only with new evidence and matching regression fixtures.
2. Keep the generated-module syntax, host-contract and browser service proofs
   passing. Test adapter limits against real cache sizes and server reflection
   requests; browser service proofs are not complete JVM compatibility.
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
