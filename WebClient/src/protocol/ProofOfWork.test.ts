import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeProofOfWorkChallenge,
  encodeProofOfWorkReply,
  solveProofOfWork,
} from './ProofOfWork';

test('decodes the rev-240 SHA-256 proof-of-work challenge payload', () => {
  const salt = new TextEncoder().encode('abc123');
  const payload = new Uint8Array(3 + salt.length + 1);
  payload[0] = 0;
  payload[1] = 1;
  payload[2] = 18;
  payload.set(salt, 3);
  payload[payload.length - 1] = 0;

  assert.deepEqual(decodeProofOfWorkChallenge(payload), {
    type: 0,
    version: 1,
    difficulty: 18,
    salt: 'abc123',
  });
});

test('encodes proof-of-work reply as opcode 19 with an eight-byte VAR_SHORT payload', () => {
  assert.deepEqual(
    Array.from(encodeProofOfWorkReply(0x0102030405060708n)),
    [19, 0, 8, 1, 2, 3, 4, 5, 6, 7, 8],
  );
});

test('solves a deterministic RSProt-compatible SHA-256 proof-of-work vector', async () => {
  const result = await solveProofOfWork(
    {
      type: 0,
      version: 1,
      difficulty: 12,
      salt: 'test-salt',
    },
    { yieldEvery: 10_000 },
  );

  // SHA-256("1c" + "test-salt" + "188c") starts with 0005..., so
  // 0x188c is the first result with at least 12 leading zero bits.
  assert.equal(result, 0x188cn);
});
