/*
 * BSD 2-Clause License
 * 
 * Copyright (c) 2022-2026, dennisdev, xrsps
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
// Tile topology adapted from RSPSApp/tsps b9ca431 SceneTileModel (BSD-2-Clause).
// Geometry is cache-defined; raw RGB is not final OSRS HSL lighting.
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
void main(){
    vec4 v=u_mvp*vec4(a_position,1.0);
    gl_Position=v;
    v_color=a_color;
}`);
    const fs=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;
varying vec3 v_color;
varying float v_depth;
void main(){
    gl_FragColor=vec4(v_color,1.0);
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

const tileShapeVertexIndices = [
    [1, 3, 5, 7],
    [1, 3, 5, 7],
    [1, 3, 5, 7],
    [1, 3, 5, 7, 6],
    [1, 3, 5, 7, 6],
    [1, 3, 5, 7, 6],
    [1, 3, 5, 7, 6],
    [1, 3, 5, 7, 2, 6],
    [1, 3, 5, 7, 2, 8],
    [1, 3, 5, 7, 2, 8],
    [1, 3, 5, 7, 11, 12],
    [1, 3, 5, 7, 11, 12],
    [1, 3, 5, 7, 13, 14],
];

const tileShapeFaces = [
    [0, 1, 2, 3, 0, 0, 1, 3],
    [1, 1, 2, 3, 1, 0, 1, 3],
    [0, 1, 2, 3, 1, 0, 1, 3],
    [0, 0, 1, 2, 0, 0, 2, 4, 1, 0, 4, 3],
    [0, 0, 1, 4, 0, 0, 4, 3, 1, 1, 2, 4],
    [0, 0, 4, 3, 1, 0, 1, 2, 1, 0, 2, 4],
    [0, 1, 2, 4, 1, 0, 1, 4, 1, 0, 4, 3],
    [0, 4, 1, 2, 0, 4, 2, 5, 1, 0, 4, 5, 1, 0, 5, 3],
    [0, 4, 1, 2, 0, 4, 2, 3, 0, 4, 3, 5, 1, 0, 4, 5],
    [0, 0, 4, 5, 1, 4, 1, 2, 1, 4, 2, 3, 1, 4, 3, 5],
    [0, 0, 1, 5, 0, 1, 4, 5, 0, 1, 2, 4, 1, 0, 5, 3, 1, 5, 4, 3, 1, 4, 2, 3],
    [1, 0, 1, 5, 1, 1, 4, 5, 1, 1, 2, 4, 0, 0, 5, 3, 0, 5, 4, 3, 0, 4, 2, 3],
    [1, 0, 5, 4, 1, 0, 1, 5, 0, 0, 4, 3, 0, 4, 5, 3, 0, 5, 2, 3, 0, 1, 2, 5],
];


export function buildTileGeometry(shape,rotation,heights) {
    if(!Number.isInteger(shape)||shape<0||shape>12||
        !Number.isInteger(rotation)||rotation<0||rotation>3||
        heights?.length!==4||!Array.from(heights).every(Number.isInteger)) {
        throw new Error("Invalid cache tile geometry");
    }
    const [sw,se,ne,nw]=heights;
    const coordinates=[
        null,[0,0,sw],[.5,0,(sw+se)>>1],[1,0,se],
        [1,.5,(se+ne)>>1],[1,1,ne],[.5,1,(ne+nw)>>1],[0,1,nw],
        [0,.5,(nw+sw)>>1],[.5,.25,(sw+se)>>1],[.75,.5,(se+ne)>>1],
        [.5,.75,(ne+nw)>>1],[.25,.5,(nw+sw)>>1],
        [.25,.25,sw],[.75,.25,se],[.75,.75,ne],[.25,.75,nw],
    ];
    const vertices=tileShapeVertexIndices[shape].map(code=>{
        if((code&1)===0&&code<=8)code=((code-2*rotation-1)&7)+1;
        else if(code>8&&code<=12)code=((code-9-rotation)&3)+9;
        else if(code>12)code=((code-13-rotation)&3)+13;
        return coordinates[code];
    });
    const indices=tileShapeFaces[shape],faces=[];
    for(let i=0;i<indices.length;i+=4){
        const corners=indices.slice(i+1,i+4).map(v=>v<4?(v-rotation)&3:v);
        faces.push({isOverlay:indices[i]===1,vertices:corners.map(v=>vertices[v])});
    }
    return faces;
}

function floorColor(id,isOverlay,materials) {
    if(!materials)return [1,1,1]; // Wireframe only while definitions are unavailable.
    const definition=(isOverlay?materials.overlays:materials.underlays)?.get(id-1);
    if(!definition||definition.textureId>=0||
        isOverlay&&definition.rgb===0xff00ff)return null;
    const rgb=definition.rgb;
    if(!Number.isInteger(rgb)||rgb<0||rgb>0xffffff)return null;
    // secondaryRgb is a minimap colour; it must not replace the scene's primary RGB.
    return [(rgb>>>16&255)/255,(rgb>>>8&255)/255,(rgb&255)/255];
}

export function buildTerrainMesh(terrain){
    if(!terrain||terrain.side!==64||terrain.heights?.length!==4096||
        terrain.underlays?.length!==4096||terrain.overlays?.length!==4096||
        terrain.overlayShapes&&terrain.overlayShapes.length!==4096||
        terrain.overlayRotations&&terrain.overlayRotations.length!==4096) {
        throw new Error("Invalid terrain mesh input");
    }
    const numbers=[];
    for(let x=0;x<63;x++)for(let y=0;y<63;y++){
        const i=x*64+y,overlay=terrain.overlays[i]&0x7fff;
        const shape=overlay?(terrain.overlayShapes?.[i]??0)+1:0;
        const rotation=overlay?(terrain.overlayRotations?.[i]??0):0;
        const heights=[terrain.heights[i],terrain.heights[i+64],
            terrain.heights[i+65],terrain.heights[i+1]];
        for(const face of buildTileGeometry(shape,rotation,heights)){
            const id=face.isOverlay?overlay:terrain.underlays[i];
            const c=floorColor(id,face.isOverlay,terrain.floorMaterials);
            if(!c)continue;
            for(const [vx,vy,h] of face.vertices)numbers.push(x+vx-31.5,-h/32,y+vy-31.5,...c);
        }
    }
    return new Float32Array(numbers);
}

export function terrainWireframe(vertices){
    if(!(vertices instanceof Float32Array)||vertices.length%18) {
        throw new Error("Invalid triangle mesh");
    }
    const lines=new Float32Array(vertices.length*2);
    let at=0;
    for(let i=0;i<vertices.length;i+=18){
        for(const v of [0,1,1,2,2,0]){
            lines.set(vertices.subarray(i+v*6,i+v*6+6),at);
            at+=6;
        }
    }
    return lines;
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
    setTerrain(terrain,{resetCamera=true}={}){
        const gl=this.gl;
        const mesh=buildTerrainMesh(terrain);
        this.drawMode=terrain.floorMaterials?gl.TRIANGLES:gl.LINES;
        const vertices=terrain.floorMaterials?mesh:terrainWireframe(mesh);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        this.count=vertices.length/6;
        if(resetCamera)this.target=[0,8,0];
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
        gl.drawArrays(this.drawMode,0,this.count);
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
