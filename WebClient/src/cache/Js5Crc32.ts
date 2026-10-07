const CRC32_TABLE = buildCrc32Table();

/**
 * Standard IEEE CRC-32 used by JS5 cache containers.
 *
 * The returned number is unsigned so it can be compared directly with the
 * u32 values stored in the JS5 master/reference indices.
 */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value =
        (value & 1) !== 0
          ? (0xedb88320 ^ (value >>> 1)) >>> 0
          : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}
