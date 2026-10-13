// Launch the actual TSPS browser client from the pinned upstream submodule.
// This only changes environment variables, never the upstream source tree.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClientEnvironment, majorRevision } from "./config.mjs";

const modeArg = process.argv[2];
if (modeArg !== "dev" && modeArg !== "build") {
    console.error("Usage: node scripts/run-client.mjs <dev|build>");
    process.exitCode = 2;
} else {
    const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const repositoryRoot = resolve(mobileRoot, "..");
    const upstreamRoot = join(mobileRoot, "tsps-upstream");
    if (!existsSync(join(upstreamRoot, "client", "package.json"))) {
        console.error("TSPS submodule missing. Run: git submodule update --init Mobile/tsps-upstream");
        process.exitCode = 1;
    } else {
        try {
            const { env, gameUrl, cacheBaseUrl } = createClientEnvironment(
                process.env,
                { mode: modeArg === "build" ? "production" : "development" },
            );
            const target = readFileSync(join(upstreamRoot, "server", "target.txt"), "utf8").trim();
            const readme = readFileSync(join(repositoryRoot, "Server", "README.md"), "utf8");
            const documentedRevision = readme.match(/Revision\s+(\d+(?:\.\d+)?)/i)?.[0];
            const upstreamRevision = majorRevision(target);
            const soloRevision = majorRevision(documentedRevision);
            console.log(`[mobile] Using pinned TSPS browser client: ${target}`);
            console.log(`[mobile] Game endpoint: ${gameUrl}`);
            console.log(`[mobile] Cache base: ${cacheBaseUrl || "TSPS dev cache (/caches/)"}`);
            if (upstreamRevision === undefined || soloRevision === undefined) {
                console.warn("[mobile] Could not establish matching server/client cache revisions.");
            } else if (upstreamRevision !== soloRevision) {
                console.warn(`[mobile] REVISION MISMATCH: TSPS ${upstreamRevision} vs SoloScape ${soloRevision}; login, rendering and packets are not yet compatible.`);
            }
            console.warn("[mobile] No protocol adapter exists yet. This is an experimental integration build, not a playable SoloScape client.");
            const npm = process.platform === "win32" ? "npm.cmd" : "npm";
            const cmd = modeArg === "dev" ? "start" : "build";
            const child = spawn(npm, [
                "exec", "--yes", "--package", "@yarnpkg/cli-dist@4.12.0",
                "--", "yarn", "--cwd", "client", cmd,
            ], { cwd: upstreamRoot, env, stdio: "inherit" });
            child.on("error", (error) => {
                console.error("[mobile] Failed to start:", error.message);
                process.exitCode = 1;
            });
            child.on("exit", (code, signal) => {
                process.exitCode = signal ? 1 : (code ?? 1);
            });
            process.on("SIGINT", () => child.kill("SIGINT"));
            process.on("SIGTERM", () => child.kill("SIGTERM"));
        } catch (error) {
            console.error(`[mobile] ${error.message}`);
            process.exitCode = 1;
        }
    }
}
