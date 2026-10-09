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
import {SceneTileModel} from "./tsps-runtime/rs-scene-SceneTileModel.mjs";
import {terrainPlane,sceneLevel,validateSceneLevel} from "./scene-planes.mjs";
import {NpcLongPress} from "./npc-pointer.mjs";
import {nativeRoofPlaneLimit} from "./native-roof-adapter.mjs";
import {isKnownWaterTextureId} from "./tsps-runtime/common-world-WaterTextureIds.mjs";
import {resolveFogRange,HD_AUTO_FOG_DEPTH_FACTOR} from "./tsps-runtime/render-RenderDistancePolicy.mjs";
// Native scene distances are tiles, unlike RuneLite's client zoom values.
export const GAME_CAMERA_ZOOM=Object.freeze({default:12,min:6,max:24});
// Local OpenOSRS rev-240 CameraService policy and CameraController drag adapter.
export const GAME_CAMERA_ROTATION=Object.freeze({
    units:16384,minPitch:1024*2*Math.PI/16384,maxPitch:3064*2*Math.PI/16384,
    radiansPerPixel:16*2*Math.PI/16384,
});
export function rotateCamera(camera,dx,dy){
    const {minPitch,maxPitch,radiansPerPixel}=GAME_CAMERA_ROTATION;
    camera.yaw=((camera.yaw-dx*radiansPerPixel)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
    camera.pitch=Math.max(minPitch,Math.min(maxPitch,camera.pitch+dy*radiansPerPixel));
}
export const CLASSIC_DRAW_DISTANCE=25;

// OpenOSRS TextureManager.computeTextureAnimations and gpu/vert.glsl:
// integer client ticks, directions 1/3 vertical and 2/4 horizontal, 1/128 UV.
const TEXTURE_DIRECTIONS=[[0,0],[0,-1],[-1,0],[0,1],[1,0]];
export function textureAnimationOffset(def,elapsedMs){
    const direction=def?.animationDirection??0,speed=def?.animationSpeed??0;
    if(!Number.isInteger(direction)||direction<0||direction>4||!Number.isFinite(speed)||
        !Number.isFinite(elapsedMs)||elapsedMs<0)return [0,0];
    const [u,v]=TEXTURE_DIRECTIONS[direction];
    const steps=Math.floor(elapsedMs/20)*speed/128;
    return [(u*steps)%1,(v*steps)%1];
}

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
    // Match TSPS's small view-depth priority layers without moving world
    // geometry or UVs. Projection near/far are .2/350: -projection[3][2].
    float layer=floor(fract(a_color.x)*32.0+0.5);
    v.z-=0.4002287*0.001*layer/max(v.w,0.2);
    gl_Position=v;
    v_hsl_w=floor(a_color.x)*v.w;
    v_w=v.w;
    v_uv=a_color.yz;
    v_scenePosition=a_position.xz;
}`);
    const fs=shader(gl,gl.FRAGMENT_SHADER,`precision highp float;
uniform sampler2D u_palette;
uniform bool u_wireframe;
uniform sampler2D u_texture;
uniform vec2 u_textureShift;
uniform vec4 u_drawBounds;
uniform vec2 u_fogPlayer;
uniform float u_fogDepth;
uniform float u_fogEnd;
uniform vec3 u_fogColor;
uniform float u_fogEnabled;
uniform float u_opacity;
varying highp float v_hsl_w;
varying highp float v_w;
varying highp vec2 v_uv;
varying highp vec2 v_scenePosition;
void main(){
    if(v_scenePosition.x<u_drawBounds.x||v_scenePosition.y<u_drawBounds.y||
        v_scenePosition.x>=u_drawBounds.z||v_scenePosition.y>=u_drawBounds.w)discard;
    ${textured?`vec4 texel=texture2D(u_texture,v_uv+u_textureShift);
    if(texel.a<0.1)discard;
    float light=clamp(v_hsl_w/v_w,2.0,126.0)/127.0;
    gl_FragColor=vec4(texel.rgb*light,1.0);`:""}
    if(u_wireframe){gl_FragColor=vec4(1.0);return;}
    float hsl=clamp(floor(v_hsl_w/v_w+0.01),0.0,65535.0);
    vec2 cell=vec2(mod(hsl,256.0),floor(hsl/256.0));
    if(!${textured?"true":"false"})gl_FragColor=texture2D(u_palette,(cell+0.5)/256.0);
    vec2 delta=abs(v_scenePosition-u_fogPlayer);
    float d=max(delta.x,delta.y)-u_fogEnd;
    float ramp=max(0.0001,u_fogEnd-u_fogDepth);
    float fog=clamp(d/ramp+1.0,0.0,1.0);
    fog=fog*fog*(3.0-2.0*fog)*u_fogEnabled;
    gl_FragColor=vec4(mix(gl_FragColor.rgb,u_fogColor,fog),gl_FragColor.a*u_opacity);
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

/** Emit triangles from the pinned TSPS SceneTileModel class rather than
 * reproducing tile shape and rotation math a second time. Native mesh vertex
 * units are tiles; the pinned model uses 128 units per tile. */
export function buildTspsFloorTile({shape,rotation,heights,lights,underlayHsl,overlayHsl,overlayTexture=-1}){
    if(!Number.isInteger(shape)||shape<0||shape>12||
        !Number.isInteger(rotation)||rotation<0||rotation>3||
        heights?.length!==4||lights?.length!==4)
        throw new Error("Invalid pinned TSPS floor tile input");
    const tile=new SceneTileModel(shape,rotation,overlayTexture,0,0,
        heights[0],heights[1],heights[2],heights[3],
        lights[0],lights[1],lights[2],lights[3],
        underlayHsl,underlayHsl,underlayHsl,underlayHsl,
        overlayHsl,overlayHsl,-1,-1);
    return tile.faces.map(face=>({isOverlay:face.isOverlay,
        vertices:face.vertices.map(v=>[v.x/128,v.z/128,v.y,v.hsl])}));
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
        // Pinned TSPS tile faces replace the local reconstruction for cache floors.
        // Textured underlays still use the legacy mesh pending the TSPS material adapter.
        const faces=lighting&&underlayTex<0?buildTspsFloorTile({shape,rotation,heights,
            lights:cornerIndices.map(c=>lighting.lights[c]),underlayHsl:underlay,
            overlayHsl:overlayTex>=0?-1:overlayHsl<0?-2:overlayHsl,
            overlayTexture:overlayTex}):buildTileGeometry(shape,rotation,heights,colors);
        for(const face of faces){
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
    const levels=Array.from({length:4},()=>[]),texturedBatches=[],transparentBatches=[];
    const shift=(vertices,dx,dy)=>{const out=vertices.slice();for(let i=0;i<out.length;i+=6){out[i]+=dx;out[i+2]+=dy;}return out;};
    for(const {scene,dx=0,dy=0} of scenes){
        let start=0;
        for(let level=0;level<4;level++){
            const count=(scene.levelCounts?.[level]??(level===0?scene.vertices.length/6:0))*6;
            levels[level].push(shift(scene.vertices.subarray(start,start+count),dx,dy));start+=count;
        }
        for(const b of scene.texturedBatches??[])texturedBatches.push({...b,vertices:shift(b.vertices,dx,dy)});
        for(const b of scene.transparentBatches??[])transparentBatches.push({...b,vertices:shift(b.vertices,dx,dy)});
    }
    const vertices=new Float32Array(levels.flat().reduce((n,v)=>n+v.length,0));let at=0;
    for(const v of levels.flat()){vertices.set(v,at);at+=v.length;}
    const pickMeshes=scenes.flatMap(({scene,dx=0,dy=0})=>(scene.pickMeshes??[]).map(loc=>({
        ...loc,x:loc.x+dx,y:loc.y+dy,vertices:shift(loc.vertices,dx,dy),
    })));
    return {vertices,levelCounts:levels.map(parts=>parts.reduce((n,v)=>n+v.length/6,0)),texturedBatches,transparentBatches,pickMeshes};
}

// Sort across materials and scene owners, rather than rendering each alpha
// texture separately. Clip W is view depth for the scene perspective matrix.
export function sortTransparentFaces(batches,matrix,drawLevel=3){
    const faces=[];
    for(const batch of batches){
        if(batch.level>drawLevel)continue;
        for(let at=0;at<batch.vertices.length;at+=18){
            let depth=0;
            for(let v=at;v<at+18;v+=6)depth+=matrix[3]*batch.vertices[v]+matrix[7]*batch.vertices[v+1]+matrix[11]*batch.vertices[v+2]+matrix[15];
            faces.push({batch,first:at/6,depth:depth/3});
        }
    }
    return faces.sort((a,b)=>b.depth-a.depth);
}

// Low-overhead transparency sorting for mobile. The desktop renderer sorts
// every alpha triangle for exact blending; on iOS that creates one draw call
// plus uniforms/buffer bindings per face, often thousands every RAF. Sort
// larger material/alpha batches instead: one GL draw per batch, at the cost of
// approximate alpha ordering *inside* foliage, water and glass batches.
const alphaCenters=new WeakMap();
export function sortTransparentBatches(batches,matrix,drawLevel=3){
    const visible=[];
    for(const batch of batches){
        if(batch.level>drawLevel||!batch.vertices?.length)continue;
        let center=alphaCenters.get(batch.vertices);
        if(!center){
            const values=batch.vertices;
            let x=0,y=0,z=0,count=0;
            // Estimate the batch centroid once per mesh, not once per frame.
            for(let at=0;at<values.length;at+=6){
                x+=values[at];y+=values[at+1];z+=values[at+2];count++;
            }
            center=[x/count,y/count,z/count];
            alphaCenters.set(batch.vertices,center);
        }
        const depth=matrix[3]*center[0]+matrix[7]*center[1]+matrix[11]*center[2]+matrix[15];
        visible.push({batch,first:0,count:batch.count??batch.vertices.length/6,depth});
    }
    return visible.sort((a,b)=>b.depth-a.depth);
}

// Reuse one hit record per scan. Reject triangles outside the draw window before
// projecting them; exact perspective-correct bounds/depth checks still decide hits.
function pickTriangle(vertices,i,m,nx,ny,bounds,hit){
    const ax=vertices[i],ay=vertices[i+1],az=vertices[i+2];
    const bx=vertices[i+6],by=vertices[i+7],bz=vertices[i+8];
    const cx=vertices[i+12],cy=vertices[i+13],cz=vertices[i+14];
    if(bounds&&(Math.max(ax,bx,cx)<bounds[0]||Math.max(az,bz,cz)<bounds[1]||
        Math.min(ax,bx,cx)>=bounds[2]||Math.min(az,bz,cz)>=bounds[3]))return false;
    const aw=m[3]*ax+m[7]*ay+m[11]*az+m[15];
    const bw=m[3]*bx+m[7]*by+m[11]*bz+m[15];
    const cw=m[3]*cx+m[7]*cy+m[11]*cz+m[15];
    if(aw<=0||bw<=0||cw<=0)return false;
    const aX=(m[0]*ax+m[4]*ay+m[8]*az+m[12])/aw;
    const aY=(m[1]*ax+m[5]*ay+m[9]*az+m[13])/aw;
    const bX=(m[0]*bx+m[4]*by+m[8]*bz+m[12])/bw;
    const bY=(m[1]*bx+m[5]*by+m[9]*bz+m[13])/bw;
    const cX=(m[0]*cx+m[4]*cy+m[8]*cz+m[12])/cw;
    const cY=(m[1]*cx+m[5]*cy+m[9]*cz+m[13])/cw;
    const d=(bY-cY)*(aX-cX)+(cX-bX)*(aY-cY);
    if(Math.abs(d)<1e-10)return false;
    const u=((bY-cY)*(nx-cX)+(cX-bX)*(ny-cY))/d;
    const v=((cY-aY)*(nx-cX)+(aX-cX)*(ny-cY))/d,w=1-u-v;
    if(u<0||v<0||w<0)return false;
    const depth=u*(m[2]*ax+m[6]*ay+m[10]*az+m[14])/aw+
        v*(m[2]*bx+m[6]*by+m[10]*bz+m[14])/bw+
        w*(m[2]*cx+m[6]*cy+m[10]*cz+m[14])/cw;
    if(depth< -1||depth>1||depth>=hit.depth)return false;
    const ua=u/aw,vb=v/bw,wc=w/cw,sum=ua+vb+wc;
    const x=(ua*ax+vb*bx+wc*cx)/sum,z=(ua*az+vb*bz+wc*cz)/sum;
    if(!withinDrawBounds(x,z,bounds))return false;
    hit.depth=depth;hit.x=x;hit.z=z;return true;
}

// Bounds belong to uploaded poses, not object origins: large models may straddle
// the draw window. Refresh them whenever a scene/animation supplies its meshes.
const pickMeshBounds=new WeakMap();
function preparePickMeshes(meshes){
    for(const {vertices} of meshes){
        if(!(vertices instanceof Float32Array)||vertices.length%18)continue;
        let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
        for(let i=0;i<vertices.length;i+=6){
            minX=Math.min(minX,vertices[i]);maxX=Math.max(maxX,vertices[i]);
            minZ=Math.min(minZ,vertices[i+2]);maxZ=Math.max(maxZ,vertices[i+2]);
        }
        pickMeshBounds.set(vertices,[minX,minZ,maxX,maxZ]);
    }
    return meshes;
}

export function pickTerrainTile(vertices,matrix,nx,ny,bounds=null){
    const hit={depth:Infinity,x:0,z:0};let found=false;
    for(let i=0;i<vertices.length;i+=18){
        if(pickTriangle(vertices,i,matrix,nx,ny,bounds,hit))found=true;
    }
    return found?{x:Math.floor(hit.x+31.5),y:Math.floor(hit.z+31.5)}:null;
}

// Pick real rendered triangles, including textured geometry, by nearest depth.
export function pickNpcTriangles(meshes,matrix,nx,ny,bounds=null){
    const hit={depth:Infinity,x:0,z:0};let best=null;
    for(const {index,vertices} of meshes){
        if(!(vertices instanceof Float32Array)||vertices.length%18)continue;
        const extent=pickMeshBounds.get(vertices);
        if(bounds&&extent&&(extent[2]<bounds[0]||extent[3]<bounds[1]||
            extent[0]>=bounds[2]||extent[1]>=bounds[3]))continue;
        for(let i=0;i<vertices.length;i+=18){
            if(pickTriangle(vertices,i,matrix,nx,ny,bounds,hit))best=index;
        }
    }
    return best===null?null:{index:best,depth:hit.depth};
}

// Browser context menus are never appropriate over the game canvas.
// Keep hit routing independently testable from WebGL and browser startup.
export function shouldRotateCameraDrag(button,pointerType){return pointerType==="touch"||button===1;}
export function dispatchWorldContextMenu(event,{pickNpc,pickObject=()=>null,pickGround,onNpc,onObject=()=>{},onGround,onCancel}){
    event.preventDefault();
    const npc=pickNpc(event.clientX,event.clientY);
    const object=pickObject(event.clientX,event.clientY);
    if(npc&&(!object||npc.depth===undefined||npc.depth<=object.depth)){
        onNpc({...npc,mode:"menu",run:Boolean(event.shiftKey)});return "npc";
    }
    if(object){onObject({...object,mode:"menu",run:Boolean(event.shiftKey)});return "object";}
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
// Mobile WebGL must not render a 2x Retina framebuffer every frame. This
// budget reduces fill-rate cost while leaving text/interface canvas sharp.
export function worldRenderPixels(width,height,devicePixelRatio=1,touch=false){
    const cssWidth=Math.max(1,width),cssHeight=Math.max(1,height);
    const ratio=Math.min(touch?1.25:2,
        Number.isFinite(devicePixelRatio)?devicePixelRatio:1,
        touch?Math.sqrt(850000/(cssWidth*cssHeight)):2);
    return {width:Math.max(1,Math.floor(cssWidth*ratio)),
        height:Math.max(1,Math.floor(cssHeight*ratio))};
}
// Consolidate static opaque, same-texture geometry across adjacent regions.
// Original cache UVs/positions and level boundaries are preserved byte-for-byte.
// Do not use for alpha batches, where depth and material sorting still matter.
export function mergeOpaqueTextureBatches(batches){
    const grouped=new Map(),order=[];
    for(const batch of batches){
        if(!(batch.vertices instanceof Float32Array)||batch.vertices.length%18)
            throw new Error("Invalid opaque scene mesh batch");
        const key=batch.level+":"+batch.texture;
        let group=grouped.get(key);
        if(!group){
            group={level:batch.level,texture:batch.texture,chunks:[],length:0};
            grouped.set(key,group);order.push(group);
        }
        if(batch.vertices.length){
            group.chunks.push(batch.vertices);group.length+=batch.vertices.length;
        }
    }
    return order.map(group=>{
        const vertices=new Float32Array(group.length);
        let offset=0;
        for(const chunk of group.chunks){vertices.set(chunk,offset);offset+=chunk.length;}
        return {level:group.level,texture:group.texture,vertices};
    });
}
export class NativeTerrainViewport {
    constructor(canvas,{onDestination=()=>{}}={}) {
        this.canvas=canvas;
        this.touch=Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
        this.gl=canvas.getContext("webgl",{antialias:!this.touch,alpha:false}) ||
            canvas.getContext("experimental-webgl");
        if(!this.gl)throw new Error("WebGL not supported on this device");
        const gl=this.gl;
        this.program=program(gl);
        this.textureProgram=program(gl,true);this.textures=new Map();this.textureMeta=new Map();this.textureClock=performance.now();this.terrainBatches=[];this.sceneryBatches=[];this.visibleLevel=0;
        this.buf=gl.createBuffer();
        this.sceneryBuf=gl.createBuffer();this.sceneryCount=0;
        this.actorBuf=gl.createBuffer();this.actorCount=0;this.actorBatches=[];this.actorPickMeshes=[];
        this.sceneryPickMeshes=[];this.onDestination=onDestination;this.onClickCross=()=>{};
        this.onNpc=()=>{};this.onObject=()=>{};this.onNpcCancel=()=>{};this.onGroundMenu=()=>{};
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
            return npc?{index:npc.index,x:clientX-rect.left,y:clientY-rect.top,depth:npc.depth}:null;
        };
        this.pickObjectAt=(clientX,clientY)=>{
            const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
            const nx=2*(clientX-rect.left)/rect.width-1,ny=1-2*(clientY-rect.top)/rect.height;
            const matrix=sceneCameraMatrix(this.target,this.yaw,this.pitch,this.distance,rect.width/rect.height);
            const plane=this.roofContext?.player?.plane??this.visibleLevel;
            const roofLevel=this.visibleRoofLevel();
            const valid=[...this.sceneryPickMeshes,...(this.dynamicPickMeshes??[])].filter(loc=>loc.plane===plane&&loc.level<=roofLevel);
            const hit=pickNpcTriangles(valid.map((loc,index)=>({index,vertices:loc.vertices})),matrix,nx,ny,this.drawBounds());
            if(!hit)return null;
            const loc=valid[hit.index];
            return {id:loc.id,name:loc.name,actions:loc.actions,tileX:loc.x,tileY:loc.y,
                plane:loc.plane,x:clientX-rect.left,y:clientY-rect.top,depth:hit.depth};
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
            if(e.pointerType==="touch"||e.button===0||e.button===1)
                canvas.setPointerCapture?.(e.pointerId);
            if(e.button===1)e.preventDefault();};
        this.onPointerMove=e=>{
            if(!this.pointer||this.pointer.id!==e.pointerId)return;
            const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;
            this.longPress.move(e.pointerId,e.clientX,e.clientY);
            // RuneLite desktop: only middle drag rotates; left-click selects,
            // right-click opens the menu. Touch dragging remains camera orbit.
            this.pointer.dragged ||=Math.hypot(e.clientX-this.pointer.startX,e.clientY-this.pointer.startY)>6;
            if(!shouldRotateCameraDrag(this.pointer.button,this.pointer.pointerType)||!this.pointer.dragged)return;
            rotateCamera(this,dx,dy);
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
            const npc=this.pickNpcAt(e.clientX,e.clientY),object=this.pickObjectAt(e.clientX,e.clientY);
            if(object&&(!npc||object.depth<npc.depth)){
                this.onObject({...object,run:e.shiftKey,mode:"default"});
                return;
            }
            if(npc){
                this.onNpc({...npc,run:e.shiftKey,mode:"default"});
                return;
            }
            this.onNpcCancel();
            if(pointer.button!==0||!this.pickVertices)return;
            const count=this.pickLevelCounts.slice(0,this.visibleRoofLevel()+1).reduce((a,b)=>a+b,0)*6;
            const tile=pickTerrainTile(this.pickVertices.subarray(0,count),matrix,nx,ny,this.drawBounds());
            if(tile)this.onDestination({...tile,run:e.shiftKey,
                screenX:e.clientX-rect.left,screenY:e.clientY-rect.top});
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
                const count=this.pickLevelCounts.slice(0,this.visibleRoofLevel()+1).reduce((a,b)=>a+b,0)*6;
                const tile=pickTerrainTile(this.pickVertices.subarray(0,count),matrix,nx,ny,this.drawBounds());
                return tile?{tile,x:clientX-rect.left,y:clientY-rect.top}:null;
            };
            dispatchWorldContextMenu(e,{
                pickNpc:(x,y)=>this.pickNpcAt(x,y),pickObject:(x,y)=>this.pickObjectAt(x,y),pickGround,
                onNpc:hit=>this.onNpc(hit),onObject:hit=>this.onObject(hit),onGround:hit=>this.onGroundMenu(hit),
                onCancel:()=>this.onNpcCancel()
            });
        };
        this.onWheel=e=>{e.preventDefault();this.distance=cameraWheelDistance(this.distance,e);};
        this.onKey=e=>{
            if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||""))return;
            if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")rotateCamera(this,6,0);
            else if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")rotateCamera(this,-6,0);
            else if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")rotateCamera(this,0,3);
            else if(e.key==="ArrowDown"||e.key.toLowerCase()==="s")rotateCamera(this,0,-3);
            else return;
            e.preventDefault();
        };
        canvas.addEventListener("pointerdown",this.onPointerDown);
        canvas.addEventListener("pointermove",this.onPointerMove);
        canvas.addEventListener("pointerup",this.onPointerUp);
        canvas.addEventListener("pointercancel",this.onPointerUp);
        canvas.addEventListener("contextmenu",this.onContextMenu);
        canvas.addEventListener("wheel",this.onWheel,{passive:false});
        window.addEventListener("keydown",this.onKey);
        gl.enable(gl.DEPTH_TEST);
        // Classic black void beyond the rendered scene (also used by distance fog).
        gl.clearColor(0,0,0,1);
        this.frame=timestamp=>{
            if(this.disposed)return;
            // Record before rendering: failures must not hide an expensive
            // frame or silently stop RAF without surfacing the exception.
            this.onFrame?.(timestamp);
            const started=performance.now();
            try{this.render();}
            catch(error){
                this.onRenderError?.(error);
                if(!this.onRenderError)console.error("[native-world] WebGL rendering stopped:",error);
                return;
            }
            this.onDrawTime?.(performance.now()-started);
            if(!this.disposed)this.raf=requestAnimationFrame(this.frame);
        };
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
        this.replaceBatches("terrainBatches",this.touch?
            mergeOpaqueTextureBatches(scene.texturedBatches):scene.texturedBatches);
        if(resetCamera){
            this.target=[0,-terrain.heights[32*64+32]/128,0];
            this.setScenery(null);
        }
    }
    setScenery(scene){
        this.setDynamicScenery(null);
        const vertices=scene?.vertices??new Float32Array();
        if(!(vertices instanceof Float32Array)||vertices.length%18)throw new Error("Invalid scenery mesh");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.sceneryBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.STATIC_DRAW);
        this.sceneryCount=vertices.length/6;
        this.sceneryLevelCounts=scene?.levelCounts??[this.sceneryCount,0,0,0];
        const opaque=scene?.texturedBatches??[];
        this.replaceBatches("sceneryBatches",this.touch?mergeOpaqueTextureBatches(opaque):opaque);
        this.replaceBatches("sceneryAlphaBatches",scene?.transparentBatches??[]);
        this.sceneryPickMeshes=preparePickMeshes(scene?.pickMeshes??[]);
        for(const texture of this.textures.values())this.gl.deleteTexture(texture);
        this.textures.clear();this.textureMeta?.clear();
        this.addTextures(scene?.textures??new Map());
    }
    addTextures(textures){
        const gl=this.gl;
        for(const [id,data] of textures){
            if(this.textures.has(id))continue;
            if((data.size!==64&&data.size!==128)||data.pixels?.length!==data.size*data.size*4)throw new Error("Invalid scene texture");
            const texture=gl.createTexture();this.textures.set(id,texture);
            this.textureMeta?.set(id,data);
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
        const bytes=vertices.byteLength;
        if(bytes){
            if(this.actorCapacity>=bytes&&this.gl.bufferSubData)
                this.gl.bufferSubData(this.gl.ARRAY_BUFFER,0,vertices);
            else{
                this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.DYNAMIC_DRAW);
                this.actorCapacity=bytes;
            }
        }
        this.actorCount=vertices.length/6;
        this.replaceBatches("actorBatches",scene?.texturedBatches??[]);
        this.replaceBatches("actorAlphaBatches",scene?.transparentBatches??[]);
        this.actorPickMeshes=preparePickMeshes(scene?.npcPickMeshes??[]);
        this.addTextures(scene?.textures??new Map());
    }
    setDynamicScenery(scene){
        const next=scene?.batches??[],alpha=scene?.transparentBatches??[],pick=scene?.pickMeshes??[];
        const same=(old,incoming)=>old?.length===incoming.length&&old.every((b,i)=>
            b.vertices===incoming[i].vertices&&b.texture===incoming[i].texture&&
            b.level===incoming[i].level&&b.alpha===incoming[i].alpha);
        // Keep unchanged animated zone buffers (as OpenOSRS does for
        // unchanged static zones) instead of revisiting them every actor pass.
        if(same(this.dynamicBatches,next)&&same(this.dynamicAlphaBatches,alpha)&&
            this.dynamicPickSources?.length===pick.length&&
            this.dynamicPickSources.every((source,i)=>source===pick[i]))return;
        this.dynamicPickSources=pick;
        this.replaceBatches("dynamicBatches",next);
        this.replaceBatches("dynamicAlphaBatches",scene?.transparentBatches??[]);
        this.dynamicPickMeshes=preparePickMeshes(scene?.pickMeshes??[]);
    }
    setSceneLevel(level){validateSceneLevel(level);this.visibleLevel=level;}
    setRoofContext(regions,origin,player){this.roofContext={regions,origin,player};}
    visibleRoofLevel(){
        const ctx=this.roofContext;
        if(!ctx?.player)return this.visibleLevel;
        return nativeRoofPlaneLimit(ctx.regions,{origin:ctx.origin,player:ctx.player,
            position:this.target,yaw:this.yaw,pitch:this.pitch,distance:this.distance});
    }
    drawBounds(){return sceneDrawBounds(this.target,this.yaw,this.pitch,this.distance);}
    // Safari incurs bridge overhead for every uniform-location lookup. The
    // WebGLProgram's uniforms are stable for its lifetime; cache locations.
    uniform(program,name){
        if(!this.uniformLocations)this.uniformLocations=new WeakMap();
        let locations=this.uniformLocations.get(program);
        if(!locations){locations=new Map();this.uniformLocations.set(program,locations);}
        if(!locations.has(name))locations.set(name,this.gl.getUniformLocation(program,name));
        return locations.get(name);
    }
    uploadFog(program){
        const gl=this.gl,ctx=this.roofContext,active=!!ctx?.player&&!!ctx?.origin;
        const x=active?ctx.player.x-ctx.origin.mapX*64-31.5:0;
        const y=active?ctx.player.y-ctx.origin.mapY*64-31.5:0;
        gl.uniform2f(this.uniform(program,"u_fogPlayer"),x,y);
        const {fogEnd,fogDepth}=resolveFogRange({renderDistance:CLASSIC_DRAW_DISTANCE,
            autoFogDepth:true,autoFogDepthFactor:HD_AUTO_FOG_DEPTH_FACTOR,manualFogDepth:24});
        gl.uniform1f(this.uniform(program,"u_fogEnd"),fogEnd);
        gl.uniform1f(this.uniform(program,"u_fogDepth"),fogDepth);
        gl.uniform3f(this.uniform(program,"u_fogColor"),0,0,0);
        gl.uniform1f(this.uniform(program,"u_fogEnabled"),active?1:0);
    }
    replaceBatches(name,batches){
        const gl=this.gl;
        for(const b of batches){
            if(!(b.vertices instanceof Float32Array)||b.vertices.length%18)throw new Error("Invalid scene mesh batch");
            if(b.alpha!==undefined&&(!Number.isInteger(b.alpha)||b.alpha<1||b.alpha>254))throw new Error("Invalid scene face alpha");
        }
        const previous=this[name]??[],used=new Set();
        const dynamic=name.startsWith("dynamic"),actor=name.startsWith("actor");
        const byVertices=dynamic?new Map(previous.map(b=>[b.vertices,b])):null;
        this[name]=batches.map((b,i)=>{
            const old=dynamic?byVertices.get(b.vertices):actor?previous[i]:null;
            if(old)used.add(old);
            const buffer=old?.buffer??gl.createBuffer();
            const bytes=b.vertices.byteLength;
            let capacity=old?.capacity??old?.vertices.byteLength??0;
            if(!old||old.vertices!==b.vertices){
                gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
                if(old&&capacity>=bytes&&gl.bufferSubData){
                    if(bytes)gl.bufferSubData(gl.ARRAY_BUFFER,0,b.vertices);
                }else{
                    gl.bufferData(gl.ARRAY_BUFFER,b.vertices,actor?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
                    capacity=bytes;
                }
            }
            return {buffer,capacity,count:b.vertices.length/6,texture:b.texture,level:b.level,alpha:b.alpha,vertices:b.vertices,
                isWater:isKnownWaterTextureId(b.texture)};
        });
        for(const old of previous)if(!used.has(old))gl.deleteBuffer(old.buffer);
    }
    drawArrays(mode,first,count){
        this.drawCallCount++;
        this.gl.drawArrays(mode,first,count);
    }
    render(){
        const gl=this.gl,canvas=this.canvas;
        this.drawCallCount=0;
        const {width:w,height:h}=worldRenderPixels(canvas.clientWidth,canvas.clientHeight,
            window.devicePixelRatio||1,this.touch);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        if(!this.count&&!this.sceneryCount&&!this.terrainBatches.length&&!this.sceneryBatches.length)return;
        const matrix=sceneCameraMatrix(this.target,this.yaw,this.pitch,this.distance,w/h);
        const drawLevel=this.visibleRoofLevel();
        gl.useProgram(this.program);this.uploadFog(this.program);
        gl.uniform1f(this.uniform(this.program,"u_opacity"),1);
        const bounds=this.drawBounds();
        gl.uniform4fv(this.uniform(this.program,"u_drawBounds"),bounds);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.palette);
        gl.uniform1i(this.uniform(this.program,"u_palette"),0);
        gl.uniform1i(this.uniform(this.program,"u_wireframe"),this.drawMode===gl.LINES?1:0);
        gl.uniformMatrix4fv(this.uniform(this.program,"u_mvp"),false,matrix);
        gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);
        const a=gl.getAttribLocation(this.program,"a_position"),c=gl.getAttribLocation(this.program,"a_color");
        gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(c);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
        this.drawArrays(this.drawMode,0,this.terrainLevelCounts?.slice(0,drawLevel+1).reduce((a,b)=>a+b,0)??this.count);
        if(this.sceneryCount){
            gl.uniform1i(this.uniform(this.program,"u_wireframe"),0);
            gl.bindBuffer(gl.ARRAY_BUFFER,this.sceneryBuf);
            gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);
            gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
            this.drawArrays(gl.TRIANGLES,0,this.sceneryLevelCounts.slice(0,drawLevel+1).reduce((a,b)=>a+b,0));
        }
        if(this.actorCount){
            gl.uniform1i(this.uniform(this.program,"u_wireframe"),0);
            gl.bindBuffer(gl.ARRAY_BUFFER,this.actorBuf);
            gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
            this.drawArrays(gl.TRIANGLES,0,this.actorCount);
        }
        gl.useProgram(this.textureProgram);this.uploadFog(this.textureProgram);
        gl.uniform1f(this.uniform(this.textureProgram,"u_opacity"),1);
        gl.uniform4fv(this.uniform(this.textureProgram,"u_drawBounds"),bounds);
        gl.uniformMatrix4fv(this.uniform(this.textureProgram,"u_mvp"),false,matrix);
        gl.uniform1i(this.uniform(this.textureProgram,"u_texture"),0);
        const ta=gl.getAttribLocation(this.textureProgram,"a_position"),tc=gl.getAttribLocation(this.textureProgram,"a_color");
        gl.enableVertexAttribArray(ta);gl.enableVertexAttribArray(tc);
        for(const batch of [...this.terrainBatches,...this.sceneryBatches,...this.actorBatches]){
            const texture=this.textures.get(batch.texture);if(!texture||batch.level>drawLevel)continue;
            const meta=this.textureMeta?.get(batch.texture);
            const offset=textureAnimationOffset(meta,performance.now()-this.textureClock);
            gl.uniform2f(this.uniform(this.textureProgram,"u_textureShift"),offset[0],offset[1]);
            // Water IDs retain the pinned TSPS classification in batch metadata.
            // Foam, normals and water-material passes are not yet ported.
            gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);
            gl.vertexAttribPointer(ta,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(tc,3,gl.FLOAT,false,24,12);
            this.drawArrays(gl.TRIANGLES,0,batch.count);
        }
        for(const batch of this.dynamicBatches??[]){
            if(batch.level<=drawLevel)this.renderMaterialBatch(batch,0,batch.count,matrix,bounds,1);
        }
        this.renderTransparent(matrix,drawLevel,bounds);
        this.onDrawCalls?.(this.drawCallCount);
        // Notify the loading tracker only after actual WebGL draw calls.
        // Wireframe and actor-only frames are not a fully constructed map.
        const groundReady=this.drawMode===gl.TRIANGLES&&
            (this.count>0||this.terrainBatches.some(batch=>batch.count>0));
        if(groundReady&&this.onSceneFrame){const done=this.onSceneFrame;this.onSceneFrame=null;done();}
    }
    renderTransparent(matrix,drawLevel,bounds){
        const gl=this.gl;
        const batches=[...(this.sceneryAlphaBatches??[]),...(this.actorAlphaBatches??[]),...(this.dynamicAlphaBatches??[])];
        const faces=this.touch?sortTransparentBatches(batches,matrix,drawLevel):
            sortTransparentFaces(batches,matrix,drawLevel);
        if(!faces.length)return;
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
        try{
            for(const {batch,first,count=3} of faces){
                this.renderMaterialBatch(batch,first,count,matrix,bounds,1-batch.alpha/255);
            }
        }finally{gl.depthMask(true);gl.disable(gl.BLEND);}
    }
    renderMaterialBatch(batch,first,count,matrix,bounds,opacity){
        const gl=this.gl,textured=batch.texture>=0,texture=this.textures.get(batch.texture);
        if(textured&&!texture)return;
        const p=textured?this.textureProgram:this.program;
        gl.useProgram(p);this.uploadFog(p);
        gl.uniformMatrix4fv(this.uniform(p,"u_mvp"),false,matrix);
        gl.uniform4fv(this.uniform(p,"u_drawBounds"),bounds);
        gl.uniform1i(this.uniform(p,"u_wireframe"),0);
        gl.uniform1f(this.uniform(p,"u_opacity"),opacity);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textured?texture:this.palette);
        gl.uniform1i(this.uniform(p,textured?"u_texture":"u_palette"),0);
        if(textured){
            const offset=textureAnimationOffset(this.textureMeta.get(batch.texture),performance.now()-this.textureClock);
            gl.uniform2f(this.uniform(p,"u_textureShift"),...offset);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);
        const a=gl.getAttribLocation(p,"a_position"),c=gl.getAttribLocation(p,"a_color");
        gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(c);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
        this.drawArrays(gl.TRIANGLES,first,count);
    }
    dispose(){
        this.disposed=true;this.onSceneFrame=null;this.longPress.cancel();cancelAnimationFrame(this.raf);
        for(const [name,fn] of [["pointerdown",this.onPointerDown],["pointermove",this.onPointerMove],
            ["pointerup",this.onPointerUp],["pointercancel",this.onPointerUp],["contextmenu",this.onContextMenu],["wheel",this.onWheel]]) {
            this.canvas.removeEventListener(name,fn);
        }
        window.removeEventListener("keydown",this.onKey);
        this.gl.deleteBuffer(this.buf);this.gl.deleteBuffer(this.sceneryBuf);this.gl.deleteBuffer(this.actorBuf);this.gl.deleteTexture(this.palette);
        this.gl.deleteProgram(this.program);
        this.gl.deleteProgram(this.textureProgram);
        for(const texture of this.textures.values())this.gl.deleteTexture(texture);
        for(const batch of [...this.terrainBatches,...this.sceneryBatches,...this.actorBatches,...(this.sceneryAlphaBatches??[]),...(this.actorAlphaBatches??[]),...(this.dynamicBatches??[]),...(this.dynamicAlphaBatches??[])])this.gl.deleteBuffer(batch.buffer);
    }
}
