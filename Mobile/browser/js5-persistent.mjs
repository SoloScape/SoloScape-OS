// Optional, origin-scoped browser CacheStorage for public revision-240 JS5
// containers. The caller MUST validate every stored container against the
// current gateway's CRC-verified reference table before consuming it.
// No credentials, XTEA keys, packets or user account data are ever stored.
export class BrowserJs5Storage {
    constructor({revision=240,storage=globalThis.caches,
        origin=globalThis.location?.origin}={}){
        this.revision=revision;this.storage=storage;
        this.origin=typeof origin==="string"&&/^https?:\/\/[^/]+$/.test(origin)?origin:null;
        this.opened=null;
    }
    get available(){return !!this.origin&&typeof this.storage?.open==="function";}
    key(index,group,crc){
        return this.origin+"/__soloscape_js5_cache__/v"+this.revision+"/"+
            index+"/"+group+"/"+(crc>>>0).toString(16);
    }
    async cache(){
        if(!this.available)return null;
        if(!this.opened)this.opened=this.storage.open("soloscape-js5-verified-v"+this.revision);
        return this.opened;
    }
    async get(index,group,crc){
        try{
            const store=await this.cache();if(!store)return null;
            const response=await store.match(this.key(index,group,crc));
            if(!response||!response.ok)return null;
            const length=Number(response.headers.get("content-length"))||0;
            if(length>2*1024*1024)return null;
            const bytes=new Uint8Array(await response.arrayBuffer());
            return bytes.length>=5&&bytes.length<=2*1024*1024?bytes:null;
        }catch{return null;} // Private mode or storage quota denial must never block login.
    }
    async put(index,group,crc,bytes){
        try{
            const store=await this.cache();if(!store)return false;
            await store.put(this.key(index,group,crc),
                new Response(bytes.slice(),{headers:{"content-type":"application/octet-stream"}}));
            return true;
        }catch{return false;}
    }
    async remove(index,group,crc){
        try{return !!(await this.cache())?.delete(this.key(index,group,crc));}
        catch{return false;}
    }
}
