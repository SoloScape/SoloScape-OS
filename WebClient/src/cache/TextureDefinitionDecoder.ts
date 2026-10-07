export interface TextureDefinition {
  readonly id: number;
  /** Packed HSL used by Pix3D when texels are unavailable. */
  readonly averageRgb: number;
  readonly opaque: boolean;
  readonly fileIds: readonly number[];
  readonly blendModes: readonly number[];
  readonly blendDirections: readonly number[];
  readonly colourTransforms: readonly number[];
  readonly animationDirection: number;
  readonly animationSpeed: number;
}

/**
 * Decodes the rev-233+ texture definition layout used by the rev-240 cache.
 *
 * Modern OSRS texture definitions are a compact 7-byte record:
 *
 *   spriteId:u16, averageHsl:u16, opaque:u8,
 *   animationDirection:u8, animationSpeed:u8
 *
 * Older clients used the variable-length 1..4 sprite format. Rev-240 no
 * longer does, so interpreting these seven bytes as the legacy layout causes
 * the average colour to be mistaken for a sprite id/count and prevents the
 * model texture from ever becoming resident.
 */
export function decodeTextureDefinition(
  id: number,
  data: Uint8Array,
): TextureDefinition {
  const reader = new TextureReader(data);
  const spriteId = reader.u16();
  const averageRgb = reader.u16();
  const opaque = reader.u8() === 1;
  const animationDirection = reader.u8();
  const animationSpeed = reader.u8();

  if (reader.remaining !== 0) {
    throw new RangeError(
      'Texture ' + id + ' has ' + reader.remaining +
        ' trailing byte(s); rev-240 texture definitions must be 7 bytes.',
    );
  }

  return {
    id,
    averageRgb,
    opaque,
    fileIds: [spriteId],
    blendModes: [],
    blendDirections: [],
    colourTransforms: [0],
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

  private require(length: number): void {
    if (this.offset + length > this.data.length) {
      throw new RangeError(
        'Unexpected end of texture definition at byte ' + this.offset + '.',
      );
    }
  }
}
