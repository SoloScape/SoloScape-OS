export const PROOF_OF_WORK_REPLY = 19;
export const SHA256_CHALLENGE_TYPE = 0;
export const SHA256_CHALLENGE_VERSION = 1;

const MAX_U64 = 0xffff_ffff_ffff_ffffn;
const SHA256_BLOCK_SIZE = 64;
const SHA256_LENGTH_BYTES = 8;
const DEFAULT_YIELD_EVERY = 2048;

const SHA256_INITIAL_STATE = new Uint32Array([
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
]);

const SHA256_ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export interface ProofOfWorkChallenge {
  type: number;
  version: number;
  difficulty: number;
  salt: string;
}

export interface ProofOfWorkSolveOptions {
  signal?: AbortSignal;
  yieldEvery?: number;
}

interface PreparedSha256Prefix {
  state: Uint32Array;
  remainder: Uint8Array;
  byteLength: number;
}

export function decodeProofOfWorkChallenge(
  payload: Uint8Array,
): ProofOfWorkChallenge {
  if (payload.length < 4) {
    throw new Error('Proof-of-work challenge payload is truncated.');
  }

  const type = payload[0];
  const version = payload[1];
  const difficulty = payload[2];

  if (type !== SHA256_CHALLENGE_TYPE) {
    throw new Error('Unsupported proof-of-work challenge type ' + type + '.');
  }
  if (version !== SHA256_CHALLENGE_VERSION) {
    throw new Error('Unsupported SHA-256 proof-of-work version ' + version + '.');
  }
  if (difficulty > 256) {
    throw new Error('Invalid SHA-256 proof-of-work difficulty ' + difficulty + '.');
  }

  let terminator = -1;
  for (let i = 3; i < payload.length; i += 1) {
    if (payload[i] === 0) {
      terminator = i;
      break;
    }
  }
  if (terminator === -1) {
    throw new Error('Proof-of-work salt is missing its NUL terminator.');
  }
  if (terminator !== payload.length - 1) {
    throw new Error('Proof-of-work challenge contains trailing bytes.');
  }

  let salt: string;
  try {
    salt = new TextDecoder('utf-8', { fatal: true }).decode(
      payload.subarray(3, terminator),
    );
  } catch {
    throw new Error('Proof-of-work salt is not valid UTF-8.');
  }

  return { type, version, difficulty, salt };
}

export function encodeProofOfWorkReply(result: bigint): Uint8Array {
  if (result < 0n || result > MAX_U64) {
    throw new RangeError('Proof-of-work result is outside the u64 range.');
  }

  const packet = new Uint8Array(11);
  packet[0] = PROOF_OF_WORK_REPLY;
  packet[1] = 0;
  packet[2] = 8;

  let value = result;
  for (let i = 10; i >= 3; i -= 1) {
    packet[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return packet;
}

/**
 * Solves the rev-240 SHA-256 hashcash challenge.
 *
 * RSProt verifies SHA-256(hex(version) + hex(difficulty) + salt + hex(result))
 * and requires at least `difficulty` leading zero bits. The challenge prefix is
 * roughly 1 KB, so this implementation hashes all complete constant prefix blocks
 * once and only recomputes the final one or two blocks for each candidate.
 */
export async function solveProofOfWork(
  challenge: ProofOfWorkChallenge,
  options: ProofOfWorkSolveOptions = {},
): Promise<bigint> {
  if (challenge.type !== SHA256_CHALLENGE_TYPE) {
    throw new Error(
      'Unsupported proof-of-work challenge type ' + challenge.type + '.',
    );
  }
  if (challenge.version !== SHA256_CHALLENGE_VERSION) {
    throw new Error(
      'Unsupported SHA-256 proof-of-work version ' + challenge.version + '.',
    );
  }
  if (
    !Number.isInteger(challenge.difficulty) ||
    challenge.difficulty < 0 ||
    challenge.difficulty > 256
  ) {
    throw new RangeError(
      'Invalid SHA-256 proof-of-work difficulty ' + challenge.difficulty + '.',
    );
  }

  const yieldEvery = options.yieldEvery ?? DEFAULT_YIELD_EVERY;
  if (!Number.isInteger(yieldEvery) || yieldEvery < 1) {
    throw new RangeError('Proof-of-work yieldEvery must be a positive integer.');
  }

  const baseString =
    challenge.version.toString(16) +
    challenge.difficulty.toString(16) +
    challenge.salt;
  const prepared = prepareSha256Prefix(baseString);
  const scratch = new Uint8Array(SHA256_BLOCK_SIZE * 2);
  const state = new Uint32Array(8);
  const schedule = new Uint32Array(64);

  for (let result = 0n; result <= MAX_U64; result += 1n) {
    if (options.signal?.aborted) {
      throw new DOMException('Proof-of-work solving was aborted.', 'AbortError');
    }

    if (
      hashSuffixMeetsDifficulty(
        prepared,
        result.toString(16),
        challenge.difficulty,
        scratch,
        state,
        schedule,
      )
    ) {
      return result;
    }

    if (result !== 0n && result % BigInt(yieldEvery) === 0n) {
      await yieldToEventLoop();
    }
  }

  throw new Error('Proof-of-work search exhausted the u64 result space.');
}

function prepareSha256Prefix(baseString: string): PreparedSha256Prefix {
  const bytes = new TextEncoder().encode(baseString);
  const fullLength =
    Math.floor(bytes.length / SHA256_BLOCK_SIZE) * SHA256_BLOCK_SIZE;
  const state = SHA256_INITIAL_STATE.slice();
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < fullLength; offset += SHA256_BLOCK_SIZE) {
    compressSha256Block(state, bytes, offset, schedule);
  }

  return {
    state,
    remainder: bytes.slice(fullLength),
    byteLength: bytes.length,
  };
}

function hashSuffixMeetsDifficulty(
  prepared: PreparedSha256Prefix,
  suffixHex: string,
  difficulty: number,
  scratch: Uint8Array,
  state: Uint32Array,
  schedule: Uint32Array,
): boolean {
  const messageRemainderLength =
    prepared.remainder.length + suffixHex.length;
  const blockCount =
    messageRemainderLength + 1 + SHA256_LENGTH_BYTES <= SHA256_BLOCK_SIZE
      ? 1
      : 2;
  const scratchLength = blockCount * SHA256_BLOCK_SIZE;

  scratch.fill(0, 0, scratchLength);
  scratch.set(prepared.remainder, 0);
  for (let i = 0; i < suffixHex.length; i += 1) {
    scratch[prepared.remainder.length + i] = suffixHex.charCodeAt(i);
  }
  scratch[messageRemainderLength] = 0x80;

  const totalBitLength =
    (prepared.byteLength + suffixHex.length) * 8;
  const lengthOffset = scratchLength - SHA256_LENGTH_BYTES;
  const high = Math.floor(totalBitLength / 0x1_0000_0000);
  const low = totalBitLength >>> 0;

  scratch[lengthOffset] = (high >>> 24) & 0xff;
  scratch[lengthOffset + 1] = (high >>> 16) & 0xff;
  scratch[lengthOffset + 2] = (high >>> 8) & 0xff;
  scratch[lengthOffset + 3] = high & 0xff;
  scratch[lengthOffset + 4] = (low >>> 24) & 0xff;
  scratch[lengthOffset + 5] = (low >>> 16) & 0xff;
  scratch[lengthOffset + 6] = (low >>> 8) & 0xff;
  scratch[lengthOffset + 7] = low & 0xff;

  state.set(prepared.state);
  compressSha256Block(state, scratch, 0, schedule);
  if (blockCount === 2) {
    compressSha256Block(state, scratch, SHA256_BLOCK_SIZE, schedule);
  }

  let leadingZeroBits = 0;
  for (let i = 0; i < state.length; i += 1) {
    const zeros = Math.clz32(state[i]);
    leadingZeroBits += zeros;
    if (zeros !== 32) {
      break;
    }
  }
  return leadingZeroBits >= difficulty;
}

function compressSha256Block(
  state: Uint32Array,
  bytes: Uint8Array,
  offset: number,
  schedule: Uint32Array,
): void {
  for (let i = 0; i < 16; i += 1) {
    const index = offset + i * 4;
    schedule[i] = (
      (bytes[index] << 24) |
      (bytes[index + 1] << 16) |
      (bytes[index + 2] << 8) |
      bytes[index + 3]
    ) >>> 0;
  }

  for (let i = 16; i < 64; i += 1) {
    const x = schedule[i - 15];
    const y = schedule[i - 2];
    const sigma0 =
      rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
    const sigma1 =
      rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
    schedule[i] = (
      schedule[i - 16] +
      sigma0 +
      schedule[i - 7] +
      sigma1
    ) >>> 0;
  }

  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];
  let e = state[4];
  let f = state[5];
  let g = state[6];
  let h = state[7];

  for (let i = 0; i < 64; i += 1) {
    const bigSigma1 =
      rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
    const choose = (e & f) ^ (~e & g);
    const temp1 = (
      h +
      bigSigma1 +
      choose +
      SHA256_ROUND_CONSTANTS[i] +
      schedule[i]
    ) >>> 0;
    const bigSigma0 =
      rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (bigSigma0 + majority) >>> 0;

    h = g;
    g = f;
    f = e;
    e = (d + temp1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) >>> 0;
  }

  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0;
  state[5] = (state[5] + f) >>> 0;
  state[6] = (state[6] + g) >>> 0;
  state[7] = (state[7] + h) >>> 0;
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
