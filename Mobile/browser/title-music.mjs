import {NativeAudioCache} from "./title-audio-cache.mjs";
import {RealtimeMidiSynth} from "./title-audio-realtime-midi-synth.mjs";
import {djb2} from "./terrain-world.mjs";
export class NativeTitleMusic{
    constructor(cache,{onStatus=()=>{}}={}){this.cache=new NativeAudioCache(cache);this.onStatus=onStatus;this.muted=false;this.visible=true;this.generation=0;}
    async prepare(){
        await this.cache.prepare();this.track=this.cache.catalogs.get(6).names.get(djb2("scape main"));
        if(this.track===undefined)throw new Error("Scape Main is missing from the revision-240 cache");
        await this.cache.preload(6,this.track);
    }
    async unlock(){
        if(!this.visible||this.muted||this.loading||this.loaded||this.track===undefined)return;
        const generation=this.generation;this.loading=true;
        const synth=this.synth??=new RealtimeMidiSynth(this.cache);
        try{
            if(!await synth.loadTrack(this.track))throw new Error("Scape Main could not load");
            if(!this.visible||generation!==this.generation)return;
            this.loaded=true;synth.setVolume(this.muted?0:.5);synth.setLooping(true);synth.play();
        }catch(error){if(this.visible)this.onStatus("Music unavailable: "+error.message);}
        finally{this.loading=false;if(generation!==this.generation){synth.dispose();if(this.synth===synth)this.synth=null;this.loaded=false;}}
    }
    toggle(){this.muted=!this.muted;this.synth?.setVolume(this.muted?0:.5);if(!this.muted)void this.unlock();return this.muted;}
    hide(){this.visible=false;this.generation++;this.synth?.stop();this.loaded=false;if(!this.loading){this.synth?.dispose();this.synth=null;}}
    show(){this.visible=true;}
    dispose(){this.hide();}
}
