# SoloScape-OS — Agent Instructions

## Required editing workflow

These instructions apply to the entire repository and to every agent or delegated sub-agent working on it.

- Make repository edits in the local checkout or worktree. Local editors, `apply_patch`, scripts, formatters, and code generators are allowed for source files, documentation, configuration, assets, and agent instructions.
- Read the applicable instructions and target files before editing. Preserve unrelated content and existing user changes.
- Use local Git for branches, commits, and pushes. Inspect the current branch and working tree before making changes, and use `feature/` as the prefix when creating a new branch unless the user specifies another name.
- Run relevant builds, tests, formatting, and code generation locally as needed. Review the resulting diff and complete appropriate checks before committing.
- After every completed implementation, create a commit with a concise, descriptive title explaining the change, then push it to the corresponding remote branch. Include only files belonging to that implementation; do not commit unrelated user changes, generated dependencies, or secrets.
- Verify that the push succeeded and report the commit title, commit SHA, branch, and relevant validation results. If a commit or push is blocked, report the blocker and do not claim the implementation has been pushed.
- Never force-push, rewrite shared history, or discard user changes unless explicitly authorized.
- The GitHub plugin may be used for remote inspection, pull requests, and other GitHub operations, but it is not required for local edits, commits, or pushes.

Directory-specific `AGENTS.md` files supply additional guidance and must follow this editing workflow.

## Mobile Phase 2 — original OpenOSRS engine and Stage 1 MCP testing

- The source of truth is the **original OpenOSRS revision-240 Java gamepack compiled by TeaVM**, not the separate custom JavaScript/WebGL client. Preserve original gamepack gameplay, rendering, login, and movement logic; browser-only platform shims must be narrowly scoped and tested.
- Work in `Mobile/` on the current `feature/mobile` branch unless the user requests otherwise. The developer diagnostic is `npm run dev:original-engine` at `http://127.0.0.1:3097/`, using the local-only WebSocket gateway on `43595` and the SoloScape game server on `43594`. Never make these development services publicly accessible.
- Phase 2 has reached real `LOGGED_IN`, original software world rendering, 50 game cycles/s, and working original-engine click-to-move. Continue performance optimization and sustained-play regression testing without substituting the parallel custom renderer.
- Stage 1 of the **SoloScape Dev Bridge** lives in `Mobile/dev-bridge/`. It is a **stdio MCP server**, launches/owns a local Chrome diagnostic session, exposes safe state/FPS, screenshot, post-login input, sanitized errors, bounded profiling, and smoke tests. It is off by default and must never ship in the production mobile client.
- Authentication with a disposable account remains **manual**. MCP tools must not read, transmit, print, record, or manipulate usernames, passwords, cookies, RSA private keys, network login packets, or arbitrary DOM/JavaScript. Restrict screenshots and gameplay input to a healthy `LOGGED_IN` state; use Chrome CDP only for the bridge-owned local browser session.
- Run `npm run test:mcp:original-engine` and `npm test` for MCP work, plus `npm run build:openosrs-engine` and `npm run test:openosrs-engine` when editing the original engine. Include real Chrome verification for browser functionality where possible. Never interpret compiler success alone as gameplay parity.
- Follow the required Git workflow above **for each completed implementation**: review changed files, stage only relevant tracked/new source and documentation, commit with an implementation-specific message, push `feature/mobile` to `origin`, then report the actual commit SHA and push result. Leave unrelated dirty files, generated artifacts, game cache and private credentials unstaged.
