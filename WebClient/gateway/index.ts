import { readFileSync } from 'node:fs';
import { createConnection, type Socket } from 'node:net';
import { Buffer } from 'node:buffer';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket, {
  WebSocketServer,
  type RawData,
} from 'ws';

interface GatewayRsaConfig {
  exponent: string;
  modulus: string;
}

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

function normalizeHex(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/^0x/i, '').replace(/\s+/g, '');
  return /^[0-9a-f]+$/i.test(normalized) ? normalized : null;
}

function loadGatewayRsaConfig(): GatewayRsaConfig | null {
  const inlineModulus = normalizeHex(process.env.RSA_MODULUS);
  if (inlineModulus) {
    return {
      exponent: normalizeHex(process.env.RSA_EXPONENT) ?? '10001',
      modulus: inlineModulus,
    };
  }

  const gatewayDir = dirname(fileURLToPath(import.meta.url));
  const defaultFile = resolve(gatewayDir, '../../Server/.data/client.key');
  const file = process.env.RSA_PUBLIC_KEY_FILE ?? defaultFile;

  try {
    const contents = readFileSync(file, 'utf8');
    const exponent = normalizeHex(
      contents.match(/^Exponent:\s*([0-9a-fx]+)/im)?.[1],
    );
    const modulus = normalizeHex(
      contents.match(/^Modulus:\s*([0-9a-fx]+)/im)?.[1],
    );
    if (!exponent || !modulus) {
      throw new Error('missing Exponent/Modulus lines');
    }
    return { exponent, modulus };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      'Game-login RSA public key unavailable (' + file + '): ' + message,
    );
    console.warn(
      'JS5 still works. For game login, create Server/.data/client.key or set RSA_MODULUS/RSA_PUBLIC_KEY_FILE.',
    );
    return null;
  }
}

const wsHost = process.env.WS_HOST ?? '127.0.0.1';
const wsPort = envPort('WS_PORT', 8081);
const gameHost = process.env.GAME_HOST ?? '127.0.0.1';
const gamePort = envPort('GAME_PORT', 43594);
const allowedOrigin = process.env.WS_ALLOWED_ORIGIN;
const maxQueuedBytes = 1024 * 1024;
const gatewayRsaConfig = loadGatewayRsaConfig();

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

  // The modulus/exponent are public information required to construct the
  // textbook-RSA OSRS login block. Existing JS5 clients ignore this text frame.
  if (gatewayRsaConfig) {
    client.send(JSON.stringify({
      type: 'soloscape-gateway-config',
      rsaExponent: gatewayRsaConfig.exponent,
      rsaModulus: gatewayRsaConfig.modulus,
    }));
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
  console.log(
    gatewayRsaConfig
      ? 'Game-login RSA public key loaded (' + gatewayRsaConfig.modulus.length + ' hex chars).'
      : 'Game-login RSA public key not loaded; JS5-only mode until configured.',
  );
});

server.on('error', (error) => {
  console.error('Gateway server error:', error);
  process.exitCode = 1;
});
