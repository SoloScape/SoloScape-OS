# Release builds

The source build, formatting and release workflows were removed with the build system.
This checkout cannot compile sources, rebuild the game cache or produce release bundles.
A replacement build system must be configured before those workflows can be restored.

Existing prebuilt distributions can still run with Java 21 through `run.bat`.
See [the setup guide](../README.md#-getting-started) for the required files.
