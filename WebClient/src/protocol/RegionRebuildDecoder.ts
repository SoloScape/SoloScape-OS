import type { ServerGamePacket } from './GamePacketFramer';

export const REBUILD_REGION_V2_OPCODE = 12;
export const REBUILD_NORMAL_V2_OPCODE = 39;

const BUILD_RADIUS_ZONES = 6;
const BUILD_DIAMETER_ZONES = BUILD_RADIUS_ZONES * 2 + 1;
const LEVEL_COUNT = 4;
const INSTANCE_ZONE_COUNT =
  LEVEL_COUNT * BUILD_DIAMETER_ZONES * BUILD_DIAMETER_ZONES;

export interface MapSquare {
  readonly id: number;
  readonly x: number;
  readonly z: number;
}

export interface NormalRegionRebuild {
  readonly kind: 'normal';
  readonly zoneX: number;
  readonly zoneZ: number;
  readonly worldArea: number;
  readonly mapSquares: readonly MapSquare[];
}

export interface InstanceZonePlacement {
  readonly destinationLevel: number;
  readonly destinationZoneX: number;
  readonly destinationZoneZ: number;
  readonly sourceLevel: number;
  readonly sourceZoneX: number;
  readonly sourceZoneZ: number;
  readonly rotation: number;
  readonly packedReferenceZone: number;
  readonly mapSquare: MapSquare;
}

export interface InstancedRegionRebuild {
  readonly kind: 'instanced';
  readonly zoneX: number;
  readonly zoneZ: number;
  readonly reload: boolean;
  readonly mapSquareCount: number;
  readonly mapSquares: readonly MapSquare[];
  readonly zones: readonly (InstanceZonePlacement | null)[];
}

export type RegionRebuild = NormalRegionRebuild | InstancedRegionRebuild;

/**
 * Decodes the two rev-240 region rebuild packets emitted by rsprot.
 *
 * REBUILD_NORMAL_V2 is exactly three transformed unsigned shorts.
 * REBUILD_REGION_V2 contains a transformed header, a distinct mapsquare count,
 * then 4 * 13 * 13 zone slots encoded as a bit stream. Populated instance slots
 * carry a 26-bit ReferenceZone. Revision 240 does not append XTEA key blocks.
 */
export function tryDecodeRegionRebuildPacket(
  packet: ServerGamePacket,
): RegionRebuild | null {
  if (packet.opcode === REBUILD_NORMAL_V2_OPCODE) {
    return decodeNormalRegionRebuild(packet.payload);
  }
  if (packet.opcode === REBUILD_REGION_V2_OPCODE) {
    return decodeInstancedRegionRebuild(packet.payload);
  }
  return null;
}

export function decodeNormalRegionRebuild(
  payload: Uint8Array,
): NormalRegionRebuild {
  if (payload.length !== 6) {
    throw new RangeError(
      'REBUILD_NORMAL_V2 payload must be 6 bytes; received ' +
        payload.length + '.',
    );
  }

  const zoneZ = readU16Alt3(payload, 0);
  const worldArea = readU16Alt3(payload, 2);
  const zoneX = readU16Alt3(payload, 4);

  return {
    kind: 'normal',
    zoneX,
    zoneZ,
    worldArea,
    mapSquares: collectStaticMapSquares(zoneX, zoneZ),
  };
}

export function decodeInstancedRegionRebuild(
  payload: Uint8Array,
): InstancedRegionRebuild {
  if (payload.length < 7) {
    throw new RangeError(
      'REBUILD_REGION_V2 payload must contain at least 7 bytes; received ' +
        payload.length + '.',
    );
  }

  const zoneZ = readU16Alt2(payload, 0);
  const zoneX = readU16Alt1(payload, 2);
  const reloadValue = readU8Alt1(payload[4]);
  if (reloadValue !== 0 && reloadValue !== 1) {
    throw new RangeError(
      'REBUILD_REGION_V2 reload flag must be 0 or 1; received ' +
        reloadValue + '.',
    );
  }

  const mapSquareCount = readU16BE(payload, 5);
  if (mapSquareCount > INSTANCE_ZONE_COUNT) {
    throw new RangeError(
      'REBUILD_REGION_V2 mapsquare count exceeds zone capacity: ' +
        mapSquareCount + ' > ' + INSTANCE_ZONE_COUNT + '.',
    );
  }

  const bitBytes = payload.subarray(7);
  const bits = new BitReader(bitBytes);
  const zones: Array<InstanceZonePlacement | null> =
    new Array(INSTANCE_ZONE_COUNT);
  const mapSquares: MapSquare[] = [];
  const seenMapSquares = new Set<number>();

  let index = 0;
  for (let level = 0; level < LEVEL_COUNT; level += 1) {
    for (
      let destinationZoneX = zoneX - BUILD_RADIUS_ZONES;
      destinationZoneX <= zoneX + BUILD_RADIUS_ZONES;
      destinationZoneX += 1
    ) {
      for (
        let destinationZoneZ = zoneZ - BUILD_RADIUS_ZONES;
        destinationZoneZ <= zoneZ + BUILD_RADIUS_ZONES;
        destinationZoneZ += 1
      ) {
        const present = bits.readBits(1);
        if (present === 0) {
          zones[index++] = null;
          continue;
        }

        const packed = bits.readBits(26);
        const sourceLevel = (packed >>> 24) & 0x3;
        const sourceZoneX = (packed >>> 14) & 0x3ff;
        const sourceZoneZ = (packed >>> 3) & 0x7ff;
        const rotation = (packed >>> 1) & 0x3;
        const mapSquare = toMapSquare(sourceZoneX >>> 3, sourceZoneZ >>> 3);

        if (!seenMapSquares.has(mapSquare.id)) {
          seenMapSquares.add(mapSquare.id);
          mapSquares.push(mapSquare);
        }

        zones[index++] = {
          destinationLevel: level,
          destinationZoneX,
          destinationZoneZ,
          sourceLevel,
          sourceZoneX,
          sourceZoneZ,
          rotation,
          packedReferenceZone: packed,
          mapSquare,
        };
      }
    }
  }

  bits.requireZeroPaddingAndEnd();

  if (mapSquares.length !== mapSquareCount) {
    throw new RangeError(
      'REBUILD_REGION_V2 mapsquare count mismatch: header=' +
        mapSquareCount + ', decoded=' + mapSquares.length + '.',
    );
  }

  return {
    kind: 'instanced',
    zoneX,
    zoneZ,
    reload: reloadValue === 1,
    mapSquareCount,
    mapSquares,
    zones,
  };
}

function collectStaticMapSquares(
  centerZoneX: number,
  centerZoneZ: number,
): MapSquare[] {
  const result: MapSquare[] = [];
  const seen = new Set<number>();

  for (
    let zoneX = centerZoneX - BUILD_RADIUS_ZONES;
    zoneX <= centerZoneX + BUILD_RADIUS_ZONES;
    zoneX += 1
  ) {
    for (
      let zoneZ = centerZoneZ - BUILD_RADIUS_ZONES;
      zoneZ <= centerZoneZ + BUILD_RADIUS_ZONES;
      zoneZ += 1
    ) {
      const mapSquareX = Math.floor(zoneX / 8);
      const mapSquareZ = Math.floor(zoneZ / 8);
      if (
        mapSquareX < 0 || mapSquareX > 0xff ||
        mapSquareZ < 0 || mapSquareZ > 0xff
      ) {
        continue;
      }
      const mapSquare = toMapSquare(mapSquareX, mapSquareZ);
      if (seen.has(mapSquare.id)) {
        continue;
      }
      seen.add(mapSquare.id);
      result.push(mapSquare);
    }
  }

  return result;
}

function toMapSquare(x: number, z: number): MapSquare {
  return {
    id: ((x & 0xff) << 8) | (z & 0xff),
    x,
    z,
  };
}

function readU8Alt1(value: number): number {
  return (value - 128) & 0xff;
}

function readU16Alt1(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU16Alt2(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | ((bytes[offset + 1] - 128) & 0xff);
}

function readU16Alt3(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] - 128) & 0xff) | (bytes[offset + 1] << 8);
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

class BitReader {
  private bitOffset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readBits(count: number): number {
    if (count < 1 || count > 32) {
      throw new RangeError('BitReader count must be in 1..32.');
    }
    if (this.bitOffset + count > this.bytes.length * 8) {
      throw new RangeError(
        'Region bitstream underflow: need ' + count +
          ' bits at offset ' + this.bitOffset + '.',
      );
    }

    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const absolute = this.bitOffset++;
      const byte = this.bytes[absolute >>> 3];
      const shift = 7 - (absolute & 7);
      value = (value * 2) + ((byte >>> shift) & 1);
    }
    return value >>> 0;
  }

  requireZeroPaddingAndEnd(): void {
    const usedBytes = Math.ceil(this.bitOffset / 8);
    if (usedBytes !== this.bytes.length) {
      throw new RangeError(
        'REBUILD_REGION_V2 has ' + (this.bytes.length - usedBytes) +
          ' trailing byte(s) after the 676 zone slots.',
      );
    }

    const partialBits = this.bitOffset & 7;
    if (partialBits === 0 || this.bytes.length === 0) {
      return;
    }

    const paddingBits = 8 - partialBits;
    const paddingMask = (1 << paddingBits) - 1;
    const last = this.bytes[this.bytes.length - 1];
    if ((last & paddingMask) !== 0) {
      throw new RangeError(
        'REBUILD_REGION_V2 has non-zero bit-buffer padding.',
      );
    }
  }
}
