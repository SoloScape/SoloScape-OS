# Original OpenOSRS client on a phone (trusted LAN only)

The **original revision-240 Java gamepack** compiled with TeaVM, including its
original Java software renderer, is served at `http://PC-LAN-IP:3097/`.
This is not the separate WebGL/TSPS homepage and is not intended for public hosting.

## Start locally

1. Connect the phone and the Windows development PC to the **same trusted
   private Wi-Fi/LAN**. Avoid guest Wi-Fi/client isolation, VPN or public networks.
2. Start the original SoloScape Java game server separately (`Server/run.bat`).
   It listens at `43594` on the development PC.
3. From `Mobile/`, build the pinned original engine if necessary with
   `npm run build:openosrs-engine`, then launch
   `npm run dev:original-engine:lan`. This **explicitly opts in** to exposing
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

## White screen or unreachable page

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
  the opted-in server on a trusted private network; do not expose the
  gamepack/cache externally. Mobile browser support is still experimental.

Runtime status, exceptions and original Java game-cycle counters stay available
to local development tools without a visible diagnostic control panel.
No passwords, session tokens or original RSA private keys are exposed in the
diagnostic page or health endpoint.


## Login disconnect investigation (developer-only)

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

## iPhone welcome-screen restarts (developer-only)

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

## Proof-of-work on iOS HTTP LAN

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

## Original iPhone camera zoom on login

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

## Authentic resizable game window

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

## iPhone drag sensitivity (original game camera targets)

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
