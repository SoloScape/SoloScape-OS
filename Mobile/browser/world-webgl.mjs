// First native browser world viewport: real decoded revision-240 map heights.
// Cache-backed floor RGB where available; texture mapping and scene locs remain TODO.
function shader(gl,type,source){
    const sh=gl.createShader(type);
    gl.shaderSource(sh,source);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
        const reason=gl.getShaderInfoLog(sh);gl.deleteShader(sh);
        throw new Error("WebGL shader failed: "+reason);
    }
    return sh;
}
function program(gl){
    const vs=shader(gl,gl.VERTEX_SHADER,`attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_mvp;
varying vec3 v_color;
varying float v_depth;
void main(){
    vec4 v=u_mvp*vec4(a_position,1.0);
    gl_Position=v;
    v_color=a_color;
    v_depth=clamp((v.w-15.0)/120.0,0.0,1.0);
}`);
    const fs=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;
varying vec3 v_color;
varying float v_depth;
void main(){
    vec3 fog=vec3(0.08,0.15,0.20);
    gl_FragColor=vec4(mix(v_color,fog,v_depth*0.55),1.0);
}`);
    const p=gl.createProgram();
    gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error("WebGL program link failed");
    return p;
}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function norm(v){const n=Math.hypot(...v)||1;return v.map(x=>x/n);}
function sub(a,b){return a.map((x,i)=>x-b[i]);}
function lookAt(eye,center){
    const z=norm(sub(eye,center)), x=norm(cross([0,1,0],z)), y=cross(z,x);
    return new Float32Array([
        x[0],y[0],z[0],0, x[1],y[1],z[1],0,
        x[2],y[2],z[2],0,
        -x.reduce((v,k,i)=>v+k*eye[i],0),
        -y.reduce((v,k,i)=>v+k*eye[i],0),
        -z.reduce((v,k,i)=>v+k*eye[i],0),1,
    ]);
}
function perspective(aspect){
    const f=1/Math.tan(Math.PI/6),near=.2,far=350;
    return new Float32Array([
        f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1,
        0,0,2*far*near/(near-far),0,
    ]);
}
function multiply(a,b){
    const out=new Float32Array(16);
    for(let col=0;col<4;col++)for(let row=0;row<4;row++){
        let sum=0;
        for(let k=0;k<4;k++)sum+=a[k*4+row]*b[col*4+k];
        out[col*4+row]=sum;
    }
    return out;
}
function color(underlay,overlay,shade,materials){
    // The cache stores floor IDs as 1-based indexes. Overlay ID uses the
    // low 15 bits (TSPS SceneBuilder / RuneLite convention).
    const overlayId=(overlay&0x7fff)-1,underlayId=underlay-1;
    const overlayDef=materials?.overlays?.get(overlayId);
    const underlayDef=materials?.underlays?.get(underlayId);
    let definition=overlayDef;
    if(definition?.rgb===0xff00ff)definition=null; // transparent overlay
    const rgb=definition?(definition.secondaryRgb??definition.rgb):
        underlayDef?.rgb;
    if(Number.isInteger(rgb)&&rgb>=0&&rgb<=0xffffff) {
        const r=(rgb>>>16)&255,g=(rgb>>>8)&255,b=rgb&255;
        return [r,g,b].map(channel=>Math.min(1,Math.max(0,channel/255*shade)));
    }
    // Explicit incomplete-material fallback: retain the original preview
    // tint until a decoded colour / texture material exists in cache.
    const base=overlay>0?[.34,.42,.47]:underlay>0?
        [.23+((underlay*13)%26)/100,.36+((underlay*7)%18)/100,.22+((underlay*5)%17)/100]:
        [.39,.40,.35];
    return base.map(c=>Math.min(1,Math.max(.05,c*shade)));
}
/** Triangle mesh with a real tile height per vertex, no fake placeholder geometry. */
export function buildTerrainMesh(terrain){
    if(!terrain ||terrain.side!==64||terrain.heights?.length!==4096)throw new Error("Invalid terrain mesh input");
    const numbers=new Float32Array(63*63*6*6);
    const pos=(x,y)=>[x-31.5,-terrain.heights[x*64+y]/32,y-31.5];
    const tri=(p,c,offset)=>{numbers.set([...p,...c],offset);return offset+6;};
    let offset=0;
    for(let x=0;x<63;x++)for(let y=0;y<63;y++){
        const avg=(terrain.heights[x*64+y]+terrain.heights[(x+1)*64+y]+
            terrain.heights[x*64+y+1]+terrain.heights[(x+1)*64+y+1])/4;
        const shade=.72+Math.min(.3,Math.abs(avg)/2800);
        const c=color(terrain.underlays[x*64+y],terrain.overlays[x*64+y],shade,terrain.floorMaterials);
        const p00=pos(x,y),p10=pos(x+1,y),p01=pos(x,y+1),p11=pos(x+1,y+1);
        offset=tri(p00,c,offset);offset=tri(p10,c,offset);offset=tri(p11,c,offset);
        offset=tri(p00,c,offset);offset=tri(p11,c,offset);offset=tri(p01,c,offset);
    }
    return numbers;
}
export class NativeTerrainViewport {
    constructor(canvas) {
        this.canvas=canvas;
        this.gl=canvas.getContext("webgl",{antialias:true,alpha:false}) ||
            canvas.getContext("experimental-webgl");
        if(!this.gl)throw new Error("WebGL not supported on this device");
        const gl=this.gl;
        this.program=program(gl);
        this.buf=gl.createBuffer();
        this.count=0;
        this.yaw=.8;this.pitch=.66;this.distance=100;
        this.target=[0,10,0];
        this.pointer=null;
        this.disposed=false;
        this.onPointerDown=e=>{this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
            canvas.setPointerCapture?.(e.pointerId);};
        this.onPointerMove=e=>{
            if(!this.pointer||this.pointer.id!==e.pointerId)return;
            const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;
            this.yaw+=dx*.007;this.pitch=Math.max(.18,Math.min(1.38,this.pitch+dy*.007));
            this.pointer.x=e.clientX;this.pointer.y=e.clientY;
        };
        this.onPointerUp=e=>{if(this.pointer?.id===e.pointerId)this.pointer=null;};
        this.onWheel=e=>{e.preventDefault();this.distance=Math.max(18,Math.min(170,this.distance*Math.exp(e.deltaY*.001)));};
        this.onKey=e=>{
            if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||""))return;
            const step=3;
            if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")this.target[0]-=step;
            else if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")this.target[0]+=step;
            else if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")this.target[2]-=step;
            else if(e.key==="ArrowDown"||e.key.toLowerCase()==="s")this.target[2]+=step;
            else return;
            e.preventDefault();
            this.target[0]=Math.max(-30,Math.min(30,this.target[0]));
            this.target[2]=Math.max(-30,Math.min(30,this.target[2]));
        };
        canvas.addEventListener("pointerdown",this.onPointerDown);
        canvas.addEventListener("pointermove",this.onPointerMove);
        canvas.addEventListener("pointerup",this.onPointerUp);
        canvas.addEventListener("pointercancel",this.onPointerUp);
        canvas.addEventListener("wheel",this.onWheel,{passive:false});
        window.addEventListener("keydown",this.onKey);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(.045,.09,.12,1);
        this.frame=()=>{if(this.disposed)return;this.render();this.raf=requestAnimationFrame(this.frame);};
        this.raf=requestAnimationFrame(this.frame);
    }
    setTerrain(terrain){
        const gl=this.gl;
        const vertices=buildTerrainMesh(terrain);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        this.count=vertices.length/6;
        this.target=[0,8,0];
    }
    render(){
        const gl=this.gl,canvas=this.canvas;
        const w=Math.max(1,Math.floor(canvas.clientWidth*Math.min(2,window.devicePixelRatio||1)));
        const h=Math.max(1,Math.floor(canvas.clientHeight*Math.min(2,window.devicePixelRatio||1)));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        if(!this.count)return;
        const p=this.pitch,d=this.distance;
        const eye=[
            this.target[0]+Math.sin(this.yaw)*Math.cos(p)*d,
            this.target[1]+Math.sin(p)*d,
            this.target[2]+Math.cos(this.yaw)*Math.cos(p)*d,
        ];
        const matrix=multiply(perspective(w/h),lookAt(eye,this.target));
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program,"u_mvp"),false,matrix);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
        const a=gl.getAttribLocation(this.program,"a_position"),c=gl.getAttribLocation(this.program,"a_color");
        gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(c);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
        gl.drawArrays(gl.TRIANGLES,0,this.count);
    }
    dispose(){
        this.disposed=true;cancelAnimationFrame(this.raf);
        for(const [name,fn] of [["pointerdown",this.onPointerDown],["pointermove",this.onPointerMove],
            ["pointerup",this.onPointerUp],["pointercancel",this.onPointerUp],["wheel",this.onWheel]]) {
            this.canvas.removeEventListener(name,fn);
        }
        window.removeEventListener("keydown",this.onKey);
        this.gl.deleteBuffer(this.buf);this.gl.deleteProgram(this.program);
    }
}
