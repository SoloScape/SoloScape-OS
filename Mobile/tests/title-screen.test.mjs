import assert from "node:assert/strict";
import {test} from "node:test";
import {titleLayout} from "../browser/title-screen.mjs";
import {NativeAudioCache,retryOnMissingGroup} from "../browser/title-audio-cache.mjs";
import {NativeTitleMusic} from "../browser/title-music.mjs";
import {RealtimeMidiSynth} from "../browser/title-audio-realtime-midi-synth.mjs";
import {MusicTrack} from "../browser/title-audio-music-track.mjs";

test("title controls fit desktop, portrait and landscape without resizing the game viewport",()=>{
    for(const [w,h] of [[1366,768],[390,844],[844,390]]){
        const l=titleLayout(w,h);
        for(const x of [202,562])assert.ok(l.x+x*l.scale>=0&&l.x+x*l.scale<=w);
        for(const y of [18,370])assert.ok(l.y+y*l.scale>=0&&l.y+y*l.scale<=h);
        assert.ok(l.bx<=0&&l.by<=0);assert.ok(1089*l.backgroundScale>=w&&671*l.backgroundScale>=h);
    }
});

test("OSRS reference keeps native title controls top-aligned over the wide cache background",()=>{
    const l=titleLayout(1089,671);
    assert.equal(l.scale,1);assert.equal(l.y,0);assert.equal(l.x,162.5);
    assert.equal(l.backgroundScale,1);assert.equal(l.bx,0);assert.equal(l.by,0);
    assert.equal(titleLayout(1920,1080).scale,1);
});

test("music cache bridge waits for one verified group and preserves decoded bytes",async()=>{
    let reads=0,release;
    const cache=new NativeAudioCache({loadGroup:async()=>{reads++;await new Promise(r=>release=r);return Uint8Array.of(0,0,0,0,3,1,2,3);}});
    cache.catalogs.set(6,{ids:[7,8],fileIdsForGroup:new Map([[7,[0]],[8,[0]]])});
    const index=cache.getIndex(6),first=retryOnMissingGroup(()=>index.getFileSmart(7)),second=retryOnMissingGroup(()=>index.getFile(7,0));
    release();const files=await Promise.all([first,second]);
    assert.equal(reads,1);assert.deepEqual([...files[0].data],[1,2,3]);assert.equal(index.getFileSmart(99),null);
    await assert.rejects(cache.preload(6,99),/Missing music cache group/);
    assert.equal(cache.pending.size,0);
});

test("cache MIDI conversion rejects malformed data instead of inventing title music",()=>{
    assert.equal(MusicTrack.toMidi(Uint8Array.of(0)),null);
});

test("leaving title while music loads never starts stale playback",async()=>{
    const methods=["loadTrack","dispose","setVolume","setLooping","play","stop"],saved=new Map(methods.map(k=>[k,RealtimeMidiSynth.prototype[k]]));
    let resolve,played=0,disposed=0;
    RealtimeMidiSynth.prototype.loadTrack=()=>new Promise(r=>resolve=r);
    RealtimeMidiSynth.prototype.play=()=>played++;
    RealtimeMidiSynth.prototype.dispose=()=>disposed++;
    for(const name of ["setVolume","setLooping","stop"])RealtimeMidiSynth.prototype[name]=()=>{};
    try{
        const music=new NativeTitleMusic({});music.track=0;
        const pending=music.unlock();music.hide();music.show();resolve(true);await pending;
        assert.equal(played,0);assert.equal(disposed,1);assert.equal(music.loaded,false);assert.equal(music.synth,null);
        music.dispose();
    }finally{for(const [name,fn] of saved)RealtimeMidiSynth.prototype[name]=fn;}
});
