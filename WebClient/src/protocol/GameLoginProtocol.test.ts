import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOGIN_CRC_COUNT,
  decodeLoginSuccess,
  encodeDesktopLoginCrcs,
  encodeGameLoginPacket,
} from './GameLoginProtocol';
import { IsaacRandom } from './IsaacRandom';
import { xteaDecrypt, xteaEncrypt } from './Xtea';

test('ISAAC matches the rsprot/OpenRS2 zero-seed vector', () => {
  const isaac = new IsaacRandom([0, 0, 0, 0]);
  const actual = Array.from({ length: 8 }, () => isaac.nextInt() >>> 0);
  assert.deepEqual(actual, [
    0x182600f3,
    0x300b4a8d,
    0x301b6622,
    0xb08acd21,
    0x296fd679,
    0x995206e9,
    0xb3ffa8b5,
    0x0fc99c24,
  ]);
});

test('XTEA matches a deterministic rev-240 compatible vector', () => {
  const plaintext = Uint8Array.from({ length: 16 }, (_, index) => index);
  const encrypted = xteaEncrypt(plaintext, [1, 2, 3, 4]);
  assert.equal(
    Buffer.from(encrypted).toString('hex'),
    '8029908a95c4e2f6eafecee8ce9f4ed2',
  );
  assert.deepEqual(xteaDecrypt(encrypted, [1, 2, 3, 4]), plaintext);
});

test('desktop login CRC block contains exactly 23 transformed ints', () => {
  const values = Array.from(
    { length: LOGIN_CRC_COUNT },
    (_, index) => (0x10203040 + index * 0x01010101) >>> 0,
  );
  const encoded = encodeDesktopLoginCrcs(values);
  assert.equal(encoded.length, LOGIN_CRC_COUNT * 4);

  const value = values[20];
  assert.deepEqual(Array.from(encoded.subarray(0, 4)), [
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
    value & 0xff,
    (value >>> 8) & 0xff,
  ]);
});

test('game login packet echoes session id inside the RSA block', () => {
  const seed = [0x01020304, 0x11223344, 0x55667788, 0x10203040];
  const sessionId = 0x0123456789abcdefn;
  const crcValues = Array.from({ length: LOGIN_CRC_COUNT }, (_, index) => index);
  const modulus = 'f'.repeat(256);

  const encoded = encodeGameLoginPacket({
    revision: 240,
    username: 'test',
    password: 'password',
    sessionId,
    rsaModulusHex: modulus,
    rsaExponentHex: '1',
    crcValues,
    seed,
    uuid: new Uint8Array(24),
  });

  const packet = encoded.packet;
  assert.equal(packet[0], 16);
  const payloadLength = (packet[1] << 8) | packet[2];
  assert.equal(payloadLength, packet.length - 3);

  let offset = 3;
  assert.equal(readU32(packet, offset), 240); offset += 4;
  assert.equal(readU32(packet, offset), 2); offset += 4;
  assert.equal(readU32(packet, offset), 0); offset += 4;
  assert.equal(packet[offset++], 1);
  assert.equal(packet[offset++], 0);
  assert.equal(packet[offset++], 0);

  const rsaLength = (packet[offset] << 8) | packet[offset + 1];
  offset += 2;
  const rsa = packet.subarray(offset, offset + rsaLength);
  assert.equal(rsa[0], 1);
  const rsaOffset = 1 + 16;
  assert.equal(readU64(rsa, rsaOffset), sessionId);
});

test('login success decrypts the optional authenticator code with server ISAAC', () => {
  const clientSeed = [1, 2, 3, 4];
  const serverSeed = clientSeed.map((value) => value + 50);
  const encoderIsaac = new IsaacRandom(serverSeed);
  const authenticator = 0x89abcdef;
  const payload = new Uint8Array(34);
  let offset = 0;
  payload[offset++] = 1;

  for (const shift of [24, 16, 8, 0]) {
    payload[offset++] =
      (((authenticator >>> shift) & 0xff) + encoderIsaac.nextInt()) & 0xff;
  }
  payload[offset++] = 2;
  payload[offset++] = 1;
  payload[offset++] = 0x01;
  payload[offset++] = 0x23;
  payload[offset++] = 1;
  offset = writeU64(payload, offset, 11n);
  offset = writeU64(payload, offset, 22n);
  offset = writeU64(payload, offset, 33n);
  assert.equal(offset, payload.length);

  const decoded = decodeLoginSuccess(payload, new IsaacRandom(serverSeed));
  assert.equal(decoded.authenticatorCode, authenticator >>> 0);
  assert.equal(decoded.staffModLevel, 2);
  assert.equal(decoded.playerMod, true);
  assert.equal(decoded.localPlayerIndex, 0x0123);
  assert.equal(decoded.member, true);
  assert.equal(decoded.accountHash, 11n);
  assert.equal(decoded.userId, 22n);
  assert.equal(decoded.userHash, 33n);
});

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4,
  ).getUint32(0, false);
}

function readU64(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i += 1) {
    value = (value << 8n) | BigInt(bytes[offset + i]);
  }
  return value;
}

function writeU64(bytes: Uint8Array, offset: number, value: bigint): number {
  for (let shift = 56n; shift >= 0n; shift -= 8n) {
    bytes[offset++] = Number((value >> shift) & 0xffn);
  }
  return offset;
}
