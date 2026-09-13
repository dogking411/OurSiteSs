/**
 * Единственный источник правды о форме данных.
 *
 * При изменении формы увеличивай SCHEMA_VERSION и добавляй шаг в migrate():
 * резервные копии и файлы, выгруженные раньше, должны открываться всегда.
 */

export const SCHEMA_VERSION = 1;

/** Кто пользуется сайтом. Профиль влияет на тему и на «чей» вишлист по умолчанию. */
export type PersonId = 'sasha' | 'sonya';

export const PEOPLE: Record<PersonId, { id: PersonId; name: string; genitive: string }> = {
  sasha: { id: 'sasha', name: 'Саша', genitive: 'Саши' },
  sonya: { id: 'sonya', name: 'Соня', genitive: 'Сони' },
};

export const PERSON_IDS: PersonId[] = ['sasha', 'sonya'];

export function otherPerson(person: PersonId): PersonId {
  return person === 'sasha' ? 'sonya' : 'sasha';
}

export type WishPriority = 'low' | 'normal' | 'high' | 'dream';
export type WishStatus = 'open' | 'reserved' | 'done';

export interface WishItem {
  id: string;
  /** Чей это вишлист. */
  owner: PersonId;
  title: string;
  note: string;
  /** Ссылка на товар или референс. */
  url: string;
  /** Свободный текст: «около 5000 ₽», «дорого, но однажды». */
  price: string;
  priority: WishPriority;
  status: WishStatus;
  /**
   * Кто взял желание на себя. Владельцу списка это поле не показывается —
   * чтобы подарок остался сюрпризом.
   */
  reservedBy: PersonId | null;
  /** id картинки в media-хранилище. */
  imageId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: PersonId;
}

/** Момент — запись в архиве: что было, когда, с фотографиями. */
export interface Moment {
  id: string;
  title: string;
  /** Дата события (YYYY-MM-DD), а не дата создания записи. */
  date: string;
  text: string;
  place: string;
  tags: string[];
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: PersonId;
}

/**
 * Планы. Инструмент планирования пока заглушка, но форма данных задана сразу,
 * чтобы потом не мигрировать уже накопленные записи.
 */
export type PlanStatus = 'idea' | 'planned' | 'done' | 'dropped';

export interface Plan {
  id: string;
  title: string;
  note: string;
  /** Желаемая дата (YYYY-MM-DD) или пусто, если «когда-нибудь». */
  date: string;
  status: PlanStatus;
  /** Кого касается. */
  who: PersonId | 'both';
  createdAt: string;
  updatedAt: string;
  createdBy: PersonId;
}

/** Полный снимок данных — используется для экспорта, импорта и переезда. */
export interface AppData {
  schemaVersion: number;
  exportedAt: string;
  wishes: WishItem[];
  moments: Moment[];
  plans: Plan[];
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    wishes: [],
    moments: [],
    plans: [],
  };
}

/**
 * Приводит прочитанные данные к текущей схеме.
 * Никогда не бросает исключение: испорченная запись отбрасывается, а не рушит
 * весь сайт.
 */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return emptyData();
  const input = raw as Partial<AppData>;

  // Сюда добавляются шаги миграции:
  // if ((input.schemaVersion ?? 0) < 2) { ... }

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    wishes: pickRows<WishItem>(input.wishes),
    moments: pickRows<Moment>(input.moments),
    plans: pickRows<Plan>(input.plans),
  };
}

function pickRows<T extends { id: string }>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is T => !!row && typeof row === 'object' && typeof (row as T).id === 'string',
  );
}

export function newId(prefix: string): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${rand.replace(/-/g, '').slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Сегодняшняя дата в формате YYYY-MM-DD по местному времени. */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
