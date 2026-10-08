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
import {NpcLongPress} from "./npc-pointer.mjs";
// Native scene distances are tiles, unlike RuneLite's client zoom values.
export const GAME_CAMERA_ZOOM=Object.freeze({default:12,min:6,max:24});
export const CLASSIC_DRAW_DISTANCE=25;

export function sceneDrawBounds(target,yaw,pitch,distance){
    // Classic visibility is a square of tiles around the camera, not its focal point.
    // Mesh tile zero starts at -31.5, and cache north is flipped by the view matrix.
    const x=Math.floor(target[0]+Math.sin(yaw)*Math.cos(pitch)*distance+31.5)-31.5;
    const z=Math.floor(target[2]-Math.cos(yaw)*Math.cos(pitch)*distance+31.5)-31.5;
    return [x-CLASSIC_DRAW_DISTANCE,z-CLASSIC_DRAW_DISTANCE,x+CLASSIC_DRAW_DISTANCE,z+CLASSIC_DRAW_DISTANCE];
}

export function withinDrawBounds(x,z,bounds){
    return !bounds||(x>=bounds[0]&&z>=bounds[1]&&x<bounds[2]&&z<bounds[3]);
}

export function cameraWheelDistance(distance,event){
    if(event.ctrlKey)return GAME_CAMERA_ZOOM.default;
    if(!Number.isFinite(event.deltaY))return distance;
    const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?334:1);
    return Math.max(GAME_CAMERA_ZOOM.min,Math.min(GAME_CAMERA_ZOOM.max,distance*Math.exp(pixels*.001)));
}
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
varying highp vec2 v_scenePosition;
void main(){
    vec4 v=u_mvp*vec4(a_position,1.0);
    gl_Position=v;
    v_hsl_w=a_color.x*v.w;
    v_w=v.w;
    v_uv=a_color.yz;
    v_scenePosition=a_position.xz;
}`);
    const fs=shader(gl,gl.FRAGMENT_SHADER,`precision highp float;
uniform sampler2D u_palette;
uniform bool u_wireframe;
uniform sampler2D u_texture;
uniform vec4 u_drawBounds;
varying highp float v_hsl_w;
varying highp float v_w;
varying highp vec2 v_uv;
varying highp vec2 v_scenePosition;
void main(){
    if(v_scenePosition.x<u_drawBounds.x||v_scenePosition.y<u_drawBounds.y||
        v_scenePosition.x>=u_drawBounds.z||v_scenePosition.y>=u_drawBounds.w)discard;
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

export function sceneCameraMatrix(target,yaw,pitch,distance,aspect){
    // Mesh coordinates retain cache east/north, with height already flipped up.
    // WebGL's right-handed Y-up space needs north mapped to negative Z too.
    // Apply this once to the whole scene, preserving placement, lighting and UVs.
    const center=[target[0],target[1],-target[2]];
    const eye=[
        center[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
        center[1]+Math.sin(pitch)*distance,
        center[2]+Math.cos(yaw)*Math.cos(pitch)*distance,
    ];
    const cacheToWebgl=new Float32Array([1,0,0,0, 0,1,0,0, 0,0,-1,0, 0,0,0,1]);
    return multiply(multiply(perspective(aspect),lookAt(eye,center)),cacheToWebgl);
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
    if(terrain.regions){
        const scenes=terrain.regions.map(region=>({scene:buildTerrainScene(region),dx:(region.mapX-terrain.mapX)*64,dy:(region.mapY-terrain.mapY)*64}));
        return combineRegionMeshes(scenes);
    }
    const levels=Array.from({length:4},()=>[]),texturedBatches=[];
    for(let p=0;p<4;p++){
        const view=terrainPlane(terrain,p);if(!view||p>0&&!terrain.floorMaterials)continue;
        const mesh=buildPlaneMesh(view);
        for(let level=0;level<4;level++)for(const v of mesh.levels[level])levels[level].push(v);
        for(const b of mesh.textured.values())texturedBatches.push({level:b.level,texture:b.texture,vertices:new Float32Array(b.numbers)});
    }
    return {vertices:new Float32Array(levels.flat()),levelCounts:levels.map(v=>v.length/6),texturedBatches};
}

export function combineRegionMeshes(scenes){
    const levels=Array.from({length:4},()=>[]),texturedBatches=[];
    const shift=(vertices,dx,dy)=>{const out=vertices.slice();for(let i=0;i<out.length;i+=6){out[i]+=dx;out[i+2]+=dy;}return out;};
    for(const {scene,dx=0,dy=0} of scenes){
        let start=0;
        for(let level=0;level<4;level++){
            const count=(scene.levelCounts?.[level]??(level===0?scene.vertices.length/6:0))*6;
            levels[level].push(shift(scene.vertices.subarray(start,start+count),dx,dy));start+=count;
        }
        for(const b of scene.texturedBatches??[])texturedBatches.push({...b,vertices:shift(b.vertices,dx,dy)});
    }
    const vertices=new Float32Array(levels.flat().reduce((n,v)=>n+v.length,0));let at=0;
    for(const v of levels.flat()){vertices.set(v,at);at+=v.length;}
    return {vertices,levelCounts:levels.map(parts=>parts.reduce((n,v)=>n+v.length/6,0)),texturedBatches};
}

// Perspective-correct ground picking uses the same triangles/matrix as rendering.
export function pickTerrainTile(vertices,matrix,nx,ny,bounds=null){
    const project=(at)=>{
        const x=vertices[at],y=vertices[at+1],z=vertices[at+2];
        const p=[0,1,2,3].map(r=>matrix[r]*x+matrix[r+4]*y+matrix[r+8]*z+matrix[r+12]);
        return p[3]>0?[p[0]/p[3],p[1]/p[3],p[2]/p[3],p[3]]:null;
    };
    let best=null,depth=Infinity;
    for(let i=0;i<vertices.length;i+=18){
        const a=project(i),b=project(i+6),c=project(i+12);if(!a||!b||!c)continue;
        const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-10)continue;
        const u=((b[1]-c[1])*(nx-c[0])+(c[0]-b[0])*(ny-c[1]))/d;
        const v=((c[1]-a[1])*(nx-c[0])+(a[0]-c[0])*(ny-c[1]))/d,w=1-u-v;
        if(u<0||v<0||w<0)continue;
        const z=u*a[2]+v*b[2]+w*c[2];if(z< -1||z>1||z>=depth)continue;
        const weights=[u/a[3],v/b[3],w/c[3]],sum=weights.reduce((n,v)=>n+v,0);
        const x=weights.reduce((n,t,k)=>n+t*vertices[i+k*6],0)/sum;
        const y=weights.reduce((n,t,k)=>n+t*vertices[i+k*6+2],0)/sum;
        if(!withinDrawBounds(x,y,bounds))continue;
        depth=z;best={x:Math.floor(x+31.5),y:Math.floor(y+31.5)};
    }
    return best;
}

// Pick real rendered NPC triangles, including textured geometry. Compare clip
// depths so overlapping NPCs select the visible actor, not insertion order.
export function pickNpcTriangles(meshes,matrix,nx,ny,bounds=null){
    let best=null,depth=Infinity;
    for(const {index,vertices} of meshes){
        if(!(vertices instanceof Float32Array)||vertices.length%18)continue;
        const project=at=>{
            const x=vertices[at],y=vertices[at+1],z=vertices[at+2];
            const v=[0,1,2,3].map(r=>matrix[r]*x+matrix[r+4]*y+matrix[r+8]*z+matrix[r+12]);
            return v[3]>0?[v[0]/v[3],v[1]/v[3],v[2]/v[3],v[3]]:null;
        };
        for(let i=0;i<vertices.length;i+=18){
            const a=project(i),b=project(i+6),c=project(i+12);if(!a||!b||!c)continue;
            const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
            if(Math.abs(denominator)<1e-10)continue;
            const u=((b[1]-c[1])*(nx-c[0])+(c[0]-b[0])*(ny-c[1]))/denominator;
            const v=((c[1]-a[1])*(nx-c[0])+(a[0]-c[0])*(ny-c[1]))/denominator,w=1-u-v;
            if(u<0||v<0||w<0)continue;
            const z=u*a[2]+v*b[2]+w*c[2];
            const weights=[u/a[3],v/b[3],w/c[3]],sum=weights.reduce((n,t)=>n+t,0);
            const x=weights.reduce((n,t,k)=>n+t*vertices[i+k*6],0)/sum;
            const north=weights.reduce((n,t,k)=>n+t*vertices[i+k*6+2],0)/sum;
            if(!withinDrawBounds(x,north,bounds))continue;
            if(z>=-1&&z<=1&&z<depth){depth=z;best={index,depth};}
        }
    }
    return best;
}

// Browser context menus are never appropriate over the game canvas.
// Keep hit routing independently testable from WebGL and browser startup.
export function dispatchWorldContextMenu(event,{pickNpc,pickGround,onNpc,onGround,onCancel}){
    event.preventDefault();
    const npc=pickNpc(event.clientX,event.clientY);
    if(npc){onNpc({...npc,mode:"menu",run:Boolean(event.shiftKey)});return "npc";}
    const ground=pickGround(event.clientX,event.clientY);
    if(ground){onGround({...ground,run:Boolean(event.shiftKey)});return "ground";}
    onCancel();return "empty";
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
    constructor(canvas,{onDestination=()=>{}}={}) {
        this.canvas=canvas;
        this.gl=canvas.getContext("webgl",{antialias:true,alpha:false}) ||
            canvas.getContext("experimental-webgl");
        if(!this.gl)throw new Error("WebGL not supported on this device");
        const gl=this.gl;
        this.program=program(gl);
        this.textureProgram=program(gl,true);this.textures=new Map();this.terrainBatches=[];this.sceneryBatches=[];this.visibleLevel=0;
        this.buf=gl.createBuffer();
        this.sceneryBuf=gl.createBuffer();this.sceneryCount=0;
        this.actorBuf=gl.createBuffer();this.actorCount=0;this.actorBatches=[];this.actorPickMeshes=[];this.onDestination=onDestination;
        this.onNpc=()=>{};this.onNpcCancel=()=>{};this.onGroundMenu=()=>{};
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
        this.yaw=.8;this.pitch=.66;this.distance=GAME_CAMERA_ZOOM.default;
        this.target=[0,10,0];
        this.pointer=null;
        this.disposed=false;
        this.pickNpcAt=(clientX,clientY)=>{
            if(!this.actorPickMeshes.length)return null;
            const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
            const nx=2*(clientX-rect.left)/rect.width-1,ny=1-2*(clientY-rect.top)/rect.height;
            const matrix=sceneCameraMatrix(this.target,this.yaw,this.pitch,this.distance,rect.width/rect.height);
            const npc=pickNpcTriangles(this.actorPickMeshes,matrix,nx,ny,this.drawBounds());
            return npc?{index:npc.index,x:clientX-rect.left,y:clientY-rect.top}:null;
        };
        this.lastNpcHold=-Infinity;
        this.longPress=new NpcLongPress(hit=>{
            this.lastNpcHold=performance.now();this.onNpc({...hit,mode:"menu"});
        },{slop:6});
        this.onPointerDown=e=>{
            if(this.pointer)this.longPress.cancel();
            this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragged:false,button:e.button,pointerType:e.pointerType};
            if(e.pointerType==="touch"&&e.isPrimary!==false){
                const hit=this.pickNpcAt(e.clientX,e.clientY);
                this.longPress.start(e.pointerId,e.clientX,e.clientY,hit?{...hit,run:false}:null);
            }
            canvas.setPointerCapture?.(e.pointerId);};
        this.onPointerMove=e=>{
            if(!this.pointer||this.pointer.id!==e.pointerId)return;
            const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;
            this.longPress.move(e.pointerId,e.clientX,e.clientY);
            this.pointer.dragged ||=Math.hypot(e.clientX-this.pointer.startX,e.clientY-this.pointer.startY)>6;
            if(!this.pointer.dragged)return;
            this.yaw+=dx*.007;this.pitch=Math.max(.18,Math.min(1.38,this.pitch+dy*.007));
            this.pointer.x=e.clientX;this.pointer.y=e.clientY;
        };
        this.onPointerUp=e=>{
            if(this.pointer?.id!==e.pointerId)return;
            const pointer=this.pointer;this.pointer=null;
            const held=this.longPress.finish(e.pointerId);
            if(e.type==="pointercancel"||held||pointer.dragged||pointer.button!==0)return;
            const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
            const nx=2*(e.clientX-rect.left)/rect.width-1,ny=1-2*(e.clientY-rect.top)/rect.height;
            const matrix=sceneCameraMatrix(this.target,this.yaw,this.pitch,this.distance,rect.width/rect.height);
            const npc=this.pickNpcAt(e.clientX,e.clientY);
            if(npc){
                this.onNpc({...npc,run:e.shiftKey,mode:"default"});
                return;
            }
            this.onNpcCancel();
            if(pointer.button!==0||!this.pickVertices)return;
            const count=this.pickLevelCounts.slice(0,this.visibleLevel+1).reduce((a,b)=>a+b,0)*6;
            const tile=pickTerrainTile(this.pickVertices.subarray(0,count),matrix,nx,ny,this.drawBounds());
            if(tile)this.onDestination({...tile,run:e.shiftKey});
        };
        this.onContextMenu=e=>{
            // Suppress the native "Save image as..." canvas menu even when no NPC
            // triangle is directly under the pointer.
            e.preventDefault();
            // Mobile OSes may synthesise contextmenu before or after our hold.
            if(e.pointerType==="touch"||e.sourceCapabilities?.firesTouchEvents||
                this.pointer?.pointerType==="touch"||performance.now()-this.lastNpcHold<800)return;
            this.longPress.cancel();
            const rect=canvas.getBoundingClientRect();
            const pickGround=(clientX,clientY)=>{
                if(!this.pickVertices||!rect.width||!rect.height)return null;
                const nx=2*(clientX-rect.left)/rect.width-1,ny=1-2*(clientY-rect.top)/rect.height;
                const matrix=sceneCameraMatrix(this.target,this.yaw,this.pitch,this.distance,rect.width/rect.height);
                const count=this.pickLevelCounts.slice(0,this.visibleLevel+1).reduce((a,b)=>a+b,0)*6;
                const tile=pickTerrainTile(this.pickVertices.subarray(0,count),matrix,nx,ny,this.drawBounds());
                return tile?{tile,x:clientX-rect.left,y:clientY-rect.top}:null;
            };
            dispatchWorldContextMenu(e,{
                pickNpc:(x,y)=>this.pickNpcAt(x,y),pickGround,
                onNpc:hit=>this.onNpc(hit),onGround:hit=>this.onGroundMenu(hit),
                onCancel:()=>this.onNpcCancel()
            });
        };
        this.onWheel=e=>{e.preventDefault();this.distance=cameraWheelDistance(this.distance,e);};
        this.onKey=e=>{
            if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||""))return;
            const step=3;
            if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")this.target[0]-=step;
            else if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")this.target[0]+=step;
            else if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")this.target[2]+=step;
            else if(e.key==="ArrowDown"||e.key.toLowerCase()==="s")this.target[2]-=step;
            else return;
            e.preventDefault();
            this.target[0]=Math.max(-30,Math.min(30,this.target[0]));
            this.target[2]=Math.max(-30,Math.min(30,this.target[2]));
        };
        canvas.addEventListener("pointerdown",this.onPointerDown);
        canvas.addEventListener("pointermove",this.onPointerMove);
        canvas.addEventListener("pointerup",this.onPointerUp);
        canvas.addEventListener("pointercancel",this.onPointerUp);
        canvas.addEventListener("contextmenu",this.onContextMenu);
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
        this.pickVertices=mesh;this.pickLevelCounts=scene.levelCounts;
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
        this.addTextures(scene?.textures??new Map());
    }
    addTextures(textures){
        const gl=this.gl;
        for(const [id,data] of textures){
            if(this.textures.has(id))continue;
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
    setActors(scene){
        const vertices=scene?.vertices??new Float32Array();
        if(!(vertices instanceof Float32Array)||vertices.length%18)throw new Error("Invalid player mesh");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.actorBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.DYNAMIC_DRAW);this.actorCount=vertices.length/6;
        this.replaceBatches("actorBatches",scene?.texturedBatches??[]);
        this.addTextures(scene?.textures??new Map());
    }
    setSceneLevel(level){validateSceneLevel(level);this.visibleLevel=level;}
    drawBounds(){return sceneDrawBounds(this.target,this.yaw,this.pitch,this.distance);}
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
        const matrix=sceneCameraMatrix(this.target,this.yaw,this.pitch,this.distance,w/h);
        gl.useProgram(this.program);
        const bounds=this.drawBounds();
        gl.uniform4fv(gl.getUniformLocation(this.program,"u_drawBounds"),bounds);
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
        if(this.actorCount){
            gl.uniform1i(gl.getUniformLocation(this.program,"u_wireframe"),0);
            gl.bindBuffer(gl.ARRAY_BUFFER,this.actorBuf);
            gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
            gl.drawArrays(gl.TRIANGLES,0,this.actorCount);
        }
        gl.useProgram(this.textureProgram);
        gl.uniform4fv(gl.getUniformLocation(this.textureProgram,"u_drawBounds"),bounds);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.textureProgram,"u_mvp"),false,matrix);
        gl.uniform1i(gl.getUniformLocation(this.textureProgram,"u_texture"),0);
        const ta=gl.getAttribLocation(this.textureProgram,"a_position"),tc=gl.getAttribLocation(this.textureProgram,"a_color");
        gl.enableVertexAttribArray(ta);gl.enableVertexAttribArray(tc);
        for(const batch of [...this.terrainBatches,...this.sceneryBatches,...this.actorBatches]){
            const texture=this.textures.get(batch.texture);if(!texture||batch.level>this.visibleLevel)continue;
            gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);
            gl.vertexAttribPointer(ta,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(tc,3,gl.FLOAT,false,24,12);
            gl.drawArrays(gl.TRIANGLES,0,batch.count);
        }
    }
    dispose(){
        this.disposed=true;this.longPress.cancel();cancelAnimationFrame(this.raf);
        for(const [name,fn] of [["pointerdown",this.onPointerDown],["pointermove",this.onPointerMove],
            ["pointerup",this.onPointerUp],["pointercancel",this.onPointerUp],["contextmenu",this.onContextMenu],["wheel",this.onWheel]]) {
            this.canvas.removeEventListener(name,fn);
        }
        window.removeEventListener("keydown",this.onKey);
        this.gl.deleteBuffer(this.buf);this.gl.deleteBuffer(this.sceneryBuf);this.gl.deleteBuffer(this.actorBuf);this.gl.deleteTexture(this.palette);
        this.gl.deleteProgram(this.program);
        this.gl.deleteProgram(this.textureProgram);
        for(const texture of this.textures.values())this.gl.deleteTexture(texture);
        for(const batch of [...this.terrainBatches,...this.sceneryBatches,...this.actorBatches])this.gl.deleteBuffer(batch.buffer);
    }
}
