import assert from "node:assert/strict";
import { test } from "node:test";
import { createClientEnvironment, majorRevision } from "../scripts/config.mjs";

test("requires an explicit game endpoint", () => {
    assert.throws(() => createClientEnvironment({}), /SOLOSCAPE_GAME_URL is required/);
});

test("sets TSPS-compatible browser configuration without a hidden RSPS.app world", () => {
    const result = createClientEnvironment({
        SOLOSCAPE_GAME_URL: "ws://192.168.1.20:43594",
        SOLOSCAPE_SERVER_NAME: "SoloScape Dev",
        SOLOSCAPE_WEB_PORT: "3100",
    });
    assert.equal(result.env.REACT_APP_DEFAULT_WS_URL, "ws://192.168.1.20:43594/");
    assert.equal(result.env.REACT_APP_DEFAULT_SERVER_ADDRESS, "192.168.1.20:43594");
    assert.equal(result.env.REACT_APP_DEFAULT_SERVER_SECURE, "false");
    assert.equal(result.env.HOST, "0.0.0.0");
    assert.equal(result.env.PORT, "3100");
    assert.deepEqual(JSON.parse(result.env.REACT_APP_SERVERS_JSON), [{
        name: "SoloScape Dev",
        address: "192.168.1.20:43594",
        secure: false,
        maxPlayers: 2047,
        transport: "websocket",
    }]);
});

test("production builds require secure game and cache endpoints", () => {
    const base = { SOLOSCAPE_GAME_URL: "wss://game.example.test" };
    assert.throws(() => createClientEnvironment(base, { mode: "production" }), /SOLOSCAPE_CACHE_BASE_URL/);
    assert.throws(() => createClientEnvironment({
        ...base, SOLOSCAPE_CACHE_BASE_URL: "http://cdn.example.test/caches",
    }, { mode: "production" }), /https:\/\//);
    assert.throws(() => createClientEnvironment({
        ...base, SOLOSCAPE_GAME_URL: "ws://game.example.test",
        SOLOSCAPE_CACHE_BASE_URL: "https://cdn.example.test/caches",
    }, { mode: "production" }), /wss:\/\//);
    const result = createClientEnvironment({
        ...base,
        SOLOSCAPE_CACHE_BASE_URL: "https://cdn.example.test/caches",
    }, { mode: "production" });
    assert.equal(result.cacheBaseUrl, "https://cdn.example.test/caches/");
    assert.equal(result.env.REACT_APP_DEFAULT_SERVER_SECURE, "true");
    assert.equal(result.env.REACT_APP_CACHE_BASE_URL, "https://cdn.example.test/caches/");
});

test("rejects paths, embedded credentials, query strings and bad schemes", () => {
    for (const url of [
        "http://example.test", "ws://user:password@example.test",
        "ws://example.test/game", "wss://example.test/?token=secret",
        "ws://example.test/#frag", "not-an-url",
    ]) {
        assert.throws(() => createClientEnvironment({ SOLOSCAPE_GAME_URL: url }), url);
    }
});

test("validates dev web port", () => {
    for (const port of ["0", "65536", "abc", "-1"]) {
        assert.throws(() => createClientEnvironment({
            SOLOSCAPE_GAME_URL: "ws://localhost:43594", SOLOSCAPE_WEB_PORT: port,
        }), /SOLOSCAPE_WEB_PORT/);
    }
});

test("identifies an upstream / SoloScape revision mismatch without conflating minor versions", () => {
    assert.equal(majorRevision("osrs-241_2026-09-30"), 241);
    assert.equal(majorRevision("Revision 240.2"), 240);
    assert.equal(majorRevision("missing"), undefined);
});
