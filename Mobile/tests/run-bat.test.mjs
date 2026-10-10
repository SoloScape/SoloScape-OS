import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const launcher=join(root,"run.bat");

test("Windows launcher uses only original OpenOSRS dev and Stage 1 stdio MCP",async()=>{
    const bat=await readFile(launcher,"utf8");
    assert.match(bat,/cd \/d "%~dp0"/i);
    assert.match(bat,/npm run dev:original-engine/);
    assert.match(bat,/node dev-bridge\\stdio\.mjs/);
    assert.match(bat,/start "SoloScape Original Engine Dev"/);
    assert.match(bat,/start "SoloScape Stage 1 MCP Bridge"/);
    assert.match(bat,/start "SoloScape Desktop Controller"/);
    assert.match(bat,/node dev-bridge\\controller-cli\.mjs serve/);
    assert.match(bat,/cmd\.exe \/D \/C exit \/B 0/);
    assert.match(bat,/node dev-bridge\\controller-cli\.mjs status >nul/);
    assert.match(bat,/--check/);
    assert.match(bat,/teavm-poc\\target\\engine\\javascript\\engine\.js/);
    assert.match(bat,/127\.0\.0\.1:3097/);
    assert.doesNotMatch(bat,/^\s*start\s+.*npm run dev(?!:original-engine)/im);
    assert.doesNotMatch(bat,/npm run dev:lan/i);
});

test("Windows launcher --check validates prerequisites without launching processes",
    {skip:process.platform!=="win32"},()=>{
        const result=spawnSync(process.env.ComSpec||"cmd.exe",["/D","/C","run.bat --check"],{
            cwd:root,encoding:"utf8",timeout:10000,windowsHide:true
        });
        assert.equal(result.status,0,result.stderr+"\n"+result.stdout);
        assert.match(result.stdout,/No processes started/);
        assert.match(result.stdout,/node dev-bridge\\stdio\.mjs/);
    });

test("Windows launcher --help has no side effects",
    {skip:process.platform!=="win32"},()=>{
        const result=spawnSync(process.env.ComSpec||"cmd.exe",["/D","/C","run.bat --help"],{
            cwd:root,encoding:"utf8",timeout:10000,windowsHide:true
        });
        assert.equal(result.status,0,result.stderr+"\n"+result.stdout);
        assert.match(result.stdout,/Usage: run\.bat/);
    });
