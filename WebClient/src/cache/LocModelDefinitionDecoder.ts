export interface LocModelDefinition {
  readonly id: number;
  readonly modelIds: readonly number[];
  readonly modelTypes: readonly number[] | null;
  readonly sizeX: number;
  readonly sizeZ: number;
  readonly rotated: boolean;
  readonly modelScaleX: number;
  readonly modelScaleY: number;
  readonly modelScaleZ: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly offsetZ: number;
  readonly recolorFrom: readonly number[];
  readonly recolorTo: readonly number[];
  readonly retextureFrom: readonly number[];
  readonly retextureTo: readonly number[];
  readonly transformVarbit: number;
  readonly transformVarp: number;
  readonly transforms: readonly number[];
}

/**
 * Minimal-but-complete revision-240 loc/object definition decoder for scene
 * asset discovery. It consumes every opcode used by the current RuneLite
 * object loader while retaining the fields required to resolve and transform
 * model geometry.
 */
export function decodeLocModelDefinition(
  id: number,
  data: Uint8Array,
): LocModelDefinition {
  const reader = new Reader(data);
  let modelIds: number[] = [];
  let modelTypes: number[] | null = null;
  let sizeX = 1;
  let sizeZ = 1;
  let rotated = false;
  let modelScaleX = 128;
  let modelScaleY = 128;
  let modelScaleZ = 128;
  let offsetX = 0;
  let offsetY = 0;
  let offsetZ = 0;
  let recolorFrom: number[] = [];
  let recolorTo: number[] = [];
  let retextureFrom: number[] = [];
  let retextureTo: number[] = [];
  let transformVarbit = -1;
  let transformVarp = -1;
  let transforms: number[] = [];

  while (true) {
    const opcode = reader.readU8();
    if (opcode === 0) {
      break;
    }

    switch (opcode) {
      case 1: {
        const count = reader.readU8();
        modelIds = new Array<number>(count);
        modelTypes = new Array<number>(count);
        for (let index = 0; index < count; index += 1) {
          modelIds[index] = reader.readU16();
          modelTypes[index] = reader.readU8();
        }
        break;
      }
      case 2:
        reader.skipString();
        break;
      case 5: {
        const count = reader.readU8();
        modelTypes = null;
        modelIds = new Array<number>(count);
        for (let index = 0; index < count; index += 1) {
          modelIds[index] = reader.readU16();
        }
        break;
      }
      case 6: {
        const count = reader.readU8();
        modelIds = new Array<number>(count);
        modelTypes = new Array<number>(count);
        for (let index = 0; index < count; index += 1) {
          modelIds[index] = reader.readU32();
          modelTypes[index] = reader.readU8();
        }
        break;
      }
      case 7: {
        const count = reader.readU8();
        modelTypes = null;
        modelIds = new Array<number>(count);
        for (let index = 0; index < count; index += 1) {
          modelIds[index] = reader.readU32();
        }
        break;
      }
      case 14:
        sizeX = reader.readU8();
        break;
      case 15:
        sizeZ = reader.readU8();
        break;
      case 17:
      case 18:
      case 21:
      case 22:
      case 23:
      case 27:
      case 62:
      case 64:
      case 73:
      case 74:
      case 89:
      case 90:
      case 94:
        break;
      case 19:
      case 28:
      case 29:
      case 39:
      case 69:
      case 75:
      case 81:
      case 91:
      case 95:
      case 96:
        reader.skip(1);
        break;
      case 24:
      case 42:
      case 61:
      case 68:
      case 82:
        reader.skip(2);
        break;
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
        reader.skipString();
        break;
      case 40: {
        const count = reader.readU8();
        recolorFrom = new Array<number>(count);
        recolorTo = new Array<number>(count);
        for (let index = 0; index < count; index += 1) {
          recolorFrom[index] = reader.readU16();
          recolorTo[index] = reader.readU16();
        }
        break;
      }
      case 41: {
        const count = reader.readU8();
        retextureFrom = new Array<number>(count);
        retextureTo = new Array<number>(count);
        for (let index = 0; index < count; index += 1) {
          retextureFrom[index] = reader.readU16();
          retextureTo[index] = reader.readU16();
        }
        break;
      }
      case 65:
        modelScaleX = reader.readU16();
        break;
      case 66:
        modelScaleY = reader.readU16();
        break;
      case 67:
        modelScaleZ = reader.readU16();
        break;
      case 70:
        offsetX = reader.readI16();
        break;
      case 71:
        offsetY = reader.readI16();
        break;
      case 72:
        offsetZ = reader.readI16();
        break;
      case 77: {
        transformVarbit = normalizeNullableU16(reader.readU16());
        transformVarp = normalizeNullableU16(reader.readU16());
        const count = reader.readU8();
        transforms = new Array<number>(count + 2);
        for (let index = 0; index <= count; index += 1) {
          transforms[index] = normalizeNullableU16(reader.readU16());
        }
        transforms[count + 1] = -1;
        break;
      }
      case 78:
        reader.skip(4); // sound id, distance, retain (rev >= 220)
        break;
      case 79: {
        reader.skip(2 + 2 + 1 + 1);
        const count = reader.readU8();
        reader.skip(count * 2);
        break;
      }
      case 92: {
        transformVarbit = normalizeNullableU16(reader.readU16());
        transformVarp = normalizeNullableU16(reader.readU16());
        const fallback = normalizeNullableU16(reader.readU16());
        const count = reader.readU8();
        transforms = new Array<number>(count + 2);
        for (let index = 0; index <= count; index += 1) {
          transforms[index] = normalizeNullableU16(reader.readU16());
        }
        transforms[count + 1] = fallback;
        break;
      }
      case 93:
        reader.skip(1 + 2 + 1 + 2);
        break;
      case 100:
        reader.skip(2);
        reader.skipString();
        break;
      case 101:
        reader.skip(1 + 2 + 2 + 4 + 4);
        reader.skipString();
        break;
      case 102:
        reader.skip(1 + 2 + 2 + 2 + 4 + 4);
        reader.skipString();
        break;
      case 249: {
        const count = reader.readU8();
        for (let index = 0; index < count; index += 1) {
          const type = reader.readU8();
          reader.skip(3);
          if (type === 1) {
            reader.skipString();
          } else if (type === 2) {
            reader.skip(8);
          } else {
            reader.skip(4);
          }
        }
        break;
      }
      default:
        throw new RangeError(
          'Unsupported rev-240 loc definition opcode ' + opcode +
            ' for loc ' + id + '.',
        );
    }
  }

  if (reader.remaining !== 0) {
    throw new RangeError(
      'Loc definition ' + id + ' has ' + reader.remaining +
        ' trailing byte(s).',
    );
  }

  return {
    id,
    modelIds,
    modelTypes,
    sizeX,
    sizeZ,
    rotated,
    modelScaleX,
    modelScaleY,
    modelScaleZ,
    offsetX,
    offsetY,
    offsetZ,
    recolorFrom,
    recolorTo,
    retextureFrom,
    retextureTo,
    transformVarbit,
    transformVarp,
    transforms,
  };
}

function normalizeNullableU16(value: number): number {
  return value === 0xffff ? -1 : value;
}

class Reader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get remaining(): number {
    return this.bytes.length - this.offset;
  }

  readU8(): number {
    this.require(1);
    return this.bytes[this.offset++]!;
  }

  readU16(): number {
    this.require(2);
    const value =
      (this.bytes[this.offset]! << 8) |
      this.bytes[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  readI16(): number {
    const value = this.readU16();
    return value > 0x7fff ? value - 0x10000 : value;
  }

  readU32(): number {
    this.require(4);
    const value = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4,
    ).getUint32(0, false);
    this.offset += 4;
    return value;
  }

  skip(length: number): void {
    this.require(length);
    this.offset += length;
  }

  skipString(): void {
    while (true) {
      const value = this.readU8();
      if (value === 0) {
        return;
      }
    }
  }

  private require(length: number): void {
    if (length < 0 || this.offset + length > this.bytes.length) {
      throw new RangeError(
        'Unexpected end of loc definition at byte ' + this.offset +
          '; need ' + length + ', have ' + this.remaining + '.',
      );
    }
  }
}
