import './style.css';
import { WebSocketTransport } from './net/WebSocketTransport';
import { ByteQueue } from './protocol/ByteQueue';
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
urlInput.value = scheme + '://' + location.hostname + ':8080';
revision.textContent =
  'protocol ' + OSRS_PROTOCOL_REVISION + ' / client ' + OSRS_CLIENT_TARGET;

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Canvas 2D is unavailable.');
}

context.fillStyle = '#000';
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = '#fff';
context.font = '18px system-ui';
context.textAlign = 'center';
context.fillText('Transport scaffold ready', canvas.width / 2, canvas.height / 2 - 12);
context.font = '14px system-ui';
context.fillText(
  'Next: port rev-240 JS5 and login state machines',
  canvas.width / 2,
  canvas.height / 2 + 16,
);

const queue = new ByteQueue();
const transport = new WebSocketTransport();

function appendLog(message: string): void {
  const stamp = new Date().toLocaleTimeString();
  log.textContent += '[' + stamp + '] ' + message + '\n';
  log.scrollTop = log.scrollHeight;
}

transport.onStateChange = (state) => {
  status.textContent = state[0].toUpperCase() + state.slice(1);
  connectButton.textContent = state === 'open' ? 'Disconnect' : 'Connect';
};

transport.onError = () => {
  appendLog('WebSocket error.');
};

transport.onData = (buffer) => {
  const bytes = new Uint8Array(buffer);
  queue.append(bytes);

  const preview = Array.from(bytes.subarray(0, 16))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join(' ');

  appendLog(
    'RX ' + bytes.length + ' bytes; queued=' + queue.available +
    (preview ? '; ' + preview : ''),
  );

  // TODO(rev240):
  // Feed queue into the active JS5/login/game state machine.
  // Do not assume each WebSocket message contains one OSRS packet.
};

connectButton.addEventListener('click', async () => {
  if (transport.state === 'open' || transport.state === 'connecting') {
    transport.disconnect();
    queue.clear();
    return;
  }

  try {
    appendLog('Connecting to ' + urlInput.value);
    await transport.connect(urlInput.value);
    appendLog('Gateway connected. No OSRS handshake is sent yet.');
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
  }
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener('pointerdown', (event) => {
  // TODO(input):
  // Convert pointer/touch coordinates to the logical 765x503 client viewport.
  // Long-press should eventually map to the OSRS context-menu gesture.
  canvas.setPointerCapture(event.pointerId);
});
