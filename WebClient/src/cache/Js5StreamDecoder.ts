import { ByteQueue } from '../protocol/ByteQueue';
import {
  JS5_SUCCESS,
  type Js5GroupResponse,
} from './Js5Protocol';

export type Js5DecoderEvent =
  | { type: 'handshake'; code: number }
  | { type: 'group'; response: Js5GroupResponse };

type DecoderState = 'handshake' | 'header' | 'payload' | 'failed';

interface PendingGroup {
  archive: number;
  group: number;
  compression: number;
  size: number;
  container: Uint8Array;
  writeOffset: number;
  blockPayloadRemaining: number;
}

/**
 * Incremental decoder for the OSRS JS5 byte stream.
 *
 * WebSocket frames do not correspond to JS5 messages. This decoder deliberately
 * treats every incoming frame as an arbitrary chunk of one continuous TCP byte
 * stream and reconstructs cache containers across both WebSocket and JS5
 * 512-byte block boundaries.
 */
export class Js5StreamDecoder {
  private readonly queue = new ByteQueue();
  private state: DecoderState = 'handshake';
  private pending: PendingGroup | null = null;

  constructor(private readonly maxContainerBytes = 64 * 1024 * 1024) {}

  reset(): void {
    this.queue.clear();
    this.state = 'handshake';
    this.pending = null;
  }

  feed(chunk: Uint8Array): Js5DecoderEvent[] {
    if (this.state === 'failed') {
      throw new Error('JS5 decoder is in a failed state; reset it before reuse.');
    }

    this.queue.append(chunk);
    const events: Js5DecoderEvent[] = [];

    while (true) {
      if (this.state === 'handshake') {
        if (this.queue.available < 1) {
          return events;
        }

        const code = this.queue.readU8();
        events.push({ type: 'handshake', code });

        if (code !== JS5_SUCCESS) {
          this.state = 'failed';
          return events;
        }

        this.state = 'header';
        continue;
      }

      if (this.state === 'header') {
        if (this.queue.available < 8) {
          return events;
        }

        const archive = this.queue.readU8();
        const group = this.queue.readU16BE();
        const compression = this.queue.readU8();
        const size = this.queue.readU32BE();

        const containerLength = compression === 0 ? size + 5 : size + 9;
        if (
          containerLength < 5 ||
          containerLength > this.maxContainerBytes
        ) {
          this.state = 'failed';
          throw new RangeError(
            'Invalid JS5 container length ' + containerLength +
            ' for ' + archive + ':' + group + '.',
          );
        }

        const container = new Uint8Array(containerLength);
        const view = new DataView(container.buffer);
        container[0] = compression;
        view.setUint32(1, size, false);

        const remaining = containerLength - 5;
        this.pending = {
          archive,
          group,
          compression,
          size,
          container,
          writeOffset: 5,
          blockPayloadRemaining: Math.min(504, remaining),
        };
        this.state = 'payload';

        if (remaining === 0) {
          events.push({
            type: 'group',
            response: this.finishPending(),
          });
        }
        continue;
      }

      const pending = this.pending;
      if (this.state !== 'payload' || !pending) {
        throw new Error('JS5 decoder entered an invalid payload state.');
      }

      if (pending.blockPayloadRemaining > 0) {
        if (this.queue.available === 0) {
          return events;
        }

        const count = Math.min(
          this.queue.available,
          pending.blockPayloadRemaining,
        );
        pending.container.set(
          this.queue.readBytes(count),
          pending.writeOffset,
        );
        pending.writeOffset += count;
        pending.blockPayloadRemaining -= count;

        if (pending.writeOffset === pending.container.length) {
          events.push({
            type: 'group',
            response: this.finishPending(),
          });
          continue;
        }

        if (pending.blockPayloadRemaining > 0) {
          return events;
        }
      }

      if (this.queue.available < 1) {
        return events;
      }

      const delimiter = this.queue.readU8();
      if (delimiter !== 0xff) {
        this.state = 'failed';
        throw new Error(
          'Invalid JS5 block delimiter 0x' +
          delimiter.toString(16).padStart(2, '0') +
          ' for ' + pending.archive + ':' + pending.group + '.',
        );
      }

      const remaining = pending.container.length - pending.writeOffset;
      pending.blockPayloadRemaining = Math.min(511, remaining);
    }
  }

  private finishPending(): Js5GroupResponse {
    const pending = this.pending;
    if (!pending) {
      throw new Error('No JS5 group is pending.');
    }

    this.pending = null;
    this.state = 'header';

    return {
      archive: pending.archive,
      group: pending.group,
      compression: pending.compression,
      size: pending.size,
      container: pending.container,
    };
  }
}
