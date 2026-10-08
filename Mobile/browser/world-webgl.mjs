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
// Cache geometry and packed-HSL vertex colours use the client terrain pipeline.
import { prepareFloorLighting, adjustFloorLight, HSL_PALETTE, sampleTerrain } from "./floor-lighting.mjs";
import {terrainPlane,sceneLevel,validateSceneLevel} from "./scene-planes.mjs";
function shader(gl,type,source){
    const sh=gl.createShader(type);
    gl.shaderSource(sh,source);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
        const reason=gl.getShaderInfoLog(sh);gl.deleteShader(sh);
        throw new Error("WebGL shader failed: "+reason);
    }
    return sh;
}
function program(gl,textured=false){
    const vs=shader(gl,gl.VERTEX_SHADER,`attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_mvp;
varying highp float v_hsl_w;
varying highp float v_w;
varying highp vec2 v_uv;
void main(){
    vec4 v=u_mvp*vec4(a_position,1.0);
    gl_Position=v;
    v_hsl_w=a_color.x*v.w;
    v_w=v.w;
    v_uv=a_color.yz;
}`);
    const fs=shader(gl,gl.FRAGMENT_SHADER,`precision highp float;
uniform sampler2D u_palette;
uniform bool u_wireframe;
uniform sampler2D u_texture;
varying highp float v_hsl_w;
varying highp float v_w;
varying highp vec2 v_uv;
void main(){
    ${textured?`vec4 texel=texture2D(u_texture,v_uv);
    if(texel.a<0.1)discard;
    float light=clamp(v_hsl_w/v_w,2.0,126.0)/128.0;
    gl_FragColor=vec4(texel.rgb*light,1.0);return;`:""}
    if(u_wireframe){gl_FragColor=vec4(1.0);return;}
    float hsl=clamp(floor(v_hsl_w/v_w),0.0,65535.0);
    vec2 cell=vec2(mod(hsl,256.0),floor(hsl/256.0));
    gl_FragColor=texture2D(u_palette,(cell+0.5)/256.0);
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


export function buildTileGeometry(shape,rotation,heights,cornerColors) {
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
        return {position:coordinates[code],code};
    });
    const indices=tileShapeFaces[shape],faces=[];
    for(let i=0;i<indices.length;i+=4){
        const corners=indices.slice(i+1,i+4).map(v=>v<4?(v-rotation)&3:v);
        const isOverlay=indices[i]===1;
        const colors=cornerColors?.[isOverlay?"overlay":"underlay"];
        faces.push({isOverlay,vertices:corners.map(v=>{
            const vertex=vertices[v];
            if(!colors)return vertex.position;
            const [sw,se,ne,nw]=colors;
            const values=[0,sw,(sw+se)>>1,se,(se+ne)>>1,ne,(ne+nw)>>1,nw,
                (nw+sw)>>1,(sw+se)>>1,(se+ne)>>1,(ne+nw)>>1,(nw+sw)>>1,sw,se,ne,nw];
            return [...vertex.position,values[vertex.code]];
        })});
    }
    return faces;
}

function buildPlaneMesh(terrain){
    if(!terrain||terrain.side!==64||terrain.heights?.length!==4096||
        terrain.underlays?.length!==4096||terrain.overlays?.length!==4096||
        terrain.overlayShapes&&terrain.overlayShapes.length!==4096||
        terrain.overlayRotations&&terrain.overlayRotations.length!==4096) {
        throw new Error("Invalid terrain mesh input");
    }
    const levels=Array.from({length:4},()=>[]),textured=new Map();
    const materials=terrain.floorMaterials;
    const lighting=materials?prepareFloorLighting(terrain,materials):null;
    for(let x=0;x<64;x++)for(let y=0;y<64;y++){
        const i=x*64+y,overlay=terrain.overlays[i]&0x7fff;
        const shape=overlay?(terrain.overlayShapes?.[i]??0)+1:0;
        const rotation=overlay?(terrain.overlayRotations?.[i]??0):0;
        const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];
        const heights=corners.map(([vx,vy])=>sampleTerrain(terrain,"heights",vx,vy));
        if(heights.some(h=>h===undefined))continue;
        const cornerIndices=corners.map(([vx,vy])=>vx*(lighting?.lightSide??64)+vy);
        const underlayDef=materials?.underlays?.get(terrain.underlays[i]-1);
        const underlay=underlayDef?.textureId>=0?-1:(lighting?.underlays[i]??-1);
        const overlayHsl=lighting?.overlays.get(overlay-1)??-1;
        const underlayTex=underlayDef?.textureId??-1,overlayTex=materials?.overlays?.get(overlay-1)?.textureId??-1;
        const colors=lighting?{
            underlay:cornerIndices.map(c=>underlayTex>=0?Math.max(2,Math.min(126,lighting.lights[c])):adjustFloorLight(underlay,lighting.lights[c])),
            overlay:cornerIndices.map(c=>overlayTex>=0?Math.max(2,Math.min(126,lighting.lights[c])):adjustFloorLight(overlayHsl,lighting.lights[c])),
        }:undefined;
        const level=sceneLevel(terrain.baseTerrain??terrain,terrain.plane??0,x,y);
        for(const face of buildTileGeometry(shape,rotation,heights,colors)){
            const texture=face.isOverlay?overlayTex:underlayTex;
            let numbers=levels[level];
            if(lighting&&texture>=0){
                if(!terrain.textures?.has(texture))continue;
                const key=`${level}:${texture}`;
                if(!textured.has(key))textured.set(key,{level,texture,numbers:[]});
                numbers=textured.get(key).numbers;
            }else if(lighting&&(face.isOverlay?overlayHsl:underlay)===-1)continue;
            for(const [vx,vy,h,hsl] of face.vertices) {
                numbers.push(x+vx-31.5,-h/128,y+vy-31.5,hsl??0,
                    texture>=0?x+vx:0,texture>=0?y+vy:0);
            }
        }
    }
    return {levels,textured};
}

export function buildTerrainMesh(terrain){return new Float32Array(buildPlaneMesh(terrain).levels.flat());}

export function buildTerrainScene(terrain){
    const levels=Array.from({length:4},()=>[]),texturedBatches=[];
    for(let p=0;p<4;p++){
        const view=terrainPlane(terrain,p);if(!view||p>0&&!terrain.floorMaterials)continue;
        const mesh=buildPlaneMesh(view);
        for(let level=0;level<4;level++)for(const v of mesh.levels[level])levels[level].push(v);
        for(const b of mesh.textured.values())texturedBatches.push({level:b.level,texture:b.texture,vertices:new Float32Array(b.numbers)});
    }
    return {vertices:new Float32Array(levels.flat()),levelCounts:levels.map(v=>v.length/6),texturedBatches};
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
        this.textureProgram=program(gl,true);this.textures=new Map();this.terrainBatches=[];this.sceneryBatches=[];this.visibleLevel=0;
        this.buf=gl.createBuffer();
        this.sceneryBuf=gl.createBuffer();this.sceneryCount=0;
        this.palette=gl.createTexture();
        const pixels=new Uint8Array(65536*4);
        for(let i=0;i<HSL_PALETTE.length;i++){
            const rgb=HSL_PALETTE[i];
            pixels.set([rgb>>>16&255,rgb>>>8&255,rgb&255,255],i*4);
        }
        gl.bindTexture(gl.TEXTURE_2D,this.palette);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
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
        const scene=buildTerrainScene(terrain),mesh=scene.vertices;
        this.drawMode=terrain.floorMaterials?gl.TRIANGLES:gl.LINES;
        const vertices=terrain.floorMaterials?mesh:terrainWireframe(mesh);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        this.count=vertices.length/6;
        this.terrainLevelCounts=this.drawMode===gl.LINES?scene.levelCounts.map(n=>n*2):scene.levelCounts;
        this.replaceBatches("terrainBatches",scene.texturedBatches);
        if(resetCamera){
            this.target=[0,-terrain.heights[32*64+32]/128,0];
            this.setScenery(null);
        }
    }
    setScenery(scene){
        const vertices=scene?.vertices??new Float32Array();
        if(!(vertices instanceof Float32Array)||vertices.length%18)throw new Error("Invalid scenery mesh");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.sceneryBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.STATIC_DRAW);
        this.sceneryCount=vertices.length/6;
        this.sceneryLevelCounts=scene?.levelCounts??[this.sceneryCount,0,0,0];
        this.replaceBatches("sceneryBatches",scene?.texturedBatches??[]);
        for(const texture of this.textures.values())this.gl.deleteTexture(texture);
        this.textures.clear();
        const gl=this.gl;
        for(const [id,data] of scene?.textures??[]){
            if((data.size!==64&&data.size!==128)||data.pixels?.length!==data.size*data.size*4)throw new Error("Invalid scene texture");
            const texture=gl.createTexture();this.textures.set(id,texture);
            gl.bindTexture(gl.TEXTURE_2D,texture);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,data.size,data.size,0,gl.RGBA,gl.UNSIGNED_BYTE,data.pixels);
        }
    }
    setSceneLevel(level){validateSceneLevel(level);this.visibleLevel=level;}
    replaceBatches(name,batches){
        const gl=this.gl;
        for(const batch of this[name])gl.deleteBuffer(batch.buffer);
        this[name]=batches.map(b=>{
            if(!(b.vertices instanceof Float32Array)||b.vertices.length%18)throw new Error("Invalid textured mesh");
            const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,b.vertices,gl.STATIC_DRAW);
            return {buffer,count:b.vertices.length/6,texture:b.texture,level:b.level};
        });
    }
    render(){
        const gl=this.gl,canvas=this.canvas;
        const w=Math.max(1,Math.floor(canvas.clientWidth*Math.min(2,window.devicePixelRatio||1)));
        const h=Math.max(1,Math.floor(canvas.clientHeight*Math.min(2,window.devicePixelRatio||1)));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        if(!this.count&&!this.sceneryCount&&!this.terrainBatches.length&&!this.sceneryBatches.length)return;
        const p=this.pitch,d=this.distance;
        const eye=[
            this.target[0]+Math.sin(this.yaw)*Math.cos(p)*d,
            this.target[1]+Math.sin(p)*d,
            this.target[2]+Math.cos(this.yaw)*Math.cos(p)*d,
        ];
        const matrix=multiply(perspective(w/h),lookAt(eye,this.target));
        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.palette);
        gl.uniform1i(gl.getUniformLocation(this.program,"u_palette"),0);
        gl.uniform1i(gl.getUniformLocation(this.program,"u_wireframe"),this.drawMode===gl.LINES?1:0);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program,"u_mvp"),false,matrix);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
        const a=gl.getAttribLocation(this.program,"a_position"),c=gl.getAttribLocation(this.program,"a_color");
        gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(c);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
        gl.drawArrays(this.drawMode,0,this.terrainLevelCounts?.slice(0,this.visibleLevel+1).reduce((a,b)=>a+b,0)??this.count);
        if(this.sceneryCount){
            gl.uniform1i(gl.getUniformLocation(this.program,"u_wireframe"),0);
            gl.bindBuffer(gl.ARRAY_BUFFER,this.sceneryBuf);
            gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);
            gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
            gl.drawArrays(gl.TRIANGLES,0,this.sceneryLevelCounts.slice(0,this.visibleLevel+1).reduce((a,b)=>a+b,0));
        }
        gl.useProgram(this.textureProgram);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.textureProgram,"u_mvp"),false,matrix);
        gl.uniform1i(gl.getUniformLocation(this.textureProgram,"u_texture"),0);
        const ta=gl.getAttribLocation(this.textureProgram,"a_position"),tc=gl.getAttribLocation(this.textureProgram,"a_color");
        gl.enableVertexAttribArray(ta);gl.enableVertexAttribArray(tc);
        for(const batch of [...this.terrainBatches,...this.sceneryBatches]){
            const texture=this.textures.get(batch.texture);if(!texture||batch.level>this.visibleLevel)continue;
            gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);
            gl.vertexAttribPointer(ta,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(tc,3,gl.FLOAT,false,24,12);
            gl.drawArrays(gl.TRIANGLES,0,batch.count);
        }
    }
    dispose(){
        this.disposed=true;cancelAnimationFrame(this.raf);
        for(const [name,fn] of [["pointerdown",this.onPointerDown],["pointermove",this.onPointerMove],
            ["pointerup",this.onPointerUp],["pointercancel",this.onPointerUp],["wheel",this.onWheel]]) {
            this.canvas.removeEventListener(name,fn);
        }
        window.removeEventListener("keydown",this.onKey);
        this.gl.deleteBuffer(this.buf);this.gl.deleteBuffer(this.sceneryBuf);this.gl.deleteTexture(this.palette);
        this.gl.deleteProgram(this.program);
        this.gl.deleteProgram(this.textureProgram);
        for(const texture of this.textures.values())this.gl.deleteTexture(texture);
        for(const batch of [...this.terrainBatches,...this.sceneryBatches])this.gl.deleteBuffer(batch.buffer);
    }
}
