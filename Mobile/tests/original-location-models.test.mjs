import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

test("original location helper restores rev-240 untyped models across valid prefixes",()=>{
    const jdk=findTeaVmJdk();
    const directory=mkdtempSync(join(tmpdir(),"soloscape-location-models-"));
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    try{
        const compiled=spawnSync(javac,["-d",directory,
            fileURLToPath(new URL("../teavm-poc/engine-src/BrowserOriginalLocationModels.java",import.meta.url)),
            fileURLToPath(new URL("fixtures/OriginalLocationModelsTest.java",import.meta.url))],{encoding:"utf8"});
        assert.equal(compiled.status,0,compiled.stderr);
        const result=spawnSync(jdk.binary,["-cp",directory,"OriginalLocationModelsTest"],{encoding:"utf8"});
        assert.equal(result.status,0,result.stderr);
        assert.match(result.stdout,/PASS: rev-240 original location model/);
    }finally{rmSync(directory,{recursive:true,force:true});}
});

test("complete original rev-240 model-list corpus matches the original JVM reference", t=>{
    const corpus=fileURLToPath(new URL("../teavm-poc/target/engine/scenery-audit/definitions.bin",import.meta.url));
    if(!existsSync(corpus)) return t.skip("local audited original JVM corpus is unavailable");
    const jdk=findTeaVmJdk();
    const directory=mkdtempSync(join(tmpdir(),"soloscape-location-corpus-"));
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    try {
        const compiled=spawnSync(javac,["-d",directory,
            fileURLToPath(new URL("../teavm-poc/engine-src/BrowserOriginalLocationModels.java",import.meta.url)),
            fileURLToPath(new URL("fixtures/OriginalLocationCorpusTest.java",import.meta.url))],{encoding:"utf8"});
        assert.equal(compiled.status,0,compiled.stderr);
        const result=spawnSync(jdk.binary,["-cp",directory,"OriginalLocationCorpusTest",corpus],
            {encoding:"utf8",maxBuffer:1024*1024});
        assert.equal(result.status,0,result.stderr);
        assert.match(result.stdout,/62522 original JVM definitions.*zero differences/);
    } finally {rmSync(directory,{recursive:true,force:true});}
});
