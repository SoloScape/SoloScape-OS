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
