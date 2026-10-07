import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOVE_GAMECLICK_OPCODE,
  encodeMoveGameClickPacket,
} from './GameClientPacketEncoder';
import { IsaacRandom } from './IsaacRandom';

test('encodes rev-240 MOVE_GAMECLICK opcode, length and transforms', () => {
  const seed = [1, 2, 3, 4];
  const encoderIsaac = new IsaacRandom(seed);
  const verifierIsaac = new IsaacRandom(seed);

  const packet = encodeMoveGameClickPacket(
    3201,
    3200,
    0,
    encoderIsaac,
  );

  assert.equal(
    (packet[0]! - verifierIsaac.nextInt()) & 0xff,
    MOVE_GAMECLICK_OPCODE,
  );
  assert.equal(packet[1], 5);

  // z=0x0c80 via p2Alt3 -> low+128, high
  assert.deepEqual(
    Array.from(packet.subarray(2)),
    [0x00, 0x0c, 0x00, 0x01, 0x0c],
  );
});

test('encodes control key combinations with p1Alt2', () => {
  const first = encodeMoveGameClickPacket(
    1,
    2,
    1,
    new IsaacRandom([10]),
  );
  const second = encodeMoveGameClickPacket(
    1,
    2,
    2,
    new IsaacRandom([10]),
  );

  assert.equal(first[4], 0xff);
  assert.equal(second[4], 0xfe);
});

test('rejects invalid movement coordinates', () => {
  assert.throws(
    () => encodeMoveGameClickPacket(
      -1,
      3200,
      0,
      new IsaacRandom(),
    ),
    /unsigned short/,
  );
});
