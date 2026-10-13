// Configuration for running the pinned TSPS browser client against a SoloScape
// test endpoint. This file must not contain secrets: REACT_APP_* is public.
function requiredString(value, key) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${key} is required (for example ws://192.168.1.10:43594)`);
    }
    return value.trim();
}

function urlWithoutSecrets(raw, name, protocols, { allowPath = false } = {}) {
    let url;
    try {
        url = new URL(raw);
    } catch {
        throw new Error(`${name} must be an absolute URL`);
    }
    if (!protocols.includes(url.protocol)) {
        throw new Error(`${name} must use ${protocols.join(" or ")}`);
    }
    if (url.username || url.password || url.search || url.hash) {
        throw new Error(`${name} must not include credentials, a query or a fragment`);
    }
    if (!allowPath && url.pathname !== "/" && url.pathname !== "") {
        throw new Error(`${name} must not have a path (the upstream world selector uses host:port)`);
    }
    if (url.port === "0") {
        throw new Error(`${name} cannot use port 0`);
    }
    return url;
}

function webPort(value) {
    const raw = value === undefined || value === "" ? "3001" : String(value);
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535) {
        throw new Error("SOLOSCAPE_WEB_PORT must be an integer from 1 to 65535");
    }
    return String(Number(raw));
}

/**
 * Explicit configuration for the unmodified TSPS browser app. Using a single,
 * baked-in world prevents the example RSPS.app localhost world being displayed.
 * Protocol and cache compatibility still require separate server-side work.
 */
export function createClientEnvironment(source, { mode = "development" } = {}) {
    if (!["development", "production"].includes(mode)) {
        throw new Error("mode must be development or production");
    }
    const production = mode === "production";
    const gameUrl = urlWithoutSecrets(
        requiredString(source.SOLOSCAPE_GAME_URL, "SOLOSCAPE_GAME_URL"),
        "SOLOSCAPE_GAME_URL",
        ["ws:", "wss:"],
    );
    if (production && gameUrl.protocol !== "wss:") {
        throw new Error("Production client builds require a wss:// game endpoint");
    }

    const cacheRaw = source.SOLOSCAPE_CACHE_BASE_URL?.trim();
    if (production && !cacheRaw) {
        throw new Error("Production builds require an explicit SOLOSCAPE_CACHE_BASE_URL");
    }
    let cacheBaseUrl;
    if (cacheRaw) {
        const cacheUrl = urlWithoutSecrets(cacheRaw, "SOLOSCAPE_CACHE_BASE_URL", ["http:", "https:"], { allowPath: true });
        if (production && cacheUrl.protocol !== "https:") {
            throw new Error("Production client builds require an https:// cache endpoint");
        }
        cacheBaseUrl = cacheUrl.toString().endsWith("/") ? cacheUrl.toString() : `${cacheUrl.toString()}/`;
    }

    const serverName = source.SOLOSCAPE_SERVER_NAME?.trim() || "SoloScape (experimental)";
    const server = {
        name: serverName,
        address: gameUrl.host,
        secure: gameUrl.protocol === "wss:",
        maxPlayers: 2047,
        transport: "websocket",
    };
    const env = {
        ...source,
        REACT_APP_DEFAULT_WS_URL: gameUrl.toString(),
        REACT_APP_DEFAULT_SERVER_ADDRESS: server.address,
        REACT_APP_DEFAULT_SERVER_SECURE: String(server.secure),
        REACT_APP_DEFAULT_SERVER_NAME: serverName,
        REACT_APP_SERVERS_JSON: JSON.stringify([server]),
        // A game server's cache is NOT automatically interchangeable with TSPS.
        // Dev mode uses the upstream TSPS cache only when this is unspecified.
        ...(cacheBaseUrl ? { REACT_APP_CACHE_BASE_URL: cacheBaseUrl } : {}),
        ...(production ? {} : {
            HOST: source.SOLOSCAPE_WEB_HOST?.trim() || "0.0.0.0",
            PORT: webPort(source.SOLOSCAPE_WEB_PORT),
            BROWSER: "none",
        }),
    };
    return { env, gameUrl: gameUrl.toString(), cacheBaseUrl, server };
}

/** Read the first integer of an OSRS revision label, e.g. 240.2 -> 240. */
export function majorRevision(label) {
    const match = String(label ?? "").match(/(?:osrs-|revision\s*)(\d+)/i);
    return match ? Number(match[1]) : undefined;
}
