import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {request} from 'node:http';
import {createServer} from 'node:net';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
import {publicOriginalConfig,createPublicOriginalServer} from '../scripts/public-original-server.mjs';
import {createGateway} from '../gateway/server.mjs';
const env={SOLOSCAPE_PUBLIC_ENABLE:'1',SOLOSCAPE_PUBLIC_ORIGIN:'https://play.example.test'};
const config=publicOriginalConfig(env);
const rsa={exponent:'10001',modulus:'a'.repeat(256)};
function get(port,path,host=config.host,method='GET'){
    return new Promise((resolve,reject)=>{
        const req=request({hostname:'127.0.0.1',port,path,method,headers:{host}},res=>{
            const chunks=[];res.on('data',chunk=>chunks.push(chunk));
            res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
        });req.on('error',reject);req.end();
    });
}
test('external hosting requires explicit opt-in and a canonical HTTPS origin',()=>{
    assert.throws(()=>publicOriginalConfig({}),/opt-in/);
    for(const origin of ['http://play.example.test','https://*.example.test','https://play.example.test/','https://u:p@play.example.test','https://play.example.test/path','https://play.example.test?q=1'])
        assert.throws(()=>publicOriginalConfig({...env,SOLOSCAPE_PUBLIC_ORIGIN:origin}),/HTTPS origin/);
    for(const port of ['43594','43595','3097','0','NaN'])
        assert.throws(()=>publicOriginalConfig({...env,SOLOSCAPE_PUBLIC_PORT:port}));
    assert.equal(config.gatewayUrl,'wss://play.example.test/');
});
test('public host serves original assets and WSS routes but excludes all diagnostic/private routes',async()=>{
    const visited=[];
    const gateway=createPublicOriginalServer({config,loginRsaPublic:rsa,read:async path=>{
        visited.push(path.replaceAll('\\','/'));
        return path.endsWith('.html')?Buffer.from('<body><canvas></canvas>'):Buffer.from('fixture');
    }});
    gateway.httpServer.listen(0,'127.0.0.1');await once(gateway.httpServer,'listening');
    const port=gateway.httpServer.address().port;
    try{
        const page=await get(port,'/');assert.equal(page.status,200);
        assert.match(page.body.toString(),/data-public-game="true"/);
        assert.match(page.headers['content-security-policy'],/wss:\/\/play.example.test\//);
        assert.doesNotMatch(page.headers['content-security-policy'],/ws:\/\//);
        assert.equal((await get(port,'/engine.js')).status,200);
        assert.ok(visited.some(path=>path.endsWith('/javascript/engine.js')));
        const routes=JSON.parse((await get(port,'/original-gateway')).body).routes;
        assert.ok(routes.every(route=>route.url===config.gatewayUrl&&route.host==='127.0.0.1'));
        assert.deepEqual(JSON.parse((await get(port,'/original-login-public-key')).body),rsa);
        for(const path of ['/original-session-diagnostics','/original-lifecycle','/original-public-config','/dev-bridge/stdio.mjs','/Server/.data/client.key','/original-login-private-key','/engine.js?x=1'])
            assert.equal((await get(port,path)).status,404,path);
        assert.equal((await get(port,'/original-lifecycle',config.host,'POST')).status,404);
        assert.equal((await get(port,'/','untrusted.example')).status,403);
    }finally{await gateway.close();}
});
test('public cache serves only fixed read-only client files',async()=>{
    const root=await mkdtemp(join(tmpdir(),'soloscape-public-cache-'));
    const cache=Buffer.from([4,5,6]);await writeFile(join(root,'main_file_cache.idx255'),cache);
    await writeFile(join(root,'private.txt'),'not a client asset');
    const gateway=createPublicOriginalServer({config,loginRsaPublic:rsa,nativeCacheRoot:root});
    gateway.httpServer.listen(0,'127.0.0.1');await once(gateway.httpServer,'listening');
    const port=gateway.httpServer.address().port;
    try{
        assert.deepEqual(JSON.parse((await get(port,'/original-cache/manifest')).body).files,[{name:'main_file_cache.idx255',bytes:3}]);
        assert.deepEqual((await get(port,'/original-cache/main_file_cache.idx255')).body,cache);
        for(const path of ['/original-cache/private.txt','/original-cache/../private.txt','/original-cache/main_file_cache.idx256'])
            assert.equal((await get(port,path)).status,404);
        assert.deepEqual(await readFile(join(root,'main_file_cache.idx255')),cache);
    }finally{await gateway.close();await rm(root,{recursive:true,force:true});}
});
test('public-origin WebSockets bridge native traffic and reject other origins and Hosts',async()=>{
    const sockets=new Set();const tcp=createServer(socket=>{
        sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('data',data=>socket.write(data));
    });tcp.listen(0,'127.0.0.1');await once(tcp,'listening');
    const gateway=createPublicOriginalServer({config:{...config,tcpPort:tcp.address().port},loginRsaPublic:rsa});
    gateway.httpServer.listen(0,'127.0.0.1');await once(gateway.httpServer,'listening');
    const address='ws://127.0.0.1:'+gateway.httpServer.address().port+'/';
    try{
        for(const [origin,host] of [['https://other.example',config.host],[config.origin,'other.example'],[undefined,config.host]]){
            const ws=new WebSocket(address,{origin,headers:{Host:host}});
            const [error]=await once(ws,'error');assert.match(error.message,/403/);
        }
        const ws=new WebSocket(address,{origin:config.origin,headers:{Host:config.host}});
        await once(ws,'open');const reply=once(ws,'message');
        const sent=Buffer.from([15,0,0,0,240]);ws.send(sent);
        assert.deepEqual((await reply)[0],sent);ws.close();await once(ws,'close');
    }finally{await gateway.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>tcp.close(resolve));}
});
test('public gateway bounds idle handshakes and total connections',async()=>{
    const gateway=createGateway({tcpHost:'127.0.0.1',tcpPort:43594,
        allowedOrigins:new Set([config.origin]),maxConnections:1,handshakeTimeoutMs:150});
    gateway.httpServer.listen(0,'127.0.0.1');await once(gateway.httpServer,'listening');
    const address='ws://127.0.0.1:'+gateway.httpServer.address().port+'/';
    try{
        const ws=new WebSocket(address,{origin:config.origin});await once(ws,'open');
        const closed=once(ws,'close');const extra=new WebSocket(address,{origin:config.origin});
        assert.match((await once(extra,'error'))[0].message,/503/);
        const [code,reason]=await closed;assert.equal(code,1008);assert.equal(reason.toString(),'Handshake timeout');
    }finally{await gateway.close();}
});
