import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,writeFile,rm} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const setup=join(root,"dev-bridge","connect-chatgpt.ps1");
const cmd=process.env.ComSpec||"cmd.exe";
function invoke(mode,env={}){
    return spawnSync("powershell.exe",[
        "-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass",
        "-File",setup,"-Mode",mode
    ],{cwd:root,env:{...process.env,...env},encoding:"utf8",timeout:15000,windowsHide:true});
}
test("Secure MCP Tunnel setup requires private, separate credentials and never puts a key in source",async()=>{
    const ps=await readFile(setup,"utf8");
    assert.match(ps,/CONTROL_PLANE_TUNNEL_ID/);
    assert.match(ps,/CONTROL_PLANE_API_KEY/);
    assert.match(ps,/init --sample sample_mcp_stdio_local/);
    assert.match(ps,/--mcp-command \$mcpCommand/);
    assert.match(ps,/doctor --profile \$Profile --explain/);
    assert.match(ps,/run --profile \$Profile/);
    assert.match(ps,/Find-TunnelClient/);
    assert.doesNotMatch(ps,/sk-[a-zA-Z0-9]{8,}|api\.openai\.com\/v1\/responses/);
});
test("One-click launcher selects private tunnel when authorized environment exists",async()=>{
    const bat=await readFile(join(root,"run.bat"),"utf8");
    assert.match(bat,/if defined CONTROL_PLANE_TUNNEL_ID if defined CONTROL_PLANE_API_KEY goto :launch_tunnel/);
    assert.match(bat,/connect-chatgpt\.ps1 -Mode run/);
    assert.match(bat,/dev-bridge\\stdio\.mjs/);
    assert.doesNotMatch(bat,/sk-[A-Za-z0-9]+/);
});
test("Windows setup does not leak key, blocks missing credentials, and passes expected CLI arguments",
    {skip:process.platform!=="win32"},async()=>{
        const temporary=await mkdtemp(join(tmpdir(),"soloscape-tunnel-mock-"));
        try{
            const fake=join(temporary,"tunnel-client.cmd");
            const output=join(temporary,"args.txt");
            await writeFile(fake,'@echo off\r\necho %*>>"%MOCK_TUNNEL_LOG%"\r\nexit /b 0\r\n');
            const base={TUNNEL_CLIENT_BIN:fake,MOCK_TUNNEL_LOG:output,
                CONTROL_PLANE_API_KEY:"test_mock_super_secret_not_real",
                CONTROL_PLANE_TUNNEL_ID:"tunnel_0123456789abcdef0123456789abcdef"};
            const checked=invoke("check",base);
            assert.equal(checked.status,0,checked.stderr);
            assert.match(checked.stdout,/Tunnel ID configured: True/);
            assert.doesNotMatch(checked.stdout,/test_mock_super_secret_not_real|tunnel_0123456789abcdef/);
            const missing=invoke("configure",{...base,CONTROL_PLANE_API_KEY:""});
            assert.notEqual(missing.status,0);
            assert.match(missing.stderr,/CONTROL_PLANE_API_KEY/);
            assert.doesNotMatch(missing.stderr,/test_mock_super_secret_not_real/);
            for(const mode of ["configure","doctor","run"]){
                const result=invoke(mode,base);
                assert.equal(result.status,0,result.stderr);
                assert.doesNotMatch(result.stdout+result.stderr,/test_mock_super_secret_not_real/);
            }
            const lines=await readFile(output,"utf8");
            assert.match(lines,/init --sample sample_mcp_stdio_local --profile soloscape-original/);
            assert.match(lines,/--tunnel-id tunnel_0123456789abcdef0123456789abcdef/);
            assert.match(lines,/--mcp-command \"?node dev-bridge\/stdio\.mjs/);
            assert.match(lines,/dev-bridge\/stdio\.mjs/);
            assert.match(lines,/doctor --profile soloscape-original --explain/);
            assert.match(lines,/run --profile soloscape-original/);
            assert.doesNotMatch(lines,/test_mock_super_secret_not_real/);
        }finally{await rm(temporary,{recursive:true,force:true});}
    });
