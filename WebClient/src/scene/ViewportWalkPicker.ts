import type { OrbitCameraRenderState } from '../runtime/OrbitCamera';
import {
  SCENE_TILE_SIZE,
  type SceneBounds,
} from './SceneAssembler';

const CAMERA_FOV_RADIANS = 48 * Math.PI / 180;
const RAY_STEP = 32;
const RAY_MAX_DISTANCE = 20_000;
const BOUNDS_PADDING = SCENE_TILE_SIZE;

export interface WalkDestination {
  readonly tileX: number;
  readonly tileZ: number;
  readonly sceneX: number;
  readonly sceneY: number;
  readonly sceneZ: number;
}

export interface ViewportWalkPickOptions {
  readonly canvasX: number;
  readonly canvasY: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly camera: OrbitCameraRenderState;
  readonly bounds: SceneBounds;
  readonly originTileX: number;
  readonly originTileZ: number;
  readonly level: number;
  readonly groundYFine: (
    level: number,
    absoluteFineX: number,
    absoluteFineZ: number,
  ) => number;
}

/**
 * Casts the same perspective ray used by WebGlSceneRenderer through the
 * viewport and intersects it against the decoded terrain height field.
 *
 * The server remains authoritative for pathfinding/collision. This picker only
 * resolves the absolute destination tile that the rev-240 MOVE_GAMECLICK
 * packet expects.
 */
export function pickWalkDestination(
  options: ViewportWalkPickOptions,
): WalkDestination | null {
  const {
    canvasX,
    canvasY,
    canvasWidth,
    canvasHeight,
    camera,
    bounds,
    originTileX,
    originTileZ,
    level,
    groundYFine,
  } = options;

  if (
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    canvasX < 0 ||
    canvasY < 0 ||
    canvasX >= canvasWidth ||
    canvasY >= canvasHeight
  ) {
    return null;
  }

  const ray = viewportRay(
    canvasX,
    canvasY,
    canvasWidth,
    canvasHeight,
    camera,
  );
  const originFineX = originTileX * SCENE_TILE_SIZE;
  const originFineZ = originTileZ * SCENE_TILE_SIZE;

  let previousT: number | null = null;
  let previousDelta = 0;
  let enteredScene = false;

  for (
    let t = 0;
    t <= RAY_MAX_DISTANCE;
    t += RAY_STEP
  ) {
    const x = camera.eyeX + ray.x * t;
    const y = camera.eyeY + ray.y * t;
    const z = camera.eyeZ + ray.z * t;

    if (!insideSceneXZ(x, z, bounds)) {
      if (enteredScene) {
        break;
      }
      continue;
    }
    enteredScene = true;

    const groundY = groundYFine(
      level,
      originFineX + x,
      originFineZ - z,
    );
    const delta = y - groundY;

    if (delta <= 0) {
      const hitT =
        previousT === null || previousDelta <= 0
          ? t
          : refineTerrainHit(
              previousT,
              t,
              camera,
              ray,
              level,
              originFineX,
              originFineZ,
              groundYFine,
            );
      return destinationAt(
        hitT,
        camera,
        ray,
        originFineX,
        originFineZ,
        level,
        groundYFine,
      );
    }

    previousT = t;
    previousDelta = delta;
  }

  return null;
}

function destinationAt(
  t: number,
  camera: OrbitCameraRenderState,
  ray: Vec3,
  originFineX: number,
  originFineZ: number,
  level: number,
  groundYFine: ViewportWalkPickOptions['groundYFine'],
): WalkDestination {
  const sceneX = camera.eyeX + ray.x * t;
  const sceneZ = camera.eyeZ + ray.z * t;
  const absoluteFineX = originFineX + sceneX;
  // Scene Z is reflected relative to Jagex/world Z to preserve handedness.
  const absoluteFineZ = originFineZ - sceneZ;
  const sceneY = groundYFine(
    level,
    absoluteFineX,
    absoluteFineZ,
  );

  return {
    tileX: Math.floor(absoluteFineX / SCENE_TILE_SIZE),
    tileZ: Math.floor(absoluteFineZ / SCENE_TILE_SIZE),
    sceneX,
    sceneY,
    sceneZ,
  };
}

function refineTerrainHit(
  lowT: number,
  highT: number,
  camera: OrbitCameraRenderState,
  ray: Vec3,
  level: number,
  originFineX: number,
  originFineZ: number,
  groundYFine: ViewportWalkPickOptions['groundYFine'],
): number {
  let low = lowT;
  let high = highT;

  for (let i = 0; i < 12; i += 1) {
    const mid = (low + high) / 2;
    const x = camera.eyeX + ray.x * mid;
    const y = camera.eyeY + ray.y * mid;
    const z = camera.eyeZ + ray.z * mid;
    const groundY = groundYFine(
      level,
      originFineX + x,
      originFineZ - z,
    );

    if (y > groundY) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function viewportRay(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  camera: OrbitCameraRenderState,
): Vec3 {
  const forward = normalize({
    x: camera.targetX - camera.eyeX,
    y: camera.targetY - camera.eyeY,
    z: camera.targetZ - camera.eyeZ,
  });
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const cameraUp = normalize(cross(right, forward));

  const ndcX = canvasX / canvasWidth * 2 - 1;
  const ndcY = 1 - canvasY / canvasHeight * 2;
  const tanHalfFov = Math.tan(CAMERA_FOV_RADIANS / 2);
  const aspect = canvasWidth / canvasHeight;

  return normalize({
    x:
      forward.x +
      right.x * ndcX * tanHalfFov * aspect +
      cameraUp.x * ndcY * tanHalfFov,
    y:
      forward.y +
      right.y * ndcX * tanHalfFov * aspect +
      cameraUp.y * ndcY * tanHalfFov,
    z:
      forward.z +
      right.z * ndcX * tanHalfFov * aspect +
      cameraUp.z * ndcY * tanHalfFov,
  });
}

function insideSceneXZ(
  x: number,
  z: number,
  bounds: SceneBounds,
): boolean {
  return (
    x >= bounds.minX - BOUNDS_PADDING &&
    x <= bounds.maxX + BOUNDS_PADDING &&
    z >= bounds.minZ - BOUNDS_PADDING &&
    z <= bounds.maxZ + BOUNDS_PADDING
  );
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length === 0) {
    return { x: 0, y: -1, z: 0 };
  }
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
  };
}
