export interface MapLocation {
  readonly id: number;
  readonly localX: number;
  readonly localZ: number;
  readonly level: number;
  readonly shape: number;
  readonly angle: number;
}

/**
 * Decodes rev-240 location spawns from an lX_Z map group.
 *
 * This mirrors SoloScape's MapLocListDecoder:
 *   object ids: incrementing short-smart
 *   coordinates: short-smart deltas
 *   attributes: shape << 2 | angle
 */
export function decodeMapLocations(data: Uint8Array): MapLocation[] {
  const reader = new Reader(data);
  const locations: MapLocation[] = [];
  let objectId = -1;

  while (reader.remaining !== 0) {
    const idDelta = reader.readIncrShortSmart();
    if (idDelta === 0) {
      if (reader.remaining !== 0) {
        throw new RangeError(
          'Map locations contain ' + reader.remaining +
            ' trailing byte(s) after the object-id terminator.',
        );
      }
      break;
    }

    objectId += idDelta;
    let packedCoord = 0;

    while (true) {
      const coordDelta = reader.readShortSmart();
      if (coordDelta === 0) {
        break;
      }

      packedCoord += coordDelta - 1;
      const attributes = reader.readU8();

      locations.push({
        id: objectId,
        localZ: packedCoord & 0x3f,
        localX: (packedCoord >>> 6) & 0x3f,
        level: (packedCoord >>> 12) & 0x3,
        shape: attributes >>> 2,
        angle: attributes & 0x3,
      });
    }
  }

  return locations;
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

  readShortSmart(): number {
    this.require(1);
    if ((this.bytes[this.offset]! & 0x80) === 0) {
      return this.readU8();
    }
    return this.readU16() & 0x7fff;
  }

  readIncrShortSmart(): number {
    let total = 0;
    while (true) {
      const value = this.readShortSmart();
      total += value;
      if (value !== 0x7fff) {
        return total;
      }
    }
  }

  private require(length: number): void {
    if (this.offset + length > this.bytes.length) {
      throw new RangeError(
        'Unexpected end of map locations at byte ' + this.offset +
          '; need ' + length + ', have ' + this.remaining + '.',
      );
    }
  }
}
