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

The root `build.bat` uses a conservative single-source fast path for Kotlin
implementation-only edits in the client or server application layer. It reuses
unchanged classes from the previous JAR when the file's declarations, toolchain,
classpath, and generated class names are unchanged. Changes to public interfaces,
inline functions, constants, core/API sources, filenames, or other ambiguous cases
recompile the affected layer normally. The first build after this update refreshes
the compilation cache; later changes can use the fast path. `build.bat --rebuild`
forces full compilation of both projects. A failed partial compile automatically
retries the original full-layer build, preserving the last successful runtime.
