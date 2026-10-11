# Original-engine mobile UI

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

## Verification boundary

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
