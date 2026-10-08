import './style.css';
import { IndexedDbCacheStore } from './cache/IndexedDbCacheStore';
import { Js5Client } from './cache/Js5Client';
import {
  MapSquareLoader,
  type LoadedMapSquare,
} from './cache/MapSquareLoader';
import {
  SceneAssetLoader,
  type LoadedSceneAssets,
} from './cache/SceneAssetLoader';
import { PlayerModelAssetLoader } from './cache/PlayerModelAssetLoader';
import { PlayerAnimationAssetLoader } from './cache/PlayerAnimationAssetLoader';
import {
  SceneMaterialLoader,
  type SceneMaterialAssets,
} from './cache/SceneMaterialLoader';
import {
  loadJs5StartupAssets,
  type Js5StartupAssets,
} from './cache/Js5StartupAssets';
import {
  presentJs5Archives,
} from './cache/Js5MasterIndex';
import {
  loadTitleScreenAssets,
  type TitleScreenAssets,
} from './cache/TitleScreenAssets';
import { WebSocketTransport } from './net/WebSocketTransport';
import { GameLoginClient } from './protocol/GameLoginClient';
import {
  PLAYER_INFO_OPCODE,
  Rev240PlayerInfoDecoder,
  type ClientPlayer,
  type ClientPlayerRenderState,
} from './protocol/PlayerInfoDecoder';
import {
  tryDecodeRegionRebuildPacket,
  type RegionRebuild,
} from './protocol/RegionRebuildDecoder';
import {
  OSRS_CLIENT_TARGET,
  OSRS_PROTOCOL_REVISION,
} from './protocol/revision';
import {
  SCENE_TILE_SIZE,
  SceneTerrainSampler,
  assembleScene,
  type AssembledScene,
  type SceneMesh,
} from './scene/SceneAssembler';
import { WebGlSceneRenderer } from './scene/WebGlSceneRenderer';
import {
  pickWalkDestination,
  type WalkDestination,
} from './scene/ViewportWalkPicker';
import {
  BrowserGameLoop,
  CLIENT_TICK_MS,
} from './runtime/BrowserGameLoop';
import { jagexYawToRadians } from './runtime/PlayerMovement';
import { PlayerAnimationController } from './runtime/PlayerAnimation';
import {
  OrbitCamera,
  OrbitCameraInputController,
  type OrbitCameraRenderState,
} from './runtime/OrbitCamera';
import {
  CacheTitleScreenRenderer,
  type LoginField,
} from './ui/CacheTitleScreenRenderer';
import { ClientBootRenderer } from './ui/ClientBootRenderer';
import { applyLoginKey } from './ui/LoginInput';
import { MobileHud } from './ui/MobileHud';
import { Rev240UiState } from './protocol/Rev240UiState';
import { loadCacheGameUiAssets } from './cache/CacheGameUiAssets';
import type { CacheInterfaceStore } from './cache/CacheInterfaceDefinitions';

const CLIENT_VIEWPORT_WIDTH = 765;
const CLIENT_VIEWPORT_HEIGHT = 503;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(
      'Web client shell is missing required element ' + selector + '.',
    );
  }
  return element;
}

const gameCanvas = requireElement<HTMLCanvasElement>('#game');
const clientUiCanvas = requireElement<HTMLCanvasElement>('#client-ui');
const loginUsername = requireElement<HTMLInputElement>('#login-username');
const loginPassword = requireElement<HTMLInputElement>('#login-password');
const urlInput = requireElement<HTMLInputElement>('#gateway-url');
const connectButton = requireElement<HTMLButtonElement>('#connect');
const status = requireElement<HTMLElement>('#status');
const loginStatus = requireElement<HTMLElement>('#login-status');
const revision = requireElement<HTMLElement>('#revision');
const log = requireElement<HTMLElement>('#log');
const debugPanel = requireElement<HTMLDetailsElement>('#debug-panel');

const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
const defaultGatewayUrl = scheme + '://' + location.hostname + ':8081';

urlInput.value =
  localStorage.getItem('soloscape.gatewayUrl') ?? defaultGatewayUrl;
loginUsername.value =
  localStorage.getItem('soloscape.username') ?? '';
debugPanel.hidden =
  !new URLSearchParams(location.search).has('debug');

revision.textContent =
  'protocol ' + OSRS_PROTOCOL_REVISION +
  ' / client ' + OSRS_CLIENT_TARGET;

const js5Transport = new WebSocketTransport();
const cacheStore = new IndexedDbCacheStore();
const js5 = new Js5Client(js5Transport, cacheStore);
const gameTransport = new WebSocketTransport();
const gameLogin = new GameLoginClient(gameTransport);
const mapSquareLoader = new MapSquareLoader(js5, appendLog);
const sceneAssetLoader = new SceneAssetLoader(js5, appendLog);
const sceneMaterialLoader = new SceneMaterialLoader(js5, appendLog);
const playerModelLoader = new PlayerModelAssetLoader(js5, appendLog);
const playerAnimationLoader =
  new PlayerAnimationAssetLoader(js5, appendLog);
const bootRenderer = new ClientBootRenderer(clientUiCanvas);
const mobileHud = new MobileHud(
  requireElement<HTMLElement>('#mobile-hud'),
  {
    onLogout: () => {
      if (titleMode === 'game') {
        gameLogin.disconnect();
      }
    },
    onCameraNorth: () => {
      const player = playerInfo?.getLocalPlayer();
      if (!player || !currentScene) return;
      orbitCamera.reset(
        player.coord.x * SCENE_TILE_SIZE -
          currentScene.originTileX * SCENE_TILE_SIZE + SCENE_TILE_SIZE / 2,
        currentScene.originTileZ * SCENE_TILE_SIZE -
          player.coord.z * SCENE_TILE_SIZE - SCENE_TILE_SIZE / 2,
      );
    },
    onZoom: (delta) => orbitCamera.queueZoom(delta),
    onCacheArtStatus: appendLog,
    onHudAction: (action) => appendLog('HUD action: ' + action),
  },
);

const uiState = new Rev240UiState();
mobileHud.setServerUi(uiState);
uiState.onChange = () => mobileHud.refreshServerUi();

let sceneRenderer: WebGlSceneRenderer | null = null;
let browserGameLoop: BrowserGameLoop | null = null;
const orbitCamera = new OrbitCamera();
let orbitCameraInput: OrbitCameraInputController | null = null;
let titleRenderer: CacheTitleScreenRenderer | null = null;
let titleAssets: TitleScreenAssets | undefined;
let startupAssets: Js5StartupAssets | undefined;
let selectedLoginField: LoginField =
  loginUsername.value ? 'password' : 'username';
let loginMessage: string | undefined;
let cursorVisible = true;
let titleMode:
  | 'bootstrap'
  | 'welcome'
  | 'login'
  | 'new-user'
  | 'connecting'
  | 'loading'
  | 'game-loading'
  | 'game' = 'bootstrap';
let bootGeneration = 0;
let validatedLoginCrcs: readonly number[] | null = null;
let cacheReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let mapLoadGeneration = 0;
let playerModelGeneration = 0;
let framedGamePackets = 0;
let playerInfo: Rev240PlayerInfoDecoder | null = null;
let currentScene: AssembledScene | null = null;
let currentSceneMaps: readonly LoadedMapSquare[] | null = null;
let currentTerrainSampler: SceneTerrainSampler | null = null;
let currentPlayerMesh: SceneMesh | null = null;
let currentPlayerAnimation: PlayerAnimationController | null = null;
let uploadedPlayerAnimationRevision = -1;
let currentOrbitCameraRenderState: OrbitCameraRenderState | null = null;
let requestedAppearanceRevision = -1;

function appendLog(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  log.textContent += '[' + stamp + '] ' + message + '\n';
  log.scrollTop = log.scrollHeight;
}

function renderBootScreen(
  progress: number,
  message: string,
): void {
  titleMode = 'bootstrap';
  clientUiCanvas.hidden = false;
  bootRenderer.render(progress, message);
}

function renderWelcomeScreen(): void {
  if (!titleRenderer) {
    return;
  }

  titleMode = 'welcome';
  loginMessage = undefined;
  clientUiCanvas.hidden = false;
  loginUsername.blur();
  loginPassword.blur();
  titleRenderer.renderWelcome();
}

function renderNewUserScreen(): void {
  if (!titleRenderer) {
    return;
  }

  titleMode = 'new-user';
  clientUiCanvas.hidden = false;
  loginUsername.blur();
  loginPassword.blur();
  titleRenderer.renderNewUser();
}

function renderLoginScreen(message = loginMessage): void {
  if (!titleRenderer) {
    return;
  }

  titleMode = 'login';
  loginMessage = message;
  clientUiCanvas.hidden = false;
  titleRenderer.renderLogin({
    username: loginUsername.value,
    password: loginPassword.value,
    selectedField: selectedLoginField,
    message,
    showCursor: cursorVisible,
  });
}

function renderConnectingScreen(
  message = 'Connecting to server...',
): void {
  if (!titleRenderer) {
    renderBootScreen(100, message);
    return;
  }

  titleMode = 'connecting';
  clientUiCanvas.hidden = false;
  loginUsername.blur();
  loginPassword.blur();
  titleRenderer.renderConnecting({
    username: loginUsername.value,
    password: loginPassword.value,
    message,
  });
}

function renderGameLoading(
  _progress: number,
  message: string,
): void {
  if (!titleRenderer) {
    renderBootScreen(100, message);
    return;
  }

  // After login the original client no longer reuses the centered
  // title/bootstrap loader. startRebuild enters main state 25 and calls
  // Client.messageBox(Text.LOADING, true), which is a top-left overlay.
  titleMode = 'game-loading';
  clientUiCanvas.hidden = false;
  titleRenderer.renderGameMessage(message);
}

function gameLoginIsActive(): boolean {
  return gameLogin.state === 'connecting' ||
    gameLogin.state === 'handshake' ||
    gameLogin.state === 'server-seed' ||
    gameLogin.state === 'login-block' ||
    gameLogin.state === 'login-response' ||
    gameLogin.state === 'game';
}

function js5IsActive(): boolean {
  return js5.state === 'connecting' ||
    js5.state === 'handshake' ||
    js5.state === 'master-index' ||
    js5.state === 'archive-indices' ||
    js5.state === 'ready';
}

function resetSceneDebug(): void {
  browserGameLoop?.stop();
  (window as SoloScapeDebugWindow).soloscapeRegionRebuild = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneMaps = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneMaterials = undefined;
  (window as SoloScapeDebugWindow).soloscapeScene = undefined;
  (window as SoloScapeDebugWindow).soloscapeLocalPlayer = undefined;
  (window as SoloScapeDebugWindow).soloscapeLocalPlayerRenderState = undefined;
  (window as SoloScapeDebugWindow).soloscapeOrbitCameraState = undefined;
  (window as SoloScapeDebugWindow).soloscapeLastWalkDestination = undefined;
  currentOrbitCameraRenderState = null;
  currentScene = null;
  currentSceneMaps = null;
  currentTerrainSampler = null;
  currentPlayerMesh = null;
  currentPlayerAnimation = null;
  uploadedPlayerAnimationRevision = -1;
  requestedAppearanceRevision = -1;
  playerModelGeneration += 1;
  orbitCamera.clear();
  sceneRenderer?.clear();
}

function syncLocalPlayerRender(
  interpolationAlpha = 1,
): void {
  if (
    !sceneRenderer ||
    !currentScene ||
    !currentTerrainSampler ||
    !playerInfo
  ) {
    return;
  }

  const player = playerInfo.getLocalPlayer();
  const renderState =
    playerInfo.getLocalPlayerRenderState(interpolationAlpha);
  if (!player || !renderState) {
    return;
  }

  const x =
    renderState.fineX -
    currentScene.originTileX * SCENE_TILE_SIZE;
  const z =
    currentScene.originTileZ * SCENE_TILE_SIZE -
    renderState.fineZ;
  const y = currentTerrainSampler.groundYFine(
    renderState.level,
    renderState.fineX,
    renderState.fineZ,
  );

  if (
    currentPlayerAnimation &&
    currentPlayerAnimation.poseRevision !==
      uploadedPlayerAnimationRevision
  ) {
    sceneRenderer.setLocalPlayerAnimatedPositions(
      currentPlayerAnimation.positions,
    );
    uploadedPlayerAnimationRevision =
      currentPlayerAnimation.poseRevision;
  }

  sceneRenderer.setLocalPlayerPosition({
    x,
    y,
    z,
    yaw: jagexYawToRadians(renderState.yaw),
  });
  (window as SoloScapeDebugWindow).soloscapeLocalPlayer = player;
  (window as SoloScapeDebugWindow).soloscapeLocalPlayerRenderState =
    renderState;
}

function syncOrbitCameraRender(
  interpolationAlpha = 1,
): void {
  if (
    !sceneRenderer ||
    !currentScene ||
    !currentTerrainSampler ||
    !playerInfo
  ) {
    return;
  }

  const playerState =
    playerInfo.getLocalPlayerRenderState(interpolationAlpha);
  if (!playerState) {
    return;
  }

  const targetX =
    playerState.fineX -
    currentScene.originTileX * SCENE_TILE_SIZE;
  const targetZ =
    currentScene.originTileZ * SCENE_TILE_SIZE -
    playerState.fineZ;
  const groundY = currentTerrainSampler.groundYFine(
    playerState.level,
    playerState.fineX,
    playerState.fineZ,
  );

  if (!orbitCamera.initialized) {
    orbitCamera.reset(targetX, targetZ);
  }

  const cameraState = orbitCamera.renderState(
    interpolationAlpha,
    groundY + 50,
  );
  currentOrbitCameraRenderState = cameraState;
  sceneRenderer.setOrbitCamera(cameraState);
  (window as SoloScapeDebugWindow).soloscapeOrbitCameraState =
    cameraState;
}

function handleViewportWalkTap(
  canvasX: number,
  canvasY: number,
  keyCombination: number,
): void {
  if (
    titleMode !== 'game' ||
    gameLogin.state !== 'game' ||
    !currentScene ||
    !currentTerrainSampler ||
    !currentOrbitCameraRenderState ||
    !playerInfo
  ) {
    return;
  }

  const local = playerInfo.getLocalPlayer();
  if (!local) {
    return;
  }

  const destination = pickWalkDestination({
    canvasX,
    canvasY,
    canvasWidth: gameCanvas.width,
    canvasHeight: gameCanvas.height,
    camera: currentOrbitCameraRenderState,
    bounds: currentScene.bounds,
    originTileX: currentScene.originTileX,
    originTileZ: currentScene.originTileZ,
    level: local.coord.level,
    groundYFine: (level, fineX, fineZ) =>
      currentTerrainSampler!.groundYFine(
        level,
        fineX,
        fineZ,
      ),
  });

  (window as SoloScapeDebugWindow).soloscapeLastViewportTap = {
    x: canvasX,
    y: canvasY,
  };
  (window as SoloScapeDebugWindow).soloscapeLastWalkDestination =
    destination ?? undefined;

  if (!destination) {
    appendLog(
      'Viewport walk tap did not intersect loaded terrain.',
    );
    return;
  }

  try {
    gameLogin.sendMoveGameClick(
      destination.tileX,
      destination.tileZ,
      keyCombination,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    appendLog('MOVE_GAMECLICK send failed: ' + message);
  }
}

function tickGameSimulation(): void {
  playerInfo?.tickMovement();

  const localPlayer = playerInfo?.getLocalPlayer();
  const movement =
    playerInfo?.getLocalPlayerMovementSnapshot();
  if (
    currentPlayerAnimation &&
    localPlayer?.appearance &&
    movement
  ) {
    currentPlayerAnimation.setLocomotion(
      localPlayer.appearance,
      movement.locomotion,
    );
    currentPlayerAnimation.tick();
  }

  if (!currentScene || !playerInfo) {
    return;
  }
  const playerState =
    playerInfo.getLocalPlayerRenderState(1);
  if (!playerState) {
    return;
  }

  const targetX =
    playerState.fineX -
    currentScene.originTileX * SCENE_TILE_SIZE;
  const targetZ =
    currentScene.originTileZ * SCENE_TILE_SIZE -
    playerState.fineZ;
  if (!orbitCamera.initialized) {
    orbitCamera.reset(targetX, targetZ);
  } else {
    orbitCamera.tick(targetX, targetZ);
  }
}

function requestLocalPlayerModel(): void {
  if (!playerInfo) {
    return;
  }
  const player = playerInfo.getLocalPlayer();
  if (
    !player?.appearance ||
    player.appearanceRevision === requestedAppearanceRevision
  ) {
    return;
  }

  requestedAppearanceRevision = player.appearanceRevision;
  const generation = ++playerModelGeneration;
  const appearanceRevision = player.appearanceRevision;
  const appearance = player.appearance;

  void playerModelLoader.load(appearance)
    .then(async (mesh) => {
      const current = playerInfo?.getLocalPlayer();
      if (
        generation !== playerModelGeneration ||
        !current ||
        current.appearanceRevision !== appearanceRevision
      ) {
        return;
      }

      if (mesh) {
        const textureIds = Array.from(
          new Set(
            Array.from(mesh.textureIds)
              .filter((textureId) => textureId >= 0),
          ),
        );
        if (textureIds.length > 0) {
          const textureLayers =
            await sceneMaterialLoader.ensureTextureIds(textureIds);
          const refreshed = playerInfo?.getLocalPlayer();
          if (
            generation !== playerModelGeneration ||
            !refreshed ||
            refreshed.appearanceRevision !== appearanceRevision
          ) {
            return;
          }
          sceneRenderer?.setTextureLayers(textureLayers);
        }
      }

      currentPlayerMesh = mesh;
      sceneRenderer?.setLocalPlayerMesh(mesh);
      currentPlayerAnimation = mesh?.vertexGroups
        ? new PlayerAnimationController(
            playerAnimationLoader,
            mesh,
            appendLog,
          )
        : null;
      uploadedPlayerAnimationRevision = -1;

      const movement =
        playerInfo?.getLocalPlayerMovementSnapshot();
      if (currentPlayerAnimation && movement) {
        currentPlayerAnimation.setLocomotion(
          appearance,
          movement.locomotion,
        );
      }
      syncLocalPlayerRender();
    })
    .catch((error: unknown) => {
      if (generation !== playerModelGeneration) {
        return;
      }
      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Local player model load failed: ' + message);
    });
}

function setLoginField(field: LoginField): void {
  selectedLoginField = field;
  if (field === 'username') {
    loginUsername.focus({ preventScroll: true });
  } else {
    loginPassword.focus({ preventScroll: true });
  }
  renderLoginScreen();
}

function applyClientLoginKey(key: string): boolean {
  const result = applyLoginKey(
    {
      username: loginUsername.value,
      password: loginPassword.value,
      selectedField: selectedLoginField,
    },
    key,
  );

  if (!result.handled) {
    return false;
  }

  loginUsername.value = result.username;
  loginPassword.value = result.password;
  selectedLoginField = result.selectedField;
  loginMessage = undefined;
  renderLoginScreen();

  if (result.submit) {
    void beginGameLogin();
  }

  return true;
}

function logicalPointerPosition(
  event: PointerEvent,
): { x: number; y: number } {
  const bounds = clientUiCanvas.getBoundingClientRect();
  return {
    x:
      (event.clientX - bounds.left) *
      CLIENT_VIEWPORT_WIDTH / bounds.width,
    y:
      (event.clientY - bounds.top) *
      CLIENT_VIEWPORT_HEIGHT / bounds.height,
  };
}

async function beginGameLogin(): Promise<void> {
  if (
    !titleRenderer ||
    !titleAssets ||
    !startupAssets ||
    !validatedLoginCrcs
  ) {
    renderLoginScreen('Please wait for the cache to finish loading.');
    return;
  }

  if (gameLoginIsActive()) {
    return;
  }
  if (js5.state !== 'ready') {
    scheduleCacheReconnect();
    renderLoginScreen('Cache socket disconnected; reconnecting to load world assets.');
    return;
  }

  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!username) {
    selectedLoginField = 'username';
    renderLoginScreen('Please enter your username/email.');
    loginUsername.focus({ preventScroll: true });
    return;
  }
  if (!password) {
    selectedLoginField = 'password';
    renderLoginScreen('Please enter your password.');
    loginPassword.focus({ preventScroll: true });
    return;
  }

  localStorage.setItem('soloscape.gatewayUrl', urlInput.value);
  localStorage.setItem('soloscape.username', username);
  loginStatus.textContent = 'Opening game socket';
  renderConnectingScreen('Connecting to server...');

  try {
    await gameLogin.connect(urlInput.value, {
      revision: OSRS_PROTOCOL_REVISION,
      username,
      password,
      crcValues: [...validatedLoginCrcs],
      width: CLIENT_VIEWPORT_WIDTH,
      height: CLIENT_VIEWPORT_HEIGHT,
      resizable: true,
    });
    loginPassword.value = '';
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    appendLog(message);
    loginPassword.value = '';
    selectedLoginField = 'password';
    renderLoginScreen('Unable to connect. See debug log.');
  }
}

async function connectJs5(): Promise<void> {
  if (js5IsActive()) {
    return;
  }

  const generation = ++bootGeneration;
  mapLoadGeneration += 1;
  titleRenderer = null;
  titleAssets = undefined;
  startupAssets = undefined;
  validatedLoginCrcs = null;
  titleMode = 'bootstrap';
  clientUiCanvas.hidden = false;
  resetSceneDebug();
  mobileHud.setVisible(false);

  (window as SoloScapeDebugWindow).soloscapeTitleAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeStartupAssets = undefined;

  localStorage.setItem('soloscape.gatewayUrl', urlInput.value);
  renderBootScreen(
    0,
    'Connecting to update server',
  );

  try {
    await js5.connect(urlInput.value, {
      revision: OSRS_PROTOCOL_REVISION,
    });
    if (generation !== bootGeneration) {
      return;
    }
  } catch (error: unknown) {
    if (generation !== bootGeneration) {
      return;
    }
    const message =
      error instanceof Error ? error.message : String(error);
    appendLog(message);
    renderBootScreen(
      0,
      'Error connecting to update server',
    );
  }
}

try {
  sceneRenderer = new WebGlSceneRenderer(gameCanvas);
  appendLog('WebGL2 scene renderer initialized.');
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error);
  appendLog('WebGL2 renderer unavailable: ' + message);
}

orbitCameraInput = new OrbitCameraInputController(
  gameCanvas,
  orbitCamera,
  {
    isEnabled: () => titleMode === 'game',
    onTap: (canvasX, canvasY, keyCombination) => {
      handleViewportWalkTap(
        canvasX,
        canvasY,
        keyCombination,
      );
    },
  },
);
(window as SoloScapeDebugWindow).soloscapeOrbitCamera = orbitCamera;

browserGameLoop = new BrowserGameLoop({
  update: () => {
    if (titleMode === 'game') {
      tickGameSimulation();
    }
  },
  render: (interpolationAlpha) => {
    if (titleMode === 'game') {
      syncLocalPlayerRender(interpolationAlpha);
      syncOrbitCameraRender(interpolationAlpha);
      sceneRenderer?.renderFrame(interpolationAlpha);
      const player = playerInfo?.getLocalPlayer();
      mobileHud.setPlayer(player ? {
        x: player.coord.x,
        z: player.coord.z,
        level: player.coord.level,
        yaw: currentOrbitCameraRenderState?.yaw ?? 0,
      } : null);
    }
  },
});
(window as SoloScapeDebugWindow).soloscapeGameLoop = browserGameLoop;
document.addEventListener('visibilitychange', () => {
  // requestAnimationFrame pauses in background Safari tabs. Drop elapsed wall
  // time on resume rather than replaying a large fixed-step backlog.
  browserGameLoop?.resetTiming();
});
appendLog(
  'Browser game runtime ready: fixed-tick=' +
    CLIENT_TICK_MS + 'ms; presentation=requestAnimationFrame.',
);

js5.onLog = appendLog;
gameLogin.onLog = appendLog;

/**
 * JS5 can close independently of the active game socket. Reconnect only
 * the cache transport: never clear validated title/config data or the
 * game session just because a background asset connection was dropped.
 */
function scheduleCacheReconnect(): void {
  if (cacheReconnectTimer !== null || js5IsActive() ||
      !titleRenderer || !startupAssets) return;
  cacheReconnectTimer = setTimeout(() => {
    cacheReconnectTimer = null;
    if (js5IsActive() || !titleRenderer || !startupAssets ||
        titleMode === 'bootstrap') return;
    appendLog('Reconnecting background JS5 cache transport...');
    void js5.connect(urlInput.value, { revision: OSRS_PROTOCOL_REVISION })
      .catch((error: unknown) => {
        appendLog('JS5 reconnect failed: ' +
          (error instanceof Error ? error.message : String(error)));
        scheduleCacheReconnect();
      });
  }, 2500);
}

js5.onStateChange = (state) => {
  const labels: Record<typeof state, string> = {
    idle: 'Disconnected',
    connecting: 'Connecting',
    handshake: 'JS5 handshake',
    'master-index': 'Fetching master index',
    'archive-indices': 'Fetching archive indices',
    ready: 'JS5 index ready',
    closed: 'Disconnected',
    error: 'JS5 error',
  };

  status.textContent = labels[state];
  if (state === 'closed' || state === 'error') {
    scheduleCacheReconnect();
  }
  if (state === 'ready' && titleRenderer && startupAssets &&
      titleMode !== 'bootstrap') {
    appendLog('Background JS5 cache connection restored.');
    if (titleMode === 'login') renderLoginScreen();
  }
  connectButton.textContent = js5IsActive()
    ? 'Disconnect JS5'
    : 'Connect JS5';

  if (
    titleMode === 'bootstrap' &&
    (state === 'closed' || state === 'error')
  ) {
    renderBootScreen(
      0,
      state === 'error'
        ? 'Error connecting to update server'
        : 'Connection lost',
    );
  }
};

gameLogin.onStateChange = (state) => {
  const labels: Record<typeof state, string> = {
    idle: 'Game login idle',
    connecting: 'Opening game socket',
    handshake: 'Initial game connection',
    'server-seed': 'Reading server seed',
    'login-block': 'Encrypting login block',
    'login-response': 'Waiting for login response',
    game: 'Game session established',
    closed: 'Game disconnected',
    error: 'Game login failed',
  };

  loginStatus.textContent = labels[state];

  if (titleMode === 'game' && (state === 'closed' || state === 'error')) {
    mobileHud.setVisible(false);
    uiState.reset();
    resetSceneDebug();
    playerInfo = null;
    selectedLoginField = 'password';
    renderLoginScreen('Disconnected from the game.');
    return;
  }

  if (!titleRenderer || titleMode === 'game') {
    return;
  }

  if (
    state === 'connecting' ||
    state === 'handshake' ||
    state === 'server-seed' ||
    state === 'login-block' ||
    state === 'login-response'
  ) {
    renderConnectingScreen('Connecting to server...');
  } else if (state === 'game') {
    renderGameLoading(100, 'Loading - please wait.');
  } else if (state === 'closed' && js5.state === 'ready') {
    selectedLoginField = 'password';
    renderLoginScreen();
  }
};

gameLogin.onLoginSuccess = (success) => {
  uiState.reset();
  framedGamePackets = 0;
  mapLoadGeneration += 1;
  resetSceneDebug();
  playerInfo = new Rev240PlayerInfoDecoder(
    success.localPlayerIndex,
  );
  (window as SoloScapeDebugWindow).soloscapePlayerInfo = playerInfo;
  appendLog(
    'Game login successful: local-player-index=' +
      success.localPlayerIndex +
      ' member=' + success.member + '.',
  );
  renderGameLoading(100, 'Loading - please wait.');
};

gameLogin.onLoginFailure = (code, message) => {
  appendLog(
    'Game login failed: response=' + code + ' ' + message,
  );
  selectedLoginField = 'password';
  loginPassword.value = '';
  renderLoginScreen(message);
};

gameLogin.onGameData = (data) => {
  appendLog('RX raw game stream chunk: ' + data.length + ' bytes.');
};

gameLogin.onGamePacket = (packet) => {
  framedGamePackets += 1;
  try {
    if (uiState.apply(packet)) return;
  } catch (error: unknown) {
    // UI support must not bring down the network framer/session. A cache
    // rendering or unsupported UI packet cannot invalidate game transport.
    appendLog('Ignored malformed UI packet ' + packet.name +
      ' (opcode=' + packet.opcode + ', bytes=' + packet.payload.length + '): ' +
      (error instanceof Error ? error.message : String(error)));
    return;
  }

  if (packet.opcode === PLAYER_INFO_OPCODE) {
    if (!playerInfo) {
      appendLog(
        'Ignoring PLAYER_INFO before login established the local player index.',
      );
      return;
    }

    try {
      const update = playerInfo.decode(packet.payload);
      const local = update.localPlayer;
      (window as SoloScapeDebugWindow).soloscapeLocalPlayer = local;

      if (update.localPlayerMoved) {
        appendLog(
          'Local player moved: level=' + local.coord.level +
            ' tile=' + local.coord.x + ',' + local.coord.z + '.',
        );
      }
      if (update.localPlayerAppearanceChanged) {
        appendLog(
          'Local player appearance received: name=' +
            (local.appearance?.name ?? '(unknown)') +
            '; revision=' + local.appearanceRevision + '.',
        );
        requestLocalPlayerModel();
      }
      // Rendering consumes the decoded position on the next fixed 20ms tick.
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('PLAYER_INFO decode failed: ' + message);
      throw error;
    }
    return;
  }

  const rebuild = tryDecodeRegionRebuildPacket(
    packet,
    playerInfo?.localPlayerIndex ??
      gameLogin.loginSuccess?.localPlayerIndex,
  );
  if (!rebuild) {
    return;
  }

  if (rebuild.kind === 'normal' && rebuild.playerInfoInit) {
    if (!playerInfo) {
      playerInfo = new Rev240PlayerInfoDecoder(
        rebuild.playerInfoInit.localPlayerIndex,
      );
      (window as SoloScapeDebugWindow).soloscapePlayerInfo = playerInfo;
    }
    playerInfo.initialize(rebuild.playerInfoInit);
    const local = playerInfo.getLocalPlayer();
    if (local) {
      (window as SoloScapeDebugWindow).soloscapeLocalPlayer = local;
      appendLog(
        'GPI initialized local player: index=' + local.index +
          ' level=' + local.coord.level +
          ' tile=' + local.coord.x + ',' + local.coord.z + '.',
      );
    }
  }

  (window as SoloScapeDebugWindow).soloscapeRegionRebuild = rebuild;
  const loadGeneration = ++mapLoadGeneration;

  (window as SoloScapeDebugWindow).soloscapeSceneMaps = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeScene = undefined;
  currentScene = null;
  currentSceneMaps = null;
  currentTerrainSampler = null;
  mobileHud.setMaps([]);

  renderGameLoading(100, 'Loading - please wait.');

  void mapSquareLoader.loadMany(rebuild.mapSquares)
    .then(async (maps) => {
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      currentSceneMaps = maps;
      currentTerrainSampler = new SceneTerrainSampler(maps);
      mobileHud.setMaps(maps);
      (window as SoloScapeDebugWindow).soloscapeSceneMaps = maps;
      const locationCount = maps.reduce(
        (sum, map) => sum + map.locations.length,
        0,
      );

      appendLog(
        'Region map assets ready: mapsquares=' + maps.length +
          '; locations=' + locationCount + '.',
      );
      renderGameLoading(100, 'Loading - please wait.');

      const assets = await sceneAssetLoader.loadForMaps(maps);
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      (window as SoloScapeDebugWindow).soloscapeSceneAssets = assets;

      const vertices = Array.from(
        assets.models.values(),
        (model) => model.vertexX.length,
      ).reduce((sum, count) => sum + count, 0);
      const faces = Array.from(
        assets.models.values(),
        (model) => model.faceA.length,
      ).reduce((sum, count) => sum + count, 0);

      appendLog(
        'Resolved scene models: models=' + assets.models.size +
          '; vertices=' + vertices + '; faces=' + faces + '.',
      );
      renderGameLoading(100, 'Loading - please wait.');

      const materials = await sceneMaterialLoader.loadForScene(
        maps,
        assets,
      );
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      (window as SoloScapeDebugWindow).soloscapeSceneMaterials =
        materials;
      mobileHud.setFloorMaterials(materials);

      if (sceneRenderer) {
        sceneRenderer.setTextureLayers(materials.textureLayers);
      }

      const visibleLevel =
        playerInfo?.getLocalPlayer()?.coord.level ?? 0;
      const scene = assembleScene(
        rebuild,
        maps,
        assets,
        materials,
        visibleLevel,
      );
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      currentScene = scene;
      (window as SoloScapeDebugWindow).soloscapeScene = scene;

      appendLog(
        'Static scene assembled: terrain-tiles=' +
          scene.stats.terrainTiles +
          '; terrain-triangles=' + scene.stats.terrainTriangles +
          '; loc-placements=' + scene.stats.locationPlacements +
          '; model-instances=' + scene.stats.modelInstances +
          '; model-triangles=' + scene.stats.modelTriangles +
          '; skipped-locs=' + scene.stats.skippedLocations + '.',
      );

      if (!sceneRenderer) {
        renderGameLoading(100, 'WebGL2 is unavailable.');
        return;
      }

      sceneRenderer.render(scene);
      if (currentPlayerMesh) {
        sceneRenderer.setLocalPlayerMesh(currentPlayerMesh);
      }
      syncLocalPlayerRender();
      syncOrbitCameraRender();
      requestLocalPlayerModel();

      titleMode = 'game';
      clientUiCanvas.hidden = true;
      mobileHud.setVisible(true);
      browserGameLoop?.start();

      const local = playerInfo?.getLocalPlayer();
      appendLog(
        'RuneScape scene entered with 20ms simulation + animation-frame rendering' +
          (local
            ? ': local-player=' + local.coord.x + ',' + local.coord.z + '.'
            : ' (local player is still awaiting GPI state).'),
      );
    })
    .catch((error: unknown) => {
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Static scene build/render failed: ' + message);
      renderGameLoading(100, 'Loading failed.');
    });

  if (rebuild.kind === 'normal') {
    appendLog(
      'Decoded REBUILD_NORMAL_V2: center-zone=' +
        rebuild.zoneX + ',' + rebuild.zoneZ +
        ' world-area=' + rebuild.worldArea +
        ' mapsquares=' + rebuild.mapSquares.length +
        (rebuild.playerInfoInit ? ' GPI=login-init.' : '.'),
    );
  } else {
    const populatedZones = rebuild.zones.reduce(
      (count, zone) => count + (zone ? 1 : 0),
      0,
    );
    appendLog(
      'Decoded REBUILD_REGION_V2: center-zone=' +
        rebuild.zoneX + ',' + rebuild.zoneZ +
        ' reload=' + rebuild.reload +
        ' populated-zones=' + populatedZones +
        ' mapsquares=' + rebuild.mapSquareCount + '.',
    );
  }
};

js5.onMasterIndex = (index) => {
  const present = presentJs5Archives(index);
  if (titleMode === 'bootstrap') {
    renderBootScreen(
      10,
      'Checking for updates - 0%',
    );
    appendLog(
      'Master index ready: ' + present.length + ' cache archives available.',
    );
  }
};

js5.onArchiveIndex = (_archive, _response, progress) => {
  if (titleMode === 'bootstrap') {
    const ratio = progress.total === 0
      ? 1
      : progress.received / progress.total;
    const updatePercent = Math.floor(ratio * 100);
    renderBootScreen(
      10 + Math.floor(ratio * 50),
      'Checking for updates - ' + updatePercent + '%',
    );
  }
};

js5.onBootstrapComplete = (index) => {
  const generation = bootGeneration;
  const archiveCount = presentJs5Archives(index).length;
  // A cache reconnect is not a new login/title bootstrap.
  if (titleRenderer && startupAssets && titleMode !== 'bootstrap') {
    appendLog('JS5 reconnected: ' + archiveCount + ' cache indices restored.');
    return;
  }

  renderBootScreen(
    65,
    'Loading title screen - 0%',
  );

  const startupPromise = loadJs5StartupAssets(js5, appendLog);

  void loadTitleScreenAssets(js5, appendLog)
    .then(async (loadedTitleAssets) => {
      if (generation !== bootGeneration) {
        return;
      }

      const renderer = await CacheTitleScreenRenderer.create(
        clientUiCanvas,
        loadedTitleAssets,
      );
      if (generation !== bootGeneration) {
        return;
      }

      titleAssets = loadedTitleAssets;
      titleRenderer = renderer;
      // UI art is loaded from the same validated JS5 cache as the title.
      // Do not block account login on an optional HUD asset pack.
      void loadCacheGameUiAssets(js5, loadedTitleAssets, appendLog)
        .then((assets) => {
          if (generation !== bootGeneration) return;
          mobileHud.setCacheAssets(assets, js5);
          (window as Window & {
            soloscapeCacheInterfaces?: CacheInterfaceStore;
          }).soloscapeCacheInterfaces = assets.interfaces;
        })
        .catch((error: unknown) => {
          if (generation !== bootGeneration) return;
          appendLog('Game cache UI sprites unavailable: ' +
            (error instanceof Error ? error.message : String(error)));
        });
      (window as SoloScapeDebugWindow).soloscapeTitleAssets =
        loadedTitleAssets;

      appendLog(
        'Cache-backed title screen ready: background=' +
          loadedTitleAssets.provenance.background +
          '; logo=' + loadedTitleAssets.provenance.logo +
          '; titlebox=' + loadedTitleAssets.provenance.titleBox +
          '; titlebutton=' + loadedTitleAssets.provenance.titleButton +
          '; runes=' + loadedTitleAssets.provenance.runes + '.',
      );

      renderer.renderLoading(
        80,
        'Loading config - 0%',
      );
      titleMode = 'loading';

      const loadedStartupAssets = await startupPromise;
      if (generation !== bootGeneration) {
        return;
      }

      startupAssets = loadedStartupAssets;
      validatedLoginCrcs = js5.getLoginCrcs();
      uiState.setVarbitDefinitions(loadedStartupAssets.varbitDefinitions);
      (window as SoloScapeDebugWindow).soloscapeStartupAssets =
        loadedStartupAssets;

      renderer.renderLoading(
        100,
        'Loaded config',
      );
      appendLog(
        'Original-style title bootstrap complete: ' +
          archiveCount + ' cache indices ready.',
      );

      loginStatus.textContent = 'Title screen ready';
      loginMessage = undefined;
      renderWelcomeScreen();
    })
    .catch((error: unknown) => {
      if (generation !== bootGeneration) {
        return;
      }

      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Cache title screen bootstrap failed: ' + message);
      renderBootScreen(
        0,
        'Error loading title screen',
      );
    });
};

js5.onGroup = (response) => {
  if (response.archive === 0xff) {
    return;
  }

  appendLog(
    'Raw JS5 cache group received: ' +
      response.archive + ':' + response.group,
  );
};

connectButton.addEventListener('click', () => {
  if (js5IsActive()) {
    bootGeneration += 1;
    mapLoadGeneration += 1;
    browserGameLoop?.stop();
    if (gameLoginIsActive()) {
      gameLogin.disconnect();
    }
    js5.disconnect();
    if (cacheReconnectTimer !== null) {
      clearTimeout(cacheReconnectTimer);
      cacheReconnectTimer = null;
    }
    uiState.reset();
    sceneAssetLoader.reset();
    sceneMaterialLoader.reset();
    playerModelLoader.reset();
    playerInfo = null;
    (window as SoloScapeDebugWindow).soloscapePlayerInfo = undefined;
    titleRenderer = null;
    titleAssets = undefined;
    startupAssets = undefined;
    validatedLoginCrcs = null;
    titleMode = 'bootstrap';
    renderBootScreen(
      0,
      'Connection lost',
    );
    return;
  }

  void connectJs5();
});

loginUsername.addEventListener('focus', () => {
  if (titleMode !== 'login') {
    return;
  }
  selectedLoginField = 'username';
  renderLoginScreen();
});

loginPassword.addEventListener('focus', () => {
  if (titleMode !== 'login') {
    return;
  }
  selectedLoginField = 'password';
  renderLoginScreen();
});

loginUsername.addEventListener('input', () => {
  if (titleMode !== 'login') {
    return;
  }
  selectedLoginField = 'username';
  loginMessage = undefined;
  renderLoginScreen();
});

loginPassword.addEventListener('input', () => {
  if (titleMode !== 'login') {
    return;
  }
  selectedLoginField = 'password';
  loginMessage = undefined;
  renderLoginScreen();
});

/*
 * The desktop client consumes key events globally and routes them through
 * currentLoginField. Capture-phase handling mirrors that behaviour while the
 * hidden native inputs remain available for mobile keyboards, IME and paste.
 */
document.addEventListener(
  'keydown',
  (event) => {
    if (
      titleMode !== 'login' ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (applyClientLoginKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  { capture: true },
);

clientUiCanvas.addEventListener('pointerdown', (event) => {
  if (
    !titleRenderer ||
    titleMode === 'bootstrap' ||
    titleMode === 'connecting' ||
    titleMode === 'loading' ||
    titleMode === 'game-loading' ||
    titleMode === 'game'
  ) {
    return;
  }

  event.preventDefault();

  const point = logicalPointerPosition(event);
  const target = titleRenderer.hitTest(point.x, point.y);

  if (target === 'new-user') {
    renderNewUserScreen();
    return;
  }

  if (target === 'existing-user') {
    loginMessage = undefined;
    selectedLoginField = loginUsername.value ? 'password' : 'username';
    setLoginField(selectedLoginField);
    return;
  }

  if (target === 'username' || target === 'password') {
    setLoginField(target);
    return;
  }

  if (target === 'login') {
    void beginGameLogin();
    return;
  }

  if (target === 'cancel') {
    loginUsername.value = '';
    loginPassword.value = '';
    loginMessage = undefined;
    selectedLoginField = 'username';
    renderWelcomeScreen();
  }
});

clientUiCanvas.addEventListener(
  'contextmenu',
  (event) => event.preventDefault(),
);
gameCanvas.addEventListener(
  'contextmenu',
  (event) => event.preventDefault(),
);

window.setInterval(() => {
  cursorVisible = !cursorVisible;
  if (titleMode === 'login') {
    renderLoginScreen();
  }
}, 500);

function animateTitleFrame(timestampMs: number): void {
  if (
    titleRenderer &&
    titleMode !== 'game' &&
    !clientUiCanvas.hidden
  ) {
    titleRenderer.renderFrame(timestampMs);
  }
  window.requestAnimationFrame(animateTitleFrame);
}
window.requestAnimationFrame(animateTitleFrame);

type SoloScapeDebugWindow = Window & {
  soloscapeJs5?: Js5Client;
  soloscapeUiState?: Rev240UiState;
  soloscapeStartupAssets?: Js5StartupAssets;
  soloscapeTitleAssets?: TitleScreenAssets;
  soloscapeGameLogin?: GameLoginClient;
  soloscapeGameLoop?: BrowserGameLoop;
  soloscapeOrbitCamera?: OrbitCamera;
  soloscapeOrbitCameraState?: OrbitCameraRenderState;
  soloscapeLastViewportTap?: { x: number; y: number };
  soloscapeLastWalkDestination?: WalkDestination;
  soloscapePlayerInfo?: Rev240PlayerInfoDecoder;
  soloscapeLocalPlayer?: ClientPlayer;
  soloscapeLocalPlayerRenderState?: ClientPlayerRenderState;
  soloscapeRegionRebuild?: RegionRebuild;
  soloscapeSceneMaps?: LoadedMapSquare[];
  soloscapeSceneAssets?: LoadedSceneAssets;
  soloscapeSceneMaterials?: SceneMaterialAssets;
  soloscapeScene?: AssembledScene;
};

(window as SoloScapeDebugWindow).soloscapeJs5 = js5;
(window as SoloScapeDebugWindow).soloscapeUiState = uiState;
(window as SoloScapeDebugWindow).soloscapeGameLogin = gameLogin;

renderBootScreen(
  0,
  'Starting game engine...',
);
void connectJs5();
