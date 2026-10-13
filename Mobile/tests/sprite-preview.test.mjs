import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32, gzipSync } from "node:zlib";
import { NativeJs5Cache } from "../browser/native-js5.mjs";
import {
    decodeIndexedSprites, decodeReferenceSingleFileGroups,
    drawIndexedSprite, loadFirstSprite,
} from "../browser/sprite-preview.mjs";

function spriteFixture({ column = false, alpha = false } = {}) {
    // Sheet 3x2; 1 frame at x=1,y=0 with sub-dimensions 2x2.
    // Pixel RGB indices, row-major: [1, 0, 2, 1]
    const indices = column ? [1, 2, 0, 1] : [1, 0, 2, 1];
    const alphas = column ? [255, 128, 0, 64] : [255, 0, 128, 64];
    const pixel = Buffer.from([Number(column) | (Number(alpha) << 1), ...indices, ...(alpha ? alphas : [])]);
    const palette = Buffer.from([0x11, 0x22, 0x33, 0x55, 0x66, 0x77]);
    const metadata = Buffer.alloc(13);
    metadata.writeUInt16BE(3, 0);
    metadata.writeUInt16BE(2, 2);
    metadata[4] = 2; // palette size minus 1
    metadata.writeUInt16BE(1, 5);  // x offset
    metadata.writeUInt16BE(0, 7);  // y offset
    metadata.writeUInt16BE(2, 9);  // width
    metadata.writeUInt16BE(2, 11); // height
    return Buffer.concat([pixel, palette, metadata, Buffer.from([0, 1])]);
}
function container(body, compressed = true) {
    const value = compressed ? gzipSync(body) : body;
    const head = Buffer.alloc(compressed ? 9 : 5);
    head[0] = compressed ? 2 : 0;
    head.writeUInt32BE(value.length, 1);
    if (compressed) head.writeUInt32BE(body.length, 5);
    return Buffer.concat([head, value]);
}
function result(archive, group, body) {
    return {
        archive, group, compression: body[0], container: Uint8Array.from(body),
        uncompressedBytes: body[0] === 0 ? body.readUInt32BE(1) : body.readUInt32BE(5),
    };
}
function spriteReference(spriteGroup, { flags = 0, extraGroup = null } = {}) {
    const ids = extraGroup === null ? [0] : [0, extraGroup];
    const count = ids.length;
    const header = Buffer.alloc(8);
    header[0] = 7;
    header.writeUInt32BE(123456, 1);
    header[5] = flags;
    header.writeUInt16BE(count, 6);
    const deltas = ids.flatMap((id, i) => [0, i ? id : 0]);
    const names = (flags & 1) ? Buffer.alloc(4 * count) : Buffer.alloc(0);
    const crcs = Buffer.alloc(count * 4);
    crcs.writeUInt32BE(crc32(spriteGroup), 0);
    const versions = Buffer.alloc(count * 4);
    const counts = Buffer.alloc(count * 2);
    counts.writeUInt16BE(1, 0);
    if (count > 1) counts.writeUInt16BE(2, 2);
    const fileIDs = count > 1 ? Buffer.from([0, 0, 0, 0, 0, 1]) : Buffer.from([0, 0]);
    const fileNames = (flags & 1) ? Buffer.alloc((count === 1 ? 1 : 3) * 4) : Buffer.alloc(0);
    return Buffer.concat([header, Buffer.from(deltas), names, crcs, versions, counts, fileIDs, fileNames]);
}
test("OSRS sprite renderer decodes palette colours, transparency, sprite bounds", () => {
    const images = decodeIndexedSprites(spriteFixture());
    assert.equal(images.length, 1);
    assert.deepEqual(
        {x: images[0].x, y: images[0].y, width: images[0].width, height: images[0].height,
         sheetWidth: images[0].sheetWidth, sheetHeight: images[0].sheetHeight},
        {x:1,y:0,width:2,height:2,sheetWidth:3,sheetHeight:2},
    );
    assert.deepEqual(Array.from(images[0].rgba), [
        0x11,0x22,0x33,255, 0,0,0,0,
        0x55,0x66,0x77,255, 0x11,0x22,0x33,255,
    ]);
});
test("OSRS sprite decoder handles column-major pixels and explicit alpha", () => {
    const images = decodeIndexedSprites(spriteFixture({column:true,alpha:true}));
    assert.deepEqual(Array.from(images[0].rgba), [
        0x11,0x22,0x33,255, 0,0,0,0,
        0x55,0x66,0x77,128, 0x11,0x22,0x33,64,
    ]);
});
test("OSRS sprite decoder refuses malformed offsets, palette indices and sprite counts", () => {
    const sprite = spriteFixture();
    const impossible = Buffer.from(sprite);
    impossible.writeUInt16BE(3000, impossible.length - 7 - 8);
    assert.throws(() => decodeIndexedSprites(impossible), /Unsafe/);
    const badCount = Buffer.from(sprite);
    badCount.writeUInt16BE(513, badCount.length - 2);
    assert.throws(() => decodeIndexedSprites(badCount), /sprite count/);
    const wrongPalette = Buffer.from(sprite);
    wrongPalette[1] = 250;
    assert.throws(() => decodeIndexedSprites(wrongPalette), /palette index/);
    const unsupported = Buffer.from(sprite);
    unsupported[0] = 4;
    assert.throws(() => decodeIndexedSprites(unsupported), /storage layout/);
});
test("Canvas receives decoded real image data with sprite sheet offsets", () => {
    const frame = decodeIndexedSprites(spriteFixture())[0];
    let observed;
    const canvas = {
        width:0, height:0,
        getContext() {
            return {
                createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
                clearRect(...a){observed = {...observed,cleared:a};},
                putImageData(image,x,y){observed={...observed,image,x,y};},
            };
        },
    };
    drawIndexedSprite(canvas,frame);
    assert.equal(canvas.width,3);
    assert.equal(canvas.height,2);
    assert.equal(observed.image.width,2);
    assert.deepEqual([observed.x,observed.y],[1,0]);
    assert.deepEqual([...observed.image.data],[...frame.rgba]);
});
test("Reference-table file scanner honors 7-format file counts and name hashes", () => {
    const one = container(spriteFixture());
    const ref = spriteReference(one,{flags:1,extraGroup:8});
    const files = decodeReferenceSingleFileGroups(ref);
    assert.equal(files.groupCount,2);
    assert.deepEqual(files.singleFile,[{group:0,fileId:0}]);
    assert.equal(files.revision,123456);
    const invalid=Buffer.from(ref);
    invalid[invalid.length - 1]=10;
    // final name hashes can legitimately be any bytes, so trailing malformed only
    assert.throws(() => decodeReferenceSingleFileGroups(Buffer.concat([invalid,Buffer.from([1])])),/trailing/);
});
test("Browser sprite loading resolves verified JS5 archive 8, group 0 into RGBA Canvas pixels", async () => {
    const picture = spriteFixture();
    const group = container(picture);
    const reference = container(spriteReference(group));
    const master = Buffer.alloc(9*8);
    master.writeUInt32BE(crc32(reference),8*8);
    master.writeUInt32BE(123456,8*8+4);
    const masterGroup = container(master,false);
    const native = new NativeJs5Cache({WebSocketClass:class Mock {}});
    const requests=[];
    native.fetchRawGroup=async (a,g)=>{
        requests.push(`${a}:${g}`);
        if(a===255&&g===255)return result(a,g,masterGroup);
        if(a===255&&g===8)return result(a,g,reference);
        if(a===8&&g===0)return result(a,g,group);
        throw new Error("unexpected fixture request");
    };
    const loaded=await loadFirstSprite(native);
    assert.equal(loaded.archive,8);
    assert.equal(loaded.group,0);
    assert.equal(loaded.frameCount,1);
    assert.deepEqual([...loaded.frame.rgba],[...decodeIndexedSprites(picture)[0].rgba]);
    assert.deepEqual(requests,["255:255","255:8","8:0"]);
});
