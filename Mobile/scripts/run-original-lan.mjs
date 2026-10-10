// Compatibility alias: explicitly enable the default trusted-LAN listener.
process.env.SOLOSCAPE_ENGINE_LAN="1";
await import("./run-original-engine.mjs");
