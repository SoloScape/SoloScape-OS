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
// Decode-only adaptation of pinned TSPS ModelData (b9ca431).
// Uses a strict reader. Placement, transformations and lighting live in scenery-models.mjs.
import { ByteBuffer } from "./cache-reader.mjs";
export class CacheModel {
    constructor(){this.version=-1;this.verticesCount=0;this.usedVertexCount=0;this.faceCount=0;this.priority=0;}
    decode(data           )       {
        if (data[data.length - 1] === -3 && data[data.length - 2] === -1) {
            this.decodeV3(data);
            this.usedVertexCount = this.verticesCount;
        } else if (data[data.length - 1] === -2 && data[data.length - 2] === -1) {
            this.decodeV2(data);
            this.usedVertexCount = this.verticesCount;
        } else if (data[data.length - 1] === -1 && data[data.length - 2] === -1) {
            this.decodeV1(data);
        } else {
            this.decodeOld(data);
        }
    }

    decodeV3(data           )       {
        this.version = 3;
        const buf1 = new ByteBuffer(data);
        const buf2 = new ByteBuffer(data);
        const buf3 = new ByteBuffer(data);
        const buf4 = new ByteBuffer(data);
        const buf5 = new ByteBuffer(data);
        const buf6 = new ByteBuffer(data);
        const buf7 = new ByteBuffer(data);
        buf1.offset = data.length - 26;
        const vertexCount = buf1.readUnsignedShort();
        const faceCount = buf1.readUnsignedShort();
        const texTriangleCount = buf1.readUnsignedByte();
        const var12 = buf1.readUnsignedByte();
        const var13 = buf1.readUnsignedByte();
        const var14 = buf1.readUnsignedByte();
        const var15 = buf1.readUnsignedByte();
        const var16 = buf1.readUnsignedByte();
        const var17 = buf1.readUnsignedByte();
        const hasMayaGroups = buf1.readUnsignedByte();
        const var19 = buf1.readUnsignedShort();
        const var20 = buf1.readUnsignedShort();
        const var21 = buf1.readUnsignedShort();
        const var22 = buf1.readUnsignedShort();
        const var23 = buf1.readUnsignedShort();
        const var24 = buf1.readUnsignedShort();
        let simpleTextureFaceCount = 0;
        let complexTextureFaceCount = 0;
        let cubeTextureFaceCount = 0;
        if (texTriangleCount > 0) {
            this.textureRenderTypes = new Int8Array(texTriangleCount);
            buf1.offset = 0;

            for (let i = 0; i < texTriangleCount; i++) {
                const type = (this.textureRenderTypes[i] = buf1.readByte());
                if (type === 0) {
                    simpleTextureFaceCount++;
                }

                if (type >= 1 && type <= 3) {
                    complexTextureFaceCount++;
                }

                if (type === 2) {
                    cubeTextureFaceCount++;
                }
            }
        }

        let var28 = texTriangleCount + vertexCount;
        const var30 = var28;
        if (var12 === 1) {
            var28 += faceCount;
        }

        const var31 = var28;
        var28 += faceCount;
        const var32 = var28;
        if (var13 === 255) {
            var28 += faceCount;
        }

        const var33 = var28;
        if (var15 === 1) {
            var28 += faceCount;
        }

        const var34 = var28;
        var28 += var24;
        const var35 = var28;
        if (var14 === 1) {
            var28 += faceCount;
        }

        const var36 = var28;
        var28 += var22;
        const var37 = var28;
        if (var16 === 1) {
            var28 += faceCount * 2;
        }

        const var38 = var28;
        var28 += var23;
        const var39 = var28;
        var28 += faceCount * 2;
        const var40 = var28;
        var28 += var19;
        const var41 = var28;
        var28 += var20;
        const var42 = var28;
        var28 += var21;
        const var43 = var28;
        var28 += simpleTextureFaceCount * 6;
        const var44 = var28;
        var28 += complexTextureFaceCount * 6;
        const var45 = var28;
        var28 += complexTextureFaceCount * 6;
        const var46 = var28;
        var28 += complexTextureFaceCount * 2;
        const var47 = var28;
        var28 += complexTextureFaceCount;
        const var48 = var28;
        var28 += complexTextureFaceCount * 2 + cubeTextureFaceCount * 2;
        this.verticesCount = vertexCount;
        this.faceCount = faceCount;
        this.textureFaceCount = texTriangleCount;
        this.verticesX = new Int32Array(vertexCount);
        this.verticesY = new Int32Array(vertexCount);
        this.verticesZ = new Int32Array(vertexCount);
        this.indices1 = new Int32Array(faceCount);
        this.indices2 = new Int32Array(faceCount);
        this.indices3 = new Int32Array(faceCount);
        if (var17 === 1) {
            this.vertexSkins = new Int32Array(vertexCount);
        }

        if (var12 === 1) {
            this.faceRenderTypes = new Int8Array(faceCount);
        }

        if (var13 === 255) {
            this.faceRenderPriorities = new Int8Array(faceCount);
        } else {
            this.priority = var13;
        }

        if (var14 === 1) {
            this.faceAlphas = new Int8Array(faceCount);
        }

        if (var15 === 1) {
            this.faceSkins = new Int32Array(faceCount);
        }

        if (var16 === 1) {
            this.faceTextures = new Int16Array(faceCount);
        }

        if (var16 === 1 && texTriangleCount > 0) {
            this.textureCoords = new Int8Array(faceCount);
        }

        if (hasMayaGroups === 1) {
            this.animMayaGroups = new Array(vertexCount);
            this.animMayaScales = new Array(vertexCount);
        }

        this.faceColors = new Uint16Array(faceCount);
        if (texTriangleCount > 0) {
            this.textureMappingP = new Int16Array(texTriangleCount);
            this.textureMappingM = new Int16Array(texTriangleCount);
            this.textureMappingN = new Int16Array(texTriangleCount);
            if (complexTextureFaceCount > 0) {
                this.textureScaleX = new Int32Array(complexTextureFaceCount);
                this.textureScaleY = new Int32Array(complexTextureFaceCount);
                this.textureScaleZ = new Int32Array(complexTextureFaceCount);
                this.textureRotation = new Int8Array(complexTextureFaceCount);
                this.textureDirection = new Int8Array(complexTextureFaceCount);
                this.textureSpeed = new Int32Array(complexTextureFaceCount);
            }
            if (cubeTextureFaceCount > 0) {
                this.textureTransU = new Int32Array(cubeTextureFaceCount);
                this.textureTransV = new Int32Array(cubeTextureFaceCount);
            }
        }

        buf1.offset = texTriangleCount;
        buf2.offset = var40;
        buf3.offset = var41;
        buf4.offset = var42;
        buf5.offset = var34;
        let lastVertX = 0;
        let lastVertY = 0;
        let lastVertZ = 0;

        for (let i = 0; i < vertexCount; i++) {
            const flag = buf1.readUnsignedByte();
            let deltaVertX = 0;
            if ((flag & 1) !== 0) {
                deltaVertX = buf2.readSmart2();
            }

            let deltaVertY = 0;
            if ((flag & 2) !== 0) {
                deltaVertY = buf3.readSmart2();
            }

            let deltaVertZ = 0;
            if ((flag & 4) !== 0) {
                deltaVertZ = buf4.readSmart2();
            }

            this.verticesX[i] = lastVertX + deltaVertX;
            this.verticesY[i] = lastVertY + deltaVertY;
            this.verticesZ[i] = lastVertZ + deltaVertZ;
            lastVertX = this.verticesX[i];
            lastVertY = this.verticesY[i];
            lastVertZ = this.verticesZ[i];
            if (var17 === 1 && this.vertexSkins) {
                this.vertexSkins[i] = buf5.readUnsignedByte();
            }
        }

        if (hasMayaGroups === 1) {
            for (let i = 0; i < vertexCount; i++) {
                const var54 = buf5.readUnsignedByte();
                this.animMayaGroups[i] = new Int32Array(var54);
                this.animMayaScales[i] = new Int32Array(var54);

                for (let j = 0; j < var54; j++) {
                    this.animMayaGroups[i][j] = buf5.readUnsignedByte();
                    this.animMayaScales[i][j] = buf5.readUnsignedByte();
                }
            }
        }

        buf1.offset = var39;
        buf2.offset = var30;
        buf3.offset = var32;
        buf4.offset = var35;
        buf5.offset = var33;
        buf6.offset = var37;
        buf7.offset = var38;

        for (let i = 0; i < faceCount; i++) {
            this.faceColors[i] = buf1.readUnsignedShort();
            if (var12 === 1 && this.faceRenderTypes) {
                this.faceRenderTypes[i] = buf2.readByte();
            }

            if (var13 === 255) {
                this.faceRenderPriorities[i] = buf3.readByte();
            }

            if (var14 === 1) {
                this.faceAlphas[i] = buf4.readByte();
            }

            if (var15 === 1 && this.faceSkins) {
                this.faceSkins[i] = buf5.readUnsignedByte();
            }

            if (var16 === 1 && this.faceTextures) {
                this.faceTextures[i] = buf6.readUnsignedShort() - 1;
            }

            if (this.textureCoords && this.faceTextures && this.faceTextures[i] !== -1) {
                this.textureCoords[i] = buf7.readUnsignedByte() - 1;
            }
        }

        buf1.offset = var36;
        buf2.offset = var31;
        let var53 = 0;
        let var54 = 0;
        let var55 = 0;
        let var56 = 0;

        for (let i = 0; i < faceCount; i++) {
            const type = buf2.readUnsignedByte();
            if (type === 1) {
                var53 = buf1.readSmart2() + var56;
                var54 = buf1.readSmart2() + var53;
                var55 = buf1.readSmart2() + var54;
                var56 = var55;
                this.indices1[i] = var53;
                this.indices2[i] = var54;
                this.indices3[i] = var55;
            }

            if (type === 2) {
                var54 = var55;
                var55 = buf1.readSmart2() + var56;
                var56 = var55;
                this.indices1[i] = var53;
                this.indices2[i] = var54;
                this.indices3[i] = var55;
            }

            if (type === 3) {
                var53 = var55;
                var55 = buf1.readSmart2() + var56;
                var56 = var55;
                this.indices1[i] = var53;
                this.indices2[i] = var54;
                this.indices3[i] = var55;
            }

            if (type === 4) {
                const var59 = var53;
                var53 = var54;
                var54 = var59;
                var55 = buf1.readSmart2() + var56;
                var56 = var55;
                this.indices1[i] = var53;
                this.indices2[i] = var59;
                this.indices3[i] = var55;
            }
        }

        buf1.offset = var43;
        buf2.offset = var44;
        buf3.offset = var45;
        buf4.offset = var46;
        buf5.offset = var47;
        buf6.offset = var48;

        for (let i = 0; i < texTriangleCount; i++) {
            const type = this.textureRenderTypes[i] & 255;
            if (type === 0) {
                this.textureMappingP[i] = buf1.readUnsignedShort();
                this.textureMappingM[i] = buf1.readUnsignedShort();
                this.textureMappingN[i] = buf1.readUnsignedShort();
            }
        }

        buf1.offset = var28;
        const var57 = buf1.readUnsignedByte();
        if (var57 !== 0) {
            // new ModelData0();
            buf1.readUnsignedShort();
            buf1.readUnsignedShort();
            buf1.readUnsignedShort();
            buf1.readInt();
        }
    }

    decodeV2(data           )       {
        this.version = 2;
        let var2 = false;
        let var3 = false;
        const buf1 = new ByteBuffer(data);
        const buf2 = new ByteBuffer(data);
        const buf3 = new ByteBuffer(data);
        const buf4 = new ByteBuffer(data);
        const buf5 = new ByteBuffer(data);
        buf1.offset = data.length - 23;
        const vertexCount = buf1.readUnsignedShort();
        const faceCount = buf1.readUnsignedShort();
        const texTriangleCount = buf1.readUnsignedByte();
        const var12 = buf1.readUnsignedByte();
        const var13 = buf1.readUnsignedByte();
        const var14 = buf1.readUnsignedByte();
        const var15 = buf1.readUnsignedByte();
        const hasVertexSkins = buf1.readUnsignedByte();
        const hasMayaGroups = buf1.readUnsignedByte();
        const var18 = buf1.readUnsignedShort();
        const var19 = buf1.readUnsignedShort();
        const var20 = buf1.readUnsignedShort();
        const var21 = buf1.readUnsignedShort();
        const var22 = buf1.readUnsignedShort();
        let var23 = 0;
        let var47 = var23 + vertexCount;
        const var25 = var47;
        var47 += faceCount;
        const var26 = var47;
        if (var13 === 255) {
            var47 += faceCount;
        }

        const var27 = var47;
        if (var15 === 1) {
            var47 += faceCount;
        }

        const var28 = var47;
        if (var12 === 1) {
            var47 += faceCount;
        }

        const var29 = var47;
        var47 += var22;
        const var30 = var47;
        if (var14 === 1) {
            var47 += faceCount;
        }

        const var31 = var47;
        var47 += var21;
        const var32 = var47;
        var47 += faceCount * 2;
        const var33 = var47;
        var47 += texTriangleCount * 6;
        const var34 = var47;
        var47 += var18;
        const var35 = var47;
        var47 += var19;
        // const var10000 = var47 + var20;
        this.verticesCount = vertexCount;
        this.faceCount = faceCount;
        this.textureFaceCount = texTriangleCount;
        this.verticesX = new Int32Array(vertexCount);
        this.verticesY = new Int32Array(vertexCount);
        this.verticesZ = new Int32Array(vertexCount);
        this.indices1 = new Int32Array(faceCount);
        this.indices2 = new Int32Array(faceCount);
        this.indices3 = new Int32Array(faceCount);
        if (texTriangleCount > 0) {
            this.textureRenderTypes = new Int8Array(texTriangleCount);
            this.textureMappingP = new Int16Array(texTriangleCount);
            this.textureMappingM = new Int16Array(texTriangleCount);
            this.textureMappingN = new Int16Array(texTriangleCount);
        }

        if (hasVertexSkins === 1) {
            this.vertexSkins = new Int32Array(vertexCount);
        }

        if (var12 === 1) {
            this.faceRenderTypes = new Int8Array(faceCount);
            this.textureCoords = new Int8Array(faceCount);
            this.faceTextures = new Int16Array(faceCount);
        }

        if (var13 === 255) {
            this.faceRenderPriorities = new Int8Array(faceCount);
        } else {
            this.priority = var13;
        }

        if (var14 === 1) {
            this.faceAlphas = new Int8Array(faceCount);
        }

        if (var15 === 1) {
            this.faceSkins = new Int32Array(faceCount);
        }

        if (hasMayaGroups === 1) {
            this.animMayaGroups = new Array(vertexCount);
            this.animMayaScales = new Array(vertexCount);
        }

        this.faceColors = new Uint16Array(faceCount);
        buf1.offset = var23;
        buf2.offset = var34;
        buf3.offset = var35;
        buf4.offset = var47;
        buf5.offset = var29;
        let lastVertX = 0;
        let lastVertY = 0;
        let lastVertZ = 0;

        for (let i = 0; i < vertexCount; i++) {
            const flag = buf1.readUnsignedByte();
            let deltaVertX = 0;
            if ((flag & 1) !== 0) {
                deltaVertX = buf2.readSmart2();
            }

            let deltaVertY = 0;
            if ((flag & 2) !== 0) {
                deltaVertY = buf3.readSmart2();
            }

            let deltaVertZ = 0;
            if ((flag & 4) !== 0) {
                deltaVertZ = buf4.readSmart2();
            }

            this.verticesX[i] = lastVertX + deltaVertX;
            this.verticesY[i] = lastVertY + deltaVertY;
            this.verticesZ[i] = lastVertZ + deltaVertZ;
            lastVertX = this.verticesX[i];
            lastVertY = this.verticesY[i];
            lastVertZ = this.verticesZ[i];
            if (hasVertexSkins === 1 && this.vertexSkins) {
                this.vertexSkins[i] = buf5.readUnsignedByte();
            }
        }

        if (hasMayaGroups === 1) {
            for (let i = 0; i < vertexCount; i++) {
                const var41 = buf5.readUnsignedByte();
                this.animMayaGroups[i] = new Int32Array(var41);
                this.animMayaScales[i] = new Int32Array(var41);

                for (let j = 0; j < var41; j++) {
                    this.animMayaGroups[i][j] = buf5.readUnsignedByte();
                    this.animMayaScales[i][j] = buf5.readUnsignedByte();
                }
            }
        }

        buf1.offset = var32;
        buf2.offset = var28;
        buf3.offset = var26;
        buf4.offset = var30;
        buf5.offset = var27;

        for (let i = 0; i < faceCount; i++) {
            this.faceColors[i] = buf1.readUnsignedShort();
            if (var12 === 1 && this.faceRenderTypes && this.textureCoords && this.faceTextures) {
                const var41 = buf2.readUnsignedByte();
                if ((var41 & 1) === 1) {
                    this.faceRenderTypes[i] = 1;
                    var2 = true;
                } else {
                    this.faceRenderTypes[i] = 0;
                }

                if ((var41 & 2) === 2) {
                    this.textureCoords[i] = var41 >> 2;
                    this.faceTextures[i] = this.faceColors[i];
                    this.faceColors[i] = 127;
                    if (this.faceTextures[i] !== -1) {
                        var3 = true;
                    }
                } else {
                    this.textureCoords[i] = -1;
                    this.faceTextures[i] = -1;
                }
            }

            if (var13 === 255) {
                this.faceRenderPriorities[i] = buf3.readByte();
            }

            if (var14 === 1) {
                this.faceAlphas[i] = buf4.readByte();
            }

            if (var15 === 1 && this.faceSkins) {
                this.faceSkins[i] = buf5.readUnsignedByte();
            }
        }

        buf1.offset = var31;
        buf2.offset = var25;
        let var40 = 0;
        let var41 = 0;
        let var42 = 0;
        let var43 = 0;

        for (let i = 0; i < faceCount; i++) {
            const var45 = buf2.readUnsignedByte();
            if (var45 === 1) {
                var40 = buf1.readSmart2() + var43;
                var41 = buf1.readSmart2() + var40;
                var42 = buf1.readSmart2() + var41;
                var43 = var42;
                this.indices1[i] = var40;
                this.indices2[i] = var41;
                this.indices3[i] = var42;
            }

            if (var45 === 2) {
                var41 = var42;
                var42 = buf1.readSmart2() + var43;
                var43 = var42;
                this.indices1[i] = var40;
                this.indices2[i] = var41;
                this.indices3[i] = var42;
            }

            if (var45 === 3) {
                var40 = var42;
                var42 = buf1.readSmart2() + var43;
                var43 = var42;
                this.indices1[i] = var40;
                this.indices2[i] = var41;
                this.indices3[i] = var42;
            }

            if (var45 === 4) {
                const var46 = var40;
                var40 = var41;
                var41 = var46;
                var42 = buf1.readSmart2() + var43;
                var43 = var42;
                this.indices1[i] = var40;
                this.indices2[i] = var46;
                this.indices3[i] = var42;
            }
        }

        buf1.offset = var33;

        for (let i = 0; i < texTriangleCount; i++) {
            this.textureRenderTypes[i] = 0;
            this.textureMappingP[i] = buf1.readUnsignedShort();
            this.textureMappingM[i] = buf1.readUnsignedShort();
            this.textureMappingN[i] = buf1.readUnsignedShort();
        }

        if (this.textureCoords) {
            let var48 = false;

            for (let i = 0; i < faceCount; i++) {
                const coord = this.textureCoords[i] & 255;
                if (coord !== 255) {
                    if (
                        this.indices1[i] === (this.textureMappingP[coord] & 0xffff) &&
                        this.indices2[i] === (this.textureMappingM[coord] & 0xffff) &&
                        this.indices3[i] === (this.textureMappingN[coord] & 0xffff)
                    ) {
                        this.textureCoords[i] = -1;
                    } else {
                        var48 = true;
                    }
                }
            }

            if (!var48) {
                this.textureCoords = undefined;
            }
        }

        if (!var3) {
            this.faceTextures = undefined;
        }

        if (!var2) {
            this.faceRenderTypes = undefined;
        }
    }

    scaleDown(n        )       {
        for (let i = 0; i < this.verticesCount; i++) {
            this.verticesX[i] >>= n;
            this.verticesY[i] >>= n;
            this.verticesZ[i] >>= n;
        }
        if (this.textureFaceCount > 0 && this.textureScaleX) {
            for (let i = 0; i < this.textureFaceCount; i++) {
                this.textureScaleX[i] >>= n;
                this.textureScaleY[i] >>= n;
                if (this.textureRenderTypes[i] !== 1) {
                    this.textureScaleZ[i] >>= n;
                }
            }
        }
    }

    decodeV1(data           )       {
        this.version = 1;
        const buf1 = new ByteBuffer(data);
        const buf2 = new ByteBuffer(data);
        const buf3 = new ByteBuffer(data);
        const buf4 = new ByteBuffer(data);
        const buf5 = new ByteBuffer(data);
        const buf6 = new ByteBuffer(data);
        const buf7 = new ByteBuffer(data);
        buf1.offset = data.length - 23;
        const vertexCount = buf1.readUnsignedShort();
        const faceCount = buf1.readUnsignedShort();
        const texFaceCount = buf1.readUnsignedByte();
        const flags = buf1.readUnsignedByte();
        const hasFaceRenderTypes = (flags & 0x1) === 1;
        const hasParticles = (flags & 0x2) === 2;
        const hasBillboards = (flags & 0x4) === 4;
        const hasVersion = (flags & 0x8) === 8;
        if (hasVersion) {
            buf1.offset -= 7;
            this.version = buf1.readUnsignedByte();
            buf1.offset += 6;
        }
        const modelPriority = buf1.readUnsignedByte();
        const hasFaceAlpha = buf1.readUnsignedByte();
        const hasFaceSkins = buf1.readUnsignedByte();
        const hasFaceTextures = buf1.readUnsignedByte();
        const hasVertexSkins = buf1.readUnsignedByte();
        const modelVerticesX = buf1.readUnsignedShort();
        const modelVerticesY = buf1.readUnsignedShort();
        const modelVerticesZ = buf1.readUnsignedShort();
        const faceIndices = buf1.readUnsignedShort();
        const textureIndices = buf1.readUnsignedShort();
        let simpleTextureFaceCount = 0;
        let complexTextureFaceCount = 0;
        let cubeTextureFaceCount = 0;
        if (texFaceCount > 0) {
            this.textureRenderTypes = new Int8Array(texFaceCount);
            buf1.offset = 0;

            for (let i = 0; i < texFaceCount; i++) {
                const type = (this.textureRenderTypes[i] = buf1.readByte());
                if (type === 0) {
                    simpleTextureFaceCount++;
                }

                if (type >= 1 && type <= 3) {
                    complexTextureFaceCount++;
                }

                if (type === 2) {
                    cubeTextureFaceCount++;
                }
            }
        }

        let offset = texFaceCount + vertexCount;
        const vertexFlagsOffset = offset;
        if (hasFaceRenderTypes) {
            offset += faceCount;
        }

        const faceCompressTypeOffset = offset;
        offset += faceCount;
        const facePrioritiesOffset = offset;
        if (modelPriority === 255) {
            offset += faceCount;
        }

        const faceSkinsOffset = offset;
        if (hasFaceSkins === 1) {
            offset += faceCount;
        }

        const vertexSkinsOffset = offset;
        if (hasVertexSkins === 1) {
            offset += vertexCount;
        }

        const faceAlphasOffset = offset;
        if (hasFaceAlpha === 1) {
            offset += faceCount;
        }

        const faceIndicesOffset = offset;
        offset += faceIndices;
        const faceMaterialsOffset = offset;
        if (hasFaceTextures === 1) {
            offset += faceCount * 2;
        }

        const faceTextureIndicesOffset = offset;
        offset += textureIndices;
        const faceColorsOffset = offset;
        offset += faceCount * 2;
        const xVertexOffset = offset;
        offset += modelVerticesX;
        const yVertexOffset = offset;
        offset += modelVerticesY;
        const zVertexOffset = offset;
        offset += modelVerticesZ;
        const simpleTexturesOffset = offset;
        offset += simpleTextureFaceCount * 6;
        const complexTexturesOffset = offset;
        offset += complexTextureFaceCount * 6;
        let textureBytes = 6;
        if (this.version === 14) {
            textureBytes = 7;
        } else if (this.version >= 15) {
            textureBytes = 9;
        }
        const texturesScalesOffset = offset;
        offset += complexTextureFaceCount * textureBytes;
        const texturesRotationOffset = offset;
        offset += complexTextureFaceCount;
        const texturesDirectionOffset = offset;
        offset += complexTextureFaceCount;
        const texturesTranslationOffset = offset;
        offset += complexTextureFaceCount + cubeTextureFaceCount * 2;
        const particleEffectsOffset = offset;
        this.verticesCount = vertexCount;
        this.faceCount = faceCount;
        this.textureFaceCount = texFaceCount;
        this.verticesX = new Int32Array(vertexCount);
        this.verticesY = new Int32Array(vertexCount);
        this.verticesZ = new Int32Array(vertexCount);
        this.indices1 = new Int32Array(faceCount);
        this.indices2 = new Int32Array(faceCount);
        this.indices3 = new Int32Array(faceCount);
        if (hasVertexSkins === 1) {
            this.vertexSkins = new Int32Array(vertexCount);
        }

        if (hasFaceRenderTypes) {
            this.faceRenderTypes = new Int8Array(faceCount);
        }

        if (modelPriority === 255) {
            this.faceRenderPriorities = new Int8Array(faceCount);
        } else {
            this.priority = modelPriority;
        }

        if (hasFaceAlpha === 1) {
            this.faceAlphas = new Int8Array(faceCount);
        }

        if (hasFaceSkins === 1) {
            this.faceSkins = new Int32Array(faceCount);
        }

        if (hasFaceTextures === 1) {
            this.faceTextures = new Int16Array(faceCount);
        }

        if (hasFaceTextures === 1 && texFaceCount > 0) {
            this.textureCoords = new Int8Array(faceCount);
        }

        this.faceColors = new Uint16Array(faceCount);
        if (texFaceCount > 0) {
            this.textureMappingP = new Int16Array(texFaceCount);
            this.textureMappingM = new Int16Array(texFaceCount);
            this.textureMappingN = new Int16Array(texFaceCount);
            if (complexTextureFaceCount > 0) {
                this.textureScaleX = new Int32Array(complexTextureFaceCount);
                this.textureScaleY = new Int32Array(complexTextureFaceCount);
                this.textureScaleZ = new Int32Array(complexTextureFaceCount);
                this.textureRotation = new Int8Array(complexTextureFaceCount);
                this.textureDirection = new Int8Array(complexTextureFaceCount);
                this.textureSpeed = new Int32Array(complexTextureFaceCount);
            }
            if (cubeTextureFaceCount > 0) {
                this.textureTransU = new Int32Array(cubeTextureFaceCount);
                this.textureTransV = new Int32Array(cubeTextureFaceCount);
            }
        }

        buf1.offset = texFaceCount;
        buf2.offset = xVertexOffset;
        buf3.offset = yVertexOffset;
        buf4.offset = zVertexOffset;
        buf5.offset = vertexSkinsOffset;
        let lastVertX = 0;
        let lastVertY = 0;
        let lastVertZ = 0;

        for (let i = 0; i < vertexCount; i++) {
            const flag = buf1.readUnsignedByte();
            let deltaVertX = 0;
            if ((flag & 1) !== 0) {
                deltaVertX = buf2.readSmart2();
            }

            let deltaVertY = 0;
            if ((flag & 2) !== 0) {
                deltaVertY = buf3.readSmart2();
            }

            let deltaVertZ = 0;
            if ((flag & 4) !== 0) {
                deltaVertZ = buf4.readSmart2();
            }

            this.verticesX[i] = lastVertX + deltaVertX;
            this.verticesY[i] = lastVertY + deltaVertY;
            this.verticesZ[i] = lastVertZ + deltaVertZ;
            lastVertX = this.verticesX[i];
            lastVertY = this.verticesY[i];
            lastVertZ = this.verticesZ[i];
            if (hasVertexSkins === 1 && this.vertexSkins) {
                this.vertexSkins[i] = buf5.readUnsignedByte();
            }
        }

        buf1.offset = faceColorsOffset;
        buf2.offset = vertexFlagsOffset;
        buf3.offset = facePrioritiesOffset;
        buf4.offset = faceAlphasOffset;
        buf5.offset = faceSkinsOffset;
        buf6.offset = faceMaterialsOffset;
        buf7.offset = faceTextureIndicesOffset;

        for (let i = 0; i < faceCount; i++) {
            this.faceColors[i] = buf1.readUnsignedShort();
            if (hasFaceRenderTypes && this.faceRenderTypes) {
                this.faceRenderTypes[i] = buf2.readByte();
            }

            if (modelPriority === 255) {
                this.faceRenderPriorities[i] = buf3.readByte();
            }

            if (hasFaceAlpha === 1) {
                this.faceAlphas[i] = buf4.readByte();
            }

            if (hasFaceSkins === 1 && this.faceSkins) {
                this.faceSkins[i] = buf5.readUnsignedByte();
            }

            if (hasFaceTextures === 1 && this.faceTextures) {
                this.faceTextures[i] = buf6.readUnsignedShort() - 1;
            }

            if (this.textureCoords) {
                if (this.faceTextures && this.faceTextures[i] !== -1) {
                    this.textureCoords[i] = buf7.readUnsignedByte() - 1;
                } else {
                    this.textureCoords[i] = -1;
                }
            }
        }

        buf1.offset = faceIndicesOffset;
        buf2.offset = faceCompressTypeOffset;
        let index1 = 0;
        let index2 = 0;
        let index3 = 0;
        let var54 = 0;

        this.usedVertexCount = -1;
        for (let i = 0; i < faceCount; i++) {
            const type = buf2.readUnsignedByte();
            if (type === 1) {
                index1 = buf1.readSmart2() + var54;
                index2 = buf1.readSmart2() + index1;
                index3 = buf1.readSmart2() + index2;
                var54 = index3;
                this.indices1[i] = index1;
                this.indices2[i] = index2;
                this.indices3[i] = index3;
                if (index1 > this.usedVertexCount) {
                    this.usedVertexCount = index1;
                }
                if (index2 > this.usedVertexCount) {
                    this.usedVertexCount = index2;
                }
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }

            if (type === 2) {
                index2 = index3;
                index3 = buf1.readSmart2() + var54;
                var54 = index3;
                this.indices1[i] = index1;
                this.indices2[i] = index2;
                this.indices3[i] = index3;
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }

            if (type === 3) {
                index1 = index3;
                index3 = buf1.readSmart2() + var54;
                var54 = index3;
                this.indices1[i] = index1;
                this.indices2[i] = index2;
                this.indices3[i] = index3;
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }

            if (type === 4) {
                const var57 = index1;
                index1 = index2;
                index2 = var57;
                index3 = buf1.readSmart2() + var54;
                var54 = index3;
                this.indices1[i] = index1;
                this.indices2[i] = var57;
                this.indices3[i] = index3;
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }
        }
        this.usedVertexCount++;

        buf1.offset = simpleTexturesOffset;
        buf2.offset = complexTexturesOffset;
        buf3.offset = texturesScalesOffset;
        buf4.offset = texturesRotationOffset;
        buf5.offset = texturesDirectionOffset;
        buf6.offset = texturesTranslationOffset;

        this.decodeTextureMapping(buf1, buf2, buf3, buf4, buf5, buf6);

        buf1.offset = offset;

        if (this.version >= 13) {
            this.scaleDown(2);
        }

        // const var55 = buf1.readUnsignedByte();
        // if (var55 !== 0) {
        //     // new ModelData0();
        //     buf1.readUnsignedShort();
        //     buf1.readUnsignedShort();
        //     buf1.readUnsignedShort();
        //     buf1.readInt();
        // }
    }

    decodeTextureMapping(
        simpleBuffer            ,
        complexBuffer            ,
        scaleBuffer            ,
        rotationBuffer            ,
        directionBuffer            ,
        translationBuffer            ,
    )       {
        for (let i = 0; i < this.textureFaceCount; i++) {
            const type = this.textureRenderTypes[i] & 0xff;
            if (type === 0) {
                this.textureMappingP[i] = simpleBuffer.readUnsignedShort();
                this.textureMappingM[i] = simpleBuffer.readUnsignedShort();
                this.textureMappingN[i] = simpleBuffer.readUnsignedShort();
            }
            if (type === 1) {
                this.textureMappingP[i] = complexBuffer.readUnsignedShort();
                this.textureMappingM[i] = complexBuffer.readUnsignedShort();
                this.textureMappingN[i] = complexBuffer.readUnsignedShort();
                if (this.version < 15) {
                    this.textureScaleX[i] = scaleBuffer.readUnsignedShort();
                    if (this.version >= 14) {
                        this.textureScaleY[i] = scaleBuffer.readMedium();
                    } else {
                        this.textureScaleY[i] = scaleBuffer.readUnsignedShort();
                    }
                    this.textureScaleZ[i] = scaleBuffer.readUnsignedShort();
                } else {
                    this.textureScaleX[i] = scaleBuffer.readMedium();
                    this.textureScaleY[i] = scaleBuffer.readMedium();
                    this.textureScaleZ[i] = scaleBuffer.readMedium();
                }
                this.textureRotation[i] = rotationBuffer.readByte();
                this.textureDirection[i] = directionBuffer.readByte();
                this.textureSpeed[i] = translationBuffer.readByte();
            }
            if (type === 2) {
                this.textureMappingP[i] = complexBuffer.readUnsignedShort();
                this.textureMappingM[i] = complexBuffer.readUnsignedShort();
                this.textureMappingN[i] = complexBuffer.readUnsignedShort();
                if (this.version < 15) {
                    this.textureScaleX[i] = scaleBuffer.readUnsignedShort();
                    if (this.version >= 14) {
                        this.textureScaleY[i] = scaleBuffer.readMedium();
                    } else {
                        this.textureScaleY[i] = scaleBuffer.readUnsignedShort();
                    }
                    this.textureScaleZ[i] = scaleBuffer.readUnsignedShort();
                } else {
                    this.textureScaleX[i] = scaleBuffer.readMedium();
                    this.textureScaleY[i] = scaleBuffer.readMedium();
                    this.textureScaleZ[i] = scaleBuffer.readMedium();
                }
                this.textureRotation[i] = rotationBuffer.readByte();
                this.textureDirection[i] = directionBuffer.readByte();
                this.textureSpeed[i] = translationBuffer.readByte();
                this.textureTransU[i] = translationBuffer.readByte();
                this.textureTransV[i] = translationBuffer.readByte();
            }
            if (type === 3) {
                // same as 1, TODO: combine
                this.textureMappingP[i] = complexBuffer.readUnsignedShort();
                this.textureMappingM[i] = complexBuffer.readUnsignedShort();
                this.textureMappingN[i] = complexBuffer.readUnsignedShort();
                if (this.version < 15) {
                    this.textureScaleX[i] = scaleBuffer.readUnsignedShort();
                    if (this.version >= 14) {
                        this.textureScaleY[i] = scaleBuffer.readMedium();
                    } else {
                        this.textureScaleY[i] = scaleBuffer.readUnsignedShort();
                    }
                    this.textureScaleZ[i] = scaleBuffer.readUnsignedShort();
                } else {
                    this.textureScaleX[i] = scaleBuffer.readMedium();
                    this.textureScaleY[i] = scaleBuffer.readMedium();
                    this.textureScaleZ[i] = scaleBuffer.readMedium();
                }
                this.textureRotation[i] = rotationBuffer.readByte();
                this.textureDirection[i] = directionBuffer.readByte();
                this.textureSpeed[i] = translationBuffer.readByte();
            }
        }
    }

    decodeOld(data           )       {
        this.version = 0;
        let hasRenderType = false;
        let isTextured = false;
        const buf1 = new ByteBuffer(data);
        const buf2 = new ByteBuffer(data);
        const buf3 = new ByteBuffer(data);
        const buf4 = new ByteBuffer(data);
        const buf5 = new ByteBuffer(data);
        buf1.offset = data.length - 18;
        const vertexCount = buf1.readUnsignedShort();
        const faceCount = buf1.readUnsignedShort();
        const texTriangleCount = buf1.readUnsignedByte();
        const usesTextures = buf1.readUnsignedByte();
        const var13 = buf1.readUnsignedByte();
        const var14 = buf1.readUnsignedByte();
        const var15 = buf1.readUnsignedByte();
        const var16 = buf1.readUnsignedByte();
        const var17 = buf1.readUnsignedShort();
        const var18 = buf1.readUnsignedShort();
        const var19 = buf1.readUnsignedShort();
        const var20 = buf1.readUnsignedShort();
        let var21 = 0;
        let var45 = var21 + vertexCount;
        let var23 = var45;
        var45 += faceCount;
        const var24 = var45;
        if (var13 === 255) {
            var45 += faceCount;
        }

        const var25 = var45;
        if (var15 === 1) {
            var45 += faceCount;
        }

        const var26 = var45;
        if (usesTextures === 1) {
            var45 += faceCount;
        }

        const var27 = var45;
        if (var16 === 1) {
            var45 += vertexCount;
        }

        const var28 = var45;
        if (var14 === 1) {
            var45 += faceCount;
        }

        const var29 = var45;
        var45 += var20;
        const var30 = var45;
        var45 += faceCount * 2;
        const var31 = var45;
        var45 += texTriangleCount * 6;
        const var32 = var45;
        var45 += var17;
        const var33 = var45;
        var45 += var18;
        // const var10000 = var45 + var19;
        this.verticesCount = vertexCount;
        this.faceCount = faceCount;
        this.textureFaceCount = texTriangleCount;
        this.verticesX = new Int32Array(vertexCount);
        this.verticesY = new Int32Array(vertexCount);
        this.verticesZ = new Int32Array(vertexCount);
        this.indices1 = new Int32Array(faceCount);
        this.indices2 = new Int32Array(faceCount);
        this.indices3 = new Int32Array(faceCount);
        if (texTriangleCount > 0) {
            this.textureRenderTypes = new Int8Array(texTriangleCount);
            this.textureMappingP = new Int16Array(texTriangleCount);
            this.textureMappingM = new Int16Array(texTriangleCount);
            this.textureMappingN = new Int16Array(texTriangleCount);
        }

        if (var16 === 1) {
            this.vertexSkins = new Int32Array(vertexCount);
        }

        if (usesTextures === 1) {
            this.faceRenderTypes = new Int8Array(faceCount);
            this.textureCoords = new Int8Array(faceCount);
            this.faceTextures = new Int16Array(faceCount);
        }

        if (var13 === 255) {
            this.faceRenderPriorities = new Int8Array(faceCount);
        } else {
            this.priority = var13;
        }

        if (var14 === 1) {
            this.faceAlphas = new Int8Array(faceCount);
        }

        if (var15 === 1) {
            this.faceSkins = new Int32Array(faceCount);
        }

        this.faceColors = new Uint16Array(faceCount);
        buf1.offset = var21;
        buf2.offset = var32;
        buf3.offset = var33;
        buf4.offset = var45;
        buf5.offset = var27;
        let lastVertX = 0;
        let lastVertY = 0;
        let lastVertZ = 0;

        for (let i = 0; i < vertexCount; i++) {
            const flag = buf1.readUnsignedByte();
            let deltaVertX = 0;
            if ((flag & 1) !== 0) {
                deltaVertX = buf2.readSmart2();
            }

            let deltaVertY = 0;
            if ((flag & 2) !== 0) {
                deltaVertY = buf3.readSmart2();
            }

            let deltaVertZ = 0;
            if ((flag & 4) !== 0) {
                deltaVertZ = buf4.readSmart2();
            }

            this.verticesX[i] = lastVertX + deltaVertX;
            this.verticesY[i] = lastVertY + deltaVertY;
            this.verticesZ[i] = lastVertZ + deltaVertZ;
            lastVertX = this.verticesX[i];
            lastVertY = this.verticesY[i];
            lastVertZ = this.verticesZ[i];
            if (var16 === 1 && this.vertexSkins) {
                this.vertexSkins[i] = buf5.readUnsignedByte();
            }
        }

        buf1.offset = var30;
        buf2.offset = var26;
        buf3.offset = var24;
        buf4.offset = var28;
        buf5.offset = var25;

        for (let i = 0; i < faceCount; i++) {
            this.faceColors[i] = buf1.readUnsignedShort();
            if (
                usesTextures === 1 &&
                this.faceRenderTypes &&
                this.textureCoords &&
                this.faceTextures
            ) {
                const flag = buf2.readUnsignedByte();
                if ((flag & 1) === 1) {
                    this.faceRenderTypes[i] = 1;
                    hasRenderType = true;
                } else {
                    this.faceRenderTypes[i] = 0;
                }

                if ((flag & 2) === 2) {
                    this.textureCoords[i] = flag >> 2;
                    this.faceTextures[i] = this.faceColors[i];
                    this.faceColors[i] = 127;
                    if (this.faceTextures[i] !== -1) {
                        isTextured = true;
                    }
                } else {
                    this.textureCoords[i] = -1;
                    this.faceTextures[i] = -1;
                }
            }

            if (var13 === 255) {
                this.faceRenderPriorities[i] = buf3.readByte();
            }

            if (var14 === 1) {
                this.faceAlphas[i] = buf4.readByte();
            }

            if (var15 === 1 && this.faceSkins) {
                this.faceSkins[i] = buf5.readUnsignedByte();
            }
        }

        buf1.offset = var29;
        buf2.offset = var23;
        let index1 = 0;
        let index2 = 0;
        let index3 = 0;
        let lastIndex = 0;

        this.usedVertexCount = -1;
        for (let i = 0; i < faceCount; i++) {
            const type = buf2.readUnsignedByte();
            if (type === 1) {
                index1 = buf1.readSmart2() + lastIndex;
                index2 = buf1.readSmart2() + index1;
                index3 = buf1.readSmart2() + index2;
                lastIndex = index3;
                this.indices1[i] = index1;
                this.indices2[i] = index2;
                this.indices3[i] = index3;
                if (index1 > this.usedVertexCount) {
                    this.usedVertexCount = index1;
                }
                if (index2 > this.usedVertexCount) {
                    this.usedVertexCount = index2;
                }
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }

            if (type === 2) {
                index2 = index3;
                index3 = buf1.readSmart2() + lastIndex;
                lastIndex = index3;
                this.indices1[i] = index1;
                this.indices2[i] = index2;
                this.indices3[i] = index3;
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }

            if (type === 3) {
                index1 = index3;
                index3 = buf1.readSmart2() + lastIndex;
                lastIndex = index3;
                this.indices1[i] = index1;
                this.indices2[i] = index2;
                this.indices3[i] = index3;
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }

            if (type === 4) {
                const var44 = index1;
                index1 = index2;
                index2 = var44;
                index3 = buf1.readSmart2() + lastIndex;
                lastIndex = index3;
                this.indices1[i] = index1;
                this.indices2[i] = var44;
                this.indices3[i] = index3;
                if (index3 > this.usedVertexCount) {
                    this.usedVertexCount = index3;
                }
            }
        }
        this.usedVertexCount++;

        buf1.offset = var31;

        for (let i = 0; i < texTriangleCount; i++) {
            this.textureRenderTypes[i] = 0;
            this.textureMappingP[i] = buf1.readUnsignedShort();
            this.textureMappingM[i] = buf1.readUnsignedShort();
            this.textureMappingN[i] = buf1.readUnsignedShort();
        }

        if (this.textureCoords) {
            let hasValidTexFace = false;

            for (let i = 0; i < faceCount; i++) {
                const index = this.textureCoords[i] & 255;
                if (index !== 255) {
                    if (
                        this.indices1[i] === (this.textureMappingP[index] & 0xffff) &&
                        this.indices2[i] === (this.textureMappingM[index] & 0xffff) &&
                        this.indices3[i] === (this.textureMappingN[index] & 0xffff)
                    ) {
                        this.textureCoords[i] = -1;
                    } else {
                        hasValidTexFace = true;
                    }
                }
            }

            if (!hasValidTexFace) {
                this.textureCoords = undefined;
            }
        }

        if (!isTextured) {
            this.faceTextures = undefined;
        }

        if (!hasRenderType) {
            this.faceRenderTypes = undefined;
        }
    }

}
