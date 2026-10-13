# SoloScape Mobile — complete readme

This is the single Markdown document for the local `Mobile/` directory. It
consolidates all 95 previous Markdown files, including dependency documentation,
upstream agent instructions, source/attribution notes and local diagnostic notes.
Document bodies are preserved below, with rebased links and namespaced anchors.
Historical milestones describe the state at the time they were written; they
do not establish current feature parity. The TSPS sections describe that upstream
project, while the active mobile client uses the original revision-240 Java
gamepack compiled by TeaVM.

## Current setup

Run from `Mobile/`:

```powershell
npm run verify:openosrs-reference
run.bat --check
run.bat
```

Start the SoloScape game server separately on `127.0.0.1:43594`. The local page
uses port `3097`, and its WebSocket gateway uses `43595`. Phone access uses the
PC's private LAN address and the same trusted Wi-Fi/LAN. Authentication is manual.

Keep `local-openosrs/`: it contains the verified build inputs and remains ignored
by Git. The separate OpenOSRS checkout is no longer required for mobile builds.
The prior cleanup reduced this local Mobile folder to approximately 136 MiB.
Retain and back up the ignored diagnostic archives and build inputs separately.

The upstream submodule remains at its pinned revision. Its Markdown files are
excluded from this local worktree using Git sparse-checkout; their content is
included here. Package reinstalls or fresh full checkouts can restore third-party
Markdown. The preserved originals for this consolidation are in the ignored
`teavm-poc/target/engine/retained-diagnostics/markdown-before-consolidation.zip`.

## Document index

- [README.md](#doc-readme)
- [local-openosrs/README.md](#doc-local-openosrs-readme)
- [ORIGINAL_LOGIN_TIMEOUT.md](#doc-original-login-timeout)
- [ORIGINAL_MOBILE_UI.md](#doc-original-mobile-ui)
- [ORIGINAL_MOBILE_LAN.md](#doc-original-mobile-lan)
- [ORIGINAL_ENGINE_LAN.md](#doc-original-engine-lan)
- [dev-bridge/README.md](#doc-dev-bridge-readme)
- [PHASE2_GAMEPLAY_VERIFICATION.md](#doc-phase2-gameplay-verification)
- [SCENERY_AUDIT.md](#doc-scenery-audit)
- [ORIGINAL_NPC_HIGHLIGHT.md](#doc-original-npc-highlight)
- [PUBLIC_HOSTING.md](#doc-public-hosting)
- [DEV_ARTIFACT_CLEANUP.md](#doc-dev-artifact-cleanup)
- [LAN.md](#doc-lan)
- [OPENOSRS_PARITY.md](#doc-openosrs-parity)
- [ORIGINAL_ENGINE_STARTUP.md](#doc-original-engine-startup)
- [PROTOCOL.md](#doc-protocol)
- [REFERENCE_OPENOSRS.md](#doc-reference-openosrs)
- [RENDER_CAPTURES.md](#doc-render-captures)
- [teavm-poc/README.md](#doc-teavm-poc-readme)
- [node_modules/ws/README.md](#doc-node-modules-ws-readme)
- [teavm-poc/target/engine/caddy-validation/README.md](#doc-teavm-poc-target-engine-caddy-validation-readme)
- [tsps-upstream/AGENTS.md](#doc-tsps-upstream-agents)
- [tsps-upstream/CLAUDE.md](#doc-tsps-upstream-claude)
- [tsps-upstream/client/game/plugins/hd/README.md](#doc-tsps-upstream-client-game-plugins-hd-readme)
- [tsps-upstream/client/public/images/water/README.md](#doc-tsps-upstream-client-public-images-water-readme)
- [tsps-upstream/docs/achievement-diaries.md](#doc-tsps-upstream-docs-achievement-diaries)
- [tsps-upstream/docs/agility-courses.md](#doc-tsps-upstream-docs-agility-courses)
- [tsps-upstream/docs/agility-shortcuts.md](#doc-tsps-upstream-docs-agility-shortcuts)
- [tsps-upstream/docs/ARCHITECTURE.md](#doc-tsps-upstream-docs-architecture)
- [tsps-upstream/docs/blast-furnace.md](#doc-tsps-upstream-docs-blast-furnace)
- [tsps-upstream/docs/boss-hud.md](#doc-tsps-upstream-docs-boss-hud)
- [tsps-upstream/docs/cache-revision-update.md](#doc-tsps-upstream-docs-cache-revision-update)
- [tsps-upstream/docs/climbing.md](#doc-tsps-upstream-docs-climbing)
- [tsps-upstream/docs/collection-log.md](#doc-tsps-upstream-docs-collection-log)
- [tsps-upstream/docs/construction-features.md](#doc-tsps-upstream-docs-construction-features)
- [tsps-upstream/docs/corporeal-beast.md](#doc-tsps-upstream-docs-corporeal-beast)
- [tsps-upstream/docs/disguised-crabs.md](#doc-tsps-upstream-docs-disguised-crabs)
- [tsps-upstream/docs/doom-of-mokhaiotl.md](#doc-tsps-upstream-docs-doom-of-mokhaiotl)
- [tsps-upstream/docs/dwarf-cannon.md](#doc-tsps-upstream-docs-dwarf-cannon)
- [tsps-upstream/docs/edgeville-dungeon.md](#doc-tsps-upstream-docs-edgeville-dungeon)
- [tsps-upstream/docs/extrascripts.md](#doc-tsps-upstream-docs-extrascripts)
- [tsps-upstream/docs/fairy-rings.md](#doc-tsps-upstream-docs-fairy-rings)
- [tsps-upstream/docs/faq.md](#doc-tsps-upstream-docs-faq)
- [tsps-upstream/docs/ferox-enclave.md](#doc-tsps-upstream-docs-ferox-enclave)
- [tsps-upstream/docs/fortis-colosseum.md](#doc-tsps-upstream-docs-fortis-colosseum)
- [tsps-upstream/docs/gamemodes.md](#doc-tsps-upstream-docs-gamemodes)
- [tsps-upstream/docs/gauntlet.md](#doc-tsps-upstream-docs-gauntlet)
- [tsps-upstream/docs/gemstone-crab.md](#doc-tsps-upstream-docs-gemstone-crab)
- [tsps-upstream/docs/gnome-gliders.md](#doc-tsps-upstream-docs-gnome-gliders)
- [tsps-upstream/docs/index.md](#doc-tsps-upstream-docs-index)
- [tsps-upstream/docs/minigame-teleports.md](#doc-tsps-upstream-docs-minigame-teleports)
- [tsps-upstream/docs/motherlode-mine.md](#doc-tsps-upstream-docs-motherlode-mine)
- [tsps-upstream/docs/picking.md](#doc-tsps-upstream-docs-picking)
- [tsps-upstream/docs/player-saves.md](#doc-tsps-upstream-docs-player-saves)
- [tsps-upstream/docs/revenant-caves.md](#doc-tsps-upstream-docs-revenant-caves)
- [tsps-upstream/docs/revenants.md](#doc-tsps-upstream-docs-revenants)
- [tsps-upstream/docs/run-auto-enable.md](#doc-tsps-upstream-docs-run-auto-enable)
- [tsps-upstream/docs/runelite-api-coverage.md](#doc-tsps-upstream-docs-runelite-api-coverage)
- [tsps-upstream/docs/RuneLite_API_shape_implementation.md](#doc-tsps-upstream-docs-runelite-api-shape-implementation)
- [tsps-upstream/docs/sailing-osrs-reference.md](#doc-tsps-upstream-docs-sailing-osrs-reference)
- [tsps-upstream/docs/sailing.md](#doc-tsps-upstream-docs-sailing)
- [tsps-upstream/docs/sawmill.md](#doc-tsps-upstream-docs-sawmill)
- [tsps-upstream/docs/screen-brightness.md](#doc-tsps-upstream-docs-screen-brightness)
- [tsps-upstream/docs/setup.md](#doc-tsps-upstream-docs-setup)
- [tsps-upstream/docs/skill-guide.md](#doc-tsps-upstream-docs-skill-guide)
- [tsps-upstream/docs/slayer-tower.md](#doc-tsps-upstream-docs-slayer-tower)
- [tsps-upstream/docs/stronghold-of-security.md](#doc-tsps-upstream-docs-stronghold-of-security)
- [tsps-upstream/docs/teleport-tablets.md](#doc-tsps-upstream-docs-teleport-tablets)
- [tsps-upstream/docs/thieving.md](#doc-tsps-upstream-docs-thieving)
- [tsps-upstream/docs/tombs-of-amascut.md](#doc-tsps-upstream-docs-tombs-of-amascut)
- [tsps-upstream/docs/warriors-guild.md](#doc-tsps-upstream-docs-warriors-guild)
- [tsps-upstream/docs/webgpu-renderer.md](#doc-tsps-upstream-docs-webgpu-renderer)
- [tsps-upstream/docs/webrtc-poc.md](#doc-tsps-upstream-docs-webrtc-poc)
- [tsps-upstream/docs/wintertodt.md](#doc-tsps-upstream-docs-wintertodt)
- [tsps-upstream/docs/woodcutting-guild.md](#doc-tsps-upstream-docs-woodcutting-guild)
- [tsps-upstream/docs/worktrees.md](#doc-tsps-upstream-docs-worktrees)
- [tsps-upstream/docs/world-map.md](#doc-tsps-upstream-docs-world-map)
- [tsps-upstream/docs/wyrmscraig.md](#doc-tsps-upstream-docs-wyrmscraig)
- [tsps-upstream/docs/zulrah.md](#doc-tsps-upstream-docs-zulrah)
- [tsps-upstream/README.md](#doc-tsps-upstream-readme)
- [tsps-upstream/server/AGENTS.md](#doc-tsps-upstream-server-agents)
- [tsps-upstream/server/data/models/dragonic-katana/README.md](#doc-tsps-upstream-server-data-models-dragonic-katana-readme)
- [tsps-upstream/server/docs/agents/areas.md](#doc-tsps-upstream-server-docs-agents-areas)
- [tsps-upstream/server/docs/agents/cache.md](#doc-tsps-upstream-server-docs-agents-cache)
- [tsps-upstream/server/docs/agents/interfaces.md](#doc-tsps-upstream-server-docs-agents-interfaces)
- [tsps-upstream/server/docs/agents/perf.md](#doc-tsps-upstream-server-docs-agents-perf)
- [tsps-upstream/server/docs/agents/plugins.md](#doc-tsps-upstream-server-docs-agents-plugins)
- [tsps-upstream/server/docs/agents/sources.md](#doc-tsps-upstream-server-docs-agents-sources)
- [tsps-upstream/server/docs/agents/testing.md](#doc-tsps-upstream-server-docs-agents-testing)
- [tsps-upstream/server/plugins/npcs/random-events/SOURCES.md](#doc-tsps-upstream-server-plugins-npcs-random-events-sources)
- [tsps-upstream/server/plugins/skills/agility/README.md](#doc-tsps-upstream-server-plugins-skills-agility-readme)
- [tsps-upstream/server/plugins/skills/Farming.md](#doc-tsps-upstream-server-plugins-skills-farming)
- [tsps-upstream/server/plugins/skills/hunter/README.md](#doc-tsps-upstream-server-plugins-skills-hunter-readme)
- [tsps-upstream/server/plugins/world/README.md](#doc-tsps-upstream-server-plugins-world-readme)
- [tsps-upstream/server/README.md](#doc-tsps-upstream-server-readme)

<a id="doc-readme"></a>
## README.md

<!-- source-document: README.md -->
<a id="doc-readme--soloscape-mobile-native-revision-240-webgl-client"></a>
### SoloScape Mobile (native revision-240 WebGL client)

Optional public HTTPS hosting for the original Java mobile client is documented
in [PUBLIC_HOSTING.md](#doc-public-hosting). Run `npm run start:public` with an
explicit public origin behind an HTTPS proxy; external hosting is off by default.

> **Primary reference: OpenOSRS revision 240.** The pinned original gamepack and reference snapshot in `local-openosrs/` supply the mobile build inputs without requiring a separate OpenOSRS checkout. See [local-openosrs/README.md](#doc-local-openosrs-readme) for provisioning and backup, and [REFERENCE_OPENOSRS.md](#doc-reference-openosrs) for the source fingerprint, scope and migration plan. Current TSPS-derived modules remain active **until individually replaced and tested**. The standalone browser client is experimental and does not yet have complete RuneLite visual or interaction parity. The existing SoloScape `Client/` RSProx launcher and Kotlin server remain unchanged.

This directory integrates the pinned upstream browser client as a Git submodule at `tsps-upstream/`, based on [RSPSApp/tsps](https://github.com/RSPSApp/tsps), which provides a React/TypeScript/WebGL OSRS-style game client. Track the work in [issue #32](https://github.com/SoloScape/SoloScape-OS/issues/32).

Whole-client OpenOSRS parity is tracked in [OPENOSRS_PARITY.md](#doc-openosrs-parity).
The original Java game engine has an **isolated, localhost-only startup harness**
([ORIGINAL_ENGINE_STARTUP.md](#doc-original-engine-startup)). Its pinned rev-240
TeaVM module accepts `ClientConfiguration` and now **advances genuine original
client game cycles** in Chrome (3 to 118 in a 10-second stability check), with
an active engine thread, changed original framebuffer pixels, and no fatal
callback errors. Its original login/title framebuffer has also been visually
verified in Chrome from the pinned gamepack and local cache (original logo,
autumn-hall background, welcome panel and buttons); a separate desktop
pixel-by-pixel comparison is not claimed. This is *not* authenticated gameplay,
mobile deployment, or RuneLite GPU parity. The diagnostic does not replace the active client or
expose gamepack-derived output via `npm run dev`.
The 9 October mobile scene integration adds skeletal poses, authenticated
object morphs, joined static lighting and classic terrain shadows, rotated
instanced chunks, and additional built-in GPU shader settings to the active
homepage. [Renderer captures](#doc-render-captures) documents PNG/state export and
strict frame comparison. No matched RuneLite captures or physical-phone
verification establish exact parity yet; native projection, priority ordering
and other engine differences remain. This current status supersedes older
dated renderer limitations below for the implemented subsystems.
The active TeaVM homepage now connects the existing NPC/object/ground menus,
server interfaces and dialogue portraits to its authenticated session. Full
engine, widget-script and visual parity remain incomplete.

<a id="doc-readme--the-actual-native-webgl-client-current-active-development"></a>
#### The actual native WebGL client (current active development)

**WebGL 2 is required.** The active browser scene requests only `webgl2`,
uses GLSL ES 3.00 vertex/fragment shaders, and intentionally provides no
WebGL 1 or `experimental-webgl` fallback. A browser without WebGL 2 reports
a renderer startup error; no degraded WebGL 1 mode is attempted.

The mobile renderer now uses retained VAOs for each GPU buffer/shader layout,
cleans them up on buffer replacement, and partitions opaque terrain/scenery
into 64×64-world-unit chunks (grouped by texture and level) so offscreen
chunks can be skipped without changing alpha ordering or picking meshes.
64-unit chunks deliberately use fewer draw calls than RuneLite's 8×8-tile
zones; on-device frame/GL profiling must verify the tradeoff. NPC/player
mesh preparation reuses immutable posed-model rotations and lit tile-local
geometry, recalculating interpolated position and ground-height offsets
without mutating earlier GPU/picking snapshots.

Animated scenery now retains a GPU buffer and VAOs per placement/material
across pose changes, visibility reordering and scene-origin shifts. Only
changed geometry uploads with `bufferSubData`; growth reallocates storage in
the same buffer, and disappearing materials/placements release their resources.
Opaque and alpha batches keep separate identities and existing alpha sorting.
Unchanged picking geometry also retains its cached bounds. This is an incremental
mobile renderer improvement; dynamic loc morphs and skeletal sequences now use
the shared verified animation path, and on-device profiling is still needed.

The rendering target is the pinned revision-240 RuneLite/OpenOSRS **built-in
GPU renderer**, excluding HD and other visual plugins. Mobile transparency
now sorts individual faces and streams retained WebGL 2 element buffers,
following the reference `Zone` renderer's indexed-alpha approach. Consecutive
faces from the same vertex buffer share a draw, while interleaved materials
retain their order. Camera-direction, geometry and roof changes invalidate
ordering; unchanged ordering skips index uploads. This replaces touch material
centroid sorting. It does not yet reproduce RuneLite's complete zone/model
ordering, integer depth buckets or special no-depth priority render modes.

Untextured world geometry now uses the reference GPU's float HSL-to-RGB
conversion and perspective RGB interpolation (its default colour-banding
removal setting), with brightness 0.8. Textured faces keep non-perspective
lightness interpolation and discard non-opaque cutout texels. Reference GPU
sorting, shaders and default-setting sources are SHA-256-pinned alongside the
existing revision-240 reference. Whole-scene parity remains incomplete.

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

Login retains the cache title artwork and masked fields while showing
"Connecting to server..." The login buttons are hidden while connecting.
After authentication, the world shows a small top-left "Loading - Please wait."
label over a solid black screen until the first map frame is drawn. There is
no custom spinner; disconnect returns to the title.
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
`world-webgl.mjs` and the active `teavm-world.mjs` bridge. Terrain region names are
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

Touch drag or middle-mouse drag rotates the camera; wheel zooms; WASD/arrows
rotate and tilt around the player. Tilt follows the local OpenOSRS standard
22.5–67.3 degree limits. Mouse drag direction and sensitivity use the local
OpenOSRS camera controller's 16 angle units per pixel estimate. Keyboard
rotation currently follows browser key repeats rather than native tick acceleration.
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

<a id="doc-readme--cache-backed-native-interface-renderer-developer-preview"></a>
##### Cache-backed native interface renderer (developer preview)

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

<a id="doc-readme--native-npc-v6-synchronization-and-rendering"></a>
##### Native NPC V6 synchronization and rendering

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
not the main development entry point. The public cache diagnostics route
is no longer served; cache checks remain in automated tests.

<a id="doc-readme--terrain-stream-completeness-align-with-upstream-scenebuilder"></a>
##### Terrain stream completeness: align with upstream SceneBuilder

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

<a id="doc-readme--cache-derived-floor-colours-work-in-progress"></a>
##### Cache-derived floor colours (work in progress)

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

<a id="doc-readme--world-startup-must-not-block-on-optional-floor-materials"></a>
##### World startup must not block on optional floor materials

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

<a id="doc-readme--native-revision-240-account-login"></a>
#### Native revision-240 account login

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

<a id="doc-readme--source-baseline"></a>
#### Source baseline

- Upstream project: `RSPSApp/tsps`, pinned as the `Mobile/tsps-upstream/` Git submodule (initialise it when cloning).
- Reviewed upstream commit: [`b9ca431be440174fce5adf0efbb7afa992358916`](https://github.com/RSPSApp/tsps/commit/b9ca431be440174fce5adf0efbb7afa992358916)
- Relevant upstream paths:
  - [`client/`](https://github.com/RSPSApp/tsps/tree/main/client): TypeScript WebGL game client, UI, network layer and cache loading
  - [`client/game/GamePage.tsx`](https://github.com/RSPSApp/tsps/blob/main/client/game/GamePage.tsx): browser game entry point
  - [`client/network/serverConnection/`](https://github.com/RSPSApp/tsps/tree/main/client/network/serverConnection): client/server integration to audit
  - [`client/index.css`](https://github.com/RSPSApp/tsps/blob/main/client/index.css): dynamic viewport and iOS Safari landscape support
  - [`client/public/index.html`](https://github.com/RSPSApp/tsps/blob/main/client/public/index.html): PWA and mobile viewport metadata

TSPS's repository license is **BSD 2-Clause**; retain its copyright notices, license conditions and disclaimer when porting code, and audit third-party dependencies/assets separately. Do not copy cache dumps, API secrets or copyrighted game assets without appropriate rights.

<a id="doc-readme--compatibility-boundary"></a>
#### Compatibility boundary

SoloScape's existing `Client/` is **RSProx**, a desktop OSRS traffic proxy/launcher, **not** a browser client. SoloScape's `Server/` is a Kotlin OpenRune/RSMod-derived server and documents OSRS revision **240.2**. TSPS currently targets its own TypeScript server and ships an example localhost world at port `43594`. The pinned TSPS cache target is **OSRS revision 241** (`server/target.txt`) versus SoloScape's documented **240.2**. The new launcher prints a warning if they differ. Do **not** assume TSPS packets, client revision, encryption, caches or session flow match SoloScape's server.

A browser cannot open the game's raw TCP socket directly. The native stream gateway under `Mobile/gateway/` now provides a guarded WebSocket-to-raw-TCP transport **for clients that already speak native OSRS**. TSPS does **not**: its own opcode 200 HELLO/204 LOGIN framing is incompatible with rsprot. The gateway rejects those TSPS frames before opening the upstream socket. A separate protocol adapter and cache/revision mapping remain necessary. Production connections must use secure transport and configurable addresses. Never ship development localhost addresses or embedded credentials as production defaults.

<a id="doc-readme--proposed-milestones"></a>
#### Proposed milestones

1. **Audit:** Record the upstream client architecture, dependencies, supported mobile browsers, licensing and precise protocol/cache mismatches.
2. **Create a runnable client:** Bring the required upstream `client/` files into an isolated `Mobile/` workspace, with tracked provenance, a consistent Node 22+ / Yarn setup and build/typecheck instructions. Keep RSProx/Kotlin projects intact.
3. **Make connections compatible:** Implement the minimum supported SoloScape handshake, authentication, transport and game packet mapping, with a browser-safe gateway if required.
4. **Touch-first controls:** Validate movement/tap, camera gestures, menus/long press, chat/keyboard, usable UI scaling, screen orientation and safe-area handling on Android Chrome and iOS Safari.
5. **Test and document:** Confirm real login, rendering, movement, chat and disconnect/reconnect against a local SoloScape test server. Add repeatable CI builds and a mobile smoke-test checklist.

<a id="doc-readme--first-experimental-run"></a>
#### First experimental run

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

<a id="doc-readme--supported-environment-variables"></a>
##### Supported environment variables

| Variable | Meaning |
| --- | --- |
| `SOLOSCAPE_GAME_URL` | **Required:** explicit `ws://` or `wss://` browser game endpoint (no path, credentials or query) |
| `SOLOSCAPE_CACHE_BASE_URL` | Optional in development; explicit `http(s)://` cache URL. Required over HTTPS for production builds |
| `SOLOSCAPE_SERVER_NAME` | Name shown on the upstream server selector |
| `SOLOSCAPE_WEB_PORT` | Dev HTTP port, default `3001` |
| `SOLOSCAPE_WEB_HOST` | Dev listen address, default `0.0.0.0` |

The launcher maps these to the upstream client’s `REACT_APP_*` variables. **Anything with `REACT_APP_` is public in browser code—never put API tokens or credentials there.** TSPS still uses its own cache by default in development, which is **not** guaranteed compatible with SoloScape.

A production bundle can be attempted from `Mobile/` with `npm run build` after supplying `SOLOSCAPE_GAME_URL=wss://...` and `SOLOSCAPE_CACHE_BASE_URL=https://.../caches/`. This only builds the upstream client; it does **not** add the missing server protocol integration. Upstream packages require their own setup first.

<a id="doc-readme--native-browser-cache-client--first-reusable-asset-loader-component"></a>
#### Native browser cache client — first reusable asset-loader component

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

<a id="doc-readme--bridging-verified-js5-containers-into-tspss-cachestore-interface"></a>
##### Bridging verified JS5 containers into TSPS's CacheStore interface

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

<a id="doc-readme--first-real-graphical-asset-revision-240-indexed-sprite-on-canvas"></a>
##### First real graphical asset: revision-240 indexed sprite on Canvas

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

<a id="doc-readme--native-websocket-to-tcp-gateway-transport-foundation"></a>
#### Native WebSocket-to-TCP gateway (transport foundation)

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

<a id="doc-readme--credential-free-cache-protocol-check"></a>
##### Credential-free cache protocol check

Before implementing native login, you can probe a **running local** SoloScape TCP server's JS5 response without sending account credentials:

```powershell
# From the Mobile directory on Windows PowerShell
$env:SOLOSCAPE_GAME_TCP_PORT = '43594'
$env:SOLOSCAPE_NATIVE_REVISION = '240'
npm run probe
```

After pulling the latest `feature/mobile` branch (for example, `git pull origin feature/mobile`), rerun `npm run probe` using these environment settings. If the response is still a timeout, inspect the game server logs and verify the deployed rsprot version; a successful TCP port check alone only confirms a listener.

Use the actual `gamePort` and native cache **major revision** from your running SoloScape configuration. The example `240` follows the documented `240.2` version; do not assume it matches a deployed server. The rsprot revision-240 JS5 handshake is **21 bytes total**: native opcode `15`, a four-byte big-endian revision, and four four-byte seed integers (16 cryptographically random bytes). The old five-byte probe was incomplete and resulted in a timeout even with a running server. A response code `0` means the initial JS5 handshake was accepted, **not** that assets can be loaded or a player can log in. The Node integration tests use a mock TCP endpoint that explicitly waits for the entire 21-byte request. **Live result on 8 Oct 2026:** the user verified response code `0` against their local Java server at `127.0.0.1:43594` with `revision: 240`.

<a id="doc-readme--credential-free-native-game-connection-check"></a>
##### Credential-free native game connection check

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

See [protocol compatibility notes](#doc-protocol) for the packet differences and further work.

<a id="doc-readme--credential-free-websocket-gateway-pre-login-test"></a>
##### Credential-free WebSocket gateway pre-login test

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

<a id="doc-readme--in-memory-revision-240-cache-master-index-fetch"></a>
##### In-memory revision-240 cache master-index fetch

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

<a id="doc-readme--confirmed-live-cache-milestone"></a>
##### Confirmed live cache milestone

On 8 October 2026, the local SoloScape server with revision `240` served the
`255:255` JS5 master index over the WebSocket gateway. The probe reported
**205 container bytes**, compression `0`, **200 decoded bytes** and SHA-256
`d45568eb3b832e4794eb58dcca479b815ce93b63422ad2bafc976355c2c52f6b`.
No cache files were saved. Interpreting the 200-byte data as legacy
CRC/version pairs implies **25 archive index entries**; this is now supported
by an eight-byte parser with tests, but individual reference-table checksums
have **not** been cross-checked against those entries. Re-run
`npm run probe:cache` to display the inferred entry count.

<a id="doc-readme--archive-reference-table-crc32-integrity-check"></a>
##### Archive reference-table CRC32 integrity check

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

<a id="doc-readme--first-actual-archive-group-native-js5-integrity-probe"></a>
##### First actual archive group: native JS5 integrity probe

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

<a id="doc-readme--known-incompatibilities--next-engineering-work"></a>
#### Known incompatibilities / next engineering work

- TSPS upstream revision **241** versus SoloScape's documented **240.2**: align supported protocol, game packets, cache ids and interface definitions.
- The native WebSocket-to-TCP gateway is implemented, but **TSPS cannot use it yet** because its proprietary application packets require a real native OSRS encoder/decoder + authentication and cache adapter.
- TSPS's cache and build scripts depend on portions of the TSPS server project. Those scripts run **in the upstream submodule**, while SoloScape's Kotlin server stays unchanged.
- TSPS's existing touch gestures, PWA, iOS landscape handling and WebGL renderer are available in the pinned source; Android/iOS real-device smoke tests and SoloScape branding still remain.

CI checks the launcher configuration and syntax; it does not yet prove the TSPS client can render or connect to SoloScape.

<a id="doc-readme--scope"></a>
#### Scope

The mobile client should be additive. Avoid replacing `Client/`, changing SoloScape's existing desktop-client launch flows, or porting the whole TSPS TypeScript game server unless a specific compatibility requirement is established.

<a id="doc-readme--cache-defined-floor-topology-8-october-2026"></a>
##### Cache-defined floor topology (8 October 2026)

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

<a id="doc-readme--packed-hsl-blending-and-vertex-lighting-8-october-2026"></a>
##### Packed HSL blending and vertex lighting (8 October 2026)

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

<a id="doc-readme--cache-backed-static-scenery-8-october-2026"></a>
##### Cache-backed static scenery (8 October 2026)

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

<a id="doc-readme--textures-upper-planes-and-bridges-8-october-2026"></a>
##### Textures, upper planes and bridges (8 October 2026)

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

<a id="doc-readme--native-player-movement-pinned-tsps-controllers"></a>
##### Native player movement: pinned TSPS controllers

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

<a id="doc-readme--authenticated-login-to-world-loading-revised"></a>
##### Authenticated login-to-world loading (revised)

The native revision-240 login keeps the classic title until authentication. The
world loading overlay stays visible until verified terrain, floor materials,
textures, initial scenery and the local player model have loaded. The
world is now acknowledged with `MAP_BUILD_COMPLETE` once its terrain grid
is available; the first actor pass and WebGL frame precede the fog fade.
Floor materials, required floor textures and initial scenery are prerequisites
for ending the loading overlay, not assets that begin loading after the
transition. The loader keeps the title hidden after authentication and holds
the world overlay while building the scene. Stale loads cannot paint a closed session.

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

<a id="doc-readme--pinned-tspsrunelite-style-login-state-lifecycle"></a>
##### Pinned TSPS/RuneLite-style login state lifecycle

The title UI uses CONNECTING only while the native revision-240 login is
pending. Successful server authentication enters `LOADING_GAME` (25)
immediately: the login form disappears and a small `Loading - please wait.`
label overlays the WebGL world. `LOGGED_IN` (30) starts only after the
auth handshake requirement and the map-ready requirement both complete.
It uses the *pinned TSPS* `GameStateMachine`, `GameState` and
`LoadingTracker`, which are regenerated unchanged from TypeScript with
`npm run generate:tsps-loading`.

Map readiness is signalled after the local player model is uploaded and the first
nonempty **filled** terrain frame is drawn. The TSPS-style fade interval lasts
1000 ms, while `LOADING_GAME` is displayed for at least 500 ms total (not an
additional 500 ms after the fade). Browser CSS provides
the fade and is not Jagex's original 3D fog shader. Later server rebuilds
reenter `LOADING_GAME`; disconnects cancel pending callbacks and return
to the login screen. Existing authenticated movement, server map-complete
packet handling and 20 ms player movement are preserved.

RuneLite supplies game-state hooks around the real Jagex gamepack, rather
than its own independent renderer. Full binary/pixel parity therefore also
requires persistent cache streaming, exact object transformation/animation,
rendering, lighting, and official fog/shader behavior. This revision improves
the readiness checks and pinned TSPS timing, **not** the proprietary
official client's complete internals. Browser/device play-testing remains
required; automated tests do not measure a real account's login speed.

<a id="doc-readme--scene-readiness-and-first-character-regression-guard"></a>
##### Scene readiness and first-character regression guard

Native loading now acknowledges verified terrain separately from the **visible**
world-ready state. It keeps the loading overlay until all four-plane floor
definitions, required floor textures and initial map-square location meshes
are processed, the local player appearance has arrived, the player model has
successfully uploaded to WebGL, and a non-wireframe terrain frame has been
drawn. A missing floor texture or spawn scene reports an error instead of
silently accepting holes. Other map-square object decode problems are counted
as diagnostics; the client cannot yet draw every animated/varbit-transformed
object. The native renderer remains the current SoloScape WebGL implementation.

Wearable composition requests up to three independent equipment slots at
once while retaining the original slot/mesh order, and checks all required
player textures. Unsupported sequence poses fall back to the verified unposed
body mesh, which keeps a valid player model visible but is **not** equivalent
to OSRS skeletal animation. Connection errors now show the specific failing
asset instead of only a generic disconnection.

For truly identical RuneLite/OSRS visuals, the remaining work is a renderer
migration to the pinned TSPS scene construction/animation/light/fog pipeline,
including dynamic loc morphs and instanced regions. The pinned TSPS WebGL
renderer is not drop-in compatible with this standalone revision-240 mobile
viewport. This readiness fix does not claim that renderer migration is done.

<a id="doc-readme--pinned-tsps-scene-renderer-migration-stage-1-cache-floor-topology"></a>
##### Pinned TSPS scene-renderer migration (stage 1: cache floor topology)

The native revision-240 WebGL client now imports the original pinned TSPS
`SceneTileModel` and `ColorUtil` as generated ES modules. **Cache-backed
untextured underlay and overlay tiles and textured overlay tiles** use that
upstream class for OSRS shape vertices, rotations, face winding, visible/hidden
faces, integer-lit HSL and texture coordinates, instead of duplicating the
floor topology calculation in `world-webgl.mjs`. The GPU palette also uses
the original TSPS HSL table (with the final 0xffff entry retained from the
native 65536-element palette, since the pinned table has only 65535 entries).
The local `buildTileGeometry` remains for pre-cache preview/wireframe and
textured underlay fallback.

Regenerate the pinned, **unmodified** source modules from the checked-out
TSPS submodule with:

```powershell
cd Mobile
npm run generate:tsps-scene
node --test tests/pinned-scene.test.mjs
npm test
```

The parity tests exercise all 13 shapes/four rotations and directly compare
the assembled ground and textured overlay vertices to pinned TSPS face
outputs. The native renderer retains the same WebGL buffers, camera, texture
upload, clicking and NPC/player integration. This is the first **actual
upstream scene-component integration**, not a wholesale replacement of
`WebGLOsrsRenderer`. That renderer depends on TSPS's workers, GL libraries,
material loaders, scene buffers, dynamic-var managers and render passes.
Animated and transformed objects, instanced scenes, water and exact fog/roof
shaders are still outside this migration. Do not claim pixel-identical
RuneLite/OSRS graphics until those subsystems are integrated and compared
against reference frames.

<a id="doc-readme--pinned-tsps-renderer-migration--stage-2-roofs-fog-and-animated-textures"></a>
##### Pinned TSPS renderer migration — stage 2 (roofs, fog and animated textures)

The native WebGL renderer now uses generated, pinned TSPS `RoofVisibility`,
`TileRenderFlags` and `PlaneUtil` code for bridge-aware camera/player line-of-sight
roof decisions, applied to the terrain, scenery, textured batches and ground
picking. Region render flags are taken from the verified four-plane terrain
arrays and translated through `native-roof-adapter.mjs`. The previous renderer
unconditionally capped visible geometry at the player's plane; it now allows
upper floors/roofs outdoors and hides them when the reference roof rules
require it. The native orbit-camera pitch is *mapped* to RS pitch units rather
than using a full RuneLite camera, so some camera-angle behavior may differ.

The native WebGL 2 (GLSL ES 3.00) fragment shaders now fade scene colours and textures into
the restored black sky using the pinned square/zero-rounded-corner OSRS
fog-distance equation and smoothstep. The fog range comes from the generated
TSPS `RenderDistancePolicy` and default HD auto-fog factor (0.85), with a
25-tile render distance. The native fog is interpolated per pixel rather than
the complete reference's per-vertex shader/scene/environment material stack.
The loading overlay still performs its separate one-second reveal.

Cache texture definitions now feed the *pinned* SpriteTextureLoader animation
direction table and the classic TSPS 20 ms / 1/128 UV animation formula to
the WebGL texture passes. Animated floor, scenery and actor textures now
scroll without regenerating geometry. The pinned `WaterTextureIds` classifies
water, swamp, ice and dark-water textures, preserving per-batch classification.
This **does not** implement TSPS water material normals, foam, flowmap and
caustics; those require the water textures/resources and GPU material passes.

Regenerate directly from the pinned submodule and run the parity tests:

```powershell
cd Mobile
npm run generate:tsps-roofs
npm run generate:tsps-water
node --test tests/pinned-roof-fog.test.mjs tests/pinned-water-animation.test.mjs
npm test
```

The remaining renderer migrations include dynamic/varbit-transformed and
animated locations, instanced map squares, original player/NPC skeletal model
poses and actor normals, and the full TSPS water, reflection and GPU shader
passes. No claim of pixel-identical RuneLite/OSRS rendering is made until those
subsystems and authenticated reference frame comparisons are complete.

<a id="doc-readme--osrsrunelite-style-mouse-input-and-object-menus"></a>
##### OSRS/RuneLite-style mouse input and object menus

Desktop left-click now chooses the nearest rendered NPC/object's default action,
or clicks verified ground to walk; moving the mouse while holding left does not
rotate the camera. Desktop **middle-button drag** rotates yaw/pitch; **right-click**
opens Choose Option and never rotates the camera. Touch drag still orbits and
stationary touch-hold on an NPC still opens its menu.

Successful walk/NPC/object interactions show the pinned TSPS-style **yellow mouse
cross** for 100 ms, with a 24-to-8 pixel shrink. The overlay is separate from
the WebGL scene and never captures mouse events. Right-click NPC menus are
always available: they display with a browser-font fallback immediately, then
switch to CRC-verified cache \`b12_full\` when that font finishes downloading.

The cache object decoder now keeps revision-240 location action strings. Static
location geometry retains per-placement triangle picking (including textured
faces), combined region coordinates and original action-slot identity. Menu
actions, including **Open** when defined, send revision-240
`OPLOC1_V2` through `OPLOC5_V2`; Examine uses `OPLOC6`. Selection is cleared on
rebuild, dismissal and disconnect. Dynamic/animated/varbit-transformed locs
that the standalone scene loader does not yet render cannot be picked or
interacted with through this static-mesh path; inventory/ground-item/player
context actions likewise need their own interaction handlers.

Regression checks are in \`tests/world-mouse-parity.test.mjs\`,
\`tests/npc-interactions.test.mjs\` and \`tests/scenery.test.mjs\`. These cover
menu ordering, packets, mouse modes, cache actions and cross animation. A live
authenticated device/browser session is still needed to verify the interaction
look and feel against RuneLite.

Object packets are checked against the installed revision-240 rsprot JVM
decoders with `npm run test:objects:rsprot` (JDK 21+, set `JAVA_BIN` as needed).
The old TSPS opcodes and seven-byte action payloads belonged to a different
protocol: an Open click could be decoded as a three-byte world-entity action,
leaving bytes that corrupted the next opcode and later friend-list decoding.
The corrected eight-byte V2 actions include suboption zero and the server's
field permutations. The encrypted-stream oracle verifies all five action slots,
control-key states, suboptions, Examine, and following heartbeat boundaries.
Refresh and reconnect after updating; an already desynchronized session cannot
recover its packet boundaries.

<a id="doc-readme--main-in-game-runescape-title-screen-openosrs-revision-240"></a>
##### Main in-game RuneScape title screen (OpenOSRS revision 240)

The active title screen matches the **RuneScape in-game welcome/login views**
that OpenOSRS normally leaves rendered by the original game client (OpenOSRS
LoginScreenPlugin defaults to no background override). Text constants were
cross-checked against the locally installed, pinned rev-240 OpenOSRS game
client. The artwork, logo, title box, title buttons, music, rune-fire and mute
remain actual SoloScape CRC-verified rev-240 cache assets.

The welcome panel uses "Welcome to RuneScape", "New User", and "Existing User".
The login panel uses the original username/password prompt and labels,
"Remember username", "Hide username" and "Can't login? Click here.".
Text is painted with actual cache b12_full (496), and the smaller help line
uses p11_full (494); checkbox art comes from options_radio_buttons (with a
safe draw fallback if that decorative asset is unavailable). Loading text
uses the original rev-240 game strings for update, title, sprite and font
progress. Canvas size stays 765 by 503.

Remember username is **opt-in**: only the username and remembered flag are
stored locally, never the password; deselecting it purges saved values.
Hide username masks the painted field without changing submitted credentials.
The help label provides a local explanation rather than incorrectly directing
SoloScape accounts to Jagex account recovery. The "New User" action remains
unavailable until SoloScape has a real account-creation destination.

Tests in tests/title-screen.test.mjs check the text, cache font IDs, mask,
username persistence and controls. Jagex account login, authenticator, world
selection and recovery screens are not implemented. Pixel-exact parity still
requires a live reference screenshot because OpenOSRS's original game renderer
comes from a separately distributed injected game client.

<a id="doc-readme--revision-240-title-screen-alignment-corrections"></a>
##### Revision-240 title-screen alignment corrections

The in-game title was aligned against provided 765x503 OpenOSRS reference screenshots:
the welcome/login titlebox now starts at title-space y=170 (previously 152),
without shifting the background or logo. The login prompt is at baseline y=214
and the Login label starts 2px farther left. Remember/Hide username uses the
smaller p11 cache font and **left-aligned circular controls** with a green
tick; both checkboxes retain functional pointer and keyboard targets.

The original **World 255 / Click to switch** button returns at title-space
x=5, y=463, using the revision-240 sl_button sprite when available, with a
safe fallback. Clicking opens the standalone black 765x503 RuneScape world grid with a
gradient header, members/free legend, four sorting columns, the centered 88x19
World 255 UK-flag row at (338,253) and top-right Cancel. It does not
invent server destinations; world selection, Escape and Cancel all return
to the previous welcome/login state. The switcher is hidden while connecting.
Verified rev-240 sl_back, sl_flags, sl_stars and sl_arrows sprite archives
supply the art, with local fallbacks. Tests cover geometry, fonts, the world
row's cache-sprite coordinates, sorting and interactive close actions.

<a id="doc-readme--login-to-world-performance-openosrs-revision-240-comparison"></a>
##### Login-to-world performance (OpenOSRS revision-240 comparison)

The native browser previously downloaded all required JS5 groups again after
every page refresh, awaited independent model archives one-by-one for each
scenery placement, and waited for every nearby NPC before considering the local
player ready. This was a substantially longer critical path than OpenOSRS's
persistent cache and background asset streaming.

The renderer now overlaps **six** terrain-neighbour requests, up to **eight**
required floor textures, **three** scene regions with **six** scene model
requests each, and six independent player equipment slots. The cache verifies
every group against its current revision-240 reference-table CRC. Decoded
model promises are shared across scene regions, and overlapping texture/sprite
downloads are coalesced. Scene order stays deterministic despite the
overlapping fetches.

When the local player has a verified and uploaded visible mesh and the
terrain/scenery are ready, the loading overlay can fade; nearby NPC models
continue loading in bounded parallel work instead of blocking the first frame.
This does **not** bypass critical scene, texture, appearance or first-frame
readiness checks.

**Persistent browser JS5 cache:** the optional browser CacheStorage bucket
`soloscape-js5-verified-v240` contains public revision-240 reference tables
and encrypted/plain group containers, not login details, decrypted region keys
or account data. It reuses archives across browser refreshes only if their
bytes still match the current gateway's CRC; corrupted data is evicted and
fetched again. Storage-denied/private browsing safely reverts to normal
network fetching. Clearing the site's storage removes the warm cache.
The master manifest is still fetched each browser session.

**Measure a login:** open the browser developer console. After clicking
Login, inspect `[native-login] Authenticated in ... ms`, the
`[native-perf] spawn terrain / neighbour terrain / floor definitions /
floor textures / scenery meshes / first playable character` lines, and
`[native-login] First playable map in ... ms`. Measure once after
clearing site Cache Storage (**cold**) and once after refreshing with a
populated cache (**warm**). These timings are printed to the console, not
rendered as debugging text over the RuneScape title. The approximate target is
OpenOSRS's 5-second login; no live authenticated benchmark has confirmed that
target, and cold JS5 WebSocket gateway response times remain a possible
bottleneck. Performance tests ensure concurrency is limited, asset order,
CRC protection, stale-scene cancellation, and first playable state while
optional NPC models are still pending.

<a id="doc-readme--soloscape-game-client"></a>
##### SoloScape game client

`/` is the sole player-facing site. It shows the actual revision-240
cache-backed RuneScape title screen and authentic native encrypted login.
After login the same authenticated server session drives the local player
and the map, which load genuine revision-240 JS5 terrain, objects, textures,
equipment and animations. The world uses the existing native WebGL renderer
while the original OpenOSRS 3D Java engine continues to be ported to TeaVM.

The client fills the browser viewport with aspect-preserving black letterbox
space; there is no site header, development dashboard, or alternate-client
navigation. `/legacy`, `/diagnostics`, and `/teavm/lab` are removed from the
server routes. Their obsolete page controllers, markup and styles have also
been removed; shared runtime modules and TeaVM verification tools remain.
`/teavm` is an alias to the same client for
previously shared links.

Run `npm run build:teavm` (JDK 17+), start the SoloScape TCP game server,
then `npm run dev:lan -- 192.168.0.129` and open
`https://192.168.0.129:3443/`. Disconnect via the in-game Log out control.
No login credentials are saved. The original binary gamepack, generated
gamepack-derived JavaScript and extracted bytecode remain local and excluded
from Git; redistribution rights must be verified.

See [TeaVM port notes](#doc-teavm-poc-readme) for implementation boundaries.
<!-- end-source-document: README.md -->

---

<a id="doc-local-openosrs-readme"></a>
## local-openosrs/README.md

<!-- source-document: local-openosrs/README.md -->
<a id="doc-local-openosrs-readme--local-original-engine-build-inputs"></a>
### Local original-engine build inputs

This folder replaces the separate OpenOSRS checkout for mobile builds. Keep it
when removing that checkout. Its imported files are local-only and ignored by
Git; they are not included in a fresh clone or a GitHub push. Back up this folder
separately, including its ignored files.

It contains the pinned revision-240 `injected-client.oprs`, the built RuneLite
API JAR, the original `runelite/index` resource, reference metadata, licence
notice and the source files fingerprinted in `../openosrs-reference.json`.
It is a minimal input snapshot, not a complete desktop OpenOSRS source tree.
The original Java gamepack still owns gameplay, login and rendering.

To provision another machine from an existing local OpenOSRS checkout, run from
`Mobile/`:

```powershell
npm run import:openosrs-inputs -- --from "C:\path\to\OpenOSRS"
npm run verify:openosrs-reference
npm run build:openosrs-engine
npm run test:openosrs-engine
```

The importer checks all pinned hashes before copying, preserves different
existing destination files, verifies copied bytes and supports safe retries.
It never deletes or modifies the source checkout. It copies only the manifest's
allowlisted files, not accounts, settings directories, game caches or credentials.

`SOLOSCAPE_OPENOSRS_ROOT`, `SOLOSCAPE_OPENOSRS_GAMEPACK` and
`SOLOSCAPE_OPENOSRS_API` remain explicit overrides. Clear any overrides pointing
at the old checkout before removing it. To roll back, set
`SOLOSCAPE_OPENOSRS_ROOT` to the retained original checkout.

Node.js, JDK 17+, Maven, their dependencies, and the SoloScape server/cache are
still required as before. The BSD notice is preserved in `LICENSE`; the gamepack
and third-party artifacts retain their separate terms and are not redistributed.

Verified on 12 October 2026 with the original checkout temporarily renamed:
all 20 input hashes, the full original-engine build/module check, renderer build
and JVM/TeaVM pixel comparison, and the full suite (620 passed, 3 skipped) passed.
The original directory was restored afterward. The rebuilt original client also
passed the bridge-owned Chrome login-screen smoke; authentication remains manual.
<!-- end-source-document: local-openosrs/README.md -->

---

<a id="doc-original-login-timeout"></a>
## ORIGINAL_LOGIN_TIMEOUT.md

<!-- source-document: ORIGINAL_LOGIN_TIMEOUT.md -->
<a id="doc-original-login-timeout--http-mobile-login-challenge-performance"></a>
### HTTP mobile login challenge performance

On 12 October 2026 the user reported repeated login timeouts on an iPhone 16 Pro
Max using Safari. Safe loopback gateway statuses showed accepted game-init (0),
then a proof-of-work challenge (69). Several attempts ended without a subsequent
server result; one returned already-logged-in (5). An earlier attempt completed
the challenge and received login success (2). These statuses narrow the failures
to the challenge/post-challenge stage; they do not prove its precise cause.

The original Java challenge solver and login deadlines remain unchanged. On HTTP
LAN origins, `BrowserDigest` uses the bundled SHA-256 implementation. Previously
every hash scheduled a microtask to resume the TeaVM coroutine. Local hashes now
complete inline, with the existing timer yield every 256 hashes retained. Secure
origins still use Web Crypto. The SHA-256 implementation compares matching public
prefixes in four-byte words and reuses scratch buffers for the same long-prefix
workload. It still hashes each changing suffix and padding, returns independent
results, and checks the complete prefix before reusing its compression state.

Validation:

- `node --test tests/original-sha256.test.mjs`: standard vectors, prefix changes,
  padding/block boundaries, unaligned input, shrinking nonces, independent results,
  inline completion, periodic yields and secure-origin Web Crypto.
- `node teavm-poc/scripts/verify-platform.mjs --digest`: compiles `DigestProof`
  as a separate TeaVM entry point, runs 20,000 synthetic public hashes through
  the actual Java digest adapter, checks the combined output against Node SHA-256,
  and verifies that an event-loop heartbeat runs. This fixture is not reachable
  from the production `EngineBridge` entry point and performs no login.
- One PC comparison took 1,274 ms before and 1,107 ms after. This is a synthetic
  workload measurement, not an iPhone benchmark or proof that timeouts are fixed.

The engine build, module check, full suite (615 passed, 3 skipped) and bridge-owned
Chrome login-screen smoke passed. After reloading the updated build, the user
reported a much faster successful Safari login on the iPhone 16 Pro Max. This is
one authenticated success; repeated Safari login attempts remain necessary before
marking the intermittent timeout resolved. No authentication packets or account
data are captured by the fixture. Generated proof reports stay in ignored
`teavm-poc/target/engine/`.

<a id="doc-original-login-timeout--repeated-safari-timeouts-after-the-first-optimization"></a>
#### Repeated Safari timeouts after the first optimization

The user subsequently reproduced the timeout after pressing Login at
`http://192.168.0.129:3097/`, with Safari kept open. The latest failed gateway
session again received game-init success (0) and challenge (69), then closed
without a challenge response. This establishes the failing stage, but does not
directly measure the phone's computation or prove that hashing is the only cause.

Read-only inspection of the installed rsprot revision-240 classes found a default
SHA-256 difficulty of 18 bits. A random challenge therefore needs approximately
262,144 hashes on average, with an unbounded random tail. The earlier 20,000-hash
fixture substantially underestimated this workload. It also called BrowserDigest
directly rather than the original gamepack's `ag.fa` hash method.

The HTTP adapter now hashes synchronously into the Java result buffer, using a
byte view of the existing input buffer. It checks a cooperative eight-millisecond
work budget every 256 hashes and yields through a MessageChannel task when the
budget is exhausted. Both ports are closed after each yield. Runtimes without
MessageChannel use a timer. The next work slice starts when the callback resumes,
so waiting for a timer does not consume the next slice. The original Java solver,
nonce sequence, difficulty, login protocol and deadlines remain unchanged; secure
origins still use Web Crypto.

The separate `DigestProof` fixture now calls the original `ag.fa` method, with
synthetic public data and a default workload of 262,144 hashes. Set
`SOLOSCAPE_DIGEST_PROOF_HASHES` to a value from 20,000 through 1,048,576 for larger
bounded runs. The verifier checks every workload's combined result against Node
SHA-256 and requires an event-loop heartbeat.

Measurements on this PC: the original adapter took 15,568 ms for 262,144 hashes;
the updated adapter took 8,145 ms. An isolated, bridge-owned headless Chrome
fixture completed 1,048,576 hashes in 32,121 ms, with 1,305 heartbeat callbacks
and the same combined hash as Node. These are synthetic PC measurements, not
iPhone timings or proof that all random challenges finish before login deadlines.
The browser fixture and reports are stored only in ignored
`teavm-poc/target/engine/`. Repeated authenticated Safari verification is still
required before declaring the intermittent timeout resolved.

The final full suite passed (617 passed, 3 skipped), as did
`npm run build:openosrs-engine`, `npm run test:openosrs-engine` and the
bridge-owned Chrome login-screen smoke. The updated build is served by the
existing local development host; Safari must reload to load it.
<!-- end-source-document: ORIGINAL_LOGIN_TIMEOUT.md -->

---

<a id="doc-original-mobile-ui"></a>
## ORIGINAL_MOBILE_UI.md

<!-- source-document: ORIGINAL_MOBILE_UI.md -->
<a id="doc-original-mobile-ui--original-engine-mobile-ui"></a>
### Original-engine mobile UI

The browser selects the revision-240 cache's official `toplevel_osm` gameframe
(interface 601), using `mobile_pane_redirect` (enum 1745). All widgets, tab
scripts, software rendering and gameplay stay in the original Java gamepack.

The browser advertises touch UI to the pinned `bb`/`su` interface interpreters.
The underlying native mobile flag, desktop login client type (parameter 4 = 1)
and packet formats stay unchanged. Once manual login succeeds and a server
gameframe exists, the original Java drawing callback sends the fixed `mobileui`
command through the original `DOCHEAT` implementation. It sends once per login
and resets on logout or connection loss. No account input is automated.

At the login screen, the browser also invokes the original `SETWINDOWMODE`
setter with mode 2. The original login therefore reports resizable mode even
when the saved desktop preference is fixed. This does not update that saved
preference; the call is skipped once the original client is already resizable.

Touch swipes use reversed yaw and direct pitch deltas at 4/1.75 camera units per CSS pixel
(half the previous sensitivity). The mobile gameframe uses the original `orbs_osm`
(897) interface, or `orbs_osm_nomap` (898) when the minimap is collapsed. These
provide the native mobile arc, wider orb backgrounds and number positions.
The desktop retains `orbs` (160) and `orbs_nomap` (895). No Java widget-position
override is applied. Gameframe moves, minimap toggles and cinematic reopen paths
preserve the appropriate variant; both mobile world-map buttons use the existing handler.

Two fingers started over the game scene control camera zoom. Spreading them
zooms in; bringing them together zooms out. Relative finger distance feeds the
original Java AWT wheel path, with its existing zoom settings and limits. Pinch
pauses rotation, cancels the delayed login zoom and suppresses compatibility taps
until both fingers lift. A new one-finger gesture resumes normal camera swipes.
Inventory, minimap and chat touches retain their original UI handling.

The mobile `toplevel_osm:chatting_button` (601:48) opens the ephemeral browser
keyboard inside the same trusted touch click. The Java drawing callback samples
its live bounds, inherited visibility and original chat keyboard toggle (varc
1226); the browser receives only an open/close action for that button. Typed
characters, deletion and Enter use the existing AWT key input path, and the
temporary input is cleared after committed text. Other game taps dismiss the
keyboard. Login-field handling remains separate.

The server registers the cache's mobile redirect mappings and handles that
command using its existing gameframe move queue. It sets the original resizable
mode and moves the existing overlays into mobile containers. A saved mobile
frame is excluded from PC login fallback; the current browser requests it again.
Mobile redirects are decoded as packed IDs: enum 1745 includes pseudo-components
such as `600:65535` that have no widget definition. Resolving every key through
the nullable component-definition codec prevents server startup.

Both the Java engine and Kotlin server must be rebuilt. Stop the running server
before packaging its replacement: Windows locks the active `build/direct/lib`
directory. Restart the server, reload the browser, and log in manually.

Resizable presentation measures the canvas inside the iPhone safe-area insets.
The original engine's 765x503 minimum is satisfied by scaling both framebuffer
dimensions by the same factor. Landscape phones therefore get a wider original
render, rather than squeezing a 503px-tall image into a shorter screen. Portrait
rotation also keeps the same proportions. Framebuffers are bounded to 2048 pixels
per axis and are not multiplied by device pixel ratio. Safari viewport changes
are observed; the native engine still owns rendering, UI layout and input mapping.
For an iPhone launch without Safari's toolbars, add the page to the Home Screen
and launch that icon. The page advertises Apple's standalone mode and translucent
status bar; safe-area spacing keeps controls clear of system screen cutouts.

<a id="doc-original-mobile-ui--verification-boundary"></a>
#### Verification boundary

The JVM transformation fixture checks that touch capability is added only to
interface interpreters, leaving a login flag reader unchanged. It also checks
pre-login/no-root gating, once-per-session requests, reconnect and disabled mode.
It also checks login-screen window selection, idempotence and desktop isolation.
The actual LIVE cache contains 135 mobile widgets and 103 mobile redirect pairs.
The owned-Chrome smoke also requires `LOGIN_SCREEN` with the original client's
resizable flag enabled, without taking screenshots or entering credentials.

Authenticated mobile rendering and interaction still require screenshots and
original-client responses: tab opening/closing, inventory actions, chat, banking,
dialogue, minimap navigation, rotation/resizing and reconnect. Build success and
cache availability alone do not establish these. Existing Phase 2 gameplay and
missing-scenery limitations remain documented in
`PHASE2_GAMEPLAY_VERIFICATION.md`.
<!-- end-source-document: ORIGINAL_MOBILE_UI.md -->

---

<a id="doc-original-mobile-lan"></a>
## ORIGINAL_MOBILE_LAN.md

<!-- source-document: ORIGINAL_MOBILE_LAN.md -->
<a id="doc-original-mobile-lan--original-openosrs-client-on-a-phone-trusted-lan-only"></a>
### Original OpenOSRS client on a phone (trusted LAN only)

The **original revision-240 Java gamepack** compiled with TeaVM, including its
original Java software renderer, is served at `http://PC-LAN-IP:3097/`.
This is not the separate WebGL/TSPS homepage and is not intended for public hosting.

<a id="doc-original-mobile-lan--start-locally"></a>
#### Start locally

1. Connect the phone and the Windows development PC to the **same trusted
   private Wi-Fi/LAN**. Avoid guest Wi-Fi/client isolation, VPN or public networks.
2. Start the original SoloScape Java game server separately (`Server/run.bat`).
   It listens at `43594` on the development PC.
3. From `Mobile/`, build the pinned original engine if necessary with
   `npm run build:openosrs-engine`, then launch
   `npm run dev:original-engine` (or double-click `Mobile/run.bat`). This enables
   the development host (`3097`) and game WebSocket gateway (`43595`) to
   authorized peers on your private subnet. Do not port-forward either port.
4. On the phone, open the **LAN URL printed by the server**, for example
   `http://192.168.0.129:3097/`. Engine initialization starts automatically.
   Log in **manually** using your disposable test account.
   On the Java welcome title, tap **Existing User** first; then tap the
   username or password field. The original canvas processes the click before
   iOS Safari focuses the ephemeral keyboard input. **Only those two input
   areas** can open the keyboard; tapping login buttons, other title controls
   or the game canvas does not summon it and dismisses it if already open.
   Keyboard activation can be retried by tapping either field again. When iOS
   temporarily transfers DOM focus from the original canvas to its ephemeral
   keyboard input, the browser AWT adapter does not report a spurious Java
   focus-loss event; genuine canvas/page focus losses are still reported.
   This browser-only compatibility shim requires an original TeaVM rebuild
   and must be verified with a manual iPhone login.

A small text-free loading animation appears as soon as the page is received,
then disappears when the original game draws. An error message appears only
if initialization fails or stalls. The gamepack retains its native
765x503 software framebuffer, fitted within the viewport without stretching or
a replacement renderer. Black bars are expected on screens with other ratios.

If the original Java client reports an error, the visible message now includes a
fixed, non-sensitive category (for example, NULL_REFERENCE or BOUNDS).
This helps investigate title-screen errors without displaying exception text,
account details, or stack traces. It does not prove the underlying error is fixed.

<a id="doc-original-mobile-lan--white-screen-or-unreachable-page"></a>
#### White screen or unreachable page

Open the lightweight **connection-only** check on the phone:

`http://192.168.0.129:3097/health`

Replace the example IP with the one the dev server prints. This endpoint
shows **"SoloScape connection OK"** without loading the JavaScript gamepack or
the original game cache.

- If `/health` **doesn't load**, check Wi-Fi subnet, Windows firewall
  inbound TCP `3097`, and whether the LAN dev process is still running.
- If `/health` **loads**, but `/` remains blank or reloads unexpectedly,
  the network route works; investigate mobile browser JavaScript/memory
  constraints. The pinned compiled JS file is about **12 MB**, and the raw
  original cache mounted in browser memory is about **239 MB** on the current
  development PC. JavaScript heap and decoded game assets use additional
  memory, and mobile Safari/Chrome (both WebKit on iOS) can terminate tabs
  under memory pressure. Streaming each native cache file into its final
  buffer and loading files sequentially reduces temporary allocations, but
  **does not eliminate the full original cache memory requirement**. The
  original-canvas diagnostic now reads small scanlines rather than a full
  framebuffer snapshot every half-second. Startup errors show a fixed category
  and stage (for example, BOUNDS during cache-load); memory allocation errors
  remain possible, and the label alone does not measure the device's RAM.
- If the game displays an error while loading or signing in, confirm the
  Java server (`43594`) and LAN gateway (`43595`) are running and reachable.
  No LAN proxy can substitute for a stopped Java game server.
- The local host and gateway are HTTP and WS, not HTTPS or WSS. Only use
  the server on a trusted private network; do not expose the
  gamepack/cache externally. Mobile browser support is still experimental.

Runtime status, exceptions and original Java game-cycle counters stay available
to local development tools without a visible diagnostic control panel.
No passwords, session tokens or original RSA private keys are exposed in the
diagnostic page or health endpoint.


<a id="doc-original-mobile-lan--login-disconnect-investigation-developer-only"></a>
#### Login disconnect investigation (developer-only)

If the original Java client displays "You were disconnected from the server"
after pressing Login, first check the Java game server (TCP 43594) and the
trusted-LAN WebSocket gateway (43595). A working /health endpoint only verifies
the page server, not a successful game login.

The gateway now keeps the last 30 **credential-free** connection summaries,
available only from the development PC at
`http://127.0.0.1:3097/original-session-diagnostics`. Each summary shows
only an anonymous sequential connection number, open time, a fixed
handshake type (JS5_CACHE, GAME_INIT, GAME_LOGIN or GAME_RECONNECT),
counts of client-to-server and server-to-client frames, and a fixed
close reason/code.
It does not store or reveal IPs, names, passwords, packet bytes, session
tokens, or the original Java game's input fields. A close reason such as
`Upstream closed` identifies the direction of closure; it does not prove
whether the server rejected a login packet or a successfully established game
session ended. Reproduce with manual login, then inspect the newest
summary on the PC. **Restart only the development LAN gateway to enable
new Node gateway code**; do not restart or modify the Java game server.

The gateway also records ONLY the single public, unencrypted status byte
for the initial game handshake and the subsequent server login response.
The result fields are `gameInitStatus` (normally `0` when accepted) and
`gameLoginStatus` (`null` if no server login response arrived). The
eight-byte game challenge, encrypted client login packet, username, password,
session data and other packets are not retained, printed or exported.
This read-only observer never changes the original protocol.

<a id="doc-original-mobile-lan--iphone-welcome-screen-restarts-developer-only"></a>
#### iPhone welcome-screen restarts (developer-only)

The original title still uses the original Java gamepack. To distinguish a
WebKit page reload from Java redrawing the welcome screen, the LAN development
page sends only four fixed events: PAGE_STARTED, TITLE_RIGHT_TAP, PAGEHIDE
and PAGE_RESTARTED. A title-area tap saves a fixed marker and time in
sessionStorage for up to two minutes; the marker contains no credentials,
input text or game packets. If storage is unavailable, the game still starts.

Read the anonymous recent events under `pageEvents` alongside socket summaries
at `http://127.0.0.1:3097/original-session-diagnostics` on the PC.
A second PAGE_STARTED after a title tap confirms the document was recreated;
PAGE_RESTARTED means the previous tab-local marker survived. That does not
by itself distinguish a manual reload from a browser crash. The original
client now stops repeated canvas diagnostic readbacks after a changed frame
is confirmed; the 228 MiB in-memory original cache is still present.

<a id="doc-original-mobile-lan--proof-of-work-on-ios-http-lan"></a>
#### Proof-of-work on iOS HTTP LAN

The original rev-240 Java login negotiates a server-issued SHA-256
proof-of-work challenge (response code 69). Loopback HTTP on the PC is a
secure-context exception, but `http://192.168.x.x` on Safari cannot rely
on `crypto.subtle`. The original game's `java.security.MessageDigest`
browser adapter now uses Web Crypto when present and a local, tested
SHA-256 implementation when unavailable. This computes the actual
server challenge and forwards the original Java client's response; it
**does not disable proof-of-work, skip login, or expose credentials**.
The fallback is bounded to 1 MiB per digest and yields to the event
loop every 256 hashes. SHA-1/SHA-512 still require Web Crypto on secure
origins rather than silently using an unsupported digest. No remote
crypto services, credential logging, account automation, or alternative
game engine are used. Rebuild the original TeaVM engine after changes.

<a id="doc-original-mobile-lan--original-iphone-camera-zoom-on-login"></a>
#### Original iPhone camera zoom on login

The pinned Java client still owns camera positioning, rendering and user
zoom. On coarse-pointer/mobile devices, after the *original* client first
reports `LOGGED_IN`, the browser waits 450 ms for the native camera to
settle and sends eight zoom-in detents through the original canvas's
existing Java AWT `MouseWheelEvent` input listener. This is **not**
the parallel WebGL client's camera, a direct obfuscated field patch,
or a replacement renderer. A pending adjustment is canceled on logout,
connection loss or genuine wheel input; no recurring camera correction
fights a player's preferences. Desktop controls remain unchanged.
A phone retest is required to verify the visual distance.

<a id="doc-original-mobile-lan--authentic-resizable-game-window"></a>
#### Authentic resizable game window

Both original **Resizable Classic** and **Resizable Modern** report
`net.runelite.api.Client.isResized()`. When the original Java client is
`LOGGED_IN`, the browser host passes the CSS-pixel viewport dimensions to
the original Java AWT container, calls the game's native `resizeCanvas()`,
and fills the webpage with the original software-rendered canvas. Fixed
mode retains the original 765x503 letterboxed presentation; leaving the
world restores those dimensions. The client retains OSRS's 765x503
logical minimum, with bounded maximum dimensions to avoid multiplying
Safari's framebuffer by Retina pixel density. This is not a second
WebGL renderer. It requires a TeaVM rebuild and a manual iPhone test of
both layout variants, including rotating the phone.

<a id="doc-original-mobile-lan--iphone-drag-sensitivity-original-game-camera-targets"></a>
#### iPhone drag sensitivity (original game camera targets)

The original revision-240 RuneLite-injected `Client` already exposes
`getCameraYawTarget`/`setCameraYawTarget` and
`getCameraPitchTarget`/`setCameraPitchTarget`. The TeaVM Java bridge
uses exactly these native client APIs after `LOGGED_IN`; the game itself
still interpolates, constrains and renders the camera. Mobile pointer
movement is translated into relative target deltas: **8 yaw units per
CSS pixel** and **3.5 pitch units per CSS pixel**, with fractional
movement preserved, yaw wrapped to the 2048-unit compass and pitch
limited to 128–383. Distance, not touch event frequency or swipe time,
determines rotation. The user-visible choice between Fixed, Classic
and Modern does not change sensitivity.

The 12 CSS-pixel threshold protects quick walk/interact taps; a 320 ms
long press followed by a drag still works. Gestures only begin within
the game world, not the chat, minimap or inventory. Lifting the finger,
pointer cancellation, page blur or logout ends movement immediately,
without momentum. Safari text selection/callouts remain suppressed on
the original canvas. These sensitivity constants are initial tuning
values, not claimed measurements from the official OSRS Mobile client.
Manual iPhone playtesting should determine whether they need adjustment.
<!-- end-source-document: ORIGINAL_MOBILE_LAN.md -->

---

<a id="doc-original-engine-lan"></a>
## ORIGINAL_ENGINE_LAN.md

<!-- source-document: ORIGINAL_ENGINE_LAN.md -->
<a id="doc-original-engine-lan--soloscape-original-openosrs-client-on-a-phone-trusted-lan"></a>
### SoloScape original OpenOSRS client on a phone (trusted LAN)

This serves the **actual original revision-240 Java gamepack**, compiled with
TeaVM, and its original Java software renderer. The page starts the engine
**automatically**. A small text-free loading animation appears immediately
and disappears once the original game canvas paints its first frames. The fullscreen CSS fits the
765x503 framebuffer inside the viewport without stretching, with black space
where the screen has a different aspect ratio.
The original Java renderer remains unchanged.

<a id="doc-original-engine-lan--connect"></a>
#### Connect

1. Keep the **PC and phone on the same trusted Wi-Fi/LAN**. A wired PC and a
   Wi-Fi phone can work together if the router permits local-device traffic.
   Disable mobile data/VPN or guest Wi-Fi if it isolates LAN devices.
2. Start the existing Java game server using `Server/run.bat` (port 43594).
   Do **not** expose the Java TCP port to the phone; the gateway runs on the PC.
3. Close an older `npm run dev:original-engine` terminal on port 3097.
4. Double-click `Mobile/run.bat`, or in `Mobile/` run:
   `npm run dev:original-engine`. LAN access is enabled by default;
   `run-original-lan.bat` and `dev:original-engine:lan` remain compatible aliases.
5. Find the URL printed after `TRUSTED LAN ONLY:` in the console, and open
   it in the phone browser. The current PC IPv4 address is
   **http://192.168.0.129:3097/** (it can change after reconnecting).
6. Wait for the original title screen and **log in manually**. Auto-start
   does **not** automatically authenticate or record a username/password.

The webpage uses TCP 3097 and routes original client WebSocket traffic over
TCP 43595 to the server's **local** TCP 43594. Your phone should not connect
to `localhost` or `127.0.0.1`; those would refer to the phone itself.
Leave `Server/run.bat` and `run-original-lan.bat` open while playing.

<a id="doc-original-engine-lan--windows-firewall"></a>
#### Windows Firewall

If the page fails to open from the phone, allow inbound TCP **3097 and 43595**
from `LocalSubnet`. The rule below applies even when Windows labels your
trusted home LAN as Public. Run it once in PowerShell as administrator:

```powershell
New-NetFirewallRule -DisplayName "SoloScape Original Engine LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3097,43595 -Profile Any -RemoteAddress LocalSubnet
```

The launcher does not change your firewall automatically. Keep the source-subnet
restriction, use a trusted LAN, and do not expose these services to the Internet or configure router
port forwarding. For an explicit loopback-only diagnostic session, stop the
launcher and set `SOLOSCAPE_ENGINE_LAN=0` before `npm run dev:original-engine`.

<a id="doc-original-engine-lan--security-and-mobile-limitations"></a>
#### Security and mobile limitations

LAN access is **enabled by default**. The server picks an active private IPv4 adapter
(override using `SOLOSCAPE_ENGINE_LAN_IP` if multiple are available),
restricts HTTP by Host and source subnet, restricts the WebSocket gateway by
source subnet and exact browser Origin, and never changes the underlying
Java server's loopback-only TCP upstream. It serves the original compiled
gamepack and cache to **devices on your subnet**, without HTTPS or app-level
authentication, so use **only a private network and disposable test account**.
Check gamepack/cache distribution rights before sharing beyond personal testing.

The 765x503 original framebuffer is centred and scaled uniformly to fit the
browser viewport without cropping or replacing the **original Java renderer**.
Black bars are expected when the screen has a different aspect ratio.
Landscape orientation is recommended. Native phone touch
gestures, long-press context menus and on-screen keyboard support may still
need further work; opening the page and displaying the title do not by
themselves prove all gameplay input works on a phone.

Development telemetry and the original gamepack source are not exposed as
extra HTML panels. The internal telemetry remains for the local bridge.
`Mobile/run.bat` enables trusted LAN access on every launch.

<a id="doc-original-engine-lan--white-screen-troubleshooting-on-iphone"></a>
#### White screen troubleshooting on iPhone

Open `http://192.168.0.129:3097/health` (use the IP from the
`TRUSTED LAN ONLY:` server message if it changes). This deliberately
**does not load** the Java gamepack or original cache.

- If it displays **SoloScape connection OK**, the phone can reach the
  authorized LAN webpage. Try the normal `/` page again; it now displays
  only the original game canvas while starting. Startup errors are still shown if initialization fails or stalls.
- If the health page does **not** load, check private Wi-Fi, router guest
  isolation, LAN IP, Windows Firewall port 3097 and the LAN launcher.
- If the health page works but the game tab goes completely blank or is
  reloaded, mobile browser memory exhaustion is a possibility. The pinned
  compiled original gamepack is about 12 MB of JavaScript and the current
  original native cache is about 239 MB. The cache files are now loaded
  **sequentially, using streaming into one final buffer each** to reduce
  temporary memory spikes, but the full cache must still reside in browser
  memory. iOS browser support remains experimental; this does not guarantee
  the original Java engine fits within WebKit memory limits.
- Leave the original game server on port 43594 running; `/health` alone
  does not prove the server or game protocol is available.

Do not expose development ports to the public Internet. Login stays manual.
<!-- end-source-document: ORIGINAL_ENGINE_LAN.md -->

---

<a id="doc-dev-bridge-readme"></a>
## dev-bridge/README.md

<!-- source-document: dev-bridge/README.md -->
<a id="doc-dev-bridge-readme--soloscape-original-engine-stage-1-mcp-bridge"></a>
### SoloScape original-engine Stage 1 MCP bridge

This is a **development-only, local stdio MCP server** for the actual rev-240
OpenOSRS gamepack compiled with TeaVM. It controls the isolated original-engine
diagnostic at `http://127.0.0.1:3097/`, not the production mobile app or the
separate custom WebGL renderer.

It launches a dedicated Chrome session with its own temporary browser profile
and connects to **that session only** through local Chrome DevTools Protocol
(CDP). Its interface is a fixed allowlist; MCP callers cannot evaluate arbitrary
JavaScript, access files or network packets, navigate to arbitrary sites, or
attach to a browser they do not own.

<a id="doc-dev-bridge-readme--one-click-windows-launcher"></a>
#### One-click Windows launcher

Double-click **`Mobile/run.bat`** (or run it from a Windows terminal).
The launcher uses its own folder as the working directory, checks Node/npm
and the compiled gamepack, and opens separate terminal windows for:

- `npm run dev:original-engine` (the original gamepack diagnostic on
  `http://127.0.0.1:3097/`; skipped if the correct diagnostic is already
  running on that port).
- `node dev-bridge/stdio.mjs` (the Stage 1 MCP stdio process).

`run.bat --check` validates prerequisites and prints the commands without
starting anything. The Java SoloScape game server on port `43594` is **not**
started by this launcher and must be running separately.

**Important:** An MCP **stdio** process started in its own console cannot be
attached to by another MCP client. The extra console is a standalone process
for manual protocol testing. To actually use bridge tools from a connected
agent, configure your MCP host to launch `dev-bridge/stdio.mjs` itself using
the configuration below. Opening the console does not automatically connect
ChatGPT to it.

<a id="doc-dev-bridge-readme--prerequisites"></a>
#### Prerequisites

On the Windows development machine, from `Mobile/`:

1. Run your normal SoloScape game server (`127.0.0.1:43594`).
2. Build the original engine: `npm run build:openosrs-engine`.
3. In a separate terminal, start `npm run dev:original-engine`, which serves
   the original engine on `127.0.0.1:3097` and local WebSocket gateway on
   `127.0.0.1:43595`.
4. Use Node 22.16+ and Chrome. If Chrome is installed elsewhere, set
   `CHROME_BIN` to its executable path.

Then register the **exact node entrypoint** below in your local MCP-compatible
development host (the host must be able to start a stdio process on this
machine):

```json
{
  "mcpServers": {
    "soloscape-original": {
      "command": "node",
      "args": [
        "C:\\path\\to\\SoloScape-OS\\Mobile\\dev-bridge\\stdio.mjs"
      ]
    }
  }
}
```

Adjust the local path if you move the checkout. Use
`npm run mcp:original-engine` only for starting the process manually; MCP
hosts should launch `node dev-bridge/stdio.mjs` directly so that standard
output contains JSON-RPC messages only.

The local player-facing page now shows **only the original game canvas**,
scaled to the full browser viewport. The Java gamepack starts automatically
when the page loads. State/FPS telemetry and screenshot capture remain
available exclusively through the developer bridge, not visible controls.
The legacy `initialize_original_engine` tool is an idempotent status check
for older MCP workflows; it never clicks or reinitializes the client.

The bridge does **not** register itself as a ChatGPT plugin. To work with it
through ChatGPT, use a local MCP-capable host that supports this configuration
or the existing authorized local-machine tooling to drive the CLI. Installing
or connecting an integration always requires the user's action.

<a id="doc-dev-bridge-readme--tools"></a>
#### Tools

| Tool | Stage 1 behavior |
| --- | --- |
| `browser_start` | Launch bridge-owned Chrome on the localhost original-engine diagnostic |
| `browser_status` / `browser_close` | Inspect or close only the bridge-owned browser |
| `initialize_original_engine` | Backward-compatible status check; original Java engine starts automatically on page load |
| `get_client_state` | Read sanitized game state, game cycles, FPS, presented frames, clock |
| `wait_for_state` | Wait for a whitelisted native game state, with max 60 s timeout |
| `capture_screen` | Capture the original canvas after a healthy `LOGGED_IN` |
| `click_canvas` | Send a real mouse click in original canvas pixel coordinates, after login |
| `press_key` | Single, allowlisted gameplay key after login (not free-form text) |
| `get_diagnostics` | Sanitized exception categories and generated function/line frames only |
| `profile_performance` | 0.5–15 s passive FPS/cycle probe, optionally CPU function-name samples |
| `run_smoke_test` | Check real `LOGGED_IN`, cycle/frame progression, and no callback errors |

<a id="doc-dev-bridge-readme--example-test-workflow"></a>
##### Example test workflow

1. Call `browser_start`; a dedicated Chrome window opens.
2. The original gamepack starts automatically. Call `wait_for_state` with
   `{"gameState":"LOGIN_SCREEN"}`.
3. **Manually** click Existing User → Login and enter a **disposable test
   account** in the Chrome window. There is deliberately no MCP password,
   login-submit, keylogging, browser-cookie, or packet-inspection operation.
4. Call `wait_for_state` with `{"gameState":"LOGGED_IN"}`.
5. Call `get_client_state`, `capture_screen`, `run_smoke_test`, or
   `profile_performance`.
6. Use `click_canvas` for Walk here, native menus, and NPC interaction, and
   `press_key` for bounded keyboard testing. Check game state, cycle progress,
   and screenshot afterward; sending input does not imply movement succeeded.
7. Call `browser_close` when finished. Closing the MCP process also attempts
   to shut down its owned browser.

<a id="doc-dev-bridge-readme--security-limits"></a>
#### Security limits

- Stdio only; no listening bridge HTTP/WS server or exposed CDP proxy.
- Chrome debugging uses an ephemeral port **bound to localhost** and an
  isolated temporary browser profile. No user default Chrome profile attach.
- Browser navigation and arbitrary evaluation are **not** MCP tools. The code
  uses only fixed diagnostic expressions against `window.engineSmokeState`.
- The diagnostic omits usernames, passwords, cookies, account identifiers,
  JavaScript variables, arbitrary console logs, HTTP bodies, login packets,
  and RSA/private-key contents.
- Screenshots, mouse clicks, and key events are blocked unless the original
  client is `LOGGED_IN` and no callback error is present. Screenshots can show
  in-game content; review any capture before sharing it beyond local tools.
- The bridge never automatically logs in; keep the diagnostic and game server
  on localhost and only use disposable credentials.
- The MCP bridge is never imported into production browser bundles.

<a id="doc-dev-bridge-readme--desktop-commander-stage-2-persistent-controller"></a>
#### Desktop Commander Stage 2 (persistent controller)

The **recommended local development workflow** uses Desktop Commander to run
ordinary commands against a persistent process. No ChatGPT plugin, OpenAI
tunnel, API key, public port, or separately installed MCP adapter is needed.
The Stage 1 MCP protocol remains available unchanged for external MCP hosts.

From `Mobile/`, double-click `run.bat`. In addition to the original-engine
diagnostic and Stage 1 MCP console, this starts **SoloScape Desktop Controller**.
The controller has a private per-user session descriptor in Windows
`%LOCALAPPDATA%/SoloScape-OS/dev-controller/session.json`, a randomized
local-only named pipe, and a per-session authorization token. None of those
values is stored inside this repository or printed in command output.

Desktop Commander can invoke each of these in a separate terminal call:

```powershell
node dev-bridge/controller-cli.mjs status
node dev-bridge/controller-cli.mjs start
node dev-bridge/controller-cli.mjs wait LOGIN_SCREEN 60000 # initialization is automatic
# Log in MANUALLY with a disposable test account in the owned Chrome window
node dev-bridge/controller-cli.mjs wait LOGGED_IN 60000
node dev-bridge/controller-cli.mjs screenshot
node dev-bridge/controller-cli.mjs click 400 250 left
node dev-bridge/controller-cli.mjs key Escape
node dev-bridge/controller-cli.mjs smoke-test 3000
node dev-bridge/controller-cli.mjs diagnostics
node dev-bridge/controller-cli.mjs scene # original Java tile/loc category counts
node dev-bridge/controller-cli.mjs profile 5000 --cpu
node dev-bridge/controller-cli.mjs rebuild-and-test
node dev-bridge/controller-cli.mjs shutdown
```

`screenshot` is allowed **only after LOGGED_IN** and saves the original canvas
PNG to the ignored `teavm-poc/target/engine/controller-captures/` directory;
the command prints its full path so Desktop Commander can inspect it. The
controller does not read or write game passwords, tokens or login packets.
`scene` reads counts directly from the original Java game's loaded scene
(tiles, walls, decorative objects, ground objects, game-object **tile
references**, map-region count, per-plane game-object references, and
counts of null and direct-model renderables). Counts are deliberately anonymous:
no object IDs, names, cache bytes or player coordinates are exported.
Compare before/after moving to an area missing scenery. Null-renderable
counts may distinguish failed object-model construction, but a non-null
renderable still may fail to draw. Neither counts nor model availability prove
the expected object placements or visual parity.

The castle-specific extension also checks a **fixed** Lumbridge study area
(ground through third floor) against a known local map-location archive.
`castleGameReferences`, `castleModels` and `castleEmptyModels` are
per-plane arrays. `castleAnchorGameRefs` and `castleAnchorModelFaces`
are five anonymous fixed-position tests of the original scene (kitchen,
two furniture placements and both staircases); the reference does not
derive from the user's position or reveal object IDs. Compare counts to
the trusted map archive before deciding that a scenery model was never
constructed. Never create browser-side proxy meshes as a workaround.

The `scene` result also exposes eight **fixed source-fixture checks**
(`castleDefinitionPresent`, `castleDefinitionModelCount`,
`castleDefinitionTypedModelCount`, `castleDefinitionModelReady` and
`castleRawDefinitionBytes`). They test the original gamepack's
configuration archive and object definition loader, including a
typed-wall comparison. A model-ready result of 1 alongside model-count 0
does **not** prove that its model was loaded. An archive-byte count of
0 means that lookup returned no bytes *at that moment*, not that the
cache file is missing from disk. These are local diagnostic-only
counters, never a replacement definition/model loader.

`smoke-test` is a passive runtime stability check (no synthetic movement
success). `profile` measures real original game cycles and software frames;
the optional CPU samples contain function names, not variable contents.

`rebuild-and-test` is opt-in and stops only its own Chrome session first,
then runs three **fixed, reviewable** local tasks: the original engine build,
original engine verification, and MCP bridge tests. It never runs arbitrary
commands supplied by an agent. After rebuilding, launch a fresh owned Chrome
session and log in manually to confirm gameplay. The Java server and other
browser windows are not stopped. `shutdown` ends the controller and only the
Chrome session it owns.

For direct standalone use (without `run.bat`):
`npm run dev:desktop-controller` starts the persistent controller. It does
not start the Java game server or original-engine diagnostic; those must
already be running. Commands report an error if no controller is available.

<a id="doc-dev-bridge-readme--phase-2-authenticated-stability-verification"></a>
#### Phase 2 authenticated stability verification

For the original Java gamepack, run a **15–30-minute logged-in session** with
`node dev-bridge/verify-gameplay.mjs 20`. It waits briefly for **manual**
login, then records sanitized FPS, original game cycles, software frame counts,
state transitions, browser visibility/focus, and fatal callback indicators.
`node dev-bridge/controller-cli.mjs heap` reports the Chrome JavaScript heap
only (requires a healthy `LOGGED_IN` state); it does not read game data,
username, secrets or networking packets.

On Windows, `powershell -NoProfile -File
dev-bridge/verify-chrome-memory.ps1 -Minutes 15` records private/working-set
memory of **only** the bridge-owned Chrome profile, not any other browser.
Local JSON/CSV results are in ignored
`teavm-poc/target/engine/phase2-reports/`.

**Current evidence and unresolved blockers:**
[PHASE2_GAMEPLAY_VERIFICATION.md](#doc-phase2-gameplay-verification).
The 10 October 2026 20-minute session did **not** pass: severe late-session
timer throttling preceded a transition to `CONNECTION_LOST` and
`LOGIN_SCREEN`. Repeat with the Chrome test window foregrounded; do not
infer the client is stable from the median 50 game cycles/s or treat title
and simulated test fixtures as authenticated NPC/banking/chat proof.

<a id="doc-dev-bridge-readme--verification"></a>
#### Verification

```powershell
npm run test:mcp:original-engine
npm run test:mcp:original-browser # with dev:original-engine running
npm test
npm run test:openosrs-engine
```

The dedicated MCP tests cover the protocol handshake and stdio transport,
fixed tool schemas, screenshot/keyboard/click gating, coordinate mapping, and
redaction. A separate real-Chrome integration check validates startup,
manual-login separation, native `LOGIN_SCREEN` discovery, and clean shutdown.
Full authenticated movement and screenshot tests remain manual because the
bridge intentionally does not handle account credentials.
<!-- end-source-document: dev-bridge/README.md -->

---

<a id="doc-phase2-gameplay-verification"></a>
## PHASE2_GAMEPLAY_VERIFICATION.md

<!-- source-document: PHASE2_GAMEPLAY_VERIFICATION.md -->
<a id="doc-phase2-gameplay-verification--phase-2-original-engine-gameplay-verification--10-october-2026"></a>
### Phase 2 original-engine gameplay verification — 10 October 2026

<a id="doc-phase2-gameplay-verification--scope-and-evidence-boundary"></a>
#### Scope and evidence boundary

This report covers the **pinned revision-240 original OpenOSRS Java gamepack**
compiled to JavaScript by TeaVM, its **original Java software renderer**, and
the real local SoloScape Kotlin/RSMod server through the loopback gateway.
It is not testing the separate TSPS/WebGL mobile renderer.

The player logged into a disposable test account **manually**. Verification
uses the Stage 2 Desktop Commander controller and real original-client canvas
screenshots. No credentials, login packets, RSA private keys, or other account
secrets are recorded.

<a id="doc-phase2-gameplay-verification--authenticated-interaction-checklist"></a>
#### Authenticated interaction checklist

| Area | Current verification | Evidence and follow-up |
| --- | --- | --- |
| Login and original framebuffer | **Observed pass** | `LOGGED_IN`, real terrain, NPCs/other actors, player, minimap, chat, inventory and original game cycles confirmed by controller and screenshots |
| Click-to-move | **Observed pass** | Safe ground click shifted the world/camera around the player; independently previously confirmed by the user |
| Inventory context menu | **Observed pass** | Right-clicked a grimy guam leaf: gamepack showed `Use`, `Drop`, `Examine`. Choosing `Examine` subsequently produced original chat text `It needs cleaning.` |
| Interface switching | **Observed pass** | Skills tab displayed authentic skill icons/levels and total level 43; switching is handled by the original client |
| NPC interaction | **Passed (user-confirmed)** | The player confirmed talking to NPCs and successfully interacting with them in the real original client. This supersedes the earlier automated attempts that could not reliably target moving actors |
| Banking | **Passed (user-confirmed)** | Player reports that banking works in the original Java client after testing it. Individual deposit/withdraw actions were not independently logged by Desktop Commander |
| Dialogue | **Basic NPC talking passed (user-confirmed)** | Player confirms NPC conversations and interaction work. Extended dialogue-option branching, multi-step advance/close and quest-specific dialogues remain unverified |
| Chat text input | **Observed pass after Enter fix** | First session: typed `phase2` but Java Enter did not submit. Browser-only NativeCanvas now maps DOM Enter 13 to Java AWT VK_ENTER 10; original gamepack and renderer unchanged. After rebuilding, sent `p2check`: original game showed the overhead chat bubble, a chat-log message and a cleared input (ignored screenshot `world-1791598354594-50921444.png`). Physical keyboard Enter has not been independently compared |
| Region transition | **Not verified** | Character moves normally, but no new region/base-coordinate or cache-region transition has yet been proven |
| Disconnect/reconnect | **Not verified** | Test after the sustained session, with a safe browser-only connection interruption and manual reauthentication where necessary; do not bounce the shared local game server |
| Native mouse / keyboard | **Observed pass for tested CDP actions** | World clicks, inventory context menu, skills tab, letter entry and rebuilt-client Enter chat submission all verified. Physical-keyboard differences and touch input remain out of scope |

<a id="doc-phase2-gameplay-verification--new-gameplay-defects-reported-after-endurance-test"></a>
#### New gameplay defects reported after endurance test

- **Combat: PASS (user-confirmed after fix).** The user retested attacking
  a rat with the rebuilt original Java client and confirmed it **no longer
  crashes**. Before the fix, the controller observed `phase:error`, with
  `LOGGED_IN` frozen at game cycle 20,525, zero presented FPS, and a
  `java.lang.RuntimeException; TypeError; null property: bxQ`. Sanitized
  frames begin `BQ1:21440:419 | CkQ:19055:476 | C2y:16675:225`.
  Bytecode inspection of the pinned source confirmed that `BQ1` is the
  original `au.as(Ldz;Ldh;IIIIIIB)V` hitsplat/actor overlay method and that
  `ym.aa` is its sprite-offset field. A narrowly scoped TeaVM-only build
  guard skips absent optional sprites in this original overlay, keeping the
  original Java drawing paths for any sprite that exists. The gameplay
  retest is the evidence for marking this issue resolved.
- **Static world scenery: NOW SHOWING (user-confirmed; repeatability pending).**
  Stairs, tables, cabinets, cooking ranges and other world objects were
  previously missing even while terrain, walls, player models and NPCs
  rendered. The player now confirms that objects are appearing in the
  castle. Treat this as a successful current-session observation, not yet
  proof that cold login, region transitions or all objects work every time. This is a *separate* scene/region-loc
  loading problem; the cause has not been verified. The existing cache has
  `main_file_cache.dat2` and numbered `idx` files, but file presence is
  not proof that the right map object archives decoded or spawned. Verify
  original scene object counts, cache archive decoding and
  server/client map-square expectations before modifying rendering.
  **Further diagnostic evidence:** In the user's loaded castle-area scene,
  the original Java gamepack reports 12,714 tiles, 1,570 walls, 460
  decorations, 4,151 ground objects and 974 game-object tile references
  across four map regions. None of the game objects has a null renderable,
  and 777 references have a direct `Model` renderable. References by plane
  are 286, 433, 210 and 45; these are not unique object totals. The four
  candidate castle-area map archive groups 12850, 12851, 13106 and 13107
  were read directly from the original `LIVE` cache and the server's
  `SERVER` cache. Their decoded terrain (file 0) and location placements
  (file 1) have matching SHA-256 values; the differences in whole compressed
  archives come from additional server-side files. This rules out
  mismatched location-file bytes in those four groups, **not** errors in
  scene placement or software model drawing. The root cause remains open.
  Attempts to query `Client.getObjectDefinition` for bulk object names in
  the browser were not supported by the diagnostic and were withdrawn;
  no object definitions or gameplay state were mutated. Use the safe
  scene-model counters until location/model drawing can be verified by
  targeted world actions.

  **Lumbridge Castle location-specific evidence (10 Oct 2026):** The user
  confirmed that the missing furniture and stairs are in the castle shown
  in the controller screenshot. A read-only local decoder of the original
  client `LIVE` map group 12850 found **1,614 location placements** in a
  fixed castle study area (x=3203..3234, z=3204..3233), including 135
  ground-floor game-object placements, 99 on floor 1, 74 on floor 2 and 2
  on floor 3. The unmodified archive explicitly includes ground-floor
  staircase placements at (3204,3207) and (3204,3229), kitchen-area
  placement at (3212,3215), and large object placements at (3212,3218)
  and (3212,3225). **The source map contains these records**, so the
  next question is whether the original client created the corresponding
  scene objects with usable face geometry. A browser-development-only,
  read-only `scene` command now provides castle-per-plane counts,
  empty-model counts and game-object/model-face counts at five fixed
  placement anchors. This never supplies replacement JavaScript scenery,
  never mutates the game cache, and never exports player coordinates or
  object IDs. **Those new measurements require a manually authenticated
  client after rebuilding; the root cause is not yet fixed.**
- **NPC actions: PASS (user-confirmed).** The player can talk to and interact
  with NPCs; this overrides the previous `Not verified` automation result.
  Banking has also been tested and confirmed working by the player.
  Longer dialogue chains and specific scene-object interactions still
  require independent verification.

**Do not mark an unobserved gameplay feature as passing based on test names,
server availability, a sent click, or the engine merely remaining logged in.**

<a id="doc-phase2-gameplay-verification--lumbridge-castle-original-scenemodel-decoding--further-evidence"></a>
#### Lumbridge Castle original-scene/model decoding — further evidence

A manually authenticated original Java client reported 561 wall placements,
247 wall decorations and 496 ground decorations in the fixed castle study
rectangle, exactly matching their original source-map categories. However,
the source map contains 310 large/game-object placements there while the
Java scene held only 121 game-object **tile references** (which are not
unique object placements). None of five fixed kitchen/furniture/staircase
anchor tiles held a game-object reference or rendered model. This is evidence
of an object creation problem, not a blanket inability to draw castle walls.

The original `LIVE` cache's configuration index 2, group 6 contains 62,522
location-definition files. Offline decoding of fixed source definitions
confirmed **Cooking range** (model 5274), **Staircase** (model 1237),
**upper Staircase** (model 1287), **Barrel** (model 1460) and **Suit of
armour** (model 1214). The referenced index-7 model archives all exist.
Crucially, the object definitions use the expected **rev-240 opcode 7**
(32-bit untyped model lists) or other valid opcodes, so converting old
16-bit opcodes is **not** an appropriate fix.

The runtime's first read-only original-definition probe reported the same
seven fixed definitions as present, but each had **zero** decoded model
references and the original `om.bk(10)` readiness method returned true.
That readiness result is vacuous if the decoded model list is empty.
This differs from what is in the original cache on disk. It does not
yet establish *why* the original Java loader has empty lists.

A more focused browser-only diagnostic now reports the **raw byte count**
returned by the original configuration archive lookup for eight fixed
object definitions, together with decoded model counts, typed-model
counts and readiness (the eighth is a typed-wall comparison). It
does not output raw cache bytes, coordinates, usernames, object IDs
or gameplay packets. **The raw-byte probe requires a new manually
authenticated session**, and its result has not yet been collected.
Until it has, do not blame the decoder, JS5 gateway, cache revision, or
renderer definitively, and do not modify the native cache to compensate.

<a id="doc-phase2-gameplay-verification--lumbridge-fountains-follow-up--11-october-2026"></a>
#### Lumbridge fountains follow-up — 11 October 2026

The player reported missing Lumbridge fountains. Read-only inspection of the
original LIVE cache located two definition-879 placements in map group 12850,
at (3221,3210) and (3221,3226), both ground-floor shape 10. Their definition
contains untyped model 1497, and that model archive exists in index 7.
The definition has opcode 78 (four bytes of rev-240 ambient sound metadata)
before opcode 7. `BrowserOriginalLocationModels` previously stopped at opcode
78, so its existing missing-model restoration did not reach the fountain's
model list. The browser-only helper now skips those four metadata bytes.
Original placement, sound, model and renderer logic are unchanged.

A fixed fountain-definition JVM regression fails against the previous helper
and passes after the change, including checks for preserved decoded lists,
typed definitions, truncated input and unknown prefixes. This proves the
restoration gap, not actual fountain visibility. **Authenticated screenshot
verification remains pending**, and other missing scenery remains open.

The subsequent [complete scenery decoding audit](#doc-scenery-audit) compared
all 62,522 original definitions with an isolated TeaVM build. It confirmed
26,136 remaining empty untyped model lists after the current helper, affecting
514 source placements in the four Lumbridge-area regions. This is offline
decoding evidence; authenticated scene construction and visual verification
remain outstanding.

<a id="doc-phase2-gameplay-verification--sustained-original-world-runtime-and-memory"></a>
#### Sustained original-world runtime and memory

A dedicated **20-minute** authenticated sampler started at
`2026-10-10T01:45:51.643Z`, requesting sanitized game state, original game
cycles, software frames presented, FPS and callback errors at approximately
10-second intervals. Its local JSON report is written to the ignored
`teavm-poc/target/engine/phase2-reports/` directory.

A separate **15-minute** Chrome-only memory sampler reads Windows process
private/working-set bytes for the **bridge-owned visible Chrome profile**
only, excluding other user browsing. The profile and session secrets are
never printed into public reports. These measurements are total Chrome-process
memory, not the TeaVM Java heap alone, and may fluctuate with Chrome's GC
and compositor. A monotonic rise would indicate a need for longer investigation,
not conclusively prove a leak.

<a id="doc-phase2-gameplay-verification--final-measured-results--failed"></a>
##### Final measured results — FAILED

The authenticated run **completed** and produced
`teavm-poc/target/engine/phase2-reports/phase2-1791597951654.json`.
It returned `FAILED_OR_INCOMPLETE` (exit 1), not `PASS_RUNTIME_ONLY`.

- **Duration:** 120 collected samples, about **19 min 53 s** between first
  and final sample (20 minutes requested).
- **Original world runtime:** median **24.6 software frames/s**, median
  **50.0 original game cycles/s**; original game cycle increased by 54,805
  and presented software frames increased by 27,197.
- **Performance degradation:** nine authenticated samples showed
  severe slowdown (software FPS below 5 or game cycles/s below 35),
  including shorter dips at approximately minutes 3.7 and 10.4. Around
  minute 18 a much longer slowdown dropped performance to roughly **1 FPS /
  10 cycles/s** and eventually **0.1 FPS / 1.1 cycles/s**. This is a genuine
  instability signal even without a Java callback exception.
- **Connection loss:** five samples were no longer `LOGGED_IN`. The game
  entered `CONNECTION_LOST` at approximately 19 min 13 s, then fell back to
  `LOGIN_SCREEN`. Client-thread telemetry remained present and callback
  errors stayed empty. **Automatic reconnection was not demonstrated.**
- **Clock evidence:** a subsequent sample showed an approximately **999 ms
  game-loop gap / 994 ms wait** rather than ~20 ms. Browser scheduling or
  background/minimized-window throttling is strongly suspected, but the
  session did not record `document.visibilityState` or focus, so this is not
  yet conclusively established. A repeat with the Chrome window visible
  **and focused** is required. Read-only focus/visibility telemetry was added
  after the run; the rebuilt title screen reported `visible` and `pageFocused:false`.
  This later observation does not establish its state during the earlier stall.

The **separate 15-minute visible Chrome memory monitor completed** with
44 samples, watching nine browser processes. Private-memory totals were
**1,029.7 MB initial, 1,058.6 MB final (+28.9 MB), peak 1,099.6 MB**.
Source: ignored `phase2-reports/chrome-memory-20261010-030341.csv`.
This does **not** demonstrate monotonic memory growth or prove a leak.
The totals include Chrome's other processes and cannot predict phone memory
consumption. JavaScript heap sampling was unavailable in the controller
process loaded for the **20-minute run**. After restarting the controller
and rebuilding the original Java client, the new allowlisted `heap` command
reported **173,611,940 bytes used (about 166 MiB)** in a separate
logged-in session. A single later heap reading is not a longitudinal
memory-leak test and is not combined with the 15-minute process-memory
series.

**Phase 2 sign-off is blocked:** nine severe authenticated performance samples,
late connection loss/timer throttling, and still-unverified
NPC/banking/dialogue/region/reconnect interactions. **Chat submission is
confirmed fixed in a new authenticated session** after the Java AWT Enter
adapter correction. That shorter second session does not replace the failing
20-minute endurance result.
Passing simulation and renderer checks for most of the run is not full
gameplay or mobile-device parity.

<a id="doc-phase2-gameplay-verification--reproduce"></a>
#### Reproduce

Start the normal SoloScape game server separately, then from `Mobile/`:

```powershell
npm run build:openosrs-engine
npm run dev:original-engine
node dev-bridge/controller-cli.mjs start
node dev-bridge/controller-cli.mjs initialize
node dev-bridge/controller-cli.mjs wait LOGIN_SCREEN
# Log in manually with a disposable test account in the owned Chrome window.
node dev-bridge/controller-cli.mjs wait LOGGED_IN
node dev-bridge/verify-gameplay.mjs 20
powershell -NoProfile -File dev-bridge/verify-chrome-memory.ps1 -Minutes 15
```

The controller can be started separately using
`npm run dev:desktop-controller`. The monitor is intentionally local-only.
Never commit screenshot artifacts, raw logs, cache files or private runtime
session descriptors. The user-provided native game cache and original Java
gamepack remain unchanged.
<!-- end-source-document: PHASE2_GAMEPLAY_VERIFICATION.md -->

---

<a id="doc-scenery-audit"></a>
## SCENERY_AUDIT.md

<!-- source-document: SCENERY_AUDIT.md -->
<a id="doc-scenery-audit--original-engine-scenery-audit--11-october-2026"></a>
### Original-engine scenery audit — 11 October 2026

<a id="doc-scenery-audit--repair-verification---11-october-2026-after-the-audit"></a>
#### Repair verification - 11 October 2026 (after the audit)

**The verified untyped model-list decoding defect is repaired in the Mobile
feature/mobile working tree.** BrowserOriginalLocationModels now skips
the pinned original's action opcodes 30-34, flags 21/22/62/64, variable sound
opcode 79, metadata opcode 93, and extended action formats 100/101/102.
The scanner remains byte-bounded, rejects malformed streams and never
replaces an already-decoded original model list. The arbitrary 160-opcode
limit was removed so valid large extended-action tables can reach their
model-list opcode.

Verification against the same pinned gamepack and original JVM corpus:

| Post-repair check | Result |
| --- | --- |
| Original JVM corpus | All 62,522 definitions checked; all 36,639 untyped model lists matched; **zero differences** |
| Isolated TeaVM-compiled original decoder and restoration helper | 62,522 definitions checked; 36,639 missing model lists before restoration; **zero model-list differences after restoration**, including typed-list lengths |
| Java regression tests | Cover each repaired opcode category, large extended-action tables and malformed/truncated prefixes |
| Full-corpus regression test | node --test tests/original-location-models.test.mjs runs the complete JVM reference check when the ignored local definitions.bin is available |
| Full Mobile test suite | 570 passed, 0 failed, 3 skipped |
| Production original-engine TeaVM build | Succeeded, generated JavaScript syntax verified; engine module smoke passed; engine remains compiled-unverified until authenticated gameplay checks |

The repeatable isolated TeaVM parity report is ignored diagnostic output at
teavm-poc/target/engine/scenery-audit/verification/teavm-parity.json.
The original cache, gameplay state and scene renderer were not modified.

**Still open:** authenticated original-client visual and scene-insertion tests,
including Lumbridge fountains/castle/church, vegetation, stairs, a region
crossing and a cold login. The Desktop Controller was not running when
checked after the repair, so no live scene-count or screenshot validation
was possible during this pass. The audit below is the **pre-repair baseline**;
its 26,136 missing definitions and 2,133,850 associated source placements
must not be interpreted as post-repair gaps. Zero decoder differences do
not by themselves prove screenshots, texture geometry or scene visibility.

---

<a id="doc-scenery-audit--result"></a>
#### Result

**More scenery decoding gaps remain after the Lumbridge fountain patch.**
An isolated TeaVM build of the original location-definition constructor loses
untyped model lists that the original JVM decoder retains. The current
`BrowserOriginalLocationModels` helper restores 10,503 of 36,639 such
definitions, leaving **26,136 definitions with missing model lists**.
This is a reproducible offline decoding defect, not a screenshot count of
invisible objects or proof that every affected placement is currently loaded.

The remaining definitions occur in **2,133,850 source placements across
2,428 region archives**. All these affected placements use shape 10 or 11,
the large/game-object shapes which use untyped model lists. Some are unnamed
scenery, and some can be hidden by normal plane, roof, visibility or game-state
rules. Do not equate this total with objects that a player should see at once.

No production decoder or renderer was changed during this audit. The previous
fountain patch remains in place; its definition now produces model 1497 in
the isolated TeaVM comparison, matching the JVM.

<a id="doc-scenery-audit--coverage-and-checks"></a>
#### Coverage and checks

Audited checkout: `feature/mobile` at `b2da8a04`.
Pinned revision-240 gamepack SHA-256:
`25f42961c400bd9dfff1554402441c0ba6d1cffd011163cb9b0b4c42ae194f85`.

| Check | Result |
| --- | --- |
| Original index-2/group-6 location definitions | 62,522 examined; original JVM constructor decoded all without errors |
| Definitions with typed model lists | 21,167; isolated TeaVM model IDs and typed-list lengths match the JVM |
| Definitions with untyped model lists | 36,639; TeaVM loses the original list before the compatibility helper |
| Definitions with no direct model list | 4,716; not automatically treated as missing scenery |
| Untyped lists restored by the current helper | 10,503 |
| Model-list differences remaining after restoration | 26,136; all empty lists, no wrong nonempty model-ID lists found |
| Referenced original index-7 model archives | 31,746 unique archives; all present, sector chains valid, containers decompressed to nonempty bytes |
| Region archives with successfully decoded location streams | 2,936 in each cache |
| Source placements examined | 4,980,884 in each cache; every definition ID exists in the audited original definition corpus |
| LIVE versus SERVER location-file comparison | All 2,936 decoded files have identical SHA-256 values |
| Region archives containing affected placements | 2,428 |
| Additional index-5 archive | Group 25287 has 37 three-byte files in both caches; file 1 is not a valid location stream, so this archive is excluded from region-placement totals |

The SERVER reference table has 3,241 groups versus 2,937 in LIVE. The additional
304 SERVER groups do not expose the combined file-1 location layout used by
these region archives. They are not counted as missing client regions merely
because the catalogs have different total group counts.

<a id="doc-scenery-audit--why-the-current-helper-misses-these-definitions"></a>
#### Why the current helper misses these definitions

The helper returns without restoring a model list when a valid prefix opcode
is not in its small allowlist. The complete corpus check against the actual
Java helper gives the following first rejection points:

| Prefix | Definitions blocked | Meaning |
| --- | ---: | --- |
| 30–34 | 10,954 | Object action strings before the model list |
| 22 | 6,419 | Merge normals flag |
| 21 | 6,189 | Terrain contour flag |
| 64 | 2,149 | Clipping flag |
| 62 | 423 | Rotation flag |
| 79 | 1 | Variable-length ambient sound metadata |
| 93 | 1 | Additional object metadata |
| **Total** | **26,136** | |

This is broader than another missing model archive or a fountain-specific
rendering issue. The verified failure is in the Java-to-JavaScript
definition-decoding/restoration path. The exact compiler or transformation
mechanism that loses the original untyped array is still to be localized;
the audit does not assign an unproven internal TeaVM root cause.

An initial secondary JavaScript cache decoder could not decode 67 definitions
containing opcode 101 and interpreted later repeated model lists differently
for 59 definitions. Those preliminary results were replaced with the original
JVM constructor as the authoritative reference. The final counts above include
all 62,522 definitions and do not rely on those incomplete decoder results.

<a id="doc-scenery-audit--lumbridge-and-examples-elsewhere"></a>
#### Lumbridge and examples elsewhere

| Original region group | Source placements | Placements using definitions with remaining model-list gaps |
| --- | ---: | ---: |
| 12850 | 4,726 | 136 |
| 12851 | 2,359 | 140 |
| 13106 | 1,247 | 116 |
| 13107 | 664 | 122 |
| **Total** | **8,996** | **514** |

Named affected definitions in these regions include castle winches, a closed
chest, drawers, a chest, a statue and plants; the church altar and organ;
signposts, a furnace and a rusted anvil; and nearby potatoes, hay, shelves,
crates, bushes, trees, cacti and rockslides. These are source-placement and
compiled-decoder findings, not individual authenticated visual observations.

Across the entire examined map corpus, named examples include:

| Name | Source placements using affected definitions |
| --- | ---: |
| Rockslide | 10,947 |
| Plant | 8,334 |
| Tree | 7,793 |
| Darkwood tree | 4,957 |
| Wheat | 2,836 |
| Hedge | 1,700 |
| Ladder | 1,594 |
| Crate | 1,257 |
| Barrel | 925 |
| Chest | 749 |
| Stairs | 721 |
| Table | 717 |

Names group multiple original definitions. Most affected placements are
unnamed scenery and are not included in this example table.

<a id="doc-scenery-audit--evidence-method-and-limits"></a>
#### Evidence method and limits

The audit read the original LIVE and SERVER caches without writing them.
It extracted the complete definition corpus and compared the original `om`
constructor on the JVM with an isolated TeaVM build of the browser-adapted
constructor and current restoration helper. Comparisons used exact model IDs
and typed-list lengths, not just definition names or archive existence.

The isolated harness suppresses the `om.oo` post-definition RuneLite hook so
an offline definition lookup does not require a running client callback.
That hook handles an icon field and a callback, not `ck`/`co` model lists.
The constructor's decoding instructions and restoration call are retained.
This harness is local diagnostic output only, not the production engine.

The audit does **not** prove model face geometry, textures, animation frames,
transform selection under every varbit/varp state, software drawing, scene
insertion, instance placement, roof clipping, cold-login behavior or region
transition behavior. Model container availability is not geometric/rendering
parity. No authenticated gameplay screenshots were obtained in this audit;
the existing controller session remained at STARTING with hidden-page telemetry.
Keep the broader missing-scenery issue open until original-client scene and
screenshot checks pass after repair.

Raw corpora, temporary harnesses and all measurements remain ignored under
`teavm-poc/target/engine/scenery-audit/`, principally:

- `original-decoder.tsv`: the complete original JVM reference.
- `teavm-decoder.tsv` and `teavm-comparison.json`: compiled decoder results.
- `report.json`: model availability, region counts and cache comparisons.
- `helper-rejections.txt` and `rejection-counts.json`: fallback rejection evidence.
- `teavm-decoder-build.log`: successful isolated TeaVM compilation.

The next repair should cover the verified prefix formats or correct the
underlying untyped-array loss, retain original cache/gameplay semantics, and
rerun this complete corpus comparison. Acceptance requires zero unexplained
model-list differences plus manually authenticated original-client scene and
screenshot checks, including Lumbridge, vegetation, stairs, a region crossing
and a cold login. Do not add substitute JavaScript scenery or rewrite model
opcodes in the original cache.
<!-- end-source-document: SCENERY_AUDIT.md -->

---

<a id="doc-original-npc-highlight"></a>
## ORIGINAL_NPC_HIGHLIGHT.md

<!-- source-document: ORIGINAL_NPC_HIGHLIGHT.md -->
<a id="doc-original-npc-highlight--original-engine-mobile-npc-tap-highlight"></a>
### Original-engine mobile NPC tap highlight

The mobile original-engine host implements the NPC portion of "Highlight entities
on tap" using the original cache setting `INTERACT_ENTITY_HIGHLIGHTS_DISABLED`
(varbit 13666, setting row 212). Zero enables it; a nonzero value disables it.
Selecting Talk-to, Attack, another NPC option, Examine, use-item, or cast-on-NPC
outlines the selected NPC's actual animated Java model. The browser presentation
uses a steady translucent cyan outline, without RuneLite's yellow/white/red flash.
The exact Jagex colour, thickness and selection lifetime remain unverified.

While enabled, touch NPC selections suppress their red click circle. Disabling
the original setting clears selection and restores the normal circle. Re-enabling
requires a new NPC selection. Ground movement keeps its yellow circle and other
interactions retain their existing feedback. Use the original All Settings search
for "Highlight entities on tap" where the mobile settings interface exposes it;
the actual UI visibility and persistence still require authenticated testing.

`OriginalMobileInteractHighlight` observes the injected client's original menu
and despawn events without consuming them. Walking, selecting another world
interaction or item action, despawning, disabling the setting and logout clear
the target. Selection survives the end of the player's interaction; it does not
automatically follow server-selected combat targets. The setting is sampled at
every scene draw, presented frame and input event. `BrowserEngineCallbacks.drawScene`
renders the outline in the original
software framebuffer before overheads and interfaces, at the same overlay layer
as RuneLite. The original gamepack continues to own all input and gameplay.
The mobile layout request also guards its scene-root lookup until `LOGGED_IN`,
avoiding an early-startup null scene while the game/cache server is unavailable.

`OriginalNpcOutlineRenderer` and `IntBlockBuffer` are copied from the pinned local
OpenOSRS RuneLite outline implementation, with BSD notices preserved. The browser
adaptation removes desktop dependency injection/Lombok, keeps the NPC entry point,
and writes directly to `BufferProvider` pixels rather than desktop AWT rasters.
Vertex projection buffers grow for larger models, with a 32,768-vertex bound.
The outline rasterizer remains RuneLite-derived with attribution, but RuneLite's
plugin lifecycle and colour animation are not used. Hover highlights, object
highlights and persistent NPC tagging are outside this NPC tap feature.

Validation: `npm run build:openosrs-engine`, `npm run test:openosrs-engine`,
`npm test`, and `npm run test:mcp:original-browser` against a running local
diagnostic. The JVM regression uses the pinned RuneLite API and real projection
and outline algorithm with a model fixture; it checks animated geometry, clipping,
the disabled-bit polarity, stable selection, NPC menu actions and selection clearing.
The tap-indicator regression checks that replacing an NPC marker preserves ground
feedback.

Authenticated NPC screenshots and sustained mobile performance still require
manual login; a successful compile or title-screen smoke does not prove those.

On 12 October 2026 the setting-controlled implementation passed the engine build,
module check and full suite (613 passed, 3 skipped). The bridge-owned Chrome smoke
reached the original resizable `LOGIN_SCREEN` without callback errors and closed
its own browser. The original setting's in-game UI, NPC appearance and sustained
gameplay remain unverified in Chrome.
<!-- end-source-document: ORIGINAL_NPC_HIGHLIGHT.md -->

---

<a id="doc-public-hosting"></a>
## PUBLIC_HOSTING.md

<!-- source-document: PUBLIC_HOSTING.md -->
<a id="doc-public-hosting--optional-external-mobile-hosting"></a>
### Optional external mobile hosting

Each server owner can opt into public access. The original revision-240 Java
client and existing native game server remain the game engine. Phones use
HTTPS and secure WebSockets at one address, without a phone VPN app.

The production entry point is separate from `run.bat` / `dev:original-engine`.
It exposes only the game page, fixed game resources, read-only cache snapshot,
public login key and WebSocket game stream. It does not expose MCP, controller,
session diagnostics, lifecycle collection or editable client configuration.
The upstream native game server is always `127.0.0.1`; public visitors cannot
choose another TCP target. Browser origins are restricted to the owner's URL,
not visitor IP addresses. Origin checks are not player authentication: the
original game server still authenticates accounts.

<a id="doc-public-hosting--direct-home-hosting-or-vps"></a>
#### Direct home hosting or VPS

Install Node (see package.json), dependencies with `npm ci`, and
[Caddy](https://caddyserver.com/docs/install). Build the engine with
`npm run build:openosrs-engine`, install the original cache and start the
SoloScape game server normally. From `Mobile/`, in PowerShell:

```powershell
$env:SOLOSCAPE_PUBLIC_ENABLE = '1'
$env:SOLOSCAPE_PUBLIC_ORIGIN = 'https://play.your-domain.com'
$env:SOLOSCAPE_PUBLIC_HOST = 'play.your-domain.com'
npm run start:public -- --check
npm run start:public
```

Keep that terminal running. In a second terminal in `Mobile/`, set the same
`SOLOSCAPE_PUBLIC_HOST`, then start HTTPS:

```powershell
$env:SOLOSCAPE_PUBLIC_HOST = 'play.your-domain.com'
caddy run --config hosting/Caddyfile --adapter caddyfile
```

Replace the example with a domain you control. Point its DNS A/AAAA records
to the host's reachable public IP. Allow inbound TCP 80 and 443 to Caddy in
the host firewall. At home, reserve the PC's LAN address and forward router
TCP ports 80 and 443 to that PC. With a VPS, configure its provider firewall.
Caddy obtains and renews the HTTPS certificate and proxies WebSockets.
See [Caddy's HTTPS requirements](https://caddyserver.com/docs/automatic-https).

Do not forward development ports 3097/43595, production upstream 8080,
or native server 43594 for browser access. Node deliberately binds the
production upstream to loopback; Caddy must run on the same machine.
Existing LAN firewall rules and the LAN launcher need no changes.

Optional environment settings: `SOLOSCAPE_PUBLIC_PORT` (default 8080, set
in both terminals), `SOLOSCAPE_GAME_TCP_PORT` (default 43594),
`SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT`, `SOLOSCAPE_ENGINE_PUBLIC_RSA_KEY_FILE`
(generated **public** client.key only). There is a 128-WebSocket global limit
and a 15-second deadline for starting the native handshake; each player can
use separate cache/game connections. This is a small-server baseline, not a
claim of DDoS protection or gameplay stability.

<a id="doc-public-hosting--if-router-forwarding-is-unavailable"></a>
#### If router forwarding is unavailable

CGNAT or ISP inbound restrictions prevent direct home hosting. An HTTPS tunnel
can instead target `http://127.0.0.1:8080`, preserving the configured public
Host header and WebSocket upgrades. Set `SOLOSCAPE_PUBLIC_ORIGIN` to that
tunnel's HTTPS origin. Tunnel only this production host, never the diagnostic
services. A tunnel still requires the home PC to stay online.

<a id="doc-public-hosting--verify-and-stop"></a>
#### Verify and stop

On a phone with Wi-Fi disabled, open the configured HTTPS address. Confirm
the original login screen, log in manually, then verify movement, chat and
reconnect. Local tests and `--check` cannot establish external reachability.
The initial page downloads the existing original cache (roughly 239 MB);
allow for mobile data usage and the host's upload bandwidth.

Stop Caddy and `start:public` with Ctrl+C to withdraw public access. Remove
router forwarding/firewall rules if no longer needed. LAN play remains
available through the usual launcher. No domain, tunnel or firewall is
automatically created by the public launcher.
<!-- end-source-document: PUBLIC_HOSTING.md -->

---

<a id="doc-dev-artifact-cleanup"></a>
## DEV_ARTIFACT_CLEANUP.md

<!-- source-document: DEV_ARTIFACT_CLEANUP.md -->
<a id="doc-dev-artifact-cleanup--local-development-artifact-cleanup"></a>
### Local development artifact cleanup

On 12 October 2026, the local `Mobile/` directory was reduced from 393.2 MiB
to approximately 136 MiB. About 257 MiB of obsolete generated material was moved
to Windows Recycle Bin. Emptying Recycle Bin releases the corresponding disk
space; the removed files remain recoverable until then.

Removed material: generated bytecode dumps, Caddy validation downloads, two old
compiled-engine backups, unused browser test profiles and duplicate generated
gamepack/API archives. Future builds can recreate their build intermediates.
The current engine, startup resources, local OpenOSRS input snapshot, sources,
TSPS dependencies, screenshots and verification logs were retained.

All 323 scenery investigation files were compressed into the local, ignored
`teavm-poc/target/engine/retained-diagnostics/scenery-audit-20261012.zip`.
Every archived file was checked against its original SHA-256 hash before the
expanded directory was removed. The model-list corpus remains available at
`teavm-poc/target/engine/scenery-audit/definitions.bin` for the regression test.
The current engine and corpus hashes were unchanged after cleanup.

To restore the expanded investigation records, run from `Mobile/`:

```powershell
Expand-Archive -LiteralPath teavm-poc/target/engine/retained-diagnostics/scenery-audit-20261012.zip -DestinationPath teavm-poc/target/engine -Force
```

Validation: all 20 local OpenOSRS input hashes, the original-engine module check,
`run.bat --check`, and the full suite (620 passed, 3 skipped) passed. The live
Chrome login-screen check could not complete while the native game server was
not listening on `127.0.0.1:43594`; the local page and gateway remained running.
This cleanup does not establish authenticated gameplay parity.

Keep `local-openosrs/`, the retained diagnostic archive and any needed ignored
records in a separate backup: Git does not contain those local files.
<!-- end-source-document: DEV_ARTIFACT_CLEANUP.md -->

---

<a id="doc-lan"></a>
## LAN.md

<!-- source-document: LAN.md -->
<a id="doc-lan--phone-access-on-your-local-network"></a>
### Phone access on your local network

Keep the Kotlin server running on port 43594. From `Mobile`, run:

```powershell
npm run dev:lan -- 192.168.0.129
```

Replace the address with your PC's current private IPv4 address. The launcher
binds HTTPS to that address on **3443** and the native WSS gateway on **43596**.
Cache, title, interfaces, diagnostics and account login use the configured WSS
endpoint. Existing desktop HTTP/WS listeners can continue running separately.
Only the exact HTTPS page origin is allowed through the gateway; its game TCP
destination stays on loopback. No router port forwarding is needed.

The launcher requires OpenSSL (Git for Windows includes it); set `OPENSSL_BIN`
if installed elsewhere. It creates a local CA and a server certificate with the
LAN IP in its subject alternative names. Certificates and private keys stay in
the ignored `Mobile/.lan` directory. Re-running reuses the CA and reissues the
server certificate when the address changes or expiration approaches.
Use `--setup-only` to generate certificates without starting listeners.

Transfer **only** `Mobile/.lan/soloscape-lan-ca.crt` to your phone through a
trusted local transfer. Do not transfer `.key` files. Compare the CA's SHA-256
fingerprint with the launcher's output before trusting it.

- iPhone/iPad: install the downloaded certificate profile in Settings, then
  enable full trust for **SoloScape LAN Local CA** under General → About →
  Certificate Trust Settings.
- Android: install it as a **CA certificate** in the device's security settings
  (the menu name varies by manufacturer), then use Chrome.

Device instructions: [Apple certificate trust](https://support.apple.com/en-gb/102390)
and [Google certificate installation](https://support.google.com/pixelphone/answer/2844832).
Certificate generation follows [OpenSSL's certificate request documentation](https://docs.openssl.org/3.4/man1/openssl-req/).

On the same home network, open **https://192.168.0.129:3443/** (substitute your
address). The browser should report a trusted connection before you log in.
If the page is unreachable, allow inbound TCP ports 3443 and 43596 in Windows
Firewall, scoped to your local subnet. In an administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName 'SoloScape LAN HTTPS and WSS' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3443,43596 -RemoteAddress LocalSubnet -Profile Any
```

Stop the launcher with Ctrl+C. To remove phone trust later, remove the CA/profile
in your phone's settings. This setup is for your trusted LAN; internet hosting
requires a publicly trusted certificate and deployment configuration.

The development preview watches its routing code and restarts automatically
when that code changes; the WSS gateway stays running. Refresh the browser after
an update. If a launcher started before this watch support reports "Failed to
fetch dynamically imported module", stop that launcher once with Ctrl+C, run
`npm run dev:lan -- 192.168.0.129` again, then refresh. An old preview process
can serve new source files with its old route table, making new imports return
404 even though the title screen still loads.

For manually managed certificates, both servers accept `SOLOSCAPE_TLS_CERT_FILE`
and `SOLOSCAPE_TLS_KEY_FILE`. The preview also accepts `SOLOSCAPE_PREVIEW_HOST`,
`SOLOSCAPE_PREVIEW_PORT` and `SOLOSCAPE_NATIVE_GATEWAY_URL`. A non-loopback preview
refuses to start without TLS; HTTPS requires a WSS gateway URL. The standalone
gateway retains its existing opt-in LAN/reverse-proxy configuration.
<!-- end-source-document: LAN.md -->

---

<a id="doc-openosrs-parity"></a>
## OPENOSRS_PARITY.md

<!-- source-document: OPENOSRS_PARITY.md -->
<a id="doc-openosrs-parity--whole-client-openosrs-parity"></a>
### Whole-client OpenOSRS parity

Requested baseline: the local OpenOSRS revision-240 client recorded in
`openosrs-reference.json`, with browser touch controls retained. The requested
connecting text, friendly offline error and black loading screen remain explicit
SoloScape requirements. They take precedence over reference presentation.

Rendering baseline clarified on 9 October 2026: the built-in RuneLite GPU
renderer is included; HD and other visual plugins are excluded. Exact parity
requires the same cache revision, scene state, camera, brightness and GPU
settings, followed by reference image comparisons. Passing unit/browser tests
alone is not evidence of whole-scene pixel parity.

<a id="doc-openosrs-parity--mobile-scene-parity-integration-9-october-2026"></a>
##### Mobile scene parity integration (9 October 2026)

The active `TeaVmWorldBridge` now reaches these implementations:

- Skeletal sequences use pinned cache bone hierarchies, inverse bind matrices,
  Maya curves, weighted vertices and alpha curves. Composition preserves bone
  weights; actors, animated scenery, portraits and spot effects use the shared
  loader. Classic animation remains supported. Runtime generation is reproducible
  with `npm run generate:tsps-skeletal`, with no additional npm dependency.
- Object morphs retain revision-240 varp/varbit selectors and fallback IDs,
  resolve authenticated interface/CS2 state, and rebuild child model parts,
  footprints, materials, names and actions. Null transforms disappear and can
  return. Picking and interactions retain the original placement ID. Cache
  failures retry, and rebuilds cancel obsolete animation continuations.
- Static merge-normal scenery joins original normal contributions across loaded
  region boundaries and eligible current/next-plane neighbours. Shared faces
  are hidden only where appropriate; ground contouring affects normals and
  matching. Classic object shade strengths populate shared physical-plane
  terrain grids before the final floor upload. These are cache-style terrain
  shadows; the built-in GPU baseline does not require an HD shadow-map pass.
- `REBUILD_REGION_V2` decodes the 4×13×13 chunk templates, loads distinct source
  maps, rotates floor metadata and object footprints, and interprets copied
  height opcodes relative to destination planes. Missing chunks inherit height
  seams. Destination-coordinate regions reach the same actor, roof, picking
  and scenery pipeline as normal maps. `REBUILD_WORLDENTITY*` remains unsupported.
- GPU shader settings now cover brightness, smooth/quantised banding, raw texture
  gamma, bright-texture lighting, colourblind correction and reference-style
  vertex fog (default depth zero), mipmaps and optional device-clamped anisotropic
  filtering. Actor tint windows are connected to decoded server updates.
  See `GPU_SETTINGS` for supported renderer configuration.

Focused fixtures and real Chrome WebGL pixels exercise these paths. They do
not substitute for authenticated phone testing or matched reference frames.
Remaining differences include native projection/clipping, exact scene extent,
occluders, complete reference zone/model transparency and special priority
render modes. Skeletal blending/interleave behaviour and all live content still
need reference checks. Performance must be measured on the same phone/view.

`TeaVmWorldBridge.capture()` exports a world PNG and a whitelisted cache,
scene/camera/settings/tick manifest. The comparison CLI rejects incompatible
metadata and dimensions, then reports pixel error. See [capture procedure](#doc-render-captures).
No matched RuneLite pair was available or produced during this implementation.
Public screenshots/videos are qualitative references; they do not establish
pixel parity. Earlier dated progress entries below describe their own change's
state and are superseded by this integration where explicitly listed above.

<a id="doc-openosrs-parity--indexed-mobile-transparency-9-october-2026"></a>
##### Indexed mobile transparency (9 October 2026)

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
modes, GPU settings parity, object shadows and joined normals, skeletal
animations, varp/varbit loc morphs and instanced worlds remain parity gaps.

<a id="doc-openosrs-parity--gpu-colour-interpolation-9-october-2026"></a>
##### GPU colour interpolation (9 October 2026)

The world shader now converts each untextured vertex's packed HSL into float
RGB using the reference `hsl_to_rgb.glsl` hue/saturation offsets and brightness
exponent, then interpolates RGB with perspective correction. This matches the
reference's default `smoothBanding=true` path, replacing interpolated packed
HSL and a quantised CPU palette lookup. The current brightness remains 0.8;
server/game brightness settings and the alternate banding setting are not wired.
Textured faces retain their separate non-perspective lightness interpolation,
and cutout texels below full opacity are discarded as in the reference fragment
shader. Chrome WebGL pixels verify flat colours against a float HSL oracle,
a triangle with three different hues against perspective RGB interpolation,
and partially transparent cutouts. This does not claim complete shader parity:
reference fog, projection, face bias, mipmapping and texture settings still differ.

This is an implementation tracker, not a declaration that the browser runs the
OpenOSRS engine. The active homepage uses `teavm-poc/site/title.html`,
`title-client.mjs`, `TitleLoginSession` and `TeaVmWorldBridge`. Improvements must
reach that path. The obsolete `browser/app.mjs` entry point has been removed.

<a id="doc-openosrs-parity--completed-first-integration"></a>
#### Completed first integration

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

<a id="doc-openosrs-parity--work-remaining-before-whole-client-parity"></a>
#### Work remaining before whole-client parity

<a id="doc-openosrs-parity--retained-actor-geometry-and-desktop-alpha-submissions-9-october-2026"></a>
##### Retained actor geometry and desktop alpha submissions (9 October 2026)

The active homepage now uses keyed actor/material VBOs instead of combining
all actor vertices into a new array each update. Immutable pose/facing geometry
is shared across movement, tile crossings and map regions; a shader translation
applies fractional position, region offsets and interpolated terrain height.
Movement alone skips vertex allocation and GPU uploads. Picking, alpha depth
sorting and fog/clipping use the same translation. Pose/facing/tint changes still
require the appropriate geometry; this is not GPU skinning or hardware instancing.
Legacy mesh consumers retain the existing CPU-translated snapshot API.

Desktop alpha now uses the same retained sorted element ranges as touch, removing
the desktop-only one-draw-per-triangle path without changing global face order.
Interleaved materials can still require separate draws. Animated placements keep
up to four recurring frame meshes, including world/picking snapshots, and clear
them on material/sequence replacement or scene unload. Longer cycles can still
miss this bounded cache.

Regression checks verify zero actor vertex uploads on movement/reordering,
cross-tile/region geometry equivalence, translated picking and alpha ordering,
recurring scenery reuse and resource cleanup. Chrome framebuffer comparisons
cover opaque, textured and translucent translated actors. The complete suite
passes 436 tests with Chrome and `--test-concurrency=1`; parallel execution hit
shared generated-module/timer failures. No same-view live FPS benchmark was run;
the earlier device samples below are historical rather than post-change results.

<a id="doc-openosrs-parity--mobile-performance-comparison-original-openosrs-gpu-vs-browser-webgl-9-october-2026"></a>
##### Mobile performance comparison: original OpenOSRS GPU vs browser WebGL (9 October 2026)

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

<a id="doc-openosrs-parity--javascript-cs2-interpreter-expansion-9-october-2026"></a>
##### JavaScript CS2 interpreter expansion (9 October 2026)

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

<a id="doc-openosrs-parity--whole-engine-compilation-progress"></a>
##### Whole-engine compilation progress

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

<a id="doc-openosrs-parity--rendering-implementation-status-9-october-2026"></a>
#### Rendering implementation status (9 October 2026)

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

<a id="doc-openosrs-parity--rendering-proof-still-required"></a>
##### Rendering proof still required

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

<a id="doc-openosrs-parity--validation-boundary"></a>
#### Validation boundary

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
<!-- end-source-document: OPENOSRS_PARITY.md -->

---

<a id="doc-original-engine-startup"></a>
## ORIGINAL_ENGINE_STARTUP.md

<!-- source-document: ORIGINAL_ENGINE_STARTUP.md -->
<a id="doc-original-engine-startup--original-openosrs-engine-startup--isolated-milestone-1"></a>
### Original OpenOSRS engine startup — isolated milestone 1

This is an **offline/local development diagnostic**, not the active mobile client,
a distributable OSRS build, or evidence of playable RuneLite parity.
The existing `npm run dev` homepage and `browser/teavm-world.mjs` are unchanged.

<a id="doc-original-engine-startup--what-is-wired"></a>
#### What is wired

- `teavm-poc/engine-src/EngineBridge.java` constructs the pinned rev-240
  `client`, supplies its `net.runelite.api.ClientConfiguration` **before**
  `client.initialize()`, and exposes startup stage/error and original
  `Client.getGameCycle()`/client-thread telemetry.
- `EngineConfiguration.java` implements the actual 1.12.x game-engine
  contract: codebase, named client parameters, and error reporting.
- All source remains compiled locally to the ignored
  `teavm-poc/target/engine/javascript/engine.js`. It is **not** imported
  by the public homepage or served by `browser/dev-server.mjs`.
- A separate loopback-only `scripts/run-original-engine.mjs` runs the
  diagnostic and native JS5 WebSocket gateway at `http://127.0.0.1:3097/`.
  The isolated HTTP host reads the original local `Server/.data/cache/LIVE`
  cache on demand, while browser memory contains a private writable copy.
  **Neither the user's native cache nor the pinned gamepack is modified.**
  The isolated `scripts/engine-smoke-server.mjs` still permits a minimal
  no-cache/no-network test.
- The diagnostic uses the original compiled engine and its Canvas 2D
  framebuffer. It does **not** instantiate `TeaVmWorldBridge`, inject
  synthetic game cycles, fabricate packets, or show placeholder world art.

<a id="doc-original-engine-startup--how-to-run"></a>
#### How to run

Use the exact pinned local gamepack/API described in `REFERENCE_OPENOSRS.md`.
On the development machine, from `Mobile/`:

```powershell
npm run verify:openosrs-reference
npm run build:openosrs-engine
npm run test:openosrs-engine
npm run dev:original-engine
```

Have the local SoloScape **native revision-240 JS5 server** listening
on `127.0.0.1:43594` (the existing server). Open `http://127.0.0.1:3097/`.
The original engine **initializes automatically on page load**; there is
no Initialize button or visible diagnostic panel. The original 765 × 503 Java
software framebuffer is fitted within the browser viewport without distortion
or changes to the renderer. Empty space around the canvas is black.
The game login remains manual. Startup uses
the pinned public parameters and, when launched with `npm run
dev:original-engine`, the loopback-only gateway routes automatically. The local development host
reads **only** `Server/.data/client.key` (the generated public RSA key), serves
its exponent/modulus on a loopback-only endpoint, and configures the pinned
original gamepack's login RSA before the original Java engine initializes.
The server's private `game.key` is never read or served by this harness.
`SOLOSCAPE_ENGINE_PUBLIC_RSA_KEY_FILE` can override the public-key path.
The event log reports only whether public RSA was configured, not key bytes.
The title diagnostic also supplies public `jav_config.ws` parameter **9**. The
original revision-240 gamepack writes this value into its login packet; leaving
it out caused a null-string crash (`bsU`/`bsX`/`bsY` across TeaVM builds).
This is public client bootstrap data, **not a password or session token**.
Original startup parameter **4** is the one-byte native login **client type**, not
its TCP port. For rsprot revision 240, `DESKTOP` is **1**. Setting parameter 4
to `43594` made the login header send `43594 % 256 = 74`, causing the server
to reject it as an unknown client type. TCP port `43594` belongs only in the
separately configured loopback gateway routes.
The original gamepack subsequently reached **`LOGGED_IN`** on the local SoloScape
server and rendered native terrain, buildings, the local player, minimap, chat
and game interfaces (manual Chrome evidence, October 2026). This is a genuine
original-engine login/world milestone, **not yet a stable gameplay pass**.
Original browser input events are delivered directly by `NativeCanvas`; there is no
desktop AWT event-dispatch thread. The browser `EventQueue` must therefore not
accumulate the original game's dummy post-draw `ActionEvent`. Before this
adaptation, `tq.afd` would wait up to 50 times per frame on an undrainable
queue; each one-millisecond browser sleep could be delayed to 12–16 ms,
drastically reducing actual frame presentation while game cycles caught up.
The fixed browser shim discards these desktop-only events and keeps the
original Java renderer and game tick loop unchanged. Title and gameplay FPS
must be remeasured in a visible Chrome window.

A following JavaScript null-string crash was traced to the pinned `af.fk` NPC
menu path, where a missing optional cache action was compared without a null
check. The TeaVM bytecode adapter now replaces only those two comparisons with
`NullSafeStrings.equalsIgnoreCase`; sustained authenticated gameplay still needs
manual verification. Do not use a main account password or expose this plaintext
loopback diagnostic over LAN or the internet.
The standalone title-only test host may omit RSA; never enter credentials there. It loads an in-browser
snapshot of `Server/.data/cache/LIVE`, then displays the actual gamepack's
RuneScape title screen with the original logo, background, welcome panel,
and **New User / Existing User** buttons. Do not enter account credentials
or tokens into diagnostic fields.

For repeatable Chrome **title framebuffer** verification:

```powershell
npm run test:original-title
```

The title-specific test locates Chrome automatically on the tested Windows
machine, uses the local pinned cache/JS5 server, captures
`teavm-poc/target/engine/captures/title/original-engine-canvas.png`, and
fails unless the genuine client state is `LOGIN_SCREEN`, the frame has
substantial image content, cycles advance, and no callback fatal is reported.
Use `CHROME_BIN`, `SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT`, or
`SOLOSCAPE_GAME_TCP_PORT` to override local installation paths.

For just the no-network engine-loop contract, set `CHROME_BIN` and run
`npm run test:original-browser`. Stop the interactive diagnostic before
running the title test, since both use the dedicated loopback WebSocket port.

The headless probe starts a separate ephemeral, loopback-only host. If needed,
supply `SOLOSCAPE_ENGINE_SMOKE_CODEBASE`,
`SOLOSCAPE_ENGINE_SMOKE_PARAMETERS` (JSON object of public string values), and
`SOLOSCAPE_ENGINE_SMOKE_GATEWAYS` (JSON array of host/port/WebSocket URL).
These variables are never baked into the client or written by the probe.
The test deliberately exits nonzero unless it observes **both** advancing
original `getGameCycle()` values and a changed original canvas pixel signature.

The normal SoloScape gateway requires a separate local server. A successful
byte-stream handshake does not establish game login, rendering or client parity.

<a id="doc-original-engine-startup--important-verification-boundary"></a>
#### Important verification boundary

There are multiple independent gates:

1. **Compiler:** TeaVM parses and emits the original gamepack (already works).
2. **Node host contract:** The module exports configuration/cycle methods,
   validates preflight setup, and explicitly rejects missing IndexedDB.
3. **Chrome initialization:** IndexedDB mounts, the original `client` is
   constructed, configured, and `initialize()` returns without errors.
4. **Real game-cycle progress:** `getGameCycle()` increases across samples
   and the original client's thread is present.
5. **Original framebuffer:** The original Canvas 2D pixels change after
   startup. Neither a synthetic render nor the custom JS renderer counts.
6. **Live gameplay:** Native revision-240 packets/authentication and
   interaction must be verified separately. This milestone cannot claim it.

The browser diagnostics print the precise startup step, parameter **names
and presence only**, and available Java exception details if Chrome
initialization fails. An `initialized` callback alone is not a gameplay pass.

**Verified on 9 October 2026:** the pinned engine compiles and imports.
Headless Chrome mounts IndexedDB and initializes the original client with the
public revision-240 startup parameters, including `7=0` (LIVE).
In an isolated **10-second stability run** (`SOLOSCAPE_ENGINE_STABILITY_MS=10000`),
`Client.getGameCycle()` advanced from **3 to 118**, the original client thread
was present, the original Canvas 2D framebuffer changed, and both initialization
and callback error strings stayed empty. The browser probe returned
`passed: true`; there were no synthetic cycles or custom gameplay renderer.

The local compiler normalizes thirteen duplicate-name/different-descriptor JVM
gamepack fields (without touching the pinned source); `BrowserEngineCallbacks`
provides built-in non-plugin callbacks; Java `java.vendor` defaults to
`Browser` if absent; the cooperative `ThreadPoolExecutor` accepts the legal
zero-core/one-maximum pool used by the pinned client. The local JVM field-collision
fixture and browser smoke tests guard against these regressions.

**Original title framebuffer visually verified, 9 October 2026.**
An isolated Chrome title-gated test returned `passed:true`, the native
`LOGIN_SCREEN` state, an active client thread, original cycles **3 → 35**,
**285 sampled framebuffer colors**, changed real Canvas2D pixels, and no
JavaScript exceptions or callback errors. The actual **765 × 503 PNG** showed
the pinned OpenOSRS RuneScape logo, original autumn hall background,
the brown framed welcome panel, and both New User/Existing User buttons.
The verified original-engine-generated capture lives locally at
`teavm-poc/target/engine/original-title-final-captures/original-engine-canvas.png`
(and can be reproduced with `npm run test:original-title` in the canonical
capture folder). No title art was substituted or regenerated. The decisive
fix was porting the desktop `Hooks.draw(MainBufferProvider,...)` final
software-buffer blit into the built-in `BrowserEngineCallbacks.draw`.

**Milestone 1 startup/title gate is complete for the isolated Chrome harness.**
This is visual verification from the authentic pinned client, **not** an
independent pixel-by-pixel comparison with a separately captured desktop
RuneLite title frame. It does not establish login, live server gameplay,
touch-device input, mobile deployment, or RuneLite GPU parity. Those require
their own milestones and test evidence.

No original gamepack, cache data or TeaVM-generated gamepack JavaScript is
tracked or intended for redistribution. Confirm legal permission before
shipping an adapted engine.
<!-- end-source-document: ORIGINAL_ENGINE_STARTUP.md -->

---

<a id="doc-protocol"></a>
## PROTOCOL.md

<!-- source-document: PROTOCOL.md -->
<a id="doc-protocol--tsps--soloscape-protocol-interoperability"></a>
### TSPS → SoloScape protocol interoperability

The browser now starts on a cache-backed title screen instead of a terrain
preview/development dashboard. Revision-240 cache index 10 supplies `titlewide.jpg`;
index 8 supplies the logo/title buttons/runes/mute sprites; indices 8/13 supply
bitmap fonts. The original TSPS fire and MIDI/Vorbis/legacy sample code is
adapted reproducibly with retained BSD attribution. `scape main` is resolved
by name in index 6 and uses actual instrument/sample groups, with a static
same-origin AudioWorklet. User activation starts audio; login stops it, and
disconnect restores the title. F10 reveals diagnostics without reducing the
game viewport. Live title assets, 17,541 MIDI events, 13 patches and 94 decoded
samples were verified; desktop and 390×844 phone-layout browser checks passed.

Status: **native revision-240 browser login, player/NPC updates and server-driven interface lifecycle implemented; TSPS protocol remains incompatible**. Synthetic account login is verified against the installed rsprot decoder and gateway. A real local authentication and game packet stream were previously observed, and the NPC renderer has now been confirmed working in a live local client. Native OPNPC_V2 primary interactions and OPNPC6 Examine are implemented and fixture-tested, with live interaction still awaiting confirmation. The HTML mock menu was replaced with canvas menu rendering based on the pinned client Choose Option code; it loads original b12_full glyphs and metrics from revision-240 cache indices 8 and 13, group 496. The full TSPS interface menu system is not yet ported.

The authenticated packet dispatcher now consumes `IF_OPENTOP`, `IF_OPENSUB`,
`IF_CLOSESUB`, `IF_MOVESUB`, `IF_RESYNC_V2`, `IF_SETTEXT`, `IF_SETHIDE`,
`IF_SETCOLOUR`, `IF_SETSCROLLPOS`, `IF_SETPOSITION` and `IF_SETEVENTS_V2`.
Their byte permutations match the installed revision-240 rsprot encoders.
Resync mounts/events are decoded completely before replacing state. Update
and mount counts are bounded; assets load asynchronously from verified index 3.
Event ranges preserve the wire's `65535` = `-1` component sentinel; only
the base widget's `-1` permissions and dynamic dialogue-choice child IDs are
used (item slots are not drawn).

Native IF1 buttons use opcode 11 with a big-endian combined widget ID;
IF3 buttons use opcode 1 with ID, big-endian sub/item IDs and operation 1..10
(nine bytes). Continue uses opcode 82 with a big-endian widget ID and
`g2Alt3` sub ID; modal close uses opcode 98 with no payload. ISAAC framing
belongs to `NativeGameSession`. Primary IF3 actions require a cache action
label and the corresponding server event bit. Pause-button permission bit 0
enables Continue and dialogue choices; each sends its own child ID and is
blocked from repeating until the next page. Fixture, real-browser
canvas and JVM interoperability tests pass; live account/phone interface
behaviour has not yet been established.

<a id="doc-protocol--native-interface-rendering-scope"></a>
#### Native interface rendering scope

The native browser can fetch and decode real IF1/IF3 component groups from
revision-240 interface cache index 3, including parent linkage, alignment and
static text/sprite/rectangle/line widgets. Sprites are verified index-8 assets,
and typography is drawn from the cache's original index-8/13 bitmap fonts.
The developer interface-group preview is read-only; it does not open a
server-owned interface or execute CS2. Authenticated dialogue executes verified
scripts 58 (choice builder), 600 (text alignment), 2379 (background reset) and
their supported dependencies with bounded decoding/execution. Varp updates
feed script varbit reads. The native dialogue branch of chatbox scripts
113/923 reveals group 162's modal/background hosts for groups 217/219/231
and hides history until close; other chatbox script branches remain unported.
`IF_SETNPCHEAD`, `IF_SETNPCHEAD_ACTIVE`, `IF_SETPLAYERHEAD` and `IF_SETANIM`
select real cache head parts and animations. The software portrait renderer
uses cached colours/textures and parent clipping. General listeners,
varbit-transformed NPC heads, inventories, item models and chat input/history
remain unsupported. Live cache choice scripts and animated NPC heads passed;
authenticated dialogue and physical-phone validation remain outstanding.

<a id="doc-protocol--audited-versions"></a>
#### Audited versions

- TSPS pinned at [`b9ca431be440174fce5adf0efbb7afa992358916`](https://github.com/RSPSApp/tsps/commit/b9ca431be440174fce5adf0efbb7afa992358916). Its `server/target.txt` is `osrs-241_2026-09-30`.
- SoloScape's Kotlin server `Server/AGENTS.md` and `Server/README.md` document revision `240.2` and networking via `net.rsprot.protocol.api.NetworkService`.
- Actual deployed SoloScape revision/ports/cache must be confirmed from local `game.yml` and generated/runtime data; documentation may not match a given deployment.

<a id="doc-protocol--wire-level-mismatch-verified-from-source"></a>
#### Wire-level mismatch (verified from source)

| Dimension | TSPS client | SoloScape server |
| --- | --- | --- |
| Transport | Browser `WebSocket` / WebRTC game channel (`client/network/serverConnection/connection/init.ts`) | `rsprot` Netty network service on configured raw TCP `config.gamePort` (`Server/api/net/.../NetworkFactory.kt`) |
| Session hello | Proprietary binary `HELLO=200`, null-terminated client/version (`client/common/packets/ClientPacketId.ts`, `ClientBinaryEncoder.ts`) | Native OSRS login/JS5 handshakes via `rsprot`, not TSPS HELLO |
| Login | Proprietary `LOGIN=204`: null-terminated username and password followed by 32-bit revision in clear inside the game channel | `rsprot` login block with RSA/cryptographic native login path, password or token auth, plus server-side account verification (`ConnectionHandler.kt`) |
| Client movement | TSPS `WALK=210`, x/y shorts + flags byte | Native OSRS movement packets decoded into `MoveGameClickHandler`/`MoveMinimapClickHandler` |
| Outbound packets | Custom packet IDs (e.g. `LOGIN_RESPONSE=3`, `PLAYER_SYNC=20`, `REBUILD_REGION=140`), defined in `client/common/packets/ServerPacketId.ts` | Native OSRS server packet encoders under `rsprot` |
| Cache | OpenRS2-based cache target 241, client-side JS5 and interface definitions | SoloScape cache 240.2 in server configuration/docs, with custom gamevals and generated data |
| UI | TSPS uses its own React/WebGL interface model plus browser host dependencies | Server sends native OSRS interface IDs/scripts and revision-specific CS2 |

TSPS's numeric packet IDs and lengths are **not** interchangeable with native OSRS packet opcodes. A WebSocket wrapping raw TCP does **not** perform semantic packet translation. Blindly passing TSPS login bytes would risk exposing account credentials to an unintended protocol parser; the gateway therefore rejects the first TSPS frame.

<a id="doc-protocol--implemented-in-this-branch"></a>
#### Implemented in this branch

- Pinned TSPS source as a submodule.
- A configurable browser launcher with explicit server/cache URLs, secure-build checks and tests.
- `Mobile/gateway/`: an opt-in, fixed-upstream, binary-only WebSocket-to-raw-TCP transport for clients that already speak native OSRS. Includes explicit origin checks, first-frame native handshake gating, message/queue bounds, backpressure and integration tests with a mock TCP server. Rejects the TSPS 200 HELLO before connecting to upstream.

The gateway currently recognises initial native login / JS5 byte candidates `14, 15, 16, 18`. **This is a transport safety allowlist, not a validated rsprot implementation.** Confirm the exact native revision-240 handshake with real rsprot before production usage. Do not infer successful game login from an echo test.

<a id="doc-protocol--confirmed-native-rsprot-revision-240-js5-request-framing"></a>
#### Confirmed native rsprot revision-240 JS5 request framing

Inspected the upstream [rsprot `InitJs5RemoteConnectionDecoder.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/codec/InitJs5RemoteConnectionDecoder.kt) and [`LoginClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/prot/LoginClientProt.kt):

- Login opcode: `15` (`INIT_JS5REMOTE_CONNECTION`).
- Fixed payload length: **20 bytes**.
- Layout: 4-byte big-endian **revision** followed by **four 4-byte seed integers** (16 bytes).
- Total request size: **21 bytes**. No length prefix in this fixed-size message.
- The `Mobile/gateway/js5-probe.mjs` implementation now sends this complete request; it generates 16 random seed bytes and logs **no seed material**. The incomplete former implementation wrote only opcode + revision (5 bytes), which leaves rsprot waiting for the remaining 16 bytes and causes a timeout.
- rsprot's `LoginChannelHandler.kt` compares the revision to `RSProtConstants.REVISION`, validates the JS5 source via its address validator, then writes a login response. A successful initial handshake is not proof of completed cache transfer or gameplay.

The user confirmed a local Java 21 process listening at `127.0.0.1:43594` and local `Server/game.yml` setting `game-port: 43594`, `revision: 240`. An initial **five-byte** probe timed out; repeat using the corrected **21-byte** probe before inferring anything about deployed JS5. This observation is not evidence that login works.

<a id="doc-protocol--native-game-init-pre-authentication-framing"></a>
#### Native game-init pre-authentication framing

The rsprot revision-240 [`LoginClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/prot/LoginClientProt.kt) defines `INIT_GAME_CONNECTION` as opcode **14**, fixed payload **0**. [`LoginChannelHandler.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-api/src/main/kotlin/net/rsprot/protocol/api/login/LoginChannelHandler.kt) issues `LoginResponse.Successful(sessionId)` after address validation. The revision-240 response encoder writes opcode **0** and then an **8-byte** session ID for this flow. `Mobile/gateway/game-probe.mjs` checks the full nine-byte response (including TCP fragmentation), never exposes the session ID, and never sends credentials. This probes a native TCP endpoint, not the TSPS custom WebSocket protocol. The server's live response must be tested separately from CI mocks.

<a id="doc-protocol--verified-local-native-pre-authentication-behavior-8-october-2026"></a>
##### Verified local native pre-authentication behavior (8 October 2026)

The local user confirmed the Java 21 SoloScape server with `game-port: 43594` and `revision: 240` returns **response 0** to the corrected 21-byte native JS5 request and **response 0 plus a session ID** to the one-byte native game-init request. Neither request sent any account credentials. These are observations of the direct TCP port, not the WebSocket gateway or TSPS.

`Mobile/gateway/gateway-probe.mjs` now checks both same requests end-to-end through our native WebSocket gateway, using two independent WebSocket sessions and a fixed `Origin`. Its mock-backed integration tests verify forwarding while not leaking the session ID in the result. Live gateway probing is still pending.

<a id="doc-protocol--bounded-js5-master-index-transport-milestone"></a>
#### Bounded JS5 master-index transport milestone

Revision-240 rsprot [`Js5ClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/js5/incoming/prot/Js5ClientProt.kt) declares `URGENT_REQUEST` as opcode 1, payload length 3; its [decoder](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/js5/incoming/codec/UrgentRequestDecoder.kt) reads archive u8 and group u16. [`Js5Service.getMasterIndex()`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-api/src/main/kotlin/net/rsprot/protocol/api/js5/Js5Service.kt) reads provider group `255:255`; `prepareJs5Buffer()` prefixes archive+group and inserts `0xFF` every 512-byte wire block as continuation.

The `Mobile/gateway/js5-cache.mjs` implementation makes one **pre-authenticated** JS5 connection, requests the `255:255` master-index group (`01 ff 00 ff`), reassembles a bounded cache container and returns it **in memory only**. The CLI reports the length, compression and SHA-256, without writing cache files or decompressing/rendering them. Mock TCP↔WebSocket integration tests check segmented responses, wrong IDs, invalid continuation blocks, unsafe lengths, timeouts and Origin rejection. This is the first real *cache delivery* diagnostic but not a complete revision-240 asset loader. Live result still requires a running SoloScape server + gateway.

**Native browser login is now implemented** in `browser/native-login.mjs`, using the desktop revision-240 format accepted by `Server/api/net/.../NetworkFactory.kt`. It uses the generated public `client.key`, raw RSA password/OTP authentication, XTEA login fields and independent ISAAC game ciphers. The gateway remains a byte transport; TSPS's proprietary `LOGIN=204` is still incompatible. Plaintext WebSockets are limited to loopback; remote connections require `wss://`.

<a id="doc-protocol--native-account-login-wire-contract"></a>
##### Native account login wire contract

The source baseline is installed `net.rsprot` **1.0.0-ALPHA-20260912**, checked against [rsprot source 5144f569](https://github.com/blurite/rsprot/tree/5144f569d41a7c2cf77f2b44a8d6e5bca41366d0).

1. Send opcode 14 and await response 0 plus the complete eight-byte session ID.
2. Send opcode 16, u16 payload length, revision 240, subversion 1, server version 0, desktop client type 1, default platform 0 and external authenticator 0.
3. The u16-length RSA block contains check byte 1, four cryptographically random seed words, the server session ID, OTP mode (none or untrusted six-digit code), and password authentication. Ciphertext includes Java BigInteger's positive sign byte when needed.
4. XTEA encrypts complete blocks in the remaining payload, retaining an incomplete tail. Fields include username, resizable viewport dimensions, ephemeral 24-byte identifier, neutral platform statistics and the 23 cache-index CRCs from the same server's master manifest. CRC order and byte transforms match `DesktopLoginCrcDecoder`.
5. Handle optional response 69 SHA-256 hashcash and reply 19 with an eight-byte nonce. Challenge type/version, size, difficulty, work duration and cancellation are bounded. The shared 1,024-byte challenge limit accommodates rsprot's default salt (495 random bytes encoded as hexadecimal plus timestamp/world); the earlier 512-byte limit rejected the live server's 1,007-byte challenge before solving. Tests cover full-size salts through the gateway and Chrome, byte-by-byte challenge fragmentation, and rejection outside the size bounds.
6. Response 2 advertises size 37, followed by 34 bytes of account metadata. The next bytes are the first game packet header, not additional account metadata. Trusted-computer token bytes consume four inbound ISAAC words only when their flag is set; tokens and account hashes are not persisted.
7. Client-to-server ISAAC uses the four original seeds; server-to-client ISAAC uses each seed plus 50. All 151 supported server opcodes use the generated revision-240 framing table, including encrypted one/two-byte smart headers and fixed/u8/u16 lengths. Global player updates decode the four aligned GPI passes, appearance/customisation masks, server movement, rebuilds, plane transitions and classic cache-backed idle/walk/run animation. Ground clicks send server-authoritative `MOVE_GAMECLICK`; collision and pathfinding remain server-owned. Instanced region templates, NPCs, interfaces and chat are not part of this milestone. Encrypted `NO_TIMEOUT` packets keep the connection alive; disconnect clears pending credentials and cipher buffers.

`npm test` covers independent Node RSA decryption, known XTEA vectors, JVM ISAAC vectors across eight refills, real gateway fragmentation/coalescing, OTP token cipher alignment, SHA-256 challenges, rejection, timeout and cancellation. With `CHROME_BIN` set on Windows, a real Chrome session also completes this flow through the actual gateway using synthetic credentials. `npm run test:rsprot` runs both password and OTP packets through the installed JVM decoder and compares every generated packet definition. No production credentials, private keys or game payload captures are committed.

Live revision-240 JS5 and game-init handshakes passed through the local gateway, and the live master manifest supplied all 23 login CRCs. The generated public RSA configuration also validated. The user authenticated a real native session and received 506 game packets; the new decoder handles player/region payloads and server movement. Reconnect, token/SSO authentication, instanced regions, NPCs, interfaces and chat remain subsequent work.

<a id="doc-protocol--live-cache-group-result-and-metadata-interpretation"></a>
##### Live cache-group result and metadata interpretation

The user completed `npm run probe:cache` on **8 October 2026**, using their
revision-240 SoloScape Java server through the local WebSocket gateway. Native
JS5 master-index group `255:255` returned 205 bytes of cache container,
compression 0 and 200 bytes of uncompressed payload. SHA-256 of the in-memory
container: `d45568eb3b832e4794eb58dcca479b815ce93b63422ad2bafc976355c2c52f6b`.
No cache files were written. This is **verified live cache metadata transfer**
but not a complete asset loader.

In the traditional CRC/version master-index format each archive entry is
8 bytes (CRC32 plus reference-table version). The 200-byte result is
consistent with 25 entries. `Mobile/gateway/js5-master-index.mjs` parses
that bounded uncompressed layout. It performs structural parsing **only**;
no CRC comparison against reference-table groups has been implemented and
the bytes may not be compatible with TSPS's revision-241 cache conventions.
The next cache milestone is to download one selected archive reference
table `255:<archive>` and cross-check its container CRC/version metadata.

<a id="doc-protocol--cross-checking-one-archive-reference-table-checksum"></a>
##### Cross-checking one archive reference-table checksum

In the [upstream OpenRune cache provider](https://github.com/OpenRune/OpenRune-Server/blob/main/or-cache/src/main/kotlin/dev/openrune/net/CacheJs5GroupProvider.kt), the master index `255:255` is the `cache.versionTable`, and archive reference-table sectors `255:<index>` are transmitted with `stripVersion = false`. The underlying [`VersionTableBuilder`](https://github.com/OpenRune/OpenRune-FileStore/blob/main/filesystem/src/main/kotlin/dev/openrune/filesystem/util/secure/VersionTableBuilder.kt) places each sector's standard CRC32 and version at offsets `5 + index * 8` in the master-index cache container. The [`CRC` implementation](https://github.com/OpenRune/OpenRune-FileStore/blob/main/filesystem/src/main/kotlin/dev/openrune/filesystem/util/secure/CRC.kt) implements standard CRC32; the reference-table sector CRC is over the complete container bytes, including the compression header, without excluding any trailing bytes.

`Mobile/gateway/js5-reference-verify.mjs` validates group `255:0` (the first archive reference table) against the CRC32 stored in the freshly fetched master index. A separate `npm run probe:cache:verify` diagnostic performs the two bounded in-memory downloads and **exits with failure on mismatch**. Tests cover canonical CRC32, metadata pair layout, compressed containers, gateway forwarding, corruption, Origin rejection, and index bounds. The version field is printed but **not independently verified**. The live reference-table CRC result is **not yet known**.

<a id="doc-protocol--revision-and-reference-table-header-validation"></a>
##### Revision and reference-table header validation

On 8 October 2026, the live `255:0` reference-table group was received through the WebSocket gateway (107,328 bytes), and its standard CRC32 (`0x05cf8665`) matched the master-index entry. The master-index revision field was `1790003854`, but **its independent verification is pending**.

The upstream [OpenRune `ReadOnlyCache.archiveData`](https://github.com/OpenRune/OpenRune-FileStore/blob/main/filesystem/src/main/kotlin/dev/openrune/filesystem/ReadOnlyCache.kt) parses cache reference-table formats 5–7. Formats 6–7 include an embedded 32-bit revision after the format byte; v7 then encodes archive counts and delta IDs with big-smart integers. The new `Mobile/gateway/js5-reference-header.mjs` performs bounded gzip decompression (or accepts an uncompressed container), checks the declared length, parses only the header and archive-ID deltas, and lets the CLI **reject a mismatch** between embedded and master-index revision. It does not parse archive file manifests, perform cryptographic verification, persist cache bytes, or render game assets. Run the live probe again to validate this header/revision check.

<a id="doc-protocol--first-real-archive-0-group-data-verification"></a>
##### First real archive-0 group data verification

With the upstream OpenRune `ReadOnlyCache` format-7 reference table,
the archive-group IDs are delta-coded big-smart integers, optionally
followed by the same number of 32-bit name hashes (flag 1), and then
32-bit group CRCs. `Mobile/gateway/js5-reference-header.mjs` now has a
bounded optional `decodeReferenceTableGroupCrcs()` extractor. The
`fetchJs5Archive0Group()` function requests one group in **archive 0
only** and retains the same 2-MiB compressed-container ceiling as our
metadata probes. `verifyArchive0GroupCrc()` compares CRC32 of the **full
JS5 cache container** received (the server's underlying provider removes
the trailing two-byte sector version for archive data) with the catalog CRC.

`npm run probe:asset` performs three independent WS-to-native JS5
transfers: master `255:255`, index-0 reference `255:0`, then the
first listed archive-0 group (expected `0:0`). Each metadata integrity
check precedes the asset request; the data remains in memory only.
This is an intentionally narrow initial test, not a reference-table
or asset decoder suitable for TSPS, and it is **not yet verified live**.

<a id="doc-protocol--browser-native-cache-service-renderer-integration-groundwork"></a>
##### Browser-native cache service: renderer integration groundwork

User's final standalone live JS5 test on **8 October 2026** successfully
retrieved archive-0 group `0:0` over the native WS gateway; the **196-byte**
cache container matched CRC32 `0x68527d89` in archive 0's verified
format-7 reference table. This closes the planned TCP/WebSocket/JS5
diagnostic phase without establishing a playable game client.

The actual **browser-side** asset-loading service now lives in
`Mobile/browser/native-js5.mjs`, with a small loopback-only browser
development shell. It performs 21-byte native JS5 handshake, strict
512-byte group framing, master-index validation, per-index CRC/revision
checks, browser-native gzip metadata parsing, and group CRC checks.
Its reusable `NativeJs5Cache.loadIndex()` and `loadGroup()` methods
return in-memory JS5 cache-container bytes; no copies of licensed cache
assets are committed or written by this service. Integration tests use
Node `ws` only to simulate browser WebSockets against a mock native TCP
server through the real gateway, and do **not** replace an actual mobile
browser smoke test.

The pinned TSPS renderer already has `CacheIndex`, `CacheStore` and
`ReferenceTable` abstractions in its own revision-241 cache pipeline.
A real renderer integration must adapt these **revision-240 verified
containers** to those interfaces (and reconcile revision-specific
decoding, metadata, XTEAs and asset formats); merely changing the TSPS
game server URL to the raw WS gateway will not work. TSPS proprietary
HELLO/LOGIN remain blocked. The separate native browser login flow above
provides encrypted account authentication; the TSPS shell cannot use it directly.

<a id="doc-protocol--typed-array-cache-store-bridge-for-tsps-decoder-integration"></a>
##### Typed-array cache store bridge for TSPS decoder integration

Live browser user confirmation (8 Oct 2026): revision-240 master index,
archive-0 reference catalog (10,948 groups) and archive group `0:0`
(196 bytes) were successfully downloaded and validated in a **real
browser**, not only in Node integration tests.

The pinned TSPS `client/rs/cache/CacheIndex.ts` defines
`CacheIndexDat2.fromStore(id, store)`, which calls
`store.read(255, id)` synchronously to decode a reference table.
`CacheStore.read(indexId, archiveId)` returns an `Int8Array` of the
**complete compressed container**, and subsequent archive-group decode
calls `store.read(id, archiveId)`. The new isolated
`browser/TspsCacheStoreAdapter` implements this exact structural
read contract with preloaded verified native JS5 groups. It maintains
full reference-table containers separately from group containers,
rejects missing groups without implicit network or data substitution,
and returns defensive `Int8Array` copies for compatibility with TSPS
ByteBuffer. Preloading remains asynchronous; the synchronous method is
only valid for previously verified containers. This still needs
integration into TSPS's actual loader and revision-240 decoder review,
especially reference-table flags and asset format/version differences.

<a id="doc-protocol--first-graphical-asset-decoding-isolated-canvas-preview"></a>
##### First graphical asset decoding (isolated Canvas preview)

The upstream TSPS [`SpriteLoader.load()`](https://github.com/RSPSApp/tsps/blob/b9ca431be440174fce5adf0efbb7afa992358916/client/rs/sprite/SpriteLoader.ts)
parses indexed sprites with a final sprite count, image dimensions,
per-frame offsets, a 24-bit palette, row/column pixel order and optional
alpha. `Mobile/browser/sprite-preview.mjs` provides a bounded compatible
decoder and Canvas RGBA painter; the real sprite bytes come only from the
CRC32-validated native JS5 revision-240 archive index 8. The cache
reference-table parser also checks file counts/IDs and selects only
**single-file** groups for this initial rendering path, avoiding
assumptions about multi-file archive chunk packing.

The browser UI offers `Render verified SoloScape sprite`, which retrieves
up to 8 candidate groups from the verified sprite catalog, decodes the
first supported frame, and draws the **actual game asset** as a bitmap
(Canvas, not TSPS's WebGL scene renderer). There is no fallback fake
graphic and no need for another standalone JS5 probe. The live
sprite-rendering outcome is **pending**.

<a id="doc-protocol--native-browser-scene-renderer-implementation"></a>
##### Native browser scene renderer implementation

`Mobile/browser/terrain-world.mjs` implements the actual
revision-240 OSRS map terrain decoding path (not a probe): it resolves
`mX_Y` through the signed 31x DJB2 name hash of archive/index 5,
fetches the CRC-verified terrain group, uses the 16-bit terrain opcodes
of TSPS `SceneBuilder.newTerrainFormat` (rev 209+), and reconstructs
four planes of height/underlay/overlay metadata. Base tile heights use
the same noise/interpolation algorithm as pinned TSPS `HeightCalc`.
The first native WebGL viewport draws real geometry with orbiting and
camera panning and provisional material tints. Index reference-table
CRC and revision, plus terrain group CRC, are checked by
`NativeJs5Cache` before decoding. No map objects, region player
state, ISAAC/RSA login or TSPS proprietary protocol are sent.

As of this implementation `npm run dev` starts the new native WebGL
client; the diagnostic UI is moved to `/diagnostics`.
`npm run dev:tsps` retains the incompatible original TSPS launcher for
reference, not for playable SoloScape authentication. Live WebGL
terrain visualization still needs confirmation on the user's
revision-240 server, while CI validates synthetic map and mesh
fixtures. This work is client construction, not a new stand-alone
network probe.

<a id="doc-protocol--map-index-availability-and-packed-multi-file-group-support"></a>
##### Map index availability and packed multi-file group support

The initial live native WebGL client failed with `No single-file
terrain map group for region 50,50`. This happens after loading
native index-5 reference metadata; it must not be presented as a
WebSocket or game-server outage. OSRS map archives can have more than
one file. The map reference parser now retains the group file IDs;
the terrain loader supports the native single/multi-chunk archive
table, extracts only unencrypted terrain file ID 0, and verifies
bounded lengths. On initial startup it can choose the closest
actually catalogued named `mX_Y` terrain region when the default
m50_50 is missing; manual travel remains exact. No additional
standalone probes and no fabricated region data.

<a id="doc-protocol--terrain-tile-byte-consumption-compatibility"></a>
##### Terrain tile byte-consumption compatibility

The upstream pinned TSPS `SceneBuilder.decodeTerrain` loops over
4 planes × 64 × 64 tiles and does not assert the input buffer
is at EOF. The SoloScape native loader previously imposed that
extra assertion and rejected a live map with `Unexpected trailing
terrain bytes`. The decoder now accepts a **fully parsed** modern
revision-240 (u16) tile grid with a remaining suffix, exposes
`consumedBytes`/`trailingBytes`, and limits all reads using the
existing 16 MiB decompression and size caps. It will also accept
legacy u8 tile data only if that decoding consumes **the complete
file**, to support custom RSPS caches. The client still reports
unparsed suffix bytes and does not claim they were decoded as
terrain objects. CRC integrity and the correctly packed file ID 0
remain mandatory. Synthetic CI coverage includes both formats
and adversarial truncation. **Live browser result pending.**

<a id="doc-protocol--cache-backed-osrs-floor-colour-decoding"></a>
##### Cache-backed OSRS floor colour decoding

TSPS's `Dat2CacheLoaderFactory` fetches underlay definitions from
cache **index 2, group 1** and overlays from **index 2, group 4**;
tile fields are **1-based IDs** (overlay high flag masked to 15 bits).
The native client now loads both groups only as required, validates
their reference-table revision and JS5 group CRC through
`NativeJs5Cache`, unpacks selected file IDs from the native
multi-chunk archive format, and decodes relevant OSRS RGB/secondary RGB
and texture metadata. Flat colours replace deterministic placeholder
tints for matched floor definitions in the WebGL mesh. There is no
texture sampling, underlay HSL blending or accurate OSRS floor lighting
yet; unsupported materials are visibly labelled as fallbacks.

The first live WebGL region success was `m50_50`, native group `5:12850`,
**13,519 compressed bytes**, **60,239 decoded**, complete u16 terrain
grid at **60,238 consumed bytes** and one trailing uninterpreted byte.
The real floor-colour decoder has synthetic CI coverage, but its
live browser result has not been confirmed.

<a id="doc-protocol--nonblocking-scene-startup-and-module-graph-integrity"></a>
##### Nonblocking scene startup and module graph integrity

The floor RGB feature introduced a missing static route for
`floor-materials.mjs`; this prevented the browser's ES module
graph from evaluating and left the initial loading screen up.
The preview server now serves that route. A CI test starts the
actual dev server on a randomly allocated local TCP port and
verifies the app's critical module URLs return JavaScript.

Optional floor materials must never gate the **first real WebGL
terrain paint**. `world-startup.mjs` shows verified revision-240
terrain immediately after cache decoding and only then starts
async index-2 colour loads. Material failures retain the visible
world and are shown in the status line, and responses from earlier
regions cannot overwrite a later Travel. Recolouring does not
reset the user's camera target. This does not change the existing
CRC/revision verification or make native RSA/ISAAC login available.

<a id="doc-protocol--remaining-protocol-and-gameplay-work"></a>
#### Remaining protocol and gameplay work

1. **Verify live account login.** The native revision-240 encoder, public RSA config and ISAAC framing are implemented and decoder verified. Confirm account authentication against the running SoloScape server and account service.
2. **Decide native protocol adapter placement.** Prefer implementing a native OSRS packet encoder/decoder within a client-compatible TSPS fork for fidelity. A server-side custom-to-native translator would need to maintain full ISAAC/RSA session state, re-encode scene/entity updates, maps, varps, interfaces and inventory; it is not a simple opcode remap.
3. **Extend native sessions.** Implement reconnect and token/SSO authentication if needed. Keep remote sessions on `wss://` and fail closed on revision mismatch. TSPS high-level login frames must not be forwarded as native packets.
4. **Align assets.** Resolve cache 241 vs 240.2 and adjust JS5, client scripts, packet tables and map definitions consistently. Do not force the wrong revision value only to suppress the warning.
5. **Game loop milestones.** Validate JS5 cache manifest, handshake, login response, initial region rebuild, player/NPC sync, click-to-walk, UI/inventory, chat and logout/reconnect. Use captured test data stripped of usernames/passwords/tokens.
6. **Mobile verification.** Test viewport/touch/virtual keyboard on modern Android Chrome and iOS Safari after the core native session is stable.

<a id="doc-protocol--acceptance-gates"></a>
##### Acceptance gates

- A real revision-compatible native client completes the game handshake against the SoloScape test server through the WebSocket gateway with no credential leakage in logs.
- TSPS client can subsequently perform login, cache loading, scene rendering and movement with protocol conversion in place.
- Interoperability and mobile smoke tests run in isolated environments; production credentials and cache assets are excluded from commits.

<a id="doc-protocol--security-notes"></a>
#### Security notes

The gateway exposes a raw game TCP stream only to an exact origin allowlist; it is **not** a proxy that authenticates players, protects native credentials, or upgrades existing traffic to an encrypted protocol by itself. Prefer TLS termination and a properly secured server network. No user accounts, secrets or tokens should be committed to the repository.
<!-- end-source-document: PROTOCOL.md -->

---

<a id="doc-reference-openosrs"></a>
## REFERENCE_OPENOSRS.md

<!-- source-document: REFERENCE_OPENOSRS.md -->
<a id="doc-reference-openosrs--openosrs-revision-240-primary-soloscape-client-reference"></a>
### OpenOSRS revision-240: primary SoloScape client reference

**Local build/reference snapshot:** `Mobile/local-openosrs/`, imported from the original development checkout at `C:\Users\Callum\Documents\GitHub\Client`. Builds no longer require that separate checkout. Upstream: https://github.com/OOSRS/OOSRS. The inspected tree identifies as **OpenOSRS 1.2.0**; gamepack.properties identifies **revision 240**, game dependency version **1.12.39** and its digest. SHA-256 hashes are recorded in openosrs-reference.json. The snapshot contains the required build artifacts and fingerprinted reference files, not the full desktop source tree. See [local-openosrs/README.md](#doc-local-openosrs-readme) for provisioning, backup and overrides.

<a id="doc-reference-openosrs--source-of-truth-policy"></a>
#### Source-of-truth policy

OpenOSRS is the **primary behavioral reference** for future SoloScape revision-240 client changes: menus, mouse input, camera, context interactions, client state, scene concepts, roof handling, and GPU scene interfaces. Review this local source before TSPS; consult official RuneLite APIs where useful. Use SoloScape's own verified **revision-240** cache and rsprot/server protocol as the authority on packets and decoded assets. OpenOSRS's plugin API alone does not specify every native packet byte.

Previously imported TSPS-derived runtime adapters are **legacy compatibility dependencies, not the primary behavioral reference**. The current login lifecycle, movement, terrain and rendering contain working TSPS-generated code. Replace those dependencies **incrementally**, adding parity tests first. Do not delete tsps-upstream, tsps-runtime or generation scripts in a mass edit.

**Architecture limitation:** OpenOSRS is a Java desktop client. Its original game implementation is supplied as a separately downloaded injected binary, not editable source here. Its GPU plugin uploads data from that game's internal scene. It cannot be imported directly into a browser WebGL client. Adapt compatible algorithms, APIs and observable behavior with revision-240 tests rather than copying Java bytecode or proprietary game assets.

**Licensing:** the repository source is BSD-2-Clause with individual attribution headers, but its injected game dependency and third-party assets have separate terms. Do not bundle them into SoloScape.

<a id="doc-reference-openosrs--where-to-look-first"></a>
#### Where to look first

| Area | Primary OpenOSRS files | Present SoloScape status |
| --- | --- | --- |
| Camera and mouse | runelite-client/src/main/java/net/runelite/client/plugins/camera/CameraPlugin.java and CameraConfig.java; plugins/mousesettings/MouseSettingsConfig.java | Input handling implemented; live option parity untested |
| NPC/object/menu interaction | runelite-client/src/main/java/net/runelite/client/menus/MenuManager.java; input/cursor/DestinationResolver.java; runelite-api MenuEntry/MenuAction | Cache-backed context menu and native packet handling implemented, not complete target parity |
| Login/game states | runelite-api/src/main/java/net/runelite/api/GameState.java; runelite-client/src/main/java/net/runelite/client/rs/ClientLoader.java | Native protocol retained; TSPS lifecycle is a legacy adapter |
| 3D scene and GPU | runelite-client/src/main/java/net/runelite/client/plugins/gpu/GpuPlugin.java and SceneUploader.java | Standalone WebGL renderer, NOT the desktop GPU pipeline |
| Actors/movement/animations | runelite-api actor/model interfaces and scene events | TSPS-derived runtime controller remains until replacement passes tests |
| Cache and protocol | OpenOSRS scene/definition APIs, cross-checked with SoloScape rsprot and cache | SoloScape's rev-240 cache and server remain authoritative |

<a id="doc-reference-openosrs--verify-this-specific-local-source"></a>
#### Verify this specific local source

Run from Mobile:

~~~powershell
npm run verify:openosrs-reference
~~~

Override the local folder with SOLOSCAPE_OPENOSRS_ROOT or pass a custom path to node scripts/verify-openosrs-reference.mjs --root PATH. The offline script validates twenty pinned source, metadata and build-input hashes, plus the declared revision, game dependency version and hash. The pin includes GPU alpha sorting, shader colour conversion, colourblind correction, texture filtering and GPU defaults. Imported inputs are not tracked by Git, so back them up separately and re-audit after any failed fingerprint before updating openosrs-reference.json. The script makes no network requests and does not read credentials or copy game binaries.

Regular npm test does not require the external source checkout, and remains CI-compatible.

<a id="doc-reference-openosrs--migration-order"></a>
#### Migration order

1. Use OpenOSRS input/camera/menu implementations to test and refine existing native mouse controls. Preserve verified revision-240 packet payloads.
2. Migrate the current TSPS-derived login lifecycle and map-ready logic to reference-equivalent state contracts, preserving the authenticated native flow.
3. Adapt scene geometry, roofs, textures and lighting piecewise to the OpenOSRS GPU scene APIs, taking care that its internal game engine is not available as source.
4. Replace actor movement/animation shims only after equivalent implementations pass regression and real-login checks; remove unused TSPS generators and submodule last.

**This change selects the primary reference.** It does not claim that the Java client or proprietary injected game engine has been transplanted into the browser. A live OpenOSRS-versus-SoloScape visual/input benchmark is still needed.
<!-- end-source-document: REFERENCE_OPENOSRS.md -->

---

<a id="doc-render-captures"></a>
## RENDER_CAPTURES.md

<!-- source-document: RENDER_CAPTURES.md -->
<a id="doc-render-captures--matched-renderer-captures"></a>
### Matched renderer captures

No matched RuneLite capture pair is checked in. Renderer changes and synthetic
tests do not establish visual parity. Record a pair from the same cache,
scene state, camera, frame dimensions, settings and animation tick before
making a frame comparison.

The authenticated `TeaVmWorldBridge` exposes an explicit developer method:

```js
const capture = await worldBridge.capture({
    frameId: "lumbridge-stationary-001",
    serverTick: 100,
    clientCycle: 3000
});
const {downloadWorldCapture} = await import("/render-capture.mjs");
downloadWorldCapture(capture, "mobile-lumbridge-001");
```

Call this on the actual bridge instance from a developer harness. The method
does not expose credentials or create a global debugging interface. Tick
identifiers must come from the synchronized recording or replay; entering an
arbitrary tick number does not synchronize live clients. The helper redraws
the current world and reads its WebGL framebuffer synchronously, then exports
a world-only PNG and a JSON manifest. Interface canvases are excluded. Camera
angles are radians, distance and target use the mobile renderer's world units,
and `camera.origin` converts region-local targets into world coordinates.

The manifest whitelists cache archive CRC/revision fingerprints, map templates,
varps, player position/orientation, actor and scenery animation frames, public
appearance configuration, camera, viewport, GPU settings, roof level,
texture clock, and explicit synchronization identifiers. Session state,
account names, passwords, tokens and XTEA keys are excluded. Review exported
game-state data before sharing it.

Record RuneLite's viewport PNG and independently measured equivalent metadata
using the same `soloscape-render-capture-v1` manifest schema. Translate camera
units explicitly from the actual reference camera; copying the mobile manifest
onto an unrelated screenshot does not create a matched pair. Preserve the
reference's renderer identity in `source`. Record all relevant actor, scenery,
animation and lighting state in the capture procedure: the exported manifest
is a reproducibility aid, and cannot prove that two independently running
clients actually had identical world state.

The world framebuffer redraw does not rebuild actor geometry. Actor buffers
can therefore reflect an earlier model update than the sampled player ECS
state, and NPC positions in the manifest are protocol endpoints rather than
the interpolated positions actually drawn. Static scenery identities, spot
effects and appearance customisations are not fully enumerated. Resolved
dynamic scenery children do record the selected definition, sequence and
cached frame. Use a synchronized replay and independently record the missing
state before treating the manifests as a matched reference experiment.

Run the comparison with Python and Pillow:

```text
python Mobile/scripts/compare-render-captures.py mobile.png mobile.json runelite.png runelite.json --diff difference.png
```

The CLI requires equal `match` metadata and equal image dimensions. It refuses
resizing, cropping and metadata mismatches, writes an RGBA absolute difference
PNG, and reports changed pixels and channel errors. An exact match concerns
only that recorded frame. Compare multiple scenes, rotations, planes, morph
states, instance templates, and animation cycles to assess broader fidelity.
Browser antialiasing and touch rendering settings are included because they
can change the pixels. The bundled Codex Python runtime includes Pillow;
ordinary Python environments need Pillow installed separately.

Public references:

- [RuneLite GPU plugin documentation](https://github.com/runelite/runelite/wiki/GPU)
  describes the reference plugin and its configuration.
- [YouTube visual reference](https://www.youtube.com/watch?v=bMSr9PRiF2k)
  is qualitative only. Video compression, camera motion, unknown cache/state,
  and unrecorded settings prevent a matched pixel comparison.
<!-- end-source-document: RENDER_CAPTURES.md -->

---

<a id="doc-teavm-poc-readme"></a>
## teavm-poc/README.md

<!-- source-document: teavm-poc/README.md -->
<a id="doc-teavm-poc-readme--teavm-browser-feasibility-spike--not-yet-openosrs"></a>
### TeaVM browser feasibility spike — not yet OpenOSRS

The isolated probe compiles original SoloScape Java bytecode to an ES2015
JavaScript module with **TeaVM 0.15.0**, then uses the browser's existing native
revision-240 JS5 gateway to fetch a real master-index container. It checks that
CRC32 computed in TeaVM-generated Java matches the native browser result.
It also verifies OSRS map-square math and Java-to-JavaScript exported functions.

<a id="doc-teavm-poc-readme--build-on-the-windows-development-machine"></a>
#### Build on the Windows development machine

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
removed along with their obsolete page markup, controllers and styles. The
bytecode and model verification tools remain in the local source tree and
are verified by `npm run test:teavm`. The `/teavm` alias opens the same
fullscreen client as `/`.

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

<a id="doc-teavm-poc-readme--why-this-is-not-an-openosrs-engine-port"></a>
#### Why this is not an OpenOSRS engine port

The entire pinned client now has an independent compilation probe:
`npm run build:openosrs-engine` from `Mobile`. It verifies the untouched local
gamepack and `Mobile/local-openosrs/runelite-api/build/libs/runelite-api-1.2.0.jar`.
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

The initial AWT, executor/queue, class/resource, logging and regex diagnostics
are resolved by `engine-src/org/soloscape/teavm/platform` adapters. Both the
gamepack and API jar are remapped to the same platform types. Game methods
are retained; the optional reflection-check JAR loader uses the browser's
ahead-of-time class contract and explicitly rejects external JARs.
The full engine now compiles successfully. IndexedDB-backed sandbox files,
WebSocket streams, Fetch, bounded reflection/serialization, checked memory
blocks, Web Crypto, JSON-Java, browser image decoding and Web Audio resolve
the later dependency groups. Native JVM libraries remain explicitly
unsupported; browser input replaces RLICN and JVM diagnostics report missing
capabilities. Original game logic is retained.
See `../OPENOSRS_PARITY.md` for the evidence, adapter limits and remaining
porting gates. SLF4J/Guava API versions match the
reference build. A small Java 8-source classlib implementation supplies the
standard BootstrapMethodError type missing from TeaVM; Maven still runs
under JDK 17 or newer.
`target/engine/report.json` and `compiler.log` contain the local outcome;
failure exits nonzero and removes any partially emitted engine module.
Generated JavaScript must also pass ES module syntax validation. Minified
aliases avoid invalid identifiers from obfuscated JVM class names.
Even a successful build is `compiled-unverified`.
The probe does not serve its generated module or change the active homepage.

Run `npm run test:engine-platform` to compile the separate `PlatformProof`
entry point and test the actual emitted JavaScript. Set `CHROME_BIN` to also
verify Canvas 2D ARGB pixels/readback and DOM input in real Chrome. Its
`platform.js` is separate from `engine.js`; passing this proof does not mark
the whole-engine report as compiled. The future host must configure its
canvas and preload named classpath resource bytes before engine startup.

Run `npm run test:engine-services` with `CHROME_BIN` for real browser
filesystem, Fetch/WebSocket, crypto, reflection/serialization, PNG and PCM
checks. Run `npm run test:openosrs-engine` after building to import the actual
full engine module and check its startup host contract in Node.

Configure the canvas, resources, environment and explicit gateway routes
before calling `initializeAsync(error => ...)`. Initialization starts a TeaVM
thread, awaits IndexedDB hydration, then constructs the original client.
`initialize()` also starts that thread; `startupState()` and `startupError()`
report its outcome. `syncFilesystem(error => ...)` checkpoints storage;
`unlockAudio()` must be called from a user gesture. These exports do not
supply RuneLite callbacks, applet/world parameters, verified cache assets or
the active homepage integration. Successful compilation and service checks
do not establish a working login/game loop or OpenOSRS gameplay parity.

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

<a id="doc-teavm-poc-readme--production-javascript-compilation"></a>
#### Production JavaScript compilation

Both `pom.xml` (the active 27 KB title/state bridge) and `engine-pom.xml`
(the experimental, separate whole-engine module) use TeaVM Maven 0.15.0 with
`optimizationLevel=ADVANCED`, `minifying=true`, `incremental=false` and
`sourceMapsGenerated=false`. The installed Maven plugin defaults to
`SIMPLE` optimisation if unspecified. TeaVM's **Gradle** JavaScript advice
recommends `BALANCED`, but the Maven optimisation enum is different:
`ADVANCED` is its production-oriented JavaScript option.

Run `npm run build:teavm` followed by `npm run test:teavm` to compile and
verify that the real rev-240 bridge still matches JVM hashes and title state.
The full-engine module has a separate build/status gate and must not be
confused with the running game. The mobile 3D renderer and actor logic are
native browser `Mobile/browser/*.mjs` code, so TeaVM optimisation is **not**
an expected fix for low WebGL in-game FPS.

TeaVM references:
https://teavm.org/docs/runtime/js-modules.html
https://teavm.org/docs/intro/overview.html
https://www.teavm.org/docs/tooling/gradle.html
https://www.teavm.org/docs/tooling/maven.html

<a id="doc-teavm-poc-readme--authentic-revision-240-rasterizer2d-milestone"></a>
#### Authentic revision-240 Rasterizer2D milestone

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

The pinned local input snapshot is expected at
`Mobile/local-openosrs/runelite-client/src/main/resources/injected-client.oprs`.
See `Mobile/local-openosrs/README.md` for importing and backing up these ignored inputs.
To override the path set
`SOLOSCAPE_OPENOSRS_GAMEPACK`. Original bytes, generated subset JARs,
and generated gamepack-derived JS stay under ignored `teavm-poc/target/`.
**Do not redistribute** those outputs without the applicable rights.

This is a proof that **one original software-rendering primitive runs in
TeaVM and draws the same pixels as the JVM**. It is *not* the OpenOSRS scene
renderer, texture pipeline, title screen, login or game loop. Expansion to
authentic models, depth buffers, scene composition and browser input is
still substantial work.

<a id="doc-teavm-poc-readme--real-js5-model-viewer-current-step"></a>
#### Real JS5 model viewer (current step)

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

<a id="doc-teavm-poc-readme--authenticated-world-and-local-player-rendering"></a>
#### Authenticated world and local-player rendering

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
<!-- end-source-document: teavm-poc/README.md -->

---

<a id="doc-node-modules-ws-readme"></a>
## node_modules/ws/README.md

<!-- source-document: node_modules/ws/README.md -->
<a id="doc-node-modules-ws-readme--ws-a-nodejs-websocket-library"></a>
### ws: a Node.js WebSocket library

[![Version npm](https://img.shields.io/npm/v/ws.svg?logo=npm)](https://www.npmjs.com/package/ws)
[![CI](https://img.shields.io/github/actions/workflow/status/websockets/ws/ci.yml?branch=master&label=CI&logo=github)](https://github.com/websockets/ws/actions?query=workflow%3ACI+branch%3Amaster)
[![Coverage Status](https://img.shields.io/coveralls/websockets/ws/master.svg?logo=coveralls)](https://coveralls.io/github/websockets/ws)

ws is a simple to use, blazing fast, and thoroughly tested WebSocket client and
server implementation.

Passes the quite extensive Autobahn test suite: [server][server-report],
[client][client-report].

**Note**: This module does not work in the browser. The client in the docs is a
reference to a backend with the role of a client in the WebSocket communication.
Browser clients must use the native
[`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
object. To make the same code work seamlessly on Node.js and the browser, you
can use one of the many wrappers available on npm, like
[isomorphic-ws](https://github.com/heineiuo/isomorphic-ws).

<a id="doc-node-modules-ws-readme--table-of-contents"></a>
#### Table of Contents

- [Protocol support](#doc-node-modules-ws-readme--protocol-support)
- [Installing](#doc-node-modules-ws-readme--installing)
  - [Opt-in for performance](#doc-node-modules-ws-readme--opt-in-for-performance)
    - [Legacy opt-in for performance](#doc-node-modules-ws-readme--legacy-opt-in-for-performance)
- [API docs](#doc-node-modules-ws-readme--api-docs)
- [WebSocket compression](#doc-node-modules-ws-readme--websocket-compression)
- [Usage examples](#doc-node-modules-ws-readme--usage-examples)
  - [Sending and receiving text data](#doc-node-modules-ws-readme--sending-and-receiving-text-data)
  - [Sending binary data](#doc-node-modules-ws-readme--sending-binary-data)
  - [Simple server](#doc-node-modules-ws-readme--simple-server)
  - [External HTTP/S server](#doc-node-modules-ws-readme--external-https-server)
  - [Multiple servers sharing a single HTTP/S server](#doc-node-modules-ws-readme--multiple-servers-sharing-a-single-https-server)
  - [Client authentication](#doc-node-modules-ws-readme--client-authentication)
  - [Server broadcast](#doc-node-modules-ws-readme--server-broadcast)
  - [Round-trip time](#doc-node-modules-ws-readme--round-trip-time)
  - [Use the Node.js streams API](#doc-node-modules-ws-readme--use-the-nodejs-streams-api)
  - [Other examples](#doc-node-modules-ws-readme--other-examples)
- [FAQ](#doc-node-modules-ws-readme--faq)
  - [How to get the IP address of the client?](#doc-node-modules-ws-readme--how-to-get-the-ip-address-of-the-client)
  - [How to detect and close broken connections?](#doc-node-modules-ws-readme--how-to-detect-and-close-broken-connections)
  - [How to connect via a proxy?](#doc-node-modules-ws-readme--how-to-connect-via-a-proxy)
- [Changelog](#doc-node-modules-ws-readme--changelog)
- [License](#doc-node-modules-ws-readme--license)

<a id="doc-node-modules-ws-readme--protocol-support"></a>
#### Protocol support

- **HyBi drafts 07-12** (Use the option `protocolVersion: 8`)
- **HyBi drafts 13-17** (Current default, alternatively option
  `protocolVersion: 13`)

<a id="doc-node-modules-ws-readme--installing"></a>
#### Installing

```
npm install ws
```

<a id="doc-node-modules-ws-readme--opt-in-for-performance"></a>
##### Opt-in for performance

[bufferutil][] is an optional module that can be installed alongside the ws
module:

```
npm install --save-optional bufferutil
```

This is a binary addon that improves the performance of certain operations such
as masking and unmasking the data payload of the WebSocket frames. Prebuilt
binaries are available for the most popular platforms, so you don't necessarily
need to have a C++ compiler installed on your machine.

To force ws to not use bufferutil, use the
[`WS_NO_BUFFER_UTIL`](node_modules/ws/doc/ws.md#ws_no_buffer_util) environment variable. This
can be useful to enhance security in systems where a user can put a package in
the package search path of an application of another user, due to how the
Node.js resolver algorithm works.

<a id="doc-node-modules-ws-readme--legacy-opt-in-for-performance"></a>
###### Legacy opt-in for performance

If you are running on an old version of Node.js (prior to v18.14.0), ws also
supports the [utf-8-validate][] module:

```
npm install --save-optional utf-8-validate
```

This contains a binary polyfill for [`buffer.isUtf8()`][].

To force ws not to use utf-8-validate, use the
[`WS_NO_UTF_8_VALIDATE`](node_modules/ws/doc/ws.md#ws_no_utf_8_validate) environment variable.

<a id="doc-node-modules-ws-readme--api-docs"></a>
#### API docs

See [`/doc/ws.md`](node_modules/ws/doc/ws.md) for Node.js-like documentation of ws classes and
utility functions.

<a id="doc-node-modules-ws-readme--websocket-compression"></a>
#### WebSocket compression

ws supports the [permessage-deflate extension][permessage-deflate] which enables
the client and server to negotiate a compression algorithm and its parameters,
and then selectively apply it to the data payloads of each WebSocket message.

The extension is disabled by default on the server and enabled by default on the
client. It adds a significant overhead in terms of performance and memory
consumption so we suggest to enable it only if it is really needed.

Note that Node.js has a variety of issues with high-performance compression,
where increased concurrency, especially on Linux, can lead to [catastrophic
memory fragmentation][node-zlib-bug] and slow performance. If you intend to use
permessage-deflate in production, it is worthwhile to set up a test
representative of your workload and ensure Node.js/zlib will handle it with
acceptable performance and memory usage.

Tuning of permessage-deflate can be done via the options defined below. You can
also use `zlibDeflateOptions` and `zlibInflateOptions`, which is passed directly
into the creation of [raw deflate/inflate streams][node-zlib-deflaterawdocs].

See [the docs][ws-server-options] for more options.

```js
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
});
```

The client will only use the extension if it is supported and enabled on the
server. To always disable the extension on the client, set the
`perMessageDeflate` option to `false`.

```js
import WebSocket from 'ws';

const ws = new WebSocket('ws://www.host.com/path', {
  perMessageDeflate: false
});
```

<a id="doc-node-modules-ws-readme--usage-examples"></a>
#### Usage examples

<a id="doc-node-modules-ws-readme--sending-and-receiving-text-data"></a>
##### Sending and receiving text data

```js
import WebSocket from 'ws';

const ws = new WebSocket('ws://www.host.com/path');

ws.on('error', console.error);

ws.on('open', function open() {
  ws.send('something');
});

ws.on('message', function message(data) {
  console.log('received: %s', data);
});
```

<a id="doc-node-modules-ws-readme--sending-binary-data"></a>
##### Sending binary data

```js
import WebSocket from 'ws';

const ws = new WebSocket('ws://www.host.com/path');

ws.on('error', console.error);

ws.on('open', function open() {
  const array = new Float32Array(5);

  for (var i = 0; i < array.length; ++i) {
    array[i] = i / 2;
  }

  ws.send(array);
});
```

<a id="doc-node-modules-ws-readme--simple-server"></a>
##### Simple server

```js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.send('something');
});
```

<a id="doc-node-modules-ws-readme--external-https-server"></a>
##### External HTTP/S server

```js
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';

const server = createServer({
  cert: readFileSync('/path/to/cert.pem'),
  key: readFileSync('/path/to/key.pem')
});
const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.send('something');
});

server.listen(8080);
```

<a id="doc-node-modules-ws-readme--multiple-servers-sharing-a-single-https-server"></a>
##### Multiple servers sharing a single HTTP/S server

```js
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const server = createServer();
const wss1 = new WebSocketServer({ noServer: true });
const wss2 = new WebSocketServer({ noServer: true });

wss1.on('connection', function connection(ws) {
  ws.on('error', console.error);

  // ...
});

wss2.on('connection', function connection(ws) {
  ws.on('error', console.error);

  // ...
});

server.on('upgrade', function upgrade(request, socket, head) {
  const { pathname } = new URL(request.url, 'wss://base.url');

  if (pathname === '/foo') {
    wss1.handleUpgrade(request, socket, head, function done(ws) {
      wss1.emit('connection', ws, request);
    });
  } else if (pathname === '/bar') {
    wss2.handleUpgrade(request, socket, head, function done(ws) {
      wss2.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(8080);
```

<a id="doc-node-modules-ws-readme--client-authentication"></a>
##### Client authentication

```js
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

function onSocketError(err) {
  console.error(err);
}

const server = createServer();
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', function connection(ws, request, client) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log(`Received message ${data} from user ${client}`);
  });
});

server.on('upgrade', function upgrade(request, socket, head) {
  socket.on('error', onSocketError);

  // This function is not defined on purpose. Implement it with your own logic.
  authenticate(request, function next(err, client) {
    if (err || !client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    socket.removeListener('error', onSocketError);

    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request, client);
    });
  });
});

server.listen(8080);
```

Also see the provided [example][session-parse-example] using `express-session`.

<a id="doc-node-modules-ws-readme--server-broadcast"></a>
##### Server broadcast

A client WebSocket broadcasting to all connected WebSocket clients, including
itself.

```js
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data, isBinary) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});
```

A client WebSocket broadcasting to every other connected WebSocket clients,
excluding itself.

```js
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data, isBinary) {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});
```

<a id="doc-node-modules-ws-readme--round-trip-time"></a>
##### Round-trip time

```js
import WebSocket from 'ws';

const ws = new WebSocket('wss://websocket-echo.com/');

ws.on('error', console.error);

ws.on('open', function open() {
  console.log('connected');
  ws.send(Date.now());
});

ws.on('close', function close() {
  console.log('disconnected');
});

ws.on('message', function message(data) {
  console.log(`Round-trip time: ${Date.now() - data} ms`);

  setTimeout(function timeout() {
    ws.send(Date.now());
  }, 500);
});
```

<a id="doc-node-modules-ws-readme--use-the-nodejs-streams-api"></a>
##### Use the Node.js streams API

```js
import WebSocket, { createWebSocketStream } from 'ws';

const ws = new WebSocket('wss://websocket-echo.com/');

const duplex = createWebSocketStream(ws, { encoding: 'utf8' });

duplex.on('error', console.error);

duplex.pipe(process.stdout);
process.stdin.pipe(duplex);
```

<a id="doc-node-modules-ws-readme--other-examples"></a>
##### Other examples

For a full example with a browser client communicating with a ws server, see the
examples folder.

Otherwise, see the test cases.

<a id="doc-node-modules-ws-readme--faq"></a>
#### FAQ

<a id="doc-node-modules-ws-readme--how-to-get-the-ip-address-of-the-client"></a>
##### How to get the IP address of the client?

The remote IP address can be obtained from the raw socket.

```js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws, req) {
  const ip = req.socket.remoteAddress;

  ws.on('error', console.error);
});
```

When the server runs behind a proxy like NGINX, the de-facto standard is to use
the `X-Forwarded-For` header.

```js
wss.on('connection', function connection(ws, req) {
  const ip = req.headers['x-forwarded-for'].split(',')[0].trim();

  ws.on('error', console.error);
});
```

<a id="doc-node-modules-ws-readme--how-to-detect-and-close-broken-connections"></a>
##### How to detect and close broken connections?

Sometimes, the link between the server and the client can be interrupted in a
way that keeps both the server and the client unaware of the broken state of the
connection (e.g. when pulling the cord).

In these cases, ping messages can be used as a means to verify that the remote
endpoint is still responsive.

```js
import { WebSocketServer } from 'ws';

function heartbeat() {
  this.isAlive = true;
}

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('error', console.error);
  ws.on('pong', heartbeat);
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});
```

Pong messages are automatically sent in response to ping messages as required by
the spec.

Just like the server example above, your clients might as well lose connection
without knowing it. You might want to add a ping listener on your clients to
prevent that. A simple implementation would be:

```js
import WebSocket from 'ws';

function heartbeat() {
  clearTimeout(this.pingTimeout);

  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  this.pingTimeout = setTimeout(() => {
    this.terminate();
  }, 30000 + 1000);
}

const client = new WebSocket('wss://websocket-echo.com/');

client.on('error', console.error);
client.on('open', heartbeat);
client.on('ping', heartbeat);
client.on('close', function clear() {
  clearTimeout(this.pingTimeout);
});
```

<a id="doc-node-modules-ws-readme--how-to-connect-via-a-proxy"></a>
##### How to connect via a proxy?

Use a custom `http.Agent` implementation like [https-proxy-agent][] or
[socks-proxy-agent][].

<a id="doc-node-modules-ws-readme--changelog"></a>
#### Changelog

We're using the GitHub [releases][changelog] for changelog entries.

<a id="doc-node-modules-ws-readme--license"></a>
#### License

[MIT](node_modules/ws/LICENSE)

[`buffer.isutf8()`]: https://nodejs.org/api/buffer.html#bufferisutf8input
[bufferutil]: https://github.com/websockets/bufferutil
[changelog]: https://github.com/websockets/ws/releases
[client-report]: http://websockets.github.io/ws/autobahn/clients/
[https-proxy-agent]: https://github.com/TooTallNate/node-https-proxy-agent
[node-zlib-bug]: https://github.com/nodejs/node/issues/8871
[node-zlib-deflaterawdocs]:
  https://nodejs.org/api/zlib.html#zlib_zlib_createdeflateraw_options
[permessage-deflate]: https://tools.ietf.org/html/rfc7692
[server-report]: http://websockets.github.io/ws/autobahn/servers/
[session-parse-example]: node_modules/ws/examples/express-session-parse
[socks-proxy-agent]: https://github.com/TooTallNate/node-socks-proxy-agent
[utf-8-validate]: https://github.com/websockets/utf-8-validate
[ws-server-options]: node_modules/ws/doc/ws.md#new-websocketserveroptions-callback
<!-- end-source-document: node_modules/ws/README.md -->

---

<a id="doc-teavm-poc-target-engine-caddy-validation-readme"></a>
## teavm-poc/target/engine/caddy-validation/README.md

<!-- source-document: teavm-poc/target/engine/caddy-validation/README.md -->
<p align="center">
	<a href="https://caddyserver.com">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/1d6be89c-df8a-438c-b01d-cef6bf56440a">
			<source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/3a5b7419-6925-48f6-ae75-d231f4a4f0c2">
			<img src="https://github.com/user-attachments/assets/3a5b7419-6925-48f6-ae75-d231f4a4f0c2" alt="Caddy" width="550">
		</picture>
	</a>
	<br>
	<h3 align="center">a <a href="https://zerossl.com"><img src="https://user-images.githubusercontent.com/55066419/208327323-2770dc16-ec09-43a0-9035-c5b872c2ad7f.svg" height="28" style="vertical-align: -7.7px" valign="middle"></a> project</h3>
</p>
<hr>
<h3 align="center">Every site on HTTPS</h3>
<p align="center">Caddy is an extensible server platform that uses TLS by default.</p>
<p align="center">
	<a href="https://github.com/caddyserver/caddy/releases">Releases</a> ·
	<a href="https://caddyserver.com/docs/">Documentation</a> ·
	<a href="https://caddy.community">Get Help</a>
</p>
<p align="center">
	<a href="https://github.com/caddyserver/caddy/actions/workflows/ci.yml"><img src="https://github.com/caddyserver/caddy/actions/workflows/ci.yml/badge.svg"></a>
	&nbsp;
	<a href="https://www.bestpractices.dev/projects/7141"><img src="https://www.bestpractices.dev/projects/7141/badge"></a>
	&nbsp;
	<a href="https://pkg.go.dev/github.com/caddyserver/caddy/v2"><img src="https://img.shields.io/badge/godoc-reference-%23007d9c.svg"></a>
	&nbsp;
	<a href="https://x.com/caddyserver" title="@caddyserver on Twitter"><img src="https://img.shields.io/twitter/follow/caddyserver" alt="@caddyserver on Twitter"></a>
	&nbsp;
	<a href="https://caddy.community" title="Caddy Forum"><img src="https://img.shields.io/badge/community-forum-ff69b4.svg" alt="Caddy Forum"></a>
	<br>
	<a href="https://sourcegraph.com/github.com/caddyserver/caddy?badge" title="Caddy on Sourcegraph"><img src="https://sourcegraph.com/github.com/caddyserver/caddy/-/badge.svg" alt="Caddy on Sourcegraph"></a>
	&nbsp;
	<a href="https://cloudsmith.io/~caddy/repos/"><img src="https://img.shields.io/badge/OSS%20hosting%20by-cloudsmith-blue?logo=cloudsmith" alt="Cloudsmith"></a>
</p>
<p align="center">
	<b>Powered by</b>
	<br>
	<a href="https://github.com/caddyserver/certmagic">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/55066419/206946718-740b6371-3df3-4d72-a822-47e4c48af999.png">
			<source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/1128849/49704830-49d37200-fbd5-11e8-8385-767e0cd033c3.png">
			<img src="https://user-images.githubusercontent.com/1128849/49704830-49d37200-fbd5-11e8-8385-767e0cd033c3.png" alt="CertMagic" width="250">
		</picture>
	</a>
</p>

<!-- Warp sponsorship requests this section -->
<div align="center" markdown="1">
	<hr>
	<sup>Special thanks to:</sup>
	<br>
	<a href="https://go.warp.dev/caddy">
		<img alt="Warp sponsorship" width="400" src="https://github.com/user-attachments/assets/c8efffde-18c7-4af4-83ed-b1aba2dda394">
	</a>

<a id="doc-teavm-poc-target-engine-caddy-validation-readme--warp-built-for-coding-with-multiple-ai-agents"></a>
##### [Warp, built for coding with multiple AI agents](https://go.warp.dev/caddy)
[Available for MacOS, Linux, & Windows](https://go.warp.dev/caddy)<br>
</div>

<hr>

<a id="doc-teavm-poc-target-engine-caddy-validation-readme--menu"></a>
##### Menu

- [Features](#doc-teavm-poc-target-engine-caddy-validation-readme--features)
- [Install](#doc-teavm-poc-target-engine-caddy-validation-readme--install)
- [Build from source](#doc-teavm-poc-target-engine-caddy-validation-readme--build-from-source)
	- [For development](#doc-teavm-poc-target-engine-caddy-validation-readme--for-development)
	- [With version information and/or plugins](#doc-teavm-poc-target-engine-caddy-validation-readme--with-version-information-andor-plugins)
- [Quick start](#doc-teavm-poc-target-engine-caddy-validation-readme--quick-start)
- [Overview](#doc-teavm-poc-target-engine-caddy-validation-readme--overview)
- [Full documentation](#doc-teavm-poc-target-engine-caddy-validation-readme--full-documentation)
- [Getting help](#doc-teavm-poc-target-engine-caddy-validation-readme--getting-help)
- [About](#doc-teavm-poc-target-engine-caddy-validation-readme--about)


<a id="doc-teavm-poc-target-engine-caddy-validation-readme--features"></a>
#### [Features](https://caddyserver.com/features)

- **Easy configuration** with the [Caddyfile](https://caddyserver.com/docs/caddyfile)
- **Powerful configuration** with its [native JSON config](https://caddyserver.com/docs/json/)
- **Dynamic configuration** with the [JSON API](https://caddyserver.com/docs/api)
- [**Config adapters**](https://caddyserver.com/docs/config-adapters) if you don't like JSON
- **Automatic HTTPS** by default
	- [ZeroSSL](https://zerossl.com) and [Let's Encrypt](https://letsencrypt.org) for public names
	- Fully-managed local CA for internal names & IPs
	- Can coordinate with other Caddy instances in a cluster
	- Multi-issuer fallback
	- Encrypted ClientHello (ECH) support
- **Stays up when other servers go down** due to TLS/OCSP/certificate-related issues
- **Production-ready** after serving trillions of requests and managing millions of TLS certificates
- **Scales to hundreds of thousands of sites** as proven in production
- **HTTP/1.1, HTTP/2, and HTTP/3** all supported by default
- **Highly extensible** [modular architecture](https://caddyserver.com/docs/architecture) lets Caddy do anything without bloat
- **Runs anywhere** with **no external dependencies** (not even libc)
- Written in Go, a language with higher **memory safety guarantees** than other servers
- Actually **fun to use**
- So much more to [discover](https://caddyserver.com/features)

<a id="doc-teavm-poc-target-engine-caddy-validation-readme--install"></a>
#### Install

The simplest, cross-platform way to get started is to download Caddy from [GitHub Releases](https://github.com/caddyserver/caddy/releases) and place the executable file in your PATH.

See [our online documentation](https://caddyserver.com/docs/install) for other install instructions.

<a id="doc-teavm-poc-target-engine-caddy-validation-readme--build-from-source"></a>
#### Build from source

Requirements:

- [Go 1.26.0 or newer](https://golang.org/dl/)

<a id="doc-teavm-poc-target-engine-caddy-validation-readme--for-development"></a>
##### For development

_**Note:** These steps [will not embed proper version information](https://github.com/golang/go/issues/29228). For that, please follow the instructions in the next section._

```bash
$ git clone "https://github.com/caddyserver/caddy.git"
$ cd caddy/cmd/caddy/
$ go build
```

When you run Caddy, it may try to bind to low ports unless otherwise specified in your config. If your OS requires elevated privileges for this, you will need to give your new binary permission to do so. On Linux, this can be done easily with: `sudo setcap cap_net_bind_service=+ep ./caddy`

If you prefer to use `go run` which only creates temporary binaries, you can still do this with the included `setcap.sh` like so:

```bash
$ go run -exec ./setcap.sh main.go
```

If you don't want to type your password for `setcap`, use `sudo visudo` to edit your sudoers file and allow your user account to run that command without a password, for example:

```
username ALL=(ALL:ALL) NOPASSWD: /usr/sbin/setcap
```

replacing `username` with your actual username. Please be careful and only do this if you know what you are doing! We are only qualified to document how to use Caddy, not Go tooling or your computer, and we are providing these instructions for convenience only; please learn how to use your own computer at your own risk and make any needful adjustments.

Then you can run the tests in all modules or a specific one:

```bash
$ go test ./...
$ go test ./modules/caddyhttp/tracing/
```

<a id="doc-teavm-poc-target-engine-caddy-validation-readme--with-version-information-andor-plugins"></a>
##### With version information and/or plugins

Using [our builder tool, `xcaddy`](https://github.com/caddyserver/xcaddy)...

```bash
$ xcaddy build
```

...the following steps are automated:

1. Create a new folder: `mkdir caddy`
2. Change into it: `cd caddy`
3. Copy [Caddy's main.go](https://github.com/caddyserver/caddy/blob/master/cmd/caddy/main.go) into the empty folder. Add imports for any custom plugins you want to add.
4. Initialize a Go module: `go mod init caddy`
5. (Optional) Pin Caddy version: `go get github.com/caddyserver/caddy/v2@version` replacing `version` with a git tag, commit, or branch name.
6. (Optional) Add plugins by adding their import: `_ "import/path/here"`
7. Compile: `go build -tags=nobadger,nomysql,nopgx`




<a id="doc-teavm-poc-target-engine-caddy-validation-readme--quick-start"></a>
#### Quick start

The [Caddy website](https://caddyserver.com/docs/) has documentation that includes tutorials, quick-start guides, reference, and more.

**We recommend that all users -- regardless of experience level -- do our [Getting Started](https://caddyserver.com/docs/getting-started) guide to become familiar with using Caddy.**

If you've only got a minute, [the website has several quick-start tutorials](https://caddyserver.com/docs/quick-starts) to choose from! However, after finishing a quick-start tutorial, please read more documentation to understand how the software works. 🙂




<a id="doc-teavm-poc-target-engine-caddy-validation-readme--overview"></a>
#### Overview

Caddy is most often used as an HTTPS server, but it is suitable for any long-running Go program. First and foremost, it is a platform to run Go applications. Caddy "apps" are just Go programs that are implemented as Caddy modules. Two apps -- `tls` and `http` -- ship standard with Caddy.

Caddy apps instantly benefit from [automated documentation](https://caddyserver.com/docs/json/), graceful on-line [config changes via API](https://caddyserver.com/docs/api), and unification with other Caddy apps.

Although [JSON](https://caddyserver.com/docs/json/) is Caddy's native config language, Caddy can accept input from [config adapters](https://caddyserver.com/docs/config-adapters) which can essentially convert any config format of your choice into JSON: Caddyfile, JSON 5, YAML, TOML, NGINX config, and more.

The primary way to configure Caddy is through [its API](https://caddyserver.com/docs/api), but if you prefer config files, the [command-line interface](https://caddyserver.com/docs/command-line) supports those too.

Caddy exposes an unprecedented level of control compared to any web server in existence. In Caddy, you are usually setting the actual values of the initialized types in memory that power everything from your HTTP handlers and TLS handshakes to your storage medium. Caddy is also ridiculously extensible, with a powerful plugin system that makes vast improvements over other web servers.

To wield the power of this design, you need to know how the config document is structured. Please see [our documentation site](https://caddyserver.com/docs/) for details about [Caddy's config structure](https://caddyserver.com/docs/json/).

Nearly all of Caddy's configuration is contained in a single config document, rather than being scattered across CLI flags and env variables and a configuration file as with other web servers. This makes managing your server config more straightforward and reduces hidden variables/factors.


<a id="doc-teavm-poc-target-engine-caddy-validation-readme--full-documentation"></a>
#### Full documentation

Our website has complete documentation:

**https://caddyserver.com/docs/**

The docs are also open source. You can contribute to them here: https://github.com/caddyserver/website



<a id="doc-teavm-poc-target-engine-caddy-validation-readme--getting-help"></a>
#### Getting help

- We advise companies using Caddy to secure a support contract through [Ardan Labs](https://www.ardanlabs.com) before help is needed.

- A [sponsorship](https://github.com/sponsors/mholt) goes a long way! We can offer private help to sponsors. If Caddy is benefitting your company, please consider a sponsorship. This not only helps fund full-time work to ensure the longevity of the project, it provides your company the resources, support, and discounts you need; along with being a great look for your company to your customers and potential customers!

- Individuals can exchange help for free on our community forum at https://caddy.community. Remember that people give help out of their spare time and good will. The best way to get help is to give it first!

Please use our [issue tracker](https://github.com/caddyserver/caddy/issues) only for bug reports and feature requests, i.e. actionable development items (support questions will usually be referred to the forums).



<a id="doc-teavm-poc-target-engine-caddy-validation-readme--about"></a>
#### About

Matthew Holt began developing Caddy in 2014 while studying computer science at Brigham Young University. (The name "Caddy" was chosen because this software helps with the tedious, mundane tasks of serving the Web, and is also a single place for multiple things to be organized together.) It soon became the first web server to use HTTPS automatically and by default, and now has hundreds of contributors and has served trillions of HTTPS requests.

**The name "Caddy" is trademarked.** The name of the software is "Caddy", not "Caddy Server" or "CaddyServer". Please call it "Caddy" or, if you wish to clarify, "the Caddy web server". Caddy is a registered trademark of Stack Holdings GmbH.

- _Project on X: [@caddyserver](https://x.com/caddyserver)_
- _Author on X: [@mholt6](https://x.com/mholt6)_

Caddy is a project of [ZeroSSL](https://zerossl.com), an HID Global company.

Debian package repository hosting is graciously provided by [Cloudsmith](https://cloudsmith.com). Cloudsmith is the only fully hosted, cloud-native, universal package management solution, that enables your organization to create, store and share packages in any format, to any place, with total confidence.
<!-- end-source-document: teavm-poc/target/engine/caddy-validation/README.md -->

---

<a id="doc-tsps-upstream-agents"></a>
## tsps-upstream/AGENTS.md

<!-- source-document: tsps-upstream/AGENTS.md -->
<a id="doc-tsps-upstream-agents--agentsmd"></a>
### AGENTS.md

Server rules and plugin conventions are in [server/AGENTS.md](#doc-tsps-upstream-server-agents).

<a id="doc-tsps-upstream-agents--worktrees"></a>
#### Worktrees

Several agents work at once, each in its own worktree with its own ports. They are in the
worktree's root `.env`, written by `scripts/wt` ([docs/worktrees.md](#doc-tsps-upstream-docs-worktrees)). Start
with `yarn start` and never override them; the defaults (3000, 43594, 49700) belong to the main
checkout.

- **Your ports:** `scripts/wt ls` lists every worktree with its branch, client URL, game port
  and agent MCP port. A worktree without a slot gets one with `scripts/wt slot`.
- **Checking your work:** use the agent MCP on your own port
  ([server/docs/agents/testing.md](#doc-tsps-upstream-server-docs-agents-testing)). Never connect to another
  worktree's server, or stop it.
- **When it's ready for the user:** end with `Ready to test: http://localhost:<PORT> (<branch>)`
  and what to look at.
- **New worktrees:** `scripts/wt new <branch>`, not plain `git worktree add`; it writes the
  ports and copies `node_modules`.
<!-- end-source-document: tsps-upstream/AGENTS.md -->

---

<a id="doc-tsps-upstream-claude"></a>
## tsps-upstream/CLAUDE.md

<!-- source-document: tsps-upstream/CLAUDE.md -->
@AGENTS.md
<!-- end-source-document: tsps-upstream/CLAUDE.md -->

---

<a id="doc-tsps-upstream-client-game-plugins-hd-readme"></a>
## tsps-upstream/client/game/plugins/hd/README.md

<!-- source-document: tsps-upstream/client/game/plugins/hd/README.md -->
<a id="doc-tsps-upstream-client-game-plugins-hd-readme--117-hd"></a>
### 117 HD

Opt in through **xRSPS → 117 HD**. Disabled on fresh installs; explicit choices
persist in browser storage. No renderer restart is needed.

The plugin adapts 117 HD lighting, regional environments, fog, material parameters,
textures, normal maps, animated object lights and directional shadows to PicoGL.
Current materials/assets come from `117HD/RLHD` at
`38d4082ca5a7ed77324484ce287659a4eb7758c2`. The environment/light data retains the
existing `elvarg-web-client` port.

Ground recipes cover grass, dirt, sand, gravel, rock, snow, wood, carpets, brick,
marble, tiles and paving. Untextured terrain carries the recipe in its unused U
coordinate; its original colour, geometry and face priorities are preserved.
Terrain normals interpolate neighbouring height-map normals. Player and NPC
normals blend across shared body vertices and are rebuilt from each animated
pose. Rest-pose vertex groups and normal storage are reused; opaque and alpha
geometry share one normal calculation per pose. Actor vertices carry normals and
their original unshaded colours in an extra four bytes; the HD toggle replaces
baked shading with smooth lighting.
The local player reuses the existing pose cache across shadow and scene passes.
Architecture uses geometric normals, with detail from material normal maps.
The 256px texture array uses trilinear mipmaps and up to 8x anisotropic filtering.
Dry grass, soil, sand, gravel and roofs are matte, including the wood-grain
material used by wooden roofs. Rough planks and masonry use subtle highlights.
Reflections use upstream's Phong gloss and the sun's colour
and intensity. HD model textures replace baked directional shading with neutral
brightness, avoiding double shading on brick walls.

Floor water (normal maps, foam, caustics, seabed and shorelines) is 117 HD's
and follows this toggle; with HD off, water uses the vanilla cache texture. HD replacements use a separate texture
array, leaving the original textures available immediately on disable.

Point lights cover the nearest 16 on the active plane. The 2048px shadow map uses
3x3 filtering and a texel-snapped projection. World depth updates at 15 Hz, with immediate
refreshes on teleports, plane changes, environment changes and roof/draw-distance
changes. Missing/loading replacement images retain the cache texture, and layer
zero remains the shared white fallback. Each frame copies cached world depth and
adds current actor shadows, so moving bodies cannot receive shadows from their
previous positions or poses. Smooth normals use triangle facing rather than a
camera-facing flip, keeping silhouette lighting continuous. Shadow bias uses the
geometric face normal. Opaque shadow draws skip material sampling
and normal calculations; cutout shadows retain texture alpha. Point-light searches
refresh at 30 Hz, or immediately after moving a tile or changing planes. Integer terrain corners
fetch only their own height-map normal instead of all four neighbouring normals.
Fragments outside a point light's radius skip its lighting calculation, and matte
materials skip specular calculations.

Compatibility limits: architecture normals remain geometric; area-specific terrain
recolouring, height fixes, seasonal themes and displacement maps are not ported.
Default floor recipes retain the cache's blended colours.

Run `yarn test:hd` in `client`. To generate the optional WebGL browser check:
`yarn test:hd /tmp/elvarg-hd-shader-check.html`.

117HD-derived data/assets use the license at
`textures/LICENSE-117HD.txt`; texture credits are in `textures/000_licenses.txt`.
To refresh materials from a local upstream checkout:
`python3 client/scripts/hd/import-materials.py /path/to/RLHD` from the repo root.
<!-- end-source-document: tsps-upstream/client/game/plugins/hd/README.md -->

---

<a id="doc-tsps-upstream-client-public-images-water-readme"></a>
## tsps-upstream/client/public/images/water/README.md

<!-- source-document: tsps-upstream/client/public/images/water/README.md -->
Water maps copied from 117HD/RLHD.

Texture source: https://github.com/117HD/RLHD/tree/master/src/main/resources/rs117/hd/scene/textures
Water type/color source: https://github.com/117HD/RLHD/blob/master/src/main/resources/rs117/hd/scene/water_types.json
License: BSD 2-Clause, copied in LICENSE-117HD.txt.

Files:
- water_flow_map.png
- water_normal_map_1.png
- water_normal_map_2.png
- water_foam.jpg
- caustics_map.jpg
- underwater_flow_map.png
<!-- end-source-document: tsps-upstream/client/public/images/water/README.md -->

---

<a id="doc-tsps-upstream-docs-achievement-diaries"></a>
## tsps-upstream/docs/achievement-diaries.md

<!-- source-document: tsps-upstream/docs/achievement-diaries.md -->
<a id="doc-tsps-upstream-docs-achievement-diaries--achievement-diaries"></a>
### Achievement diaries

The diary framework lives in `server/plugins/diaries/`, and its data is `server/data/definitions/achievement-diaries.json`. It covers:
- progress and the diary tab;
- every diary's task list;
- claiming rewards from all 12 diary NPCs;
- the reward lamps;
- an admin command.

**What's not here yet:** no task is wired to gameplay. Follow-up PRs make existing plugins complete tasks, one diary at a time, and add the reward items' effects.

<a id="doc-tsps-upstream-docs-achievement-diaries--completing-tasks-from-a-plugin"></a>
#### Completing tasks from a plugin

```js
// Marks the task done (once); request.completed tells whether it was new.
api.emitCustomEvent("diary:task", { player, diary: "ardougne", task: "steal-a-cake-from-the-ardougne-market-stalls" });

// For effects: is a tier finished?
const request = { player, diary: "ardougne", tier: "hard" };
api.emitCustomEvent("diary:is-complete", request); // request.complete
```

- **Diary keys:** `karamja`, `ardougne`, `falador`, `fremennik`, `kandarin`, `desert`, `lumbridge`, `morytania`, `varrock`, `wilderness`, `western`, `kourend`.
- **Task keys:** the task's text in lower case with dashes, cut at 48 characters, as listed in the data file.

<a id="doc-tsps-upstream-docs-achievement-diaries--admin-command"></a>
#### Admin command

| Command | What it does |
| --- | --- |
| `::diary <name>` | Shows each tier's progress |
| `::diary <name> <easy\|medium\|hard\|elite\|all> complete` | Completes the tier(s) task by task, with the messages and the tier-complete box |
| `::diary <name> <tier\|all> reset` | Clears the tier(s), claimed rewards included |

Names match like `::quest`: a key or name in any case, or a unique part of a name.

<a id="doc-tsps-upstream-docs-achievement-diaries--from-the-captures"></a>
#### From the captures

The rsprox captures cover opening every diary, completing ten Ardougne easy tasks, claiming the reward from Two-pints, and logging in afterwards.

**Completing a task** sends, on one tick:
1. The game message `<col=dc143c>Well done! You have completed an easy task in the Ardougne area. Your Achievement Diary has been updated.</col>`.
2. The tier's count varbit + 1 (`ardougne_easy_count`, 6291).
3. On a diary's first task, its started varbit.

OSRS also sets one bit per task in a varp (Ardougne: 1196/1197). No cache script reads those bits, so progress is kept server-side and the varps aren't sent.

**The tier's last task:** 3 ticks later, the tier's complete varbit is set (Karamja's legacy easy to hard tiers use the value 2), and a message box says "Congratulations! You have completed all of the easy tasks in the Ardougne area. Speak to Two-pints at the Flying Horse Inn in Ardougne to claim your reward."

**The task list** opens when a row of the diary tab (259:2, slot = the diary's index in cache enum 595) is clicked. The server:
1. sets `pagepos` (varp 334) to the line count and `busy` (12393) to 1;
2. runs script 6844;
3. writes the title (741:2) and every line (741:4 onwards):
   - tier headers are yellow, or green once the tier is done;
   - finished tasks are `<str>`, open ones `<col=000000>`;
   - each claimed tier gets the reminder "If I ever lose my … I can speak to …";
4. runs script 2524, opens the journal scroll (741) as the main modal, and runs script 6845 with the line count.

Each diary's layout differs slightly (blank lines, Kourend's `</col>` endings), so the data file keeps the captured lines around each tier. The test rebuilds all 12 captured lists line for line.

**When the side journal mounts the tab,** the rows get OP1 and OP2 (`if_setevents` on 259:2, slots 0–11).

**On login,** each diary's started, count, complete and reward varbits are sent, only those that are set.

**Claiming (Two-pints):**
1. The player: "I've completed all of the easy tasks in my Ardougne achievement diary!"
2. Two-pints: "I can see that, well done! You'll be wanting your reward then!"
3. The player: "Yes please!"
4. The reward varbit (`ardougne_easy_reward`, 4499) = 1, then Ardougne cloak 1 and an easy lamp, then the reward speech, "Wow, thanks!" and "If you ever lose your cloak, come back to me to reclaim it."

<a id="doc-tsps-upstream-docs-achievement-diaries--varbits"></a>
#### Varbits

Script 56 reads started and complete; script 2200 reads count, the total and reward.

| Diary | Started | Count (easy–elite) | Complete | Reward |
| --- | --- | --- | --- | --- |
| Karamja | 3576 | 2423, 6288, 6289, 6290 | 3578, 3599, 3611 (= 2), 4566 | 3577, 3598, 3610, 4567 |
| Ardougne | 4448 | 6291–6294 | 4458–4461 | 4499–4502 |
| Falador | 4449 | 6299–6302 | 4462–4465 | 4503–4506 |
| Fremennik | 4450 | 6303–6306 | 4491–4494 | 4531–4534 |
| Kandarin | 4451 | 6307–6310 | 4475–4478 | 4515–4518 |
| Desert | 4452 | 6295–6298 | 4483–4486 | 4523–4526 |
| Lumbridge & Draynor | 4453 | 6311–6314 | 4495–4498 | 4535–4538 |
| Morytania | 4454 | 6315–6318 | 4487–4490 | 4527–4530 |
| Varrock | 4455 | 6319–6322 | 4479–4482 | 4519–4522 |
| Wilderness | 4457 | 6323–6326 | 4466–4469 | 4507–4510 |
| Western Provinces | 4456 | 6327–6330 | 4471–4474 | 4511–4514 |
| Kourend & Kebos | 7924 | 7933–7936 | 7925–7928 | 7929–7932 |

<a id="doc-tsps-upstream-docs-achievement-diaries--rewards"></a>
#### Rewards

**From the Wiki:**
- **Items:** each tier gives "<diary item> 1–4" plus a lamp.
- **The lamps:** easy 2,500 XP (skill at least 30), medium 7,500 (40), hard 15,000 (50), elite 50,000 (70). Karamja's easy to hard tiers give Karamja's own lamps instead: 1,000 (any level), 5,000 (30) and 10,000 (40).

**The claim conversations** come from each NPC's Wiki transcript, stored per tier in the data file. Claiming works like this:
- **Which tier:** the lowest finished, unclaimed tier, as long as every lower tier is finished. Otherwise Talk-to plays the NPC's transcript as before.
- **Skill requirement:** Ardougne's elite reward needs 91 Smithing, per its transcript.
- **Reclaiming:** the transcript's "<NPC> gives you another …" line hands back the highest claimed tier's item, if the player owns none.

<a id="doc-tsps-upstream-docs-achievement-diaries--lamps-and-the-xpreward-interface"></a>
#### Lamps and the xpreward interface

Every lamp (the genie's lamp and the diary lamps) uses OSRS's "Choose the stat you wish to be advanced!" interface (xpreward, 240), through `server/plugins/interface/XpReward.plugin.js` and the `xpreward:open` event. As captured rubbing a genie's lamp:

| Step | What happens |
| --- | --- |
| Rub | `busy` = 1; varp 261 (the lowest level a skill can be chosen at; the diary lamp's level) and varp 262 (the skills offered, one bit each from enum 81, all set; a clear bit gives "This skill is not available.") are set; 240 opens as the main modal with its 24 skill slots (240:0) as pause buttons, and the title is written on 240:26 |
| Choose and confirm | Client-side (cache scripts 3804/3806/3809). Only the confirmed slot reaches the server, as a resume on 240:0; slot + 1 is a key of enum 681, which gives the stat. Enum 680 names it ("Runecraft") |
| The reward | A message box ("Your wish has been granted!<br>You have been awarded 980 Runecraft XP!" for the genie's 10 × level), sound 2655, the interface closed; `busy` = 0 when the box is dismissed |

<a id="doc-tsps-upstream-docs-achievement-diaries--unverified"></a>
#### Unverified

- **The NPC locations in the tier-complete box and the reminder.** Only Ardougne ("Two-pints at the Flying Horse Inn in Ardougne") and the Karamja, Morytania and Western reminders are captured; the rest follow the Wiki's description of where the NPC stands.
- **Messages this server writes itself:**
  - "You need 2 free inventory spaces to claim your reward."
  - "You don't need another … right now."
  - the diary lamps' message box, "You have been awarded … XP!" (the genie lamp's is captured).
- **The task message's area name for the other diaries:** "… in the Kourend & Kebos area."
<!-- end-source-document: tsps-upstream/docs/achievement-diaries.md -->

---

<a id="doc-tsps-upstream-docs-agility-courses"></a>
## tsps-upstream/docs/agility-courses.md

<!-- source-document: tsps-upstream/docs/agility-courses.md -->
<a id="doc-tsps-upstream-docs-agility-courses--agility-courses-added-from-the-wiki"></a>
### Agility courses added from the Wiki

Courses live in `server/plugins/skills/agility/courses/`, one file each, run by
`Agility.plugin.js`. Levels, XP, pet rates and requirements come from the OSRS Wiki; object ids and
tiles from the rev-241 cache (`yarn dump:loc`); movement from rsprox captures where they exist
(`rsprox_index.py trace`), otherwise it is a guess and says so below.

<a id="doc-tsps-upstream-docs-agility-courses--shared-obstacles"></a>
#### Shared obstacles

Some courses share obstacles. A course with `sharesWith: { course, through }` continues a lap that
the other course began, through that obstacle index; when a clicked object belongs to more than
one course, the entry that continues the player's lap is used. A full lap's bonus counts the shared
obstacles' XP once.

<a id="doc-tsps-upstream-docs-agility-courses--shayzien-agility-course-basic-and-advanced"></a>
#### Shayzien Agility Course (basic and advanced)

- **Shared start:** the ladder, monkeybars and first tightrope belong to the basic course
  (`ShayzienBasic.js`); the advanced course (`ShayzienAdvanced.js`) shares them through obstacle 3.
- **Levels and XP:** the Wiki since the 2024 rebalance: basic 1 (153.5 a lap), advanced 45 (507.5),
  and no obstacle fails. Both laps add up from the obstacles alone, with no lap bonus.
- **Captured** (rsprox 1632, rev 226; the only recording): the ladder (reach up, on the platform a
  tick later), the monkeybars (on, about 12 tiles along, off, dropping to 1541,3633 on plane 2,
  with sounds 2474, 2470 and 2473) and the first tightrope (sound 2495).
- **From the cache's platform decking** (`shayzien_agility_decking01` and the tightrope and
  monkeybar pieces), not captured: the bar, both basic tightropes, the beams and the edges.
- **Guesses, to check in game:**
  - the beam swing (the cache has no Shayzien swing; `dorgesh_grapple_swing` is used);
  - where the gap's jump lands (1554,3639) and where the zipline lands (1522,3626);
  - the mark of grace tiles.
- **Not sent:** the course's progress varbits (`shayzien_agility_low_progress`) and the agility
  helper highlight; no other course sends them either.
- The start ladder is named "Ladder", so the Agility plugin claims it from the Ladders plugin
  (`ladders:climb`).

<a id="doc-tsps-upstream-docs-agility-courses--colossal-wyrm-agility-course-basic-and-advanced"></a>
#### Colossal Wyrm Agility Course (basic and advanced)

- **Files:** `ColossalWyrmBasic.js` and `ColossalWyrmAdvanced.js`, with their shared steps in
  `ColossalWyrmSteps.js`. The advanced course shares the start ladder and first tightrope
  (`sharesWith`, through obstacle 2), and both end on the same zipline.
- **Levels and XP:** 50 and 62, never failed. Per obstacle, the course page's tables since the 2026
  rework: basic 601.6 a lap, advanced 1053.6. (The page's text says 633 for basic, which its own
  table doesn't add up to; the obstacle pages still show the older values.)
- **Obstacles that need no click** (the edges after the first tightrope, the edge after the basic
  rope, the rope after the advanced tightrope) run as part of the obstacle before them, and their
  XP goes with it.
- **Tiles:** each obstacle ends on its termite marker (`varlamore_wyrm_agility_*_termites`), which
  sits where the obstacle drops the player.
- **Captured** (rsprox 1106 and 1108, rev 237, a Leagues world, before the August 2026 rework that
  made the basic course about 25% and the advanced about 40% slower): the start ladder, the edge
  jumps after the first tightrope (a run-up, then six hurdles three ticks apart), the advanced edge
  (a step back, a run-up, three long hurdles), the ropes (`wyrm_agility_ledge_*`), the basic rope's
  long jumps and the zipline (2 tiles a tick, the jump off, the fall and getting up). Timing is
  therefore the pre-rework one.
- **Wiki:** the lines said at the pauses on the last rope (one pause on basic, two on advanced).
- **Guesses:** where the tightropes wobble and the ropes pause, and the advanced ladder's top tile
  (1648,2908; the next recorded step starts beside it).
- **Not given yet:** termites, blessed bone shards and Worm Tongue's rewards; the giant squirrel
  rate is unknown on the Wiki since its 2026 change, so these courses don't roll it.

<a id="doc-tsps-upstream-docs-agility-courses--werewolf-agility-course"></a>
#### Werewolf Agility Course

- **Files:** the course is `Werewolf.js`; the trapdoor, the stick throw, the trainers' lines and
  the Talk-To variants are `plugins/areas/WerewolfAgility.plugin.js`, which reacts to the Agility
  plugin's `agility:obstacle-start` event.
- **Access:** the trapdoor east of Canifis opens and is climbed down only with a ring of Charos
  worn (Wiki); otherwise its werewolf guard refuses. Inside, the obstacles don't need the ring,
  but the trainers call you "human" without it (Wiki transcripts).
- **A lap:** five stepping stones (10 XP each), three rows of hurdles (20 each), a pipe (15), the
  skull slope (25) and the deathslide (200), then the stick handed to the Agility Trainer at the
  bottom ("Give-Stick", 380, and the lap count): 730, the Wiki's lap. All sticks carried go when
  one is handed in (Wiki). The hand-in is a course obstacle done on an NPC (`npc` in the course
  data), so the lap, its message and the pet roll work as on any course.
- **The stick:** the Agility Boss throws it when the first stone is jumped onto ("FETCH!!!!!"), or
  asks "Why didn't you hand the stick over?!!?" if one is already carried (Wiki). The projectile is
  captured (338, `waa_stick_travel`); where it lands, beyond the pipes, is a guess.
- **Captured** (rsprox 366, 1849, 1858; rev 227-231, mostly Leagues): the trapdoor (sound 91,
  "The trapdoor opens..."), the guard's two lines on climbing down, the stepping-stone jump
  (`human_jump_stones`), the hurdles, the deathslide (by the teeth, 5 tiles a tick, its two
  messages and sounds) and the hand-in message.
- **From the map, not captured:** the pipe crawl, the skull slope climb, and the tiles either side
  of the trapdoor and the exit ladder.
- **The deathslide's failure is a guess:** the Wiki says Agility, Strength and carried weight all
  count, with no formula; it fails on Agility alone here (never from 80), partway down onto the
  spikes for 10-30 damage and 160 XP. A helmet is refused with the trainer's line (Wiki), as a
  message rather than his dialogue.
- **Not done:** marks of grace (no tiles known), the Skullball course, and putting a logged-out
  player back at the entrance.
<!-- end-source-document: tsps-upstream/docs/agility-courses.md -->

---

<a id="doc-tsps-upstream-docs-agility-shortcuts"></a>
## tsps-upstream/docs/agility-shortcuts.md

<!-- source-document: tsps-upstream/docs/agility-shortcuts.md -->
<a id="doc-tsps-upstream-docs-agility-shortcuts--agility-shortcuts-captured-behaviour"></a>
### Agility shortcuts: captured behaviour

The shortcuts live in `server/data/definitions/agility-shortcuts.json` (format:
`server/plugins/skills/agility/README.md`). Entries with a `note` of `rsprox captures <ids>` were
rebuilt from live OSRS recordings (rsprox, revisions 223-239); the rest follow the Wiki and the map,
and say what is still a guess in `unverified`.

<a id="doc-tsps-upstream-docs-agility-shortcuts--how-the-captures-were-used"></a>
#### How the captures were used

- **Per attempt, not merged:** each recording's events from the player's arrival (exact moves,
  animations, sounds, messages, teleports), tick by tick (`rsprox_index.py trace`). Merging
  attempts mixes up multi-step crossings such as the Barrows wall's run-up.
- **Normal worlds first:** Leagues and event worlds are used only where nothing else was recorded;
  the Nemus Retreat shortcuts are the only ones like that, and their `note` says so.
- **Step timing is the capture's:** the next step starts when the capture shows it, even when an
  exact move's cycles run longer (the North Iorwerth tight gap's crawl is cut short a tick in).
- **Ids by name:** every animation is resolved by its gamevals name in the rev-241 cache, not copied
  from the recording's revision. Sounds are recorded as ids only.
- **Tiles checked:** every end tile a capture moved was checked against the rev-241 collision map.
  The Varrock trellis lands on its own tile in the capture, which this map blocks, so it lands a
  tile further in.
- **XP stays the Wiki's:** some recordings are from Leagues, whose XP multipliers make the captured
  XP unreliable (the Barrows wall shows both +160 and +368 for the same crossing).
- **One direction captured:** the other mirrors it, and the entry says so in `unverified`.

<a id="doc-tsps-upstream-docs-agility-shortcuts--what-the-captures-showed"></a>
#### What the captures showed

| Shortcut | Captured |
| --- | --- |
| Obstacle pipes (Edgeville, Taverley, Yanille dungeons) | two 3-tile halves, each 749 from cycle 30 to 126, landing 4 ticks later with sound 2489; the second starts a tick after the first lands. The `pipe` builder does this for every pipe |
| Broken walls (Nemus Retreat) | 840 (`human_walk_crumbledwall`) over 70 cycles, sound 2453 |
| Tunnel (Nemus Retreat) | duck, crawl, emerge: three 1-tick moves, sound 2452 |
| Trellis (Varrock) | 12091 (`human_climb_trellis`), cycles 99-112, sound 2461 twice (the second 75 cycles in) |
| Cliff rocks (Aldarin, Ice Mountain, the Great Conch, Ralos' Rise) | down with 740, up with the climbing loop (4435), facing the cliff both ways, sound 2454 looped |
| Rocks (Trollheim, Crandor, Waterbirth Island) | 1148 over 120 cycles facing the cliff, sound 2454 |
| Dry stone wall (Barrows) | two steps back (820), a step's run-up (1995), then the hurdle (1603, cycles 8-50) over the wall; sound 1936; "You jump over the wall." a tick after the hurdle starts |
| Stepping stones (Necropolis, Wilderness Chaos Temple) | a jump (741) a stone every 2 ticks, sound 2461; Necropolis says "You attempt to cross using the stepping stone(s)..." and "You successfully make it to the other side." |
| Stepping stones (Lumbridge Swamp Caves) | two leaps with 769 (`human_steppingstonejump`), cycles 58-70, "You leap across with a mighty leap!" |
| Tunnels (Asgarnian Ice Dungeon) | the long crawl (2796) and a teleport; the wyvern tunnel shows four messages over 8 ticks |
| Crevices (Waterbirth, Shaman Caves), hole (Fossil Island), cave (Meiyerditch) | the crawl animation, a tick, the message and a teleport |
| Tight gaps (North and South Iorwerth Dungeon) | squeeze in, crawl, squeeze out, a tick apart; sounds 2489 and 2490; "You squeeze through the tight gap." |
| Chain (Chasm of Fire) | one way down: "You deftly slide down the chain, leaping off before landing on the cage.", sound 2461 and a teleport to the floor below |
| Jutting walls (Zanaris) | a 2-tile side-step from cycle 28 to 124, sound 2489 and "You try to squeeze past.", sound 2490 five ticks later |
| Strange floor (Fremennik Slayer Dungeon) | a 2-tile run-up (1995) with sound 2464, the 2-tile hurdle (1603) a tick later, both cycles 8-50 |
| Stepping stones (Karamja) | a stone a click: 769 with delay 20, cycles 48-60, sound 2461; "You attempt to balance on the stepping stone." and "You manage to make the jump." |
| Stepping stone (Pollnivneach) | onto the stone and a diagonal jump to the far bank, a jump every 2 ticks (741), sound 2461 |
| Rocks (Shilo Village) | rock tile to rock tile, 1148 over 90 cycles facing south |
| Rock slide (Cairn Isle) | 740 over 120 cycles, delay 15, facing west (only eastward recorded) |
| Climbing rocks (Yanille, Taverley), log balance (Fremennik) | only the sound and messages: walks and their animations are not in the recordings, so the movement stays a guess |
| Grapple walls (Falador, Yanille) | rev 237 (the newest): fire and climb in one animation (1779) with its graphic (3575) and sound 2928, a screen fade, the teleport onto the wall 7 ticks in (rev 230 took 10, with 4455/760). The fade isn't sent yet |
| Pillar (Ruins of Mokhaiotl) | a 3-tile jump (12196) in 27 cycles, sound 2461; a tick later varbit 16716 (`moki_agil_shortcut_side`) flips, so only the far pillar shows "Jump-to" (the runner's `varbit` step) |

<a id="doc-tsps-upstream-docs-agility-shortcuts--still-unverified-with-what-the-captures-show"></a>
#### Still unverified, with what the captures show

- **Broken Raft, Crossbow Tree:** grapple, the rope added as scenery, the side panels hidden, a
  swim along the rope (their own swimming animations) and a chance the grapple breaks. Needs its
  own script.
- **Gap (Chasm of Fire):** only event-world recordings, and the recorded moves and the server
  position disagree by a tile or two.
- **Mysterious pipe (Mount Karuulm):** its messages are chatbox message boxes and the minimap is
  hidden, which the step format can't express yet.
- **Wall (Darkmeyer):** recorded climbing up (39173, `human_reachforladder`, then a teleport to
  3595,3312 a tick later), but that half is on plane 1 and the other (39172) on plane 0; where the
  player stands needs another look. Not added.
- **No usable recording:** Crevices (Wilderness Slayer Cave) (5)-(8), Rocks (Trollheim hard and
  advanced).

<a id="doc-tsps-upstream-docs-agility-shortcuts--map-mismatches-found-on-the-way"></a>
#### Map mismatches found on the way

Every entry's `at` tile was checked against the rev-241 cache's placements.

- **Fixed:** the Yanille wall and its battlements are on 2556,3073 and 3074 (the entries said 3072
  and 3075), so grappling up and jumping down there did nothing.
- **Not fixed yet:** "Rocks (dense essence mine, north/south side)" point at 1761,3872-3873, where
  the rock is 34741, not their 27984/27985; and the 12 "Hole (Draynor Manor and Falador walls)"
  tiles have no hole in the cache at all (12656 is only placed at 2344,3651).
<!-- end-source-document: tsps-upstream/docs/agility-shortcuts.md -->

---

<a id="doc-tsps-upstream-docs-architecture"></a>
## tsps-upstream/docs/ARCHITECTURE.md

<!-- source-document: tsps-upstream/docs/ARCHITECTURE.md -->
<a id="doc-tsps-upstream-docs-architecture--architecture"></a>
### Architecture

XRSPS is a full-stack OSRS emulation engine. The client runs in the browser with React and WebGL. The server runs on Node.js with WebSocket networking. Both are written in TypeScript and share the same OSRS cache.

<a id="doc-tsps-upstream-docs-architecture--project-layout"></a>
#### Project Layout

The repository root contains the **`client/`**, **`server/`**, and **`docs/`** packages plus root scripts for setup and local development.

```
client/                 # @xrsps/client — browser CRA/craco app
  package.json
  craco.config.js
  public/
  scripts/cache/        # Cache export tooling
  common/               # Shared protocol/types (imported by server)
  game/                 # Game domains: chat, combat, ecs, login, input, sync…
  render/               # WebGL + overlays
  widgets/              # Widget tree, CS2 glue, GL widget draw
  components/           # React shell only
  network/              # Browser WebSocket client
  rs/                   # Cache loaders and OSRS engine code
  ui/                   # Canvas, menus, overlays

server/                 # @xrsps/server — Node WebSocket game server
  package.json
  caches/               # OSRS cache on disk (gitignored; downloaded via ensure-cache)
  scripts/              # ensure-cache, collision build, tooling
  tests/
  src/                  # Server core
  gamemodes/
  extrascripts/
  data/

docs/                   # @xrsps/docs — VitePress documentation
  package.json
```

Use `yarn setup` and `yarn start` from the repository root for local development. Package-specific commands can still be run from their package directory.

Shared protocol/cache code lives in `client/common` and `client/rs`; the server TypeScript project includes those paths.

<a id="doc-tsps-upstream-docs-architecture--where-code-lives"></a>
##### Where code lives

| Layer            | Directory                   | Purpose                                                                                                           |
| ---------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Client**       | `client/`                   | Browser React + WebGL game client.                                                                                |
| **Server**       | `server/`                   | Node WebSocket game server.                                                                                       |
| **Docs**         | `docs/`                     | Architecture and contributor docs.                                                                                |
| **Engine**       | `server/src/`               | Tick loop, networking, collision, pathfinding, packet routing, player sync. Never references a specific gamemode. |
| **Gamemodes**    | `server/gamemodes/{id}/`    | Server identity — rules, progression, content handlers, providers. Each gamemode is a self-contained directory.   |
| **Extrascripts** | `server/extrascripts/{id}/` | Universal modules that work on any server regardless of gamemode.                                                 |
| **Common**       | `client/common/`            | Types, constants, and utilities used by both client and server.                                                   |

<a id="doc-tsps-upstream-docs-architecture--client-code-conventions"></a>
##### Client code conventions

Adopted from our Vite site discipline, adapted for a game client:

- **File size:** Prefer **100–150** lines for app/domain code; **hard cap 400**. Exceptions: `client/rs/**` Jagex ports, generated/static data, opcode/ID tables, shaders.
- **`client/common`:** Non-UI code shared by **2+** domains (or by client + server). Prefer extending shared helpers over rewriting.
- **`client/components`:** React shell only. PascalCase folder = single component; lowercase folder = group with barrel; nested pieces under `ComponentName/components/`. Prefer `components/common` bases.
- **Game domains** (`game/`, `render/`, `widgets/`): lowercase folders for groups (`chat/`, `combat/`); PascalCase files for one class/module (`EnterToTypeChat.ts`). Groups may use `index.ts` barrels when stable.
- **Orchestrators stay thin:** `OsrsClient` and renderer facades wire explicit `*Deps`; feature logic lives in domain modules.

<a id="doc-tsps-upstream-docs-architecture--game-loop"></a>
#### Game Loop

The server runs a **600ms tick loop** — the same as OSRS. Each tick:

1. Process queued player actions (combat, skills, interactions)
2. Tick NPCs (AI, combat, movement)
3. Encode updates into binary packets
4. Send sync packets to all connected clients

The client receives `PLAYER_SYNC` and `NPC_INFO` packets each tick, decodes them, and renders the updated world state on the next frame.

<a id="doc-tsps-upstream-docs-architecture--networking"></a>
#### Networking

Communication is over **WebSocket** with a **binary protocol**. No JSON at runtime.

- Client packets: `client/common/network/ClientPacketId.ts`
- Server packets: `client/common/packets/ServerPacketId.ts`
- Message routing: `server/src/network/MessageRouter.ts`

Packets cover movement, interactions, widget clicks, combat, inventory, chat, and sync updates.

<a id="doc-tsps-upstream-docs-architecture--cache"></a>
#### Cache

Both client and server load the OSRS cache — the same binary format Jagex uses. It contains models, animations, maps, widgets, item definitions, NPC definitions, and more.

- **Server:** loads from disk via `initCacheEnv("caches")` (cwd = `server/`)
- **Client:** loads from IndexedDB (downloaded from CDN on first visit)
- **Loaders:** `CacheLoaderFactory` provides typed loaders (NPC types, obj types, loc types, animations, textures, etc.)

Cache files are stored in `server/caches/` (gitignored) and managed by `server/scripts/ensure-cache.ts`.

<a id="doc-tsps-upstream-docs-architecture--varps-and-varbits"></a>
#### Varps and Varbits

OSRS uses **varps** (player variables) and **varbits** (bit-packed sub-variables) to drive UI state. The server modifies varps, sends delta packets to the client, and client-side CS2 scripts react to the changes to update widgets.

This is how equipment panels, skill tabs, settings, and all widget state stays in sync — no custom UI packets needed.

<a id="doc-tsps-upstream-docs-architecture--actions"></a>
#### Actions

All player actions flow through the **ActionScheduler**:

1. Client sends an interaction packet
2. `MessageRouter` dispatches to the correct handler
3. Handler creates an action payload and queues it
4. On subsequent ticks, the scheduler executes the action
5. Type-specific handlers process it (`CombatActionHandler`, `SkillActionHandler`, etc.)
6. `EffectDispatcher` applies results (animations, XP drops, loot)

<a id="doc-tsps-upstream-docs-architecture--persistence"></a>
#### Persistence

Player state is stored through a **`PersistenceProvider`** interface (`server/src/game/state/PersistenceProvider.ts`). This decouples storage from game logic — the server doesn't care whether data lives in SQLite, Postgres, or another backend.

The default implementation is `PlayerPersistence`, backed by `game.sqlite` in each gamemode directory under `server/data/gamemodes/{id}/`. The same database stores password hashes and durable trade escrow/refund records. Existing `player-state.json` and `accounts.json` files are imported once and retained as rollback backups.

<a id="doc-tsps-upstream-docs-architecture--save-triggers"></a>
##### Save triggers

- **Login/logout** — saved immediately via `saveSnapshot()`
- **Autosave** — bulk save every 120 seconds via `savePlayers()`
- **Orphan expiration** — saved when a disconnected-in-combat player is removed

<a id="doc-tsps-upstream-docs-architecture--what-gets-persisted"></a>
##### What gets persisted

The `PlayerStateSerializer` (`server/src/game/state/PlayerStateSerializer.ts`) handles export/import of:

- Skills, hitpoints, location, orientation
- Inventory, equipment, bank (capacity, tabs, modes)
- Varps/varbits, combat settings, prayer, autocast state
- Equipment charges, degradation charges, collection log
- Gamemode-specific state (via `gamemode.serializePlayerState()`)

<a id="doc-tsps-upstream-docs-architecture--custom-backends"></a>
##### Custom backends

To implement a custom backend, create a class that implements `PersistenceProvider`:

```typescript
import type { PersistenceProvider } from "./game/state/PersistenceProvider";

class SqlitePersistenceProvider implements PersistenceProvider {
    applyToPlayer(player, key) {
        /* load from db */
    }
    hasKey(key) {
        /* check if exists */
    }
    saveSnapshot(key, player) {
        /* write to db */
    }
    savePlayers(entries) {
        /* bulk write */
    }
}
```

Then swap it in at `server/src/network/wsServer.ts` where `PlayerPersistence` is constructed. No other code changes needed.

For backends that need setup/teardown (database connections), implement `ManagedPersistenceProvider` which adds optional `initialize()` and `dispose()` hooks.

<a id="doc-tsps-upstream-docs-architecture--custom-content"></a>
#### Custom Content

Gamemodes and extrascripts can define content that doesn't exist in the OSRS cache. The custom content pipeline handles registration, serialization, and client-side resolution automatically.

<a id="doc-tsps-upstream-docs-architecture--custom-items"></a>
##### Custom Items

`CustomItemRegistry` (`client/custom/items/`) stores item definitions keyed by ID (50000+). Items can clone properties from existing cache items via `basedOn` and override specific fields.

- **Server:** `ServerCustomItemRegistry` merges custom definitions with base cache lookups
- **Client:** `CustomObjTypeLoader` wraps the base `ObjTypeLoader` and injects custom items transparently

<a id="doc-tsps-upstream-docs-architecture--custom-widgets"></a>
##### Custom Widgets

`CustomWidgetRegistry` (`server/src/game/scripts/`) stores widget group definitions that don't exist in the cache.

<a id="doc-tsps-upstream-docs-architecture--delivery"></a>
##### Delivery

Custom content reaches the client via the **gamemode content data packet** (`getContentDataPacket()` on `GamemodeDefinition`). The engine calls this during login and sends the result over WebSocket. The client unpacks it in `GamemodeContentStore` and re-registers items/widgets into their respective client-side registries.

This is a generic pipeline — any gamemode can use it to deliver arbitrary datasets alongside custom items and widgets.

<a id="doc-tsps-upstream-docs-architecture--content-systems"></a>
#### Content Systems

All gameplay content (skills, combat, shops, UI, etc.) is registered through the **script system** via `ScriptRegistry`. Content is organized into [Gamemodes](#doc-tsps-upstream-docs-gamemodes) (server identity and rules) and [Extrascripts](#doc-tsps-upstream-docs-extrascripts) (universal modules).

<a id="doc-tsps-upstream-docs-architecture--gamemode-hierarchy"></a>
##### Gamemode Hierarchy

```
BaseGamemode (abstract — OSRS defaults, no content)
  └─ VanillaGamemode (banking, shops, combat providers, skills, widgets)
       └─ LeaguesVGamemode (league-specific rules and content)
       └─ YourGamemode (extend vanilla, override what you need)
```

`BaseGamemode` (`server/src/game/gamemodes/BaseGamemode.ts`) provides sensible defaults for every `GamemodeDefinition` hook — 1x XP, Lumbridge spawn, no tutorial, standard drop rates. It registers no content.

`VanillaGamemode` (`server/gamemodes/vanilla/index.ts`) extends BaseGamemode with the full OSRS experience: banking, shops (via `ShopService`), equipment, all 13 global combat/spell providers, skill implementations, and UI widget handlers. Complex subsystems are extracted into dedicated service classes (e.g. `ShopService` wraps `ShopManager` + server integration) so the gamemode index stays thin.

Most community gamemodes should extend `VanillaGamemode` and override what they need. See [Gamemodes](#doc-tsps-upstream-docs-gamemodes) for details.

<a id="doc-tsps-upstream-docs-architecture--script-loading"></a>
##### Script Loading

At startup, the bootstrap pipeline:

1. Resets the script registry
2. Calls `gamemode.registerHandlers()` (registers all gamemode content)
3. Discovers and loads all extrascripts (registers universal content)

Extrascripts are loaded after the gamemode, so they can complement but not replace gamemode handlers.
<!-- end-source-document: tsps-upstream/docs/ARCHITECTURE.md -->

---

<a id="doc-tsps-upstream-docs-blast-furnace"></a>
## tsps-upstream/docs/blast-furnace.md

<!-- source-document: tsps-upstream/docs/blast-furnace.md -->
<a id="doc-tsps-upstream-docs-blast-furnace--blast-furnace"></a>
### Blast Furnace

The dwarven furnace under Keldagrim (`server/plugins/minigames/BlastFurnace.plugin.js`). Behaviour is from the OSRS Wiki and the dwarves' Wiki transcripts. Where they say nothing, it follows Offline_Scape's port (Zenyte lineage, no licence); every fact taken only from there is marked **(RSPS)** below so it can be checked against live.

<a id="doc-tsps-upstream-docs-blast-furnace--how-it-works"></a>
#### How it works

- **Getting there:** the stairs in Keldagrim (loc 9084 at 2930, 10196) go down to 1939, 4958, and the stairs in the furnace (9138) go back up to 2931, 10196 **(RSPS: tiles)**.
- **The coffer** (loc 29330, a multiloc on varbit 5356 that is set while it holds coins) has Use: deposit or withdraw coins.
  - The dwarves charge 72,000 coins an hour, "deducted as long as you're in this room with us" (Dumpy's transcript), so 12 coins a tick.
  - The HUD is interface 474 in the overlay slot (161:8). Its script reads varbit 5357 for the amount.
- **The foreman** lets smiths under 60 Smithing use the furnace for 2,500 coins for ten minutes. This runs through his transcript, both Talk-to and the Pay option: the plugin answers its coin, Smithing and Ring of Charos(a) conditions, and takes the fee on the "Okay, you can use the furnace for ten minutes." line. With the ring, the haggle costs 1,250. The chromium-ingot option is hidden because that content isn't in this server.
- **The conveyor belt:** Put-ore-on loads every suitable ore you carry, and using one ore on the belt loads just that ore. It needs coins in the coffer, and the foreman's permit under level 60.
  - Each ore needs the level of the bar it makes (coal needs 30, for steel).
  - The pot holds 28 ore that makes bars (copper, iron, silver, gold, mithril, adamantite and runite, all counted together), and 254 each of coal and tin **(RSPS)**. Ore over the limit stays in the inventory.
  - Each ore type rides the belt as its own NPC (2924-2932), one tile a tick for 3 tiles, then falls into the pot (animation 2434) **(RSPS: timing)**.
- **Smelting** happens when the belt is empty. It uses half the coal of a furnace (Wiki), and iron always succeeds.
  - Bars that need coal are made first, so iron with coal in the pot becomes steel, and any iron left over becomes iron bars.
  - Ore waits in the pot until there's enough coal for it.
  - The dispenser holds 28 of each bar **(RSPS)**. Ore it has no room for stays in the pot and is smelted once bars are taken.
  - XP is given as the bars are made. Gold gives 56.2 XP with goldsmith gauntlets or a Smithing cape.
  - The pot's ore and the dispenser's bars are sent as varbits 941-959 (RuneLite `BLAST_FURNACE_*`). Melting Pot and Bar dispenser "Check" list them.
- **The bar dispenser** is loc 9092, a multiloc on varbit 936: 0 empty, 1 pouring, 2 hot, 3 cooled. It pours for 2 ticks, then the bars stay molten for 16 ticks before they cool **(RSPS: timings)**.
  - Molten bars need ice gloves or smiths gloves (i), or a bucket of water thrown on them (animation 2450).
  - Take opens the skillmulti "What would you like to take?" menu, and gives as many as fit in the free inventory slots.
- **Also:**
  - The sink fills a bucket of water.
  - The temperature gauge opens interface 30.
  - The machinery's looping animations (belt 2435, cogs 2436) are sent when you enter.
  - The anvil gate (9141) needs 60 Smithing; below that, Jorzik's transcript line plays instead.
  - The coffer, ore, bars and permit are saved on the `blast-furnace` attribute.

<a id="doc-tsps-upstream-docs-blast-furnace--not-done"></a>
#### Not done

- **Working the furnace yourself:** the stove, pump, pedals, broken pipes and the temperature, all of which the dwarves now do.
- **Dumpy and Numpty's idle animations.**
- **Coal bag emptying onto the belt.** There's no coal bag in this server yet.
<!-- end-source-document: tsps-upstream/docs/blast-furnace.md -->

---

<a id="doc-tsps-upstream-docs-boss-hud"></a>
## tsps-upstream/docs/boss-hud.md

<!-- source-document: tsps-upstream/docs/boss-hud.md -->
<a id="doc-tsps-upstream-docs-boss-hud--the-boss-hud"></a>
### The boss HUD

The `BossHud` plugin (`server/plugins/interface/BossHud.plugin.js`) sends the boss health HUD, interface 303 `hpbar_hud`, for every boss that shows it: the Mad Angel, the Doom of Mokhaiotl, the Gemstone Crab and the Tombs of Amascut bosses.

<a id="doc-tsps-upstream-docs-boss-hud--how-it-works"></a>
#### How it works

The client mounts 303 at login (`encodeGameframeBootstrap`). Its own scripts draw the bar from:

| What | Id |
| --- | --- |
| The NPC | varp 1683 `hpbar_hud_npc` |
| Current and maximum | varbits 6099 `hpbar_hud_hp` and 6100 `hpbar_hud_basehp` |
| Boss mode | varbit 12401 `hpbar_hud_boss` |
| The bar's colours | 303:13, :14 and :15 (usually 25600, 576 and 800) |

The plugin sets those and runs the scripts: 2376 `hp_hud_open`, the fades 2887 (in) and 2889 (out), 2102 to redraw new colours, and 2249 to empty the container.

<a id="doc-tsps-upstream-docs-boss-hud--the-events"></a>
#### The events

A boss emits these per player, through `api.emitCustomEvent`. Each one sends only what changed.

| Event | Payload | What it does |
| --- | --- | --- |
| `boss-hud:show` | `player, npcId, current, maximum, colours?` | The values, the colours, 2376, then a fade in from 254 |
| `boss-hud:update` | `player, npcId?, current?, maximum?, colours?, force?` | Any of them; new colours are redrawn |
| `boss-hud:fade` | `player, fadeIn` | A fade in (from 255) or out (from 0) |
| `boss-hud:hide` | `player, fade = true, afterTicks = 4` | Fades out; `afterTicks` later, clears the values and hides `hp` |
| `boss-hud:reset` | `player` | Hides `hp` and empties the container |

- **Why the fade in from 254:** a finished fade-out leaves the bar's parts at transparency 255, and 2887 does nothing when told to start from the transparency they already have.
- **A pending hide** is cancelled by a show before it.
- **A hide with `afterTicks: 0`** clears the values at once. With a fade, `hp` stays shown so the fade can finish (the Doom's kill); without one, it is hidden too.

<a id="doc-tsps-upstream-docs-boss-hud--testing"></a>
#### Testing

`tests/boss-hud.test.cjs` checks each event against the captures. The Doom, Gemstone Crab and Tombs of Amascut tests route their custom events to the plugin.
<!-- end-source-document: tsps-upstream/docs/boss-hud.md -->

---

<a id="doc-tsps-upstream-docs-cache-revision-update"></a>
## tsps-upstream/docs/cache-revision-update.md

<!-- source-document: tsps-upstream/docs/cache-revision-update.md -->
<a id="doc-tsps-upstream-docs-cache-revision-update--updating-the-cache-revision"></a>
### Updating the cache revision

How the OSRS cache was moved from revision 237 to 241, written as a playbook for the next update.
The first half is the procedure and its tools; the second half records what 241 changed, what
broke, and how each problem was found, because the same kinds of change come back.

<a id="doc-tsps-upstream-docs-cache-revision-update--playbook"></a>
#### Playbook

<a id="doc-tsps-upstream-docs-cache-revision-update--1-work-in-a-separate-worktree-with-its-own-cache"></a>
##### 1. Work in a separate worktree with its own cache

`server/caches` is a symlink shared by every worktree, and `yarn ensure-cache` rewrites
`caches.json` for all of them. Give the update worktree a real `server/caches` directory, set
`server/target.txt` to the new cache (`osrs-<revision>_<date>`), and run `yarn ensure-cache` there.
Run the server and the client from that same worktree (see the client `node_modules` note in
`server/docs/agents/cache.md`).

<a id="doc-tsps-upstream-docs-cache-revision-update--2-read-what-the-revision-changed"></a>
##### 2. Read what the revision changed

| Source | What it gives |
|---|---|
| [zwyz/osrs-cache](https://github.com/zwyz/osrs-cache) | Every CS2 command with its signature per revision (`data/commands/*.txt`, lines tagged with a revision override older ones) and every config opcode (`src/main/java/osrs/unpack/config/*Unpacker.java`) |
| [RuneLite](https://github.com/runelite/runelite) `cache/` | A "cache: rev N" commit with each revision's new config opcodes |
| [rsprot](https://github.com/blurite/rsprot) `WHATSNEW.md` | Protocol changes per revision (long varps, GE prices, ...) |
| rsprox captures | What a live server sends; ids are checked against the cache |

<a id="doc-tsps-upstream-docs-cache-revision-update--3-identifiers"></a>
##### 3. Identifiers

`npx tsx scripts/generate-identifiers.ts --dry-run` (in `server/`) first, then without `--dry-run`.
Names stay on the ids they had: an id that lost its display name keeps its constant, and a name the
committed file gave another id is never reused (a renamed id drops its constant and fails to
compile, rather than silently pointing at something else). Fix the compile errors by name.

<a id="doc-tsps-upstream-docs-cache-revision-update--4-compare-the-two-caches-yarn-comparecache"></a>
##### 4. Compare the two caches: `yarn compare:cache`

```bash
# from a worktree still on the old cache
yarn compare:cache <new cache dir>
# from the new worktree, auditing the code as it was before the update
yarn compare:cache <old cache dir> --older --code <checkout before the update>
```

It lists, old to new:

- interface components that moved or are gone, and literal `(group << 16) | component` in code;
- DB table columns that moved (code reads columns by number);
- every varp/varbit the code uses whose definition is gone or changed, with what the scripts that
  used it read now. A varbit that only moved bits under the same name is harmless while it is set
  by id.

The code is read as written for the older cache: scanning code that is already migrated reports
the migrated ids as wrong, hence `--code`.

<a id="doc-tsps-upstream-docs-cache-revision-update--5-config-decoders"></a>
##### 5. Config decoders

The client test `cache-config-decode` decodes every config entry (items, NPCs, locs, sequences,
spot animations, enums, structs, varcs, ...) and fails on an unknown opcode or an entry that does
not end where its bytes do. The normal decoder treats a dat2 overflow as the end of an entry, so a
new opcode with a payload otherwise misreads silently. Add the opcode from zwyz/RuneLite.

<a id="doc-tsps-upstream-docs-cache-revision-update--6-client-scripts"></a>
##### 6. Client scripts

```bash
cd client
npx tsx scripts/cache/generate-command-signatures.ts <osrs-cache checkout> <revision>
npx tsx scripts/cache/cs2-sweep.ts [--compare <old cache dir>]
```

- `rs/cs2/CommandSignatures.ts` is generated: what every command pops and pushes, per stack.
- `cs2-opcode-coverage` (test): every instruction the cache's scripts use has a handler.
- `cs2-sweep`: runs all scripts and checks every instruction's stack effect against its signature,
  runs every handler alone on neutral values (covers instructions no script reaches), and lists
  JavaScript errors in handlers. `cs2-script-sweep` (test) holds it at zero. With `--compare` it
  also lists script errors new since the old cache; scripts run with dummy arguments there, so read
  that list (most entries are `cc_create` on component 0).
- Commands for features this client does not have go in `rs/cs2/handlers/UnsupportedOps.ts`
  (they pop their inputs and push neutral results).

<a id="doc-tsps-upstream-docs-cache-revision-update--7-interfaces"></a>
##### 7. Interfaces

```bash
npx tsx scripts/cache/interface-sweep.ts [--compare <old cache dir>] [--all]
```

Opens every interface as the game does (onLoad, then every transmit listener and timer once, as
when the server's first update arrives) and lists script errors and components showing item 0 or
"null" text that the old cache did not have. `*` marks interfaces our server opens. The
`interface-sweep` test asserts those load without script errors.

<a id="doc-tsps-upstream-docs-cache-revision-update--8-server-data-files"></a>
##### 8. Server data files

Data in `server/data/definitions` is keyed by id, and OSRS ids do not move, so most of it survives
an update. What to do with each source:

| Data | Source | On an update |
|---|---|---|
| `item-combat-styles.json` | cache DB table 78 | `yarn dump:item-combat-styles` (in `server/`) and commit the result |
| `item-gameplay.json` | an old export, no generator | `ItemDefinitionLoader` skips an entry whose name differs from the cache's (ignoring case), so list the entries that match the old cache's name but not the new one's and fix them by hand, checking the item against the cache (a rename can be a different item: check its params) |
| `monsters-complete`, `npc-drops`, `npc-dialogues`, `npc-dialogue-index`, `shops` | [osrsreboxed-db](https://github.com/DayV-git/osrsreboxed-db), built from the live Wiki | Usually already on the new revision; refresh only to pick up new content |
| `item-prices.json` | live Wiki prices | `yarn fetch:prices` if it predates the revision |
| `npc-spawns`, `object-spawns`, plugin data | captures and hand edits | Check NPCs whose name moved into a transform (below); a `npc-spawns` entry may name an `NpcIdentifiers` constant with `key` instead of a raw `id`, which follows identifier regeneration |
Data matched by name is what breaks: the loader check above, and strings in plugins. Most of 241's
1,133 item renames are capitalisation ("Staff of the Dead"), which the loader's check ignores.

When a name moves into a transform, the spawn keeps the nameless parent id (e.g. Brundt's 3926
resolves to 9263) and the named variant ids stay in `NpcIdentifiers` and `npc-dialogue-index.json`.
NPC interactions pass the resolved variant as `event.npcId` (`NPC.getContentId(player)`), so quest
plugins and the dialogue index meet the spawn on the same id; an item-on-NPC event carries it as
`npcId` too. New content should key on the named variants, and should not hardcode the parent id -
`NpcIdentifiers` only keeps a parent constant when the old file already named it.

<a id="doc-tsps-upstream-docs-cache-revision-update--9-world-map-and-the-rest"></a>
##### 9. World map and the rest

- `world-map-cache-format` (test): every map area, composite map and geography file decodes.
- `graphics-defaults` (test): the default sprites (compass, head icons, hint arrows, scrollbars).
- Map XTEA keys: `ensure-cache` writes OpenRS2's keys to `keys.json`. Since 241 there are none and
  map files are unencrypted; a missing key means "read as is" on both server and client.
- Full client tests (`yarn test`) and server tests (`yarn build`, then `node --test tests/*.test.cjs`).

<a id="doc-tsps-upstream-docs-cache-revision-update--10-play"></a>
##### 10. Play

The tools do not see behaviour that depends on server data, or features that never existed. Check
in game: world map (switch maps), compass and head icons, hover text and HUD overlays, chat, bank
(all buttons, tags), GE (buy, sell, collect, abort), shops, a skill menu, settings, sailing, and an
NPC whose name moved into a transform (see below).

<a id="doc-tsps-upstream-docs-cache-revision-update--what-revision-241-changed"></a>
#### What revision 241 changed

<a id="doc-tsps-upstream-docs-cache-revision-update--cache-formats"></a>
##### Cache formats

| Change | Symptom | Fix |
|---|---|---|
| Item opcodes 15 (not tradeable), 160 (never stackable), 251 (unlockable); later 99 (recolall, 2 bytes) and 161 (id list) | — | `ObjType` (client and server) |
| Seq opcode 19 (`crossworldsound`) | — | `SeqType` |
| NPC/loc/spot anim opcode 42 (recolall), spot anim 10 (`rotate=no`), varc opcode 3 (array type) | — (not used by 241 entries, except varc 3) | decoders; spot anims now throw on unknown opcodes |
| Graphics defaults: the sprite list moved to opcode 6 (12 sprites); opcodes 3/4/5 added | No compass, head icons, hint arrows, scrollbars | `GraphicsDefaults` |
| Map files are no longer encrypted: OpenRS2 has no XTEA keys for 241 (`keys.json` is `{}`) | none: with no key, map files are read as they are (all 2937 regions decode) | `CacheMaps` takes keys from `CachePipeline`; the edit-mode region pack no longer needs keys for loc data |
| World map (index 19) lost its group names; composite map entries lost their geography refs; geography (18) and ground (20) keyed by region `(x << 8) \| y` with file = map area id, headerless; chunk regions are one file per area holding only its chunks; decoration loc ids are ints | Map does not open | `WorldMapArea`, `WorldMapArchiveRenderer` |

<a id="doc-tsps-upstream-docs-cache-revision-update--client-scripts"></a>
##### Client scripts

| Change | Symptom | Fix |
|---|---|---|
| New commands: long maths/vars (`LongOps`), array commands (`array_fill`, `resize`, `insert`, `delete`, `indexof`, ...), `mes_typed`, `cc_childcount`, `stockmarket_sellable/value`, platform features | `Cs2Error: Unknown opcode 8010` and others; scripts stop halfway | handlers; `UnsupportedOps` for features we lack |
| Arrays in client variables (varcs with an array type) | Bank: `RuntimeException` in script 9551 | an array varc starts as an empty array of its type |
| `stockmarket_value(obj)(status, long)`: guide prices come from a table the client loads | GE prices 0 | server `/api/item-prices` (GE plugin), client `itemPrices.ts` |
| `stockmarket_getofferprice/completedgold` return longs | Wrong offer amounts | push longs |

<a id="doc-tsps-upstream-docs-cache-revision-update--interfaces-variables-and-tables"></a>
##### Interfaces, variables and tables

| Change | Symptom | Fix |
|---|---|---|
| Bank components +6/+7; chatbox `chatmodal` 567 → 568, `chatdisplay` 56 → 57 | Bank buttons, chat dialogs | `Bank.ts` named constants, literals |
| Varbit 4398 `ge_newoffer_price` → long varp 5753 | GE price 0, confirm shows "---" | new `VARP_LONG` packet (id 44): `PacketSender.sendVarpLong`, client `VarManager.setVarpLong` |
| Varbit 12377 `mouseover_text_enabled` → varbit 10035 `mouseover_text_disabled` (inverted) | HUD overlays under the hover text; an aerial fishing option switched on | Settings plugin sends 10035 = 0 |
| DB table 166 gained a column at 27; table 179 lost three | Sailing parts and facilities | `boatParts.js`, `boatFacilities.js` |
| Display names moved into NPC transforms (Morgan 3479, Dr Harlow 3480: name `null`, a varbit picks the named variant) | none: hooks resolve the variant | — |
| 431 object and 23 item names gone or reused | compile errors | identifiers regenerated; plugins renamed (e.g. "Scythe of Vitur") |
| Eight items renamed outright: 9487–9490 "Wizard blizzard" → "Cocktail glass", 9735/9738 "Desert goat horn" → "Goat horn", 23595/23596 "Berserker ring" → "Berserker ring (i)" | Their `item-gameplay.json` entries were skipped (23595 lost its bonuses) | names updated; 23595 takes the imbued +8 its cache params give |
<a id="doc-tsps-upstream-docs-cache-revision-update--bugs-the-tools-found-that-predate-241"></a>
#### Bugs the tools found that predate 241

Found by the stack and interface checks, present on 237 too:

- Misnumbered commands: component finds 202–207 (`cc_find_parent` was at 202, entity overlays ran
  it and broke the stack), `if_query_next` returned nothing, input-field setters 1133–1146,
  settings and notification commands 3120–3173, sidebar 6231/6232, `loc_name` 6800, world list.
- `enum` pushed by the enum's declared type instead of the requested one (type arguments were
  also labelled the wrong way round); `enum_getinputs` (8020) returned outputs and always threw;
  `array_randomise` (8001) sorted instead of shuffling (now `java.util.Random`, the order is our
  best guess); `oc_find` ignored its boolean; `array_push` (8024) was treated as an insert.
- Unset varc ints read 0; the OSRS client reads -1 (bank tags test `!= -1`, so every tag showed
  item 0 "Dwarf remains").

Not from the cache: public chat went to friends chat (`FriendsList.plugin.js` claimed every social
packet), and the GE's Collect and Abort buttons were never wired (465:6 and 465:23, children
created by scripts 793 and 819).

<a id="doc-tsps-upstream-docs-cache-revision-update--known-gaps"></a>
#### Known gaps

- Input fields (component type 16) are not drawn or edited; their setters only store values.
- GE: Modify offer and Repeat offer are not implemented.
- `chat_gethistory_*` (5003/5004) push eight values, more than the signature lists (the cache
  scripts read eight); `worldmap_getsourcecoord` (6618) is unused and its second output unknown.
- The script sweep's "new since" list needs reading; the interface sweep cannot reach code that
  only runs with server state (the bank crash needed tags that exist).
- REBUILD_NORMAL, REBUILD_REGION and world-entity packets still carry a key per region. The client
  decodes them but uses its own `keys.json`, and the server looks them up by region id while the
  keys are stored by archive id, so they are zeros. Dropping them changes the packet format, so
  they stay for now. XTEA decryption also stays for caches older than 241.
<!-- end-source-document: tsps-upstream/docs/cache-revision-update.md -->

---

<a id="doc-tsps-upstream-docs-climbing"></a>
## tsps-upstream/docs/climbing.md

<!-- source-document: tsps-upstream/docs/climbing.md -->
<a id="doc-tsps-upstream-docs-climbing--ladders-stairs-and-gangplanks"></a>
### Ladders, stairs and gangplanks

Where a ladder, staircase, trapdoor or gangplank leads is worked out from the cache's own map data. There is no list of coordinates. The code is `server/plugins/objects/Ladders.plugin.js` (the handlers) and `server/plugins/objects/ClimbLinks.js` (where they lead).

<a id="doc-tsps-upstream-docs-climbing--how-a-destination-is-found"></a>
#### How a destination is found

1. **The other end:** an object with a climb option in the opposite direction. For example, a Climb-up staircase pairs with a Climb-down one above it, and a trapdoor with the ladder below it.
   - **The plane above or below:** it is looked for there first, within a few tiles of the clicked object.
   - **Underground:** ladders and trapdoors on the ground floor lead 6400 tiles north, on plane 0, where OSRS keeps the area below. Going up from underground, the surface is checked first. Lumbridge castle's trapdoor at 3209,3216 opens over the cellar ladder at 3209,9616.
2. **The landing tile:** a walkable tile next to the other end, on a side it can be used from. That's its access mask and rotation, the same reach check object clicks use. Where several qualify, the one nearest the tile the player climbed from is used.
3. **Top-floor / Bottom-floor** (Lumbridge castle's staircases): the chain of staircases is followed to the last floor.
4. **Gangplanks** ("Cross" on both halves): between a dock (plane 0) and the ship's deck beside it (plane 1). The other half is the gangplank of the same name on the other plane. The landing carries on in the direction of travel, onto the deck or back onto the dock.

If the map has nothing at the other end, the click does nothing.

<a id="doc-tsps-upstream-docs-climbing--what-is-covered"></a>
#### What is covered

- **Names:** Ladder (and "ladder"), Staircase, Stairs, Steps, Trapdoor, Manhole, Spiral staircase, Vine ladder, Ship's ladder, Bamboo Ladder, Metal/Iron/Rope/Stone/Copper/Tower/Boney/Troll ladder, Kings' ladder, Ladder top, Rope, Climbing rope, Escape rope, Anchor rope, Rope anchor, Stairs up/down, Wooden Stair, Stone/Crystal/Crypt staircase, Broken stairs, Cellar stairs and Stairwell.
- **Options:** Climb (asks which way), Climb-up/Climb-down and their spellings (Climb up, Climb Down, Walk-up, Walk-down, Ascend, Descend), Top-floor, Bottom-floor, and a gangplank's Cross.

These come from a survey of every placed object in the cache with a climb option.

<a id="doc-tsps-upstream-docs-climbing--not-covered"></a>
#### Not covered

These lead somewhere content decides, so they belong in area, minigame and quest plugins (issue #119):
- "Enter", "Exit", "Leave-area", "Pass", "Jump" and "Squeeze-through" (cave entrances, portals, agility obstacles, minigame objects);
- trapdoors' and manholes' "Open", which swaps in an open object the cache doesn't link to.

<a id="doc-tsps-upstream-docs-climbing--when-content-knows-better"></a>
#### When content knows better

- **An explicit destination:** an area, quest or minigame plugin passes it through `ladders:climbUp` / `ladders:climbDown`. Edgeville, the Varrock sewers, the Wizards' Tower basement, Karamja and King Black Dragon do this.
- **Claiming the click:** a plugin claims it outright with `ladders:climb`. Castle Wars does this for its ladders, and Dragon Slayer for the Lady Lumbridge's gangplanks.

Objects that need a quest in OSRS (for example a Troll ladder, Kings' ladder or Crystal Staircase) can now be climbed wherever the map pairs them up. The quest should claim them when it is implemented.
<!-- end-source-document: tsps-upstream/docs/climbing.md -->

---

<a id="doc-tsps-upstream-docs-collection-log"></a>
## tsps-upstream/docs/collection-log.md

<!-- source-document: tsps-upstream/docs/collection-log.md -->
<a id="doc-tsps-upstream-docs-collection-log--collection-log"></a>
### Collection log

The collection log lives in `server/plugins/collectionlog/`. What it holds (tabs, categories and their items) is read from the cache. What a player has obtained, each category's count and the overview's recent items are persisted per player.

<a id="doc-tsps-upstream-docs-collection-log--what-counts"></a>
#### What counts

- **Loot counts the moment it drops**, not when it's picked up:
  - **Through `npc-drops:roll`:** every roll is read once its handlers have finished editing it. That covers NPC drops, the Gauntlet's chest and Doom's delve loot (its unique included).
  - **Through `collection-log:obtain`,** for content whose loot doesn't go through that roll:
    - ToA: as in OSRS, when the loot is claimed, i.e. when the sarcophagus is searched or a chest opened, each entry once;
    - Wintertodt: each crate reward;
    - the Colosseum: each wave's loot;
    - the Inferno and the Fight Caves: their capes.

    ToA, Wintertodt, the Colosseum and the Inferno roll only their pets through `npc-drops:roll` (Pets takes them from there), so no loot is counted twice.
- **Kills tally the category of the same name,** e.g. killing Zulrah adds to "Zulrah". Plugins that keep their own count answer for it instead (Zulrah, the Kalphite Queen).
- **Pets** report through the log (owned pets are synced silently on login).

From another plugin:

```js
api.emitCustomEvent("collection-log:obtain", { player, itemId, amount: 1 });   // ensure / silent optional
api.emitCustomEvent("collection-log:count", { player, category: "Barrows Chests", amount: 1 });
api.onCustomEvent("collection-log:category-count", (request) => {             // a kept count
  if (request.category === "Zulrah") request.count = kills(request.player);
});
```

**Admin command:**
- `::clog <item name|id> [amount]` obtains through the real path;
- `::clog count <category> <n>` sets a count;
- `::clog reset` clears the log.

<a id="doc-tsps-upstream-docs-collection-log--the-cache"></a>
#### The cache

| What | Where |
| --- | --- |
| Tabs | Structs 471–475: param 682 the name, 683 an enum of category key → category struct, 684 the tab index |
| A category | Struct param 689 the name, 690 an enum of position → item |

Our cache (revision 237) has 5 tabs, 122 categories and 1,703 distinct items. Live OSRS, where the captures come from, has a few more categories (57 boss categories to our 55), so category keys differ between the two. The client uses the same cache as the server, so they always agree with each other.

The client reads the log straight from its cache too. It used to override these enums and struct params with a bundled snapshot of an older cache (revision 235, `client/common/collectionlog/`). That put its categories one off from the cache, e.g. Zulrah at 53 instead of 54, so the snapshot was removed.

<a id="doc-tsps-upstream-docs-collection-log--from-the-captures"></a>
#### From the captures

**Login** sends:
- `collection_count` (2943) and its maximum (2944);
- per tab, the count and maximum: bosses 4613/4614, raids 4615/4616, clues 4617/4618, minigames 4619/4620, other 4621/4622;
- `collection_count_highscores` (4612) and `collection_count_unsynced` (4848);
- the 12 recent items at varps 4623, 4625 … 4645, each followed by its day number (days since 27 February 2002, UTC);
- `option_collection_new_item` (varbit 11959) = 3, for chat message plus popup.

**Opening the log** (account summary, row 6):
1. the last category's items in `collection_transmit` (620);
2. `collection` (621) opened in the floater (161:18);
3. OP1 on the burger menu (621:73, slots 10–12), the A–Z, space, backspace and tab keys (621:42–70), the search buttons (621:75–76) and the open tab's category rows;
4. `collection_draw` (script 7797) `[tab, container, background, text, scrollbar, tab struct, category]`.

| Tab | Struct | Button | Container | Background | Text | Scrollbar |
| --- | --- | --- | --- | --- | --- | --- |
| Bosses | 471 | 621:4 | 10 | 11 | 12 | 13 |
| Raids | 472 | 621:5 | 14 | 15 | 16 | 23 |
| Clues | 473 | 621:6 | 24 | 32 | 33 | 25 |
| Minigames | 474 | 621:7 | 26 | 27 | 36 | 28 |
| Other | 475 | 621:8 | 29 | 34 | 35 | 30 |

**A category** (a row on the tab's background, sub = its key), in this order:
1. `collection_category_count` (varp 2048): the category's count, shown by cache script 2735 ("Zulrah kills: 1").
2. `collection_last_category` (varbit 6906).
3. The obtained items in 620, **packed from slot 0** in category order. Zulrah's scales are its 10th item but arrive in slot 0.
4. `collection_draw`.

**A tab** sets `collection_last_tab` (varbit 6905), resets to its first category and enables its rows.

**Search:** every key typed sends:
1. OP1 on the results (621:84, 0 to the global category total);
2. one `collection_delayed_transmit` (script 4100) `[item, count, global category number, category struct]` per obtained item and category. The global number is a category's key plus the key ranges of the tabs before it.

**The overview** (908): the burger menu's slot 12 closes 621 and opens 908 in the floater, with OP1 on 908:7 (10–12), 908:22 (0–4) and 908:21 (0). Its section buttons reopen the log on that tab. Both close with `chatdefault_restoreinput` (script 2158).

**A new item:**

| When | What the server sends |
| --- | --- |
| The tick it's obtained | `collection_count_unsynced` + 1; `New item added to your collection log: <col=ff0000>{name}</col>`; sound 2304; `notification_display` (660) into the notifications slot (161:13) with script 3343 `["Collection Log", "New item:<br><br><col=ffffff>{name}</col>", -1]` |
| 5 ticks later | The total, highscore and tab counts, and the recent items shifted down |
| 13 ticks after the popup opened | The popup is closed |

<a id="doc-tsps-upstream-docs-collection-log--not-modelled"></a>
#### Not modelled

- **The Combat Achievements button** on a boss page (621:21); there's no combat achievement system.
- **The burger menu's other slots** (10, 11).
- **The per-item varbits** OSRS sends at login for a few items (`collection_item_*`, e.g. Zulrah's scales) and the `collection_other_*_completed` flags.
- **Loot that doesn't go through `npc-drops:roll` yet:** shops, Barrows, raids chests, clue caskets and others. Each needs a `collection-log:obtain` in a follow-up.
- **"Opened" and "completed" counts** for chests and minigames; they come with those follow-ups.
<!-- end-source-document: tsps-upstream/docs/collection-log.md -->

---

<a id="doc-tsps-upstream-docs-construction-features"></a>
## tsps-upstream/docs/construction-features.md

<!-- source-document: tsps-upstream/docs/construction-features.md -->
<a id="doc-tsps-upstream-docs-construction-features--construction-facilities"></a>
### Construction facilities

This pass adds usable facilities and regression tests to the existing house builder. All room templates, models, furniture previews and storage lists use this project's cache.

<a id="doc-tsps-upstream-docs-construction-features--implemented"></a>
#### Implemented

1. **Guests and permissions:** use the entrance portal's Friend's house option. Private chat and Ignore settings control entry; locked houses and building mode reject guests. Only owners can edit furniture, configure teleports or deposit/withdraw storage. The owner gets a right-click Kick option on guests while inside their own house. Settings → View House Options (also `::house`) opens native interface 370 for building mode, teleport preferences, doors, expelling guests and leaving. Guests remain when an owner exits; owner logout closes the instance safely.
2. **Portal chambers:** build frames and a teleportation focus, then use Direct-portal. Configuration checks Magic level and consumes 100 casts' worth of inventory runes, after confirmation. Guests can use directed portals without spending runes. Wilderness destinations require confirmation.
3. **Portal nexus:** one room per house, with marble, gilded and crystalline upgrades. Configuration consumes 1,000 casts' worth of runes. Capacity is four, eight, then all supported destinations. Upgrades retain destinations; removing a destination gives no rune refund.
4. **Altars:** prayer restoration, Ancient/Lunar/Dark spellbook toggles, occult upgrades, and bone offerings. Clean marrentill and a tinderbox light incense burners at 30 Firemaking. Each active burner in the same chapel adds 50 percentage points to the altar's Prayer multiplier. Burners expire and their appearance updates for occupants.
5. **Pools:** successive tiers restore special attack; then run energy; then Prayer; then lowered stats excluding Hitpoints; then Hitpoints and poison/venom. Boosts remain intact. Upgrades require the previous pool and actual potion/rune item IDs.
6. **Storage:** all six costume storage categories use native set/member/alternative enums. Use an item on furniture to deposit it, or open/search it to deposit eligible inventory items and withdraw individual items. Capacity and treasure tiers apply. Guests can view only. Upgrades preserve contents; occupied storage and rooms cannot be removed.
7. **Advertisements:** House Advertisement offers Add-House, View and Visit-Last. View opens the native cache interface (52), with sortable host rows, Construction levels, facility columns, Refresh Data and Add/Remove House. The cache scripts handle sorting, filtering and the Enter House action; the server supplies the rows and rechecks entry permissions when selecting a host. Advertisements disappear when the house closes, the owner leaves, the portal locks or building mode starts.

Guest rules follow the [player-owned house reference](https://oldschool.runescape.wiki/w/Player-owned_house). Teleport costs and capacities follow [portal chambers](https://oldschool.runescape.wiki/w/Portal_chamber) and [portal nexus](https://oldschool.runescape.wiki/w/Portal_nexus). Storage rules follow the [costume room reference](https://oldschool.runescape.wiki/w/Costume_room); burner timing follows [incense burners](https://oldschool.runescape.wiki/w/Incense_burner_%28Marble%29).

<a id="doc-tsps-upstream-docs-construction-features--house-controls"></a>
#### House controls

The native House Viewer (422) supports room selection, floor tabs, moving, rotating, deletion with confirmation, and returning to the portal. Adding a room uses the native Room Creation Menu (212). Moves retain furniture, configured destinations and stored items; validation protects the last portal, rooms supporting an upper floor, occupied storage, room counts and house dimensions. Furniture tooltips use the active revision-237 DB slot order.

House teleport spells apply the saved Inside and Default Building Mode preferences after the normal rune costs and teleport animation. Door preferences render solid open/closed doors or remove them and update instance collision for occupants. Entering/leaving clears movement so a kicked guest cannot continue an old house route.

Behavior references: [House Options](https://oldschool.runescape.wiki/w/Options#House_options) and [house planning and limits](https://oldschool.runescape.wiki/w/Player-owned_house#House_planning).

<a id="doc-tsps-upstream-docs-construction-features--current-boundaries"></a>
#### Current boundaries

- Teleports reuse the server's existing 38 spell destinations. Diary alternatives and destinations absent from that spell system are not added here.
- Nexus and storage management use paginated chatbox menus; their native interfaces, scrying and mounted amulets are not part of this pass. The advertisement board uses its native interface and its 200-house capacity. Houses currently use the Rimmington entrance.
- Offer bones individually by using them on the altar; automatic repeated offerings are not added.
- No servant hiring system exists yet; Call Servant reports that no servant is employed.
- The server has no account-mode, quest-completion or bank-PIN subsystem to enforce the corresponding OSRS restrictions. This pass does not create those systems.

<a id="doc-tsps-upstream-docs-construction-features--verification"></a>
#### Verification

Run the server build, then `node --test tests/presets-persistence.test.cjs` from `server`. The suite covers house lifecycle, permission changes after opening a menu, resource costs, saved destinations, storage conservation, upgrades, altar effects, pool tiers rotated nexus models, owner-only kicks without pathfinding, native settings, room moves and deletion safeguards, and door collision changes. The client production build checks compatibility with the existing UI runtime.

In-game follow-up: use two accounts to visit an advertised house, configure and use a portal, upgrade a pool through the furniture interface, light both chapel burners, deposit/withdraw costume items, then leave and reconnect. These live client interactions are manual checks, not claimed by the automated suite.
<!-- end-source-document: tsps-upstream/docs/construction-features.md -->

---

<a id="doc-tsps-upstream-docs-corporeal-beast"></a>
## tsps-upstream/docs/corporeal-beast.md

<!-- source-document: tsps-upstream/docs/corporeal-beast.md -->
<a id="doc-tsps-upstream-docs-corporeal-beast--corporeal-beast"></a>
### Corporeal Beast

The Corporeal Beast, built from the OSRS Wiki, a live rsprox capture (a games necklace teleport to one attack and a death) and the cache. Offline_Scape's port (Kris's, Zenyte-based) served as a reference for ids and the cave's layout; where its numbers differ from the Wiki, the Wiki is followed. It is one plugin, `server/plugins/bosses/CorporealBeast.plugin.js`, which delegates to one unit per area in `server/plugins/bosses/corporealbeast/`.

<a id="doc-tsps-upstream-docs-corporeal-beast--status"></a>
#### Status

| Phase | What | State |
| --- | --- | --- |
| 1 | The lair: cave, exit, passage, the room's overlay, spawns, multi-combat | Done |
| 2 | The Beast: its attacks, the stomp, damage reduction, regeneration, the damage overlay's count | Done |
| 3 | The dark energy core | Done |
| 4 | Tests (`server/tests/corporeal-beast.test.cjs`) and docs | Done |
| 5 | Spirit shields: blessing, sigils, the spectral passive on the Beast's drain | Done |

<a id="doc-tsps-upstream-docs-corporeal-beast--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `CorpShared.js` | Ids, tiles, the two copies of the lair, helpers. |
| `Lair.*` | The cave, its exit, the passage, and the room's overlay. |
| `Beast.*` | The Beast: its respawn, stomp, regeneration, damage reduction and the overlay's count. |
| `CorpAttacks.js` | The Beast's four attacks. |
| `DarkCore.*` | The dark energy core. |
| `SpiritShields.*` | Blessing spirit shields and attaching sigils. |

<a id="doc-tsps-upstream-docs-corporeal-beast--the-lair"></a>
#### The lair

The lair is in the map twice, 128 tiles apart, with the same locs: the room everyone uses and the one for ironmen of combat level 90 and up (Wiki). The capture was taken in the northern copy (y around 4382). The Wiki puts the normal room in the southern copy (y around 4254), so `CorpShared.ROOMS` does too; the ironman room isn't used yet.

| What | Where | Notes |
| --- | --- | --- |
| Cave (678, Enter) | (3201, 3679), Wilderness | Not while in combat (Wiki). Puts you at (2964, 4254) in the normal copy (Offline_Scape). |
| Cave exit (679, Exit) | (2963, 4254) and (2963, 4382) | "This exit leads to the Wilderness, are you sure?", then (3206, 3681) (Offline_Scape). |
| Passage (677, Go-through, Peek) | (2971, 4254) and (2971, 4382), 3 tiles wide | Go-through moves you across a tick later: x 2970 to 2974 and back (capture). No pets (Wiki); the message is Offline_Scape's. Peek counts the players in the room (Offline_Scape's messages). |
| Corporeal Beast (319) | (2994, 4253) and (2994, 4381), facing south | Capture: (2994, 4381) facing south; the southern copy is the same tile 128 south. Respawns 50 ticks after dying (Wiki). |

- **Multi-combat:** both copies, lobby and room, are multi-combat (Wiki; the capture sets the multi-way varbit on arrival).
  - This needed a core fix: `Wilderness.isMulti` tested every `world.json` multi-combat zone on plane 0, so no zone above ground ever applied. It now takes the plane.
- **The overlay:** in the room east of the passage, the Corp overlay (interface 13) opens on the HUD, and it closes on leaving (capture).
  - Script 693 shows varbit 999 as "Damage: N" ("Damage: Lots!" from 4,000).
  - Phase 2 keeps varbit 999 up to date.
- **The games necklace** lands at (2967, 4381), in the northern copy, where the capture's necklace landed (2966, 4380). `::teleports` (Bosses) goes to the normal room's lobby at (2966, 4252).

<a id="doc-tsps-upstream-docs-corporeal-beast--the-capture"></a>
#### The capture

Facts from `corp.txt` (games necklace, the private portal, the passage, about 25 ticks of the fight unarmed without prayer, and the death):

- **Private portal:** loc 9370 at (2966, 4379): "You can't have a private arena for your channel if you're not in a channel." It is OSRS's clan arena; not done here.
- **The controller:** attacking the Beast adds NPC 384 (`corp_beast_controller`) at (3001, 4383).
- **Timing:** attacks every 4 ticks (ticks 69, 73, 77, 81, 85, 89, 93).
- **Splitting attack:**
  - Anim 1679 with projectile 315 from the Beast's centre to the player's tile: start 21, 10 cycles a tile, heights 190 to 0.
  - Where it lands: splash 1836, then 6 projectiles 315 (start 10, end 41-61, heights 0) to tiles within 3, each with a 1836 splash as it lands.
- **Stat drain:** anim 1681 with projectile 314 at the player (21 to 41, end height 124), landing a tick later. "Your Prayer has been slightly drained!" or "Your Magic has been slightly drained!"; one drain came with a 0 hit.
- **Melee swipe:** anim 1683. **Block:** anim 1677. **Health bar:** 22, 160 wide.
- **Offline_Scape's mistake:** it swaps the splitting and draining animations (it has 1681 for the split and 1680 for the drain). By elimination, 1680 with projectile 316 is the plain magic attack.

The animations in `npc-combat-defs.json` are RuneLite's names: attack 1683, block 1677, death 1676.

<a id="doc-tsps-upstream-docs-corporeal-beast--the-beast"></a>
#### The Beast

**Attacks** (Wiki; ids and timings from the capture):

| Attack | When | Max hit | Ids |
| --- | --- | --- | --- |
| Melee swipe | 40% when beside one of its sides | 33; Protect from Melee blocks it | anim 1683 |
| Magic | Otherwise a third each (20% each when in reach) | 65 | anim 1680, projectile 316 (RuneLite; not captured) |
| Draining magic | | 55; a hit drains Magic or Prayer by 1-2 and heals the Beast by half the damage | anim 1681, projectile 314 |
| Splitting magic | | 40 on the tile, 30 beside it; then 6 splits within 3 tiles, 30 / 20 each | anim 1679, projectile 315, splash 1836 |

- It attacks every 4 ticks, from up to 15 tiles away. The 15 is Offline_Scape's; the capture's first attack came from 14 tiles.
- The Wiki's occasional 3-tick attack isn't done; the capture shows none.
- Protect from Magic takes only a third off its magic attacks, splits included. Hits are rolled as magic.
- Projectiles leave the Beast's centre at cycle 21 and take 10 cycles a tile; the splits take 31 + 10 a tile (capture). Heights are a quarter of the capture's, since the packet multiplies them by 4.
- The drain happens on any hit that landed, 0 included (capture). The Wiki says "a chance" on a successful hit.

**The 7-tick timer** (Wiki):
- **Stomp:** players under the Beast take 30-51, through prayer (anim 1686; Offline_Scape's message).
- **Empty room:** it heals 75, then 85, 95 and so on, and everyone's damage count is cleared.
- **Crowd:** with 8 or more players it heals 5 per player.

**Stats:** drained stats come back a level every 20 ticks. This uses a new per-NPC `setStatRestoreTicks` in core; the default stays 100.

**Damage reduction** (Wiki): melee and ranged deal half unless the weapon is Corpbane and used on a stab style.
- Corpbane: spears (not hastas), halberds, Osmumten's fang, the Thunder khopesh, King's barrage.
- Matched by name. Magic does full damage.

**Health bar:** type 22, 160 wide, over its head (capture). No boss health HUD is opened; the capture shows only the Corp overlay.

**The overlay's count:** each blow adds to the attacker's varbit 999. It resets when the Beast dies or the room empties.

**Loot:** the Wiki drop table in `npc-drops.json`, to the player who dealt the most damage (the engine's killer).
- The 12 drops the Wiki lists as noted carry `"noted": true` there, for example 125 adamantite ore and 75 magic logs.
- The generated file had lost every table's "(noted)" marks. Corp respawns 50 ticks after dying.

**Not done:**
- The ironman room's rules: kill credit and the brazier.
- The private clan arena.
- NPC 384, the invisible controller.

<a id="doc-tsps-upstream-docs-corporeal-beast--the-dark-energy-core"></a>
#### The dark energy core

Wiki, unless marked:
- **Spawning:** a 1/8 chance when the Beast takes a hit of 32 or more, and on each of its attacks below 1,000 HP. The Beast's attack timer restarts at 4 when one comes out.
- **Where:** it comes from the Beast's middle and jumps at once. That and the jump rhythm are **Offline_Scape**'s.
- **Jumping:** it jumps (projectile 319, RuneLite's DARK_CORE_JUMP) to the northernmost player, east as the tie-break, whenever nobody is beside it.
  - In flight it waits out of sight, one plane up, and lands with the projectile.
  - The flight is 30 cycles plus 30 every 3 tiles, every other tick (**Offline_Scape**).
- **Leeching:** every 2 ticks it takes 5-13 from each player beside it and heals the Beast by as much. The message is **Offline_Scape**'s.
- **Poison:** a poisoned core is stunned until it next hops, and can only be stunned once.
  - A stunned core leeches every 10 ticks. This is an estimate: the Wiki only says "very slowly".
- **Removal:** it goes when the Beast dies or nobody is left in the room. It never attacks and doesn't respawn.

<a id="doc-tsps-upstream-docs-corporeal-beast--spirit-shields"></a>
#### Spirit shields

Wiki:
- **Blessing:** a holy elixir on a spirit shield (85 Prayer, not boostable) makes a blessed spirit shield. It shows the transcript's "The spirit shield glows an eerie holy glow."
- **Sigils:** a sigil used on an anvil, with a hammer and a blessed spirit shield in the inventory, makes the arcane, spectral or elysian spirit shield.
  - Needs 90 Prayer (not boostable) and 85 Smithing (boostable). Gives 1,800 Smithing XP.
  - The sigil message and the level messages are estimates (no transcript).
- **Spectral passive:** it halves the Beast's prayer drain. Other prayer drains are spread over a dozen call sites with no shared path, so the passive doesn't reach them yet.
- **Elysian passive:** already in core combat.
- **Not done:** Abbot Langley's paid service.

<a id="doc-tsps-upstream-docs-corporeal-beast--developer-commands"></a>
#### Developer commands

| Command | What it does |
| --- | --- |
| `::corpkill` | In the room: finishes the Beast, credited to you, so its drop is yours. |
<!-- end-source-document: tsps-upstream/docs/corporeal-beast.md -->

---

<a id="doc-tsps-upstream-docs-disguised-crabs"></a>
## tsps-upstream/docs/disguised-crabs.md

<!-- source-document: tsps-upstream/docs/disguised-crabs.md -->
<a id="doc-tsps-upstream-docs-disguised-crabs--disguised-crabs-and-aggression-tolerance"></a>
### Disguised crabs and aggression tolerance

<a id="doc-tsps-upstream-docs-disguised-crabs--crabs"></a>
#### Crabs

`server/plugins/npcs/DisguisedCrabs.plugin.js`, with data in `server/data/definitions/disguised-crabs.json`. It replaces the old rock-crab-only plugin.

| Disguise (spawns as) | Crab | Ids (cache) |
| --- | --- | --- |
| Rocks | Rock Crab | 101→100, 103→102 |
| Boulder | Giant Rock Crab | 2262→2261, 5941→5940 |
| Sandy rocks | Sand Crab | 5936→5935, 7207→7206 |
| Fossil Rock | Ammonite Crab | 7800→7799 |
| Swampy log | Swamp Crab | 8299→8297 |
| Sandy Boulder | King Sand Crab | 7267→7266 |

**Waking.** A player who steps next to a disguise wakes it, unless the crab has become tolerant of them: per the Wiki, crabs can only be fought while they're aggressive.
Diagonal counts as next to.
1. Every crab beside the player rises (seq 1316) as its crab form.
2. It takes that form's hitpoints, so a giant rock crab has 180, not its Boulder's 10.
3. It stands still while it rises: 1316 lasts 74 client cycles, so 3 ticks.
4. Then it attacks. Whether each crab may attack (single-way or multi) is the normal combat rules' call.

**Resting.**
1. Out of combat for 20 ticks, a crab walks back to where it lay.
2. Back home, or after 10 more ticks, it sinks (seq 1314).
3. The next tick it is its disguise again, healed.

The 20 ticks aren't documented anywhere: they're an estimate, kept in the data file.

**Animations, from the cache:** every crab is built on one skeleton (frame groups 8286–8291).
- 1312/1313 attack and defend.
- 1314 sinks the crab; it's also the death animation.
- 1316 is 1314's frames reversed.

**Where it runs.** Crabs lie on coasts all over the map, so the plugin doesn't hook every player's tick:
- At startup it collects the 64×64 map squares that hold a disguise spawn.
- It follows players into and out of those squares (`onPlayerMapSquareChange`, plus login).
- One task, each tick, visits only those players and the crabs awake right now.

**Also:**
- **Slayer** matches a task by the npc's current form, so a woken Sand Crab counts for a crabs task, and gives the crab's hitpoints in XP.
- **Diary tasks:** Kourend & Kebos easy "Kill a Sandcrab", and Fremennik easy "Kill 5 Rock crabs" (the kills are counted).

**Not modelled:**
- King Sand Crab spawns (npc-spawns.json has none; the pair is in the data).
- Crab sounds (no capture).

<a id="doc-tsps-upstream-docs-disguised-crabs--aggression-tolerance-core"></a>
#### Aggression tolerance (core)

`server/src/main/typescript/elvarg/game/entity/impl/npc/AggressionTolerance.ts` follows the Wiki's Tolerance page.

**The regions.** Each player has two 21×21 tolerance regions (10 tiles each way).
- **Ten minutes** (1000 ticks) inside the combined regions makes monsters tolerant: they stop being aggressive towards that player.
- **Leaving both regions,** or changing plane, drops the older region, keeps the newer one, and centres a new region on the tile the player left from. This restarts the ten minutes. The region bookkeeping matches RuneLite's NPC aggression timer.

**Logging out isn't leaving.** The state is the persisted attribute `npc-aggression:tolerance`.

**Exceptions.** Monsters whose definition doesn't build tolerance stay aggressive, as before.

Before this, the timer started at login and never reset, so ten minutes after logging in every tolerance-building monster everywhere stopped being aggressive. The old rock crab plugin worked around that by keeping rock crabs aggressive forever. Crabs now follow tolerance like everything else, and walking well away and back resets it.
<!-- end-source-document: tsps-upstream/docs/disguised-crabs.md -->

---

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl"></a>
## tsps-upstream/docs/doom-of-mokhaiotl.md

<!-- source-document: tsps-upstream/docs/doom-of-mokhaiotl.md -->
<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--doom-of-mokhaiotl"></a>
### Doom of Mokhaiotl

The delve boss beneath the Ruins of Mokhaiotl (`server/plugins/bosses/DoomOfMokhaiotl.plugin.js`, units in `server/plugins/bosses/doom/`). Behaviour comes from the OSRS Wiki ("Doom of Mokhaiotl" and "Doom of Mokhaiotl/Strategies"). Ids, tiles and timings come from two live captures:

- `doom.txt`: the ruins and about a minute of delve 1.
- `doom-wave1-5.txt`: delves 1 to 4 completed, then death at delve 5 from a melee-charge beam.

Anything from neither source is listed under [Guesses](#doc-tsps-upstream-docs-doom-of-mokhaiotl--guesses). That covers the reward screen's claiming and chest views, delves 6+, and parts of the Wiki the captures didn't show.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--status"></a>
#### Status

| Phase | What | State |
| --- | --- | --- |
| 1 | Access, the lobby, the instance, delves and the burrow hole, the boss HUD, death and logouts | Done |
| 2 | Delves 1–2: orbs, the tongue, rock throws, larvae and their charge, the melee charge and beam, shockwaves with volatile earth and the earthen shield | Done |
| 3 | Delves 3–4: acid blood, the demonic shield (14708) with its beam, coloured larvae | Done |
| 4 | Delves 5–8+: the burrowed "car" phase (14709), car slams and rockblock, giant larvae, two rock throws | Done |
| 5 | Delve-scaled loot, the reward screen (interface 919), the unclaimed-loot chest, the scoreboard (920) | Done |

The Doom's items (Eye of Ayak, avernic treads, Mokhaiotl cloth, Dom) are a separate piece of work.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `DoomShared.js` | Ids, tiles, the two arenas, varps and helpers. |
| `DoomDelves.js` | What changes with the delve level (the Wiki's table). |
| `DoomRun.js` | A player's run: the instance, delves, the HUD, the burrow hole, varps and messages, leaving. |
| `DoomBoss.js` | The Doom's attacks, the melee charge, shockwaves and the rotation. |
| `DoomHazards.js` | Larvae, rocks, volatile earth and the earthen shield. |
| `DoomAcid.js` | Acid blood (delve 3+). |
| `DoomHolyWater.js` | The holy water after a melee-punish kill. |
| `DoomShield.js` | The demonic shield (delve 3+). |
| `DoomBurrow.js` | The burrowed "car" phase (delve 5+). |
| `DoomLoot.js` | The loot table and its delve scaling. |
| `DoomRecords.js` | Personal and world records (`data/saves/doom-scoreboard.json`). |
| `Rewards.*` | The burrow hole's reward screen, claiming, the lobby's chest. |
| `Scoreboard.*` | The lobby's scoreboard. |
| `Lobby.*` | The ruins' entrance, the lobby's exit and the gap. |
| `Delve.*` | Objects in the arena, combat rules, death and logging in. |
| `Commands.*` | Developer commands. |

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--access"></a>
#### Access

The Doom needs The Final Dawn. Here it is open to everyone, like Zulrah. The ruins' entrance (56613 at (1310, 9533, 1)) is a multiloc on The Final Dawn's varbit 16663: at 68 (complete) it shows as 56616, Pass-through. That value is sent on login and on entering the ruins.

| What | Where | Notes |
| --- | --- | --- |
| Entrance (56613/56616) | (1310, 9533, 1) | Fades out (script 948 on interface 174) and puts you in the lobby at (1311, 9540). |
| Exit (56618) | (1310, 9539) | Back outside the entrance (guess). |
| Gap (57289, Jump-over) | (1310, 9557) | The jump (anim 12196) and "You jump the gap...", into the arena. |
| Scoreboard (57288) | (1314, 9547) | See [The scoreboard](#doc-tsps-upstream-docs-doom-of-mokhaiotl--the-scoreboard). |
| Chest (50938) | (1307, 9548) | Unclaimed rewards. |

`::teleports` lists it under Bosses, outside the entrance.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--the-instance"></a>
#### The instance

Capture: a run copies two map squares, and the arena sits at the same local tiles in both.

- **Delve 1** copies map square 20_149 (1280–1343, 9536–9599), the square the lobby is in. The player lands at (1311, 9559) and the gap behind them becomes 57290 (Exit, Quick-exit).
- **Delves 2+** copy a separate square, 53_100 (3392–3455, 6400–6463). Descending puts the player at local (31, 30), which is (3423, 6430). That square has no way out but the burrow hole's rewards, teleporting or dying.

Each run is one `PrivateArea` over delve 1's arena (y 9557+, so not the lobby) and the whole deeper square, at real coordinates. The code is written in delve 1's frame. `Shared.shift` moves a tile into the deeper square and `Shared.frame` brings one back.

Rocks and acid stay from delve to delve. Delve 2 leaves delve 1's behind with the square, and delve 6 starts clean (Wiki). Nothing re-sends the map after a run, so leaving shows the lobby's gap again and takes away the run's rocks and hole.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--a-delve"></a>
#### A delve

**The Doom surfaces** once the prompt is closed, or the player moves or prays. The prompt is "You jump the gap..." at delve 1 and "You jump further into the burrow..." after each descent.

It appears at local (29, 35), its south-west tile (it is 5×5), with anim 12418 and graphic 3372. The same tick:
- varp 4805 is set to the cycle, 4828 to the level (0-based), and 4804 is cleared;
- the boss HUD opens: varp 1683 = 14707, varbits 6099/6100 = its hitpoints, 12401 = 1, then scripts 2376 and 2887 (the `BossHud` plugin, [boss-hud.md](#doc-tsps-upstream-docs-boss-hud)). Its overhead bar is headbar 20.

**Beaten** (capture), it plays 12422 with graphic 3377 and its larvae and volatile earth go. The game says:
- "Delve level: N duration: m:ss.cc. Personal best: m:ss.cc"
- "Total duration: m:ss.cc"

The varps set are 4807 (all completions), 4808–4816 (this level's), 4798 (the level, 0-based), 4804 (its ticks) and 4803 (the run's ticks).

Five ticks later the burrow hole (57285) opens where the Doom was, with loc anim 12477. The Doom goes at seven. As in the game, it's used from wherever it's clicked, with no walk to it (an `onObjectRoute` to the player's own tile).
- **Descend** follows it to the next delve. With a unique waiting, it asks first (Wiki).
- **Investigate** opens the reward screen (see [Rewards](#doc-tsps-upstream-docs-doom-of-mokhaiotl--rewards)).

**Leaving:** claiming, dying or teleporting out ends the run, so the delve level starts again at 1 (Wiki). Delve 1's gap: **Exit** asks first, **Quick-exit** leaves at once.

**Death** (capture): "Oh dear, you are dead!", then the lobby at (1313, 9555), by the gap, and varp 4828 back to 0. What would drop lands there, as the grave would be. A logout ends the run, and logging back in puts the player at the gap.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--the-doom-by-delve-wiki-and-the-captures-for-delves-15"></a>
#### The Doom by delve (Wiki, and the captures for delves 1–5)

| Delve | HP | Speed | Max hit | Orb lands (cycle) | Rock pieces | Rock orbs | Shockwaves | Larvae | Beam | Punish delay |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 525 | 6 | 47 | 205 | 8 | 1 | 1 | melee or none | 60 | 8 |
| 2 | 550 | 6 | 50 | 205 | 12 | 2 | 1 | melee or none | 60 | 8 |
| 3 | 575 | 5 | 50 | 175 | 15 | 2 | 2 | any prayer | 60 | 7 |
| 4 | 600 | 5 | 50 | 175 | 17 | 3 | 2 | coloured | 80 | 7 |
| 5 | 625 | 5 | 53 | 145 | 18 | 3 | 3 | 2× coloured | 80 | 7 |
| 6 | 650 | 5 | 53 | 115 | 19 | 3 | 3 | 2× coloured | 99 | 7 |
| 7 | 650 | 4 | 57 | 115 | 20 | 3 | 4 | 2× coloured | 99 | 6 |
| 8 | 675 | 4 | 65 | 115 | 21 | 2×3 | 5 | giant | 99 | 6 |
| 9+ | 625 | 4 | 65 | 115 | 21 | 2×3 | 5 | giant | 99 | 6 |

The orb and rock-piece columns from delve 6 on are guesses. The punish delay is the Wiki's, counted from the attack; the captures show the next attack that many ticks less one after the hit lands.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--attacks"></a>
#### Attacks

The Doom's own combat does nothing; the run attacks on its own timer. None of its NPCs (its three forms, the larvae, volatile earth, the earthen shield) play a block animation when hit (capture), so `npc-combat-defs.json` gives them `"block": -1` with their captured spawn and death animations; without an entry they got the default human block (424).

- **First attack:** 6 ticks after it surfaces.
- **Tongue:** when the player stands beside it (not at a corner). Anim 12416, the hit lands the next tick, and it acts again 4 ticks later. Wiki: up to 40, halved by Protect from Melee.
- **Orb:** anim 12406, projectile 3380 (Ranged), 3379 (Magic) or, from delve 2, 3378 (Melee).
  - It flies from cycle 55 to the cycle in the table, heights 387 to 100, angle 30 and progress 147. Its launch sound plays at delay 55: 10341 (Ranged), 10375 (Magic), 10367 (Melee).
  - It lands with graphic 2490 or 2492 (spotanim slot 2) at height 100 and impact sound 7026 or 7023, but only when it isn't prayed against (51 impacts for 91 orbs in the capture). The red orb's are guesses: 2491 (between the others, on the same animation) and 7025.
  - It is rolled on impact (Wiki).
- **The pattern** (capture): one to three orbs between rock throws, sometimes a throw at once. After a throw the Doom acts again after twice its attack speed.
  - **No overlap with the rock's orbs:** its next attack waits while a rock is in the air, and until its orb would land the tick after the rock's last orb. The delve-5 capture had the orb after a throw 12 ticks on, not 10; the Wiki's changelog keeps them apart after a melee punish too.
- **Rock throw:** anim 12407, projectile 3384/3385 from its centre to the tile beside it towards the player (cycles 60 to 210, from delve 5 to 180; heights 340 to 500, angle 50, progress 124).
  - **7 ticks later it bursts** (6 from delve 5: all four delve-5 throws in the capture). Graphic 3386/3387 where it lands, with area sound 10331 (range 10), and the player's protection prayers turn off.
  - The pieces fly (see the table): one to the player's tile and the rest within four tiles. Projectiles 3388–3395, 60 + 3 cycles a tile, heights 500 to 0, each with a shadow (2380) on its tile. Each piece's impact comes with area sound 10297 (range 1), delayed as the impact.
  - **2 ticks later** the impacts (3404) are sent, each delayed to its piece's landing.
  - **The tick after:**
    - a rock (57286) stands on the marked tile;
    - a player on a piece's tile is hit (Wiki: up to 21);
    - a player on the rock's tile is thrown aside (anim 1114);
    - the rock's orbs leave together from the pieces' tiles, landing a tick apart from cycle 90 (150 at delve 2), alternating styles from the rock's.
  - At delve 8, two rocks (Wiki).
- **The melee charge** (capture): 2 ticks after about one throw in three. Never with throws before a shockwave (Wiki).
  - Headbar 81 (100 wide) fills over 390 cycles (`npc.showHeadbar`), and the Doom shows headicon 6 (Magic and Ranged). When the charge ends the bar empties (0 to 0 over 1 cycle).
  - Anim 12408, then 12409 with graphic 3412 each tick.
  - Only melee lands, and always (100% accurate through `api.onCombatHitRoll`'s `forceAccurate`). A melee hit cancels the charge (12410). The bonus, a fifth of the visible Strength bonus, lands the next tick as its own hitsplat (type 17), once per hitsplat of the hit (23 and 23 from a crystal halberd).
  - Left 13 ticks it fires (12411), hitting the next tick: 80 at delve 5 killed the captured player.
  - **The beam** (capture, also the shield's and the burrowed Doom's): five flat projectiles from its centre to the player at height 100, a head (3409, cycles 0–25), three middle segments (3410, 1–26, 1–27, 1–28) and an end (3411, 2–29); the next tick graphic 3413 (height 50) on the player and the hit.
  - **A melee-punish kill** (Wiki): at delves 1–8, holy water flies out around the Doom, restoring 28 hitpoints, 14 prayer and 25% special attack, and clearing acid in a 3×3 where each lands. Only a player standing in a splash's 3×3 is restored (seen in game), once. The changelog has it guaranteed when the Doom dies during the punish phase. The capture shows none when the killing blow was an arrow loosed before the charge, so here it takes the punishing melee hit (or its bonus the tick after).
- **Shockwave:** volatile earth appear 79–96 ticks into the fight. The timer stands still while the shield is up, and from delve 5 the earth comes as the Doom surfaces instead.
  - The Doom keeps attacking until 15 ticks later: anim 12412, then 12413 at 17.
  - A slam (12414, graphic 3370) at 19, and another every 2 ticks for each further shockwave. Each lands 2 ticks after its slam, with graphics over the floor.
  - 12415 after the last, and it acts again the tick after.
  - Hits of 26–33 were seen; the Wiki says 30–42, so 26–42 here.
- **Volatile earth** (14714, anim 12432): 19–28 of a pool of 39 tiles each time, never under rocks. Destroying one pops it (12434).
  - The second destroyed brings the earthen shield (14715, anim 12436) centred on it. The rest die (12433) and go 2 ticks later.
  - The shield walks to the first earth, diagonally first: every 2 ticks at delve 1 (capture: delve 2 too), every tick from delve 3. The 2-tick steps are crawls (capture), so it slides; the every-tick steps are walks. Standing in it blocks the shockwave.
  - From the tick after it appears, a player inside it is tinted each tick (player tinting: lightness 106, weight 112 over 30 cycles) and one outside gets the clearing tint (hue, saturation and lightness -1). Core's `mobile.tint` sends it.
- **Larvae** (capture):
  - **When:** with about one attack in three at delve 1, one in six deeper. They drop about four tiles past the player, away from the Doom, two side by side from delve 5. They show graphic 3417 and anim 12458.
  - **Prayers:** half pray Melee at delves 1–2 (headicon 0); any prayer at delve 3 (0–2). From delve 4 they are coloured: Melee (14713, headicon 6), Magic (14712, 7) and Ranged (14711, 8). Each takes only its own style, and Melee ones come only during the shield.
  - **Crawl:** a tile every 2 ticks (Melee ones often every tick) to the Doom's centre. Every step is sent as an NPC crawl (`npc.setCrawling`), which clients play at half walking speed, so a larva keeps moving instead of walking a tile and waiting. They path around rocks (seen in game), over the arena floor, and go into the Doom over the last stretch. There the charge varbit 17758 goes up, the player takes graphic 3426 and a hit of the charge, at most 12 (20 from delve 8, 30 for a giant; seen in game), and the Doom heals 9 plus the charge, shown as a heal hitsplat (type 6).
  - **Killed:** they play 12459 with graphic 3374 over their 3×3, with area sound 163 (range 7), and go the next tick. Wiki: up to 21 to the player, or 5–10 to the Doom instead (a type-17 hitsplat in the capture).
  - **Hit with the style they pray:** "The demonic larva seems resistant to your attack."
  - **Demons** (Wiki): demonbane spells are cast on them, so `monsters-complete.json` lists them (14710–14713, giants 14788/14789) with the demon attribute; without it the spells were refused.
  - **Attack timer:** larvae and volatile earth can be attacked while the player's attack is on cooldown (Wiki). The capture (a demonbane bow, speed 4) shows how the timer moves:
    - a larva shot on cooldown leaves the timer as it was (Doom 359, larva 360, Doom 363);
    - a larva shot off cooldown makes the next attack wait 1 tick (larva 350, Doom 351);
    - volatile earth sets the weapon's full delay, demonbane or not (Doom 246, earth 248 and 250, Doom 254).
    
    Only a new target goes in on cooldown: the capture's two earth shots (248, 250) were at two different earths, so attacking the same one again waits for the timer and auto-attack doesn't fire a second shot while the first is in the air. Other weapons on larvae get their normal delay (Wiki). Core's `api.onAttackTiming` (`ignoreDelay`, `keepDelay`, `minimumDelay`, `newTarget`) does this.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--delves-34"></a>
#### Delves 3–4

- **Acid blood** (capture):
  - Each delve the acid goes one way from the Doom (north at delves 3 and 4, west at 5).
  - Every hit on it sends a blob (projectile 3445, height 100 down, 15 + 3 cycles a tile) to the tile just past its edge, plus one more at delve 3 and two from delve 4 (three from 8, Wiki). The extra blobs land 1–9 tiles out, up to 4 to the side (2 at delve 3).
  - Each blob lands with a splat (3429–3432) and an acid pool (57283, shape 10) the next tick.
  - Standing in acid hurts 3–6 a tick (3–7 here; the Wiki says up to 7) and envenoms (Wiki).
  - No acid while the Doom is shielded or burrowed. Rocks cover acid, and it is back when they break.
- **The demonic shield** (capture): at 75% or less once it has attacked twice (seen at 68%).
  - It comes at its attack's turn: anim 12408, then 2 ticks later it becomes 14708.
  - The HUD shows 500/500 (varp 1683 = 14708), and its bar turns blue: `if_setcolour` on 303:13–15 (132/623/853, back to 25600/576/800 when it ends), then script 2102.
  - Every tick it loops the charge (12409, graphic 3412 in spotanim slot 2), as the melee charge does; it never plays a block animation. On a tick a demonbane hit cancels it, neither the loop nor its graphic plays (hits are processed after the plugin's tick, so the graphic is withdrawn: `mobile.withdrawGraphicInSlot`).
  - Headbar 81 runs 510 cycles (17 ticks) at every delve. Each demonbane hit restarts it (12410 in place of the loop that tick; a larva bursting on the shield doesn't), and shows the shield's points on headbar 11 (120 wide) instead of hitpoints. Anything else is "The demonic shield resists your attack!" (Wiki).
  - A larva bursting on it takes 100, shown as a type-17 hitsplat. Larvae come every 7–9 ticks from the north-west, 8–12 tiles out, the first 5 ticks in.
  - Broken, it becomes the Doom again with a rock throw (delves 3–4), or burrows (delve 5).
  - Left to charge, the beam fires and the shield drops (Wiki). Stored damage from larvae killed during it, up to 50, lands as it drops (Wiki; none was seen).

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--delves-58"></a>
#### Delves 5–8+

- **Burrowing** (capture, delve 5):
  - As the shield breaks: anim 12420 with graphic 3375, and rocks fall (graphic 2529, delay 20) on 24 and 26 tiles in two captures (24–28 here): one on the Doom's centre tile, the rest anywhere free, beside and under it too. The rocks stand 6 ticks later. Sounds: a rumble (10303, 5 loops), rocks falling (10301, delay 45) and landing (10372, delay 160).
  - The camera shakes as it burrows (random 5 on each axis) and resets 5 ticks later, when it becomes 14709 (HUD with its real hitpoints), charging for 600 cycles (20 ticks, headbar 81). Each hit restarts the charge. From then on it shows graphic 3414 in spotanim slot 2 every tick, except a tick a hit restarts the charge.
  - 3 ticks later the eye (graphic 3416, and 3415 with delay 60) marks where its centre will stop. That is the compass direction of the player from its centre, as far as the player is plus four, kept inside the arena.
  - 3 ticks after the eye it goes there, 4 tiles a tick. Rocks in the way break (graphic 2699).
  - Each tick of a zoom is a teleport to that tick's last tile plus an NPC `exact_move` from the tile it left, with `delay1=0`, `delay2=30` and `angle` the direction of travel (768 north-west, 1536 east). Here that is one `npc.exactMove` a tick (its defaults are these values), so the Doom glides; rocks and the player are still checked tile by tile along the way.
  - Facing (capture): as it burrows its lock on the player is cleared (face reset), and burrowed it isn't locked on. As the eye appears it turns to the corner tile it will stop on; while zooming the exact move's angle turns it; the tick after it stops it turns once to the player's tile. Surfaced, it locks on again. This uses the NPC face-coord block (`npc.faceTile`); clients offset the tile by the NPC's size, as they do positions, so the corner it stops on faces straight along its path.
  - Attacks while burrowed are 100% accurate (Wiki), and any hit restarts the charge.
  - The next eye comes 9 ticks after it stops. After the second zoom it surfaces 5 ticks later, into volatile earth and the shockwave.
  - Trample: 10 at delve 5 (seen), 20/30/40 at 6/7/8+ (Wiki).
- **Delve 6+** (Wiki): three zooms, each followed by 1–3 orbs and a car slam.
  - The slam breaks every rock within 15 tiles that no other rock shelters, and hits the player unless a rock is in the way.
  - A rock under its centre (rockblock) stops the slam, and only that rock breaks.
- **Rotation from delve 5** (Wiki): shield, burrow, the shockwave, two attacks, the shield again.

**NPC view distance:** the capture uses the large NPC update throughout the fight (554 of 556), so in the arena NPCs are seen 32 tiles out (`player.setNpcViewDistance`, back to 15 on leaving), the whole floor; their projectiles reach as far.

**Other sounds** (capture): acid flying plays area sound 10345 (range 10) at the Doom's centre.
- **Deep delves (9+):** delve 8 with 625 hitpoints.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--rewards"></a>
#### Rewards

Each completed delve rolls once on the Wiki's table (weights out of 104, quantities as at delve 3), scaled by Q_n = Q_3 + trunc(Q_3 × M_n). The multipliers M_n are −0.5, −0.35, 0, 0.05, 0.1, 0.12, 0.14 and 0.17 for delves 1–8, and 0.2 beyond.

On top of that roll:
- **Demon tears** from delve 3: 50, plus 10 a delve, up to 100. The capture had 50 after delve 3 and 110 after delve 4.
- **Uniques** at the delve's overall rate, equally likely among those unlocked: cloth from delve 2, Eye of Ayak from 3, treads from 4.
- **Dom** from delve 6.
- **An elite clue:** 1/75, then 1/50.

The capture's piles were 18 sun-kissed bones (delve 1), then a noted mystic earth staff, a spirit seed and another staff.

**The reward screen** (interface 919, capture):

1. Investigate sends inventories 935 (the loot) and 923 (empty).
2. It opens 919 as the main modal and runs script 7927 with the level 0-based, 0, 0.
3. It sets OP1 on the buttons and ops 1–5 and 10 on the loot's 28 slots, and writes "Value: 1,728 GP".
4. Descend closes it and says "You jump further into the burrow...".

The buttons: Claim & Leave 14, Descend 23, Leave 16, Take-all 17, Bank-all 26.

- **Claim & Leave** moves the loot to the claiming view (7927 with 1 as its second argument): Take-all, Bank-all, then Leave walks out to the lobby.
- **Leaving without claiming** (Exit, teleport, logout) leaves the loot in the lobby's chest (50938, Look-inside). The chest uses the same screen (7927 with 1 as its third argument).
- **Dying after descending** loses the run's loot (Wiki).

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--the-scoreboard"></a>
#### The scoreboard

The scoreboard (57288) opens interface 920, filled with strings:
- **Read** and **Delve-stats** show component 5: personal and global completions and best times per level.
- **General-stats** shows component 3: deepest delve, deaths, best time from delve 1 to 8, and deep delves, personal and global.

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--guesses"></a>
#### Guesses

- **The run:** the lobby's exit leading outside the entrance; the Exit's question; the wording of a new personal best.
- **Rewards:**
  - the claiming and chest views of script 7927 (only the hole's was captured);
  - the chest's "The chest is empty.";
  - a unique coming on top of the regular roll;
  - the moon key half (30105).
- **Delves 6+:** orb timings (cycle 115), rock pieces (one more a delve) and rock-orb timings from delve 7 (from cycle 30).
- **Burrowing:**
  - 24–28 rocks at delves 5–7 (24 and 26 seen), 16 from delve 8, never on the player's tile, and 3 ticks of grace;
  - speeds of 5/5/8 tiles a tick at delves 6/7/8+;
  - the car slam's damage (26–42) and its orbs (one per 5 tiles travelled).
- **Larvae:** a giant one in three at delve 8, adding one charge.
- **Holy water:** seven projectiles (holy water's, 192) up to four tiles from the Doom's centre, landing a tick apart.
- **Larvae walled in by rocks** crawl straight on, through them.
- **Shockwaves:** at delves 1–4, a repeat 100 ticks after the last.
- **Not done:** the collection log (the server tracks none yet).

<a id="doc-tsps-upstream-docs-doom-of-mokhaiotl--developer-commands"></a>
#### Developer commands

| Command | What it does |
| --- | --- |
| `::doom` | To the lobby. |
| `::doomdelve <n>` | Starts a run at delve n (before the Doom surfaces). |
| `::doomkill` | Beats the Doom of the current delve. |
| `::exactmove [npcId] [tiles] [laps] [snap]` | Glides an NPC (the burrowed Doom by default) around you. |
| `::headbar [npcId] [barId] [cycles]` | Shows a headbar over an NPC (the Doom's charge bar by default), filling, held, then removed. |
| `::ifcolour <group> <child> <rgb15>` | Recolours a component (the Doom's HUD bar is 303:13–15). |
<!-- end-source-document: tsps-upstream/docs/doom-of-mokhaiotl.md -->

---

<a id="doc-tsps-upstream-docs-dwarf-cannon"></a>
## tsps-upstream/docs/dwarf-cannon.md

<!-- source-document: tsps-upstream/docs/dwarf-cannon.md -->
<a id="doc-tsps-upstream-docs-dwarf-cannon--dwarf-multicannon"></a>
### Dwarf multicannon

`server/plugins/items/DwarfCannon.plugin.js`, with its parts in `server/plugins/items/dwarfcannon/`:

| Unit | Contents |
|---|---|
| `Setup` | setting the cannon up |
| `Ammo` | Fire, Empty, Load X |
| `Firing` | turning and shooting |
| `Decay` | breaking, Repair, loss, Pick-up, logout and login |
| `Nulodion` | getting a lost cannon back |
| `Ornament` | the shattered cannon ornament kit |
| `Restrictions` + `data/definitions/cannon-restrictions.json` | where a cannon can't be set up |
| `Data`, `Common` | shared numbers and state |

**Sources:**
- **an OSRS capture** (rsprox) of a cannon's whole life at the Woodcutting Guild's ents: setup, auto-load, Fire, two shots, Empty, Load X, Pick-up;
- **the OSRS Wiki:** "Dwarf multicannon" (its prohibited-areas list too), "Shattered cannon ornament kit", and Nulodion's transcript;
- **this cache:** ids;
- **Near-Reality's code** for what neither shows: the firing zones and most area outlines. It's flagged below wherever it's used.

<a id="doc-tsps-upstream-docs-dwarf-cannon--setting-up-captured"></a>
#### Setting up (captured)
"Set-up" on the base marks the player busy (varbit 12393).
- **The base:** two ticks after the click: "You place the cannon base on the ground.". The base (loc 7) appears with the player on its centre tile, and they run off to the tile south of its south-west corner.
- **The other parts:** the stand 2 ticks later, then the barrels and the furnace 3 ticks apart: "You add the stand.", "You add the barrels.", "You add the furnace.". The furnace turns it into the cannon (loc 6).
- **Each part:** animation 827, area sound 2876, the part leaves the inventory, and the player faces the cannon.
- **Auto-load:** the tick after the furnace, it loads up to 30 balls: "You load the cannon with 30 cannonballs.".

**Vars:**

| Var | Meaning |
|---|---|
| varp 2 | parts added (1–4) |
| varp 3 | balls loaded |
| varp 4, varp 3551 | the cannon's packed south-west tile `(z << 28) \| (x << 14) \| y` |
| varbit 2180 | the tick of the last part |
| varbit 1968 | the world. **Ours:** always 1, since this server has no world number. |

Only changed vars are sent, as in the capture; all of them are sent again on login.

**Refused (our wording, not captured):**
- a second cannon: "You cannot construct more than one cannon at a time.";
- missing or mixed parts: "You need the base, stand, barrels and furnace to set up a cannon.";
- no clear 3×3: "There isn't enough space to set up a cannon here.";
- a restricted area: that area's Wiki message.

**Ours:** the setup stops (keeping what's built) if the player walks more than 5 tiles away, logs out, or no longer has the next part.

**No quest requirement:** the Wiki requires the Dwarf Cannon quest. This server leaves it out by choice.

<a id="doc-tsps-upstream-docs-dwarf-cannon--firing-captured"></a>
#### Firing (captured)
- **Starting:** "Fire" tops the cannon up from the inventory. The next tick varp 1 (`mcannonmulti`) is set to `1 << 20`, and from the tick after, the barrel turns one step a tick, N → NE → … → NW.
- **Each turn:** area sound 2877 and `mcannon_<dir>_turn` (514 N … 521 NW).
- **A shot:** on a tick when something is in the direction it faces, it plays `mcannon_<dir>_fire` (506 N … 513 NW) and sound 1667, then turns in the same tick.
- **The ball:** projectile 53 from the cannon's centre, heights 145 → 140 (36 → 35 here), angle 2, progress 11. The capture's two shots took 35 cycles (north) and 40 (south-west). **Ours:** 35 for straight directions and 40 for diagonals.
- **The hit** lands the next tick, as the owner's (kill credit, retaliation).

**From the Wiki:**
- **Damage:** up to 30, or 35 with granite.
- **Accuracy:** the owner's Ranged roll with a ranged weapon, otherwise melee, against the target's Ranged defence.
- **XP:** 2 Ranged XP per damage, no Hitpoints XP. Core's `PendingHitConfig.experience: false` skips the usual combat XP for these hits.
- **Targets:**
  - in singles, only what fights the owner or nothing at all, and only while the owner isn't fighting something else; in multi, anything attackable;
  - never sand crabs, ammonite crabs, demonic gorillas or kurasks;
  - in line of sight from the cannon's footprint.
  - **Ours:** a target fighting the owner first, otherwise the nearest.
- **Granite:** granite balls load first, and steel only once the granite is used up. Granite fires first (projectile 1443).

**Ours or unverified:**
- **Firing zones:** each direction's polygon is Near-Reality's (the Wiki gives no shape). Both captured shots fall inside the right zone. They overlap, so one monster can take two balls a rotation (Wiki), and they leave a few tiles uncovered.
- **Running dry:** "Your cannon is out of ammo!" and the cannon stops.
- **Fire with nothing to load:** "You need to load the cannon with cannonballs first.".
- **Logging out:** the cannon stops firing.

<a id="doc-tsps-upstream-docs-dwarf-cannon--cannonballs-captured"></a>
#### Cannonballs (captured)
- **Empty:** "You unload your cannon and receive Steel cannonball x 28." (granite: "Granite cannonball"). Varp 3 goes to 0, and firing stops the next tick. **Ours:** the no-space message.
- **Load X:** the first time, a count prompt "Set load-x cannonballs (1 - 30):", then varbit 17870 and "You will now load 10 cannonballs when using Load-x.". After that it loads that many: "You load the cannon with 10 cannonballs.". Saved per player.

<a id="doc-tsps-upstream-docs-dwarf-cannon--pick-up-captured"></a>
#### Pick-up (captured)
"You pick up the cannon. It's really heavy.", synth sound 2581.
- **Vars:** they clear, except that varp 4 keeps the player's tile, as captured.
- **Items:** the parts added so far and every ball come back in the same tick.

Also works on a broken cannon or a part-built one. **Ours:** the no-space message.

<a id="doc-tsps-upstream-docs-dwarf-cannon--decay-wiki"></a>
#### Decay (Wiki)
- **Breaking:** after 25 minutes set up it breaks: the broken multicannon (14916; ornament 43028), with "Repair" and "Pick-up". Repair starts the 25 minutes again.
- **Loss:** 10 more minutes unrepaired and it's gone. Its parts wait at Nulodion; balls in it are lost.
- **Logout:** the cannon stays up while the owner is logged out. If the server restarts, a cannon saved on a player but missing from the world counts as lost.
- **Messages (ours, unverified):** "Your cannon has broken!", "You repair your cannon, restoring it to working order.", "Your cannon has decayed. Speak to Nulodion to obtain a new one.".
- **Testing:** `::cannondecay` (developer) breaks your cannon, and on a broken one makes it disappear, each on the next tick.

<a id="doc-tsps-upstream-docs-dwarf-cannon--nulodion-wiki-transcript"></a>
#### Nulodion (Wiki transcript)
"I've lost my cannon." follows his transcript, with its conditions answered from the cannon's state:
- still set up somewhere;
- fewer than 4 free slots;
- lost by despawning or world-hopping (a restart here);
- not lost.

"The dwarf gives you a new cannon." hands back the lost cannon's parts, ornament if it was one.

<a id="doc-tsps-upstream-docs-dwarf-cannon--ornament-kit-wiki"></a>
#### Ornament kit (Wiki)
- **Applying:** one shattered cannon ornament kit used on each part makes its (or) version.
- **Dismantle:** gives the part and the kit back.
- **No mixing:** ornament and plain parts can't be set up together.
- **Objects:** the ornament cannon uses 43029 base, 43030 stand, 43031 barrels, 43027 cannon and 43028 broken.
- **Animations (not captured):** the cache's matching runs of eight, fire 9230–9237 and turn 9239–9246, taken in the same N-first order as the plain ones.

<a id="doc-tsps-upstream-docs-dwarf-cannon--restricted-areas"></a>
#### Restricted areas
`cannon-restrictions.json` lists all 71 of the Wiki's prohibited areas with their messages. Anywhere in an instance (a private area) is refused with the default "You can't set up a cannon here.".

**Outlines:** 28 have one. The others are listed but not bounded yet.
- **From Near-Reality's code**, unverified: most of them, e.g. the Grand Exchange, the Dwarven Mine and the Slayer Tower.
- **From this server's own bounds:**
  - the Revenant Caves, from `world.json`;
  - Pest Control's game area;
  - Zulrah's shrine;
  - the Gemstone Crab's three spots.

<a id="doc-tsps-upstream-docs-dwarf-cannon--follow-ups"></a>
#### Follow-ups
- outlines for the 43 unbounded areas;
- Nulodion's cannon sale (his transcript's 750,000-coin set and the parts shop);
- the Combat Achievements capacity increases (35/45/60), once that system exists;
- the real messages for the parts marked "ours".
<!-- end-source-document: tsps-upstream/docs/dwarf-cannon.md -->

---

<a id="doc-tsps-upstream-docs-edgeville-dungeon"></a>
## tsps-upstream/docs/edgeville-dungeon.md

<!-- source-document: tsps-upstream/docs/edgeville-dungeon.md -->
<a id="doc-tsps-upstream-docs-edgeville-dungeon--edgeville-dungeon"></a>
### Edgeville Dungeon

The Edgeville Dungeon's monsters, spawns, kill drops and agility shortcuts come from the general data. This page covers what two plugins add:
- `EdgevilleDungeon` (`server/plugins/areas/EdgevilleDungeon.plugin.js`, units in `edgevilledungeon/`): the brass key door and the area's diary tasks (data: `edgeville-dungeon.json`);
- `GiantLairs` (`server/plugins/bosses/GiantLairs.plugin.js`, units in `giantlairs/`): Obor's and Bryophyta's lairs, with their bosses and chests, and giant bones (data: `giant-boss-lairs.json`).

<a id="doc-tsps-upstream-docs-edgeville-dungeon--sources"></a>
#### Sources

- **rsprox captures:**
  - entering the shed with and without the brass key;
  - Obor's gate, his fight and his chest;
  - Bryophyta's gate, her fight (with growthlings and the logs' axe) and three chest opens.
- **The Wiki:** both bosses' stats and max hits; the chest tables (Chest (Obor's lair), Chest (Bryophyta's lair)); the growthling rules; giant bones' 150 Prayer XP.
- **The cache's map:** the gates, rocks, chests, exits and logs.

<a id="doc-tsps-upstream-docs-edgeville-dungeon--the-brass-key-door"></a>
#### The brass key door

| Tick | What happens |
| --- | --- |
| The click, without the key | "The door is locked." |
| The click, with the key | "You unlock the door." and sound 2402 |
| +1 | An invisible wall (38848) replaces the door and the open door (1539) appears beside it. Sound 62, and the player steps through |
| +3 | The door is shut again |

The key is kept. The capture went in; the way out is assumed to work the same.

<a id="doc-tsps-upstream-docs-edgeville-dungeon--the-lairs"></a>
#### The lairs

Each player gets their own lair: a private area over the lair's real tiles, with its own boss. Obor's lair shares the dungeon's map region, so on arrival it sends its own song (26, as captured), and the region's song comes back when the lair ends. Bryophyta's lair has a region of its own (554). Leaving, teleporting, dying or logging out ends it. A player who logs back in inside a lair is put outside its gate.

**The gate:**
- **Without a key, before the first unlock:** "The gate is locked shut." (Obor) or "It's locked!" (Bryophyta).
- **With a key:** the key is kept, and from then on the gate opens without one (Wiki).
- **Obor:** "Enter Obor's Lair?" (Yes./No.).
  1. On Yes: the fade and `busy`.
  2. 2 ticks later: in the lair at 3091,9815, with Obor already there.
  3. A tick later: the fade back and "Your key fits the gate, causing it to swing open."
- **Bryophyta:**
  1. The instanced-area warning, then "Are you sure you wish to open it?".
  2. Then straight in, at 3214,9937, with her attacking at once.

**The chest:**

| Situation | Response |
| --- | --- |
| The boss is alive | "You can't loot the chest whilst Bryophyta is still attacking you!" (Obor's uses his name) |
| The first click after a kill | "You hear the ground rumble..." (Obor) or "You hear the leaves stir..." (Bryophyta); the boss returns 15 ticks later, key or not |
| No key | "You need a Mossy key to open this chest." (Obor's names the Giant key) |
| A key, once per kill | See below |

Opening it:
1. The key is used up, with animation 536 and sound 52.
2. A tick later: "The loot spills out as you open the chest." and "Your Bryophyta chests opened count is: N." (varp 1529 for Obor, 1733 for Bryophyta). The loot lands beside the chest, and the chest shows open.
3. 19 ticks later it closes.

Chest loot goes to the collection log, whose Obor and Bryophyta pages count chests opened.

The chest tables follow the Wiki, rolled by the NPC drop roller (`npc-drops:roll-table`):
- **Both:** a beginner clue every time.
- **Obor:** an ensouled giant head every time, a 1/16 giant key, and the hill giant club at 1/118.
- **Bryophyta:** Bryophyta's essence at 1/118.
- **Gems:** uncut rubies and diamonds always drop together.

**Leaving:**
- **The exit gate (Obor) or the Rock Pile (Bryophyta)** asks first: "Are you sure you want to leave Obor's Lair?" ("Exit the lair." / "Stay."). Obor's has the fade.
- **Quick-exit** leaves straight away.

<a id="doc-tsps-upstream-docs-edgeville-dungeon--obor"></a>
#### Obor

From the capture; stats from the Wiki: 120 HP, max hits 22 (melee) and 26 (ranged), attack speed 6.

| Attack | What happens |
| --- | --- |
| Punch (in reach) | Animation 4666, the hit a tick later. Sometimes a knockback: a 5-tile slide away from him (12212, under `busy`), stopping at walls, with the hit 2 ticks later |
| Boulder (out of reach) | The same swing. A tick later the earthstrike splash (98) and the player knocked down (7210) |
| Stamp | Animation 7183 and a splash (140) on his tile nearest the player. A tick later, rocks fall on every tile to the player's, a tile every 6 client cycles, the player's rockfall animation (7212) timed to the last, and the camera shakes. The hit lands 2 ticks after the stamp |

His ranged attacks do half damage through Protect from Missiles (Wiki). The stamp, the boulder and the knockback give the player their own animation, not a block. Combat methods can now say so: `playsBlockAnimation()`.

He attacks as the player slides into the pit: his first attack came the next tick, as captured.

How often he stamps, knocks back or stays at range isn't documented. The odds in the data are estimates from the capture.

**The pit:** the rocks (29491) slide the player in or out (1148): "You climb into the pit." / "You climb out of the pit."

<a id="doc-tsps-upstream-docs-edgeville-dungeon--bryophyta"></a>
#### Bryophyta

From the capture; stats and rules from the Wiki: 115 HP, max hits 16 (melee) and 10 (magic), attack speed 6, poison 8. Her lair is multi-combat.

- **Attacks:**
  - **Melee:** animation 4658, sometimes poisoning.
  - **Magic:** animation 7173, an earth blast (139) that lands at 46 + 10 client cycles a tile. Its heights are the capture's 172 and 124, stored as 43 and 31 because the server sends projectile heights times 4.
- **Growthlings:**
  - Each attack has a 1/5 chance to summon three. Only one batch is alive at a time, at least 20 ticks apart.
  - While any lives, she takes no damage.
  - A hit with a woodcutting axe or magic secateurs equipped kills one at once: "You prune the Growthling." Battleaxes, the zombie axe and the blessed axe don't count.
  - Any other attack gets "Cut the growthling down with an axe or secateurs." It can hurt the growthling but never kill it: the last hit point stays.
- **The logs:**
  - With no axe: "You take a bronze axe from the logs." The axe grows back about 49 ticks later.
  - With an axe: "You already have an axe."

<a id="doc-tsps-upstream-docs-edgeville-dungeon--giant-bones"></a>
#### Giant bones

- **Take:** "I don't think those will fit in my backpack..."
- **Bury** (their own ground option):
  1. "Bury the bones? (This grants Prayer XP)" ("Yes." / "Yes, and don't ask again." / "No.").
  2. On yes, they're buried where they lie: animation 827, sound 2738 and 150 Prayer XP, with no message.

**Changes this needs:**
- **Client:** a ground item's options other than Take used to just close the menu. They are now sent with their name and number.
- **Server:**
  - a named option other than Take goes to the item's own handler, even in a private area;
  - the pickup hook fires in private areas, as it did before.

<a id="doc-tsps-upstream-docs-edgeville-dungeon--diary-tasks"></a>
#### Diary tasks

| Diary | Task | Trigger |
| --- | --- | --- |
| Varrock hard | Squeeze through an obstacle pipe in Edgeville dungeon | The pipe shortcut (Agility emits `agility:obstacle`) |
| Varrock medium | Get a Slayer task from Vannaka | Any assignment from him (Slayer emits `slayer:task-assigned`) |
| Wilderness easy | Kill an Earth Warrior in the Wilderness beneath Edgeville | A kill in the dungeon's Wilderness part |

<a id="doc-tsps-upstream-docs-edgeville-dungeon--not-modelled"></a>
#### Not modelled

- Combat Achievements, and the music unlock lines.
- The "sneaking suspicion" scroll-box message (no clue system).
- The Bryophyta gate's "Check-Count" option (its response isn't captured).
- Free-to-play drop tables (the members tables are used).
- The giantsoul amulet's teleport, and changing worlds inside a lair.
- The steel key ring.
<!-- end-source-document: tsps-upstream/docs/edgeville-dungeon.md -->

---

<a id="doc-tsps-upstream-docs-extrascripts"></a>
## tsps-upstream/docs/extrascripts.md

<!-- source-document: tsps-upstream/docs/extrascripts.md -->
<a id="doc-tsps-upstream-docs-extrascripts--extrascripts"></a>
### Extrascripts

Extrascripts are **optional content modules** that work independently of which gamemode is running. They're for universal functionality — things like debug tools, admin commands, or content that should exist on any server regardless of gamemode.

Extrascripts live in `server/extrascripts/{id}/` and export a `register` function.

<a id="doc-tsps-upstream-docs-extrascripts--creating-an-extrascript"></a>
#### Creating an Extrascript

<a id="doc-tsps-upstream-docs-extrascripts--1-create-the-directory"></a>
##### 1. Create the directory

```
server/extrascripts/my-script/
  index.ts
```

<a id="doc-tsps-upstream-docs-extrascripts--2-export-a-register-function"></a>
##### 2. Export a register function

```typescript
// server/extrascripts/my-script/index.ts
import type { IScriptRegistry, ScriptServices } from "../../src/game/scripts/types";

export function register(registry: IScriptRegistry, services: ScriptServices): void {
    registry.registerCommand("hello", (event) => {
        services.messaging.sendGameMessage(event.player, "Hello from my extrascript!");
    });
}
```

That's it. Drop a folder in `server/extrascripts/` with an `index.ts` exporting `register`, and it loads automatically at startup. No configuration needed.

<a id="doc-tsps-upstream-docs-extrascripts--what-extrascripts-can-do"></a>
#### What extrascripts can do

Extrascripts have access to the same `IScriptRegistry` and `ScriptServices` as gamemodes. They can register:

- **Commands** — `::mycommand` chat commands
- **NPC interactions** — talk-to, attack, pickpocket, etc.
- **Loc interactions** — object click handlers
- **Item actions** — inventory item options, item-on-item, item-on-loc
- **Widget buttons** — UI button click handlers
- **Region events** — enter/leave region triggers
- **Tick handlers** — per-tick logic

<a id="doc-tsps-upstream-docs-extrascripts--load-order"></a>
#### Load Order

1. Gamemode calls `registerHandlers()` first
2. All extrascripts call `register()` after

Extrascript handlers run alongside gamemode handlers. If both register a handler for the same interaction, both will be evaluated — the registry determines priority.

<a id="doc-tsps-upstream-docs-extrascripts--hot-reload"></a>
#### Hot Reload

Extrascripts support hot-reload during development. Set the `SCRIPT_HOT_RELOAD=1` environment variable and the server will watch for file changes, reloading extrascripts without a full restart.

<a id="doc-tsps-upstream-docs-extrascripts--gamemodes-vs-extrascripts"></a>
#### Gamemodes vs Extrascripts

| Use case                                                 | System                        |
| -------------------------------------------------------- | ----------------------------- |
| Server-specific rules (XP rates, tutorials, progression) | [Gamemode](#doc-tsps-upstream-docs-gamemodes)      |
| Universal tools (debug commands, admin utilities)        | Extrascript                   |
| Content that only matters for one server type            | Gamemode `registerHandlers()` |
| Content that should work on any server                   | Extrascript                   |

**Rule of thumb:** if it makes sense on every server, it's an extrascript. If it defines or changes how the server plays, it's a gamemode.

<a id="doc-tsps-upstream-docs-extrascripts--custom-content"></a>
#### Custom Content

Both gamemodes and extrascripts can define **custom items** and **custom widgets** using the built-in registries. These are automatically sent to the client at login and resolved seamlessly alongside cache data.

<a id="doc-tsps-upstream-docs-extrascripts--custom-items"></a>
##### Custom Items

Use `CustomItemBuilder` and `CustomItemRegistry` to define items that don't exist in the OSRS cache. Custom items use IDs starting at **50000+** to avoid conflicts.

```typescript
import { CustomItemBuilder } from "../../client/custom/items/CustomItemBuilder";
import { CustomItemRegistry } from "../../client/custom/items/CustomItemRegistry";

CustomItemRegistry.register(
    CustomItemBuilder.create(50100)
        .basedOn(3834) // clone properties from an existing cache item
        .name("My Custom Item")
        .inventoryActions("Activate", null, null, null, "Drop")
        .build(),
    "my-source-id",
);
```

The client resolves custom items via `CustomObjTypeLoader`, which wraps the base cache loader. No client-side changes needed — registered items appear in inventories, shops, and tooltips like any cache item.

<a id="doc-tsps-upstream-docs-extrascripts--custom-widgets"></a>
##### Custom Widgets

Use `CustomWidgetRegistry` to define widget groups that don't exist in the cache:

```typescript
import { CustomWidgetRegistry } from "../../src/game/scripts/CustomWidgetRegistry";

const widgetGroup = buildMyWidgetGroup(); // your widget definition
CustomWidgetRegistry.register(widgetGroup);
```

Custom widgets are serialized into the gamemode content data packet and delivered to the client at login.

<a id="doc-tsps-upstream-docs-extrascripts--content-data-packet"></a>
##### Content Data Packet

Gamemodes can send arbitrary data to the client by implementing `getContentDataPacket()`. This is how custom items, widgets, and gamemode-specific data (like league tasks) reach the client. The core engine handles packet delivery at login — gamemodes just build the payload.

<a id="doc-tsps-upstream-docs-extrascripts--bundled-extrascripts"></a>
#### Bundled Extrascripts

| Extrascript    | Description                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `item-spawner` | Admin debug tool — custom widget for searching and spawning items. Uses `CustomItemBuilder` and `CustomWidgetRegistry` for custom UI. Command: `::itemspawner` |

<a id="doc-tsps-upstream-docs-extrascripts--skill-implementations"></a>
#### Skill Implementations

Skills are owned by the vanilla gamemode and registered via its `registerHandlers()` call. Gamemodes that extend vanilla (such as Leagues V) inherit all skill handlers through `super.registerHandlers()`.

Skills register their own action handlers via `registerActionHandler`, making them fully self-contained — the engine has no hardcoded knowledge of any skill's logic.

```
server/gamemodes/vanilla/skills/
├── index.ts                 # Aggregates sub-module register calls
├── consumables/             # Food eating, potion drinking
├── crafting/                # Flax picking, spinning wheel
├── firemaking/              # Fire lighting
├── fishing/                 # Fishing spots, minnow exchange
├── fletching/               # Log cutting, bow stringing, arrow/bolt combining
├── herblore/                # Herb cleaning, potions, stamina
├── mining/                  # Rock mining
├── prayer/                  # Bone burying, ash scattering, altar offering
├── production/              # Cooking, tanning, bolt enchanting
├── sailing/                 # Sailing, pandemonium
├── smithing/                # Smithing, smelting
├── thieving/                # NPC pickpocketing, lock picking
└── woodcutting/             # Tree chopping
```
<!-- end-source-document: tsps-upstream/docs/extrascripts.md -->

---

<a id="doc-tsps-upstream-docs-fairy-rings"></a>
## tsps-upstream/docs/fairy-rings.md

<!-- source-document: tsps-upstream/docs/fairy-rings.md -->
<a id="doc-tsps-upstream-docs-fairy-rings--fairy-rings"></a>
### Fairy rings

`server/plugins/world/FairyRings.plugin.js`, built from two live OSRS captures (rsprox) of a player using a fairy ring: Configure, turning the dials, Confirm (once refused at a warning, twice teleporting from beside the ring), "Last-destination" to the ring they stood on, and "Zanaris". The OSRS Wiki ("Fairy ring") covers the requirements.

<a id="doc-tsps-upstream-docs-fairy-rings--the-cache"></a>
#### The cache

All 64 dial combinations are rows of **db table 89**:

| Column | Holds |
| --- | --- |
| 0 | the destination id the server sends in varp 817 (`fairyring_destination1`): AJR 32, AJQ 33 |
| 1 | the combination's index, sent in varbit 5374 (`fairyring_lastloc`): AJR 14, AJQ 15 |
| 2 | the destination, a packed coordinate; combinations with no destination have a placeholder |
| 3 | the code, spaced ("A J R") |
| 4, 5 | the travel log's text and "Add Favourite" star components (interface 381) |
| 7 | the name ("Fairy ring (AJR)") |
| 8 | the travel log text ("<br>Fremennik Province: Fremennik Slayer Cave") |

The dials are varbits 3985/3986/3987 and count **anticlockwise**: by value 0-3 the letters are A D C B, I L K J and P S R Q, so the index is `dial1 * 16 + dial2 * 4 + dial3` (AJR is 0 3 2 = 14). The common ring (`fairyring_minorhub`, 29495) is a multiloc on varbit 5374; each variant's third option reads "Last-destination (XYZ)".

<a id="doc-tsps-upstream-docs-fairy-rings--what-osrs-sends"></a>
#### What OSRS sends

- **No staff wielded:** "The fairy ring only works for those who wield fairy magic." (A staff in the inventory isn't enough.)
- **Configure:** the dials reset to 0; the travel log's text is set for every code (blank for codes not used yet), the Fairy Queen's Hideout line ("<col=ffffff>AIR</col> DLR DJQ AJS<br><col=ff981f>Fairy Queen's Hideout</col>") and the 10 favourite slots; script 917 (`toplevel_mainmodal_background`) with `[4212288, 50]` dims the whole game view; then the dials (398) open on the main modal and the travel log (381) on the side modal. Varbit `busy` (12393) = 1 follows a tick later.
- **A rotate button** (398:19-24, clockwise and counter-clockwise per dial) turns its dial one step.
- **Confirm** (398:26), tick 0: varp 817, varbit 5374, varbit 20251 (`fairyring_lastloc_opvis`) = 64 + the index; the player, configuring from beside the ring, walks onto the ring's own tile (facing reset); both interfaces close and `meslayer_close` (script 101) runs with `[28]`, closing the travel log's search box if it is open. Then:

| Tick | Sent |
| --- | --- |
| 1 | graphic 569 (`fairy_flower_ring`), animation 3265 (`human_fairy_vanish`) with delay 30, sound 1098 |
| 4 | the teleport; animation 3266 (`human_fairy_appear`) |
| 5 | `busy` = 0; animation reset |

- **"Last-destination (XYZ)"** (op 3) and **"Zanaris"** (op 1, code BKS) skip the dials. Both were captured from the ring's tile: `busy` and the flowers at once, the teleport 3 ticks later, `busy` 0 a tick after. To the ring the player stands on, the animation plays without moving them.
- **Close** (398:27) is client script 29 (`if_close`); the server only clears `busy`.
- **AJQ** (Dorgesh-Kaan cave), for a player without a light source: at Confirm, varbit 3865 (`cws_warning_15`) = 1, `meslayer_close [28]` and `toplevel_mainmodal_open` (2524) `[-1, -1]` run, and the warning (578) opens: "This fairy ring code leads to a dark area. Are you sure you want to go there without a light source?" with "Yes I am sure." (578:17) and "No, I am not properly equipped." (578:18). No closed it and cleared `busy`.

<a id="doc-tsps-upstream-docs-fairy-rings--implementation"></a>
#### Implementation

- A player not on the ring's tile steps onto it first, for every option, and the flowers follow a tick later: the capture shows that for Confirm, so Last-destination and Zanaris from beside the ring do the same. The ring is solid in the cache (clip type 1), so the step bypasses collision, as agility's forced walks do.
- Closing the dials by any route runs `meslayer_close [28]`, so Close and Escape close the search box too.

- The table is read at startup; the Wiki-based `fairy-rings.json` it replaces is gone.
- Saved per player: the last code (its varp and varbits are sent again on login), the codes used (the travel log shows those) and up to 10 favourites. "Use code" in the log sets the dials; "Add Favourite" and "Remove Favourite" edit the list. The capture shows the favourite slots only empty, so their text (the code's log text and its code) is ours.
- The warning's "Don't ask me this again" (578:20) toggles varbit 3865 between 1 and 2, and 2 skips it; the capture doesn't show the toggle. Light sources are matched by item name: lit candles, torches and lanterns, bullseye lanterns, Kandarin headgear 2-4, the Firemaking and max capes.
- Not shown in the capture, so not sent: a sound heard while dialling (synth 2871, not on every click).
- The dial letters are 12 models (16237, 16243-16283) that script 398 rotates with `if_setmodelangle`; the selected letter sits at the bottom, behind a window in the wooden bar (component 18, model 16236). The window's faces are translucent (alpha 192). OSRS draws widget models straight into the frame, so the letter shows through. The client draws each widget model into its own texture, so `client/ui/model/Model2DRenderer.ts` now keeps each pixel's coverage, and a translucent face stays translucent instead of blending with black (`client/tests/widget-model-translucency.test.ts`).
- `server/tests/fairy-rings.test.cjs` checks the table, the dial order, the staff rule, Configure, the dials, the Confirm teleport tick by tick, AJQ's warning, Last-destination and the favourites.
<!-- end-source-document: tsps-upstream/docs/fairy-rings.md -->

---

<a id="doc-tsps-upstream-docs-faq"></a>
## tsps-upstream/docs/faq.md

<!-- source-document: tsps-upstream/docs/faq.md -->
<a id="doc-tsps-upstream-docs-faq--faq"></a>
### FAQ

<a id="doc-tsps-upstream-docs-faq--general"></a>
#### General

<a id="doc-tsps-upstream-docs-faq--is-there-a-hosted-version-i-can-play"></a>
##### Is there a hosted version I can play?

No. XRSPS is a self-hosted project — you clone the repo and run it locally. See the [Setup Guide](/setup) to get started.

<a id="doc-tsps-upstream-docs-faq--what-cache-version-is-supported"></a>
##### What cache version is supported?

Check the `target.txt` file in the repo root for the current target. The cache is downloaded automatically from the OpenRS2 Archive.

<a id="doc-tsps-upstream-docs-faq--where-can-i-see-whats-being-worked-on"></a>
##### Where can I see what's being worked on?

The project roadmap and task tracking is on [Trello](https://trello.com/b/UjMvJYrl/xrsps).

<a id="doc-tsps-upstream-docs-faq--can-i-contribute"></a>
##### Can I contribute?

Yes. Fork the repo, make your changes, and open a pull request. Join the [Discord](https://discord.gg/3dzttF2q73) if you have questions.

<a id="doc-tsps-upstream-docs-faq--gamemodes"></a>
#### Gamemodes

<a id="doc-tsps-upstream-docs-faq--should-i-extend-basegamemode-or-vanillagamemode"></a>
##### Should I extend BaseGamemode or VanillaGamemode?

Extend **VanillaGamemode** unless you're building something radically different (e.g. a minigame-only server). Vanilla gives you banking, shops, combat, all skills, and all UI widgets out of the box. Override what you need, inherit what you don't.

<a id="doc-tsps-upstream-docs-faq--how-do-i-switch-which-gamemode-the-server-runs"></a>
##### How do I switch which gamemode the server runs?

Set the `GAMEMODE` environment variable or add `"gamemode": "my-gamemode"` to `server/config.json`. The default is `vanilla`.

<a id="doc-tsps-upstream-docs-faq--can-i-use-vanillas-combat-system-without-extending-vanillagamemode"></a>
##### Can I use vanilla's combat system without extending VanillaGamemode?

Yes. Import the provider create functions directly from `server/gamemodes/vanilla/combat/` and register them in your `initialize()`. See [Reuse vanilla providers from BaseGamemode](#doc-tsps-upstream-docs-gamemodes--customizing-a-provider).

<a id="doc-tsps-upstream-docs-faq--where-does-gamemode-specific-player-data-get-stored"></a>
##### Where does gamemode-specific player data get stored?

Each gamemode gets its own directory under `server/data/gamemodes/{id}/`. Player state, account credentials, and durable trade recovery data are stored in `game.sqlite` in that directory. Legacy `player-state.json` and `accounts.json` files are imported automatically and left in place as backups.

<a id="doc-tsps-upstream-docs-faq--extrascripts"></a>
#### Extrascripts

<a id="doc-tsps-upstream-docs-faq--whats-the-difference-between-a-gamemode-and-an-extrascript"></a>
##### What's the difference between a gamemode and an extrascript?

A gamemode defines server identity — XP rates, drop tables, tutorials, progression. An extrascript is a universal module that works on any server — debug tools, admin commands, content that isn't gamemode-specific. See [Gamemodes vs Extrascripts](#doc-tsps-upstream-docs-extrascripts--gamemodes-vs-extrascripts).

<a id="doc-tsps-upstream-docs-faq--custom-content"></a>
#### Custom Content

<a id="doc-tsps-upstream-docs-faq--how-do-i-add-a-custom-item"></a>
##### How do I add a custom item?

Use `CustomItemBuilder` and `CustomItemRegistry`. Custom items use IDs 50000+ and can clone properties from existing cache items. See [Custom Content](#doc-tsps-upstream-docs-extrascripts--custom-content).

<a id="doc-tsps-upstream-docs-faq--do-custom-items-work-on-any-gamemode"></a>
##### Do custom items work on any gamemode?

Yes. `CustomItemRegistry` is a core system — both gamemodes and extrascripts can register items, and they're resolved automatically on both client and server.

<a id="doc-tsps-upstream-docs-faq--how-does-custom-content-reach-the-client"></a>
##### How does custom content reach the client?

Via `getContentDataPacket()` on `GamemodeDefinition`. The engine sends this packet during login. The client unpacks it and registers items/widgets into their respective client-side registries. See [Architecture — Custom Content](#doc-tsps-upstream-docs-architecture--custom-content).

<a id="doc-tsps-upstream-docs-faq--development"></a>
#### Development

<a id="doc-tsps-upstream-docs-faq--how-do-varps-and-varbits-work"></a>
##### How do varps and varbits work?

Varps are player variables. Varbits are bit-packed sub-variables within a varp. The server sets them, sends delta packets, and client-side CS2 scripts react to update widgets. This is the same system OSRS uses — no custom UI packets needed. See [Architecture](#doc-tsps-upstream-docs-architecture--varps-and-varbits).
<!-- end-source-document: tsps-upstream/docs/faq.md -->

---

<a id="doc-tsps-upstream-docs-ferox-enclave"></a>
## tsps-upstream/docs/ferox-enclave.md

<!-- source-document: tsps-upstream/docs/ferox-enclave.md -->
<a id="doc-tsps-upstream-docs-ferox-enclave--ferox-enclave"></a>
### Ferox Enclave

`server/plugins/areas/FeroxEnclave.plugin.js`, with its parts in `server/plugins/areas/ferox/`: the town's barriers and safe ground (`Barriers.FeroxEnclave.js`), the Pools of Refreshment (`Pool.FeroxEnclave.js`) and the free-for-all portal and arena (`FreeForAll.FeroxEnclave.js`). `Common.FeroxEnclave.js` holds what they share: tick timing, the busy varbit and the full restore.

**Sources:**
- **OSRS captures** (rsprox): passing through a barrier both ways (once with the warning, once with "don't ask again"), drinking from a pool, and the free-for-all portal there and back;
- **the OSRS Wiki:** "Ferox Enclave", "Pool of Refreshment", "Free-for-all portal", "Exit portal (Clan Wars)", "Clan Wars".

All object ids and tiles are checked against this cache.

`Bounds.FeroxEnclave.js` holds the town's outline, the barriers (39652, 39653) and the buffer outside them. It moved here from `LootKeys.plugin.js`; LootKeys, LootingBag, the PvP presets and the Wilderness plugin now use it from here.

<a id="doc-tsps-upstream-docs-ferox-enclave--barriers"></a>
#### Barriers
- **Leaving, the first time:**
  1. A message box (interface 229): "When returning to the Enclave, if you are teleblocked, you will not be allowed to enter the Enclave until the teleblock has worn off. You will also be attackable in the safe zone outside the Enclave if you are teleblocked." The last sentence is in red.
  2. Then "Continue through the Barrier?" with "Yes." / "Yes, and don't ask again." / "No.".
  3. "Don't ask again" sets varbit 10532 (`wildy_hub_warning`). It's saved per player and sent again on login.
- **Coming in:** no prompt.
- **Crossing:**
  - **On the choice, or straight away:** `busy` = 1; you face the way through; animation 4282 (`sos_security_door_drag`) and sound 4193 (2 loops, delay 30).
  - **A tick later:** a one-tile teleport through, `busy` = 0, and the animation is reset.
- **Teleblocked:** a teleblocked player can't come in: "A magical force prevents you from entering the Ferox Enclave while teleblocked." (our wording, kept from before).
- **Varbits:** 6549 (`pvp_adjacent_area_client`) is 1 inside the town, and 10530 (`wildy_hub_buffer`) is 1 in the buffer by the barriers. Both are kept up to date every tick near Ferox.
- **Not like OSRS:** in OSRS the buffer counts as Wilderness (varbit 5963 = 1). Here the Wilderness plugin counts it as safe ground, as before, so 5963 stays 0 there. Attacks there are still only allowed when someone is teleblocked.

<a id="doc-tsps-upstream-docs-ferox-enclave--safe-ground"></a>
#### Safe ground
Players can't attack each other inside the town or in its buffer, unless one of them is teleblocked (Wiki). This was already in LootKeys and moved here unchanged.

<a id="doc-tsps-upstream-docs-ferox-enclave--pools-of-refreshment"></a>
#### Pools of Refreshment
- **Captured:** animation 7305 (`poh_pool_drink`), "You feel reinvigorated after drinking from the pool.", varp 456 = −1 (disease), and `busy` from the next tick.
- **The restore (Wiki):**
  - every skill back to its base level, including hitpoints and prayer;
  - run energy to 100%;
  - poison, venom and disease cured;
  - all prayers turned off;
  - **not** special attack.
- **Ours:** `busy` clears 3 ticks after drinking (the capture ends before it does).

<a id="doc-tsps-upstream-docs-ferox-enclave--free-for-all-arena"></a>
#### Free-for-all arena

`FreeForAll.FeroxEnclave.js`, from two captures (the portal there and back; Disable-XP, a walk through the arena, the Mysterious Portal) and the Wiki.

**The portals:**
- **"Enter"** (26645): a teleport to 3327, 4751 a tick after the click, fully restored, as at the pool but with prayers left on (Wiki).
- **The exit portal** (26646, "Exit"):
  - **on arrival:** you face it;
  - **a tick later:** `busy` = 1 and a teleport back to 3128, 3629, facing north;
  - **a tick after that:** `busy` = 0.
- **"Disable-XP":** the question "Disable XP gains in Clan Wars?" (or "Enable…" once disabled), with "Yes." / "No.". Yes sets varbit 20231 (`clan_wars_xp_disable`) and shows "You will no longer gain XP in Clan Wars." / "You will now gain XP in Clan Wars." in a message box. The setting is saved per player, and XP is blocked only inside the arena.
- **The Mysterious Portal** (56373) shows "This portal is unavailable on this world.", with `busy` until you click continue.

**Inside the arena** (x 3264–3391, y 4736–4863, its own Area):
- **On entering:**
  - "Attack" on players;
  - varbit 8121 (`pvp_area_client`) = 1;
  - the PvP overlay with the safe badge (the crossed skull);
  - the free-for-all overlay (interface 199) on the HUD.
- **On leaving by any route:** all of that comes down and you're restored again (Wiki).
- **The line:** ground decoration 8875 runs across the arena at y 4759–4760. South of it, and on it, is a safe zone: "Attack" still shows (as captured at the landing tile), but nobody there can fight or be attacked. **The message is ours:** "You can't fight in the safe zone." (at most every 3 seconds).
- **PvP past the line (y ≥ 4761):** any player may attack any other, at any combat level, and nobody is skulled for it. The arena is not a `pvp` zone, so no Wilderness rules apply.
- **Multi-combat:** the northern part, from y 4800, is a `multi-combat` zone in `world.json`. The capture shows the multi icon from there. Its full width is assumed, since only the middle was walked.
- **Deaths are safe:** nothing is dropped, and any skull is kept (Wiki: since 2021). You come back outside the portal at Ferox (3128, 3629), restored. **Where you respawn is ours:** no capture or Wiki source says.
- **Meteors:** they fall in the north for show.
  - **Captured:** each is projectile 660, rising from a launch tile to a point 3–4 tiles away (cycles 0→60, height 0→1000), then falling to a landing tile beyond it (60→120), with blast graphic 659 (delay 120) and area sound 594 at the launch tile. Nobody is hurt.
  - **Ours (approximate):** the launch area (x 3297–3317, y 4818–4828, as seen in the capture), one every 4 ticks, and the random direction.
- **The "Attack" option** is sent with `sendPlayerOption(1, …)`, the packet this client reads. The older `sendInteractionOption` is a no-op here: `PlayerSession.write` drops unported packets.

**Not done:**
- **The level row:** the capture also shows the PvP overlay's level row. We leave it hidden, because its text comes from a cache script that only knows real Wilderness levels.
- **Music unlocks:** the server has no music unlocks, so the music follows the region.
<!-- end-source-document: tsps-upstream/docs/ferox-enclave.md -->

---

<a id="doc-tsps-upstream-docs-fortis-colosseum"></a>
## tsps-upstream/docs/fortis-colosseum.md

<!-- source-document: tsps-upstream/docs/fortis-colosseum.md -->
<a id="doc-tsps-upstream-docs-fortis-colosseum--fortis-colosseum"></a>
### Fortis Colosseum

The Fortis Colosseum, built from the OSRS Wiki, a live rsprox capture (the lobby to the start of wave 1) and the cache. Offline_Scape's unfinished port served as a reference, mainly for wave composition and spawn points (which it credits to the LlemonDuck *fortis-colosseum* RuneLite plugin and Supalosa's line-of-sight tool) and, later, Sol Heredit. It is one plugin, `server/plugins/minigames/Colosseum.plugin.js`, which delegates to one unit per area in `server/plugins/minigames/colosseum/`.

<a id="doc-tsps-upstream-docs-fortis-colosseum--status"></a>
#### Status

| Phase | What | State |
| --- | --- | --- |
| 1 | Lobby, Minimus, entry, the arena, intermission and modifier choice, waves and reinforcements, leaving and death | Done |
| 2 | The seven enemy types' own attacks | Done |
| 3 | Modifier effects | Done |
| 4 | Sol Heredit | Done (no boss health HUD yet) |
| 5 | Rewards, the chest, Glory and the pet | Done |
| 6 | The scoreboard, and the Colosseum's items (Dizana's quiver, echo boots, Tonalztics of Ralos, the quiver exchange with Minimus) | To do |

<a id="doc-tsps-upstream-docs-fortis-colosseum--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `ColosseumShared.js` | Ids, tiles, Glory titles and helpers such as the fade. |
| `ColosseumWaves.js` | What each wave sends in and where it spawns. |
| `ColosseumModifiers.js` | The modifiers from the cache, their tiers, and what Minimus offers. |
| `ColosseumRun.js` | One player's run: the arena, Minimus, the intermission, waves, leaving. |
| `Enemies.*` | The seven enemy types' attacks, their spawn delays, the warband's movement and the Minotaur's healing. |
| `ModifierEffects.*` | Modifiers that change blows or the player: Blasphemy, Doom, Frailty, Myopia, Relentless, Mantimayhem's venom. |
| `ColosseumHazards.js` | Modifiers that put something in the arena: Bees!, Solarflare, Totemic, Volatility, Reentry's molten sand. |
| `Lobby.*` | The way down and back up, Minimus's introduction, the bank chest and the tunnel. |
| `Arena.*` | Minimus's Start-wave and Leave, the intermission buttons, death and login. |
| `SolHeredit.*` | Wave 12: Sol Heredit's greeting, landing, attacks, phases, sand and light crystals. |
| `SolPatterns.js` | The tiles Sol's attacks cover, the barricade, and where his sand falls. |
| `ColosseumLoot.js` | The rewards chest's tables (from the Wiki) and the rolls. |
| `Rewards.*` | The run's loot and Glory, and the rewards chest. |
| `Commands.*` | Developer commands. |

<a id="doc-tsps-upstream-docs-fortis-colosseum--the-lobby"></a>
#### The lobby

| What | Where | Notes (capture unless marked) |
| --- | --- | --- |
| Colosseum entrance (50749, Enter) | (1796, 3106), in Civitas illa Fortis | Fade out, then two ticks later the lobby at (1799, 9506). |
| Stairs (50750, Exit) | (1796, 9506) | Back up to the city. |
| Minimus (12807) | (1805, 9508) | His transcript is in `npc-dialogues.json`. His first talk is his introduction and sets varbit 9807. |
| Gloria (12809) | Beside Minimus | Talk-to only (her transcript). |
| Bank chest (50748) | (1805, 9501) | Below 2,000 Glory (Brawler, Wiki): "Oi, get yer hands off that! It's reserved for survivors of the Colosseum." then "You do not have enough Glory to use that.". |
| Entrance (50751, the tunnel) | (1810, 9506) | Before the introduction: "Oi! Where d'you think you're going? …". |

The lobby's NPCs are in `npc-spawns.json` at their captured places: Minimus, Gloria, three wandering gladiators and two doing push-ups. The sparring gladiators that come and go in the capture are left out.

**Entering through the tunnel:**
1. A warning box: "You are about to enter the Fortis Colosseum. Within, you will face multiple waves of deadly foes. Dying at any point is not considered a safe death. Apart from between waves, there is no exit within the Colosseum, but teleporting out is allowed."
2. "Are you sure you wish to enter the Fortis Colosseum?" with "Yes, I understand the risks." / "Yes, and don't ask again." / "No.". "Don't ask again" skips both from then on.

Minimus's "[rank]" is the Glory title (Wiki):

| Glory | Title |
| --- | --- |
| 0 | Rookie |
| 2,000 | Brawler |
| 5,000 | Challenger |
| 8,000 | Gladiator |
| 12,000 | Hero |
| 16,000 | Champion |
| 20,000 | Grand Champion |

<a id="doc-tsps-upstream-docs-fortis-colosseum--the-arena"></a>
#### The arena

Live OSRS copies the arena's map square into an instance. Here the arena is a private area over the real tiles, (1806-1842, 3088-3128) on plane 0, as the Inferno does: the arena floor is walled in and no city tile reaches it.

**On arrival** (capture):
- You land at (1824, 3094), then from the next tick walk north to (1824, 3104), a tile short of Minimus.
- The seated Sol Heredit (12827) is at (1823, 3123) on a blocking loc (50703).
- Minimus (12808, "Start-wave" and "Leave") appears at (1824, 3106) with anim 10862. He says "A Rookie approaches!", then "Let me know when you want to begin." three ticks later.
- The arena is multi-way.

**The intermission screen** is interface 865 on the main modal:
- Script 4931 is run with the waves cleared, the three modifier keys offered, three reward values and a final int.
  - The reward values (`0, 30560, 0` before wave 1) are the value of the loot so far, of the next wave's, and of the last wave's. rsprox labels them longs, but this cache's script 4931 takes eight ints (its footer has no long arguments), so they are sent as ints.
  - Before the script, the three reward inventories are sent in full: 843 (so far), 844 (the next wave's), 845 (the last wave's).
- Components 8, 39, 34 and 37 get op1 (`if_setevents`).
- Buttons 15-17 pick a modifier (varbit 9788 = 1-3), and 41 confirms.
- Confirming sets varp 4135 to the modifier's Glory per wave, sets its tier varbit, and closes the screen. The wave starts five ticks later.

**A wave:**
- **Start** (capture):
  - Highest wave (varbit 11410), the start time (varp 4133), and "Wave: 1" in red.
  - The trio and the shaman play anim 10861 as they appear.
  - Damage taken in the wave goes to varp 4134.
- **Composition** (LlemonDuck's plugin, matching the Wiki):
  - The Fremennik trio every wave; the serpent shaman on waves 1-6.
  - Javelin Colossi: 1 on wave 2, 2 on wave 3, then alternating 2/1 from wave 5.
  - Manticores: 1 on waves 4-8, 2 from wave 9.
  - The Shockwave Colossus on waves 7, 8 and 11.
  - Quartet adds an archer; Dynamic Duo doubles the Shockwave Colossus.
- **Spawn points:**
  - The trio forms around a random tile in (1821-1827, 3105-3111): berserker north, archer west, seer east.
  - The rest take distinct points among 12 fixed ones, none within 4 tiles of the player.
- **Reinforcements:** a wave not cleared inside 40 seconds (67 ticks) gets them through the gate on the player's half (north y 3122, south y 3091):
  - the Jaguar warrior on waves 1-6;
  - a shaman on waves 4-6 and 10-11;
  - the Minotaur on waves 7-11 (its route-finding version with Red Flag);
  - none on wave 12, Sol Heredit's.

  A wave cleared before then ends without them (Wiki).
- **Clearing:** "Wave N completed! Duration: m:ss.ss" (Offline_Scape), and Minimus reappears a tile north of the player.

**Leaving and dying:**
- Minimus's Leave before wave 1: "Are you sure you wish to leave?" (Yes./No.).
- Leave after wave 1: his forfeit warning and "Are you sure you wish to leave early?" (both from the transcript). Yes brings out the rewards chest (see Rewards).
- Leaving through Minimus restores every stat to its level (Wiki).
- Teleporting or logging out ends the run and loses its loot and Glory.
- Dying (capture) shows "Oh dear, you are dead!" and puts you in the lobby at (1804, 9508). The loot is lost; the run's Glory is kept (Wiki). The Wiki's grave is in the lobby; this server has no graves, so what would drop lands there.

<a id="doc-tsps-upstream-docs-fortis-colosseum--enemies"></a>
#### Enemies

**Numbers (Wiki):**

| Enemy | Max hit | Range | Attack speed | Notes |
| --- | --- | --- | --- | --- |
| Berserker | 29 | 1 | 6 | Melee |
| Seer | 12 | 1 | 6 | Magic, only from melee range |
| Archer | 14 | 1 | 6 | Ranged, only from melee range |
| Serpent shaman | 27 | 10 | 5 | Magic |
| Jaguar warrior | 47 | 1 | 5 | Three hits, each rolled on its own |
| Javelin Colossus | 48 | 15 | 5 | Ranged, plus the artillery javelin |
| Manticore | 31 / 36 / 31 | 15 | 10 | Magic / ranged / melee orbs |
| Shockwave Colossus | 56 | 15 | 5 | Magic |
| Minotaur | 74 | 1 | 5 | Melee; heals |

**Spawn delay:** every enemy waits 3 ticks after appearing. The trio then take their first swings a tick apart: berserker, seer, archer (Wiki; Offline_Scape's captures).

**The Fremennik warband** (Wiki; Offline_Scape's captures) doesn't chase the way other NPCs do:
- Each heads for its own tile beside the player (berserker north, seer east, archer west, Quartet's extra one south) and routes around the pillars.
- If a pillar takes that tile, one heads for the nearest open side tile no other warbander claims, or holds still. Routing to the blocked tile would fall back to the nearest reachable one, which can be the player's own tile, where it can't attack (Offline_Scape describes the same).
- They run, and walk through other NPCs.
- A swing that comes while one is still moving is skipped, and the next waits a full attack cycle.
- The style each is weak to (magic on the berserker, ranged on the seer, melee on the archer) always hits it for the player's maximum.

**Minimus** answers Start-wave and Leave from anywhere in the arena: the player doesn't walk up to him (live behaviour).

**Javelin Colossus artillery:** every fifth attack is the javelin thrown into the air (anim 10893, graphic 2676). It lands 3 ticks later on the tile the player stood on (shadow 1446, landing 2674) for up to 40 typeless damage.
- Offline_Scape's captures give the 3 ticks; the Wiki says 6.
- The Wiki gives the 40.

**Manticore volley:**
1. It charges (anim 10868).
2. From the sixth tick it throws the orbs a tick apart (anim 10869): magic and ranged in either order, then melee.
3. Each orb rolls its damage, with the player's protection prayer at that moment, as it is thrown (Wiki).

Projectiles and impacts:

| Orb | Projectile | Impact |
| --- | --- | --- |
| Magic | 2681 | 2682 |
| Ranged | 2683 | 2684 |
| Melee | 2685 | 2686 |

While it charges, the orbs show on its body in throwing order, one a tick, in spotanim slots 1-3 (the orb projectile graphics above). Each slot is cleared as its orb is thrown. They float above it at different heights, lowest to highest green (ranged, 290), blue (magic, 380), red (melee, 470); the heights are tuned by eye. An orb's spin (seqs 10327-10329) plays for 60 client cycles, so a held orb is sent again every tick until it is thrown (every 2 ticks left a gap where it flashed off). The RuneLite Fortis Colosseum plugin reads the order the same way, from the Manticore's spotanims.

**Minotaur:**
- Its damage lands a tick after its swing (Wiki).
- While not in melee range of the player, every 5 ticks it heals each damaged enemy within 6 tiles to full. The Wiki says it heals continuously and gives no rate; the healing has no animation here.

**Animations and graphics:**
- The trio and the shaman are from the capture. Shaman: anim 10859, cast 1458, projectile 1459, impact 1460. Seer: 10853 with fire blast 130/131. Archer: 10850 with arrow 9. Berserker: 10856.
- The colossi are from Offline_Scape. Javelin: 10892 with projectile 2673. Shockwave: 10903 with projectile 2520.
- The Minotaur's attack, 10843, also comes from Offline_Scape.
- The jaguar's attack, 10847, is RuneLite's `NPC_JAGUAR_RANGER_CLAWS_ATTACK`.
- Every enemy's block and death animations (and Sol's) are in `npc-combat-defs.json`, from RuneLite's gameval names. Sol, the shaman, both colossi and the Manticore have no block animation (`-1`); without an entry they fell back to the humanoid one.

**Not done yet:**
- Two Manticores copying each other's orb order.
- Line-of-sight rules, including the Minotaur's healing being blocked by the pillars.

<a id="doc-tsps-upstream-docs-fortis-colosseum--modifiers"></a>
#### Modifiers

Enum 5312 lists the 14 modifiers by the key the intermission script takes. Each is a struct:

| Param | What |
| --- | --- |
| 1896 | Name |
| 1897-1899 | Tier texts |
| 1901 | Has tiers |
| 1903 | Glory per wave |
| 1914 | Icon |

Script 4980 reads each tiered modifier's tier from its own varbit:

| Modifier | Tier varbit |
| --- | --- |
| Blasphemy | 9790 |
| Bees! | 9791 |
| Reentry | 9792 |
| Myopia | 9795 |
| Frailty | 9796 |
| Solarflare | 9797 |
| Relentless | 9798 |
| Volatility | 9799 |
| Doom | 10681 |
| Mantimayhem | 4588 |

The capture's first offer was keys 4, 5 and 12 (Blasphemy, Relentless, Frailty). That matches the Wiki's fixed wave-1 offer, and picking Blasphemy set 9790 to 1.

**Offer rules (Wiki):**
- Red Flag and Dynamic Duo are offered from wave 7 (Dynamic Duo not after wave 11).
- A maxed or untiered-and-taken modifier isn't offered again.
- Upgrades of picked modifiers are favoured. The Wiki gives no figure; here an upgrade is twice as likely as a new modifier.

<a id="doc-tsps-upstream-docs-fortis-colosseum--sol-heredit-wave-12"></a>
#### Sol Heredit (wave 12)

Sources:
- The Wiki's Sol Heredit page and the Strategies page give the mechanics, timings and damage.
- His lines come from his transcript in `npc-dialogues.json`.
- RuneLite's gameval tables give the animations and graphics.
- Offline_Scape gave what the Wiki doesn't (marked **RSPS** below).

**Start:**
1. Confirming the twelfth intermission plays his greeting for the attempt: first, second, third, or later (persisted per player). The greeting is skipped once he has been beaten.
2. He jumps (anim 10876), with "Sol Heredit jumps down from his seat...", and the screen fades.
3. The seated Sol and his seat's blocker go.
4. The gladiators' barricade goes up: locs 50753-50758 along the edges between the four pillars, (1817, 3099)-(1832, 3114) (**RSPS**).
5. The player is put at (1825, 3103) (**RSPS**).
6. Sol (12821, 1,500 HP, size 5) lands at (1823, 3108) (**RSPS**) with anim 10877 and graphic 2666, and says "Let's start by testing your footwork."

**Attacks** (Wiki unless marked):

| Attack | What | Speed |
| --- | --- | --- |
| Spear 1 / Spear 2 | 5x5 under him, the row in front (cardinal), and two / three 4-tile lines towards the player. At a diagonal, Spear 2 covers 7x7 under him (**RSPS**). | 7 (6 from 75%) |
| Shield 1 / Shield 2 | Everything within 7 tiles except the ring at 9x9 / 11x11. | 6 (5 from 75%) |
| Triple (below 90%) | Hits at 3, 6, 9 ticks (9 becomes 10 from 50%) for 15/25/35 (15/30/45 from 50%), blocked by Protect from Melee on as it lands. Protect from Melee already on in the 2 ticks before a hit is switched off ("Sol Heredit doesn't take kindly to your eager prayer.") and the hit lands. | 12 (11 from 75%, **RSPS**) |
| Grapple (below 75%) | He calls body, back, hands, legs or feet. Clicking the worn item in that slot within 4 ticks defends it; the item stays on. On the last tick it is a perfect parry: the player's next attack within 5 ticks is a max hit. A wrong slot: "You defended the wrong body part!". Undefended: 20-45 damage (**RSPS** minimum, Wiki maximum) and the item torn off into the inventory. | 7 (**RSPS**) |

More on the attacks:
- AOE damage is up to 44 typeless, from his tile at the swing, landing 2 ticks later (**RSPS** timing). He can't move for 4 ticks from an AOE.
- A second Spear or Shield in a row uses pattern 2. A different attack resets the pattern, and so does a special. He opens every phase with a Spear.
- The pool is two Spears and two Shields, plus the unlocked specials. After a special, two ordinary attacks must pass before the next (**RSPS**).

**Phases** at 1350, 1125, 750, 375 and 150 HP (90/75/50/25/10%), each with its transcript line. Each transition:
- puts 6 beams of light (graphic 2698) in the 9x9 around the player, one on the player's tile, each leaving molten sand 2 ticks later (6-8 damage a tick, for the fight);
- adds a light crystal (NPC 12824), four at most;
- freezes him for the transition, a 7-tick attack (**RSPS**).

Enraged (150 HP): 5 pools at once, then one more every 3 ticks, and the crystals fire every 12 ticks with 2 ticks' warning.

**Light crystals** (patrols and cooldown **RSPS**):
- Each patrols one edge of the barricaded arena: north, then east, south, west.
- They fire together every 25-35 ticks.
- Firing: the charge (anim 10801, graphics 2689-2692 along the beam), then 3 ticks later the beam (anim 10802, graphics 2693-2696, end 2697).
- A player in the beam takes 60-75 damage: the Wiki's "up to 75" / "70+", with Offline_Scape's minimum.

**Modifiers in wave 12** (Wiki):
- The Solarflare orb circles a 5x5 by one corner of the barricaded arena.
- A totem heals him 75 every 7 ticks.
- Volatility makes him explode too (graphic 2724).

**His end:**
- He says one of his death lines, the kill is counted (no greeting next time), and after his death animation (10888) the run ends.
- If the player dies, he says one of his lines for that.

**Not done yet:**
- The boss health HUD.
- The enraged crystals aiming at the player.
- The camera of the live cutscene.

<a id="doc-tsps-upstream-docs-fortis-colosseum--rewards-and-glory"></a>
#### Rewards and Glory

**Loot** (Wiki, "Rewards Chest (Fortis Colosseum)"):
- Each wave's loot is one roll on its table in `ColosseumLoot.js`; wave 1 is always 80 sunfire splinters.
- The roll happens before the wave, so the intermission screen shows it (capture).
- Sunfire fanatic pieces have duplicate protection: a piece the player has had fewest of comes first, counted once the wave is cleared (attribute `colosseum:fanatic-pieces`).
- Wave 12 adds Dizana's quiver (uncharged) and rolls Smol Heredit at 1/200. The pet goes through the Pets plugin's `npc-drops:roll`, which now knows Smol Heredit (follower 12857).
- Left out: the Varlamore token on wave 3 (the Wiki gives its rate as "varies").
- Values are the items' GE prices (`item-prices.json`). The capture's 80 splinters at 30,560 is 382 each.

**The chest** (Wiki; tiles **RSPS**):
- Forfeiting between waves, or beating Sol Heredit (once his death animation has played and his hazards have gone), brings the Rewards Chest (loc 50741, appear anim 10825) out at (1829, 3105), with Minimus at (1830, 3103) to leave by.
- Search opens interface 246: the items (inventory 843) in component 11 with Take, Bank-all (5), Take-all (7), Discard-all (9), and "Total Value: N" (3).
- Loot left in the chest is lost on leaving. Dying, teleporting or logging out loses all of it (the capture's death sent an empty preview and "Total Value: 0").

**Glory** per cleared wave (Wiki, "Glory"):

| Part | Points |
| --- | --- |
| Completion | 100 x wave |
| No damage | 100 x wave, unless an enemy hurt the player that wave (Solarflare, sand, the sky javelin, explosions and swarms don't count) |
| Modifiers | Every active modifier's Glory (param 1903) x its tier |
| Time | 500 x wave less wave a tick, never below 0, rounded down to an even number |

- The run's total is in varp 4132.
- The best run is the player's Glory (`colosseum:glory`, which sets the title and the bank chest).
- A run counts when the player leaves through Minimus or dies; a teleport or logout doesn't.
- Counting swarms and explosions as environmental is an estimate.

<a id="doc-tsps-upstream-docs-fortis-colosseum--modifier-effects"></a>
#### Modifier effects

The Wiki's modifier table gives the effects. RuneLite's gameval tables name the NPCs, animations and graphics. The Wiki gives no damage figures for Solarflare or the Volatility explosions, so those are estimates (marked below).

| Modifier | What it does here |
| --- | --- |
| Blasphemy | Prayer drained by 20/40/60% of each hit taken. |
| Doom | A stack per hit taken, shown in the Doom hitsplat (type 73, RuneLite) with the count. 15/10/5 stacks kill; stacks clear when a wave is completed. |
| Frailty | Hitpoints level lowered by 10/20/40% for the run, and healing above it is lost. The level comes back when the run ends (it is never saved). |
| Myopia | Attack range 2/4/6 tiles shorter, never below 1. Manual casts are unaffected. |
| Relentless | Max hits +1/+3/+6. Accuracy is rolled as if 33/66% of the Defence level were gone; at III every blow hits. |
| Mantimayhem | I: two of each orb, each rolled on its own. II: an orb not prayed against envenoms, and the venom is cured when a wave ends. III: the orbs come in any order. |
| Bees! | 1-3 swarms (NPC 12823, 2x2, 1 HP) step towards the player every 12 ticks. Under one: up to 10 poison damage a tick (halved by antipoison) and poison. A killed swarm returns 50 ticks later. |
| Solarflare | An orb (NPC 12826) walks the ring around one pillar: every 2 ticks with 7 at each corner (I), every 2 ticks without stopping (II), or every tick with 2 at each corner (III, which also turns prayers off). |
| Totemic | An enemy at half health or below gets a healing totem (NPC 12825) to its south-west. The totem starts healing 5 ticks later and heals 30% at a time until the enemy is full (anim 10828, projectile 2687, impact 2688). A destroyed totem returns 200 ticks later, and a totem goes with its enemy. |
| Volatility | A dead enemy explodes 2 ticks later, one (I) or two (II, III) tiles past its size. III leaves molten sand on the centre tile. Explosion graphics 2713 (human), 2721 (Manticore, which plays its exploding death 10867), 2722 (colossi), 2723 (Minotaur). |
| Reentry | Where a sky javelin lands: molten sand for the wave (I); from II the sand is permanent and the tile south-west is added, and III adds the tile west of that one. A blocked tile moves to a random free neighbour. |
| Quartet | A random warbander joins the trio, to the south (Wiki). |
| Dynamic Duo, Red Flag | Wave composition (see above). |

**Molten sand** is loc 50746, which doesn't block. Standing on it deals up to 15 damage every other tick, and none between waves (the Molten Sand page).

All the damage above goes through the run, so it adds to the wave's damage taken (varp 4134), Blasphemy and Doom. Swarms, the orb and totems never count towards clearing a wave, and they go when it ends.

**Estimates** (the Wiki gives no figure):

| What | Value here |
| --- | --- |
| Solarflare damage | Up to 5/10/15 when the orb reaches the player. |
| Volatility explosion damage | Up to 15. |
| Totem heal rate | Every 5 ticks. |
| Which pillar the orb circles | A random one each wave. |
| Where swarms appear | A random spawn point at least 4 tiles from the player. |

The Bee Swarm page says 15-20 damage a tick where the modifier table says up to 10; the modifier table is followed.

**Core additions** (generic, used by these modifiers):
- `api.onCombatAttackDistance`: plugins can adjust an attacker's reach (Myopia).
- `SkillManager.setMaxLevelCap`: a temporary, unsaved cap on a base level (Frailty).
- `api.core.AccuracyFormulasDpsCalc` (Relentless).
- `Mobile.showHitsplat` and per-hit splat types (the Doom hitsplat). These are the same change as the Wintertodt branch's.
- `forceMaxHit` on the hit-roll event (the warband's weakness, Sol's perfect parry).
- `NPC.WALK_THROUGH_ENTITIES_FLAG` (the warband, the orb, swarms).
- `Mobile.performGraphicInSlot(slot, graphic)`: several spotanims on one actor at once, each in its own slot (the Manticore's orbs). The update block already carried a slot list; the server now sends every slot. The client already decoded and drew them.

<a id="doc-tsps-upstream-docs-fortis-colosseum--developer-commands"></a>
#### Developer commands

| Command | What it does |
| --- | --- |
| `::colosseum` | To the lobby. |
| `::colokill` | Kills the wave under way. |
| `::cologlory <glory>` | Sets your best Glory (title, bank chest). |
| `::colowave <1-12>` | Between waves: makes the next wave the given one (12 is Sol Heredit), with its loot rolled. |
| `::colomod <modifier> <0-3>` | Between waves: sets a modifier's tier (`blasphemy`, `doom`, `solarflare`, `red-flag`, ...). |

The Fortis Colosseum is also in `::teleports` under Minigames.
<!-- end-source-document: tsps-upstream/docs/fortis-colosseum.md -->

---

<a id="doc-tsps-upstream-docs-gamemodes"></a>
## tsps-upstream/docs/gamemodes.md

<!-- source-document: tsps-upstream/docs/gamemodes.md -->
<a id="doc-tsps-upstream-docs-gamemodes--gamemodes"></a>
### Gamemodes

A gamemode defines the **identity of a server**. It controls the rules, progression, and feel of the game. Each server runs exactly one gamemode.

Gamemodes live in `server/gamemodes/{id}/` and export a `createGamemode()` function that returns a `GamemodeDefinition`.

<a id="doc-tsps-upstream-docs-gamemodes--what-a-gamemode-controls"></a>
#### What a gamemode controls

- XP multipliers and drop rates
- Spawn location and tutorial flow
- Player initialization and state serialization
- Login handshake (varps, varbits, feature flags)
- Per-tick hooks and interaction restrictions
- Handler registration (banking, shops, equipment, UI widgets, content interactions)
- Display name formatting and chat player types
- Custom content data packets
- Service providers exposed to script handlers

<a id="doc-tsps-upstream-docs-gamemodes--inheritance-chain"></a>
#### Inheritance Chain

```
BaseGamemode (abstract — sensible OSRS defaults, no content)
  └─ VanillaGamemode (full OSRS — banking, shops, combat, skills, widgets)
       └─ LeaguesVGamemode (league tasks, relics, area unlocks, tutorial)
       └─ YourGamemode (your customizations on top of vanilla)
```

There are two paths for creating a gamemode:

| Base class        | When to use                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BaseGamemode`    | Building from scratch. You get valid defaults but no content — no banking, no shops, no skills. Suitable for minigame servers or highly custom experiences. |
| `VanillaGamemode` | Most common. You inherit the full OSRS experience and override what you need. This is what Leagues V does.                                                  |

<a id="doc-tsps-upstream-docs-gamemodes--bundled-gamemodes"></a>
#### Bundled Gamemodes

| Gamemode    | Base              | Description                                                                                              |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `vanilla`   | `BaseGamemode`    | Baseline OSRS — banking, shops, equipment, combat, all skills, all UI widgets, core content interactions |
| `leagues-v` | `VanillaGamemode` | Raging Echoes — area unlocks, relics, masteries, tasks, league tutorial, custom XP/drop rates            |

<a id="doc-tsps-upstream-docs-gamemodes--creating-a-gamemode"></a>
#### Creating a Gamemode

<a id="doc-tsps-upstream-docs-gamemodes--1-create-the-directory"></a>
##### 1. Create the directory

```
server/gamemodes/my-gamemode/
  index.ts
```

The `GamemodeRegistry` discovers gamemodes by scanning `server/gamemodes/` for directories containing an `index.ts` or `index.js` that exports `createGamemode()`.

<a id="doc-tsps-upstream-docs-gamemodes--2-write-the-gamemode-class"></a>
##### 2. Write the gamemode class

<a id="doc-tsps-upstream-docs-gamemodes--extending-vanillagamemode-recommended"></a>
###### Extending VanillaGamemode (recommended)

```typescript
// server/gamemodes/my-gamemode/index.ts
import type {
    GamemodeDefinition,
    GamemodeInitContext,
} from "../../src/game/gamemodes/GamemodeDefinition";
import type { PlayerState } from "../../src/game/player";
import type { IScriptRegistry, ScriptServices } from "../../src/game/scripts/types";
import { VanillaGamemode } from "../vanilla/index";

class MyGamemode extends VanillaGamemode {
    override readonly id = "my-gamemode";
    override readonly name = "My Gamemode";

    override getSkillXpMultiplier(): number {
        return 10;
    }

    override getDropRateMultiplier(): number {
        return 3;
    }

    override initializePlayer(player: PlayerState): void {
        player.energy.drainEnabled = false;
    }

    override registerHandlers(registry: IScriptRegistry, services: ScriptServices): void {
        super.registerHandlers(registry, services); // inherit all vanilla handlers
        // register your own handlers here
    }

    override initialize(context: GamemodeInitContext): void {
        super.initialize(context); // initialize vanilla systems (combat, banking, shops, etc.)
        // initialize your own systems here
    }
}

export function createGamemode(): GamemodeDefinition {
    return new MyGamemode();
}
```

This gives you the full vanilla experience (banking, shops, equipment, skills, combat, all UI) with 10x XP, 3x drop rates, and infinite run energy.

<a id="doc-tsps-upstream-docs-gamemodes--extending-basegamemode-from-scratch"></a>
###### Extending BaseGamemode (from scratch)

```typescript
// server/gamemodes/my-gamemode/index.ts
import { BaseGamemode } from "../../src/game/gamemodes/BaseGamemode";
import type { GamemodeDefinition } from "../../src/game/gamemodes/GamemodeDefinition";

class MyGamemode extends BaseGamemode {
    readonly id = "my-gamemode";
    readonly name = "My Gamemode";

    override getSkillXpMultiplier(): number {
        return 5; // 5x XP
    }
}

export function createGamemode(): GamemodeDefinition {
    return new MyGamemode();
}
```

This gives you a working gamemode with 5x XP and all other OSRS defaults (Lumbridge spawn, no tutorial, standard drop rates). It won't have banking, shops, or skills — you'd register those yourself.

<a id="doc-tsps-upstream-docs-gamemodes--3-run-your-gamemode"></a>
##### 3. Run your gamemode

Set the gamemode ID in your server configuration:

- **config.json:** `{ "gamemode": "my-gamemode" }`
- **Environment variable:** `GAMEMODE=my-gamemode`

The default gamemode is `vanilla`.

<a id="doc-tsps-upstream-docs-gamemodes--where-logic-should-live"></a>
#### Where Logic Should Live

| Logic type                                            | Location                                                                   | Example                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| Engine systems (ticks, networking, player sync)       | `server/src/`                                                              | Collision, pathfinding, packet routing             |
| Pluggable data providers (combat formulas, spells)    | `server/src/game/providers/` interfaces, `vanilla/combat/` implementations | CombatFormulaProvider, SpellDataProvider           |
| Reusable services (shop orchestration, banking)       | Service classes in the gamemode (`vanilla/shops/ShopService.ts`)           | ShopService wraps ShopManager + server integration |
| Gamemode-specific rules (XP rates, tutorials, relics) | `server/gamemodes/{id}/index.ts` overrides                                 | LeaguesV XP multiplier, tutorial flow              |
| Universal tools (debug commands, admin)               | `server/extrascripts/{id}/`                                                | item-spawner                                       |

Keep gamemode `index.ts` files thin — they should wire systems together, not implement them. Extract complex logic into dedicated service classes (like `ShopService`) so the gamemode just instantiates and connects them.

<a id="doc-tsps-upstream-docs-gamemodes--structure"></a>
#### Structure

```
server/gamemodes/vanilla/
├── index.ts                    # VanillaGamemode class (extends BaseGamemode)
├── banking/                    # BankingManager + handler registration
├── combat/                     # Combat formulas, special attacks, equipment bonuses
├── data/                       # Weapons, spells, runes, projectiles, login defaults
├── equipment/                  # Equipment actions + widget handlers
├── shops/                      # ShopManager, ShopService + widget handlers
├── skills/                     # All skill implementations (mining, fishing, etc.)
├── scripts/
│   ├── content/                # Climbing, doors, al-kharid border, etc.
│   ├── items/                  # Followers, packs
│   └── levelup.ts              # Level-up display
├── modals/                     # Widget open/close handlers, smithing modal
└── widgets/                    # Combat, prayer, spellbook, minimap, settings, etc.

server/gamemodes/leagues-v/
├── index.ts                    # LeaguesVGamemode (extends VanillaGamemode)
├── LeagueContentProvider.ts    # Custom content data packet
├── LeagueTaskManager.ts        # Task completion tracking
├── LeagueTaskService.ts        # Task progress helpers
├── LeaguesVUiController.ts     # League-specific UI controller
├── scripts/                    # League tutor, league widgets, tutorial widgets
├── data/                       # Task/mastery/relic definitions, custom items
└── ...
```

<a id="doc-tsps-upstream-docs-gamemodes--handler-registration"></a>
#### Handler Registration

Gamemodes register interaction handlers via `registerHandlers()`. The `IScriptRegistry` supports 86+ handler types including NPC interactions, loc interactions, item actions, widget buttons, commands, and more.

```typescript
override registerHandlers(registry: IScriptRegistry, services: ScriptServices): void {
    super.registerHandlers(registry, services); // inherit parent handlers
    registerMyNpcHandlers(registry, services);
    registerMyWidgetHandlers(registry, services);
}
```

Handlers registered by the gamemode run first. Extrascript handlers are loaded after.

<a id="doc-tsps-upstream-docs-gamemodes--service-providers"></a>
#### Service Providers

Gamemodes can create stateful managers and expose them to script handlers via `contributeScriptServices()`:

```typescript
override initialize(context: GamemodeInitContext): void {
    super.initialize(context);
    this.bankingManager = new BankingManager(context.serverServices);
}

contributeScriptServices(services: ScriptServices): void {
    services.banking = {
        openBank: (player, opts) => this.bankingManager.openBank(player, opts),
        // ...
    };
}
```

Handlers then access these via `services.banking.openBank(player)` without knowing about the underlying manager.

<a id="doc-tsps-upstream-docs-gamemodes--global-providers"></a>
#### Global Providers

VanillaGamemode registers 13 global data providers during `initialize()` that power the core combat and spell systems. Each provider is a singleton registered to the `ProviderRegistry` — the last call wins, so you can replace any provider after `super.initialize()`.

| Provider                        | Create function                         | Source file                               |
| ------------------------------- | --------------------------------------- | ----------------------------------------- |
| `CombatFormulaProvider`         | `createCombatFormulaProvider()`         | `vanilla/combat/CombatFormulas.ts`        |
| `WeaponDataProvider`            | `createWeaponDataProvider()`            | `vanilla/data/weapons.ts`                 |
| `SpecialAttackProvider`         | `createSpecialAttackProvider()`         | `vanilla/combat/SpecialAttackRegistry.ts` |
| `EquipmentBonusProvider`        | `createEquipmentBonusProvider()`        | `vanilla/combat/EquipmentBonuses.ts`      |
| `SpellDataProvider`             | `createSpellDataProvider()`             | `vanilla/data/spells.ts`                  |
| `SpellXpProvider`               | `createSpellXpProvider()`               | `vanilla/combat/SpellXpData.ts`           |
| `RuneDataProvider`              | `createRuneDataProvider()`              | `vanilla/data/runes.ts`                   |
| `ProjectileParamsProvider`      | `createProjectileParamsProvider()`      | `vanilla/data/projectileParams.ts`        |
| `SkillConfigurationProvider`    | `createSkillConfiguration()`            | `vanilla/combat/SkillConfiguration.ts`    |
| `CombatStyleSequenceProvider`   | `createCombatStyleSequenceProvider()`   | `vanilla/combat/CombatStyleSequences.ts`  |
| `SpecialAttackVisualProvider`   | `createSpecialAttackVisualProvider()`   | `vanilla/combat/SpecialAttackVisuals.ts`  |
| `InstantUtilitySpecialProvider` | `createInstantUtilitySpecialProvider()` | `vanilla/combat/RockKnockerSpecial.ts`    |
| `AmmoDataProvider`              | `createDefaultAmmoDataProvider()`       | `server/src/game/combat/AmmoSystem.ts`    |

Gamemodes extending VanillaGamemode inherit all of these via `super.initialize()`. Gamemodes extending BaseGamemode directly must register their own providers if they need combat.

<a id="doc-tsps-upstream-docs-gamemodes--customizing-a-provider"></a>
##### Customizing a provider

To override a specific provider while keeping the rest, call `super.initialize()` then re-register just the one you want to change. The last `register` call wins.

**Replace entirely** — write your own implementation of the interface:

```typescript
import { getProviderRegistry } from "../../src/game/providers/ProviderRegistry";

// inside your gamemode class:
override initialize(context: GamemodeInitContext): void {
    super.initialize(context); // registers all 13 vanilla providers

    // Replace combat formulas with custom ones
    const registry = getProviderRegistry();
    registry.combatFormula = {
        maxHit: (player, target) => 99,  // everyone hits 99s
        hitChance: () => 1.0,            // never miss
        // ... implement remaining CombatFormulaProvider methods
    };
}
```

**Wrap vanilla's provider** — import the create function, spread it, and override specific methods:

```typescript
import { getProviderRegistry } from "../../src/game/providers/ProviderRegistry";
import { createCombatFormulaProvider } from "../vanilla/combat/CombatFormulas";

// inside your gamemode class:
override initialize(context: GamemodeInitContext): void {
    super.initialize(context);

    const registry = getProviderRegistry();
    const base = createCombatFormulaProvider();
    registry.combatFormula = {
        ...base,
        maxHit: (player, target) => base.maxHit(player, target) * 2, // double max hit
    };
}
```

**Reuse vanilla providers from BaseGamemode** — if you extend BaseGamemode but still want standard OSRS combat:

```typescript
import { getProviderRegistry } from "../../src/game/providers/ProviderRegistry";
import { createCombatFormulaProvider } from "../vanilla/combat/CombatFormulas";
import { createWeaponDataProvider } from "../vanilla/data/weapons";

// inside your gamemode class:
override initialize(context: GamemodeInitContext): void {
    // No super.initialize() — BaseGamemode's is a no-op

    // Cherry-pick the providers you need
    const registry = getProviderRegistry();
    registry.combatFormula = createCombatFormulaProvider();
    registry.weaponData = createWeaponDataProvider();
    // ... register only the providers you need
}
```

<a id="doc-tsps-upstream-docs-gamemodes--provider-lifecycle"></a>
##### Provider lifecycle

Providers are cleaned up when `dispose()` is called on the gamemode. VanillaGamemode's `dispose()` calls `resetProviderRegistry()` which clears all providers at once. If your gamemode extends VanillaGamemode, call `super.dispose()` at the end of your own `dispose()`:

```typescript
override dispose(): void {
    // Clean up your own state first
    this.myManager = undefined;
    super.dispose(); // resets all providers
}
```

<a id="doc-tsps-upstream-docs-gamemodes--gamemodedefinition-interface"></a>
#### GamemodeDefinition Interface

The full interface is defined in `server/src/game/gamemodes/GamemodeDefinition.ts`. Required methods that BaseGamemode provides defaults for:

| Method                     | Default                   |
| -------------------------- | ------------------------- |
| `getSkillXpMultiplier()`   | `1`                       |
| `getDropRateMultiplier()`  | `1`                       |
| `transformDropItemId()`    | passthrough               |
| `canInteract()`            | `true`                    |
| `initializePlayer()`       | no-op                     |
| `serializePlayerState()`   | `undefined`               |
| `deserializePlayerState()` | no-op                     |
| `onNpcKill()`              | no-op                     |
| `isTutorialActive()`       | `false`                   |
| `getSpawnLocation()`       | Lumbridge (3222, 3218, 0) |
| `onPlayerHandshake()`      | no-op                     |
| `onPlayerLogin()`          | no-op                     |
| `getPlayerTypes()`         | `[PlayerType.Normal]`     |
| `registerHandlers()`       | no-op                     |
| `initialize()`             | no-op                     |

Optional hooks (not required, return `undefined` if absent):

`getDefaultSkillXp`, `getSkillXpAward`, `getDropTable`, `getSupplementalDrops`, `getLootDistributionConfig`, `canInteractWithNpc`, `onItemCraft`, `getLoginVarbits`, `getLoginVarps`, `isTutorialPreStart`, `onPlayerRestore`, `onPostDesignComplete`, `resolveAccountStage`, `onVarpTransmit`, `onWidgetOpen`, `onResumePauseButton`, `onPlayerTick`, `onPlayerDisconnect`, `getGamemodeServices`, `contributeScriptServices`, `createUiController`, `getContentDataPacket`, `dispose`
<!-- end-source-document: tsps-upstream/docs/gamemodes.md -->

---

<a id="doc-tsps-upstream-docs-gauntlet"></a>
## tsps-upstream/docs/gauntlet.md

<!-- source-document: tsps-upstream/docs/gauntlet.md -->
<a id="doc-tsps-upstream-docs-gauntlet--the-gauntlet"></a>
### The Gauntlet

The Gauntlet and the Corrupted Gauntlet, ported from Near-Reality's implementation and checked against the OSRS Wiki and the cache. It is one plugin, `server/plugins/minigames/Gauntlet.plugin.js`, which delegates to one unit per area in `server/plugins/minigames/gauntlet/`.

Status: done so far are the maze, the lobby, the run (entry, timer, exits, death) and preparing (resources, stations, the singing bowl, potions, cooking). monsters (with their drops), the Gauntlet weapons, the Hunllef, the reward chest, the scoreboard and stats.

<a id="doc-tsps-upstream-docs-gauntlet--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `GauntletShared.js` | Ids, varbits, tiles and helpers such as fades and dialogues. |
| `GauntletMap.js` | The maze: its layout, the room templates and turns, and lighting rooms. |
| `GauntletRun.js` | One player's run: the starting kit, the preparation timer, the boss phase, ending a run, and stats. |
| `Lobby.*` | The Gauntlet Portal in Prifddinas, the lobby's teleport platform, Bryn and the entrance. |
| `Run.*` | Nodes, the exit platform, the teleport crystal, the barrier, death, teleports and login recovery. |
| `GauntletItems.js` | Item ids per mode and the singing bowl's recipes. |
| `GauntletResources.js` | Stocking lit rooms with resources, and gathering. |
| `Prep.*` | The start room's stations, gathering hooks and Egniol potions. |
| `GauntletMonsters.js` | Monsters in lit rooms, demi-bosses, and the run's drop rules. |
| `GauntletHunllef.js` | The Hunllef fight. |
| `Weapons.*` | The halberds, bows and staffs in combat. |
| `GauntletRewards.js` | Run points, the reward chest and its loot tables. |
| `GauntletScoreboard.js` | The lobby scoreboard and the world's totals. |
| `Commands.*` | Developer commands. |

<a id="doc-tsps-upstream-docs-gauntlet--the-maze"></a>
#### The maze

The maze is a 7x7 grid of rooms, each 2x2 chunks:
- The Hunllef's room is in the centre.
- The start room sits on a random side of it (Wiki).
- Six rim rooms hold demi-bosses: the bear, the dragon and the dark beast, twice each (Near-Reality).

It is built with the core `TemplatedInstanceArea` (`server/src/main/typescript/elvarg/game/model/areas/impl/`), which:
- copies cache template chunks, turned, into an allocated grid at tile 8192+;
- builds server collision and locs from those templates;
- streams a REBUILD_REGION palette to the players inside, from `PlayerSession`.

Tiles no chunk has been copied to are blocked.

Templates (Near-Reality's, checked against the cache):

| Room | Source chunk |
| --- | --- |
| Four exits (middle) | x 232, y 704 / 706 / 708 / 710 |
| Three exits (rim) | x 234, same four variants |
| Two exits (corner) | x 236, same four variants |
| Start room | (238, 708) |
| Hunllef room | (238, 710) |

The Corrupted Gauntlet uses the same layout 8 chunks east. Rim and corner rooms are turned so their closed sides face out; middle rooms turn at random. A test walks every doorway of a fully lit maze to check this.

**Revealing rooms:**
- The whole layout is decided when the maze is made.
- A room is only drawn once lit, from a Node on the edge of a lit room (Wiki: nodes are lit "to visit new rooms"). The node's side of its room gives the direction.
- Lighting copies the room's chunks and sends the new scene to the player.

<a id="doc-tsps-upstream-docs-gauntlet--a-run"></a>
#### A run

**Entry.** The entrance (37340) is a multiloc on varp 2353: it shows "Enter", plus "Enter-corrupted" after any completion. Bryn turns players away if they:
- haven't spoken to him (his first talk sets this);
- have a pet out;
- have a reward waiting (varbit 9179).

His lines come from the Wiki transcript. You must also have an empty inventory and equipment, because nothing can be taken in or out.

**Starting kit** (Wiki): a crystal sceptre (wielded), then an axe, pickaxe, harpoon, pestle and mortar, and a teleport crystal. The Corrupted kit uses the corrupted versions. Near-Reality also gave a weapon frame and 50 shards; that isn't on the Wiki, so it's left out.

**Timer.** You get 10 minutes to prepare, or 7:30 in the Corrupted Gauntlet:
- interface 637 sits on the HUD overlay (161:8);
- script 2914(ticks) runs the countdown;
- script 2916 shows "Final Encounter".

When time runs out, you are taken into the boss room.

**Maze varbits:**

| Varbit | Meaning |
| --- | --- |
| 9178 | Maze map |
| 9292 | Corrupted |
| 9291 | Start room |
| 9289 / 9290 | Current room |
| 9240 + y * 7 + x | A lit room |
| 9177 | Boss phase |

**Barrier** (37339, corrupted 37337, a multiloc on varbit 9177):
- During preparation it offers Pass (asks first) and Quick-pass, which take you two tiles in and start the fight.
- During the fight it offers Escape.

**Leaving:**
- The start room's platform (36062 / 35965): Exit asks first, Quick-exit doesn't.
- Escape at the barrier, death, or logging out.

Every exit takes everything you carry and returns you to the lobby at (3032, 6127, 1). Dying drops nothing and counts a death. Teleports are blocked inside. A player saved inside a maze (after a server stop) is returned to the lobby on login.

**Lobby:**
- The Gauntlet Portal (36081) at (3229, 6114) in Prifddinas leads down.
- The lobby's Teleport Platform (36082) channels back up.
- `::teleports` has a Minigames entry for the lobby.

<a id="doc-tsps-upstream-docs-gauntlet--preparing"></a>
#### Preparing

**Resources.** Gauntlet resources aren't in the room templates: they are spawned into a room when it is lit. Yields are from the Wiki; no level is needed.

| Node (corrupted) | Gives | Yields | Tool |
| --- | --- | --- | --- |
| Crystal Deposit 36064 (35967) | crystal ore | 3 | pickaxe |
| Phren Roots 36066 (35969) | phren bark | 3 | axe |
| Fishing Spot 36068 (35971), 2x2 | raw paddlefish | 4 | harpoon |
| Linum Tirinum 36072 (35975) | linum tirinum | 3 | none |
| Grym Root 36070 (35973) | grym leaf | 1 | none |

A spent node turns into its depleted version (the next id). Rooms are stocked as Near-Reality does it:
- three rooms in four get 1-3 gathering nodes (at most 2 when monsters share the room);
- one in five also gets a few grym roots;
- nodes go on inner floor beside a wall or object, apart from each other and clear of the doorways;
- demi-boss rooms hold only their demi-boss;
- the other rooms are marked for monsters (phase 4).

Gathering also follows Near-Reality, since the Wiki gives no rates: a yield every 2 ticks, 1 XP, and a 1 in 5 chance of 5-30 shards.

**Nodes.** When a room is lit, the nodes on both sides of each passage to a lit neighbour turn to their lit, unclickable versions (id + 2). The symbols (36097, "Inactive Symbol") are left as they are: Near-Reality swaps them to 36096, but the cache's named "Illuminated Symbol" is 36095, and which one the game uses isn't confirmed.

**Stations in the start room:**
- Tool Storage gives back missing tools (Wiki: sceptre, axe, pickaxe, harpoon, pestle and mortar).
- Water Pump, or a vial used on a fishing spot, fills vials.
- Range cooks raw paddlefish for 15 XP. Paddlefish heals 20; Near-Reality's burn chance is used.
- Singing Bowl opens the make-X menu of what you can make next.
- Crystal Singing Recipes opens interface 640; Egniol Potions explains the recipe.

**Singing bowl** (Wiki recipes, Crafting and Smithing XP each):

| Product | Needs | Shards |
| --- | --- | --- |
| Vial | none | 10 |
| Teleport crystal | none | 50 |
| Escape crystal | none | 200 |
| Crystal paddlefish | paddlefish | 10 |
| Helm / legs | ore, bark, linum: 1 / 1 / 2 by tier | 50 / 50 / 100 |
| Body | ore, bark, linum: 1 / 2 / 2 by tier | 50 / 100 / 100 |
| Weapons (basic) | weapon frame | 0 |
| Weapons (attuned) | the basic weapon | 50 |
| Weapons (perfected) | attuned + spike / orb / bowstring | 0 |

Armour totals come to 150 / 350 / 650 shards and 3 / 7 / 13 of each resource for a full set, as the Wiki's Gauntlet page states. A worn piece is upgraded where it is worn.

Crystal and corrupted paddlefish heal 16 and combo-eat like karambwan (Wiki).

**Egniol potion** (Wiki):
1. Fill a vial with water.
2. Add a grym leaf to make a grym potion (unf).
3. Grind 10 shards into 10 dust with the pestle and mortar.
4. Add the 10 dust to make an Egniol potion (3), for 10 Herblore XP.

It restores prayer like a prayer potion, gives 40% run energy, and works as a stamina potion. The Wiki doesn't say whether a vial is left after the last dose. Guides have players make a vial per potion, so the last dose leaves nothing.

**Teleport crystal** (Wiki): it doesn't work in the start room. Once the fight has begun it says: "That won't help you now. At this point in the Gauntlet, you win or you die."

<a id="doc-tsps-upstream-docs-gauntlet--monsters"></a>
#### Monsters

| Tier | Crystalline (corrupted) |
| --- | --- |
| Weak | Rat 9026 (9040), Spider 9027 (9041), Bat 9028 (9042) |
| Strong | Unicorn 9029 (9043), Scorpion 9030 (9044), Wolf 9031 (9045) |
| Demi-boss | Bear 9032 (9046), Dragon 9033 (9047), Dark Beast 9034 (9048) |

**Data sources:**
- Stats, attack styles, aggression and sizes: `monsters-complete.json` (Wiki). Near-Reality's own numbers differ in places (the rat has 14 HP there, 12 on the Wiki), so they aren't used.
- Animations and projectiles: `npc-combat-defs.json`, Near-Reality's ids. Each lies in the same range as that NPC's cache idle and walk animations.
  - The dragon's projectile is 1701 (corrupted 1702), the dark beast's 1610 (corrupted 1606).
  - The spider has no block animation.
  - The dragon's impact graphic (1703/1704) isn't shown yet.

**Rooms** (Near-Reality): a room marked for monsters when it was stocked gets:
- three times in four, away from the rim, 1–4 weak monsters;
- otherwise 2 strong ones.

Each demi-boss stands alone in the middle of its room. Monsters don't respawn, and they're removed with the maze. Nothing attacks a player in the start room.

**Drops.** The plugin replaces the general tables for a run's monsters (the `npc-drops:roll` event). The weights are the Corrupted Gauntlet Wiki pages', which are exact; the crystalline pages only say common/uncommon.

| Tier | Always | Then one of (weight) | Weapon frame |
| --- | --- | --- | --- |
| Weak | 20–30 shards | nothing 9, 3–7 shards 9, 1–3 raw paddlefish 3, grym leaf 2, teleport crystal 1 | 1/4; always from the first weak kill of a run |
| Strong | 80–100 shards | 7–14 shards 9, nothing 6, 2–4 paddlefish 3, grym leaf 2, teleport crystal 1 | 2/7; always by the second strong kill |
| Demi-boss | 50–60 shards and a weapon frame | nothing 3, 10–21 shards 9, 3–5 paddlefish 3, grym leaf 2, teleport crystal 1 | always |

A demi-boss also drops its own component (bear: spike, dragon: orb, dark beast: bowstring) if the player doesn't own it. Otherwise it drops any component they don't own, at an equal chance; once all three are owned, none.

<a id="doc-tsps-upstream-docs-gauntlet--weapons-wiki"></a>
#### Weapons (Wiki)

| Weapon | Speed | Range | Notes |
| --- | --- | --- | --- |
| Halberd | 4 (not 7) | 2 | |
| Bow | 5 | 10 | No arrows; the strength is on the bow. Core `RangedWeapon.GAUNTLET_BOW` plus a plugin ammo handler that uses none. |
| Staff | 4 | 10 | Powered staff with a built-in spell. Max hit 23 / 31 / 39 by tier, regardless of level. The cast is Near-Reality's: animation 1167, graphics 1719/1720/1721 (corrupted 1722/1723/1724). |

<a id="doc-tsps-upstream-docs-gauntlet--the-hunllef"></a>
#### The Hunllef

The Hunllef waits in the boss room from the start of a run. It fights once the boss phase begins: through the barrier, or when the timer runs out. Killing it completes the run.

**Mechanics from the Wiki** (both versions share them):

| | |
| --- | --- |
| Hitpoints | 600 / 1000 |
| Attack speed | every 5 ticks |
| Attack style | Ranged first; switches every 4 attacks (tornado and prayer-disabling attacks count, the stomp doesn't), with animation 8754 |
| Protection prayer | Protects against one style (forms 9021 / 9022 / 9023: melee / ranged / magic; corrupted 9035–9037). Every 6th off-prayer hit, zeros included, switches it to that hit's style. Hits it protects against do nothing. |
| Stomp | If you stand under it when it attacks |
| Tornadoes | Crystalline 1 / 2 / 3, Corrupted 2 / 3 / 4, above 66% / 33–66% / below 33% HP. They chase you for 20 ticks; damage by armour tier is in the table below. |
| Floor | Three pattern sets by those thirds. Tiles turn blue (crimson) then orange, faster each phase; orange tiles deal 10–20 a tick. Floor loc 36149 (36046), +1 blue, +2 orange. |

**Max hits** by the lowest tier of a full crystal set (none / basic / attuned / perfected):

| | Correct prayer | No prayer | Tornado |
| --- | --- | --- | --- |
| Crystalline | 12 / 10 / 8 / 6 | 51 / 42 / 36 / 26 | 10–20 / 10–16 / 7–13 / 5–10 |
| Corrupted | 16 / 13 / 10 / 8 | 68 / 55 / 45 / 35 | 15–30 / 15–25 / 10–20 / 7–15 |

The Crystalline no-prayer maxes aren't on the Wiki: they're the Corrupted ratio per tier. The stomp hits up to the unprayed, unarmoured max.

**Near-Reality's values** (the Wiki gives none):
- the ids, animations (attack 8419, tornado 8418, stomp 8420, death 8421) and projectiles (ranged 1711, magic 1707, prayer-disabling 1713; corrupted +1);
- a tornado summon every 56 ticks;
- a floor pattern every 30 ticks, orange for 6 ticks;
- a 15% chance for a magic attack to disable prayers.

The Hunllef and its tornadoes are scripted: no default combat, and no drops (the reward is the chest).

<a id="doc-tsps-upstream-docs-gauntlet--rewards-wiki-reward-chest-the-gauntlet"></a>
#### Rewards (Wiki, Reward Chest (The Gauntlet))

When a run ends, a reward waits in the lobby's Reward Chest (37341, a multiloc on varbit 9179). It's kept in the save, and Bryn won't let you back in until you've collected it.

| How the run ended | Reward |
| --- | --- |
| Hunllef killed | 5–9 crystal shards and two rolls on the regular table |
| Corrupted Hunllef killed | 7–12 crystal shards, the Gauntlet cape if you don't own one, and three rolls on the corrupted table |
| Anything else, 50+ points | One item from the incomplete table (27 items, 1/27 each) |
| Anything else, 1–49 points | One item from the junk table (Iwan's flyer, potion, rotten tomato) |
| Anything else, 0 points | Nothing |
| Left by the teleport platform | Nothing |

Death, escaping at the barrier and logging out are all "anything else". The main tables are the Wiki's x/24 weights. Each tertiary item is rolled on its own: elite clue, crystal weapon and armour seeds, the enhanced seed, Youngllef.

**Points** (Wiki):
- 10: a demi-boss, or an attuned-to-perfected upgrade;
- 5: a strong monster, or a basic-to-attuned upgrade;
- 2: a weak monster, or a basic item;
- 1: cooking a paddlefish, or adding crystals to one. The Wiki lists that last one at 2 in one place, but its worked example counts 1.

The chest needs one free slot; anything that doesn't fit goes on the ground.

<a id="doc-tsps-upstream-docs-gauntlet--stats-and-the-scoreboard"></a>
#### Stats and the scoreboard

A completion prints:
- the challenge duration (with your personal best),
- the preparation and Hunllef kill times,
- your completion count.

Your stats are saved in `gauntlet:stats`: completions, deaths and best times per mode.

The lobby Scoreboard (36060) opens interface 639, which has your numbers next to the world's for both modes (the Wiki). The world's totals are kept in `server/data/saves/gauntlet-scoreboard.json`, which is gitignored; plugins have no world store.

<a id="doc-tsps-upstream-docs-gauntlet--developer-commands"></a>
#### Developer commands

| Command | Does |
| --- | --- |
| `::gauntlet` | Teleports to the lobby. |
| `::gauntletmap [corrupted] [all]` | A maze without a run, to inspect; `all` lights every room. |
| `::gauntletstart [corrupted]` | Starts a run without Bryn's checks; your hands must be empty. |
| `::gauntletboss` | Ends preparation and takes you to the Hunllef. |
| `::gauntlettime <seconds>` | Sets the preparation time left. |
| `::gauntletgear [basic\|attuned\|perfected]` | During a run: a Hunllef loadout of that tier (default perfected): the armour worn, the bow wielded, the staff, the halberd, 4 Egniol potions, 4 crystal paddlefish and paddlefish in the rest. |
| `::gauntletreward [corrupted] [incomplete\|junk]` | Puts a reward in the lobby chest as if a run just ended: a Gauntlet kill by default. |

<a id="doc-tsps-upstream-docs-gauntlet--tests"></a>
#### Tests

`server/tests/templated-instance.test.cjs`: turned copies collide like the cache map turned with them, and locs are found where the client draws them.

`server/tests/gauntlet.test.cjs`:
- the layout;
- doorways and the closed rim;
- lighting rooms;
- entry checks and the starting kit;
- the timer, the barrier and Escape;
- death, teleports and logout;
- stocking rooms and lit nodes;
- gathering;
- the singing bowl's costs and in-place upgrades;
- the Egniol chain;
- the teleport crystal's rules;
- monster animations, rooms and demi-bosses, the drop rules, and the safe start room;
- the Hunllef: its style cycle and stomp, max hits by armour and prayer, the protection switch, tornado counts, the floor tiles, and completion;
- the weapons and `::gauntletgear`;
- the reward rule and loot tables, points, the chest, completion messages and stats, and the scoreboard.
<!-- end-source-document: tsps-upstream/docs/gauntlet.md -->

---

<a id="doc-tsps-upstream-docs-gemstone-crab"></a>
## tsps-upstream/docs/gemstone-crab.md

<!-- source-document: tsps-upstream/docs/gemstone-crab.md -->
<a id="doc-tsps-upstream-docs-gemstone-crab--gemstone-crab"></a>
### Gemstone Crab

A timed world boss in the Tlati Rainforest (`server/plugins/bosses/GemstoneCrab.plugin.js`). Behaviour is from the OSRS Wiki. The cave crawl, animations, graphics, HUD, burrow timings and the crab tiles are from two live captures. The rest of the design follows OpenRune-Server's `gemstone-crab` module (ISC licence).

<a id="doc-tsps-upstream-docs-gemstone-crab--how-it-works"></a>
#### How it works

- **The cycle:** the crab (npc 14779, 5×5) rises at one of three mines and stays about ten minutes. It then burrows and leaves its shell (npc 14780, "Mine") for 90 seconds. It rises at a different mine 29 ticks after burrowing, so the shell is still there when the next crab is up.
- **Its hitpoints are its time left.** Max HP is its lifetime in ticks, and it loses one each tick. Players' hits show their damage but never lower it.
  - Captured: the HUD showed 75 of 1086 left, then 74 a tick later.
  - Its overhead bar is headbar 20, 120 wide, with fill 9 = ceil(75/1086 × 120).
- **Rewards:** the 16 players who dealt it the most damage may mine the shell once each, for three uncut gems.
  - Each roll is uncut dragonstone 1 in 500, otherwise by weight out of 32: opal 9, jade 9, red topaz 6, sapphire 3, emerald 2, ruby 2, diamond 1.
- **Its attacks:** max hit 1, crush, every 7 ticks. It focuses on one side (north, east, south or west), and every player on that side, beside or under its 5×5, can be hit (Wiki: "the quadrant it is focusing its attacks on"). It changes side as it changes target. The centre tile is safe.
- **Multi-combat:** each mine's area is multi-combat (`world.json`), so many players can fight it at once (Wiki: it "can be fought in large groups").
- **Combat XP** against it is 87.5% of normal (3.5 per damage instead of 4).
- **Messages** (Wiki), sent to the players at the crab's mine (OpenRune sends them to the whole world; neither the Wiki nor our capture says which):
  - "The gemstone crab burrows away, leaving a piece of its shell behind.";
  - "The top three crab crushers were A, B, & C!";
  - to each player who may mine: "You gained enough understanding of the crab to mine from its remains.";
  - to others who try: "Your understanding of the gemstone crab is not great enough to mine its shell.".

<a id="doc-tsps-upstream-docs-gemstone-crab--the-three-mines"></a>
#### The three mines

| Mine | Crab (south-west tile) | Cave (57631) | Crawl lands at | Area (HUD) |
| --- | --- | --- | --- | --- |
| 1 | **1271, 3171** | 1278, 3167 | **1277, 3168** | 1258-1284, 3158-3184 |
| 2 | **1351, 3110** | 1350, 3123 | 1351, 3122 | 1338-1364, 3096-3124 |
| 3 | **1238, 3041** | 1245, 3035 | **1246, 3038** | 1224-1250, 3029-3055 |

Bold values are captured; the rest are OpenRune's. OpenRune had mine 3's crab at (1237, 3042), and its landings at mines 1 and 3 one tile off. A "Gemstone crab director" (npc 14781) stands at (1251, 3034).

<a id="doc-tsps-upstream-docs-gemstone-crab--from-the-captures"></a>
#### From the captures

<a id="doc-tsps-upstream-docs-gemstone-crab--crawling-to-mine-3"></a>
##### Crawling to mine 3

- **Cave "Crawl-through"** (loc 57631):
  1. **Tick 0:** the player faces the cave and plays animation 11580. Sound 2454 plays (3 loops, delay 4), and the screen fades out (script 948, `[0, 255, 0, 0, 50]`). The HUD is hidden.
  2. **Tick 1:** `minimap_state` (6719) is set to 2 and `busy` (12393) to 1.
  3. **Tick 2:** the player is moved to the landing, facing north.
  4. **Tick 3:** fade in (`[0, 0, 0, 255, 50]`), then the minimap and `busy` are reset.
- **The crab's animations:** idle 12480, spawn 12481, burrow 12482, attack 12483, shell disintegrate 12484, shell idle 12485. It has no block animation: while being hit it played only its attack.
- **The boss HUD** is sent by the `BossHud` plugin ([boss-hud.md](#doc-tsps-upstream-docs-boss-hud)). It is interface 303 `hpbar_hud`, opened at login into the toplevel's `hpbar_hud` pane (161/164 child 2, 165 child 10).
  - varp 1683 `hpbar_hud_npc` = the npc id;
  - varbit 6099 `hpbar_hud_hp` = time left;
  - varbit 6100 `hpbar_hud_basehp` = lifetime;
  - varbit 12401 `hpbar_hud_boss` = 1;
  - client script 2376 `hp_hud_open`, given 19 of its components;
  - the fade scripts 2887 (in) and 2889 (out) take 14 of its components and a transparency (255 and 0). Leaving the mine fades the HUD out and hides `hpbar_hud:hp` (303:5) 2 ticks later. Showing it fades it back in (2887 from 254) after 2376: a finished fade-out leaves the bar's parts at transparency 255, 2376 doesn't reset them, and 2887 (via 2888) returns at once when told to start from the transparency they already have;
  - the bar's colours (303:13, :14 and :15 set to 25600, 576 and 800).

<a id="doc-tsps-upstream-docs-gemstone-crab--the-crab-burrowing-at-mine-2-and-rising-at-mine-1"></a>
##### The crab burrowing at mine 2 and rising at mine 1

Ticks are counted from the burrow animation.

| Tick | What happens |
| --- | --- |
| 0 | The crab plays 12482 and graphic 3454 (`vfx_crab_boss_death`). Its headbar and the HUD's hp go to 0. |
| 1-3 | The HUD's script 2887 runs once each tick. |
| 2 | The messages: "The gemstone crab burrows away, …" and the top three. Loc 32740 (shape 10, rotation 0), an invisible blocker, appears on the crab's south-west tile. |
| 4 | The crab is gone and the shell (14780) is there, with graphic 3452 (`crab_boss_remains_idle_spot`). The top damage dealers get "<col=005f00>You gained enough understanding of the crab to mine from its remains." |
| 8 | The HUD's script 2889 (its fade-out) runs. |
| 29 | The next crab rises at mine 1 (1271, 3171) with 12481 and graphic 3454. Its lifetime was 1073 ticks. |

- The shell's blocker stays until the shell goes.
- The player also got varp 4825 (`total_gemstone_crab_kills`), and a "Gemstone crab director" (14782, `notimer`) was spawned; neither is built.
- Crawling into mine 1's cave landed at (1277, 3168).

<a id="doc-tsps-upstream-docs-gemstone-crab--guessed-rather-than-captured"></a>
#### Guessed rather than captured

- **The lifetime:** a random 918-1086 ticks. The Wiki says about ten minutes, OpenRune uses 918-967, and the captures had 1086 and 1073.
- **Mine 2's landing and every mine's area** are OpenRune's.
- **The sides:** each side is a wedge from the crab's centre, with the diagonals on both of their sides (OpenRune's reading of the Wiki's "quadrant"). Each player hit gets their own 0-1 roll.
- **The multi-combat areas** are the HUD areas, so they're OpenRune's too.
- **Timings:** the shell crumbling over its last 4 ticks, its idle graphic replayed every 14 ticks, the HUD clearing 11 ticks after the burrow, and target switching every 3-6 attacks. All from OpenRune, except the HUD clearing, which is a guess.
- **Its hit chance:** 0 or 1 at random, without an accuracy roll.
- **The shell's other messages:**
  - "You swing your pick at the crab shell.";
  - "You mine an uncut opal from the crab shell.";
  - "You have already taken your share of this crab's shell.";
  - the inventory and pickaxe refusals;
  - "The crab shell has already crumbled away.".
- **The cave's message** when the crab is already at that mine: "The gemstone crab is already nearby.".

<a id="doc-tsps-upstream-docs-gemstone-crab--not-built-yet"></a>
#### Not built yet

- The HUD's green colours, since there's no packet to set a component's colour.
- The director's dialogue, and the kill count (varp 4825).
- The overkill rule ("no overkill experience loss").
- Ruby bolt specials treating it as 300 HP.
<!-- end-source-document: tsps-upstream/docs/gemstone-crab.md -->

---

<a id="doc-tsps-upstream-docs-gnome-gliders"></a>
## tsps-upstream/docs/gnome-gliders.md

<!-- source-document: tsps-upstream/docs/gnome-gliders.md -->
<a id="doc-tsps-upstream-docs-gnome-gliders--gnome-gliders"></a>
### Gnome gliders

Gnome gliders are handled by `server/plugins/world/GnomeGliders.plugin.js`. Each destination's index, map button, arrival tile and pilot is listed in `server/data/definitions/gnome-gliders.json`. `server/tests/gnome-gliders.test.cjs` replays the captured flights tick by tick.

<a id="doc-tsps-upstream-docs-gnome-gliders--destinations"></a>
#### Destinations

The indices, buttons and arrival tiles come from an rsprox capture of a flight to every destination. The requirements come from the [Wiki](https://oldschool.runescape.wiki/w/Gnome_glider).

| Index | Destination | Area | Map button (138:) | Arrival tile | Pilot | Needs |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Ta Quir Priw | Gnome Stronghold, on top of the Grand Tree | 4 | 2465, 3500, 3 | Captain Errdo | — |
| 1 | Gandius | Karamja | 16 | 2971, 2968, 0 | Captain Klemfoodle | — |
| 2 | Kar-Hewo | Al Kharid | 13 | 3284, 3210, 0 | Captain Dalbur | — |
| 3 | Lemanto Andra | Digsite | 10 | 3320, 3430, 0 | — (arrival only) | — |
| 4 | Sindarpos | White Wolf Mountain | 7 | 2850, 3498, 0 | Captain Bleemadge | — |
| 5 | Lemantolly Undri | Feldip Hills | 21 | 2549, 2972, 0 | Gnormadium Avlafrim | One Small Favour |
| 6 | Ookookolly Undri | Ape Atoll | 25 | 2711, 2802, 0 | Captain Shoracks | Monkey Madness II |

**The Grand Tree** is needed for every flight.

**Lemanto Andra is one-way.** Its glider crashes, so Captain Errdo there has only Talk-to. As captured, he says: "Ah, how embarrassing." / "What happened?" / "A bit of a technical hitch with the landing gear. I won't be able to fly you anywhere, sorry."

**The Lemanto Andra landing tile varies.** The full flight landed on 3320, 3430, and a quick glide landed on 3320, 3429. The plugin uses 3320, 3430.

<a id="doc-tsps-upstream-docs-gnome-gliders--how-the-cache-drives-it"></a>
#### How the cache drives it

- **The map draws the flight itself.** The glider map's scripts (1286, 1288 and 1290) read `pilot_journey` (varp 153) as a packed pair, `from << 14 | to`. For example, 32772 is Al Kharid (2) to White Wolf Mountain (4).
- **The map hides two buttons by itself.** Script 1288 hides Feldip Hills unless varp 416 ≥ 200, and Ape Atoll unless varbit 5027 ≥ 195. Those are the quests' own varps.
- **The pilots change with the last destination.** Each pilot is a multi-NPC switched by `pilot_previous_destination` (varbit 9584). Option 1 is "Glider"; option 4 is "Glider-to \<last destination\>", and it is missing when the last destination is the pilot's own glider.
- **The Feldip Hills and Ape Atoll pilots read another varbit:** `pilot_multinpc_var` (9567, i.e. `pilot_multinpc_visible` 9576 × 16 + `pilot_multinpc_dest` 9575). Below 16, Gnormadium Avlafrim has only Talk-to and Captain Shoracks is hidden. The capture set 9576 = 1 and 9575 = the destination when landing at either of them.

<a id="doc-tsps-upstream-docs-gnome-gliders--from-the-capture"></a>
#### From the capture

**Talking to a pilot (option 1, "Glider")** opens the glider map (138) as the main modal; a tick later, `busy` (varbit 12393) is set to 1.

**Choosing a destination**, counting from the button click (tick T):

| Tick | What the server sends |
| --- | --- |
| T | `pilot_journey` = from << 14 \| to, and a fade-out on interface 174 (script 948, colour 1512708, 20 cycles) |
| T + 1 | the teleport to the arrival tile |
| T + 3 | `pilot_previous_destination` = to, and the fade-in |
| T + 4 | `pilot_journey` = -1, `busy` = 0 and, landing at Feldip Hills or Ape Atoll, 9576 = 1 and 9575 = to; then both the fade overlay and the map close |

**The quick option (option 4, "Glider-to …")** skips choosing. On the click tick, the server sets `pilot_journey`, opens the map and starts the fade-out. A tick later come `busy` = 1 and the teleport, and the rest follows as above.

<a id="doc-tsps-upstream-docs-gnome-gliders--not-modelled"></a>
#### Not modelled

- **The Feldip Hills and Ape Atoll gliders** stay locked until One Small Favour and Monkey Madness II exist here. The quests' own varps will then show the map buttons and the pilots' Glider option.
- **The `hpbar_hud` hiding** sent with each fade in the capture is left out.
- **The message without The Grand Tree** ("You need to have completed The Grand Tree to use the gnome gliders.") is not from a capture.
- **Captain Errdo's Digsite lines** come from the capture, but Talk-to is still answered by the Wiki transcripts.
- **The Monkey Madness I military glider** is quest content.
<!-- end-source-document: tsps-upstream/docs/gnome-gliders.md -->

---

<a id="doc-tsps-upstream-docs-index"></a>
## tsps-upstream/docs/index.md

<!-- source-document: tsps-upstream/docs/index.md -->
---
layout: home
hero:
    name: XRSPS
    text: OSRS in the Browser
    tagline: Build gamemodes. Write extrascripts. Run your own server.
    image:
        src: /xrsps.png
        alt: XRSPS
    actions:
        - theme: brand
          text: Get Started
          link: /setup
        - theme: alt
          text: Discord
          link: https://discord.gg/3dzttF2q73

features:
    - icon: 🧩
      title: Gamemode System
      details: Extend VanillaGamemode to build your own server experience — custom XP rates, drop tables, tutorials, UI, and progression. Override what you need, inherit what you don't.
    - icon: 🔌
      title: Extrascripts
      details: Drop-in content modules that work on any server. Debug tools, admin commands, custom content — just export a register function and it loads automatically.
    - icon: 🛠️
      title: TypeScript End to End
      details: Client and server both written in TypeScript. Shared cache, shared types, shared networking protocol.
    - icon: 🎮
      title: Browser-Native Client
      details: Full OSRS client running in the browser with WebGL rendering. No downloads, no Java — connect and play.
---
<!-- end-source-document: tsps-upstream/docs/index.md -->

---

<a id="doc-tsps-upstream-docs-minigame-teleports"></a>
## tsps-upstream/docs/minigame-teleports.md

<!-- source-document: tsps-upstream/docs/minigame-teleports.md -->
<a id="doc-tsps-upstream-docs-minigame-teleports--minigame-and-home-teleports"></a>
### Minigame and home teleports

The Minigame Teleport spell (all four spellbooks) and the home teleports (Lumbridge, Edgeville, Lunar, Arceuus) share the long "home teleport" cast. Built from the OSRS Wiki ("Minigame Teleport", "Home Teleport") and two live OSRS captures (rsprox): a Nightmare Zone teleport, and a Rat Pits teleport followed by a second cast on cooldown.

<a id="doc-tsps-upstream-docs-minigame-teleports--what-osrs-sends"></a>
#### What OSRS sends

**Casting Minigame Teleport** (`magic_spellbook:teleport_minigame_arceuus`, 218:9 in the live game; our cache, revision 237, has the spell on 218:8 for every spellbook, so the server matches it by its cache name):

- varbit `busy` (12393) = 1;
- the minigames interface (951) opens on the main modal (`toplevel_pre_eoc:mainmodal`, 164:16).

**Choosing a minigame** (`minigames:minigame_n`, op 1) is tick 0 of the cast. The list is built by the client from the cache: enum 5924 maps list position to component (951:25 down to 951:5), enum 5923 maps list position to a row of db table 214, whose column 1 names the minigame (951:13 is Nightmare Zone, 951:11 Rat Pits). The cast, the same in both captures:

| Tick | Sent |
| --- | --- |
| 0 | `busy` = 0; animation and graphic reset; the interface closes |
| 1 | graphic 800 (`aide_chalk_circle`), animation 4847 (`aide_drawing_chalk_circle`); area sound 193, range 4 |
| 7 | animation 4850 (`aide_sitting_down_crosslegged`); area sound 196 |
| 13 | graphic 802 (`aide_player_book_get`), animation 4853 (`aide_player_getting_book`); area sound 194 |
| 17 | graphic 803 (`aide_player_book_portal`) at height -10 (65526), animation 4855 (`aide_reciting_incantation`); area sound 195 |
| 21 | `busy` = 1; graphic 804 (`aide_player_teleport`), animation 4857 (`aide_player_teleporting`) |
| 24 | `busy` = 0; the teleport; varp 888 = the current `date_minutes` (varp 3078); animation and graphic reset |
| 25 | animation reset again |

**Rat Pits** closes the list and opens the chatbox menu (interface 219, script 58) "Which rat pit would you like to visit?" with "Ardougne (kittens)", "Varrock (grown cats)", "Keldagrim (overgrown cats)", "Port Sarim (wily cats)" and "Cancel". `busy` stays 1 until the choice, which is then tick 0.

**Landing tiles in the captures:** Nightmare Zone (2609, 3121), the Ardougne rat pit (2565, 3320). The Wiki gives (2609, 3114) and (2561, 3320); the server uses the captured tiles and the Wiki's for the rest.

**On cooldown**, the cast only sends: "You must wait another 20 minutes before you can use the minigame teleports." (cast again right after landing). Varp 888 holds the minute of the last minigame teleport; varp 892 the last home teleport (RuneLite names them `LAST_MINIGAME_TELEPORT` and `LAST_HOME_TELEPORT`).

<a id="doc-tsps-upstream-docs-minigame-teleports--implementation"></a>
#### Implementation

- `server/plugins/combat/HomeTeleportSequence.js`: the cast above. Before tick 21, walking or combat interrupts it (Wiki); no teleport and no cooldown. From tick 21 the player is held until landing.
- `server/plugins/interface/MinigameTeleports.plugin.js`: the spell, the list, the enum mapping, Rat Pits' menu, requirements and the 20-minute cooldown (varp 888, saved per player).
- `server/plugins/combat/HomeTeleports.plugin.js`: the four home teleports with one shared 30-minute cooldown (varp 892); on cooldown, "You need to wait another N minutes to cast this spell." (OSRS). Destinations from the Wiki: Lumbridge (3222, 3218), Edgeville (a random tile of 3087-3090, 3501-3504), Lunar Isle (2094, 3913), Arceuus (within 2 tiles of 1700, 3882). They used to be instant teleports in the core spell tables.
- `server/plugins/world/DateMinutes.plugin.js`: varp 3078, minutes since 1970, on login and each new minute; the teleport varps are sent on login.
- `server/data/definitions/minigame-teleports.json`: destinations and requirements per minigame (Wiki). Members-only minigames, skill and combat levels and quests are checked (a quest not implemented yet doesn't block). Requirements the server doesn't track ("visited Keldagrim", "spoken to the Entrance Guardian", NMZ's five quests) are listed as notes. The refusal messages are ours; no capture shows them.
- `ArchiveTypeLoader.getCount()` now returns the highest id + 1 instead of the archive's file count: item ids have gaps, so the last ids (the Minigame Teleport spell items among them) were missed by loops over 0..count.
- `server/tests/minigame-teleports.test.cjs` checks the cast tick by tick, interrupts, the enum mapping against the cache, both cooldown messages and Rat Pits' menu.
<!-- end-source-document: tsps-upstream/docs/minigame-teleports.md -->

---

<a id="doc-tsps-upstream-docs-motherlode-mine"></a>
## tsps-upstream/docs/motherlode-mine.md

<!-- source-document: tsps-upstream/docs/motherlode-mine.md -->
<a id="doc-tsps-upstream-docs-motherlode-mine--motherlode-mine"></a>
### Motherlode Mine

Prospector Percy's mine under Falador (`server/plugins/areas/MotherlodeMine.plugin.js`, with its parts in `server/plugins/areas/motherlode/`). Behaviour is from the OSRS Wiki, and the mine's packets are from two live captures. Where neither covers something, it follows OpenRune-Server's `motherlode-mine` module (ISC licence).

The plugin lives under `areas/` so that its "Ladder" handler runs before the generic one in `objects/Ladders.plugin.js` (plugins load in path order).

<a id="doc-tsps-upstream-docs-motherlode-mine--how-it-works"></a>
#### How it works

- **Veins:** the map holds all 266 veins depleted (locs 26665-26668), and the server spawns the live veins (26661-26664) over them at startup.
  - Mining needs level 30 (not boostable) and gives 60 XP per pay-dirt. The roll for each pay-dirt is OpenRune's, made every pickaxe interval.
  - A vein's timer starts with its first pay-dirt. It depletes 38-45 ticks later (Wiki: 23-27 seconds), or 60-67 on the upper level (36-40 seconds). Everyone mining it stops.
  - It respawns 159-176 ticks later, or 94-101 upstairs.
- **The ore** is rolled when the pay-dirt is mined, not when it's cleaned (Wiki). Pay-dirt from elsewhere, such as the bank, is rolled when it's deposited.
  - Rolls go top-down: nugget, runite (85), adamantite (70), mithril (55), gold (40), else coal.
  - The rates give a nugget 1 in 32 at every level, and coal 96.9% at level 30 down to 24.6% at 99, as the Wiki's chart shows.
  - Cleaning gives the Wiki's bonus XP: coal and gold 15, mithril 30, adamantite 45, runite 75.
- **The machine:**
  - A hopper takes as much pay-dirt as the sack has room for. The sack holds 108, or 189 with the bigger sack, counting what's still being washed.
  - The pay-dirt floats down the channel and becomes ore in the sack 12 ticks after the deposit.
  - The upper hopper is fenced in by railings, so it's used across them from the walkway in front, (3755, 5676). An object route hook sends the player there instead of to a side of the hopper.
  - It only moves while at least one water wheel turns: "any pay-dirt that was making its way to the sack will stop in place" (Wiki).
- **The struts:**
  - A broken strut is repaired with a hammer. Each tick there's a 12% chance of a repair at Smithing 1, up to 27% at 99, for 1.5 Smithing XP per level (Wiki).
  - Percy calls out his transcript's overhead lines when a wheel, or both, breaks.
- **The sack** gives the nuggets first, then each ore into the free inventory slots. Varbit 5558 is its count, which the HUD and the sack loc (26688, empty or full) both read.
- **Rockfalls** (26679/26680) are mined away for 10 XP (Wiki). They come back down later and hit whoever stands on the tile for 1-4 (Wiki), moving them off it.
- **Prospector Percy's unlocks** run through his Wiki transcript. The plugin answers its "If the player..." conditions (`api.onNpcDialogueCondition`) and makes each purchase on its "You pay Percy N nuggets." step:
  - the upper level, 100 nuggets and 57 Mining;
  - the bigger sack, 200 nuggets;
  - the upper hopper, 50 nuggets.

  The Wiki's transcript has no lines for two branches, so `npc-dialogues.json` fills them from Percy's own lines:
  - **Buying the bigger sack:** "You pay Percy 200 nuggets.", then back to the question, like his other purchases.
  - **When only the bigger sack is bought:** "Let me have a think...", his lines for the two upgrades left, then the same menu.
- **The upper level** is a bridge on the same plane. Varbit 2086 says which level the player is on, and the ladders (19044 at the foot, 19045 at the top) are multilocs on it.
  - The map stores the bridge's locs a plane up. The server sends their changes on plane 0 (as captured), and the client's `SceneBuilder` maps them onto the bridge, so its veins and rockfalls change in place.
- **The nugget shop** stock and prices are the Wiki's: the prospector outfit, coal bag, gem bag, soft clay pack and bag full of gems.

<a id="doc-tsps-upstream-docs-motherlode-mine--ways-in-and-out"></a>
#### Ways in and out

| Loc | Where | Goes to |
| --- | --- | --- |
| Cave 26654 "Enter" | Dwarven Mine (3059, 9764) | **(3728, 5692)** |
| Tunnel 26655 "Exit" | (3728, 5693) | (3060, 9766) |
| Cave 30374 "Enter" | Mining Guild (3055, 9743) | (3718, 5678) |
| Tunnel 30375 "Exit" | (3717, 5678) | Mining Guild (3054, 9744), needs 60 Mining |
| Ladder 19044 / 19045 | (3755, 5673) / (3755, 5674) | (3755, 5675) up / (3755, 5672) down |
| Dark tunnels 10047 | (3760, 5670) ↔ (3764, 5671), (3744, 5642) ↔ (3745, 5645) | the other end, needs 54 Agility |

Bold is captured; the rest are OpenRune's.

<a id="doc-tsps-upstream-docs-motherlode-mine--from-the-captures"></a>
#### From the captures

<a id="doc-tsps-upstream-docs-motherlode-mine--going-in-mining-depositing-and-collecting"></a>
##### Going in, mining, depositing and collecting

- **The cave:** the crawl animation 2796 and sound 2454 (2 loops, delay 4), then the move the next tick. The tick after that, the HUD (interface 382) opens in the toplevel's `overlay_hud` (164:8).
- **A vein:**
  - Mining plays the pickaxe's wall animation (6758 with a dragon pickaxe) and starts with "You swing your pick at the rock.".
  - Each pay-dirt gives "You manage to mine some pay-dirt." and sound 3600.
  - A vein depleted 43 ticks after its first pay-dirt. It was sent as the depleted loc being added, with sound 2661 (delay 10, range 1).
  - The respawn timers sent were 159-176 ticks below and 94-101 above (one outlier, 69, on a "left" vein).
- **The hopper:**
  - Deposit plays animation 832 and sound 2496.
  - A pay-dirt NPC (6564) appears at (3748, 5671) the next tick and moves one tile south each tick.
  - 12 ticks after the deposit, varbit 5558 rose by the deposit, with "Some ore is ready to be collected from the sack." and sound 2739 (delay 30).
- **The sack:**
  - Search took the 7 nuggets, then 26 ores into the free slots.
  - Varbit 5558 was updated twice (172 → 165 → 139).
  - Interface 193 (objectbox) showed pay-dirt with "You collect your ore from the sack." even though ore was left. It is built by script 2868, with the item at zoom 400. This is the new core `ItemStatementDialogue`.
- **A rockfall:** it was gone 2 ticks after the swing. It came down again 78 ticks later as two falling rocks (projectile 645, from heights 1000 and 900, landing after 30 cycles), a splash (spotanim 305) and sound 360.
- **The channel:** water overlays (10459) and small foams (2018) are spawned by the server. The foams are re-sent every 3 ticks.

<a id="doc-tsps-upstream-docs-motherlode-mine--a-strut-breaking-and-being-repaired"></a>
##### A strut breaking and being repaired

- **Breaking:** the strut becomes 26670 (shape 10, rotation 0) and the wheel 26672 (rotation 2), the same as the map's locs. The waterfall foam beside it (2016) is removed.
- **Repairing:**
  - The hammer animation 3971 and sound 1786 (delay 10) play every 4 ticks.
  - The strut was fixed 6 ticks after the first swing.
  - The fixed strut 26669 (rotation 0), the wheel 26671 (rotation 0) and the foam 2016 (rotation 1) were sent, with Smithing XP.
- **Where:** the northern strut is at (3742, 5669), its wheel at (3743, 5668) and its foam at (3743, 5671). The southern strut's foam is at (3743, 5665).

<a id="doc-tsps-upstream-docs-motherlode-mine--guessed-rather-than-captured"></a>
#### Guessed rather than captured

- **How often a strut breaks:** 2-4 rounds of 97 ticks after its repair (OpenRune).
- **The pay-dirt roll** (OpenRune's 60/256 at level 1 to 105/256 at 99, every pickaxe interval) and the rockfall's respawn (78-100 ticks).
- **The channel when both wheels are broken:** the water's locs are left as they are.
- **The messages for:**
  - no pickaxe or level;
  - a full inventory or sack;
  - "You already have enough pay-dirt to fill the sack.";
  - depositing with no room;
  - an empty sack, or one still washing;
  - the ladder without access;
  - the hammer;
  - the Mining Guild.

  These are OpenRune's, or this plugin's own.
- **Getting out** through the tunnels, the Mining Guild cave, the ladder and the shortcuts: their tiles and timings are OpenRune's.

<a id="doc-tsps-upstream-docs-motherlode-mine--not-built-yet"></a>
#### Not built yet

- The rockfall's splash (spotanim 305): there's no packet for a graphic on a tile.
- The respawn timers drawn over depleted veins (client script 5474, `add_overlaytimer_loc`).
- The medium Falador diary that the eastern dark tunnel needs, since there are no achievement diaries yet.
- The coal bag, gem bag and the prospector outfit's XP bonus.
- Mercy's other dialogue, and the Falador elite diary's better ore chances.
<!-- end-source-document: tsps-upstream/docs/motherlode-mine.md -->

---

<a id="doc-tsps-upstream-docs-picking"></a>
## tsps-upstream/docs/picking.md

<!-- source-document: tsps-upstream/docs/picking.md -->
<a id="doc-tsps-upstream-docs-picking--picking-crops-and-plants"></a>
### Picking crops and plants

Wheat, potatoes, onions, cabbages, sweetcorn, flax and nettles are picked through `server/plugins/objects/Pickable.plugin.js`. What each gives and how it depletes is in `server/data/definitions/pickables.json`.

<a id="doc-tsps-upstream-docs-picking--from-rsprox-captures"></a>
#### From rsprox captures

Picking potatoes (Lumbridge) and wheat (Varrock):

| Tick | What the server sends |
| --- | --- |
| The tick the player is beside the plant | animation 827 (`human_pickupfloor`) |
| One tick later | the message ("You pick a potato.", "You pick some grain."), the item, sound 2581, and `loc_del` of the plant for everyone |
| Potato: 50 ticks after the pick started; wheat: 20 | `loc_add_change`, the plant is back |

- **Every pick removed the plant:** both potatoes and wheat.
- **The messages are spam-type:** they can be filtered out. Here they are ordinary game messages.

<a id="doc-tsps-upstream-docs-picking--from-the-wiki"></a>
#### From the Wiki

| Plant | Item | Depletes | Respawn |
| --- | --- | --- | --- |
| Wheat | Grain | always (capture) | 20 ticks (capture) |
| Potato | Potato | always | 50 ticks |
| Onion | Onion | always | 50 ticks |
| Cabbage | Cabbage | always | 40 to 80 ticks, depending on world population |
| Sweetcorn | Sweetcorn | always, turning into its empty version (51829 → 51831, 51830 → 51832) | estimated at 20 ticks (the Wiki says "a short amount of time") |
| Flax | Flax | 3 in 16 picks | 10 ticks (Mod Ash) |
| Nettles | Nettles | not documented, so never | — |

**Nettles need gloves.** Any gloves work except beekeeper's gloves; the Wiki lists the gloves that work, and any worn gloves is an approximation of that list. Without gloves, the player gets no nettles and takes up to 2 damage.

<a id="doc-tsps-upstream-docs-picking--unverified"></a>
#### Unverified

These are worth checking against captures:
- **Messages:** "You pick an onion.", "You pick a cabbage.", "You pick some sweetcorn.", "You pick some flax.", "You pick the nettles." and "You have been stung by the nettles!".
- **Sweetcorn:** its respawn time, and its rare sweetcorn seed (not modelled).

<a id="doc-tsps-upstream-docs-picking--not-covered"></a>
#### Not covered

Other scenery with a Pick option is mostly quest or area content: grapevines, kelp, glowing fungus, rare flowers, black mushrooms, a Farming pineapple plant, and berry bushes ("Pick-from"). These belong to their quests or areas. Banana trees have their own plugin, and "Pick-lock" belongs to Thieving.
<!-- end-source-document: tsps-upstream/docs/picking.md -->

---

<a id="doc-tsps-upstream-docs-player-saves"></a>
## tsps-upstream/docs/player-saves.md

<!-- source-document: tsps-upstream/docs/player-saves.md -->
<a id="doc-tsps-upstream-docs-player-saves--player-saves"></a>
### Player saves

How and when players are saved, the save history, and rolling players back.

<a id="doc-tsps-upstream-docs-player-saves--when-a-player-is-saved"></a>
#### When a player is saved

Every save records why it happened (`PlayerPersistence.save(player, reason)`):

| Reason | When |
| --- | --- |
| `autosave` | Every 15 minutes while online (below) |
| `logout` | Logging out (`Player.onLogout`) |
| `shutdown` | A graceful stop or restart: SIGINT (Ctrl+C), SIGTERM, SIGHUP (closing the terminal), SIGUSR2 (nodemon), `::gameUpdate` |
| `tick-error` | Everyone, after a game tick throws |
| `trade` | Both players, after a completed trade |
| `grand-exchange` | A Grand Exchange offer changing |
| `doom`, `colosseum`, `gauntlet` | Starting (and for the Gauntlet, ending) a run, so the fee and items are on disk |
| `saveall`, `save` | `::saveall`, `::save` and other plugin saves |

A hard kill (`kill -9`, a power cut, `wsl --shutdown`) saves nothing; the autosave limits what it loses.

A shutdown save stores players where they stand, without the logout steps, so nobody leaves their area or instance. Content inside an instance must put a player right at their next login.

<a id="doc-tsps-upstream-docs-player-saves--the-writer-thread"></a>
#### The writer thread

The SQLite backend writes on its own thread (`plugins/persistence/SqliteSaveWorker.js`), so the game tick never waits on the disk. A WAL checkpoint's disk flush can take milliseconds on fast disks and much longer on a slow VPS, and it lands in whichever commit triggers it.

- **On the tick,** `save()` only builds the save as compact JSON (about 0.05 ms) and posts it to the writer.
- **On the writer thread:** validation, the hash, gzip, the transaction with the history copy, and pruning. It has the only connection that writes. Rollbacks go through it too, so the game thread never waits for a lock.
- **Saves not yet written** are kept on the game thread; `load()` and `exists()` read them first, so a quick re-login can't load an older save.
- **`flush()`** waits for the writer; shutdown awaits it. It reports a save the writer refused (failed validation) until that player's next save succeeds; the refused save writes nothing, so their previous save stays.
- **If the writer dies,** a new one is started and gets every unanswered save again. If it dies three times in a row before it's ready, saves are written on the game thread instead, as before this change.
- **A hard kill** loses only what's still queued for the writer: a few milliseconds of saves.
- **Saves are stored without indentation** (loading doesn't care), about half the size.

<a id="doc-tsps-upstream-docs-player-saves--the-autosave"></a>
#### The autosave

`plugins/persistence/Autosave.plugin.js` saves each online player every 15 minutes (1500 ticks). OSRS does the same: a crashed world puts players back to their save from up to 15 minutes before ([Server crash glitch](https://oldschool.runescape.wiki/w/Server_crash_glitch)).

- **Staggered:** a player's first autosave falls somewhere in their first 15 minutes, spread by their name, so a mass login after a restart doesn't save everyone on one tick.
- **A budget:** at most 10 autosaves a tick; the rest follow on the next ticks.
- **Bots** are autosaved too, except those marked `bot-skip-persistence` (which no save writes).
- **For testing,** `AUTOSAVE_INTERVAL_TICKS=20 yarn start` shortens the interval.

<a id="doc-tsps-upstream-docs-player-saves--the-save-history"></a>
#### The save history

The SQLite backend (`plugins/persistence/SqlitePlayerPersistence.plugin.js`, the default) also keeps a copy of each save in `player_save_history`, in `data/saves/players.sqlite`:

| Column | |
| --- | --- |
| `username` | As in `player_saves` |
| `saved_at` | ISO time (UTC) |
| `reason` | The save's reason, or `pre-rollback` / `rollback` |
| `save_hash` | SHA-1 of the save JSON |
| `save_gz` | The save JSON, gzipped (about 1.5 KB against 5–6 KB) |

- **Not every save adds a copy:** a save identical to the player's newest copy adds none, and bots' saves add none.
- **Retention**, thinned after each new copy (`SqliteSaveHistory.js`):
  - every copy from the last 24 hours;
  - from 24 hours to 7 days, the newest of each hour;
  - from 7 to 30 days, the newest of each day;
  - nothing older.
- **The JSON and browser (IndexedDB) backends** keep no history; the commands say so.

<a id="doc-tsps-upstream-docs-player-saves--rolling-a-player-back"></a>
#### Rolling a player back

Owner commands (`plugins/commands/SaveHistory.plugin.js`):

- **`::snapshots <name>`:** their 15 newest copies: `#42  2026-10-07 13:05:12 UTC  autosave`.
- **`::rollback <name> <#id | 30m | 2h | 1d>`:** puts back that copy, or the newest one at least that old.

What a rollback does:
- **Offline player:** their current save goes in the history as `pre-rollback`, then the copy is written (and recorded as `rollback`).
- **Online player:** they're logged out. Their own state goes in the history as `pre-rollback`, and their logout save writes the copy instead. Until they log back in, every save of theirs writes the copy, so a save in between can't undo it.
- **Undoing a rollback:** roll back to the `pre-rollback` copy.

<a id="doc-tsps-upstream-docs-player-saves--rolling-everyone-back"></a>
#### Rolling everyone back

`yarn saves:rollback` (`scripts/rollback-saves.mjs`), with the server stopped:

```sh
yarn saves:rollback --before 2026-10-07T12:00:00Z            # a dry run: who would change
yarn saves:rollback --before 2026-10-07T12:00:00Z --apply    # do it
yarn saves:rollback --before ... --player "Some name"        # one player
```

- **Each player** gets their newest copy at or before the time. Players without one are left alone and listed.
- **`--apply`** first copies the database to `data/saves/players-before-rollback-<time>.sqlite`, then restores everyone in one transaction, each current save recorded as `pre-rollback`.
- **It refuses to run under a running server:** the SQLite backend writes `players.sqlite.pid` while it has the database open, and the script checks that process. A file left by a crash is ignored.
- **`--database <path>`** (or `PLAYER_SAVE_DATABASE_PATH`) points it at another database.

<a id="doc-tsps-upstream-docs-player-saves--what-a-rollback-doesnt-cover"></a>
#### What a rollback doesn't cover

- **World files:** `doom-scoreboard.json`, `gauntlet-scoreboard.json`, the ban and mute lists.
- **The other side of a trade:** rolling back one player of a trade leaves the other as they are, so items can be duplicated or lost. A whole-server rollback to one time doesn't have this problem.

<a id="doc-tsps-upstream-docs-player-saves--testing"></a>
#### Testing

`tests/player-saves.test.cjs`: copies and their reasons, identical saves and bots, retention, offline and online restores, the commands, the autosave's interval, staggering and budget, the script (dry run, refusal under a running server, `--apply`), and the writer thread (a re-login before a write lands, a refused save, a writer that dies).
<!-- end-source-document: tsps-upstream/docs/player-saves.md -->

---

<a id="doc-tsps-upstream-docs-revenant-caves"></a>
## tsps-upstream/docs/revenant-caves.md

<!-- source-document: tsps-upstream/docs/revenant-caves.md -->
<a id="doc-tsps-upstream-docs-revenant-caves--revenant-caves"></a>
### Revenant Caves

`server/plugins/areas/RevenantCaves.plugin.js` handles the ways in and out of the Revenant Caves (the Forinthry Dungeon): the three entrances with the entry fee, the two exits, and the Revenant cave teleport scroll. It is built from live OSRS captures (rsprox):

- scroll teleports, entrances, exits and the Revenant maledictus;
- the scroll's Config option and every entrance;
- paying the fee;
- dying to a revenant;
- dying to another player in the caves.

The OSRS Wiki ("Revenant Caves", "Cavern (Revenant Caves)", "Crevice (Revenant Caves)", "Stairs (Revenant Caves)", "Revenant cave teleport") covers the rules. Every object, item, interface and varbit below is checked against this cache, and every object sits at its tile in the cache's map (`server/tests/revenant-caves.test.cjs`).

<a id="doc-tsps-upstream-docs-revenant-caves--entrances-and-exits"></a>
#### Entrances and exits

| Link | Object | At | Lands at |
|---|---|---|---|
| Level 17 entrance | 31555 Cavern, Enter | 3073, 3654 | 3197, 10056 |
| Level 26 entrance | 40386 Crevice, Jump-Down | 3067, 3740 | 3187, 10127 |
| Level 40 entrance | 31556 Cavern, Enter | 3124, 3831 | 3241, 10233 |
| Southern exit | 31558 Stairs, Climb-up | 3218, 10058 | 3102, 3655 (beside the trapdoor, 3103, 3655) |
| Northern exit | 43868 Stairs, Climb-up | 3244, 10215 | 3124, 3806 (beside the trapdoor, 3122, 3805) |

All entrances are one-way. The trapdoors (31557) have no options.

- **Entering, fee already paid:** on arrival the player faces the entrance and gets "You've already paid the Revenant Entry Fee.". A tick later comes the teleport, with "You enter the cave and scramble over the rubble." (the crevice: "You jump down into the cavern.").
- **Inside the caves:** varbit 5961 (`singleway_plus_indicator`) is 1, and 0 again on leaving.
- **Exits:** on arrival the player faces the stairs. A tick later: "You climb the stairs and exit the cave." and the teleport. There's no animation.
- **The crevice warning,** the first time:
  - `toplevel_mainmodal_open` (2524) `[-1, -1]` and interface 720 open ("Be careful! It doesn't look like there is a way back up…").
  - 720:17 "Let me jump, and don't warn me again!" sets varbit 6506 (`wilderness_cave_mid_warning`) = 1, and the jump follows on the same tick.
  - 720:18 "I don't want to jump down anymore." closes it.

<a id="doc-tsps-upstream-docs-revenant-caves--the-entry-fee"></a>
#### The entry fee
- **The prompt:** an item box (interface 193, the coins icon 1004) with "You need to pay a 100,000 coins fee to enter the<br>Revenant Cave.<br>This can be taken from your inventory, bank or both.". Then a chat menu "Pay 100,000 coins Entry Fee?" with "Yes." / "Yes, don't ask again." / "No.".
- **Paying from the bank:** "The entry fee was taken from your bank.", and the player enters on the same tick.
- **"Don't ask again":** no varbit changes, so it's kept server-side. Later entries pay without asking.
- **Losing the fee** (Wiki): a death inside the caves (to anything), or to another player anywhere in the Wilderness.
  - A PvP death in the caves sends "You died to another player in the Revenant Cave, you've lost your entry fee." before "Oh dear, you are dead!".
  - The killer gets the 100,000 coins as loot (Wiki; the capture is from the victim's side).
  - A death to a revenant sends no message.
- **Leaving by the stairs keeps the fee** (Wiki).

<a id="doc-tsps-upstream-docs-revenant-caves--revenant-cave-teleport-21802"></a>
#### Revenant cave teleport (21802)
- **"Config"** (op 6): a chat menu "Select a teleport location" with "Northern entrance." / "Middle entrance." / "Southern entrance.". The choice goes to varbit 20096 (`rev_cave_tele_location`: 0, 1, 2), then an item box (the scroll) shows "Revenant cave teleports will now teleport you to the<br>northern entrance." (or middle, or southern).
- **"Teleport"** (op 4): the sub-options pick an entrance; a left-click uses the Config choice.
  - The chat menu reads "Teleport to deep Wilderness?" (north and middle) or "Teleport to the Wilderness?" (south), with "Yes, teleport me now." / "No, I want to stay here.". `busy` is 1 meanwhile.
  - On "Yes": animation 3864, map graphic 1039 on the player's tile, area sound 200, and one scroll used. Three ticks later the player arrives and `busy` clears.
  - Landing tiles: north 3128, 3832; middle 3074, 3739; south 3080, 3655.
- **Above Wilderness level 20:** the question still shows, and "Yes" gives "A mysterious force blocks your teleport spell!" + "You can't use this teleport after level 20 wilderness.".

<a id="doc-tsps-upstream-docs-revenant-caves--implementation-notes"></a>
#### Implementation notes
- **PvP zone:** the caves are a `pvp` zone in `world.json` (x 3136–3271, y 10036–10249). Before this, no underground Wilderness was PvP here. Levels come from `Wilderness.levelAt`.
- **Fee payment:** coins come from the inventory first, then the bank.
- **The scroll's fifth option:** "Config" is the scroll's fifth inventory option, the slot most items use for Drop or Destroy. The server used to drop on any fifth-option click; now the option's name decides (`ItemActionPacketListener.isDropOption`). "Discard" and "Release" still drop, as before.
- **Saved per player:** the fee, "don't ask again", the scroll's Config choice and the crevice warning. The varbits are sent again on login.
- **Not captured, so the wording is ours:**
  - "No." (it just closes);
  - the messages when the inventory pays ("The entry fee was taken from your inventory.") or both pay ("…from your inventory and bank.");
  - the message when the player can't afford it ("You don't have enough coins to pay the entry fee.");
  - the crevice warning's "Don't ask me this again" toggle (720:20), which toggles varbit 6506.
- **Spam filter:** the enter and exit messages are spam-filter messages in OSRS. The server has no filtered message type yet, so they go out as game messages.
- **Follow-ups:**
  - singles-plus combat (the caves act as singles);
  - revenant combat and drops, the Revenant maledictus, and the Bracelet of ethereum (captured: melee when adjacent, Magic projectile 1415, the self-heal graphic 1221, the Maledictus' area attacks);
  - the 2-tick teleport delay in combat;
  - the Wilderness Slayer Cave, which isn't PvP yet either.
<!-- end-source-document: tsps-upstream/docs/revenant-caves.md -->

---

<a id="doc-tsps-upstream-docs-revenants"></a>
## tsps-upstream/docs/revenants.md

<!-- source-document: tsps-upstream/docs/revenants.md -->
<a id="doc-tsps-upstream-docs-revenants--revenants"></a>
### Revenants

`server/plugins/npcs/Revenants.plugin.js`, with its parts in `server/plugins/npcs/revenants/`, covers the revenants' combat (`Combat.Revenants.js`), their shared drop table (`Drops.Revenants.js`, dropped by `Loot.Revenants.js`), the bracelet of ethereum (`Bracelet.Revenants.js`), the amulet of avarice and the Revenant maledictus. The caves (entrances, fee, exits, scroll) are in [Revenant Caves](#doc-tsps-upstream-docs-revenant-caves).

**Sources:**
- **OSRS captures** (rsprox): fights with a revenant hellhound, pyrefiend and dragon, deaths in the caves, and the bracelet's charging, check and toggle;
- **the OSRS Wiki:** "Revenants", "Revenants/Strategies" (Mod Ash on healing), "Bracelet of ethereum", and the "Revenants/Drops" template (rates "provided by Jagex");
- **this cache:** each revenant's animation list, labelled with the sequence names rsprox prints.

<a id="doc-tsps-upstream-docs-revenants--combat"></a>
#### Combat

| | Captured | Ours |
|---|---|---|
| Style | Adjacent hellhound and pyrefiend: melee and Magic; Ranged (projectile 206) at a distant player | Adjacent: melee, or Magic against Protect from Melee. At range: Magic, or Ranged against Protect from Magic (Wiki: Magic by default, reacting to protection prayers) |
| Magic | Projectile 1415 (delay 51, heights 172 → 124), area sound 162; impact graphic 1454 (delay 56, height 124) with sound 163, or splash 85 with sound 227 | The same; also hits up to 9 other players on the target's tile (Wiki) |
| Ranged | Projectile 206 (heights 80 → 124, progress 32, from cycle 35) | The same |
| Heal | Graphic 1221, reset animation, sound 3887 | +20 HP instead of attacking when below half HP with the heal ready; 15-tick cooldown; 8–25 heals per spawn (Mod Ash) |
| Animations | Hellhound 6579 / 6578 / 6558 (death sound 3718); pyrefiend 1582, cast 7820, 1581 / 1580 (death sound 697); dragon 80 for Magic | The others from their cache lists: imp 169/170/172, goblin 6184/6183/6182, hobgoblin 164/165/167, cyclops 4652/4651/4653, demon 64 (cast 69)/65/67, ork 4320 (ranged 6972, magic 6982)/4322/4321, dark beast 2731/2732/2733, knight 390 (ranged 6600, magic 1978)/388/836 |

- **Freeze (unverified, Near-Reality's numbers):** the Wiki says the Magic attack can freeze, but no capture shows one. Each accurate Magic hit has a 1-in-9 chance of a 7-tick freeze with Ice Barrage's impact graphic. The player then can't be frozen by a revenant for 20 seconds.
- **Attack sounds:** only the captured ones play (hellhound 3717, pyrefiend 696).
- **Ranged animation:** a revenant without a ranged animation in its cache list uses its attack animation for Ranged; no capture shows its own.
- **Hit delays:** melee lands on the attack tick; Magic and Ranged use the player formulas for their distance (Magic `1 + ⌊(1 + d) / 3⌋`, Ranged `1 + ⌊(3 + d) / 6⌋`).

<a id="doc-tsps-upstream-docs-revenants--bracelet-of-ethereum"></a>
#### Bracelet of ethereum
- **Charging:** use revenant ether on it, up to 16,000. Charging and "Check" send "The bracelet has 100 (<col=007f00>0.6%</col>) charges, it will not absorb ether from defeated revenants." (captured).
- **Toggle-absorption:** "Your bracelet will now automatically absorb ether from defeated revenants." / "…will no longer…" (captured). It's saved per player. With it on, a defeated revenant's ether goes into the worn bracelet; otherwise it drops.
- **While worn charged:**
  - each revenant attack keeps 25% of its damage and costs a charge (Wiki: −75%; the rounding down is ours);
  - revenants don't start fights with the wearer (tolerant), but fight back.
- **Uncharge** returns the ether. **Dismantle** (uncharged) gives 250 ether (Wiki).
- **Death:** the bracelet is never kept. A charged one drops uncharged with its ether beside it (Wiki), for the killer if there is one.
- **Our wording:** "Your bracelet of ethereum has run out of charges.", the uncharge and dismantle messages, the full-bracelet message, and "it will absorb" in the check message.

<a id="doc-tsps-upstream-docs-revenants--drops"></a>
#### Drops
- **The formula:** with `A = ⌊2200 / ⌊√combat⌋⌋` and `B = 15 + ⌊(combat + 60)² / 200⌋`, a roll of 0 to A−1 gives:
  - **0:** the ancient artefact table (40 weights, or 22 when skulled, which removes the dragon med helm and cuts the emblem);
  - **below min(A, B):** the main table (198 weights);
  - **otherwise:** coins (1 to `1 + 25⌊√combat⌋`).
- **Separate rolls:**
  - **unique table:** `1/(A × 26.667)`; skulled `/0.55`; on a Slayer task `×5` (via `slayer:on-task`). Avarice 2/5, each weapon 1/5.
  - **blighted secondary:** `100/(250 − combat)`;
  - **looting bag**, and the imp, goblin and hobgoblin champion scrolls (1/5000).
- **Ether:** always, 2 to `(⌊√combat⌋ + 1) × 2`, in even amounts.
- **Placement:** drops land under the revenant for the killer. An amulet of avarice notes everything that can be noted.
- **Not included:**
  - the Wilderness Slayer tertiaries (keys, totems);
  - the Ironman "most damage" rule.

<a id="doc-tsps-upstream-docs-revenants--revenant-maledictus"></a>
#### Revenant maledictus

`Maledictus.Revenants.js`, from a captured fight (spawn to loot) and the Wiki.

**Spawning:**
- Each revenant killed in the caves adds its combat level to a world total. The boss spawns when a roll out of the "flat spawn rate" lands under that total (Wiki). The rate isn't published, so **10,000 is ours** (Near-Reality uses the same).
- After a spawn the total resets, and none appears for 45 minutes (Wiki). It despawns after 10 minutes if still alive.
- **Where:** one of the Wiki's 11 chambers. The tiles are Near-Reality's, checked walkable; the captured spawn (3213, 10098) is 4 tiles from the southern ork tile.
- **Announcement:** players in the caves get "<col=ef1020>A superior revenant has been awoken in the {north/middle/south} of the caves.." (captured). Within 64 tiles a hint arrow points at it, at its tile from afar and at the boss once in view (captured, refreshed every 2 ticks).
- **Testing:** `::maledictus` (developer) spawns it at your tile.

**Combat:**
- **Multi-combat:** it's multi-combat inside the singles caves (Wiki). The core now lets an NPC be marked multi-combat (`NPC.setMultiCombat`, `CombatFactory.multiCombatBetween`). Attack speed is 5 (captured), and it attacks every player within 15 tiles.

| Attack | Captured | Ours |
|---|---|---|
| Standard (Ranged) | Animation 9282, area sound 488, projectile 2033 (cycles 30 → 90, heights 400 → 50, angle 10, progress 32) at every player, graphic 474 (delay 90, height 16); the hit 3 ticks later | The same; max hit 30 (monster data) |
| Ice | Animation 9278, area sound 487; graphic 382 on each player's tile with sound 177; 3 ticks later "You have been frozen in place by the Revenant Maledictus' attack!", graphic 2035 and sound 168 | The same, for players still on their tile, with a Magic hit. **The freeze lasting 10 ticks is ours.** |
| Air surge | Animation 9277 (delay 30), area sound 483 (delay 58), projectile 1456 to one player's tile (cycles 58 → 150); 5 ticks later graphic 134 at the centre, 2034 on the 4 diagonals (delay 15) and 12 edge tiles (delay 30), sound 223 at 0/15/30 | The same. Damage up to 25 (Wiki), **25/17/9 by distance from the centre is ours**, typeless |
| Blood | Not captured | Animation 9279 (the cache's `npc_revenant_superior_attack_heal`), graphic 382 on each tile (**ours**, as for Ice); 3 ticks later a Magic hit on players still there, healing it by half (Wiki) |

- **Rotation:** the capture shows Ice, 3 standard, surge, 2 standard, Ice, 3 standard, surge. Ours: 2–3 standard attacks between specials, never the same special twice running (Wiki: it "cycles through" them).

**Loot** (Wiki; the announcements are captured):
- **Top damage dealer:** an Ancient emblem or totem (**50/50 is ours**), plus two rolls on the revenant dragon's table (without its ether).
- **Everyone else who hurt it:** a Blighted super restore(4) and 2 of one blighted food, under them.
- **Announcements:** every participant sees each drop: "<col=005f00>{name} received a drop: {2 x }{item}</col> <col=106f10>(Revenant maledictus)</col>".

**Amulet of avarice and Forinthry surge** (`Avarice.Revenants.js`, Wiki):
- **Amulet:** +20% accuracy and damage against revenants in the caves, and the wearer stays skulled.
- **Forinthry surge:** the top damage dealer, if wearing the amulet, gets 15% more for 30 minutes. Applied one after the other (**ours**; the Wiki doesn't say how they combine).
- **Our wording:** "You are empowered by the Forinthry surge."
- **Missing:** the surge's own skull icon.

<a id="doc-tsps-upstream-docs-revenants--spawns"></a>
#### Spawns
- **Revenants:** the 30 spawn tiles from each revenant's Wiki location map, replacing the 15 the server had. Per type: 4 imps, demons, pyrefiends and orks; 2 of each other type. The Revenants/Strategies counts per area add up to the same 30. Every revenant seen in the captures was within 8 tiles of one of these tiles.
- **Ghosts:** five uninteractable ghosts (NPC 10474, no name or options), at the middle of where each was seen wandering in the captures. Their wander radius matches the observed spread (3–12 tiles). The Wiki only says "numerous ghosts", so these positions and the count are approximate.

<a id="doc-tsps-upstream-docs-revenants--follow-ups"></a>
#### Follow-ups
- singles-plus combat;
- the Forinthry surge skull icon, and passing the surge on by killing a surged player;
- the revenant weapons' ether charges;
- the drop delay: OSRS shows the loot 5 ticks after the death animation, and our NPC death task uses 2.
<!-- end-source-document: tsps-upstream/docs/revenants.md -->

---

<a id="doc-tsps-upstream-docs-run-auto-enable"></a>
## tsps-upstream/docs/run-auto-enable.md

<!-- source-document: tsps-upstream/docs/run-auto-enable.md -->
<a id="doc-tsps-upstream-docs-run-auto-enable--energy-threshold-to-re-enable-running"></a>
### Energy threshold to re-enable running

Settings → Controls → "Energy threshold to re-enable running" (setting 389) is handled by `server/plugins/interface/RunAutoEnable.plugin.js`. Its tooltip (cache struct 1013): "After your run energy has naturally depleted, you will automatically start running again once you have this much energy. Set to 0 to stop auto-enabling." At 0 the setting reads "Do not enable".

<a id="doc-tsps-upstream-docs-run-auto-enable--from-an-rsprox-capture"></a>
#### From an rsprox capture

**Changing the setting:**
1. Clicking the row (134:20) sets `floater_chatbox_opened` (varbit 16075) = 1 and `busy` = 1, then asks "Set energy threshold for auto-enabling run mode:" (script 108, a number prompt).
2. On the answer (`resume_p_countdialog`), `runenergy_autoenable` (varbit 11031) is set to the number, which is the energy percentage. Then 16075 and `busy` go back to 0.
3. Answering 0 turns it off. The server's amount handler drops 0 unless the prompt accepts it (`acceptsZero`).

**The auto-enable:**
- Running out of energy switched run off (`option_run`, varp 173: 1 → 0), and the player walked on.
- 22 ticks later, with the threshold at 5%, run switched back on (`option_run` 0 → 1) while still walking.
- There was no message, and the walk simply carried on as a run, so movement isn't interrupted.

<a id="doc-tsps-upstream-docs-run-auto-enable--rules"></a>
#### Rules

- **Only run that ran out counts:** the player was running last tick and isn't now, at 1% energy or less. On the tick run runs out, the same tick's recovery has often already added 1%: once the player stops running, energy starts coming back straight away.
- **Turning run off by hand is never overridden.** Turning it on by hand clears the wait.
- **The threshold is saved** and sent on login.

Other plugins can own a setting the same way. Settings emits `settings:setting-clicked` `{ player, settingId, handled }` for every row clicked.
<!-- end-source-document: tsps-upstream/docs/run-auto-enable.md -->

---

<a id="doc-tsps-upstream-docs-runelite-api-coverage"></a>
## tsps-upstream/docs/runelite-api-coverage.md

<!-- source-document: tsps-upstream/docs/runelite-api-coverage.md -->
<a id="doc-tsps-upstream-docs-runelite-api-coverage--runelite-api-coverage"></a>
### RuneLite API coverage

Generated by `scripts/runelite-api-coverage.ts` against `../runelite`.
The `Client` facade and the actor/overlay/menu APIs are phase 2+ work
(plan §4.4-4.9), so the portable-now count stays at zero until those land.

<a id="doc-tsps-upstream-docs-runelite-api-coverage--summary"></a>
#### Summary

- Events: 9/82 implemented
- Plugins analysed: 130
- Plugins portable now: 0

<a id="doc-tsps-upstream-docs-runelite-api-coverage--events"></a>
#### Events

Implemented: BeforeRender, ClientTick, CommandExecuted, ConfigChanged, FocusChanged, GameStateChanged, GameTick, PluginChanged, PostClientTick

Missing: AccountHashChanged, ActorDeath, AmbientSoundEffectCreated, AnimationChanged, AreaSoundEffectPlayed, BeforeMenuRender, CanvasSizeChanged, ChatMessage, ClanChannelChanged, ClanMemberJoined, ClanMemberLeft, DecorativeObjectDespawned, DecorativeObjectSpawned, FakeXpDrop, FriendsChatChanged, FriendsChatMemberJoined, FriendsChatMemberLeft, GameObjectDespawned, GameObjectSpawned, GrandExchangeOfferChanged, GrandExchangeSearched, GraphicChanged, GraphicsObjectCreated, GroundObjectDespawned, GroundObjectSpawned, HitsplatApplied, InteractingChanged, ItemContainerChanged, ItemDespawned, ItemQuantityChanged, ItemSpawned, MenuEntryAdded, MenuOpened, MenuOptionClicked, MenuShouldLeftClick, NameableNameChanged, NpcChanged, NpcDespawned, NpcSpawned, OverheadTextChanged, PlayerChanged, PlayerDespawned, PlayerMenuOptionsChanged, PlayerSpawned, PostAnimation, PostHealthBarConfig, PostItemComposition, PostMenuSort, PostObjectComposition, PostStructComposition, PreMapLoad, ProjectileMoved, RemovedFriend, ResizeableChanged, ScriptCallbackEvent, ScriptPostFired, ScriptPreFired, SoundEffectPlayed, StatChanged, UsernameChanged, VarClientIntChanged, VarClientStrChanged, VarbitChanged, VolumeChanged, WallObjectDespawned, WallObjectSpawned, WidgetClosed, WidgetDrag, WidgetLoaded, WorldChanged, WorldEntityDespawned, WorldEntitySpawned, WorldListLoad, WorldViewLoaded, WorldViewUnloaded

<a id="doc-tsps-upstream-docs-runelite-api-coverage--plugins"></a>
#### Plugins

| Plugin | Missing events | Missing services | Missing client methods |
|---|---|---|---|
| account | - | sessionManager, configManager, clientToolbar, executor | - |
| achievementdiary | WidgetLoaded | client, clientThread | getLocalPlayer, getWidget, runScript, getVarpValue, getRealSkillLevel |
| agility | DecorativeObjectDespawned, DecorativeObjectSpawned, GameObjectDespawned, GameObjectSpawned, GroundObjectDespawned, GroundObjectSpawned, ItemDespawned, ItemSpawned, NpcDespawned, NpcSpawned, StatChanged, VarbitChanged, WallObjectDespawned, WallObjectSpawned | overlayManager, agilityOverlay, lapCounterOverlay, notifier, client, infoBoxManager, itemManager, xpTrackerService | getLocalPlayer, getMouseCanvasPosition, getPlane, getBoostedSkillLevel, getHintArrowPoint, getSkillExperience, getRealSkillLevel, getVarbitValue |
| ammo | ItemContainerChanged, VarbitChanged | client, clientThread, infoBoxManager, itemManager | getItemContainer, getVarpValue |
| animsmoothing | - | client | setAnimationInterpolationFilter |
| antidrag | ScriptPostFired, WidgetLoaded | client, clientThread, keyManager | getGameState, getScriptActiveWidget, getWidget, setInventoryDragDelay |
| attackstyles | ScriptPostFired, VarbitChanged | client, clientThread, overlayManager, overlay, chatManager, notifier | getGameState, getVarpValue, getVarbitValue, getWidget, getEnum, getStructComposition |
| bank | ItemContainerChanged, MenuEntryAdded, MenuShouldLeftClick, ScriptCallbackEvent, ScriptPostFired, ScriptPreFired, WidgetLoaded, WidgetClosed | client, clientThread, itemManager, bankSearch, keyManager | getWidget, createScriptEventBuilder, runScript, getMenuEntries, getIntStack, getObjectStack, getIntStackSize, getObjectStackSize, setVarcIntValue, getGameCycle, getVarbitValue, getComponentTable, closeInterface, getVarcStrValue, getItemContainer, getEnum, setVarcStrValue |
| banktags | GrandExchangeSearched, MenuEntryAdded, ScriptCallbackEvent, MenuOptionClicked, ScriptPreFired, VarbitChanged, WidgetClosed, ScriptPostFired, WidgetDrag | itemManager, client, clientThread, chatboxPanelManager, tagManager, tabInterface, layoutManager, spriteManager, configManager, eventBus, bankSearch | getWidget, createScriptEventBuilder, getVarcStrValue, setGeSearchResultIndex, setGeSearchResultCount, setGeSearchResultIds, getIntStack, getObjectStack, getIntStackSize, getObjectStackSize, getItemContainer, createMenuEntry, getItemDefinition, getVarbitValue, setDraggedOnWidget, setVarcIntValue, getEnum, runScript, getVarpValue, setVarbit, menuAction, playSoundEffect, getDraggedOnWidget, getDraggedWidget, isKeyPressed, getMouseCurrentButton, getMenuEntries |
| barbarianassault | ChatMessage, VarbitChanged, WidgetLoaded | client, chatMessageManager, overlayManager, timerOverlay, healerOverlay | getWidget, isInInstancedRegion |
| barrows | WidgetClosed, WidgetLoaded | overlayManager, barrowsOverlay, brotherOverlay, client, itemManager, spriteManager, infoBoxManager, chatMessageManager | getWidget, getVarbitValue, getItemContainer, getLocalPlayer, getMapRegions |
| blastfurnace | GameObjectDespawned, GameObjectSpawned | itemManager, overlayManager, overlay, cofferOverlay, clickBoxOverlay, client, infoBoxManager | getVarbitValue, getItemContainer, getLocalPlayer, getMouseCanvasPosition, getWidget, getRealSkillLevel |
| blastmine | GameObjectSpawned | overlayManager, client, blastMineRockOverlay, blastMineOreCountOverlay | getWidget, getVarbitValue, getScene, getLocalPlayer, getPlane |
| boosts | StatChanged | notifier, client, infoBoxManager, overlayManager, boostsOverlay, compactBoostsOverlay, configManager, skillIconManager | getBoostedSkillLevel, getRealSkillLevel, getTickCount, isPrayerActive |
| bosstimer | ChatMessage, NpcChanged, NpcDespawned | infoBoxManager, itemManager, npcUtil | - |
| camera | ScriptCallbackEvent, ScriptPostFired, ScriptPreFired, WidgetLoaded | client, clientThread, keyManager, mouseManager, tooltipManager | getWidget, createScriptEventBuilder, getGameState, setCameraMouseButtonMask, setCameraSpeed, setCameraPitchRelaxerEnabled, setInvertYaw, setInvertPitch, setCameraShakeDisabled, getVarcIntValue, setVarcIntValue, getIntStack, getIntStackSize, getIndexScripts, runScript, getMenuEntries, getScriptActiveWidget, getVarpValue |
| cannon | ChatMessage, ItemContainerChanged, VarbitChanged | itemManager, infoBoxManager, notifier, overlayManager, cannonOverlay, cannonSpotOverlay, client, clientThread | getWorld, getLocalPlayer, getGameState, getVarpValue, getItemContainer, getPlane |
| chatchannel | ClanMemberJoined, ClanMemberLeft, FriendsChatChanged, FriendsChatMemberJoined, FriendsChatMemberLeft, ScriptCallbackEvent, ScriptPostFired, VarClientStrChanged | client, chatIconManager, clientThread, chatboxPanelManager, chatColorConfig | getTickCount, getClanChannel, getGuestClanChannel, getGameState, getWidget, getFriendsChatManager, getChatLineMap, runScript, isResized, getVarbitValue, addChatMessage, getClanSettings, getGuestClanSettings, getVarcStrValue, getIntStack, getIntStackSize, getObjectStack, getObjectStackSize, getMessages, getIgnoreContainer |
| chatcommands | ChatMessage, ScriptPostFired, VarbitChanged, WidgetLoaded | client, clientThread, configManager, itemManager, chatCommandManager, executor, keyManager, chatKeyboardListener, hiscoreClient, chatClient, runeLiteConfig, gson, chatCommandsConfig | getGameState, getEnum, getModIcons, setModIcons, getTickCount, getLocalPlayer, getWidget, refreshChat, getVarpValue, getVarbitValue, getWorldType, getVarcIntValue, getVarcStrValue, setVarcStrValue, runScript |
| chatfilter | ChatMessage, OverheadTextChanged, ScriptCallbackEvent | client | refreshChat, getIntStack, getIntStackSize, getObjectStack, getObjectStackSize, getMessages, getLocalPlayer, isFriended, getFriendsChatManager, getClanChannel, getGuestClanChannel |
| chathistory | ChatMessage, MenuEntryAdded, MenuOptionClicked | client, clientThread, keyManager | addChatMessage, createMenuEntry, getWidget, getChatLineMap, runScript, getVarcIntValue, getVarcStrValue, setVarcStrValue |
| chatnotifications | ChatMessage | client, notifier | getLocalPlayer |
| cluescrolls | ChatMessage, DecorativeObjectDespawned, DecorativeObjectSpawned, GameObjectDespawned, GameObjectSpawned, GroundObjectDespawned, GroundObjectSpawned, ItemContainerChanged, MenuOptionClicked, NpcDespawned, NpcSpawned, WallObjectDespawned, WallObjectSpawned, WidgetLoaded | clientThread, configManager, chatboxPanelManager, itemManager, overlayManager, clueScrollOverlay, clueScrollEmoteOverlay, clueScrollMusicOverlay, clueScrollWorldOverlay, worldMapPointManager, tagManager | getWidget, getVarbitValue, clearHintArrow, getTopLevelWorldView, getItemDefinition, getEnum, setHintArrow, getHintArrowNpc, getPlane, getScene, getObjectDefinition, getMouseCanvasPosition, runScript, getIntStack |
| combatlevel | ScriptPostFired, ScriptPreFired, StatChanged | client, overlay, overlayManager | getLocalPlayer, getWidget, getMouseCanvasPosition, getRealSkillLevel, getObjectStack, getObjectStackSize, getWorldType |
| config | - | clientToolbar, pluginListPanelProvider, topLevelConfigPanelProvider, configManager, runeLiteConfig, chatColorConfig | - |
| cooking | ChatMessage, GraphicChanged | client, overlay, overlayManager, infoBoxManager, itemManager | getLocalPlayer |
| corp | HitsplatApplied, InteractingChanged, MenuEntryAdded, NpcDespawned, NpcSpawned, VarbitChanged | chatMessageManager, overlayManager, corpOverlay, npcOverlayService | getWidget, getVarbitValue, getLocalPlayer |
| crowdsourcing | ChatMessage, MenuOptionClicked, GameObjectDespawned, ItemContainerChanged, StatChanged | okHttpClient, gson, eventBus, manager, cooking, dialogue, music, thieving, woodcutting, zmi, client, clientThread | getItemContainer, getLocalPlayer, getBoostedSkillLevel, getVarbitValue, getSelectedWidget, getWidget, isInInstancedRegion, getTickCount, getPlane, getSkillExperience |
| customcursor | ItemContainerChanged | client, clientThread, clientUI, itemManager | getItemContainer |
| dailytaskindicators | - | client, chatMessageManager | getVarcIntValue, getVarbitValue, getVarpValue |
| defaultworld | WorldChanged | client, clientThread, worldService | getGameState, getWorld, createWorld, changeWorld |
| devtools | MenuEntryAdded, ScriptCallbackEvent, StatChanged, VarbitChanged, ItemContainerChanged, ScriptPostFired, ScriptPreFired, AreaSoundEffectPlayed, SoundEffectPlayed, VarClientIntChanged, VarClientStrChanged, MenuOptionClicked | client, clientToolbar, overlayManager, overlay, locationOverlay, sceneOverlay, cameraOverlay, worldMapLocationOverlay, mapRegionOverlay, soundEffectOverlay, eventBus, configManager, chatMessageManager, clientThread | getCameraX, getCameraZ, getCameraY, getCameraPitch, getCameraYaw, getScale, getTopLevelWorldView, getLocalPlayer, getMouseCanvasPosition, getTileSettings, getCollisionMaps, getPlane, getProjectiles, setOculusOrbState, setOculusOrbNormalSpeed, setGameState, addChatMessage, getVarps, queueChangedVarp, getVarbitValue, setVarbitValue, getVarbit, getSkillExperience, getBoostedSkillLevels, getRealSkillLevels, getSkillExperiences, queueChangedSkill, playSoundEffect, getModIcons, getIntStack, getIntStackSize, isMenuOpen, createMenuEntry, getTickCount, isInInstancedRegion, getInstanceTemplateChunks, getBaseX, getBaseY, getMapRegions, getNpcs, getVarcMap, getIndexConfig, getComponentTable, getWidgetRoots, getWidget, setAllWidgetsAreOpTargetable, setWidgetSelected, getMenuEntries, getWorldMap |
| discord | StatChanged | client, clientToolbar, discordState, partyService, discordService, wsClient, okHttpClient | getGameState, getLocalPlayer, getWorldType |
| dpscounter | HitsplatApplied, NpcDespawned | client, overlayManager, partyService, wsClient, dpsOverlay, dpsConfig | getLocalPlayer |
| driftnet | ChatMessage, GameObjectDespawned, GameObjectSpawned, InteractingChanged, ItemContainerChanged, NpcDespawned, NpcSpawned, VarbitChanged | client, clientThread, overlayManager, overlay | getGameState, getVarbitValue, getLocalPlayer, getTickCount, getItemContainer, isInInstancedRegion |
| emojis | ChatMessage, OverheadTextChanged | client, clientThread, chatIconManager, okHttpClient, gson, scheduledExecutorService | - |
| entityhider | - | client, hooks, npcUtil, partyService | getLocalPlayer, getIgnoreContainer, getFollower, getTopLevelWorldView |
| examine | ChatMessage, MenuOptionClicked | client, itemManager, chatMessageManager | getWidget |
| fairyring | MenuEntryAdded, ScriptCallbackEvent, VarbitChanged, WidgetLoaded | client, chatboxPanelManager, clientThread, configManager | getWidget, getVarbitValue, setVarcStrValue, createScriptEventBuilder, getIntStack, getIntStackSize, getDBTableField, getVarcStrValue, getMenu, playSoundEffect |
| fishing | ChatMessage, InteractingChanged, ItemContainerChanged, NpcDespawned, NpcSpawned, WidgetLoaded | client, notifier, overlayManager, overlay, spotOverlay, fishingSpotMinimapOverlay | getLocalPlayer, getItemContainer, getWidget, getVarbitValue, getCameraX, getCameraY, getPlane |
| fps | - | overlayManager, overlay, drawListener, drawManager | getWidget, getFPS, getRealDimensions |
| friendlist | ChatMessage, MenuEntryAdded, ScriptPostFired | client, configManager, chatMessageManager | getWorld, getVarpValue, getFriendContainer, getIgnoreContainer, createMenuEntry, getWidget |
| friendnotes | MenuEntryAdded, NameableNameChanged, RemovedFriend, ScriptCallbackEvent | client, configManager, overlayManager, overlay, chatboxPanelManager, clientThread, chatIconManager | isMenuOpen, getGameState, createMenuEntry, getObjectStack, getObjectStackSize, getIntStack, getIntStackSize, runScript |
| gpu | - | client, clientUI, clientThread, textureManager, regionManager, drawManager, pluginManager, renderCallbackManager | getCanvas, setDrawCallbacks, setExpandedMapLoading, resizeCanvas, getGameState, setGpuFlags, getTopLevelWorldView, setUnlockedFps, setGameState, setUnlockedFpsTarget, getCameraYaw, getCameraPitch, getCanvasHeight, getCanvasWidth, getViewportHeight, getViewportWidth, getStretchedDimensions, isStretchedEnabled, getViewportXOffset, getViewportYOffset, getSkyboxColor, getExpandedMapLoading, getTextureProvider, getGameCycle, getScale, getBufferProvider |
| grandexchange | ChatMessage, GrandExchangeOfferChanged, GrandExchangeSearched, MenuEntryAdded, ScriptCallbackEvent, ScriptPostFired | inputListener, itemManager, mouseManager, keyManager, client, clientToolbar, notifier, sessionManager, configManager, gson, runeLiteConfig, clientThread, scheduledExecutorService, fuzzySearchScorer, grandExchangeClient | newCall, getMenuEntries, getGameState, getGrandExchangeOffers, getEnvironment, getTickCount, getWorldType, getVarcStrValue, getWidget, setGeSearchResultIndex, getItemCount, setGeSearchResultCount, setGeSearchResultIds, getObjectStack, getObjectStackSize, getVarpValue, getAccountHash |
| grounditems | ItemDespawned, ItemQuantityChanged, ItemSpawned, MenuEntryAdded, WorldViewUnloaded | plugin, hotkeyListener, mouseAdapter, mouseManager, keyManager, client, clientThread, itemManager, overlayManager, overlay, notifier, executor, configManager, colorPickerManager | getLocalPlayer, getMouseCanvasPosition, getVarbitValue, getMenuEntries, setMenuEntries, getTickCount, isKeyPressed, getWorldView, createMenuEntry, loadModel, loadModelData, loadAnimation, createRuneLiteObject, getPlane |
| groundmarkers | MenuEntryAdded, WorldViewLoaded, WorldViewUnloaded | client, configManager, overlayManager, overlay, minimapOverlay, chatboxPanelManager, eventBus, sharingManager, gson, colorPickerManager | getLocalPlayer, getTopLevelWorldView, isKeyPressed, getWorldView, createMenuEntry, getMapRegions |
| herbiboars | GameObjectDespawned, GameObjectSpawned, GroundObjectDespawned, GroundObjectSpawned, MenuOptionClicked, VarbitChanged | client, clientThread, overlayManager, overlay, minimapOverlay | getGameState, getVarbitValue, getPlane, getMapRegions |
| hiscore | ChatMessage, MenuEntryAdded, MenuOpened, MenuOptionClicked, VarbitChanged | client, menuManager, clientToolbar | getLocalPlayer, createMenuEntry, getWorldType, getVarbitValue, getFriendContainer, getFriendsChatManager, getClanSettings, getGuestClanSettings, getTopLevelWorldView |
| hunter | GameObjectSpawned | client, overlayManager, overlay, notifier | getLocalPlayer, getScene, getPlane |
| idlenotifier | AnimationChanged, GraphicChanged, HitsplatApplied, InteractingChanged, NpcChanged, VarbitChanged | notifier, client, configManager | getGameState, getLocalPlayer, getMouseLastPressedMillis, getKeyboardIdleTicks, getVarpValue, getVarbitValue, getRealSkillLevel, getBoostedSkillLevel, getEnergy, getMouseIdleTicks, getIdleTimeout |
| implings | NpcChanged, NpcSpawned | overlayManager, overlay, notifier, npcOverlayService | getLocalPlayer |
| info | - | client, eventBus, sessionManager, executor, clientToolbar | getRevision |
| instancemap | - | plugin, overlay, inputListener, overlayManager, menuManager, keyManager, mouseManager | getPlane, drawInstanceMap, isResized, getExpandedMapLoading, getLocalPlayer |
| interacthighlight | InteractingChanged, ItemDespawned, MenuOptionClicked, NpcDespawned, PlayerDespawned | overlayManager, interactHighlightOverlay, client | getMenuEntries, isMenuOpen, getSelectedWidget, getGameCycle, getMenuX, getMenuY, getMenuWidth, getMouseCanvasPosition, getTickCount, getLocalDestinationLocation, getLocalPlayer, getWorldView, getObjectDefinition |
| interfacestyles | BeforeMenuRender, MenuOpened, PostHealthBarConfig, ScriptCallbackEvent | client, clientThread, spriteManager | getGameState, getMenuEntries, setMenuEntries, getIntStack, getIntStackSize, draw2010Menu, drawOriginalMenu, setCompass, getSpriteOverrides, getWidgetSpriteCache, getWidgetSpriteOverrides, getWidget, getCrossSprites |
| inventorygrid | - | overlay, overlayManager | getDraggedWidget, getMouseCanvasPosition, getDragTime |
| inventorytags | MenuOpened | client, configManager, overlay, overlayManager, gson, colorPickerManager | isKeyPressed, createMenuEntry, getItemContainer |
| inventoryviewer | - | overlay, overlayManager, keyManager | getVarcIntValue, getWidget, getItemContainer |
| itemcharges | ChatMessage, ItemContainerChanged, VarbitChanged, WidgetLoaded | client, clientThread, configManager, overlayManager, overlay, itemManager, infoBoxManager, notifier | getGameState, getVarbitValue, getItemContainer, getWidget |
| itemidentification | - | overlayManager, overlay | - |
| itemprices | - | client, tooltipManager, itemManager | isMenuOpen, getMenuEntries |
| itemstats | ScriptPostFired, VarbitChanged | client, itemManager, tooltipManager, statChanges, overlayManager, overlay, clientThread | isMenuOpen, getMenuEntries, getItemContainer, getWidget, getVarpValue, getVarbitValue, getCanvas, isResized, getBoostedSkillLevel, getRealSkillLevel, getEnergy |
| keyremapping | ScriptCallbackEvent | plugin, client, clientThread, keyManager, inputListener | setVarcStrValue, getVarcStrValue, getGameState, getWidget, getVarcIntValue, getFocusedInputFieldWidget, getIntStack, getIntStackSize, isResized, getVarbitValue |
| kingdomofmiscellania | VarbitChanged | client, infoBoxManager, itemManager, configManager, chatMessageManager | getVarbitValue, getGameState, getLocalPlayer, getVarpValue |
| kourendlibrary | AnimationChanged, ChatMessage, NpcDespawned, NpcSpawned, ItemContainerChanged, MenuOptionClicked | clientToolbar, client, library, overlayManager, overlay, tutorialOverlay, itemManager, clientThread | getLocalPlayer, getPlane, getGameState, getWidget, getItemContainer, clearHintArrow, getHintArrowPoint, setHintArrow |
| loginscreen | - | client, clientThread, keyManager, okHttpClient | getPreferences, setShouldRenderLoginScreenFire, getUsername, getGameState, getLoginIndex, getCurrentLoginField, setUsername, setOtp, setLoginScreen |
| logouttimer | - | client | setIdleTimeout |
| loottracker | ChatMessage, ItemContainerChanged, MenuOptionClicked, ScriptPreFired, WidgetLoaded | clientToolbar, itemManager, spriteManager, client, clientThread, sessionManager, executor, eventBus, chatMessageManager, lootManager, configManager, gson, lootTrackerClient | newCall, getGameState, isInInstancedRegion, getWorldType, getWorld, getVarbitValue, getLocalPlayer, getTickCount, getItemContainer, getBoostedSkillLevel, getWidget, getEnvironment, getMessages, getMapRegions |
| lowmemory | - | client, clientThread | getGameState, changeMemoryMode, getTopLevelWorldView |
| menuentryswapper | MenuOpened, PostMenuSort | client, clientThread, configManager, itemManager, chatMessageManager, npcUtil | getObjectDefinition, createMenuEntry, getWidgetConfig, getHintArrowNpc, isMenuOpen, getMenuEntries, getMenu, setMenuEntries, getGameCycle, isKeyPressed |
| metronome | - | client | getPreferences, playSoundEffect |
| minimap | ScriptPostFired | client, clientThread, configManager | createSpritePixels, setMinimapZoom, getMinimapZoom, getGameState, getVarbitValue, getWidget, getMapDots |
| mining | AnimationChanged, ChatMessage, GameObjectDespawned, GameObjectSpawned, ScriptPreFired | client, overlayManager, overlay, rocksOverlay | getLocalPlayer, getHintArrowType, getHintArrowPoint, clearHintArrow, setHintArrow, getPlane |
| motherlode | ChatMessage, GameObjectDespawned, GameObjectSpawned, ItemContainerChanged, ScriptPostFired, VarbitChanged, WallObjectDespawned, WallObjectSpawned | overlayManager, sceneOverlay, client, clientThread, eventBus | getItemContainer, getLocalPlayer, getVarbitValue, getWidget, getGameState, getMapRegions |
| mousehighlight | - | overlayManager, overlay | isMenuOpen, getMenuEntries, getVarcIntValue, getGameCycle |
| mta | ChatMessage, GameObjectSpawned, ItemDespawned, ItemSpawned, ItemContainerChanged, GroundObjectSpawned, NpcDespawned, NpcSpawned, WallObjectSpawned | overlayManager, alchemyRoom, graveyardRoom, telekineticRoom, enchantmentRoom, eventBus, sceneOverlay, itemOverlay | clearHintArrow, getLocalPlayer, getWidget, setHintArrow, getItemContainer, getTopLevelWorldView |
| music | AmbientSoundEffectCreated, AreaSoundEffectPlayed, ScriptCallbackEvent, SoundEffectPlayed, VarClientIntChanged, VarbitChanged, WidgetLoaded | client, clientThread, musicConfig, chatboxPanelManager | getGameState, setGameState, getWidget, getAmbientSoundEffects, getIntStack, getIntStackSize, getDBTableField, getVarcIntValue, getVarbitValue, playSoundEffect, runScript, getLocalPlayer |
| nightmarezone | ChatMessage | notifier, client, overlayManager, overlay | getWidget, getVarbitValue, getVarpValue, getLocalPlayer, getMapRegions |
| notes | - | clientToolbar | - |
| npchighlight | GraphicsObjectCreated, MenuEntryAdded, NpcChanged, NpcDespawned, NpcSpawned | client, overlayManager, npcRespawnOverlay, clientThread, npcOverlayService, npcUtil, configManager, colorPickerManager | isKeyPressed, createMenuEntry, getWorldView, isInInstancedRegion, getLocalPlayer, getTickCount, getGameState, getTopLevelWorldView, getNpcs |
| npcunaggroarea | NpcSpawned | client, clientThread, overlay, overlayManager, itemManager, infoBoxManager, configManager, notifier, slayerPluginService | getLocalPlayer, getPlane, getBaseX, getBaseY, getTopLevelWorldView |
| objectindicators | DecorativeObjectDespawned, DecorativeObjectSpawned, GameObjectDespawned, GameObjectSpawned, GroundObjectDespawned, GroundObjectSpawned, MenuEntryAdded, WallObjectDespawned, WallObjectSpawned, WorldViewLoaded, WorldViewUnloaded | client, configManager, overlayManager, overlay, gson, colorPickerManager, clientThread | getTopLevelWorldView, isKeyPressed, getWorldView, createMenuEntry, getObjectDefinition, getMapRegions |
| opponentinfo | InteractingChanged, MenuEntryAdded, ScriptPostFired | client, overlayManager, opponentInfoOverlay, playerComparisonOverlay | getVarbitValue, getVarpValue, getWorldType, getLocalPlayer, getMenuEntries, getWidget, getRealSkillLevel |
| party | MenuOptionClicked | client, party, overlayManager, partyPingOverlay, partyStatusOverlay, wsClient, worldMapManager, chatMessageManager, clientThread, clientToolbar, keyManager | isMenuOpen, getSelectedSceneTile, getMenuEntries, getPlane, playSoundEffect, getGameState, getLocalPlayer, getBoostedSkillLevel, getRealSkillLevel, getEnergy, getVarpValue, getVarbitValue, getTickCount, getPlayers |
| pestcontrol | ChatMessage, NpcDespawned, NpcSpawned | overlayManager, overlay | getWidget |
| playerindicators | ScriptPostFired | overlayManager, playerIndicatorsOverlay, playerIndicatorsTileOverlay, playerIndicatorsMinimapOverlay, playerIndicatorsService, client, chatIconManager, clientThread, configManager | isMenuOpen, getMenuEntries, getWidget, getPlayers, getTopLevelWorldView, getVarbitValue, getLocalPlayer, getClanChannel, getClanSettings, getFriendsChatManager |
| poh | AnimationChanged, DecorativeObjectDespawned, DecorativeObjectSpawned, GameObjectDespawned, GameObjectSpawned | overlayManager, overlay, client, executor, hiscoreManager, burnerOverlay | getPlane, getLocalPlayer, getRealSkillLevel |
| poison | VarbitChanged | client, clientThread, poisonOverlay, overlayManager, infoBoxManager, spriteManager | getWidget, getMouseCanvasPosition, getGameState, getVarpValue, getWidgetSpriteCache, getSpriteOverrides |
| prayer | ItemContainerChanged, MenuOptionClicked, ScriptPostFired, WidgetDrag | client, infoBoxManager, spriteManager, overlayManager, flickOverlay, doseOverlay, barOverlay, itemManager, prayerReorder, eventBus | getLocalPlayer, getPlane, getBoostedSkillLevel, getRealSkillLevel, getSpriteOverrides, getWidget, getMouseCanvasPosition, getItemContainer, isPrayerActive, getGameState, getMouseCurrentButton, getDraggedWidget, getDraggedOnWidget, getVarbitValue, setDraggedOnWidget, getEnum, getItemDefinition, runScript |
| puzzlesolver | MenuOptionClicked, WidgetLoaded | overlayManager, overlay, client | getGameState, getItemContainer, getWidget |
| pyramidplunder | GameObjectSpawned, WallObjectSpawned | client, overlayManager, overlay, infoBoxManager, itemManager, clientThread | getWidget, getLocalPlayer, getVarbitValue, getObjectDefinition, getMouseCanvasPosition, getPlane |
| questlist | ScriptCallbackEvent, ScriptPostFired, VarClientIntChanged, VarbitChanged | client, chatboxPanelManager, clientThread | getWidget, getIntStack, getIntStackSize, getDBTableField, getVarbitValue, getVarcIntValue, playSoundEffect, runScript |
| raids | ChatMessage, VarbitChanged | runeLiteConfig, chatMessageManager, infoBoxManager, client, overlayManager, overlay, layoutSolver, spriteManager, clientThread, chatCommandManager, chatClient, scheduledExecutorService, keyManager, imageCapture, eventBus | getFriendsChatManager, getWorld, getVarbitValue, getPlane, getGameState, getVarpValue, getScene, getBaseX, getBaseY, getInstanceTemplateChunks, getLocalPlayer, refreshChat |
| randomevents | InteractingChanged, MenuEntryAdded, NpcDespawned | client, notifier | getLocalPlayer, getTickCount, setMenuEntries, getMenuEntries |
| regenmeter | ItemContainerChanged, VarbitChanged | client, overlayManager, notifier, overlay | getWidget, getVarpValue, isPrayerActive, getBoostedSkillLevel, getRealSkillLevel |
| reportbutton | - | client, clientThread | getWidget, getGameState, getMouseIdleTicks, getKeyboardIdleTicks |
| roofremoval | PreMapLoad | client, clientThread, gson | getScene, getGameState, setGameState |
| runecraft | ChatMessage, DecorativeObjectDespawned, DecorativeObjectSpawned, ItemContainerChanged | overlayManager, abyssOverlay, abyssMinimapOverlay, essencePouchOverlay, notifier, npcOverlayService | getLocalPlayer, getMouseCanvasPosition, getVarpValue, getVarbitValue, getRealSkillLevel |
| runenergy | ChatMessage, ScriptCallbackEvent, ScriptPostFired | chatMessageManager, client, overlayManager, energyOverlay, energyConfig, configManager | getWidget, getMouseCanvasPosition, getWeight, getEnergy, getVarbitValue, getItemContainer, getLocalDestinationLocation, getLocalPlayer, getIntStack, getIntStackSize, getBoostedSkillLevel, getTickCount |
| runepouch | - | overlayManager, overlay | getEnum, getVarbitValue, getMouseCanvasPosition |
| screenmarkers | - | configManager, mouseManager, clientToolbar, overlayManager, overlay, gson, colorPickerManager, widgetHighlight | getMenuEntries, isMenuOpen, getWidget |
| screenshot | ActorDeath, AnimationChanged, ChatMessage, ScriptCallbackEvent, ScriptPostFired, ScriptPreFired, WidgetLoaded | client, clientToolbar, drawManager, executor, keyManager, imageCapture, clientThread | getWidget, getLocalPlayer, getObjectStack, getObjectStackSize, getVarbitValue, getVarcStrValue, getGameState, getTopLevelInterfaceId, isInInstancedRegion, getMapRegions |
| skillcalculator | WorldChanged | client, clientToolbar, uiPanel | getSkillExperience, getVarpValue, getWorldType |
| skybox | - | client | setSkyboxColor, getBaseX, getBaseY, getInstanceTemplateChunks, getGameState, getLocalPlayer, getOculusOrbState, getOculusOrbFocalPointX, getOculusOrbFocalPointY, getCameraX, getCameraY, getPlane, getTextureProvider, isInInstancedRegion |
| slayer | ChatMessage, MenuOptionClicked, NpcDespawned, NpcSpawned, VarbitChanged | client, configManager, overlayManager, overlay, infoBoxManager, itemManager, notifier, clientThread, targetWeaknessOverlay, chatCommandManager, executor, chatClient, npcOverlayService | getGameState, getDBTableRows, getDBTableField, getVarpValue, getDBRowsByValue, getVarbitValue, getWidget, getNpcs, getLocalPlayer, refreshChat |
| smelting | ChatMessage | overlay, overlayManager | getLocalPlayer |
| specialcounter | FakeXpDrop, HitsplatApplied, NpcChanged, NpcDespawned, ScriptPostFired, StatChanged, VarbitChanged | client, clientThread, wsClient, party, infoBoxManager, itemManager, spriteManager, notifier, overlayManager, playerInfoDropOverlay | getTopLevelWorldView, getGameCycle, getTickCount, getWorld, getLocalPlayer, getItemContainer |
| spellbook | ScriptCallbackEvent, ScriptPreFired, WidgetDrag | client, clientThread, menuManager, chatMessageManager, configManager | getIntStack, getIntStackSize, getMouseCurrentButton, getDraggedWidget, getDraggedOnWidget, getEnum, getVarbitValue, getItemDefinition, getWidget, getArray, runScript, createScriptEventBuilder |
| statusbars | - | overlay, overlayManager, client, clientThread | getRealSkillLevel, getBoostedSkillLevel, getVarpValue, getVarbitValue, isPrayerActive, getEnergy, getWidget, getMenuEntries, getLocalPlayer, getTickCount |
| stretchedmode | ResizeableChanged | client, mouseManager, mouseListener, mouseWheelListener | setStretchedEnabled, invalidateStretching, setStretchedIntegerScaling, setStretchedKeepAspectRatio, setStretchedFast, setScalingFactor, getStretchedDimensions, getRealDimensions |
| team | ClanChannelChanged, ClanMemberJoined, ClanMemberLeft, FriendsChatChanged, FriendsChatMemberJoined, FriendsChatMemberLeft, PlayerChanged, PlayerDespawned, PlayerSpawned | client, clientThread, overlayManager, overlay, spriteManager, infoBoxManager | getPlayers, getLocalPlayer, getWorld |
| tearsofguthix | DecorativeObjectDespawned, DecorativeObjectSpawned | client, overlayManager, overlay | getLocalPlayer |
| tileindicators | - | overlayManager, overlay | getVarbitValue, getLocalPlayer, getLocalDestinationLocation |
| timersandbuffs | ActorDeath, ChatMessage, GraphicChanged, ItemContainerChanged, NpcChanged, NpcDespawned, NpcSpawned, VarbitChanged | itemManager, spriteManager, client, infoBoxManager | getGameState, getTickCount, getVarbitValue, getLocalPlayer, getWorld, getRealSkillLevel, getBoostedSkillLevel, getItemContainer, getMapRegions, getVarpValue |
| timestamp | ScriptCallbackEvent | client, clientThread | runScript, getIntStack, getIntStackSize, getMessages, getObjectStack, getObjectStackSize, isResized, getVarbitValue |
| timetracking | ChatMessage, WidgetClosed, MenuOptionClicked, ScriptPreFired | clientToolbar, client, eventBus, compostTracker, paymentTracker, farmingTracker, birdHouseTracker, farmingContractManager, clockManager, infoBoxManager, executorService, configManager, notifier, gson, itemManager, plugin, farmingWorld | getGameState, getWidget, getLocalPlayer, getTickCount, getObjectDefinition, getPlane, getSelectedWidget, getScene, getComponentTable, getVarbitValue, getWorldType, getIntStack, getVarpValue |
| tithefarm | GameObjectSpawned | overlayManager, titheFarmOverlay | getPlane |
| twitch | ScriptCallbackEvent | twitchConfig, client, chatMessageManager | getGameState, getIntStack, getIntStackSize, getVarcStrValue |
| virtuallevels | ScriptCallbackEvent | client, clientThread | getIntStack, getIntStackSize, getObjectStack, getObjectStackSize, getSkillExperience, queueChangedSkill |
| wiki | ScriptPreFired, MenuEntryAdded, MenuOptionClicked, ScriptPostFired, WidgetLoaded | clientThread, client, itemManager, wikiSearchChatboxTextInputProvider, wikiDpsManager | getWidget, getItemContainer, getRealSkillLevel, getVarbitValue, getVarpValue, getLocalPlayer, setWidgetSelected, isResized, setAllWidgetsAreOpTargetable, getObjectDefinition, getPlane, getMenu, setMenuEntries, createMenuEntry |
| wintertodt | AnimationChanged, ChatMessage, ItemContainerChanged, VarbitChanged | notifier, client, overlayManager, overlay | getLocalPlayer, refreshChat, getItemContainer |
| woodcutting | AnimationChanged, ChatMessage, GameObjectDespawned, GameObjectSpawned, InteractingChanged, ItemSpawned, NpcDespawned, NpcSpawned, ScriptPreFired, VarbitChanged | notifier, client, clientThread, overlayManager, overlay, treesOverlay, infoBoxManager, itemManager | getLocalPlayer, getVarpValue, getObjectDefinition, getScene, getVarbitValue, getPlane |
| worldhopper | ChatMessage, MenuEntryAdded, VarbitChanged, WorldListLoad | client, clientThread, configManager, clientToolbar, keyManager, chatMessageManager, overlayManager, worldHopperOverlay, worldService | getWidget, getRealDimensions, getWorld, getVarbitValue, createMenuEntry, getGameState, getEnum, getTotalLevel, isClientThread, createWorld, changeWorld, openWorldHopper, hopToWorld, getFriendsChatManager, getClanChannel, getGuestClanChannel, getFriendContainer, getSocketFD |
| worldmap | ScriptPostFired, StatChanged | client, worldMapPointManager | getRealSkillLevel, getWorldMap, getMapElementConfig, getDBRowsByValue, getDBTableField |
| xpdrop | ScriptPreFired, StatChanged | client | getIntStack, getIntStackSize, getWidget, getEnum, getVarbitValue, getServerVarbitValue, runScript |
| xpglobes | StatChanged | overlayManager, overlay | getMouseCanvasPosition |
| xptracker | MenuEntryAdded, StatChanged | xpTrackerConfig, clientToolbar, client, clientThread, skillIconManager, overlayManager, xpClient, xpState, configManager | newCall, getWorldType, getLocalPlayer, getGameState, getAccountHash, getOverallExperience, getSkillExperience, getVarpValue, createMenuEntry |
| xpupdater | - | client, okHttpClient | getAccountHash, getOverallExperience, getLocalPlayer, getWorldType |
| zalcano | GameObjectSpawned, GraphicsObjectCreated, HitsplatApplied, NpcChanged, NpcDespawned, NpcSpawned, ProjectileMoved, VarbitChanged | client, overlayManager, overlay, panel, clientThread | getLocalPlayer, getGameCycle, getGameState, setHintArrow, clearHintArrow, getVarpValue |
<!-- end-source-document: tsps-upstream/docs/runelite-api-coverage.md -->

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation"></a>
## tsps-upstream/docs/RuneLite_API_shape_implementation.md

<!-- source-document: tsps-upstream/docs/RuneLite_API_shape_implementation.md -->
<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--runelite-shaped-client-plugin-api-implementation-plan"></a>
### RuneLite-shaped client plugin API: implementation plan

**Goal:** give the browser client a plugin API that matches RuneLite's (`../runelite`) closely enough that porting a RuneLite plugin is a mechanical translation from Java to TypeScript. The class names, method names, event names, event getters and ID constants stay the same. Only the language changes.

**Non-goal:** running Java plugins, or Swing compatibility. Swing panels are the one area where a port means a rewrite (in React), and this plan keeps that area small.

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--1-where-we-are-today"></a>
#### 1. Where we are today

| Area | Today | File(s) |
|---|---|---|
| Plugin contract | `ClientPlugin` with about 15 optional render, camera, menu and command hooks. Only HD, first-person, menu swapper and gameframe317 implement it. | `client/game/plugins/ClientPluginManager.ts` |
| Plugin construction | Built by hand, one field per plugin, in `OsrsClient` | `client/game/OsrsClient.ts` (≈1180–1240) |
| Core → plugin coupling | Renderer and sidebar call plugins by field name (`osrsClient.groundItemsPlugin.…`) | `render/render/interact/*`, `render/render/frame/render.ts`, `game/sidebar/SidebarShell.tsx` |
| Events | None for plugins. The network layer has per-packet listener sets (`subscribeTick`, `subscribeChatMessages`, `subscribeInventory`, `subscribeSkills`, `subscribeNpcInfo`, `subscribePlayerSync`, `subscribeGroundItems`, …) | `client/network/serverConnection/subscriptions/*`, `state.ts` |
| Config | Each plugin has a hand-written `types.ts` config interface, sanitizers, a `Browser*Persistence` localStorage wrapper and `subscribe`/`getState`/`setConfig` | `client/game/plugins/*/` |
| Config UI | A hand-written React panel per plugin, plus a hard-coded toggle list in the plugin hub (now replaced: the generated `ConfigPanel`, the plugin hub, and `ClientToolbar` for side panels, see Phase 5) | `game/sidebar/SidebarShell.tsx` (1071 lines), `OsrsClient.syncSidebarPlugins` |
| Overlays | An internal WebGL `Overlay`/`OverlayManager` (init/update/draw by `RenderPhase`), fed a large `OverlayUpdateArgs.state` bag. Not plugin-facing. | `client/ui/devoverlay/Overlay.ts`, `OverlayManager.ts` |
| Menus | One `transformMenuEntries(SimpleMenuEntry[])` pass. Clicks go through `MenuState.invoke` → `menuAction(arg0, arg1, opcode, identifier, itemId, option, target, x, y)`, which already has RuneLite's `MenuOptionClicked` field set. | `ui/menu/menuTransforms.ts`, `MenuState.ts`, `MenuAction.ts` |
| Vars | `VarManager.onVarpChange(varpId, old, new)`, a single callback slot that `OsrsClient` already uses | `rs/config/vartype/VarManager.ts`, `OsrsClient.ts` (≈6454) |
| Scripts | A full CS2 VM with an int stack, `execute(script, …)` and event handlers | `rs/cs2/Cs2Vm.ts` |
| Actors | Struct-of-arrays ECS (`PlayerEcs`, `NpcEcs`), addressed by a reusable index | `game/ecs/*` |
| Game state | Our own `GameState` enum. Its values differ from RuneLite's (for example our `CONNECTION_LOST = 100`, RuneLite's is `40`) | `game/login/GameState.ts`, `game/state/GameStateMachine.ts` |

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--2-what-runelite-plugins-actually-use"></a>
#### 2. What RuneLite plugins actually use

We measured this across the 137 plugins in `runelite-client/.../plugins`, and it sets the priority order below.

**Events (number of `@Subscribe` handlers):** GameStateChanged 57, ConfigChanged 57, GameTick 50, ChatMessage 42, VarbitChanged 27, ScriptPostFired 19, MenuOptionClicked 18, MenuEntryAdded 18, NpcDespawned 17, ScriptCallbackEvent 16, ItemContainerChanged 16, GameObjectSpawned 14, WidgetLoaded 13, ScriptPreFired 13, NpcSpawned 13, ProfileChanged 10, StatChanged 9, GameObjectDespawned 9, InteractingChanged 8, CommandExecuted 7, ClientTick 7, NpcChanged 6, FocusChanged 6, HitsplatApplied 5, BeforeRender 5, WidgetClosed 4, ItemSpawned/Despawned 4, AnimationChanged 4, PostClientTick 3, GraphicChanged 3, VarClientIntChanged 3, MenuOpened, PostMenuSort.

**Services (plugins that use each one):** ConfigManager 117, Client 109, OverlayManager 69, ClientThread 62, ItemManager 45, OverlayUtil 28, Perspective 27, InfoBoxManager 24, Notifier 23, ChatMessageManager 21, ClientToolbar 17, ScheduledExecutorService 17, SpriteManager 16, KeyManager 15, PluginPanel 14, TooltipManager 13, EventBus (direct) 13, ChatboxPanelManager 9, MouseManager 6, MenuManager 5.

**`Client` methods (by number of call sites, 208 distinct methods used):** getWidget 249, getVarbitValue 232, getLocalPlayer 213, getGameState 79, getTickCount 72, getRealSkillLevel 67, getItemContainer 66, getPlane 51, getBoostedSkillLevel 49, getVarpValue 47, createMenuEntry 40, getEnum 33, getWorld 32, getIntStack 32, runScript 29, getIntStackSize 28, getTopLevelWorldView 24, getWorldType 22, getMenuEntries 22, refreshChat 20, getGameCycle 20, getMouseCanvasPosition 19, getItemDefinition 18, getMapRegions 17, getObjectDefinition 16, getVarc{Int,Str}Value 15, set/clearHintArrow 14, isMenuOpen 12, playSoundEffect 11, getSkillExperience 11, addChatMessage 11.

These three lists act as the backlog. Section 9 adds a script that keeps the list honest.

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--3-porting-conventions-the-11-contract"></a>
#### 3. Porting conventions (the "1:1" contract)

Every decision below is aimed at making a port a find-and-replace job.

| Java (RuneLite) | TypeScript (ours) | Notes |
|---|---|---|
| `package net.runelite.client.plugins.foo;` | file lives in `client/runelite/client/plugins/foo/` | Mirrors the Java package path |
| `import net.runelite.api.events.GameTick;` | `import { GameTick } from "@runelite/api/events";` | Path aliases `@runelite/api`, `@runelite/client`, `@runelite/awt` (tsconfig `paths`, plus a craco webpack alias; tsx already honours tsconfig paths) |
| `@PluginDescriptor(name = "Boosts", tags = {...})` | `static descriptor: PluginDescriptor = { name: "Boosts", tags: [...] }` | No decorators: CRA's Babel config doesn't enable them and we don't want to change the build |
| `@Inject private Client client;` | `private client = inject(Client);` | `inject()` reads the current injector, which `PluginManager` sets while it constructs the plugin (Angular-style). Same result, no decorators. |
| `@Provides FooConfig provideConfig(ConfigManager c) { return c.getConfig(FooConfig.class); }` | delete it. `private config = inject(FooConfig);` | The injector resolves any config group automatically |
| `@Subscribe public void onGameTick(GameTick e)` | `onGameTick(e: GameTick): void` | `EventBus.register(obj)` binds methods by name (`on` + event class name). Every RuneLite subscriber already follows this convention. Priority: optional `static subscribe = { onGameTick: { priority: 5 } }`. |
| `@Override protected void startUp() throws Exception` | `protected async startUp(): Promise<void>` | Async is allowed (sprite/cache loads); the manager awaits it |
| `event.getMessage()`, `event.setMessage(x)` | identical | Events are classes with Lombok-style getters and setters, not plain objects |
| `client.getLocalPlayer().getWorldLocation()` | identical | Getters stay methods, never become properties |
| `ItemID.ABYSSAL_WHIP`, `VarbitID.…`, `InterfaceID.…` | identical, via `import * as ItemID from "@runelite/api/gameval/ItemID"` | Generated from `runelite-api/.../gameval/*.java`. Each constant is its own named export, so webpack tree-shakes the roughly 100k lines down to what is used. |
| `java.awt.Color`, `Point`, `Rectangle`, `Polygon`, `Shape`, `BasicStroke`, `Font`, `Dimension` | same names from `@runelite/awt` | Thin shim, see §4.8 |
| `Graphics2D` | `Graphics2D` from `@runelite/awt` wrapping `CanvasRenderingContext2D` | See §4.8 |
| `clientThread.invoke(() -> …)` / `invokeLater` | identical | Single-threaded: `invoke` runs now if we're on a client tick, otherwise queues; `invokeLater` queues to the end of the current or next client tick |
| `executor.schedule(r, 5, SECONDS)` | `ScheduledExecutorService` shim over `setTimeout`/`setInterval` | Small, used by 17 plugins |
| `int`, `long`, `boolean`, `String` | `number`, `number`, `boolean`, `string` | Ports must keep `| 0` wherever Java relies on int overflow or truncation (bit-packed varps, hashes) |
| `List<T>`, `Map<K,V>`, `Set<T>` | `T[]`, `Map`, `Set` | Actor wrappers keep a stable identity (§4.5), so `Set<NPC>` works |
| Swing `PluginPanel` | React component passed to `NavigationButton` | The one non-mechanical part of a port |

**Licence:** RuneLite is BSD-2-Clause. Every ported plugin file keeps RuneLite's copyright header, with a "Ported to TypeScript" line added.

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--4-architecture"></a>
#### 4. Architecture

New top-level folder **`client/runelite/`**, split the same way as RuneLite:

```
client/runelite/
  api/            # net.runelite.api — Client interface, model types, events, gameval, Perspective, coords
    events/       # one file per event class (GameTick.ts, ChatMessage.ts, …) + index.ts barrel
    gameval/      # generated ItemID.ts, VarbitID.ts, InterfaceID.ts, NpcID.ts, ObjectID.ts, AnimationID.ts, SpotanimID.ts, VarPlayerID.ts, VarClientID.ts, SpriteID.ts, InventoryID.ts
    coords/       # WorldPoint, LocalPoint, WorldArea
  awt/            # java.awt shim: Color, Point, Rectangle, Polygon, Dimension, BasicStroke, Font, Graphics2D
  client/         # net.runelite.client — plugins, config, eventbus, ui/overlay, game, callback, chat, input, util
    plugins/      # ported + migrated plugins, one folder each
  impl/           # adapters from our engine to the api (ClientImpl, NpcImpl, PlayerImpl, WidgetImpl, event emitters)
```

`api/` and `client/` contain only RuneLite-shaped code. Everything that touches `OsrsClient`, the ECS, `VarManager` or `Cs2Vm` lives in `impl/`, so the API surface never leaks engine types. The ARCHITECTURE.md file-size rule (100–150 lines, hard cap 400) applies: one class per file, as in RuneLite. Generated `gameval/` files are exempt.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--41-eventbus--clientruneliteclienteventbuseventbusts"></a>
##### 4.1 EventBus — `client/runelite/client/eventbus/EventBus.ts`

- `register(subscriber)`: walks the prototype chain, binds every `on<EventName>` method whose `<EventName>` is a known event class, and sorts by priority (higher first, as in RuneLite).
- `unregister(subscriber)`, `post(event)`, and `subscribe(EventClass, handler, priority)`, which returns an unsubscribe function for non-plugin code.
- Dispatch is keyed by the event's constructor and uses no string lookups in the hot path. Each subscriber call is wrapped in try/catch, so one throwing plugin is logged with its name and does not break dispatch (RuneLite behaves the same way).
- Profiling hook: with `profiler.enabled`, record time per subscriber (reuse `render/PerformanceProfiler`).
- A single instance, owned by `RuneLite` bootstrap (§4.11).

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--42-plugin-pluginmanager-injector--clientruneliteclientplugins"></a>
##### 4.2 Plugin, PluginManager, injector — `client/runelite/client/plugins/`

- `abstract class Plugin { protected async startUp() {}; protected async shutDown() {}; resetConfiguration() {} }`
- `PluginDescriptor`: `name, description, tags, enabledByDefault (true), hidden, developerPlugin, conflicts, loadWhenOutdated`. `PluginDependency` becomes `static dependencies = [OtherPlugin]`.
- `PluginManager`:
  - `loadCorePlugins()` takes a static list (`client/runelite/client/plugins/index.ts`). Phase 6 adds dynamic plugins.
  - Enabled state is stored as config key `runelite.<classname-lowercase>` = `"true"`/`"false"`, which is RuneLite's own key format.
  - `setPluginEnabled(p, bool)` → `startPlugin`/`stopPlugin`. Start means: construct the plugin inside the injector context, `await startUp()`, then `eventBus.register(plugin)`. Stop means: `eventBus.unregister(plugin)`, then `await shutDown()`. Posts `PluginChanged`.
  - Startup errors are caught; the plugin is marked failed and the hub panel shows it.
- `inject(Token)`: the injector is a `Map<constructor, instance>` holding singletons (`Client`, `ConfigManager`, `OverlayManager`, `ItemManager`, …). A config class token resolves to `configManager.getConfig(Token)`. Plugins can inject other plugins (RuneLite allows this).
- **Existing `ClientPlugin` hooks** (shader, camera, gameframe, client command) stay; RuneLite has no equivalent, and its nearest counterpart is `DrawCallbacks`. `Plugin` may implement any `ClientPlugin` method. `ClientPluginManager` iterates enabled plugins from `PluginManager`, not its own `add()` list, so the HD and gameframe hooks follow enable/disable automatically.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--43-configmanager-and-generated-config-ui--clientruneliteclientconfig"></a>
##### 4.3 ConfigManager and generated config UI — `client/runelite/client/config/`

Java config interfaces have no runtime form in TS, so a config is a **descriptor object** that returns an accessor with RuneLite's call-site shape:

```ts
// Java: @ConfigGroup("grounditems") interface GroundItemsConfig extends Config { @ConfigItem(keyName="highlightedItems", name="Highlighted Items", description="…", position=0) default String getHighlightItems() { return ""; } }
export const GroundItemsConfig = ConfigGroup("grounditems", {
    getHighlightItems: ConfigItem({ keyName: "highlightedItems", name: "Highlighted Items", description: "…", position: 0, default: "" }),
    highlightedColor:  ConfigItem({ keyName: "highlightedColor", name: "Highlighted item", position: 3, default: Color.decode("#AA00FF"), alpha: true, section: "colorsSection" }),
    priceDisplayMode:  ConfigItem({ keyName: "priceDisplayMode", name: "Price Display Mode", default: PriceDisplayMode.BOTH, enum: PriceDisplayMode }),
}, { sections: { colorsSection: ConfigSection({ name: "Colors", position: 1, closedByDefault: true }) } });
export type GroundItemsConfig = ConfigOf<typeof GroundItemsConfig>;
// call sites unchanged: config.getHighlightItems(), config.highlightedColor()
```

- The value type is inferred from `default`: boolean, number (`range: {min,max}`, `units`), string (`textArea`, `secret`), `Color` (`alpha`), enum (dropdown), `Keybind`/`ModifierlessKeybind`, `Set<Enum>` (multi-select). Also supports `hidden`, `warning`, `section`, `position`.
- `ConfigManager`: `getConfiguration(group, key, type?)`, `setConfiguration`, `unsetConfiguration`, `getConfig(Group)`, `getConfigDescriptor(Group)`, plus RS-profile variants (`getRSProfileConfiguration` etc.) keyed `rsprofile.<accountname>`. Posts `ConfigChanged(group, key, oldValue, newValue)`. Values are serialised to strings the way RuneLite does it (Color as `#AARRGGBB`, enums by name), so exported RuneLite settings could later be imported.
- Storage: one localStorage namespace, `rl.config.<group>.<key>`. Writes are debounced; reads come from an in-memory map. Changes made in another tab arrive through the `storage` event.
- **Generated settings panel** (`client/runelite/client/ui/config/ConfigPanel.tsx`): renders any descriptor (sections, ordering, widgets per type), with the same look as today's `rl-sidebar-*` CSS. It replaces the hand-written panels in `SidebarShell.tsx`.
- **Plugin hub** (`PluginListPanel.tsx`): lists every plugin from `PluginManager` with toggle, search by name/tags, and a cog that opens the generated config panel. This replaces the hard-coded `pluginToggles` and `syncSidebarPlugins`.
- **Migration shim:** on first run, read each legacy `osrs.plugin.<name>.v1` blob, write its fields into the new keys, and record `rl.config.migrated.<name>`. No user loses settings.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--44-client-facade--clientruneliteapiclientts-interface--implclientimplts"></a>
##### 4.4 `Client` facade — `client/runelite/api/Client.ts` (interface) + `impl/ClientImpl.ts`

The interface mirrors `runelite-api/.../Client.java` (2420 lines) in name and signature, but only methods we implement are declared. Unimplemented methods are absent rather than stubbed, so a port that needs one fails at compile time, not at runtime. Implementation order follows the usage counts in §2:

| Tier | Methods | Backed by |
|---|---|---|
| 1 | `getGameState`, `getTickCount`, `getGameCycle`, `getLocalPlayer`, `getNpcs`, `getPlayers`, `getPlane`, `getVarbitValue`, `getVarpValue`, `getVarps`, `getVarcIntValue`, `getVarcStrValue`, `getRealSkillLevel`, `getBoostedSkillLevel`, `getSkillExperience`, `getOverallExperience`, `getItemContainer`, `getWidget`, `getEnergy`, `getWeight`, `getWorld`, `getWorldType`, `isInInstancedRegion`, `getMapRegions`, `addChatMessage`, `refreshChat`, `getMouseCanvasPosition`, `isMenuOpen`, `getCanvas`, `getCanvasWidth/Height`, `isResized`, `getLocalPlayer().getName()` | `GameStateMachine`, `TransmitCycles`/`getCurrentTick`, `PlayerEcs`/`NpcEcs`, `VarManager`, skills/inventory/bank stores in `network/serverConnection/domain`, `WidgetManager`, chat history |
| 2 | `createMenuEntry`, `getMenuEntries`, `setMenuEntries`, `getMenu()`, `getEnum`, `getStructComposition`, `getItemDefinition`, `getNpcDefinition`, `getObjectDefinition`, `getDBTableField`, `runScript`, `getIntStack`, `getIntStackSize`, `getObjectStack`, `getObjectStackSize`, `setVarcIntValue`, `setVarcStrValue`, `playSoundEffect`, `setHintArrow`/`clearHintArrow`/`getHintArrow*`, `getTopLevelWorldView`, `getScene`, `getSelectedSceneTile`, `getCameraX/Y/Z/Pitch/Yaw`, `getViewportXOffset/YOffset/Width/Height`, `getFriendsChatManager`, `getFriendContainer` | `MenuState`, cache type loaders, `Cs2Vm`, `HintArrow.ts`, `Camera.ts`, `MapManager`/scene |
| 3 | Everything else, driven by what the next ported plugin needs | |

Model types live in `api/`: `Actor`, `Player`, `NPC`, `NPCComposition`, `ItemComposition`, `ObjectComposition`, `ItemContainer`, `Item`, `Widget`, `MenuEntry`, `Tile`, `TileItem`, `GameObject`/`WallObject`/`GroundObject`/`DecorativeObject`, `Skill`, `GameState`, `ChatMessageType`, `MenuAction`, `InventoryID`, `WorldType`, `Prayer`, `HeadIcon`, `SkullIcon`, `HintArrowType`, `AnimationID` and the other gameval constants.

**Enum values are RuneLite's.** `GameState` maps ours onto RuneLite's: DOWNLOADING→UNKNOWN(-1), LOADING→STARTING(0), LOGIN_SCREEN→LOGIN_SCREEN(10), CONNECTING→LOGGING_IN(20), LOADING_GAME→LOADING(25), LOGGED_IN→LOGGED_IN(30), RECONNECTING/CONNECTION_LOST→CONNECTION_LOST(40), PLEASE_WAIT→HOPPING(45). `ChatMessageType` uses the raw OSRS channel id we already carry (`ChatMessageEvent.chatType`).

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--45-actor-wrappers-with-stable-identity--implnpcimplts-implplayerimplts"></a>
##### 4.5 Actor wrappers with stable identity — `impl/NpcImpl.ts`, `impl/PlayerImpl.ts`

The ECS reuses indices, while RuneLite plugins keep `NPC` references in Sets and Maps for as long as the NPC is spawned. So:

- One wrapper per spawn. It is created when the NPC/player is added to the ECS, stored in `npcWrappers[index]`, and posted as `NpcSpawned`. On removal it is marked `isDead`/detached, posted as `NpcDespawned`, then the slot is cleared. A new spawn in the same index gets a new wrapper object.
- Wrappers hold only `index` and the ECS reference, and every getter reads live (`getWorldLocation()`, `getLocalLocation()`, `getAnimation()`, `getGraphic()`, `getInteracting()`, `getHealthRatio()/getHealthScale()`, `getOverheadText()`, `getOrientation()`, `getComposition()`/`getTransformedComposition()`, `getId()`, `getIndex()`, `getName()`, `getCombatLevel()`, `getLogicalHeight()`, `getCanvasTilePoly()`, `getCanvasTextLocation()`, `getConvexHull()`).
- `getConvexHull()`/`getModel()` need projected model vertices. Phase 4 delivers them as a renderer-side query, not as a per-frame cost.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--46-coordinates-and-perspective--apicoords-apiperspectivets"></a>
##### 4.6 Coordinates and Perspective — `api/coords/`, `api/Perspective.ts`

- `WorldPoint(x, y, plane)`: absolute tile coordinates with `distanceTo`, `isInArea`, `dx/dy`, `getRegionID`, `fromLocal`, `fromRegion`, and `fromLocalInstance` (instance template lookup; we already have instance support in the scene).
- `LocalPoint(x, y, worldView)`: 128 fine units per tile, relative to the scene/world-view base, with `fromWorld(client|worldView, WorldPoint)` and `getSceneX/Y`. **Phase 2 spike:** confirm the scene base our renderer uses for local coords. `OverlayUpdateArgs` mixes "world tile units" and fine units.
- `Perspective.localToCanvas`, `getCanvasTilePoly`, `getCanvasTileAreaPoly`, `getCanvasTextLocation`, `getCanvasImageLocation`, `getCanvasSpriteLocation`, `getTileHeight`, `localToMinimap`, `worldToMinimap`. Built on the existing projection (`OverlayUpdateArgs.helpers.worldToScreen`, `getTileHeightAtPlane`, `getMinTileHeightInRadius`), exposed through `ClientImpl`, and cached per frame. The ~15 ad-hoc projection helpers in `render/` move behind this API over time.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--47-overlays--clientruneliteclientuioverlay"></a>
##### 4.7 Overlays — `client/runelite/client/ui/overlay/`

RuneLite overlays draw with immediate-mode `Graphics2D`. Our existing overlays are WebGL. The plan keeps both:

- A new **2D overlay canvas**: a transparent `<canvas>` (`CanvasRenderingContext2D`, DPR-aware) stacked above the GL canvas inside `GameContainer`. It is cleared and redrawn every rendered frame, after the GL present (`RenderPhase.PostPresent` timing).
- `abstract class Overlay implements LayoutableRenderableEntity`: `render(g: Graphics2D): Dimension | null`, `setPosition(OverlayPosition)`, `setLayer(OverlayLayer)`, `setPriority(number|PRIORITY_*)`, `setMovable`, `setResizable`, `setSnappable`, `setPreferredSize`, `getBounds`, `addMenuEntry`, `drawAfterInterface(InterfaceID…)`, `drawAfterLayer`, `getName`, `getPlugin`.
- `OverlayManager.add/remove/removeIf/anyMatch`. The `OverlayRenderer` sorts by layer and priority and lays out the snap corners (`TOP_LEFT`, `TOP_CENTER`, `TOP_RIGHT`, `ABOVE_CHATBOX_RIGHT`, `BOTTOM_LEFT`, `BOTTOM_RIGHT`, `CANVAS_TOP_RIGHT`, `TOOLTIP`). `DYNAMIC` overlays and `ABOVE_SCENE`/`UNDER_WIDGETS` layers draw unpositioned. Clipping to the scene viewport reuses `SceneViewportRect`.
- Layers versus widgets: the GL widget pass draws over the scene, and a 2D canvas on top would cover interfaces. `ABOVE_WIDGETS`/`ALWAYS_ON_TOP` sit on the top canvas. `ABOVE_SCENE`/`UNDER_WIDGETS` go to a **second 2D canvas between the scene and widgets**, but only if the GL widget pass can composite above it. **Phase 1 spike:** verify how `widgets/gl` presents. If widgets cannot be layered over a DOM canvas, render `UNDER_WIDGETS` overlays into an `OffscreenCanvas` uploaded as a texture before the widget pass.
- Alt-drag to move and snap overlays, with positions persisted under `runelite.<overlayname>_preferredLocation`. This comes in Phase 5; until then overlays sit at their default snap corner.
- `components/`: `PanelComponent`, `LineComponent`, `TitleComponent`, `ProgressBarComponent`, `ImageComponent`, `SplitComponent`, `TextComponent`, `ComponentOrientation`, `ComponentConstants`.
- `OverlayUtil`: `renderPolygon`, `renderTextLocation`, `renderActorOverlay`, `renderTileOverlay`, `renderImageLocation`, `renderMinimapLocation`, `renderHoverableArea`, `renderPrayerOverlay`.
- `WidgetItemOverlay` (inventory/bank item tags): needs the item slot rects from `WidgetManager`. Comes in Phase 4.
- `TooltipManager` + `TooltipOverlay`: add a tooltip for this frame and render it near the mouse.
- `InfoBoxManager` + `InfoBox`/`Counter`/`Timer`: rendered by an `InfoBoxOverlay` in a snap corner. RuneLite's per-box sprites come through `SpriteManager`.

Our existing WebGL overlays (hitsplats, health bars, overhead text and so on) stay as they are; they are engine rendering, not plugins.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--48-javaawt-shim--clientruneliteawt"></a>
##### 4.8 java.awt shim — `client/runelite/awt/`

This is kept to the subset RuneLite plugins touch:
- `Color`: constructors `(r,g,b[,a])`, `(rgb[, hasAlpha])`, `getRed/Green/Blue/Alpha/RGB`, `brighter/darker`, `decode`, and the constants `WHITE BLACK RED GREEN BLUE YELLOW ORANGE CYAN MAGENTA PINK GRAY LIGHT_GRAY DARK_GRAY`. Also `ColorUtil` (`colorWithAlpha`, `wrapWithColorTag`, `prependColorTag`, `toHexColor`, `fromHex`).
- Geometry: `Point`, `Dimension`, `Rectangle` (`contains`, `intersects`, `union`), `Polygon` (`addPoint`, `contains`, `getBounds`), `Shape`, `Area` (union only), `geom.Rectangle2D`, `geom.Ellipse2D`, `geom.Line2D`, `geom.AffineTransform` (translate/rotate/scale).
- `BasicStroke(width)`, `Font(name, style, size)`, `FontMetrics` (`stringWidth`, `getHeight`, `getAscent`, `getDescent`) via `ctx.measureText`.
- `Graphics2D` over `CanvasRenderingContext2D`: `setColor/getColor`, `setFont/getFont`, `getFontMetrics`, `setStroke`, `drawString`, `drawRect/fillRect`, `drawPolygon/fillPolygon`, `draw(Shape)/fill(Shape)`, `drawLine`, `drawOval/fillOval`, `drawImage(BufferedImage, x, y, null)`, `translate`, `rotate`, `scale`, `getTransform/setTransform`, `setClip/getClip/clip`, `setRenderingHint` (accepted and ignored), `setComposite(AlphaComposite)` → `globalAlpha`, `create()/dispose()` via `save()/restore()`.
- `BufferedImage`: an `ImageBitmap`/`OffscreenCanvas` holder with `getWidth/getHeight`, plus `ImageUtil` (`loadImageResource`, `alphaOffset`, `luminanceOffset`, `resizeImage`, `outlineImage`).
- **Fonts:** `FontManager.getRunescapeFont()`, `getRunescapeSmallFont()` and `getRunescapeBoldFont()` must match RuneLite. Bundle the RuneScape TTFs RuneLite ships (`runelite-client/src/main/resources/net/runelite/client/ui/runescape*.ttf`) as `@font-face`, and keep the BSD notice.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--49-menus"></a>
##### 4.9 Menus

- `MenuEntry` (api interface) is a view over one row of `MenuState`'s parallel arrays, exposing `getOption/setOption`, `getTarget/setTarget`, `getIdentifier`, `getType()/setType(MenuAction)`, `getParam0/getParam1`, `getItemId`, `isDeprioritized/setDeprioritized`, `onClick(cb)`, `getNpc()/getPlayer()/getActor()`, `getWidget()`, `createSubMenu()`, `setForceLeftClick`.
- `MenuEntryAdded`: posted whenever an entry is inserted while the menu is built, the equivalent of RuneLite's `insertMenuItem` callback. **Phase 3 spike:** confirm whether world and widget menus all go through `MenuState` (`ui/menu/MenuState.ts`) or are also built as `SimpleMenuEntry[]` in `WorldMenuBuilder`/`widgets/menu`. Whichever path builds them, the event must see every entry once.
- `MenuOpened` (entries snapshot, `setMenuEntries` allowed), `PostMenuSort` (right after sort and before display; this is where the left-click swap lives), and `MenuOptionClicked` (posted at the top of `menuAction()` with `consume()`; a consumed click sends no packet). The existing `tests/menu-click-consumption.test.ts` covers the consume path.
- `client.createMenuEntry(idx)`, `getMenuEntries()`, `setMenuEntries()` and `getMenu()` run during the event cycle.
- Once Phase 4 ports `menuentryswapper` on the new events, `transformMenuEntries` is deleted.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--410-other-managers-phase-5-ordered-by-usage"></a>
##### 4.10 Other managers (Phase 5, ordered by usage)

| Service | Implementation |
|---|---|
| `ClientThread` | queue drained at end of client tick (20ms cycle) |
| `ItemManager` | `getItemComposition` (cache ObjType), `getItemPrice` (GE price we already use for ground items/market), `getItemStack`, `getImage(itemId, qty, stackable)` (render item icon via existing `ui/item` icon renderer into `BufferedImage`), `canonicalize` |
| `Notifier` | `notify(msg)` / `notify(Notification, msg)`: in-game chat message plus browser `Notification` (after permission is granted) plus optional sound/tray flash. Config lives in the `runelite` group as in RuneLite. |
| `ChatMessageManager` | `queue(QueuedMessage)`, `ChatMessageBuilder`; per-type chat colours from config |
| `ChatCommandManager` | `registerCommand("!kc", …)`. For a private server this is mostly local. |
| `SpriteManager` | `getSprite(id, file)`, `getSpriteAsync`, `addSpriteTo(button)` over cache sprite loader |
| `SkillIconManager` | skill icons as `BufferedImage` |
| `KeyManager`/`KeyListener`, `HotkeyListener`, `MouseManager`/`MouseListener`/`MouseWheelListener` | hooks into `InputManager` before game handling; `consume()` stops propagation. Wraps the existing `handleCameraKeys/Mouse/Scroll` |
| `ClientToolbar` + `NavigationButton` | becomes `SidebarStore` entries (`ClientSidebarPluginDefinition` is already this shape); `panel` is a React component |
| `ChatboxPanelManager` | `openTextInput(prompt).onDone(cb).build()` over the CS2 input dialog we already have |
| `WorldMapPointManager` | pins on `game/worldMap` |
| `ScheduledExecutorService` | `schedule`, `scheduleAtFixedRate`, `submit` over timers |
| `Gson`/`OkHttpClient` | `JSON` / `fetch`, with a tiny `Gson` shim (`toJson`/`fromJson`) so ported config parsing compiles |

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--411-bootstrap--clientruneliteclientrunelitets"></a>
##### 4.11 Bootstrap — `client/runelite/client/RuneLite.ts`

This constructs the singletons and the injector, binds `impl/` emitters to engine sources, loads core plugins, mounts the overlay canvases, and registers the hub panel. `OsrsClient` calls `RuneLite.start(this)` once its stores exist. Afterwards it no longer constructs or references any plugin by name.

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--5-event-source-map"></a>
#### 5. Event source map

Each emitter lives in `impl/events/<area>.ts` and subscribes to an existing engine source. **Core only gets generic hooks.** Where no hook exists, add a listener set (as in `network/serverConnection/state.ts`) or a single callback list, never plugin-specific code.

| Event | Source in our engine | Notes |
|---|---|---|
| GameTick | `state.tickListeners` (`handlers/authTick.ts`) | Must fire **after** the tick's PLAYER_SYNC / NPC_INFO / var / inventory packets have been applied, as RuneLite's does. Verify packet order. If the tick packet arrives first, defer posting to the end of the server tick batch. |
| ClientTick, BeforeRender, PostClientTick | client cycle loop (`render/render/tick*.ts`) and frame start | ClientTick is the 20ms cycle, not the render frame |
| GameStateChanged | `GameStateMachine` transition listener | Uses the mapped RuneLite enum |
| ChatMessage | message ingest **before** it reaches chat history | Mutable (`setMessage`, `getMessageNode().setValue`), then `refreshChat()`. Needs a pre-insert hook, not `subscribeChatMessages` (which runs after). |
| VarbitChanged | `VarManager.onVarpChange` → change to a listener list | One event per varp (`varbitId = -1`), plus one per varbit backed by that varp whose value changed. Needs a varp→varbits reverse index built once from `VarBitTypeLoader`. |
| VarClientIntChanged / VarClientStrChanged | VarManager varc setters | |
| ConfigChanged, ProfileChanged, RuneScapeProfileChanged | ConfigManager; login account change | |
| ItemContainerChanged | `inventoryListeners`, `bankListeners`, equipment source (verify), trade/shop if needed | `InventoryID` ids (93 inv, 94 worn, 95 bank). Container object is a snapshot with `getItems()`, `getItem(slot)`, `count(id)`, `contains(id)`. |
| StatChanged | `skillsListeners` (snapshot + delta) | One event per changed skill: `(skill, xp, level, boostedLevel)` |
| NpcSpawned / NpcDespawned / NpcChanged | `NpcUpdateDecoder` add/remove/transform | Wrapper lifecycle §4.5 |
| PlayerSpawned / PlayerDespawned / PlayerChanged | `PlayerSyncManager` add/remove/appearance | |
| AnimationChanged, GraphicChanged, InteractingChanged, OverheadTextChanged, HitsplatApplied, ActorDeath | `PlayerSyncActions`, `NpcUpdateDecoder`, `HitsplatFlushController` | |
| ItemSpawned / ItemDespawned / ItemQuantityChanged | `GroundItemStore` diff on `groundItemListeners` | Provides `TileItem` and `Tile` |
| GameObject/WallObject/GroundObject/DecorativeObject Spawned/Despawned | scene build plus `getWorldLocChanges`/loc-change packets | Phase 4. Scene build posts a spawn for every loc in the scene, as RuneLite does on region load. |
| WorldViewLoaded / WorldViewUnloaded | scene rebuild (`subscribeRebuildRegion/Normal/WorldEntity`) | |
| WidgetLoaded / WidgetClosed | `WidgetManager.openSubInterface` / `closeSubInterface` | |
| ScriptPreFired / ScriptPostFired | `Cs2Vm.execute` entry/exit (+ `runScriptEvent`) | Only post when a subscriber exists (VM hot path) |
| ScriptCallbackEvent | needs RuneLite's patched rs2asm scripts (64 in `runelite-client/src/main/scripts`), which call opcode `runelite_callback` | Phase 6: add the opcode to `Cs2Vm` and an rs2asm→cache-script override loader. Until then, plugins depending on it (chat timestamps, bank tags, etc.) are out. |
| MenuEntryAdded, MenuOpened, PostMenuSort, MenuOptionClicked | §4.9 | |
| CommandExecuted | `handleClientCommand` path (`::cmd`) | |
| FocusChanged | window `focus`/`blur` | |
| ClientShutdown | `beforeunload` | |
| PluginChanged, OverlayMenuClicked | PluginManager, overlay menus | |

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--6-phases"></a>
#### 6. Phases

Each phase ends with real RuneLite plugins ported unchanged except for the conventions in §3. This "canary" proves the shape. The ported plugin's Java source is diffed against the TS port during review; any change that isn't in the §3 table is either a gap in the API, fixed in the API, or written down as a known deviation in §8.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-0-scaffolding-small"></a>
##### Phase 0: scaffolding (small)
- `client/runelite/{api,awt,client,impl}` folders, the `@runelite/*` aliases in tsconfig plus craco webpack alias, and a check that `tsx` tests resolve them.
- `scripts/gen-gameval.ts`: parses `runelite-api/src/main/java/net/runelite/api/gameval/*.java` and writes `client/runelite/api/gameval/*.ts`. The files are committed, and the script header records the RuneLite commit they came from.
- `scripts/runelite-api-coverage.ts` (§9).
- **Done when:** aliases resolve in the webpack build and in `yarn test`; `ItemID.ABYSSAL_WHIP === 4151` in a test.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-1-core-plugin-runtime"></a>
##### Phase 1: core plugin runtime
- `EventBus`, `Plugin`, `PluginDescriptor`, `PluginManager`, `inject`, `ConfigManager` + descriptor DSL, generated `ConfigPanel`, `PluginListPanel` (the new plugin hub), legacy-config migration shim.
- `RuneLite.start()` bootstrap; `ClientPluginManager` iterates enabled plugins.
- Events: GameTick, ClientTick, BeforeRender, GameStateChanged, ConfigChanged, PluginChanged, CommandExecuted, FocusChanged.
- Client tier: `getGameState`, `getTickCount`, `getGameCycle`, `getCanvas*`, `getMouseCanvasPosition`.
- 2D overlay canvas plus `Overlay`/`OverlayManager`/`OverlayRenderer` (snap corners, no dragging), the `awt` shim, `Graphics2D`, `FontManager`, `PanelComponent`/`LineComponent`/`TitleComponent`, `TooltipManager`.
- **Spikes:** overlay layering against the GL widget pass (§4.7) and GameTick ordering (§5).
- **Canaries:** `fps` (a trivial overlay; it uses its own frame counter, not the engine's) and `mousehighlight` (tooltips, which need `MenuEntry` read access, so stub `getMenuEntries` read-only here).
- **Tests:** `tests/runelite-eventbus.test.ts` (register by method name, priority, an exception isolated to one subscriber, unregister), `tests/runelite-config.test.ts` (defaults, serialisation round-trip for Color/enum/number/bool, ConfigChanged, legacy migration), `tests/runelite-plugin-manager.test.ts` (enable/disable lifecycle and persistence).

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-2-game-state-api"></a>
##### Phase 2: game-state API
- `ClientImpl` tier 1, `WorldPoint`/`LocalPoint`/`Perspective` (tile poly, text location, minimap), `Skill`, `ItemContainer`, `InventoryID`, `Widget` (read-only: `getBounds`, `isHidden`, `getChildren`, `getText`, `getItemId`, `getSpriteId`, `getCanvasLocation`).
- Events: VarbitChanged, VarClientInt/StrChanged, StatChanged, ItemContainerChanged, ChatMessage (pre-insert, mutable), WidgetLoaded/WidgetClosed.
- `ClientThread`, `ChatMessageManager`, `Notifier`, `InfoBoxManager` + `InfoBoxOverlay`, `SpriteManager`, `SkillIconManager`, `ItemManager` (composition, price, icon image).
- **Canaries:** `boosts` (StatChanged, InfoBox, overlay), `regenmeter` (VarbitChanged, ItemContainerChanged, widget-anchored overlay), `tileindicators` (Perspective tile polys).
- **Migrate:** `vengeancetimer`, `attacktimer` and `statustimer` become `Timer` InfoBoxes or overlays on the new API, and their hand-wired varbit and packet pokes are removed from `OsrsClient`.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-3-actors-and-menus"></a>
##### Phase 3: actors and menus
- `NpcImpl`/`PlayerImpl` with stable identity, `NPCComposition`, `Actor` getters (convex hull deferred to Phase 4, `getCanvasTilePoly` now).
- Events: Npc/Player Spawned/Despawned/Changed, AnimationChanged, GraphicChanged, InteractingChanged, HitsplatApplied, OverheadTextChanged, ActorDeath.
- Menus: `MenuEntry` view, `MenuEntryAdded`, `MenuOpened`, `PostMenuSort`, `MenuOptionClicked` with `consume()`, `createMenuEntry`/`setMenuEntries`.
- `KeyManager`, `MouseManager`, `HotkeyListener`, `Keybind` config type.
- **Canaries:** `idlenotifier` (actor and anim events, Notifier), `npchighlight` (spawn tracking, MenuEntryAdded tagging, tile and outline overlays; outline waits for Phase 4), `opponentinfo` (InteractingChanged, health ratio, `ScriptPostFired`, which is cheap to add here).

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-4-scene-items-widget-overlays-and-migrating-our-plugins"></a>
##### Phase 4: scene, items, widget overlays, and migrating our plugins
- Tile/Scene API (`Tile`, `getSelectedSceneTile`, `TileItem`), ItemSpawned/Despawned/QuantityChanged, GameObject/Wall/Ground/Decorative spawn events, WorldViewLoaded/Unloaded.
- `Actor.getConvexHull()`/`getModel()` via a renderer-side projected-hull query, and `ModelOutlineRenderer` (RuneLite's outline). This could reuse the outline from `InteractHighlightOverlay`.
- `WidgetItemOverlay`.
- **Replace our hand-written plugins with ports of RuneLite's:** `grounditems`, `groundmarkers` (replaces `tilemarkers`), `menuentryswapper` (replaces `menuswapper`), `interacthighlight` (RuneLite has the same plugin). Each keeps its legacy-config migration. Delete the old folders and the plugin fields on `OsrsClient` (the per-plugin sidebar panels and `syncSidebarPlugins` are already gone, replaced by `ClientToolbar`).
- **Keep, moved onto `Plugin`:** `hd`, `firstperson`, `gameframe317`, `editmode`, `notes`, `rememberlogin`, `splitprivatechat`, `animationsmoothing`. These are ours; they get `Plugin` lifecycle and generated config, not a RuneLite port.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-5-polish-and-parity"></a>
##### Phase 5: polish and parity
- Overlay dragging, snapping and resizing, persisted positions, overlay right-click menus (`OverlayMenuEntry`), and `drawAfterInterface`/`drawAfterLayer`.
- RS-profile-scoped config, `ProfileChanged`, a config export/import that accepts RuneLite's `settings.properties` format for groups we support.
- `ChatboxPanelManager`, `ChatCommandManager`, `WorldMapPointManager`, `ScheduledExecutorService`, the `Gson` shim.
- **Done:** `ClientToolbar`/`NavigationButton` (`client/runelite/client/ui/`), with a React component as the `PluginPanel`.
  - Plugins add their button in `startUp()` and remove it in `shutDown()`: the hidden `ConfigPlugin` (the plugin hub, priority 0), Notes and Menu Entry Swapper.
  - The sidebar (`client/game/sidebar/Sidebar.tsx`) draws whatever is in the toolbar: a rail beside the game and the open panel, docked (the game narrows) or over the game (`RuneLiteConfig.sidebarMode`).
- **Canaries:** `xptracker` (side panel, RS profile, StatChanged), `statusbars`, `entityhider` (needs a render-side hide hook; this checks the `DrawCallbacks`-style extension).

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--phase-6-harder-parity-and-external-plugins-optional-decide-later"></a>
##### Phase 6: harder parity and external plugins (optional, decide later)
- `ScriptCallbackEvent`: the `runelite_callback` opcode in `Cs2Vm` plus loading RuneLite's patched `.rs2asm` scripts as overrides (an assembler is needed).
- Dynamic plugin loading (an ESM `import()` from a URL, i.e. a JS "plugin hub"). This needs a trust model before it ships: plugins run with full page access, so start with a curated list we build, never arbitrary URLs.

---

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--7-testing-approach"></a>
#### 7. Testing approach

- All tests are `tsx` scripts in `client/tests/` and get picked up by `scripts/run-tests.mjs` automatically.
- Event emitters are tested by driving the engine source (for example, calling the varp setter or pushing a fake `InventoryServerUpdate` through `state.inventoryListeners`) and asserting the posted events.
- Canary ports each get one smoke test: construct the plugin with a fake `Client` built from the same `impl/` classes over seeded stores, post events, and assert overlay/infobox/notifier output. `Graphics2D` is tested against a recording fake context.
- The user does all in-game verification. Each phase's PR lists the in-game checks to do: canary visible, settings persist across reload, toggling in the hub starts and stops the plugin.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--8-known-deviations-and-open-questions"></a>
#### 8. Known deviations and open questions

1. **No decorators.** The `inject()`, `ConfigGroup()` and `static descriptor` forms cover the gap. If we later turn on TS decorators in craco, we can add `@Subscribe`/`@Inject` as sugar without breaking ports.
2. **Threading.** RuneLite separates the client thread from the EDT and executors; we have a single thread. Ports that block (`Thread.sleep`, sync HTTP) need to become `async`. `ClientThread.invoke` returning `boolean` for retry is kept as-is.
3. **Swing panels** become React; plugins with panels (xptracker, loot tracker, notes) need manual porting there.
4. **GameTick ordering** (§5): this must be RuneLite-exact or tick-based plugins drift by a tick.
5. **Overlay layering** under widgets (§4.7) may cost a texture upload per frame if the DOM approach doesn't work.
6. **Convex hulls/outlines** need renderer cooperation, and the per-frame cost must stay at zero when unused.
7. **Varbit event volume:** posting per changed varbit needs the reverse index; posting must be skipped entirely when there are no `onVarbitChanged` subscribers.
8. **`ScriptCallbackEvent`** stays unavailable until Phase 6, and the coverage report flags plugins that need it.
9. **Server parity:** some RuneLite plugins assume OSRS server behaviour (packets, varbits) that our server may not emulate. That is a server gap, tracked separately, not an API gap.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--9-tracking-how-close-to-11-are-we"></a>
#### 9. Tracking "how close to 1:1 are we"

`scripts/runelite-api-coverage.ts` parses `../runelite`:
- `Client.java` method names vs. methods on our `Client` interface
- `api/events/*.java` vs. `client/runelite/api/events/*.ts`
- injected service types used by plugins vs. tokens in our injector
- for each RuneLite plugin, the set of events/services/`client.*` methods it uses, so it can report which plugins are **portable now** (all dependencies implemented) and what each of the rest is missing.

Output: a markdown table in `docs/runelite-api-coverage.md`, regenerated in each phase PR. The "portable now" count is the headline metric.

<a id="doc-tsps-upstream-docs-runelite-api-shape-implementation--10-out-of-scope"></a>
#### 10. Out of scope

- Running RuneLite's Java code or reading `.jar` plugins.
- Jagex-account/launcher features, RuneLite session/accounts sync, the RuneLite plugin hub backend.
- Server-side plugins (the server has its own system).
<!-- end-source-document: tsps-upstream/docs/RuneLite_API_shape_implementation.md -->

---

<a id="doc-tsps-upstream-docs-sailing-osrs-reference"></a>
## tsps-upstream/docs/sailing-osrs-reference.md

<!-- source-document: tsps-upstream/docs/sailing-osrs-reference.md -->
<a id="doc-tsps-upstream-docs-sailing-osrs-reference--sailing-osrs-reference"></a>
### Sailing: OSRS reference

What live OSRS actually sends for Sailing, recorded so the tsps implementation can match it. It complements [the Sailing design](#doc-tsps-upstream-docs-sailing): that page says what tsps does and why; this one records the observed facts it is built from.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--sources"></a>
#### Sources

- **Live captures** (rsprox, 2026-09-30): boarding the raft, skiff and sloop at The Pandemonium; Junior Jim's Recover-boat and Customise-boat; opening the raft's cargo hold. Names below are rsprox's symbolic names.
- **OSRS Wiki**: [Boat](https://oldschool.runescape.wiki/w/Boat), [Raft](https://oldschool.runescape.wiki/w/Raft), [Shipwright](https://oldschool.runescape.wiki/w/Shipwright).
- **The cache**: tsps runs revision 237 (2026-03-25). The captures are from a newer live revision, so **check every id against the cache before using it**. For example, 29506, 29517 and 29527 are the raft, skiff and sloop's second sail piece live, but fairy rings in revision 237.

Coordinates are written as rsprox does, `level_squareX_squareY_localX_localY` (map square 64 tiles; tile = square × 64 + local). "Deck tile (x, y)" means a tile relative to the boat's template zone.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--boat-types"></a>
#### Boat types

| | Raft | Skiff | Sloop |
| --- | --- | --- | --- |
| Boat type id (varbit 19137) | 0 | 1 | 2 |
| World entity config | 1 | 2 | 3 |
| World entity size (x × z) | 8 × 8 | 8 × 8 | 8 × 16 |
| Sidepanel boat type (varp 5117) | 8110 | 8111 | 8112 |
| Sidepanel facility slots (937:25 end) | 16 | 40 | 64 |
| HP-bar NPC on deck | `boat_hp_npc_tiny` 15186 | `boat_hp_npc_small` 15187 | `boat_hp_npc_medium` 15188 |
| Player placed on (deck tile, level) | (3, 4), 1 | (4, 4), 1 | (3, 8), 1 |
| Spawn at The Pandemonium | (3074, 2987) | (3075, 2987) | (3075, 2987) |

- Every boat spawns with fine offset 64, 64 and angle 1024 (north).
- **The cache's world entity types:**
  - basePlane is 1 for all three;
  - base offsets are raft (−64, −64), skiff (0, −64) and sloop (−64, 0);
  - bounds are raft 128×384, skiff 256×640, and sloop 384×1280 starting at y −256.

  A boat's centre in its deck frame is size × 64 + base offset: raft (448, 448), skiff (512, 448), sloop (448, 1024). Its hull is the bounds rectangle.
- **Walkable deck tiles:** the template's level-1 collision gives them. The raft has x 3, y 2-4. The skiff has x 3-4, y 2-5. The sloop has x 2-4, y 5-10, with a solid stern below.
- The wiki's per-boat facts (level, cost, size, crew, hotspots) are on the [Boat](https://oldschool.runescape.wiki/w/Boat) page.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--deck-templates"></a>
##### Deck templates

Every deck is copied from map square (60, 100), laid out as a grid:

- **The column is the hull material**, 8 tiles per tier: local x = 8 × tier (wooden 0, oak 1, teak 2, mahogany 3, camphor 4, ironwood 5, rosewood 6).
- **The row is the boat type**: raft y = 56, skiff y = 48, sloop y = 32 (two zones, 32 and 40).

| Seen | Template zone(s) |
| --- | --- |
| Raft, wooden hull | (0_60_100_0_56) |
| Skiff, teak hull | (0_60_100_16_48) |
| Skiff, camphor hull | (0_60_100_32_48) |
| Sloop, camphor hull | (0_60_100_32_32), (0_60_100_32_40) |

Upgrading a hull rebuilds the boat from the new column: the capture shows the world entity deleted, re-added and rebuilt from the camphor template.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--raft-deck"></a>
##### Raft deck

Deck tile (x, y), all on level 1, rotation 0:

| Loc | Id | Tile | Shape | Notes |
| --- | --- | --- | --- | --- |
| Helm | 59554 (`sailing_boat_steering_kandarin_1x3_wood`) | (3, 4) | 10 | Navigate / Stop-navigating / Escape |
| Sail | 59530 (`sailing_boat_sail_kandarin_1x3_wood`) | (3, 3) | 10 | |
| Linen sail | 29506 live (`sailing_boat_sail_kandarin_1x3_linen`) | (3, 5) | 10 | a fairy ring in revision 237: not placed |
| Cargo hold | 60245 (`sailing_boat_cargo_hold_regular_raft`) | (3, 2) | 10 | |
| Invisible | 32545 | (2, 2), (2, 3), (4, 2), (2, 5), (4, 5) | 22 | |
| Gulls sound | 58569 | (4, 3) | 22 | |
| Water loop sound | 58526 | (2, 4) | 22 | |
| Crashing waves sound | 58568 | (4, 4) | 22 | |

The HP-bar NPC stands on deck tile (3, 3), level 1.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--skiff-and-sloop-decks-as-captured-upgraded-boats"></a>
##### Skiff and sloop decks (as captured, upgraded boats)

Deck tile relative to each template zone, level 1 unless noted. Part ids depend on the part's tier.

- **Skiff** (keel steel, trim camphor, helm oak, sail teak):
  - level 0: keel 59518 (2, 1), trim 59628 (1, 1);
  - helm 59579 (4, 6); sail 59539 (4, 4); canvas sail 29517 live (4, 5);
  - salvaging hook 60493 (3, 2, rotation 1); inoculation station 59704 (3, 1); cargo hold 60259 (4, 1);
  - sound and invisible locs around the edges.
- **Sloop** (keel adamant, trim camphor, helm mahogany, sail camphor), from zone (60_100_32_32):
  - level 0: keel 59527 (1, 3), trim 59646 (1, 2), and hull gunports 60696, 60700, 60698 and 60702;
  - helm 59607 (3, 11); sail 59548 (4, 10); canvas sail 29527 live (4, 11);
  - salvaging station 59701 (4, 6, rotation 1); salvaging hooks 60505 (2, 5) and 60506 (4, 5, rotation 3); inoculation station 59706 (2, 4); cargo hold 60273 (4, 4).
- **In the shipyard** (Customise-boat), empty facility hotspots show placeholders 59664-59667 (skiff).

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--stats"></a>
##### Stats

| | Raft (wooden) | Skiff (teak) | Skiff (camphor) | Sloop (camphor) |
| --- | --- | --- | --- | --- |
| Max HP (19177) | 20 | 120 | 180 | 260 |
| Base speed (19250) | 192 | 256 | 320 | 320 |
| Speed cap (19251) | 320 | 384 | 384 | 448 |
| Speed boost duration (19256) | 20 | 24 | 24 | 30 |
| Acceleration (19257) | 64 | 64 | 64 | 128 |
| Defence (varp 5147) | 1 | 30 | 50 | 55 |
| Armour (varp 5148) | 0 | 300 | 300 | 600 |

- **Speeds are fine units (1/128 tile) per tick.** 192 is 1.5 tiles, 256 is 2 and 320 is 2.5, matching the wiki's base speed for wooden, teak and camphor hulls.
- **Per-style defence**, varps 5159-5165 (stab, slash, crush, magic, heavy, standard and light ranged): raft 24, 11, 6, 9, 4, 13, 26; skiff (camphor) 103, 76, 54, 66, 34, 68, 111.
- **Resistances** (19248 storm, 19249 rapids, 19252 fetid water, 19253 crystal-flecked): 1 or 2 on the skiff and sloop, none on the raft.
- Current HP (19181) is separate from max: the captured raft was at 13 of 20.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--boarding"></a>
#### Boarding

The gangplank's Board (op 1) opens the boat selection interface when you own several boats; with one boat it boards straight away. After choosing, in order:

1. Fade out: interface 174 on the atmosphere overlay, script 948 `[0, 255, 0, 0, 15]`; minimap state 2.
2. Message (type spam): **"You board your boat."**
3. Varbits:
   - `sailing_boat_spawned` 19121 = boat slot (from 1);
   - `sailing_previous_boat_data_slot` 19130 = slot;
   - `sailing_previous_boat_type_id` 19143 = boat type;
   - `sailing_boarded_boat` 19136 = 1;
   - `sailing_boarded_boat_type` 19137 = boat type;
   - `sailing_boarded_boat_world` 19122 = world;
   - the boat's name, packed into 19149 and 19150;
   - `sailing_player_is_on_player_boat` 19104 = 1;
   - `sailing_sidepanel_player_role` 19233 = 10 (captain);
   - `sailing_last_personal_boat_boarded` 18554 = slot;
   - `sailing_preloaded_anims` 19118 = 1.
4. Sidepanel values: varp 5117 (boat type), move mode 19175 = 4 (moored), players on board 19235 = 1, helm status 19176 = 1, max and current HP, facility tiers and hotspots, repair kits (raft 10), and the stats above.
5. `WORLDENTITY_INFO` adds the boat. The player teleports onto the deck (level 1). `REBUILD_WORLDENTITY` builds the deck from the template, then the HP-bar NPC and the deck locs are added.
6. Sound 10754. Script 8776 `[name, 1, "", 1]`, script 915 `[0]`, and the sidepanel (937) opens on the combat tab.
7. Sidepanel events:
   - 937:1 slots 0-12, op 1;
   - 937:25 slots 0 to the boat's facility slots, ops 1-4;
   - 937:26 same slots, target NPC;
   - 937:20 same slots, op 1;
   - 937:29 slots 0-11, op 1;
   - 937:10 slots 0-1, target player;
   - 937:38 slots 0-3, op 1.
8. The sails play their "down" animation: raft 13367, plus 13875 on the linen sail.
9. Fade in: script 948 `[0, 0, 0, 255, 15]`, minimap state 0.

**Disembarking** (captured at the shipyard's gangplank):
- the player teleports back ashore;
- varbits 19136, 19137, 19122 and 19104 go to 0;
- the helm plays its inactive animation (13345 on the skiff);
- script 8778 `["", 1, "", 1]` runs;
- players on board 19235 goes to 0.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--per-boat-varbits"></a>
#### Per-boat varbits

The server describes every owned boat to the client at login (live login capture) and whenever one changes. Each boat slot has a block of varbits, 38 ids apart: slot 1 starts at 19258, slot 2 at 19296, up to slot 5 at 19410.

| Offset | Varbit (slot 1) | Value |
| --- | --- | --- |
| +0 | 19258 `owned` | 1 |
| +1 | 19259 `type` | raft 0, skiff 1, sloop 2 |
| +2 | 19260 `port` | the dock's port id (0 = Port Sarim, 1 = The Pandemonium); 255 bottled, 254 capsized, 253 lost at sea (cache script 8997) |
| +3 | 19261 `bottle_previous_port` | 255 |
| +4 | 19262 `facilities_unaltered` | 1 |
| +5, +6, +7 | 19263-19265 `name_1`-`name_3` | the name's three words |
| +8 to +11 | 19266-19269 keel, hull, sail, steering | part tiers (0 on a raft) |
| +15 + n | 19273 + n `hotspot_n` | the facility at hotspot n (raft hotspot 0 = 15) |
| +26 | 19284 `trim` | trim tier |

- **HP:** stored HP is 19458 + slot and stored max HP is 19463 + slot.
- **Also at login:**
  - varbit 18166 stays 0. Cache scripts 607/633 read it through 8950(23), and at 1 they lock Sailing: the skills tab fades it and the customisation answers every Build with "You cannot build that at the moment." (script 8807 via 9022). Its name isn't known;
  - `sailing_intro` (18314): 50 once the intro (The Pandemonium) is done. Script 9022 needs it at 50+ (on a members world) before the customisation allows any Build;
  - the last dock, standard dock and mooring point (19145-19147);
  - where the boat was spawned: slot, fine x/z, angle (19121, 19141, 19142, 19129);
  - `last_personal_boat_boarded` (18554) and `previous_boat_data_slot` (19130);
  - the cargo hold warning (19123).

**Boat names** are three words (cache scripts 9085 and 9088):
- Word *n* (1-based, 0 = none) is entry *n* − 1 of the string list in db row 8545, 8546 or 8547 (table 187, column 1). The words are joined with spaces.
- With no words, the name is "Boat" (row 8547's column 0).
- Row 8545's list is empty in revision 237. The raft in the capture, words 0, 32, 57, is "Extreme Pride".

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--boat-selection-interface-934"></a>
#### Boat selection (interface 934)

One interface serves the gangplank and Junior Jim. Varbit 18553 sets the mode, and varp 5005 is the current dock's db row (8588 = The Pandemonium):

| Mode (18553) | Opened by |
| --- | --- |
| 2 | Customise-boat |
| 3 | Board (gangplank), when you own more than one boat |
| 5 | Recover-boat |

**Opening:**
1. The server sends the bank (95) and every cargo hold (963-967).
2. Script 2524 `[-1, -3]`, then 934 opens as the main modal.
3. Script 8621 initialises it.
4. 934:5 gets slots 1-5, with pause button and op 1.
5. `busy` is set to 1.

**Choosing:** a choice is a pause-button resume on 934:5 whose slot is the boat's slot + 1. The mode and dock vars go back to 0 and -1, script 2158 (`chatdefault_restoreinput`) gives the chatbox its input back, and the interface closes. Without 2158 you can't type in chat afterwards.

**Texts in its scripts** (shown by the client for boats you can't choose):
- "You can't choose that boat at the moment."
- "That boat is already at the nearby dock. There's no need to recover it."
- "That boat is already docked at …"
- "That boat does not have anything stored in its cargo hold."

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--buying-a-boat-junior-jims-buy-boat"></a>
#### Buying a boat (Junior Jim's Buy-boat)

Buy-boat opens the data-driven shop "omnishop", not a special interface:
- **Interfaces:** 819 as the main modal and 806 as the side modal.
- **Scripts:** 7140 `[8548, -1, -1]` and 7246 `[8548]`.
- **Shop varps:** `omnishop_selected_id` (3869) is -1 and `omnishop_lastshop` (3874) is 8548.
- **Shop definition:** db row 8548 (`sailing_boat_shop`, table 39): "Boat Emporium", entries 8549-8551 and the button text "Buy".
- **Events:**
  - list 819:38 slots 0-36, ops 1-6 and 10;
  - side items 806:0;
  - info 806:1;
  - buy, examine and request-info triggers 819:4, 819:3 and 819:5 (script triggers);
  - dropdown 819:41.

Buying itself hasn't been captured yet.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--ports-and-docking"></a>
#### Ports and docking

From a capture of docking at Port Sarim's buoy and disembarking at its gangplank. The ports are the cache's, in `server/data/definitions/sailing-ports.json`.

**Ports** are db table 194: port id (column 0), name (1), the name in a sentence ("the Pandemonium", 2), the Sailing level to dock there (4), and a requirement for some (5, not used yet). There are 59 rows. Ids 32 and up are islands ("mooring points"), whose gangplanks are scenery rather than jetty planks.

**Every port has a docking buoy and a gangplank**, placed by the cache map:
- the buoy is loc **59769 + port id**, "Buoy" with op "Dock";
- the gangplank is loc **59835 + port id**, a multiloc on varbit 19104 (Board / Disembark; ports also have Board-previous and Board-friend).

Red Rock and Last Light have neither, so they're left out.

**The landing** is the one walkable tile beside the gangplank, on the jetty. Both captured ports land one tile west of their plank: Port Sarim (3050, 3193) and the Pandemonium (3069, 2987). Every other port has exactly one walkable neighbour, which matches the plank's rotation (3 west, 0 north, 1 east, 2 south) except at Entrana. Islands, where every neighbour is walkable, use the rotation.

**The mooring** (where a boat is placed when it isn't where it was left) is the Pandemonium's captured one, applied to every port: out from the plank on the sea side, 4 tiles for a raft and 5 for a skiff or sloop, side-on (angle 1024 for an east-west plank, 512 for a north-south one).

**Dock** (op 1 on a port's buoy, from the boat):
- the boat's per-boat `port` varbit becomes the port's id;
- `sailing_boarded_boat_last_dock` (19145) and `sailing_boarded_boat_last_standard_dock` (19146) become the port's id;
- "You dock the boat at Port Sarim. You will return here if you have to abandon your boat for any reason.", and sound 1794.

The player stays aboard and the boat stays where it is. At sea, the `port` varbit keeps the port the boat last docked at (it was 1, the Pandemonium, until the Dock).

**Disembark** at a port's gangplank, from the boat, here about 9 tiles away:
1. fade out;
2. next tick: "You disembark at Port Sarim." (spam filter), the boarded and sidepanel varbits cleared, the player moved to the landing, and sound 10754;
3. the tick after: fade in.

The boat stays where it was docked.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--recovery-junior-jim"></a>
#### Recovery (Junior Jim)

- **The fee is taken from the bank**, with the message "Payment has been taken from your bank." Recovery also brings back boats docked at other ports, not only sunk ones.
- **What was paid:** a raft 250 coins; a camphor sloop 60,000.
- **The boat's port varbit is set to this dock:**
  - raft `sailing_boat_1_port` 19260: from 0 to 1;
  - sloop `sailing_boat_3_port` 19336: from 26 (another port) to 1.

  So 0 seems to mean lost or sunk.
- **A Port Wizard next to Jim does the work.** One of Perrie, Peter, Petra or Paulie (15378-15381) appears at (3059, 2981):
  - teleports in: animation 715, spot animation 1299, sound 201;
  - says (overhead) "Another recovery? This won't take long...";
  - casts: animation 725, spot animation 3546 with delay 10, sound 10900 with delay 35;
  - teleports out: animation 714, spot animation 111, sound 200.
- **Dialogue:** Jim says "All done! The boat is now docked here at the Pandemonium." (chat head animation 568), and the player answers "Thanks!" (animation 567).
- Junior Jim is 14972 (multinpc 14975). He moves around (3058-3059, 2978-2980).

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--customisation-shipyard"></a>
#### Customisation (shipyard)

**Getting there:**
- Junior Jim's Customise-boat opens the boat selection (mode 2).
- Choosing a boat moves you to the shipyard, a normal map area in map square (32, 42), after a fade. You arrive at (2084, 2730).
- Your boat is shown at (2091, 2724), with fine offset (64, 0) and angle 1536 (east).
- The shipyard varbits are set: mode 19173 = 1, boat angle 19519 = 1536, fine-x offset 19520 = 1. The sidepanel describes the boat.
- The Shipyard Portal (59722) "Exit" returns you to (3058, 2980) at The Pandemonium. Its own gangplank (59719) boards the boat.

**Boat schematics (59718) "Modify":**
1. Varp 5190 is set to the boat type's row (8110-8112), and varbit 19525 to the boat's slot + 1.
2. Script 2524 `[-1, -3]`, then interface **939** opens as the main modal. Script 8809 initialises it.
3. 939:17 gets slots 0-50 with op 1 and script triggers.
4. Each option's preview is the part's **loc**. Script 8825 takes the loc id from the option's db row (script 9075, default 59660), its animation (9077) and its angle (9076), and passes the loc id to opcode 1214 (`cc_setmodel_loc`, model type 8). The client draws that loc's centrepiece model (shape 10) and never treats the id as a model id.
   - The angles come from table 188: the part's angles row (column 4 of its hull/keel/… row) holds `[boat size, offsetX, offsetY, xan, yan, zan, zoom]` tuples, and 9076 picks the one for the boat type's size (table 166 column 0). The skiff's hull is (-10, 0, 130, 1950, 0, 5000).
   - 9076 reads those tuples one value at a time: a packed db field's low 4 bits select one tuple element (1-based; 0 is the whole tuple).

**Build:** script 8834 calls `if_triggeroplocal` on 939:17 with the option row as one int argument.
- The live packet carried `A6 81 01 00`: a zigzag varint of row **8275**, the skiff's camphor hull.
- The server:
  1. takes the materials from the inventory;
  2. sets the part, with no refund of the old one;
  3. gives Construction XP;
  4. closes 939, clears varp 5190 and varbit 19525, and opens the message box (229) "With the help of some workers, you swap out the hull of your boat." with **no** "Click here to continue", then fades out;
  5. next tick, rebuilds the boat from its new template column;
  6. 4 ticks after the build, fades back in and reopens the message box, now with "Click here to continue". Continuing closes it and the fade overlay.
- The hull swap also moves the per-boat trim varbit with it (trim follows hull). Lower tiers can be built too (downgrades).

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--the-caches-sailing-tables"></a>
##### The cache's sailing tables

Everything a part is lives in db tables. tsps reads them at runtime (`CacheDefinitions.getDbRow` / `getDbTableRows`).

| Table | What | Columns used |
| --- | --- | --- |
| 166 | Boat types (rows 8110-8112, also the sidepanel boat type) | 18 recovery fee (raft 250, skiff 3,750, sloop 50,000); option lists by tier: 24 keels, 25 hulls, 26 sails, 27 helms, 29 trims; 31 facility hotspots |
| 178 | Hulls (raft "bases" 8264-8270, skiff 8271-8277, sloop 8278-8284) | 0 name, 7 Sailing, 8 Construction, 12 materials (item, count pairs), 13 stats row |
| 177 | Keels | 3 loc [coord, id, rotation, shape], 6 Sailing, 7 Construction, 11 materials, 12 stats row |
| 179 | Masts and sails | 15 loc [id, coord, rotation, shape], 6 Sailing, 7 Construction, 11 materials, 16 stats row |
| 181 | Helms | 6 loc [coord, id, rotation, shape], 9 Sailing, 10 Construction, 14 materials, 15 stats row |
| 164 | Part stats | 0 HP, 10 armour, 21 storm resistance, 22 rapids resistance, 24 base speed, 25 speed cap, 26 extra acceleration, 27 boost duration, 30 crystal-flecked immunity |
| 186 | Trims (cosmetic painted trims) | |
| 176 | Facilities (97 rows; some per boat size, such as each size's cargo holds and hooks) | 0 name, 6 loc (the first is placed), 8 preview angles row, 12 Sailing, 13 Construction, 17 materials, 22 category |
| 175 | What a facility hotspot allows | 2 facility rows, in order |
| 188 | Customisation preview angles | 0 `[boat size, offsetX, offsetY, xan, yan, zan, zoom]` tuples |
| 187 | Boat name words (rows 8545-8547) | |

**How a boat's stats come together:**
- HP = hull + keel.
- Armour = the keel's.
- Speed and speed cap = the hull's.
- Boost duration and storm resistance = the sails'. Acceleration = 64 + the sails' extra.
- Rapids resistance = the helm's.

These reproduce every captured boat.

**Construction XP isn't in the tables.** It comes from the wiki, and the camphor skiff hull's 881 matches the capture.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--facilities-shipyard"></a>
#### Facilities (shipyard)

From a capture of building and removing a range on a sloop in the shipyard.

**Hotspots** are table 166 column 31, one `[coord, a, b, hotspot row]` tuple each:
- The hotspot id is the tuple's index. The raft has 1 hotspot, the skiff 7 and the sloop 13; the sloop's 11 and 12 are its cannon spots.
- The coord is a template tile on the base-tier template. Its deck tile is the coord minus the boat's base template chunk × 8, the same frame as the other deck locs. Sloop hotspot 2 is deck (4, 9), level 1.
- The hotspot row (table 175) lists the facility rows it allows.
- `a` looks like the side: 1 west, 3 east, 0 on the centre line.
- Facing depends on the facility too. On the centre line everything faces 0 (cargo holds, the inoculation station). A salvaging hook on a west hotspot faces 1, out over the side. The range on east hotspot 2 ended at 1, facing in: OSRS sent it at 3 (`a`) and then twice at 1. So facilities that work over the side face `a` and the rest face `a` + 2. Placeholders face 1 on both sides.
- The facilities that work over the side are taken to be those with column 23 set (cannons, salvaging hooks, trawling nets, chum stations, wind and gale catchers). That's inferred from the hook and the range.
- `b` is unknown.

**What a hotspot holds** is one varbit value: the facility's **1-based position in the hotspot's list**, or 0 for empty. That fits every login value (raft cargo hold 15; skiff mithril hook 4, inoculation station 1, cargo hold 1; sloop salvaging station 6, adamant hooks 5, cargo hold 1) and the built range (1).
- Per boat: hotspots 0-10 at block offset +15 + n; hotspots 11 and 12 at 20207 + 4 × slot and the id after (cache script 8805).
- On the sidepanel: 19156 + n for 0-10, and 20185 and 20186 for 11 and 12 (script 8729).
- Building or removing sets `facilities_unaltered` (block +4) to 0, and it stays 0.

**Schematics:** some facilities and the top-tier parts show as "Unknown" in the customisation interface until their schematic is found (cache script 9078; varbit 1 or more = found). Salvaging stations 19544, gale catcher 19545, eternal braziers 19546, dragon hooks 19547, rosewood cargo holds 19548, dragon cannon 19549, top-tier hulls 19550, sails 19551, helms 19552, keels 19553, ballistic attractor 20227. Tsps sends them all as found at login, since finding schematics doesn't exist yet.

**Empty hotspots** show a "Facility hotspot" loc with op 1 **Build**, but only in the shipyard; at sea an empty hotspot shows nothing. Solid facilities (clip type ≠ 0, such as the range, cargo holds, inoculation station and cannons) block their deck tile; hooks and placeholders don't. The placeholder ids are: raft 59661 (inferred, not captured), skiff 59664 + n, sloop 59671 + n for 0-10, plus 60720 and 60721. Built facilities have op 5 **Modify**.

**Boarding in the shipyard:** the boat's own gangplank (59719, a multiloc on varbit 19104: 59721 Board, 59720 Disembark) teleports you straight onto the deck, level 1, at the boarding tile. There's no fade and no message; the boarded varbits and the sidepanel are set as at a dock. Disembark puts you back at (2086, 2724).

**Build on a hotspot:**
1. Sets varbit 19524 (`sailing_boat_customisation_hotspot_id`) to the hotspot, varp 5190 to the boat type row, varbit 19523 (`sailing_boat_customisation_type`) to **1**, and varbit 19525 to the boat slot + 1.
2. Opens interface 939 the same way as for parts: script 2524, the modal, 8809, the option events, 8809. The events cover 0-8 on a cannon spot and 0-12 on the range's hotspot.
3. Closing it resets 19523, 19524, 19525 and 5190.

**Building a facility:** the Build trigger carries the facility row (8512 for the range). The server:
1. resets the customisation varbits and closes 939;
2. plays animation 3676 (`human_poh_build`) and sound 938;
3. takes the materials (the range: 4 steel bars, 2 charcoal, 1 tinderbox);
4. gives **no XP**;
5. sets the hotspot varbits and `facilities_unaltered` 0;
6. replaces the placeholder with the facility's loc (range 59682) on the deck.

There's no message.

**Modify** (op 5) opens the chat menu (219, script 58) "How would you like to modify this facility?" with "Completely remove it.", "Replace it." and "Do nothing.". "Completely remove it." asks "Really remove it?" with "Yes." and "No.". On Yes:
- animation 3685 (`human_throw_away`) and sound 10753;
- the hotspot varbits go back to 0 and the placeholder returns;
- nothing is refunded.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--shipwreck-salvaging"></a>
#### Shipwreck salvaging

From captures of salvaging a small shipwreck with a sloop's adamant hook, deploying away from any wreck, and sorting at the sloop's salvaging station. The rest is the OSRS Wiki's (Shipwreck salvaging, each shipwreck's and each salvage's page), in `server/data/definitions/sailing-salvage.json`.

**Wrecks** are loc pairs: an active form with "Inspect" (60464 small, 60466 fisherman's, 60468 barracuda, 60470 large, 60472 pirate, 60474 mercenary, 60476 Fremennik, 60478 merchant) and a sunken form with no ops (the next id).
- The cache map places every wreck sunken: 16 small spots (two groups of 8), and the other types in groups of 6 (barracuda's 43 are strung out unevenly). The small group south-east of the Pandemonium is at about (3085-3132, 2928-2989).
- The server raises some of each group, sinks a wreck when its time is up, and raises another of the group (Wiki: "When one shipwreck sinks, another in the area immediately rises").
- Salvaging starts a wreck's despawn timer: small 2:30, fisherman's, barracuda, large and pirate 3:00, mercenary 3:15, Fremennik 3:45, merchant 4:00. When it sinks: "You salvage all you can from the shipwreck before it is reclaimed by the sea."

**Deploy** (op 1 on a salvaging hook):
- No wreck in range: "There are no shipwrecks within range of the salvaging hook." Nothing else.
- Otherwise: "You cast out your salvaging hook towards the shipwreck...", player animation 13576, and the hook loc plays 13573.
- 3 ticks later varbit `sailing_sidepanel_player_at_facility_n` (19193 + hotspot; 19200 for hotspot 7) goes to 1, and from then on every tick the player replays 13577 and the hook 13574.
- The first salvage came 10 ticks after the cast: "You reel in some salvage." (spam filter), the salvage in the inventory, and the wreck's XP (small 10).
- Players roll every 4 ticks (Wiki), against each wreck's success chart: per hook tier a `low`/`high` out of 256, interpolated by Sailing level (the standard skilling formula; small with a bronze hook is 50-100, with a dragon hook 67-135).

**Sort-salvage** (salvaging station: the boat facility 59699-59701, or a port's 60462/60463):
- "You begin sorting through your salvage...", animation 13599, sound 10864.
- Every 3 ticks one salvage is sorted: "You sort through the small salvage and find: 1 x Bones.", the loot in its place, sound 10860, and the salvage's XP (small 5.5; 5 and 6 alternate in the capture).
- The animation replays with each, with sound 10864 after the first and 10866 after the rest.
- With none left: "You have no more salvage to sort."
- Loot: each salvage's pre-rolls first (1 in n each), then its main table by weight.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--cargo-hold"></a>
#### Cargo hold

**The loc** is a multiloc (60245 on the raft), chosen by varbit 19134:
- 0 gives "Basic cargo hold" (60577) with Open / Deposit-all / Modify;
- 1 gives 60581, whose first op is Deposit-held (when carrying cargo).

**What it holds** (OSRS Wiki, Cargo hold):
- **Capacity:** by boat and hold tier. A basic hold has 20 slots on the raft, 30 on the skiff and 40 on the sloop; a rosewood hold has 120, 180 and 240.
- **Slots:** every item takes a slot, except that a stackable item's whole stack takes one.
- **Which items:** only the wiki's "Storable items": sailing capes and tools, salvage, courier crates, bounty items, repair kits, cannonballs, ship drinks, fish, fish offcuts and crates, and fishing gear. Noted items aren't accepted.
- **Recovery losses:** courier crates, bounty items, salvage, fish and full fish crates are lost when a shipwright recovers the boat.

**Opening it:**
1. Op 1 "Open". You walk next to the hold and face it.
2. Varp 5204 (`sailing_boat_cargohold_inv`) is set to the boat's inventory: 963 for slot 1, up to 967 for slot 5. That inventory is sent in full.
3. Sound 10907, then script 917 `[-1, -1]`.
4. Interface 943 opens as the main modal and 944 as the side modal.
5. Events:
   - 943:10 slots 0-239, ops 1-6 and 10;
   - 944:1 slots 0-27, ops 1-6 and 10, plus drag;
   - 943:18 slots 0-4, op 1.
6. Text and title: 943:5 shows the capacity ("20"), and script 227 sets the title to "Cargo Hold: <boat name>".
7. The `busy` varbit (12393) is 1 while it's open.

**Closing:** varp 5205 and `busy` go back to 0, and 944 then 943 close.

**Items:**
- **Withdraw** is an op on 943:10 at the hold slot. **Deposit** is an op on 944:1 at the inventory slot, and the item goes to the hold's first free slot.
- **Quantity:** the 1 / 5 / 10 / X / All buttons (943:20-24) set `depositbox_mode` (varbit 4430) to 0, 1, 4, 3 and 2.
  - **Op 1 is the selected quantity.** Ops 2-6 are 1, 5, 10, X and All, with the selected one moved to op 1 (cache scripts 8873 and 8896). Op 10 is Examine.
  - **X** runs script 108 "Enter amount:" and reads the typed count.
  - Asking for more than there is moves what's there. Withdrawing 5 unstackable items takes them from several slots.
- **Whitelist:** varp 5205 is a bitmask of the inventory slots that can be deposited. It's rebuilt after every inventory change while the hold is open.
- **Repair kits:** the sidepanel's repair kit count (varbit 19210) is 5 uses per repair kit in the hold, and follows every change.
- **Refused:** "The cargo hold cannot store that item." (game message).
- **Deposit buttons** (943:13 Cargo, 14 Salvage, 15 Inventory):
  - Deposit Inventory moves everything storable, with sound 10905.
  - With nothing to move: "You have no cargo to deposit." / "You have no salvage to deposit.", with sound 2277.
- **Item stacking:** the "Item stacking" toggle (varbit 19592) sends nothing to the server. It only changes how the client draws the hold.
- **Warning:** "Dismiss" (944:8) sets varbit 19123 and hides the warning on the side panel.

**The tools compartment:** shared by all your boats, and taking no space. Taking a tool is op 1 on 943:18, with sound 2582.

| Slot | Tool | Item(s) | Message |
| --- | --- | --- | --- |
| 0 | Captain's log | 31986 | You collect your captain's log from the tools compartment. |
| 1 | Spyglass | 31803 | You collect a spyglass from the tools compartment. |
| 2 | Current duck | 31805 | not captured |
| 3 | Crowbar | 31807 | not captured |
| 4 | Diving gear | 7534 + 7535 | You collect some diving gear from the tools compartment. |

Depositing a tool, by Deposit Inventory or singly, puts it back in the compartment.

**Tool unlocks:** script 9138 shows a tool only once its quest progress is reached. The captain's log always shows.

| Tools row | Shown when |
| --- | --- |
| 8010 | varbit 18314 ≥ 50 (The Pandemonium, which also switches the log between 31985 and 31986 at 46) |
| 8011 | 18314 ≥ 50 and 18282 ≥ 40 |
| 8012 | 18314 ≥ 50 and 18317 ≥ 20 |
| 8013 | 18314 ≥ 50 and 1895 ≥ 40 |

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--messages"></a>
#### Messages

| Where | Type | Text |
| --- | --- | --- |
| Boarding | spam | You board your boat. |
| Recovery | game | Payment has been taken from your bank. |
| Recovery | npc say (Port Wizard) | Another recovery? This won't take long... |
| Recovery | dialogue (Junior Jim) | All done! The boat is now docked here at the Pandemonium. |
| Hull upgrade | message box | With the help of some workers, you swap out the hull of your boat. |
| Cargo hold | game | The cargo hold cannot store that item. |
| Cargo hold | game | You have no cargo to deposit. / You have no salvage to deposit. |
| Tools compartment | game | You collect your captain's log / a spyglass / some diving gear from the tools compartment. |

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--where-tsps-differs"></a>
#### Where tsps differs

- **Deck level:** people aboard stand on level 0 of the deck scene, not level 1. The tsps client already raises actors on a world entity by the deck height, so level 1 would lift them twice. Matching OSRS needs a client rendering change.
- **The HP-bar NPC** isn't placed: that needs NPC sync inside a boat's world view.
- **The boat's name varbits** (19149, 19150) aren't sent: their encoding is unknown.
- **The linen sail** isn't placed, because its live id is a fairy ring in revision 237. Neither are the skiff's and sloop's canvas sails, for the same reason.
- **New boats are base tier, with only a basic cargo hold** (OSRS Wiki, Sloop: "A newly purchased Sloop with no facilities"; the basic hold comes with every boat).
  - The hold's hotspot and value come from the captures. The raft uses hotspot 0 with value 15. The skiff's is hotspot 6 with value 1: the shipyard shows hotspots 0-3 as empty placeholders, then the hook (4), the inoculation station (5) and the hold (6). The sloop's is hotspot 10 (its last) with value 1.
  - The parts are a wooden hull (template column 0), bronze keel, wooden helm, wooden sails and wooden trim.
  - The part loc ids run in tier order in the cache:
    - keels: 59516-59522 (skiff), 59523-59529 (sloop);
    - sails: 59530 (raft), 59537 (skiff), 59544 (sloop);
    - helms, three ids each: 59554 (raft), 59576 (skiff), 59598 (sloop);
    - trims: 59624 (skiff), 59642 (sloop).
- **Base-tier stats** come from the wiki's component tables:
  - HP is hull + keel: skiff 30 + 50 = 80, sloop 40 + 70 = 110. This checks out against the captures: teak skiff 60 + steel 60 = 120, camphor skiff 180, camphor sloop 160 + adamant 100 = 260.
  - Armour is 100 (bronze keel).
  - Speed 192, speed cap 320, boost 20 and acceleration 64 (0.5).
  - No resistances.
  - Wooden per-style defence isn't known, so it isn't sent.
- **Skiff and sloop:**
  - Only their sails' "down" animation (and the skiff helm's inactive one) is known, so other sail and helm animations are skipped.
  - Their helms sit on the hull's edge, so Navigate is used from beside them rather than on their tile.
  - Recovery fees are the wiki's base fees (4,125 and 50,000). The captured camphor sloop cost 60,000.
- **Client:**
  - A world view's collision isn't filled in, so a run step on a deck is drawn as if the deck were open floor. The server checks the real deck.
  - A despawned boat's added deck locs are forgotten, since the next boat reuses its entity index and deck coordinates.
  - A loc animation on a deck rebuilds the boat's scene with it, so it starts a moment late. The same animation sent again while it plays (a salvaging hook's idle, every tick) only extends it.
- **The skiff and sloop spawn tile** (3075, 2987) is one tile east of the raft's. tsps only has the raft so far.
- **Cargo hold:**
  - `busy` isn't set while it's open, because plugins get no close hook to clear it.
  - Varbit 19134 isn't driven, so the loc's first op stays Open (no Deposit-held).
  - Guessed rather than captured:
    - the loc's "Deposit-all" (taken to mean everything storable);
    - the full-hold message ("Your cargo hold is full.");
    - a tool you haven't stored (nothing happens);
    - diving gear needing both parts to be stored.
  - The wiki's bounty items aren't listed, since no item name matched.
- **Shipyard:**
  - The shown boat, and the owner while aboard it, are shown only to the owner. Other players in the shipyard see neither.
  - "Shipwright assistance" (paying to build without the Construction level) isn't built yet.
  - Facilities are built, removed and replaced there, but only placed: none of them can be used yet (cooking on the range, firing cannons and so on). A cargo hold's tier doesn't change its capacity yet.
  - Guessed rather than captured for facilities:
    - "Replace it." opens the hotspot's options, and building over a facility replaces it without a refund;
    - a hotspot's Build and a facility's Modify do nothing away from the shipyard;
    - which facilities face out over the side (column 23; see Facilities);
    - the raft's placeholder id (59661).
  - Guessed rather than captured:
    - the part names in the swap message ("mast and sails");
    - the level, materials and "already has that" messages.
  - Materials come from the inventory only.
- **Ports**, guessed rather than captured:
  - Disembarking at a port's gangplank docks the boat there if it wasn't (the capture docked at the buoy first). It needs the port's level unless the boat is already docked there.
  - The too-low-level message, and that boarding a port's boat needs no level.
  - The mooring for every port but the Pandemonium (its offsets, on each port's sea side), and the landing for islands (by the plank's rotation).
  - Locs on the shore can be used from up to 12 tiles away while aboard (the capture used a gangplank from 9).
  - Islands only differ in not being a "standard dock" (19146). Column 5's requirement isn't checked.
- **Sailing** is a skill (23). Salvaging and sorting give Sailing XP; nothing else does yet.
- **Salvaging**, guessed rather than captured:
  - the hook's reach: 8 tiles from the hook to the nearest tile of the wreck (about what it is in OSRS, as played);
  - facing out over the hook's side of the boat while working it (the capture faced the hook tile, from beside it);
  - how many wrecks a group keeps raised (two thirds, from the Wiki's "typically 4 of the 6");
  - the first roll 6 ticks after the cast, then every 4;
  - the messages for too low a level, a full inventory and finding nothing, and stopping without a message when you walk, leave the boat or sail out of reach;
  - the hook animations for every boat size (the captured ones are the sloop's).
- **Salvaging, not yet:** crewmates, salvage into the cargo hold, "Inspect" on a wreck, clue scrolls and soup from sorting, and opulent salvage's rare seed, herb and gem tables (rolled as nothing). Tsps floors XP on every gain, so 5.5 XP a sort counts as 5.
- **Boat selection and recovery:**
  - The bank isn't sent when interface 934 opens.
  - The Port Wizard's line is only shown overhead, not also in the chatbox.
  - Stored HP is always full, because boats don't take damage yet.
  - A boat sunk by a teleport, Escape or death sends "lost at sea" (253); capsizing (254) comes with boat damage. A boat at sea with its owner sends port 0.
  - Guessed rather than captured:
    - falling back to coins in the inventory ("Payment has been taken from your inventory.");
    - the message for not having enough coins.
  - None of the tool quests exist yet, so only the captain's log shows. The developer command `::sailingtools` sets the unlock varbits for your own client. The server doesn't check unlocks, so a hidden tool can still be deposited.

<a id="doc-tsps-upstream-docs-sailing-osrs-reference--wanted-captures"></a>
#### Wanted captures

- Taking the helm, setting and trimming sails, steering and stopping.
- Teleporting from sea, Escape, and logging out and back in at sea.
- Disembarking at a port's gangplank without docking at its buoy first.
- Buying a boat (Junior Jim's Buy-boat).
<!-- end-source-document: tsps-upstream/docs/sailing-osrs-reference.md -->

---

<a id="doc-tsps-upstream-docs-sailing"></a>
## tsps-upstream/docs/sailing.md

<!-- source-document: tsps-upstream/docs/sailing.md -->
<a id="doc-tsps-upstream-docs-sailing--sailing"></a>
### Sailing

Design for Sailing in tsps: player-owned boats that sail the main world as world entities. It follows live OSRS as closely as possible; where the OSRS Wiki is silent, behaviour was checked in live OSRS and is marked **(live-checked)**.

**Status:** the first PR (engine, raft and saving) is implemented. What live OSRS sends, from wiki pages and live captures, is recorded in [the OSRS reference](#doc-tsps-upstream-docs-sailing-osrs-reference).

<a id="doc-tsps-upstream-docs-sailing--scope"></a>
#### Scope

The first PR delivers a playable raft end to end:

- the engine: world views, boat instances, movement and collision, and world-entity sync to **every nearby player**, not just the owner
- raft content: boarding at a gangplank, the helm and sails, disembarking at a dock
- saving: owned boats, where each boat is, and the rules for leaving a boat (disembark, teleport, Escape, death, logout)

Later PRs: the cargo hold, skiff and sloop, shipbuilding facilities and hull upgrades, boat hitpoints and capsizing, port tasks. Other players **boarding** your boat is out of scope for now; they can see it and you on it.

<a id="doc-tsps-upstream-docs-sailing--osrs-rules"></a>
#### OSRS rules

| Topic | Rule | Source |
| --- | --- | --- |
| Boat types | Raft (1x3, 1 facility slot), skiff (2x5, 7 slots), sloop (3x10, 9-11 slots); bought from shipwrights | Wiki: Sailing, Boat |
| Boats owned | 1 at level 1, 2 at 15, 3 at 50, 4 at 78, 5 at 91 | Wiki: Boat |
| Location | A boat is at a single port (or mooring point) at a time. Disembarking there sets it | Wiki: Boat, Mooring point |
| Hitpoints | From hull and keel; no natural regeneration. Repaired by upgrades, a shipwright (50 coins per HP) or repair kits | Wiki: Boat |
| Logging out at sea | You log back in on your boat, at sea | live-checked |
| Teleporting from the boat | The boat disappears (is **sunk**). No gangplank can board it until a shipwright recovers it | live-checked |
| Escape | A helm option for a stuck boat with no teleport. The boat sinks, same as teleporting | live-checked |
| Death at sea | Gravestone at the last gangplank you set sail from; some cargo is lost | Wiki: Sailing |
| Capsizing (0 HP) | You are moved to the last gangplank you set sail from and keep your inventory; some cargo is lost | Wiki: Sailing |
| Return point | Disembarking at a gangplank or mooring point, or clicking a buoy, sets where you are sent after Escape or capsizing | Wiki: Mooring point, Buoy |
| Shipwright | At large ports: buy, destroy, customise, and retrieve a sunk boat or one at another port. The Pandemonium's is Junior Jim | Wiki: Shipwright |
| Recovery fee | Raft 250 gp, skiff 4,125 gp, sloop 50,000 gp; more with damage and built facilities | Wiki: Shipwright |

Cargo lost on death, capsizing and teleporting (courier crates, bounty items, salvage, trawling fish, fish crates) matters once the cargo hold exists; PR 1 has no cargo.

<a id="doc-tsps-upstream-docs-sailing--concepts"></a>
#### Concepts

- **Owned boat**: a saved record in the player's save: its type, name, hitpoints, facilities and location. A player owns 1-5.
- **Boat instance**: an owned boat that is out at sea, live in the world. At most one per player. It exists only while its owner is aboard (or logged out aboard, see below).
- **World view**: a separate coordinate space with its own map, collision and entities. The main world is world view -1; each boat instance is a world view keyed by its world-entity index. Players and NPCs belong to exactly one world view.
- **Deck frame vs world frame**: a boat's deck is a 13x13-zone scene placed far outside the real map (tiles 9600+), with the boat's cache template zone copied into its centre. People aboard stand in deck coordinates, on level 0 (OSRS uses level 1, but the tsps client already raises actors on a boat by the deck height). The boat itself has a world-frame position (1/128-tile precision) and angle, and is drawn there. Converting a deck tile to the world tile under it uses the boat's position and angle.
- **Root tile**: for anything measured in the main world (sync range, main-world locs like gangplanks), a player aboard counts as standing on the world tile under their deck tile.

<a id="doc-tsps-upstream-docs-sailing--data-model"></a>
#### Data model

A new `sailing` block in `PlayerSave`, owned by core (not a plugin attribute), because the engine's exit rules read and write it:

```ts
sailing: {
  boats: Array<{
    slot: number;             // 0-4
    type: "raft" | "skiff" | "sloop";
    name: [number, number, number]; // three words from cache db rows 8545-8547 (0 = none)
    hitpoints: number;        // PR 1: stored, not yet used
    facilities: number[];     // per hotspot, the facility's 1-based position in its list; empty = the type's defaults
    location:
      | { kind: "docked"; dock: string }                                // at a port or mooring point
      | { kind: "at_sea"; fineX: number; fineY: number; angle: number } // owner logged out aboard
      | { kind: "sunk" };                                               // needs a shipwright
    cargo: ({ id: number; amount: number } | null)[]; // the cargo hold, by slot
    parts: { hull: number; keel: number; sails: number; helm: number }; // tiers 0-6 into the cache's part lists
  }>;
  activeBoatSlot: number | null; // the boat the player is aboard or last set sail in
  returnPoint: { x: number; y: number; level: number } | null; // last gangplank, mooring point or buoy
  tools: number[]; // tools compartment slots holding their tool, shared by all boats
}
```

What a cargo hold accepts is data (`data/definitions/sailing-cargo.json`): the tools by item id, and every other storable item by exact name or name prefix, grouped by category. `lostOnRecovery` marks the categories a shipwright's recovery loses.

Docks are every port in the cache (`data/definitions/sailing-ports.json`): its id, name, docking level, buoy, gangplank, where the player lands on disembarking, and where a boat is placed when it isn't where it was left. What only some docks have, such as a shipwright or the shipyard, is in `data/definitions/sailing-docks.json`.

<a id="doc-tsps-upstream-docs-sailing--lifecycle"></a>
#### Lifecycle

One state machine in core owns every transition, so no path can leave a boat half-alive (the trade and bank bugs came from exits that forgot to clean up).

| From | Event | To | Effects |
| --- | --- | --- | --- |
| docked at A | board at A's gangplank | at sea (aboard) | spawn the instance at A; send the deck scene; move the player onto the deck; set `returnPoint` |
| docked elsewhere / sunk | board at A's gangplank | - | refused; the shipwright message |
| at sea | Dock at port B's buoy | at sea, docked at B | the boat's port becomes B; set `returnPoint` |
| at sea | disembark at port B's gangplank | docked at B, where it is | move the player to B's landing tile; dispose the instance; set `returnPoint` |
| at sea | teleport (any source) | sunk | dispose the instance; the teleport proceeds |
| at sea | Escape (helm) | sunk | dispose the instance; move the player to `returnPoint` |
| at sea | death | sunk (to confirm) | dispose the instance; gravestone at `returnPoint` |
| at sea | logout / disconnect | at sea (saved) | save the boat's position and angle; dispose the instance |
| at sea (saved) | login | at sea (aboard) | respawn the instance at the saved position; board the player |
| sunk | shipwright retrieve at port P | docked at P | fee: raft 250 gp (PR 1 has no damage or facilities) |

Teleports are caught in one core hook that every teleport passes through, not in each spell or item.

<a id="doc-tsps-upstream-docs-sailing--engine-core-typescript"></a>
#### Engine (core, TypeScript)

tsps has no world views, but it has `PrivateArea` (used by Construction's house): collision, pathfinding, object lookup and entity visibility are already scoped by the area an actor is in. A boat's deck is a `PrivateArea` at the deck coordinates, so walking and deck objects work without threading a world-view id through the engine.

- **Deck area** (`BoatDeckArea extends PrivateArea`): every tile of its scene is blocked except the boat type's walkable deck tiles; deck objects that block add their flags. Deck coordinates have no cache region, so without this they would read as walkable.
- **BoatManager**: allocates world-entity indices (3000-3999) and deck regions, builds deck collision from the template zone, ticks movement, and disposes instances. Ported from xrsps.
- **Movement and collision**: full sail 192 fine units (1.5 tiles) a tick, the wiki's base speed for a wooden hull; half and reverse 96; turning 128 units of angle a tick without losing speed. A move is checked in half-tile steps, so the boat can't hop over a thin strip of land. A tile is sailable when its level-0 overlay is water (decoded from the cache map) and it has no solid object; only tiles the hull newly covers are checked. Ported from xrsps (`BoatMovement`, `BoatCollision`, `WaterMap`).
- **Sync**:
  - `REBUILD_WORLDENTITY` sends a boat's deck scene (template chunks) to each client that sees it.
  - `WORLDENTITY_INFO` is per viewer: each tick, boats whose world tile is in a viewer's range are added, moved or removed, like NPC sync.
  - Player and NPC sync measure range from root tiles, and a deck area counts as the main world for who-sees-whom. When a player on a deck enters a viewer's list, the encoder writes its world-view id, and a player the viewer already sees who boards or leaves a boat is removed for one frame and added back with the new one. The client places them on the boat.
  - `NPC_INFO` gains the viewer's root tile in its header (server and client), so a player on a deck sees main-world NPCs where they are.
  - While a player is on a deck, the normal map keeps following their root tile, so the sea streams as the boat moves.
- **Deck locs** (helm, sails) are sent per viewer as loc spawns in the deck scene.

<a id="doc-tsps-upstream-docs-sailing--content-plugins"></a>
#### Content (plugins)

- boat types (`data/definitions/boats.json`): template zone, size, hull bounds, deck centre, walkable deck tiles, deck locs, stats, facility hotspots, part tiers and loc animations. The raft, and the skiff and sloop with camphor hulls.
- gangplanks: Board / Disembark, routed to the lifecycle
- helm: Navigate (walking onto the helm tile first) / Stop-navigating, the sail buttons (move mode from varbit 19175), clicking to set a heading; Escape, after a yes/no confirmation
- shipyard: Junior Jim's Customise-boat takes the boat to the shipyard, whose boat schematics (interface 939) swap its hull, keel, sails or helm for any tier, at the cache's levels and materials, for Construction XP; parts, stats and fees come from the cache's sailing tables at runtime. Aboard the boat there (its own gangplank), a facility hotspot's Build builds any facility the hotspot allows (no XP), and a facility's Modify removes or replaces it; hotspots, facilities and materials are the cache's too
- shipwright: Junior Jim at The Pandemonium retrieves a sunk raft for 250 gp (PR 1 needs this, or a sunk raft is stuck forever)
- salvaging: shipwrecks rise and sink at every site the cache places them; a boat's salvaging hook reels salvage in from one nearby for Sailing XP, and a salvaging station (on a boat or at a port) sorts it into loot for more. Data in `data/definitions/sailing-salvage.json`
- developer commands: `::raft`, `::skiff` and `::sloop` give a boat docked at The Pandemonium, `::pandemonium` teleports to its gangplank, `::sailingtools` shows every tool in the cargo hold's tools compartment (their quests don't exist yet), and `::boatmats <hull|keel|sails|helm> <tier> [boat]` or `::boatmats facility <name>` spawns a part's or facility's materials for the shipyard. The dock is where xrsps's raft docks (gangplank 59836 at 3070, 2987); the Pandemonium quest and buying boats come later

<a id="doc-tsps-upstream-docs-sailing--client"></a>
#### Client

The tsps client already decodes `REBUILD_WORLDENTITY`, `WORLDENTITY_INFO` and world-view ids in player and NPC sync. Ported from xrsps: `worldEntityMotion` (placing the deck scene at the boat's position), the `WorldEntityAnimator` fix, `HelmSteering` (click-to-heading on the sea surface), and the picking, camera and minimap changes that follow the player's root tile.

<a id="doc-tsps-upstream-docs-sailing--testing"></a>
#### Testing

Headless tests like `trade.test.cjs` and `bank.test.cjs`, one per lifecycle row: every exit path leaves exactly one consistent saved state and no live instance. Plus movement and collision, and sync range (a viewer gets the boat when it comes into range and loses it when it leaves).

<a id="doc-tsps-upstream-docs-sailing--open-questions"></a>
#### Open questions

- Death at sea: does the boat sink, or return to its last dock?
- Recovery fee once boats take damage and have facilities (the wiki gives only the base fee).
- The game messages for disembarking and Escape, and the Escape confirmation prompt, are placeholders; the live wording is unconfirmed. "You board your boat." is confirmed by a live capture.
- Logging out at sea when the boat last left from an island mooring point rather than a port (a Dec 2025 fix changed this; unclear if it differs).

<a id="doc-tsps-upstream-docs-sailing--sources"></a>
#### Sources

- [Sailing](https://oldschool.runescape.wiki/w/Sailing), [Boat](https://oldschool.runescape.wiki/w/Boat), [Mooring point](https://oldschool.runescape.wiki/w/Mooring_point), [Buoy](https://oldschool.runescape.wiki/w/Buoy_(Sailing)), [Shipwright](https://oldschool.runescape.wiki/w/Shipwright) — OSRS Wiki
- xrsps (`bank-overhaul` branch) `docs/internals/sailing.md` and its engine code, the starting point for the engine and client work
<!-- end-source-document: tsps-upstream/docs/sailing.md -->

---

<a id="doc-tsps-upstream-docs-sawmill"></a>
## tsps-upstream/docs/sawmill.md

<!-- source-document: tsps-upstream/docs/sawmill.md -->
<a id="doc-tsps-upstream-docs-sawmill--sawmill"></a>
### Sawmill

`server/plugins/npcs/Sawmill.plugin.js` runs the sawmill operators: "Sawmill operator" (3101) and "Sawmill Operator" (9140 in Prifddinas, 14659 in Auburnvale). Its data is in `server/data/definitions/sawmill.json`.

The rules come from rsprox captures (`rsprox/sawmill/operator*.txt`) and the OSRS Wiki.

<a id="doc-tsps-upstream-docs-sawmill--buy-plank"></a>
#### Buy-plank
Buy-plank opens the skillmulti menu (270, clientscript 2046):
- **Mode:** 0.
- **Title:** "How many do you wish to make?"
- **Maximum:** the logs you carry.
- **Starting amount:** the last amount you chose (the first time, the maximum).
- **The seven planks:**

  | Plank | Logs | Plank id | Cost |
  | --- | --- | --- | --- |
  | Wood | 1511 | 960 | 100 |
  | Oak | 1521 | 8778 | 250 |
  | Teak | 6333 | 8780 | 500 |
  | Mahogany | 6332 | 8782 | 1,500 |
  | Camphor | 32904 | 31432 | 2,500 |
  | Ironwood | 32907 | 31435 | 5,000 |
  | Rosewood | 32910 | 31438 | 7,500 |

The core's creation menu now takes per-item labels, a maximum, a starting amount and a mode as optional settings. Existing menus are unchanged.

**Spacebar picks the item you made last.** The menu's clientscript (2046) gives the space key to the item at the position held in varp 2673, for every menu type whose enum 3623 entry is 1, the default. So every make-X menu now:
- remembers the position you chose (`creation-menu:last-item`, saved);
- sends it as varp 2673 before the menu opens.

On choosing, everything happens that tick, with no animation and no message.
- **No logs:** the operator says "You'll need to bring me some more logs."
- **Otherwise, plank by plank** until the amount, your logs or your coins run out:
  1. the coins are taken;
  2. then a log;
  3. then the plank goes into the first free slot.

  So a plank takes its log's slot, or the coins' slot once the coins are gone. The capture shows the latter: 2 logs and 1,500 coins made 1 plank, which landed in slot 1, where the coins had been.
- **Coins running short:** "Those planks cost 1500 coins. You don't have enough money for all of them." The line gives the plain unit price. It's said even when no plank could be made.

<a id="doc-tsps-upstream-docs-sawmill--using-logs-on-the-operator"></a>
#### Using logs on the operator
A log used on any operator makes **one** plank on the spot, with no menu. It works plank by plank as above, so the plank lands in the first log's slot (captured). Without enough coins you get the same "Those planks cost …" line.

<a id="doc-tsps-upstream-docs-sawmill--sawmill-vouchers-wiki"></a>
#### Sawmill vouchers (Wiki)
While you carry a voucher (28628), each log uses one and makes 2 planks for that log's price, as long as there's room for the second plank. If there isn't, the log makes 1 plank and the voucher is kept.

Out of scope, since neither exists on this server yet:
- the Sailing log-type coupons;
- the plank sack.

<a id="doc-tsps-upstream-docs-sawmill--talk-to-and-trade"></a>
#### Talk-to and Trade
- **Talk-to** plays the Wiki transcript, which matches the capture:
  - "Yes, please make me some planks." opens the same menu, a tick after the conversation closes;
  - "Can I buy some housing supplies?" opens the shop.
- **Trade** opens the same shop, "Construction supplies".

The duplicate "Sawmill" shop, with the same stock and operators, is removed.

<a id="doc-tsps-upstream-docs-sawmill--diary"></a>
#### Diary
- **Varrock easy:** "Make a normal plank at the Sawmill" (any wood plank made).
- **Varrock medium:** "Make 20 Mahogany Planks in one go" (20 or more from one choice).

<a id="doc-tsps-upstream-docs-sawmill--not-modelled"></a>
#### Not modelled
The Sawdust (9468) that appeared on the floor once in a capture. It wasn't seen again, and it's likely unrelated.
<!-- end-source-document: tsps-upstream/docs/sawmill.md -->

---

<a id="doc-tsps-upstream-docs-screen-brightness"></a>
## tsps-upstream/docs/screen-brightness.md

<!-- source-document: tsps-upstream/docs/screen-brightness.md -->
<a id="doc-tsps-upstream-docs-screen-brightness--screen-brightness"></a>
### Screen brightness

The Settings "Screen brightness" slider, from the rev 241 cache.

<a id="doc-tsps-upstream-docs-screen-brightness--how-osrs-does-it"></a>
#### How OSRS does it

- **It's a device option:** brightness is device option 6, kept by the client. No varp is involved: no cache script reads varp 166 (`option_brightness`, the old 1–4 setting) or varbit 10729 (`option_brightness_remember`) any more.
- **The slider** is built by script 381, as setting 15. It's a track of notches (one per position, 21 for brightness), each a component with the left-click option "Adjust Brightness" and `cc_setonop(439, [15, position, …])`. Clicking along the track picks a notch.
- **Writing:** script 439 calls 3966, which sets `deviceoption_set(6, clamp(0, 100, position × 5))`, then 3941 moves the handle.
- **Reading:** script 3961 returns `deviceoption_get(6) / 5` for setting 15.
- **Not the slider:** script 526 → 837 → 9443 → 9444 is the notch's hover tooltip (9444 is the bespoke tooltip script). Varp 2856 (`settings_varp_1`) packs 16 other settings; the slider only redraws when it changes.

<a id="doc-tsps-upstream-docs-screen-brightness--in-this-client"></a>
#### In this client

`client/ui/ScreenBrightness.ts`:
- **The value:** device option 6, 0–100 in steps of 5, kept in `localStorage` (`osrs.screenBrightness`), like the interface scaling. The client's device options start with it, so the slider shows it.
- **The renderer's brightness** is OSRS's gamma exponent: colours are `pow(rgb, gamma)`, and the four classic levels were 0.9 (darkest) to 0.6 (brightest). The slider maps 0–100 linearly onto that range: `gamma = 0.9 − 0.3 × value / 100`.
- **The default** is 35 (gamma 0.795), so the scene looks as it always has (the renderer's 0.8).
- **Applying it:** `OsrsClient.setDeviceOption` sends option 6 to `applyScreenBrightness`, which saves it and sets the renderer's gamma. The debug panel's Brightness control uses the same scale and path.

<a id="doc-tsps-upstream-docs-screen-brightness--textures"></a>
##### Textures

Flat colours get the gamma in `hslToRgb`. Textured surfaces used to multiply by the brightness instead, which would have made them darker as the setting got brighter. `render/shaders/includes/brightness.glsl` gives them the same gamma change relative to the 0.8 the scene was tuned at, so the default look is unchanged and both brighten together.

<a id="doc-tsps-upstream-docs-screen-brightness--not-verified"></a>
#### Not verified

- **The exact curve:** whether OSRS's slider covers exactly the classic 0.9–0.6 range, linearly.
- **OSRS's default position.**
- **The interface and minimap:** whether brightness affects them in OSRS. Here only the 3D scene changes.

<a id="doc-tsps-upstream-docs-screen-brightness--testing"></a>
#### Testing

`client/tests/screen-brightness.test.ts`: the mapping, the default, and saving (including blocked storage).
<!-- end-source-document: tsps-upstream/docs/screen-brightness.md -->

---

<a id="doc-tsps-upstream-docs-setup"></a>
## tsps-upstream/docs/setup.md

<!-- source-document: tsps-upstream/docs/setup.md -->
<a id="doc-tsps-upstream-docs-setup--setup-guide"></a>
### Setup Guide

Get xRSPS running locally in a few minutes.

The repository contains **`client/`**, **`server/`**, and **`docs/`** packages. The root commands install and run the server and client for you.

<a id="doc-tsps-upstream-docs-setup--prerequisites"></a>
#### Prerequisites

| Tool                                                | Version      | Why                                |
| --------------------------------------------------- | ------------ | ---------------------------------- |
| [Node.js](https://nodejs.org/)                      | v22.16+      | Runtime for both client and server |
| [Yarn](https://classic.yarnpkg.com/en/docs/install) | v1 (Classic) | Package manager                    |
| [Git](https://git-scm.com/)                         | Any recent   | Clone the repo                     |

::: tip Node Version
Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage Node versions easily:

```bash
nvm install 22
nvm use 22
```

:::

<a id="doc-tsps-upstream-docs-setup--1-clone-the-repository"></a>
#### 1. Clone the Repository

```bash
git clone https://github.com/xrsps/xrsps-typescript.git
cd xrsps-typescript
```

<a id="doc-tsps-upstream-docs-setup--2-set-up-the-server-and-client"></a>
#### 2. Set Up the Server and Client

```bash
yarn setup
```

This installs the root command runner, server dependencies, and client dependencies, downloads the required OSRS cache, then builds the collision cache.

<a id="doc-tsps-upstream-docs-setup--3-start-the-server-and-client"></a>
#### 3. Start the Server and Client

```bash
yarn start
```

This starts both processes in the same terminal. Press `Ctrl+C` to stop them.

To start only the game server:

```bash
yarn server
```

To start only the web client:

```bash
yarn client
```

::: info
The collision build can take a few minutes during the initial `yarn setup`. It reads the game cache and writes collision data to `server/cache/collision/`.
:::

<a id="doc-tsps-upstream-docs-setup--server-startup"></a>
#### Server Startup

The server will:

1. Automatically download the OSRS cache if it hasn't been fetched yet (`server/caches/`)
2. Load collision data, spells, and game scripts
3. Start a WebSocket server on `0.0.0.0:43594`

You should see log output confirming the server is ready.

By default, the server runs the **vanilla** gamemode. To run a different gamemode:

```bash
# Environment variable
GAMEMODE=leagues-v yarn start

# Or set it in server/config.json
{ "gamemode": "leagues-v" }
```

<a id="doc-tsps-upstream-docs-setup--client-startup"></a>
#### Client Startup

This launches the React dev server (usually on `http://localhost:3000`). Your browser should open automatically. The client will also download the cache on first run if needed.

<a id="doc-tsps-upstream-docs-setup--youre-in"></a>
#### You're In

Log in with a username and a password of 8 to 20 characters. The first successful login registers that username; later logins must use the same password.

<a id="doc-tsps-upstream-docs-setup--account-registration-and-legacy-characters"></a>
##### Account registration and legacy characters

New account registration is enabled by default. Set `ALLOW_ACCOUNT_REGISTRATION=false` when you want to stop new usernames from being registered.

When upgrading a server that already has `player-state.json` character saves but no account passwords, temporarily start the server with:

```bash
cd server
ALLOW_LEGACY_ACCOUNT_CLAIM=true yarn start
```

This lets each legacy username assign a password on its next login. Disable the option again after the migration window so another person cannot claim an unclaimed character name. Existing `accounts.json` password hashes are imported automatically and do not require this option.

---

<a id="doc-tsps-upstream-docs-setup--troubleshooting"></a>
#### Troubleshooting

<a id="doc-tsps-upstream-docs-setup--cache-download-hangs-or-fails"></a>
##### Cache download hangs or fails

The cache is downloaded from the [OpenRS2 Archive](https://archive.openrs2.org/). If it stalls:

- Check your internet connection
- Delete the `server/caches/` folder and try again
- The target cache version is defined in `server/target.txt`

<a id="doc-tsps-upstream-docs-setup--yarn-build-collision-is-slow"></a>
##### `yarn build-collision` is slow

This is expected on first run. Subsequent runs are fast because results are cached in `server/cache/collision/`.

<a id="doc-tsps-upstream-docs-setup--port-43594-already-in-use"></a>
##### Port 43594 already in use

Another instance of the server is likely running. Kill it or change the port in the server config.

<a id="doc-tsps-upstream-docs-setup--client-shows-a-blank-screen"></a>
##### Client shows a blank screen

- Make sure the server is running first
- Check the browser console for WebSocket connection errors
- Ensure the cache download completed (check `server/caches/` folder)

<a id="doc-tsps-upstream-docs-setup--node-version-errors"></a>
##### Node version errors

Ensure you're on Node v22.16+:

```bash
node -v
```

---

<a id="doc-tsps-upstream-docs-setup--useful-commands"></a>
#### Useful Commands

Run the first three commands from the repository root. Package-specific maintenance commands can still be run from their package directory.

| Command | Description |
| ------- | ----------- |
| `yarn setup` | Install the server and client and build collision data |
| `yarn start` | Start the game server and web client together |
| `yarn server` | Start only the game server |
| `yarn client` | Start only the web client |
| `cd server && yarn ensure-cache` | Manually download the OSRS cache |
| `cd client && yarn typecheck` | Typecheck the client |
| `cd server && yarn typecheck` | Typecheck the server |
<!-- end-source-document: tsps-upstream/docs/setup.md -->

---

<a id="doc-tsps-upstream-docs-skill-guide"></a>
## tsps-upstream/docs/skill-guide.md

<!-- source-document: tsps-upstream/docs/skill-guide.md -->
<a id="doc-tsps-upstream-docs-skill-guide--skill-guide"></a>
### Skill guide

`server/plugins/interface/SkillGuide.plugin.js` opens the skill guide (`skill_guide_v2`, interface 860) from the Skills tab. The cache's own clientscripts draw the guide and switch its tabs; the server only opens, re-opens and closes it.

The behaviour comes from rsprox captures: 76+ "View guide" clicks on stats across revisions 224–237, for example recordings 1039, 3946 and 3947 (Thieving) and 907/908 (Sailing). Ids are checked against the rev 241 cache.

<a id="doc-tsps-upstream-docs-skill-guide--opening-it"></a>
#### Opening it

The stats' second option is "View <skill> guide" (cache script 393 sets it; the first option, "Toggle <skill> XP", only exists on some world types). On that click, all on the same tick:

1. `if_opensub`: `skill_guide_v2` as an **overlay** in the game frame's floater (161:18).
2. `if_setevents`: the list (860:21) with no events, and the tabs (860:7, slots 0–200) with option 1.
3. `script skill_guide_v2_init` (1902) with `[skill, 0, 0, 0]`.

`skill` is the guide's own number for the skill, the fourth argument each Skills tab component gives script 393:

| Guide number | Skill | Stats component |
| --- | --- | --- |
| 1 | Attack | 1 |
| 2 | Strength | 2 |
| 3 | Ranged | 4 |
| 4 | Magic | 6 |
| 5 | Defence | 3 |
| 6 | Hitpoints | 9 |
| 7 | Prayer | 5 |
| 8 | Agility | 10 |
| 9 | Herblore | 11 |
| 10 | Thieving | 12 |
| 11 | Crafting | 13 |
| 12 | Runecraft | 7 |
| 13 | Mining | 17 |
| 14 | Smithing | 18 |
| 15 | Fishing | 19 |
| 16 | Cooking | 20 |
| 17 | Firemaking | 21 |
| 18 | Woodcutting | 22 |
| 19 | Fletching | 14 |
| 20 | Slayer | 15 |
| 21 | Farming | 23 |
| 22 | Construction | 8 |
| 23 | Hunter | 16 |
| 24 | Sailing | 24 |

The captures agree: Attack 1, Strength 2, Thieving 10, Farming 21, Sailing 24.

<a id="doc-tsps-upstream-docs-skill-guide--inside-the-guide"></a>
#### Inside the guide

- **Tabs** (860:7): no server response in any capture. The guide's scripts switch them.
- **Close** (860:4): `if_closesub` on the floater.
- **A link to another skill's guide** (860:18, sent by cache script 9190 with `if_triggeroplocal` and one int, the skill's number): the guide opens again on that skill, the same three steps as above.

<a id="doc-tsps-upstream-docs-skill-guide--pvp-worlds"></a>
#### PvP worlds

Before opening, the click is offered to other plugins as `skills:stat-clicked` (`{ player, childId, handled }`). `SetSkillLevel` claims it while presets are enabled (PvP worlds) and opens its "Set level" prompt, as before: for combat skills, and for every skill for developers. On every other world, and for other skills, the guide opens.

<a id="doc-tsps-upstream-docs-skill-guide--not-done-yet"></a>
#### Not done yet

- **The quest link** (860:17, cache script 9189, one int): live OSRS closes the guide, sets varp `latest_quest_journal` and opens that quest's journal. tsps quests are defined by name, so the int still needs mapping to a tsps quest.
- **Clicking a list entry**: in the captures only Sailing entries answer, with a game message listing that entry's materials (for example "Adamant keel (skiff): # x Adamant keel parts, # x Lead bar").
- **The `IF_SCRIPT_TRIGGER` event** that live OSRS sets on the two link components is not sent: the tsps client doesn't check it before sending a script trigger.
<!-- end-source-document: tsps-upstream/docs/skill-guide.md -->

---

<a id="doc-tsps-upstream-docs-slayer-tower"></a>
## tsps-upstream/docs/slayer-tower.md

<!-- source-document: tsps-upstream/docs/slayer-tower.md -->
<a id="doc-tsps-upstream-docs-slayer-tower--slayer-tower"></a>
### Slayer Tower

`server/plugins/areas/SlayerTower.plugin.js` handles the entrance door, the basement ladder and the basement's darkness. The ivy, the broken windows and the spikey chains are agility shortcuts in `server/plugins/skills/agility/shortcuts/Morytania.js`.

**Sources:**
- **an OSRS capture** (rsprox): the entrance, both window shortcuts, the ivy, and the basement ladder down and up;
- **the OSRS Wiki:** "Agility shortcuts" and "Spikey chain (Slayer Tower medium)", for levels and XP.

<a id="doc-tsps-upstream-docs-slayer-tower--entrance-captured"></a>
#### Entrance (captured)
The entrance is one double door: 2108 and 2111 in the doorway at 3428–3429, 3535, rotation 1.

**Open** (either leaf, the same tick):
- both leaves come off the doorway, and the open pair appears a tile north: 2112 (rotation 0) and 2113 (rotation 2);
- both gargoyle statues beside it, at 3426 and 3430, 3534, turn from 5116 to their open pose 5117;
- sounds 46, then 2717 twice.

**Close** (either open leaf): the leaves and statues go back, with sounds 60, then 2718 twice. It doesn't close on its own.

The generic Doors plugin used to pair only 2111 with 2112, and never touched the statues.

<a id="doc-tsps-upstream-docs-slayer-tower--basement-ladder-captured"></a>
#### Basement ladder (captured)
Ladder 30191 at 3417, 3535 (ground floor) ↔ 30192 at 3412, 9931 (plane 3).
- **Both ways:** animation 828 at the ladder, then the move a tick later.
- **Landing tiles:** going down lands at 3412, 9932, plane 3; going up lands at 3417, 3536.
- **Generic handler:** the generic ladder handler can't find this pair, since the ends are in different map regions. This plugin claims them through `ladders:climb`.

**The basement is dark:** varbit 278 (`darkness_level`) is 1, and the darkness overlay (97) shows on the atmosphere layer while you're inside. Coming up clears both.

**No light source needed:** the capture went down without one.

<a id="doc-tsps-upstream-docs-slayer-tower--agility-shortcuts"></a>
#### Agility shortcuts
| Shortcut | Level | XP | Captured |
|---|---|---|---|
| Broken window 57679, 3443, 3532: the banshee room | 18 | 3 | one 2-tile diagonal move between 3442, 3531 and 3444, 3533, animation 839 over 94 cycles; XP the tick after |
| Ivy 57677, 3418, 3533: up | 81 | **0** | see below |
| Broken window 57678, 3419, 3533, floor 2: down | 81 | **0** | see below |
| Spikey chains 16537/16538 | 61 / 71 | 3 | not captured |

**XP for the ivy and upper window:** the Wiki lists 3, but the capture shows no XP update for either, so we give none.

**Ivy up**, one tick each:

| Tick | What happens | Sound |
|---|---|---|
| 0 | animation 828 | 2454 |
| +1 | plane 1, animation 4435 (climbing loop) | 2454 |
| +2 | plane 2 | 2454 |
| +3 | animation 2757 (ledge walk), one tile east | — |
| +4 | animation 2588 (landing), in to 3420, 3534 | 2462 |

**Window down**, from 3420, 3534 on floor 2:
1. animation 741 (jump) onto the ledge, sound 2461;
2. animation 7142 (ledge walk) west;
3. animation 740 (climbing down), then down a plane each tick with sound 2454;
4. at the foot, facing south.

**Spikey chains:** the Wiki gives 3 XP on success, or 6 XP and 2–5 damage on a failure that still climbs. It gives no failure chance, and no text for the nose-peg warning on the medium chain, so neither is in yet.
<!-- end-source-document: tsps-upstream/docs/slayer-tower.md -->

---

<a id="doc-tsps-upstream-docs-stronghold-of-security"></a>
## tsps-upstream/docs/stronghold-of-security.md

<!-- source-document: tsps-upstream/docs/stronghold-of-security.md -->
<a id="doc-tsps-upstream-docs-stronghold-of-security--stronghold-of-security"></a>
### Stronghold of Security

The Stronghold of Security lives in `server/plugins/areas/strongholdofsecurity/`. Its data is `server/data/definitions/stronghold-of-security.json`: the floors, their objects, rewards and destinations, the 33 security questions, and the boots.

<a id="doc-tsps-upstream-docs-stronghold-of-security--sources"></a>
#### Sources

- **An rsprox capture of a full run:**
  - the entrance;
  - floor 1's portal and chest;
  - floor 2's doors and questions (one answered wrongly) and its ladder warning;
  - floor 3's chest;
  - floor 4's doors, Solztun and the Cradle of Life;
  - the bone chain back up.
- **The Wiki:** the questions table, the reward coins, and the portals' combat levels.
- **The cache's map:** the positions the run didn't visit, such as where each up-ladder leads.

Where the capture showed a question or response, its wording replaces the Wiki's, fixing typos such as "muse make sure" and "authentiation".

<a id="doc-tsps-upstream-docs-stronghold-of-security--the-doors"></a>
#### The doors

The doors are Gate of War, Rickety door, Oozing barrier and Portal of Death. They come in pairs with a gap between them; a pair's two doors lie along the passage, on the same axis, and may be mirrored.

| Moving | Question? |
| --- | --- |
| Into the gap | No |
| Out of the gap | Yes, unless the door is the one you last answered |
| Anywhere, once all four rewards are claimed (Wiki) | No |

**Any answer passes.** The door gives that answer's response, and on its continue, opens. The capture shows this for a wrong answer.

**The dialogue:** the door speaks as its floor's door NPC: the head (Gate of War 2494, Ricketty door 2495, Oozing barrier 2496, Portal of Death 2497) playing `door_chathead` (4281), under the name "Rickety Door" or "Portal of Death", as captured. Floors 1 and 3 use their NPC's name, not captured. The lines are "To pass you must answer me this: …", then the options, then the response.

**Passing a door:**

| Tick | What happens |
| --- | --- |
| The click | `busy` = 1, animation 4282 and sound 2858 |
| +1 | The player moves through the wall to the next tile |
| +2 | `busy` = 0 and animation 4283 |

After a question, the move comes on the response's continue.

<a id="doc-tsps-upstream-docs-stronghold-of-security--getting-around"></a>
#### Getting around

- **The entrance** (20790, Barbarian Village): a move to 1859,5243, then "You squeeze through the hole and find a ladder a few feet down leading into the Stronghold of Security."
- **Down** (Ladder 20785, Ladder 19004, Dripping vine 23706):
  1. the warning (579, "Are you sure you want to climb down?"); `cws_warning_4` (varbit 3854) counts up each time it's shown;
  2. on "Yes": animation 828;
  3. a tick later: "You climb down the ladder to the next level." and the next floor (2042,5245; 2123,5252; 2358,5215).

  "Don't ask me this again" skips the warning from then on. Going down to floor 2 completes the Varrock easy diary task "Enter the second level of the Stronghold of Security".
- **Up:** the ladders and vine climb as any ladder does (`ladders:climbUp`). Floor 1's go to the surface; the others land beside the ladder down on the floor above. Floor 4's Bone Chain says "You shin up the rope, squeeze through a passage then climb a ladder." and "You climb up the ladder which seems to twist and wind in all directions.", then puts you at 3081,3421.
- **The portals** ("You enter the portal to be whisked through to the treasure room.") work once the floor's reward is claimed. On floors 1–3 they also work from combat level 26, 51 and 76 (Wiki). Otherwise: "You must have completed this level to take this shortcut."

<a id="doc-tsps-upstream-docs-stronghold-of-security--rewards"></a>
#### Rewards

| Floor | Object | Coins (Wiki) | Emote (varbit) | Jingle |
| --- | --- | --- | --- | --- |
| 1 Vault of War | Gift of Peace | 2,000 | Flap (2309) | 157 |
| 2 Catacomb of Famine | Grain of Plenty | 3,000 | Slap Head (2310) | 179 |
| 3 Pit of Pestilence | Box of Health | 5,000, plus every stat restored ("You feel refreshed and renewed.") | Idea (2311) | 177 |
| 4 Sepulchre of Death | Cradle of Life | — | Stamp Foot (2312) | 158 |

**A chest:**
1. sound 1247 and its opening line ("The box hinges creak…" / "The grain shifts in the sack…");
2. on continue: the emote varbit, the coins and the jingle;
3. "...congratulations adventurer, you have been deemed worthy of this reward. You have also unlocked the X emote!".

Opened again: "You have already claimed your reward from this level." A claimed reward is also what counts as the floor being done. The emote tab's cache scripts read the varbits, which are restored on login.

**The Cradle of Life:**
1. sound 1246 and two message boxes;
2. two double item boxes (interface 11) showing the boots;
3. the skill-multi choice "Select the boots you want.": Fancy boots (9005), Fighting boots (9006) or Fancier boots (28672);
4. then the item box "You claim your prize: …<br>You have unlocked the 'Stamp Foot' emote.".

It can be searched again for more boots. OSRS gates the boots on 2FA and a Jagex Account; neither exists here, so all three are offered.

<a id="doc-tsps-upstream-docs-stronghold-of-security--not-modelled"></a>
#### Not modelled

- **The skull sceptre:** combining its parts, its teleport and charges, and Solztun's imbue. Its parts drop as usual.
- **Solztun's `sos_brother_found` varbit (5639)** and the dead explorer's notes. His transcript dialogue plays as for any NPC.
- **Monster aggression** inside the Stronghold.
- **The ladder warning's exact varbit meaning:** the capture shows it counting up. The "don't ask" choice is kept server-side.
- **Messages not captured:** the Cradle when you have no inventory space, and the line when reclaiming boots (written without the emote part).
<!-- end-source-document: tsps-upstream/docs/stronghold-of-security.md -->

---

<a id="doc-tsps-upstream-docs-teleport-tablets"></a>
## tsps-upstream/docs/teleport-tablets.md

<!-- source-document: tsps-upstream/docs/teleport-tablets.md -->
<a id="doc-tsps-upstream-docs-teleport-tablets--teleport-tablets"></a>
### Teleport tablets

Breaking a teleport tablet (a spell tablet such as Varrock teleport, Teleport to house, or Teleport to boat) uses the `TELE_TAB` teleport type (`server/src/main/typescript/elvarg/game/model/teleportation/TeleportType.ts`). The tablet plugins are `server/plugins/combat/SpellTeleports.plugin.js` and `server/plugins/skills/sailing/BoatTeleport.plugin.js`.

<a id="doc-tsps-upstream-docs-teleport-tablets--what-osrs-sends"></a>
#### What OSRS sends

Facts from a live OSRS capture (rsprox) of a player breaking a Varrock teleport tablet (inventory slot 14). Tick 0 is the tick of the click (`if_buttonx` on `inventory:items`, op 2):

| Tick | Sent |
| --- | --- |
| 0 | varbit `busy` (12393) = 1; animation `poh_smash_magic_tablet` (4069) with delay 16; `synth_sound` 965 with delay 15 |
| 2 | spotanim `poh_absorb_tablet_magic` (678); animation `poh_absorb_tablet_teleport` (4071); the tablet leaves its inventory slot |
| 4 | varbit `busy` = 0; the teleport (to 3212, 3423); animation reset (-1) |
| 5 | animation reset (-1) again |

There is no teleport sound of the player's own: a `sound_area` 200 on tick 1 of the capture is at another tile (a nearby player's teleport).

<a id="doc-tsps-upstream-docs-teleport-tablets--implementation"></a>
#### Implementation

- `TELE_TAB` plays 4069 (delay 16) on the click with sound 965 (delay 15), then 4071 and spotanim 678 as its middle step, lands with the reset animation and resets again the tick after.
- `TeleportTypeOptions` carries what only some teleports do: their own sound instead of the spell teleport sound, the `busy` varbit, and the repeated end animation.
- `TeleportHandler.teleport` takes an `onMiddle` callback; the tablet plugins use it to remove the tablet on tick 2. The usual checks (Wilderness level, teleblock, busy) still run before anything happens, so a refused tablet is never used up.
- `TeleportTask` runs its steps 0 and 1 both on the click's tick (once when submitted, once in that tick's task pass), so step n falls on tick n - 1. `TELE_TAB`'s start tick is 5 so that it lands on tick 4; other teleport types are unchanged until a capture of them shows their timing.
- Every teleport type frees the player on the landing tick (movement, untargetable, click delay), as the capture's `busy` = 0 on tick 4 shows; it used to hold them two more ticks. The release comes before the arrival callback, so a plugin can still hold the player there (boarding a boat, entering a house).
- `server/tests/teleport-tablets.test.cjs` runs a tablet teleport through the real task manager and checks each tick against the table above.

<a id="doc-tsps-upstream-docs-teleport-tablets--not-yet-checked"></a>
#### Not yet checked

The landing tile: the capture landed one tile from our fixed Varrock teleport destination (3213, 3424). OSRS may pick a random tile around the destination; one capture can't tell.
<!-- end-source-document: tsps-upstream/docs/teleport-tablets.md -->

---

<a id="doc-tsps-upstream-docs-thieving"></a>
## tsps-upstream/docs/thieving.md

<!-- source-document: tsps-upstream/docs/thieving.md -->
<a id="doc-tsps-upstream-docs-thieving--thieving-pickpocketing"></a>
### Thieving: pickpocketing

Pickpocketing is built from the OSRS Wiki: the [Thieving](https://oldschool.runescape.wiki/w/Thieving#Pickpocketing) page, each target's own page (its skilling success chart, Thieving info and loot), and the [Coin pouch](https://oldschool.runescape.wiki/w/Coin_pouch), [Rogue equipment](https://oldschool.runescape.wiki/w/Rogue_equipment), [Gloves of silence](https://oldschool.runescape.wiki/w/Gloves_of_silence), [Dodgy necklace](https://oldschool.runescape.wiki/w/Dodgy_necklace) and [Thieving cape](https://oldschool.runescape.wiki/w/Thieving_cape) pages. Item and NPC ids come from the cache.

<a id="doc-tsps-upstream-docs-thieving--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `server/data/definitions/pickpocketing.json` | Every target: its NPCs, level, experience, success chart, stun damage, coin pouch, quest, pet rate and loot. |
| `server/plugins/skills/Thieving.plugin.js` | Stalls, and registering the two modules below. |
| `server/plugins/skills/thieving/Pickpocket.Thieving.js` | The pickpocket itself: checks, timing, success, loot, failure and the equipment effects. |
| `server/plugins/skills/thieving/CoinPouch.Thieving.js` | Opening coin pouches ("Open-all" and "Open"). |

<a id="doc-tsps-upstream-docs-thieving--targets"></a>
#### Targets

Success is out of 256, at level 1 / level 99. A `*` marks a target whose page has no success chart (the Wiki lists its rate as unknown). These targets use the chart of the closest documented target at or below their level, named in the data file's `estimatedFrom`.

| Target | NPCs | Level | XP | Success | Stun damage | Coins per pouch | Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Man](https://oldschool.runescape.wiki/w/Man) | Man, Woman, Citizen | 1 | 8 | 180/240 | 1 | 3 |  |
| [Farmer](https://oldschool.runescape.wiki/w/Farmer) | Farmer | 10 | 14.5 | 150/240 | 1 | 9 |  |
| [H.A.M. member](https://oldschool.runescape.wiki/w/H.A.M._Member) | H.A.M. Member | 15 | 22.2 | 135/239 | 1–3 | 1–21 |  |
| [Workman](https://oldschool.runescape.wiki/w/Digsite_workman) | Digsite workman | 25 | 10.4 | 100/240* | 1 | – |  |
| [Warrior](https://oldschool.runescape.wiki/w/Warrior_(Thieving)) | Warrior, Al Kharid warrior | 25 | 26 | 100/240 | 2 | 18 |  |
| [Rogue](https://oldschool.runescape.wiki/w/Rogue) | Rogue | 32 | 36.5 | 75/240 | 2 | 25–40 |  |
| [Cave goblin](https://oldschool.runescape.wiki/w/Cave_goblin_(Dorgesh-Kaan)) | Cave goblin | 36 | 40 | 75/240* | 1 | 10–50 | Death to the Dorgeshuun |
| [Master farmer](https://oldschool.runescape.wiki/w/Master_Farmer) | Master Farmer, Martin the Master Gardener | 38 | 43 | 90/240 | 3 | – |  |
| [Guard](https://oldschool.runescape.wiki/w/Guard) | Guard | 40 | 46.8 | 50/240 | 2 | 30 |  |
| [Fremennik citizen](https://oldschool.runescape.wiki/w/Fremennik_citizen) | Agnar, Borrokar, Freidir and 6 more | 45 | 65 | 50/240* | 2 | 40 | The Fremennik Trials |
| [Wealthy citizen](https://oldschool.runescape.wiki/w/Wealthy_citizen) | Wealthy citizen | 50 | 96 | 35/200 | 3 | 85 |  |
| [Bandit](https://oldschool.runescape.wiki/w/Bandit_(Bandit_Camp)) | Bandit | 53 | 79.4 | 50/240 | 3 | 30 |  |
| [Knight](https://oldschool.runescape.wiki/w/Knight_of_Ardougne) | Knight of Ardougne | 55 | 84.3 | 50/240 | 3 | 50 |  |
| [Knight](https://oldschool.runescape.wiki/w/Knight_of_Varlamore) | Knight of Varlamore | 55 | 84.3 | 50/240* | 3 | 50 | Children of the Sun |
| [Pirate](https://oldschool.runescape.wiki/w/Pirate_(Thieving)) | Pirate | 60 | 72 | 50/240* | 3 | 20 |  |
| [Menaphite thug](https://oldschool.runescape.wiki/w/Menaphite_Thug) | Menaphite Thug | 65 | 137.5 | 50/160 | 5 | 60 |  |
| [Watchman](https://oldschool.runescape.wiki/w/Watchman) | Watchman | 65 | 137.5 | 15/160 | 3 | 60 |  |
| [Paladin](https://oldschool.runescape.wiki/w/Paladin) | Paladin | 70 | 131.8 | 40/170 | 3 | 80 |  |
| [Gnome](https://oldschool.runescape.wiki/w/Gnome) | Gnome, Gnome woman, Gnome child | 75 | 133.3 | 43/175 | 1 | 300 |  |
| [Hero](https://oldschool.runescape.wiki/w/Hero) | Hero | 80 | 163.3 | 39/160 | 3 | 200–300 |  |
| [Vyre](https://oldschool.runescape.wiki/w/Vyre_(Thieving)) | Caninelle Draynar, Carnivus Belamorta, Diphylla Bechstein and 27 more | 82 | 306.9 | 8/128 | 5 | 230–315 | Sins of the Father |
| [Elf](https://oldschool.runescape.wiki/w/Elf_(Thieving)) | Arvel, Goreu, Kelyn, Mawrth | 85 | 353.3 | 6/100 | 5 | 280–350 | Mourning's End Part I |
| [Elf](https://oldschool.runescape.wiki/w/Elf_(Thieving)) | Anaire, Aranwe, Aredhel and 46 more | 85 | 353.3 | 6/100 | 5 | 280–350 | Song of the Elves |
| [TzHaar-Hur](https://oldschool.runescape.wiki/w/TzHaar-Hur) | TzHaar-Hur | 90 | 103.4 | -200/200 | 4 | – | Fire cape |

<a id="doc-tsps-upstream-docs-thieving--how-a-pickpocket-plays-out"></a>
#### How a pickpocket plays out

1. **The click tick:** the checks run, the attempt message is sent ("You attempt to pick the man's pocket.") and the two-tick cooldown starts. The checks are the level, the requirement, the stun, combat, the coin pouch limit and inventory space.
2. **The outcome tick, either way:** the player stops tracking the NPC and faces the tile it stood on, so a walking NPC isn't followed round.
3. **The next tick, on success:** the pickpocket animation (881), the loot, "You pick the man's pocket.", the pickpocket sound (2581) and the experience.
4. **The next ticks, on failure** (from an rsprox capture of a hero, 2026-10-05):
   - **The next tick:** "You fail to pick the man's pocket." and the NPC's line ("What do you think you're doing?"), with no pickpocket animation.
   - **A tick later:** the NPC turns and strikes (its attack animation). The player blocks under the stunned_thieving graphic (245, height 124), the stun sound (2727) plays, and the 9-tick stun starts. Pickpocketing is blocked for 8 of those ticks, and no new attempt can start before the stun lands.
   - **A tick after that:** "You've been stunned!" and the target's stun damage.
5. **Success chance:** the Wiki's interpolation, `(floor(low × (99 − level) / 98 + high × (level − 1) / 98 + 0.5) + 1) / 256`. Each bonus scales low and high first, rounded down.
6. **Loot**, from the data file:
   - every `always` item;
   - then each `first` roll in order (clue scrolls, the Prifddinas crystal shard and enhanced crystal teleport seed, the vyre blood shard), where a hit replaces the table;
   - then one weighted `table` roll.

   Coins are given as the target's coin pouch.
7. **Clue scrolls:** a clue is a scroll box once X Marks the Spot is complete. Rolling a tier the player already owns, carried or banked, gives nothing.
8. **Master Farmer:** its herb seeds follow Farming level, as in the Wiki's calculator. Herb seeds are 48/1000 of its loot. Within that, ranarr, snapdragon and torstol share `(6 + min(85, Farming)) / 1000`, and guam gets 0.401 minus that.
9. **Digsite workman:** "Steal-from" rather than "Pickpocket". After The Dig Site, coins are 4/11 and the animal skull no longer drops.

<a id="doc-tsps-upstream-docs-thieving--equipment-and-effects"></a>
#### Equipment and effects

- **Gloves of silence:** ×1.05 success. They wear out after 62 failed pickpockets, which are counted on the player.
- **Thieving cape** (or a max cape): ×1.1 success, multiplied with the gloves.
- **Rogue equipment:** 15% double loot per piece; the full set of 5 always doubles. A doubled coin pouch gives one pouch plus that pouch's coins (the lowest of a range). Clue scrolls are never doubled.
- **Shadow Veil:** a 15% chance to avoid the stun, rolled first.
- **Dodgy necklace:** a 25% chance to avoid the stun and damage. It has 10 charges, stored on the player; the last one crumbles it.
- **Coin pouches:** a stack of 28 of one kind blocks pickpocketing until the pouches are opened. With a full inventory, a coins-only target can still be pickpocketed while its pouch stack has room.

<a id="doc-tsps-upstream-docs-thieving--requirements"></a>
#### Requirements

Quest requirements are checked with the `quest:is-complete` event, falling back to the quest's stage attribute. A quest that isn't in the game yet counts as not completed, so its targets stay locked until it's added:
- Death to the Dorgeshuun (cave goblins)
- Children of the Sun (Knights of Varlamore)
- Sins of the Father (vyres)
- Mourning's End Part I (Lletya elves)
- Song of the Elves (Prifddinas elves)

TzHaar-Hur need a fire or infernal cape (including their max-cape versions), worn or carried. That's the Wiki's requirement for entering Mor Ul Rek, which has no entrance check here.

<a id="doc-tsps-upstream-docs-thieving--not-modelled"></a>
#### Not modelled

- **Blackjacking:** knocking out and luring Pollnivneach villagers, bandits and thugs. The villagers and Pollnivneach bandits are left out, since the Wiki gives no plain pickpocket rate for them. Menaphite thugs can be pickpocketed normally.
- **Wealthy citizen:** the street urchin distraction, which lets them be pickpocketed repeatedly with one click.
- **The Ardougne diary:** no diary system exists yet. Its effects would be +10% success (medium: in Ardougne; hard: everywhere), the gloves of silence becoming ineffective, and coin pouch limits of 56, 84 and 140.
- **Location- or quest-only loot:** the Pirate's medallion fragment (The Onyx Crest only), the Pirate's very rare medium clue (no rate given), and the H.A.M. robe table during Death to the Dorgeshuun.
- **The Digsite workman** being twice as slow to pickpocket as other NPCs.
- **The in-game loot tracker:** OSRS adds each pickpocket's loot to it (client script 7192, `loottracker_lootadd`).
- **Spam filtering:** OSRS sends the pickpocket messages as spam-type messages, which players can filter out. Here they are ordinary game messages.

<a id="doc-tsps-upstream-docs-thieving--cache-npcs-with-a-pickpocket-option-that-this-doesnt-cover"></a>
#### Cache NPCs with a Pickpocket option that this doesn't cover

- **Quest plugins:** Twig and Berry (Troll Stronghold), Curator Haig Halen (The Golem), Dr Fenkenstrain (Creature of Fenkenstrain) and Sandy (The Hand in the Sand) handle their own.
- **Blackjacking (not modelled):** Villager, and the Pollnivneach bandits (NPC ids 734–737, which share the name "Bandit" with the Bandit Camp's 690 and 695).
- **No Wiki pickpocket data:** Anja, Hengel, Drunken man, Head Guard, Student, Tourist, Priest, Zealot, Salvager, Adala, Constantinius, Cozyac, Istoria, Movario, Patzi, Pavo, Xocotla, Emissary Ascended, Cuffs, Jeff, Narf, Rusty, 'Black-eye', 'Gummy', 'No fingers' and 'The Guns'.

<a id="doc-tsps-upstream-docs-thieving--unverified-details"></a>
#### Unverified details

These aren't on the Wiki and are worth checking against a capture:
- **Messages:** the requirement messages, the coin pouch opening messages, the dodgy necklace's charge and crumble messages, and "Your gloves of silence have worn out."
- **NPC names in messages:** NPC names are lowercased, except the H.A.M. member, the Menaphite thug and TzHaar-Hur. Named NPCs (Fremennik citizens, vyres and elves) keep their own names without "the".
- **The Master Farmer's line** "Cor blimey mate, what are ye doing in me pockets?". The Wiki only confirms "Cor blimey"; the other targets use "What do you think you're doing?".
- **Stun length:** each target's Thieving info lists a stun timer of 4–6 s. The stun here is the 9 ticks of no movement and 8 of no pickpocketing that the Thieving page gives for all targets. The capture confirms 9 ticks of no movement for a hero, whose page says 6 s; the 8-tick pickpocket lock wasn't captured.
- **Pet rates:** the Digsite workman and the Knight of Varlamore have no Rocky rate on the Wiki. They use the Warrior's and the Knight of Ardougne's.
<!-- end-source-document: tsps-upstream/docs/thieving.md -->

---

<a id="doc-tsps-upstream-docs-tombs-of-amascut"></a>
## tsps-upstream/docs/tombs-of-amascut.md

<!-- source-document: tsps-upstream/docs/tombs-of-amascut.md -->
<a id="doc-tsps-upstream-docs-tombs-of-amascut--tombs-of-amascut"></a>
### Tombs of Amascut

The whole raid, from the Jaltevas pyramid lobby to Osmumten's burial chamber. It is a single plugin, `server/plugins/minigames/TombsOfAmascut.plugin.js`, which delegates to one unit per area in `server/plugins/minigames/toa/`.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `ToaShared.js` | Room table (spawns, challenge floors, bounds), path table, ids, varbits, and helpers such as fades, tile graphics, projectiles and knockback. |
| `ToaInvocations.js` | Invocation bitmaps read from cache structs (params 1159/1161/1162), raid level, mode, team lives, time limit and supply factor. |
| `ToaParties.js` | Lobby parties: applications, kicks, the party list and party settings. |
| `ToaRaid.js` | `Raid` and the `Room` base class: instancing, scaling, points, deaths, team wipes, the HUD and completion. |
| `Lobby.*` | Pyramid entry and exit, the grouping obelisk (772/774), the invocation board (776) and invocation presets. |
| `Raid.*` | Barriers, entries, exits, teleport crystals, Osmumten, safe deaths, ghosts, damage points and the invocation punishments. |
| `Nexus.*` | Path choice and path levels, the helpful spirit's supplies (777) and the supplies bag (778). |
| `Supplies.*` | Nectar, Tears, Ambrosia, Smelling salts, Blessed crystal scarab, Liquid adrenaline, Silk dressing and Honey locust. |
| `Scabaras.*`, `Kephri.*` | Path of Scabaras: the four puzzle variants and Kephri. |
| `Het.*`, `Akkha.*` | Path of Het: the beam and mirror puzzle and Akkha. |
| `Crondis.*`, `Zebak.*` | Path of Crondis: the palm-watering puzzle and Zebak. |
| `Apmeken.*`, `BaBa.*` | Path of Apmeken: Apmeken's Sight and Ba-Ba. |
| `Wardens.*`, `ToaWardensData.js` | The Wardens: obelisk and core phases (WARDENS_P1) and the final phase (WARDENS_P3). |
| `Rewards.*`, `ToaRewards.js` | The burial chamber, loot rolls, the loot interface (771) and the lobby retrieval chest. |
| `Items.*` | Masori fortifying, Armadyl to Armadylean plates, Elidinis' ward (f), Thread of Elidinis, keris jewels and Tumeken's shadow charges. |
| `Shadow.*` | Tumeken's shadow in combat: its built-in spell and its passive. |

<a id="doc-tsps-upstream-docs-tombs-of-amascut--instancing"></a>
#### Instancing

Each raid has one `PrivateArea` covering the tombs region (x 3520–3967, y 5120–5439, planes 0–3). Rooms stay at their real coordinates. The area isolates NPCs, objects, ground items and clipping per party, so two parties never see each other. `world.json` marks the region multi-combat.

Engine additions this feature needed:

- tile spot animations (`SPOT_ANIM` target type 2) in both the server encoder and the client decoder, used by `sendGraphic`/`sendGlobalGraphic`;
- per-NPC maximum hitpoints (`NPC.setMaxHitpoints`), used for raid scaling and the health bar;
- cache struct params (`CacheDefinitions.getStructParams`), used to read invocations;
- `ForceMovement`, `ForceMovementTask`, `OperationType`, `LocModelType` and `StatementDialogue` on `api.core`.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--scaling-and-points"></a>
#### Scaling and points

These follow the wiki's *Tombs of Amascut* mechanics:

- **NPC hitpoints:** base × (1 + 0.4% per raid level) × party factor × path-level factor. The party factor is +90% for each of players two and three, then +60% each. Results are rounded as the Wiki's DPS calculator does: to 10 above 300 HP, to 5 above 100, and not below that. (OpenRune #274's Zebak checkpoints, 580 / 930 / 1,280 solo at raid level 0 / 150 / 300 and 1,760 for two at 150, come out the same.)
- **NPC accuracy and defence:** attack and defence rolls × (1 + raid level / 250), applied to the roll rather than the Defence level, so drains still bite.
- **NPC damage:** the same raid-level and path-level factors, capped at 2.5×.
- **Points:**
  - Everyone starts on 5,000 points, which are taken off again for the loot and the purple chance.
  - Damage dealt × the NPC's points multiplier earns room points, capped at 20,000 a room (60,000 for the Wardens, from OpenRune). They're added to the total, capped at 64,000, when the room is completed.
  - The room's top scorer gets an MVP bonus of 300 × team size.
  - Puzzle completions are worth Scabaras 300, Apmeken 450 and Crondis 400. These are OpenRune's numbers; the Wiki gives none.
  - A death costs 20% of a player's total (at least 1,000).
  - At the end, each player's loot points go to `TOA_PERSONAL_CONTRIBUTION` (varp 3606).
- **Unique loot:** chance = total party points / (10,500 − 20 × (raid level up to 400 + a third of the next 150)) percent, capped at 55%. At most one unique per raid; the recipient is weighted by personal points. Weights out of 24: Lightbearer 7, Osmumten's fang 7, Elidinis' ward 3, each Masori piece 2, Tumeken's shadow 1. Below raid level 150, the ward, Masori and shadow need an extra 1/50 roll; below 50, so do all uniques.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--behaviour-taken-only-from-near-reality"></a>
#### Behaviour taken only from Near-Reality

The OSRS Wiki and the cache weren't reachable when this was first written, so Near-Reality's ToA code was the behaviour oracle. The following still come from it alone, where the Wiki gives no numbers (see *Checked against the Wiki and the cache*):

- Every boss's attack timings, special-attack cycles, tile patterns and base damage numbers. This includes the Wardens' orb paths, rotating-blade tiles, wheel, isolation, skull-bomb and floor-collapse tables (`ToaWardensData.js`), and Akkha's orb paths and quadrants.
- Wardens phase two: only the Warden's current style (magic or ranged) breaks its shield. Core damage passes through ×5, and the core stays out for 21/29/37/45/53 ticks depending on remaining health.
- Points multipliers on Warden NPCs: obelisk 1.5, Warden 2, final Warden 2.5.
- The common loot table's items and divisors, fossilised dung below 1,500 points, and the deathless kits and remnants. (The quantity factor above raid level 300 matches the Wiki.)
- Tumeken's shadow charge cost (2 soul + 5 chaos per charge, 20,000 maximum), the Masori and Armadyl plate counts and experience, and the ward's 10,000 soul runes.
- The lobby scoreboard (46071, interface 775), filled as OpenRune does:
  - A tab per mode (`TOA_SCOREBOARD_TAB`) shows your attempts, completions and deaths, and your best overall and challenge times for each team size.
  - These are recorded from now on: an attempt when a raid starts, a death on each death, and times on completion.
  - The world columns show "-", since there are no world-wide records.
- The lobby's shroud chest (46080): Icthlarin's shroud tiers at 100/500/1000/1500/2000 Normal+Expert completions, and the tier 5 hood (Wiki; the menu is OpenRune's).
- The pickaxe cavities (45468 in Het's room, 49566 in the lobby) keep one pickaxe per player. It's shown in the wall by `TOA_PICKAXE_STORED` (varbit 14440, its place in OpenRune's list plus one). Bronze is turned away ("Het will provide"). Deposit stores the best held or wielded pickaxe; using one on the cavity stores that one.
- The Scabaras puzzle room's shortcuts between its north and south paths (the Wiki only says they exist):
  - The Passage (45343) is crawled through from (3548, 5276) or (3548, 5284).
  - The Platform (45396) is jumped across from (3560, 5277) or (3560, 5283).
- Attack delay:
  - Striking a Scabaras obelisk, or an energy siphon with melee, stops the attack and leaves no attack delay, so the next one can be hit at once.
  - When the final Warden sends its skulls, every player's attack is stopped and their delay cleared the same way.
  - Kephri's eggs keep the normal delay; Near-Reality doesn't clear it for them either.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--npc-animations"></a>
#### NPC animations

Each Tombs of Amascut NPC (11689-11804) has its block and death animations in `npc-combat-defs.json`. Without them, they fell back to the player's block (424) and death (836), so Zebak "blocked" like a human when hit.

- **Block:** none of them has a block or defend animation, except Osmumten's ghosts, so a hit plays nothing.
- **Death:** each uses its own death sequence, identified by its Jagex name in RuneLite's gameval `AnimationID`, for example `NPC_ZEBAK01_DEATH` (9634) and `NPC_KEPHRI_DEATH` (9582). The Near-Reality data gives Zebak and Kephri zombie animations (5568/5569), which aren't used.
- **Scripted deaths:** the bosses' deaths are played by the plugins, and the definitions agree with them.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--zebak"></a>
#### Zebak

Checked against OpenRune-Server #274, which was built against a live capture, with the Wiki taking priority. RuneLite's gameval names the ids.

**From the Wiki:**
- Each roar wave hits each rock for 50; a rock has 150 HP and crumbles when it runs out.
- Blood clouds lose 2 for every tile they move, and drain 2 a tick from anyone beside them.
- His Defence drains by at most 20, so never below 50.
- A blood barrage heals him twice the damage it deals.
- A special still queued when he enrages is dropped.

**From OpenRune, where the Wiki gives no figures:**

| What | Value |
| --- | --- |
| Acid | 6-10 a tick, scaled |
| Barrage | 3-5, scaled |
| Bite | Lands 2 ticks after it; Protect from Melee blocks half |
| First attack | After 10 ticks |
| During specials | His autos carry on; the roar holds them 10 ticks at the start and 11 for the scream |
| Great Roar | Throws at tick 1, scream at 33, waves at 36/38/40, rocks cleared at 58 |
| Tidal waves | Throws at 1, tail slam at 5, rocks fall at 7, rows at 14/21/28, done at 45 |
| Jugs | A push rolls them 8 tiles; a hit shatters them a tick later; only the first roar wave chips them |
| Rocks | Placed within (3925, 5401)-(3935, 5415); acid under one is cleared |
| Camera shakes | His death (2 ticks in) and the falling rocks before the waves |

**The volley as OSRS draws it:**
1. The volley rises (2176/2178) from height 200 to 700, arcing at 30.
2. It bursts (2186/2185) at height 750 on a helper NPC, `SPOTANIM_ZEBAK_RANGED01_NPC` (11744), spawned for 3 ticks so it is centred on the split point. A tile graphic's height is one byte, so it can't sit that high.
3. The fragments (2181/2187) drop from 700 to 90 over 90 cycles, arcing at 127.

**Enraged** (below 25%) he becomes `TOA_ZEBAK_ENRAGED` (11732), with the enraged attack animations (9622/9623 melee, 9626/9627 ranged) and the enraged rising projectiles (2177/2179). RuneLite names them for the enrage; OpenRune uses the enraged melee only.

**Not done:** acid that ramps up the longer you stand in it (the Wiki describes it; neither source gives numbers), and the volley's split and impact sounds (RuneLite doesn't name sound ids).

<a id="doc-tsps-upstream-docs-tombs-of-amascut--simplifications"></a>
#### Simplifications

- **Tumeken's shadow:** it plays no cast or impact sound (the ids aren't known), and it refuses every player target rather than only those outside minigames. Accurate's invisible +3 Magic isn't applied.
- **Apmeken:** the corruption special is disabled, as it is in Near-Reality.
- **Wardens phase three floor:** collapsed rows push players back onto the remaining floor rather than becoming unwalkable.
- **The pet:** the Wiki gives its formula but not its exact raid level scaling beyond thresholds at 400 and 550; it uses a third of the levels between them.
- **Logout and failure:** logging out leaves the raid with no rejoin, and a failed raid keeps your items. OSRS sends them to a retrieval chest in the lobby for a fee; there's no retrieval chest yet.
- **Restart recovery:** logging in inside the tombs without an active raid returns you to the lobby. The raid exit also returns stranded players to the lobby.
- **Scoreboard:** the burial chamber scoreboard (44942) isn't implemented; the lobby one shows only personal records.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--checked-against-the-wiki-and-the-cache"></a>
#### Checked against the Wiki and the cache

The first version was written without access to the Wiki or the cache, so it followed Near-Reality alone. A later pass checked it against both, along with RuneLite's gameval names (Jagex's own names for animations, spotanims, interfaces, varbits and varps).

**Ids:**
- **Animations:** every boss's matches its name. Zebak's and his tail's melee animations had been swapped.
- **Projectiles and graphics:** all are named and fit.
- **Interfaces 771–778 and 481:** all are the ToA groups they're used as. The boss health HUD (303 at `161:2`, varp 1683, varbits 6099/6100) matches a live capture from the Gemstone Crab.
- **Varbits and varps:**
  - The reward niche (46224) switches on `TOA_SHOULD_HAVE_LOOT` (14319); 14139 was a PvP Arena varbit.
  - Points had been sent to "varbit" 3586, a farming varbit in this cache. Now only each player's final loot points are sent, to `TOA_PERSONAL_CONTRIBUTION` (varp 3606), as OpenRune does.
  - The crocodile wall openings (`TOA_WALL02_CROCODILES04`, 45434) and Zebak's rock steps (`TOA_ZEBAK_CLIMBING_ROCK`, 45509) are the cache's.
- **The obelisk's interfaces:** the party list (772) and details panel (774) are built from pause buttons (`resume_pausebutton`), as OpenRune sets them. Ours had set op1 events, and the member rows always got the leader's view value.
- **The details panel's button numbers** come from its cache scripts: the 12 fixed buttons (enum 4792), members from 12, the applicants' Accept from 36 and Decline from 44 (script 6746), and the invocations from 52 in enum 4664's order (script 6754). Ours had Accept at 20, Decline at 28 and the invocations at 36, so Accept toggled an invocation and the invocation buttons were 16 off. Enum 4664's last two, Blazing Tombs I and II (structs 5892/5893, an event's), aren't offered. Those buttons click through with `.cc_resume_pausebutton` (operand 1: the child found with `cc_find 1` on 774:1). The client used to resume the clicked button itself whatever the operand, so the server never heard those clicks.
- **Options:** every hooked NPC, item and loc option exists in the cache. The supplies bag's are *Open*, *Withdraw 1*, *Withdraw All* and *Resupply*, and now all work.

**Behaviour, against the Wiki:**
- **Raid scaling** (raid level, party size, path level) matches.
- **Zebak:** max hits are now 38 melee and 16 magic/ranged, and a wave hits for 6–10.
- **Kephri:** her attacks speed up with path level, and her fireball's max hit is 24.
- **Ba-Ba:** Protect from Melee fully blocks her melee (since June 2025), and her boulders have 27 and 31 hitpoints at path levels 2 and 4. She is worth 2 points per damage.
- **Zebak's water:**
  - A wave that runs out of floor throws the player into the water (5 tiles, from OpenRune).
  - Swimmers can't attack or run, and climb out by the rock steps.
  - The water crocodiles (11741: bubbles with strength 70, so a max hit of 8 before scaling) bite swimmers every 2 ticks.
  - A bite bleeds 1 time in 4 instead of hitting: 5–10 at once, then 1–8 on each tick spent moving, for 10 ticks. These numbers are OpenRune's; the Wiki only says moving makes it worse.
- **Crondis puzzle:**
  - The palm needs 175 water, plus 125 for each extra player.
  - A crocodile bites for 18, plus 3 for each acid or spear hit in the last 30 seconds, up to 36.
  - Crocodiles go for anyone carrying water nearby, then a watered palm, then someone without a container who hit them.
  - From OpenRune: crocodiles enter from one of three sides, a wave comes every 46–50 ticks, and they wake 4 ticks after spawning.
- **Invocations:**
  - On a Diet blocks all food, honey locusts included.
  - Dehydration blocks every potion that restores health, Guthix rests included.
  - The help invocations cut supplies to 66%, 33% and 10%.
- **Supplies:** the helpful spirit's chaos pack is rolled (1–8 nectar, 0–6 tears, 0–2 salts, with rare ambrosia and adrenaline), and the power pack has 1 liquid adrenaline. A supply used on the bag goes back in (from OpenRune).
- **The Wardens' void art:** the map keeps the collapsed floor's "Void" pieces (45726–45738) on plane 2, above the final arena. OSRS builds the room without them. The final room hides them, so they no longer show before the floor starts falling.
- **Tumeken's shadow (Wiki):**
  - It casts only its built-in spell: max hit floor(Magic / 3) + 1, every 5 ticks, from 8 tiles (10 on Longrange), one charge a cast, with the usual damage-based Magic experience.
  - Its definition (`item-gameplay.json`): +35 magic attack, +20 magic defence and +1 prayer, two-handed, 85 Magic to wield. It uses the powered staff's styles (`POWERED_STAFF`, cache weapon category 24: Accurate, Accurate, Longrange). Before, it had no entry, so it fell back to unarmed with no bonuses.
  - Its passive multiplies the worn gear's magic attack and magic damage bonuses by 3, or by 4 in the tombs. Magic damage is capped at 100%.
  - It can't be used against players.
  - The cast is OpenRune's: `TOA_SOT_CAST_B` (9493) with `TUMEKENS_SHADOW_CASTING` / `_TRAVEL` / `_IMPACT` (2125–2127). The hit lands as the projectile arrives.
- **Ghosts:** a ghost's inventory and worn equipment tabs close until it's revived (from OpenRune).
- **Raid items:** logging in outside a raid strips raid supplies.
- **The chest:** the unique chance and weights, the pet, the Thread of Elidinis, the four keris jewels and the elite clue now use the Wiki's rates.
- **The sarcophagus (Wiki):**
  - A unique turns the flames around Osmumten's sarcophagus purple, and its finder opens the sarcophagus to reveal it. Their chest has no common rolls; its tertiaries still drop.
  - The cache drives the vault from one varbit, `TOA_VAULT_SARCOPHAGUS` (14373). It switches the sarcophagus (46220: closed 44825, or purple with Open 44826), the floor glow (46222) and the barrier (46221).
  - Opening it plays `TOA_OSMUMTEN_CHEST_REVEAL` (9505, about 8 ticks), then shows the opened sarcophagus (44934) with `TOA_OSMUMTEN_CHEST_OPEN` (9506).
  - How OSRS hands the item over isn't known, so the unique then joins the finder's loot in the reward interface (771). The opened sarcophagus's Search reopens it.
  - An unopened sarcophagus's unique is kept (persisted) and comes out of the lobby chest.
- **The vault's chests:** each party slot has its own chest (`TOA_VAULT_CHEST_LOC0`–`7`, varbits 14356–14360 and 14370–14372). A player sees their own chest as theirs (2) or emptied (4), and the others as someone else's; another player's chest won't open for them.
- **Moving NPCs:** Zebak's waves and jugs, Akkha's unstable orbs, Ba-Ba's boulders and the moving Wardens move with collision off, as in Near-Reality. Before, the route finder couldn't move them over tiles the map blocks.

**Still open:**
- **Akkha's damage:** the Wiki's infobox gives a max hit of 55, and the plugin uses 22 for every style. 22 x 2.5 (the +150% damage cap) is exactly 55, so the 55 may be the capped value.
- **Impact graphics:** a few use generic graphics where the cache has dedicated ToA ones. Zebak's are settled: OpenRune's capture-based volley also lands with `FIREBLAST_IMPACT` / `DARKBOW_SMOKE_ARROW_IMPACT`, and `ZEBAK_MAGE_SPLIT` / `ZEBAK_RANGED_SPLIT` are the bursts.
- **Sound ids:** RuneLite has no names for them.
- **Unnamed cache entries:** these keep their numeric constants: Warden charging orb 11769, hidden Warden 11765, departing spirit 11829, blade objects 45748/45749, platform 45606, siphon block 26209.

<a id="doc-tsps-upstream-docs-tombs-of-amascut--verification"></a>
#### Verification

Developer accounts can use `::toa` to teleport to the lobby beneath Necropolis (not from inside a raid).

Developer accounts can use `::toaskippuzzle` inside any of the four pre-boss puzzle rooms.
It completes that room for the party, removes its remaining NPCs, and opens the normal
route to the boss. Use the room exit afterward. It also works before starting the puzzle.
The command uses normal completion, including puzzle points and revival; it does not
complete bosses or work in the lobby or Nexus. Repeating it does not award points again.

`::toaskipboss` is also Developer-only. It completes the current boss encounter for the
party, removes remaining enemies, and preserves Osmumten and the normal route onward.
At the Wardens it first advances to the final phase; use it again after arriving to finish
the raid and unlock the normal reward route. Completion points and rewards still apply.

`::toaskiptowarden` (Developer-only) works in the Nexus. It marks all four paths complete and
rebuilds the Nexus, so the Wardens' entrance opens and the helpful spirit offers supplies.
The skipped paths give no points, so the loot reflects only what was actually fought.

`::toaskiptoreward [points] [raid level]` (Developer-only) works anywhere in a raid. It ends
the raid as if the Wardens fell and takes the party to the chest. Every player gets `points`
loot points (on top of the 5,000 start; 0–59,000, default 20,000). A raid level (0–600), if
given, replaces the invocations' level for the loot rolls. It doesn't add to completion counts.
Words after the numbers force loot for the player using it: `purple` (a unique picked by the
usual weights at that raid level), or one by name (`lightbearer`, `fang`, `ward`, `masori` for
a random piece, `mask`, `body`, `chaps`, `shadow`), and `pet`. For example,
`::toaskiptoreward 30000 500 shadow pet` or just `::toaskiptoreward purple`.

Run `npx tsc --noEmit -p tsconfig.json` in `server`, then load the plugins. With `TS_NODE_TRANSPILE_ONLY=1`, a `node -r ts-node/register` script that calls `PluginManager.loadFromDirectory()` should list `TombsOfAmascut` among the loaded plugins.

In-game follow-up, done by hand:

1. Form a party at the obelisk, set invocations and enter.
2. Clear each path's puzzle and boss.
3. Beat the Wardens and claim the chest.
4. Leave with unclaimed loot and collect it from the lobby chest.
<!-- end-source-document: tsps-upstream/docs/tombs-of-amascut.md -->

---

<a id="doc-tsps-upstream-docs-warriors-guild"></a>
## tsps-upstream/docs/warriors-guild.md

<!-- source-document: tsps-upstream/docs/warriors-guild.md -->
<a id="doc-tsps-upstream-docs-warriors-guild--warriors-guild"></a>
### Warriors' Guild

The guild in Burthorpe (`server/plugins/areas/WarriorsGuild.plugin.js`, with one file per room in `server/plugins/areas/warriors-guild/`). Behaviour is from the OSRS Wiki. Where the Wiki is silent (timings, animations, some messages), it follows Near-Reality's port, with ids checked against Void's data and this server's cache. Dialogue is the NPCs' Wiki transcripts from `npc-dialogues.json`; the plugin only answers their conditions and actions.

The plugin lives under `areas/` so that its door and ladder handlers run before `objects/Doors` and `objects/Ladders`.

<a id="doc-tsps-upstream-docs-warriors-guild--how-it-works"></a>
#### How it works

- **Entry:** Ghommal's door (24318) lets in a combined base Attack and Strength of 130, or 99 in either. Boosts don't count.
- **Tokens:** the dummy, catapult and shot put rooms write tokens into the guild ledger (`warriors-guild:tokens`). Staff pay them out through "May I claim my tokens please?" or their Claim-Tokens option: Gamfred, Ajjat, Kamfreena, Shanomi, both Refs, Lorelai and Sloane. Animated armour drops its tokens on the ground instead.
- **Animation room:** a plain full helm, platebody and platelegs of one metal on a magical animator becomes animated armour.
  - It drops tokens and the armour from `npc-drops.json`. Bronze pieces each come back 9 times in 10 (a correction in `NpcDrops`), iron loses its legs 1 time in 10, and steel its helm 1 time in 10.
  - Armour left alive for five minutes, or whose owner dies or logs out, goes to Shanomi. Her "armour disappeared" transcript gives it back.
- **Dummy room:** one of seven dummies is up at a time, for 4-15 ticks. The right style or attack type gives 15 Attack XP and 2 tokens. The wrong one stuns for 3 ticks.
- **Catapult room:** Gamfred hands out the defensive shield. It can only be wielded on the target (2842, 3545, 1).
  - While it's on, the equipment tab becomes the defence styles (interface 411), and the quest, prayer, magic, options, emote and music tabs are hidden.
  - The catapult fires every 8 ticks. A block gives 10 Defence XP and 1 token.
  - Stepping off the target puts the shield back in the inventory.
- **Shot put:** the heavy doors need 50 base Strength. The north door gives 0-11 XP and the south door 0-1.
  - A shot's power is X = Strength + run energy + style (30/20/10) + 5 for dusted hands - weight (18 or 22).
  - It lands with probability X/250, otherwise it drops on the player's toe for 1 damage.
  - It flies 1-14 yards by the Wiki's X thresholds, gives X * 0.7 Strength XP, and costs X * 0.1 run energy.
  - Tokens are the distance + 1 (18lb) or + 3 (22lb).
  - Ashes ground with a pestle and mortar dust the hands for the next throw.
- **Kegs (Jimmy):** with the head and hands empty, up to five kegs are stacked (multilocs 15669-15673 on varbits 2252-2256, head items 8860-8864). The player stands and walks with animations 4179 and 4178 while balancing.
  - The stack falls more often at low run energy and hurts for 2-4.
  - Leaving the room drops the kegs with no reward.
  - Jimmy writes the keg tokens into the ledger.
- **Cyclopes:** Kamfreena's room (top floor) and Lorelai's (basement, down the ladder behind the guild) need 100 tokens. They take 10 on entry and 10 each minute, then allow one minute's grace before moving the player out. An Attack or max cape gets in free, and must stay on.
  - Top-floor cyclopes drop, at 1/50, the defender after the best one the player owned when they walked in, up to rune. Owned means carried, worn or banked.
  - The basement door needs a rune defender shown to Lorelai once (`warriors-guild:basement-unlocked`). Its cyclopes drop the dragon defender at 1/100.
  - `NpcDrops` emits `npc-drops:roll`, and the plugin removes the dump's flat defender entries and adds the right one.
  - Ranged and magic do no damage to the guild's cyclopes or animated armour.
- **Skillcapes:** Ajjat (Attack) and Sloane (Strength) sell their cape and hood for 99,000 coins at 99. The cape is trimmed with more than one 99.
- **Overheads:** Shanomi speaks in order every 15 ticks, Kamfreena at random every 50, and Jimmy while kegs are balanced.

<a id="doc-tsps-upstream-docs-warriors-guild--data-fixes"></a>
#### Data fixes

- Ghommal, Harrallak and Sloane spawned as their While Guthix Sleeps multi-NPCs (2457, 2458, 2473), which are invisible at varbit 0. They now spawn as 13613, 13615 and 13616, at the Wiki's tiles.

<a id="doc-tsps-upstream-docs-warriors-guild--not-from-the-wiki"></a>
#### Not from the Wiki

These need checking against live OSRS:

- **Keg balancing rewards.** The Wiki has no numbers, so these are Near-Reality's: Strength XP 10 × kegs and tokens 10 × kegs + ticks / 2 when a stack of two or more falls; 9 energy every 10 ticks; and the fall chance.
- **Messages with no Wiki source:**
  - Ghommal's refusal at the door, and Lorelai's at her locked door (Near-Reality's lines).
  - The heavy door's Strength message.
  - Shot put at under 5% run energy.
  - Dusting hands.
  - Wielding the defensive shield off the target, or with a weapon.
  - "You've already summoned an animated armour."
  - "You can only use melee weapons in this minigame."
- **Damage when a catapult block fails:** 1-5.

<a id="doc-tsps-upstream-docs-warriors-guild--not-done"></a>
#### Not done

- The Combat Achievement token multipliers (doubled or tripled), since there are no Combat Achievements yet.
- Animated armour running away at low hitpoints.
- The Ref being hit by a stray shot.
<!-- end-source-document: tsps-upstream/docs/warriors-guild.md -->

---

<a id="doc-tsps-upstream-docs-webgpu-renderer"></a>
## tsps-upstream/docs/webgpu-renderer.md

<!-- source-document: tsps-upstream/docs/webgpu-renderer.md -->
<a id="doc-tsps-upstream-docs-webgpu-renderer--webgpu-renderer"></a>
### WebGPU renderer

Goal: the client renders through WebGPU when the browser supports it, and falls back to the
existing WebGL2/PicoGL renderer when it does not, with no user-visible difference once each
stage lands. Staged so the game is never less playable than it is today.

Status legend: **done**, **in progress**, **planned**.

<a id="doc-tsps-upstream-docs-webgpu-renderer--where-things-are-today"></a>
#### Where things are today
- `Renderer` (`client/game/render/Renderer.ts`) owns the canvas, resize and the frame scheduler.
- `GameRenderer` (`client/game/GameRenderer.ts`) is the game-level shell: `MapManager`, camera
  input, cache init, map streaming policy. It is already generic over `MapSquare`.
- `WebGLOsrsRenderer` (`client/render/WebGLOsrsRenderer.ts`) is the only concrete backend. Its
  frame loop lives in `client/render/render/` and drives PicoGL directly (`host.app`, `host.gl`,
  `host.*Program`).
- Textures/meshes are built backend-neutral on the CPU (`SdMapData`, `TextureLoader`) and only
  uploaded with backend-specific calls.
- Selection is `getAvailableRenderers()` in `client/game/GameRenderers.ts` — synchronous, WebGL
  only.

<a id="doc-tsps-upstream-docs-webgpu-renderer--architecture"></a>
#### Architecture

```
Renderer                     frame scheduler (unchanged)
  └─ GameRenderer<T>         game shell: MapManager, input, cache, streaming policy
       ├─ WebGLOsrsRenderer  existing backend, all passes
       └─ WebGPURenderer     new backend (client/render/webgpu/)
```

Rules that keep the port cheap:

1. **CPU-side data is the interface.** `SdMapData` vertex/index bytes, draw ranges, model-info
   textures, heightmaps, watermasks, `TextureLoader` pixels and `draw.ts` actor packing stay
   shared. Only uploads and draw dispatch differ per backend.
2. **One backend at a time owns the canvas.** No mixed contexts. Stages that are not ported yet
   are simply unavailable under WebGPU, not silently broken.
3. **Opt-in first, default last.** `?renderer=webgpu` selects the new backend until Stage 7.
   `PREFER_WEBGPU_DEFAULT` in `GameRenderers.ts` flips the default when parity is reached.
4. **Fallback is serverless and automatic.** If WebGPU is requested (URL or default) but no
   adapter can be obtained, the client logs and uses WebGL.

<a id="doc-tsps-upstream-docs-webgpu-renderer--directory-layout"></a>
#### Directory layout

```
client/render/webgpu/
  WebGPURenderer.ts        device/context life cycle, frame loop, selection entry
  WebGPUMapSquare.ts       MapSquare implementation: GPU buffers per map + draw
  WorldResources.ts        shared textures (atlas, materials, water), scene + map uniforms
  sceneExtension.ts        plugin hook: extra WGSL slots, group(1) resources and passes
  shaders/
    index.ts               createMainShaderModule(device, { alpha, ext, depth }) — WGSL sources
    main.vert.wgsl.ts      port of shaders/main.vert.glsl + includes
    main.frag.wgsl.ts      port of shaders/main.frag.glsl + includes
```

<a id="doc-tsps-upstream-docs-webgpu-renderer--frozen-bind-group-layout-main-world-pass"></a>
#### Frozen bind group layout (main world pass)

Matches the WebGL `main`/`mainAlpha` programs. Changes here need both a shader and a
`WorldResources.ts` update in the same commit.

| group | binding | resource | format / type |
| --- | --- | --- | --- |
| 0 | 0 | `SceneUniforms` uniform | struct, 264 bytes (see below) |
| 1 | 0 | `u_textures` | `texture_2d_array<f32>`, `rgba8unorm` |
| 1 | 1 | `u_textureMaterials` | `texture_2d<u32>`, `rgba8uint` |
| 1 | 2 | `u_waterTextures` | `texture_2d_array<f32>`, `rgba8unorm` |
| 1 | 3 | `u_heightMap` | `texture_2d_array<i32>`, `r16sint` |
| 1 | 4 | `u_waterMask` | `texture_2d_array<f32>`, `rgba8unorm` |
| 1 | 5 | filtering sampler | `repeat` addressing, `linear` |
| 1 | 6+ | scene extension resources (extended pipelines only) | see `sceneExtension.ts` |
| 2 | 0 | `MapUniforms` uniform, **dynamic offset** | per draw range, 256-byte stride |
| 3 | 0 | `u_modelInfoTexture` | `texture_2d<u32>`, `rgba16uint` |
| 3 | 1 | `u_heightMap` (per map) | `texture_2d_array<i32>`, `r16sint` |
| 3 | 2 | `u_waterMask` (per map) | `texture_2d_array<f32>`, `rgba8unorm` |

Chrome's WebGPU adapter caps `maxBindGroups` at 4, so a scene extension extends group(1) instead
of taking a fifth bind group: its pipelines use an extended group(1) layout, and
`WorldResources.selectExtension` swaps the pipeline pair and the map-draw bind group per frame.

`SceneUniforms` byte layout (std140-compatible; 264 bytes of data, WGSL fixes the struct size at
272 bytes, which is what the buffer and `minBindingSize` use):

| offset | field |
| --- | --- |
| 0 | `u_viewProjMatrix: mat4x4<f32>` |
| 64 | `u_viewMatrix: mat4x4<f32>` |
| 128 | `u_projectionMatrix: mat4x4<f32>` |
| 192 | `u_skyColor: vec4<f32>` |
| 208 | `u_sceneHslOverride: vec4<f32>` |
| 224 | `u_cameraPos: vec2<f32>` |
| 232 | `u_playerPos: vec2<f32>` |
| 240 | `u_renderDistance: f32` |
| 244 | `u_fogDepth: f32` |
| 248 | `u_currentTime: f32` |
| 252 | `u_brightness: f32` |
| 256 | `u_colorBanding: f32` |
| 260 | `u_isNewTextureAnim: f32` |

`MapUniforms` element layout (96 bytes used, 256-byte stride):

| offset | field |
| --- | --- |
| 0 | `u_worldEntityTransform: mat4x4<f32>` |
| 64 | `u_mapPos: vec2<f32>` |
| 72 | `u_timeLoaded: f32` |
| 76 | `u_sceneBorderSize: i32` |
| 80 | `u_worldEntityOpacity: f32` |
| 84 | `u_roofPlaneLimit: f32` |
| 88 | `u_drawId: u32` (the draw-range index, replaces WebGL `u_drawIdOverride`) |
| 92 | `u_isWorldEntity: u32` (`u_worldEntityTransform != identity` in WebGL) |

Vertex layout is identical to WebGL: attribute 0 = `uint32x3` at offset 0, stride 12, integer
(`a_vertex`), indices `uint32`. `instance_index` replaces `gl_InstanceID`. `DrawRange[0]` is a
byte offset into the index buffer; WebGPU `drawIndexed` needs `DrawRange[0] / 4` as its
first-index. Clip space differs (GL z ∈ [-w, w], WebGPU z ∈ [0, w]) so the vertex shader remaps
`z = (z + w) * 0.5` before output.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stages"></a>
#### Stages

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-0--backend-selection-and-fallback-done"></a>
##### Stage 0 — backend selection and fallback (done)

- `OsrsRendererType` becomes `"webgl" | "webgpu"`; `createRenderer` constructs either backend.
- `WebGPURenderer.isSupported()` is synchronous (`navigator.gpu`); `pickRendererType()` is async
  and tries `navigator.gpu.requestAdapter()` before preferring WebGPU. Any failure falls back to
  WebGL with a console warning.
- `?renderer=webgl|webgpu` forces a backend (invalid/unsupported values are ignored).
- `OsrsClientApp` uses the async picker instead of `getAvailableRenderers()[0]`.
- Exit: `?renderer=webgpu` on a supported browser constructs `WebGPURenderer`; on Firefox
  (no WebGPU) the same URL silently boots WebGL. Verified by
  `client/tests/webgpu-smoke.browser.cjs` with `SMOKE_RENDERER=webgl`.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-1--device-present-path-scene-uniforms-done"></a>
##### Stage 1 — device, present path, scene uniforms (done)

- `WebGPURenderer.init()`: adapter/device, canvas context configure, depth texture, scene
  uniform buffer + bind group, resize handling.
- `render()`: refresh camera matrices and the scene UBO, clear to the sky colour, submit.
- Map streaming drives `MapManager` so `visibleMaps` fills exactly as WebGL does.
- Exit: empty sky-coloured world at 60fps in the game, no validation errors.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-2--main-game-world-pass-done"></a>
##### Stage 2 — main game world pass (done)

Scope is the pass `renderOpaquePass` + `renderTransparentPass` covers for terrain and locs:

- `WorldResources`: built from `initCache` (the texture loader only exists after phased
  loading, the same reason WebGL re-runs `initTextures` there). Uploads the world texture atlas
  (`createTextureArray` equivalent: 64-layer preload plus per-map `uploadMapTextures` streaming),
  material lookup texture, water atlas; scene + map uniform buffers.
- `WebGPUMapSquare`: vertex/index buffers, model-info textures, heightmap and watermask arrays,
  bind groups, per-range draws for terrain, doors and locs.
- WGSL port of `main.vert.glsl` / `main.frag.glsl` and their includes (vertex unpack, HSL,
  fog, material, height map, water).
- Transparent pass = alpha ranges with src-alpha blending; roof culling skips ranges whose plane
  exceeds `u_roofPlaneLimit` (replaces the scissor trick).
- Not in this stage: LOD/interact range variants beyond opaque/alpha, texture mipmap
  regeneration, loc/door/ground-item geometry refreshes, actors, world entities, overlays,
  login UI.
- Exit met: terrain, doors and locs render textured, fogged and camera-followed in-world under
  `?renderer=webgpu` at ~60fps, validation-clean.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-3--actors-done"></a>
##### Stage 3 — actors (done)

- `client/render/webgpu/actors/`: actor data texture (RGBA16UI, 2 texels/actor), per-map NPC
  geometry, NPC/player/GFX pipelines and WGSL (`shaders/actor.wgsl.ts`; projectiles draw
  through the GFX pipeline), plus player posing (`actorPlayers.ts`). Keyframe poses that only
  move whole labels are posed on the GPU, as in WebGL's `PlayerRenderer`: one rest mesh per
  appearance with a label per vertex, plus one row of 3x4 label matrices per distinct pose this
  frame (`u_poseTexture`, group(3) binding 1; `u_poseRow` per draw). Skeletal, alpha/colour and
  re-centred poses fall back to the CPU mesh path. This keeps animation smoothing (a new pose
  every client cycle) from rebuilding a mesh per player per frame.
- Reuses `DynamicNpcAnimLoader`, `GfxCache`/`GfxManager`, `ProjectileManager`, `SceneBuffer`
  and the packing logic of `render/render/draw.ts` (ported).
- NPCs use per-frame dynamic geometry; GFX and projectiles share one GPU geometry cache.
- Not in this stage: static per-map NPC frame baking (WebGPU map streaming loads with
  `loadNpcs: false`), instances/world entities, first-person arms, actor frame sounds.
- Exit met: players, NPCs, GFX and projectiles visible at correct scale and positions under
  `?renderer=webgpu`, validation-clean. Note: vertex stride differs per pipeline (16 bytes for
  NPC/player, 12 for GFX/projectile) — keep this in mind when adding actor geometry.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-4--in-world-overlays-done"></a>
##### Stage 4 — in-world overlays (done)

- `client/render/webgpu/overlays/`: shared screen-quad layer, ground item labels + meshes,
  hitsplats, health bars, overhead text/prayer, click cross, tile text, tile marker, interact
  highlight (NPC targets).
- Entry population ported from the WebGL frame loop (`render.ts:866-1427`); the renderer's
  `registerHitsplat` and the health-bar update methods feed it.
- Known gaps: tile-text hover stays dormant (no WebGPU hover pick path yet), interact
  highlight lacks loc targets (needs loc metadata on `WebGPUMapSquare`), collision-flag
  adapter returns 0.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-5--frame-presentation-and-ui-done-fxaa-skipped"></a>
##### Stage 5 — frame presentation and UI (done, FXAA skipped)

- `client/render/webgpu/ui/`: hosts and drives the existing widget stack (its own WebGL2 + 2D
  canvases, DOM-composited) via `client/widgets/gl/widgetsOverlayFactory.ts`, which is also used
  by the WebGL init path (behaviour unchanged).
- Login/loading/system-update render as DOM canvas layers; login input is routed to the same
  `osrsClient` handlers; the welcome screen blacks out the world as WebGL does.
- `flushPackets` lives in `WebGPURenderer.render` (same point as the WebGL loop).
- Not in this stage: the offscreen scene texture + present blit + FXAA (still optional); the
  widget GL context is still WebGL2 (one extra context, by design).

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-55--plugin-scene-extensions-117-hd-done"></a>
##### Stage 5.5 — plugin scene extensions, 117 HD (done)

- Plugins extend the WebGPU scene through one hook, `ClientPlugin.createWebGPUSceneExtension`
  (`client/render/webgpu/sceneExtension.ts`), the counterpart of the WebGL
  `transformSceneProgram` / `beforeSceneRender` / `configureSceneDrawCall` hooks. An extension
  fills fixed WGSL slots in the world and actor shaders (declarations, varyings, end of the
  vertex entry, texture sample, palette, shade, floor water), appends resources to group(1) from
  binding 6, and is used on frames where `isActive()` is true: the core compiles an extended
  twin of every world and actor pipeline and `WorldResources.selectExtension` picks per frame.
- With a `depth` shader the core also builds depth pipelines: the same placement as the scene
  entries, then the extension's `sceneDepthPosition(viewPos)` and `fs_depth`.
  `beforeScene(renderer, encoder)` records the extension's own pass and fills it with
  `renderer.drawSceneDepth(pass)` (world opaque, world alpha, actors).
- Only one extension is supported (the first offered); composing several needs per-extension
  binding/location ranges.
- 117 HD is the only extension: `client/game/plugins/hd/webgpu/` holds the WGSL
  (`hd-lighting.wgsl.ts`, port of `hd-lighting.glsl`; `hdSceneShaders.ts`, port of
  `HdShader.ts`'s injections) and `HdWebGPU.ts` (HdUniforms, material lookup, HD texture array,
  2048px shadow map, lights via `collectHdLights`, environment via
  `resolveHdEnvironmentForRegion`). The shadow map is read with v = 1 - y: WebGPU texture rows
  start at NDC y = +1, so a GL-style lookup mirrors every shadow.
- Weather (the other plugin with WebGL render hooks) is not ported.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-6--streaming-and-polish"></a>
##### Stage 6 — streaming and polish

Loc/door/ground-item geometry refreshes, world entities/instances, map square GC, quality
profiles (MSAA, resolution scale), profiler/GPU timing, `DrawBackend` equivalent (multi-draw
via indirect or instanced, only if measured), FXAA/blit if wanted. Exit: parity checklist for
streaming parity with WebGL.

<a id="doc-tsps-upstream-docs-webgpu-renderer--stage-7--default-flip"></a>
##### Stage 7 — default flip

`PREFER_WEBGPU_DEFAULT = true`; keep `?renderer=webgl` as an escape hatch. Exit: a release
with WebGPU default on Chrome/Edge/Safari 26+ and WebGL elsewhere.

<a id="doc-tsps-upstream-docs-webgpu-renderer--verification"></a>
#### Verification

- `yarn --cwd client test` (assert tests) and `tsc --noEmit` for the client.
- `client/tests/webgpu-smoke.browser.cjs`: launches headless Chrome (muted,
  `--enable-unsafe-webgpu`), boots the dev client at the worktree port, fails on any console
  error or `[webgpu]`/validation error, and captures a screenshot (`SMOKE_SCREENSHOT` names it).
  - Renderer + frames: `node client/tests/webgpu-smoke.browser.cjs`
  - World (terrain/doors/locs/actors): `CLIENT_URL='http://localhost:3101/?username=<name>&password=<pass>' SMOKE_EXPECT_WORLD=1 node client/tests/webgpu-smoke.browser.cjs`
  - Fallback: `SMOKE_RENDERER=webgl ...` asserts the WebGL backend still comes up.
  - 117 HD on: add `SMOKE_ENABLE_HD=1 SMOKE_EXPECT_HD=1` (enables `osrsClient.hdPlugin` at
    runtime); combine with `SMOKE_RENDERER=webgl` for the WebGL reference.
  - Add `&mobile=1` to skip the click-gated welcome screen and go straight to the world.
- Manual: `scripts/wt ls`, `yarn start`, open
  `http://localhost:<client port>/?renderer=webgpu` — the login screen works, accounts are
  created on first login.

<a id="doc-tsps-upstream-docs-webgpu-renderer--open-questions"></a>
#### Open questions

- Safari 26 WebGPU is available; MSAA resolve and `depth24plus-stencil8` availability differ.
  Stage 6 decides per-profile constraints.
- Multi-draw: WebGPU has no `WEBGL_multi_draw`; draw-range looping is fine until profiling says
  otherwise. Browser `drawIndirect` + compute compaction only if needed.
- Shader sources: `ts-shader-loader` only handles `.glsl`. WGSL lives in `.ts` template literals
  to avoid touching the CRA/craco build.
<!-- end-source-document: tsps-upstream/docs/webgpu-renderer.md -->

---

<a id="doc-tsps-upstream-docs-webrtc-poc"></a>
## tsps-upstream/docs/webrtc-poc.md

<!-- source-document: tsps-upstream/docs/webrtc-poc.md -->
<a id="doc-tsps-upstream-docs-webrtc-poc--webrtc-gameplay-proof-of-concept"></a>
### WebRTC gameplay proof of concept

This POC carries the existing binary login and game packets over one reliable, ordered `game` DataChannel. The relay only forwards SDP, ICE candidates, and session lifecycle messages; after the DataChannel opens the browser closes its signalling socket. A selected `host` or `srflx` candidate is the direct-connect success criterion. A `relay` candidate means TURN is carrying gameplay and is not a successful direct-path result for this POC.

<a id="doc-tsps-upstream-docs-webrtc-poc--components-and-configuration"></a>
#### Components and configuration

The relay requires one shared home-server registration token:

```sh
corepack yarn --cwd ../rsps-webrtc-relay install
WEBRTC_REGISTRATION_TOKEN=dev-token \
  corepack yarn --cwd ../rsps-webrtc-relay start
```

It binds to `127.0.0.1:8787` by default. Override this with `HOST` and `PORT`. Its public endpoints are:

- `GET /healthz` — liveness
- `GET /status` — world and active-signalling-session counts
- `GET /worlds` — currently registered POC world IDs
- `WS /signal` — signalling only

A minimal Caddy configuration is:

```caddyfile
relay.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

The root `.env` is shared by the client and server; package-local `.env` files
override it. The connector is disabled unless all three required server values
are set:

```dotenv
WEBRTC_SIGNAL_URL=wss://relay.example.com
WEBRTC_WORLD_ID=toby
WEBRTC_WORLD_NAME=TobyScape
WEBRTC_WORLD_TOKEN=dev-token
WEBRTC_ICE_SERVERS=[{"urls":"stun:relay.example.com:3478"}]
```

Then run `corepack yarn --cwd server dev` and `corepack yarn --cwd client start`
normally. The client reuses only `WEBRTC_SIGNAL_URL` and `WEBRTC_ICE_SERVERS`;
the world ID comes from `/worlds`, and the registration token is never included
in the browser build. Client-local `REACT_APP_WEBRTC_*` values can still override
the shared public settings.

`WEBRTC_SIGNAL_URL` may include `/signal`; a bare relay URL gets that path automatically. `WEBRTC_ICE_SERVERS` accepts the standard `RTCIceServer[]` JSON shape, including TURN entries with credentials when supplied privately.

The login server list discovers every registered world from the configured
relay. With no configuration, a client opened on localhost still defaults to
`ws://127.0.0.1:8787`.

<a id="doc-tsps-upstream-docs-webrtc-poc--stun-with-coturn"></a>
#### STUN with coturn

On the VPS, install coturn, permit inbound UDP 3478, and run STUN-only mode so the POC cannot become an unauthenticated TURN relay:

```sh
sudo apt-get install coturn
sudo turnserver --stun-only --fingerprint --listening-port=3478
```

Then configure both peers with `[{"urls":"stun:relay.example.com:3478"}]`. Host candidates are enough for same-machine/LAN testing, so the local loopback test can use an empty ICE server list.

TURN URLs can be supplied through the same ICE configuration, but public static TURN credentials must not be placed in browser configuration. If direct candidates prove insufficient, the next step is a short-lived TURN credential endpoint backed by coturn's shared-secret mechanism.

<a id="doc-tsps-upstream-docs-webrtc-poc--manual-test"></a>
#### Manual test

1. Run the relay locally with `WEBRTC_REGISTRATION_TOKEN=dev-token corepack yarn --cwd ../rsps-webrtc-relay start`.
2. For cross-network testing, start coturn as above or configure another STUN endpoint on both peers.
3. Start the home server with the four `WEBRTC_*` variables above, changing the relay URL to `ws://127.0.0.1:8787` for loopback.
4. Start the browser client, open the server list, and select the world discovered from the relay.
5. Log in, walk, and send chat. These exercise the unchanged binary login, movement, and chat packet paths.
6. Check both consoles for `[webrtc] ... ICE selected`. Confirm the selected local/remote candidate type is `host` or `srflx`, not `relay`.
7. The browser deliberately closes `/signal` after `game` opens. Confirm `/status` reports no active signalling session while walking and chat continue.
8. Open a second browser and confirm it receives a separate server session; closing either browser should remove only its matching peer.

Automated checks:

```sh
corepack yarn --cwd ../rsps-webrtc-relay test
corepack yarn --cwd server test:webrtc
corepack yarn --cwd server test:client-protocol
corepack yarn --cwd client test:webrtc-world-list
```

<a id="doc-tsps-upstream-docs-webrtc-poc--poc-limitations"></a>
#### POC limitations

The home server derives an address only from the selected ICE candidate. Browsers can conceal host addresses with mDNS and relayed candidates identify the relay, so an unavailable address is recorded as unknown and never replaced with client-supplied IP data. Any IP-based account policy therefore remains limited for WebRTC sessions until an independently trustworthy identity mechanism is added.

The server uses `node-datachannel` 0.32.1. It is a small N-API wrapper around libdatachannel with Node 22 prebuilds, but remains a native dependency; unsupported CPU/OS combinations need a C++ toolchain and a source build. Version 0.32.1 is pinned because the current 0.33.1 package's optional prebuild set does not resolve cleanly through this repository's Yarn setup.
<!-- end-source-document: tsps-upstream/docs/webrtc-poc.md -->

---

<a id="doc-tsps-upstream-docs-wintertodt"></a>
## tsps-upstream/docs/wintertodt.md

<!-- source-document: tsps-upstream/docs/wintertodt.md -->
<a id="doc-tsps-upstream-docs-wintertodt--wintertodt"></a>
### Wintertodt

The Wintertodt, built from the OSRS Wiki (the October 2024 rework, with its warmth meter and reward cart), live rsprox captures, and the cache. Near-Reality's port served as a reference for structure and for details nothing else records; those are marked below. It is one plugin, `server/plugins/minigames/Wintertodt.plugin.js`, which delegates to one unit per area in `server/plugins/minigames/wintertodt/`.

Status:
- **Done:**
  - the Doors of Dinh, the round controller, points and the HUD;
  - roots, kindling, braziers, pyromancers, herbs, potions and the crates;
  - warmth and the Wintertodt's five attacks;
  - the reward cart and its loot;
  - the `::teleports` entry and developer commands.
- **Not done:**
  - Ignisia's exchange;
  - the discontinued supply crate item;
  - the tome of fire's pages;
  - combat achievements and the diary;
  - the fletching knife's faster kindling.

<a id="doc-tsps-upstream-docs-wintertodt--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `WintertodtShared.js` | Ids, varbits, tiles, zones, the safe area, and helpers such as the fade and the one-per-player skilling action. |
| `WintertodtRound.js` | The world's one round: energy, the break, points, the HUD, the end of a round. |
| `WintertodtCorners.js` | Each corner's brazier state and pyromancer health, chatter and green bolts. |
| `WintertodtWarmth.js` | The warmth meter, warm clothing, damage formulas, regeneration and the cold's kill. |
| `WintertodtAttacks.js` | The Wintertodt's five attacks and their timing. |
| `WintertodtEffects.js` | Temporary locs, projectiles and graphics for everyone in the prison. |
| `WintertodtRewards.js` | One search of the reward cart. |
| `Doors.*` | The Doors of Dinh, the HUD zones, leaving the prison, login and logout. |
| `Braziers.*` | Lighting, fixing and feeding braziers. |
| `Supplies.*` | Roots, kindling, herbs, the crates, rejuvenation potions, Brew'ma, and supplies shattering when dropped. |
| `Pyromancers.*` | Healing the pyromancers. |
| `Cart.*` | The reward cart's Search, Check and Big-search. |
| `Commands.*` | Developer commands. |

**Changes outside the plugin:**
- **Core: `Mobile.showHitsplat(damage, { mine, others }, health)`.** It shows a hitsplat that changes no hitpoints, with its own cache hitsplat ids and health bar. The cold on the warmth meter uses it, as do the pyromancers' own 14 health. `HitDamage` carries the ids and `PlayerSession` writes them.
- **Core: item-on-object runs the object route hook** (`onObjectRoute`), as clicking a loc does, so a plugin's approach tile also holds when an item is used on the loc.
- **`Food.plugin.js`** emits `food:eaten` (`{ player, itemId, heal }`) for any plugin that reacts to eating.
- **`Pets.plugin.js`** lists the phoenix (item 20693, follower 7370 as in the captures).
- **`npc-spawns.json`:** the pyromancers face their braziers and stand still.

<a id="doc-tsps-upstream-docs-wintertodt--the-round"></a>
#### The round

There is one Wintertodt per world, running from server start whether anyone is there or not.
- **Break:** 100 ticks between rounds, counted down on varbit 7980 (capture).
- **Start:** energy 3500 and the storm loc becomes 29308 "Howling Snow Storm" at (1627, 4004) (capture).
- **Drain:** each pyromancer whose brazier is lit drains 1% (35) every 14 ticks (Wiki). That is 2.5 a tick, or the capture's 20 every 2 ticks with all four lit.
- **Recovery:** with every brazier out, the energy recovers 1% every 35 ticks (Wiki). One lit brazier stops the recovery, even if its pyromancer is down.
- **End:** at 0 energy the round ends:
  - The storm becomes 29309 "Quiescent Snow Storm".
  - The braziers reset to unlit (29312).
  - The pyromancers say "We can rest for a time."
  - The break starts again.

The corners, in the HUD's order: south-west, north-west, north-east, south-east.

| Corner | Brazier | Pyromancer |
| --- | --- | --- |
| South-west | (1620, 3997) | (1619, 3996) |
| North-west | (1620, 4015) | (1619, 4018) |
| North-east | (1638, 4015) | (1641, 4018) |
| South-east | (1638, 3997) | (1641, 3996) |

Plugins can follow the round with the custom events `wintertodt:round-start` and `wintertodt:round-end`.

<a id="doc-tsps-upstream-docs-wintertodt--points-and-the-end-of-a-round"></a>
#### Points and the end of a round

| Activity | Points (Wiki) |
| --- | --- |
| Lighting a brazier | 25 |
| Feeding a bruma root | 10 |
| Feeding bruma kindling | 25 |
| Repairing a brazier | 25 |
| Healing a pyromancer | 75 |

Reaching 500 points mid-round: "You have helped enough to earn a supply crate." The wording predates the reward cart but is still live (capture).

At the end of a round, each player inside the prison gets the following.

**Under 500 points:** "You did not earn enough points to be worthy of a gift from the citizens of Kourend this time."

**500 points or more**, in this order (capture):
1. Firemaking XP of level x 100, and "You have gained 9900 Firemaking XP."
2. "Your subdued Wintertodt count is: <col=ff0000>598</col>." Varp 1528 counts the kills.
3. The rewards owed, on varbit 11435, and "You're owed an additional 2 rewards from the reward cart. You're now owed 2 rewards."

**Rewards owed (Wiki):**
- 500 points owes two.
- Every further 500 guarantees one more.
- The points past the last 500 give that share of a chance at another. For example, 1200 points gives 3, with a 40% chance of a 4th.
- The cart holds at most 8,000.

The capture's 580 points gave 2.

The kill count and rewards owed are persisted attributes (`wintertodt:kills`, `wintertodt:rewards-owed`), sent to their varp and varbit on login. A round's points are not saved.

<a id="doc-tsps-upstream-docs-wintertodt--the-doors-of-dinh"></a>
#### The Doors of Dinh

The Doors of Dinh are loc 29322 at (1627, 3964).

**Enter:**
- Needs 50 Firemaking (Wiki).
- From the capture:
  1. The screen fades out with interface 174 on the atmosphere overlay and script 948 (50 cycles).
  2. Two ticks later you move inside and the screen fades back in.
- You land within (1627-1633, 3977-3983).

**Leaving:**
- Leaving lands you within (1628-1631, 3955-3956) (capture).
- Between rounds the doors ask nothing (capture).
- Mid-round they ask "Are you sure you want to leave?" with "Leave and lose all progress." / "Stay." (Near-Reality; not yet captured).
- Leaving or logging out loses the round's points (Wiki), and the prison's supplies vanish: bruma roots, kindling, herbs and rejuvenation potions. Any still carried at login go too.
- At the end of a round, bruma roots and kindling are taken from everyone in the prison.

**Peek:** "The Wintertodt has X% energy left. There are N players within the prison." The Wiki describes it but gives no wording, so this text is Near-Reality's.

**Under 50 Firemaking:** "You require at least 50 Firemaking to take on the Wintertodt." (Near-Reality; not yet captured).

Logging in inside the prison puts you outside the doors.

<a id="doc-tsps-upstream-docs-wintertodt--the-hud"></a>
#### The HUD

The HUD is interface 396 on the HUD overlay. It stays up inside the prison (1600-1663, 3968-4031) and in the camp south of it (1600-1663, 3904-3967).

**Scripts:**
- Script 1433 shows the points and warmth groups inside the prison.
- Script 1432 hides them in the camp.
- Script 1421 runs every other tick with ten ints:

  | Arg | What it holds |
  | --- | --- |
  | 1 | Points |
  | 2 | Energy (0-3500) |
  | 3-6 | Each corner's pyromancer: 1 healthy |
  | 7-10 | Each corner's brazier: 0 broken, 1 unlit, 2 lit |

  Between rounds it sends `0, 0, 1, 1, 1, 1, 1, 1, 1, 1`.

**Varbits:**
- Varbit 7980 counts the break down. Script 2755 times it at 30 client cycles a unit.
- Varbit 11434 is warmth, from 0 to 1000. It is full on entering.

<a id="doc-tsps-upstream-docs-wintertodt--the-braziers"></a>
#### The braziers

The brazier locs are 29312 (unlit, Light), 29313 (broken, Fix) and 29314 (burning, Feed).

**Approach:** the cache puts walls (loc 24720) on each brazier's outer sides. Yet the captures show players lighting and feeding the south-east brazier from (1638, 3996) and (1639, 3996), on the far side of those walls, so live's collision there differs. A click or item use therefore walks to the nearest open tile beside the 3x3, on any side, and acts from there.

**Light:**
- Needs a tinderbox or bruma torch, carried or worn (Wiki).
- The brazier can't be lit while its pyromancer is down: "Heal the Pyromancer before lighting the brazier." (Near-Reality).
- It takes 2 ticks: anim 7174 with a bruma torch (capture), 733 with a tinderbox (Near-Reality).
- Reward: "You light the brazier.", 25 points and 6x Firemaking level XP.
- Everyone who starts lighting before the brazier changes gets the reward (Wiki).

**Fix:**
- Needs a hammer: "You need a hammer to fix this brazier.".
- Takes 2 ticks with anim 3676 (Near-Reality): "You fix the brazier." and 25 points.
- 4x Construction level XP only for players who own a house (Wiki), read from the house location varbit 2187.

**Feed:**
- Anim 832, one item every 3 ticks, kindling first (capture).
- A root gives 10 points and 3x Firemaking XP; kindling gives 25 points and 3.8x.
- Ends with "You have run out of bruma roots.".

**Pyromancer:**
- 14 health (Wiki). She waits 2-8 ticks after her brazier is lit or she is healed before she drains again (Wiki: "roughly 1-5 seconds").
- While draining, she sends a green bolt (NPC 7373) from the brazier toward the storm every other tick.
- Lines (Wiki transcript), about every 10-14 ticks:
  - "Light this brazier!", "Fix this brazier!", or the chant "Yemalo shi cardito!" with anim 4432;
  - "Arg, it got me!" with anim 7627 as she falls;
  - while she is down, one of five lines at random.

<a id="doc-tsps-upstream-docs-wintertodt--healing-pyromancers"></a>
#### Healing pyromancers

- "Help", or a rejuvenation potion used on her, heals her fully for one dose, taken from the potion with the fewest doses (Wiki). It earns 75 points.
- Other items: "That's no use!". At full health: "No need! I'm fine thanks.". Between rounds: "Looks like it's quiet for now. I don't need help, but thank you." (transcript).
- Help without a potion opens Near-Reality's statement.

<a id="doc-tsps-upstream-docs-wintertodt--roots-kindling-herbs-and-the-crates"></a>
#### Roots, kindling, herbs and the crates

**Bruma roots** (loc 29311, Chop):
- "You swing your axe at the roots." then "You get a bruma root." every 3 ticks (capture), with 0.3x Woodcutting level XP.
- Better levels and axes succeed more often, reaching every try at 99 with a dragon axe.
- Uses the Woodcutting plugin's best usable axe; without one: "You do not have an axe which you have the woodcutting level to use.".
- When the inventory is full: "Your inventory is too full to hold any more roots.".
- Between rounds: "There's no use for bruma roots at this time." (capture).

**Kindling** (knife on a root):
- One every 4 ticks with anim 1248, 0.6x Fletching level XP, and "You carefully fletch the root into a bundle of kindling." (capture).
- Refused in the safe area: "Your hands are too cold to fletch here - move closer to the braziers.".

**Sprouting Roots** (29315, Pick):
- A bruma herb every 3 ticks with anim 2282 (Near-Reality).
- No Farming XP since the rework (Wiki).

**Crates:**

| Option | Gives | Loc |
| --- | --- | --- |
| Take-hammer | Hammer | 29316 |
| Take-knife | Knife | 29317 |
| Take-axe | Bronze axe | 29318 |
| Take-tinderbox | Tinderbox | 29319 |
| Take-concoction / Take-5 / Take-10 | Unfinished potions | 29320 |

- The tool crates give one only while you have none (Wiki).
- "You take a knife from the crate." is captured; the other messages are Near-Reality's.

**Rejuvenation potions:**
- A herb on an unfinished potion makes a (4), with 0.1x Herblore level XP. Outside the prison: "You can only do that within the influence of the Bruma tree." (Wiki).
- Brew'ma mixes every pair at once when you use either ingredient on them.
- Drink restores 30% warmth.

**Dropping:** roots, kindling, herbs and potions shatter instead of landing (Near-Reality).

<a id="doc-tsps-upstream-docs-wintertodt--warmth"></a>
#### Warmth

Warmth is varbit 11434, from 0 to 1000. It is full on entering, and entering with fewer than four warm items gives "You feel the cold wind strike you as you enter; perhaps you should find some warmer clothes." (Wiki).

**Damage**, rounded down (Wiki). FM is the base Firemaking level, W the warm items worn (at most 4) and B the braziers lit (at most 3):

| Attack | Formula |
| --- | --- |
| Standard | `(16 - W - min(2B, 6)) x 100 / FM` |
| Brazier | `2 x floor((10 - W) x 100 / FM)` |
| Area | `3 x floor((10 - W) x 100 / FM)` |

The hitsplat shows that number (75 to yourself, 76 to others), and the meter loses ten times as much (capture: 6, 12 and 18 at 99 Firemaking with four warm items). The health bar is 79, 30 wide.

**Warm clothing** is matched by cache name against the Wiki's list, including its (t), (r), (i) and (or) variants.

**Restoring:**
- Food that heals 4 or more restores 35%, except triangle sandwiches and wine. This uses `food:eaten`.
- A potion dose restores 30%.
- Regeneration is 8% plus 1% per warm item, every 100 ticks (Wiki: per minute; the capture's +120 came on a 100-tick beat).

**At 0:** "<col=ef1020>The cold of the Wintertodt has overcome you!" and a hit for all your hitpoints (capture). It is an ordinary, unsafe death.

<a id="doc-tsps-upstream-docs-wintertodt--the-wintertodts-attacks"></a>
#### The Wintertodt's attacks

None reach the safe area by the doors. Its outline is Near-Reality's polygon.

**Rolls (Wiki):**
- Standard and area attacks go ahead when a roll up to 3500 is under the energy left, so they fade as the round goes on.
- Brazier and pyromancer attacks go ahead when the roll is over the energy left, so they grow.

**Beats (captures):** area attacks start on a 20-tick beat and the others on a 5-tick beat.

**Standard attack rate (captures):** the cold hits came 10-15 ticks apart at high energy but 25-65 apart below 60%. A linear roll would hit every 10-17 ticks down to 40%, which the captures don't show. Using the energy's share cubed as the chance on each 5-tick beat fits them far better: about every 10 ticks at full energy, 28 at 60%, 80 at 40%, and rarely below that. This matches the Wiki's "very rarely near the end".

| Attack | What happens |
| --- | --- |
| Standard | "The cold of the Wintertodt seeps into your bones.", with a 10-tick cooldown. It interrupts fletching and feeding, not chopping (Wiki). |
| Small brazier | Snowfall (26690) on the brazier's centre, with bolt 501 and graphic 502. 4 ticks later the brazier goes out and anyone feeding it gets "The brazier has gone out.". |
| Large brazier | Snowfall on the centre and its four sides. 4 ticks later the brazier breaks, and everyone within 2 tiles of its centre takes brazier damage: "The brazier is broken and shrapnel damages you.". |
| Pyromancer | Snowfall on her. 3 ticks later she takes 7-13. |
| Area | Varbit 5354 pulses for the target. Snowfall goes on their tile and the four diagonals, with bolt 501. 3 ticks later spot projectiles 1310 and graphics 1311/502 land. 3 ticks after that, icicle 29324 and snow 29325 stay 7 ticks, and anyone in the 3x3 takes area damage ("The freezing cold attack of the Wintertodt's magic hits you."), as does a pyromancer in it. The target's 3x3 must have no collision at all and not overlap another area attack (Wiki: not next to an obstacle). |

A random corner is picked for a brazier or pyromancer attack; it only lands on a lit brazier or a healthy pyromancer. Large attacks are a quarter of brazier attacks, roughly the captures' share. Bolts come from (1630, 4007).

<a id="doc-tsps-upstream-docs-wintertodt--the-reward-cart"></a>
#### The reward cart

The cart is loc 55423 in the camp, a multiloc on varbit 11435:

| Rewards owed | Loc |
| --- | --- |
| 0 | 55411 |
| 1-9 | 55412 |
| 10-24 | 55413 |
| 25-49 | 55414 |
| 50-99 | 55415 |
| 100 | 55416 |

- **Search:** anim 11758, one reward 3 ticks later: "You found some loot: 11 x Raw shark" (capture).
- **Big-search:** up to 10 rewards in one search, or every reward left when fewer are owed.
- **Check:** "You are owed 2 more rewards from the cart." or "You aren't owed any rewards from the cart.".
- **Taking the last one:** the message box "You think you've taken as much as you're owed from the reward cart.".

**Loot (Wiki, "Reward Cart" and the Module:Wintertodt supply crate behind its calculator).** Uniques are tried in order, stopping at the first hit:

| Unique | Chance | Notes |
| --- | --- | --- |
| Phoenix | 1/5000 | Through the Pets plugin's `npc-drops:roll`. |
| Dragon axe | 1/10000 | |
| Tome of fire (empty) | 1/1000 | |
| Warm gloves | 1/150 | A magic seed once you own three. |
| Bruma torch | 1/150 | 2-3 torstol seeds once you own three. |
| Pyromancer piece | 1/150 | The piece owned least; ties go garb, hood, robe, boots. |
| Burnt pages | 1/45 | 7-29. |

Otherwise the main table:
- 3/25 each for gems, herbs, seeds, logs, ores and fish;
- 5/25 for 2000-4999 coins;
- 1/25 each for 3-5 saltpetre and 3-5 dynamite.

A skill table tries its items best first, each at `interpolate(level, low, high) / 256` with the module's values. The level is Crafting, Herblore, Farming, Woodcutting, Mining or Fishing. Materials come noted; seeds don't need to be.

<a id="doc-tsps-upstream-docs-wintertodt--not-captured-yet"></a>
#### Not captured yet

These follow the Wiki and Near-Reality until a capture says otherwise:
- **Pyromancer:** her fall and healing. The 7-13 damage per hit is chosen so that two hits take her 14 health, as the Wiki says.
- **Fixing:** the fix animation.
- **Warmth restore:** the exact values from food and potions.
- **Text:** the drink message ("You drink some of your rejuvenation potion."), the crate messages other than the knife's, and Brew'ma's.

<a id="doc-tsps-upstream-docs-wintertodt--developer-commands"></a>
#### Developer commands

| Command | What it does |
| --- | --- |
| `::wintertodt` | To the camp, outside the doors. |
| `::wtstart` | Ends the break and starts a round. |
| `::wtenergy <0-3500>` | Sets the energy during a round; 0 ends it. |
| `::wtpoints <points>` | Adds points to your round, inside the prison. |
| `::wtwarmth <0-1000>` | Sets your warmth. |
| `::wtrewards <count>` | Sets the rewards the cart owes you. |
| `::wtinfo` | Your warm items, warmth, the damage each attack would do now, and the cold's chance. |
| `::wtlight` | Lights every brazier and heals every pyromancer. |
| `::wtattack <area\|small\|large\|pyro>` | Makes the Wintertodt attack you, or the corner nearest you. |
<!-- end-source-document: tsps-upstream/docs/wintertodt.md -->

---

<a id="doc-tsps-upstream-docs-woodcutting-guild"></a>
## tsps-upstream/docs/woodcutting-guild.md

<!-- source-document: tsps-upstream/docs/woodcutting-guild.md -->
<a id="doc-tsps-upstream-docs-woodcutting-guild--woodcutting-guild"></a>
### Woodcutting Guild

The guild is part of the Woodcutting plugin.

| Part | File |
| --- | --- |
| The gates, the cave, the vine, the roots, the diary tasks | `server/plugins/skills/woodcutting/Guild.Woodcutting.js` |
| Ent trunks | `EntTrunk.Woodcutting.js` |
| The egg shrine | `Shrine.Woodcutting.js` |

Data lives in `server/data/definitions/woodcutting-guild.json`. Praying at a shrine is the Altars plugin's job.

The facts come from rsprox captures (`rsprox/wcguild/`), the OSRS Wiki and the cache's map.

<a id="doc-tsps-upstream-docs-woodcutting-guild--gates"></a>
#### Gates
There are two pairs of gates, 28851 and 28852:
- **East pair:** at 1657, 3504–3505. The guard Berry (7235) stands beside it.
- **West pair:** at 1562, 3487–3488.

Going in needs 60 Woodcutting. Leaving needs no level.

| Tick | What happens |
| --- | --- |
| The player arrives | — |
| +1 | Each half becomes an invisible wall (38848), with its open gate (28853/28854) beside it. Sound 62 plays. The player steps through. The guard says "Welcome to the Woodcutting Guild, adventurer." |
| +3 | The gates are shut again. |

Going in completes Kourend & Kebos hard "Enter the Woodcutting Guild". The below-60 message is the server's existing one; it hasn't been captured.

<a id="doc-tsps-upstream-docs-woodcutting-guild--the-ent-dungeon"></a>
#### The Ent dungeon
- **The Cave** (28855, "Enter"): the next tick you're in the dungeon at 1596, 9900. There's no animation.
- **The Vine** (28856, "Climb"): animation 828, then the next tick you're back at 1606, 3508.
- **The Roots** (26720 and 26721, "Step-over"; each root is a two-tile piece): animation 1603 and sound 2461, then a slide (15 and 30 cycles) to the tile across the root. There's no Agility requirement.

<a id="doc-tsps-upstream-docs-woodcutting-guild--ent-trunks"></a>
#### Ent trunks
**Becoming a trunk.** A dead Ent stays where it fell: it plays its death animation (12508), and 4 ticks later the same NPC turns into an Ent trunk (9474). This uses a generic core option: an NPC death handler can leave the NPC in the world as remains (`remains` on the death event). The Wiki rules:
- the trunk lasts 101 ticks;
- in the guild the Ent respawns 50 ticks after the trunk is gone; in the Wilderness, 15.

**Chopping it.** Only the Ent's killer may chop its trunk.
1. "You swing your axe at the Ent trunk."
2. An attempt every 3 ticks (captured).
3. Each success gives a noted log, 25 XP, "The ent carcass yields: 1 x Magic logs" and the usual 1/256 bird nest chance. In the Wilderness a success gives 2 logs.

Being attacked doesn't stop the chopping. In the capture an Ent hit the player mid-chop and the chopping went on. So while you chop, auto-retaliate stays off: the player carries the generic `combat:no-retaliate` flag, which the core now honours for players as it already did for NPCs. Walking away ends the chopping, and retaliation comes back.

Ents no longer drop 12 logs when killed: their logs only come from the trunk.

**Ent animations.** Both Ents (guild 7234 and Wilderness 6594) share one rig. They now use their captured animations: attack 12506, block 12504, death 12508, and death sound 824 (`npc-combat-defs.json`). Before this they fell back to the generic human punch and block.

**Which log.** The type depends on your base Woodcutting level and your axe (Wiki):
- plain logs only below 45;
- yew from 61;
- magic from 75.

The Wiki gives the rarity only as "Varies", so two numbers in the data file are estimates from the capture (99 Woodcutting, dragon axe):

| Estimate | From the capture |
| --- | --- |
| The success chart | 17 successes in 31 attempts, about 55% |
| The log weights | 8 magic, 4 oak, 1 yew, 1 maple, 1 willow |

Magic logs get more likely with better axes.

<a id="doc-tsps-upstream-docs-woodcutting-guild--the-shrine"></a>
#### The shrine
**Praying** (29088, "Pray-at"): the Altars plugin answers "Shrine" as it answers altars. With full Prayer you get the captured line, "You already have full Prayer Points."

**Offering a bird's egg** (red 5076, blue 5077, green 5078):
1. "You offer your bird's egg to the shrine and receive a reward."
2. "You have made <col=ff0000>one</col> offering." (then "...2 offerings.", and so on).
3. Animation 3705.
4. A projectile and sound in the egg's colour:

   | Egg | Projectile | Sound |
   | --- | --- | --- |
   | Red | 1308 | 3047 |
   | Blue | 1307 | 1984 |
   | Green | 1309 | 1986 |

5. The egg becomes a seed bird nest (22798) in the same slot.

The Wiki adds 100 Prayer XP per egg, and a 1/1200 chance of each evil chicken piece instead of the nest. The capture showed no Prayer XP, but the Wiki is followed.

<a id="doc-tsps-upstream-docs-woodcutting-guild--other-diary-task"></a>
#### Other diary task
Chopping redwood logs completes Kourend & Kebos elite "Chop some Redwood logs". The Woodcutting `woodcutting:success` event now carries `logId` for this.

<a id="doc-tsps-upstream-docs-woodcutting-guild--not-modelled"></a>
#### Not modelled
- The sawmill (Buy-plank): planned as a separate change.
- The redwood ladders: already handled by the generic ladders.
<!-- end-source-document: tsps-upstream/docs/woodcutting-guild.md -->

---

<a id="doc-tsps-upstream-docs-worktrees"></a>
## tsps-upstream/docs/worktrees.md

<!-- source-document: tsps-upstream/docs/worktrees.md -->
<a id="doc-tsps-upstream-docs-worktrees--worktrees"></a>
### Worktrees

Run several branches at once, one [git worktree](https://git-scm.com/docs/git-worktree) each, on
their own ports. Testing a branch is then switching browser tab, not stopping, checking out and
rebuilding.

```bash
scripts/wt new feat/my-change     # ../tsps-feat-my-change, slot 1
cd ../tsps-feat-my-change && yarn start
scripts/wt ls                     # every worktree, its URL and whether it's running
scripts/wt rm feat/my-change      # when the branch is merged
```

<a id="doc-tsps-upstream-docs-worktrees--slots"></a>
#### Slots

Each worktree gets a slot from 1 to 9, written into a marked block in its root `.env`:

| | Client | Game (WebSocket) | Agent MCP |
| --- | --- | --- | --- |
| Main checkout | 3000 | 43594 | 49700 |
| Slot N | 3100 + N | 43700 + N | 49800 + N |

- **The client** connects to its own slot's server by default, under the branch's name on the
  login screen. Each port is its own browser origin, so each tab remembers its own login.
- **Voice** signalling is off in slots (`VOICE_SIGNAL_PORT=0`); set a free port in `.env` below
  the block to test it.
- **`BROWSER=none`** stops `yarn start` opening a tab per worktree.
- **The agent MCP** is registered as `tsps` for that worktree only (`claude mcp add -s local`),
  so an agent there talks to its own server.
- **Your settings** in `.env` outside the block are kept. Don't copy a `.env` with
  `WEBRTC_WORLD_TOKEN` into a worktree, or every branch registers as the same public world.

<a id="doc-tsps-upstream-docs-worktrees--set-up-cost"></a>
#### Set-up cost

- **`node_modules` and `server/caches`** are copied from the main checkout as copy-on-write
  clones (APFS, btrfs), so they're instant and take no space until they change. Run
  `npm run setup` in the worktree if the branch changes dependencies.
- **Player saves** live in the worktree's `server/data/`, so each branch starts with its own
  accounts.
- **An existing worktree** gets a slot with `scripts/wt slot <path>`.
<!-- end-source-document: tsps-upstream/docs/worktrees.md -->

---

<a id="doc-tsps-upstream-docs-world-map"></a>
## tsps-upstream/docs/world-map.md

<!-- source-document: tsps-upstream/docs/world-map.md -->
<a id="doc-tsps-upstream-docs-world-map--world-map"></a>
### World map

The world map is interface 595, opened as an overlay from the minimap's world map orb (`orbs:worldmap`, 160:55). The client draws the map itself; the server tells it where the player is through clientscript `worldmap_transmitdata` (1749), whose first argument is the player's coordinate (the other two are null, sent as -1).

<a id="doc-tsps-upstream-docs-world-map--the-players-position"></a>
#### The player's position

Facts from a live OSRS capture (rsprox) of a player opening the map and running around Lumbridge with it open:

- **On opening**, the server runs 1749 with the player's coordinate, then opens 595 (`if_opensub` on `toplevel_pre_eoc:floater`, 164:18) and sets the events on `worldmap:toggles` (595:21, slots 0-4, OP1).
- **While the map is open**, the server runs 1749 again **every 3 ticks**, counted from the tick the map opened on, **only if the position changed** since the last time it was sent. Opening at tick 15787, the player started running at 15790: nothing was sent at 15790, then 15793, 15796 and 15799 each sent a new position.
- **The position sent** is the player's tile at the start of that tick, one step behind where the same tick's player update moves them.
- **On closing** (`if_closesub` of 595), the updates stop.

<a id="doc-tsps-upstream-docs-world-map--aboard-a-boat"></a>
#### Aboard a boat

From a second capture of a player opening the map, boarding a boat, and sailing with the map open. A player aboard stands on the boat's deck, in an instance region, so their own tile would put the marker nowhere on the map:
- **The position sent** is the boat's own tile, its world entity's coordinate (`0_48_46_3_43` for a boat at that tile; the player's deck tile was `1_60_100_36_52`). This applies both when opening the map aboard and in the updates.
- **The same 3-tick rule** holds, counted from when the map opened, and it carries over boarding. A map opened on land at 19961 sent the player's tile at 19964, then the boat's tile at 19967, after boarding.
- **Unlike on land,** the tile sent is the boat's new tile from that same tick. At 20001 the boat moved from `14_54` to `16_55`, and `16_55` was sent.

<a id="doc-tsps-upstream-docs-world-map--implementation"></a>
#### Implementation

- `PacketSender.toggleWorldMap` opens and closes the map. Opening sends the position from `worldMapLocation()` (the player's tile, or the boat's `Boat.worldTile()` aboard) through `sendWorldMapPosition`, which remembers the last position sent (`getWorldMapPosition`).
- `server/plugins/interface/WorldMapPosition.plugin.js` sends the updates. On each player tick it counts the ticks since the map opened, and every 3 ticks it sends the position if it differs from the last one sent:
  - **On land:** the start-of-tick position.
  - **Aboard:** boats move after the players, so the player is queued and a `BoatManager.onAfterTick` listener sends the boat's tile once it has moved.
- `server/tests/world-map-position.test.cjs` replays both captures' ticks and checks the same sends.
<!-- end-source-document: tsps-upstream/docs/world-map.md -->

---

<a id="doc-tsps-upstream-docs-wyrmscraig"></a>
## tsps-upstream/docs/wyrmscraig.md

<!-- source-document: tsps-upstream/docs/wyrmscraig.md -->
<a id="doc-tsps-upstream-docs-wyrmscraig--wyrmscraig"></a>
### Wyrmscraig

Three plugins cover Wyrmscraig's content:
- **`Wyrmscraig`** (`server/plugins/areas/Wyrmscraig.plugin.js`, units in `wyrmscraig/`, data in `wyrmscraig.json`): open access to Fallen From Grace's finished state, and the cave under Ardeaglais.
- **Agility's shortcuts** (`server/plugins/skills/agility/shortcuts/Wyrmscraig.js`): the basalt stepping stones and the rocks up to the cathedral.
- **`MadAngel`** (`server/plugins/bosses/MadAngel.plugin.js`, units in `madangel/`, data in `mad-angel.json`): the cathedral's doors and broken pew, a cathedral instance per player, the fight and the kill.

<a id="doc-tsps-upstream-docs-wyrmscraig--sources"></a>
#### Sources

- **rsprox captures:** the cave both ways; each shortcut both ways; a Mad Angel kill (doors, pew, waking, the whole fight, the death, the drop, the way out).
- **The Wiki:** the shortcuts' levels and XP; the Mad Angel's stats, mechanics (Mad Angel, Mad Angel/Strategies), drop table and respawn time.
- **The cache:** every id, under the gameval names rsprox prints (`ffg`, `wyrmscraig_cliff_shortcut`, `npc_mad_angel_*`, `vfx_mad_angel_*`, `total_mad_angel_kills`).

<a id="doc-tsps-upstream-docs-wyrmscraig--open-access"></a>
#### Open access

Fallen From Grace isn't on this server. Every player gets its finished state at login, through the varbits the cache's own multilocs read:

| Varbit | Value | What it shows |
| --- | --- | --- |
| 15759 `ffg` | 20 | The post-quest Mad Angel in Ardeaglais (16313 → 16314), the powered golem in the cave (16320 → 16322) |
| 15720 `wyrmscraig_cliff_shortcut` | 1 | The mined rocks at the top of the cliff shortcut (62265 → 62266) |

The two NPCs are new spawns: the cathedral's angel at 2532,2215 facing east, and the cave's golem at 2573,8650 facing south.

<a id="doc-tsps-upstream-docs-wyrmscraig--the-cave"></a>
#### The cave

| Tick | What happens |
| --- | --- |
| The click | The crawl (2796), sound 2454 (3 loops, delay 4), the fade out and `busy` |
| +2 | The move: in at 2564,8630 facing east; out at 2530,2205 facing south |
| +3 | The fade back in |
| +5 | The overlay closes |

Not captured, and not built: the golem's "Investigate" and the stairs up to the boss.

<a id="doc-tsps-upstream-docs-wyrmscraig--the-shortcuts"></a>
#### The shortcuts

| Object | Shortcut | Agility | Crossing |
| --- | --- | --- | --- |
| 62260 | Basalt stepping stone | 58 | 2584,2286 ↔ 2584,2280, three jumps |
| 62262 | Slippery basalt stepping stone | 62 | 2565,2217 ↔ 2565,2221, two jumps |
| 62261 | Extra slippery basalt stepping stone | 72 | 2614,2250 ↔ 2614,2246, two jumps |
| 62267 (bottom) / 62265 (top) | Rocks | 54 | 2554,2209 ↔ 2550,2209 |

- **A jump:** two tiles, one every 2 ticks. Animation 741 and sound 2461, each 15 cycles in; the move from cycle 30 to 45.
- **The rocks:** one move over 60 cycles, facing the cliff (west) both ways. Up with the climbing loop (4435), down with 740; sound 2454 (3 loops, delay 5).
- **XP:** 5 a crossing, 2 ticks after the last move.
- **The rocks' top end** is a nameless multiloc (gameval `wyrmscraig_cliff_shortcut_top`). The client sends its base id, so the shortcut is hooked by that id.

<a id="doc-tsps-upstream-docs-wyrmscraig--the-mad-angel"></a>
#### The Mad Angel

<a id="doc-tsps-upstream-docs-wyrmscraig--getting-in-and-out"></a>
##### Getting in and out

- **The doors** (62368/62369, "Open"): the drag (4282) and sound 62 (delay 20), and the next tick the player is a tile across.
- **Climb on the broken pew** (62250):
  1. The pick-up animation (832, delay 30), the fade out and `busy`.
  2. +1: the minimap off.
  3. +2: the player's own cathedral, with the player at 2537,2215 (its copy). OSRS copies the 13×13-chunk scene from chunk 311,270, every plane, unturned; so does `TemplatedInstanceArea`. The angel is dormant on its spot.
  4. +3: the fade and the minimap back, and "You climb over the broken pew...".
- **Exit on the pew** (62251): "Are you sure you want to leave?" (Yes!/No.). **Quick-exit** skips the question. Then the fade, and back at 2539,2216 facing the doors; the fade comes back 4 ticks after it started.
- **Leaving any other way** (teleporting, dying, logging out) ends the cathedral. A login inside is moved outside the pew.

<a id="doc-tsps-upstream-docs-wyrmscraig--the-fight"></a>
##### The fight

- **Wake** (16306): the wake animation (3321) and graphic (4010), music 885. 3 ticks later it's the fighting angel (16305), and the HP HUD opens (the `BossHud` plugin, [boss-hud.md](#doc-tsps-upstream-docs-boss-hud)). It attacks the tick after.
- **Its standard attack:** melee (4589, sound 2676) every 6 ticks, landing 2 later. Max 31; Protect from Melee lowers it to 5 rather than blocking it (Wiki).
- **After three standard attacks, a special,** in turn: the sweep, the blast, the smite. The sweep and the smite hold its standard attacks; the blast doesn't.

**Sweep:**
- **The wind-up:** the sword drawn to one side (`*_01`).
- **The cleaves:** 4, 6 ticks apart (enraged: 6, 4 ticks apart). Each animation names the swing and what the sword does next: `right_left` swings right and swaps to the left, `right_02` swings right again, `right_reset` is the last.
- **Where a cleave hits:** the quarter of the arena between the way the angel faced at the step before (towards the player then) and the sword's side.
  - In the capture, the boss always faced along an axis.
  - Ten of ten captured cleaves fit this rule; the test checks each one.
- **The tiles** are the captured dust (graphic 2184), stored per quarter as offsets from the angel's centre with their delays.
- **Being caught:** up to 31, halved by Protect from Melee.
- **Dodging:** out of the quarter, beside the angel on the far side from the sword (not behind it), the player's next hit is sure to land for at least half their max hit (Wiki).

**Blast:**
- **The throw:** animation 14443 and graphic 4014. The ball (4015) flies to a tile 1–2 tiles from the player, never the player's own, its shadow (1448) on the tile. It lands 6 ticks later (enraged: 5).
- **On the tile:** it bounces back (graphic 4017 on the player, sound 12056). 2 ticks later the angel takes 18–22, and it throws again, up to 3 throws.
- **Missed:** it blows up over the whole floor (graphic 4016, each tile delayed 2 × its Manhattan distance from the ball; sound 12054). The player takes 30+, halved by Protect from Magic.

**Smite:**
- **The charge:** animation 4590 and graphic 4011 (enraged: 8543 and 4012).
- **The strikes:** 5 ticks in (enraged: 5, 9 and 11, as captured). The impact graphic (4013) plays on the player, and the hit lands a tick later.
- **Protect from Magic turned on in that tick** blocks it all, and makes the player's next hit a max hit. Already on, the player takes a quarter. Off, up to 31.

**Enrage:**
- **When:** at 350 hitpoints, at its next attack: "...!".
- **Then:** the smite, the blast and the sweep in a row.
- **From then on:** specials back to back, with standard attacks only during the blast (as in the capture, after the opening three).

<a id="doc-tsps-upstream-docs-wyrmscraig--the-kill"></a>
##### The kill

- **The death animation** (14448) plays for 7 ticks (`deathTicks` in `npc-combat-defs.json`).
- **Then, together:** "Your Mad Angel kill count is: N." (varp 5712), "Fight duration: … Personal best: …" (or "(new personal best)"), the drop, and the corpse (16308). 4 ticks later the HUD fades out, and 4 after that it is cleared, as captured.
- **The drop** is the Wiki's table (`npc-drops.json`), with four corrections in `NpcDrops`:
  - the sunstone crystal is Fallen From Grace's, so it's left out;
  - the Ardeaglais teleport's pre-roll is 1/25;
  - a supply batch (16/150) is sharks or yellowfins, each with a prayer potion(2) and a super combat potion(1).
  - the super combat potions(3), raw monkfish, emeralds and sapphires are noted, as the Wiki marks them (the export lost every "(noted)").

  The export had listed the batch as four separate rolls on a 182 table.
- **The respawn:** the corpse stays for the Wiki's respawn time (26 ticks). Then the angel is back on its spot, dormant, for the next "Wake".

<a id="doc-tsps-upstream-docs-wyrmscraig--not-captured-so-assumed"></a>
##### Not captured, so assumed

| What | Taken as |
| --- | --- |
| The left-handed sweep animations | Named by the cache (`*_left_*`), not seen |
| The pre-enrage smite's timing | Like the enraged first strike (5 ticks in) |
| The sweep's, the explosion's and the smite's damage | Up to 31, 32 and 31 (the Wiki gives 30+ for the explosion) |
| The specials' order before the enrage | Sweep, blast, smite (the capture shows the first two) |
| What happens after a kill | The corpse becomes the dormant angel after the respawn time |
| The drop notifications | "Untradeable drop" and "received a drop" are client settings, not sent |
| Golembane weapons | Not modelled |

<a id="doc-tsps-upstream-docs-wyrmscraig--the-client"></a>
##### The client

The blast's shadow (graphic 1448) lies on a floor covered in flat decorations: marble patterns 1 unit up, and the window light rays (`wyrmscraig_cathedral_lightray01`) 4 units up and see-through.
- **The real client** paints graphics on a tile after them, so the shadow shows on top.
- **Ours depth-tests,** so `GfxRenderer` draws every graphic played on a tile 8 units up (6% of a tile) to keep it above them.
- **The sweep's facing** is sent as face-coordinate turns (`npc.faceTile`), one per step, while the angel is out of combat; combat would otherwise keep it turning to follow the player.

<a id="doc-tsps-upstream-docs-wyrmscraig--testing"></a>
##### Testing

- **`tests/wyrmscraig.test.cjs`:**
  - the ids against the cache and its gamevals;
  - the shortcuts' levels, ends and timing;
  - open access;
  - the cave;
  - the corrected drop table;
  - the fight's rules (each captured cleave's quarter, the attack cycle, the sweep, the blast, the smite, the enrage).
- **`tests/agility.test.cjs`:** every shortcut's object id is checked against the cache, so nameless multilocs count too.
- **`::madangelhp <hitpoints>`** (developer): sets your angel's hitpoints, to see the enrage (360) or finish it off.
<!-- end-source-document: tsps-upstream/docs/wyrmscraig.md -->

---

<a id="doc-tsps-upstream-docs-zulrah"></a>
## tsps-upstream/docs/zulrah.md

<!-- source-document: tsps-upstream/docs/zulrah.md -->
<a id="doc-tsps-upstream-docs-zulrah--zulrah"></a>
### Zulrah

Zulrah, built from the OSRS Wiki ("Zulrah", "Zulrah/Strategies", "Snakeling", "Priestess Zul-Gwenwynig", "Sacrificial boat", "Zul-andra teleport") and the cache. Near-Reality's implementation was the reference for what the Wiki leaves out: tiles, animations, projectiles and timings. No live capture has been taken yet. Wherever only Near-Reality's values are used, this page says so, so a capture can check them later.

It is one plugin, `server/plugins/bosses/Zulrah.plugin.js`, which delegates to the units in `server/plugins/bosses/zulrah/`.

<a id="doc-tsps-upstream-docs-zulrah--layout"></a>
#### Layout

| File | What it owns |
| --- | --- |
| `ZulrahShared.js` | Ids, tiles, the access varbit and helpers such as the fade and dialogues. |
| `ZulrahRotations.js` | The four rotations as data, and the order phases come in. |
| `ZulrahFight.js` | One player's fight: the shrine, Zulrah rising, its attacks, the tail, the dives. |
| `ZulrahHazards.js` | Venom clouds, snakelings and the snakelings' attacks. |
| `Shrine.*` | The boat, the teleport scrolls, kills and loot, the damage cap, deaths and Zul-Gwenwynig's retrieval. |
| `Commands.*` | Developer commands. |

<a id="doc-tsps-upstream-docs-zulrah--getting-there"></a>
#### Getting there

**Access is open.** The Wiki's Regicide requirement and the High Priestess's permission are not checked. Login sets varbit 4391 to 3, and two things read it:
- The pier's boat is multiloc 10068 at (2214, 3056). At 3 it becomes the Sacrificial boat (46242, Board and Quick-Board).
- The priestess is multinpc 2124. At 3 she becomes Zul-Gwenwynig (2033, Talk-to and Collect).

The server resolves both per player, so the options are handled by name.

**The boat:**
- Board asks "Return to Zulrah's shrine?" (Near-Reality); Quick-Board goes straight.
- It refuses while Zul-Gwenwynig holds the player's items: "I've got some stuff you left at the shrine earlier. …" (Near-Reality).
- The screen fades, the player lands at (2268, 3068), and "The priestess rows you to Zulrah's shrine, then hurriedly paddles away." shows.
- Zulrah rises as soon as that dialogue is closed or the player moves (Wiki).
- Live, Board also locks the camera to watch Zulrah rise. Our protocol has no camera packets, so both options behave the same.

**The shrine:**
- It is a private area over the real island, (2250-2285, 3055-3085), multi-way, as the Inferno is.
- Teleporting, dying or logging out ends the fight and removes everything.
- Logging back in on the shrine, with no fight left, puts the player at the pier (2213, 3056), Near-Reality.

**Teleports:**
- `::teleports` has Zulrah under Bosses, landing at the Zul-andra teleport destination (2196, 3056), Wiki.
- The Zul-andra teleport scrolls from Zulrah's loot have their Teleport option.

<a id="doc-tsps-upstream-docs-zulrah--the-fight"></a>
#### The fight

<a id="doc-tsps-upstream-docs-zulrah--forms-and-attacks"></a>
##### Forms and attacks

| Form | NPC | Attacks (Wiki) | Defence (cache) |
| --- | --- | --- | --- |
| Green (serpentine) | 2042 | Ranged | Magic -45, Ranged +50 |
| Red (magma) | 2043 | The tail, typeless | Magic 0, Ranged +300 |
| Blue (tanzanite) | 2044 | Magic, sometimes Ranged | Magic +300, Ranged 0 |

**Ranged and Magic attacks:**
- Every 3 ticks, max hit 41.
- Damage is rolled with the player's prayer as the attack starts (Wiki).
- An attack that lands envenoms (venom 6), even through prayer (Wiki).
- Projectiles: Ranged 1044, Magic 1046, from cycle 40, landing at 58 + 5 per tile (Near-Reality).
- Animation 5069.
- The blue form's attacks are Ranged 3 times in 10 (Near-Reality). The Wiki only says Magic is "much more" frequent.
- An attack is skipped (it still counts) when a pillar blocks Zulrah's line of sight. This is not verified: the Wiki only suggests hiding behind a pillar in the blue phase.

**The tail (red form):**
- Zulrah looks at the player's tile, then strikes it 5 ticks later. It aims again at tick 9 and strikes at tick 15 (Near-Reality).
- Anyone within one tile of the aimed tile is hit; two tiles away is safe (Wiki).
- The four tiles beside the pillars, (2263/2264/2272/2273, 3072), are never hit (Near-Reality, the Wiki's safespot).
- In rotations 1 and 2, the first swing never reaches (2274, 3077) on the north-east tip (Near-Reality).
- A hit deals 20-30 typeless damage (Wiki), stuns for 3 seconds, envenoms, and throws the player up to 4 tiles away from Zulrah with anim 1157.
- Near-Reality rolls 0-41; the Wiki says 20-30.
- Which way Zulrah faces, and whether it uses anim 5806 or 5807, follows Near-Reality.

**The Jad phase** alternates Ranged and Magic, starting with the style the Wiki gives for the rotation.

**Damage taken:**
- Hits on Zulrah above 50 become 45-50 (Wiki, Mod Ash).
- Zulrah cannot be attacked from when it dives until it has resurfaced.
- Hits already on their way when it dives land at once. The Wiki says they register "shortly after it resurfaces"; Near-Reality throws them away.
- Melee only reaches it with a halberd (Wiki: since 7 May 2025 it is no longer immune to melee, but only halberds reach it).
  - Zulrah's west place is right beside the island, so a shorter melee weapon is refused with "I can't reach that!".
  - Near-Reality still zeroes all melee damage; that was not carried over.

**Animations:**
- The cache list for Zulrah was guessed wrong: the rise was set as its block animation.
- `npc-combat-defs.json` now gives attack 5069, block 5808 and death 5804, inferred from the sequences' lengths and priorities. For example, 5804 is 49 frames at priority 10, and 5808 is 9 frames at priority 5.
- Snakelings: attack 1741, block 1742, death 2408, spawn 2413.

<a id="doc-tsps-upstream-docs-zulrah--places"></a>
##### Places

Zulrah's south-west tile (Near-Reality):

| Place | Tile |
| --- | --- |
| Middle | (2266, 3073) |
| South | (2266, 3062) |
| West | (2257, 3071) |
| East | (2276, 3072) |

**Facing:** Zulrah faces the player whenever it is up.
- Live (Near-Reality), it turns to the tiles it spits clouds and snakelings at, and toward where its tail will land.
- Our NPC updates have a face-entity field but no face-tile one, so it stays on the player then too. The tail is aimed at the player's tile anyway.

<a id="doc-tsps-upstream-docs-zulrah--rotations"></a>
##### Rotations

`ZulrahRotations.js` holds the Wiki's four rotations phase by phase: place, form, and what Zulrah does, in order. The test checks them against the Wiki's list.

**The cycle:**
- The fight always opens in the middle in green form with four venom cloud barrages.
- Every rotation ends in the middle in green form with five Ranged attacks and four barrages. The Wiki counts this phase as the first of the next rotation.
- The next rotation is then picked at random, and may be the same one.

**Timing** (Near-Reality):
- Zulrah rises with anim 5071, can be attacked 4 ticks later, and starts its first phase 9 ticks after rising.
- Each step (an attack, a barrage, an orb) starts 3 ticks after the last.
- 3 ticks after a phase's last step it dives (anim 5072). 3 ticks later it moves to its next place in its next form.
- It rises (anim 5073) one tick after that. A teleported NPC is left out of players' views on the tick it teleports, and that tick's animation is never sent, so the rise has to wait for the next one.
- Its next phase starts 3 ticks after it rises (7 after the dive, as in Near-Reality), which is also when it can be attacked again.
- A tail phase takes 18 ticks.

**Not done:**
- The Wiki says rotations after the first can randomly differ from the expected phase.
- It also says long fights (3+ minutes) can have a green form attacking with unpredictable Ranged and Magic.

<a id="doc-tsps-upstream-docs-zulrah--clouds-and-snakelings"></a>
##### Clouds and snakelings

**Venom clouds:**
- A barrage throws two clouds (projectile 1045, landing at 68 or 98 + 5 per tile).
- Each cloud is loc 11700 on the tile south-west of its centre, covering 3x3 (Wiki).
- Anyone inside takes damage every tick without being envenomed (Wiki). It shows as a poison hitsplat; our hitsplats have no venom type.
- A barrage onto a cloud already there makes it last from then.
- Near-Reality's values: 1-4 a hit, lasting 30 ticks.
- The Wiki does not give the damage.

**Snakelings:**
- An orb (projectile 1047, landing at 130 + 5 per tile) becomes a snakeling where it lands.
- Melee is 2045 (max 15); magic is 2046 (max 13, projectile 1230). Both attack every 3 ticks (Wiki). Near-Reality's 15 for the magic one and its speed of 4 were not carried over.
- A quarter are magic (Near-Reality). The Wiki gives no ratio.
- They rise with anim 2413 and attack 3 ticks later.
- They die after 67 ticks (Wiki: 40 seconds) or with Zulrah, and envenom like it.

**Tiles:** where each barrage and orb lands is Near-Reality's. Fixes and caveats:
- Its typo'd (2273, 2075) is (2273, 3075) here.
- A few of its tiles, such as (2273, 3078), are on the shore by the island's north tips.
- A cloud there still covers the tip.
- A snakeling there is stuck, as the Wiki says some are. It still attacks if magic, and dies after its 40 seconds.

<a id="doc-tsps-upstream-docs-zulrah--differences-from-near-realitys-rotations"></a>
##### Differences from Near-Reality's rotations

Near-Reality's tables were checked against the Wiki and corrected:
- **The closing phase was missing.** On a repeat, Near-Reality went straight to the four barrages without the five Ranged attacks before them.
- **Rotation 4's last phase had no dive,** so the next rotation started in blue form.
- **Rotation 4's attack counts:** phase 2 is 6 attacks, not 5, and phase 9 is 4 Ranged attacks, not 5.
- **Rotation 1's typo'd cloud tile** (above).

<a id="doc-tsps-upstream-docs-zulrah--a-kill"></a>
#### A kill

**On the kill:**
- Zulrah dies with anim 5804.
- Its snakelings die and its clouds clear (Wiki).
- Attacks already thrown still land (Wiki).

**Loot:**
- The loot lands under the player (Wiki), through the drop plugin's new `npc-drops:location` event.
- Zulrah rolls its table twice a kill, tertiary drops excluded (Wiki). The drop plugin now takes a table-level `rolls`, set for Zulrah in its Wiki corrections.

**After the kill:**
- A Zul-Andra teleport scroll (11701) appears beside the player (Wiki), on the first free tile from north-east (Near-Reality).
- Reading it asks "Leave Zulrah's shrine?" (Near-Reality), then teleports to Zul-Andra with the scroll animation 3864 and graphic 1039 (Near-Reality, both in the cache).

**Messages:**
- "Your Zulrah kill count is: N." and "Fight duration: m:ss.xx", timed from Zulrah rising.
- The kill count and personal best are saved.

<a id="doc-tsps-upstream-docs-zulrah--dying"></a>
#### Dying

**Held items:**
- What a death at the shrine would drop is held by Priestess Zul-Gwenwynig (Wiki), with the message "Priestess Zul-Gwenwynig has retrieved some of your items. You can collect them from her at the pier in Zul-Andra." (Near-Reality).
- What is kept on death is kept as usual. Untradeables lost anyway stay lost.

**Talk-to** while she holds items: "You left some stuff at Zulrah's shrine when you left earlier." (Near-Reality), then the same as Collect. Otherwise her Wiki transcript plays.

**Collect:**
- It returns the items in the order they dropped (inventory, then equipment), as far as the inventory has room.
- It is free for the first 50 kills, then costs 100,000 coins once per death (Wiki).
- Her line asking for the coins is ours; the Wiki gives none.
- With nothing held: "I'm afraid I don't have anything for you to collect. …" (Near-Reality).

**Losing them:** an unsafe death anywhere else before collecting loses what she holds (Wiki). A death while carrying nothing droppable does not clear them.

**Not done:**
- The Wiki's item-retrieval interface: Collect gives the items straight back.
- The Western Provinces elite diary's daily resurrection.
- A gravestone system. That would be its own piece of work.

<a id="doc-tsps-upstream-docs-zulrah--sounds"></a>
#### Sounds

Near-Reality's sound effects are played to the player:

| Event | Sounds |
| --- | --- |
| Zulrah's Ranged attack | 213, then 224 as it lands |
| Zulrah's Magic attack | 162, then 163 as it lands |
| Cloud barrage | 796 when spat, 790 when a cloud lands, 795 or 796 when it goes |
| Snakeling orb | 788 when spat, 1930 when it lands |
| Snakelings' attacks | Melee 794; Magic 224, then 794 as it lands |

<a id="doc-tsps-upstream-docs-zulrah--not-carried-over-from-near-reality"></a>
#### Not carried over from Near-Reality

- Combat achievements, the boss timer, the advent calendar and loot broadcasts.
- The cannon restriction: this server has no cannon to place.
- The magic snakeling's max hit of 15, its attack speed of 4, and a melee snakeling attacking from 6 tiles away. The Wiki gives 13, 3 and melee range.
- Its 0-41 tail damage. The Wiki gives 20-30.

<a id="doc-tsps-upstream-docs-zulrah--data-and-shared-changes"></a>
#### Data and shared changes

- `npc-combat-defs.json`: animations for Zulrah's three forms and both snakelings.
- `plugins/npcs/NpcDrops.plugin.js`:
  - tables can have `rolls`;
  - the `npc-drops:location` event lets a plugin move where loot lands;
  - Zulrah's two rolls are set in its Wiki corrections.
- `plugins/interface/TeleportInterface.plugin.js`: Zulrah under Bosses.

<a id="doc-tsps-upstream-docs-zulrah--developer-commands"></a>
#### Developer commands

| Command | What it does |
| --- | --- |
| `::zulrah` | To the Zul-Andra pier. |
| `::zulrahfight [1-4]` | Straight onto the shrine, optionally forcing the first rotation. Zulrah rises when you move. |
| `::zulrahkill` | Kills the Zulrah you are fighting. |

<a id="doc-tsps-upstream-docs-zulrah--unverified-for-a-capture-to-settle"></a>
#### Unverified (for a capture to settle)

- **Timings:**
  - when each step starts, and the dive and rise;
  - the tail's aim and strike ticks.
- **Shares and amounts:**
  - the blue form's Ranged share;
  - the snakelings' magic share;
  - cloud damage and duration.
- **Placement:** the tiles each barrage and orb lands on.
- **Line of sight:** whether a pillar blocking line of sight skips an attack.
- **Text:** the boat's "Return to Zulrah's shrine?" choice and the priestess's lines.
- **Sounds:** the sound effect ids.
<!-- end-source-document: tsps-upstream/docs/zulrah.md -->

---

<a id="doc-tsps-upstream-readme"></a>
## tsps-upstream/README.md

<!-- source-document: tsps-upstream/README.md -->
<a id="doc-tsps-upstream-readme--tsps---typescript-runescape-private-server"></a>
### TSPS - TypeScript RuneScape Private Server

A browser-based Old School RuneScape private server with a TypeScript/WebGL client and TypeScript game server.

<a id="doc-tsps-upstream-readme--packages"></a>
#### Packages

- [`client/`](tsps-upstream/client) — browser client (Forked from [xRSPS](https://github.com/xrsps/xrsps-typescript))
- [`server/`](tsps-upstream/server) — game server (Official continuation of our [Elvarg](https://github.com/RSPSApp/elvarg-rsps) fork - Ported to TypeScript)

<a id="doc-tsps-upstream-readme--quick-start"></a>
#### Quick start

Install [Node.js 22.16 or later](https://nodejs.org/en/download) first. No separate Yarn or Corepack installation is needed.

From the repository root:

```bash
npm run setup
yarn start
```

Open <http://localhost:3000>. The first start downloads the game cache automatically.

If setup is interrupted, run `npm run setup` again.

Running several branches at once, one worktree each on its own ports: see [docs/worktrees.md](#doc-tsps-upstream-docs-worktrees).

<a id="doc-tsps-upstream-readme--publish-your-world"></a>
#### Publish your world

Create a server token at [RSPS.app](https://rsps.app/) under **Settings → Server tokens**, then add it to `.env` in the repository root:

```dotenv
WEBRTC_WORLD_ID=my-world
WEBRTC_WORLD_TOKEN=paste-your-token-here
```

Run `yarn start`. Your world appears in the World list once it registers. Keep the token private.

<a id="doc-tsps-upstream-readme--links"></a>
#### Links

- [Progress](https://rsps.app/progress) — how much of OSRS is implemented, by category
- [Host a world](https://rsps.app/host)

<a id="doc-tsps-upstream-readme--credits"></a>
#### Credits

We want to thank Astrul, Detuks, Vexus and all the contributors of both the legacy Java project and the TypeScript continuation.

<a id="doc-tsps-upstream-readme--legal"></a>
#### Legal

This fan project is not affiliated with Jagex Ltd. Old School RuneScape and related assets and trademarks belong to their respective owners.
<!-- end-source-document: tsps-upstream/README.md -->

---

<a id="doc-tsps-upstream-server-agents"></a>
## tsps-upstream/server/AGENTS.md

<!-- source-document: tsps-upstream/server/AGENTS.md -->
<a id="doc-tsps-upstream-server-agents--agentsmd"></a>
### AGENTS.md

A TypeScript OSRS server. The TypeScript is the source of truth, and behaviour is judged
against live OSRS, never against another private server.

<a id="doc-tsps-upstream-server-agents--rules"></a>
#### Rules

1. **Plugins first.** Gameplay, content, QoL and overrides go in `plugins/`. Core is for
   foundations only (networking, entity lifecycle, sync, packets, hook dispatch) and gets
   generic hooks, never feature logic.
2. **Core through `api.core`.** Plugins never `require("../../src/main/typescript/...")`. If a
   class is missing from `api.core`, add it to `getCoreApi()` and `PluginCoreApi`.
3. **`register` is attach-only.** One line per hook, wired to a named module-level function.
   No logic, state setup or closures with bodies inside `register`.
4. **Hook by name.** `api.onObjectInteraction("Ladder", { "Climb-up": climbUp })`, not id
   lists. Where an id is unavoidable, use a named constant, never a bare number.
5. **Plugins talk through custom events.** `api.emitCustomEvent("domain:event", payload)` /
   `api.onCustomEvent(...)`. Never add a feature-specific hook or emit to `PluginManager`.
6. **Members content exports `members: true`**, or it leaks into free-to-play worlds.
7. **Area-scoped content is an `Area`**, registered with `api.registerArea`, not global
   `onPlayerProcess` / `onCanAttack` / `onCanTeleport` hooks that run for every player.
8. **Commands declare their rank:** `api.registerCommand("npc", spawnNpc, PlayerRights.OWNER)`.
   Handlers never check rights themselves.
9. **Ids come from the cache** (`yarn dump:widget`, `dump:cs2`, `dump:enum` ...), never from
   guesswork or old RSPS constants.
10. **Behaviour comes from the OSRS Wiki**; the cache wins on ids. Never cite another RSPS as
    justification - if RSPS code is your only source, say so in the PR.
11. **No new smoke scripts.** Extend an existing one, or say in the PR how you verified.
12. **Follow the pattern already in the module you touch.** Ask before deviating.
13. **No one-offs.** No single-item special cases, override layers or abstractions for one
    value. Edit the canonical data (`data/definitions/items.json`, `shops.json`) instead.
14. **Attribute keys** are kebab-case and namespaced (`warriors-guild:basement-unlocked`),
    declared once in a `*_ATTRIBUTE` constant.

<a id="doc-tsps-upstream-server-agents--a-plugin-that-follows-them"></a>
#### A plugin that follows them

```js
const LAST_PRAYED_ATTRIBUTE = "altars:last-prayed";

function prayAtAltar({ player }) {
  player.setAttribute(LAST_PRAYED_ATTRIBUTE, Date.now());
  ...
}

module.exports = {
  name: "Altars",
  register(api) {
    api.onObjectInteraction("Altar", { "Pray-at": prayAtAltar, Pray: prayAtAltar });
  },
};
```

<a id="doc-tsps-upstream-server-agents--read-when-the-task-touches-it"></a>
#### Read when the task touches it

| Topic | File |
| --- | --- |
| Plugin structure, splitting large plugins, events, members, commands | [docs/agents/plugins.md](#doc-tsps-upstream-server-docs-agents-plugins) |
| Area-scoped content (wilderness, minigames, boss rooms) | [docs/agents/areas.md](#doc-tsps-upstream-server-docs-agents-areas) |
| Finding ids: cache dump scripts, generated identifiers | [docs/agents/cache.md](#doc-tsps-upstream-server-docs-agents-cache) |
| Interfaces that don't exist in the cache | [docs/agents/interfaces.md](#doc-tsps-upstream-server-docs-agents-interfaces) |
| Where behaviour comes from, packet captures, reference codebases | [docs/agents/sources.md](#doc-tsps-upstream-server-docs-agents-sources) |
| Measuring performance before and after a change (MCP load + perf tools) | [docs/agents/perf.md](#doc-tsps-upstream-server-docs-agents-perf) |
| Checking behaviour in-game without a client (MCP test tools) | [docs/agents/testing.md](#doc-tsps-upstream-server-docs-agents-testing) |

Project layout: [`docs/ARCHITECTURE.md`](#doc-tsps-upstream-docs-architecture). Gamemode-independent
modules: [`docs/extrascripts.md`](#doc-tsps-upstream-docs-extrascripts).
<!-- end-source-document: tsps-upstream/server/AGENTS.md -->

---

<a id="doc-tsps-upstream-server-data-models-dragonic-katana-readme"></a>
## tsps-upstream/server/data/models/dragonic-katana/README.md

<!-- source-document: tsps-upstream/server/data/models/dragonic-katana/README.md -->
<a id="doc-tsps-upstream-server-data-models-dragonic-katana-readme--dragonic-katana"></a>
### Dragonic Katana

Models by **lumplum**, released 3 December 2017:
https://rune-server.org/threads/release-dragonic-katana.667703/

Original download:
https://www.dropbox.com/s/yqqp2cwjsr2ab9b/Dragonic%20Katana.zip?dl=0

- `equip.dat`: original `Dragonic Katanab.dat`
- `drop.dat`: original `Dragonic Katana (drop)b.dat`

The release offers the models for others to use and modify; it does not specify
a formal software license. Preserve this attribution when redistributing them.
<!-- end-source-document: tsps-upstream/server/data/models/dragonic-katana/README.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-areas"></a>
## tsps-upstream/server/docs/agents/areas.md

<!-- source-document: tsps-upstream/server/docs/agents/areas.md -->
<a id="doc-tsps-upstream-server-docs-agents-areas--area-scoped-content"></a>
### Area-scoped content

Content that only applies where a player stands (the Wilderness, a minigame, a boss room) is
an `Area`, not a set of global hooks.

<a id="doc-tsps-upstream-server-docs-agents-areas--why"></a>
#### Why

A global `onPlayerProcess` / `onCanAttack` / `onCanTeleport` / `onNpcAggressionTolerance`
runs for every player on every call and has to ask "am I in my area?" itself - O(players)
per tick per hook, even when the area is empty. `AreaManager` already resolves each actor's
area once, when they move, so an Area costs nothing for anyone outside it and gets reliable
`postEnter` / `postLeave` edges for free.

| | Global hook | Area |
| --- | --- | --- |
| `canAttack` per tick | O(players x hooks) | O(players) |
| Aggression tolerance per tick | O(players x npcs x hooks) | O(players x npcs) |
| Per-tick processing | O(players) | O(players in the area) |
| One more area plugin | +O(players) per tick per hot hook | +0 for players outside it |

<a id="doc-tsps-upstream-server-docs-agents-areas--how"></a>
#### How

```js
function createArena(api) {
  class Arena extends api.core.Area {
    process(mobile) { /* per tick, actors in the area only */ }
    postLeave(mobile, logout) { /* reset UI, drop carried items */ }
    canAttack(attacker, target) { return null; }      // true / false / null = no opinion
    canTeleport(player, wildernessLevelLimit) { return null; }
    npcAggressionTolerance(player, npc) { return null; }
  }
  return new Arena(ARENA_BOUNDARIES);
}

register(api) {
  api.registerArea(createArena(api));
}
```

- Register with `api.registerArea`, not `AreaManager.areas.push`: it attributes the area's
  time to your plugin in `::pluginperf` and isolates a throw from the player's tick.
- Core asks the attacker's area, then the target's, before the global hooks; `null` falls
  through. Keep a global hook only for rules that genuinely span areas.
- An actor holds one area and the first registered match wins. A broad area (one that can
  cover the whole map) registers in `onServerStartup` so specific areas take priority.
- Entering another area directly (`area.enter(player)`, as instances do) leaves the previous
  one first, so `postLeave` always fires. Judge the exit by having left, not by the tile: an
  instance can claim a player before moving them.
- Rules still read the actor's live state (tile, combat level); membership only decides who
  is asked, and can trail a teleport by a tick.

See `plugins/areas/Wilderness.plugin.js` for the worked example.

<a id="doc-tsps-upstream-server-docs-agents-areas--content-spread-across-the-map"></a>
#### Content spread across the map

An Area fits a compact zone with rules. Content scattered over the map (farming patches, bird
houses, hunting grounds) doesn't fit one: an actor holds one area at a time, and most of the
cost is usually not about location anyway. Instead:

- Sync per map square with `api.onPlayerMapSquareChange`, which fires once per 64x64 square
  crossed (walking or teleporting), not per tile.
- Drive timed work from one `core.Task` that visits only what is active (players with queued
  work, traps, glove holders), or spreads a per-player sweep over several ticks.
- Walk a player's own state, not every definition in the game.
<!-- end-source-document: tsps-upstream/server/docs/agents/areas.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-cache"></a>
## tsps-upstream/server/docs/agents/cache.md

<!-- source-document: tsps-upstream/server/docs/agents/cache.md -->
<a id="doc-tsps-upstream-server-docs-agents-cache--finding-ids-in-the-cache"></a>
### Finding ids in the cache

Interface, sprite, enum, clientscript, animation and gfx ids come from the cache in
`server/caches`, never from guesswork or stale RSPS constants. The dump scripts exist so you
do not have to guess - each one documents its own output in its file header:

| Command | What it answers |
| --- | --- |
| `yarn dump:widget <groupId>` | Every component in an interface group: type, parent, sprite, text, and the CS2 listeners attached to it. |
| `yarn dump:cs2 <scriptId>` | Disassembles a clientscript - which varp/varbit renders a value, and whether a script will overwrite text the server sends. |
| `yarn dump:enum <enumId>` | A cache enum's key -> value pairs, for the lookup tables the client's own scripts read. |
| `yarn dump:seq [<seqId...>]` | Animation sequences: frame count/ids, priority and loop count - what an attack animation lookup needs. |
| `yarn dump:spotanim [<spotanimId...>]` | Graphics (spotanim) configs: the model and sequence each gfx plays. |
| `yarn dump:item-combat-styles` | Refreshes `data/definitions/item-combat-styles.json` from cache dbtable 78, preserving server-owned fields. |
| `yarn compare:cache <cache dir>` | What moves in another cache revision, matched by gameval name: interface components (and the literal `(group << 16) \| component` ids in our code that would point elsewhere) and DB table columns (and the files that mention each changed table). Read-only. |
| `yarn ensure-cache` | Downloads/validates the cache the above need. |

Typical flow for an interface:

1. Find the group/component name: the cache's own gamevals name them (`chatbox:chatmodal`),
   which is what rsprox prints in captures; RuneLite's generated `InterfaceID.java` too.
2. Confirm it against this cache with `yarn dump:widget <groupId>`.
3. If a value renders oddly, `yarn dump:cs2` the listener to see what drives it.

**Prefer feeding the varps/varbits a cache script already reads over writing component text
that the same script will overwrite a tick later.**

Item/NPC/object constants are generated from the live cache - regenerate with
`scripts/generate-identifiers.ts` rather than hand-editing (run `--dry-run` first: it reports
added/changed/removed names and keeps existing names stable), and `scripts/audit-identifiers.ts`
checks the names still match the cache.

<a id="doc-tsps-upstream-server-docs-agents-cache--gamevals"></a>
#### Gamevals

The OSRS cache carries Jagex's own names for its ids in index 24 (one archive per kind: objs,
npcs, locs, seqs, spotanims, varps, varbits, dbrows, and interfaces with their components).
`game/cache/Gamevals.ts` reads them: `componentName(uid)` / `componentId("chatbox:chatmodal")`,
`tableColumn(166, "hotspot")` for a DB table's column, and `namesOf(GamevalKind.SEQ)`. They are the names rsprox prints (`human_reachforladder`,
`slayertower_door`), so a capture maps straight onto ids.

<a id="doc-tsps-upstream-server-docs-agents-cache--updating-the-cache-revision"></a>
#### Updating the cache revision

The full procedure, and what 237 → 241 changed, is in [docs/cache-revision-update.md](#doc-tsps-upstream-docs-cache-revision-update).

`target.txt` names the cache. Before moving to a newer one:

- Config and clientscript opcode meanings for the new revision: https://github.com/zwyz/osrs-cache
  (`data/commands/*.txt` for every CS2 command with its signature,
  `src/main/java/osrs/unpack/config/*Unpacker.java` for config opcodes).
- What changed in the client per revision: rsprot's `WHATSNEW.md` (https://github.com/blurite/rsprot).
- RuneLite's `cache` module (https://github.com/runelite/runelite, `cache/`) gets a
  "cache: rev N" commit with each revision's new config opcodes.
- Client scripts: regenerate the command signatures for the revision
  (`npx tsx scripts/cache/generate-command-signatures.ts <osrs-cache checkout> <revision>` in
  `client/`), then `npx tsx scripts/cache/cs2-sweep.ts [--compare <old cache dir>]`. It runs
  every script and lists instructions that leave the stacks unlike their signature, JavaScript
  errors in handlers, and script errors that are new since the old cache (scripts run with dummy
  arguments there, so read that list: most entries are cc_create on component 0).
- Interfaces: `npx tsx scripts/cache/interface-sweep.ts [--compare <old cache dir>] [--all]` in
  `client/` opens every interface as the game does (onLoad, then each transmit listener and
  timer once) and lists script errors and components showing item 0 or "null" text that the old
  cache didn't have; `*` marks interfaces our server opens. It found the 241 bank-tag icons.
- The client tests `cs2-opcode-coverage`, `cs2-script-sweep`, `interface-sweep`,
  `cache-config-decode` and `world-map-cache-format` hold the result.
- `yarn compare:cache <new cache dir>` for interface components and DB table columns that moved,
  and for the varps/varbits the code uses whose definition is gone or changed. Code reads table
  columns by number, so a column inserted mid-table shifts every later one. For each changed
  var it lists what the scripts that used it read now (rev 241: varbit 4398, the GE offer price,
  became long varp 5753; varbit 12377 `mouseover_text_enabled` became 10035
  `mouseover_text_disabled`, inverted). The code is read as written for the older cache: from a
  worktree already on the new cache, pass `--older <old cache dir> --code <checkout before the
  update>`.
- `scripts/generate-identifiers.ts --dry-run` for item/NPC/object names that moved or vanished.
- Data files: `yarn dump:item-combat-styles`, and fix `item-gameplay.json` entries whose name no
  longer matches the cache (the loader skips them). See "Server data files" in the playbook.
- Worktrees share `server/caches` through a symlink and `ensure-cache` rewrites `caches.json`
  for every one of them: try a new revision in a worktree with its own `server/caches`.
<!-- end-source-document: tsps-upstream/server/docs/agents/cache.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-interfaces"></a>
## tsps-upstream/server/docs/agents/interfaces.md

<!-- source-document: tsps-upstream/server/docs/agents/interfaces.md -->
<a id="doc-tsps-upstream-server-docs-agents-interfaces--server-defined-interfaces"></a>
### Server-defined interfaces

An interface that does not exist in the cache is defined entirely by the server. A plugin
registers one definition - the widget group plus the behaviour the client drives it with -
and it becomes an addressable resource:

    api.registerCustomInterface({ groupId, widgets, search, list, status, hint })
    -> GET /api/interfaces/<groupId>

The client fetches it the first time that group is opened, so opening one only needs the
usual sub-interface packet. `widgets/custom/CustomInterfaceRuntime.ts` reads the behaviour
half and owns focus, keystrokes, scrolling and slot binding; see
`plugins/interface/Commands.plugin.js` for a worked example.

Row data is a separate resource, registered with
`api.registerContentEndpoint(name, handler)` and served at `/api/<name>`. Use it for
request/response shaped, cache-derived data - searches, lists, lookups.

Rules for both:

- Read-only and public. Anything player-specific or privileged stays on the game socket,
  where the session is already authenticated.
  A search declaration can use `dataComponent` instead of `endpoint`: send JSON rows
  (`[{ id, name }]`) to that hidden text component with `sendString`. The shared search
  runtime filters those rows locally, including all rows when the query is empty. Use
  `list.textOnly: true` for rows that are text rather than inventory items. Commands uses
  this mode to send only the current player's permitted commands, then prefills the query
  by sending text to `search.inputComponent`.
- Responses carry an ETag and revalidate to 304, so definitions are fetched once per build
  rather than pushed on every open.
- The first open of a session waits on a fetch. Updates sent in the same batch are held by
  the client and applied once the widgets exist, so an interface can be populated straight
  after opening it.

Adding an interface of this kind should need no client change. If it does, the missing
capability belongs in the runtime as a declared option, not in a feature-specific module.
<!-- end-source-document: tsps-upstream/server/docs/agents/interfaces.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-perf"></a>
## tsps-upstream/server/docs/agents/perf.md

<!-- source-document: tsps-upstream/server/docs/agents/perf.md -->
<a id="doc-tsps-upstream-server-docs-agents-perf--measuring-performance"></a>
### Measuring performance

Start the server with the agent MCP enabled, then connect to it:

    AGENT_MCP=1 yarn dev
    claude mcp add --transport http tsps http://127.0.0.1:49700/mcp

In a worktree, `scripts/wt` has already registered `tsps` at that worktree's own
`AGENT_MCP_PORT` (see [docs/worktrees.md](#doc-tsps-upstream-docs-worktrees)); never connect to another
worktree's port.

<a id="doc-tsps-upstream-server-docs-agents-perf--before-and-after-a-change"></a>
#### Before and after a change

1. **Load:** `load_spawn` logs in headless *real* players (bots skip `onPlayerProcess` and NPC
   aggression, so they hide the costs you are measuring). Put them where the code under test
   runs, e.g. `{ count: 200, x: 3100, y: 3600, radius: 30 }` for the Wilderness, and leave
   some load elsewhere so global costs show too. They are never saved.
2. **Before:** `perf_sample { seconds: 60 }` - server tick timings and per-plugin timings for
   exactly that window.
3. Make the change, restart, spawn the same load again.
4. **After:** `perf_sample { seconds: 60 }`, then `load_despawn`.

Compare `server.avgTickMs` and the phases the change touches (`player.process.area`,
`npc_aggression`, `combat.process.can_attack.policy` ...), plus the plugin's own row. Area
methods show up under their plugin as `area:process`, `area:canAttack` and so on.

`server_perf` and `plugin_perf` read the same data without the timed window. `load_status`
shows what load is online.
<!-- end-source-document: tsps-upstream/server/docs/agents/perf.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-plugins"></a>
## tsps-upstream/server/docs/agents/plugins.md

<!-- source-document: tsps-upstream/server/docs/agents/plugins.md -->
<a id="doc-tsps-upstream-server-docs-agents-plugins--plugins"></a>
### Plugins

Detail behind the plugin rules in [AGENTS.md](#doc-tsps-upstream-server-agents).

<a id="doc-tsps-upstream-server-docs-agents-plugins--what-goes-where"></a>
#### What goes where

- All gameplay features, content systems, QoL behaviour and overrides go in `plugins/` by
  default.
- Core server code stays foundational: networking, entity lifecycle, synchronisation,
  packet decode/encode, hook dispatch.
- If a change is not foundational, it probably belongs in a plugin.
- Prefer composable plugin hooks over hardcoded branching in core systems.

`PluginManager` holds shared guardrails and hook plumbing, nothing per-feature. Keep
validation and safety checks centralised in its emit/register paths so plugins stay simple.
Do not add feature-specific logic to it unless it is genuinely generic hook infrastructure.

<a id="doc-tsps-upstream-server-docs-agents-plugins--core-access"></a>
#### Core access

Core classes and helpers are exposed on the shared, frozen `api.core` object (built once by
`PluginManager.getCoreApi()`):

```js
module.exports = {
  name: "Example",
  register(api) {
    const { Animation, ItemIdentifiers, Skill } = api.core;
    ...
  },
};
```

- If a class you need is missing from `api.core`, add it to `getCoreApi()` and
  `PluginCoreApi` - never add the relative require.
- Relative requires between files inside the same plugin directory are fine (that is plugin
  code, not core): `require("./specials/AbyssalWhip.SpecialAttack")`.
- Existing core relative requires in plugins are legacy. Converting one to `api.core` is a
  welcome cleanup.

<a id="doc-tsps-upstream-server-docs-agents-plugins--shape-register-is-attach-only"></a>
#### Shape: `register` is attach-only

It wires hook names to handlers and does nothing else. Handlers are named functions declared
at module scope, so they are readable, reusable and greppable. Reading `register` should tell
you everything the plugin hooks, in one screen.

```js
// good
function prayerAltar({ player }) {
  ...
}

module.exports = {
  name: "Altars",
  register: (api) => {
    api.onObjectInteraction("Altar", { "Pray-at": prayerAltar, Pray: prayerAltar });
  },
};
```

```js
// bad - logic buried in register
register: (api) => {
  const cache = new Map();
  api.onObjectInteraction("Altar", {
    "Pray-at": ({ player }) => {
      /* twenty lines */
    },
  });
};
```

<a id="doc-tsps-upstream-server-docs-agents-plugins--splitting-large-plugins"></a>
#### Splitting large plugins

When a plugin covers many independent units (one weapon special per weapon, one quest per
quest), it is a registration list, not a home for all of them. Keep the top-level file thin
and give each unit its own file in a folder named after the plugin:

- The folder sits next to the plugin and is lowercase: `SpecialAttacks.plugin.js` keeps its
  units in `./specials/`.
- Files end with the plugin name, singular where that reads better:
  `AbyssalWhip.SpecialAttack.js`, `DragonClaw.SpecialAttack.js`.
- Each file exports an attach function that takes `api` and calls `api.register*` itself.

Delegation lines are the one allowed addition to `register`:

```js
// plugins/combat/SpecialAttacks.plugin.js
module.exports = {
  name: "SpecialAttacks",
  register(api) {
    require("./specials/AbyssalWhip.SpecialAttack")(api);
    require("./specials/DragonClaw.SpecialAttack")(api);
    // one line per unit
  },
};
```

See `plugins/combat/SpecialAttacks.plugin.js` and `plugins/combat/specials/` for the
canonical example.

<a id="doc-tsps-upstream-server-docs-agents-plugins--name-based-hooks"></a>
#### Name-based hooks

Use the name-based overloads wherever they exist. They read as the game reads, and they
cover every id the cache gives that name - including variants a hand-written id list will
always miss.

```js
api.onObjectInteraction("Ladder", { "Climb-up": climbUp });
api.onNpcInteraction("Banker", { Collect: openCollectionBox });
api.onItemAction("Spade", { Dig: dig });
api.onItemOnObject("Knife", "Web", slashWeb, { noted: false });
```

Fall back to raw ids only when the name is genuinely ambiguous or the behaviour is
id-specific (a single transformed variant, for example). When you do, use a named constant
from `IdEnums` / the generated identifier files, never a bare number.

<a id="doc-tsps-upstream-server-docs-agents-plugins--cross-plugin-events"></a>
#### Cross-plugin events

Plugins talk to each other only through the generic custom-event API. A bespoke
`onSlayerAssignRequest` / `emitSlayerAssignRequest` pair on `PluginManager` is exactly the
hardcoded event this rule bans.

```js
// emitter: a mutable payload is the reply channel
const request = { player, npcId, line: null };
api.emitCustomEvent("slayer:assignment", request);
if (request.line) { /* use request.line */ }

// listener
api.onCustomEvent("slayer:assignment", (request) => {
  request.line = "...";
});
```

- Names are namespaced `domain:event` (`slayer:assignment`, `duelarena:validate-winnings`,
  `mining:success`).
- `emitCustomEvent` is synchronous and fire-and-forget; it returns nothing. A handler that
  answers back mutates the payload it was given (`request.line`, `event.accept`,
  `event.handled`), and the emitter reads it straight after.
- The emitter owns the event name and payload shape; the listener owns the handler. Adding
  a new cross-plugin interaction means a new event name, not new `PluginManager` surface.

<a id="doc-tsps-upstream-server-docs-agents-plugins--members-content"></a>
#### Members content

Every plugin whose content is members-only in OSRS (members skills, areas, bosses, minigames,
members items) must export `members: true`. When world.json sets `"membersWorld": false`,
`PluginManager` skips those plugins entirely.

- Check the OSRS wiki page's "Members" field when unsure; F2P content (e.g. Castle Wars,
  Emir's Arena, Obor) stays untagged.
- Quests are not plugins: add members quests to `QUESTS` only and free-to-play ones to
  `F2P_QUESTS` as well, in `plugins/quests/Quests.plugin.js`.
- Members gating that a whole-plugin skip can't express (items, XP, spawns, shop stock, areas)
  lives in `plugins/modes/FreeToPlay.plugin.js` via the `onCan*` hooks, not in core.

<a id="doc-tsps-upstream-server-docs-agents-plugins--command-rights"></a>
#### Command rights

Commands are rights-checked by the core, never by the handler. Pass the lowest rank that
may run the command as the third argument to `registerCommand`; rights ids are ordered
(none < moderator < administrator < owner < developer) so everyone above it passes too.
Omit it and any player may run it.

```js
api.registerCommand("npc", spawnNpc, PlayerRights.OWNER); // owner and developer
api.registerCommand("players", listPlayers);              // anyone
```

Give commands a description as the fourth argument. The Commands interface reads the live
registry and filters it using the same permissions as command execution:

```js
api.registerCommand("tele", teleport, api.core.PlayerRights.OWNER, "Teleport to coordinates (x y [z])");
api.getRegisteredCommands(player); // [{ command: "tele", description: "..." }, ...]
```

`api.setCommandRights(command, minimumRights)` overrides whatever a command registered
with, so a plugin can widen or narrow someone else's command.

World owners set ranks without a plugin through world.json `pluginConfig`
`"commands:permissions"`, a map of command name (no `::`) to a `PlayerRights` name. It
wins over both of the above:

```json
"pluginConfig": { "commands:permissions": { "items": "NONE", "teleports": "OWNER" } }
```

A deployment keeps its own settings in `data/definitions/world.local.json` (gitignored), layered
over world.json: each top-level key replaces world.json's, and `pluginConfig` merges key by key.
A live world can then change its XP rate or `disabledPlugins` and still update from main by
fast-forward:

```json
{ "experienceMultiplier": 10, "disabledPlugins": ["VoiceChat"] }
```

<a id="doc-tsps-upstream-server-docs-agents-plugins--conventions"></a>
#### Conventions

- Do not hardcode semantic ids when a named symbol exists (rights, opcodes, states,
  interface ids, item/npc/object ids). If a constant does not exist yet, add one in the
  appropriate shared module instead of repeating raw numbers.
- Attribute keys are kebab-case, namespaced with `:` (`warriors-guild:basement-unlocked`,
  `pvp:open-presets-on-death`, `blast-furnace`). Declare each key once in a `*_ATTRIBUTE`
  constant and read/write through it; item `getMetaValue`/`setMetaValue` keys follow the
  same rule.
- Derive from the cache where the cache knows the answer. A rule that reads definitions
  (`plugins/objects/Doors.plugin.js` builds its open/closed pairs this way) beats a
  hand-picked id list that only covers what someone happened to test.
- Keep changes incremental and isolated. Avoid large rewrites of core systems unless asked.
- Removing a dead smoke script and its `package.json` entry is a welcome PR on its own:
  ~75 exist, none run in CI, and most have never run twice.
<!-- end-source-document: tsps-upstream/server/docs/agents/plugins.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-sources"></a>
## tsps-upstream/server/docs/agents/sources.md

<!-- source-document: tsps-upstream/server/docs/agents/sources.md -->
<a id="doc-tsps-upstream-server-docs-agents-sources--where-behaviour-comes-from"></a>
### Where behaviour comes from

<a id="doc-tsps-upstream-server-docs-agents-sources--source-of-truth-order"></a>
#### Source-of-truth order

When behaviour is unclear, resolve in this order:

1. **OSRS Wiki** - gameplay intent, drop tables, requirements, mechanics:
   <https://oldschool.runescape.wiki/> (see also
   [Category:Game mechanics](https://oldschool.runescape.wiki/w/Category:Game_mechanics))
2. **osrs-docs** - engine-level mechanics the Wiki omits: collision, pathing, update masks,
   client/server internals: <https://osrs-docs.com/>
3. **osrsindex** - ids, definitions, cross-referenced cache data: <https://osrsindex.com/>
4. **OpenRune** - cache formats, tooling, definition layouts: <https://openrune.dev/>
5. **RuneLite** - client-side truth. Packet/opcode shapes, `gameval` id constants
   (`InterfaceID`, `VarbitID`, `VarPlayerID`, `ItemID`), and how the real client reacts to
   what the server sends.
6. **This server's own cache** - the final authority on ids and interface layout, read with
   the dump scripts in [cache.md](#doc-tsps-upstream-server-docs-agents-cache).

If a source conflicts with the cache in `server/caches`, the cache wins - it is what the
client actually loads. If sources conflict on behaviour, prefer the Wiki.

Do not cite another private server as justification. If a behaviour can only be found in
RSPS code, say so explicitly in the PR so it can be checked.

<a id="doc-tsps-upstream-server-docs-agents-sources--packet-captures"></a>
#### Packet captures

Captures from live OSRS (for example with rsprox) are first-hand evidence for what the
server sends: packet order, varps/varbits, interface events, exact messages. Record the facts a
feature relies on in its docs page, not the raw logs (they carry account details), and check
every captured id against the cache - live may be a newer revision than `server/caches`.

<a id="doc-tsps-upstream-server-docs-agents-sources--reference-codebases"></a>
#### Reference codebases

External codebases, ranked by usefulness as reference material. Scores are overall quality,
with content and code noted separately where they diverge. These are references for
architecture, tooling and content - the order above still governs behaviour, except where a
source is called out as a behavior oracle.

- **Void** 9/10 — cleanest RSPS codebase; Kotlin, docs, CI, script system. 2011 rev634. BSD-3.
  <https://github.com/GregHib/void>
- **LostCity** 8/10 — TS engine + script-driven 2004 content; ideal architecture ref, not
  OSRS. MIT. <https://github.com/LostCityRS/Engine-TS> + `/Content`
- **OpenRune** 8/10 — RSMod fork, OSRS rev240, plugin loading, honest progress (20/23
  skills, 18/169 bosses). ISC. <https://github.com/OpenRune/OpenRune-Server>
- **Project Gielinor** 7/10 — RSMod fork rev239; cleaner docs, overlaps OpenRune. ISC.
  <https://github.com/Slashx124/Project-Gielinor>
- **Offline_Scape** 6/10 (content 8, code 6) — Near rev240, being de-customised toward
  vanilla OSRS; pristine OpenRS2 cache, auto-discovered early Sailing (boats/docks/cargo).
  Active, 1 dev. No license (NR lineage). Behavior oracle.
  <https://github.com/MouldyToast/Offline_Scape>
- **Near-Reality** 6/10 (content 9, code 3) — huge skills/bosses/skilling content; 2-commit
  leaked dump, no license, messy. Behavior oracle only.
  <https://github.com/kurdowns/RSPS-NEAR-REALITY>
<!-- end-source-document: tsps-upstream/server/docs/agents/sources.md -->

---

<a id="doc-tsps-upstream-server-docs-agents-testing"></a>
## tsps-upstream/server/docs/agents/testing.md

<!-- source-document: tsps-upstream/server/docs/agents/testing.md -->
<a id="doc-tsps-upstream-server-docs-agents-testing--checking-behaviour-in-game"></a>
### Checking behaviour in-game

Start the server with the agent MCP enabled (see [perf.md](#doc-tsps-upstream-server-docs-agents-perf)). These tools let an agent
run the in-game checklist a PR asks for, without a client.

| Step | Tool |
| --- | --- |
| Get players | `login` (any number of accounts), `logout` |
| Set the scene | `command { player, text }` runs a `::command` as a developer for that call: `tele x y z`, `item id amount`, `master`, `cwar`, `toa` ... |
| Ask a rule | `can_attack { attacker, target: { player } or { npc } }`, `can_teleport { player, x?, y?, z? }` run the real checks and return the verdict and message, with no fight or teleport |
| Act | `walk_to`, `interact`, `npc_option`, `object_option`, `inventory_option` (Wear/Wield to equip), `use_item`, `player_option` (Attack/Trade/Follow), `cast_spell { spell, target? }` |
| Skip time | `advance_time { player, minutes }` moves timed content forward (farming, seedlings, bird houses) |
| Check the result | every action returns `area`, new `messages` and `client` (varbits, varps, interface opens/closes/hides sent since the last call); `observe { varbits, varps }` reads current values |

For example, Castle Wars friendly fire is: two `login`s, `command cwar` (or walk both into
the game), then `can_attack` between teammates (expect `CANT_ATTACK_IN_AREA` and the
message) and across teams (expect `CAN_ATTACK`).

A plugin with timed state opts in to `advance_time` by listening for the
`agent:advance-time` custom event (`{ player, ms, handledBy }`), moving its own deadlines
`ms` earlier and pushing its name onto `handledBy`.

What these can't check: how things look on screen, animation timing and feel, and anything
that depends on the real client's own scripts running.
<!-- end-source-document: tsps-upstream/server/docs/agents/testing.md -->

---

<a id="doc-tsps-upstream-server-plugins-npcs-random-events-sources"></a>
## tsps-upstream/server/plugins/npcs/random-events/SOURCES.md

<!-- source-document: tsps-upstream/server/plugins/npcs/random-events/SOURCES.md -->
<a id="doc-tsps-upstream-server-plugins-npcs-random-events-sources--random-events"></a>
### Random events

This plugin adapts existing implementations rather than inventing event control flow.
Full upstream notices are retained in [LICENSES.txt](tsps-upstream/server/plugins/npcs/random-events/LICENSES.txt).

* [Void RandomEvents.kt](https://github.com/GregHib/void/blob/2b8e267836a8469757c73694ea4d57f2f1c28458/game/src/main/kotlin/content/activity/event/random/RandomEvents.kt): initial cooldown, eligibility and re-arm before spawn attempt.
* [Void InPlaceRandomEvent.kt](https://github.com/GregHib/void/blob/2b8e267836a8469757c73694ea4d57f2f1c28458/game/src/main/kotlin/content/activity/event/random/InPlaceRandomEvent.kt): owned follower, reminder/lifetime and orphan cleanup.
* [Void SandwichLady.kt](https://github.com/GregHib/void/blob/2b8e267836a8469757c73694ea4d57f2f1c28458/game/src/main/kotlin/content/activity/event/random/sandwich_lady/SandwichLady.kt): ownership, requested food, tray selection and clearing state before serving.
* [Void RandomEventGift.kt](https://github.com/GregHib/void/blob/2b8e267836a8469757c73694ea4d57f2f1c28458/game/src/main/kotlin/content/activity/event/random/RandomEventGift.kt): lamp skill selection, ten times base level XP and consuming its slot. Local chatbox prompts provide selection/confirmation; XP uses existing world/account restrictions.
* [Void Certer.kt](https://github.com/GregHib/void/blob/2b8e267836a8469757c73694ea4d57f2f1c28458/game/src/main/kotlin/content/activity/event/random/certer/Certer.kt): three distinct shuffled choices, owner checks, correct reward and ending a wrong answer without reward. OSRS interface 184 replaces RS3's interface/enums, and OSRS gifts replace RS3 reward bags.
* [LostCity Genie](https://github.com/LostCityRS/Content/blob/d188d6a6921c6cdc2309962c1bc2bac94fd2d6d3/scripts/macro%20events/scripts/general/macro_event_genie.rs2) and [Drunken Dwarf](https://github.com/LostCityRS/Content/blob/d188d6a6921c6cdc2309962c1bc2bac94fd2d6d3/scripts/macro%20events/scripts/general/macro_event_drunken_dwarf.rs2): owner/non-owner reward flow, lamp and kebab/beer reward data.
* [LostCity macro_events.rs2](https://github.com/LostCityRS/Content/blob/d188d6a6921c6cdc2309962c1bc2bac94fd2d6d3/scripts/macro%20events/scripts/macro_events.rs2): adjacent traversable spawn square.
* [LostCity Mysterious Old Man](https://github.com/LostCityRS/Content/blob/d188d6a6921c6cdc2309962c1bc2bac94fd2d6d3/scripts/macro%20events/scripts/general/macro_event_mysterious_old_man.rs2): direct-gift follower/ownership flow. Current OSRS gift data uses the shared Rick/Certer table; historical forced teleports are omitted.
* [LostCity triffid](https://github.com/LostCityRS/Content/blob/d188d6a6921c6cdc2309962c1bc2bac94fd2d6d3/scripts/macro%20events/scripts/general/macro_event_triffid.rs2) and [NPC config](https://github.com/LostCityRS/Content/blob/d188d6a6921c6cdc2309962c1bc2bac94fd2d6d3/scripts/macro%20events/configs/antimacro.npc): stationary growth animation, owner-only picking, immature refusal and 45-tick maturity. Current OSRS has dismissal and no hostile stage.

These clean local checkouts were inspected alongside the listed OpenRune and Project
Gielinor repository trees, which contained no reusable implementations of these events.
Void is RS3 and LostCity is historical RuneScape: current OSRS behaviour wins.
[Sandwich lady](https://oldschool.runescape.wiki/w/Sandwich_lady) supplies the seven
OSRS choices, 1/64 stale baguette chance when baguette is offered, and harmless
wrong choices; RS3 gift bags/doughnuts and historical attacks/teleports are omitted.
[Genie](https://oldschool.runescape.wiki/w/Genie) supplies the lamp and dismissal;
[Drunken Dwarf transcript](https://oldschool.runescape.wiki/w/Transcript:Drunken_Dwarf)
supports other players seeing/talking to the NPC with owner-only rewards.
[Scaled XP](https://oldschool.runescape.wiki/w/Module:ScaledExperience/doc) confirms
ten times skill level. Sandwich foods follow the Wiki food pages, including
[baguette](https://oldschool.runescape.wiki/w/Baguette) and
[meat pie](https://oldschool.runescape.wiki/w/Meat_pie).

Cache 237 verified NPCs 326/5510/322 and their Talk-to/Dismiss actions, lamp 2528 Rub,
and reward Eat actions. `yarn dump:widget 297` and `yarn dump:cs2 1358`/`2267`
confirm sandwich tray root/title2/selectors6–12 and model angle initialization.

The original OSRS scheduling formula is unpublished. This first batch uses Void's
60–120 minute cooldown, three-minute lifetime and 18-second reminders. Busy/combat,
bots, instances, duels and Tutorial Island are excluded. Tutorial's bounds are copied
from the existing TutorialIsland plugin. Managed areas are conservatively excluded
except ordinary PvP ground; full activity-specific eligibility is deferred. No events
spawn while the `random-events:enabled` config is false; existing events still expire.

Rewards require inventory capacity and retain the event on failure. Stackable gifts
can join an existing stack; Jekyll's exchange frees its exact herb slot. State clears
before adding items, callbacks check server ownership and the lamp's exact slot/item,
and logout/disconnect/death invalidate pending rewards. Expiry/distance/instance
changes remove followers. All 24 cache skills are selectable via existing prompts;
blocked/maxed XP retains the lamp. No native reward interface 240 reconstruction,
dependencies or core feature hooks are needed.

Owners can test with `::randevt [id]`, bypassing the natural cooldown and scheduler
enable flag. Omit the index for a random event. The zero-based indices are:
0 Genie, 1 Sandwich Lady, 2 Drunken Dwarf, 3 Rick Turpentine, 4 Certers,
5 Mysterious Old Man, 6 Dr Jekyll, 7 Strange Plant. F2P only exposes indices 0–5.
The command replaces your previous event using its normal cleanup, and retains
eligibility, traversable spawning, ownership, expiry and reward checks. Its
description is registered for command search.

Verify after build: `node --test tests/random-events.test.cjs tests/food-effects.test.cjs`.
These tests exercise real plugin registration with controlled lifecycle/collision/
inventory adapters, plus the real Inventory reward path. From `client/`, run
`yarn tsx tests/widget-loader.test.ts` to check the plugin's actual selection flags
against the current cache decoder/menu builder. These do not replace a live-client
visual check of tray rendering.

<a id="doc-tsps-upstream-server-plugins-npcs-random-events-sources--rick-turpentine-dr-jekyll-and-certers"></a>
#### Rick Turpentine, Dr Jekyll and Certers

[Rick Turpentine](https://oldschool.runescape.wiki/w/Rick_Turpentine),
[Certer](https://oldschool.runescape.wiki/w/Certer) and
[Dr Jekyll](https://oldschool.runescape.wiki/w/Dr_Jekyll) supply current OSRS behaviour.
Direct Wiki reads were blocked; the current Wiki text was inspected through
[Rick's mirror](https://osrsindex.com/wiki/rick-turpentine?site=osrs_wiki),
[Certer's mirror](https://osrsindex.com/wiki/certer?site=osrs_wiki) and
[Jekyll's mirror](https://osrsindex.com/wiki/dr-jekyll?site=osrs_wiki).
The local NPC dialogue dataset independently confirms Jekyll's herb/potion pairs.
No reusable Rick/Jekyll implementation was found in the listed local reference
sources, so their handlers adapt the established owner/gift lifecycle.

Rick and Certers share the Wiki's estimated 150-entry weighted reward table:
coins, kebab, spinach roll, four uncut gems, cosmic talisman and key halves.
Key halves become 640 coins in F2P. Rewards are rolled once, retained across
inventory failures, and cannot be rerolled by reopening dialogue/interface.
[Spinach roll](https://oldschool.runescape.wiki/w/Spinach_roll) heals two;
RuneLite's local `ItemStatChanges.java` confirms this food value.

Jekyll is a separate `members: true` plugin. It contributes its spawn definition
through the generic `random-events:definitions` custom event during startup;
F2P excludes Jekyll; the final event counts are listed below. The fourteen clean,
unnoted herb exchanges follow the Wiki, including torstol → stamina(4), and
the no-herb/refusal reward is strength(2). Huasca is not accepted. Each talk
rechecks inventory so banking can change the requested herb, while callbacks
validate the active event, current prompt and exact captured herb slot/item.
There is no obsolete Mr Hyde punishment.

Cache 237 verifies NPCs 375/307/5436–5438 with Talk-to/Dismiss and rewards with
their normal Eat/Drink actions. `yarn dump:widget 184` verifies Certer model7,
texts1–3 and selectors8–10 (option1). Cache quiz-presentation items 6189/6191–6198
have the expected model/angles/zoom. RuneLite's generated `ItemID.java` gives
their food/weapon/armour/tool/jewellery categories, and the historical
[presentation-item list](https://runescape.wiki/w/Hex_edit_detected) identifies
fish, sword, battleaxe, helmet, shield, shears, spade, ring and necklace.
Both fish models have the same answer; one is used to keep nine distinct choices.
The question stays fixed when reopened; incorrect answers end the event without
reward, and expiry/dismissal/lifecycle cleanup close an owned open interface.
Both Certer and Sandwich selectors have cache flags2 and use option1;
opening either interface enables that option with flags2 on the exact selectors.
The dump script now reads cache 237's four-byte model ID, matching the client;
its old two-byte decoder shifted the actions/flags and incorrectly suggested option2.
Other packet options are rejected by the handlers.
The Certer brothers share one event weight.

Tests cover all fourteen herb exchanges, F2P exclusion/key replacement, correct
and incorrect answers, packet option/owner/interface checks, full inventory,
stacked coins, stale prompts, banking changes and duplicate reward prevention.
Native Certer/tray appearance still needs a live-client visual check.

<a id="doc-tsps-upstream-server-plugins-npcs-random-events-sources--mysterious-old-man-and-strange-plant"></a>
#### Mysterious Old Man and Strange Plant

The direct-gift [Mysterious Old Man](https://oldschool.runescape.wiki/w/Mysterious_Old_Man)
event now shares the owned gift/retry/dismissal flow. The current
[random-events Wiki mirror](https://osrsindex.com/wiki/random-events?site=osrs_wiki)
confirms direct gifts remain available on members worlds since November 2023;
Rick's Wiki reward references also confirm the shared table/key substitutions.
This does not implement his separate Maze or Mime invitations.
RuneLite's generated `NpcID.java` distinguishes `MACRO_MYSTERIOUS_OLD_MAN` 6750
from underwater 6751, maze 6752, mime 6753 and the unrelated static 6742 NPC.
Cache 237 confirms 6750 has Talk-to/Dismiss.

[Strange Plant](https://oldschool.runescape.wiki/w/Strange_plant), read through its
[Wiki mirror](https://osrsindex.com/wiki/strange-plant?site=osrs_wiki), supplies
members-only spawning, growth before picking, one fruit, optional dismissal and
the private three-hour ground reward when inventory is full. The plant stays
at its spawn square and never follows, speaks or attacks. LostCity's 45-tick
growth timer is the timing reference (27 seconds); the current Wiki does not
specify exact maturity timing. Cache 237 confirms NPC323 Pick/Dismiss and
idle349; `yarn dump:seq 348` confirms the growth animation, whose frame lengths
sum to 25.6 seconds. The shared lifecycle removes the plant on reward, dismissal,
expiry, distance or player cleanup; the historical post-pick animation delay is
not reproduced.

[Strange Fruit](https://oldschool.runescape.wiki/w/Strange_fruit), read through its
[Wiki mirror](https://osrsindex.com/wiki/strange-fruit?site=osrs_wiki), supplies
item464 Eat, +30 run energy, poison/venom cure, about 18 seconds of protection
against standard poison/venom reapplication, and no Hitpoints restoration.
It uses canonical Food data and the same run-energy/cure helpers as Potions;
the standard immunity timer covers reapplication but does not stop custom
poison-like damage. Existing longer protection is retained. Zero-heal food
preserves already-overhealed HP. The dropped fruit uses the existing floor-item
clock with a negative initial tick, expires after 18,000 server ticks, and never
becomes public; tests exercise its real `ItemOnGround.process()` lifecycle.

The scheduler now selects among eight events on members worlds and six on F2P.
Tests cover growth boundaries, owner checks, exactly-once gifts/fruit, full
inventory ground visibility/lifetime, dismissal and lifecycle cleanup, F2P
exclusion, and actual fruit consumption with cooldown, slot and effect checks.
Live-client appearance remains unverified. Quiz Master and his mystery-box loot
table, Maze and Mime remain separate future content batches.
<!-- end-source-document: tsps-upstream/server/plugins/npcs/random-events/SOURCES.md -->

---

<a id="doc-tsps-upstream-server-plugins-skills-agility-readme"></a>
## tsps-upstream/server/plugins/skills/agility/README.md

<!-- source-document: tsps-upstream/server/plugins/skills/agility/README.md -->
<a id="doc-tsps-upstream-server-plugins-skills-agility-readme--agility"></a>
### Agility

`Agility.plugin.js` plays the courses (`courses/`, code) and the shortcuts
(`data/definitions/agility-shortcuts.json`, data) through `ObstacleRunner.js`, a step list run one
game tick at a time.

<a id="doc-tsps-upstream-server-plugins-skills-agility-readme--shortcuts"></a>
#### Shortcuts

Each entry in `agility-shortcuts.json`'s `shortcuts`:

| Field | |
| --- | --- |
| `name` | The Wiki's name and the place: `"Stepping stones (Lumbridge Swamp Caves)"` |
| `object` | Cache loc id, or a list of ids (`yarn dump:loc <id\|name>` lists where they are placed) |
| `at` | Optional: the loc's tile, or a list of tiles, when one id is several shortcuts |
| `level`, `xp` | Agility level and experience (Wiki) |
| `start`, `end` | Optional messages at the start and on success |
| `render` | Optional walk animation for the whole crossing (`"BALANCE_WALK"`) |
| `route` | Optional tile the player walks to before starting |
| `requires` | Optional: alternatives, any one of which lets the player use it (below). Without it, `level` is the Agility needed |
| `fail` | Optional: the chance (`low`/`high`, the Wiki's success chart), `xp` and `steps` of a failure, or `cross: true` and `hit` when a failed attempt still gets across |
| `unverified`, `note` | What has no capture behind it, or where a value comes from (`rsprox captures <ids>`: see `docs/agility-shortcuts.md`) |

and one way to play it:

| Kind | |
| --- | --- |
| `steps` | A step list (below) |
| `between` | A two-way crossing: `ends` (two tiles), optional `via` (tiles in between, listed from the first end) and `cross`, the steps from one end to the other, or `{ "forward": [...], "back": [...] }` when the two directions differ |
| `stile` | A two-tile stile: `axis` (`"x"`/`"y"`), `before`, `after`, `anim` |
| `script` | A named script from `shortcuts/<Region>.js` or `shortcuts/Common.js`, given the entry's `params`, for what a template can't say (which way the player faces, which rock they clicked). Its `route`, `precondition` and `steps` replace the data's |
| `refuse` | A message: the loc can't be used from there |

<a id="doc-tsps-upstream-server-plugins-skills-agility-readme--requirements"></a>
##### Requirements

`requires` is a list; the first alternative the player meets is used, and its `steps` (and
`start`, `end`) replace the entry's. On a `between` entry an alternative can give its own
`cross` instead, played between the same two ends (a barehanded climb beside a grapple).
Otherwise the player gets the first alternative's refusal.

| Key | |
| --- | --- |
| `skills` | `{ "agility": 11, "strength": 37, "ranged": 19 }`, current (boosted) levels |
| `equipped` | `[{ "slot": "weapon", "name": "crossbow", "message": ... }, { "slot": "ammunition", "ids": [9419], "message": ... }]` |
| `items` | `[{ "ids": [...], "message": ... }]`, carried |
| `quest` | `{ "key": "regicide", "stage": "complete" \| "started", "message": ... }`, or a list; asked through `quest:is-complete` / `quest:is-started`. A quest no plugin answers for is no bar |
| `diary` | `{ "key": "falador", "tier": "medium", "enforce": false, "message": ... }`; checked through `diary:is-complete` only once `enforce` is true, when that tier's tasks can all be done here |

<a id="doc-tsps-upstream-server-plugins-skills-agility-readme--failing"></a>
##### Failing

With `low` and `high`, success is the OSRS skilling roll the Wiki's success charts plot:
`(1 + floor(low × (99 − L) / 98 + high × (L − 1) / 98 + 0.5)) / 256` at Agility level `L`.

<a id="doc-tsps-upstream-server-plugins-skills-agility-readme--steps"></a>
##### Steps

The runner's steps (see the top of `ObstacleRunner.js`): `anim`, `render`, `walk`, `move`, `tele`,
`wait`, `face`, `faceDir`, `hit`, `msg`, `sound`, `gfx`, `objAnim`, `varbit`. In the data:

- **Animations by name**, from `constants.js` (`Anim`) and `shortcuts/builders.js` (`ShortcutAnim`):
  `{ "anim": "CLIMB_ROCKS" }`; `-1` resets.
- **Builders as macros**: `{ "use": "hops", "args": ["object", "to"] }`. `climbOver`, `jump`,
  `hops`, `pipe`, `tunnel`, `crevice`, `crawlDown`, `crawlUp`, `ropeSwing`, `hurdle`, `climb`.
- **Tokens**: `"object"` (the clicked loc's tile), `"to"` and `"from"` (a crossing's ends),
  `"via0"`, `"via1"` ... and `"...via"` (its `via` tiles in travel order), single coordinates
  (`"pos.x"`, `"object.y"`).
- **Relative tiles**: `{ "object": [0, 1] }` from the loc, `{ "pos": [0, 4, 0] }` from the player;
  with a third number the tile carries a plane.
<!-- end-source-document: tsps-upstream/server/plugins/skills/agility/README.md -->

---

<a id="doc-tsps-upstream-server-plugins-skills-farming"></a>
## tsps-upstream/server/plugins/skills/Farming.md

<!-- source-document: tsps-upstream/server/plugins/skills/Farming.md -->
<a id="doc-tsps-upstream-server-plugins-skills-farming--farming-plugin"></a>
### Farming plugin

The loader entry is `Farming.plugin.js`; the parts are in `farming/`, one file each:
`Patches` (every hook, patch actions), `Data` (crop and patch tables), `Model` (growth),
`Services`, `Spells`, `Tithe`, `Guild` and `Hespori`, all `*.Farming.js`. They read
`api.core` through `Core.Farming.js`, which the plugin fills before loading them.

Implemented: player-owned patches, saved offline growth, raking, planting,
watering, disease and cures, harvesting, regrowth, compost bins and bottomless
buckets, saplings, gardener payments, leprechaun storage/noting, seed vault,
seed boxes/herb sacks, contracts and rewards, anima plants, farming spells,
amulets, barbarian Farming, Tithe Farm, and a private Hespori encounter/retrieval
service. The generated cache data identifies 110 grouped patches and 40 Tithe
plots; gameplay tables contain 82 crops. XP follows the server's configured rate.

<a id="doc-tsps-upstream-server-plugins-skills-farming--comparison-with-tsps-pr-141"></a>
#### Comparison with TSPS PR #141

Compared against [PR #141](https://github.com/RSPSApp/tsps/pull/141) at
`718cb8b24202f221a335dd89148e11c245a4fda7`:

- Its 58 crops are already covered. Its 48 patch locations are now covered too:
  the exporter previously missed Port Phasmatys's flower patch and compost bin
  because their regional models use different object IDs.
- Patch changes now send private object removal/re-add packets after the varbit,
  rebuilding the client's geometry for every map tile of the patch. Unchanged
  patches stay quiet; first visits and reused transmit varbits also refresh.
- Transformed click IDs already resolve through `MapObjects.getPrivateArea`,
  shared by object clicks, item use, and spells. No duplicate tile-only router
  was added.
- Cure/prune now follows the local cache's action and respects the supplied
  item. Wrong tools do not consume a carried cure. Lunar Cure Plant still
  bypasses physical tools.
- Watering cans support water pumps and house pumps/gold sinks, reject damaged
  Trouble Brewing pumps, and report empty cans when watering patches/seedlings.
  Herb picking and plant-pot filling use the corresponding farming animations.
- Existing ultracompost, gardener payments, leprechauns, sacks/baskets,
  flower/scarecrow protection, amulets, newer crops, Tithe, and Hespori remain
  available. The reference's simplified seed counts, harvest lives, compost-bin
  mixing, and growth rules were not substituted for our existing mechanics.

<a id="doc-tsps-upstream-server-plugins-skills-farming--fidelity-limits"></a>
#### Fidelity limits

This is **not a verified 1:1 implementation**. In particular:

- Unpublished disease/watering probabilities, some yield endpoints, Kronos
  skip probability, barbarian training failure probability, and Hespori's
  special/poison scheduling use estimates marked `ponytail:` in the code.
- Tree chopping uses the existing Woodcutting plugin's rates/depletion model.
  Redwood branch depletion does not yet reproduce OSRS's independent timers.
- Geomancy, storage, contracts, and Tithe rewards use existing dialogue menus;
  the original dedicated interfaces and Tithe overlay are not reproduced.
- Spirit-tree travel currently links player-grown trees. The ordinary network,
  quest-specific crops/access restrictions, achievement completion, and the
  wider quest/diary progression systems are not implemented by this plugin.
- The complete Zamorak equipment list for Bologa and the precise nightshade
  glove restrictions still need parity work.
- Region 25287 could not be decoded by the cache export. Its contents are not
  included in the patch coverage claim. No in-game or smoke tests were run.

<a id="doc-tsps-upstream-server-plugins-skills-farming--verification"></a>
#### Verification

From `server/`:

```powershell
npx.cmd tsc --noEmit
node -r ts-node/register/transpile-only plugins/skills/farming/Model.Farming.test.js
```

The second command checks the state machine and mocked hooks without server startup
or sockets. It covers offline/save equivalence,
disease/death, mature immunity, private stump regrowth, herb formulas, critical
cache states, Tithe growth/scoring, null bank tabs, growth cadence, seedling deadlines
and nearby patch selection across region boundaries. Cache-only audits also checked crop item
resolution and growing, diseased, dead, and mature visual values.

To regenerate `data/definitions/farming-data.json` (one crop, patch type, patch or loc per line):

```powershell
node -r ts-node/register/transpile-only scripts/generate-farming-data.ts ../..\runelite
```

Sources: [Farming](https://oldschool.runescape.wiki/w/Farming),
[Disease](https://oldschool.runescape.wiki/w/Disease_(Farming)),
[herb calculator](https://oldschool.runescape.wiki/w/Calculator:Farming/Herbs),
[Tithe Farm](https://oldschool.runescape.wiki/w/Tithe_Farm),
[Hespori](https://oldschool.runescape.wiki/w/Hespori), and the linked crop/tool
pages (OSRS Index's attributed wiki copies were used where direct access failed).
RuneLite supplies timing/varbit interpretation; the local cache supplies object
transforms and map locations. The BSD-2-Clause attribution for the RuneLite-derived
data is kept in the JSON's `source` field.
<!-- end-source-document: tsps-upstream/server/plugins/skills/Farming.md -->

---

<a id="doc-tsps-upstream-server-plugins-skills-hunter-readme"></a>
## tsps-upstream/server/plugins/skills/hunter/README.md

<!-- source-document: tsps-upstream/server/plugins/skills/hunter/README.md -->
<a id="doc-tsps-upstream-server-plugins-skills-hunter-readme--hunter"></a>
### Hunter

`Hunter.plugin.js` attaches hooks only; each activity is a module in this folder and reaches the
server through `api.core`. One shared tick task (`Runtime.Hunter.js`) drives cancellable actions, trap
lifetimes, creature respawns and session timers. Attribute state (birdhouses, crab traps, drift
nets, rumours, pursuit charges) is persisted and restored on login.

<a id="doc-tsps-upstream-server-plugins-skills-hunter-readme--implemented"></a>
#### Implemented

- **Trap families** (`Traps.Hunter.js`, `Rabbits.Hunter.js`, `Broavs.Hunter.js`): bird snares, box traps, deadfalls,
  net traps (swamp/orange/red/black/tecu salamanders), magic boxes/imp banking, monkey deadfall,
  rabbit snares flushed by ferret, and pitfalls with teasing (`Pitfalls.Hunter.js`).
- **Bait and scent**: tars, spicy tomato/minced meat, jerboa tail and kebbit baits (3% bonus for
  the matching creature), smoke from a lit/bruma torch or auto-applied anti-odour salt (2%).
  Ownership, per-kind trap limits (extra in the Wilderness), expiry/collapse and preflighted
  inventory transactions are enforced centrally.
- **Tracking** (`Tracking.Hunter.js`): five pursuit species, noose wand catches, ring of pursuit with
  10 persisted charges, trail varbits sent to the client.
- **Catching** (`Catching.Hunter.js`, `LuckyLoot.Hunter.js`): falconry, four butterflies, sunlight/moonlight
  moths with barehand and net curves, twelve impling species with rebuilt Wiki loot tables,
  released-butterfly boosts, and Lucky jars resolved through `hunter:lucky-loot` or the local
  reward-casket tables.
- **Birdhouses** (`Birdhouses.Hunter.js`): nine tiers, crafting, seeding (hop/herb/allotment/flower/
  bush), 50-minute wall-clock growth, nest/ring/egg/clue-nest/scroll-box rewards, reset.
- **Aerial fishing** (`Aerial.Hunter.js`): cormorant hire, king worms/fish offcuts/whole-fish feeding,
  Molch pearls, golden tench, spirit flakes, Rada's blessing, fish cutting and clue bottles.
- **Herbiboar** (`Herbiboar.Hunter.js`): five starts, cache-derived trail graph, fossil/numulite
  inspections, tunnel flush, 1-4 herbs by Herblore level with magic secateurs, Herbi pet.
- **Drift net fishing** (`DriftNets.Hunter.js`): Ceto access (daily/permanent numulite), two anchors,
  Annette's 2,000-net storage, active chase and passive capture, fish/fossil/clue rewards and
  bank-for-5-numulite, 44 Hunter/47 Fishing level-gated.
- **Crab traps** (`Crabs.Hunter.js`): red/blue/rainbow traps built with Construction, baiting,
  auto-rebait, crab meat/paste cutting.
- **Dungeon** (`Dungeon.Hunter.js`): seven Chambers of Xeric bats and the Neypotzli moss-lizard rope trap.
- **Rumours** (`Rumours.Hunter.js`): six guild hunters, eligibility and consecutive-rumour settings,
  rare-part pity/outfit rates, four loot sacks, quetzal-whistle blueprints and guild armour.
- **Broavs** (`Broavs.Hunter.js`): While Guthix Sleeps pit trapping, wild broav capture, hunting-expert
  training, release and pick-up.
- **Pets**: baby chinchompas, Herbi and Quetzin roll from `hunter:success`; spawns for the
  Varlamore creatures/moths, guild NPCs and tecu salamanders live in `npc-spawns.json`.

<a id="doc-tsps-upstream-server-plugins-skills-hunter-readme--approximations-and-known-limits"></a>
#### Approximations and known limits

Catch curves use the Wiki's published success-chart low/high values with the 256-roll
interpolation in `Context.probability`. Where the Wiki publishes no numbers, the code carries a
`ponytail:` comment naming the estimate:

- Tatty-fur quality, Herbiboar's 1/100 tracking failure, birdhouse clue-nest pre-rolls
  (1-30/1500, marked approximate on the Wiki), drift-net scare odds/passive timing/fossil
  amounts, aerial pearl and clue rates, and rumour rare-part rates are estimates.
- Drift-net shoals are scared into swimming to the nearest non-full net and caught on arrival;
  they cannot get stuck on rocks, each other or the player.
- Pitfall prey follows the player and attacks on contact; leap graphics are validated against
  rev237 (`dump:spotanim`). Sunlight/moonlight antelopes use the Wiki's flat 255/255 chart.
- Lucky jars only give one clue-table roll; another plugin may answer `hunter:lucky-loot`.
- Wyrmscraig goats, Letvek and Stymphalak have no usable rev237 assets and are excluded. Aerial
  fishing uses king worms/fish offcuts because fish chunks and javelin heads are absent.
- Box traps require Eagles' Peak; quest plugins answer `quest:is-complete` or the fallback reads
  `quest.<key>.stage >= 2`. No live in-game playthrough has been done yet.

<a id="doc-tsps-upstream-server-plugins-skills-hunter-readme--sources"></a>
#### Sources

Requirements, drop tables and success charts come from the [OSRS Wiki](https://oldschool.runescape.wiki/w/Hunter)
and were checked against the rev237 cache with the `dump:*` scripts. Tracking trail
coordinates/varbits adapt [Void](https://github.com/GregHib/void)'s data (BSD-3, see
`Tracking.LICENSE`); Herbiboar search coordinates adapt RuneLite's herbiboar plugin (BSD-2, see
`Herbiboar.LICENSE`); leap/rabbit spotanims use RuneLite `SpotanimID` ids. Earlier trap work used
Near-Reality as a behaviour sketch; no code from it is used (it has no license).

Check: `yarn build && node --test tests/skill-max-level.test.cjs` from `server/`.
<!-- end-source-document: tsps-upstream/server/plugins/skills/hunter/README.md -->

---

<a id="doc-tsps-upstream-server-plugins-world-readme"></a>
## tsps-upstream/server/plugins/world/README.md

<!-- source-document: tsps-upstream/server/plugins/world/README.md -->
<a id="doc-tsps-upstream-server-plugins-world-readme--procedural-world-plugins"></a>
### Procedural World Plugins

This folder contains the server-side procedural region tooling used by the web client.

<a id="doc-tsps-upstream-server-plugins-world-readme--scope"></a>
#### Scope

The current system supports:
- Generating and streaming procedural terrain/buildings per region.
- Dumping real cache houses to JSON examples.
- Rebuilding exact dumped houses.
- Generating style/type-driven houses (for example `VARROCK SHOP`).
- Generating a simple street scene with houses on both sides.
- Learning preset/style hints from nearby cache regions.

This is plugin-based and developer-only (commands require developer/owner rights).

<a id="doc-tsps-upstream-server-plugins-world-readme--main-files"></a>
#### Main Files

- `ProceduralRegionStream.plugin.js`
  - Command entrypoints.
  - Procedural payload creation (`heights`, `overlays`, `underlays`, `flags`).
  - Chunked streaming to client over opcode `12`.
- `BuildingUtil.js`
  - Core procedural building/house generation.
  - House replay helpers and style/type resolution.
  - Interior, roof, windows, doors, ladders.
- `TownUtil.js`
  - Street-level generation (houses on both sides of a road gap).
  - Street overlays and doorway connectors.
- `RegionBuildingAnalysisUtil.js`
  - House boundary detection.
  - `::dumphouse`, `::checkhouse`, structure scan + preset learning.
- `ObjectType.js`
  - Shared object type enum values.
- `LadderUtil.js`
  - Ladder chain parsing/placement logic for multi-floor houses.
- `ProceduralDataPaths.js`
  - Shared data output paths.
- `ReplaceMapRegions.plugin.js`
  - Startup hook for runtime region replacement via plugin API.
  - Startup hook auto-loads all numeric `*.pack` files from `plugins/world/data` and replaces those regions.

<a id="doc-tsps-upstream-server-plugins-world-readme--runtime-region-replacement-hook"></a>
#### Runtime Region Replacement Hook

Use the plugin API hook:

```js
api.replaceMapRegion(regionId, source);
```

Supported `source` formats:
- `"/absolute/or/relative/path/to/12343.pack"`
- `["/path/to/terrain.dat|.gz", "/path/to/object.dat|.gz"]`

Behavior:
- Replaces server clipping/runtime map decode for that region.
- Streams the replacement through the native binary client protocol so connected players see the same map edits.
- Re-streams active replacements on player login.

<a id="doc-tsps-upstream-server-plugins-world-readme--data-files"></a>
#### Data Files

All procedural data is stored in this plugin folder:

- `plugins/world/data/house-examples/*.json`
  - House dumps used by `::buildhouse` and `::genhouse`.
- `plugins/world/data/proc-building-presets.json`
  - Learned generation presets from `::procreglearn`.
- `plugins/world/data/analysis-reports/*.json`
  - Region scans from `::procregscan`.
- `plugins/world/data/terrain-biomes/*.json`
  - Terrain biome samples merged by `::dumpterrain <biome>`.

<a id="doc-tsps-upstream-server-plugins-world-readme--command-reference"></a>
#### Command Reference

All commands are in `ProceduralRegionStream.plugin.js`.

```text
::procregion <regionX> <regionY> [seed]
::procregionhere [seed]
::cleargen

::procregscan [radius]
::procreglearn [radius]
::dumpterrain <biome>
::genterrain <biome> [seed]

::dumphouse <tag> [type]
::checkhouse
::buildhouse <style> [index]
::genhouse <style> [type] [seed]

::genstreet [style] [type] [seed]
```

<a id="doc-tsps-upstream-server-plugins-world-readme--important-notes"></a>
##### Important Notes

- `::cleargen` clears all streamed procedural overrides on the client for that player and forces cache map behavior again.
- `::dumphouse` writes examples into `plugins/world/data/house-examples/<tag>.json`.
- `::dumpterrain` writes biome terrain samples into `plugins/world/data/terrain-biomes/<biome>.json`.
- `::genterrain` generates a full region from a dumped biome profile.
- `::buildhouse` replays a dumped house example exactly (by index or random).
- `::genhouse` generates a similar house using dump-derived profile data when available.
- `::genstreet` currently defaults to:
  - style: `varrock`
  - type: `SHOP`
  - center street gap width: `4`

<a id="doc-tsps-upstream-server-plugins-world-readme--payload-pipeline"></a>
#### Payload Pipeline

1. A command builds placements/floor patches/flags.
2. `generateRegionPayload(...)` creates tile and object payload fields:
   - `heightsB64`
   - `overlaysB64`
   - `underlaysB64`
   - `flagsB64`
   - `buildingPlacements`
3. Payload is JSON-chunked and sent via opcode `12`:
   - `META`
   - `CHUNK`
   - `END`
4. Client reconstructs and applies procedural region override.

<a id="doc-tsps-upstream-server-plugins-world-readme--typical-workflows"></a>
#### Typical Workflows

<a id="doc-tsps-upstream-server-plugins-world-readme--dump-and-replay-real-houses"></a>
##### Dump and Replay Real Houses

1. Stand inside a target house.
2. `::checkhouse` to verify bounds.
3. `::dumphouse varrock SHOP` (or another tag/type).
4. `::buildhouse varrock` to replay random example.
5. `::buildhouse varrock 0` to replay a specific example.

<a id="doc-tsps-upstream-server-plugins-world-readme--generate-similar-houses"></a>
##### Generate Similar Houses

1. Collect several examples with `::dumphouse <tag> <type>`.
2. Generate using `::genhouse <tag> <type>`.
3. Iterate by adding more examples for better style/type coverage.

<a id="doc-tsps-upstream-server-plugins-world-readme--generate-a-street"></a>
##### Generate a Street

1. `::genstreet varrock SHOP`
2. Optional deterministic seed: `::genstreet varrock SHOP 12345`

Current street behavior:
- Houses on both sides of a 4-tile gap.
- Doors face inward toward the street.
- Middle 2 tiles get a road/path overlay.
- Doorway connectors are drawn from each door to the center path.
- Side bands are flattened for consistent house ground levels.

<a id="doc-tsps-upstream-server-plugins-world-readme--constraints-and-current-behavior"></a>
#### Constraints and Current Behavior

- Generation is region-local (`64x64`, up to 4 planes).
- Commands are developer-only.
- Roof behavior is sensitive to style roof IDs and object-type pairing.
- House boundary detection is local-first and tuned for practical dumping.
- Dump profiles are style/type specific; `type` helps avoid mixing incompatible layouts.

<a id="doc-tsps-upstream-server-plugins-world-readme--next-steps"></a>
#### Next Steps

Recommended next tasks:

1. Add a street-layout preset system in `TownUtil` (T-junctions, crossroads, market squares).
2. Add deterministic road overlay palettes by theme (varrock/falador/etc).
3. Add placement validation pass for roof continuity (diagnostic mode before stream).
4. Add a `::gentown <style> <type> [seed]` command that composes multiple streets.
5. Add object-role inference from dumps without hand-tuned assumptions.
6. Add regression snapshot tests for:
   - roof continuity
   - doorway orientation
   - street connectors
   - flattening consistency
7. Add a compact debug command to print generated house/street summary stats.

<a id="doc-tsps-upstream-server-plugins-world-readme--quick-debug-checklist"></a>
#### Quick Debug Checklist

- If procedural map does not show: verify client receives procedural packets and run `::procregionhere`.
- If cache map should return: run `::cleargen`.
- If house dump fails: verify position with `::checkhouse`.
- If generation quality is poor: add more `::dumphouse <tag> <type>` examples and rerun `::genhouse`.

`codex resume 019ca379-af07-7ea0-a53b-e4694197cf43`
<!-- end-source-document: tsps-upstream/server/plugins/world/README.md -->

---

<a id="doc-tsps-upstream-server-readme"></a>
## tsps-upstream/server/README.md

<!-- source-document: tsps-upstream/server/README.md -->
<a id="doc-tsps-upstream-server-readme--elvarg-web-server"></a>
### Elvarg Web Server
 
 This is a TypeScript port of the the Java Server https://github.com/RSPSApp/elvarg-rsps. The goal of this server is to have a modular/plugin based RSPS built in typescript with some accurate OSRS content (Combat, minigames etc) and highly intelligent player bots. The server is designed to be extensible via plugins. Combat should stay core, but any new content e.g. special attacks and effects should bolt on as plugins.
 
<a id="doc-tsps-upstream-server-readme--getting-started"></a>
#### Getting started
 
 Firstly, run
 
 ```yarn install```
 
Then, run
 
```yarn dev```

<a id="doc-tsps-upstream-server-readme--player-persistence"></a>
#### Player persistence

Player saves are stored in `data/saves/players.sqlite`. On startup, JSON character
files from `data/saves/characters` are imported by default without modifying the
source files. Set `PLAYER_SAVE_IMPORT_LEGACY_JSON=0` (also accepts `false`, `off`,
or `no`) to skip that import; restart the server after changing the setting.

`PLAYER_SAVE_DATABASE_PATH` and `LEGACY_PLAYER_SAVE_DIRECTORY` optionally override
the database and legacy-save locations.

<a id="doc-tsps-upstream-server-readme--edit-mode-api"></a>
#### Edit mode API

In development, `plugins/world/EditModeApi.plugin.js` serves read-only world data
at `/api/world` on the game server's HTTP/WebSocket port. The local map editor
uses its game connection address to fetch this data. Production does not register
this endpoint. `/api/world/shops` and `/api/world/npc-interactions` provide the
canonical documents for local editing; export downloads the edited JSON files.
Browser-host editors continue using host messaging.

<a id="doc-tsps-upstream-server-readme--definition-plugins"></a>
#### Definition plugins

Plugins contribute definition records through
`api.registerDefinitionSource(type, { name, priority, load })`. The matching
core `DefinitionLoader` validates and merges those sources into its canonical
definition collection; API routes read that collection rather than invoking
plugin loaders or reading files themselves.

Plugins can register basic NPC actions declaratively without installing a
general NPC click hook:

```js
api.registerNpcInteraction([506, 512], {
  firstClick: { shopId: 0 },
  secondClick: { teleportLocation: { x: 3200, y: 3200, z: 0 } },
});
```

Use `onNpcInteraction` for stateful or otherwise scripted interactions.

<a id="doc-tsps-upstream-server-readme--custom-items-without-cache-packing"></a>
#### Custom items without cache packing

Add records to `data/definitions/custom-items.json`. Each record has a stable
`id` (50000–65022), a cache `baseItemId`, client appearance/menu overrides in
`objType`, and optional server gameplay overrides in `itemDef`. The base item
supplies equipment type, bonuses, requirements and animations. Use existing
cache model IDs for recolours, or list external models in `models`:

```json
"models": {
  "1000000": "dragonic-katana/drop.dat",
  "1000001": "dragonic-katana/equip.dat"
}
```

Paths are relative to `data/models`; external model IDs start at 1000000.
Set `objType.model` for inventory/ground rendering and `maleModel`/`femaleModel`
for equipment. Clear inherited secondary models and recolours when replacing
the entire model. Inventory framing (`zoom2d`, angles and offsets) and wearable
offsets remain configurable for calibration.

Restart the server and reconnect after editing. Definitions and compressed
model bytes are delivered before the initial appearance/inventory updates;
the client and render workers use them ahead of cache assets. Each compressed
model packet and the definition packet must fit the transport's 64 KiB frame.
New textures and animations are not streamed by this item mechanism.

The bundled **Dragonic katana** is item `50000`, with dragon scimitar gameplay
stats. An authorised administrator can test it with `::item 50000 1`, then
wield it or drop/pick it up. Model attribution is in
`data/models/dragonic-katana/README.md`.

<a id="doc-tsps-upstream-server-readme--logging"></a>
#### Logging

Server logging is centralized and all `console.log/info/warn/error/debug` calls go through one logger.

Log filename convention:

`kebab-case semantic-name.log`

Logs are written to:

`./logs/server.log`
`./logs/packets.log`
`./logs/movement.log`
`./logs/player-bots.log`
`./logs/plugin-performance.log`
`./logs/player-update-bits.log`

<a id="doc-tsps-upstream-server-readme--default-behavior"></a>
##### Default behavior

1. Enabled levels: `info,warn,error`
2. Disabled type: `plugin` (plugin chatter is off by default)

<a id="doc-tsps-upstream-server-readme--configure-at-startup-env-vars"></a>
##### Configure at startup (env vars)

1. `LOG_LEVELS`  
Example: `LOG_LEVELS=warn,error`
2. `LOG_ENABLED_TYPES`  
CSV allowlist. If set, only these types are emitted.
3. `LOG_DISABLED_TYPES`  
CSV denylist.

Type is inferred from the first bracket tag in a message:

1. `[plugin:Woodcutting] ...` -> `plugin`
2. `[packet.out] ...` -> `packet.out`
3. `[plugins] ...` -> `plugins`
4. No bracket prefix -> `general`

<a id="doc-tsps-upstream-server-readme--change-logging-at-runtime-no-restart"></a>
##### Change logging at runtime (no restart)

Developer-only in-game commands:

1. `::logstatus`
2. `::loglevels debug,info,warn,error`
3. `::logtypeon plugin,packet.out,world`
4. `::logtypeoff plugin,packet.out,world`
5. `::logtypeclear [enabled|disabled|all]`

<a id="doc-tsps-upstream-server-readme--debugging-connection-state"></a>
#### Debugging connection state

You can query live connected players from the web client by typing:

```::players```

Aliases:

```::online```
```::who```

The server will reply with the online player count and usernames.

## Disconnect cleanup behavior

The server now performs explicit cleanup when a WebSocket closes:

1. Removes the player from the add queue (if they disconnected before full world registration).
2. Queues the player for world removal.
3. Forces queued removal if the underlying transport is already closed.

This prevents stale "ghost" players from remaining visible after disconnects/refreshes.

## Plugins

Runtime plugins are loaded from:

`./plugins`

Current convention is one plugin per file.
Subdirectories are supported up to 2 levels deep under `./plugins`.

Each plugin should export:

`{ name: string, register(api) }`

Plugin API hooks and contracts are documented in:

`src/main/typescript/elvarg/plugins/PluginTypes.ts`

Hook registration/guard behavior is implemented in:

`src/main/typescript/elvarg/plugins/PluginManager.ts`
<!-- end-source-document: tsps-upstream/server/README.md -->
