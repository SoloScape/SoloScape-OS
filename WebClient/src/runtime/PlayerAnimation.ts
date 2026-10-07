import type {
  DecodedAnimationFrame,
  DecodedSequenceDefinition,
} from '../cache/PlayerAnimationAssetLoader';
import type { PlayerAppearance } from '../protocol/PlayerInfoDecoder';
import type { SceneMesh } from '../scene/SceneAssembler';
import type { PlayerLocomotion } from './PlayerMovement';

export interface PlayerAnimationAssetSource {
  loadSequence(id: number): Promise<DecodedSequenceDefinition | null>;
  loadFrame(packedId: number): Promise<DecodedAnimationFrame>;
}

export interface PlayerAnimationState {
  readonly sequenceId: number;
  readonly frameIndex: number;
  readonly frameCycle: number;
  readonly poseRevision: number;
}

export class PlayerAnimationController {
  private readonly bindPositions: Float32Array;
  private readonly animatedPositionsValue: Float32Array;
  private readonly rawPositions: Float64Array;
  private readonly verticesByGroup: readonly (readonly number[])[];
  private sequenceIdValue = -1;
  private sequence: DecodedSequenceDefinition | null = null;
  private frameIndexValue = 0;
  private frameCycleValue = 0;
  private poseRevisionValue = 0;
  private sequenceRequestGeneration = 0;
  private frameRequestGeneration = 0;

  constructor(
    private readonly assets: PlayerAnimationAssetSource,
    mesh: SceneMesh,
    private readonly log: ((message: string) => void) | null = null,
  ) {
    if (!mesh.vertexGroups) {
      throw new Error(
        'Player animation requires classic vertex skin groups on the mesh.',
      );
    }
    if (mesh.vertexGroups.length !== mesh.vertexCount) {
      throw new RangeError(
        'Player mesh vertex group count does not match vertexCount.',
      );
    }

    this.bindPositions = mesh.positions.slice();
    this.animatedPositionsValue = mesh.positions.slice();
    this.rawPositions = new Float64Array(mesh.positions.length);
    this.verticesByGroup = buildVerticesByGroup(mesh.vertexGroups);
  }

  get positions(): Float32Array {
    return this.animatedPositionsValue;
  }

  get poseRevision(): number {
    return this.poseRevisionValue;
  }

  state(): PlayerAnimationState {
    return {
      sequenceId: this.sequenceIdValue,
      frameIndex: this.frameIndexValue,
      frameCycle: this.frameCycleValue,
      poseRevision: this.poseRevisionValue,
    };
  }

  setLocomotion(
    appearance: PlayerAppearance,
    locomotion: PlayerLocomotion,
  ): void {
    this.setSequenceId(
      selectLocomotionSequence(appearance, locomotion),
    );
  }

  tick(): void {
    const sequence = this.sequence;
    if (!sequence || sequence.frameIds.length === 0) return;

    this.frameCycleValue += 1;
    const duration = Math.max(
      1,
      sequence.frameLengths[this.frameIndexValue] ?? 1,
    );
    if (this.frameCycleValue <= duration) return;

    this.frameCycleValue = 1;
    this.frameIndexValue += 1;
    if (this.frameIndexValue >= sequence.frameIds.length) {
      if (sequence.frameStep > 0) {
        this.frameIndexValue -= sequence.frameStep;
      }
      if (
        this.frameIndexValue < 0 ||
        this.frameIndexValue >= sequence.frameIds.length
      ) {
        this.frameIndexValue = 0;
      }
    }
    this.requestCurrentFrame();
  }

  private setSequenceId(sequenceId: number): void {
    if (sequenceId === this.sequenceIdValue) return;

    this.sequenceIdValue = sequenceId;
    this.sequence = null;
    this.frameIndexValue = 0;
    this.frameCycleValue = 0;
    this.sequenceRequestGeneration += 1;
    this.frameRequestGeneration += 1;
    this.resetBindPose();

    if (sequenceId < 0) return;

    const generation = this.sequenceRequestGeneration;
    void this.assets.loadSequence(sequenceId)
      .then((sequence) => {
        if (
          generation !== this.sequenceRequestGeneration ||
          sequenceId !== this.sequenceIdValue
        ) {
          return;
        }

        this.sequence = sequence;
        if (!sequence) return;
        if (sequence.frameIds.length === 0) {
          if (sequence.animMayaId >= 0) {
            this.log?.(
              'Sequence ' + sequenceId + ' uses Animaya ' +
                sequence.animMayaId +
                '; classic frame posing is retained as the fallback.',
            );
          }
          return;
        }
        this.requestCurrentFrame();
      })
      .catch((error: unknown) => {
        if (generation !== this.sequenceRequestGeneration) return;
        const message =
          error instanceof Error ? error.message : String(error);
        this.log?.('Sequence ' + sequenceId + ' load failed: ' + message);
      });
  }

  private requestCurrentFrame(): void {
    const sequence = this.sequence;
    if (!sequence || sequence.frameIds.length === 0) return;

    const packedFrameId = sequence.frameIds[this.frameIndexValue];
    if (packedFrameId === undefined) return;

    const generation = ++this.frameRequestGeneration;
    void this.assets.loadFrame(packedFrameId)
      .then((frame) => {
        if (
          generation !== this.frameRequestGeneration ||
          sequence !== this.sequence ||
          packedFrameId !== sequence.frameIds[this.frameIndexValue]
        ) {
          return;
        }

        applyClassicAnimationFrame(
          this.bindPositions,
          this.verticesByGroup,
          frame,
          this.animatedPositionsValue,
          this.rawPositions,
        );
        this.poseRevisionValue += 1;
      })
      .catch((error: unknown) => {
        if (generation !== this.frameRequestGeneration) return;
        const message =
          error instanceof Error ? error.message : String(error);
        this.log?.(
          'Animation frame ' + packedFrameId +
            ' load failed: ' + message,
        );
      });
  }

  private resetBindPose(): void {
    this.animatedPositionsValue.set(this.bindPositions);
    this.poseRevisionValue += 1;
  }
}

export function selectLocomotionSequence(
  appearance: Pick<
    PlayerAppearance,
    | 'readyAnim'
    | 'walkAnim'
    | 'walkAnimBack'
    | 'walkAnimLeft'
    | 'walkAnimRight'
    | 'runAnim'
  >,
  locomotion: PlayerLocomotion,
): number {
  const walk = sequenceOrMissing(appearance.walkAnim);
  if (locomotion === 'run') {
    return fallbackSequence(appearance.runAnim, walk);
  }
  if (locomotion === 'walk-back') {
    return fallbackSequence(appearance.walkAnimBack, walk);
  }
  if (locomotion === 'walk-left') {
    return fallbackSequence(appearance.walkAnimLeft, walk);
  }
  if (locomotion === 'walk-right') {
    return fallbackSequence(appearance.walkAnimRight, walk);
  }
  if (locomotion === 'walk-forward') return walk;
  return sequenceOrMissing(appearance.readyAnim);
}

export function applyClassicAnimationFrame(
  bindPositions: Float32Array,
  verticesByGroup: readonly (readonly number[])[],
  frame: DecodedAnimationFrame,
  output: Float32Array = new Float32Array(bindPositions.length),
  raw: Float64Array = new Float64Array(bindPositions.length),
): Float32Array {
  if (output.length !== bindPositions.length) {
    throw new RangeError('Animation output position length mismatch.');
  }
  if (raw.length !== bindPositions.length) {
    throw new RangeError('Animation working position length mismatch.');
  }

  for (let i = 0; i < bindPositions.length; i += 3) {
    raw[i] = bindPositions[i]!;
    raw[i + 1] = -bindPositions[i + 1]!;
    // Bind positions are in reflected WebGL scene space. Restore Jagex Z
    // while applying classic frame transforms, then reflect it again below.
    raw[i + 2] = -bindPositions[i + 2]!;
  }

  let pivotX = 0;
  let pivotY = 0;
  let pivotZ = 0;

  for (
    let transform = 0;
    transform < frame.transformSkeletonLabels.length;
    transform += 1
  ) {
    const skeletonIndex = frame.transformSkeletonLabels[transform]!;
    const type = frame.skeleton.transformTypes[skeletonIndex]!;
    const labels =
      frame.skeleton.labels[skeletonIndex] ?? new Uint8Array();
    const x = frame.transformXs[transform]!;
    const y = frame.transformYs[transform]!;
    const z = frame.transformZs[transform]!;

    if (type === 0) {
      let count = 0;
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      forEachLabelVertex(labels, verticesByGroup, (vertex) => {
        const offset = vertex * 3;
        sumX += raw[offset]!;
        sumY += raw[offset + 1]!;
        sumZ += raw[offset + 2]!;
        count += 1;
      });
      if (count > 0) {
        pivotX = x + Math.trunc(sumX / count);
        pivotY = y + Math.trunc(sumY / count);
        pivotZ = z + Math.trunc(sumZ / count);
      } else {
        pivotX = x;
        pivotY = y;
        pivotZ = z;
      }
      continue;
    }

    if (type === 1) {
      forEachLabelVertex(labels, verticesByGroup, (vertex) => {
        const offset = vertex * 3;
        raw[offset] += x;
        raw[offset + 1] += y;
        raw[offset + 2] += z;
      });
      continue;
    }

    if (type === 2) {
      const angleX = ((x & 255) * 8) * Math.PI / 1024;
      const angleY = ((y & 255) * 8) * Math.PI / 1024;
      const angleZ = ((z & 255) * 8) * Math.PI / 1024;
      const sinX = Math.sin(angleX);
      const cosX = Math.cos(angleX);
      const sinY = Math.sin(angleY);
      const cosY = Math.cos(angleY);
      const sinZ = Math.sin(angleZ);
      const cosZ = Math.cos(angleZ);

      forEachLabelVertex(labels, verticesByGroup, (vertex) => {
        const offset = vertex * 3;
        let vx = raw[offset]! - pivotX;
        let vy = raw[offset + 1]! - pivotY;
        let vz = raw[offset + 2]! - pivotZ;

        if ((z & 255) !== 0) {
          const nextX = Math.trunc(sinZ * vy + cosZ * vx);
          vy = Math.trunc(cosZ * vy - sinZ * vx);
          vx = nextX;
        }
        if ((x & 255) !== 0) {
          const nextY = Math.trunc(cosX * vy - sinX * vz);
          vz = Math.trunc(sinX * vy + cosX * vz);
          vy = nextY;
        }
        if ((y & 255) !== 0) {
          const nextX = Math.trunc(sinY * vz + cosY * vx);
          vz = Math.trunc(cosY * vz - sinY * vx);
          vx = nextX;
        }

        raw[offset] = vx + pivotX;
        raw[offset + 1] = vy + pivotY;
        raw[offset + 2] = vz + pivotZ;
      });
      continue;
    }

    if (type === 3) {
      forEachLabelVertex(labels, verticesByGroup, (vertex) => {
        const offset = vertex * 3;
        const vx = raw[offset]! - pivotX;
        const vy = raw[offset + 1]! - pivotY;
        const vz = raw[offset + 2]! - pivotZ;
        raw[offset] = Math.trunc(x * vx / 128) + pivotX;
        raw[offset + 1] = Math.trunc(y * vy / 128) + pivotY;
        raw[offset + 2] = Math.trunc(z * vz / 128) + pivotZ;
      });
    }
  }

  for (let i = 0; i < raw.length; i += 3) {
    output[i] = raw[i]!;
    output[i + 1] = -raw[i + 1]!;
    output[i + 2] = -raw[i + 2]!;
  }
  return output;
}

function buildVerticesByGroup(
  groups: Int16Array,
): readonly (readonly number[])[] {
  let maxGroup = -1;
  for (const group of groups) {
    if (group > maxGroup) maxGroup = group;
  }
  const result: number[][] =
    Array.from({ length: maxGroup + 1 }, () => []);
  for (let vertex = 0; vertex < groups.length; vertex += 1) {
    const group = groups[vertex]!;
    if (group >= 0) result[group]!.push(vertex);
  }
  return result;
}

function forEachLabelVertex(
  labels: Uint8Array,
  verticesByGroup: readonly (readonly number[])[],
  visit: (vertex: number) => void,
): void {
  for (const label of labels) {
    const vertices = verticesByGroup[label];
    if (!vertices) continue;
    for (const vertex of vertices) visit(vertex);
  }
}

function sequenceOrMissing(id: number): number {
  return id === 0xffff || id < 0 ? -1 : id;
}

function fallbackSequence(id: number, fallback: number): number {
  const normalized = sequenceOrMissing(id);
  return normalized >= 0 ? normalized : fallback;
}
