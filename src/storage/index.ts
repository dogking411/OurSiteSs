import { SupabaseAdapter, type SupabaseConfig } from './supabaseAdapter';
import type { StorageAdapter } from './types';

export * from './types';

const CONFIG_KEY = 'sau:supabase-config';

/**
 * Выбор и создание хранилища.
 *
 * Хранилище одно — общее облако. Локального режима нет намеренно: сайт для
 * двоих, и данные, лежащие в одном браузере, означали бы, что у каждого свой
 * отдельный архив. Слой StorageAdapter при этом сохранён — он нужен для
 * переезда на собственный сервер (см. docs/ARCHITECTURE.md).
 *
 * Настройки берутся из переменных сборки (.env / секреты GitHub), а если их
 * нет — из localStorage, куда их можно ввести на экране первой настройки.
 * Второй путь выручает, пока сайт ещё не подключён к CI: не надо пересобирать
 * его ради смены ключа.
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
    // Битую настройку игнорируем — покажем экран первой настройки.
  }
  return null;
}

export function writeSupabaseConfig(config: SupabaseConfig | null): void {
  if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  else localStorage.removeItem(CONFIG_KEY);
}

/** Заданы ли ключи при сборке — тогда менять их на странице нельзя. */
export function isConfigFromEnv(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Готов ли сайт к работе. Если нет — показывается экран первой настройки. */
export function isCloudConfigured(): boolean {
  return readSupabaseConfig() !== null;
}

/**
 * Создаёт адаптер. Вызывать только когда isCloudConfigured() вернул true —
 * иначе конструктор бросит StorageConfigError.
 */
export function createAdapter(): StorageAdapter {
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error('Облако не настроено: нет адреса проекта или ключа.');
  }
  return new SupabaseAdapter(config);
}
