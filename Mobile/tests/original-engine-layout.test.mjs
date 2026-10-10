import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {createEngineSmokeServer} from "../scripts/engine-smoke-server.mjs";

test("original game page uses an external trusted stylesheet rather than CSP-blocked inline styles",async()=>{
    const markup=await readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8");
    const css=await readFile(new URL("../teavm-poc/site/engine-smoke.css",import.meta.url),"utf8");
    assert.match(markup,/<link rel="stylesheet" href="\/engine-smoke\.css">/);
    assert.doesNotMatch(markup,/<style[\s>]/i);
    assert.match(markup,/id="original-engine-canvas"/);
    assert.match(css,/#original-engine-canvas\s*\{/);
    assert.match(css,/aspect-ratio:765\/503/);
    assert.match(css,/width:min\(100vw,152\.0875vh\)/);
    assert.match(css,/width:min\(100vw,152\.0875dvh\)/);
    assert.match(css,/display:flex;align-items:center;justify-content:center/);
    assert.doesNotMatch(css,/width:100vw;height:100vh/);
    assert.match(css,/background:\s*#000/);
    assert.doesNotMatch(markup,/id="internal-diagnostics"|id="start"/);
    assert.doesNotMatch(markup,/id="loading-status"/);
    assert.match(markup,/id="startup-error" role="alert" hidden/);
});

test("strict LAN Content Security Policy permits the real full-screen CSS asset",async()=>{
    const visited=[];
    const server=createEngineSmokeServer({read:async path=>{
        visited.push(path);return readFile(path);
    },isAllowedPeer:()=>true});
    server.listen(0,"127.0.0.1");
    await once(server,"listening");
    try{
        const origin="http://127.0.0.1:"+server.address().port;
        const html=await fetch(origin+"/");
        assert.equal(html.status,200);
        const csp=html.headers.get("content-security-policy");
        assert.match(csp,/style-src 'self'/);
        assert.doesNotMatch(csp,/style-src 'unsafe-inline'/);
        const markup=await html.text();
        assert.match(markup,/href="\/engine-smoke.css"/);
        const sheet=await fetch(origin+"/engine-smoke.css");
        assert.equal(sheet.status,200);
        assert.match(sheet.headers.get("content-type"),/^text\/css/);
        assert.match(await sheet.text(),/#original-engine-canvas/);
        assert.ok(visited.some(p=>p.endsWith("engine-smoke.css")));
        const keyboard=await fetch(origin+"/original-mobile-keyboard.mjs");
        assert.equal(keyboard.status,200);
        assert.match(keyboard.headers.get("content-type"),/javascript/);
        assert.match(await keyboard.text(),/attachOriginalKeyboard/);
    }finally{
        server.close();
        await once(server,"close");
    }
});

test("prolonged mobile startup surfaces a safe visible diagnostic rather than hanging silently",async()=>{
    const js=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(js,/const slowStartup=setTimeout\(/);
    assert.match(js,/showStartupError\("Game startup is taking too long \("/);
    assert.match(js,/safeStep/);
    assert.match(js,/clearTimeout\(slowStartup\)/);
    assert.match(js,/if\(state\.gameState==="LOGIN_SCREEN"\|\|state\.gameState==="LOGGED_IN"/);
    assert.match(js,/showStartupError\("Original game failed to initialize/);
});
