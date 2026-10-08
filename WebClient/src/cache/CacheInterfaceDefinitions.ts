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
 * Decode the shared layout header of IF1 and IF3 widgets, plus IF3 text /
 * sprite properties used by a first-pass renderer. Remaining fields (CS1,
 * listeners, scripts, actions) are kept as raw data, NOT invented.
 */
export function decodeCacheInterfaceComponent(
  groupId: number,
  childId: number,
  data: Uint8Array,
): CacheInterfaceComponent {
  const reader = new Reader(data);
  const isIf3 = data[0] === 0xff;
  if (isIf3) reader.u8(); // IF3 marker/version
  const type = reader.u8();
  if (!isIf3) reader.u8(); // legacy button type
  const contentType = reader.u16();
  const x = reader.i16();
  const y = reader.i16();
  const width = reader.u16();
  const height = isIf3 && type === 9 ? reader.i16() : reader.u16();

  let parentId: number;
  let hidden = false;
  let spriteId: number | null = null;
  let fontId: number | null = null;
  let text: string | null = null;

  if (isIf3) {
    reader.i8(); // width alignment
    reader.i8(); // height alignment
    reader.i8(); // x alignment
    reader.i8(); // y alignment
    parentId = reader.u16();
    hidden = reader.u8() !== 0;
    if (type === 5) {
      const sprite = reader.i32();
      spriteId = sprite === -1 ? null : sprite;
      reader.u16(); // sprite angle
      reader.u8(); // tiling
      reader.u8(); // alpha
      reader.u8(); // outline
      reader.i32(); // shadow
      reader.u8(); // flip vertical
      reader.u8(); // flip horizontal
    } else if (type === 4) {
      const font = reader.u16();
      fontId = font === 0xffff ? null : font;
      text = reader.str();
      reader.u8(); // line height
      reader.u8(); // horizontal alignment
      reader.u8(); // vertical alignment
      reader.u8(); // shadow
      reader.i32(); // text colour
    }
  } else {
    reader.u8(); // legacy transparency
    parentId = reader.u16();
    reader.u16(); // legacy mouseover redirect
  }

  if (parentId === 0xffff) parentId = -1;
  else parentId |= groupId << 16;

  return {
    id: (groupId << 16) | childId,
    groupId,
    childId,
    format: isIf3 ? 'if3' : 'if1',
    type, contentType, x, y, width, height, parentId, hidden,
    spriteId, fontId, text, raw: data,
  };
}

class Reader {
  private offset = 0;
  constructor(private readonly data: Uint8Array) {}

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
