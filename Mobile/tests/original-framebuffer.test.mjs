import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

const base=new URL("../teavm-poc/engine-src/",import.meta.url);
const source=await readFile(new URL("org/soloscape/teavm/platform/awt/NativeCanvas.java",base),"utf8");
const pixelsScript=/@JSBody\(params=\{"canvas","pixels","width","height","alpha","dx","dy"\},script="([^"]*)"\)/.exec(source)?.[1];
assert.ok(pixelsScript,"Read the actual original NativeCanvas pixel upload adapter");

function output(){
    let allocated=0,uploaded=0,last=null,contextRequests=0,lastPosition=[];
    const ctx={
        createImageData(w,h){
            allocated++;
            return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};
        },
        putImageData(img,x,y){
            lastPosition=[x,y];uploaded++;
            last=new Uint8Array(img.data);
        }
    };
    const canvas={getContext:kind=>(assert.equal(kind,"2d"),contextRequests++,ctx)};
    function upload(pixels,width,height,alpha,dx=0,dy=0){
        runInNewContext(pixelsScript,{canvas,pixels,width,height,alpha,dx,dy,Uint32Array});
        return [...last];
    }
    return {canvas,upload,get allocated(){return allocated;},
        get uploaded(){return uploaded;},get contextRequests(){return contextRequests;},
        get lastPosition(){return lastPosition;}};
}
test("original ARGB framebuffer uploads exact opaque RGBA bytes",()=>{
    const v=output();
    const argb=Int32Array.from([0x00112233,0x80446688,0xffa0b0c0]);
    const expected=[0x11,0x22,0x33,255,0x44,0x66,0x88,255,0xa0,0xb0,0xc0,255];
    assert.deepEqual(v.upload(argb,3,1,false),expected);
    assert.deepEqual(v.upload(argb,3,1,false),expected);
    assert.equal(v.allocated,1,"never create fresh ImageData for an unchanged framebuffer");
    assert.equal(v.contextRequests,1,"reuse original 2D context instead of querying it every frame");
    assert.equal(v.uploaded,2,"each original drawn frame must still reach the screen");
});
test("alpha sprites retain byte-for-byte alpha and resize replaces only the old upload buffer",()=>{
    const v=output();
    assert.deepEqual(v.upload(Int32Array.from([0x00123456,0x80446688,0xffa0b0c0]),3,1,true),
        [0x12,0x34,0x56,0,0x44,0x66,0x88,128,0xa0,0xb0,0xc0,255]);
    assert.equal(v.allocated,1);
    assert.deepEqual(v.upload(Int32Array.from([0x00010203]),1,1,false),
        [1,2,3,255]);
    assert.equal(v.allocated,2,"dimensions must invalidate stale ImageData");
    assert.deepEqual(v.upload(Int32Array.from([0xff040506]),1,1,false),
        [4,5,6,255]);
    assert.equal(v.allocated,2);
    assert.equal(v.contextRequests,2,"a new image size is the only reason to acquire a context");
});
test("integer-offset opaque presentation uses the same reusable pixel buffer",()=>{
    const v=output();
    const pixels=Int32Array.from([0x00112233,0xff445566]);
    assert.deepEqual(v.upload(pixels,2,1,false,19,33),[17,34,51,255,68,85,102,255]);
    assert.deepEqual(v.lastPosition,[19,33]);
    assert.deepEqual(v.upload(pixels,2,1,false,38,64),[17,34,51,255,68,85,102,255]);
    assert.deepEqual(v.lastPosition,[38,64]);
    assert.equal(v.allocated,1,"offset changes don't allocate new ImageData");
    assert.equal(v.contextRequests,1);
});
test("only the original fully opaque, exactly sized framebuffer takes the direct presentation path",async t=>{
    const src=await readFile(new URL("org/soloscape/teavm/platform/awt/Image.java",base),"utf8");
    const graphics=await readFile(new URL("org/soloscape/teavm/platform/awt/Graphics.java",base),"utf8");
    const callbacks=await readFile(new URL("BrowserEngineCallbacks.java",base),"utf8");
    assert.match(graphics,/image!=null&&image\.presentOpaqueFrame\(canvas,width,height,x,y\)/);
    assert.match(callbacks,/if \(!graphics\.presentFramebuffer\(buffer\.getImage\(\), x, y\)\)/);
    assert.match(callbacks,/graphics\.drawImage\(buffer\.getImage\(\), x, y, null\)/);
    let jdk;
    try{jdk=findTeaVmJdk();}catch(error){t.skip(error.message);return;}
    const directory=mkdtempSync(join(tmpdir(),"original-framebuffer-"));
    t.after(()=>rmSync(directory,{recursive:true,force:true}));
    const pkg=join(directory,"org","soloscape","teavm","platform","awt");
    const jso=join(directory,"org","teavm","jso");
    mkdirSync(pkg,{recursive:true});mkdirSync(jso,{recursive:true});
    writeFileSync(join(pkg,"Image.java"),src);
    writeFileSync(join(jso,"JSObject.java"),"package org.teavm.jso; public interface JSObject {}");
    writeFileSync(join(pkg,"Graphics.java"),"package org.soloscape.teavm.platform.awt; public class Graphics {}");
    writeFileSync(join(pkg,"Graphics2D.java"),"package org.soloscape.teavm.platform.awt; public class Graphics2D extends Graphics { public Graphics2D(org.teavm.jso.JSObject o,int w,int h) {} }");
    writeFileSync(join(pkg,"NativeCanvas.java"),`package org.soloscape.teavm.platform.awt;
public class NativeCanvas {
 static int uploads;
 static org.teavm.jso.JSObject create(int w,int h,String id){return new org.teavm.jso.JSObject(){};}
 static int lastDx,lastDy;
 static void pixelsAt(org.teavm.jso.JSObject c,int[] p,int w,int h,boolean a,int dx,int dy){uploads++;lastDx=dx;lastDy=dy;}
 static void pixels(org.teavm.jso.JSObject c,int[] p,int w,int h,boolean a){pixelsAt(c,p,w,h,a,0,0);}
 static void readPixels(org.teavm.jso.JSObject c,int[] p,int w,int h){}
}`);
    writeFileSync(join(pkg,"FrameProbe.java"),`package org.soloscape.teavm.platform.awt;
public class FrameProbe {
 static class Surface extends Image {
  Surface(int w,int h){super(w,h);}
  void opaque(int[] p){pixels=p;alpha=false;drawn=false;}
  void transparent(){alpha=true;}
  void drawn(){drawn=true;}
 }
 static void check(boolean b){if(!b)throw new AssertionError("Wrong framebuffer path");}
 public static void main(String[] a){
  Surface img=new Surface(3,2);
  org.teavm.jso.JSObject target=new org.teavm.jso.JSObject(){};
  check(!img.presentOpaqueFrame(target,3,2));
  img.opaque(new int[6]);
  check(!img.presentOpaqueFrame(target,2,2));
  check(!img.presentOpaqueFrame(target,3,1));
  check(img.presentOpaqueFrame(target,3,2));
  check(NativeCanvas.uploads==1);
  check(img.presentOpaqueFrame(target,4,3,1,1));
  check(NativeCanvas.uploads==2&&NativeCanvas.lastDx==1&&NativeCanvas.lastDy==1);
  check(!img.presentOpaqueFrame(target,4,3,-1,0));
  check(!img.presentOpaqueFrame(target,4,3,2,1));
  img.transparent();check(!img.presentOpaqueFrame(target,4,3,1,1));
  img.opaque(new int[6]);img.drawn();
  check(!img.presentOpaqueFrame(target,4,3,1,1));
  check(NativeCanvas.uploads==2);
 }
}`);
    const sourceFiles=[join(jso,"JSObject.java"),...["Image","Graphics","Graphics2D","NativeCanvas","FrameProbe"].map(name=>join(pkg,name+".java"))];
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const compiled=spawnSync(javac,["-d",directory,...sourceFiles],{encoding:"utf8"});
    assert.equal(compiled.status,0,compiled.stderr||compiled.error?.message);
    const result=spawnSync(jdk.binary,["-cp",directory,"org.soloscape.teavm.platform.awt.FrameProbe"],{encoding:"utf8"});
    assert.equal(result.status,0,result.stderr||result.error?.message);
});


test("LAN gameplay does not force canvas GPU readbacks for the development image-signature probe",async()=>{
    const page=await readFile(new URL("../teavm-poc/site/engine-smoke.mjs",import.meta.url),"utf8");
    assert.match(page,/const pixelAudit=diagnostics&&/);
    assert.match(page,/window\.location\.hostname==="127\.0\.0\.1"/);
    assert.match(page,/if\(pixelAudit&&!state\.frameChanged\)/);
    assert.match(page,/if\(pixelAudit\)initialPixelSignature=signature\(\)/);
    assert.match(page,/state\.presentedFrames>0\)\s*dismissStartupSplash\(\)/,
        "normal player splash still dismisses after an original Java frame");
});