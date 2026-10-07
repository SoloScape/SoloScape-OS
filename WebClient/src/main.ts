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
  tryDecodeRegionRebuildPacket,
  type RegionRebuild,
} from './protocol/RegionRebuildDecoder';
import {
  OSRS_CLIENT_TARGET,
  OSRS_PROTOCOL_REVISION,
} from './protocol/revision';
import {
  assembleScene,
  type AssembledScene,
} from './scene/SceneAssembler';
import { WebGlSceneRenderer } from './scene/WebGlSceneRenderer';
import {
  CacheTitleScreenRenderer,
  type LoginField,
} from './ui/CacheTitleScreenRenderer';

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
const sceneStatus = requireElement<HTMLElement>('#scene-status');
const sceneHeadline = requireElement<HTMLElement>('#scene-headline');
const sceneDetail = requireElement<HTMLElement>('#scene-detail');

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

let sceneRenderer: WebGlSceneRenderer | null = null;
let titleRenderer: CacheTitleScreenRenderer | null = null;
let titleAssets: TitleScreenAssets | undefined;
let startupAssets: Js5StartupAssets | undefined;
let selectedLoginField: LoginField =
  loginUsername.value ? 'password' : 'username';
let loginMessage: string | undefined;
let cursorVisible = true;
let titleMode: 'bootstrap' | 'login' | 'message' | 'game' =
  'bootstrap';
let bootGeneration = 0;
let mapLoadGeneration = 0;
let framedGamePackets = 0;

function appendLog(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  log.textContent += '[' + stamp + '] ' + message + '\n';
  log.scrollTop = log.scrollHeight;
}

function drawBootstrapStatus(
  headline: string,
  detail: string,
): void {
  sceneHeadline.textContent = headline;
  sceneDetail.textContent = detail;
  sceneStatus.hidden = false;
  clientUiCanvas.hidden = false;
}

function renderLoginScreen(message = loginMessage): void {
  if (!titleRenderer) {
    return;
  }

  titleMode = 'login';
  loginMessage = message;
  clientUiCanvas.hidden = false;
  sceneStatus.hidden = true;
  titleRenderer.renderLogin({
    username: loginUsername.value,
    password: loginPassword.value,
    selectedField: selectedLoginField,
    message,
    showCursor: cursorVisible,
  });
}

function showTitleMessage(
  message: string,
  detail?: string,
): void {
  if (!titleRenderer) {
    drawBootstrapStatus(message, detail ?? '');
    return;
  }

  titleMode = 'message';
  clientUiCanvas.hidden = false;
  sceneStatus.hidden = true;
  titleRenderer.renderMessage(message, detail);
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
  (window as SoloScapeDebugWindow).soloscapeRegionRebuild = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneMaps = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeScene = undefined;
  sceneRenderer?.clear();
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
    js5.state !== 'ready'
  ) {
    renderLoginScreen('Please wait for the cache to finish loading.');
    return;
  }

  if (gameLoginIsActive()) {
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
  showTitleMessage('Connecting to server...');

  try {
    await gameLogin.connect(urlInput.value, {
      revision: OSRS_PROTOCOL_REVISION,
      username,
      password,
      crcValues: js5.getLoginCrcs(),
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
  titleMode = 'bootstrap';
  clientUiCanvas.hidden = false;
  resetSceneDebug();

  (window as SoloScapeDebugWindow).soloscapeTitleAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeStartupAssets = undefined;

  localStorage.setItem('soloscape.gatewayUrl', urlInput.value);
  drawBootstrapStatus(
    'Connecting to SoloScape',
    'Opening the rev-' + OSRS_PROTOCOL_REVISION + ' cache stream',
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
    drawBootstrapStatus(
      'Unable to connect to SoloScape',
      'Start run-gateway.bat and refresh the page',
    );
  }
}

try {
  sceneRenderer = new WebGlSceneRenderer(gameCanvas);
  appendLog('WebGL2 static-scene renderer initialized.');
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error);
  appendLog('WebGL2 renderer unavailable: ' + message);
}

js5.onLog = appendLog;
gameLogin.onLog = appendLog;

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
  connectButton.textContent = js5IsActive()
    ? 'Disconnect JS5'
    : 'Connect JS5';

  if (
    titleMode === 'bootstrap' &&
    (state === 'closed' || state === 'error')
  ) {
    drawBootstrapStatus(
      state === 'error' ? 'Cache connection failed' : 'Cache disconnected',
      'Open ?debug=1 for transport details',
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

  if (!titleRenderer || titleMode === 'game') {
    return;
  }

  if (state === 'connecting' || state === 'handshake') {
    showTitleMessage('Connecting to server...');
  } else if (
    state === 'server-seed' ||
    state === 'login-block' ||
    state === 'login-response'
  ) {
    showTitleMessage('Performing login...');
  } else if (state === 'game') {
    showTitleMessage('Loading - please wait.');
  } else if (state === 'closed' && js5.state === 'ready') {
    selectedLoginField = 'password';
    renderLoginScreen();
  }
};

gameLogin.onLoginSuccess = (success) => {
  framedGamePackets = 0;
  mapLoadGeneration += 1;
  resetSceneDebug();
  appendLog(
    'Game login successful: local-player-index=' +
      success.localPlayerIndex +
      ' member=' + success.member + '.',
  );
  showTitleMessage(
    'Loading - please wait.',
    'Waiting for the region rebuild',
  );
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

  const rebuild = tryDecodeRegionRebuildPacket(packet);
  if (!rebuild) {
    return;
  }

  (window as SoloScapeDebugWindow).soloscapeRegionRebuild = rebuild;
  const loadGeneration = ++mapLoadGeneration;

  (window as SoloScapeDebugWindow).soloscapeSceneMaps = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeScene = undefined;
  sceneRenderer?.clear();

  showTitleMessage(
    'Loading - please wait.',
    'Loading region map data',
  );

  void mapSquareLoader.loadMany(rebuild.mapSquares)
    .then(async (maps) => {
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      (window as SoloScapeDebugWindow).soloscapeSceneMaps = maps;
      const locationCount = maps.reduce(
        (sum, map) => sum + map.locations.length,
        0,
      );

      appendLog(
        'Region map assets ready: mapsquares=' + maps.length +
          '; locations=' + locationCount + '.',
      );
      showTitleMessage(
        'Loading - please wait.',
        'Resolving scene models',
      );

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

      showTitleMessage(
        'Loading - please wait.',
        assets.models.size + ' models; ' +
          vertices + ' vertices; ' + faces + ' faces',
      );

      const scene = assembleScene(rebuild, maps, assets);
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

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
        showTitleMessage(
          'WebGL2 is unavailable.',
          'Open ?debug=1 for details',
        );
        return;
      }

      sceneRenderer.render(scene);
      titleMode = 'game';
      clientUiCanvas.hidden = true;
      sceneStatus.hidden = true;

      appendLog(
        'First static RuneScape scene rendered with WebGL2: terrain=' +
          scene.terrain.vertexCount + ' vertices; locs=' +
          scene.locations.vertexCount + ' vertices.',
      );
    })
    .catch((error: unknown) => {
      if (loadGeneration !== mapLoadGeneration) {
        return;
      }

      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Static scene build/render failed: ' + message);
      showTitleMessage(
        'Loading failed.',
        'Open ?debug=1 for cache or scene details',
      );
    });

  if (rebuild.kind === 'normal') {
    appendLog(
      'Decoded REBUILD_NORMAL_V2: center-zone=' +
        rebuild.zoneX + ',' + rebuild.zoneZ +
        ' world-area=' + rebuild.worldArea +
        ' mapsquares=' + rebuild.mapSquares.length + '.',
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
    drawBootstrapStatus(
      'Loading SoloScape',
      'Master index ready; ' + present.length +
        ' cache archives available',
    );
  }
};

js5.onArchiveIndex = (_archive, _response, progress) => {
  if (titleMode === 'bootstrap') {
    drawBootstrapStatus(
      'Loading SoloScape',
      'Cache indices ' + progress.received +
        ' / ' + progress.total,
    );
  }
};

js5.onBootstrapComplete = (index) => {
  const generation = bootGeneration;
  const archiveCount = presentJs5Archives(index).length;

  drawBootstrapStatus(
    'Loading SoloScape',
    archiveCount +
      ' cache indices ready; loading title assets and fonts',
  );

  void Promise.all([
    loadTitleScreenAssets(js5, appendLog),
    loadJs5StartupAssets(js5, appendLog),
  ])
    .then(async ([loadedTitleAssets, loadedStartupAssets]) => {
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
      startupAssets = loadedStartupAssets;
      titleRenderer = renderer;

      (window as SoloScapeDebugWindow).soloscapeTitleAssets =
        loadedTitleAssets;
      (window as SoloScapeDebugWindow).soloscapeStartupAssets =
        loadedStartupAssets;

      appendLog(
        'Cache-backed title screen ready: background=' +
          loadedTitleAssets.provenance.background +
          '; logo=' + loadedTitleAssets.provenance.logo +
          '; titlebox=' + loadedTitleAssets.provenance.titleBox +
          '; titlebutton=' + loadedTitleAssets.provenance.titleButton + '.',
      );

      loginStatus.textContent = 'Cache title screen ready';
      loginMessage = undefined;
      renderLoginScreen();
    })
    .catch((error: unknown) => {
      if (generation !== bootGeneration) {
        return;
      }

      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Cache title screen bootstrap failed: ' + message);
      drawBootstrapStatus(
        'Cache title screen failed',
        'No fallback artwork is used. Open ?debug=1 for details.',
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
    if (gameLoginIsActive()) {
      gameLogin.disconnect();
    }
    js5.disconnect();
    sceneAssetLoader.reset();
    titleRenderer = null;
    titleAssets = undefined;
    startupAssets = undefined;
    titleMode = 'bootstrap';
    drawBootstrapStatus(
      'Cache disconnected',
      'Use the debug control to reconnect',
    );
    return;
  }

  void connectJs5();
});

loginUsername.addEventListener('input', () => {
  if (titleMode === 'login') {
    renderLoginScreen();
  }
});

loginPassword.addEventListener('input', () => {
  if (titleMode === 'login') {
    renderLoginScreen();
  }
});

loginUsername.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    setLoginField('password');
  }
});

loginPassword.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void beginGameLogin();
  }
});

clientUiCanvas.addEventListener('pointerdown', (event) => {
  if (!titleRenderer || titleMode !== 'login') {
    return;
  }

  const point = logicalPointerPosition(event);
  const target = titleRenderer.hitTest(point.x, point.y);

  if (target === 'username' || target === 'password') {
    setLoginField(target);
    return;
  }

  if (target === 'login') {
    void beginGameLogin();
    return;
  }

  if (target === 'cancel') {
    loginPassword.value = '';
    loginMessage = undefined;
    setLoginField('username');
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

gameCanvas.addEventListener('pointerdown', (event) => {
  gameCanvas.setPointerCapture(event.pointerId);
});

window.setInterval(() => {
  cursorVisible = !cursorVisible;
  if (titleMode === 'login') {
    renderLoginScreen();
  }
}, 500);

type SoloScapeDebugWindow = Window & {
  soloscapeJs5?: Js5Client;
  soloscapeStartupAssets?: Js5StartupAssets;
  soloscapeTitleAssets?: TitleScreenAssets;
  soloscapeGameLogin?: GameLoginClient;
  soloscapeRegionRebuild?: RegionRebuild;
  soloscapeSceneMaps?: LoadedMapSquare[];
  soloscapeSceneAssets?: LoadedSceneAssets;
  soloscapeScene?: AssembledScene;
};

(window as SoloScapeDebugWindow).soloscapeJs5 = js5;
(window as SoloScapeDebugWindow).soloscapeGameLogin = gameLogin;

drawBootstrapStatus(
  'Starting SoloScape',
  'Connecting to the local cache gateway',
);
void connectJs5();
