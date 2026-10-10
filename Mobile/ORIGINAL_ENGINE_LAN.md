# SoloScape original OpenOSRS client on a phone (trusted LAN)

This serves the **actual original revision-240 Java gamepack**, compiled with
TeaVM, and its original Java software renderer. The page now starts the engine
**automatically** and displays only the original game canvas. The fullscreen CSS scales its
765×503 framebuffer across the viewport; the original Java renderer remains
unchanged.

## Connect

1. Keep the **PC and phone on the same trusted Wi-Fi/LAN**. A wired PC and a
   Wi-Fi phone can work together if the router permits local-device traffic.
   Disable mobile data/VPN or guest Wi-Fi if it isolates LAN devices.
2. Start the existing Java game server using `Server/run.bat` (port 43594).
   Do **not** expose the Java TCP port to the phone; the gateway runs on the PC.
3. Close an older `npm run dev:original-engine` terminal on port 3097.
4. Double-click `Mobile/run-original-lan.bat`, or in `Mobile/` run:
   `npm run dev:original-engine:lan`.
5. Find the URL printed after `TRUSTED LAN ONLY:` in the console, and open
   it in the phone browser. The current PC IPv4 address is
   **http://192.168.0.129:3097/** (it can change after reconnecting).
6. Wait for the original title screen and **log in manually**. Auto-start
   does **not** automatically authenticate or record a username/password.

The webpage uses TCP 3097 and routes original client WebSocket traffic over
TCP 43595 to the server's **local** TCP 43594. Your phone should not connect
to `localhost` or `127.0.0.1`; those would refer to the phone itself.
Leave `Server/run.bat` and `run-original-lan.bat` open while playing.

## Windows Firewall

If the page fails to open from the phone, check that Windows treats the
connected network as **Private**, not Public. You may need to explicitly
allow inbound TCP **3097 and 43595** from `LocalSubnet` on the **Private**
profile. An administrator can use:

```powershell
New-NetFirewallRule -DisplayName "SoloScape Original Client LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3097,43595 -Profile Private -RemoteAddress LocalSubnet
```

The launcher does not change your firewall automatically. Do not allow these
ports for Public networks, expose them to the Internet, or configure router
port forwarding. To disable LAN sharing, stop the LAN terminal and restart
the loopback-only `npm run dev:original-engine` command.

## Security and mobile limitations

LAN access is **opt-in**. The server picks an active private IPv4 adapter
(override using `SOLOSCAPE_ENGINE_LAN_IP` if multiple are available),
restricts HTTP by Host and source subnet, restricts the WebSocket gateway by
source subnet and exact browser Origin, and never changes the underlying
Java server's loopback-only TCP upstream. It serves the original compiled
gamepack and cache to **devices on your subnet**, without HTTPS or app-level
authentication, so use **only a private network and disposable test account**.
Check gamepack/cache distribution rights before sharing beyond personal testing.

The 765×503 original framebuffer fills the browser viewport using CSS
without replacing the **original Java renderer**; portrait view may stretch
the display. Landscape orientation is recommended. Native phone touch
gestures, long-press context menus and on-screen keyboard support may still
need further work; opening the page and displaying the title do not by
themselves prove all gameplay input works on a phone.

Development telemetry and the original gamepack source are not exposed as
extra HTML panels. The internal telemetry remains for the local bridge.
`Mobile/run.bat` remains the standard loopback-only development launcher.

## White screen troubleshooting on iPhone

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
