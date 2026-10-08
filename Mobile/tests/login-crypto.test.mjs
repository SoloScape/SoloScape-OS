import assert from "node:assert/strict";
import {test} from "node:test";
import {createHash,privateDecrypt,constants} from "node:crypto";
import {IsaacCipher,xteaEncrypt,rsaEncrypt,validateRsaPublicKey} from "../browser/login-crypto.mjs";
import {encodeLogin,loginCacheCrcs,loginString,decodeLoginSuccess} from "../browser/login-protocol.mjs";
import {solveProofOfWork,decodeProofOfWork,encodeProofOfWorkReply} from "../browser/login-pow.mjs";
import {loadPublicLoginConfig} from "../scripts/native-login-config.mjs";
import {mkdtemp,writeFile,unlink,rmdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fixtureKey} from "./helpers/login-fixtures.mjs";
test("ISAAC agrees with installed rsprot JVM vectors across eight refill blocks",()=>{
    const seeds=[[0,0,0,0],[1,2,3,4],[-1,-2147483648,2147483647,0x12345678]];
    const hashes=["c693d5df495301fccddf73fab174e13dfb2e1bbc2596bed754320218cee4295c",
        "a40a2a449cc3ce2f83ea0955cb98a502f5bfbe159bf2f3cebef2fea0b1f76ba6",
        "5749ef8bec8dc9ef750fc724e91736b6e84d0d54680149212ae468e288b4bb64"];
    for(let s=0;s<seeds.length;s++){
        const cipher=new IsaacCipher(seeds[s]),bytes=Buffer.alloc(2048*4);
        for(let i=0;i<2048;i++)bytes.writeInt32BE(cipher.nextInt(),i*4);
        assert.equal(createHash("sha256").update(bytes).digest("hex"),hashes[s]);
        cipher.clear();assert.ok(cipher.memory.every(n=>n===0));assert.ok(cipher.results.every(n=>n===0));
    }
});
test("XTEA matches a known zero-key vector and leaves an incomplete native tail alone",()=>{
    const input=new Uint8Array(11);input.set([9,8,7],8);
    const out=xteaEncrypt(input,[0,0,0,0]);
    assert.equal(Buffer.from(out.slice(0,8)).toString("hex"),"dee9d4d8f7131ed9");
    assert.deepEqual([...out.slice(8)],[9,8,7]);assert.deepEqual([...input.slice(0,8)],Array(8).fill(0));
    assert.throws(()=>xteaEncrypt(input,[0,1,2]),/four/);
});
test("native raw RSA decrypts with Node's independent implementation, including signed ciphertext",()=>{
    const {rsa,privateKey}=fixtureKey();
    for(let i=0;i<40;i++){
        const plain=Uint8Array.from([1,2,3,i,255]),cipher=rsaEncrypt(plain,rsa);
        assert.equal(cipher[0]&128,0);
        const padded=Buffer.alloc(128);padded.set(cipher.slice(-128),128-Math.min(128,cipher.length));
        const decrypted=privateDecrypt({key:privateKey,padding:constants.RSA_NO_PADDING},padded);
        assert.deepEqual([...decrypted.slice(-plain.length)],[...plain]);
    }
    assert.throws(()=>validateRsaPublicKey({exponent:"1",modulus:rsa.modulus}),/Invalid/);
});
test("login strings preserve CP1252, reject unsupported/NUL characters and enforce lengths",()=>{
    assert.deepEqual([...loginString("€é",3,"Password")],[128,233,0]);
    for(const text of ["a\0b","🙂",""]){assert.throws(()=>loginString(text,80,"Password"),/Password/);}
});
test("login preflight rejects wrong revision, missing CRCs, bad OTP and oversized RSA payloads",()=>{
    const {rsa}=fixtureKey(),data={username:"native-test",password:"fixture-only",rsa,
        sessionId:new Uint8Array(8),seed:[1,2,3,4],uuid:new Uint8Array(24),crcs:Array(23).fill(0)};
    const packet=encodeLogin(data);assert.equal(packet[0],16);
    assert.equal((packet[1]<<8)|packet[2],packet.length-3);assert.equal(new DataView(packet.buffer).getUint32(3),240);
    for(const change of [{revision:239},{crcs:[]},{otp:"123"},{width:0},{password:"x".repeat(81)}])
        assert.throws(()=>encodeLogin({...data,...change}));
    assert.deepEqual(loginCacheCrcs(Array.from({length:25},(_,archive)=>({archive,crc:archive}))),Array.from({length:23},(_,i)=>i));
    assert.throws(()=>loginCacheCrcs([]),/0–22/);
});
test("login success consumes ISAAC only for a supplied authenticator token",()=>{
    const metadata=new Uint8Array(34);metadata[8]=42;const cipher={count:0,nextInt(){this.count++;return 1;}};
    assert.equal(decodeLoginSuccess(metadata,cipher).playerIndex,42);assert.equal(cipher.count,0);
    metadata[0]=1;decodeLoginSuccess(metadata,cipher);assert.equal(cipher.count,4);
    metadata[8]=0;assert.throws(()=>decodeLoginSuccess(metadata,cipher),/player index/);
});
test("SHA-256 login challenge solves rsprot's hexadecimal base/nonce format and supports cancellation",async()=>{
    const challenge=Uint8Array.from([0,1,8,...Buffer.from("fixture-salt"),0]);
    const solution=await solveProofOfWork(challenge);
    const digest=createHash("sha256").update("18fixture-salt"+solution.toString(16)).digest();
    assert.equal(digest[0],0);
    const reply=encodeProofOfWorkReply(solution);assert.deepEqual([...reply.slice(0,3)],[19,0,8]);
    assert.equal(new DataView(reply.buffer).getBigUint64(3),solution);
    assert.throws(()=>decodeProofOfWork(Uint8Array.of(1,1,8,0)),/Unsupported/);
    const controller=new AbortController();controller.abort();
    await assert.rejects(solveProofOfWork(challenge,{signal:controller.signal}),/cancelled/);
});
test("preview configuration accepts only the public client.key, validates gateway and refuses PEM private keys",async()=>{
    const dir=await mkdtemp(join(tmpdir(),"soloscape-public-login-")),path=join(dir,"client.key");
    try{
        const {rsa}=fixtureKey();await writeFile(path,`Exponent: ${rsa.exponent}\nModulus: ${rsa.modulus}\n`);
        const config=await loadPublicLoginConfig({keyPath:path});assert.deepEqual(config.rsa,rsa);assert.equal(config.revision,240);
        await assert.rejects(loadPublicLoginConfig({keyPath:path,gatewayUrl:"ws://example.com/"}),/loopback/);
        await writeFile(path,"-----BEGIN PRIVATE KEY-----\nfixture\n-----END PRIVATE KEY-----");
        await assert.rejects(loadPublicLoginConfig({keyPath:path}),/public client.key/);
    }finally{await unlink(path);await rmdir(dir);}
});
