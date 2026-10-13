// Reproducible Phase-1 proof: the original client actually paints LOGIN_SCREEN.
// Requires the local, pinned native cache and revision-240 JS5 service.
import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const mobile=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const cacheRoot=resolve(process.env.SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT||
    join(mobile,"../Server/.data/cache/LIVE"));
const chrome=process.env.CHROME_BIN||
    (process.platform==="win32"?"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe":"google-chrome");
const upstream=Number(process.env.SOLOSCAPE_GAME_TCP_PORT??43594);
if(!Number.isInteger(upstream)||upstream<1||upstream>65535)
    throw new Error("Invalid native JS5 port");
for(const name of ["main_file_cache.dat2","main_file_cache.idx255"])
    if(!existsSync(join(cacheRoot,name)))
        throw new Error("Pinned native LIVE cache unavailable: "+join(cacheRoot,name));
const routes=[43594,443].map(port=>({
    host:"127.0.0.1",port,url:"ws://127.0.0.1:43595/"
}));
const env={...process.env,CHROME_BIN:chrome,
    SOLOSCAPE_ENGINE_LOCAL_CACHE_ROOT:cacheRoot,
    SOLOSCAPE_ENGINE_JS5_UPSTREAM_PORT:String(upstream),
    SOLOSCAPE_ENGINE_SMOKE_GATEWAYS:JSON.stringify(routes),
    SOLOSCAPE_ENGINE_REQUIRE_TITLE:"1",
    SOLOSCAPE_ENGINE_STABILITY_MS:process.env.SOLOSCAPE_ENGINE_STABILITY_MS||"5000",
    SOLOSCAPE_ENGINE_SMOKE_TIMEOUT_MS:process.env.SOLOSCAPE_ENGINE_SMOKE_TIMEOUT_MS||"65000",
    SOLOSCAPE_ENGINE_CAPTURE_DIR:process.env.SOLOSCAPE_ENGINE_CAPTURE_DIR||
        join(mobile,"teavm-poc/target/engine/captures/title")
};
const result=spawnSync(process.execPath,[join(mobile,"scripts/verify-original-browser.mjs")],
    {cwd:mobile,env,stdio:"inherit"});
if(result.error)throw result.error;
process.exitCode=result.status===null?1:result.status;
