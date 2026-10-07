export interface CacheSpriteFrame {
  readonly sheetWidth: number;
  readonly sheetHeight: number;
  readonly xOffset: number;
  readonly yOffset: number;
  readonly width: number;
  readonly height: number;
  readonly palette: Uint32Array;
  readonly indices: Uint8Array;
  readonly alpha: Uint8Array | null;
}

export function decodeCacheSpriteGroup(
  data: Uint8Array,
): CacheSpriteFrame[] {
  if (data.length < 2) {
    throw new Error('Cache sprite group is too short.');
  }

  const spriteCount = readU16At(data, data.length - 2);
  if (spriteCount < 1) {
    throw new Error('Cache sprite group contains no sprites.');
  }

  const metadataOffset = data.length - 7 - spriteCount * 8;
  if (metadataOffset < 0) {
    throw new Error('Cache sprite metadata extends before the payload.');
  }

  const metadata = new Reader(data, metadataOffset, data.length - 2);
  const sheetWidth = metadata.readU16();
  const sheetHeight = metadata.readU16();
  const paletteSize = metadata.readU8() + 1;

  const xOffsets = readU16Array(metadata, spriteCount);
  const yOffsets = readU16Array(metadata, spriteCount);
  const widths = readU16Array(metadata, spriteCount);
  const heights = readU16Array(metadata, spriteCount);

  if (metadata.offset !== data.length - 2) {
    throw new Error('Cache sprite metadata did not end at the sprite count.');
  }

  const paletteOffset =
    metadataOffset - (paletteSize - 1) * 3;
  if (paletteOffset < 0) {
    throw new Error('Cache sprite palette extends before the payload.');
  }

  const palette = new Uint32Array(paletteSize);
  const paletteReader = new Reader(
    data,
    paletteOffset,
    metadataOffset,
  );

  for (let index = 1; index < paletteSize; index += 1) {
    let rgb = paletteReader.readU24();
    if (rgb === 0) {
      rgb = 1;
    }
    palette[index] = rgb;
  }

  if (paletteReader.offset !== metadataOffset) {
    throw new Error('Cache sprite palette length mismatch.');
  }

  const pixels = new Reader(data, 0, paletteOffset);
  const frames: CacheSpriteFrame[] = [];

  for (let sprite = 0; sprite < spriteCount; sprite += 1) {
    const width = widths[sprite]!;
    const height = heights[sprite]!;
    const pixelCount = checkedPixelCount(width, height);
    const flags = pixels.readU8();

    if ((flags & ~0x03) !== 0) {
      throw new Error(
        'Unsupported cache sprite storage flags 0x' +
          flags.toString(16).padStart(2, '0') + '.',
      );
    }

    const indices = new Uint8Array(pixelCount);
    readPlane(
      pixels,
      indices,
      width,
      height,
      (flags & 0x01) !== 0,
    );

    let alpha: Uint8Array | null = null;
    if ((flags & 0x02) !== 0) {
      alpha = new Uint8Array(pixelCount);
      readPlane(
        pixels,
        alpha,
        width,
        height,
        (flags & 0x01) !== 0,
      );
    }

    frames.push({
      sheetWidth,
      sheetHeight,
      xOffset: xOffsets[sprite]!,
      yOffset: yOffsets[sprite]!,
      width,
      height,
      palette: palette.slice(),
      indices,
      alpha,
    });
  }

  if (pixels.offset !== paletteOffset) {
    throw new Error(
      'Cache sprite pixel data has ' +
        (paletteOffset - pixels.offset) +
        ' unconsumed byte(s).',
    );
  }

  return frames;
}

export function cacheSpriteToRgba(
  sprite: CacheSpriteFrame,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(
    sprite.width * sprite.height * 4,
  );

  for (let pixel = 0; pixel < sprite.indices.length; pixel += 1) {
    const paletteIndex = sprite.indices[pixel]!;
    if (paletteIndex >= sprite.palette.length) {
      throw new Error(
        'Cache sprite palette index ' + paletteIndex +
          ' exceeds palette size ' + sprite.palette.length + '.',
      );
    }

    const rgb = sprite.palette[paletteIndex]!;
    const output = pixel * 4;
    rgba[output] = (rgb >>> 16) & 0xff;
    rgba[output + 1] = (rgb >>> 8) & 0xff;
    rgba[output + 2] = rgb & 0xff;
    rgba[output + 3] = sprite.alpha
      ? sprite.alpha[pixel]!
      : paletteIndex === 0
        ? 0
        : 0xff;
  }

  return rgba;
}

function readU16Array(
  reader: Reader,
  count: number,
): number[] {
  const values = new Array<number>(count);
  for (let index = 0; index < count; index += 1) {
    values[index] = reader.readU16();
  }
  return values;
}

function checkedPixelCount(
  width: number,
  height: number,
): number {
  const count = width * height;
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count > 16_777_216
  ) {
    throw new Error(
      'Invalid cache sprite dimensions ' + width + 'x' + height + '.',
    );
  }
  return count;
}

function readPlane(
  reader: Reader,
  target: Uint8Array,
  width: number,
  height: number,
  columnMajor: boolean,
): void {
  if (!columnMajor) {
    for (let index = 0; index < target.length; index += 1) {
      target[index] = reader.readU8();
    }
    return;
  }

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      target[x + y * width] = reader.readU8();
    }
  }
}

function readU16At(
  data: Uint8Array,
  offset: number,
): number {
  if (offset < 0 || offset + 2 > data.length) {
    throw new Error('Cache sprite u16 read is outside the payload.');
  }
  return (data[offset]! << 8) | data[offset + 1]!;
}

class Reader {
  offset: number;

  constructor(
    private readonly data: Uint8Array,
    start: number,
    private readonly end: number,
  ) {
    this.offset = start;
  }

  readU8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  readU16(): number {
    this.require(2);
    const value =
      (this.data[this.offset]! << 8) |
      this.data[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  readU24(): number {
    this.require(3);
    const value =
      (this.data[this.offset]! << 16) |
      (this.data[this.offset + 1]! << 8) |
      this.data[this.offset + 2]!;
    this.offset += 3;
    return value;
  }

  private require(length: number): void {
    if (this.offset + length > this.end) {
      throw new Error(
        'Unexpected end of cache sprite data at byte ' +
          this.offset + '.',
      );
    }
  }
}
