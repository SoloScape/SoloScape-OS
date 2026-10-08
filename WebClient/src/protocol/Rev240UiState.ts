import type { ServerGamePacket } from './GamePacketFramer';
import type { Js5VarBitDefinition } from '../cache/Js5StartupAssets';

/** Revision-240 wire formats follow blurite/rsprot osrs-240-desktop codecs. */
export interface UiSubInterface {
  readonly destination: number;
  readonly groupId: number;
  readonly type: number;
}

export interface UiInventoryItem {
  readonly id: number; // -1 when empty; wire id is id + 1
  readonly count: number;
}
export interface UiInventory {
  readonly inventoryId: number;
  readonly combinedId: number;
  readonly items: ReadonlyArray<UiInventoryItem>;
}
export interface UiSkill {
  readonly id: number;
  readonly experience: number;
  readonly currentLevel: number;
  readonly invisibleBoostedLevel: number;
}
export interface UiWidgetChange {
  text?: string;
  hidden?: boolean;
  colour?: number;
  scrollPosition?: number;
  x?: number;
  y?: number;
  objectId?: number;
  objectCount?: number;
  modelId?: number;
}

const EMPTY_ITEM: UiInventoryItem = Object.freeze({ id: -1, count: 0 });

/** UI state is server-authoritative; cache data supplies only immutable layout. */
export class Rev240UiState {
  topLevelInterface: number | null = null;
  readonly subInterfaces = new Map<number, UiSubInterface>();
  readonly widgetChanges = new Map<number, UiWidgetChange>();
  readonly inventories = new Map<number, UiInventory>();
  readonly skills = new Map<number, UiSkill>();
  readonly varps = new Map<number, number>();
  readonly varbitDefinitions = new Map<number, Js5VarBitDefinition>();
  readonly interfaceEvents = new Map<number, ReadonlyArray<{start: number; end: number; events1: number; events2: number}>>();
  runEnergy: number | null = null;
  onChange: (() => void) | null = null;
  private revision = 0;

  get version(): number { return this.revision; }

  setVarbitDefinitions(definitions: ReadonlyMap<number, Js5VarBitDefinition>): void {
    this.varbitDefinitions.clear();
    for (const [key, value] of definitions) this.varbitDefinitions.set(key, value);
    this.emit();
  }

  varbit(id: number): number | null {
    const definition = this.varbitDefinitions.get(id);
    if (!definition) return null;
    const value = this.varps.get(definition.baseVar);
    if (value === undefined) return null;
    const width = definition.endBit - definition.startBit;
    if (width < 0 || width > 31) return null;
    const mask = width === 31 ? 0xffffffff : (1 << (width + 1)) - 1;
    return ((value >>> definition.startBit) & mask) >>> 0;
  }

  reset(): void {
    this.topLevelInterface = null;
    this.subInterfaces.clear();
    this.widgetChanges.clear();
    this.inventories.clear();
    this.skills.clear();
    this.varps.clear();
    this.interfaceEvents.clear();
    this.runEnergy = null;
    this.emit();
  }

  /** Returns null for unrelated packets. Throws on malformed handled packets. */
  apply(packet: Pick<ServerGamePacket, 'name' | 'payload'>): boolean {
    const r = new PacketReader(packet.payload);
    switch (packet.name) {
      case 'IF_OPENTOP': {
        const groupId = r.u16alt3();
        r.done();
        this.topLevelInterface = groupId === 0xffff ? null : groupId;
        this.subInterfaces.clear();
        this.widgetChanges.clear();
        break;
      }
      case 'IF_OPENSUB': {
        const type = r.u8();
        const groupId = r.u16alt3();
        const destination = r.u32alt3();
        r.done();
        this.subInterfaces.set(destination, { type, groupId, destination });
        break;
      }
      case 'IF_RESYNC_V2': {
        const top = r.u16();
        const subCount = r.u16();
        if (subCount > r.remaining / 7) throw new Error('Truncated IF_RESYNC_V2 attachments');
        const next = new Map<number, UiSubInterface>();
        for (let i = 0; i < subCount; i++) {
          const destination = r.u32();
          const groupId = r.u16();
          const type = r.u8();
          next.set(destination, { destination, groupId, type });
        }
        const events = new Map<number, Array<{start: number; end: number; events1: number; events2: number}>>();
        if (r.remaining % 16 !== 0) throw new Error('Invalid IF_RESYNC_V2 events');
        while (r.remaining) {
          const widget = r.u32();
          const event = { start: r.u16(), end: r.u16(), events1: r.u32(), events2: r.u32() };
          const list = events.get(widget) ?? [];
          list.push(event);
          events.set(widget, list);
        }
        this.topLevelInterface = top === 0xffff ? null : top;
        this.subInterfaces.clear();
        this.widgetChanges.clear();
        for (const [key, value] of next) this.subInterfaces.set(key, value);
        this.interfaceEvents.clear();
        for (const [key, value] of events) this.interfaceEvents.set(key, value);
        break;
      }
      case 'IF_CLOSESUB':
        this.subInterfaces.delete(r.u32());
        r.done();
        break;
      case 'IF_MOVESUB': {
        const source = r.u32alt3();
        const destination = r.u32alt3();
        r.done();
        const sub = this.subInterfaces.get(source);
        this.subInterfaces.delete(source);
        if (sub) this.subInterfaces.set(destination, { ...sub, destination });
        break;
      }
      case 'IF_SETTEXT': {
        const id = r.u32alt2();
        const text = r.str();
        r.done();
        this.updateWidget(id, { text });
        break;
      }
      case 'IF_SETHIDE': {
        const hidden = r.u8alt3() !== 0;
        const id = r.u32alt2();
        r.done();
        this.updateWidget(id, { hidden });
        break;
      }
      case 'IF_SETSCROLLPOS': {
        const id = r.u32alt3();
        const scrollPosition = r.u16();
        r.done();
        this.updateWidget(id, { scrollPosition });
        break;
      }
      case 'IF_SETCOLOUR': {
        const packed = r.u16alt3();
        const id = r.u32alt1();
        r.done();
        const red = (packed >>> 10) & 31;
        const green = (packed >>> 5) & 31;
        const blue = packed & 31;
        this.updateWidget(id, { colour: ((red << 3) << 16) | ((green << 3) << 8) | (blue << 3) });
        break;
      }
      case 'IF_SETPOSITION': {
        const x = r.i16alt2();
        const y = r.i16alt2();
        const id = r.u32alt1();
        r.done();
        this.updateWidget(id, { x, y });
        break;
      }
      case 'IF_SETOBJECT': {
        const objectId = r.u16alt3();
        const objectCount = r.u32alt3();
        const id = r.u32alt3();
        r.done();
        this.updateWidget(id, { objectId: objectId === 0xffff ? -1 : objectId, objectCount });
        break;
      }
      case 'IF_SETMODEL_V2': {
        const modelId = r.u32alt1();
        const id = r.u32alt1();
        r.done();
        this.updateWidget(id, { modelId: modelId === 0xffffffff ? -1 : modelId });
        break;
      }
      case 'IF_CLEARINV': {
        const id = r.u32alt1();
        r.done();
        const old = this.inventoryForWidget(id);
        if (old) this.inventories.set(old.inventoryId, {
          ...old, items: old.items.map(() => EMPTY_ITEM),
        });
        break;
      }
      case 'UPDATE_INV_FULL': {
        const combinedId = r.u32();
        const inventoryId = r.u16();
        const capacity = r.u16();
        if (capacity > 16000) throw new Error('Oversized inventory update');
        const items: UiInventoryItem[] = [];
        for (let i = 0; i < capacity; i++) {
          const amount = r.u8alt3();
          const count = amount === 255 ? r.u32() : amount;
          const id = r.u16() - 1;
          items.push(id === -1 ? EMPTY_ITEM : { id, count });
        }
        r.done();
        this.inventories.set(inventoryId, { inventoryId, combinedId, items });
        break;
      }
      case 'UPDATE_INV_PARTIAL': {
        const combinedId = r.u32();
        const inventoryId = r.u16();
        const old = this.inventories.get(inventoryId);
        const items = old ? [...old.items] : [];
        while (r.remaining) {
          const slot = r.smart1or2();
          if (slot > 16000) throw new Error('Oversized inventory slot');
          const id = r.u16() - 1;
          let count = 0;
          if (id !== -1) {
            const amount = r.u8();
            count = amount === 255 ? r.u32() : amount;
          }
          while (items.length <= slot) items.push(EMPTY_ITEM);
          items[slot] = id === -1 ? EMPTY_ITEM : { id, count };
        }
        this.inventories.set(inventoryId, { inventoryId, combinedId, items });
        break;
      }
      case 'UPDATE_INV_STOPTRANSMIT': {
        const inventoryId = r.u16alt1();
        r.done();
        this.inventories.delete(inventoryId);
        break;
      }
      case 'UPDATE_STAT_V2': {
        const id = r.u8alt3();
        const experience = r.u32alt1();
        const invisibleBoostedLevel = r.u8();
        const currentLevel = r.u8alt3();
        r.done();
        if (id > 63) throw new Error('Invalid stat index: ' + id);
        this.skills.set(id, { id, experience, invisibleBoostedLevel, currentLevel });
        break;
      }
      case 'UPDATE_RUNENERGY':
        this.runEnergy = r.u16();
        r.done();
        break;
      case 'VARP_SMALL': {
        const id = r.u16alt2();
        const value = r.i8alt2();
        r.done();
        this.varps.set(id, value);
        break;
      }
      case 'VARP_LARGE': {
        const id = r.u16alt3();
        const value = r.i32alt1();
        r.done();
        this.varps.set(id, value);
        break;
      }
      case 'VARP_RESET':
        r.done();
        this.varps.clear();
        break;
      default:
        return false;
    }
    this.emit();
    return true;
  }

  inventoryForWidget(widgetId: number): UiInventory | undefined {
    for (const inv of this.inventories.values()) {
      if (inv.combinedId === widgetId) return inv;
    }
    return undefined;
  }

  private updateWidget(id: number, fields: UiWidgetChange): void {
    this.widgetChanges.set(id, { ...this.widgetChanges.get(id), ...fields });
  }
  private emit(): void {
    this.revision++;
    this.onChange?.();
  }
}

class PacketReader {
  private pos = 0;
  constructor(private readonly bytes: Uint8Array) {}
  get remaining(): number { return this.bytes.length - this.pos; }
  private require(n: number): void {
    if (this.remaining < n) throw new RangeError('Truncated revision-240 UI packet');
  }
  u8(): number { this.require(1); return this.bytes[this.pos++]!; }
  u8alt3(): number { return (128 - this.u8()) & 255; }
  i8alt2(): number { const x = (-this.u8()) & 255; return x > 127 ? x - 256 : x; }
  u16(): number { return (this.u8() << 8) | this.u8(); }
  u16alt1(): number { const lo = this.u8(); return lo | (this.u8() << 8); }
  u16alt2(): number { const hi = this.u8(); return (hi << 8) | ((this.u8() - 128) & 255); }
  u16alt3(): number { const lo = (this.u8() - 128) & 255; return lo | (this.u8() << 8); }
  i16alt2(): number { const x = this.u16alt2(); return x > 32767 ? x - 65536 : x; }
  u32(): number { return (((this.u8() << 24) | (this.u8() << 16) | (this.u8() << 8) | this.u8()) >>> 0); }
  u32alt1(): number {
    const a = this.u8(), b = this.u8(), c = this.u8(), d = this.u8();
    return ((d << 24) | (c << 16) | (b << 8) | a) >>> 0;
  }
  u32alt2(): number {
    const b = this.u8(), a = this.u8(), d = this.u8(), c = this.u8();
    return ((d << 24) | (c << 16) | (b << 8) | a) >>> 0;
  }
  u32alt3(): number {
    const c = this.u8(), d = this.u8(), a = this.u8(), b = this.u8();
    return ((d << 24) | (c << 16) | (b << 8) | a) >>> 0;
  }
  i32alt1(): number { return this.u32alt1() | 0; }
  smart1or2(): number { this.require(1); return this.bytes[this.pos]! < 128 ? this.u8() : (this.u16() & 0x7fff); }
  str(): string {
    let text = '';
    while (this.remaining) {
      const byte = this.u8();
      if (byte === 0) return text;
      text += String.fromCharCode(byte);
    }
    throw new RangeError('Unterminated revision-240 Jagex string');
  }
  done(): void { if (this.remaining) throw new Error('Trailing bytes in UI packet: ' + this.remaining); }
}
