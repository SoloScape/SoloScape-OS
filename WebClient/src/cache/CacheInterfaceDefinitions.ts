import type { Js5Client } from './Js5Client';

/**
 * Cache archive 3 stores one widget/interface group per JS5 group. Files in
 * each group are component IDs. The browser loads them on demand, rather
 * than downloading every interface during login.
 */
export const INTERFACE_ARCHIVE = 3;

export interface CacheInterfaceComponent {
  readonly id: number;
  readonly groupId: number;
  readonly childId: number;
  readonly format: 'if1' | 'if3';
  readonly type: number;
  readonly contentType: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly parentId: number;
  readonly hidden: boolean;
  readonly xAlignment: number;
  readonly yAlignment: number;
  readonly widthAlignment: number;
  readonly heightAlignment: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly colour: number | null;
  readonly filled: boolean;
  readonly opacity: number;
  readonly textXAlignment: number;
  readonly textYAlignment: number;
  readonly textLineHeight: number;
  readonly textShadow: boolean;
  readonly spriteAngle: number;
  readonly spriteTiling: boolean;
  readonly spriteFlipH: boolean;
  readonly spriteFlipV: boolean;
  readonly gridPaddingX: number;
  readonly gridPaddingY: number;
  readonly spriteId: number | null;
  readonly fontId: number | null;
  readonly text: string | null;
  /** Retain the complete definition for future widget/CS2 decoders. */
  readonly raw: Uint8Array;
}

export class CacheInterfaceStore {
  private readonly loaded = new Map<number, Promise<ReadonlyMap<number, CacheInterfaceComponent>>>();

  constructor(private readonly js5: Js5Client) {}

  get availableGroupIds(): readonly number[] {
    return this.js5.getArchiveReferenceTable(INTERFACE_ARCHIVE)
      ?.groups.map((group) => group.id) ?? [];
  }

  load(groupId: number): Promise<ReadonlyMap<number, CacheInterfaceComponent>> {
    if (!Number.isSafeInteger(groupId) || groupId < 0 || groupId > 0xffff) {
      return Promise.reject(new Error('Invalid interface group id ' + groupId));
    }
    const existing = this.loaded.get(groupId);
    if (existing) return existing;

    const table = this.js5.getArchiveReferenceTable(INTERFACE_ARCHIVE);
    if (!table?.groups.some((group) => group.id === groupId)) {
      return Promise.reject(new Error('No cache interface group 3:' + groupId));
    }
    const pending = this.js5.downloadGroup(INTERFACE_ARCHIVE, groupId)
      .then((group) => {
        const components = new Map<number, CacheInterfaceComponent>();
        for (const [childId, bytes] of group.files) {
          if (childId > 0xffff) {
            throw new Error('Interface child id exceeds 16 bits: ' + childId);
          }
          components.set(childId, decodeCacheInterfaceComponent(groupId, childId, bytes));
        }
        return components as ReadonlyMap<number, CacheInterfaceComponent>;
      })
      .catch((error: unknown) => {
        this.loaded.delete(groupId);
        throw error;
      });
    this.loaded.set(groupId, pending);
    return pending;
  }

  clear(): void {
    this.loaded.clear();
  }
}

/**
 * Read widget layouts from the cache, not invented HTML slot definitions.
 * IF3: containers, rectangles, text, sprites and lines. IF1: widget
 * headers, CS1 blocks, containers and inventory-grid layout. Script and
 * interaction fields are preserved in raw until handled explicitly.
 */
export function decodeCacheInterfaceComponent(
  groupId: number,
  childId: number,
  data: Uint8Array,
): CacheInterfaceComponent {
  const reader = new Reader(data);
  const isIf3 = data[0] === 0xff;
  if (isIf3) reader.u8(); // marker
  const type = reader.u8();
  if (!isIf3) reader.u8(); // legacy button type
  const contentType = reader.u16();
  const x = reader.i16();
  const y = reader.i16();
  const width = reader.u16();
  const height = isIf3 && type === 9 ? reader.i16() : reader.u16();
  let xAlignment = 0;
  let yAlignment = 0;
  let widthAlignment = 0;
  let heightAlignment = 0;
  let parentId = -1;
  let hidden = false;
  let scrollWidth = width;
  let scrollHeight = height;
  let colour: number | null = null;
  let filled = false;
  let opacity = 0;
  let spriteId: number | null = null;
  let fontId: number | null = null;
  let text: string | null = null;
  let textXAlignment = 0;
  let textYAlignment = 0;
  let textLineHeight = 0;
  let textShadow = false;
  let spriteAngle = 0;
  let spriteTiling = false;
  let spriteFlipH = false;
  let spriteFlipV = false;
  let gridPaddingX = 0;
  let gridPaddingY = 0;

  if (isIf3) {
    widthAlignment = reader.i8();
    heightAlignment = reader.i8();
    xAlignment = reader.i8();
    yAlignment = reader.i8();
    parentId = reader.u16();
    hidden = reader.u8() !== 0;

    switch (type) {
      case 0:
        scrollWidth = reader.u16();
        scrollHeight = reader.u16();
        // noClickThrough is in newer IF3 cache revisions
        break;
      case 3:
        colour = reader.i32() >>> 0;
        filled = reader.u8() !== 0;
        opacity = reader.u8();
        break;
      case 4: {
        const font = reader.u16();
        fontId = font === 0xffff ? null : font;
        text = reader.str();
        textLineHeight = reader.u8();
        textXAlignment = reader.u8();
        textYAlignment = reader.u8();
        textShadow = reader.u8() !== 0;
        colour = reader.i32() >>> 0;
        break;
      }
      case 5: {
        const sprite = reader.i32();
        spriteId = sprite < 0 ? null : sprite;
        spriteAngle = reader.u16();
        spriteTiling = reader.u8() !== 0;
        opacity = reader.u8();
        reader.u8(); // outline
        reader.i32(); // shadow
        spriteFlipV = reader.u8() !== 0;
        spriteFlipH = reader.u8() !== 0;
        break;
      }
      case 9:
        reader.u8(); // line width
        colour = reader.i32() >>> 0;
        break;
    }
  } else {
    opacity = reader.u8();
    parentId = reader.u16();
    reader.u16(); // mouseover redirect

    // CS1 comparisons and instruction arrays precede the type payload.
    const comparisons = reader.remaining ? reader.u8() : 0;
    for (let i = 0; i < comparisons; i++) {
      reader.u8();
      reader.u16();
    }
    const instructions = reader.remaining ? reader.u8() : 0;
    for (let i = 0; i < instructions; i++) {
      const length = reader.u16();
      for (let j = 0; j < length; j++) reader.u16();
    }

    if (type === 0 && reader.remaining >= 3) {
      scrollHeight = reader.u16();
      hidden = reader.u8() !== 0;
    }
    if (type === 2 && reader.remaining >= 6) {
      // Dynamic item ids come from UPDATE_INV_* server packets, not cache.
      reader.u8(); // has item options
      reader.u8(); // draggable
      reader.u8(); // has use option
      reader.u8(); // replaces inventory on drag
      gridPaddingX = reader.u8();
      gridPaddingY = reader.u8();
    }
    if (type === 3 && reader.remaining >= 1) filled = reader.u8() !== 0;
    if ((type === 1 || type === 4) && reader.remaining >= 5) {
      textXAlignment = reader.u8();
      textYAlignment = reader.u8();
      textLineHeight = reader.u8();
      const font = reader.u16();
      fontId = font === 0xffff ? null : font;
      if (reader.remaining) textShadow = reader.u8() !== 0;
    }
    if (type === 4 && reader.remaining) {
      text = reader.str();
      if (reader.remaining) reader.str(); // alternate legacy text
    }
    if ((type === 1 || type === 3 || type === 4) && reader.remaining >= 4) {
      colour = reader.i32() >>> 0;
    }
    if (type === 5 && reader.remaining >= 8) {
      reader.i32(); // alternate sprite
      const sprite = reader.i32();
      spriteId = sprite < 0 ? null : sprite;
    }
  }
  if (parentId === 0xffff) parentId = -1;
  else parentId = (groupId << 16) | parentId;

  return {
    id: (groupId << 16) | childId, groupId, childId,
    format: isIf3 ? 'if3' : 'if1', type, contentType,
    x, y, width, height, parentId, hidden,
    xAlignment, yAlignment, widthAlignment, heightAlignment,
    scrollWidth, scrollHeight, colour, filled, opacity,
    textXAlignment, textYAlignment, textLineHeight, textShadow,
    spriteAngle, spriteTiling, spriteFlipH, spriteFlipV,
    gridPaddingX, gridPaddingY,
    spriteId, fontId, text, raw: data,
  };
}

class Reader {
  private offset = 0;
  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  u8(): number {
    if (this.offset >= this.data.length) throw new Error('Truncated interface definition');
    return this.data[this.offset++]!;
  }

  i8(): number {
    const value = this.u8();
    return value > 127 ? value - 256 : value;
  }

  u16(): number {
    return (this.u8() << 8) | this.u8();
  }

  i16(): number {
    const value = this.u16();
    return value > 32767 ? value - 65536 : value;
  }

  i32(): number {
    return (this.u8() << 24) | (this.u8() << 16) | (this.u8() << 8) | this.u8();
  }

  str(): string {
    let value = '';
    for (;;) {
      const byte = this.u8();
      if (byte === 0) return value;
      value += String.fromCharCode(byte);
    }
  }
}
