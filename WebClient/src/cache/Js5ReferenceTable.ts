export const JS5_INDEX_PROTOCOL_ORIGINAL = 5;
export const JS5_INDEX_PROTOCOL_VERSIONED = 6;
export const JS5_INDEX_PROTOCOL_SMART = 7;

const FLAG_NAMES = 0x01;
const FLAG_DIGESTS = 0x02;
const FLAG_LENGTHS = 0x04;
const FLAG_UNCOMPRESSED_CHECKSUMS = 0x08;
const KNOWN_FLAGS =
  FLAG_NAMES |
  FLAG_DIGESTS |
  FLAG_LENGTHS |
  FLAG_UNCOMPRESSED_CHECKSUMS;

const WHIRLPOOL_DIGEST_BYTES = 64;
const MAX_ENTRY_COUNT = 1_000_000;
const MAX_ID = 0x7fffffff;

export type Js5IndexProtocol = 5 | 6 | 7;

export interface Js5ReferenceFile {
  id: number;
  nameHash: number | null;
}

export interface Js5ReferenceGroup {
  id: number;
  nameHash: number | null;
  checksum: number;
  uncompressedChecksum: number | null;
  digest: Uint8Array | null;
  length: number | null;
  uncompressedLength: number | null;
  version: number;
  files: Js5ReferenceFile[];
}

export interface Js5ReferenceTable {
  protocol: Js5IndexProtocol;
  version: number;
  flags: number;
  hasNames: boolean;
  hasDigests: boolean;
  hasLengths: boolean;
  hasUncompressedChecksums: boolean;
  groups: Js5ReferenceGroup[];
}

export function parseJs5ReferenceTable(
  payload: Uint8Array,
): Js5ReferenceTable {
  const reader = new Reader(payload);
  const protocol = reader.readU8();

  if (
    protocol !== JS5_INDEX_PROTOCOL_ORIGINAL &&
    protocol !== JS5_INDEX_PROTOCOL_VERSIONED &&
    protocol !== JS5_INDEX_PROTOCOL_SMART
  ) {
    throw new Error(
      'Unsupported JS5 reference-table protocol ' + protocol + '.',
    );
  }

  const version =
    protocol >= JS5_INDEX_PROTOCOL_VERSIONED
      ? reader.readU32()
      : 0;

  const flags = reader.readU8();
  const unknownFlags = flags & ~KNOWN_FLAGS;
  if (unknownFlags !== 0) {
    throw new Error(
      'Unsupported JS5 reference-table flags 0x' +
      unknownFlags.toString(16).padStart(2, '0') + '.',
    );
  }

  const hasNames = (flags & FLAG_NAMES) !== 0;
  const hasDigests = (flags & FLAG_DIGESTS) !== 0;
  const hasLengths = (flags & FLAG_LENGTHS) !== 0;
  const hasUncompressedChecksums =
    (flags & FLAG_UNCOMPRESSED_CHECKSUMS) !== 0;

  const readCountOrDelta = (): number =>
    protocol >= JS5_INDEX_PROTOCOL_SMART
      ? reader.readUnsignedIntSmart()
      : reader.readU16();

  const groupCount = readCountOrDelta();
  assertEntryCount(groupCount, 'group');

  const groups: Js5ReferenceGroup[] = [];
  let previousGroupId = 0;

  for (let index = 0; index < groupCount; index += 1) {
    const delta = readCountOrDelta();
    previousGroupId = addDelta(previousGroupId, delta, 'group id');

    groups.push({
      id: previousGroupId,
      nameHash: null,
      checksum: 0,
      uncompressedChecksum: null,
      digest: null,
      length: null,
      uncompressedLength: null,
      version: 0,
      files: [],
    });
  }

  if (hasNames) {
    for (const group of groups) {
      group.nameHash = reader.readI32();
    }
  }

  for (const group of groups) {
    group.checksum = reader.readU32();
  }

  if (hasUncompressedChecksums) {
    for (const group of groups) {
      group.uncompressedChecksum = reader.readU32();
    }
  }

  if (hasDigests) {
    for (const group of groups) {
      group.digest = reader.readBytes(WHIRLPOOL_DIGEST_BYTES);
    }
  }

  if (hasLengths) {
    for (const group of groups) {
      group.length = reader.readU32();
      group.uncompressedLength = reader.readU32();
    }
  }

  for (const group of groups) {
    group.version = reader.readU32();
  }

  const fileCounts: number[] = [];
  let totalFiles = 0;

  for (let index = 0; index < groupCount; index += 1) {
    const fileCount = readCountOrDelta();
    assertEntryCount(fileCount, 'file');
    totalFiles += fileCount;

    if (totalFiles > MAX_ENTRY_COUNT) {
      throw new Error(
        'JS5 reference table contains too many files: ' +
        totalFiles + '.',
      );
    }

    fileCounts.push(fileCount);
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]!;
    const fileCount = fileCounts[groupIndex]!;
    let previousFileId = 0;

    for (let index = 0; index < fileCount; index += 1) {
      const delta = readCountOrDelta();
      previousFileId = addDelta(previousFileId, delta, 'file id');

      group.files.push({
        id: previousFileId,
        nameHash: null,
      });
    }
  }

  if (hasNames) {
    for (const group of groups) {
      for (const file of group.files) {
        file.nameHash = reader.readI32();
      }
    }
  }

  if (reader.remaining !== 0) {
    throw new Error(
      'JS5 reference table has ' + reader.remaining +
      ' trailing byte' + (reader.remaining === 1 ? '' : 's') + '.',
    );
  }

  return {
    protocol,
    version,
    flags,
    hasNames,
    hasDigests,
    hasLengths,
    hasUncompressedChecksums,
    groups,
  };
}

export function cloneJs5ReferenceTable(
  table: Js5ReferenceTable,
): Js5ReferenceTable {
  return {
    ...table,
    groups: table.groups.map((group) => ({
      ...group,
      digest: group.digest?.slice() ?? null,
      files: group.files.map((file) => ({ ...file })),
    })),
  };
}

function assertEntryCount(value: number, label: string): void {
  if (value < 0 || value > MAX_ENTRY_COUNT) {
    throw new Error(
      'Invalid JS5 ' + label + ' count ' + value + '.',
    );
  }
}

function addDelta(
  previous: number,
  delta: number,
  label: string,
): number {
  const value = previous + delta;

  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_ID
  ) {
    throw new Error(
      'Invalid JS5 ' + label + ' delta; resulting id=' + value + '.',
    );
  }

  return value;
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

  readU32(): number {
    this.require(4);
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4,
    );
    const value = view.getUint32(0, false);
    this.offset += 4;
    return value;
  }

  readI32(): number {
    this.require(4);
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4,
    );
    const value = view.getInt32(0, false);
    this.offset += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    this.require(length);
    const value = this.bytes.slice(
      this.offset,
      this.offset + length,
    );
    this.offset += length;
    return value;
  }

  readUnsignedIntSmart(): number {
    this.require(1);
    const peek = this.bytes[this.offset]!;

    if ((peek & 0x80) === 0) {
      return this.readU16();
    }

    return this.readU32() & 0x7fffffff;
  }

  private require(length: number): void {
    if (
      length < 0 ||
      this.offset + length > this.bytes.length
    ) {
      throw new Error(
        'Unexpected end of JS5 reference table at byte ' +
        this.offset + '; need ' + length +
        ', have ' + this.remaining + '.',
      );
    }
  }
}
