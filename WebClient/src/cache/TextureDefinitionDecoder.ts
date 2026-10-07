export interface TextureDefinition {
  readonly id: number;
  readonly averageRgb: number;
  readonly opaque: boolean;
  readonly fileIds: readonly number[];
  readonly blendModes: readonly number[];
  readonly blendDirections: readonly number[];
  readonly colourTransforms: readonly number[];
  readonly animationDirection: number;
  readonly animationSpeed: number;
}

export function decodeTextureDefinition(
  id: number,
  data: Uint8Array,
): TextureDefinition {
  const reader = new TextureReader(data);
  const averageRgb = reader.u16();
  const opaque = reader.u8() === 1;
  const fileCount = reader.u8();
  if (fileCount < 1 || fileCount > 4) {
    throw new RangeError(
      'Texture ' + id + ' has invalid sprite count ' + fileCount + '.',
    );
  }

  const fileIds = new Array<number>(fileCount);
  for (let i = 0; i < fileCount; i += 1) {
    fileIds[i] = reader.u16();
  }

  const blendModes = new Array<number>(Math.max(0, fileCount - 1));
  const blendDirections = new Array<number>(Math.max(0, fileCount - 1));
  for (let i = 0; i < blendModes.length; i += 1) {
    blendModes[i] = reader.u8();
  }
  for (let i = 0; i < blendDirections.length; i += 1) {
    blendDirections[i] = reader.u8();
  }

  const colourTransforms = new Array<number>(fileCount);
  for (let i = 0; i < fileCount; i += 1) {
    colourTransforms[i] = reader.u32();
  }

  const animationDirection = reader.u8();
  const animationSpeed = reader.u8();
  if (reader.remaining !== 0) {
    throw new RangeError(
      'Texture ' + id + ' has ' + reader.remaining + ' trailing byte(s).',
    );
  }

  return {
    id,
    averageRgb,
    opaque,
    fileIds,
    blendModes,
    blendDirections,
    colourTransforms,
    animationDirection,
    animationSpeed,
  };
}

class TextureReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  u8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  u16(): number {
    this.require(2);
    const value =
      (this.data[this.offset]! << 8) |
      this.data[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  u32(): number {
    return (
      ((this.u8() << 24) >>> 0) |
      (this.u8() << 16) |
      (this.u8() << 8) |
      this.u8()
    ) >>> 0;
  }

  private require(length: number): void {
    if (this.offset + length > this.data.length) {
      throw new RangeError(
        'Unexpected end of texture definition at byte ' + this.offset + '.',
      );
    }
  }
}
