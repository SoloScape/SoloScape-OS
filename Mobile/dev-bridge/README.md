# SoloScape original-engine Stage 1 MCP bridge

This is a **development-only, local stdio MCP server** for the actual rev-240
OpenOSRS gamepack compiled with TeaVM. It controls the isolated original-engine
diagnostic at `http://127.0.0.1:3097/`, not the production mobile app or the
separate custom WebGL renderer.

It launches a dedicated Chrome session with its own temporary browser profile
and connects to **that session only** through local Chrome DevTools Protocol
(CDP). Its interface is a fixed allowlist; MCP callers cannot evaluate arbitrary
JavaScript, access files or network packets, navigate to arbitrary sites, or
attach to a browser they do not own.

## Direct ChatGPT connection using Secure MCP Tunnel

ChatGPT does not attach directly to a private Windows stdio process.
Use OpenAI's **Secure MCP Tunnel** to connect the bridge without opening
inbound firewall ports, publishing SoloScape, or exposing Chrome DevTools.
It forwards MCP messages over an outbound, authenticated HTTPS connection.

1. On your Windows machine, download the official Windows `tunnel-client`
   from [OpenAI Platform tunnels](https://platform.openai.com/settings/organization/tunnels)
   or the [official release page](https://github.com/openai/tunnel-client/releases/latest).
   Install it locally. Either add `tunnel-client.exe` to `PATH` or set
   `TUNNEL_CLIENT_BIN` to its absolute path.
2. In OpenAI Platform **Tunnel settings**, create a tunnel ID and associate it
   with the ChatGPT workspace/account in which you will use the plugin.
   Create a **runtime API key** whose principal has Tunnels Read + Use.
   Do not use your admin API key for the tunnel process.
3. In a fresh **PowerShell terminal on your machine**, set these environment
   variables **only for the current terminal session**, with values obtained
   in your OpenAI account:

   ```powershell
   $env:TUNNEL_CLIENT_BIN = 'C:\path\to\tunnel-client.exe'
   $env:CONTROL_PLANE_TUNNEL_ID = '<your tunnel ID>'
   $env:CONTROL_PLANE_API_KEY = '<your runtime API key>'
   cd C:\path\to\SoloScape-OS\Mobile
   .\dev-bridge\connect-chatgpt.ps1 -Mode check
   .\dev-bridge\connect-chatgpt.ps1 -Mode configure
   .\dev-bridge\connect-chatgpt.ps1 -Mode doctor
   ```

   **Do not paste the real key into chats, screenshots, source code or Git.**
   Run the PowerShell commands locally. The repository never creates, reads
   from disk, or commits a key file. The tunnel profile uses the fixed
   `node dev-bridge/stdio.mjs` command and is initialized with the working
   directory set to `Mobile/`.
4. After `doctor` succeeds, **from that same PowerShell session**, run
   `cmd /c .\run.bat`. It detects the configured tunnel variables,
   starts the original-engine diagnostic if necessary, and opens a separate
   `tunnel-client run --profile soloscape-original` terminal. Do not start
   another tunnel-client for the same tunnel ID.
5. On [ChatGPT web Plugins](https://chatgpt.com/), choose **+ → Add custom
   MCP server → Connection: Tunnel**, select the tunnel ID, review the
   permissions/warning, and create/install the plugin. This step requires
   the ChatGPT workspace or account to permit custom MCP servers. Choose
   the SoloScape plugin from the tools menu or mention it in a new chat.
   Connecting a plugin is always an explicit user action.

To check or repair the tunnel later, run
`.\dev-bridge\connect-chatgpt.ps1 -Mode doctor` while the runtime key is
available in that terminal. The tunnel remains unavailable whenever its
Windows daemon or the original dev server is stopped.

**Important limits:** `run.bat` alone cannot install a ChatGPT plugin,
create a Platform tunnel, or grant authorization. Direct ChatGPT access
cannot be claimed until the tunnel reports healthy and the ChatGPT plugin
has been installed and successfully called. The Java game server still
runs separately. This development tunnel grants access only to Stage 1's
existing post-login input and sanitized telemetry tools.

## One-click Windows launcher

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

## Prerequisites

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

The bridge does **not** register itself as a ChatGPT plugin. To work with it
through ChatGPT, use a local MCP-capable host that supports this configuration
or the existing authorized local-machine tooling to drive the CLI. Installing
or connecting an integration always requires the user's action.

## Tools

| Tool | Stage 1 behavior |
| --- | --- |
| `browser_start` | Launch bridge-owned Chrome on the localhost original-engine diagnostic |
| `browser_status` / `browser_close` | Inspect or close only the bridge-owned browser |
| `initialize_original_engine` | Press the diagnostic's original-engine Initialize button |
| `get_client_state` | Read sanitized game state, game cycles, FPS, presented frames, clock |
| `wait_for_state` | Wait for a whitelisted native game state, with max 60 s timeout |
| `capture_screen` | Capture the original canvas after a healthy `LOGGED_IN` |
| `click_canvas` | Send a real mouse click in original canvas pixel coordinates, after login |
| `press_key` | Single, allowlisted gameplay key after login (not free-form text) |
| `get_diagnostics` | Sanitized exception categories and generated function/line frames only |
| `profile_performance` | 0.5–15 s passive FPS/cycle probe, optionally CPU function-name samples |
| `run_smoke_test` | Check real `LOGGED_IN`, cycle/frame progression, and no callback errors |

### Example test workflow

1. Call `browser_start`; a dedicated Chrome window opens.
2. Call `initialize_original_engine` and `wait_for_state` with
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

## Security limits

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

## Verification

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
