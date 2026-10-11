package org.soloscape.teavm.platform.awt;
import org.teavm.jso.*;
/** Canvas 2D boundary. Pixel conversion preserves ARGB, including transparency. */
public final class NativeCanvas {
    public static String hostId;
    @JSFunctor public interface InputHandler extends JSObject {
        boolean handle(int id, double when, int modifiers, int x, int y, int button, int code, String character, int wheel);
    }
    @JSBody(params={"canvas","handler"},script="canvas.tabIndex=0;const modifiers=e=>(e.ctrlKey?128:0)|(e.metaKey?256:0)|(e.altKey?512:0);const send=(e,id)=>{const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*canvas.width/r.width),y=Math.floor((e.clientY-r.top)*canvas.height/r.height);if(handler(id,Date.now(),modifiers(e),x||0,y||0,e.button===0?1:e.button===1?2:e.button===2?3:0,(e.key==='Enter'?10:e.key==='Backspace'?8:e.key==='Delete'?127:e.key==='Tab'?9:e.key==='Escape'?27:e.key==='ArrowLeft'?37:e.key==='ArrowUp'?38:e.key==='ArrowRight'?39:e.key==='ArrowDown'?40:e.keyCode||0),e.key&&e.key.length===1?e.key:'',Math.sign(e.deltaY||0)))e.preventDefault();};for(const [name,id] of [['mousedown',501],['mouseup',502],['click',500],['mouseenter',504],['mouseleave',505],['wheel',507],['keydown',401],['keyup',402]])canvas.addEventListener(name,e=>{if(id===507)e.preventDefault();send(e,id);if(id===401&&e.key&&e.key.length===1)send(e,400);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('mousemove',e=>send(e,e.buttons?506:503));canvas.addEventListener('focus',e=>send(e,1004));canvas.addEventListener('blur',e=>{if(globalThis.soloscapeOriginalKeyboardFocusing||e.relatedTarget===document.getElementById('original-soft-keyboard'))return;send(e,1005);});")
    public static native void input(JSObject canvas,InputHandler handler);
    @JSBody(params={"canvas"},script="canvas.focus();")
    public static native void focus(JSObject canvas);
    @JSBody(params={"width","height","id"},script="const engineCanvas=id?document.getElementById(id):document.createElement('canvas'); if(!engineCanvas)throw new Error('Engine canvas missing: '+id); engineCanvas.width=width;engineCanvas.height=height;return engineCanvas;")
    public static native JSObject create(int width,int height,String id);
    @JSBody(params={"canvas","width","height"},script="canvas.width=width;canvas.height=height;")
    public static native void resize(JSObject canvas,int width,int height);
    @JSBody(params={"canvas"},script="return canvas.getContext('2d');")
    public static native JSObject context(JSObject canvas);
    @JSBody(params={"context","argb"},script="context.fillStyle='rgba('+((argb>>>16)&255)+','+((argb>>>8)&255)+','+(argb&255)+','+((argb>>>24)/255)+')';context.strokeStyle=context.fillStyle;")
    public static native void color(JSObject context,int argb);
    @JSBody(params={"context","x","y","w","h","kind"},script="if(kind===0)context.fillRect(x,y,w,h);else if(kind===1)context.strokeRect(x,y,w,h);else context.clearRect(x,y,w,h);")
    public static native void rect(JSObject context,int x,int y,int w,int h,int kind);
    @JSBody(params={"context","argb","x","y","w","h"},script="context.save();context.fillStyle='rgb('+((argb>>>16)&255)+','+((argb>>>8)&255)+','+(argb&255)+')';context.fillRect(x,y,w,h);context.restore();")
    public static native void clear(JSObject context,int argb,int x,int y,int w,int h);
    @JSBody(params={"context","font"},script="context.font=font;")
    public static native void font(JSObject context,String font);
    @JSBody(params={"context","text","x","y"},script="context.fillText(text,x,y);")
    public static native void text(JSObject context,String text,int x,int y);
    @JSBody(params={"context","text"},script="return context.measureText(text).width;")
    public static native double measure(JSObject context,String text);
    @JSBody(params={"context","canvas","x","y"},script="context.drawImage(canvas,x,y);")
    public static native void image(JSObject context,JSObject canvas,int x,int y);
    // Directly present packed pixels at their original integer draw position.
    // Reuse the canvas context, ImageData, and Uint32Array across frames; no
    // intermediate image canvas or per-frame RGBA allocation is needed.
    // Opaque software game frames never read or branch on their alpha byte.
    @JSBody(params={"canvas","pixels","width","height","alpha","dx","dy"},script="let cache=canvas.__soloscapeFramePixels;if(!cache||cache.width!==width||cache.height!==height){const ctx=canvas.getContext('2d'),img=ctx.createImageData(width,height);cache={width,height,ctx,img,words:new Uint32Array(img.data.buffer,img.data.byteOffset,img.data.byteLength/4)};canvas.__soloscapeFramePixels=cache;}const words=cache.words,count=width*height;if(alpha){for(let i=0;i<count;i++){const p=pixels[i];words[i]=(p&0xff00ff00)|((p>>>16)&255)|((p&255)<<16);}}else{for(let i=0;i<count;i++){const p=pixels[i];words[i]=0xff000000|(p&0x0000ff00)|((p>>>16)&255)|((p&255)<<16);}}cache.ctx.putImageData(cache.img,dx,dy);")
    public static native void pixelsAt(JSObject canvas,@JSByRef int[] pixels,int width,int height,boolean alpha,int dx,int dy);
    public static void pixels(JSObject canvas,int[] pixels,int width,int height,boolean alpha){
        pixelsAt(canvas,pixels,width,height,alpha,0,0);
    }
    @JSBody(params={"canvas","pixels","width","height"},script="const p=canvas.getContext('2d').getImageData(0,0,width,height).data;for(let i=0;i<width*height;i++){const j=i*4;pixels[i]=(p[j+3]<<24)|(p[j]<<16)|(p[j+1]<<8)|p[j+2];}")
    public static native void readPixels(JSObject canvas,@JSByRef int[] pixels,int width,int height);
}
