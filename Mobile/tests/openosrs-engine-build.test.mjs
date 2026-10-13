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
    const normalize=({gamepack})=>({gamepack,adaptation:{constants:1},parser:{failures:0}});
    return {root,env,selectJdk,normalize,output,platform:"linux"};
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
    assert.equal(classifyEngineBuild({status:1},"[ERROR] Class java.awt.Canvas was not found",false).stage,"runtime-dependencies");
    assert.equal(classifyEngineBuild({status:1},"",true).status,"blocked");
});
test("whole-engine Maven receives adapted bytes and reports missing runtime dependencies",t=>{
    const f=fixture(t);const normalized=f.env.SOLOSCAPE_OPENOSRS_GAMEPACK+".normalized.jar";
    const {report}=buildOpenOsrsEngine({...f,normalize:()=>({gamepack:normalized,adaptation:{loads:85},parser:{failures:0}}),
        run:(command,args)=>{
            if(command==="java")return {status:0,stdout:"java version 17"};
            assert.ok(args.includes(`-Dgamepack.path=${normalized}`));
            mkdirSync(join(f.root,"teavm-poc/target/engine/javascript"),{recursive:true});writeFileSync(f.output,"broken output");
            return {status:1,stdout:"[ERROR] Class java.awt.Panel was not found\n[ERROR] Class java.awt.Panel was not found\n"};
        }});
    assert.equal(report.stage,"runtime-dependencies");assert.deepEqual(report.blockers,["Class java.awt.Panel was not found"]);
    assert.equal(report.adaptation.loads,85);assert.equal(report.parser.failures,0);assert.equal(existsSync(f.output),false);
});
test("normalization failure prevents Maven and cannot retain a stale module",t=>{
    const f=fixture(t);let probes=0;
    const {report}=buildOpenOsrsEngine({...f,run:()=>{probes++;return {status:0};},
        normalize:()=>{throw new Error("Unsupported bootstrap target signature");}});
    assert.equal(probes,1);assert.equal(report.stage,"bytecode-normalization");
    assert.match(report.reason,/Unsupported bootstrap/);assert.equal(report.status,"blocked");
});

test("whole-engine compilation adapts the API jar together with the gamepack",t=>{
    const f=fixture(t),adaptedApi=f.env.SOLOSCAPE_OPENOSRS_API+".browser.jar";
    const {report}=buildOpenOsrsEngine({...f,normalize:({api,gamepack})=>{
        assert.equal(api,f.env.SOLOSCAPE_OPENOSRS_API);
        return {gamepack,api:adaptedApi,adaptation:{},parser:{failures:0}};
    },run:(command,args)=>{
        if(command==="mvn")assert.ok(args.includes(`-Dapi.path=${adaptedApi}`));
        return {status:0,stdout:""};
    }});
    assert.equal(report.stage,"output");
});

test("invalid generated JavaScript cannot be reported as a compiled engine",t=>{
    const f=fixture(t);
    const {report}=buildOpenOsrsEngine({...f,run:(command,args)=>{
        if(command==="mvn"){
            mkdirSync(join(f.root,"teavm-poc/target/engine/javascript"),{recursive:true});writeFileSync(f.output,"let do = 1;");
        }
        if(args.includes("--experimental-vm-modules"))return {status:1,stderr:"SyntaxError: Unexpected token 'do'"};
        return {status:0,stdout:""};
    }});
    assert.equal(report.status,"blocked");assert.equal(report.stage,"javascript-syntax");
    assert.match(report.reason,/Unexpected token/);assert.equal(existsSync(f.output),false);
});
