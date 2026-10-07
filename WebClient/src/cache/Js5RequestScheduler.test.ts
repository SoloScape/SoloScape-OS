import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Js5RequestScheduler,
  type Js5ScheduledRequest,
} from './Js5RequestScheduler';
import type { Js5GroupResponse } from './Js5Protocol';

test('bounds JS5 requests and drains queued work as responses arrive', async () => {
  const sent: Js5ScheduledRequest[] = [];
  const scheduler = new Js5RequestScheduler(
    (request) => sent.push(request),
    {
      maxInFlight: 2,
      requestTimeoutMs: 1_000,
      maxRetries: 0,
    },
  );

  const first = scheduler.schedule(2, 10);
  const second = scheduler.schedule(2, 11);
  const third = scheduler.schedule(2, 12);

  assert.equal(sent.length, 2);
  assert.equal(scheduler.inFlightCount, 2);
  assert.equal(scheduler.queuedCount, 1);

  assert.equal(scheduler.accept(response(2, 11)), true);
  assert.equal(sent.length, 3);
  assert.equal(sent[2]?.group, 12);

  assert.equal(scheduler.accept(response(2, 10)), true);
  assert.equal(scheduler.accept(response(2, 12)), true);

  const resolved = await Promise.all([first, second, third]);
  assert.deepEqual(
    resolved.map((item) => item.group),
    [10, 11, 12],
  );
  assert.equal(scheduler.pendingCount, 0);
  assert.equal(scheduler.inFlightCount, 0);
});

test('deduplicates callers requesting the same archive/group', async () => {
  const sent: Js5ScheduledRequest[] = [];
  const scheduler = new Js5RequestScheduler(
    (request) => sent.push(request),
    {
      maxInFlight: 4,
      requestTimeoutMs: 1_000,
      maxRetries: 0,
    },
  );

  const first = scheduler.schedule(7, 42);
  const second = scheduler.schedule(7, 42);

  assert.equal(first, second);
  assert.equal(sent.length, 1);

  scheduler.accept(response(7, 42));

  const [left, right] = await Promise.all([first, second]);
  assert.equal(left, right);
});

test('retries timed-out requests without exceeding the attempt limit', async () => {
  const sent: Js5ScheduledRequest[] = [];
  const scheduler = new Js5RequestScheduler(
    (request) => sent.push(request),
    {
      maxInFlight: 1,
      requestTimeoutMs: 5,
      maxRetries: 1,
    },
  );

  const pending = scheduler.schedule(3, 9);

  await assert.rejects(pending, /timed out/);

  assert.equal(sent.length, 2);
  assert.deepEqual(
    sent.map((request) => request.attempt),
    [1, 2],
  );
  assert.equal(scheduler.pendingCount, 0);
  assert.equal(scheduler.inFlightCount, 0);
});

test('cancels queued and in-flight requests together', async () => {
  const scheduler = new Js5RequestScheduler(
    () => {},
    {
      maxInFlight: 1,
      requestTimeoutMs: 1_000,
      maxRetries: 0,
    },
  );

  const first = scheduler.schedule(1, 1);
  const second = scheduler.schedule(1, 2);

  scheduler.cancelAll(new Error('socket closed'));

  await assert.rejects(first, /socket closed/);
  await assert.rejects(second, /socket closed/);
  assert.equal(scheduler.pendingCount, 0);
  assert.equal(scheduler.queuedCount, 0);
  assert.equal(scheduler.inFlightCount, 0);
});

function response(
  archive: number,
  group: number,
): Js5GroupResponse {
  return {
    archive,
    group,
    compression: 0,
    size: 0,
    container: new Uint8Array([0, 0, 0, 0, 0]),
  };
}
