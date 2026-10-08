import { parseGatewayEnvironment } from "./config.mjs";
import { createGateway } from "./server.mjs";

try {
    const config = parseGatewayEnvironment(process.env);
    const { httpServer, close } = createGateway(config);
    httpServer.on("error", (error) => {
        console.error("[gateway] Server error:", error.message);
        process.exitCode = 1;
    });
    httpServer.listen(config.listenPort, config.listenHost, () => {
        console.log(`[gateway] Native OSRS raw TCP bridge listening on ws://${config.listenHost}:${config.listenPort}/`);
        console.log(`[gateway] Fixed upstream: ${config.tcpHost}:${config.tcpPort}`);
        console.log("[gateway] TSPS custom protocol is deliberately REJECTED. An adapter is still required.");
    });
    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.once(signal, () => {
            void close().then(() => { process.exitCode = 0; }, (error) => {
                console.error("[gateway] Shutdown error:", error);
                process.exitCode = 1;
            });
        });
    }
} catch (error) {
    console.error("[gateway]", error.message);
    process.exitCode = 1;
}
