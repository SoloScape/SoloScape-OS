import type {
  AssembledScene,
  SceneBounds,
  SceneMesh,
} from './SceneAssembler';

interface GpuMesh {
  readonly positionBuffer: WebGLBuffer;
  readonly colorBuffer: WebGLBuffer;
  readonly vertexCount: number;
}

export class WebGlSceneRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly positionLocation: number;
  private readonly colorLocation: number;
  private readonly projectionLocation: WebGLUniformLocation;
  private readonly viewLocation: WebGLUniformLocation;
  private terrainMesh: GpuMesh | null = null;
  private locationMesh: GpuMesh | null = null;
  private scene: AssembledScene | null = null;

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

    const projectionLocation = gl.getUniformLocation(
      this.program,
      'uProjection',
    );
    const viewLocation = gl.getUniformLocation(this.program, 'uView');
    if (!projectionLocation || !viewLocation) {
      throw new Error('Static-scene shader uniforms are unavailable.');
    }
    this.projectionLocation = projectionLocation;
    this.viewLocation = viewLocation;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0.075, 0.105, 0.13, 1);

    window.addEventListener('resize', this.handleResize);
    this.clear();
  }

  render(scene: AssembledScene): void {
    this.scene = scene;
    this.deleteGpuMeshes();
    this.terrainMesh = this.uploadMesh(scene.terrain);
    this.locationMesh = this.uploadMesh(scene.locations);
    this.draw();
  }

  clear(): void {
    this.scene = null;
    this.deleteGpuMeshes();
    this.resizeDrawingBuffer();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.deleteGpuMeshes();
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

    const matrices = createCameraMatrices(
      this.scene.bounds,
      this.canvas.width / Math.max(1, this.canvas.height),
    );
    gl.uniformMatrix4fv(
      this.projectionLocation,
      false,
      matrices.projection,
    );
    gl.uniformMatrix4fv(this.viewLocation, false, matrices.view);

    if (this.terrainMesh) {
      this.drawMesh(this.terrainMesh);
    }
    if (this.locationMesh) {
      this.drawMesh(this.locationMesh);
    }
  }

  private uploadMesh(mesh: SceneMesh): GpuMesh | null {
    if (mesh.vertexCount === 0) {
      return null;
    }

    const gl = this.gl;
    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    if (!positionBuffer || !colorBuffer) {
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (colorBuffer) gl.deleteBuffer(colorBuffer);
      throw new Error('Unable to allocate WebGL scene buffers.');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return {
      positionBuffer,
      colorBuffer,
      vertexCount: mesh.vertexCount,
    };
  }

  private drawMesh(mesh: GpuMesh): void {
    const gl = this.gl;

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

    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
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

  private deleteGpuMeshes(): void {
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
  }
}

function createCameraMatrices(
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
  const projection = perspective(
    48 * Math.PI / 180,
    Math.max(0.1, aspect),
    Math.max(16, span / 200),
    span * 4.5 + 4096,
  );
  const view = lookAt(
    eye.x,
    eye.y,
    eye.z,
    target.x,
    target.y,
    target.z,
    0,
    1,
    0,
  );
  return { projection, view };
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
    throw new Error('Static-scene shader link failed: ' + message);
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
    throw new Error('Static-scene shader compile failed: ' + message);
  }
  return shader;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uProjection;
uniform mat4 uView;

out vec3 vColor;
out float vDepth;

void main() {
  vec4 viewPosition = uView * vec4(aPosition, 1.0);
  gl_Position = uProjection * viewPosition;
  vColor = aColor;
  vDepth = max(0.0, -viewPosition.z);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec3 vColor;
in float vDepth;

out vec4 outColor;

void main() {
  float fog = smoothstep(9000.0, 28000.0, vDepth);
  vec3 sky = vec3(0.075, 0.105, 0.13);
  outColor = vec4(mix(vColor, sky, fog), 1.0);
}
`;
