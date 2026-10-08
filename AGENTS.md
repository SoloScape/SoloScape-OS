# SoloScape-OS — Agent Instructions

## Required editing workflow

These instructions apply to the entire repository and to every agent or delegated sub-agent working on it.

- Make all repository edits exclusively through the GitHub plugin's tools. This includes creating, updating, deleting, or renaming source files, documentation, configuration, assets, and agent instructions.
- Never edit files in a local checkout or worktree. Do not use local editors, `apply_patch`, shell writes, scripts, formatters, code generators, or other tools that modify repository files locally, even as an intermediate step before uploading changes.
- Use the GitHub plugin for branches, commits, and pull requests associated with edits. Do not use local Git writes, `git push`, the GitHub CLI, direct HTTP API calls, or browser editing as a substitute for the plugin.
- Read the target file and its current SHA through the GitHub plugin before updating it. Preserve unrelated content, write to the intended branch, and verify the resulting change through the plugin.
- Local inspection is allowed only when it is read-only. Run builds, tests, formatting, and code generation through remote CI when they would write local files.
- If the GitHub plugin is unavailable or cannot perform a required edit, stop that edit and report the blocker. Never fall back to editing locally.

Directory-specific `AGENTS.md` files supply additional guidance and must follow this editing workflow.


## Cache-only assets and authoritative game-client data (mandatory)

These rules apply to every agent/sub-agent changing RuneScape client UI,
gameframe, widgets, minimap, sprites, fonts, models, sounds, layouts, and
protocol-derived content, including documentation and tests:

- **The connected SoloScape revision-240.2 JS5 cache and actual game-server
  packets are the source of truth.** Reuse original validated assets from
  their true archive/group/file, decoded widget geometry, identifiers,
  scripts, varbits, and authentic server state.
- **Never invent, draw, AI-generate, approximate, or substitute game sprites
  or gameframe art.** No inline SVG icon drawings, Unicode emoji pretending
  to be icons, guessed sprite-sheet indices, synthetic minimap palettes,
  CSS gradients/bevels mimicking game chrome, stock art, or fake item/skill
  state. Do not copy binary artwork from a third-party reference client.
- Do not assume historic interface/sprite/widget IDs match this revision.
  Cross-check an ID against the connected cache or authoritative server
  attachments, and distinguish verified mappings from reference candidates.
  Other open-source clients can explain decoding/layout but are **not**
  substitutes for the actual connected cache.
- Missing, undecodable, or unverified assets must remain visually absent
  with an honest plain-text diagnostic where necessary. Keep accessible
  semantic controls/hitboxes if functionality requires them, but **do not
  manufacture a visual fallback**. Do not hide/occlude the 3D scene.
- Game text/values must come from cache or live packets. An unknown value
  stays unknown, not a fabricated number, icon, or plausible-looking image.
- Before marking UI work complete, test cache decoding, check the absence
  of synthetic art sources, run remote CI, and say explicitly what requires
  live revision-240 cache/browser verification. Never claim pixel-perfect
  parity solely because a build passes.

These constraints supersede any older instructions suggesting handmade
RuneScape-lookalike layouts, provisional art, or illustrative placeholders.
