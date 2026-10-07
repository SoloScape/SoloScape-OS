import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeJs5Handshake,
  getUncompressedJs5Payload,
} from './Js5Protocol';
import { Js5StreamDecoder } from './Js5StreamDecoder';

test('encodes the revision 240 JS5 init packet', () => {
  const packet = encodeJs5Handshake(
    240,
    [1, -2, 0x12345678, -1],
  );
  const view = new DataView(packet.buffer);

  assert.equal(packet.length, 21);
  assert.equal(packet[0], 15);
  assert.equal(view.getUint32(1, false), 240);
  assert.equal(view.getInt32(5, false), 1);
  assert.equal(view.getInt32(9, false), -2);
  assert.equal(view.getInt32(13, false), 0x12345678);
  assert.equal(view.getInt32(17, false), -1);
});

test('decodes a fragmented handshake and small JS5 group', () => {
  const decoder = new Js5StreamDecoder();
  const wire = buildWireResponse(255, 255, new Uint8Array([10, 20, 30]));

  let events = decoder.feed(new Uint8Array([0, ...wire.subarray(0, 3)]));
  assert.deepEqual(events, [{ type: 'handshake', code: 0 }]);

  events = decoder.feed(wire.subarray(3));
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, 'group');

  if (events[0]?.type !== 'group') {
    assert.fail('Expected a JS5 group event.');
  }

  const response = events[0].response;
  assert.equal(response.archive, 255);
  assert.equal(response.group, 255);
  assert.equal(response.compression, 0);
  assert.deepEqual(
    Array.from(getUncompressedJs5Payload(response) ?? []),
    [10, 20, 30],
  );
});

test('removes 0xff continuation delimiters across fragmented chunks', () => {
  const decoder = new Js5StreamDecoder();
  const payload = Uint8Array.from(
    { length: 600 },
    (_, index) => index & 0xff,
  );
  const wire = buildWireResponse(2, 7, payload);
  const input = new Uint8Array(1 + wire.length);
  input[0] = 0;
  input.set(wire, 1);

  const events = [];
  const cuts = [1, 17, 233, 509, input.length];
  let offset = 0;

  for (const end of cuts) {
    events.push(...decoder.feed(input.subarray(offset, end)));
    offset = end;
  }

  const groupEvents = events.filter((event) => event.type === 'group');
  assert.equal(groupEvents.length, 1);

  const event = groupEvents[0];
  if (event.type !== 'group') {
    assert.fail('Expected a JS5 group event.');
  }

  assert.equal(event.response.container.length, 605);
  assert.deepEqual(
    Array.from(getUncompressedJs5Payload(event.response) ?? []),
    Array.from(payload),
  );
});

function buildWireResponse(
  archive: number,
  group: number,
  payload: Uint8Array,
): Uint8Array {
  const header = new Uint8Array(8);
  const view = new DataView(header.buffer);
  header[0] = archive;
  view.setUint16(1, group, false);
  header[3] = 0;
  view.setUint32(4, payload.length, false);

  const chunks: Uint8Array[] = [header];
  let offset = 0;

  const first = Math.min(504, payload.length);
  chunks.push(payload.subarray(0, first));
  offset += first;

  while (offset < payload.length) {
    chunks.push(new Uint8Array([0xff]));
    const length = Math.min(511, payload.length - offset);
    chunks.push(payload.subarray(offset, offset + length));
    offset += length;
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const wire = new Uint8Array(total);
  let writeOffset = 0;

  for (const chunk of chunks) {
    wire.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return wire;
}
