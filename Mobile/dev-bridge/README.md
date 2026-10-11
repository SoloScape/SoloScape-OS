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

## Tools

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

### Example test workflow

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

## Desktop Commander Stage 2 (persistent controller)

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

## Phase 2 authenticated stability verification

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
[PHASE2_GAMEPLAY_VERIFICATION.md](../PHASE2_GAMEPLAY_VERIFICATION.md).
The 10 October 2026 20-minute session did **not** pass: severe late-session
timer throttling preceded a transition to `CONNECTION_LOST` and
`LOGIN_SCREEN`. Repeat with the Chrome test window foregrounded; do not
infer the client is stable from the median 50 game cycles/s or treat title
and simulated test fixtures as authenticated NPC/banking/chat proof.

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
