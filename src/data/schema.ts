/**
 * Единственный источник правды о форме данных.
 *
 * При изменении формы увеличивай SCHEMA_VERSION и добавляй шаг в migrate():
 * резервные копии и файлы, выгруженные раньше, должны открываться всегда.
 */

export const SCHEMA_VERSION = 3;

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

/** Три вида планов. Каждый живёт на своей вкладке раздела. */
export type PlanKind = 'place' | 'watch' | 'food';

export const PLAN_KINDS: PlanKind[] = ['place', 'watch', 'food'];

export const PLAN_KIND_LABELS: Record<PlanKind, { tab: string; one: string; icon: string }> = {
  place: { tab: 'Места', one: 'Место', icon: '📍' },
  watch: { tab: 'Посмотреть', one: 'Что посмотреть', icon: '🎬' },
  food: { tab: 'Еда', one: 'Еда', icon: '🍜' },
};

/** Откуда берётся еда: идём в кафе, заказываем или готовим сами. */
export type FoodKind = 'cafe' | 'delivery' | 'cook';

export const FOOD_KINDS: FoodKind[] = ['cafe', 'delivery', 'cook'];

export const FOOD_KIND_LABELS: Record<FoodKind, string> = {
  cafe: 'В кафе',
  delivery: 'Заказать',
  cook: 'Приготовить',
};

/**
 * План — то, что мы хотим сделать вместе.
 *
 * Все три вида лежат в одной коллекции и различаются полем kind. Заводить три
 * таблицы ради трёх наборов полей не стоит: общего у них больше, чем различий —
 * автор, название, примечание, отметка «сделано», — а различия это несколько
 * полей, которые для остальных видов просто пустые. Какие поля к какому виду
 * относятся, знает форма (PlanForm) и подсказывают комментарии ниже.
 */
export interface Plan {
  id: string;
  kind: PlanKind;
  /** Кто предложил: план «от Саши» или «от Сони». */
  owner: PersonId;
  title: string;
  /** Примечание: чем приглянулось место, о чём фильм, что за блюдо. */
  note: string;

  /** Сделано: были, посмотрели, попробовали. */
  done: boolean;
  /** Когда отметили сделанным. Пусто, пока не отмечено. */
  doneAt: string;
  /** Момент архива, созданный при отметке места. */
  momentId: string | null;

  /**
   * Подраздел места: парк, галерея, кино, театр, лепка — что угодно.
   *
   * Это свободная метка, а не список из кода: набор подразделов складывается
   * сам из того, что уже заведено. Поэтому нет ни экрана управления, ни лимита,
   * ни вопроса «куда девать места из удалённого подраздела» — метка живёт, пока
   * есть хоть одно место с ней, и исчезает сама, когда последнее переименовали.
   */
  category: string;

  /** Адрес — у мест и у кафе. */
  address: string;
  /** Жанр — у «посмотреть». */
  genre: string;
  /** Ссылка — трейлер, страница заведения, рецепт в интернете. */
  url: string;
  /** Что за еда. Заполнено только у kind === 'food'. */
  foodKind: FoodKind | null;
  /** Где заказать — у доставки. */
  vendor: string;
  /** Рецепт — у «приготовить». */
  recipe: string;

  imageIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: PersonId;
}

/** Заготовка нового плана: все поля заполнены, пустые — пустыми строками. */
export function emptyPlan(kind: PlanKind, owner: PersonId, author: PersonId): Plan {
  const now = nowIso();
  return {
    id: newId('plan'),
    kind,
    owner,
    title: '',
    note: '',
    category: '',
    done: false,
    doneAt: '',
    momentId: null,
    address: '',
    genre: '',
    url: '',
    foodKind: kind === 'food' ? 'cafe' : null,
    vendor: '',
    recipe: '',
    imageIds: [],
    createdAt: now,
    updatedAt: now,
    createdBy: author,
  };
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

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    wishes: pickRows<WishItem>(input.wishes),
    moments: pickRows<Moment>(input.moments),
    // Версия 1 знала планы совсем другой формы — с полями status, who и date,
    // но без вида, автора и подробностей. Недостающее достраиваем, лишнее
    // отбрасываем: пусть старая выгрузка откроется, пусть и небогатой.
    plans: pickRows<Partial<Plan> & { id: string }>(input.plans).map(normalizePlan),
  };
}

function normalizePlan(row: Partial<Plan> & { id: string }): Plan {
  const kind: PlanKind = PLAN_KINDS.includes(row.kind as PlanKind) ? (row.kind as PlanKind) : 'place';
  const owner: PersonId = row.owner === 'sonya' ? 'sonya' : 'sasha';
  return {
    ...emptyPlan(kind, owner, row.createdBy === 'sonya' ? 'sonya' : 'sasha'),
    ...row,
    id: row.id,
    kind,
    owner,
    foodKind: FOOD_KINDS.includes(row.foodKind as FoodKind) ? (row.foodKind as FoodKind) : null,
    imageIds: Array.isArray(row.imageIds) ? row.imageIds : [],
    done: row.done === true,
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
