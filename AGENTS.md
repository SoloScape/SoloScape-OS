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
