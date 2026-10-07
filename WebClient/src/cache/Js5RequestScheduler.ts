import {
  js5GroupKey,
  type Js5GroupResponse,
} from './Js5Protocol';

export interface Js5ScheduledRequest {
  archive: number;
  group: number;
  urgent: boolean;
  attempt: number;
}

export interface Js5RequestSchedulerOptions {
  maxInFlight?: number;
  requestTimeoutMs?: number;
  maxRetries?: number;
}

type PendingState = 'queued' | 'in-flight' | 'complete';

interface PendingRequest {
  key: string;
  archive: number;
  group: number;
  urgent: boolean;
  attempts: number;
  state: PendingState;
  timer: ReturnType<typeof setTimeout> | null;
  promise: Promise<Js5GroupResponse>;
  resolve: (response: Js5GroupResponse) => void;
  reject: (error: Error) => void;
}

/**
 * Bounded request queue for the JS5 protocol.
 *
 * JS5 responses are identified by archive/group rather than a request id, so
 * duplicate callers share one pending request. Timeouts release their in-flight
 * slot and retry the same archive/group without allowing the queue to exceed the
 * configured concurrency bound.
 */
export class Js5RequestScheduler {
  readonly maxInFlight: number;
  readonly requestTimeoutMs: number;
  readonly maxRetries: number;

  private readonly pending = new Map<string, PendingRequest>();
  private readonly queue: PendingRequest[] = [];
  private inFlight = 0;

  constructor(
    private readonly sendRequest: (request: Js5ScheduledRequest) => void,
    options: Js5RequestSchedulerOptions = {},
  ) {
    this.maxInFlight = options.maxInFlight ?? 8;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;

    if (!Number.isInteger(this.maxInFlight) || this.maxInFlight < 1) {
      throw new RangeError('JS5 maxInFlight must be a positive integer.');
    }
    if (
      !Number.isFinite(this.requestTimeoutMs) ||
      this.requestTimeoutMs <= 0
    ) {
      throw new RangeError('JS5 requestTimeoutMs must be greater than zero.');
    }
    if (!Number.isInteger(this.maxRetries) || this.maxRetries < 0) {
      throw new RangeError('JS5 maxRetries must be a non-negative integer.');
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  get inFlightCount(): number {
    return this.inFlight;
  }

  get queuedCount(): number {
    let count = 0;
    for (const request of this.queue) {
      if (
        request.state === 'queued' &&
        this.pending.get(request.key) === request
      ) {
        count += 1;
      }
    }
    return count;
  }

  schedule(
    archive: number,
    group: number,
    urgent = true,
  ): Promise<Js5GroupResponse> {
    assertUint8(archive, 'archive');
    assertUint16(group, 'group');

    const key = js5GroupKey(archive, group);
    const existing = this.pending.get(key);
    if (existing) {
      return existing.promise;
    }

    let resolve!: (response: Js5GroupResponse) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<Js5GroupResponse>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });

    const request: PendingRequest = {
      key,
      archive,
      group,
      urgent,
      attempts: 0,
      state: 'queued',
      timer: null,
      promise,
      resolve,
      reject,
    };

    this.pending.set(key, request);
    this.queue.push(request);
    this.pump();
    return promise;
  }

  /**
   * Match a decoded JS5 response to a scheduled request.
   *
   * Returns false for unsolicited/stale responses so callers can decide whether
   * to ignore or handle them outside the scheduler.
   */
  accept(response: Js5GroupResponse): boolean {
    const key = js5GroupKey(response.archive, response.group);
    const request = this.pending.get(key);
    if (!request) {
      return false;
    }

    this.pending.delete(key);
    this.clearTimer(request);

    if (request.state === 'in-flight') {
      this.inFlight -= 1;
    }

    request.state = 'complete';
    request.resolve(response);
    this.pump();
    return true;
  }

  cancelAll(
    error = new Error('JS5 request queue cancelled.'),
  ): void {
    const requests = Array.from(this.pending.values());

    this.pending.clear();
    this.queue.length = 0;
    this.inFlight = 0;

    for (const request of requests) {
      this.clearTimer(request);
      request.state = 'complete';
      request.reject(error);
    }
  }

  private pump(): void {
    while (this.inFlight < this.maxInFlight && this.queue.length > 0) {
      const request = this.queue.shift()!;

      if (
        request.state !== 'queued' ||
        this.pending.get(request.key) !== request
      ) {
        continue;
      }

      this.dispatch(request);
    }
  }

  private dispatch(request: PendingRequest): void {
    request.attempts += 1;
    request.state = 'in-flight';
    this.inFlight += 1;

    try {
      this.sendRequest({
        archive: request.archive,
        group: request.group,
        urgent: request.urgent,
        attempt: request.attempts,
      });
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      this.retryOrReject(request, normalized);
      return;
    }

    request.timer = setTimeout(() => {
      this.retryOrReject(
        request,
        new Error(
          'JS5 request ' + request.archive + ':' + request.group +
          ' timed out after ' + this.requestTimeoutMs + ' ms.',
        ),
      );
    }, this.requestTimeoutMs);
  }

  private retryOrReject(
    request: PendingRequest,
    error: Error,
  ): void {
    if (
      this.pending.get(request.key) !== request ||
      request.state !== 'in-flight'
    ) {
      return;
    }

    this.clearTimer(request);
    this.inFlight -= 1;

    if (request.attempts <= this.maxRetries) {
      request.state = 'queued';
      this.queue.push(request);
      this.pump();
      return;
    }

    this.pending.delete(request.key);
    request.state = 'complete';
    request.reject(error);
    this.pump();
  }

  private clearTimer(request: PendingRequest): void {
    if (request.timer === null) {
      return;
    }

    clearTimeout(request.timer);
    request.timer = null;
  }
}

function assertUint8(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(label + ' must be an unsigned byte.');
  }
}

function assertUint16(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(label + ' must be an unsigned short.');
  }
}
