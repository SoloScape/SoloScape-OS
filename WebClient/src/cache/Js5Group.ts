import type { Js5ReferenceGroup } from './Js5ReferenceTable';

export type Js5UnpackedFiles = ReadonlyMap<number, Uint8Array>;

/**
 * Split one decoded JS5 group payload into its reference-table files.
 *
 * This mirrors OpenRS2 Group.unpack(): a single-file group is the raw decoded
 * payload; multi-file groups end with a stripe count byte preceded by a
 * stripes * fileCount table of signed 32-bit length deltas.
 */
export function unpackJs5Group(
  payload: Uint8Array,
  group: Js5ReferenceGroup,
): Js5UnpackedFiles {
  const entries = group.files;

  if (entries.length < 1) {
    throw new Error(
      'JS5 group ' + group.id + ' has no files in its reference metadata.',
    );
  }

  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) {
    throw new Error(
      'JS5 group ' + group.id + ' contains duplicate file ids.',
    );
  }

  if (entries.length === 1) {
    return new Map([[entries[0]!.id, payload.slice()]]);
  }

  if (payload.length < 1) {
    throw new Error(
      'JS5 multi-file group ' + group.id + ' has an empty payload.',
    );
  }

  const stripeCount = payload[payload.length - 1]!;
  const tableLength = stripeCount * entries.length * 4;

  if (!Number.isSafeInteger(tableLength)) {
    throw new Error(
      'JS5 group ' + group.id + ' stripe table length overflow.',
    );
  }

  const trailerIndex = payload.length - tableLength - 1;
  if (trailerIndex < 0) {
    throw new Error(
      'JS5 group ' + group.id +
      ' stripe table extends before the start of the payload.',
    );
  }

  const reader = new Int32Reader(
    payload,
    trailerIndex,
    payload.length - 1,
  );
  const lengths = new Array<number>(entries.length).fill(0);

  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    let previousLength = 0;

    for (let fileIndex = 0; fileIndex < entries.length; fileIndex += 1) {
      previousLength = checkedAdd(
        previousLength,
        reader.readI32(),
        'stripe chunk length',
      );
      if (previousLength < 0) {
        throw new Error(
          'JS5 group ' + group.id + ' contains a negative stripe chunk length.',
        );
      }

      lengths[fileIndex] = checkedAdd(
        lengths[fileIndex]!,
        previousLength,
        'file length',
      );
    }
  }

  if (reader.offset !== payload.length - 1) {
    throw new Error(
      'JS5 group ' + group.id + ' did not consume its stripe table exactly.',
    );
  }

  const output = lengths.map((length) => new Uint8Array(length));
  const outputOffsets = new Array<number>(entries.length).fill(0);
  reader.reset(trailerIndex);

  let dataIndex = 0;

  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    let previousLength = 0;

    for (let fileIndex = 0; fileIndex < entries.length; fileIndex += 1) {
      previousLength = checkedAdd(
        previousLength,
        reader.readI32(),
        'stripe chunk length',
      );
      if (previousLength < 0) {
        throw new Error(
          'JS5 group ' + group.id + ' contains a negative stripe chunk length.',
        );
      }

      const dataEnd = checkedAdd(
        dataIndex,
        previousLength,
        'stripe data offset',
      );
      if (dataEnd > trailerIndex) {
        throw new Error(
          'JS5 group ' + group.id +
          ' stripe data overlaps its length table.',
        );
      }

      output[fileIndex]!.set(
        payload.subarray(dataIndex, dataEnd),
        outputOffsets[fileIndex]!,
      );
      outputOffsets[fileIndex] = checkedAdd(
        outputOffsets[fileIndex]!,
        previousLength,
        'file output offset',
      );
      dataIndex = dataEnd;
    }
  }

  if (dataIndex !== trailerIndex) {
    throw new Error(
      'JS5 group ' + group.id + ' has ' +
      (trailerIndex - dataIndex) +
      ' unassigned data byte(s) before its stripe table.',
    );
  }

  for (let index = 0; index < output.length; index += 1) {
    if (outputOffsets[index] !== lengths[index]) {
      throw new Error(
        'JS5 group ' + group.id +
        ' file ' + entries[index]!.id + ' unpack length mismatch.',
      );
    }
  }

  const files = new Map<number, Uint8Array>();
  for (let index = 0; index < entries.length; index += 1) {
    files.set(entries[index]!.id, output[index]!);
  }
  return files;
}

function checkedAdd(
  left: number,
  right: number,
  label: string,
): number {
  const value = left + right;
  if (!Number.isSafeInteger(value)) {
    throw new Error('JS5 ' + label + ' overflow.');
  }
  return value;
}

class Int32Reader {
  offset: number;

  constructor(
    private readonly bytes: Uint8Array,
    start: number,
    private readonly end: number,
  ) {
    this.offset = start;
  }

  reset(offset: number): void {
    this.offset = offset;
  }

  readI32(): number {
    if (this.offset + 4 > this.end) {
      throw new Error(
        'Unexpected end of JS5 group stripe table at byte ' + this.offset + '.',
      );
    }

    const value = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4,
    ).getInt32(0, false);
    this.offset += 4;
    return value;
  }
}
