// Classic SceneBuilder shade grid and Scene/ModelData normal joining, adapted
// from the pinned BSD TSPS reference (licence in scenery-models.mjs).
import {sampleTerrain} from "./floor-lighting.mjs";

export function addObjectShadow(terrain,loc,d,geometry){
    if(d.clipped===false)return;
    const write=(x,y,value)=>{
        const dx=Math.floor(x/64),dy=Math.floor(y/64);
        const target=dx===0&&dy===0?terrain:terrain.neighbours?.get(`${dx},${dy}`);
        if(!target)return;
        // terrainPlane returns a shallow view. Persist newly created grids in
        // the source region/plane so a later terrain rebuild receives shadows.
        const root=terrain.baseTerrain??terrain;
        const region=dx===0&&dy===0?root:root.neighbours?.get(`${dx},${dy}`);
        const plane=terrain.plane??0;
        const data=region?.planes?.[plane]??region??target;
        data.lightOcclusions??=new Uint8Array(4096);
        target.lightOcclusions=data.lightOcclusions;
        const at=(x-dx*64)*64+y-dy*64;
        target.lightOcclusions[at]=Math.max(target.lightOcclusions[at],value);
    };
    const {x,y,rotation:r,shape}=loc;
    if(shape===10||shape===11){
        let sizeX=d.sizeX,sizeY=d.sizeY;if(r&1)[sizeX,sizeY]=[sizeY,sizeX];
        const radius=geometry?Math.ceil(Math.sqrt(geometry.vertices.reduce((n,v)=>Math.max(n,v[0]*v[0]+v[2]*v[2]),0))):0;
        const shade=geometry&&!d.mergeNormals&&d.seqId<0&&!d.transforms?Math.min(30,Math.floor(radius/4)):15;
        for(let sx=x;sx<=x+sizeX;sx++)for(let sy=y;sy<=y+sizeY;sy++)write(sx,sy,shade);
    }else if(shape===0){
        for(const [sx,sy] of [[[0,0],[0,1]],[[0,1],[1,1]],[[1,0],[1,1]],[[0,0],[1,0]]][r])write(x+sx,y+sy,50);
    }else if(shape===1||shape===3){
        const [sx,sy]=[[0,1],[1,1],[1,0],[0,0]][r];write(x+sx,y+sy,50);
    }
}

function placement(entry){
    const {terrain,loc,d,part}=entry;
    let sx=d.sizeX,sy=d.sizeY;if(loc.rotation&1)[sx,sy]=[sy,sx];
    const h=[[loc.x+(sx>>1),loc.y+(sy>>1)],[loc.x+((sx+1)>>1),loc.y+(sy>>1)],
        [loc.x+(sx>>1),loc.y+((sy+1)>>1)],[loc.x+((sx+1)>>1),loc.y+((sy+1)>>1)]]
        .map(([x,y])=>sampleTerrain(terrain,"heights",x,y));
    if(h.some(v=>v===undefined))throw new Error("Joined location footprint lacks terrain heights");
    return {x:(terrain.mapX??0)*64+loc.x,y:(terrain.mapY??0)*64+loc.y,sx,sy,
        cx:((terrain.mapX??0)*64+loc.x)*128+sx*64+(part.dx??0),
        cz:((terrain.mapY??0)*64+loc.y)*128+sy*64+(part.dy??0),height:h.reduce((n,v)=>n+v,0)>>2};
}

// Eligibility follows the reference's forward current-plane perimeter and
// complete next-plane perimeter. Floor decorations join only floor neighbours.
function neighbour(a,b){
    const A=a.position,B=b.position,ap=a.loc.plane,bp=b.loc.plane;
    if(a.loc===b.loc)return a.loc.shape===2?{hide:false}:null;
    if(a.loc.shape===22||b.loc.shape===22){
        if(a.loc.shape!==22||b.loc.shape!==22||ap!==bp)return null;
        return [[1,0],[0,1],[1,1],[1,-1]].some(([x,y])=>B.x-A.x===x&&B.y-A.y===y)?{hide:true}:null;
    }
    if(bp!==ap&&bp!==ap+1)return null;
    const next=bp!==ap;
    // A large placement occurs in every tile of its footprint in Scene.tiles.
    for(let x=B.x;x<B.x+B.sx;x++)for(let y=B.y;y<B.y+B.sy;y++){
        if(x<A.x-(next?1:0)||x>A.x+A.sx||y<A.y-1||y>A.y+A.sy)continue;
        if(next||x>=A.x+A.sx||y>=A.y+A.sy||y<A.y&&x!==A.x)return {hide:!next};
    }
    return null;
}

export function joinSceneNormals(entries){
    const eligible=entries.filter(e=>e.d.mergeNormals&&e.d.seqId<0&&!e.d.transforms&&
        (e.loc.shape<=3||e.loc.shape===9||e.loc.shape>=10));
    for(const entry of eligible){
        entry.position=placement(entry);entry.geometry.joinedNormals=entry.geometry.normals.map(n=>n.slice());
        entry.geometry.hiddenFaces=new Set();
        entry.normalIndex=new Map();
        (entry.geometry.normalVertices??entry.geometry.vertices).forEach((v,i)=>{
            if(!entry.geometry.normals[i][3])return;
            const p=entry.position,key=[v[0]+p.cx,v[1]+p.height,v[2]+p.cz].join(",");
            (entry.normalIndex.get(key)??entry.normalIndex.set(key,[]).get(key)).push(i);
        });
    }
    // Spatial buckets keep this linear in scene size plus nearby candidates,
    // rather than comparing every vertex/placement in a loaded map.
    const cells=new Map();
    // An upper-plane large loc can overlap a lower-plane neighbour while its
    // anchor lies outside the lower loc's search area. Index its whole footprint.
    for(const e of eligible){const p=e.position;
        for(let x=Math.floor(p.x/8);x<=Math.floor((p.x+p.sx-1)/8);x++)
            for(let y=Math.floor(p.y/8);y<=Math.floor((p.y+p.sy-1)/8);y++){
                const key=`${e.loc.plane}:${x}:${y}`;
                (cells.get(key)??cells.set(key,[]).get(key)).push(e);
            }}
    const seen=new Set(),ids=new Map(eligible.map((e,i)=>[e,i]));
    for(const a of eligible){
        const A=a.position;
        for(let plane=a.loc.plane;plane<=a.loc.plane+1;plane++)
            for(let cx=Math.floor((A.x-1)/8);cx<=Math.floor((A.x+A.sx+1)/8);cx++)
                for(let cy=Math.floor((A.y-1)/8);cy<=Math.floor((A.y+A.sy+1)/8);cy++)
                    for(const b of cells.get(`${plane}:${cx}:${cy}`)??[]){
                        if(a===b)continue;
                        const key=[ids.get(a),ids.get(b)].sort((x,y)=>x-y).join(":");if(seen.has(key))continue;
                        const relation=neighbour(a,b)??neighbour(b,a);if(!relation)continue;seen.add(key);
                        const matchedA=new Set(),matchedB=new Set();let count=0;
                        for(const [vertex,aa] of a.normalIndex){
                            const bb=b.normalIndex.get(vertex);if(!bb)continue;
                            for(const i of aa)for(const j of bb){
                                for(let k=0;k<4;k++){
                                    a.geometry.joinedNormals[i][k]+=b.geometry.normals[j][k];
                                    b.geometry.joinedNormals[j][k]+=a.geometry.normals[i][k];
                                }
                                matchedA.add(i);matchedB.add(j);count++;
                            }
                        }
                        if(relation.hide&&count>=3)for(const [e,matched] of [[a,matchedA],[b,matchedB]])
                            e.geometry.faces.forEach((f,i)=>{if(f.indices.every(v=>matched.has(v)))e.geometry.hiddenFaces.add(i);});
                    }
    }
}
