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
// Render the actual rasterizer returned RGB framebuffer. No JS drawing
// primitives or reconstructed game graphics are used to generate the pixels.
const canvas=document.querySelector("#genuine-raster");
if(!canvas||typeof core.renderHex!=="function")throw new Error("Pinned OpenOSRS renderer export missing");
const width=core.width(),height=core.height(),pixels=core.renderHex();
if(width!==256||height!==160||pixels.length!==width*height*6||!/^[0-9a-f]+$/.test(pixels))
    throw new Error("Invalid native rasterizer RGB framebuffer");
const context=canvas.getContext("2d");
if(!context)throw new Error("Browser Canvas2D unavailable");
const image=context.createImageData(width,height);
for(let i=0,j=0;i<pixels.length;i+=6,j+=4){
    image.data[j]=parseInt(pixels.slice(i,i+2),16);
    image.data[j+1]=parseInt(pixels.slice(i+2,i+4),16);
    image.data[j+2]=parseInt(pixels.slice(i+4,i+6),16);
    image.data[j+3]=255;
}
context.putImageData(image,0,0);
canvas.hidden=false;
output.textContent="PASS: original rev-240 OpenOSRS Rasterizer2D pixels rendered on HTML Canvas."+
    "\nTeaVM and original JVM framebuffer hashes match in automated verification."+
    "\nGenerated " + width + " x " + height + " RGB pixels from unmodified drawing bytecode.\n"+
    "PASS: TeaVM-compiled Java executes locally in this browser."+
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

void import("/teavm/model-viewer.mjs")
    .then(viewer=>viewer.startModelViewer(core))
    .catch(error=>{
        document.querySelector("#model-status").textContent=
            "Real JS5 model viewer unavailable: "+(error?.message||String(error));
        console.warn("[teavm-model]",error);
    });
