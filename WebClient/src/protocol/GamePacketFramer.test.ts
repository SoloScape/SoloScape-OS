import assert from 'node:assert/strict';
import test from 'node:test';
import { GamePacketFramer } from './GamePacketFramer';
import {
  VAR_BYTE,
  VAR_SHORT,
  getServerPacketSpec,
} from './GameServerPacketRegistry';
import { IsaacRandom } from './IsaacRandom';

const SEED = [51, 52, 53, 54];

test('rev-240 server packet table exposes fixed and variable lengths', () => {
  assert.equal(getServerPacketSpec(17).name, 'CAM_RESET');
  assert.equal(getServerPacketSpec(17).size, 0);
  assert.equal(getServerPacketSpec(73).size, VAR_BYTE);
  assert.equal(getServerPacketSpec(39).size, VAR_SHORT);
  assert.equal(getServerPacketSpec(151).name, 'CAM_MOVETO_V2');
  assert.throws(() => getServerPacketSpec(129), /Unknown rev-240/);
});

test('frames fixed, var-byte, var-short and two-byte smart opcodes', () => {
  const encoderIsaac = new IsaacRandom(SEED);
  const wire = concat(
    encodePacket(17, new Uint8Array(), encoderIsaac),
    encodePacket(73, Uint8Array.from([1, 2, 3]), encoderIsaac),
    encodePacket(39, Uint8Array.from({ length: 300 }, (_, i) => i), encoderIsaac),
    encodePacket(151, Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), encoderIsaac),
  );

  const framer = new GamePacketFramer(new IsaacRandom(SEED));
  const packets = framer.append(wire);

  assert.deepEqual(
    packets.map((packet) => [packet.opcode, packet.name, packet.payload.length]),
    [
      [17, 'CAM_RESET', 0],
      [73, 'MESSAGE_GAME', 3],
      [39, 'REBUILD_NORMAL_V2', 300],
      [151, 'CAM_MOVETO_V2', 8],
    ],
  );
  assert.deepEqual(Array.from(packets[1].payload), [1, 2, 3]);
  assert.equal(framer.bufferedBytes, 0);
});

test('preserves opcode and payload state across one-byte stream fragments', () => {
  const encoderIsaac = new IsaacRandom(SEED);
  const expectedPayload = Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]);
  const wire = concat(
    encodePacket(151, expectedPayload, encoderIsaac),
    encodePacket(73, Uint8Array.from([9, 10]), encoderIsaac),
  );

  const framer = new GamePacketFramer(new IsaacRandom(SEED));
  const packets = [];
  for (const byte of wire) {
    packets.push(...framer.append(Uint8Array.of(byte)));
  }

  assert.equal(packets.length, 2);
  assert.equal(packets[0].opcode, 151);
  assert.deepEqual(packets[0].payload, expectedPayload);
  assert.equal(packets[1].opcode, 73);
  assert.deepEqual(Array.from(packets[1].payload), [9, 10]);
  assert.equal(framer.bufferedBytes, 0);
});

function encodePacket(
  opcode: number,
  payload: Uint8Array,
  isaac: IsaacRandom,
): Uint8Array {
  const spec = getServerPacketSpec(opcode);
  if (spec.size >= 0 && payload.length !== spec.size) {
    throw new Error('Test payload length does not match fixed packet size.');
  }

  const header = encodeOpcode(opcode, isaac);
  if (spec.size === VAR_BYTE) {
    return concat(header, Uint8Array.of(payload.length), payload);
  }
  if (spec.size === VAR_SHORT) {
    return concat(
      header,
      Uint8Array.of((payload.length >>> 8) & 0xff, payload.length & 0xff),
      payload,
    );
  }
  return concat(header, payload);
}

function encodeOpcode(opcode: number, isaac: IsaacRandom): Uint8Array {
  if (opcode < 0x80) {
    return Uint8Array.of((opcode + isaac.nextInt()) & 0xff);
  }
  return Uint8Array.of(
    (((opcode >>> 8) | 0x80) + isaac.nextInt()) & 0xff,
    ((opcode & 0xff) + isaac.nextInt()) & 0xff,
  );
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
