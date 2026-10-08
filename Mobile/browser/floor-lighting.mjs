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
// Colour conversion adapted from pinned TSPS ColorUtil; integer terrain lighting
// and blending cross-checked against the deobfuscated Java OSRS client.
const HUE_OFFSET=0.0078125;
const SATURATION_OFFSET=0.0625;

export function buildPalette(brightness, var2, var3) {
    const palette = new Int32Array(65536);

    let paletteIndex = var2 * 128;

    for (let var5 = var2; var5 < var3; var5++) {
        const var6 = (var5 >> 3) / 64.0 + HUE_OFFSET;
        const var8 = (var5 & 7) / 8.0 + SATURATION_OFFSET;

        for (let var10 = 0; var10 < 128; var10++) {
            const var11 = var10 / 128.0;
            let var13 = var11;
            let var15 = var11;
            let var17 = var11;
            if (var8 !== 0.0) {
                let var19;
                if (var11 < 0.5) {
                    var19 = var11 * (1.0 + var8);
                } else {
                    var19 = var11 + var8 - var11 * var8;
                }

                const var21 = 2.0 * var11 - var19;
                let var23 = var6 + 0.3333333333333333;
                if (var23 > 1.0) {
                    var23--;
                }

                let var27 = var6 - 0.3333333333333333;
                if (var27 < 0.0) {
                    var27++;
                }

                if (6.0 * var23 < 1.0) {
                    var13 = var21 + (var19 - var21) * 6.0 * var23;
                } else if (2.0 * var23 < 1.0) {
                    var13 = var19;
                } else if (3.0 * var23 < 2.0) {
                    var13 = var21 + (var19 - var21) * (0.6666666666666666 - var23) * 6.0;
                } else {
                    var13 = var21;
                }

                if (6.0 * var6 < 1.0) {
                    var15 = var21 + (var19 - var21) * 6.0 * var6;
                } else if (2.0 * var6 < 1.0) {
                    var15 = var19;
                } else if (3.0 * var6 < 2.0) {
                    var15 = var21 + (var19 - var21) * (0.6666666666666666 - var6) * 6.0;
                } else {
                    var15 = var21;
                }

                if (6.0 * var27 < 1.0) {
                    var17 = var21 + (var19 - var21) * 6.0 * var27;
                } else if (2.0 * var27 < 1.0) {
                    var17 = var19;
                } else if (3.0 * var27 < 2.0) {
                    var17 = var21 + (var19 - var21) * (0.6666666666666666 - var27) * 6.0;
                } else {
                    var17 = var21;
                }
            }

            const r = (var13 * 256.0) | 0;
            const g = (var15 * 256.0) | 0;
            const b = (var17 * 256.0) | 0;
            let rgb = (r << 16) + (g << 8) + b;

            rgb = brightenRgb(rgb, brightness);
            if (rgb === 0) {
                rgb = 1;
            }

            palette[paletteIndex++] = rgb;
        }
    }

    return palette;
}

export function brightenRgb(rgb, brightness) {
    let r = (rgb >> 16) / 256.0;
    let g = ((rgb >> 8) & 255) / 256.0;
    let b = (rgb & 255) / 256.0;
    r = Math.pow(r, brightness);
    g = Math.pow(g, brightness);
    b = Math.pow(b, brightness);
    const newR = (r * 256.0) | 0;
    const newG = (g * 256.0) | 0;
    const newB = (b * 256.0) | 0;
    return (newR << 16) | (newG << 8) | newB;
}

export function packHsl(hue, saturation, lightness) {
    if (lightness > 179) {
        saturation = (saturation / 2) | 0;
    }

    if (lightness > 192) {
        saturation = (saturation / 2) | 0;
    }

    if (lightness > 217) {
        saturation = (saturation / 2) | 0;
    }

    if (lightness > 243) {
        saturation = (saturation / 2) | 0;
    }

    return ((saturation / 32) << 7) + ((hue / 4) << 10) + ((lightness / 2) | 0);
}

export function calculateFloorHsl(rgb) {
    const r = ((rgb >> 16) & 255) / 256.0;
    const g = ((rgb >> 8) & 255) / 256.0;
    const b = (rgb & 255) / 256.0;

    let minRgb = r;
    if (g < minRgb) {
        minRgb = g;
    }
    if (b < minRgb) {
        minRgb = b;
    }

    let maxRgb = r;
    if (g > maxRgb) {
        maxRgb = g;
    }
    if (b > maxRgb) {
        maxRgb = b;
    }

    let hueTemp = 0.0;
    let sat = 0.0;
    const light = (maxRgb + minRgb) / 2.0;

    if (minRgb !== maxRgb) {
        if (light < 0.5) {
            sat = (maxRgb - minRgb) / (maxRgb + minRgb);
        }
        if (light >= 0.5) {
            sat = (maxRgb - minRgb) / (2.0 - maxRgb - minRgb);
        }

        if (maxRgb === r) {
            hueTemp = (g - b) / (maxRgb - minRgb);
        } else if (maxRgb === g) {
            hueTemp = 2.0 + (b - r) / (maxRgb - minRgb);
        } else if (maxRgb === b) {
            hueTemp = 4.0 + (r - g) / (maxRgb - minRgb);
        }
    }

    hueTemp /= 6.0;

    let saturation = (sat * 256.0) | 0;
    let lightness = (light * 256.0) | 0;

    if (saturation < 0) {
        saturation = 0;
    } else if (saturation > 255) {
        saturation = 255;
    }

    if (lightness < 0) {
        lightness = 0;
    } else if (lightness > 255) {
        lightness = 255;
    }

    let hueMultiplier;
    if (light > 0.5) {
        hueMultiplier = (512.0 * (sat * (1.0 - light))) | 0;
    } else {
        hueMultiplier = (512.0 * (sat * light)) | 0;
    }

    if (hueMultiplier < 1) {
        hueMultiplier = 1;
    }

    const hue = (hueMultiplier * hueTemp) | 0;

    return { hue, saturation, lightness, hueMultiplier, overlayHue:(hueTemp*256)|0 };
}


export function adjustFloorLight(hsl,light){
    if(hsl===-1)return -1;
    return (hsl&0xff80)+Math.max(2,Math.min(126,((hsl&127)*light)>>7));
}

function requireTerrain(terrain){
    if(terrain?.side!==64||terrain.heights?.length!==4096||
        terrain.underlays?.length!==4096)throw new Error("Invalid terrain lighting data");
}

export function calculateVertexLights(terrain){
    requireTerrain(terrain);
    const lights=new Int32Array(4096);
    const occlusion=terrain.lightOcclusions;
    if(occlusion&&(!(occlusion instanceof Uint8Array)||occlusion.length!==4096)) {
        throw new Error("Invalid terrain light occlusions");
    }
    const intensity=(Math.trunc(Math.sqrt(5100))*768)>>8;
    for(let x=1;x<63;x++)for(let y=1;y<63;y++){
        const i=x*64+y;
        const dx=terrain.heights[i+64]-terrain.heights[i-64];
        const dy=terrain.heights[i+1]-terrain.heights[i-1];
        const length=Math.trunc(Math.sqrt(dx*dx+dy*dy+65536));
        const nx=Math.trunc((dx<<8)/length);
        const ny=Math.trunc(65536/length);
        const nz=Math.trunc((dy<<8)/length);
        const sunlight=Math.trunc((-50*nx-10*ny-50*nz)/intensity)+96;
        const shadow=occlusion?(occlusion[i-64]>>2)+(occlusion[i-1]>>2)+
            (occlusion[i+64]>>3)+(occlusion[i+1]>>3)+(occlusion[i]>>1):0;
        lights[i]=sunlight-shadow;
    }
    return lights;
}

/** Java client's radius-five sliding window includes offsets -4 through +5. */
export function blendUnderlayHsl(terrain,materials){
    requireTerrain(terrain);
    const definitions=new Map();
    for(const [id,definition] of materials.underlays){
        if(Number.isInteger(definition.rgb)&&definition.rgb>=0&&definition.rgb<=0xffffff) {
            definitions.set(id,calculateFloorHsl(definition.rgb));
        }
    }
    const colors=new Int32Array(4096).fill(-1);
    const columns=Array.from({length:6},()=>new Int32Array(64));
    function column(x,sign){
        if(x<0||x>=64)return;
        for(let y=0;y<64;y++){
            const id=terrain.underlays[x*64+y];
            if(!id)continue;
            const def=definitions.get(id-1);
            if(!def){columns[5][y]+=sign;continue;}
            const values=[def.hue,def.saturation,def.lightness,def.hueMultiplier,1];
            for(let k=0;k<5;k++)columns[k][y]+=sign*values[k];
        }
    }
    for(let x=-5;x<64;x++){
        column(x+5,1);column(x-5,-1);
        if(x<0)continue;
        const sum=new Int32Array(6);
        for(let y=-5;y<64;y++){
            for(let k=0;k<6;k++){
                if(y+5<64)sum[k]+=columns[k][y+5];
                if(y-5>=0)sum[k]-=columns[k][y-5];
            }
            if(y<0||!terrain.underlays[x*64+y]||sum[5]||!sum[4])continue;
            colors[x*64+y]=packHsl(Math.trunc(sum[0]*256/sum[3]),
                Math.trunc(sum[1]/sum[4]),Math.trunc(sum[2]/sum[4]));
        }
    }
    return colors;
}

export function prepareFloorLighting(terrain,materials){
    const underlays=blendUnderlayHsl(terrain,materials);
    const lights=calculateVertexLights(terrain);
    const overlays=new Map();
    for(const [id,definition] of materials.overlays){
        if(definition.textureId>=0||definition.rgb===0xff00ff)continue;
        if(!Number.isInteger(definition.rgb)||definition.rgb<0||definition.rgb>0xffffff)continue;
        const hsl=calculateFloorHsl(definition.rgb);
        overlays.set(id,packHsl(hsl.overlayHue,hsl.saturation,hsl.lightness));
    }
    return {underlays,overlays,lights};
}

export const HSL_PALETTE=buildPalette(0.8,0,512);
