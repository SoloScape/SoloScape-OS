import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inflateSync} from "node:zlib";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {runInNewContext} from "node:vm";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

const javaUrl=new URL("../teavm-poc/engine-src/OriginalMobileTapIndicators.java",import.meta.url);
const atlasUrl=new URL("../teavm-poc/site/original-mobile-clicks-cache-1625.png",import.meta.url);

test("mobile click art is an authentic bundled 40-frame sprite from JS5 group 1625",async()=>{
    const [helper,bridge,callbacks,page,assets,html]=await Promise.all([
        readFile(javaUrl,"utf8"),
        readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/engine-src/BrowserEngineCallbacks.java",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8"),
        readFile(new URL("../scripts/original-client-assets.mjs",import.meta.url),"utf8"),
        readFile(new URL("../teavm-poc/site/engine-smoke.html",import.meta.url),"utf8")
    ]);
    assert.match(helper,/FRAMES_PER_COLOR=20/);
    assert.match(helper,/nativeFrame\(color,age\)/);
    assert.match(helper,/client\.mm\*-2032519679/);
    assert.match(helper,/client\.my\*1069629167/);
    assert.match(helper,/client\.mv\*427421377/);
    assert.match(helper,/client\.mc\*408682907/);
    assert.doesNotMatch(helper,/ir\.af\(|circlePixels|Math\.hypot|Math\.sqrt/,
        "render must not await an asynchronous game cache fetch");
    assert.match(helper,/graphics\.drawOriginalTouchCacheFrame\(/);
    assert.match(callbacks,/OriginalMobileTapIndicators\.draw\(graphics,EngineBridge\.originalClient\(\),x,y\)/);
    assert.match(bridge,/@JSExport public static void configureMobileTapIndicators\(boolean touch\)/);
    assert.match(bridge,/OriginalMobileTapIndicators\.update\(original\)/);
    assert.match(assets,/original-mobile-clicks-cache-1625\.png/);
    assert.match(html,/rel="preload" as="image" href="\/original-mobile-clicks-cache-1625\.png"/);
    assert.match(page,/engine\.configureMobileTapIndicators\(/);
});

test("pre-extracted authentic atlas contains exact yellow and red transparent original pixels",async()=>{
    const data=await readFile(atlasUrl);
    assert.equal(data.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    assert.equal(data.readUInt32BE(16),2560);
    assert.equal(data.readUInt32BE(20),64);
    assert.equal(data[25],6,"RGBA pixels, zero alpha preserves cache transparency");
    let offset=8,compressed=[];
    while(offset+12<=data.length){
        const len=data.readUInt32BE(offset),name=data.toString("ascii",offset+4,offset+8);
        if(name==="IDAT")compressed.push(data.subarray(offset+8,offset+8+len));
        offset+=12+len;
        if(name==="IEND")break;
    }
    const scan=inflateSync(Buffer.concat(compressed));
    const width=2560;
    const pixel=(index,x,y)=>{
        const stride=width*4+1,loc=y*stride+1+(index*64+x)*4;
        return [...scan.subarray(loc,loc+4)];
    };
    assert.deepEqual(pixel(0,32,32),[255,255,0,255]);
    assert.deepEqual(pixel(20,32,32),[255,0,0,255]);
    assert.deepEqual(pixel(0,0,0),[0,0,0,0]);
    assert.deepEqual(pixel(19,0,0),[0,0,0,0]);
    assert.deepEqual(pixel(39,32,32),[255,0,0,255]);
    assert.ok(data.length<15000,"sprite atlas should be tiny and quick to preload");
});

test("pinned Java original click state selects all 40 cached frames, hides X for touch only",async t=>{
    let jdk;
    try{jdk=findTeaVmJdk();}catch(e){t.skip(e.message);return;}
    const dir=mkdtempSync(join(tmpdir(),"soloscape-original-cache-taps-"));
    t.after(()=>rmSync(dir,{recursive:true,force:true}));
    const api=join(dir,"net","runelite","api");
    mkdirSync(api,{recursive:true});
    const sources={
        "OriginalMobileTapIndicators.java":await readFile(javaUrl,"utf8"),
        "net/runelite/api/SpritePixels.java":`package net.runelite.api;
public interface SpritePixels {int[] getPixels();}`,
        "net/runelite/api/GameState.java":`package net.runelite.api;
public enum GameState {LOGIN_SCREEN,LOGGED_IN}`,
        "net/runelite/api/Client.java":`package net.runelite.api;
public interface Client {GameState getGameState();SpritePixels[] getCrossSprites();}`,
        "ym.java":`class ym implements net.runelite.api.SpritePixels {
    public final int[] data;
    ym(int[] data,int width,int height){this.data=data;}
    public int[] getPixels(){return data;}
}`,
        "client.java":`class client {
    static int mm,my,mv,mc;
    static int inv(int factor){int x=factor;for(int i=0;i<5;i++)x*=2-factor*x;return x;}
    static void click(int type,int age,int x,int y){
        mm=type*inv(-2032519679);
        my=age*inv(1069629167);
        mv=x*inv(427421377);
        mc=y*inv(408682907);
    }
}`,
        "org/soloscape/teavm/platform/awt/Graphics.java":`package org.soloscape.teavm.platform.awt;
public class Graphics {
    public int count,index,x,y,alpha;
    public void drawOriginalTouchCacheFrame(int x,int y,int index,int alpha){
        count++;this.x=x;this.y=y;this.index=index;this.alpha=alpha;
    }
}`,
        "TestNativeClick.java":`import net.runelite.api.*;
import org.soloscape.teavm.platform.awt.Graphics;
class TestNativeClick {
 static void check(boolean b){if(!b)throw new AssertionError("native sprite selection failed");}
 static class Original implements Client {
    GameState state=GameState.LOGGED_IN;SpritePixels[] cross=new SpritePixels[8];
    Original(){for(int i=0;i<8;i++)cross[i]=new ym(new int[]{i+1},16,16);}
    public GameState getGameState(){return state;}
    public SpritePixels[] getCrossSprites(){return cross;}
 }
 public static void main(String[] args){
    Original pc=new Original();
    OriginalMobileTapIndicators.configure(false);
    OriginalMobileTapIndicators.update(pc);
    check(pc.cross[0].getPixels()[0]==1);
    Original o=new Original();Graphics g=new Graphics();
    OriginalMobileTapIndicators.configure(true);
    OriginalMobileTapIndicators.update(o);
    for(int i=0;i<8;i++){
        check(o.cross[i].getPixels().length==256);
        for(int c:o.cross[i].getPixels())check(c==0);
    }
    for(int k=0;k<2;k++)for(int f=0;f<20;f++){
        client.click(k+1,f*20,225,175);
        OriginalMobileTapIndicators.draw(g,o,3,4);
        check(g.index==k*20+f);
        check(g.x==228&&g.y==179);
        check(g.alpha==255-Math.min(255,(f*20*255)/400));
    }
    check(g.count==40);
    client.click(0,0,100,100);
    OriginalMobileTapIndicators.draw(g,o,0,0);
    client.click(1,400,100,100);
    OriginalMobileTapIndicators.draw(g,o,0,0);
    check(g.count==40);
    OriginalMobileTapIndicators.configure(false);
    OriginalMobileTapIndicators.draw(g,o,0,0);
    check(g.count==40);
    System.out.println("PASS original yellow/red 40 frames, hide desktop X only for touch");
 }
}`
    };
    for(const [name,source] of Object.entries(sources)){
        const path=join(dir,...name.split("/"));
        mkdirSync(join(path,".."),{recursive:true});
        writeFileSync(path,source);
    }
    const files=Object.keys(sources).map(name=>join(dir,...name.split("/")));
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const result=spawnSync(javac,["-d",dir,...files],{encoding:"utf8"});
    assert.equal(result.status,0,result.stderr||result.error?.message);
    const run=spawnSync(jdk.binary,["-cp",dir,"TestNativeClick"],{encoding:"utf8"});
    assert.equal(run.status,0,run.stderr||run.error?.message);
    assert.match(run.stdout,/PASS original yellow\/red 40 frames/);
});
test("native compositor preloads genuine atlas, reuses it and paints correct cache frame",async()=>{
    const source=await readFile(new URL(
        "../teavm-poc/engine-src/org/soloscape/teavm/platform/awt/NativeCanvas.java",
        import.meta.url),"utf8");
    const script=/@JSBody\(params=\{"context","x","y","index","alpha"\},script="([^"]*)"\)/.exec(source)?.[1];
    assert.ok(script);
    let images=0;
    const atlasGlobal={};
    class FakeImage{
        constructor(){images++;this.complete=false;this.naturalWidth=0;}
        set src(path){this.path=path;}
    }
    const draws=[];
    const ctx={
        alpha:1,globalAlpha:1,
        save(){this.alpha=this.globalAlpha;},
        restore(){this.globalAlpha=this.alpha;},
        drawImage(...args){draws.push([this.globalAlpha,...args]);}
    };
    const invoke=(index,alpha)=>runInNewContext("(()=>{"+script+"})()",{
        context:ctx,x:150,y:120,index,alpha,Image:FakeImage,
        globalThis:atlasGlobal,Math
    });
    invoke(0,255);
    assert.equal(images,1);
    assert.equal(atlasGlobal.__soloscapeMobileClickAtlas.path,
        "/original-mobile-clicks-cache-1625.png");
    assert.equal(draws.length,0,"wait for actual image to load once");
    atlasGlobal.__soloscapeMobileClickAtlas.complete=true;
    atlasGlobal.__soloscapeMobileClickAtlas.naturalWidth=2560;
    invoke(0,255);
    invoke(20,128);
    assert.equal(images,1,"do not allocate a new image each frame");
    assert.deepEqual(draws[0],[1,atlasGlobal.__soloscapeMobileClickAtlas,
        0,0,64,64,118,88,64,64]);
    assert.equal(draws[1][2],20*64);
    assert.ok(Math.abs(draws[1][0]-128/255)<.001);
    assert.equal(ctx.globalAlpha,1,"restore original framebuffer composition state");
});
