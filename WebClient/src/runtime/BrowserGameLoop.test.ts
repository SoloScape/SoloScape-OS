import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BrowserGameLoop,
  CLIENT_TICK_MS,
} from './BrowserGameLoop';

test('runs fixed 20ms simulation ticks while rendering every frame', () => {
  const ticks: number[] = [];
  const frames: Array<{ alpha: number; timestamp: number }> = [];
  const loop = new BrowserGameLoop({
    update: (tickMs) => ticks.push(tickMs),
    render: (alpha, timestamp) => {
      frames.push({ alpha, timestamp });
    },
  });

  loop.stepFrame(1000);
  loop.stepFrame(1008);
  loop.stepFrame(1016);
  loop.stepFrame(1024);

  assert.deepEqual(ticks, [CLIENT_TICK_MS]);
  assert.equal(frames.length, 4);
  assert.equal(frames[3]!.timestamp, 1024);
  assert.equal(frames[3]!.alpha, 0.2);
});

test('catches up multiple client ticks without skipping display frames', () => {
  let ticks = 0;
  let frames = 0;
  const loop = new BrowserGameLoop({
    update: () => {
      ticks += 1;
    },
    render: () => {
      frames += 1;
    },
  });

  loop.stepFrame(0);
  loop.stepFrame(65);

  assert.equal(ticks, 3);
  assert.equal(frames, 2);
  assert.equal(loop.getStats().interpolationAlpha, 0.25);
});

test('bounds foreground catch-up work after a long frame', () => {
  let ticks = 0;
  const loop = new BrowserGameLoop(
    {
      update: () => {
        ticks += 1;
      },
      render: () => {},
    },
    CLIENT_TICK_MS,
    4,
  );

  loop.stepFrame(0);
  loop.stepFrame(1000);

  assert.equal(ticks, 4);
  assert.ok(loop.getStats().droppedCatchUpMs > 0);
  assert.ok(loop.getStats().interpolationAlpha < 1);
});

test('resetTiming prevents background time from becoming simulation debt', () => {
  let ticks = 0;
  const loop = new BrowserGameLoop({
    update: () => {
      ticks += 1;
    },
    render: () => {},
  });

  loop.stepFrame(0);
  loop.stepFrame(20);
  assert.equal(ticks, 1);

  loop.resetTiming();
  loop.stepFrame(10_000);
  assert.equal(ticks, 1);
});
