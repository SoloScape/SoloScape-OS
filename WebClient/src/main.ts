import './style.css';
import { IndexedDbCacheStore } from './cache/IndexedDbCacheStore';
import { Js5Client } from './cache/Js5Client';
import { WebSocketTransport } from './net/WebSocketTransport';
import {
  OSRS_CLIENT_TARGET,
  OSRS_PROTOCOL_REVISION,
} from './protocol/revision';

const urlInput = document.querySelector<HTMLInputElement>('#gateway-url');
const connectButton = document.querySelector<HTMLButtonElement>('#connect');
const status = document.querySelector<HTMLElement>('#status');
const revision = document.querySelector<HTMLElement>('#revision');
const log = document.querySelector<HTMLElement>('#log');
const canvas = document.querySelector<HTMLCanvasElement>('#game');

if (!urlInput || !connectButton || !status || !revision || !log || !canvas) {
  throw new Error('Web client shell is missing required DOM elements.');
}

const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
const defaultGatewayUrl = scheme + '://' + location.hostname + ':8080';
urlInput.value =
  localStorage.getItem('soloscape.gatewayUrl') ?? defaultGatewayUrl;

revision.textContent =
  'protocol ' + OSRS_PROTOCOL_REVISION + ' / client ' + OSRS_CLIENT_TARGET;

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Canvas 2D is unavailable.');
}

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
  'JS5 bootstrap ready to test',
  'Connect to fetch the rev-240 master index',
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
    ready: 'JS5 ready',
    closed: 'Disconnected',
    error: 'JS5 error',
  };

  status.textContent = labels[state];
  connectButton.textContent =
    state === 'connecting' ||
    state === 'handshake' ||
    state === 'master-index' ||
    state === 'ready'
      ? 'Disconnect'
      : 'Connect';
};

js5.onMasterIndex = (response) => {
  drawClientStatus(
    'JS5 master index received',
    response.container.length + ' bytes cached in IndexedDB',
  );
  appendLog(
    'JS5 bootstrap complete. The socket is ready for additional cache group requests.',
  );
};

js5.onGroup = (response) => {
  if (response.archive === 0xff && response.group === 0xff) {
    return;
  }
  appendLog(
    'Cache group available to client code: ' +
    response.archive + ':' + response.group,
  );
};

connectButton.addEventListener('click', async () => {
  if (
    js5.state === 'connecting' ||
    js5.state === 'handshake' ||
    js5.state === 'master-index' ||
    js5.state === 'ready'
  ) {
    js5.disconnect();
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
};

(window as SoloScapeDebugWindow).soloscapeJs5 = js5;
