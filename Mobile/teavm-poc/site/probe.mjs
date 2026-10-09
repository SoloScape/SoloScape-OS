const output=document.querySelector("#result");
let core;
try {
    core=await import("/teavm/bridge.js");
    if(core.revision()!==240||core.mapSquare(3200,3200)!==12850)
        throw new Error("Java revision/map-square check failed");
    const expected=0xcbf43926;
    if((core.crc32Hex("313233343536373839")>>>0)!==expected)
        throw new Error("TeaVM-compiled Java CRC32 self-test failed");
} catch(error) {
    output.textContent="TeaVM build unavailable: "+(error?.message||String(error))+
        "\nCompile with JDK 17+: npm run build:teavm";
    console.error("[teavm-poc]",error);
    throw error;
}
const start=performance.now();
output.textContent="PASS: TeaVM-compiled Java executes locally in this browser."+
    "\nOSRS revision: "+core.revision()+" | World square: "+core.mapSquare(3200,3200)+
    "\nStandard CRC32 self-test passed. No video streaming."+
    "\nTesting live JS5 master-index access…";
try {
    const [{NativeJs5Cache,crc32},{connectionConfig}]=await Promise.all([
        import("/native-js5.mjs"),import("/connection-config.mjs")]);
    const config=await connectionConfig;
    if(!config.gatewayUrl)throw new Error("SoloScape native gateway not configured");
    const cache=new NativeJs5Cache({revision:240,url:config.gatewayUrl,timeoutMs:4000});
    const master=await cache.fetchRawGroup(255,255);
    const hex=Array.from(master.container,b=>b.toString(16).padStart(2,"0")).join("");
    const javaCrc=core.crc32Hex(hex)>>>0,jsCrc=crc32(master.container);
    if(javaCrc!==jsCrc)throw new Error("TeaVM Java CRC32 differs from native JS5 CRC32");
    output.textContent+="\nPASS: Live JS5 master-index container: "+master.container.length+" bytes"+
        "\nJava CRC32 = native JS5 CRC32: 0x"+javaCrc.toString(16).padStart(8,"0")+
        "\nElapsed: "+Math.round(performance.now()-start)+" ms";
} catch(error) {
    output.textContent+="\nLive JS5 optional test unavailable: "+(error?.message||String(error))+
        "\nStart the native SoloScape gateway to run the real archive check.";
    console.warn("[teavm-poc] JS5 gateway not ready:",error);
}
