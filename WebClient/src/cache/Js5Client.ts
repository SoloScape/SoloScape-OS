import { WebSocketTransport } from '../net/WebSocketTransport';
import {
  decodeJs5Container,
} from './Js5Container';
import {
  formatCrc,
  isJs5ArchivePresent,
  parseJs5MasterIndex,
  presentJs5Archives,
  type Js5MasterIndex,
} from './Js5MasterIndex';
import {
  JS5_MASTER_ARCHIVE,
  JS5_MASTER_GROUP,
  JS5_SUCCESS,
  ZERO_JS5_HANDSHAKE_KEY,
  encodeJs5GroupRequest,
  encodeJs5Handshake,
  type Js5GroupResponse,
  type Js5HandshakeKey,
} from './Js5Protocol';
import {
  cloneJs5ReferenceTable,
  parseJs5ReferenceTable,
  type Js5ReferenceTable,
} from './Js5ReferenceTable';
import { Js5StreamDecoder } from './Js5StreamDecoder';
import { IndexedDbCacheStore } from './IndexedDbCacheStore';
import { validateJs5ReferenceTable } from './Js5Validation';

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
  private pendingArchiveDecodes = new Set<number>();
  private archiveIndexPayloads = new Map<number, Uint8Array>();
  private archiveReferenceTables = new Map<number, Js5ReferenceTable>();
  private archiveIndexTotal = 0;

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
    this.pendingArchiveDecodes.clear();
    this.archiveIndexPayloads.clear();
    this.archiveReferenceTables.clear();
    this.archiveIndexTotal = 0;
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
      this.fail(error);
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

  getArchiveIndexPayload(archive: number): Uint8Array | undefined {
    return this.archiveIndexPayloads.get(archive)?.slice();
  }

  getArchiveReferenceTable(
    archive: number,
  ): Js5ReferenceTable | undefined {
    const table = this.archiveReferenceTables.get(archive);
    return table ? cloneJs5ReferenceTable(table) : undefined;
  }

  disconnect(): void {
    this.transport.disconnect();
    this.decoder.reset();
    this.masterIndex = null;
    this.pendingArchiveIndices.clear();
    this.pendingArchiveDecodes.clear();
    this.archiveIndexPayloads.clear();
    this.archiveReferenceTables.clear();
    this.archiveIndexTotal = 0;
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
      this.fail(error);
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

    if (
      response.archive === JS5_MASTER_ARCHIVE &&
      response.group === JS5_MASTER_GROUP
    ) {
      this.persist(response);
      void this.handleMasterIndex(response).catch((error: unknown) => {
        this.fail(error);
      });
      return;
    }

    if (
      response.archive === JS5_MASTER_ARCHIVE &&
      this.pendingArchiveIndices.has(response.group)
    ) {
      this.handleArchiveIndex(response);
      return;
    }

    this.persist(response);
  }

  private async handleMasterIndex(
    response: Js5GroupResponse,
  ): Promise<void> {
    const decoded = await decodeJs5Container(response.container);
    const payload = decoded.data;
    const index = parseJs5MasterIndex(payload);
    const presentEntries = presentJs5Archives(index);

    this.masterIndex = index;
    this.pendingArchiveIndices =
      new Set(presentEntries.map((entry) => entry.archive));
    this.pendingArchiveDecodes =
      new Set(presentEntries.map((entry) => entry.archive));
    this.archiveIndexTotal = presentEntries.length;

    this.onLog?.(
      'Decoded JS5 master index container: compression=' +
      decoded.compression + ' ' + decoded.compressedSize + ' -> ' +
      decoded.uncompressedSize + ' bytes.',
    );
    this.onLog?.(
      'Parsed JS5 master index: ' + index.entries.length +
      ' archive slots, ' + presentEntries.length +
      ' present, from ' + payload.length + ' bytes.',
    );

    for (const entry of index.entries) {
      this.onLog?.(
        'Archive ' + entry.archive +
        ' crc=' + formatCrc(entry.crc) +
        ' version=' + entry.version +
        (isJs5ArchivePresent(entry) ? '' : ' (empty slot; skipped)'),
      );
    }

    this.persistMasterIndex(index);
    this.onMasterIndex?.(index, response);

    if (presentEntries.length === 0) {
      this.finishBootstrap(index);
      return;
    }

    this.setState('archive-indices');

    for (const entry of presentEntries) {
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
      presentEntries.length + ' present groups; skipped ' +
      (index.entries.length - presentEntries.length) + ' empty slots.',
    );
  }

  private handleArchiveIndex(response: Js5GroupResponse): void {
    const index = this.masterIndex;
    if (!index) {
      throw new Error('Archive reference table arrived before master index.');
    }

    this.pendingArchiveIndices.delete(response.group);

    const progress: Js5ArchiveIndexProgress = {
      received: this.archiveIndexTotal - this.pendingArchiveIndices.size,
      total: this.archiveIndexTotal,
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

    void this.decodeArchiveIndex(response).catch((error: unknown) => {
      this.fail(error);
    });
  }

  private async decodeArchiveIndex(
    response: Js5GroupResponse,
  ): Promise<void> {
    const index = this.masterIndex;
    if (!index) {
      throw new Error('Reference table decoded without a master index.');
    }

    const metadata = index.entries[response.group];
    if (!metadata || !isJs5ArchivePresent(metadata)) {
      throw new Error(
        'Missing master-index metadata for reference table ' +
        response.group + '.',
      );
    }

    const decoded = await decodeJs5Container(response.container);
    const table = parseJs5ReferenceTable(decoded.data);
    const validation = validateJs5ReferenceTable(
      response.group,
      response.container,
      table,
      metadata,
    );

    this.archiveIndexPayloads.set(response.group, decoded.data);
    this.archiveReferenceTables.set(response.group, table);
    this.pendingArchiveDecodes.delete(response.group);

    const totalFiles = table.groups.reduce(
      (sum, group) => sum + group.files.length,
      0,
    );

    this.onLog?.(
      'Validated reference table ' + response.group +
      ': crc=' + formatCrc(validation.crc) +
      ' version=' + validation.version + '.',
    );
    this.onLog?.(
      'Parsed reference table ' + response.group +
      ': protocol=' + table.protocol +
      ' version=' + table.version +
      ' flags=0x' + table.flags.toString(16).padStart(2, '0') +
      ' groups=' + table.groups.length +
      ' files=' + totalFiles + '.',
    );
    this.onLog?.(
      'Decoded reference table ' + response.group +
      ': compression=' + decoded.compression + ' ' +
      decoded.compressedSize + ' -> ' +
      decoded.uncompressedSize + ' bytes (' +
      (this.archiveIndexTotal - this.pendingArchiveDecodes.size) +
      '/' + this.archiveIndexTotal + ' validated).',
    );

    this.persist(response);
    this.persistReferenceTable(response.group, table);
    this.maybeFinishBootstrap();
  }

  private maybeFinishBootstrap(): void {
    const index = this.masterIndex;
    if (
      !index ||
      this.pendingArchiveIndices.size !== 0 ||
      this.pendingArchiveDecodes.size !== 0
    ) {
      return;
    }

    this.finishBootstrap(index);
  }

  private finishBootstrap(index: Js5MasterIndex): void {
    this.setState('ready');
    this.onLog?.(
      'JS5 cache index bootstrap complete: master index + ' +
      this.archiveIndexTotal +
      ' present archive reference tables received, decoded, parsed and validated.',
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

  private persistReferenceTable(
    archive: number,
    table: Js5ReferenceTable,
  ): void {
    void this.store
      .putReferenceTable(archive, table)
      .then(() => {
        this.onLog?.(
          'Cached parsed reference table ' + archive +
          ' in IndexedDB.',
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.onLog?.(
          'IndexedDB reference-table metadata write failed for ' +
          archive + ': ' + message,
        );
      });
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.onLog?.('JS5 protocol error: ' + message);
    this.setState('error');
    this.transport.disconnect();
  }

  private setState(state: Js5ClientState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.onStateChange?.(state);
  }
}
