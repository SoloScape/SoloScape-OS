/*
BSD 2-Clause License

Copyright (c) 2022-2026, dennisdev, xrsps
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
// Keep physical map heights separate from the logical levels of bridge columns.
export function sceneLevel(terrain,plane,x,y){
    if(!Number.isInteger(plane)||plane<0||plane>3)throw new Error("Invalid map plane");
    const bridge=(terrain.planes?.[1]?.renderFlags?.[x*64+y]??0)&2;
    return plane>0&&bridge?plane-1:plane;
}

/** A plane-specific view keeps the existing terrain sampler's verified halo. */
export function terrainPlane(terrain,plane){
    const data=terrain.planes?.[plane]??(plane===0?terrain:null);
    if(!data)return null;
    const view={...terrain,...data,plane,baseTerrain:terrain};
    if(terrain.neighbours){
        view.neighbours=new Map();
        for(const [offset,region] of terrain.neighbours){
            const p=region.planes?.[plane]??(plane===0?region:null);
            if(p)view.neighbours.set(offset,{...region,...p,plane});
        }
    }
    return view;
}

export function validateSceneLevel(level){
    if(!Number.isInteger(level)||level<0||level>3)throw new Error("Invalid visible scene level");
}
