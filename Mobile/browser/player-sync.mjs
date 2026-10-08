// Revision 240 GPI adapted from RSProx PlayerInfoClient (MIT).
// Attribution and license: ../licenses/rsprox-MIT.txt.
const WALK = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const RUN = [[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[-2,-1],[2,-1],[-2,0],
    [2,0],[-2,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2]];
const cp1252 = new TextDecoder("windows-1252");
const signed = value => (value & 128) ? value - 256 : value;
const nullableId = id => id === 65535 ? -1 : id;

/** Bounds checked byte/bit reader. Alt transforms use RSProt numbering. */
export class PacketReader {
    constructor(bytes) {
        this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        this.offset = 0;
        this.bitOffset = null;
    }
    get remaining() { return this.bytes.length - this.offset; }
    require(count) {
        if (!Number.isInteger(count) || count < 0 || this.offset + count > this.bytes.length)
            throw new Error("Truncated player packet");
    }
    bits(count) {
        if (!Number.isInteger(count) || count < 0 || count > 30) throw new Error("Invalid bit count");
        if (this.bitOffset === null) this.bitOffset = this.offset * 8;
        if (this.bitOffset + count > this.bytes.length * 8) throw new Error("Truncated player bits");
        let value = 0;
        for (let i = 0; i < count; i++, this.bitOffset++)
            value = value * 2 + ((this.bytes[this.bitOffset >>> 3] >>> (7 - (this.bitOffset & 7))) & 1);
        return value;
    }
    align() {
        if (this.bitOffset !== null) this.offset = Math.ceil(this.bitOffset / 8);
        this.bitOffset = null;
    }
    u8(alt = 0) {
        if (this.bitOffset !== null) throw new Error("Byte read before bit alignment");
        this.require(1);
        const value = this.bytes[this.offset++];
        if (alt === 1) return (value - 128) & 255;
        if (alt === 2) return -value & 255;
        if (alt === 3) return (128 - value) & 255;
        return value;
    }
    i8(alt = 0) { return signed(this.u8(alt)); }
    u16(alt = 0) {
        const first = this.u8(), second = this.u8();
        if (alt === 1) return first | second << 8;
        if (alt === 2) return first << 8 | (second - 128) & 255;
        if (alt === 3) return (first - 128) & 255 | second << 8;
        return first << 8 | second;
    }
    i16(alt = 0) { const value = this.u16(alt); return value > 32767 ? value - 65536 : value; }
    u32(littleEndian = false) {
        const a = this.u8(), b = this.u8(), c = this.u8(), d = this.u8();
        return (littleEndian ? a | b << 8 | c << 16 | d << 24 : a << 24 | b << 16 | c << 8 | d) >>> 0;
    }
    data(count, {reverse = false, subtract = false} = {}) {
        this.require(count);
        const result = this.bytes.slice(this.offset, this.offset + count);
        this.offset += count;
        if (subtract) for (let i = 0; i < result.length; i++) result[i] = (result[i] - 128) & 255;
        if (reverse) result.reverse();
        return result;
    }
    string() {
        const start = this.offset;
        while (this.u8() !== 0) { /* NUL-terminated CP1252. */ }
        return cp1252.decode(this.bytes.subarray(start, this.offset - 1));
    }
    smart() {
        this.require(1);
        return this.bytes[this.offset] < 128 ? this.u8() : this.u16() - 32768;
    }
    smart2or4() {
        this.require(1);
        if (this.bytes[this.offset] >= 128) return this.u32() & 0x7fffffff;
        const value = this.u16();
        return value === 32767 ? -1 : value;
    }
}

/** Parse an already reversed appearance block, preserving cache equipment codes. */
export function decodeAppearance(bytes) {
    const reader = new PacketReader(bytes);
    const appearance = {
        gender: reader.i8(), skullIcon: reader.i8(), overheadIcon: reader.i8(),
        equipment: Array(12).fill(0), interfaceEquipment: Array(12).fill(0), transformedNpcId: -1,
    };
    for (let slot = 0; slot < 12; slot++) {
        const high = reader.u8();
        if (high === 0) continue;
        appearance.equipment[slot] = high << 8 | reader.u8();
        if (slot === 0 && appearance.equipment[slot] === 65535) {
            appearance.transformedNpcId = reader.u16();
            break;
        }
    }
    for (let slot = 0; slot < 12; slot++) {
        const high = reader.u8();
        if (high !== 0) appearance.interfaceEquipment[slot] = high << 8 | reader.u8();
    }
    appearance.colours = Array.from({length: 5}, () => reader.u8());
    appearance.animations = {};
    for (const name of ["idle", "turn", "walk", "walkBack", "walkLeft", "walkRight", "run"])
        appearance.animations[name] = nullableId(reader.u16());
    appearance.name = reader.string();
    appearance.combatLevel = reader.u8();
    appearance.skillLevel = reader.u16();
    appearance.hidden = reader.u8() === 1;
    const flags = reader.u16();
    appearance.forceRefresh = Boolean(flags & 32768);
    appearance.customisations = Array(12).fill(null);
    for (let slot = 0; slot < 12; slot++) {
        if (!(flags & 1 << (12 - slot))) continue;
        const custom = {recolours: [], retextures: []}, slotFlags = reader.u8();
        for (const [mask, property] of [[1, "recolours"], [2, "retextures"]]) {
            if (!(slotFlags & mask)) continue;
            const indices = reader.u8();
            for (const index of [indices & 15, indices >>> 4])
                if (index !== 15) custom[property].push({index, value: reader.u16()});
        }
        if (slotFlags & 4) custom.wearModels = [reader.u32(), reader.u32()];
        if (slotFlags & 8) custom.headModels = [reader.u32(), reader.u32()];
        appearance.customisations[slot] = custom;
    }
    appearance.beforeName = reader.string();
    appearance.afterName = reader.string();
    appearance.afterCombatLevel = reader.string();
    appearance.textGender = reader.i8();
    if (reader.remaining) throw new Error("Unexpected appearance bytes");
    return appearance;
}

function newPlayer(x, y, plane, appearance = null) {
    return {x, y, plane, orientation: 0, appearance, moving: false, sequence: null, moveSpeed: 1};
}
function orientation(dx, dy) {
    return Math.round(Math.atan2(-dx, -dy) * 1024 / Math.PI) & 2047;
}

/** Stateful, server-authoritative revision 240 global player information. */
export class NativePlayerSync {
    constructor(localIndex) {
        if (!Number.isInteger(localIndex) || localIndex < 1 || localIndex > 2047)
            throw new Error("Invalid local player index");
        this.localIndex = localIndex;
        this.players = Array(2048).fill(null);
        this.regions = Array(2048).fill(null);
        this.appearances = Array(2048).fill(null);
        this.flags = new Uint8Array(2048);
        this.high = [];
        this.low = [];
        this.initialized = false;
    }
    get local() { return this.players[this.localIndex]; }
    initialize(payload) {
        const reader = payload instanceof PacketReader ? payload : new PacketReader(payload);
        this.init(reader);
        return reader.offset;
    }
    init(reader) {
        const position = reader.bits(30), regions = Array(2048).fill(null), low = [];
        for (let index = 1; index < 2048; index++) {
            if (index === this.localIndex) continue;
            const packed = reader.bits(18);
            regions[index] = {plane: packed >>> 16, x: packed >>> 8 & 255, y: packed & 255};
            low.push(index);
        }
        reader.align();
        this.players = Array(2048).fill(null);
        this.players[this.localIndex] = newPlayer(position >>> 14 & 16383, position & 16383, position >>> 28);
        this.regions = regions;
        this.appearances = Array(2048).fill(null);
        this.flags.fill(0);
        this.high = [this.localIndex];
        this.low = low;
        this.initialized = true;
    }
    decode(payload) {
        if (!this.initialized) throw new Error("Player information before initialization");
        // Decode into copies so malformed packets cannot half-update the scene.
        const previous = {players: this.players, regions: this.regions, appearances: this.appearances,
            flags: this.flags, high: this.high, low: this.low};
        this.players = this.players.map(player => player ? {...player, moving: false, teleported: false,
            queuedMove: false, temporaryMoveSpeed: null} : null);
        this.regions = this.regions.map(region => region ? {...region} : null);
        this.appearances = this.appearances.slice();
        this.flags = this.flags.slice();
        try {
            const reader = new PacketReader(payload), extended = [];
            for (const [indices, inactive, high] of [[this.high, false, true], [this.high, true, true],
                [this.low, true, false], [this.low, false, false]]) {
                let skipped = 0;
                for (const index of indices) {
                    if (Boolean(this.flags[index] & 1) !== inactive) continue;
                    if (skipped > 0) { skipped--; this.flags[index] |= 2; continue; }
                    if (reader.bits(1) === 0) {
                        const countBits = [0, 5, 8, 11][reader.bits(2)];
                        skipped = reader.bits(countBits);
                        this.flags[index] |= 2;
                    } else if (high) this.readHigh(reader, index, extended);
                    else if (this.readLow(reader, index, extended)) this.flags[index] |= 2;
                }
                if (skipped !== 0) throw new Error("Player skip count exceeds pass");
                reader.align();
            }
            this.high = []; this.low = [];
            for (let index = 1; index < 2048; index++) {
                this.flags[index] >>>= 1;
                (this.players[index] ? this.high : this.low).push(index);
            }
            for (const index of extended) this.readMasks(reader, index);
            if (reader.remaining) throw new Error("Unexpected player packet bytes");
            return this.local;
        } catch (error) {
            Object.assign(this, previous);
            throw error;
        }
    }
    move(player, x, y, plane, extended) {
        const dx = x - player.x, dy = y - player.y;
        player.previousX = player.x; player.previousY = player.y; player.previousPlane = player.plane;
        player.x = x; player.y = y; player.plane = plane;
        player.moving = dx !== 0 || dy !== 0;
        player.teleported = plane !== player.previousPlane || Math.abs(dx) > 2 || Math.abs(dy) > 2;
        player.queuedMove = extended;
        if (player.moving) player.orientation = orientation(dx, dy);
    }
    readHigh(reader, index, extended) {
        const hasExtended = reader.bits(1) === 1, opcode = reader.bits(2), player = this.players[index];
        if (hasExtended) extended.push(index);
        if (opcode === 0) {
            if (hasExtended) { player.queuedMove = false; return; }
            if (index === this.localIndex) throw new Error("Server removed local player");
            this.regions[index] = {plane: player.plane, x: player.x >>> 13, y: player.y >>> 13};
            this.players[index] = null;
            if (reader.bits(1)) this.readLow(reader, index, extended);
            return;
        }
        if (opcode === 1 || opcode === 2) {
            const [dx, dy] = (opcode === 1 ? WALK : RUN)[reader.bits(opcode === 1 ? 3 : 4)];
            this.move(player, player.x + dx, player.y + dy, player.plane, hasExtended);
        } else if (reader.bits(1) === 0) {
            const packed = reader.bits(12), dx = packed >>> 5 & 31, dy = packed & 31;
            this.move(player, player.x + (dx > 15 ? dx - 32 : dx), player.y + (dy > 15 ? dy - 32 : dy),
                player.plane + (packed >>> 10) & 3, hasExtended);
            player.teleported = true;
        } else {
            const packed = reader.bits(30);
            this.move(player, player.x + (packed >>> 14 & 16383) & 16383,
                player.y + (packed & 16383) & 16383, player.plane + (packed >>> 28) & 3, hasExtended);
            player.teleported = true;
        }
    }
    readLow(reader, index, extended, depth = 0) {
        if (depth > 16) throw new Error("Excessive recursive player updates");
        const opcode = reader.bits(2);
        if (opcode === 0) {
            if (reader.bits(1)) this.readLow(reader, index, extended, depth + 1);
            const x = reader.bits(13), y = reader.bits(13), hasExtended = reader.bits(1) === 1;
            if (hasExtended) extended.push(index);
            if (this.players[index]) throw new Error("Duplicate high resolution player");
            const region = this.regions[index];
            this.players[index] = newPlayer((region.x << 13) + x, (region.y << 13) + y,
                region.plane, this.appearances[index]);
            return true;
        }
        const region = this.regions[index];
        if (opcode === 1) region.plane = region.plane + reader.bits(2) & 3;
        else if (opcode === 2) {
            const packed = reader.bits(5), [dx, dy] = WALK[packed & 7];
            region.plane = region.plane + (packed >>> 3) & 3;
            region.x = region.x + dx & 255; region.y = region.y + dy & 255;
        } else {
            const packed = reader.bits(18);
            region.plane = region.plane + (packed >>> 16) & 3;
            region.x = region.x + (packed >>> 8 & 255) & 255;
            region.y = region.y + (packed & 255) & 255;
        }
        return false;
    }
    readMasks(reader, index) {
        const player = this.players[index];
        let mask = reader.u8();
        if (mask & 0x80) mask |= reader.u8() << 8;
        if (mask & 0x2000) mask |= reader.u8() << 16;
        if (mask & ~0x1ffefd) throw new Error("Unknown player update mask");
        if (mask & 0x20) player.spotanims = this.readSpotanims(reader, false);
        if (mask & 0x1000) {
            const colourEffects = reader.u16(), modIcon = reader.u8(1), autotyper = reader.u8(2) === 1;
            const compressed = reader.data(reader.u8(1), {reverse: true, subtract: true});
            const colour = colourEffects >>> 8, pattern = [];
            if (colour >= 13 && colour <= 20)
                for (let i = 0; i < colour - 12; i++) pattern.push(reader.u8(2));
            player.chat = {colour, effects: colourEffects & 255, modIcon, autotyper, compressed, pattern};
        }
        if (mask & 0x20000) {
            player.headbars = [];
            for (let count = reader.u8(3); count > 0; count--) {
                const type = reader.smart(), endTime = reader.smart();
                if (endTime === 32767) { player.headbars.push({type, removed: true}); continue; }
                const startTime = reader.smart(), startFill = reader.u8();
                player.headbars.push({type, endTime, startTime, startFill, endFill: endTime > 0 ? reader.u8(2) : startFill});
            }
        }
        if (mask & 4) {
            player.appearance = decodeAppearance(reader.data(reader.u8(3), {reverse: true}));
            this.appearances[index] = player.appearance;
        }
        if (mask & 0x40000) player.freeze = {delay: reader.u16(2), duration: reader.u16(1), cancelSequence: reader.u8(2) === 1};
        if (mask & 0x40) {
            const flags = reader.u8(), kind = flags >>> 3 & 7;
            if ((flags & 7) > 1) throw new Error("Unknown player facing walk type");
            const facing = {kind, walkType: flags & 7, instant: Boolean(flags & 64)};
            if (kind === 0) Object.assign(facing, {entityType: reader.smart(), index: reader.smart2or4(), angle: reader.smart()});
            else if (kind === 1) Object.assign(facing, {x: reader.smart(), y: reader.smart(), size: reader.smart()});
            else if (kind === 2) facing.angle = reader.smart();
            else if (kind !== 3) throw new Error("Unknown player facing kind");
            player.facing = facing;
            if (facing.angle !== undefined) player.orientation = facing.angle & 2047;
        }
        if (mask & 0x200) player.nameExtras = [reader.string(), reader.string(), reader.string()];
        if (mask & 0x4000) player.moveSpeed = reader.i8(3);
        if (mask & 0x800) {
            player.temporaryMoveSpeed = reader.i8(2);
            if (player.temporaryMoveSpeed === 127) player.teleported = true;
        }
        if (mask & 0x80000) player.spotanims = this.readSpotanims(reader, true);
        if (mask & 0x10000) player.transparency = {start: reader.i16(2), end: reader.i16(3),
            startTransparency: reader.i8(3), endTransparency: reader.i8(3), useStartTransparency: reader.u8(3) === 1};
        if (mask & 0x100000) {
            player.hits = [];
            for (let count = reader.u8(); count > 0; count--)
                player.hits.push({type: reader.smart(), value: reader.smart(), delay: reader.smart(), limit: reader.smart()});
        }
        if (mask & 0x8000) player.exactMove = {dx1: reader.i8(), dy1: reader.i8(3), dx2: reader.i8(), dy2: reader.i8(),
            delay1: reader.u16(3), delay2: reader.u16(3), direction: reader.u16(3)};
        if (mask & 0x10) player.sequence = {id: nullableId(reader.u16(3)), delay: reader.u8(1)};
        if (mask & 0x400) player.tinting = {start: reader.u16(1), end: reader.u16(3), hue: reader.i8(2),
            saturation: reader.i8(1), lightness: reader.i8(), weight: reader.u8(1)};
        if (mask & 8) player.reset = reader.u8(2);
        if (mask & 1) player.overheadText = reader.string();
    }
    readSpotanims(reader, old) {
        const values = [];
        for (let count = reader.u8(old ? 3 : 1); count > 0; count--) {
            const slot = reader.u8(old ? 1 : 2), id = nullableId(reader.u16(1)), packed = reader.u32(old);
            values.push({slot, id, height: packed >>> 16, delay: packed & 65535, loop: old ? false : reader.u8(3) === 1});
        }
        return values;
    }
}
