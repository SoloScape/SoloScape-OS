import type {
  PlayerCoord,
  PlayerInfoInitBlock,
} from './RegionRebuildDecoder';
import type { ServerGamePacket } from './GamePacketFramer';
import {
  FinePlayerMovement,
  type FinePlayerMovementSnapshot,
  type FinePlayerRenderState,
} from '../runtime/PlayerMovement';

export const PLAYER_INFO_OPCODE = 91;
const PLAYER_COUNT = 2048;
const CUR_CYCLE_INACTIVE = 0x1;
const NEXT_CYCLE_INACTIVE = 0x2;

const EXTENDED_SHORT = 0x80;
const EXTENDED_MEDIUM = 0x2000;

const SAY = 0x1;
const UNUSED_FLAGS = 0x2;
const APPEARANCE = 0x4;
const PLAYER_RESET = 0x8;
const SEQUENCE = 0x10;
const SPOTANIM = 0x20;
const FACE = 0x40;
const NAME_EXTRAS = 0x200;
const TINTING = 0x400;
const TEMP_MOVE_SPEED = 0x800;
const CHAT = 0x1000;
const MOVE_SPEED = 0x4000;
const EXACT_MOVE = 0x8000;
const PLAYER_TRANSPARENCY = 0x10000;
const HEADBARS = 0x20000;
const PLAYER_FREEZE = 0x40000;
const SPOTANIM_OLD = 0x80000;
const HITMARKS = 0x100000;

const KNOWN_FLAGS =
  SAY |
  UNUSED_FLAGS |
  APPEARANCE |
  PLAYER_RESET |
  SEQUENCE |
  SPOTANIM |
  FACE |
  EXTENDED_SHORT |
  NAME_EXTRAS |
  TINTING |
  TEMP_MOVE_SPEED |
  CHAT |
  EXTENDED_MEDIUM |
  MOVE_SPEED |
  EXACT_MOVE |
  PLAYER_TRANSPARENCY |
  HEADBARS |
  PLAYER_FREEZE |
  SPOTANIM_OLD |
  HITMARKS;

type UpdateType =
  | 'low-idle'
  | 'high-idle'
  | 'low-to-high'
  | 'high-movement'
  | 'low-movement'
  | 'high-to-low';

export interface PlayerAppearance {
  readonly name: string;
  readonly combatLevel: number;
  readonly skillLevel: number;
  readonly hidden: boolean;
  readonly bodyType: number;
  readonly textGender: number;
  readonly skullIcon: number;
  readonly overheadIcon: number;
  readonly transformedNpcId: number;
  /**
   * Twelve appearance slots exactly as transmitted by the rev-240 client:
   * 0 = empty, 256..511 = ident-kit, >=512 = worn object.
   */
  readonly identKit: readonly number[];
  readonly interfaceIdentKit: readonly number[];
  readonly colours: readonly number[];
  readonly readyAnim: number;
  readonly turnAnim: number;
  readonly walkAnim: number;
  readonly walkAnimBack: number;
  readonly walkAnimLeft: number;
  readonly walkAnimRight: number;
  readonly runAnim: number;
  readonly beforeName: string;
  readonly afterName: string;
  readonly afterCombatLevel: string;
  readonly forceRefresh: boolean;
}

export interface ClientPlayer {
  readonly index: number;
  readonly coord: PlayerCoord;
  readonly queuedMove: boolean;
  readonly appearance?: PlayerAppearance;
  readonly appearanceRevision: number;
}

export interface ClientPlayerRenderState extends FinePlayerRenderState {
  readonly level: number;
}

export interface PlayerInfoUpdate {
  readonly localPlayer: ClientPlayer;
  readonly localPlayerMoved: boolean;
  readonly localPlayerAppearanceChanged: boolean;
  readonly updatedIndices: readonly number[];
}

/**
 * Persistent revision-240 GPI/PLAYER_INFO decoder.
 *
 * This mirrors Client/protocol/osrs-240 PlayerInfoClient: the first login
 * REBUILD_NORMAL_V2 initializes the 2048-slot high/low-resolution tables,
 * then opcode 91 mutates those tables every cycle. The decoder deliberately
 * retains the client-side player state rather than treating PLAYER_INFO as a
 * stateless packet.
 */
export class Rev240PlayerInfoDecoder {
  private readonly extendedInfoIndices = new Int32Array(PLAYER_COUNT);
  private extendedInfoCount = 0;
  private readonly highResolutionIndices = new Int32Array(PLAYER_COUNT);
  private highResolutionCount = 0;
  private readonly lowResolutionIndices = new Int32Array(PLAYER_COUNT);
  private lowResolutionCount = 0;
  private readonly unmodifiedFlags = new Uint8Array(PLAYER_COUNT);
  private readonly players: Array<MutablePlayer | null> =
    new Array(PLAYER_COUNT).fill(null);
  private readonly lowResolutionPositions = new Uint32Array(PLAYER_COUNT);
  private readonly updateTypes: UpdateType[] =
    new Array<UpdateType>(PLAYER_COUNT).fill('low-idle');
  private initialized = false;

  constructor(readonly localPlayerIndex: number) {
    if (
      !Number.isInteger(localPlayerIndex) ||
      localPlayerIndex < 1 ||
      localPlayerIndex >= PLAYER_COUNT
    ) {
      throw new RangeError(
        'rev-240 local player index must be in 1..2047; received ' +
          localPlayerIndex + '.',
      );
    }
  }

  initialize(init: PlayerInfoInitBlock): void {
    if (init.localPlayerIndex !== this.localPlayerIndex) {
      throw new Error(
        'GPI local player index mismatch: login=' +
          this.localPlayerIndex + ', rebuild=' +
          init.localPlayerIndex + '.',
      );
    }

    this.reset();

    const localPlayer: MutablePlayer = {
      index: this.localPlayerIndex,
      coord: { ...init.localPlayerCoord },
      queuedMove: false,
      movement: new FinePlayerMovement(
        init.localPlayerCoord.x,
        init.localPlayerCoord.z,
      ),
      appearanceRevision: 0,
    };
    this.players[this.localPlayerIndex] = localPlayer;
    this.highResolutionIndices[this.highResolutionCount++] =
      this.localPlayerIndex;

    for (let index = 1; index < PLAYER_COUNT; index += 1) {
      if (index === this.localPlayerIndex) {
        continue;
      }
      this.lowResolutionPositions[index] =
        init.lowResolutionPositions[index] ?? 0;
      this.lowResolutionIndices[this.lowResolutionCount++] = index;
    }

    this.initialized = true;
  }

  reset(): void {
    this.players.fill(null);
    this.highResolutionIndices.fill(0);
    this.lowResolutionIndices.fill(0);
    this.unmodifiedFlags.fill(0);
    this.lowResolutionPositions.fill(0);
    this.updateTypes.fill('low-idle');
    this.extendedInfoCount = 0;
    this.highResolutionCount = 0;
    this.lowResolutionCount = 0;
    this.initialized = false;
  }

  getLocalPlayer(): ClientPlayer | null {
    return this.players[this.localPlayerIndex];
  }

  getLocalPlayerMovementSnapshot(): FinePlayerMovementSnapshot | null {
    return this.players[this.localPlayerIndex]?.movement.snapshot() ?? null;
  }

  getPlayer(index: number): ClientPlayer | null {
    return this.players[index] ?? null;
  }

  tickMovement(): void {
    for (let i = 0; i < this.highResolutionCount; i += 1) {
      const player = this.players[this.highResolutionIndices[i]!];
      player?.movement.tick();
    }
  }

  getLocalPlayerRenderState(
    interpolationAlpha: number,
  ): ClientPlayerRenderState | null {
    const player = this.players[this.localPlayerIndex];
    if (!player) {
      return null;
    }
    return {
      level: player.coord.level,
      ...player.movement.renderState(interpolationAlpha),
    };
  }

  decodePacket(packet: ServerGamePacket): PlayerInfoUpdate | null {
    if (packet.opcode !== PLAYER_INFO_OPCODE) {
      return null;
    }
    return this.decode(packet.payload);
  }

  decode(payload: Uint8Array): PlayerInfoUpdate {
    if (!this.initialized) {
      throw new Error(
        'PLAYER_INFO arrived before the login rebuild initialized GPI.',
      );
    }

    const local = this.requirePlayer(this.localPlayerIndex);
    const previousCoord = { ...local.coord };
    const previousAppearanceRevision = local.appearanceRevision;

    this.extendedInfoCount = 0;
    this.updateTypes.fill('low-idle');

    let byteOffset = 0;
    byteOffset = this.decodeHighResolutionPass(
      payload,
      byteOffset,
      false,
    );
    byteOffset = this.decodeHighResolutionPass(
      payload,
      byteOffset,
      true,
    );
    byteOffset = this.decodeLowResolutionPass(
      payload,
      byteOffset,
      true,
    );
    byteOffset = this.decodeLowResolutionPass(
      payload,
      byteOffset,
      false,
    );

    this.rebuildResolutionIndices();

    const reader = new JagReader(payload, byteOffset);
    this.decodeExtendedInfo(reader);
    if (reader.remaining !== 0) {
      throw new RangeError(
        'PLAYER_INFO decoder left ' + reader.remaining +
          ' trailing byte(s).',
      );
    }

    const updatedIndices: number[] = [];
    for (let index = 1; index < PLAYER_COUNT; index += 1) {
      if (this.updateTypes[index] !== 'low-idle') {
        updatedIndices.push(index);
      }
    }

    const current = this.requirePlayer(this.localPlayerIndex);
    return {
      localPlayer: current,
      localPlayerMoved:
        previousCoord.level !== current.coord.level ||
        previousCoord.x !== current.coord.x ||
        previousCoord.z !== current.coord.z,
      localPlayerAppearanceChanged:
        previousAppearanceRevision !== current.appearanceRevision,
      updatedIndices,
    };
  }

  private decodeHighResolutionPass(
    payload: Uint8Array,
    byteOffset: number,
    currentCycleInactive: boolean,
  ): number {
    const bits = new PacketBitReader(payload, byteOffset);
    let skipped = 0;

    for (let i = 0; i < this.highResolutionCount; i += 1) {
      const index = this.highResolutionIndices[i]!;
      const inactive =
        (this.unmodifiedFlags[index]! & CUR_CYCLE_INACTIVE) !== 0;
      if (inactive !== currentCycleInactive) {
        continue;
      }

      if (skipped > 0) {
        skipped -= 1;
        this.updateTypes[index] = 'high-idle';
        this.unmodifiedFlags[index] |= NEXT_CYCLE_INACTIVE;
        continue;
      }

      if (bits.readBits(1) === 0) {
        skipped = readStationary(bits);
        this.updateTypes[index] = 'high-idle';
        this.unmodifiedFlags[index] |= NEXT_CYCLE_INACTIVE;
      } else {
        this.decodeHighResolutionPosition(bits, index);
      }
    }

    if (skipped !== 0) {
      throw new RangeError(
        'PLAYER_INFO high-resolution skip count did not resolve to zero.',
      );
    }
    return bits.nextByteOffset;
  }

  private decodeLowResolutionPass(
    payload: Uint8Array,
    byteOffset: number,
    currentCycleInactive: boolean,
  ): number {
    const bits = new PacketBitReader(payload, byteOffset);
    let skipped = 0;

    for (let i = 0; i < this.lowResolutionCount; i += 1) {
      const index = this.lowResolutionIndices[i]!;
      const inactive =
        (this.unmodifiedFlags[index]! & CUR_CYCLE_INACTIVE) !== 0;
      if (inactive !== currentCycleInactive) {
        continue;
      }

      if (skipped > 0) {
        skipped -= 1;
        this.updateTypes[index] = 'low-idle';
        this.unmodifiedFlags[index] |= NEXT_CYCLE_INACTIVE;
        continue;
      }

      if (bits.readBits(1) === 0) {
        skipped = readStationary(bits);
        this.updateTypes[index] = 'low-idle';
        this.unmodifiedFlags[index] |= NEXT_CYCLE_INACTIVE;
      } else if (this.decodeLowResolutionPosition(bits, index)) {
        this.unmodifiedFlags[index] |= NEXT_CYCLE_INACTIVE;
      }
    }

    if (skipped !== 0) {
      throw new RangeError(
        'PLAYER_INFO low-resolution skip count did not resolve to zero.',
      );
    }
    return bits.nextByteOffset;
  }

  private decodeHighResolutionPosition(
    bits: PacketBitReader,
    index: number,
  ): void {
    const extendedInfo = bits.readBits(1) === 1;
    if (extendedInfo) {
      this.extendedInfoIndices[this.extendedInfoCount++] = index;
    }

    const opcode = bits.readBits(2);
    const player = this.requirePlayer(index);

    if (opcode === 0) {
      if (extendedInfo) {
        player.queuedMove = false;
        this.updateTypes[index] = 'high-idle';
        return;
      }
      if (index === this.localPlayerIndex) {
        throw new Error(
          'Local player cannot leave high resolution without extended info.',
        );
      }

      this.lowResolutionPositions[index] = packLowResolutionPosition(
        player.coord.level,
        player.coord.x >>> 13,
        player.coord.z >>> 13,
      );
      this.players[index] = null;
      this.updateTypes[index] = 'high-to-low';
      if (bits.readBits(1) !== 0) {
        this.decodeLowResolutionPosition(bits, index);
      }
      return;
    }

    if (opcode === 1) {
      this.updateTypes[index] = 'high-movement';
      const movement = bits.readBits(3);
      const destination = stepCoord(player.coord, movement, 1);
      player.coord = destination;
      player.movement.enqueueTile(
        destination.x,
        destination.z,
        false,
      );
      player.queuedMove = extendedInfo;
      return;
    }

    if (opcode === 2) {
      this.updateTypes[index] = 'high-movement';
      const movement = bits.readBits(4);
      const destination = stepCoord(player.coord, movement, 2);
      player.coord = destination;
      player.movement.enqueueTile(
        destination.x,
        destination.z,
        true,
      );
      player.queuedMove = extendedInfo;
      return;
    }

    this.updateTypes[index] = 'high-movement';
    const far = bits.readBits(1);
    let destination: PlayerCoord;
    if (far === 0) {
      const packed = bits.readBits(12);
      const levelDelta = packed >>> 10;
      let deltaX = (packed >>> 5) & 0x1f;
      let deltaZ = packed & 0x1f;
      if (deltaX > 15) deltaX -= 32;
      if (deltaZ > 15) deltaZ -= 32;
      destination = {
        level: (player.coord.level + levelDelta) & 0x3,
        x: player.coord.x + deltaX,
        z: player.coord.z + deltaZ,
      };
    } else {
      const packed = bits.readBits(30);
      const levelDelta = packed >>> 28;
      const deltaX = (packed >>> 14) & 0x3fff;
      const deltaZ = packed & 0x3fff;
      destination = {
        level: (player.coord.level + levelDelta) & 0x3,
        x: (player.coord.x + deltaX) & 0x3fff,
        z: (player.coord.z + deltaZ) & 0x3fff,
      };
    }
    player.coord = destination;
    player.movement.teleportTile(destination.x, destination.z);
    player.queuedMove = extendedInfo;
  }

  private decodeLowResolutionPosition(
    bits: PacketBitReader,
    index: number,
  ): boolean {
    const opcode = bits.readBits(2);

    if (opcode === 0) {
      if (bits.readBits(1) !== 0) {
        this.decodeLowResolutionPosition(bits, index);
      }

      const x = bits.readBits(13);
      const z = bits.readBits(13);
      const extendedInfo = bits.readBits(1) === 1;
      if (extendedInfo) {
        this.extendedInfoIndices[this.extendedInfoCount++] = index;
      }
      if (this.players[index] !== null) {
        throw new Error(
          'Low-resolution player ' + index +
            ' already exists in high resolution.',
        );
      }

      const low = unpackLowResolutionPosition(
        this.lowResolutionPositions[index]!,
      );
      const coord = {
        level: low.level,
        x: (low.x << 13) + x,
        z: (low.z << 13) + z,
      };
      this.players[index] = {
        index,
        coord,
        queuedMove: false,
        movement: new FinePlayerMovement(coord.x, coord.z),
        appearanceRevision: 0,
      };
      this.updateTypes[index] = 'low-to-high';
      return true;
    }

    if (opcode === 1) {
      const levelDelta = bits.readBits(2);
      const low = unpackLowResolutionPosition(
        this.lowResolutionPositions[index]!,
      );
      this.lowResolutionPositions[index] = packLowResolutionPosition(
        (low.level + levelDelta) & 0x3,
        low.x,
        low.z,
      );
      this.updateTypes[index] = 'low-movement';
      return false;
    }

    if (opcode === 2) {
      const packed = bits.readBits(5);
      const levelDelta = packed >>> 3;
      const movement = packed & 0x7;
      const low = unpackLowResolutionPosition(
        this.lowResolutionPositions[index]!,
      );
      const moved = stepLowResolution(low.x, low.z, movement);
      this.lowResolutionPositions[index] = packLowResolutionPosition(
        (low.level + levelDelta) & 0x3,
        moved.x,
        moved.z,
      );
      this.updateTypes[index] = 'low-movement';
      return false;
    }

    const packed = bits.readBits(18);
    const levelDelta = packed >>> 16;
    const xDelta = (packed >>> 8) & 0xff;
    const zDelta = packed & 0xff;
    const low = unpackLowResolutionPosition(
      this.lowResolutionPositions[index]!,
    );
    this.lowResolutionPositions[index] = packLowResolutionPosition(
      (low.level + levelDelta) & 0x3,
      (low.x + xDelta) & 0xff,
      (low.z + zDelta) & 0xff,
    );
    this.updateTypes[index] = 'low-movement';
    return false;
  }

  private rebuildResolutionIndices(): void {
    this.lowResolutionCount = 0;
    this.highResolutionCount = 0;

    for (let index = 1; index < PLAYER_COUNT; index += 1) {
      this.unmodifiedFlags[index] >>>= 1;
      if (this.players[index]) {
        this.highResolutionIndices[this.highResolutionCount++] = index;
      } else {
        this.lowResolutionIndices[this.lowResolutionCount++] = index;
      }
    }
  }

  private decodeExtendedInfo(reader: JagReader): void {
    for (let i = 0; i < this.extendedInfoCount; i += 1) {
      const index = this.extendedInfoIndices[i]!;
      const player = this.requirePlayer(index);

      let flags = reader.g1();
      if ((flags & EXTENDED_SHORT) !== 0) {
        flags += reader.g1() << 8;
      }
      if ((flags & EXTENDED_MEDIUM) !== 0) {
        flags += reader.g1() << 16;
      }

      if ((flags & UNUSED_FLAGS) !== 0) {
        throw new Error('PLAYER_INFO used the reserved 0x2 update flag.');
      }
      const unknownFlags = flags & ~KNOWN_FLAGS;
      if (unknownFlags !== 0) {
        throw new Error(
          'PLAYER_INFO contains unknown update flags 0x' +
            unknownFlags.toString(16) + '.',
        );
      }

      if ((flags & SPOTANIM) !== 0) skipSpotanims(reader);
      if ((flags & CHAT) !== 0) skipChat(reader);
      if ((flags & HEADBARS) !== 0) skipHeadbars(reader);

      if ((flags & APPEARANCE) !== 0) {
        const length = reader.g1Alt3();
        const raw = reader.bytes(length);
        raw.reverse();
        player.appearance = decodeAppearance(raw);
        player.appearanceRevision += 1;
      }

      if ((flags & PLAYER_FREEZE) !== 0) reader.skip(5);
      if ((flags & FACE) !== 0) skipFace(reader);
      if ((flags & NAME_EXTRAS) !== 0) {
        reader.gjstr();
        reader.gjstr();
        reader.gjstr();
      }
      if ((flags & MOVE_SPEED) !== 0) reader.skip(1);
      if ((flags & TEMP_MOVE_SPEED) !== 0) reader.skip(1);
      if ((flags & SPOTANIM_OLD) !== 0) skipOldSpotanims(reader);
      if ((flags & PLAYER_TRANSPARENCY) !== 0) reader.skip(7);
      if ((flags & HITMARKS) !== 0) skipHitmarks(reader);
      if ((flags & EXACT_MOVE) !== 0) reader.skip(10);
      if ((flags & SEQUENCE) !== 0) reader.skip(3);
      if ((flags & TINTING) !== 0) reader.skip(8);
      if ((flags & PLAYER_RESET) !== 0) reader.skip(1);
      if ((flags & SAY) !== 0) reader.gjstr();
    }
  }

  private requirePlayer(index: number): MutablePlayer {
    const player = this.players[index];
    if (!player) {
      throw new Error(
        'PLAYER_INFO expected player ' + index +
          ' to be in high resolution.',
      );
    }
    return player;
  }
}

interface MutablePlayer {
  readonly index: number;
  coord: PlayerCoord;
  queuedMove: boolean;
  readonly movement: FinePlayerMovement;
  appearance?: PlayerAppearance;
  appearanceRevision: number;
}

function readStationary(bits: PacketBitReader): number {
  const type = bits.readBits(2);
  if (type === 0) return 0;
  if (type === 1) return bits.readBits(5);
  if (type === 2) return bits.readBits(8);
  return bits.readBits(11);
}

function stepCoord(
  coord: PlayerCoord,
  movement: number,
  distance: 1 | 2,
): PlayerCoord {
  let dx = 0;
  let dz = 0;

  if (distance === 1) {
    const offsets = [
      [-1, -1], [0, -1], [1, -1], [-1, 0],
      [1, 0], [-1, 1], [0, 1], [1, 1],
    ] as const;
    [dx, dz] = offsets[movement] ?? [0, 0];
  } else {
    const offsets = [
      [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2],
      [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1],
      [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2],
    ] as const;
    [dx, dz] = offsets[movement] ?? [0, 0];
  }

  return {
    level: coord.level,
    x: coord.x + dx,
    z: coord.z + dz,
  };
}

function stepLowResolution(
  x: number,
  z: number,
  movement: number,
): { x: number; z: number } {
  const moved = stepCoord(
    { level: 0, x, z },
    movement,
    1,
  );
  return {
    x: moved.x & 0xff,
    z: moved.z & 0xff,
  };
}

function packLowResolutionPosition(
  level: number,
  x: number,
  z: number,
): number {
  return (
    ((level & 0x3) << 16) |
    ((x & 0xff) << 8) |
    (z & 0xff)
  ) >>> 0;
}

function unpackLowResolutionPosition(
  packed: number,
): { level: number; x: number; z: number } {
  return {
    level: (packed >>> 16) & 0x3,
    x: (packed >>> 8) & 0xff,
    z: packed & 0xff,
  };
}

function skipSpotanims(reader: JagReader): void {
  const count = reader.g1Alt1();
  for (let i = 0; i < count; i += 1) {
    reader.g1Alt2();
    reader.g2Alt1();
    reader.g4();
    reader.g1Alt3();
  }
}

function skipOldSpotanims(reader: JagReader): void {
  const count = reader.g1Alt3();
  for (let i = 0; i < count; i += 1) {
    reader.g1Alt1();
    reader.g2Alt1();
    reader.g4Alt1();
  }
}

function skipChat(reader: JagReader): void {
  const colourAndEffects = reader.g2();
  const colour = colourAndEffects >>> 8;
  reader.g1Alt1();
  reader.g1Alt2();
  const huffmanLength = reader.g1Alt1();
  reader.skip(huffmanLength);
  const patternLength = colour >= 13 && colour <= 20
    ? colour - 12
    : 0;
  reader.skip(patternLength);
}

function skipHeadbars(reader: JagReader): void {
  const count = reader.g1Alt3();
  for (let i = 0; i < count; i += 1) {
    reader.gSmart1or2();
    const endTime = reader.gSmart1or2();
    if (endTime === 0x7fff) {
      continue;
    }
    reader.gSmart1or2();
    reader.g1();
    if (endTime > 0) {
      reader.g1Alt2();
    }
  }
}

function skipHitmarks(reader: JagReader): void {
  const count = reader.g1();
  for (let i = 0; i < count; i += 1) {
    reader.gSmart1or2();
    reader.gSmart1or2();
    reader.gSmart1or2();
    reader.gSmart1or2();
  }
}

function skipFace(reader: JagReader): void {
  const flag = reader.g1();
  const kind = (flag >>> 3) & 0x7;
  if (kind === 0) {
    reader.gSmart1or2();
    reader.gSmart2or4null();
    reader.gSmart1or2();
    return;
  }
  if (kind === 1) {
    reader.gSmart1or2();
    reader.gSmart1or2();
    reader.gSmart1or2();
    return;
  }
  if (kind === 2) {
    reader.gSmart1or2();
    return;
  }
  if (kind === 3) {
    return;
  }
  throw new Error('Unknown rev-240 FACE update kind ' + kind + '.');
}

function decodeAppearance(bytes: Uint8Array): PlayerAppearance {
  const reader = new JagReader(bytes);
  const bodyType = reader.g1s();
  const skullIcon = reader.g1s();
  const overheadIcon = reader.g1s();
  const identKit = new Array<number>(12).fill(0);
  let transformedNpcId = -1;

  for (let i = 0; i < 12; i += 1) {
    const high = reader.g1();
    if (high === 0) {
      continue;
    }
    identKit[i] = (high << 8) + reader.g1();
    if (i === 0 && identKit[i] === 0xffff) {
      transformedNpcId = reader.g2();
      break;
    }
  }

  const interfaceIdentKit = new Array<number>(12).fill(0);
  for (let i = 0; i < 12; i += 1) {
    const high = reader.g1();
    interfaceIdentKit[i] = high === 0
      ? 0
      : (high << 8) + reader.g1();
  }

  const colours = new Array<number>(5);
  for (let i = 0; i < colours.length; i += 1) {
    colours[i] = reader.g1();
  }

  const readyAnim = reader.g2();
  const turnAnim = reader.g2();
  const walkAnim = reader.g2();
  const walkAnimBack = reader.g2();
  const walkAnimLeft = reader.g2();
  const walkAnimRight = reader.g2();
  const runAnim = reader.g2();
  const name = reader.gjstr();
  const combatLevel = reader.g1();
  const skillLevel = reader.g2();
  const hidden = reader.g1() === 1;
  const customisationFlag = reader.g2();
  const forceRefresh = ((customisationFlag >>> 15) & 1) === 1;

  if (customisationFlag > 0 && customisationFlag !== 0x8000) {
    skipObjectCustomisations(reader, customisationFlag);
  }

  const beforeName = reader.gjstr();
  const afterName = reader.gjstr();
  const afterCombatLevel = reader.gjstr();
  const textGender = reader.g1s();

  if (reader.remaining !== 0) {
    throw new RangeError(
      'Appearance block left ' + reader.remaining + ' trailing byte(s).',
    );
  }

  return {
    name,
    combatLevel,
    skillLevel,
    hidden,
    bodyType,
    textGender,
    skullIcon,
    overheadIcon,
    transformedNpcId,
    identKit,
    interfaceIdentKit,
    colours,
    readyAnim,
    turnAnim,
    walkAnim,
    walkAnimBack,
    walkAnimLeft,
    walkAnimRight,
    runAnim,
    beforeName,
    afterName,
    afterCombatLevel,
    forceRefresh,
  };
}

function skipObjectCustomisations(
  reader: JagReader,
  flags: number,
): void {
  for (let i = 0; i < 12; i += 1) {
    const present = (flags >>> (12 - i)) & 1;
    if (present === 0) {
      continue;
    }

    const slotFlags = reader.g1();
    if ((slotFlags & 0x1) !== 0) {
      const indices = reader.g1();
      if ((indices & 0xf) !== 0xf) reader.g2();
      if (((indices >>> 4) & 0xf) !== 0xf) reader.g2();
    }
    if ((slotFlags & 0x2) !== 0) {
      const indices = reader.g1();
      if ((indices & 0xf) !== 0xf) reader.g2();
      if (((indices >>> 4) & 0xf) !== 0xf) reader.g2();
    }
    if ((slotFlags & 0x4) !== 0) {
      reader.g4();
      reader.g4();
    }
    if ((slotFlags & 0x8) !== 0) {
      reader.g4();
      reader.g4();
    }
  }
}

class PacketBitReader {
  private bitOffset: number;

  constructor(
    private readonly bytes: Uint8Array,
    byteOffset: number,
  ) {
    if (byteOffset < 0 || byteOffset > bytes.length) {
      throw new RangeError('PLAYER_INFO bit reader offset is out of bounds.');
    }
    this.bitOffset = byteOffset * 8;
  }

  get nextByteOffset(): number {
    return Math.ceil(this.bitOffset / 8);
  }

  readBits(count: number): number {
    if (count < 1 || count > 32) {
      throw new RangeError('Bit count must be in 1..32.');
    }
    if (this.bitOffset + count > this.bytes.length * 8) {
      throw new RangeError(
        'PLAYER_INFO bitstream underflow at bit ' +
          this.bitOffset + ' reading ' + count + ' bit(s).',
      );
    }

    let value = 0;
    for (let i = 0; i < count; i += 1) {
      const absolute = this.bitOffset++;
      const byte = this.bytes[absolute >>> 3]!;
      value =
        value * 2 +
        ((byte >>> (7 - (absolute & 7))) & 1);
    }
    return value >>> 0;
  }
}

class JagReader {
  private offset: number;
  private readonly cp1252 = new TextDecoder('windows-1252');

  constructor(
    private readonly bytesValue: Uint8Array,
    offset = 0,
  ) {
    if (offset < 0 || offset > bytesValue.length) {
      throw new RangeError('JagReader offset is out of bounds.');
    }
    this.offset = offset;
  }

  get remaining(): number {
    return this.bytesValue.length - this.offset;
  }

  g1(): number {
    this.require(1);
    return this.bytesValue[this.offset++]!;
  }

  g1s(): number {
    return toSignedByte(this.g1());
  }

  g1Alt1(): number {
    return (this.g1() - 128) & 0xff;
  }

  g1Alt2(): number {
    return (-toSignedByte(this.g1())) & 0xff;
  }

  g1Alt3(): number {
    return (128 - toSignedByte(this.g1())) & 0xff;
  }

  g2(): number {
    return (this.g1() << 8) | this.g1();
  }

  g2Alt1(): number {
    const low = this.g1();
    const high = this.g1();
    return low | (high << 8);
  }

  g4(): number {
    return (
      ((this.g1() << 24) >>> 0) |
      (this.g1() << 16) |
      (this.g1() << 8) |
      this.g1()
    ) >>> 0;
  }

  g4Alt1(): number {
    const b0 = this.g1();
    const b1 = this.g1();
    const b2 = this.g1();
    const b3 = this.g1();
    return (
      ((b3 << 24) >>> 0) |
      (b2 << 16) |
      (b1 << 8) |
      b0
    ) >>> 0;
  }

  gSmart1or2(): number {
    this.require(1);
    return this.bytesValue[this.offset]! < 128
      ? this.g1()
      : this.g2() - 32768;
  }

  gSmart2or4null(): number {
    this.require(1);
    if (toSignedByte(this.bytesValue[this.offset]!) < 0) {
      return this.g4() & 0x7fffffff;
    }
    const value = this.g2();
    return value === 32767 ? -1 : value;
  }

  gjstr(): string {
    const start = this.offset;
    while (
      this.offset < this.bytesValue.length &&
      this.bytesValue[this.offset] !== 0
    ) {
      this.offset += 1;
    }
    if (this.offset >= this.bytesValue.length) {
      throw new RangeError('Unterminated Jagex string.');
    }
    const value = this.cp1252.decode(
      this.bytesValue.subarray(start, this.offset),
    );
    this.offset += 1;
    return value;
  }

  bytes(length: number): Uint8Array {
    this.require(length);
    const value = this.bytesValue.slice(
      this.offset,
      this.offset + length,
    );
    this.offset += length;
    return value;
  }

  skip(length: number): void {
    this.require(length);
    this.offset += length;
  }

  private require(length: number): void {
    if (
      !Number.isInteger(length) ||
      length < 0 ||
      this.offset + length > this.bytesValue.length
    ) {
      throw new RangeError(
        'PLAYER_INFO byte stream is truncated: need ' +
          length + ' byte(s) with ' + this.remaining + ' remaining.',
      );
    }
  }
}

function toSignedByte(value: number): number {
  return value > 127 ? value - 256 : value;
}
