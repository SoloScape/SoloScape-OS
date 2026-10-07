import type {
  AssembledScene,
  SceneBounds,
  SceneMesh,
} from './SceneAssembler';

interface GpuMesh {
  readonly positionBuffer: WebGLBuffer;
  readonly colorBuffer: WebGLBuffer;
  readonly textureCoordBuffer: WebGLBuffer;
  readonly textureIdBuffer: WebGLBuffer;
  readonly vertexCount: number;
}

export interface SceneTextureLayer {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  /** RGBA8 pixels in top-to-bottom row order. */
  readonly rgba: Uint8Array;
}

export interface LocalPlayerRenderPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Clockwise model rotation in radians around scene-space Y. */
  readonly yaw?: number;
}

export class WebGlSceneRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly positionLocation: number;
  private readonly colorLocation: number;
  private readonly textureCoordLocation: number;
  private readonly textureIdLocation: number;
  private readonly projectionLocation: WebGLUniformLocation;
  private readonly viewLocation: WebGLUniformLocation;
  private readonly modelLocation: WebGLUniformLocation;
  private readonly textureSamplerLocation: WebGLUniformLocation;
  private readonly textureArray: WebGLTexture;
  private readonly textureLayerById = new Map<number, number>();
  private terrainMesh: GpuMesh | null = null;
  private locationMesh: GpuMesh | null = null;
  private playerMesh: GpuMesh | null = null;
  private playerMeshSource: SceneMesh | null = null;
  private scene: AssembledScene | null = null;
  private localPlayerPosition: LocalPlayerRenderPosition | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      throw new Error('WebGL2 is unavailable in this browser.');
    }
    this.gl = gl;
    this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    this.positionLocation = gl.getAttribLocation(this.program, 'aPosition');
    this.colorLocation = gl.getAttribLocation(this.program, 'aColor');
    this.textureCoordLocation =
      gl.getAttribLocation(this.program, 'aTextureCoord');
    this.textureIdLocation =
      gl.getAttribLocation(this.program, 'aTextureId');

    const projectionLocation = gl.getUniformLocation(
      this.program,
      'uProjection',
    );
    const viewLocation = gl.getUniformLocation(this.program, 'uView');
    const modelLocation = gl.getUniformLocation(this.program, 'uModel');
    const textureSamplerLocation =
      gl.getUniformLocation(this.program, 'uTextures');
    if (
      !projectionLocation ||
      !viewLocation ||
      !modelLocation ||
      !textureSamplerLocation
    ) {
      throw new Error('Scene shader uniforms are unavailable.');
    }
    this.projectionLocation = projectionLocation;
    this.viewLocation = viewLocation;
    this.modelLocation = modelLocation;
    this.textureSamplerLocation = textureSamplerLocation;

    const textureArray = gl.createTexture();
    if (!textureArray) {
      throw new Error('Unable to allocate the scene texture array.');
    }
    this.textureArray = textureArray;
    this.resetTextureArray();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0.075, 0.105, 0.13, 1);

    window.addEventListener('resize', this.handleResize);
    this.clear();
  }

  /**
   * Uploads real cache-backed RGBA textures into a WebGL2 2D texture array.
   *
   * Scene meshes keep cache texture ids while this renderer compacts the
   * resident set into array layers. Meshes are re-uploaded after this call so
   * faces whose textures just became resident switch from the colour fallback
   * to texture sampling without requiring sparse texture-array allocation.
   */
  setTextureLayers(layers: readonly SceneTextureLayer[]): void {
    const gl = this.gl;
    this.textureLayerById.clear();

    if (layers.length === 0) {
      this.resetTextureArray();
      this.reuploadMeshesForTextureState();
      return;
    }

    const width = layers[0]!.width;
    const height = layers[0]!.height;
    if (width <= 0 || height <= 0) {
      throw new RangeError('Scene textures must have positive dimensions.');
    }

    const seen = new Set<number>();
    for (const layer of layers) {
      if (!Number.isInteger(layer.id) || layer.id < 0) {
        throw new RangeError('Scene texture ids must be non-negative integers.');
      }
      if (seen.has(layer.id)) {
        throw new RangeError('Duplicate scene texture id ' + layer.id + '.');
      }
      if (layer.width !== width || layer.height !== height) {
        throw new RangeError(
          'All scene texture-array layers must have identical dimensions.',
        );
      }
      if (layer.rgba.length !== width * height * 4) {
        throw new RangeError(
          'Texture ' + layer.id + ' has ' + layer.rgba.length +
            ' RGBA bytes; expected ' + (width * height * 4) + '.',
        );
      }
      seen.add(layer.id);
    }

    const layerCount = layers.length;
    const maxLayers = gl.getParameter(
      gl.MAX_ARRAY_TEXTURE_LAYERS,
    ) as number;
    if (layerCount > maxLayers) {
      throw new RangeError(
        'Scene needs ' + layerCount + ' resident textures but this device ' +
          'supports ' + maxLayers + ' WebGL2 texture-array layers.',
      );
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArray);
    this.configureTextureArraySampling();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA8,
      width,
      height,
      layerCount,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );

    for (let arrayLayer = 0; arrayLayer < layers.length; arrayLayer += 1) {
      const layer = layers[arrayLayer]!;
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        arrayLayer,
        width,
        height,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        layer.rgba,
      );
      this.textureLayerById.set(layer.id, arrayLayer);
    }

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    this.reuploadMeshesForTextureState();
  }

  render(scene: AssembledScene): void {
    this.scene = scene;
    this.deleteSceneGpuMeshes();
    this.terrainMesh = this.uploadMesh(scene.terrain);
    this.locationMesh = this.uploadMesh(scene.locations);
    this.draw();
  }

  setLocalPlayerPosition(
    position: LocalPlayerRenderPosition | null,
  ): void {
    this.localPlayerPosition = position
      ? { ...position }
      : null;
    this.draw();
  }

  setLocalPlayerMesh(mesh: SceneMesh | null): void {
    this.playerMeshSource = mesh;
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = mesh ? this.uploadMesh(mesh) : null;
    this.draw();
  }

  clear(): void {
    this.scene = null;
    this.localPlayerPosition = null;
    this.playerMeshSource = null;
    this.deleteSceneGpuMeshes();
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = null;
    this.resizeDrawingBuffer();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.deleteSceneGpuMeshes();
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = null;
    this.gl.deleteTexture(this.textureArray);
    this.gl.deleteProgram(this.program);
  }

  private readonly handleResize = (): void => {
    this.draw();
  };

  private draw(): void {
    const gl = this.gl;
    this.resizeDrawingBuffer();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!this.scene) {
      return;
    }

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArray);
    gl.uniform1i(this.textureSamplerLocation, 0);

    const matrices = this.localPlayerPosition
      ? createPlayerFollowCameraMatrices(
          this.localPlayerPosition,
          this.scene.bounds,
          this.canvas.width / Math.max(1, this.canvas.height),
        )
      : createOverviewCameraMatrices(
          this.scene.bounds,
          this.canvas.width / Math.max(1, this.canvas.height),
        );

    gl.uniformMatrix4fv(
      this.projectionLocation,
      false,
      matrices.projection,
    );
    gl.uniformMatrix4fv(this.viewLocation, false, matrices.view);

    const identity = identityMatrix();
    if (this.terrainMesh) {
      this.drawMesh(this.terrainMesh, identity);
    }
    if (this.locationMesh) {
      this.drawMesh(this.locationMesh, identity);
    }

    if (this.playerMesh && this.localPlayerPosition) {
      this.drawMesh(
        this.playerMesh,
        translationRotationYMatrix(
          this.localPlayerPosition.x,
          this.localPlayerPosition.y,
          this.localPlayerPosition.z,
          this.localPlayerPosition.yaw ?? 0,
        ),
      );
    }
  }

  private uploadMesh(mesh: SceneMesh): GpuMesh | null {
    if (mesh.vertexCount === 0) {
      return null;
    }
    if (
      mesh.positions.length !== mesh.vertexCount * 3 ||
      mesh.colors.length !== mesh.vertexCount * 3 ||
      mesh.textureCoords.length !== mesh.vertexCount * 2 ||
      mesh.textureIds.length !== mesh.vertexCount
    ) {
      throw new RangeError('Scene mesh attribute lengths are inconsistent.');
    }

    const gl = this.gl;
    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    const textureCoordBuffer = gl.createBuffer();
    const textureIdBuffer = gl.createBuffer();
    if (
      !positionBuffer ||
      !colorBuffer ||
      !textureCoordBuffer ||
      !textureIdBuffer
    ) {
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (colorBuffer) gl.deleteBuffer(colorBuffer);
      if (textureCoordBuffer) gl.deleteBuffer(textureCoordBuffer);
      if (textureIdBuffer) gl.deleteBuffer(textureIdBuffer);
      throw new Error('Unable to allocate WebGL scene buffers.');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.textureCoords, gl.STATIC_DRAW);

    const residentTextureIds = new Int32Array(mesh.textureIds.length);
    for (let i = 0; i < mesh.textureIds.length; i += 1) {
      const textureId = mesh.textureIds[i]!;
      residentTextureIds[i] =
        this.textureLayerById.get(textureId) ?? -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, textureIdBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, residentTextureIds, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return {
      positionBuffer,
      colorBuffer,
      textureCoordBuffer,
      textureIdBuffer,
      vertexCount: mesh.vertexCount,
    };
  }

  private drawMesh(
    mesh: GpuMesh,
    model: Float32Array,
  ): void {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.modelLocation, false, model);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(
      this.positionLocation,
      3,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorBuffer);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribPointer(
      this.colorLocation,
      3,
      gl.UNSIGNED_BYTE,
      true,
      0,
      0,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureCoordBuffer);
    gl.enableVertexAttribArray(this.textureCoordLocation);
    gl.vertexAttribPointer(
      this.textureCoordLocation,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureIdBuffer);
    gl.enableVertexAttribArray(this.textureIdLocation);
    gl.vertexAttribIPointer(
      this.textureIdLocation,
      1,
      gl.INT,
      0,
      0,
    );

    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

  private resetTextureArray(): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArray);
    this.configureTextureArraySampling();
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA8,
      1,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  }

  private configureTextureArraySampling(): void {
    const gl = this.gl;
    gl.texParameteri(
      gl.TEXTURE_2D_ARRAY,
      gl.TEXTURE_MIN_FILTER,
      gl.NEAREST,
    );
    gl.texParameteri(
      gl.TEXTURE_2D_ARRAY,
      gl.TEXTURE_MAG_FILTER,
      gl.NEAREST,
    );
    // Match the classic client texture rasterizer: U clamps at the edge while
    // the row coordinate wraps. This is also the convention Olden-Shire's
    // WebGL2 fidelity path uses.
    gl.texParameteri(
      gl.TEXTURE_2D_ARRAY,
      gl.TEXTURE_WRAP_S,
      gl.CLAMP_TO_EDGE,
    );
    gl.texParameteri(
      gl.TEXTURE_2D_ARRAY,
      gl.TEXTURE_WRAP_T,
      gl.REPEAT,
    );
  }

  private reuploadMeshesForTextureState(): void {
    if (this.scene) {
      this.deleteSceneGpuMeshes();
      this.terrainMesh = this.uploadMesh(this.scene.terrain);
      this.locationMesh = this.uploadMesh(this.scene.locations);
    }
    this.deleteGpuMesh(this.playerMesh);
    this.playerMesh = this.playerMeshSource
      ? this.uploadMesh(this.playerMeshSource)
      : null;
    this.draw();
  }

  private resizeDrawingBuffer(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  private deleteSceneGpuMeshes(): void {
    this.deleteGpuMesh(this.terrainMesh);
    this.deleteGpuMesh(this.locationMesh);
    this.terrainMesh = null;
    this.locationMesh = null;
  }

  private deleteGpuMesh(mesh: GpuMesh | null): void {
    if (!mesh) {
      return;
    }
    this.gl.deleteBuffer(mesh.positionBuffer);
    this.gl.deleteBuffer(mesh.colorBuffer);
    this.gl.deleteBuffer(mesh.textureCoordBuffer);
    this.gl.deleteBuffer(mesh.textureIdBuffer);
  }
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

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    throw new Error('Unable to create WebGL scene program.');
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'unknown link error';
    gl.deleteProgram(program);
    throw new Error('Scene shader link failed: ' + message);
  }
  return program;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to create WebGL shader.');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'unknown compile error';
    gl.deleteShader(shader);
    throw new Error('Scene shader compile failed: ' + message);
  }
  return shader;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;
in vec2 aTextureCoord;
in int aTextureId;

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
