# Original-engine mobile NPC tap highlight

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
