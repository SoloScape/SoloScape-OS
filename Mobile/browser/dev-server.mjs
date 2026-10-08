// Loopback-only native WebGL world client. Does not proxy game data or handle login.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const routes = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/diagnostics", ["diagnostics.html", "text/html; charset=utf-8"]],
    ["/diagnostics-app.mjs", ["diagnostics-app.mjs", "text/javascript; charset=utf-8"]],
    ["/world.css", ["world.css", "text/css; charset=utf-8"]],
    ["/terrain-world.mjs", ["terrain-world.mjs", "text/javascript; charset=utf-8"]],
    ["/world-webgl.mjs", ["world-webgl.mjs", "text/javascript; charset=utf-8"]],
    ["/floor-lighting.mjs", ["floor-lighting.mjs", "text/javascript; charset=utf-8"]],
    ["/floor-materials.mjs", ["floor-materials.mjs", "text/javascript; charset=utf-8"]],
    ["/world-startup.mjs", ["world-startup.mjs", "text/javascript; charset=utf-8"]],
    ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]],
    ["/native-js5.mjs", ["native-js5.mjs", "text/javascript; charset=utf-8"]],
    ["/tsps-cache-store.mjs", ["tsps-cache-store.mjs", "text/javascript; charset=utf-8"]],
    ["/sprite-preview.mjs", ["sprite-preview.mjs", "text/javascript; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);
// An ephemeral loopback port is allowed solely for CI route smoke tests.
const port = process.env.SOLOSCAPE_PREVIEW_PORT === "0" ? 0 : 3001;
const server = createServer(async (req, res) => {
    const route = req.method === "GET" ? routes.get(req.url) : undefined;
    if (!route) {
        res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("Not found");
        return;
    }
    try {
        const bytes = await readFile(join(root, route[0]));
        res.writeHead(200, {
            "Content-Type": route[1],
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src ws://127.0.0.1:43595; base-uri 'none'; form-action 'none'",
        });
        res.end(bytes);
    } catch (error) {
        console.error("[native-browser]", error.message);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Preview unavailable");
    }
});
server.listen(port, "127.0.0.1", () => {
    console.log(`[native-client] Visit http://localhost:${server.address().port}/ (requires running JS5 gateway at ws://127.0.0.1:43595/)`);
});
