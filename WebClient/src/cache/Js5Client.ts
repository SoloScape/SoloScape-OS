import { WebSocketTransport } from '../net/WebSocketTransport';
import {
  formatCrc,
  parseJs5MasterIndex,
  type Js5MasterIndex,
} from './Js5MasterIndex';
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
  | 'archive-indices'
  | 'ready'
  | 'closed'
  | 'error';

export interface Js5ConnectOptions {
  revision: number;
  key?: Js5HandshakeKey;
}

export interface Js5ArchiveIndexProgress {
  received: number;
  total: number;
}

export class Js5Client {
  private readonly decoder = new Js5StreamDecoder();
  private masterIndex: Js5MasterIndex | null = null;
  private pendingArchiveIndices = new Set<number>();

  state: Js5ClientState = 'idle';
  onStateChange: ((state: Js5ClientState) => void) | null = null;
  onLog: ((message: string) => void) | null = null;
  onGroup: ((response: Js5GroupResponse) => void) | null = null;
  onMasterIndex:
    ((index: Js5MasterIndex, response: Js5GroupResponse) => void) | null = null;
  onArchiveIndex:
    ((
      archive: number,
      response: Js5GroupResponse,
      progress: Js5ArchiveIndexProgress,
    ) => void) | null = null;
  onBootstrapComplete: ((index: Js5MasterIndex) => void) | null = null;

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
    this.masterIndex = null;
    this.pendingArchiveIndices.clear();
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
    this.masterIndex = null;
    this.pendingArchiveIndices.clear();
    this.setState('closed');
  }

  private handleBytes(bytes: Uint8Array): void {
    try {
      const events = this.decoder.feed(bytes);

      for (const event of events) {
        if (event.type === 'handshake') {
          this.handleHandshake(event.code);
          continue;
        }

        this.handleGroup(event.response);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.onLog?.('JS5 protocol error: ' + message);
      this.setState('error');
      this.transport.disconnect();
    }
  }

  private handleHandshake(code: number): void {
    this.onLog?.('RX JS5 handshake status=' + code);

    if (code !== JS5_SUCCESS) {
      throw new Error('JS5 handshake failed with status ' + code + '.');
    }

    this.setState('master-index');
    this.requestGroup(
      JS5_MASTER_ARCHIVE,
      JS5_MASTER_GROUP,
      true,
    );
  }

  private handleGroup(response: Js5GroupResponse): void {
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
      this.handleMasterIndex(response);
      return;
    }

    if (
      response.archive === JS5_MASTER_ARCHIVE &&
      this.pendingArchiveIndices.has(response.group)
    ) {
      this.handleArchiveIndex(response);
    }
  }

  private handleMasterIndex(response: Js5GroupResponse): void {
    const payload = getUncompressedJs5Payload(response);
    if (!payload) {
      throw new Error(
        'Compressed JS5 master index is not supported yet; compression=' +
        response.compression + '.',
      );
    }

    const index = parseJs5MasterIndex(payload);
    this.masterIndex = index;
    this.pendingArchiveIndices =
      new Set(index.entries.map((entry) => entry.archive));

    this.onLog?.(
      'Parsed JS5 master index: ' + index.entries.length +
      ' archives from ' + payload.length + ' bytes.',
    );

    for (const entry of index.entries) {
      this.onLog?.(
        'Archive ' + entry.archive +
        ' crc=' + formatCrc(entry.crc) +
        ' version=' + entry.version,
      );
    }

    this.persistMasterIndex(index);
    this.onMasterIndex?.(index, response);

    if (index.entries.length === 0) {
      this.finishBootstrap(index);
      return;
    }

    this.setState('archive-indices');

    for (const entry of index.entries) {
      this.transport.send(
        encodeJs5GroupRequest(
          JS5_MASTER_ARCHIVE,
          entry.archive,
          true,
        ),
      );
    }

    this.onLog?.(
      'TX JS5 archive reference-table requests: ' +
      index.entries.length + ' groups (255:0..255:' +
      index.entries[index.entries.length - 1]!.archive + ').',
    );
  }

  private handleArchiveIndex(response: Js5GroupResponse): void {
    const index = this.masterIndex;
    if (!index) {
      throw new Error('Archive reference table arrived before master index.');
    }

    this.pendingArchiveIndices.delete(response.group);

    const progress: Js5ArchiveIndexProgress = {
      received: index.entries.length - this.pendingArchiveIndices.size,
      total: index.entries.length,
    };

    const metadata = index.entries[response.group];
    this.onLog?.(
      'Reference table ' + response.group +
      ' received (' + progress.received + '/' + progress.total + ')' +
      (metadata
        ? ' expected-crc=' + formatCrc(metadata.crc) +
          ' version=' + metadata.version
        : ''),
    );

    this.onArchiveIndex?.(
      response.group,
      response,
      progress,
    );

    if (this.pendingArchiveIndices.size === 0) {
      this.finishBootstrap(index);
    }
  }

  private finishBootstrap(index: Js5MasterIndex): void {
    this.setState('ready');
    this.onLog?.(
      'JS5 cache index bootstrap complete: master index + ' +
      index.entries.length + ' archive reference tables received.',
    );
    this.onBootstrapComplete?.(index);
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

  private persistMasterIndex(index: Js5MasterIndex): void {
    void this.store
      .putMasterIndex(index)
      .then(() => {
        this.onLog?.('Cached parsed JS5 master-index metadata in IndexedDB.');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.onLog?.(
          'IndexedDB master-index metadata write failed: ' + message,
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
