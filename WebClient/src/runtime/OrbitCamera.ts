import { JAGEX_YAW_UNITS } from './PlayerMovement';

export const ORBIT_CAMERA_MIN_PITCH = 128;
export const ORBIT_CAMERA_MAX_PITCH = 383;
export const ORBIT_CAMERA_DEFAULT_PITCH = 256;
export const ORBIT_CAMERA_DEFAULT_YAW = 0;
export const ORBIT_CAMERA_DEFAULT_ZOOM = 1100;
export const ORBIT_CAMERA_MIN_ZOOM = 400;
export const ORBIT_CAMERA_MAX_ZOOM = 3000;

export interface OrbitCameraSnapshot {
  readonly initialized: boolean;
  readonly orbitX: number;
  readonly orbitZ: number;
  readonly previousOrbitX: number;
  readonly previousOrbitZ: number;
  readonly yaw: number;
  readonly previousYaw: number;
  readonly pitch: number;
  readonly previousPitch: number;
  readonly yawVelocity: number;
  readonly pitchVelocity: number;
  readonly zoom: number;
  readonly previousZoom: number;
}

export interface OrbitCameraRenderState {
  readonly orbitX: number;
  readonly orbitZ: number;
  /** Jagex angle units, 0..2047. */
  readonly yaw: number;
  /** Jagex pitch units, clamped to 128..383. */
  readonly pitch: number;
  readonly zoom: number;
  readonly eyeX: number;
  readonly eyeY: number;
  readonly eyeZ: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetZ: number;
}

/**
 * Mutable orbit camera state ported from Olden-Shire's follow_camera +
 * cam_follow path.
 *
 * Fixed 20ms ticks own the camera simulation. requestAnimationFrame only
 * samples previous/current camera state via renderState(alpha), so display
 * refresh rate never changes the underlying client camera behaviour.
 */
export class OrbitCamera {
  private initializedValue = false;
  private orbitXValue = 0;
  private orbitZValue = 0;
  private previousOrbitXValue = 0;
  private previousOrbitZValue = 0;
  private yawValue = ORBIT_CAMERA_DEFAULT_YAW;
  private previousYawValue = ORBIT_CAMERA_DEFAULT_YAW;
  private pitchValue = ORBIT_CAMERA_DEFAULT_PITCH;
  private previousPitchValue = ORBIT_CAMERA_DEFAULT_PITCH;
  private yawVelocityValue = 0;
  private pitchVelocityValue = 0;
  private zoomValue = ORBIT_CAMERA_DEFAULT_ZOOM;
  private previousZoomValue = ORBIT_CAMERA_DEFAULT_ZOOM;

  private keyLeft = false;
  private keyRight = false;
  private keyUp = false;
  private keyDown = false;
  private pendingDragX = 0;
  private pendingDragY = 0;
  private pendingZoomDelta = 0;

  get initialized(): boolean {
    return this.initializedValue;
  }

  clear(): void {
    this.initializedValue = false;
    this.yawVelocityValue = 0;
    this.pitchVelocityValue = 0;
    this.pendingDragX = 0;
    this.pendingDragY = 0;
    this.pendingZoomDelta = 0;
    this.keyLeft = false;
    this.keyRight = false;
    this.keyUp = false;
    this.keyDown = false;
  }

  reset(
    targetX: number,
    targetZ: number,
    yaw = ORBIT_CAMERA_DEFAULT_YAW,
    pitch = ORBIT_CAMERA_DEFAULT_PITCH,
    zoom = ORBIT_CAMERA_DEFAULT_ZOOM,
  ): void {
    this.initializedValue = true;
    this.orbitXValue = targetX;
    this.orbitZValue = targetZ;
    this.previousOrbitXValue = targetX;
    this.previousOrbitZValue = targetZ;
    this.yawValue = wrapYaw(yaw);
    this.previousYawValue = this.yawValue;
    this.pitchValue = clamp(
      Math.trunc(pitch),
      ORBIT_CAMERA_MIN_PITCH,
      ORBIT_CAMERA_MAX_PITCH,
    );
    this.previousPitchValue = this.pitchValue;
    this.zoomValue = clamp(
      Math.trunc(zoom),
      ORBIT_CAMERA_MIN_ZOOM,
      ORBIT_CAMERA_MAX_ZOOM,
    );
    this.previousZoomValue = this.zoomValue;
    this.yawVelocityValue = 0;
    this.pitchVelocityValue = 0;
    this.pendingDragX = 0;
    this.pendingDragY = 0;
    this.pendingZoomDelta = 0;
  }

  setArrowHeld(
    direction: 'left' | 'right' | 'up' | 'down',
    held: boolean,
  ): void {
    switch (direction) {
      case 'left':
        this.keyLeft = held;
        break;
      case 'right':
        this.keyRight = held;
        break;
      case 'up':
        this.keyUp = held;
        break;
      case 'down':
        this.keyDown = held;
        break;
    }
  }

  queueDrag(deltaX: number, deltaY: number): void {
    if (Number.isFinite(deltaX)) {
      this.pendingDragX += deltaX;
    }
    if (Number.isFinite(deltaY)) {
      this.pendingDragY += deltaY;
    }
  }

  queueZoom(delta: number): void {
    if (Number.isFinite(delta)) {
      this.pendingZoomDelta += delta;
    }
  }

  /**
   * Advances one fixed 20ms camera tick.
   */
  tick(targetX: number, targetZ: number): void {
    if (!this.initializedValue) {
      this.reset(targetX, targetZ);
      return;
    }

    this.previousOrbitXValue = this.orbitXValue;
    this.previousOrbitZValue = this.orbitZValue;
    this.previousYawValue = this.yawValue;
    this.previousPitchValue = this.pitchValue;
    this.previousZoomValue = this.zoomValue;

    this.followTarget(targetX, targetZ);
    this.consumePointerInput();
    this.updateKeyboardVelocities();

    this.yawValue = wrapYaw(
      this.yawValue + Math.trunc(this.yawVelocityValue / 2),
    );
    this.pitchValue = clamp(
      this.pitchValue +
        Math.trunc(this.pitchVelocityValue / 2),
      ORBIT_CAMERA_MIN_PITCH,
      ORBIT_CAMERA_MAX_PITCH,
    );
  }

  renderState(
    interpolationAlpha: number,
    anchorY: number,
  ): OrbitCameraRenderState {
    const alpha = clamp(interpolationAlpha, 0, 1);
    const orbitX = interpolate(
      this.previousOrbitXValue,
      this.orbitXValue,
      alpha,
    );
    const orbitZ = interpolate(
      this.previousOrbitZValue,
      this.orbitZValue,
      alpha,
    );
    const yaw = interpolateYaw(
      this.previousYawValue,
      this.yawValue,
      alpha,
    );
    const pitch = interpolate(
      this.previousPitchValue,
      this.pitchValue,
      alpha,
    );
    const zoom = interpolate(
      this.previousZoomValue,
      this.zoomValue,
      alpha,
    );

    const distance =
      pitch * 3 + 600 + (zoom - ORBIT_CAMERA_DEFAULT_ZOOM);
    const pitchRadians =
      pitch * (Math.PI * 2 / JAGEX_YAW_UNITS);
    const yawRadians =
      yaw * (Math.PI * 2 / JAGEX_YAW_UNITS);
    const horizontal = Math.cos(pitchRadians) * distance;
    const vertical = Math.sin(pitchRadians) * distance;

    // This is Olden-Shire cam_follow adapted from the client's negative-up
    // world-height convention to WebGL's positive-Y-up scene coordinates.
    const eyeX =
      orbitX + Math.sin(yawRadians) * horizontal;
    const eyeY = anchorY + vertical;
    // Scene Z is the reflection of Jagex/world Z. Apply the same conversion
    // to cam_follow so Jagex yaw remains authoritative without mirroring view.
    const eyeZ =
      orbitZ + Math.cos(yawRadians) * horizontal;

    return {
      orbitX,
      orbitZ,
      yaw,
      pitch,
      zoom,
      eyeX,
      eyeY,
      eyeZ,
      targetX: orbitX,
      targetY: anchorY,
      targetZ: orbitZ,
    };
  }

  snapshot(): OrbitCameraSnapshot {
    return {
      initialized: this.initializedValue,
      orbitX: this.orbitXValue,
      orbitZ: this.orbitZValue,
      previousOrbitX: this.previousOrbitXValue,
      previousOrbitZ: this.previousOrbitZValue,
      yaw: this.yawValue,
      previousYaw: this.previousYawValue,
      pitch: this.pitchValue,
      previousPitch: this.previousPitchValue,
      yawVelocity: this.yawVelocityValue,
      pitchVelocity: this.pitchVelocityValue,
      zoom: this.zoomValue,
      previousZoom: this.previousZoomValue,
    };
  }

  private followTarget(targetX: number, targetZ: number): void {
    const dx = this.orbitXValue - targetX;
    const dz = this.orbitZValue - targetZ;
    if (
      dx < -500 || dx > 500 ||
      dz < -500 || dz > 500
    ) {
      this.orbitXValue = targetX;
      this.orbitZValue = targetZ;
      return;
    }

    if (this.orbitXValue !== targetX) {
      this.orbitXValue += Math.trunc(
        (targetX - this.orbitXValue) / 16,
      );
    }
    if (this.orbitZValue !== targetZ) {
      this.orbitZValue += Math.trunc(
        (targetZ - this.orbitZValue) / 16,
      );
    }
  }

  private consumePointerInput(): void {
    if (this.pendingDragX !== 0) {
      this.yawValue = wrapYaw(
        this.yawValue - Math.trunc(this.pendingDragX),
      );
    }
    if (this.pendingDragY !== 0) {
      this.pitchValue = clamp(
        this.pitchValue +
          Math.trunc(this.pendingDragY / 2),
        ORBIT_CAMERA_MIN_PITCH,
        ORBIT_CAMERA_MAX_PITCH,
      );
    }
    if (this.pendingZoomDelta !== 0) {
      this.zoomValue = clamp(
        this.zoomValue + Math.trunc(this.pendingZoomDelta),
        ORBIT_CAMERA_MIN_ZOOM,
        ORBIT_CAMERA_MAX_ZOOM,
      );
    }

    this.pendingDragX = 0;
    this.pendingDragY = 0;
    this.pendingZoomDelta = 0;
  }

  private updateKeyboardVelocities(): void {
    if (this.keyLeft) {
      this.yawVelocityValue += Math.trunc(
        (-24 - this.yawVelocityValue) / 2,
      );
    } else if (this.keyRight) {
      this.yawVelocityValue += Math.trunc(
        (24 - this.yawVelocityValue) / 2,
      );
    } else {
      this.yawVelocityValue = Math.trunc(
        this.yawVelocityValue / 2,
      );
    }

    if (this.keyUp) {
      this.pitchVelocityValue += Math.trunc(
        (12 - this.pitchVelocityValue) / 2,
      );
    } else if (this.keyDown) {
      this.pitchVelocityValue += Math.trunc(
        (-12 - this.pitchVelocityValue) / 2,
      );
    } else {
      this.pitchVelocityValue = Math.trunc(
        this.pitchVelocityValue / 2,
      );
    }
  }
}

export interface OrbitCameraInputOptions {
  readonly isEnabled?: () => boolean;
  readonly onTap?: (
    canvasX: number,
    canvasY: number,
    keyCombination: number,
  ) => void;
}

interface PointerState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/**
 * Browser/iPhone controls layered on the classic orbit camera:
 * - one-pointer drag rotates
 * - two-pointer pinch zooms
 * - mouse wheel zooms
 * - arrow keys drive the original +/-24 yaw and +/-12 pitch velocities
 *
 * Tap detection is surfaced as an optional callback so the rev-240 walk
 * packet/raycast path can be connected without coupling transport to camera.
 */
export class OrbitCameraInputController {
  private readonly pointers = new Map<number, PointerState>();
  private pinchDistance: number | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: OrbitCamera,
    private readonly options: OrbitCameraInputOptions = {},
  ) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('wheel', this.handleWheel, {
      passive: false,
    });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  destroy(): void {
    this.canvas.removeEventListener(
      'pointerdown',
      this.handlePointerDown,
    );
    this.canvas.removeEventListener(
      'pointermove',
      this.handlePointerMove,
    );
    this.canvas.removeEventListener(
      'pointerup',
      this.handlePointerUp,
    );
    this.canvas.removeEventListener(
      'pointercancel',
      this.handlePointerUp,
    );
    this.canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private enabled(): boolean {
    return this.options.isEnabled?.() ?? true;
  }

  private readonly handlePointerDown = (
    event: PointerEvent,
  ): void => {
    if (!this.enabled()) {
      return;
    }
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    });
    this.updatePinchReference();
  };

  private readonly handlePointerMove = (
    event: PointerEvent,
  ): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer || !this.enabled()) {
      return;
    }
    event.preventDefault();

    const previousX = pointer.x;
    const previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (
      Math.hypot(
        pointer.x - pointer.startX,
        pointer.y - pointer.startY,
      ) > 6
    ) {
      pointer.moved = true;
    }

    if (this.pointers.size >= 2) {
      for (const state of this.pointers.values()) {
        state.moved = true;
      }
      const distance = this.currentPinchDistance();
      if (
        distance !== null &&
        this.pinchDistance !== null
      ) {
        // Fingers spreading apart zooms in (smaller camera distance).
        this.camera.queueZoom(
          (this.pinchDistance - distance) * 3,
        );
      }
      this.pinchDistance = distance;
      return;
    }

    this.camera.queueDrag(
      pointer.x - previousX,
      pointer.y - previousY,
    );
  };

  private readonly handlePointerUp = (
    event: PointerEvent,
  ): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) {
      return;
    }
    event.preventDefault();

    this.pointers.delete(event.pointerId);
    this.updatePinchReference();

    if (
      !pointer.moved &&
      this.pointers.size === 0 &&
      this.options.onTap
    ) {
      const bounds = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / Math.max(1, bounds.width);
      const scaleY = this.canvas.height / Math.max(1, bounds.height);
      const keyCombination = event.ctrlKey
        ? event.shiftKey
          ? 2
          : 1
        : 0;
      this.options.onTap(
        (event.clientX - bounds.left) * scaleX,
        (event.clientY - bounds.top) * scaleY,
        keyCombination,
      );
    }
  };

  private readonly handleWheel = (
    event: WheelEvent,
  ): void => {
    if (!this.enabled()) {
      return;
    }
    event.preventDefault();
    if (event.deltaY === 0) {
      return;
    }
    this.camera.queueZoom(Math.sign(event.deltaY) * 80);
  };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (!this.enabled()) {
      return;
    }
    const direction = arrowDirection(event.key);
    if (!direction) {
      return;
    }
    event.preventDefault();
    this.camera.setArrowHeld(direction, true);
  };

  private readonly handleKeyUp = (
    event: KeyboardEvent,
  ): void => {
    const direction = arrowDirection(event.key);
    if (!direction) {
      return;
    }
    if (this.enabled()) {
      event.preventDefault();
    }
    this.camera.setArrowHeld(direction, false);
  };

  private readonly handleBlur = (): void => {
    this.camera.setArrowHeld('left', false);
    this.camera.setArrowHeld('right', false);
    this.camera.setArrowHeld('up', false);
    this.camera.setArrowHeld('down', false);
    this.pointers.clear();
    this.pinchDistance = null;
  };

  private updatePinchReference(): void {
    this.pinchDistance =
      this.pointers.size >= 2
        ? this.currentPinchDistance()
        : null;
  }

  private currentPinchDistance(): number | null {
    if (this.pointers.size < 2) {
      return null;
    }
    const [a, b] = Array.from(this.pointers.values());
    if (!a || !b) {
      return null;
    }
    return Math.hypot(b.x - a.x, b.y - a.y);
  }
}

function arrowDirection(
  key: string,
): 'left' | 'right' | 'up' | 'down' | null {
  switch (key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    default:
      return null;
  }
}

function interpolate(
  previous: number,
  current: number,
  alpha: number,
): number {
  return previous + (current - previous) * alpha;
}

function interpolateYaw(
  previous: number,
  current: number,
  alpha: number,
): number {
  let delta =
    (current - previous) & (JAGEX_YAW_UNITS - 1);
  if (delta > JAGEX_YAW_UNITS / 2) {
    delta -= JAGEX_YAW_UNITS;
  }
  return wrapYawFloat(previous + delta * alpha);
}

function wrapYaw(value: number): number {
  return (
    Math.trunc(value) + JAGEX_YAW_UNITS
  ) & (JAGEX_YAW_UNITS - 1);
}

function wrapYawFloat(value: number): number {
  const wrapped = value % JAGEX_YAW_UNITS;
  return wrapped < 0
    ? wrapped + JAGEX_YAW_UNITS
    : wrapped;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(min, Math.min(max, value));
}
