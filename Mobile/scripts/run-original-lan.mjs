// Explicit opt-in: original gamepack and cache will be accessible to trusted LAN peers.
process.env.SOLOSCAPE_ENGINE_LAN="1";
await import("./run-original-engine.mjs");
