export type ModelFormat = 'type3' | 'type2' | 'type1' | 'old';

export interface DecodedModelGeometry {
  readonly id: number;
  readonly format: ModelFormat;
  readonly vertexX: Int32Array;
  readonly vertexY: Int32Array;
  readonly vertexZ: Int32Array;
  readonly faceA: Uint32Array;
  readonly faceB: Uint32Array;
  readonly faceC: Uint32Array;
  readonly faceColors: Uint16Array;
  readonly faceTextures: Int32Array;
  readonly faceRenderTypes: Int8Array;
  readonly faceTransparencies: Int8Array;
  readonly textureFaceA: Uint16Array;
  readonly textureFaceB: Uint16Array;
  readonly textureFaceC: Uint16Array;
  readonly textureRenderTypes: Int8Array;
}

/**
 * Geometry-focused port of RuneLite's OSRS model loader.
 *
 * It supports all four model encodings still present in the modern cache:
 * old, type 1 (-1/-1 trailer), type 2 (-1/-2), and type 3 (-1/-3).
 * Animation groups and advanced texture transform metadata are intentionally
 * skipped here; vertices, triangle indices, face colors/textures, alpha, and
 * type-0 texture triangles are retained for static scene rendering.
 */
export function decodeModelGeometry(
  id: number,
  data: Uint8Array,
): DecodedModelGeometry {
  if (data.length < 2) {
    throw new RangeError('Model ' + id + ' is too short.');
  }

  const penultimate = data[data.length - 2]!;
  const last = data[data.length - 1]!;
  if (penultimate === 0xff && last === 0xfd) {
    return decodeType3(id, data);
  }
  if (penultimate === 0xff && last === 0xfe) {
    return decodeType2(id, data);
  }
  if (penultimate === 0xff && last === 0xff) {
    return decodeType1(id, data);
  }
  return decodeOld(id, data);
}

function createGeometry(
  id: number,
  format: ModelFormat,
  vertexCount: number,
  faceCount: number,
  textureCount: number,
): MutableGeometry {
  return {
    id,
    format,
    vertexX: new Int32Array(vertexCount),
    vertexY: new Int32Array(vertexCount),
    vertexZ: new Int32Array(vertexCount),
    faceA: new Uint32Array(faceCount),
    faceB: new Uint32Array(faceCount),
    faceC: new Uint32Array(faceCount),
    faceColors: new Uint16Array(faceCount),
    faceTextures: filledInt32(faceCount, -1),
    faceRenderTypes: new Int8Array(faceCount),
    faceTransparencies: new Int8Array(faceCount),
    textureFaceA: new Uint16Array(textureCount),
    textureFaceB: new Uint16Array(textureCount),
    textureFaceC: new Uint16Array(textureCount),
    textureRenderTypes: new Int8Array(textureCount),
  };
}

type MutableGeometry = {
  id: number;
  format: ModelFormat;
  vertexX: Int32Array;
  vertexY: Int32Array;
  vertexZ: Int32Array;
  faceA: Uint32Array;
  faceB: Uint32Array;
  faceC: Uint32Array;
  faceColors: Uint16Array;
  faceTextures: Int32Array;
  faceRenderTypes: Int8Array;
  faceTransparencies: Int8Array;
  textureFaceA: Uint16Array;
  textureFaceB: Uint16Array;
  textureFaceC: Uint16Array;
  textureRenderTypes: Int8Array;
};

function decodeType3(id: number, data: Uint8Array): DecodedModelGeometry {
  const footer = new Reader(data, data.length - 26);
  const vertexCount = footer.u16();
  const faceCount = footer.u16();
  const textureCount = footer.u8();
  const hasFaceRenderTypes = footer.u8();
  const priority = footer.u8();
  const hasTransparency = footer.u8();
  const hasFaceGroups = footer.u8();
  const hasFaceTextures = footer.u8();
  const hasVertexGroups = footer.u8();
  const hasAnimaya = footer.u8();
  const xDataLength = footer.u16();
  const yDataLength = footer.u16();
  const zDataLength = footer.u16();
  const faceIndexDataLength = footer.u16();
  const textureCoordDataLength = footer.u16();
  const vertexGroupDataLength = footer.u16();

  const model = createGeometry(id, 'type3', vertexCount, faceCount, textureCount);
  const textureTypeReader = new Reader(data, 0);
  let type0Textures = 0;
  let complexTextures = 0;
  let type2Textures = 0;
  for (let i = 0; i < textureCount; i += 1) {
    const type = textureTypeReader.i8();
    model.textureRenderTypes[i] = type;
    if (type === 0) type0Textures += 1;
    if (type >= 1 && type <= 3) complexTextures += 1;
    if (type === 2) type2Textures += 1;
  }

  let offset = textureCount + vertexCount;
  const faceRenderTypeOffset = offset;
  if (hasFaceRenderTypes === 1) offset += faceCount;
  const faceCompressionOffset = offset;
  offset += faceCount;
  const facePriorityOffset = offset;
  if (priority === 255) offset += faceCount;
  const faceGroupOffset = offset;
  if (hasFaceGroups === 1) offset += faceCount;
  const vertexGroupOffset = offset;
  offset += vertexGroupDataLength;
  const faceTransparencyOffset = offset;
  if (hasTransparency === 1) offset += faceCount;
  const faceIndexOffset = offset;
  offset += faceIndexDataLength;
  const faceTextureOffset = offset;
  if (hasFaceTextures === 1) offset += faceCount * 2;
  const textureCoordOffset = offset;
  offset += textureCoordDataLength;
  const faceColorOffset = offset;
  offset += faceCount * 2;
  const xDataOffset = offset;
  offset += xDataLength;
  const yDataOffset = offset;
  offset += yDataLength;
  const zDataOffset = offset;
  offset += zDataLength;
  const type0TextureOffset = offset;
  offset += type0Textures * 6;
  const complexTextureAOffset = offset;
  offset += complexTextures * 6;
  const complexTextureBOffset = offset;
  offset += complexTextures * 6;
  const complexTextureScaleOffset = offset;
  offset += complexTextures * 2;
  const complexTextureRotationOffset = offset;
  offset += complexTextures;
  const complexTextureDirectionOffset = offset;
  offset += complexTextures * 2 + type2Textures * 2;

  decodeVertices(
    model,
    data,
    textureCount,
    xDataOffset,
    yDataOffset,
    zDataOffset,
    hasVertexGroups === 1 ? vertexGroupOffset : null,
  );

  decodeSeparateFaces(
    model,
    data,
    faceColorOffset,
    hasFaceRenderTypes === 1 ? faceRenderTypeOffset : null,
    priority === 255 ? facePriorityOffset : null,
    hasTransparency === 1 ? faceTransparencyOffset : null,
    hasFaceGroups === 1 ? faceGroupOffset : null,
    hasFaceTextures === 1 ? faceTextureOffset : null,
    hasFaceTextures === 1 && textureCount > 0 ? textureCoordOffset : null,
  );

  decodeFaceIndices(model, data, faceIndexOffset, faceCompressionOffset);
  decodeType0TextureTriangles(model, data, type0TextureOffset);

  // Type-3 may append a particle/extension block and optional face-Z offsets.
  // Static geometry is complete before these fields, but validate the computed
  // section cursor is not outside the payload.
  if (complexTextureDirectionOffset > data.length - 26) {
    throw new RangeError('Model ' + id + ' type3 section offsets exceed payload.');
  }
  void hasAnimaya;

  return model;
}

function decodeType1(id: number, data: Uint8Array): DecodedModelGeometry {
  const footer = new Reader(data, data.length - 23);
  const vertexCount = footer.u16();
  const faceCount = footer.u16();
  const textureCount = footer.u8();
  const hasFaceRenderTypes = footer.u8();
  const priority = footer.u8();
  const hasTransparency = footer.u8();
  const hasFaceGroups = footer.u8();
  const hasFaceTextures = footer.u8();
  const hasVertexGroups = footer.u8();
  const xDataLength = footer.u16();
  const yDataLength = footer.u16();
  const zDataLength = footer.u16();
  const faceIndexDataLength = footer.u16();
  const textureCoordDataLength = footer.u16();

  const model = createGeometry(id, 'type1', vertexCount, faceCount, textureCount);
  const textureTypeReader = new Reader(data, 0);
  let type0Textures = 0;
  let complexTextures = 0;
  let type2Textures = 0;
  for (let i = 0; i < textureCount; i += 1) {
    const type = textureTypeReader.i8();
    model.textureRenderTypes[i] = type;
    if (type === 0) type0Textures += 1;
    if (type >= 1 && type <= 3) complexTextures += 1;
    if (type === 2) type2Textures += 1;
  }

  let offset = textureCount + vertexCount;
  const faceRenderTypeOffset = offset;
  if (hasFaceRenderTypes === 1) offset += faceCount;
  const faceCompressionOffset = offset;
  offset += faceCount;
  const facePriorityOffset = offset;
  if (priority === 255) offset += faceCount;
  const faceGroupOffset = offset;
  if (hasFaceGroups === 1) offset += faceCount;
  const vertexGroupOffset = offset;
  if (hasVertexGroups === 1) offset += vertexCount;
  const faceTransparencyOffset = offset;
  if (hasTransparency === 1) offset += faceCount;
  const faceIndexOffset = offset;
  offset += faceIndexDataLength;
  const faceTextureOffset = offset;
  if (hasFaceTextures === 1) offset += faceCount * 2;
  const textureCoordOffset = offset;
  offset += textureCoordDataLength;
  const faceColorOffset = offset;
  offset += faceCount * 2;
  const xDataOffset = offset;
  offset += xDataLength;
  const yDataOffset = offset;
  offset += yDataLength;
  const zDataOffset = offset;
  offset += zDataLength;
  const type0TextureOffset = offset;
  offset += type0Textures * 6;
  offset += complexTextures * 6;
  offset += complexTextures * 6;
  offset += complexTextures * 2;
  offset += complexTextures;
  offset += complexTextures * 2 + type2Textures * 2;

  if (offset > data.length - 23) {
    throw new RangeError('Model ' + id + ' type1 section offsets exceed payload.');
  }

  decodeVertices(
    model,
    data,
    textureCount,
    xDataOffset,
    yDataOffset,
    zDataOffset,
    hasVertexGroups === 1 ? vertexGroupOffset : null,
  );
  decodeSeparateFaces(
    model,
    data,
    faceColorOffset,
    hasFaceRenderTypes === 1 ? faceRenderTypeOffset : null,
    priority === 255 ? facePriorityOffset : null,
    hasTransparency === 1 ? faceTransparencyOffset : null,
    hasFaceGroups === 1 ? faceGroupOffset : null,
    hasFaceTextures === 1 ? faceTextureOffset : null,
    hasFaceTextures === 1 && textureCount > 0 ? textureCoordOffset : null,
  );
  decodeFaceIndices(model, data, faceIndexOffset, faceCompressionOffset);
  decodeType0TextureTriangles(model, data, type0TextureOffset);
  return model;
}

function decodeType2(id: number, data: Uint8Array): DecodedModelGeometry {
  const footer = new Reader(data, data.length - 23);
  const vertexCount = footer.u16();
  const faceCount = footer.u16();
  const textureCount = footer.u8();
  const hasCombinedFaceInfo = footer.u8();
  const priority = footer.u8();
  const hasTransparency = footer.u8();
  const hasFaceGroups = footer.u8();
  const hasVertexGroups = footer.u8();
  const hasAnimaya = footer.u8();
  const xDataLength = footer.u16();
  const yDataLength = footer.u16();
  const zDataLength = footer.u16();
  const faceIndexDataLength = footer.u16();
  const vertexGroupDataLength = footer.u16();

  const model = createGeometry(id, 'type2', vertexCount, faceCount, textureCount);
  let offset = vertexCount;
  const faceCompressionOffset = offset;
  offset += faceCount;
  const facePriorityOffset = offset;
  if (priority === 255) offset += faceCount;
  const faceGroupOffset = offset;
  if (hasFaceGroups === 1) offset += faceCount;
  const combinedFaceOffset = offset;
  if (hasCombinedFaceInfo === 1) offset += faceCount;
  const vertexGroupOffset = offset;
  offset += vertexGroupDataLength;
  const faceTransparencyOffset = offset;
  if (hasTransparency === 1) offset += faceCount;
  const faceIndexOffset = offset;
  offset += faceIndexDataLength;
  const faceColorOffset = offset;
  offset += faceCount * 2;
  const textureTriangleOffset = offset;
  offset += textureCount * 6;
  const xDataOffset = offset;
  offset += xDataLength;
  const yDataOffset = offset;
  offset += yDataLength;
  const zDataOffset = offset;
  offset += zDataLength;

  if (offset > data.length - 23) {
    throw new RangeError('Model ' + id + ' type2 section offsets exceed payload.');
  }

  decodeVertices(
    model,
    data,
    0,
    xDataOffset,
    yDataOffset,
    zDataOffset,
    hasVertexGroups === 1 ? vertexGroupOffset : null,
  );
  decodeCombinedFaces(
    model,
    data,
    faceColorOffset,
    hasCombinedFaceInfo === 1 ? combinedFaceOffset : null,
    priority === 255 ? facePriorityOffset : null,
    hasTransparency === 1 ? faceTransparencyOffset : null,
    hasFaceGroups === 1 ? faceGroupOffset : null,
  );
  decodeFaceIndices(model, data, faceIndexOffset, faceCompressionOffset);
  decodeAllType0TextureTriangles(model, data, textureTriangleOffset);
  void hasAnimaya;
  return model;
}

function decodeOld(id: number, data: Uint8Array): DecodedModelGeometry {
  if (data.length < 18) {
    throw new RangeError('Old-format model ' + id + ' is too short.');
  }

  const footer = new Reader(data, data.length - 18);
  const vertexCount = footer.u16();
  const faceCount = footer.u16();
  const textureCount = footer.u8();
  const hasCombinedFaceInfo = footer.u8();
  const priority = footer.u8();
  const hasTransparency = footer.u8();
  const hasFaceGroups = footer.u8();
  const hasVertexGroups = footer.u8();
  const xDataLength = footer.u16();
  const yDataLength = footer.u16();
  const zDataLength = footer.u16();
  const faceIndexDataLength = footer.u16();

  const model = createGeometry(id, 'old', vertexCount, faceCount, textureCount);
  let offset = vertexCount;
  const faceCompressionOffset = offset;
  offset += faceCount;
  const facePriorityOffset = offset;
  if (priority === 255) offset += faceCount;
  const faceGroupOffset = offset;
  if (hasFaceGroups === 1) offset += faceCount;
  const combinedFaceOffset = offset;
  if (hasCombinedFaceInfo === 1) offset += faceCount;
  const vertexGroupOffset = offset;
  if (hasVertexGroups === 1) offset += vertexCount;
  const faceTransparencyOffset = offset;
  if (hasTransparency === 1) offset += faceCount;
  const faceIndexOffset = offset;
  offset += faceIndexDataLength;
  const faceColorOffset = offset;
  offset += faceCount * 2;
  const textureTriangleOffset = offset;
  offset += textureCount * 6;
  const xDataOffset = offset;
  offset += xDataLength;
  const yDataOffset = offset;
  offset += yDataLength;
  const zDataOffset = offset;
  offset += zDataLength;

  if (offset !== data.length - 18) {
    throw new RangeError(
      'Old-format model ' + id + ' section size mismatch: data=' +
        (data.length - 18) + ', decoded=' + offset + '.',
    );
  }

  decodeVertices(
    model,
    data,
    0,
    xDataOffset,
    yDataOffset,
    zDataOffset,
    hasVertexGroups === 1 ? vertexGroupOffset : null,
  );
  decodeCombinedFaces(
    model,
    data,
    faceColorOffset,
    hasCombinedFaceInfo === 1 ? combinedFaceOffset : null,
    priority === 255 ? facePriorityOffset : null,
    hasTransparency === 1 ? faceTransparencyOffset : null,
    hasFaceGroups === 1 ? faceGroupOffset : null,
  );
  decodeFaceIndices(model, data, faceIndexOffset, faceCompressionOffset);
  decodeAllType0TextureTriangles(model, data, textureTriangleOffset);
  return model;
}

function decodeVertices(
  model: MutableGeometry,
  data: Uint8Array,
  vertexFlagsOffset: number,
  xDataOffset: number,
  yDataOffset: number,
  zDataOffset: number,
  vertexGroupOffset: number | null,
): void {
  const flags = new Reader(data, vertexFlagsOffset);
  const xs = new Reader(data, xDataOffset);
  const ys = new Reader(data, yDataOffset);
  const zs = new Reader(data, zDataOffset);
  const groups = vertexGroupOffset === null
    ? null
    : new Reader(data, vertexGroupOffset);

  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < model.vertexX.length; index += 1) {
    const flag = flags.u8();
    if ((flag & 1) !== 0) x += xs.shortSmart();
    if ((flag & 2) !== 0) y += ys.shortSmart();
    if ((flag & 4) !== 0) z += zs.shortSmart();
    model.vertexX[index] = x;
    model.vertexY[index] = y;
    model.vertexZ[index] = z;
    groups?.u8();
  }
}

function decodeSeparateFaces(
  model: MutableGeometry,
  data: Uint8Array,
  colorOffset: number,
  renderTypeOffset: number | null,
  priorityOffset: number | null,
  transparencyOffset: number | null,
  groupOffset: number | null,
  textureOffset: number | null,
  textureCoordOffset: number | null,
): void {
  const colors = new Reader(data, colorOffset);
  const renderTypes = renderTypeOffset === null
    ? null
    : new Reader(data, renderTypeOffset);
  const priorities = priorityOffset === null
    ? null
    : new Reader(data, priorityOffset);
  const transparencies = transparencyOffset === null
    ? null
    : new Reader(data, transparencyOffset);
  const groups = groupOffset === null ? null : new Reader(data, groupOffset);
  const textures = textureOffset === null
    ? null
    : new Reader(data, textureOffset);
  const textureCoords = textureCoordOffset === null
    ? null
    : new Reader(data, textureCoordOffset);

  for (let index = 0; index < model.faceColors.length; index += 1) {
    model.faceColors[index] = colors.u16();
    if (renderTypes) model.faceRenderTypes[index] = renderTypes.i8();
    priorities?.i8();
    if (transparencies) {
      model.faceTransparencies[index] = transparencies.i8();
    }
    groups?.u8();

    if (textures) {
      const texture = textures.u16() - 1;
      model.faceTextures[index] = texture;
      if (textureCoords && texture !== -1) {
        textureCoords.u8();
      }
    }
  }
}

function decodeCombinedFaces(
  model: MutableGeometry,
  data: Uint8Array,
  colorOffset: number,
  combinedOffset: number | null,
  priorityOffset: number | null,
  transparencyOffset: number | null,
  groupOffset: number | null,
): void {
  const colors = new Reader(data, colorOffset);
  const combined = combinedOffset === null
    ? null
    : new Reader(data, combinedOffset);
  const priorities = priorityOffset === null
    ? null
    : new Reader(data, priorityOffset);
  const transparencies = transparencyOffset === null
    ? null
    : new Reader(data, transparencyOffset);
  const groups = groupOffset === null ? null : new Reader(data, groupOffset);

  for (let index = 0; index < model.faceColors.length; index += 1) {
    model.faceColors[index] = colors.u16();
    if (combined) {
      const flags = combined.u8();
      model.faceRenderTypes[index] = (flags & 1) !== 0 ? 1 : 0;
      if ((flags & 2) !== 0) {
        model.faceTextures[index] = signed16(model.faceColors[index]!);
        model.faceColors[index] = 127;
      }
    }
    priorities?.i8();
    if (transparencies) {
      model.faceTransparencies[index] = transparencies.i8();
    }
    groups?.u8();
  }
}

function decodeFaceIndices(
  model: MutableGeometry,
  data: Uint8Array,
  indexDataOffset: number,
  compressionOffset: number,
): void {
  const indices = new Reader(data, indexDataOffset);
  const compression = new Reader(data, compressionOffset);
  let a = 0;
  let b = 0;
  let c = 0;
  let last = 0;

  for (let index = 0; index < model.faceA.length; index += 1) {
    const type = compression.u8();
    switch (type) {
      case 1:
        a = indices.shortSmart() + last;
        b = indices.shortSmart() + a;
        c = indices.shortSmart() + b;
        last = c;
        break;
      case 2:
        b = c;
        c = indices.shortSmart() + last;
        last = c;
        break;
      case 3:
        a = c;
        c = indices.shortSmart() + last;
        last = c;
        break;
      case 4: {
        const previousA = a;
        a = b;
        b = previousA;
        c = indices.shortSmart() + last;
        last = c;
        break;
      }
      default:
        throw new RangeError(
          'Unsupported model face-index compression type ' + type +
            ' in model ' + model.id + '.',
        );
    }
    if (
      a < 0 || b < 0 || c < 0 ||
      a >= model.vertexX.length ||
      b >= model.vertexX.length ||
      c >= model.vertexX.length
    ) {
      throw new RangeError(
        'Model ' + model.id + ' face ' + index +
          ' references vertex outside 0..' + (model.vertexX.length - 1) + '.',
      );
    }
    model.faceA[index] = a;
    model.faceB[index] = b;
    model.faceC[index] = c;
  }
}

function decodeType0TextureTriangles(
  model: MutableGeometry,
  data: Uint8Array,
  offset: number,
): void {
  const reader = new Reader(data, offset);
  for (let index = 0; index < model.textureRenderTypes.length; index += 1) {
    if (model.textureRenderTypes[index] !== 0) {
      continue;
    }
    model.textureFaceA[index] = reader.u16();
    model.textureFaceB[index] = reader.u16();
    model.textureFaceC[index] = reader.u16();
  }
}

function decodeAllType0TextureTriangles(
  model: MutableGeometry,
  data: Uint8Array,
  offset: number,
): void {
  const reader = new Reader(data, offset);
  for (let index = 0; index < model.textureRenderTypes.length; index += 1) {
    model.textureRenderTypes[index] = 0;
    model.textureFaceA[index] = reader.u16();
    model.textureFaceB[index] = reader.u16();
    model.textureFaceC[index] = reader.u16();
  }
}

function signed16(value: number): number {
  return value > 0x7fff ? value - 0x10000 : value;
}

function filledInt32(length: number, value: number): Int32Array {
  const result = new Int32Array(length);
  result.fill(value);
  return result;
}

class Reader {
  private offset: number;

  constructor(
    private readonly bytes: Uint8Array,
    offset = 0,
  ) {
    this.offset = offset;
  }

  u8(): number {
    this.require(1);
    return this.bytes[this.offset++]!;
  }

  i8(): number {
    const value = this.u8();
    return value > 0x7f ? value - 0x100 : value;
  }

  u16(): number {
    this.require(2);
    const value =
      (this.bytes[this.offset]! << 8) |
      this.bytes[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  shortSmart(): number {
    this.require(1);
    const peek = this.bytes[this.offset]!;
    if (peek < 0x80) {
      return this.u8() - 64;
    }
    return this.u16() - 0xc000;
  }

  private require(length: number): void {
    if (
      this.offset < 0 ||
      this.offset + length > this.bytes.length
    ) {
      throw new RangeError(
        'Model buffer underflow at byte ' + this.offset +
          '; need ' + length + ', size=' + this.bytes.length + '.',
      );
    }
  }
}
