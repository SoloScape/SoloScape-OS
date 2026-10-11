import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

test("original location helper restores Lumbridge fountains after sound metadata",()=>{
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
        assert.match(result.stdout,/PASS: Lumbridge fountain/);
    }finally{rmSync(directory,{recursive:true,force:true});}
});
