import { WebSocketTransport } from '../net/WebSocketTransport';
import { ByteQueue } from './ByteQueue';
import {
  INIT_GAME_CONNECTION,
  LOGIN_SUCCESS,
  LOGIN_SUCCESS_DECLARED_SIZE,
  LOGIN_SUCCESS_PAYLOAD_SIZE,
  decodeLoginSuccess,
  encodeGameLoginPacket,
  type GameLoginPacketOptions,
  type LoginSuccess,
} from './GameLoginProtocol';
import { IsaacRandom } from './IsaacRandom';
import {
  decodeProofOfWorkChallenge,
  encodeProofOfWorkReply,
  solveProofOfWork,
  type ProofOfWorkChallenge,
} from './ProofOfWork';
import {
  GamePacketFramer,
  type ServerGamePacket,
} from './GamePacketFramer';

export type GameLoginState =
  | 'idle'
  | 'connecting'
  | 'handshake'
  | 'server-seed'
  | 'login-block'
  | 'login-response'
  | 'game'
  | 'closed'
  | 'error';

type LoginPhase =
  | 'idle'
  | 'init-status'
  | 'session-id'
  | 'submitting-login'
  | 'response-code'
  | 'ok-length'
  | 'ok-payload'
  | 'tokens-length'
  | 'tokens-payload'
  | 'disallowed-length'
  | 'disallowed-payload'
  | 'pow-length'
  | 'pow-payload'
  | 'pow-solving'
  | 'dob-byte'
  | 'game';

interface GatewayConfigMessage {
  type: 'soloscape-gateway-config';
  rsaExponent: string;
  rsaModulus: string;
}

export interface GameLoginConnectOptions
  extends Omit<
    GameLoginPacketOptions,
    'sessionId' | 'rsaModulusHex' | 'rsaExponentHex'
  > {
  rsaModulusHex?: string;
  rsaExponentHex?: string;
  gatewayConfigTimeoutMs?: number;
}

const LOGIN_RESPONSE_NAMES: Readonly<Record<number, string>> = {
  0: 'successful handshake',
  2: 'login successful',
  3: 'invalid username or password',
  4: 'account banned',
  5: 'account already logged in',
  6: 'client out of date',
  7: 'server full',
  8: 'login server offline',
  9: 'IP connection limit',
  10: 'bad session id',
  11: 'force password change',
  12: 'members account required',
  13: 'invalid save',
  14: 'update in progress',
  15: 'reconnect ok',
  16: 'too many login attempts',
  18: 'account locked',
  21: 'world hop blocked',
  22: 'invalid login packet',
  23: 'login server no reply',
  24: 'login server load error',
  25: 'unknown login-server response',
  26: 'IP blocked',
  29: 'login disallowed by server script',
  32: 'negative credit',
  35: 'invalid single sign-on',
  36: 'no reply from single sign-on',
  37: 'profile being edited',
  38: 'no beta access',
  39: 'instance invalid',
  40: 'instance not specified',
  41: 'instance full',
  42: 'in login queue',
  43: 'already in login queue',
  44: 'billing timeout',
  45: 'NDA not accepted',
  47: 'email not validated',
  50: 'connection failed',
  55: 'privacy policy acknowledgement required',
  56: 'authenticator required',
  57: 'invalid authenticator code',
  61: 'date-of-birth update required',
  62: 'login timeout',
  63: 'kicked',
  64: 'login tokens',
  65: 'login failed',
  67: 'login failed',
  68: 'client reload required',
  69: 'proof of work required',
  71: 'date-of-birth error',
  72: 'date-of-birth website flow required',
  73: 'date-of-birth review required',
  74: 'closed beta',
};

export class GameLoginClient {
  private readonly queue = new ByteQueue();
  private phase: LoginPhase = 'idle';
  private options: GameLoginConnectOptions | null = null;
  private gatewayConfig: GatewayConfigMessage | null = null;
  private serverIsaac: IsaacRandom | null = null;
  private clientIsaac: IsaacRandom | null = null;
  private gameFramer: GamePacketFramer | null = null;
  private pendingLength = 0;
  private proofOfWorkAbortController: AbortController | null = null;
  private rsaConfigWaiters: Array<(config: GatewayConfigMessage) => void> = [];

  state: GameLoginState = 'idle';
  sessionId: bigint | null = null;
  loginSuccess: LoginSuccess | null = null;
  onStateChange: ((state: GameLoginState) => void) | null = null;
  onLog: ((message: string) => void) | null = null;
  onLoginSuccess: ((success: LoginSuccess) => void) | null = null;
  onLoginFailure: ((code: number, message: string) => void) | null = null;
  onGameData: ((data: Uint8Array) => void) | null = null;
  onGamePacket: ((packet: ServerGamePacket) => void) | null = null;

  constructor(private readonly transport: WebSocketTransport) {
    this.transport.onData = (buffer) => {
      this.handleBytes(new Uint8Array(buffer));
    };
    this.transport.onText = (text) => {
      this.handleControlMessage(text);
    };
    this.transport.onError = () => {
      this.onLog?.('Game WebSocket transport error.');
    };
    this.transport.onStateChange = (state) => {
      if (
        state === 'closed' &&
        this.state !== 'idle' &&
        this.state !== 'closed' &&
        this.state !== 'error'
      ) {
        this.cancelProofOfWork();
        this.phase = 'idle';
        this.setState('closed');
      }
    };
  }

  async connect(
    url: string,
    options: GameLoginConnectOptions,
  ): Promise<void> {
    if (!options.username.trim()) {
      throw new Error('Username cannot be empty.');
    }
    if (!options.password) {
      throw new Error('Password cannot be empty.');
    }

    this.reset();
    this.options = {
      ...options,
      username: options.username.trim(),
    };
    this.setState('connecting');
    this.onLog?.('Connecting game-login socket to ' + url);

    try {
      await this.transport.connect(url);
      this.phase = 'init-status';
      this.setState('handshake');
      this.transport.send(new Uint8Array([INIT_GAME_CONNECTION]));
      this.onLog?.('TX game init: opcode=' + INIT_GAME_CONNECTION);
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  disconnect(): void {
    this.cancelProofOfWork();
    this.phase = 'idle';
    this.setState('closed');
    this.transport.disconnect();
    this.queue.clear();
  }

  /** ISAAC used to encode future client -> server game packet opcodes. */
  getClientIsaac(): IsaacRandom {
    if (!this.clientIsaac) {
      throw new Error('Client ISAAC is unavailable before the login block is sent.');
    }
    return this.clientIsaac;
  }

  /** ISAAC used to decode future server -> client game packet opcodes. */
  getServerIsaac(): IsaacRandom {
    if (!this.serverIsaac) {
      throw new Error('Server ISAAC is unavailable before the login block is sent.');
    }
    return this.serverIsaac;
  }

  private handleControlMessage(text: string): void {
    try {
      const message = JSON.parse(text) as Partial<GatewayConfigMessage>;
      if (
        message.type !== 'soloscape-gateway-config' ||
        typeof message.rsaExponent !== 'string' ||
        typeof message.rsaModulus !== 'string'
      ) {
        return;
      }

      const config: GatewayConfigMessage = {
        type: 'soloscape-gateway-config',
        rsaExponent: message.rsaExponent,
        rsaModulus: message.rsaModulus,
      };
      this.gatewayConfig = config;
      this.onLog?.(
        'RX gateway login config: RSA modulus=' +
        config.rsaModulus.length + ' hex chars.',
      );
      const waiters = this.rsaConfigWaiters.splice(0);
      for (const resolve of waiters) {
        resolve(config);
      }
    } catch {
      // Text frames are gateway control messages only. Unknown text is ignored.
    }
  }

  private handleBytes(bytes: Uint8Array): void {
    if (this.phase === 'game') {
      try {
        this.forwardGameData(bytes);
      } catch (error) {
        this.fail(error);
      }
      return;
    }

    this.queue.append(bytes);
    try {
      this.drain();
    } catch (error) {
      this.fail(error);
    }
  }

  private drain(): void {
    while (true) {
      switch (this.phase) {
        case 'init-status': {
          if (this.queue.available < 1) return;
          const code = this.queue.readU8();
          this.onLog?.('RX game init status=' + code);
          if (code !== 0) {
            this.rejectLogin(code);
            return;
          }
          this.phase = 'session-id';
          this.setState('server-seed');
          continue;
        }
        case 'session-id': {
          if (this.queue.available < 8) return;
          const seedBytes = this.queue.readBytes(8);
          this.sessionId = bytesToBigInt(seedBytes);
          this.onLog?.(
            'RX game server seed/session id=0x' +
            this.sessionId.toString(16).padStart(16, '0'),
          );
          this.phase = 'submitting-login';
          this.setState('login-block');
          void this.submitLogin(this.sessionId);
          return;
        }
        case 'submitting-login':
          return;
        case 'response-code': {
          if (this.queue.available < 1) return;
          const code = this.queue.readU8();
          this.onLog?.(
            'RX login response=' + code +
            ' (' + (LOGIN_RESPONSE_NAMES[code] ?? 'unknown') + ')',
          );
          if (code === LOGIN_SUCCESS) {
            this.phase = 'ok-length';
            continue;
          }
          if (code === 64) {
            this.phase = 'tokens-length';
            continue;
          }
          if (code === 29) {
            this.phase = 'disallowed-length';
            continue;
          }
          if (code === 69) {
            this.phase = 'pow-length';
            continue;
          }
          if (code === 61) {
            this.phase = 'dob-byte';
            continue;
          }
          this.rejectLogin(code);
          return;
        }
        case 'ok-length': {
          if (this.queue.available < 1) return;
          const length = this.queue.readU8();
          if (length !== LOGIN_SUCCESS_DECLARED_SIZE) {
            throw new Error(
              'Invalid login-success declared size ' + length +
              '; expected ' + LOGIN_SUCCESS_DECLARED_SIZE + '.',
            );
          }
          // rev-240 declares 37 here even though the metadata encoder emits
          // 34 bytes. Do not consume the first three bytes of the game stream.
          this.pendingLength = LOGIN_SUCCESS_PAYLOAD_SIZE;
          this.phase = 'ok-payload';
          continue;
        }
        case 'ok-payload': {
          if (this.queue.available < this.pendingLength) return;
          if (!this.serverIsaac) {
            throw new Error('Server ISAAC was not initialized before login success.');
          }
          const payload = this.queue.readBytes(this.pendingLength);
          const success = decodeLoginSuccess(payload, this.serverIsaac);
          this.loginSuccess = success;
          this.gameFramer = new GamePacketFramer(this.serverIsaac);
          this.phase = 'game';
          this.setState('game');
          this.onLog?.(
            'Game login successful: local-player-index=' +
            success.localPlayerIndex + ' member=' + success.member + '.',
          );
          this.onLoginSuccess?.(success);
          if (this.queue.available !== 0) {
            this.forwardGameData(this.queue.readBytes(this.queue.available));
          }
          return;
        }
        case 'tokens-length': {
          if (this.queue.available < 1) return;
          this.pendingLength = this.queue.readU8();
          this.phase = 'tokens-payload';
          continue;
        }
        case 'tokens-payload': {
          if (this.queue.available < this.pendingLength) return;
          this.queue.readBytes(this.pendingLength);
          if (!this.serverIsaac) {
            throw new Error('Server ISAAC unavailable while consuming login tokens.');
          }
          for (let i = 0; i < this.pendingLength; i += 1) {
            this.serverIsaac.nextInt();
          }
          this.onLog?.('Consumed ' + this.pendingLength + ' encrypted login-token bytes.');
          this.phase = 'response-code';
          continue;
        }
        case 'disallowed-length': {
          if (this.queue.available < 2) return;
          this.pendingLength = this.queue.readU16BE();
          this.phase = 'disallowed-payload';
          continue;
        }
        case 'disallowed-payload': {
          if (this.queue.available < this.pendingLength) return;
          const payload = this.queue.readBytes(this.pendingLength);
          const lines = decodeJagexStrings(payload, 3);
          this.rejectLogin(29, lines.filter(Boolean).join(' '));
          return;
        }
        case 'pow-length': {
          if (this.queue.available < 2) return;
          this.pendingLength = this.queue.readU16BE();
          this.phase = 'pow-payload';
          continue;
        }
        case 'pow-payload': {
          if (this.queue.available < this.pendingLength) return;
          const payload = this.queue.readBytes(this.pendingLength);
          const challenge = decodeProofOfWorkChallenge(payload);
          this.onLog?.(
            'RX proof-of-work challenge: SHA-256 version=' +
            challenge.version + ' difficulty=' + challenge.difficulty +
            ' salt=' + challenge.salt.length + ' chars.',
          );
          this.phase = 'pow-solving';
          void this.answerProofOfWork(challenge);
          return;
        }
        case 'pow-solving':
          return;
        case 'dob-byte': {
          if (this.queue.available < 1) return;
          const value = this.queue.readU8();
          this.rejectLogin(61, 'Date-of-birth update required (server value ' + value + ').');
          return;
        }
        case 'idle':
        case 'game':
          return;
      }
    }
  }

  private async answerProofOfWork(
    challenge: ProofOfWorkChallenge,
  ): Promise<void> {
    this.cancelProofOfWork();
    const controller = new AbortController();
    this.proofOfWorkAbortController = controller;
    const startedAt = Date.now();

    try {
      const result = await solveProofOfWork(challenge, {
        signal: controller.signal,
      });
      if (
        this.phase !== 'pow-solving' ||
        this.proofOfWorkAbortController !== controller
      ) {
        return;
      }

      this.proofOfWorkAbortController = null;
      const packet = encodeProofOfWorkReply(result);
      this.transport.send(packet);
      this.onLog?.(
        'TX proof-of-work reply: opcode=19 result=0x' +
        result.toString(16) + ' solved in ' +
        ((Date.now() - startedAt) / 1000).toFixed(2) + 's.',
      );
      this.phase = 'response-code';
      this.drain();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      if (this.proofOfWorkAbortController === controller) {
        this.proofOfWorkAbortController = null;
      }
      if (this.phase === 'pow-solving') {
        this.fail(error);
      }
    }
  }

  private async submitLogin(sessionId: bigint): Promise<void> {
    try {
      const options = this.options;
      if (!options) {
        throw new Error('Game login options are unavailable.');
      }

      const rsa = await this.resolveRsaConfig(options);
      if (this.phase !== 'submitting-login') {
        return;
      }

      const encoded = encodeGameLoginPacket({
        ...options,
        sessionId,
        rsaModulusHex: rsa.rsaModulus,
        rsaExponentHex: rsa.rsaExponent,
      });
      const clientSeed = Array.from(encoded.seed, (value) => value | 0);
      const serverSeed = clientSeed.map((value) => (value + 50) | 0);
      this.clientIsaac = new IsaacRandom(clientSeed);
      this.serverIsaac = new IsaacRandom(serverSeed);

      this.transport.send(encoded.packet);
      this.options = { ...options, password: '' };
      this.onLog?.(
        'TX game login: opcode=16 payload=' +
        (encoded.packet.length - 3) + ' bytes; ISAAC initialized.',
      );
      this.phase = 'response-code';
      this.setState('login-response');
      this.drain();
    } catch (error) {
      this.fail(error);
    }
  }

  private async resolveRsaConfig(
    options: GameLoginConnectOptions,
  ): Promise<GatewayConfigMessage> {
    if (options.rsaModulusHex) {
      return {
        type: 'soloscape-gateway-config',
        rsaExponent: options.rsaExponentHex ?? '10001',
        rsaModulus: options.rsaModulusHex,
      };
    }
    if (this.gatewayConfig) {
      return this.gatewayConfig;
    }

    const timeoutMs = options.gatewayConfigTimeoutMs ?? 2500;
    return await new Promise<GatewayConfigMessage>((resolve, reject) => {
      const onConfig = (config: GatewayConfigMessage) => {
        clearTimeout(timer);
        resolve(config);
      };
      this.rsaConfigWaiters.push(onConfig);
      const timer = setTimeout(() => {
        const index = this.rsaConfigWaiters.indexOf(onConfig);
        if (index !== -1) {
          this.rsaConfigWaiters.splice(index, 1);
        }
        reject(new Error(
          'Gateway did not provide the SoloScape RSA public key. ' +
          'Ensure Server/.data/client.key exists, or configure RSA_PUBLIC_KEY_FILE/RSA_MODULUS on the gateway.',
        ));
      }, timeoutMs);
    });
  }

  private forwardGameData(bytes: Uint8Array): void {
    if (bytes.length === 0) {
      return;
    }
    if (!this.gameFramer) {
      throw new Error('Game packet framer is unavailable after login success.');
    }

    const packets = this.gameFramer.append(bytes);
    this.onGameData?.(bytes.slice());
    for (const packet of packets) {
      this.onLog?.(
        'RX game packet ' + packet.opcode + ' ' + packet.name +
        ' payload=' + packet.payload.length + ' bytes.',
      );
      this.onGamePacket?.(packet);
    }
  }

  private rejectLogin(code: number, detail?: string): void {
    this.cancelProofOfWork();
    const base = LOGIN_RESPONSE_NAMES[code] ?? 'unknown login response';
    const message = detail ? base + ': ' + detail : base;
    this.onLog?.('Game login failed: ' + message + ' (code ' + code + ').');
    this.onLoginFailure?.(code, message);
    this.phase = 'idle';
    this.setState('error');
    this.transport.disconnect();
  }

  private fail(error: unknown): void {
    this.cancelProofOfWork();
    const message = error instanceof Error ? error.message : String(error);
    this.onLog?.('Game login protocol error: ' + message);
    this.phase = 'idle';
    this.setState('error');
    this.transport.disconnect();
  }

  private reset(): void {
    this.cancelProofOfWork();
    this.queue.clear();
    this.phase = 'idle';
    this.sessionId = null;
    this.loginSuccess = null;
    this.clientIsaac = null;
    this.serverIsaac = null;
    this.gameFramer = null;
    this.pendingLength = 0;
    this.gatewayConfig = null;
    this.options = null;
    this.rsaConfigWaiters.length = 0;
  }

  private cancelProofOfWork(): void {
    this.proofOfWorkAbortController?.abort();
    this.proofOfWorkAbortController = null;
  }

  private setState(state: GameLoginState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.onStateChange?.(state);
  }
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

function decodeJagexStrings(
  bytes: Uint8Array,
  expected: number,
): string[] {
  const decoder = new TextDecoder('windows-1252');
  const values: string[] = [];
  let start = 0;

  for (let i = 0; i < bytes.length && values.length < expected; i += 1) {
    if (bytes[i] !== 0) continue;
    values.push(decoder.decode(bytes.subarray(start, i)));
    start = i + 1;
  }

  while (values.length < expected) {
    values.push('');
  }
  return values;
}
