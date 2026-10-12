# Local original-engine build inputs

This folder replaces the separate OpenOSRS checkout for mobile builds. Keep it
when removing that checkout. Its imported files are local-only and ignored by
Git; they are not included in a fresh clone or a GitHub push. Back up this folder
separately, including its ignored files.

It contains the pinned revision-240 `injected-client.oprs`, the built RuneLite
API JAR, the original `runelite/index` resource, reference metadata, licence
notice and the source files fingerprinted in `../openosrs-reference.json`.
It is a minimal input snapshot, not a complete desktop OpenOSRS source tree.
The original Java gamepack still owns gameplay, login and rendering.

To provision another machine from an existing local OpenOSRS checkout, run from
`Mobile/`:

```powershell
npm run import:openosrs-inputs -- --from "C:\path\to\OpenOSRS"
npm run verify:openosrs-reference
npm run build:openosrs-engine
npm run test:openosrs-engine
```

The importer checks all pinned hashes before copying, preserves different
existing destination files, verifies copied bytes and supports safe retries.
It never deletes or modifies the source checkout. It copies only the manifest's
allowlisted files, not accounts, settings directories, game caches or credentials.

`SOLOSCAPE_OPENOSRS_ROOT`, `SOLOSCAPE_OPENOSRS_GAMEPACK` and
`SOLOSCAPE_OPENOSRS_API` remain explicit overrides. Clear any overrides pointing
at the old checkout before removing it. To roll back, set
`SOLOSCAPE_OPENOSRS_ROOT` to the retained original checkout.

Node.js, JDK 17+, Maven, their dependencies, and the SoloScape server/cache are
still required as before. The BSD notice is preserved in `LICENSE`; the gamepack
and third-party artifacts retain their separate terms and are not redistributed.

Verified on 12 October 2026 with the original checkout temporarily renamed:
all 20 input hashes, the full original-engine build/module check, renderer build
and JVM/TeaVM pixel comparison, and the full suite (620 passed, 3 skipped) passed.
The original directory was restored afterward. The rebuilt original client also
passed the bridge-owned Chrome login-screen smoke; authentication remains manual.
