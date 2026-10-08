// Deliberately loopback-only local browser preview. Does not proxy game data.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const routes = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]],
    ["/native-js5.mjs", ["native-js5.mjs", "text/javascript; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);
const port = 3001;
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
    console.log(`[native-browser] Visit http://localhost:${port}/ (requires running JS5 gateway at ws://127.0.0.1:43595/)`);
});
