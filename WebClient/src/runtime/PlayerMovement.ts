export const FINE_UNITS_PER_TILE = 128;
export const PLAYER_FINE_CENTER = 64;
export const JAGEX_YAW_UNITS = 2048;
const ROUTE_CAPACITY = 10;
const DEFAULT_TURN_SPEED = 32;

export interface FinePlayerRenderState {
  readonly fineX: number;
  readonly fineZ: number;
  /** Jagex yaw units, clockwise in the 0..2047 range. */
  readonly yaw: number;
}

export interface FinePlayerMovementSnapshot extends FinePlayerRenderState {
  readonly previousFineX: number;
  readonly previousFineZ: number;
  readonly previousYaw: number;
  readonly dstYaw: number;
  readonly routeLength: number;
}

/**
 * Classic ClientEntity route state in 1/128-tile units.
 *
 * The newest server waypoint is stored at route[0]. Movement consumes the
 * oldest queued waypoint first (routeLength - 1), matching Olden-Shire's
 * ClientEntity + route_move behaviour.
 */
export class FinePlayerMovement {
  private fineXValue: number;
  private fineZValue: number;
  private previousFineXValue: number;
  private previousFineZValue: number;
  private yawValue = 0;
  private previousYawValue = 0;
  private dstYawValue = 0;
  private routeLengthValue = 0;
  private readonly routeX = new Int32Array(ROUTE_CAPACITY);
  private readonly routeZ = new Int32Array(ROUTE_CAPACITY);
  private readonly routeRun = new Uint8Array(ROUTE_CAPACITY);

  constructor(
    tileX: number,
    tileZ: number,
    private readonly turnSpeed = DEFAULT_TURN_SPEED,
  ) {
    this.routeX[0] = tileX;
    this.routeZ[0] = tileZ;
    this.fineXValue = tileToFine(tileX);
    this.fineZValue = tileToFine(tileZ);
    this.previousFineXValue = this.fineXValue;
    this.previousFineZValue = this.fineZValue;
  }

  /**
   * Pushes a normal server movement waypoint. Small moves are queued; a large
   * discontinuity is treated as a teleport so the model never glides across
   * an unloaded chunk.
   */
  enqueueTile(tileX: number, tileZ: number, run: boolean): void {
    const dx = tileX - this.routeX[0]!;
    const dz = tileZ - this.routeZ[0]!;
    if (dx < -8 || dx > 8 || dz < -8 || dz > 8) {
      this.teleportTile(tileX, tileZ);
      return;
    }

    if (this.routeLengthValue < ROUTE_CAPACITY - 1) {
      this.routeLengthValue += 1;
    }

    for (let i = this.routeLengthValue; i > 0; i -= 1) {
      this.routeX[i] = this.routeX[i - 1]!;
      this.routeZ[i] = this.routeZ[i - 1]!;
      this.routeRun[i] = this.routeRun[i - 1]!;
    }

    this.routeX[0] = tileX;
    this.routeZ[0] = tileZ;
    this.routeRun[0] = run ? 1 : 0;
  }

  teleportTile(tileX: number, tileZ: number): void {
    this.routeLengthValue = 0;
    this.routeX.fill(tileX);
    this.routeZ.fill(tileZ);
    this.routeRun.fill(0);

    const fineX = tileToFine(tileX);
    const fineZ = tileToFine(tileZ);
    this.fineXValue = fineX;
    this.fineZValue = fineZ;
    this.previousFineXValue = fineX;
    this.previousFineZValue = fineZ;
    this.previousYawValue = this.yawValue;
  }

  /**
   * Advances one 20ms client simulation tick.
   */
  tick(): void {
    this.previousFineXValue = this.fineXValue;
    this.previousFineZValue = this.fineZValue;
    this.previousYawValue = this.yawValue;

    if (this.routeLengthValue > 0) {
      this.moveRouteTick();
    }

    this.turnTowardDestination();
  }

  renderState(interpolationAlpha: number): FinePlayerRenderState {
    const alpha = clamp(interpolationAlpha, 0, 1);
    return {
      fineX: lerp(
        this.previousFineXValue,
        this.fineXValue,
        alpha,
      ),
      fineZ: lerp(
        this.previousFineZValue,
        this.fineZValue,
        alpha,
      ),
      yaw: interpolateYaw(
        this.previousYawValue,
        this.yawValue,
        alpha,
      ),
    };
  }

  snapshot(): FinePlayerMovementSnapshot {
    return {
      fineX: this.fineXValue,
      fineZ: this.fineZValue,
      previousFineX: this.previousFineXValue,
      previousFineZ: this.previousFineZValue,
      yaw: this.yawValue,
      previousYaw: this.previousYawValue,
      dstYaw: this.dstYawValue,
      routeLength: this.routeLengthValue,
    };
  }

  private moveRouteTick(): void {
    const targetIndex = this.routeLengthValue - 1;
    const targetX = tileToFine(this.routeX[targetIndex]!);
    const targetZ = tileToFine(this.routeZ[targetIndex]!);

    if (
      targetX - this.fineXValue > 256 ||
      targetX - this.fineXValue < -256 ||
      targetZ - this.fineZValue > 256 ||
      targetZ - this.fineZValue < -256
    ) {
      this.fineXValue = targetX;
      this.fineZValue = targetZ;
      return;
    }

    this.dstYawValue = destinationYaw(
      this.fineXValue,
      this.fineZValue,
      targetX,
      targetZ,
    );

    let step = 4;
    if (
      this.yawValue !== this.dstYawValue &&
      this.turnSpeed !== 0
    ) {
      step = 2;
    }
    if (this.routeLengthValue > 2) {
      step = 6;
    }
    if (this.routeLengthValue > 3) {
      step = 8;
    }
    if (this.routeRun[targetIndex] !== 0) {
      step <<= 1;
    }

    this.fineXValue = approach(
      this.fineXValue,
      targetX,
      step,
    );
    this.fineZValue = approach(
      this.fineZValue,
      targetZ,
      step,
    );

    if (
      this.fineXValue === targetX &&
      this.fineZValue === targetZ
    ) {
      this.routeLengthValue -= 1;
    }
  }

  private turnTowardDestination(): void {
    let delta = (
      this.dstYawValue - this.yawValue
    ) & (JAGEX_YAW_UNITS - 1);
    if (delta > JAGEX_YAW_UNITS / 2) {
      delta -= JAGEX_YAW_UNITS;
    }
    if (delta === 0 || this.turnSpeed <= 0) {
      return;
    }

    if (Math.abs(delta) <= this.turnSpeed) {
      this.yawValue = this.dstYawValue;
      return;
    }

    this.yawValue = (
      this.yawValue + Math.sign(delta) * this.turnSpeed
    ) & (JAGEX_YAW_UNITS - 1);
  }
}

export function tileToFine(tile: number): number {
  return tile * FINE_UNITS_PER_TILE + PLAYER_FINE_CENTER;
}

export function jagexYawToRadians(yaw: number): number {
  return (
    (yaw & (JAGEX_YAW_UNITS - 1)) *
    (Math.PI * 2 / JAGEX_YAW_UNITS)
  );
}

function destinationYaw(
  x: number,
  z: number,
  targetX: number,
  targetZ: number,
): number {
  if (x < targetX) {
    if (z < targetZ) return 1280;
    if (z > targetZ) return 1792;
    return 1536;
  }
  if (x > targetX) {
    if (z < targetZ) return 768;
    if (z > targetZ) return 256;
    return 512;
  }
  if (z < targetZ) return 1024;
  if (z > targetZ) return 0;
  return 0;
}

function approach(
  value: number,
  target: number,
  amount: number,
): number {
  if (value < target) {
    return Math.min(target, value + amount);
  }
  if (value > target) {
    return Math.max(target, value - amount);
  }
  return value;
}

function interpolateYaw(
  previous: number,
  current: number,
  alpha: number,
): number {
  let delta = (
    current - previous
  ) & (JAGEX_YAW_UNITS - 1);
  if (delta > JAGEX_YAW_UNITS / 2) {
    delta -= JAGEX_YAW_UNITS;
  }
  return (
    previous + delta * alpha + JAGEX_YAW_UNITS
  ) % JAGEX_YAW_UNITS;
}

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
