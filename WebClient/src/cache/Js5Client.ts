import { WebSocketTransport } from '../net/WebSocketTransport';
import {
  JS5_MASTER_ARCHIVE,
  JS5_MASTER_GROUP,
  JS5_SUCCESS,
  ZERO_JS5_HANDSHAKE_KEY,
  encodeJs5GroupRequest,
  encodeJs5Handshake,
  getUncompressedJs5Payload,
  type Js5GroupResponse,
  type Js5HandshakeKey,
} from './Js5Protocol';
import { Js5StreamDecoder } from './Js5StreamDecoder';
import { IndexedDbCacheStore } from './IndexedDbCacheStore';

export type Js5ClientState =
  | 'idle'
  | 'connecting'
  | 'handshake'
  | 'master-index'
  | 'ready'
  | 'closed'
  | 'error';

export interface Js5ConnectOptions {
  revision: number;
  key?: Js5HandshakeKey;
}

export class Js5Client {
  private readonly decoder = new Js5StreamDecoder();

  state: Js5ClientState = 'idle';
  onStateChange: ((state: Js5ClientState) => void) | null = null;
  onLog: ((message: string) => void) | null = null;
  onGroup: ((response: Js5GroupResponse) => void) | null = null;
  onMasterIndex: ((response: Js5GroupResponse) => void) | null = null;

  constructor(
    private readonly transport: WebSocketTransport,
    private readonly store: IndexedDbCacheStore,
  ) {
    this.transport.onData = (buffer) => {
      this.handleBytes(new Uint8Array(buffer));
    };

    this.transport.onError = () => {
      this.onLog?.('WebSocket transport error.');
    };

    this.transport.onStateChange = (state) => {
      if (
        state === 'closed' &&
        this.state !== 'idle' &&
        this.state !== 'closed' &&
        this.state !== 'error'
      ) {
        this.setState('closed');
      }
    };
  }

  async connect(
    url: string,
    options: Js5ConnectOptions,
  ): Promise<void> {
    this.decoder.reset();
    this.setState('connecting');
    this.onLog?.('Connecting JS5 socket to ' + url);

    try {
      await this.transport.connect(url);
      this.setState('handshake');

      const key = options.key ?? ZERO_JS5_HANDSHAKE_KEY;
      this.transport.send(encodeJs5Handshake(options.revision, key));
      this.onLog?.(
        'TX JS5 init: opcode=15 revision=' + options.revision +
        ' key=[' + key.join(', ') + ']',
      );
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  requestGroup(
    archive: number,
    group: number,
    urgent = true,
  ): void {
    this.transport.send(encodeJs5GroupRequest(archive, group, urgent));
    this.onLog?.(
      'TX JS5 request ' + archive + ':' + group +
      ' priority=' + (urgent ? 'urgent' : 'normal'),
    );
  }

  disconnect(): void {
    this.transport.disconnect();
    this.decoder.reset();
    this.setState('closed');
  }

  private handleBytes(bytes: Uint8Array): void {
    try {
      const events = this.decoder.feed(bytes);

      for (const event of events) {
        if (event.type === 'handshake') {
          this.onLog?.('RX JS5 handshake status=' + event.code);

          if (event.code !== JS5_SUCCESS) {
            throw new Error(
              'JS5 handshake failed with status ' + event.code + '.',
            );
          }

          this.setState('master-index');
          this.requestGroup(
            JS5_MASTER_ARCHIVE,
            JS5_MASTER_GROUP,
            true,
          );
          continue;
        }

        const response = event.response;
        this.onLog?.(
          'RX JS5 group ' + response.archive + ':' + response.group +
          ' compression=' + response.compression +
          ' size=' + response.size +
          ' container=' + response.container.length + ' bytes',
        );
        this.onGroup?.(response);
        this.persist(response);

        if (
          response.archive === JS5_MASTER_ARCHIVE &&
          response.group === JS5_MASTER_GROUP
        ) {
          const payload = getUncompressedJs5Payload(response);
          if (payload) {
            this.onLog?.(
              'Master index payload available: ' + payload.length + ' bytes.',
            );
          } else {
            this.onLog?.(
              'Master index is compressed; raw container stored for the cache decoder milestone.',
            );
          }

          this.setState('ready');
          this.onMasterIndex?.(response);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.onLog?.('JS5 protocol error: ' + message);
      this.setState('error');
      this.transport.disconnect();
    }
  }

  private persist(response: Js5GroupResponse): void {
    void this.store
      .put(response)
      .then(() => {
        this.onLog?.(
          'Cached JS5 group ' + response.archive + ':' + response.group +
          ' in IndexedDB.',
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.onLog?.(
          'IndexedDB cache write failed for ' +
          response.archive + ':' + response.group + ': ' + message,
        );
      });
  }

  private setState(state: Js5ClientState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.onStateChange?.(state);
  }
}
