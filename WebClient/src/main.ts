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
const revision = requireElement<HTMLElement>('#revision');
const log = requireElement<HTMLElement>('#log');
const canvas = requireElement<HTMLCanvasElement>('#game');
const context = requireCanvasContext(canvas);

const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
const defaultGatewayUrl = scheme + '://' + location.hostname + ':8081';
urlInput.value =
  localStorage.getItem('soloscape.gatewayUrl') ?? defaultGatewayUrl;

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

const transport = new WebSocketTransport();
const cacheStore = new IndexedDbCacheStore();
const js5 = new Js5Client(transport, cacheStore);

function appendLog(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  log.textContent += '[' + stamp + '] ' + message + '\n';
  log.scrollTop = log.scrollHeight;
}

js5.onLog = appendLog;

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
      ? 'Disconnect'
      : 'Connect';
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

  void loadJs5StartupAssets(js5, appendLog)
    .then((assets) => {
      (window as SoloScapeDebugWindow).soloscapeStartupAssets = assets;
      drawClientStatus(
        'Startup definitions ready',
        assets.npcDefinitionFiles.size + ' NPC files; ' +
          assets.varbitDefinitions.size + ' varbits',
      );
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : String(error);
      appendLog('Startup definition load failed: ' + message);
      drawClientStatus(
        'Startup definition load failed',
        'See the transport log for details',
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
};

(window as SoloScapeDebugWindow).soloscapeJs5 = js5;
