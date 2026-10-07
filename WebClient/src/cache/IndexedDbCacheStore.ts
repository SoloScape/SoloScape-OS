import type { Js5MasterIndex } from './Js5MasterIndex';
import type { Js5ReferenceTable } from './Js5ReferenceTable';
import {
  js5GroupKey,
  type Js5GroupResponse,
} from './Js5Protocol';

export interface CachedJs5Group {
  key: string;
  archive: number;
  group: number;
  compression: number;
  size: number;
  container: ArrayBuffer;
  validated: boolean;
  crc: number | null;
  version: number | null;
  /**
   * On-disk cache representation for ordinary archive groups.
   * Includes the restored two-byte version trailer when available.
   */
  cacheFile: ArrayBuffer | null;
  updatedAt: number;
}

interface CachedMasterIndex {
  key: 'master-index';
  entries: Js5MasterIndex['entries'];
  updatedAt: number;
}

interface CachedReferenceTable {
  key: string;
  archive: number;
  table: Js5ReferenceTable;
  updatedAt: number;
}

export interface ValidatedJs5GroupMetadata {
  crc: number;
  version: number;
  cacheFile?: Uint8Array;
}

const DATABASE_NAME = 'soloscape-web-cache';
const DATABASE_VERSION = 2;
const GROUP_STORE = 'js5-groups';
const METADATA_STORE = 'js5-metadata';

export class IndexedDbCacheStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async put(response: Js5GroupResponse): Promise<void> {
    await this.putRecord(response, {
      validated: false,
      crc: null,
      version: null,
      cacheFile: null,
    });
  }

  async putValidated(
    response: Js5GroupResponse,
    metadata: ValidatedJs5GroupMetadata,
  ): Promise<void> {
    await this.putRecord(response, {
      validated: true,
      crc: metadata.crc,
      version: metadata.version,
      cacheFile: metadata.cacheFile
        ? toArrayBuffer(metadata.cacheFile)
        : null,
    });
  }

  async get(
    archive: number,
    group: number,
  ): Promise<CachedJs5Group | undefined> {
    const database = await this.open();
    const transaction = database.transaction(GROUP_STORE, 'readonly');
    const request = transaction
      .objectStore(GROUP_STORE)
      .get(js5GroupKey(archive, group));

    return requestResult<CachedJs5Group | undefined>(request);
  }

  async putMasterIndex(index: Js5MasterIndex): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(METADATA_STORE, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);

    const record: CachedMasterIndex = {
      key: 'master-index',
      entries: index.entries.map((entry) => ({ ...entry })),
      updatedAt: Date.now(),
    };

    store.put(record);
    await transactionComplete(transaction);
  }

  async putReferenceTable(
    archive: number,
    table: Js5ReferenceTable,
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(METADATA_STORE, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);

    const record: CachedReferenceTable = {
      key: 'reference-table:' + archive,
      archive,
      table,
      updatedAt: Date.now(),
    };

    store.put(record);
    await transactionComplete(transaction);
  }

  private async putRecord(
    response: Js5GroupResponse,
    validation: Pick<
      CachedJs5Group,
      'validated' | 'crc' | 'version' | 'cacheFile'
    >,
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(GROUP_STORE, 'readwrite');
    const store = transaction.objectStore(GROUP_STORE);

    const record: CachedJs5Group = {
      key: js5GroupKey(response.archive, response.group),
      archive: response.archive,
      group: response.group,
      compression: response.compression,
      size: response.size,
      container: toArrayBuffer(response.container),
      ...validation,
      updatedAt: Date.now(),
    };

    store.put(record);
    await transactionComplete(transaction);
  }

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) {
      return this.databasePromise;
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.addEventListener('upgradeneeded', () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(GROUP_STORE)) {
          database.createObjectStore(GROUP_STORE, { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains(METADATA_STORE)) {
          database.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      });

      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => {
        this.databasePromise = null;
        reject(request.error ?? new Error('Unable to open IndexedDB cache.'));
      });
      request.addEventListener('blocked', () => {
        this.databasePromise = null;
        reject(new Error('IndexedDB cache upgrade is blocked by another tab.'));
      });
    });

    return this.databasePromise;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    });
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    });
  });
}
