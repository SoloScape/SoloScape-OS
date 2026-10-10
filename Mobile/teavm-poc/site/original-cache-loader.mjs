// Hydrate only the pinned original Java cache, never reconstructed JS gameplay.
// Stream files into their final browser buffers instead of constructing a
// second ~238MB intermediate ArrayBuffer or fetching all indices concurrently.
const nativeName=/^main_file_cache\.(?:dat2|idx(?:255|[0-9]|1[0-9]|2[0-4]))$/;
const maxSingle=512*1024*1024;
const cachePrefix="/home/soloscape/jagexcache/oldschool/LIVE/";

export async function readCacheResponse(response,expected,{onProgress=()=>{}}={}){
    if(!response?.ok)throw new Error("Original cache request failed");
    if(!Number.isSafeInteger(expected)||expected<0||expected>maxSingle)
        throw new Error("Invalid original cache size");
    if(!response.body||typeof response.body.getReader!=="function"){
        const buffer=await response.arrayBuffer();
        if(buffer.byteLength!==expected)throw new Error("Incomplete original cache file");
        onProgress(expected);
        return new Uint8Array(buffer);
    }
    // One final destination allocation; byte chunks can be GC'd as read.
    const result=new Uint8Array(expected);
    const reader=response.body.getReader();
    let filled=0,reported=0;
    try{
        while(true){
            const {done,value}=await reader.read();
            if(done)break;
            if(!value)continue;
            if(filled+value.byteLength>expected)
                throw new Error("Original cache file exceeded declared length");
            result.set(value,filled);
            filled+=value.byteLength;
            if(filled-reported>=2*1024*1024||filled===expected){
                onProgress(filled);
                reported=filled;
            }
        }
    }catch(error){
        await reader.cancel().catch(()=>{});
        throw error;
    }finally{reader.releaseLock();}
    if(filled!==expected)throw new Error("Incomplete original cache file");
    onProgress(filled);
    return result;
}

export async function loadOriginalCache(manifest,{
    fetchFile=name=>fetch("/original-cache/"+name),
    onProgress=()=>{}
}={}){
    if(!Array.isArray(manifest?.files)||manifest.files.length>27)
        throw new Error("Invalid local cache manifest");
    const names=new Set();
    for(const file of manifest.files){
        if(!file||!nativeName.test(file.name)||names.has(file.name)||
           !Number.isSafeInteger(file.bytes)||file.bytes<0||file.bytes>maxSingle)
            throw new Error("Invalid native cache entry");
        names.add(file.name);
    }
    const total=manifest.files.reduce((sum,f)=>sum+f.bytes,0);
    const files=new Map();
    let completed=0;
    // Fetch one file at a time. This avoids a second whole-cache copy in
    // concurrent Safari WebKit responses and keeps on-screen progress live.
    for(const file of manifest.files){
        onProgress({name:file.name,loaded:completed,total});
        const response=await fetchFile(file.name);
        if(!response?.ok)throw new Error("Native cache source unavailable: "+file.name);
        const data=await readCacheResponse(response,file.bytes,{
            onProgress:bytes=>onProgress({name:file.name,loaded:completed+bytes,total})
        });
        files.set(cachePrefix+file.name,data);
        completed+=file.bytes;
    }
    for(let i=0;i<=24;i++){
        const name=cachePrefix+"main_file_cache.idx"+i;
        if(!files.has(name))files.set(name,new Uint8Array(0));
    }
    onProgress({name:"complete",loaded:completed,total});
    return files;
}
