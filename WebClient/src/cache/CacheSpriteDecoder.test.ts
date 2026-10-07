import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cacheSpriteToRgba,
  decodeCacheSpriteGroup,
} from './CacheSpriteDecoder';

test('decodes indexed cache sprites and transparent palette index zero', () => {
  const bytes = makeSpriteGroup({
    width: 2,
    height: 2,
    indices: [1, 2, 0, 1],
    palette: [0x112233, 0xaabbcc],
  });

  const [sprite] = decodeCacheSpriteGroup(bytes);
  assert.ok(sprite);
  assert.equal(sprite.sheetWidth, 2);
  assert.equal(sprite.sheetHeight, 2);
  assert.deepEqual(Array.from(sprite.indices), [1, 2, 0, 1]);

  const rgba = cacheSpriteToRgba(sprite);
  assert.deepEqual(Array.from(rgba.slice(0, 4)), [0x11, 0x22, 0x33, 0xff]);
  assert.deepEqual(Array.from(rgba.slice(4, 8)), [0xaa, 0xbb, 0xcc, 0xff]);
  assert.deepEqual(Array.from(rgba.slice(8, 12)), [0, 0, 0, 0]);
});

test('decodes cache sprite alpha planes', () => {
  const bytes = makeSpriteGroup({
    width: 2,
    height: 1,
    indices: [1, 1],
    alpha: [0x40, 0xff],
    palette: [0xabcdef],
  });

  const [sprite] = decodeCacheSpriteGroup(bytes);
  assert.ok(sprite);
  assert.deepEqual(Array.from(sprite.alpha ?? []), [0x40, 0xff]);

  const rgba = cacheSpriteToRgba(sprite);
  assert.equal(rgba[3], 0x40);
  assert.equal(rgba[7], 0xff);
});

interface TestSprite {
  width: number;
  height: number;
  indices: number[];
  alpha?: number[];
  palette: number[];
}

function makeSpriteGroup(sprite: TestSprite): Uint8Array {
  const pixels: number[] = [
    sprite.alpha ? 0x02 : 0x00,
    ...sprite.indices,
    ...(sprite.alpha ?? []),
  ];
  const palette: number[] = [];

  for (const rgb of sprite.palette) {
    palette.push(
      (rgb >>> 16) & 0xff,
      (rgb >>> 8) & 0xff,
      rgb & 0xff,
    );
  }

  const metadata: number[] = [];
  pushU16(metadata, sprite.width);
  pushU16(metadata, sprite.height);
  metadata.push(sprite.palette.length);
  pushU16(metadata, 0);
  pushU16(metadata, 0);
  pushU16(metadata, sprite.width);
  pushU16(metadata, sprite.height);

  const output = [
    ...pixels,
    ...palette,
    ...metadata,
  ];
  pushU16(output, 1);
  return Uint8Array.from(output);
}

function pushU16(output: number[], value: number): void {
  output.push((value >>> 8) & 0xff, value & 0xff);
}
