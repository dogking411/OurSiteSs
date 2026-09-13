import { emptyData, migrate, newId, type AppData } from '../data/schema';
import { mediaDb } from '../lib/idb';
import type {
  CollectionName,
  Row,
  StorageAdapter,
  StorageStatus,
} from './types';

const KEY_PREFIX = 'sau:v1:';

/**
 * Хранилище в браузере: коллекции в localStorage, картинки в IndexedDB.
 *
 * Работает без какой-либо настройки, поэтому это режим по умолчанию и
 * запасной аэродром, если облако недоступно. Данные живут только на текущем
 * устройстве и в текущем браузере — между Сашей и Соней ничего не
 * синхронизируется.
 */
export class LocalAdapter implements StorageAdapter {
  readonly kind = 'local' as const;
  readonly label = 'Этот браузер';
  readonly needsAuth = false;

  private status: StorageStatus = {
    ready: true,
    busy: false,
    signedIn: true,
    account: null,
    error: null,
  };
  private listeners = new Set<(status: StorageStatus) => void>();
  private collectionWatchers = new Map<CollectionName, Set<() => void>>();

  async init(): Promise<void> {
    // Изменения из другой вкладки того же браузера.
    window.addEventListener('storage', (event) => {
      if (!event.key?.startsWith(KEY_PREFIX)) return;
      const collection = event.key.slice(KEY_PREFIX.length) as CollectionName;
      this.collectionWatchers.get(collection)?.forEach((fn) => fn());
    });
  }

  getStatus(): StorageStatus {
    return this.status;
  }

  onStatusChange(listener: (status: StorageStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(): Promise<void> {
    // Локальному хранилищу вход не нужен.
  }

  async disconnect(): Promise<void> {
    // Нечего забывать.
  }

  async list<K extends CollectionName>(collection: K): Promise<Row<K>[]> {
    return this.read(collection);
  }

  async upsert<K extends CollectionName>(collection: K, row: Row<K>): Promise<Row<K>> {
    const rows = this.read(collection);
    const index = rows.findIndex((item) => item.id === row.id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    this.write(collection, rows);
    return row;
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const rows = this.read(collection).filter((item) => item.id !== id);
    this.write(collection, rows);
  }

  subscribe(collection: CollectionName, onChange: () => void): () => void {
    let set = this.collectionWatchers.get(collection);
    if (!set) {
      set = new Set();
      this.collectionWatchers.set(collection, set);
    }
    set.add(onChange);
    return () => set.delete(onChange);
  }

  async putMedia(file: Blob, name: string): Promise<string> {
    const id = `${newId('img')}_${sanitizeName(name)}`;
    await mediaDb.put(id, file);
    return id;
  }

  async getMediaUrl(id: string): Promise<string | null> {
    const blob = await mediaDb.get(id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  releaseMedia(url: string): void {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  async deleteMedia(id: string): Promise<void> {
    await mediaDb.delete(id);
  }

  async exportAll(): Promise<AppData> {
    return {
      ...emptyData(),
      wishes: this.read('wishes'),
      moments: this.read('moments'),
      plans: this.read('plans'),
    };
  }

  async importAll(data: AppData): Promise<void> {
    const clean = migrate(data);
    this.write('wishes', clean.wishes);
    this.write('moments', clean.moments);
    this.write('plans', clean.plans);
  }

  private read<K extends CollectionName>(collection: K): Row<K>[] {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + collection);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Row<K>[]) : [];
    } catch {
      // Битый JSON не должен ронять сайт — считаем коллекцию пустой.
      return [];
    }
  }

  private write(collection: CollectionName, rows: unknown[]): void {
    localStorage.setItem(KEY_PREFIX + collection, JSON.stringify(rows));
    this.collectionWatchers.get(collection)?.forEach((fn) => fn());
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-40);
}
