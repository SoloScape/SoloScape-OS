# SoloScape OS

On Windows, install Java 21 and Python 3, then run `build.bat` to build the client
and server. Launch each with `Client/run.bat` and `Server/run.bat`.

Builds use the standalone Kotlin 2.2.10 compiler, downloaded on the first build.
Maven and Gradle are not required. Restore the matching prebuilt distributions
for their external dependency libraries, plus the server cache, generated API
sources and local configuration. See [client setup](Client/README.md) and
[server setup](Server/README.md) for details.

Fresh runtime builds live under each project's `build/direct/lib/` and take
priority in the launchers. Rebuild after source changes. This runtime build does
not run unit tests or rebuild the game cache.

Both `build.bat` and `Server/build.bat` check the LIVE and SERVER cache data before
compiling the server, including unchanged builds. Missing files or Git LFS pointers
are restored from local LFS objects first, then downloaded through Git LFS if needed.
Install Git LFS for this automatic restoration. If restoration fails, the build stops
with recovery instructions rather than leaving a server that cannot load its cache.

Server builds cache engine/API, cache support and shared services in
`soloscape-server-core.jar`. Gameplay content and the application entry layer compile
into `soloscape-server.jar` against that core. Content-only edits reuse the core;
core edits rebuild both layers. Unchanged builds skip compilation, and resource-only
edits repackage resources. Use `Server/build.bat --rebuild` to force both layers to
compile. The first build after this split compiles both layers.

The root `build.bat` uses a conservative changed-source fast path for Kotlin
implementation-only edits in the client or server application layer. It reuses
unchanged classes from the previous JAR when every changed file's declarations, toolchain,
classpath, and generated class names are unchanged. Added files and declaration
changes can instead compile complete affected packages and their transitive
consumers, found through imports and qualified references. This preserves Kotlin's
same-package lookup and merges package metadata while removing obsolete classes.
Core/API changes, deleted or moved files, unsupported metadata and ambiguous cases
still rebuild the affected layer. `build.bat --rebuild`
forces full compilation of both projects. A failed partial compile automatically
retries the original full-layer build, preserving the last successful runtime.
Several method-body edits can compile together without rebuilding unrelated files.
Run `python -m unittest discover -s tools -p "test_incremental*.py"` and
`python -m unittest discover -s tools -p "test_build.py"` to check build behaviour;
the JVM integration check uses the installed standalone Kotlin compiler and Java 21.
Before a changed build compiles, it checks that the runtime directory can be
replaced. Close the running client/server when requested; a locked runtime now
stops the build immediately instead of compiling and failing during installation.
An unchanged build can still report up to date while the application is running.
