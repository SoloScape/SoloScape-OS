export const JS5_INIT_OPCODE = 15;
export const JS5_SUCCESS = 0;
export const JS5_MASTER_ARCHIVE = 0xff;
export const JS5_MASTER_GROUP = 0xff;

export type Js5HandshakeKey = readonly [number, number, number, number];

export const ZERO_JS5_HANDSHAKE_KEY: Js5HandshakeKey = [0, 0, 0, 0];

export interface Js5GroupResponse {
  archive: number;
  group: number;
  compression: number;
  size: number;
  /**
   * Reconstructed cache container.
   *
   * Layout:
   *   compression: u8
   *   compressedSize: u32
   *   [uncompressedSize: u32 when compression != 0]
   *   payload
   *
   * JS5's 0xff continuation delimiters are removed.
   */
  container: Uint8Array;
}

export function encodeJs5Handshake(
  revision: number,
  key: Js5HandshakeKey = ZERO_JS5_HANDSHAKE_KEY,
): Uint8Array {
  assertUint32(revision, 'revision');

  const packet = new Uint8Array(21);
  const view = new DataView(packet.buffer);
  packet[0] = JS5_INIT_OPCODE;
  view.setUint32(1, revision, false);

  for (let index = 0; index < key.length; index += 1) {
    assertInt32(key[index], 'JS5 key word ' + index);
    view.setInt32(5 + index * 4, key[index], false);
  }

  return packet;
}

export function encodeJs5GroupRequest(
  archive: number,
  group: number,
  urgent = true,
): Uint8Array {
  assertUint8(archive, 'archive');
  assertUint16(group, 'group');

  const packet = new Uint8Array(4);
  const view = new DataView(packet.buffer);
  packet[0] = urgent ? 1 : 0;
  packet[1] = archive;
  view.setUint16(2, group, false);
  return packet;
}

export function getUncompressedJs5Payload(
  response: Js5GroupResponse,
): Uint8Array | null {
  if (response.compression !== 0) {
    return null;
  }

  return response.container.subarray(5, 5 + response.size);
}

export function js5GroupKey(archive: number, group: number): string {
  return archive + ':' + group;
}

function assertUint8(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(label + ' must be an unsigned byte.');
  }
}

function assertUint16(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(label + ' must be an unsigned short.');
  }
}

function assertUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(label + ' must be an unsigned 32-bit integer.');
  }
}

function assertInt32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new RangeError(label + ' must be a signed 32-bit integer.');
  }
}
