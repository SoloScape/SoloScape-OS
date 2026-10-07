import type { Js5Client, Js5DownloadedGroup } from './Js5Client';

const ANIMATIONS_ARCHIVE = 0;
const SKELETONS_ARCHIVE = 1;
const CONFIG_ARCHIVE = 2;
const SEQUENCE_GROUP = 12;

export interface DecodedSequenceDefinition {
  readonly id: number;
  readonly frameIds: readonly number[];
  readonly frameLengths: readonly number[];
  readonly frameStep: number;
  readonly animMayaId: number;
}

export interface DecodedSkeletonDefinition {
  readonly id: number;
  readonly transformTypes: Uint8Array;
  readonly labels: readonly Uint8Array[];
}

export interface DecodedAnimationFrame {
  readonly packedId: number;
  readonly skeleton: DecodedSkeletonDefinition;
  readonly transformSkeletonLabels: Int16Array;
  readonly transformXs: Int16Array;
  readonly transformYs: Int16Array;
  readonly transformZs: Int16Array;
}

export class PlayerAnimationAssetLoader {
  private sequenceFilesPromise:
    Promise<ReadonlyMap<number, Uint8Array>> | null = null;
  private readonly sequencePromises =
    new Map<number, Promise<DecodedSequenceDefinition | null>>();
  private readonly skeletonPromises =
    new Map<number, Promise<DecodedSkeletonDefinition>>();
  private readonly framePromises =
    new Map<number, Promise<DecodedAnimationFrame>>();

  constructor(
    private readonly js5: Js5Client,
    private readonly log: ((message: string) => void) | null = null,
  ) {}

  loadSequence(id: number): Promise<DecodedSequenceDefinition | null> {
    if (!Number.isInteger(id) || id < 0 || id === 0xffff) {
      return Promise.resolve(null);
    }
    const cached = this.sequencePromises.get(id);
    if (cached) return cached;

    const promise = this.loadSequenceUncached(id);
    this.sequencePromises.set(id, promise);
    return promise;
  }

  loadFrame(packedId: number): Promise<DecodedAnimationFrame> {
    if (!Number.isInteger(packedId) || packedId < 0) {
      return Promise.reject(
        new RangeError('Animation frame id must be a non-negative integer.'),
      );
    }
    const cached = this.framePromises.get(packedId);
    if (cached) return cached;

    const promise = this.loadFrameUncached(packedId);
    this.framePromises.set(packedId, promise);
    return promise;
  }

  private async loadSequenceUncached(
    id: number,
  ): Promise<DecodedSequenceDefinition | null> {
    const files = await this.getSequenceFiles();
    const data = files.get(id);
    if (!data) {
      this.log?.('Sequence ' + id + ' is missing from config 2:12.');
      return null;
    }
    return decodeSequenceDefinition(id, data);
  }

  private async loadFrameUncached(
    packedId: number,
  ): Promise<DecodedAnimationFrame> {
    const frameGroup = Math.floor(packedId / 0x10000);
    const frameFile = packedId & 0xffff;
    const group = await this.js5.downloadGroup(
      ANIMATIONS_ARCHIVE,
      frameGroup,
    );
    const data = group.files.get(frameFile);
    if (!data) {
      throw new Error(
        'Animation frame ' + frameGroup + ':' + frameFile +
          ' is missing from archive 0.',
      );
    }
    if (data.length < 3) {
      throw new RangeError(
        'Animation frame ' + frameGroup + ':' + frameFile +
          ' is too short.',
      );
    }

    const skeletonId = (data[0]! << 8) | data[1]!;
    const skeleton = await this.loadSkeleton(skeletonId);
    return decodeAnimationFrame(packedId, data, skeleton);
  }

  private loadSkeleton(id: number): Promise<DecodedSkeletonDefinition> {
    const cached = this.skeletonPromises.get(id);
    if (cached) return cached;

    const promise = this.loadSkeletonUncached(id);
    this.skeletonPromises.set(id, promise);
    return promise;
  }

  private async loadSkeletonUncached(
    id: number,
  ): Promise<DecodedSkeletonDefinition> {
    const group = await this.js5.downloadGroup(SKELETONS_ARCHIVE, id);
    const data = firstFile(group);
    if (!data) {
      throw new Error('Skeleton ' + id + ' has no files in archive 1.');
    }
    return decodeSkeletonDefinition(id, data);
  }

  private async getSequenceFiles(): Promise<
    ReadonlyMap<number, Uint8Array>
  > {
    if (!this.sequenceFilesPromise) {
      this.sequenceFilesPromise = this.js5
        .downloadGroup(CONFIG_ARCHIVE, SEQUENCE_GROUP)
        .then((group) => group.files);
    }
    return this.sequenceFilesPromise;
  }
}

export function decodeSequenceDefinition(
  id: number,
  data: Uint8Array,
): DecodedSequenceDefinition {
  const reader = new AnimationReader(data);
  let frameIds: number[] = [];
  let frameLengths: number[] = [];
  let frameStep = -1;
  let animMayaId = -1;

  while (true) {
    const opcode = reader.u8();
    if (opcode === 0) break;

    if (opcode === 1) {
      const count = reader.u16();
      frameLengths = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        frameLengths[i] = reader.u16();
      }

      const lows = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        lows[i] = reader.u16();
      }

      frameIds = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        frameIds[i] = reader.u16() * 0x10000 + lows[i]!;
      }
      continue;
    }

    if (opcode === 2) {
      frameStep = reader.u16();
      continue;
    }
    if (opcode === 3) {
      reader.skip(reader.u8());
      continue;
    }
    if (opcode === 4) continue;
    if (opcode === 5) {
      reader.skip(1);
      continue;
    }
    if (opcode === 6 || opcode === 7) {
      reader.skip(2);
      continue;
    }
    if (
      opcode === 8 ||
      opcode === 9 ||
      opcode === 10 ||
      opcode === 11
    ) {
      reader.skip(1);
      continue;
    }
    if (opcode === 12) {
      const count = reader.u8();
      reader.skip(count * 4);
      continue;
    }
    if (opcode === 13) {
      animMayaId = reader.u32();
      continue;
    }
    if (opcode === 14) {
      const count = reader.u16();
      reader.skip(count * 8);
      continue;
    }
    if (opcode === 15) {
      reader.skip(4);
      continue;
    }
    if (opcode === 16) {
      reader.skip(1);
      continue;
    }
    if (opcode === 17) {
      reader.skip(reader.u8());
      continue;
    }
    if (opcode === 18) {
      reader.string();
      continue;
    }
    if (opcode === 19) continue;

    throw new RangeError(
      'Unsupported rev-240 sequence opcode ' + opcode +
        ' in sequence ' + id + '.',
    );
  }

  return { id, frameIds, frameLengths, frameStep, animMayaId };
}

export function decodeSkeletonDefinition(
  id: number,
  data: Uint8Array,
): DecodedSkeletonDefinition {
  const reader = new AnimationReader(data);
  const count = reader.u8();
  const transformTypes = new Uint8Array(count);
  const labelCounts = new Uint8Array(count);

  for (let i = 0; i < count; i += 1) {
    transformTypes[i] = reader.u8();
  }
  for (let i = 0; i < count; i += 1) {
    labelCounts[i] = reader.u8();
  }

  const labels: Uint8Array[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const values = new Uint8Array(labelCounts[i]!);
    for (let j = 0; j < values.length; j += 1) {
      values[j] = reader.u8();
    }
    labels[i] = values;
  }

  return { id, transformTypes, labels };
}

export function decodeAnimationFrame(
  packedId: number,
  data: Uint8Array,
  skeleton: DecodedSkeletonDefinition,
): DecodedAnimationFrame {
  if (data.length < 3) {
    throw new RangeError('Animation frame ' + packedId + ' is too short.');
  }

  const flags = new AnimationReader(data);
  const skeletonId = flags.u16();
  if (skeletonId !== skeleton.id) {
    throw new Error(
      'Animation frame ' + packedId + ' references skeleton ' +
        skeletonId + ' but ' + skeleton.id + ' was supplied.',
    );
  }

  const length = flags.u8();
  if (length > skeleton.transformTypes.length) {
    throw new RangeError(
      'Animation frame ' + packedId + ' has ' + length +
        ' transforms for a ' + skeleton.transformTypes.length +
        '-entry skeleton.',
    );
  }

  const values = new AnimationReader(data, 3 + length);
  const indices: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  let lastIndex = -1;

  for (let i = 0; i < length; i += 1) {
    const mask = flags.u8();
    if (mask === 0) continue;

    if (skeleton.transformTypes[i] !== 0) {
      for (let previous = i - 1; previous > lastIndex; previous -= 1) {
        if (skeleton.transformTypes[previous] === 0) {
          indices.push(previous);
          xs.push(0);
          ys.push(0);
          zs.push(0);
          break;
        }
      }
    }

    const fallback = skeleton.transformTypes[i] === 3 ? 128 : 0;
    indices.push(i);
    xs.push((mask & 1) !== 0 ? values.shortSmart() : fallback);
    ys.push((mask & 2) !== 0 ? values.shortSmart() : fallback);
    zs.push((mask & 4) !== 0 ? values.shortSmart() : fallback);
    lastIndex = i;
  }

  if (values.offset !== data.length) {
    throw new RangeError(
      'Animation frame ' + packedId + ' left ' +
        (data.length - values.offset) + ' trailing byte(s).',
    );
  }

  return {
    packedId,
    skeleton,
    transformSkeletonLabels: Int16Array.from(indices),
    transformXs: Int16Array.from(xs),
    transformYs: Int16Array.from(ys),
    transformZs: Int16Array.from(zs),
  };
}

function firstFile(group: Js5DownloadedGroup): Uint8Array | undefined {
  return group.files.get(0) ?? group.files.values().next().value;
}

class AnimationReader {
  offset: number;

  constructor(
    private readonly data: Uint8Array,
    offset = 0,
  ) {
    this.offset = offset;
  }

  u8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  u16(): number {
    return (this.u8() << 8) | this.u8();
  }

  u32(): number {
    return (
      this.u8() * 0x1000000 +
      (this.u8() << 16) +
      (this.u8() << 8) +
      this.u8()
    ) >>> 0;
  }

  shortSmart(): number {
    this.require(1);
    return this.data[this.offset]! < 128
      ? this.u8() - 64
      : this.u16() - 49152;
  }

  string(): string {
    const start = this.offset;
    while (true) {
      this.require(1);
      if (this.data[this.offset++] === 0) break;
    }
    return new TextDecoder('windows-1252').decode(
      this.data.subarray(start, this.offset - 1),
    );
  }

  skip(length: number): void {
    this.require(length);
    this.offset += length;
  }

  private require(length: number): void {
    if (length < 0 || this.offset + length > this.data.length) {
      throw new RangeError('Animation cache payload ended unexpectedly.');
    }
  }
}
