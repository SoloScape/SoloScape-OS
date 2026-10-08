import assert from "node:assert/strict";
import {test} from "node:test";
import {titleLayout,titleFieldLayout} from "../browser/title-screen.mjs";
import {NativeAudioCache,retryOnMissingGroup} from "../browser/title-audio-cache.mjs";
import {NativeTitleMusic} from "../browser/title-music.mjs";
import {RealtimeMidiSynth} from "../browser/title-audio-realtime-midi-synth.mjs";
import {MusicTrack} from "../browser/title-audio-music-track.mjs";

test("title controls fit desktop, portrait and landscape without resizing the game viewport",()=>{
    for(const [w,h] of [[1366,768],[390,844],[844,390]]){
        const l=titleLayout(w,h);
        for(const x of [202,562])assert.ok(l.x+x*l.scale>=0&&l.x+x*l.scale<=w);
        for(const y of [18,370])assert.ok(l.y+y*l.scale>=0&&l.y+y*l.scale<=h);
        assert.equal(l.backgroundScale,l.scale);
        assert.ok(765*l.scale<=w&&503*l.scale<=h);
    }
});

test("fixed 765 by 503 title centres the panel and anchors mute bottom-right",()=>{
    const l=titleLayout(765,503);
    assert.equal(l.scale,1);assert.equal(l.y,0);assert.equal(l.x,.5);
    assert.equal(l.backgroundScale,1);assert.equal(l.bx,-162);assert.equal(l.by,0);
    assert.equal(170+l.panelOffset+200/2,503/2);
    assert.equal(l.x+202+360/2,765/2);
    assert.equal(l.muteX,725);assert.equal(l.muteY,463);
    const desktop=titleLayout(1920,1080);
    assert.equal(desktop.scale,1);assert.equal(desktop.y,(1080-503)/2);
});

test("cache-font selection and caret follow native input offsets through scrolling",()=>{
    const font={measure:text=>text.length*5};
    const field=titleFieldLayout(font,"Alice",1,4,true);
    assert.deepEqual(field.selection,[5,20]);assert.equal(field.caret,20);
    assert.equal(field.indexAt(6),1);assert.equal(field.indexAt(9),2);
    assert.equal(titleFieldLayout(font,"Alice",2,2,true).caret,10);
    assert.equal(titleFieldLayout(font,"Alice",1,4,false).selection,null);
    const scrolled=titleFieldLayout(font,"abcdefghij",8,10,true,20);
    assert.equal(scrolled.text,"ghij");assert.deepEqual(scrolled.selection,[10,20]);
    assert.equal(scrolled.indexAt(0),6);assert.equal(scrolled.indexAt(100),10);
    assert.deepEqual(titleFieldLayout(font,"*****",1,4,true).selection,[5,20]);
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
