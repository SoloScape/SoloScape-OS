import { spawn, spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const host = process.argv[2];
if (isIP(host) !== 4 || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error("Usage: npm run dev:lan -- <private LAN IPv4> [--setup-only]");
}
const openssl = process.env.OPENSSL_BIN || (process.platform === "win32" && existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
    ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl");
const dir = join(root, ".lan");
mkdirSync(dir, {recursive:true});
const ca = join(dir, "soloscape-lan-ca.crt"), caKey = join(dir, "ca.key");
const cert = join(dir, "server.crt"), key = join(dir, "server.key");
function run(args) {
    const result = spawnSync(openssl, args, {stdio:"pipe"});
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.toString());
}
if (!existsSync(ca) || !existsSync(caKey)) {
    run(["req","-x509","-newkey","rsa:2048","-nodes","-sha256","-days","3650",
        "-subj","/CN=SoloScape LAN Local CA","-addext","basicConstraints=critical,CA:TRUE,pathlen:0",
        "-addext","keyUsage=critical,keyCertSign,cRLSign","-keyout",caKey,"-out",ca]);
}
// Reissue the server certificate when the LAN address changes or it expires soon.
let reusable = false;
if (existsSync(cert)) {
    const existing = new X509Certificate(readFileSync(cert));
    reusable = existing.checkIP(host) === host && Date.parse(existing.validTo) > Date.now() + 86400_000;
}
if (!existsSync(key) || !reusable) {
    const csr = join(dir,"server.csr"), ext = join(dir,"server.ext");
    writeFileSync(ext, `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=IP:${host},IP:127.0.0.1,DNS:localhost\n`);
    run(["req","-new","-newkey","rsa:2048","-nodes","-sha256","-subj","/CN=SoloScape LAN",
        "-keyout",key,"-out",csr]);
    run(["x509","-req","-in",csr,"-CA",ca,"-CAkey",caKey,"-CAcreateserial","-days","365",
        "-sha256","-extfile",ext,"-out",cert]);
}
run(["verify","-CAfile",ca,cert]);
console.log(`Phone address: https://${host}:3443/`);
console.log(`Install and trust this public CA on your phone: ${ca}`);
const fingerprint = spawnSync(openssl,["x509","-in",ca,"-noout","-fingerprint","-sha256"],{encoding:"utf8"});
console.log(fingerprint.stdout.trim());
if (!process.argv.includes("--setup-only")) {
    const env = {...process.env,
        SOLOSCAPE_TLS_CERT_FILE:cert, SOLOSCAPE_TLS_KEY_FILE:key,
        SOLOSCAPE_PREVIEW_HOST:host, SOLOSCAPE_PREVIEW_PORT:"3443",
        SOLOSCAPE_NATIVE_GATEWAY_URL:`wss://${host}:43596/`,
        SOLOSCAPE_GATEWAY_ENABLE_NATIVE:"1", SOLOSCAPE_GATEWAY_ALLOW_LAN:"1",
        SOLOSCAPE_GATEWAY_HOST:host, SOLOSCAPE_GATEWAY_PORT:"43596",
        SOLOSCAPE_GAME_TCP_HOST:"127.0.0.1", SOLOSCAPE_GAME_TCP_PORT:process.env.SOLOSCAPE_GAME_TCP_PORT || "43594",
        SOLOSCAPE_GATEWAY_ALLOWED_ORIGINS:`https://${host}:3443`,
    };
    // Fail before starting either listener if public login key material is absent.
    readFileSync(env.SOLOSCAPE_RSA_PUBLIC_KEY_FILE || join(root,"../Server/.data/client.key"));
    const children = ["gateway/cli.mjs","browser/dev-server.mjs"].map(script =>
        spawn(process.execPath,[script],{cwd:root,env,stdio:"inherit"}));
    let stopping = false;
    const stop = () => { stopping = true; for (const child of children) child.kill(); };
    for (const child of children) {
        child.on("error", error => { console.error(error.message); process.exitCode=1; stop(); });
        child.on("exit", code => { if (!stopping) { process.exitCode=code || 1; stop(); } });
    }
    process.on("SIGINT",stop); process.on("SIGTERM",stop);
}
