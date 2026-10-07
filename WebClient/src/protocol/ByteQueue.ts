/**
 * Stream-oriented byte queue.
 *
 * WebSocket message boundaries are transport boundaries, not OSRS packet
 * boundaries. Feed every binary message into this queue and only decode once
 * enough bytes for the current protocol state are available.
 */
export class ByteQueue {
  private buffer = new Uint8Array(0);
  private offset = 0;

  get available(): number {
    return this.buffer.length - this.offset;
  }

  append(chunk: Uint8Array): void {
    if (chunk.length === 0) {
      return;
    }

    const unread = this.buffer.subarray(this.offset);
    const merged = new Uint8Array(unread.length + chunk.length);
    merged.set(unread);
    merged.set(chunk, unread.length);
    this.buffer = merged;
    this.offset = 0;
  }

  peekU8(): number {
    this.require(1);
    return this.buffer[this.offset];
  }

  readU8(): number {
    this.require(1);
    return this.buffer[this.offset++];
  }

  readU16BE(): number {
    this.require(2);
    const value =
      (this.buffer[this.offset] << 8) |
      this.buffer[this.offset + 1];
    this.offset += 2;
    return value;
  }

  readU32BE(): number {
    this.require(4);
    const value =
      ((this.buffer[this.offset] << 24) >>> 0) |
      (this.buffer[this.offset + 1] << 16) |
      (this.buffer[this.offset + 2] << 8) |
      this.buffer[this.offset + 3];
    this.offset += 4;
    return value >>> 0;
  }

  readBytes(length: number): Uint8Array {
    this.require(length);
    const value = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  clear(): void {
    this.buffer = new Uint8Array(0);
    this.offset = 0;
  }

  private require(length: number): void {
    if (length < 0 || this.available < length) {
      throw new RangeError(
        'ByteQueue underflow: need ' + length + ', have ' + this.available + '.',
      );
    }
  }
}
