export const CLIENT_TICK_MS = 20;
const DEFAULT_MAX_CATCH_UP_TICKS = 10;

export interface BrowserGameLoopCallbacks {
  /**
   * Advances deterministic client state by one fixed 20ms game tick.
   * Network callbacks should mutate protocol state; visible entity/camera
   * state can then be consumed here on the next client tick.
   */
  readonly update: (tickMs: number) => void;
  /**
   * Draws one display frame. interpolationAlpha is the fraction of the next
   * fixed tick already accumulated and is reserved for smooth entity/camera
   * interpolation between 20ms simulation states.
   */
  readonly render: (
    interpolationAlpha: number,
    timestampMs: number,
  ) => void;
}

export interface BrowserGameLoopStats {
  readonly running: boolean;
  readonly frames: number;
  readonly ticks: number;
  readonly interpolationAlpha: number;
  readonly droppedCatchUpMs: number;
}

/**
 * Browser runtime split used by the original client architecture:
 *
 * - fixed 20ms client simulation ticks (50 Hz)
 * - requestAnimationFrame presentation at the display refresh rate
 *
 * Static scene buffers are not involved here. The renderer keeps those GPU
 * buffers resident and this loop only asks it to draw the latest dynamic
 * transforms/camera state each animation frame.
 */
export class BrowserGameLoop {
  private running = false;
  private animationFrameId: number | null = null;
  private lastFrameTimestampMs: number | null = null;
  private accumulatorMs = 0;
  private frames = 0;
  private ticks = 0;
  private interpolationAlpha = 0;
  private droppedCatchUpMs = 0;

  constructor(
    private readonly callbacks: BrowserGameLoopCallbacks,
    private readonly tickMs = CLIENT_TICK_MS,
    private readonly maxCatchUpTicks = DEFAULT_MAX_CATCH_UP_TICKS,
  ) {
    if (!Number.isFinite(tickMs) || tickMs <= 0) {
      throw new RangeError('Game-loop tick length must be positive.');
    }
    if (!Number.isInteger(maxCatchUpTicks) || maxCatchUpTicks < 1) {
      throw new RangeError(
        'Game-loop max catch-up ticks must be a positive integer.',
      );
    }
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.resetTiming();
    this.animationFrameId =
      window.requestAnimationFrame(this.handleAnimationFrame);
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.resetTiming();
  }

  /**
   * Clears only wall-clock accumulation. Use this on visibility changes so a
   * suspended iPhone tab does not try to replay seconds of simulation ticks
   * when Safari resumes requestAnimationFrame.
   */
  resetTiming(): void {
    this.lastFrameTimestampMs = null;
    this.accumulatorMs = 0;
    this.interpolationAlpha = 0;
  }

  /**
   * Deterministic frame entry used by requestAnimationFrame and unit tests.
   */
  stepFrame(timestampMs: number): void {
    if (!Number.isFinite(timestampMs)) {
      return;
    }

    if (this.lastFrameTimestampMs === null) {
      this.lastFrameTimestampMs = timestampMs;
      this.interpolationAlpha = 0;
      this.frames += 1;
      this.callbacks.render(0, timestampMs);
      return;
    }

    const elapsedMs = Math.max(
      0,
      timestampMs - this.lastFrameTimestampMs,
    );
    this.lastFrameTimestampMs = timestampMs;
    this.accumulatorMs += elapsedMs;

    let catchUpTicks = 0;
    while (
      this.accumulatorMs >= this.tickMs &&
      catchUpTicks < this.maxCatchUpTicks
    ) {
      this.callbacks.update(this.tickMs);
      this.accumulatorMs -= this.tickMs;
      this.ticks += 1;
      catchUpTicks += 1;
    }

    // Avoid the classic spiral-of-death after a debugger pause/background
    // suspension. Safari visibility changes reset the clock too, but this is
    // a second guard for unusually slow foreground frames.
    if (this.accumulatorMs >= this.tickMs) {
      const retained = this.accumulatorMs % this.tickMs;
      this.droppedCatchUpMs += this.accumulatorMs - retained;
      this.accumulatorMs = retained;
    }

    this.interpolationAlpha =
      Math.max(0, Math.min(1, this.accumulatorMs / this.tickMs));
    this.frames += 1;
    this.callbacks.render(this.interpolationAlpha, timestampMs);
  }

  getStats(): BrowserGameLoopStats {
    return {
      running: this.running,
      frames: this.frames,
      ticks: this.ticks,
      interpolationAlpha: this.interpolationAlpha,
      droppedCatchUpMs: this.droppedCatchUpMs,
    };
  }

  private readonly handleAnimationFrame = (
    timestampMs: number,
  ): void => {
    if (!this.running) {
      return;
    }
    this.stepFrame(timestampMs);
    if (!this.running) {
      return;
    }
    this.animationFrameId =
      window.requestAnimationFrame(this.handleAnimationFrame);
  };
}
