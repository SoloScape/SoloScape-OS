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
  updatedAt: number;
}

const DATABASE_NAME = 'soloscape-web-cache';
const DATABASE_VERSION = 1;
const GROUP_STORE = 'js5-groups';

export class IndexedDbCacheStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async put(response: Js5GroupResponse): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(GROUP_STORE, 'readwrite');
    const store = transaction.objectStore(GROUP_STORE);

    const record: CachedJs5Group = {
      key: js5GroupKey(response.archive, response.group),
      archive: response.archive,
      group: response.group,
      compression: response.compression,
      size: response.size,
      container: response.container.slice().buffer as ArrayBuffer,
      updatedAt: Date.now(),
    };

    store.put(record);
    await transactionComplete(transaction);
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
      });

      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => {
        this.databasePromise = null;
        reject(request.error ?? new Error('Unable to open IndexedDB cache.'));
      });
      request.addEventListener('blocked', () => {
        reject(new Error('IndexedDB cache upgrade is blocked by another tab.'));
      });
    });

    return this.databasePromise;
  }
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
