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
