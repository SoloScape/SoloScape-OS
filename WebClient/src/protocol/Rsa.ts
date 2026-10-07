function normalizeHex(value: string, label: string): string {
  const normalized = value
    .trim()
    .replace(/^0x/i, '')
    .replace(/\s+/g, '');

  if (!normalized || !/^[0-9a-f]+$/i.test(normalized)) {
    throw new Error(label + ' must be a hexadecimal integer.');
  }

  return normalized;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

function positiveBigIntToJavaBytes(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new RangeError('RSA output must be non-negative.');
  }
  if (value === 0n) {
    return new Uint8Array([0]);
  }

  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  // java.math.BigInteger.toByteArray() prefixes positive values whose top bit
  // is set so the receiver's BigInteger(bytes) does not interpret them as negative.
  if ((bytes[0] & 0x80) === 0) {
    return bytes;
  }

  const prefixed = new Uint8Array(bytes.length + 1);
  prefixed.set(bytes, 1);
  return prefixed;
}

export function modPow(
  base: bigint,
  exponent: bigint,
  modulus: bigint,
): bigint {
  if (modulus <= 0n) {
    throw new RangeError('RSA modulus must be positive.');
  }
  if (exponent < 0n) {
    throw new RangeError('RSA exponent must be non-negative.');
  }

  let result = 1n;
  let factor = base % modulus;
  let power = exponent;

  while (power > 0n) {
    if ((power & 1n) !== 0n) {
      result = (result * factor) % modulus;
    }
    power >>= 1n;
    if (power !== 0n) {
      factor = (factor * factor) % modulus;
    }
  }

  return result;
}

/** Textbook RSA used by the OSRS login block. */
export function rsaEncrypt(
  plaintext: Uint8Array,
  modulusHex: string,
  exponentHex = '10001',
): Uint8Array {
  if (plaintext.length === 0) {
    throw new Error('RSA plaintext cannot be empty.');
  }

  const modulus = BigInt('0x' + normalizeHex(modulusHex, 'RSA modulus'));
  const exponent = BigInt('0x' + normalizeHex(exponentHex, 'RSA exponent'));
  const base = bytesToBigInt(plaintext);

  if (base >= modulus) {
    throw new Error(
      'RSA login block is too large for the configured modulus.',
    );
  }

  return positiveBigIntToJavaBytes(modPow(base, exponent, modulus));
}
