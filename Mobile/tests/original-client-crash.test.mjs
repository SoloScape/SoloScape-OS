import {test} from "node:test";
import assert from "node:assert/strict";
import {once} from "node:events";
import {readFile} from "node:fs/promises";
import {
    makeOriginalClientCrashReport,parseOriginalClientCrashReport,
    sendOriginalClientCrashReport
} from "../teavm-poc/site/original-client-crash.mjs";
import {createEngineSmokeServer} from "../scripts/engine-smoke-server.mjs";

test("mobile JS callback crash emits ONLY safe class, game state and JS locations",async()=>{
    const payload=makeOriginalClientCrashReport("JAVASCRIPT","LOGGED_IN",
        "J4:67:158 | attacker@example.com | ED:66:432 | username:password | fn$:123:4");
    assert.deepEqual(payload,{category:"JAVASCRIPT",gameState:"LOGGED_IN",
        frames:["J4:67:158","ED:66:432","fn$:123:4"]});
    assert.deepEqual(parseOriginalClientCrashReport(JSON.stringify(payload)),payload);
    const reports=[];
    assert.equal(sendOriginalClientCrashReport("JAVASCRIPT","LOGGED_IN",
        "J4:67:158 | attacker@example.com | ED:66:432",{
            sendBeacon:(url,body)=>{reports.push({url,body});return true;}
        }),true);
    assert.equal(reports.length,1);
    assert.equal(reports[0].url,"/original-client-crash");
    assert.equal(reports[0].body.type,"application/json");
    const raw=await reports[0].body.text();
    assert.deepEqual(JSON.parse(raw).frames,["J4:67:158","ED:66:432"]);
    assert.doesNotMatch(raw,/attacker|example|password|username/i);
});

test("malformed, private and excessively long error data is rejected at the boundary",()=>{
    for(const input of [
        JSON.stringify({category:"JAVASCRIPT",gameState:"LOGGED_IN",
            frames:["J4:67:158", "attacker@example.com"]}),
        JSON.stringify({category:"JAVASCRIPT",gameState:"LOGGED_IN",
            frames:["someFun:2:4|username:123:4"]}),
        JSON.stringify({category:"JAVASCRIPT",gameState:"LOGGED_IN",
            frames:["J4:67:158"],login:"pass"}),
        JSON.stringify({category:"some private error",gameState:"LOGGED_IN",frames:[]}),
        "x".repeat(901)
    ])assert.throws(()=>parseOriginalClientCrashReport(input));
    const clean=makeOriginalClientCrashReport("x","private name","private text");
    assert.deepEqual(clean,{category:"UNKNOWN",gameState:"UNKNOWN",frames:[]});
});

test("LAN crash report POST is same-origin, strictly checked and visible from localhost only",async()=>{
    const stored=[];
    const server=createEngineSmokeServer({
        onClientCrash:report=>stored.push(report),
        sessionDiagnostics:()=>({clientCrashes:stored}),
        isAllowedPeer:()=>true,
    });
    server.listen(0,"127.0.0.1");
    await once(server,"listening");
    try{
        const origin="http://127.0.0.1:"+server.address().port;
        const report={category:"JAVASCRIPT",gameState:"LOGGED_IN",
            frames:["J4:67:158","ED:66:432"]};
        const post=(body,header=origin)=>fetch(origin+"/original-client-crash",{
            method:"POST",headers:{"Content-Type":"application/json","Origin":header},
            body:typeof body==="string"?body:JSON.stringify(body)
        });
        let reply=await post(report);
        assert.equal(reply.status,204);
        assert.deepEqual(stored,[report]);
        reply=await post(report,"http://not-the-same-origin.test");
        assert.equal(reply.status,403);
        reply=await post({...report,username:"secret"});
        assert.equal(reply.status,400);
        reply=await post({...report,frames:["J4:67:158","user@example.com"]});
        assert.equal(reply.status,400);
        reply=await post("x".repeat(901));
        assert.ok([403,413].includes(reply.status));
        assert.equal(stored.length,1);
        reply=await fetch(origin+"/original-session-diagnostics");
        assert.equal(reply.status,200);
        assert.deepEqual((await reply.json()).clientCrashes,[report]);
    }finally{
        server.close();
        await once(server,"close");
    }
});

test("original running client emits reports only when the native callback has failed",async()=>{
    const source=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(source,/if\(hooksError && hooksError!==state\.callbackError\)\{/);
    assert.match(source,/sendOriginalClientCrashReport\(\s*categorizeOriginalClientError\(hooksError\),state\.gameState,state\.callbackTrace\)/);
    assert.doesNotMatch(source,/sendOriginalClientCrashReport\(hooksError/);
});
