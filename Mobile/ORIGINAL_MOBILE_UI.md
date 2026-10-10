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

The server registers the cache's mobile redirect mappings and handles that
command using its existing gameframe move queue. It sets the original resizable
mode and moves the existing overlays into mobile containers. A saved mobile
frame is excluded from PC login fallback; the current browser requests it again.

Both the Java engine and Kotlin server must be rebuilt. Stop the running server
before packaging its replacement: Windows locks the active `build/direct/lib`
directory. Restart the server, reload the browser, and log in manually.

## Verification boundary

The JVM transformation fixture checks that touch capability is added only to
interface interpreters, leaving a login flag reader unchanged. It also checks
pre-login/no-root gating, once-per-session requests, reconnect and disabled mode.
The actual LIVE cache contains 135 mobile widgets and 103 mobile redirect pairs.

Authenticated mobile rendering and interaction still require screenshots and
original-client responses: tab opening/closing, inventory actions, chat, banking,
dialogue, minimap navigation, rotation/resizing and reconnect. Build success and
cache availability alone do not establish these. Existing Phase 2 gameplay and
missing-scenery limitations remain documented in
`PHASE2_GAMEPLAY_VERIFICATION.md`.
