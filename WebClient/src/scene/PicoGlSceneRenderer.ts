import PicoGL, {
  type App, type Program, type VertexBuffer, type VertexArray,
  type DrawCall, type Texture,
} from 'picogl';
import type { AssembledScene, SceneBounds, SceneMesh } from './SceneAssembler';
import type { OrbitCameraRenderState } from '../runtime/OrbitCamera';

/** PicoGL owns shaders, vertex buffers, VAOs, draw calls and texture state. */
interface GpuMesh {
  readonly positions: VertexBuffer;
  readonly colors: VertexBuffer;
  readonly uvs: VertexBuffer;
  readonly textureIds: VertexBuffer;
  readonly vertexArray: VertexArray;
  readonly drawCall: DrawCall;
}

export interface SceneTextureLayer {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  /** Original validated JS5 RGBA8, top-to-bottom order. */
  readonly rgba: Uint8Array;
}

export interface LocalPlayerRenderPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw?: number;
}

/** Game-scene rendering via the same WebGL2/PicoGL abstraction as xrsps. */
export class PicoGlSceneRenderer {
  private readonly app: App;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: Program;
  private textureArray: Texture;
  private readonly textureLayerById = new Map<number, number>();
  private terrainMesh: GpuMesh | null = null;
  private locationMesh: GpuMesh | null = null;
  private playerMesh: GpuMesh | null = null;
  private playerMeshSource: SceneMesh | null = null;
  private playerAnimatedPositions: Float32Array | null = null;
  private scene: AssembledScene | null = null;
  private localPlayerPosition: LocalPlayerRenderPosition | null = null;
  private orbitCamera: OrbitCameraRenderState | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    // PicoGL creates and manages a WebGL2 context, rather than our former
    // manual shader/buffer/VAO plumbing.
    if (!canvas.getContext('webgl2')) {
      throw new Error('WebGL2 is unavailable in this browser.');
    }
    this.app = PicoGL.createApp(canvas, {
      alpha: false, antialias: true, depth: true,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
    this.gl = this.app.gl;
    this.program = this.app.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.textureArray = this.createTextureArray(
      new Uint8Array([255, 255, 255, 255]), 1, 1, 1,
    );
    this.app.enable(PicoGL.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    this.app.disable(PicoGL.CULL_FACE);
    this.app.clearColor(0.075, 0.105, 0.13, 1);
    window.addEventListener('resize', this.handleResize);
    this.clear();
  }

  /** Keep actual cache texture IDs and remap only the resident GPU layers. */
  setTextureLayers(layers: readonly SceneTextureLayer[]): void {
    const mapping = new Map<number, number>();
    let bytes: Uint8Array;
    let width = 1, height = 1, count = 1;
    if (layers.length > 0) {
      width = layers[0]!.width;
      height = layers[0]!.height;
      count = layers.length;
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
          width <= 0 || height <= 0) {
        throw new RangeError('Invalid scene texture dimensions.');
      }
      const maxLayers = this.gl.getParameter(this.gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
      if (count > maxLayers) {
        throw new RangeError('Scene texture array exceeds hardware layer limit.');
      }
      const layerBytes = width * height * 4;
      bytes = new Uint8Array(layerBytes * count);
      layers.forEach((layer, index) => {
        if (!Number.isInteger(layer.id) || layer.id < 0 ||
            mapping.has(layer.id) ||
            layer.width !== width || layer.height !== height ||
            layer.rgba.length !== layerBytes) {
          throw new RangeError('Invalid/duplicate JS5 texture layer ' + layer.id);
        }
        mapping.set(layer.id, index);
        bytes.set(layer.rgba, index * layerBytes);
      });
    } else {
      bytes = new Uint8Array([255, 255, 255, 255]);
    }
    const next = this.createTextureArray(bytes, width, height, count);
    this.textureArray.delete();
    this.textureArray = next;
    this.textureLayerById.clear();
    for (const [id, index] of mapping) this.textureLayerById.set(id, index);
    // Rebind resident texture arrays in PicoGL draw calls when layers change.
    this.reuploadMeshesForTextureState();
  }

  render(scene: AssembledScene): void {
    this.scene = scene;
    this.deleteSceneGpuMeshes();
    this.terrainMesh = this.uploadMesh(scene.terrain);
    this.locationMesh = this.uploadMesh(scene.locations);
  }

  renderFrame(interpolationAlpha = 0): void {
    void interpolationAlpha;
    this.draw();
  }

  setLocalPlayerPosition(position: LocalPlayerRenderPosition | null): void {
    this.localPlayerPosition = position ? { ...position } : null;
  }

  setOrbitCamera(camera: OrbitCameraRenderState | null): void {
    this.orbitCamera = camera ? { ...camera } : null;
  }

  setLocalPlayerMesh(mesh: SceneMesh | null): void {
    this.playerMeshSource = mesh;
    this.playerAnimatedPositions = null;
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = mesh ? this.uploadMesh(mesh, true) : null;
  }

  setLocalPlayerAnimatedPositions(positions: Float32Array | null): void {
    if (!this.playerMeshSource) {
      this.playerAnimatedPositions = null;
      return;
    }
    const source = positions ?? this.playerMeshSource.positions;
    if (source.length !== this.playerMeshSource.positions.length) {
      throw new RangeError('Animated player position count differs from cached mesh.');
    }
    this.playerAnimatedPositions = positions;
    this.playerMesh?.positions.data(source);
  }

  clear(): void {
    this.scene = null;
    this.localPlayerPosition = null;
    this.orbitCamera = null;
    this.playerMeshSource = null;
    this.playerAnimatedPositions = null;
    this.deleteSceneGpuMeshes();
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = null;
    this.resizeDrawingBuffer();
    this.app.clear();
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.deleteSceneGpuMeshes();
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = null;
    this.textureArray.delete();
    this.program.delete();
  }

  private createTextureArray(
    data: Uint8Array, width: number, height: number, depth: number,
  ): Texture {
    return this.app.createTextureArray(data, width, height, depth, {
      internalFormat: PicoGL.RGBA8,
      minFilter: PicoGL.NEAREST,
      magFilter: PicoGL.NEAREST,
      wrapS: PicoGL.CLAMP_TO_EDGE,
      wrapT: PicoGL.REPEAT,
      flipY: false,
    });
  }

  private readonly handleResize = (): void => {
    this.renderFrame();
  };

  private draw(): void {
    this.resizeDrawingBuffer();
    this.app.clear();
    if (!this.scene) return;
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const matrices = this.orbitCamera
      ? createOrbitCameraMatrices(this.orbitCamera, this.scene.bounds, aspect)
      : this.localPlayerPosition
        ? createPlayerFollowCameraMatrices(
            this.localPlayerPosition, this.scene.bounds, aspect,
          )
        : createOverviewCameraMatrices(this.scene.bounds, aspect);
    const identity = identityMatrix();
    if (this.terrainMesh) {
      this.drawMesh(this.terrainMesh, identity, matrices);
    }
    if (this.locationMesh) {
      this.drawMesh(this.locationMesh, identity, matrices);
    }
    if (this.playerMesh && this.localPlayerPosition) {
      this.drawMesh(this.playerMesh, translationRotationYMatrix(
        this.localPlayerPosition.x, this.localPlayerPosition.y,
        this.localPlayerPosition.z, this.localPlayerPosition.yaw ?? 0,
      ), matrices);
    }
  }

  private uploadMesh(mesh: SceneMesh, dynamicPositions = false): GpuMesh | null {
    if (mesh.vertexCount === 0) return null;
    if (mesh.positions.length !== mesh.vertexCount * 3 ||
        mesh.colors.length !== mesh.vertexCount * 3 ||
        mesh.textureCoords.length !== mesh.vertexCount * 2 ||
        mesh.textureIds.length !== mesh.vertexCount) {
      throw new RangeError('Scene mesh attributes do not have matching lengths.');
    }
    const positions = this.app.createVertexBuffer(
      PicoGL.FLOAT, 3, mesh.positions,
      dynamicPositions ? PicoGL.DYNAMIC_DRAW : PicoGL.STATIC_DRAW,
    );
    const colors = this.app.createVertexBuffer(
      PicoGL.UNSIGNED_BYTE, 3, mesh.colors,
    );
    const uvs = this.app.createVertexBuffer(
      PicoGL.FLOAT, 2, mesh.textureCoords,
    );
    const layers = new Int32Array(mesh.textureIds.length);
    for (let i = 0; i < layers.length; i++) {
      layers[i] = this.textureLayerById.get(mesh.textureIds[i]!) ?? -1;
    }
    const textureIds = this.app.createVertexBuffer(PicoGL.INT, 1, layers);
    const vertexArray = this.app.createVertexArray()
      .vertexAttributeBuffer(0, positions)
      .vertexAttributeBuffer(1, colors, { normalized: true })
      .vertexAttributeBuffer(2, uvs)
      .vertexAttributeBuffer(3, textureIds, { integer: true });
    const drawCall = this.app.createDrawCall(this.program, vertexArray)
      .texture('uTextures', this.textureArray);
    return { positions, colors, uvs, textureIds, vertexArray, drawCall };
  }

  private drawMesh(
    mesh: GpuMesh,
    model: Float32Array,
    matrices: {projection: Float32Array; view: Float32Array},
  ): void {
    mesh.drawCall
      .uniform('uProjection', matrices.projection)
      .uniform('uView', matrices.view)
      .uniform('uModel', model)
      .draw();
  }

  private reuploadMeshesForTextureState(): void {
    if (this.scene) {
      this.deleteSceneGpuMeshes();
      this.terrainMesh = this.uploadMesh(this.scene.terrain);
      this.locationMesh = this.uploadMesh(this.scene.locations);
    }
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = this.playerMeshSource
      ? this.uploadMesh(this.playerMeshSource, true) : null;
    if (this.playerAnimatedPositions) {
      this.setLocalPlayerAnimatedPositions(this.playerAnimatedPositions);
    }
  }

  private resizeDrawingBuffer(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.app.resize(width, height);
    }
  }

  private deleteSceneGpuMeshes(): void {
    this.deleteGpuMesh(this.terrainMesh);
    this.deleteGpuMesh(this.locationMesh);
    this.terrainMesh = null;
    this.locationMesh = null;
  }

  private deleteGpuMesh(mesh: GpuMesh | null): void {
    if (!mesh) return;
    mesh.vertexArray.delete();
    mesh.positions.delete();
    mesh.colors.delete();
    mesh.uvs.delete();
    mesh.textureIds.delete();
  }
}

function createOrbitCameraMatrices(
  camera: OrbitCameraRenderState,
  bounds: SceneBounds,
  aspect: number,
): { projection: Float32Array; view: Float32Array } {
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const far = Math.max(18000, Math.max(spanX, spanZ) * 2.5);

  return {
    projection: perspective(
      48 * Math.PI / 180,
      Math.max(0.1, aspect),
      32,
      far,
    ),
    view: lookAt(
      camera.eyeX,
      camera.eyeY,
      camera.eyeZ,
      camera.targetX,
      camera.targetY,
      camera.targetZ,
      0,
      1,
      0,
    ),
  };
}

function createPlayerFollowCameraMatrices(
  player: LocalPlayerRenderPosition,
  bounds: SceneBounds,
  aspect: number,
): { projection: Float32Array; view: Float32Array } {
  // First gameplay camera milestone: anchor the camera to the local player's
  // coordinate instead of framing the entire 104x104 scene. Camera packets,
  // pitch/yaw input and the exact client interpolation can layer on this same
  // persistent target state next.
  const yaw = 0.78 * Math.PI;
  const horizontalDistance = 880;
  const verticalDistance = 640;
  const targetY = player.y + 85;
  const eye = {
    x: player.x + Math.sin(yaw) * horizontalDistance,
    y: player.y + verticalDistance,
    z: player.z + Math.cos(yaw) * horizontalDistance,
  };

  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const far = Math.max(18000, Math.max(spanX, spanZ) * 2.5);

  return {
    projection: perspective(
      48 * Math.PI / 180,
      Math.max(0.1, aspect),
      32,
      far,
    ),
    view: lookAt(
      eye.x,
      eye.y,
      eye.z,
      player.x,
      targetY,
      player.z,
      0,
      1,
      0,
    ),
  };
}

function createOverviewCameraMatrices(
  bounds: SceneBounds,
  aspect: number,
): { projection: Float32Array; view: Float32Array } {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const span = Math.max(spanX, spanZ, spanY * 1.5);
  const eye = {
    x: centerX + span * 0.58,
    y: bounds.maxY + span * 0.72,
    z: centerZ - span * 0.82,
  };
  const target = {
    x: centerX,
    y: centerY * 0.65,
    z: centerZ,
  };
  return {
    projection: perspective(
      48 * Math.PI / 180,
      Math.max(0.1, aspect),
      Math.max(16, span / 200),
      span * 4.5 + 4096,
    ),
    view: lookAt(
      eye.x,
      eye.y,
      eye.z,
      target.x,
      target.y,
      target.z,
      0,
      1,
      0,
    ),
  };
}

function identityMatrix(): Float32Array {
  return Float32Array.from([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function translationRotationYMatrix(
  x: number,
  y: number,
  z: number,
  radians: number,
): Float32Array {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return Float32Array.from([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    x, y, z, 1,
  ]);
}

function perspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const range = 1 / (near - far);
  return Float32Array.from([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * range, -1,
    0, 0, 2 * far * near * range, 0,
  ]);
}

function lookAt(
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  upX: number,
  upY: number,
  upZ: number,
): Float32Array {
  let zX = eyeX - targetX;
  let zY = eyeY - targetY;
  let zZ = eyeZ - targetZ;
  const zLength = Math.hypot(zX, zY, zZ) || 1;
  zX /= zLength;
  zY /= zLength;
  zZ /= zLength;

  let xX = upY * zZ - upZ * zY;
  let xY = upZ * zX - upX * zZ;
  let xZ = upX * zY - upY * zX;
  const xLength = Math.hypot(xX, xY, xZ) || 1;
  xX /= xLength;
  xY /= xLength;
  xZ /= xLength;

  const yX = zY * xZ - zZ * xY;
  const yY = zZ * xX - zX * xZ;
  const yZ = zX * xY - zY * xX;

  return Float32Array.from([
    xX, yX, zX, 0,
    xY, yY, zY, 0,
    xZ, yZ, zZ, 0,
    -(xX * eyeX + xY * eyeY + xZ * eyeZ),
    -(yX * eyeX + yY * eyeY + yZ * eyeZ),
    -(zX * eyeX + zY * eyeY + zZ * eyeZ),
    1,
  ]);
}


const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aTextureCoord;
layout(location = 3) in int aTextureId;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

out vec3 vColor;
out vec2 vTextureCoord;
flat out int vTextureId;
out float vDepth;

void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vec4 viewPosition = uView * worldPosition;
  gl_Position = uProjection * viewPosition;
  vColor = aColor;
  vTextureCoord = aTextureCoord;
  vTextureId = aTextureId;
  vDepth = max(0.0, -viewPosition.z);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec3 vColor;
in vec2 vTextureCoord;
flat in int vTextureId;
in float vDepth;

uniform sampler2DArray uTextures;

out vec4 outColor;

void main() {
  vec3 material = vColor;
  if (vTextureId >= 0) {
    vec4 texel = texture(uTextures, vec3(vTextureCoord, float(vTextureId)));
    if (texel.a <= 0.0039) {
      discard;
    }
    material = texel.rgb * vColor;
  }

  float fog = smoothstep(9000.0, 28000.0, vDepth);
  vec3 sky = vec3(0.075, 0.105, 0.13);
  outColor = vec4(mix(material, sky, fog), 1.0);
}
`;
