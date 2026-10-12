# Original-engine NPC interaction highlight

The mobile original-engine host enables the NPC interaction portion of RuneLite
Interact Highlight. Selecting Talk-to, Attack, another NPC option, use-item, or
cast-on-NPC outlines the selected NPC's actual animated Java model. The default
yellow-to-white click flash settles to translucent red. Touch NPC interactions
suppress their red click circle; ground movement retains its yellow circle and
other interactions retain their existing feedback.

`OriginalMobileInteractHighlight` observes the injected client's original menu,
interaction and despawn events without consuming them. Walking, selecting another
world interaction, despawning, logout and ended player interactions clear the
target. `BrowserEngineCallbacks.drawScene` renders the outline in the original
software framebuffer before overheads and interfaces, at the same overlay layer
as RuneLite. The original gamepack continues to own all input and gameplay.
The mobile layout request also guards its scene-root lookup until `LOGGED_IN`,
avoiding an early-startup null scene while the game/cache server is unavailable.

`OriginalNpcOutlineRenderer` and `IntBlockBuffer` are copied from the pinned local
OpenOSRS RuneLite outline implementation, with BSD notices preserved. The browser
adaptation removes desktop dependency injection/Lombok, keeps the NPC entry point,
and writes directly to `BufferProvider` pixels rather than desktop AWT rasters.
Vertex projection buffers grow for larger models, with a 32,768-vertex bound.
The desktop plugin manager, hover highlights, object highlights and configuration
panel are not bundled by this NPC-only adaptation.

Validation: `npm run build:openosrs-engine`, `npm run test:openosrs-engine`,
`npm test`, and `npm run test:mcp:original-browser` against a running local
diagnostic. The JVM regression uses the pinned RuneLite API and real projection
and outline algorithm with a model fixture; it checks animated geometry, clipping,
color progression, NPC menu actions and interaction clearing. The tap-indicator
regression checks that replacing an NPC marker preserves ground feedback.

Authenticated NPC screenshots and sustained mobile performance still require
manual login; a successful compile or title-screen smoke does not prove those.

On 12 October 2026 the engine build and module check passed. A bridge-owned Chrome
startup probe ran at 50 cycles/frames per second without callback errors. The
login-screen smoke could not reach its target while port 43594 had no listener;
NPC appearance and sustained gameplay remain unverified in Chrome.
