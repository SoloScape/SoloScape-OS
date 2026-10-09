/**
 * Real revision-240 cache geometry -> TeaVM Java model projection ->
 * the original rev-240 yw.fn software rasterizer -> HTML Canvas.
 * No substitute geometry or drawing canvas triangles in JS.
 */
import {NativeJs5Cache} from "/native-js5.mjs";
import {decodeGroup} from "/location-cache.mjs";
import {decodeModel} from "/scenery-models.mjs";
import {HSL_PALETTE} from "/floor-lighting.mjs";
import {serializeModel} from "/teavm/model-payload.mjs";
import {connectionConfig} from "/connection-config.mjs";

const status=document.querySelector("#model-status");
const canvas=document.querySelector("#model-canvas");
const idInput=document.querySelector("#model-id");
const yawInput=document.querySelector("#model-yaw");
const yawLabel=document.querySelector("#model-yaw-value");
const loadButton=document.querySelector("#load-model");
const ctx=canvas.getContext("2d");
let current=null,cache=null,busy=false;
const say=message=>{status.textContent=message;};

function toCanvas(rgb){
    const width=256,height=160;
    if(typeof rgb!=="string"||rgb.length!==width*height*6||!/^[0-9a-f]+$/.test(rgb))
        throw new Error("TeaVM returned invalid model framebuffer");
    const data=ctx.createImageData(width,height);
    for(let i=0,j=0;i<rgb.length;i+=6,j+=4){
        data.data[j]=parseInt(rgb.slice(i,i+2),16);
        data.data[j+1]=parseInt(rgb.slice(i+2,i+4),16);
        data.data[j+2]=parseInt(rgb.slice(i+4,i+6),16);
        data.data[j+3]=255;
    }
    ctx.putImageData(data,0,0);
    canvas.hidden=false;
}
export function startModelViewer(core){
    if(!core||typeof core.renderModelHex!=="function")throw new Error("TeaVM model renderer export missing");
    // The compiled module stays in closure scope rather than global state.
    const render=(model)=>{
        const yaw=Number(yawInput.value);
        const started=performance.now();
        toCanvas(core.renderModelHex(model.vertices,model.faces,yaw));
        yawLabel.textContent=yaw+"°";
        say("PASS: real rev-240 JS5 model "+model.id+" | "+model.vertexCount+" vertices | "+
            model.renderedFaces+" opaque faces ("+model.skippedFaces+" unsupported faces omitted). "+
            "Java model projection, original rev-240 2D span fills: "+
            Math.round(performance.now()-started)+" ms.");
    };
    // Called only by the page owner; no other global references.
    const button=async()=>{
        if(busy)return;
        busy=true;loadButton.disabled=true;
        try{
            const config=await connectionConfig;
            if(!config.gatewayUrl)throw new Error("Native JS5 gateway unavailable");
            if(!cache)cache=new NativeJs5Cache({revision:240,url:config.gatewayUrl,timeoutMs:10000});
            const index=await cache.loadIndex(7);
            const selected=Number(idInput.value);
            if(!Number.isInteger(selected)||selected<0||selected>65535)throw new Error("Invalid model group ID");
            const groups=Array.from(index.groups.keys());
            const ids=[selected,...groups.filter(id=>id>selected).slice(0,10),
                ...groups.filter(id=>id<selected).slice(0,10)];
            let found=null;
            for(const id of ids.slice(0,14)){
                if(!index.groups.has(id))continue;
                say("Loading and checking JS5 model 7:"+id+"...");
                try {
                    const parsed=decodeModel(await decodeGroup(await cache.loadGroup(7,id)));
                    const packed=serializeModel(parsed,HSL_PALETTE);
                    if(packed.renderedFaces<20||packed.renderedFaces>3000)continue;
                    found={...packed,id};break;
                }catch(error){console.warn("[teavm-model] skipped",id,error);}
            }
            if(!found)throw new Error("No suitable revision-240 model near "+selected);
            current=found;idInput.value=String(found.id);render(found);
        }catch(error){
            say("Model unavailable: "+(error?.message||String(error)));
            console.warn("[teavm-model]",error);
        }finally{busy=false;loadButton.disabled=false;}
    };
    loadButton.addEventListener("click",button);
    yawInput.addEventListener("change",()=>{if(current&&!busy){try{render(current);}catch(error){say(error.message);}}});
    yawLabel.textContent=yawInput.value+"°";
    void button(); // Automatically display a real cache model when available.
}
