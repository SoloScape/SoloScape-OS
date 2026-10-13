// Use TSPS's original decoder for OSRS's custom Vorbis sample format.
import {VorbisSample,initVorbisSetup,isSetupInitialized} from "./title-audio-vorbis-sample.mjs";
import {retryOnMissingGroup} from "./title-audio-cache.mjs";
export async function loadVorbisSample(cache,group,file){
    if(group===0&&file===0)return null;
    const index=cache.getIndex(14);
    if(!isSetupInitialized()){
        const setup=await retryOnMissingGroup(()=>index.getFile(0,0));
        if(!setup)throw new Error("Music Vorbis setup missing");initVorbisSetup(new Uint8Array(setup.data.buffer,setup.data.byteOffset,setup.data.byteLength));
    }
    const data=await retryOnMissingGroup(()=>index.getFile(group,file));
    if(!data)throw new Error("Music sample missing");
    return new VorbisSample(new Uint8Array(data.data.buffer,data.data.byteOffset,data.data.byteLength)).toRawSound();
}
