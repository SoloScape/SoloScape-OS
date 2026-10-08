import assert from "node:assert/strict";
import {test} from "node:test";
import {NativePlayerSync, PacketReader, decodeAppearance} from "../browser/player-sync.mjs";

// Independent wire fixtures, using explicit revision 240 bit layouts.
class Bits {
    constructor() { this.values = []; }
    put(value, count) {
        for (let bit = count - 1; bit >= 0; bit--) this.values.push(value >>> bit & 1);
        return this;
    }
    bytes() {
        const bytes = new Uint8Array(Math.ceil(this.values.length / 8));
        this.values.forEach((bit, index) => { bytes[index >>> 3] |= bit << (7 - (index & 7)); });
        return bytes;
    }
}
const concat = (...parts) => Uint8Array.from(parts.flatMap(part => Array.from(part)));
const u16 = value => [value >>> 8 & 255, value & 255];
const le = value => [value & 255, value >>> 8 & 255];
const lea = value => [(value + 128) & 255, value >>> 8 & 255];
const str = value => [...Buffer.from(value, "latin1"), 0];
const skip = count => new Bits().put(0, 1).put(3, 2).put(count, 11).bytes();
function initialized({index = 1, x = 3200, y = 3200, plane = 0, otherRegions = {}} = {}) {
    const bits = new Bits().put(plane << 28 | x << 14 | y, 30);
    for (let player = 1; player < 2048; player++)
        if (player !== index) bits.put(otherRegions[player] ?? 0, 18);
    const sync = new NativePlayerSync(index), bytes = bits.bytes();
    assert.equal(sync.initialize(bytes), 4608);
    return sync;
}
function updateLocal(sync, bits, masks = []) {
    const high = bits.bytes(), low = skip(2045);
    // Local's update pass precedes low's skip pass whether local inactive or active.
    return sync.decode(concat(high, low, masks));
}
function appearance({npc = false, custom = false} = {}) {
    const equipment = npc ? [255, 255, ...u16(42)] : [1, 9, 0, 0, 8, 100, ...Array(8).fill(0)];
    const interfaceEquipment = [1, 9, ...Array(11).fill(0)];
    return concat([0, 255, 255], equipment, interfaceEquipment, [2, 3, 4, 5, 6],
        [808, 823, 819, 820, 821, 822, 824].flatMap(u16), str("Fixture"), [3], u16(0), [0],
        u16(custom ? 0x9000 : 0), custom ? [3, 0xf0, ...u16(500), 0x1f, ...u16(600)] : [],
        str("["), str("]"), str("!"), [0]);
}

test("initial GPI preserves world coordinates, plane and packed low regions", () => {
    const sync = initialized({index: 42, x: 16380, y: 8123, plane: 3, otherRegions: {1: 2 << 16 | 201 << 8 | 252}});
    assert.deepEqual([sync.local.x, sync.local.y, sync.local.plane], [16380, 8123, 3]);
    assert.deepEqual(sync.regions[1], {plane: 2, x: 201, y: 252});
    assert.deepEqual(sync.high, [42]); assert.equal(sync.low.length, 2046);
    assert.throws(() => new NativePlayerSync(0), /index/);
    assert.throws(() => new NativePlayerSync(2048), /index/);
});

test("stationary skips across all four aligned passes", () => {
    const sync = initialized();
    sync.decode(concat(new Bits().put(0, 1).put(0, 2).bytes(), skip(2045)));
    assert.equal(sync.flags[1], 1); assert.equal(sync.flags[2047], 1);
    sync.decode(concat(new Bits().put(0, 1).put(0, 2).bytes(), skip(2045)));
    assert.equal(sync.local.moving, false); assert.equal(sync.local.x, 3200);
    updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(1, 2).put(4, 3));
    assert.equal(sync.local.x, 3201); assert.equal(sync.flags[1], 0);
});

test("all eight walk directions and orientation are decoded", () => {
    const expected = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    for (let direction = 0; direction < expected.length; direction++) {
        const sync = initialized(), [dx, dy] = expected[direction];
        updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(1, 2).put(direction, 3));
        assert.deepEqual([sync.local.x, sync.local.y], [3200 + dx, 3200 + dy]);
        assert.equal(sync.local.moving, true); assert.equal(sync.local.teleported, false);
    }
    const sync = initialized();
    updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(1, 2).put(6, 3));
    assert.equal(sync.local.orientation, 1024); // North; client angle zero faces south.
});

test("all sixteen run directions use the run perimeter", () => {
    const expected = [[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[-2,-1],[2,-1],[-2,0],
        [2,0],[-2,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2]];
    expected.forEach(([dx, dy], direction) => {
        const sync = initialized();
        updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(2, 2).put(direction, 4));
        assert.deepEqual([sync.local.x, sync.local.y], [3200 + dx, 3200 + dy]);
    });
});

test("near teleports sign extend coordinates and wrap plane", () => {
    const sync = initialized({plane: 3});
    updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(3, 2).put(0, 1)
        .put(1 << 10 | 31 << 5 | 16, 12));
    assert.deepEqual([sync.local.x, sync.local.y, sync.local.plane], [3199, 3184, 0]);
    assert.equal(sync.local.teleported, true);
});

test("far teleports wrap 14-bit coordinates", () => {
    const sync = initialized({x: 16383, y: 1, plane: 2});
    updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(3, 2).put(1, 1)
        .put(3 << 28 | 2 << 14 | 16382, 30));
    assert.deepEqual([sync.local.x, sync.local.y, sync.local.plane], [1, 16383, 1]);
});

test("appearance mask reverses bytes and reads rev240 equipment and animations", () => {
    const bytes = appearance(), sync = initialized();
    updateLocal(sync, new Bits().put(1, 1).put(1, 1).put(0, 2), [4, (128 - bytes.length) & 255, ...bytes.toReversed()]);
    assert.equal(sync.local.appearance.name, "Fixture");
    assert.equal(sync.local.appearance.equipment[0], 265); // Kit 9 +256.
    assert.equal(sync.local.appearance.equipment[3], 2148); // Item 100 +2048.
    assert.deepEqual(sync.local.appearance.animations, {idle: 808, turn: 823, walk: 819,
        walkBack: 820, walkLeft: 821, walkRight: 822, run: 824});
    assert.deepEqual(sync.local.appearance.colours, [2, 3, 4, 5, 6]);
    assert.equal(sync.local.appearance.skullIcon, -1);
});

test("appearance handles NPC transform and slot customisations", () => {
    assert.equal(decodeAppearance(appearance({npc: true})).transformedNpcId, 42);
    const parsed = decodeAppearance(appearance({custom: true}));
    assert.equal(parsed.forceRefresh, true);
    assert.deepEqual(parsed.customisations[0], {recolours: [{index: 0, value: 500}], retextures: [{index: 1, value: 600}]});
    assert.throws(() => decodeAppearance(appearance().subarray(0, 20)), /Truncated/);
});

test("extended movement speed, sequence and facing retain exact transforms", () => {
    const sync = initialized();
    // FACE, SEQUENCE, MOVE_SPEED, TEMP_MOVE_SPEED, SAY; face precedes speed/sequence.
    const mask = 0x4851;
    updateLocal(sync, new Bits().put(1, 1).put(1, 1).put(1, 2).put(4, 3),
        [mask & 255 | 128, mask >>> 8, 16, ...u16(32768 + 512), 126, 254,
            ...lea(1234), 133, ...str("Hello")]);
    assert.equal(sync.local.orientation, 512); assert.equal(sync.local.moveSpeed, 2);
    assert.equal(sync.local.temporaryMoveSpeed, 2);
    assert.deepEqual(sync.local.sequence, {id: 1234, delay: 5});
    assert.equal(sync.local.overheadText, "Hello");
});

test("low-resolution promotion applies recursive plane update and reuses cached appearance", () => {
    const sync = initialized({otherRegions: {2: 1 << 8 | 1}});
    sync.appearances[2] = {name: "Cached"};
    const high = new Bits().put(0, 1).put(0, 2).bytes();
    const low = new Bits().put(1, 1).put(0, 2).put(1, 1).put(1, 2).put(2, 2)
        .put(2, 13).put(3, 13).put(0, 1).put(0, 1).put(3, 2).put(2044, 11).bytes();
    sync.decode(concat(high, low));
    assert.deepEqual([sync.players[2].x, sync.players[2].y, sync.players[2].plane], [8194, 8195, 2]);
    assert.equal(sync.players[2].appearance.name, "Cached"); assert.deepEqual(sync.high, [1, 2]);
});

test("every revision240 mask consumes its bytes in protocol order", () => {
    const sync = initialized(), bytes = appearance();
    const masks = concat([0xfd, 0xfe, 0x1f],
        [129, 255, ...le(22), 0, 10, 0, 3, 127], // spotanim
        [...u16(13 << 8 | 5), 129, 255, 130, 130, 129, 252], // compressed chat and pattern
        [127, 1, 2, 1, 30, 216], // headbar
        [(128 - bytes.length) & 255, ...bytes.toReversed()],
        [0, 228, ...le(200), 255], // freeze
        [8, 100, 101, 17], // face location
        [...str("A"), ...str("B"), ...str("C")],
        [127, 255], // persistent and temporary move speed
        [127, 129, ...le(22), 3, 0, 10, 0], // old spotanim
        [255, 127, 126, 255, 138, 133, 127], // transparency
        [1, 1, 2, 3, 4], // hitmark
        [255, 130, 3, 4, ...lea(5), ...lea(6), ...lea(7)], // exact movement
        [...lea(819), 131],
        [...le(1), ...lea(2), 3, 124, 251, 134], // tint
        [255, ...str("All masks")]);
    updateLocal(sync, new Bits().put(1, 1).put(1, 1).put(0, 2), masks);
    assert.deepEqual(Array.from(sync.local.chat.compressed), [1, 2]);
    assert.deepEqual(sync.local.chat.pattern, [4]);
    assert.deepEqual(sync.local.freeze, {delay: 100, duration: 200, cancelSequence: true});
    assert.deepEqual(sync.local.facing, {kind: 1, walkType: 0, instant: false, x: 100, y: 101, size: 17});
    assert.deepEqual(sync.local.spotanims, [{slot: 1, id: 22, height: 10, delay: 3, loop: false}]);
    assert.deepEqual(sync.local.exactMove, {dx1: -1, dy1: -2, dx2: 3, dy2: 4, delay1: 5, delay2: 6, direction: 7});
    assert.equal(sync.local.transparency.start, -1); assert.equal(sync.local.transparency.end, -2);
    assert.equal(sync.local.tinting.hue, -3); assert.equal(sync.local.tinting.saturation, -4);
    assert.equal(sync.local.overheadText, "All masks");
});

test("malformed packet rejects atomically and permits the next valid update", () => {
    const sync = initialized(), local = sync.local;
    assert.throws(() => sync.decode(new Uint8Array()), /Truncated/);
    assert.equal(sync.local, local);
    assert.throws(() => updateLocal(sync, new Bits().put(1, 1).put(1, 1).put(0, 2), [2]), /Unknown/);
    assert.equal(sync.local, local);
    assert.throws(() => sync.decode(concat(new Bits().put(0, 1).put(3, 2).put(1, 11).bytes())), /skip count/);
    updateLocal(sync, new Bits().put(1, 1).put(0, 1).put(1, 2).put(4, 3));
    assert.equal(sync.local.x, 3201);
});

test("PacketReader bounds and byte transforms are independently verified", () => {
    const reader = new PacketReader([129, 255, 125, ...le(1234), 0x12, 0xb4, ...lea(4321)]);
    assert.equal(reader.u8(1), 1); assert.equal(reader.u8(2), 1); assert.equal(reader.u8(3), 3);
    assert.equal(reader.u16(1), 1234); assert.equal(reader.u16(2), 0x1234); assert.equal(reader.u16(3), 4321);
    assert.throws(() => reader.u8(), /Truncated/);
    const bitReader = new PacketReader([255]);
    assert.equal(bitReader.bits(3), 7); assert.throws(() => bitReader.u8(), /alignment/);
    bitReader.align(); assert.equal(bitReader.offset, 1);
});
