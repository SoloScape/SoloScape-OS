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

const CLIENT_VIEWPORT_WIDTH = 765;
const CLIENT_VIEWPORT_HEIGHT = 503;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error('Web client shell is missing required element ' + selector + '.');
  }
  return element;
}

const urlInput = requireElement<HTMLInputElement>('#gateway-url');
const connectButton = requireElement<HTMLButtonElement>('#connect');
const status = requireElement<HTMLElement>('#status');
const loginUsername = requireElement<HTMLInputElement>('#login-username');
const loginPassword = requireElement<HTMLInputElement>('#login-password');
const loginButton = requireElement<HTMLButtonElement>('#login');
const loginStatus = requireElement<HTMLElement>('#login-status');
const revision = requireElement<HTMLElement>('#revision');
const log = requireElement<HTMLElement>('#log');
const canvas = requireElement<HTMLCanvasElement>('#game');
const sceneStatus = requireElement<HTMLElement>('#scene-status');
const sceneHeadline = requireElement<HTMLElement>('#scene-headline');
const sceneDetail = requireElement<HTMLElement>('#scene-detail');

const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
const defaultGatewayUrl = scheme + '://' + location.hostname + ':8081';
urlInput.value =
  localStorage.getItem('soloscape.gatewayUrl') ?? defaultGatewayUrl;
loginUsername.value = localStorage.getItem('soloscape.username') ?? '';

revision.textContent =
  'protocol ' + OSRS_PROTOCOL_REVISION + ' / client ' + OSRS_CLIENT_TARGET;

function drawClientStatus(
  headline: string,
  detail: string,
): void {
  sceneHeadline.textContent = headline;
  sceneDetail.textContent = detail;
  sceneStatus.hidden = false;
}

drawClientStatus(
  'JS5 cache bootstrap ready',
  'Connect to fetch the rev-240 cache index',
);

const js5Transport = new WebSocketTransport();
const cacheStore = new IndexedDbCacheStore();
const js5 = new Js5Client(js5Transport, cacheStore);
const gameTransport = new WebSocketTransport();
const gameLogin = new GameLoginClient(gameTransport);
const mapSquareLoader = new MapSquareLoader(js5, appendLog);
const sceneAssetLoader = new SceneAssetLoader(js5, appendLog);
let mapLoadGeneration = 0;
let sceneRenderer: WebGlSceneRenderer | null = null;

function appendLog(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  log.textContent += '[' + stamp + '] ' + message + '\n';
  log.scrollTop = log.scrollHeight;
}

try {
  sceneRenderer = new WebGlSceneRenderer(canvas);
  appendLog('WebGL2 static-scene renderer initialized.');
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  appendLog('WebGL2 renderer unavailable: ' + message);
}

function gameLoginIsActive(): boolean {
  return gameLogin.state === 'connecting' ||
    gameLogin.state === 'handshake' ||
    gameLogin.state === 'server-seed' ||
    gameLogin.state === 'login-block' ||
    gameLogin.state === 'login-response' ||
    gameLogin.state === 'game';
}

function refreshLoginControls(): void {
  loginButton.disabled = js5.state !== 'ready' && !gameLoginIsActive();
  loginButton.textContent = gameLoginIsActive()
    ? 'Disconnect game'
    : 'Game login';
}

function resetSceneDebug(): void {
  (window as SoloScapeDebugWindow).soloscapeRegionRebuild = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneMaps = undefined;
  (window as SoloScapeDebugWindow).soloscapeSceneAssets = undefined;
  (window as SoloScapeDebugWindow).soloscapeScene = undefined;
  sceneRenderer?.clear();
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
  connectButton.textContent =
    state === 'connecting' ||
    state === 'handshake' ||
    state === 'master-index' ||
    state === 'archive-indices' ||
    state === 'ready'
      ? 'Disconnect JS5'
      : 'Connect JS5';
  refreshLoginControls();
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
  refreshLoginControls();
};

let framedGamePackets = 0;

gameLogin.onLoginSuccess = (success) => {
  framedGamePackets = 0;
  mapLoadGeneration += 1;
  resetSceneDebug();
  drawClientStatus(
    'Game login successful',
    'Player index ' + success.localPlayerIndex +
      '; waiting for framed rev-240 game packets',
  );
};

gameLogin.onLoginFailure = (code, message) => {
  drawClientStatus(
    'Game login failed (' + code + ')',
    message,
  );
};

gameLogin.onGameData = (data) => {
  appendLog('RX raw game stream chunk: ' + data.length + ' bytes.');
};

gameLogin.onGamePacket = (packet) => {
  framedGamePackets += 1;

  const rebuild = tryDecodeRegionRebuildPacket(packet);
  if (rebuild) {
    (window as SoloScapeDebugWindow).soloscapeRegionRebuild = rebuild;
    const loadGeneration = ++mapLoadGeneration;
    (window as SoloScapeDebugWindow).soloscapeSceneMaps = undefined;
    (window as SoloScapeDebugWindow).soloscapeSceneAssets = undefined;
    (window as SoloScapeDebugWindow).soloscapeScene = undefined;
    sceneRenderer?.clear();

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
        drawClientStatus(
          'Region map assets decoded',
          maps.length + ' mapsquares; resolving loc models',
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

        drawClientStatus(
          'Assembling static scene',
          assets.models.size + ' models; ' + vertices +
            ' source vertices; ' + faces + ' source faces',
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

        if (sceneRenderer) {
          sceneRenderer.render(scene);
          sceneStatus.hidden = true;
          appendLog(
            'First static RuneScape scene rendered with WebGL2: terrain=' +
              scene.terrain.vertexCount + ' vertices; locs=' +
              scene.locations.vertexCount + ' vertices.',
          );
        } else {
          drawClientStatus(
            'Static scene assembled',
            'WebGL2 is unavailable; inspect window.soloscapeScene for geometry',
          );
        }
      })
      .catch((error: unknown) => {
        if (loadGeneration !== mapLoadGeneration) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        appendLog('Static scene build/render failed: ' + message);
        drawClientStatus(
          'Static scene build/render failed',
          'See the transport log for cache, assembly, or WebGL details',
        );
      });

    if (rebuild.kind === 'normal') {
      appendLog(
        'Decoded REBUILD_NORMAL_V2: center-zone=' +
        rebuild.zoneX + ',' + rebuild.zoneZ +
        ' world-area=' + rebuild.worldArea +
        ' mapsquares=' + rebuild.mapSquares.length + '.',
      );
      drawClientStatus(
        'Region rebuild decoded',
        'Normal map at zone ' + rebuild.zoneX + ',' + rebuild.zoneZ +
          '; ' + rebuild.mapSquares.length + ' mapsquares required',
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
      drawClientStatus(
        'Instanced region rebuild decoded',
        populatedZones + ' copied zones from ' +
          rebuild.mapSquareCount + ' source mapsquares',
      );
    }
    return;
  }

  if (framedGamePackets === 1) {
    drawClientStatus(
      'Game packet framing active',
      'First packet: ' + packet.name + ' (' + packet.opcode + '), ' +
        packet.payload.length + ' payload bytes',
    );
  }
};

js5.onMasterIndex = (index) => {
  const present = presentJs5Archives(index);
  drawClientStatus(
    'JS5 master index parsed',
    present.length + ' present archives; fetching reference tables',
  );
};

js5.onArchiveIndex = (_archive, _response, progress) => {
  drawClientStatus(
    'Fetching JS5 archive indices',
    progress.received + ' / ' + progress.total + ' received',
  );
};

js5.onBootstrapComplete = (index) => {
  drawClientStatus(
    'JS5 cache index ready',
    presentJs5Archives(index).length +
      ' reference tables ready; loading startup definitions',
  );
  refreshLoginControls();

  void loadJs5StartupAssets(js5, appendLog)
    .then((assets) => {
      (window as SoloScapeDebugWindow).soloscapeStartupAssets = assets;
      drawClientStatus(
        'Startup definitions ready',
        assets.npcDefinitionFiles.size + ' NPC files; ' +
          assets.varbitDefinitions.size + ' varbits; game login ready',
      );
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Startup definition load failed: ' + message);
      drawClientStatus(
        'Startup definition load failed',
        'Game login is still available; see transport log for asset details',
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

connectButton.addEventListener('click', async () => {
  if (
    js5.state === 'connecting' ||
    js5.state === 'handshake' ||
    js5.state === 'master-index' ||
    js5.state === 'archive-indices' ||
    js5.state === 'ready'
  ) {
    js5.disconnect();
    mapLoadGeneration += 1;
    sceneAssetLoader.reset();
    (window as SoloScapeDebugWindow).soloscapeStartupAssets = undefined;
    resetSceneDebug();
    drawClientStatus(
      'JS5 disconnected',
      'Connect again to restart the cache bootstrap',
    );
    return;
  }

  localStorage.setItem('soloscape.gatewayUrl', urlInput.value);

  try {
    await js5.connect(urlInput.value, {
      revision: OSRS_PROTOCOL_REVISION,
    });
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    drawClientStatus(
      'JS5 connection failed',
      'See the transport log for details',
    );
  }
});

loginButton.addEventListener('click', async () => {
  if (gameLoginIsActive()) {
    gameLogin.disconnect();
    mapLoadGeneration += 1;
    resetSceneDebug();
    drawClientStatus(
      'Game disconnected',
      'JS5 cache remains available for another login',
    );
    return;
  }

  if (js5.state !== 'ready') {
    loginStatus.textContent = 'Finish JS5 bootstrap before game login';
    return;
  }

  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) {
    loginStatus.textContent = 'Username and password are required';
    return;
  }

  localStorage.setItem('soloscape.gatewayUrl', urlInput.value);
  localStorage.setItem('soloscape.username', username);

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
    // Do not persist credentials. Clearing the DOM field also avoids leaving
    // the password visible to browser autofill/debug tooling after submission.
    loginPassword.value = '';
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    drawClientStatus(
      'Game login failed',
      'See the transport log for details',
    );
  }
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener('pointerdown', (event) => {
  // TODO(input):
  // Convert pointer/touch coordinates to the logical 765x503 client viewport.
  // Long-press should eventually map to the OSRS context-menu gesture.
  canvas.setPointerCapture(event.pointerId);
});

type SoloScapeDebugWindow = Window & {
  soloscapeJs5?: Js5Client;
  soloscapeStartupAssets?: Js5StartupAssets;
  soloscapeGameLogin?: GameLoginClient;
  soloscapeRegionRebuild?: RegionRebuild;
  soloscapeSceneMaps?: LoadedMapSquare[];
  soloscapeSceneAssets?: LoadedSceneAssets;
  soloscapeScene?: AssembledScene;
};

(window as SoloScapeDebugWindow).soloscapeJs5 = js5;
(window as SoloScapeDebugWindow).soloscapeGameLogin = gameLogin;
