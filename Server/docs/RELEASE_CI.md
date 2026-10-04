# Release builds

Local runtime source builds are available through `build.bat`, using Python 3,
Java 21 and the standalone Kotlin compiler. They reuse external dependencies from
a matching prebuilt distribution. Maven and Gradle are not required.

Automated tests, cache rebuilding, formatting and release publishing workflows
have not been restored.

Existing prebuilt distributions can still run with Java 21 through `run.bat`.
See [the setup guide](../README.md#-getting-started) for the required files.
