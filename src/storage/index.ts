import { LocalAdapter } from './localAdapter';
import { SupabaseAdapter, type SupabaseConfig } from './supabaseAdapter';
import type { StorageAdapter, StorageKind } from './types';

export * from './types';

const MODE_KEY = 'sau:storage-mode';
const CONFIG_KEY = 'sau:supabase-config';

/**
 * Выбор и создание хранилища.
 *
 * Настройки Supabase берутся из переменных сборки (.env / секреты GitHub), а
 * если их нет — из localStorage, куда их можно ввести прямо в настройках сайта.
 * Второй путь удобен, пока проект ещё не подключён к CI: не надо пересобирать
 * сайт ради смены ключа.
 */
export function readSupabaseConfig(): SupabaseConfig | null {
  const fromEnv: SupabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
  if (fromEnv.url && fromEnv.anonKey) return fromEnv;

  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
    if (parsed.url && parsed.anonKey) return { url: parsed.url, anonKey: parsed.anonKey };
  } catch {
    // Битую настройку просто игнорируем — останемся в локальном режиме.
  }
  return null;
}

export function writeSupabaseConfig(config: SupabaseConfig | null): void {
  if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  else localStorage.removeItem(CONFIG_KEY);
}

/** Заданы ли ключи через сборку — тогда в настройках поля только для чтения. */
export function isConfigFromEnv(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function readStorageMode(): StorageKind {
  const saved = localStorage.getItem(MODE_KEY);
  return saved === 'supabase' || saved === 'local' ? saved : 'local';
}

export function writeStorageMode(mode: StorageKind): void {
  localStorage.setItem(MODE_KEY, mode);
}

/**
 * Создаёт адаптер под выбранный режим. Если облако выбрано, но не настроено,
 * молча откатываемся на локальный режим — сайт должен открываться всегда.
 */
export function createAdapter(mode: StorageKind = readStorageMode()): StorageAdapter {
  if (mode === 'supabase') {
    const config = readSupabaseConfig();
    if (config) {
      try {
        return new SupabaseAdapter(config);
      } catch {
        return new LocalAdapter();
      }
    }
  }
  return new LocalAdapter();
}
