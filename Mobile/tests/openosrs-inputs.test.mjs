import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {importOpenOsrsInputs} from "../scripts/import-openosrs-inputs.mjs";

async function fixture(t){
    const dir=await mkdtemp(join(tmpdir(),"soloscape-inputs-"));
    t.after(()=>rm(dir,{recursive:true,force:true}));
    const mobileRoot=join(dir,"Mobile"),sourceRoot=join(dir,"old-checkout");
    await mkdir(mobileRoot);await mkdir(sourceRoot);
    const hash=value=>createHash("sha256").update(value).digest("hex");
    const manifest={localDefault:"local-openosrs",sourceFiles:{"LICENSE":hash("notice")},
        buildFiles:{"build/api.jar":hash("synthetic API fixture")}};
    await writeFile(join(mobileRoot,"openosrs-reference.json"),JSON.stringify(manifest));
    await writeFile(join(sourceRoot,"LICENSE"),"notice");
    await mkdir(join(sourceRoot,"build"));
    await writeFile(join(sourceRoot,"build/api.jar"),"synthetic API fixture");
    await writeFile(join(sourceRoot,"private-unlisted-file"),"must not be copied");
    return {mobileRoot,sourceRoot,manifest};
}

test("local input migration verifies copied bytes, excludes unlisted files and survives removal of the source",async t=>{
    const f=await fixture(t),report=await importOpenOsrsInputs(f);
    assert.equal(report.copied,2);
    assert.equal(await readFile(join(report.destination,"build/api.jar"),"utf8"),"synthetic API fixture");
    await assert.rejects(access(join(report.destination,"private-unlisted-file")),{code:"ENOENT"});
    assert.equal((await importOpenOsrsInputs(f)).unchanged,2);
    await rm(f.sourceRoot,{recursive:true});
    assert.equal(await readFile(join(report.destination,"LICENSE"),"utf8"),"notice");
});
test("a missing or mismatched source aborts before any destination file is written",async t=>{
    const f=await fixture(t);
    await writeFile(join(f.sourceRoot,"build/api.jar"),"changed");
    await assert.rejects(importOpenOsrsInputs(f),/SHA-256 mismatch/);
    await assert.rejects(access(join(f.mobileRoot,"local-openosrs")),{code:"ENOENT"});
});
test("input migration preserves different destination files and rejects paths escaping the snapshot",async t=>{
    const f=await fixture(t),dest=join(f.mobileRoot,"local-openosrs");
    await mkdir(dest);await writeFile(join(dest,"LICENSE"),"local edit");
    await assert.rejects(importOpenOsrsInputs(f),/Preserving different/);
    assert.equal(await readFile(join(dest,"LICENSE"),"utf8"),"local edit");
    await assert.rejects(access(join(dest,"build/api.jar")),{code:"ENOENT"});
    f.manifest.localDefault="../outside";
    await writeFile(join(f.mobileRoot,"openosrs-reference.json"),JSON.stringify(f.manifest));
    await assert.rejects(importOpenOsrsInputs(f),/must stay inside/);
});
