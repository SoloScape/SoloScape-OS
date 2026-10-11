// Run the browser encoder against the actual installed rsprot decoder, not a JS replica.
import assert from "node:assert/strict";
import {mkdtemp,writeFile,unlink,rmdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {fixtureKey} from "../tests/helpers/login-fixtures.mjs";
import {encodeLogin} from "../browser/login-protocol.mjs";
import {SERVER_PACKETS} from "../browser/game-protocol.mjs";

const jars=process.env.SOLOSCAPE_RSPROT_LIB_DIR??fileURLToPath(new URL("../../Server/server/app/build/install/app/lib/",import.meta.url));
const java=process.env.JAVA_BIN??"java";
const directory=await mkdtemp(join(tmpdir(),"soloscape-login-oracle-"));
const keyPath=join(directory,"fixture.der"),packetPath=join(directory,"login.bin");
try{
    const {rsa,privateKey}=fixtureKey();
    await writeFile(keyPath,privateKey.export({format:"der",type:"pkcs8"}),{mode:0o600});
    for(const otp of ["","123456"]){
        const bytes=encodeLogin({username:"native-test",password:"fixture-only",otp,rsa,
            sessionId:Uint8Array.from(Buffer.from("123456789abcdef0","hex")),seed:[1,2,3,4],uuid:new Uint8Array(24).fill(0x5a),
            width:800,height:600,crcs:Array.from({length:23},(_,i)=>(0x12340000+i*0x01010101)>>>0)});
        await writeFile(packetPath,bytes);
        const result=spawnSync(java,["-cp",join(jars,"*"),fileURLToPath(new URL("../tests/fixtures/RsprotLoginOracle.java",import.meta.url)),
            packetPath,keyPath,otp?"otp":"none"],{encoding:"utf8",timeout:30000});
        if(result.error)throw result.error;
        assert.equal(result.status,0,"rsprot oracle failed: "+result.stderr);
        assert.match(result.stdout,/LOGIN_ORACLE_PASS/);
        const actual=new Map(result.stdout.trim().split(/\r?\n/).filter(line=>/^\d+ /.test(line)).map(line=>{
            const [opcode,size,name]=line.split(" ");return [Number(opcode),{name,size:Number(size)}];
        }));
        assert.deepEqual(actual,SERVER_PACKETS,"Generated packet table differs from installed revision-240 decoder");
        console.log(`Installed rsprot accepted ${otp?"OTP":"password"} login; all ${actual.size} packet definitions match`);
    }
}finally{
    // Only the two known synthetic fixture files are removed; no recursive filesystem operation.
    await unlink(keyPath).catch(error=>{if(error.code!=="ENOENT")throw error;});
    await unlink(packetPath).catch(error=>{if(error.code!=="ENOENT")throw error;});
    await rmdir(directory);
}
