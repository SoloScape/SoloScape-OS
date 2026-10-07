import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ORBIT_CAMERA_DEFAULT_ZOOM,
  OrbitCamera,
} from './OrbitCamera';

test('follow camera eases orbit centre by one sixteenth per tick', () => {
  const camera = new OrbitCamera();
  camera.reset(1000, 2000);
  camera.tick(1160, 1840);

  const state = camera.snapshot();
  assert.equal(state.orbitX, 1010);
  assert.equal(state.orbitZ, 1990);
});

test('follow camera snaps when target delta exceeds 500 units', () => {
  const camera = new OrbitCamera();
  camera.reset(1000, 2000);
  camera.tick(1600, 2600);

  const state = camera.snapshot();
  assert.equal(state.orbitX, 1600);
  assert.equal(state.orbitZ, 2600);
});

test('arrow keys approach Olden-Shire yaw and pitch velocity targets', () => {
  const camera = new OrbitCamera();
  camera.reset(0, 0);
  camera.setArrowHeld('right', true);
  camera.setArrowHeld('up', true);
  camera.tick(0, 0);

  const state = camera.snapshot();
  assert.equal(state.yawVelocity, 12);
  assert.equal(state.pitchVelocity, 6);
  assert.equal(state.yaw, 6);
  assert.equal(state.pitch, 259);
});

test('released arrow velocities damp by one half per tick', () => {
  const camera = new OrbitCamera();
  camera.reset(0, 0);
  camera.setArrowHeld('right', true);
  camera.tick(0, 0);
  camera.setArrowHeld('right', false);
  camera.tick(0, 0);

  const state = camera.snapshot();
  assert.equal(state.yawVelocity, 6);
  assert.equal(state.yaw, 9);
});

test('drag rotates and pitches while wheel/pinch delta changes zoom', () => {
  const camera = new OrbitCamera();
  camera.reset(0, 0);
  camera.queueDrag(30, 20);
  camera.queueZoom(160);
  camera.tick(0, 0);

  const state = camera.snapshot();
  assert.equal(state.yaw, 2018);
  assert.equal(state.pitch, 266);
  assert.equal(state.zoom, ORBIT_CAMERA_DEFAULT_ZOOM + 160);
});

test('render camera interpolates orbit state and cam-follow distance', () => {
  const camera = new OrbitCamera();
  camera.reset(0, 0);
  camera.tick(160, 0);

  const render = camera.renderState(0.5, 100);
  assert.equal(render.orbitX, 5);
  assert.equal(render.orbitZ, 0);
  assert.equal(render.targetX, 5);
  assert.equal(render.targetY, 100);
  assert.ok(render.eyeY > render.targetY);
  assert.ok(
    Math.hypot(
      render.eyeX - render.targetX,
      render.eyeY - render.targetY,
      render.eyeZ - render.targetZ,
    ) > 1000,
  );
});

test('pitch and zoom stay inside camera bounds', () => {
  const camera = new OrbitCamera();
  camera.reset(0, 0);
  camera.queueDrag(0, -10000);
  camera.queueZoom(-10000);
  camera.tick(0, 0);
  let state = camera.snapshot();
  assert.equal(state.pitch, 128);
  assert.equal(state.zoom, 400);

  camera.queueDrag(0, 10000);
  camera.queueZoom(10000);
  camera.tick(0, 0);
  state = camera.snapshot();
  assert.equal(state.pitch, 383);
  assert.equal(state.zoom, 3000);
});
