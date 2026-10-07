const MAP_SIZE = 64;
const LEVELS = 4;
const TILE_COUNT = LEVELS * MAP_SIZE * MAP_SIZE;

export interface MapTerrain {
  readonly explicitHeights: Int16Array;
  readonly renderFlags: Uint8Array;
  readonly overlayIds: Int32Array;
  readonly overlayShapes: Uint8Array;
  readonly overlayRotations: Uint8Array;
  readonly underlayIds: Int32Array;
}

/**
 * Decodes the rev-240 map-terrain file format used by SoloScape's LIVE cache.
 *
 * The server's own MapTileDecoder reads 16-bit opcodes and signed 16-bit
 * overlay ids for this revision. Height opcode 0 is implicit/procedural;
 * height opcode 1 stores the raw one-byte height value. Actual world-space
 * heights are derived later when the scene builder knows the absolute tile.
 */
export function decodeMapTerrain(data: Uint8Array): MapTerrain {
  const reader = new Reader(data);
  const explicitHeights = new Int16Array(TILE_COUNT);
  explicitHeights.fill(-1);
  const renderFlags = new Uint8Array(TILE_COUNT);
  const overlayIds = new Int32Array(TILE_COUNT);
  overlayIds.fill(-1);
  const overlayShapes = new Uint8Array(TILE_COUNT);
  const overlayRotations = new Uint8Array(TILE_COUNT);
  const underlayIds = new Int32Array(TILE_COUNT);
  underlayIds.fill(-1);

  for (let level = 0; level < LEVELS; level += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      for (let z = 0; z < MAP_SIZE; z += 1) {
        const index = tileIndex(level, x, z);

        while (true) {
          const opcode = reader.readU16();

          if (opcode === 0) {
            break;
          }

          if (opcode === 1) {
            explicitHeights[index] = reader.readU8();
            break;
          }

          if (opcode <= 49) {
            const overlay = reader.readI16();
            if (overlay !== 0) {
              overlayIds[index] = (overlay - 1) & 0xffff;
            }
            overlayShapes[index] = (opcode - 2) >>> 2;
            overlayRotations[index] = (opcode - 2) & 0x3;
            continue;
          }

          if (opcode <= 81) {
            renderFlags[index] = opcode - 49;
            continue;
          }

          underlayIds[index] = (opcode - 81) & 0xff;
        }
      }
    }
  }

  return {
    explicitHeights,
    renderFlags,
    overlayIds,
    overlayShapes,
    overlayRotations,
    underlayIds,
  };
}

export function mapTerrainTileIndex(
  level: number,
  x: number,
  z: number,
): number {
  if (
    level < 0 || level >= LEVELS ||
    x < 0 || x >= MAP_SIZE ||
    z < 0 || z >= MAP_SIZE
  ) {
    throw new RangeError(
      'Map terrain coordinate outside 4x64x64 bounds: ' +
        level + ':' + x + ',' + z + '.',
    );
  }
  return tileIndex(level, x, z);
}

function tileIndex(level: number, x: number, z: number): number {
  return (level << 12) | (x << 6) | z;
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

  private require(length: number): void {
    if (this.offset + length > this.bytes.length) {
      throw new RangeError(
        'Unexpected end of map terrain at byte ' + this.offset +
          '; need ' + length + ', have ' + this.remaining + '.',
      );
    }
  }
}
