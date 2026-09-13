import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyData, migrate, newId, type AppData } from '../data/schema';
import type {
  CollectionName,
  Credentials,
  Row,
  StorageAdapter,
  StorageStatus,
} from './types';
import { NotConnectedError, StorageConfigError } from './types';

const MEDIA_BUCKET = 'media';
/** Время жизни подписанной ссылки на картинку. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Хранилище в Supabase: Postgres для записей, Storage для картинок,
 * встроенная авторизация по email.
 *
 * Права разграничены на стороне базы (RLS, см. supabase/schema.sql), поэтому
 * публичный anon-ключ в собранном сайте — это нормально: без входа он не даёт
 * доступа к данным.
 *
 * Клиент supabase-js подгружается динамически, чтобы локальный режим не тащил
 * его в основной бандл.
 */
export class SupabaseAdapter implements StorageAdapter {
  readonly kind = 'supabase' as const;
  readonly label = 'Supabase (общее облако)';
  readonly needsAuth = true;

  private client: SupabaseClient | null = null;
  private status: StorageStatus = {
    ready: false,
    busy: false,
    signedIn: false,
    account: null,
    error: null,
  };
  private listeners = new Set<(status: StorageStatus) => void>();

  constructor(private readonly config: SupabaseConfig) {
    if (!config.url || !config.anonKey) {
      throw new StorageConfigError(
        'Не заданы адрес и ключ Supabase. Укажи их в настройках или в файле .env.',
      );
    }
  }

  async init(): Promise<void> {
    this.patchStatus({ busy: true, error: null });
    try {
      const client = await this.getClient();
      const { data } = await client.auth.getSession();
      this.applySession(data.session?.user?.email ?? null);
      // Сессия продлевается сама по refresh-токену; ловим вход, выход и протухание.
      client.auth.onAuthStateChange((_event, session) => {
        this.applySession(session?.user?.email ?? null);
      });
    } catch (error) {
      this.patchStatus({ error: describeError(error) });
    } finally {
      this.patchStatus({ busy: false });
    }
  }

  getStatus(): StorageStatus {
    return this.status;
  }

  onStatusChange(listener: (status: StorageStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(credentials?: Credentials): Promise<void> {
    if (!credentials) {
      throw new StorageConfigError('Для входа нужны email и пароль.');
    }
    const client = await this.getClient();
    this.patchStatus({ busy: true, error: null });
    try {
      const { data, error } = credentials.signUp
        ? await client.auth.signUp({
            email: credentials.email,
            password: credentials.password,
          })
        : await client.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });
      if (error) throw error;
      if (!data.session) {
        // Так бывает при включённом подтверждении адреса.
        throw new Error('Вход не завершён: подтверди адрес по ссылке из письма.');
      }
      this.applySession(data.session.user.email ?? null);
    } catch (error) {
      this.patchStatus({ error: describeError(error) });
      throw error;
    } finally {
      this.patchStatus({ busy: false });
    }
  }

  async disconnect(): Promise<void> {
    const client = await this.getClient();
    await client.auth.signOut();
    this.applySession(null);
  }

  async list<K extends CollectionName>(collection: K): Promise<Row<K>[]> {
    const client = this.requireReady();
    const { data, error } = await client.from(collection).select('*');
    if (error) throw new Error(describeError(error));
    return (data ?? []).map((row) => toCamel(row) as unknown as Row<K>);
  }

  async upsert<K extends CollectionName>(collection: K, row: Row<K>): Promise<Row<K>> {
    const client = this.requireReady();
    const { data, error } = await client
      .from(collection)
      .upsert(toSnake(row as unknown as Record<string, unknown>))
      .select()
      .single();
    if (error) throw new Error(describeError(error));
    return toCamel(data) as unknown as Row<K>;
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const client = this.requireReady();
    const { error } = await client.from(collection).delete().eq('id', id);
    if (error) throw new Error(describeError(error));
  }

  subscribe(collection: CollectionName, onChange: () => void): () => void {
    if (!this.client || !this.status.ready) return () => {};
    const client = this.client;
    const channel = client
      .channel(`realtime:${collection}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: collection }, onChange)
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }

  async putMedia(file: Blob, name: string): Promise<string> {
    const client = this.requireReady();
    const path = `${newId('img')}/${sanitizeName(name)}`;
    const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) throw new Error(describeError(error));
    return path;
  }

  async getMediaUrl(id: string): Promise<string | null> {
    const client = this.requireReady();
    // Bucket приватный, поэтому раздаём временную подписанную ссылку.
    const { data, error } = await client.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(id, SIGNED_URL_TTL_SECONDS);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  releaseMedia(): void {
    // Подписанные ссылки не держат ресурсов на клиенте.
  }

  async deleteMedia(id: string): Promise<void> {
    const client = this.requireReady();
    const { error } = await client.storage.from(MEDIA_BUCKET).remove([id]);
    if (error) throw new Error(describeError(error));
  }

  async exportAll(): Promise<AppData> {
    const [wishes, moments, plans] = await Promise.all([
      this.list('wishes'),
      this.list('moments'),
      this.list('plans'),
    ]);
    return { ...emptyData(), wishes, moments, plans };
  }

  async importAll(data: AppData): Promise<void> {
    const client = this.requireReady();
    const clean = migrate(data);
    const batches = [
      ['wishes', clean.wishes],
      ['moments', clean.moments],
      ['plans', clean.plans],
    ] as const;
    for (const [collection, rows] of batches) {
      if (!rows.length) continue;
      const { error } = await client
        .from(collection)
        .upsert(rows.map((row) => toSnake(row as unknown as Record<string, unknown>)));
      if (error) throw new Error(describeError(error));
    }
  }

  private async getClient(): Promise<SupabaseClient> {
    if (this.client) return this.client;
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(this.config.url, this.config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return this.client;
  }

  private requireReady(): SupabaseClient {
    if (!this.client || !this.status.ready) {
      throw new NotConnectedError('Нужно войти в облако — открой Настройки.');
    }
    return this.client;
  }

  private applySession(email: string | null): void {
    this.patchStatus({
      signedIn: email !== null,
      ready: email !== null,
      account: email,
      error: null,
    });
  }

  private patchStatus(patch: Partial<StorageStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener(this.status);
  }
}

/** Postgres любит snake_case, TypeScript — camelCase. Переводим на границе. */
function toSnake(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
  }
  return out;
}

function toCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())] = value;
  }
  return out;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-40) || 'file';
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Неизвестная ошибка облака';
}
