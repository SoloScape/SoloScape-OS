export const JS5_COMPRESSION_NONE = 0;
export const JS5_COMPRESSION_BZIP2 = 1;
export const JS5_COMPRESSION_GZIP = 2;

export interface DecodedJs5Container {
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  data: Uint8Array;
}

const DEFAULT_MAX_CONTAINER_BYTES = 64 * 1024 * 1024;

/**
 * Decode a reconstructed JS5 cache container.
 *
 * Wire/container layout:
 *
 *   compression:      u8
 *   compressedSize:   u32
 *   uncompressedSize: u32   (only when compression != 0)
 *   payload
 *
 * Compression type 0 stores payload bytes directly.
 * Compression type 2 stores a gzip member.
 * Compression type 1 (bzip2) is intentionally rejected until implemented.
 */
export async function decodeJs5Container(
  container: Uint8Array,
  maxOutputBytes = DEFAULT_MAX_CONTAINER_BYTES,
): Promise<DecodedJs5Container> {
  if (container.byteLength < 5) {
    throw new Error(
      'JS5 container is too short: ' + container.byteLength + ' bytes.',
    );
  }

  if (
    !Number.isInteger(maxOutputBytes) ||
    maxOutputBytes < 1
  ) {
    throw new RangeError('maxOutputBytes must be a positive integer.');
  }

  const view = new DataView(
    container.buffer,
    container.byteOffset,
    container.byteLength,
  );

  const compression = view.getUint8(0);
  const compressedSize = view.getUint32(1, false);

  if (compression === JS5_COMPRESSION_NONE) {
    const expectedLength = 5 + compressedSize;
    assertExactLength(container.byteLength, expectedLength, compression);

    if (compressedSize > maxOutputBytes) {
      throw new RangeError(
        'JS5 uncompressed container exceeds maximum output size: ' +
        compressedSize + ' > ' + maxOutputBytes + '.',
      );
    }

    return {
      compression,
      compressedSize,
      uncompressedSize: compressedSize,
      data: container.slice(5),
    };
  }

  if (container.byteLength < 9) {
    throw new Error(
      'Compressed JS5 container is too short: ' +
      container.byteLength + ' bytes.',
    );
  }

  const uncompressedSize = view.getUint32(5, false);
  const expectedLength = 9 + compressedSize;
  assertExactLength(container.byteLength, expectedLength, compression);

  if (uncompressedSize > maxOutputBytes) {
    throw new RangeError(
      'JS5 decompressed container exceeds maximum output size: ' +
      uncompressedSize + ' > ' + maxOutputBytes + '.',
    );
  }

  const compressedPayload = container.subarray(9);

  if (compression === JS5_COMPRESSION_BZIP2) {
    throw new Error(
      'JS5 bzip2 containers are not supported yet (compression=1).',
    );
  }

  if (compression !== JS5_COMPRESSION_GZIP) {
    throw new Error(
      'Unsupported JS5 compression type ' + compression + '.',
    );
  }

  const data = await decompressGzip(compressedPayload);

  if (data.byteLength !== uncompressedSize) {
    throw new Error(
      'JS5 gzip length mismatch: header declares ' +
      uncompressedSize + ' bytes, decoded ' + data.byteLength + '.',
    );
  }

  return {
    compression,
    compressedSize,
    uncompressedSize,
    data,
  };
}

function assertExactLength(
  actual: number,
  expected: number,
  compression: number,
): void {
  if (actual !== expected) {
    throw new Error(
      'JS5 container length mismatch for compression=' + compression +
      ': expected ' + expected + ' bytes, got ' + actual + '.',
    );
  }
}

async function decompressGzip(
  compressed: Uint8Array,
): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This browser does not provide DecompressionStream for gzip.',
    );
  }

  const input = compressed.slice().buffer as ArrayBuffer;
  const stream = new Blob([input])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}
