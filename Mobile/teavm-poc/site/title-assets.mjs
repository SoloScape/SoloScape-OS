// Minimal revision-240 title asset loader, independent of the legacy game's
// login state/audio/animation modules. All bytes come from CRC-verified JS5.
import {verifiedCatalog,decodeGroup} from "/location-cache.mjs";
import {unpackArchiveFiles} from "/floor-materials.mjs";
import {djb2} from "/terrain-world.mjs";
import {decodeIndexedSprites} from "/sprite-preview.mjs";

export const TITLE_FILES=Object.freeze({
    background:{archive:10,name:"titlewide.jpg"},
    logo:{archive:8,name:"logo"},
    titlebox:{archive:8,name:"titlebox"},
    titlebutton:{archive:8,name:"titlebutton"},
});

export async function namedTitleAsset(cache,index,name){
    const catalog=await verifiedCatalog(cache,index);
    const group=catalog.names.get(djb2(name));
    if(group===undefined)throw new Error("Revision-240 cache title asset missing: "+name);
    const ids=catalog.fileIdsForGroup.get(group);
    if(ids?.length!==1)throw new Error("Unexpected title file count for "+name);
    const decoded=await decodeGroup(await cache.loadGroup(index,group));
    const files=unpackArchiveFiles(decoded,ids,new Set(ids));
    const bytes=files.get(ids[0]);
    if(!(bytes instanceof Uint8Array)||bytes.length<1)throw new Error("Empty title asset "+name);
    return bytes;
}

export function spriteToCanvas(frame,documentRef=document){
    if(!frame||!Number.isInteger(frame.sheetWidth)||!Number.isInteger(frame.sheetHeight)||
        frame.sheetWidth<=0||frame.sheetHeight<=0)throw new Error("Invalid original title sprite");
    const canvas=documentRef.createElement("canvas");
    canvas.width=frame.sheetWidth;
    canvas.height=frame.sheetHeight;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Canvas2D is unavailable");
    const data=ctx.createImageData(frame.width,frame.height);
    data.data.set(frame.rgba);
    ctx.putImageData(data,frame.x,frame.y);
    return canvas;
}

export async function loadTitleSprites(cache,documentRef=document){
    const names=["logo","titlebox","titlebutton"];
    const sprites=await Promise.all(names.map(async name=>{
        const bytes=await namedTitleAsset(cache,8,name);
        const decoded=decodeIndexedSprites(bytes);
        if(!decoded.length)throw new Error("Original title sprite has no frames: "+name);
        return [name,spriteToCanvas(decoded[0],documentRef)];
    }));
    return Object.fromEntries(sprites);
}
