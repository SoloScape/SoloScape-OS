import {GPU_SETTINGS} from "./world-webgl.mjs";

const finite=n=>{if(!Number.isFinite(n))throw new Error("Capture requires finite camera values");return n;};
const actorState=actor=>Object.fromEntries(["index","type","x","y","plane","orientation","locomotionId","locomotionFrame",
    "actionId","actionFrame"].filter(key=>actor[key]!==undefined).map(key=>[key,actor[key]]));
export function captureManifest({viewport,gameplay,cache},{frameId,serverTick,clientCycle}={}){
    if(typeof frameId!=="string"||!frameId.trim()||frameId.length>128||
        !Number.isSafeInteger(serverTick)||serverTick<0||!Number.isSafeInteger(clientCycle)||clientCycle<0)
        throw new Error("Capture requires an explicit frameId, serverTick and clientCycle");
    if(!gameplay?.ready||gameplay.loading||!gameplay.origin||!gameplay.rebuild||!cache?.master?.length)
        throw new Error("Capture requires a ready scene and verified cache manifest");
    const {canvas}=viewport,local=gameplay.sync?.local;
    if(!local)throw new Error("Capture requires local world position");
    const {zoneX,zoneY,baseX,baseY,instance=false,templates=[]}=gameplay.rebuild;
    return {schema:"soloscape-render-capture-v1",source:"soloscape-mobile",capturedAt:new Date().toISOString(),
        match:{frameId,serverTick,clientCycle,
            cache:{revision:cache.revision,archives:cache.master.map(({archive,crc,revision})=>({archive,crc,revision}))},
            viewport:{width:canvas.width,height:canvas.height,cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight},
            camera:{target:viewport.target.map(finite),yaw:finite(viewport.yaw),pitch:finite(viewport.pitch),distance:finite(viewport.distance),
                origin:{mapX:gameplay.origin.mapX,mapY:gameplay.origin.mapY}},
            scene:{zoneX,zoneY,baseX,baseY,instance,templates:templates.map(({plane,x,y,packed})=>({plane,x,y,packed})),
                player:{x:local.x,y:local.y,plane:local.plane,orientation:local.orientation},
                actors:{player:actorState(gameplay.playerController?.sample?.(gameplay.localServerId)||local),
                    npcs:[...(gameplay.npcs?.npcs?.values()??[])].map(actorState).sort((a,b)=>a.index-b.index),
                    scenery:(gameplay.sceneAnimations?.entries??[]).flatMap(entry=>entry.resolve?entry.children??[]:[entry]).map(entry=>({id:entry.loc.id,
                        definitionId:entry.definition.id,x:entry.loc.x,y:entry.loc.y,
                        plane:entry.loc.plane,regionX:entry.terrain.mapX,regionY:entry.terrain.mapY,
                        sequence:entry.definition.seqId,frame:entry.lastFrame})),
                    appearance:local.appearance?{equipment:local.appearance.equipment,colours:local.appearance.colours,
                        gender:local.appearance.gender,transformedNpcId:local.appearance.transformedNpcId}:null},
                varps:[...(gameplay.interfaces?.varps??new Map())].sort((a,b)=>a[0]-b[0]),
                regions:[...gameplay.regions.keys()].sort()},
            settings:{...Object.fromEntries(Object.keys(GPU_SETTINGS).map(key=>[key,viewport.gpuSettings?.[key]??GPU_SETTINGS[key]])),visibleLevel:viewport.visibleLevel,
                roofLevel:viewport.visibleRoofLevel(),touch:viewport.touch,drawMode:viewport.drawMode,
                antialias:viewport.gl.getContextAttributes()?.antialias??false,
                textureElapsedMs:viewport.frameTime}},
        diagnostics:{packetCount:gameplay.packetCount,sceneWarnings:gameplay.sceneWarnings?.length??0,
            animatedLocationErrors:gameplay.sceneAnimations?.errors?.length??0}};
}

/** Explicit developer export: no persistent framebuffer and no account/session serialization. */
export async function captureWorldFrame(context,options){
    const {viewport}=context;
    if(!viewport?.gl||viewport.disposed)throw new Error("No active WebGL viewport");
    viewport.render();
    const manifest=captureManifest(context,options),{width,height}=viewport.canvas;
    if(!width||!height||width*height>16777216)throw new Error("Invalid capture dimensions");
    const gl=viewport.gl,pixels=new Uint8Array(width*height*4);
    gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d"),data=ctx.createImageData(width,height);
    for(let y=0;y<height;y++)data.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);
    ctx.putImageData(data,0,0);
    const png=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("PNG encoding failed")),"image/png"));
    return {png,manifest,json:JSON.stringify(manifest,null,2)+"\n"};
}

export function downloadWorldCapture({png,json},name="world-capture"){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(name))throw new Error("Invalid capture filename");
    for(const [blob,extension] of [[png,"png"],[new Blob([json],{type:"application/json"}),"json"]]){
        const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${name}.${extension}`;
        a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
}
