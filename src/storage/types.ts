import type { AppData, Moment, Plan, WishItem } from '../data/schema';

/**
 * Контракт хранилища.
 *
 * Приложение никогда не обращается к localStorage, Supabase или своему серверу
 * напрямую — только к этому интерфейсу. Перенос на собственный хостинг сводится
 * к написанию ещё одной реализации (см. docs/ARCHITECTURE.md).
 *
 * Интерфейс намеренно построен вокруг коллекций, а не «одного большого JSON»:
 * так двое могут править списки одновременно, не затирая правки друг друга.
 */
export interface StorageAdapter {
  readonly kind: StorageKind;
  /** Человеческое название для экрана настроек. */
  readonly label: string;
  /** Нужен ли вход пользователя. */
  readonly needsAuth: boolean;

  getStatus(): StorageStatus;
  onStatusChange(listener: (status: StorageStatus) => void): () => void;

  /** Восстановление сессии, открытие БД. Вызывается один раз при старте. */
  init(): Promise<void>;
  /** Вход. Для локального адаптера — no-op. */
  connect(credentials?: Credentials): Promise<void>;
  /** Выход и забывание сессии. */
  disconnect(): Promise<void>;

  list<K extends CollectionName>(collection: K): Promise<Row<K>[]>;
  /** Вставка или обновление по id. Возвращает то, что реально легло в хранилище. */
  upsert<K extends CollectionName>(collection: K, row: Row<K>): Promise<Row<K>>;
  remove(collection: CollectionName, id: string): Promise<void>;

  /**
   * Подписка на чужие изменения (realtime). Адаптер, который так не умеет,
   * возвращает функцию-пустышку — приложение работает и без этого.
   */
  subscribe(collection: CollectionName, onChange: () => void): () => void;

  /** Загрузить картинку. Возвращает id для getMediaUrl. */
  putMedia(file: Blob, name: string): Promise<string>;
  /** URL для показа. Может быть blob:-ссылкой — тогда её надо освободить. */
  getMediaUrl(id: string): Promise<string | null>;
  /** Освободить ресурсы, выданные getMediaUrl. */
  releaseMedia(url: string): void;
  deleteMedia(id: string): Promise<void>;

  /** Выгрузить всё — для резервной копии и для переезда между адаптерами. */
  exportAll(): Promise<AppData>;
  /** Залить всё (перезаписывая совпадающие id) — вторая половина переезда. */
  importAll(data: AppData): Promise<void>;
}

export type StorageKind = 'local' | 'supabase' | 'server';

export type CollectionName = 'wishes' | 'moments' | 'plans';

/** Тип строки для каждой коллекции. */
export interface CollectionRows {
  wishes: WishItem;
  moments: Moment;
  plans: Plan;
}

export type Row<K extends CollectionName> = CollectionRows[K];

export interface Credentials {
  email: string;
  password: string;
  /** true — регистрация нового пользователя вместо входа. */
  signUp?: boolean;
}

export interface StorageStatus {
  /** Можно читать и писать. */
  ready: boolean;
  /** Идёт вход или инициализация. */
  busy: boolean;
  signedIn: boolean;
  /** Email вошедшего — для показа в настройках. */
  account: string | null;
  /** Последняя ошибка, сформулированная понятно для человека. */
  error: string | null;
}

/** Требуется вход, а его нет. */
export class NotConnectedError extends Error {
  constructor(message = 'Хранилище не подключено') {
    super(message);
    this.name = 'NotConnectedError';
  }
}

/** Адаптер настроен неправильно (нет ключей и т.п.). */
export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}
