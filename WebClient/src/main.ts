import './style.css';
import { IndexedDbCacheStore } from './cache/IndexedDbCacheStore';
import { Js5Client } from './cache/Js5Client';
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
  OSRS_CLIENT_TARGET,
  OSRS_PROTOCOL_REVISION,
} from './protocol/revision';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error('Web client shell is missing required element ' + selector + '.');
  }
  return element;
}

function requireCanvasContext(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is unavailable.');
  }
  return context;
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
const context = requireCanvasContext(canvas);

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
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.font = '18px system-ui';
  context.textAlign = 'center';
  context.fillText(headline, canvas.width / 2, canvas.height / 2 - 12);
  context.font = '14px system-ui';
  context.fillText(detail, canvas.width / 2, canvas.height / 2 + 16);
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

function appendLog(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  log.textContent += '[' + stamp + '] ' + message + '\n';
  log.scrollTop = log.scrollHeight;
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

gameLogin.onLoginSuccess = (success) => {
  drawClientStatus(
    'Game login successful',
    'Player index ' + success.localPlayerIndex +
      '; rev-240 game packet framing is next',
  );
};

gameLogin.onLoginFailure = (code, message) => {
  drawClientStatus(
    'Game login failed (' + code + ')',
    message,
  );
};

gameLogin.onGameData = (data) => {
  appendLog(
    'RX raw game stream: ' + data.length +
    ' bytes (packet framing belongs to M3).',
  );
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
    (window as SoloScapeDebugWindow).soloscapeStartupAssets = undefined;
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
      width: canvas.width,
      height: canvas.height,
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
};

(window as SoloScapeDebugWindow).soloscapeJs5 = js5;
(window as SoloScapeDebugWindow).soloscapeGameLogin = gameLogin;
