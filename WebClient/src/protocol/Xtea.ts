const XTEA_DELTA = 0x9e3779b9 >>> 0;
const XTEA_ROUNDS = 32;
const XTEA_BLOCK_SIZE = 8;

/**
 * Encrypts full 8-byte blocks with XTEA and leaves any trailing partial block
 * untouched, matching rsprot's ByteBuf XTEA helpers.
 */
export function xteaEncrypt(
  input: Uint8Array,
  key: readonly number[],
): Uint8Array {
  if (key.length !== 4) {
    throw new RangeError('XTEA key must contain exactly four integers.');
  }

  const output = input.slice();
  const view = new DataView(
    output.buffer,
    output.byteOffset,
    output.byteLength,
  );
  const blockEnd = output.length - (output.length % XTEA_BLOCK_SIZE);

  for (let offset = 0; offset < blockEnd; offset += XTEA_BLOCK_SIZE) {
    let v0 = view.getUint32(offset, false);
    let v1 = view.getUint32(offset + 4, false);
    let sum = 0;

    for (let round = 0; round < XTEA_ROUNDS; round += 1) {
      v0 = (
        v0 +
        (((((v1 << 4) ^ (v1 >>> 5)) + v1) >>> 0) ^
          ((sum + (key[sum & 3] >>> 0)) >>> 0))
      ) >>> 0;
      sum = (sum + XTEA_DELTA) >>> 0;
      v1 = (
        v1 +
        (((((v0 << 4) ^ (v0 >>> 5)) + v0) >>> 0) ^
          ((sum + (key[(sum >>> 11) & 3] >>> 0)) >>> 0))
      ) >>> 0;
    }

    view.setUint32(offset, v0, false);
    view.setUint32(offset + 4, v1, false);
  }

  return output;
}

export function xteaDecrypt(
  input: Uint8Array,
  key: readonly number[],
): Uint8Array {
  if (key.length !== 4) {
    throw new RangeError('XTEA key must contain exactly four integers.');
  }

  const output = input.slice();
  const view = new DataView(
    output.buffer,
    output.byteOffset,
    output.byteLength,
  );
  const blockEnd = output.length - (output.length % XTEA_BLOCK_SIZE);

  for (let offset = 0; offset < blockEnd; offset += XTEA_BLOCK_SIZE) {
    let v0 = view.getUint32(offset, false);
    let v1 = view.getUint32(offset + 4, false);
    let sum = Math.imul(XTEA_DELTA, XTEA_ROUNDS) >>> 0;

    for (let round = 0; round < XTEA_ROUNDS; round += 1) {
      v1 = (
        v1 -
        (((((v0 << 4) ^ (v0 >>> 5)) + v0) >>> 0) ^
          ((sum + (key[(sum >>> 11) & 3] >>> 0)) >>> 0))
      ) >>> 0;
      sum = (sum - XTEA_DELTA) >>> 0;
      v0 = (
        v0 -
        (((((v1 << 4) ^ (v1 >>> 5)) + v1) >>> 0) ^
          ((sum + (key[sum & 3] >>> 0)) >>> 0))
      ) >>> 0;
    }

    view.setUint32(offset, v0, false);
    view.setUint32(offset + 4, v1, false);
  }

  return output;
}
