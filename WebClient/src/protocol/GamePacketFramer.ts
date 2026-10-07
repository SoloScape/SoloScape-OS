import { ByteQueue } from './ByteQueue';
import { IsaacRandom } from './IsaacRandom';
import {
  VAR_BYTE,
  VAR_SHORT,
  getServerPacketSpec,
  type ServerPacketSpec,
} from './GameServerPacketRegistry';

export interface ServerGamePacket {
  readonly opcode: number;
  readonly name: string;
  readonly payload: Uint8Array;
}

type DecodeState =
  | 'opcode-first'
  | 'opcode-second'
  | 'length'
  | 'payload';

/**
 * Splits the post-login server byte stream into revision-240 game packets.
 *
 * WebSocket frame boundaries are ignored. Opcode bytes are decoded using the
 * same ISAAC-encrypted smart-1-or-2 format used by rsprot's
 * OutgoingMessageEncoder.pSmart1Or2Enc().
 */
export class GamePacketFramer {
  private readonly queue = new ByteQueue();
  private state: DecodeState = 'opcode-first';
  private pendingOpcodeHigh = 0;
  private spec: ServerPacketSpec | null = null;
  private payloadLength = 0;

  constructor(private readonly serverIsaac: IsaacRandom) {}

  append(chunk: Uint8Array): ServerGamePacket[] {
    this.queue.append(chunk);
    const packets: ServerGamePacket[] = [];

    while (true) {
      switch (this.state) {
        case 'opcode-first': {
          if (this.queue.available < 1) {
            return packets;
          }
          const first = this.decodeOpcodeByte(this.queue.readU8());
          if (first < 0x80) {
            this.beginPacket(first);
            continue;
          }
          this.pendingOpcodeHigh = first & 0x7f;
          this.state = 'opcode-second';
          continue;
        }

        case 'opcode-second': {
          if (this.queue.available < 1) {
            return packets;
          }
          const second = this.decodeOpcodeByte(this.queue.readU8());
          const opcode = (this.pendingOpcodeHigh << 8) | second;
          this.beginPacket(opcode);
          continue;
        }

        case 'length': {
          if (!this.spec) {
            throw new Error('Packet spec missing while reading payload length.');
          }
          if (this.spec.size === VAR_BYTE) {
            if (this.queue.available < 1) {
              return packets;
            }
            this.payloadLength = this.queue.readU8();
          } else if (this.spec.size === VAR_SHORT) {
            if (this.queue.available < 2) {
              return packets;
            }
            this.payloadLength = this.queue.readU16BE();
            if (this.payloadLength > 40_000) {
              throw new RangeError(
                'Server packet ' + this.spec.name + ' (' + this.spec.opcode +
                ') declared oversized payload ' + this.payloadLength + '.',
              );
            }
          } else {
            throw new Error(
              'Invalid variable packet size marker ' + this.spec.size + '.',
            );
          }
          this.state = 'payload';
          continue;
        }

        case 'payload': {
          if (!this.spec) {
            throw new Error('Packet spec missing while reading payload.');
          }
          if (this.queue.available < this.payloadLength) {
            return packets;
          }
          packets.push({
            opcode: this.spec.opcode,
            name: this.spec.name,
            payload: this.queue.readBytes(this.payloadLength),
          });
          this.spec = null;
          this.payloadLength = 0;
          this.pendingOpcodeHigh = 0;
          this.state = 'opcode-first';
          continue;
        }
      }
    }
  }

  get bufferedBytes(): number {
    return this.queue.available;
  }

  private beginPacket(opcode: number): void {
    const spec = getServerPacketSpec(opcode);
    this.spec = spec;
    if (spec.size >= 0) {
      this.payloadLength = spec.size;
      this.state = 'payload';
    } else {
      this.payloadLength = 0;
      this.state = 'length';
    }
  }

  private decodeOpcodeByte(encoded: number): number {
    return (encoded - this.serverIsaac.nextInt()) & 0xff;
  }
}
