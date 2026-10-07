import { IsaacRandom } from './IsaacRandom';

/**
 * Revision 240 client-protocol id from rsprot:
 * GameClientProtId.MOVE_GAMECLICK = 102.
 */
export const MOVE_GAMECLICK_OPCODE = 102;
export const MOVE_GAMECLICK_PAYLOAD_SIZE = 5;

/**
 * Encodes rev-240 MOVE_GAMECLICK exactly as rsprot decodes it:
 *
 *   z              g2Alt3  <- p2Alt3
 *   keyCombination g1Alt2  <- p1Alt2
 *   x              g2Alt3  <- p2Alt3
 *
 * MOVE_GAMECLICK is VAR_BYTE, so the ISAAC-encrypted opcode is followed by a
 * one-byte payload length before the five-byte payload.
 */
export function encodeMoveGameClickPacket(
  x: number,
  z: number,
  keyCombination: number,
  isaac: IsaacRandom,
): Uint8Array {
  const checkedX = checkedU16(x, 'MOVE_GAMECLICK x');
  const checkedZ = checkedU16(z, 'MOVE_GAMECLICK z');
  const checkedKeys = checkedU8(
    keyCombination,
    'MOVE_GAMECLICK keyCombination',
  );

  const packet = new Uint8Array(
    2 + MOVE_GAMECLICK_PAYLOAD_SIZE,
  );
  packet[0] = (
    MOVE_GAMECLICK_OPCODE + isaac.nextInt()
  ) & 0xff;
  packet[1] = MOVE_GAMECLICK_PAYLOAD_SIZE;

  let offset = 2;
  offset = p2Alt3(packet, offset, checkedZ);
  packet[offset++] = (-checkedKeys) & 0xff;
  p2Alt3(packet, offset, checkedX);
  return packet;
}

function p2Alt3(
  target: Uint8Array,
  offset: number,
  value: number,
): number {
  target[offset++] = (value + 128) & 0xff;
  target[offset++] = (value >>> 8) & 0xff;
  return offset;
}

function checkedU16(value: number, label: string): number {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 0xffff
  ) {
    throw new RangeError(label + ' must fit an unsigned short.');
  }
  return value;
}

function checkedU8(value: number, label: string): number {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 0xff
  ) {
    throw new RangeError(label + ' must fit an unsigned byte.');
  }
  return value;
}
