/**
 * Минимальная обёртка над IndexedDB для хранения картинок.
 *
 * localStorage для этого не годится: у него лимит около 5 МБ на весь домен и
 * он хранит только строки, а фотографии пришлось бы держать в base64.
 */

const DB_NAME = 'site-about-us';
const DB_VERSION = 1;
const STORE = 'media';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB'));
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = body(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB'));
      }),
  );
}

export const mediaDb = {
  put(id: string, blob: Blob): Promise<void> {
    return run('readwrite', (store) => store.put(blob, id)).then(() => undefined);
  },
  get(id: string): Promise<Blob | undefined> {
    return run<Blob | undefined>('readonly', (store) => store.get(id));
  },
  delete(id: string): Promise<void> {
    return run('readwrite', (store) => store.delete(id)).then(() => undefined);
  },
  keys(): Promise<string[]> {
    return run<IDBValidKey[]>('readonly', (store) => store.getAllKeys()).then((keys) =>
      keys.map(String),
    );
  },
};
