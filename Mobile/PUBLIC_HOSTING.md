# Optional external mobile hosting

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

## Direct home hosting or VPS

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

## If router forwarding is unavailable

CGNAT or ISP inbound restrictions prevent direct home hosting. An HTTPS tunnel
can instead target `http://127.0.0.1:8080`, preserving the configured public
Host header and WebSocket upgrades. Set `SOLOSCAPE_PUBLIC_ORIGIN` to that
tunnel's HTTPS origin. Tunnel only this production host, never the diagnostic
services. A tunnel still requires the home PC to stay online.

## Verify and stop

On a phone with Wi-Fi disabled, open the configured HTTPS address. Confirm
the original login screen, log in manually, then verify movement, chat and
reconnect. Local tests and `--check` cannot establish external reachability.
The initial page downloads the existing original cache (roughly 239 MB);
allow for mobile data usage and the host's upload bandwidth.

Stop Caddy and `start:public` with Ctrl+C to withdraw public access. Remove
router forwarding/firewall rules if no longer needed. LAN play remains
available through the usual launcher. No domain, tunnel or firewall is
automatically created by the public launcher.
