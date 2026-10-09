import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";
import {verifyEnginePlatformTransform} from "../scripts/prepare-engine-bytecode.mjs";

test("engine platform rewriting preserves methods, descriptors and resource bytes",t=>{
    let jdk;
    try{jdk=findTeaVmJdk();}catch(error){t.skip(error.message);return;}
    const target=mkdtempSync(join(tmpdir(),"soloscape-platform-transform-"));
    t.after(()=>rmSync(target,{recursive:true,force:true}));
    const root=fileURLToPath(new URL("../",import.meta.url));
    assert.match(verifyEnginePlatformTransform({root,target,jdk}),/^PASS:/);
});
