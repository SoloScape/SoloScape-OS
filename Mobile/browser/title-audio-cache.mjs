// Asynchronous verified JS5 reads behind TSPS's synchronous music cache API.
import {verifiedCatalog,decodeGroup} from "./location-cache.mjs";
import {unpackArchiveFiles} from "./floor-materials.mjs";
export const IndexType={DAT2:{soundEffects:4,musicTracks:6,musicJingles:11,musicSamples:14,musicPatches:15}};
class CachePending extends Error{constructor(pending){super("Music cache group pending");this.pending=pending;}}
export async function retryOnMissingGroup(read){
    for(let n=0;n<8;n++)try{return read();}catch(error){if(!error.pending)throw error;await error.pending;}
    throw new Error("Music cache retry budget exceeded");
}
export class NativeAudioCache{
    constructor(cache){this.cache=cache;this.catalogs=new Map();this.files=new Map();this.pending=new Map();this.indices=new Map();}
    async prepare(){for(const index of [4,6,14,15])this.catalogs.set(index,await verifiedCatalog(this.cache,index));}
    preload(index,group){
        const key=index+":"+group;
        if(this.files.has(key))return Promise.resolve(this.files.get(key));
        if(!this.pending.has(key)){
            const promise=(async()=>{
                const ids=this.catalogs.get(index)?.fileIdsForGroup.get(group);if(!ids?.length)throw new Error("Missing music cache group "+key);
                if(this.files.size>=256)throw new Error("Music group budget exceeded");
                const files=unpackArchiveFiles(await decodeGroup(await this.cache.loadGroup(index,group)),ids,new Set(ids));
                this.files.set(key,files);return files;
            })();this.pending.set(key,promise);promise.finally(()=>this.pending.delete(key)).catch(()=>{});
        }
        return this.pending.get(key);
    }
    getIndex(index){
        if(!this.indices.has(index)){
            const catalog=()=>{const c=this.catalogs.get(index);if(!c)throw new Error("Music catalog is not ready");return c;};
            const getFile=(group,file)=>{
                const files=this.files.get(index+":"+group);if(!files)throw new CachePending(this.preload(index,group));
                const data=files.get(file);return data?{data:new Int8Array(data.buffer,data.byteOffset,data.byteLength)}:null;
            };
            this.indices.set(index,{getFile,getFileSmart:id=>{
                const c=catalog();if(c.ids.length===1)return getFile(c.ids[0],id);
                const ids=c.fileIdsForGroup.get(id);if(ids?.length!==1)return null;return getFile(id,ids[0]);
            },getArchiveCount:()=>catalog().ids.length,getFileCount:id=>catalog().fileIdsForGroup.get(id)?.length??0});
        }
        return this.indices.get(index);
    }
}
