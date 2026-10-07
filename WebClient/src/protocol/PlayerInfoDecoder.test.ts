import assert from 'node:assert/strict';
import test from 'node:test';
import { Rev240PlayerInfoDecoder } from './PlayerInfoDecoder';
import type { PlayerInfoInitBlock } from './RegionRebuildDecoder';
import { tileToFine } from '../runtime/PlayerMovement';

test('PLAYER_INFO moves the initialized local player by one tile', () => {
  const decoder = new Rev240PlayerInfoDecoder(1);
  decoder.initialize(initBlock(1, 0, 3200, 3200));

  const highPass = new BitWriter();
  highPass.writeBits(1, 1); // active
  highPass.writeBits(1, 0); // no extended info
  highPass.writeBits(2, 1); // one-tile movement
  highPass.writeBits(3, 4); // east

  const lowPass = allLowResolutionPlayersIdle();
  const update = decoder.decode(
    concat(highPass.finish(), lowPass),
  );

  assert.equal(update.localPlayerMoved, true);
  assert.deepEqual(update.localPlayer.coord, {
    level: 0,
    x: 3201,
    z: 3200,
  });
  assert.equal(update.localPlayerAppearanceChanged, false);

  // PLAYER_INFO advances the authoritative tile immediately, but rendering
  // remains at the old fine-coordinate position until the 20ms client tick.
  assert.deepEqual(
    decoder.getLocalPlayerRenderState(1),
    {
      level: 0,
      fineX: tileToFine(3200),
      fineZ: tileToFine(3200),
      yaw: 0,
    },
  );

  decoder.tickMovement();
  const moved = decoder.getLocalPlayerRenderState(1);
  assert.equal(moved?.fineX, tileToFine(3200) + 2);
  assert.equal(moved?.fineZ, tileToFine(3200));
  assert.equal(moved?.yaw, 2016);
});

test('PLAYER_INFO two-tile movement enqueues a run waypoint', () => {
  const decoder = new Rev240PlayerInfoDecoder(1);
  decoder.initialize(initBlock(1, 0, 3200, 3200));

  const highPass = new BitWriter();
  highPass.writeBits(1, 1); // active
  highPass.writeBits(1, 0); // no extended info
  highPass.writeBits(2, 2); // two-tile movement / run
  highPass.writeBits(4, 8); // east by two tiles

  const update = decoder.decode(
    concat(highPass.finish(), allLowResolutionPlayersIdle()),
  );
  assert.deepEqual(update.localPlayer.coord, {
    level: 0,
    x: 3202,
    z: 3200,
  });

  decoder.tickMovement();
  const moved = decoder.getLocalPlayerRenderState(1);
  // Turning walk step 2, doubled for a run waypoint.
  assert.equal(moved?.fineX, tileToFine(3200) + 4);
  assert.equal(moved?.fineZ, tileToFine(3200));
});

test('PLAYER_INFO teleport movement snaps fine coordinates', () => {
  const decoder = new Rev240PlayerInfoDecoder(1);
  decoder.initialize(initBlock(1, 0, 3200, 3200));

  const highPass = new BitWriter();
  highPass.writeBits(1, 1); // active
  highPass.writeBits(1, 0); // no extended info
  highPass.writeBits(2, 3); // teleport
  highPass.writeBits(1, 0); // 12-bit relative teleport
  highPass.writeBits(12, 4 << 5); // +4 x, +0 z

  decoder.decode(
    concat(highPass.finish(), allLowResolutionPlayersIdle()),
  );

  assert.deepEqual(
    decoder.getLocalPlayerRenderState(1),
    {
      level: 0,
      fineX: tileToFine(3204),
      fineZ: tileToFine(3200),
      yaw: 0,
    },
  );
});

test('PLAYER_INFO decodes the local appearance block', () => {
  const decoder = new Rev240PlayerInfoDecoder(1);
  decoder.initialize(initBlock(1, 0, 3200, 3200));

  const highPass = new BitWriter();
  highPass.writeBits(1, 1); // active
  highPass.writeBits(1, 1); // extended info follows
  highPass.writeBits(2, 0); // stationary high-resolution player

  const appearance = encodeAppearance();
  const reversed = appearance.slice();
  reversed.reverse();

  const packet = concat(
    highPass.finish(),
    allLowResolutionPlayersIdle(),
    Uint8Array.of(0x04), // APPEARANCE
    Uint8Array.of((128 - appearance.length) & 0xff), // p1Alt3
    reversed,
  );

  const update = decoder.decode(packet);
  assert.equal(update.localPlayerMoved, false);
  assert.equal(update.localPlayerAppearanceChanged, true);
  assert.equal(update.localPlayer.appearance?.name, 'Web Test');
  assert.equal(update.localPlayer.appearance?.combatLevel, 3);
  assert.deepEqual(
    update.localPlayer.appearance?.identKit.slice(0, 7),
    [265, 270, 365, 282, 289, 292, 298],
  );
});

function initBlock(
  localPlayerIndex: number,
  level: number,
  x: number,
  z: number,
): PlayerInfoInitBlock {
  return {
    localPlayerIndex,
    localPlayerCoord: { level, x, z },
    lowResolutionPositions: new Uint32Array(2048),
  };
}

function allLowResolutionPlayersIdle(): Uint8Array {
  // There are 2046 low-resolution slots when local index is 1.
  // The first slot is stationary and skips the remaining 2045.
  const writer = new BitWriter();
  writer.writeBits(1, 0);
  writer.writeBits(2, 3);
  writer.writeBits(11, 2045);
  return writer.finish();
}

function encodeAppearance(): Uint8Array {
  const bytes: number[] = [];
  bytes.push(0, 0xff, 0xff);

  const slots = [265, 270, 365, 282, 289, 292, 298, 0, 0, 0, 0, 0];
  for (const value of slots) {
    if (value === 0) {
      bytes.push(0);
    } else {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }
  }

  // Interface appearance.
  bytes.push(...new Array(12).fill(0));
  // Five body colours.
  bytes.push(0, 3, 2, 0, 0);

  // Seven base-animation ids.
  for (let i = 0; i < 7; i += 1) {
    bytes.push(0xff, 0xff);
  }

  pushString(bytes, 'Web Test');
  bytes.push(3); // combat level
  bytes.push(0, 0); // skill level
  bytes.push(0); // hidden
  bytes.push(0, 0); // no object customisations
  pushString(bytes, '');
  pushString(bytes, '');
  pushString(bytes, '');
  bytes.push(0); // text gender

  return Uint8Array.from(bytes);
}

function pushString(bytes: number[], value: string): void {
  for (const char of value) {
    bytes.push(char.charCodeAt(0));
  }
  bytes.push(0);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

class BitWriter {
  private readonly bits: number[] = [];

  writeBits(count: number, value: number): void {
    for (let shift = count - 1; shift >= 0; shift -= 1) {
      this.bits.push((value >>> shift) & 1);
    }
  }

  finish(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let index = 0; index < this.bits.length; index += 1) {
      bytes[index >>> 3] |=
        this.bits[index]! << (7 - (index & 7));
    }
    return bytes;
  }
}
