export interface FloorUnderlayDefinition {
  readonly id: number;
  readonly rgb: number;
}

export interface FloorOverlayDefinition {
  readonly id: number;
  readonly rgb: number;
  readonly texture: number;
  readonly hideUnderlay: boolean;
  readonly secondaryRgb: number;
}

export function decodeFloorUnderlayDefinition(
  id: number,
  data: Uint8Array,
): FloorUnderlayDefinition {
  const reader = new DefinitionReader(data);
  let rgb = 0;

  while (true) {
    const opcode = reader.u8();
    if (opcode === 0) break;
    if (opcode === 1) {
      rgb = reader.u24();
      continue;
    }
    throw new RangeError(
      'Unsupported floor-underlay opcode ' + opcode + ' for id ' + id + '.',
    );
  }

  if (reader.remaining !== 0) {
    throw new RangeError(
      'Floor underlay ' + id + ' has ' + reader.remaining +
        ' trailing byte(s).',
    );
  }
  return { id, rgb };
}

export function decodeFloorOverlayDefinition(
  id: number,
  data: Uint8Array,
): FloorOverlayDefinition {
  const reader = new DefinitionReader(data);
  let rgb = 0;
  let texture = -1;
  let hideUnderlay = true;
  let secondaryRgb = -1;

  while (true) {
    const opcode = reader.u8();
    if (opcode === 0) break;

    switch (opcode) {
      case 1:
        rgb = reader.u24();
        break;
      case 2:
        texture = reader.u8();
        break;
      case 5:
        hideUnderlay = false;
        break;
      case 7:
        secondaryRgb = reader.u24();
        break;
      case 8:
        // Marker/no-op in the classic floor-overlay format.
        break;
      default:
        throw new RangeError(
          'Unsupported floor-overlay opcode ' + opcode + ' for id ' + id + '.',
        );
    }
  }

  if (reader.remaining !== 0) {
    throw new RangeError(
      'Floor overlay ' + id + ' has ' + reader.remaining +
        ' trailing byte(s).',
    );
  }
  return {
    id,
    rgb,
    texture,
    hideUnderlay,
    secondaryRgb,
  };
}

class DefinitionReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  u8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  u24(): number {
    this.require(3);
    const value =
      (this.data[this.offset]! << 16) |
      (this.data[this.offset + 1]! << 8) |
      this.data[this.offset + 2]!;
    this.offset += 3;
    return value;
  }

  private require(length: number): void {
    if (this.offset + length > this.data.length) {
      throw new RangeError(
        'Unexpected end of floor definition at byte ' + this.offset + '.',
      );
    }
  }
}
