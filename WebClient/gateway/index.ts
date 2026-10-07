import { createConnection, type Socket } from 'node:net';
import { Buffer } from 'node:buffer';
import WebSocket, {
  WebSocketServer,
  type RawData,
} from 'ws';

function envPort(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(name + ' must be a TCP port number.');
  }
  return value;
}

function rawDataToBuffer(data: RawData): Buffer {
  if (Array.isArray(data)) {
    return Buffer.concat(data);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  return data;
}

const wsHost = process.env.WS_HOST ?? '127.0.0.1';
const wsPort = envPort('WS_PORT', 8080);
const gameHost = process.env.GAME_HOST ?? '127.0.0.1';
const gamePort = envPort('GAME_PORT', 43594);
const allowedOrigin = process.env.WS_ALLOWED_ORIGIN;
const maxQueuedBytes = 1024 * 1024;

const server = new WebSocketServer({
  host: wsHost,
  port: wsPort,
  perMessageDeflate: false,
  maxPayload: 4 * 1024 * 1024,
});

server.on('connection', (client, request) => {
  const origin = request.headers.origin;

  if (allowedOrigin && origin !== allowedOrigin) {
    client.close(1008, 'Origin not allowed');
    return;
  }

  const upstream: Socket = createConnection({
    host: gameHost,
    port: gamePort,
  });
  upstream.setNoDelay(true);

  let upstreamReady = false;
  let closed = false;
  let queuedBytes = 0;
  const queued: Buffer[] = [];

  const closeBoth = (code = 1011, reason = 'Gateway closed') => {
    if (closed) {
      return;
    }
    closed = true;

    if (!upstream.destroyed) {
      upstream.destroy();
    }

    if (
      client.readyState === WebSocket.OPEN ||
      client.readyState === WebSocket.CONNECTING
    ) {
      client.close(code, reason);
    }
  };

  upstream.on('connect', () => {
    upstreamReady = true;
    for (const chunk of queued) {
      upstream.write(chunk);
    }
    queued.length = 0;
    queuedBytes = 0;
  });

  upstream.on('data', (chunk) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(chunk, { binary: true });
    }
  });

  upstream.on('end', () => {
    closeBoth(1000, 'Game server closed connection');
  });

  upstream.on('close', () => {
    closeBoth(1000, 'Game server connection closed');
  });

  upstream.on('error', (error) => {
    console.error('Upstream error:', error.message);
    closeBoth(1011, 'Unable to reach game server');
  });

  client.on('message', (data, isBinary) => {
    if (!isBinary) {
      closeBoth(1003, 'Binary frames only');
      return;
    }

    const chunk = rawDataToBuffer(data);

    if (upstreamReady) {
      upstream.write(chunk);
      return;
    }

    queuedBytes += chunk.length;
    if (queuedBytes > maxQueuedBytes) {
      closeBoth(1009, 'Too much data queued before upstream connect');
      return;
    }
    queued.push(chunk);
  });

  client.on('close', () => {
    if (!upstream.destroyed) {
      upstream.end();
    }
    closed = true;
  });

  client.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    closeBoth();
  });
});

server.on('listening', () => {
  console.log(
    'SoloScape WebSocket gateway listening on ws://' + wsHost + ':' + wsPort,
  );
  console.log(
    'Forwarding each WebSocket connection to tcp://' + gameHost + ':' + gamePort,
  );
});

server.on('error', (error) => {
  console.error('Gateway server error:', error);
  process.exitCode = 1;
});
