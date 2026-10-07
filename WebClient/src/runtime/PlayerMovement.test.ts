import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FinePlayerMovement,
  interpolateFineCoordinate,
  selectWalkLocomotion,
  tileToFine,
} from './PlayerMovement';

test('queues a one-tile waypoint without teleporting fine coordinates', () => {
  const movement = new FinePlayerMovement(3200, 3200);
  movement.enqueueTile(3201, 3200, false);

  const queued = movement.snapshot();
  assert.equal(queued.fineX, tileToFine(3200));
  assert.equal(queued.fineZ, tileToFine(3200));
  assert.equal(queued.routeLength, 1);

  movement.tick();
  const moved = movement.snapshot();
  // First turning tick mirrors route_move's 2-unit walk step.
  assert.equal(moved.fineX, tileToFine(3200) + 2);
  assert.equal(moved.fineZ, tileToFine(3200));
  assert.equal(moved.dstYaw, 1536);
  assert.equal(moved.yaw, 2016);
  assert.equal(moved.locomotion, 'walk-left');
});

test('run waypoints double the movement step', () => {
  const walk = new FinePlayerMovement(3200, 3200);
  const run = new FinePlayerMovement(3200, 3200);
  walk.enqueueTile(3201, 3200, false);
  run.enqueueTile(3202, 3200, true);

  walk.tick();
  run.tick();

  assert.equal(
    run.snapshot().fineX - tileToFine(3200),
    (walk.snapshot().fineX - tileToFine(3200)) * 2,
  );
  assert.equal(run.snapshot().locomotion, 'run');
});

test('selects classic directional walk poses from dstYaw - yaw', () => {
  assert.equal(selectWalkLocomotion(0, 0), 'walk-forward');
  assert.equal(selectWalkLocomotion(0, 512), 'walk-right');
  assert.equal(selectWalkLocomotion(0, 1536), 'walk-left');
  assert.equal(selectWalkLocomotion(0, 1024), 'walk-back');
});

test('fine-coordinate interpolation follows previous + delta * alpha', () => {
  assert.equal(interpolateFineCoordinate(100, 140, 0), 100);
  assert.equal(interpolateFineCoordinate(100, 140, 0.25), 110);
  assert.equal(interpolateFineCoordinate(100, 140, 0.5), 120);
  assert.equal(interpolateFineCoordinate(100, 140, 1), 140);
  assert.equal(interpolateFineCoordinate(100, 140, -1), 100);
  assert.equal(interpolateFineCoordinate(100, 140, 2), 140);
});

test('render state interpolates between fixed simulation ticks', () => {
  const movement = new FinePlayerMovement(3200, 3200);
  movement.enqueueTile(3201, 3200, false);
  movement.tick();

  const render = movement.renderState(0.5);
  assert.equal(render.fineX, tileToFine(3200) + 1);
  assert.equal(render.fineZ, tileToFine(3200));
});

test('render interpolation does not mutate fixed simulation state', () => {
  const movement = new FinePlayerMovement(3200, 3200);
  movement.enqueueTile(3201, 3200, false);
  movement.tick();

  const before = movement.snapshot();
  movement.renderState(0.25);
  movement.renderState(0.5);
  movement.renderState(0.75);
  const after = movement.snapshot();

  assert.deepEqual(after, before);
});

test('large discontinuities snap and clear the route', () => {
  const movement = new FinePlayerMovement(3200, 3200);
  movement.enqueueTile(3201, 3200, false);
  movement.teleportTile(3300, 3300);

  const snapshot = movement.snapshot();
  assert.equal(snapshot.routeLength, 0);
  assert.equal(snapshot.fineX, tileToFine(3300));
  assert.equal(snapshot.previousFineX, tileToFine(3300));
});
