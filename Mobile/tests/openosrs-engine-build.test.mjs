import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {buildOpenOsrsEngine,classifyEngineBuild} from "../scripts/build-openosrs-engine.mjs";

function fixture(t){
    const root=mkdtempSync(join(tmpdir(),"soloscape-engine-"));
    t.after(()=>rmSync(root,{recursive:true,force:true}));
    const gamepack=join(root,"local gamepack.oprs"),api=join(root,"local api.jar");
    writeFileSync(gamepack,"test fixture, not gamepack bytes");writeFileSync(api,"fixture API");
    writeFileSync(join(root,"openosrs-reference.json"),JSON.stringify({protocolRevision:240,version:"1.2.0",
        localDefault:".",gamepackSha256:createHash("sha256").update(readFileSync(gamepack)).digest("hex")}));
    const output=join(root,"teavm-poc/target/engine/javascript/engine.js");
    const env={SOLOSCAPE_OPENOSRS_GAMEPACK:gamepack,SOLOSCAPE_OPENOSRS_API:api};
    const selectJdk=()=>({major:17,home:null,binary:"java"});
    return {root,env,selectJdk,output,platform:"linux"};
}

test("whole-engine build rejects a mismatched gamepack before executing tools",t=>{
    const f=fixture(t);writeFileSync(f.env.SOLOSCAPE_OPENOSRS_GAMEPACK,"wrong revision");
    const {report}=buildOpenOsrsEngine({...f,run:()=>{assert.fail("Must not run compiler");}});
    assert.equal(report.status,"blocked");assert.equal(report.stage,"prerequisites");
    assert.match(report.reason,/SHA-256 mismatch/);assert.equal(report.parityVerified,false);
});
test("whole-engine build removes stale output and persists parser evidence",t=>{
    const f=fixture(t);mkdirSync(join(f.root,"teavm-poc/target/engine/javascript"),{recursive:true});
    writeFileSync(f.output,"stale module");let compileArgs;
    const {report,target}=buildOpenOsrsEngine({...f,run:(command,args)=>{
        if(command==="java")return {status:0,stdout:"",stderr:"java version 17"};
        compileArgs=args;return {status:1,stdout:"",stderr:"IllegalArgumentException at ProgramParser$1.visitLdcInsn"};
    }});
    assert.equal(report.stage,"bytecode-parser");assert.equal(report.status,"blocked");
    assert.equal(existsSync(f.output),false);
    assert.ok(compileArgs.includes(`-Dgamepack.path=${f.env.SOLOSCAPE_OPENOSRS_GAMEPACK}`));
    assert.ok(compileArgs.includes(`-Dapi.path=${f.env.SOLOSCAPE_OPENOSRS_API}`));
    assert.match(readFileSync(join(target,"compiler.log"),"utf8"),/visitLdcInsn/);
    assert.deepEqual(JSON.parse(readFileSync(join(target,"report.json"),"utf8")),report);
});
test("Maven success without an engine module is a failure",t=>{
    const f=fixture(t);
    const {report}=buildOpenOsrsEngine({...f,run:()=>({status:0,stdout:"BUILD SUCCESS"})});
    assert.equal(report.status,"blocked");assert.equal(report.stage,"output");
});
test("successful compilation never claims runtime or whole-client parity",t=>{
    const f=fixture(t);
    const {report}=buildOpenOsrsEngine({...f,run:(command)=>{
        if(command==="mvn"){
            mkdirSync(join(f.root,"teavm-poc/target/engine/javascript"),{recursive:true});
            writeFileSync(f.output,"fixture output");
        }
        return {status:0,stdout:"BUILD SUCCESS"};
    }});
    assert.equal(report.status,"compiled-unverified");assert.equal(report.parityVerified,false);
});
test("tool launch failures and ordinary dependency failures remain distinct",()=>{
    assert.equal(classifyEngineBuild({error:new Error("Maven missing")},"",false).stage,"toolchain");
    assert.equal(classifyEngineBuild({status:1},"Class java.awt.Canvas was not found",false).stage,"compiler");
    assert.equal(classifyEngineBuild({status:1},"",true).status,"blocked");
});
