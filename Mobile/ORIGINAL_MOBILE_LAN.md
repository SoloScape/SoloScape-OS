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
   Keyboard activation can be retried by tapping either field again.

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
only an anonymous sequential connection number, open time, counts of
client-to-server and server-to-client frames, and a fixed close reason/code.
It does not store or reveal IPs, names, passwords, packet bytes, session
tokens, or the original Java game's input fields. A close reason such as
`Upstream closed` identifies the direction of closure; it does not prove
whether the server rejected a login packet or a successfully established game
session ended. Reproduce with manual login, then inspect the newest
summary on the PC. **Restart only the development LAN gateway to enable
new Node gateway code**; do not restart or modify the Java game server.
