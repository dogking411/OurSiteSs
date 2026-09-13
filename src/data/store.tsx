import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createAdapter,
  readStorageMode,
  writeStorageMode,
  type CollectionName,
  type Credentials,
  type Row,
  type StorageAdapter,
  type StorageKind,
  type StorageStatus,
} from '../storage';
import type { AppData, Moment, Plan, WishItem } from './schema';
import { migrate } from './schema';

interface Collections {
  wishes: WishItem[];
  moments: Moment[];
  plans: Plan[];
}

const EMPTY: Collections = { wishes: [], moments: [], plans: [] };

interface StoreValue extends Collections {
  /** Идёт первая загрузка данных. */
  loading: boolean;
  /** Ошибка последней операции — показывается полосой сверху. */
  error: string | null;
  clearError: () => void;

  adapter: StorageAdapter;
  storageMode: StorageKind;
  status: StorageStatus;

  /** Переключить режим хранилища. Адаптер пересоздаётся, данные перечитываются. */
  setStorageMode: (mode: StorageKind) => void;
  connect: (credentials?: Credentials) => Promise<void>;
  disconnect: () => Promise<void>;
  reload: () => Promise<void>;

  save: <K extends CollectionName>(collection: K, row: Row<K>) => Promise<void>;
  remove: (collection: CollectionName, id: string) => Promise<void>;

  exportAll: () => Promise<AppData>;
  importAll: (data: AppData) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storageMode, setStorageModeState] = useState<StorageKind>(() => readStorageMode());
  const [adapter, setAdapter] = useState<StorageAdapter>(() => createAdapter());
  const [status, setStatus] = useState<StorageStatus>(() => adapter.getStatus());
  const [data, setData] = useState<Collections>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Чтобы поздний ответ отменённой загрузки не перезаписал свежие данные.
  const loadToken = useRef(0);
  // Актуальный снимок — нужен, чтобы откатить оптимистичное изменение.
  const dataRef = useRef(data);
  dataRef.current = data;

  const loadAll = useCallback(
    async (source: StorageAdapter) => {
      const token = ++loadToken.current;
      if (!source.getStatus().ready) {
        setData(EMPTY);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [wishes, moments, plans] = await Promise.all([
          source.list('wishes'),
          source.list('moments'),
          source.list('plans'),
        ]);
        if (token !== loadToken.current) return;
        setData({ wishes, moments, plans });
        setError(null);
      } catch (cause) {
        if (token !== loadToken.current) return;
        setError(describe(cause));
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [],
  );

  // Инициализация адаптера и подписка на его статус.
  useEffect(() => {
    let alive = true;
    setStatus(adapter.getStatus());
    const unsubscribe = adapter.onStatusChange((next) => {
      if (!alive) return;
      setStatus(next);
    });
    void adapter.init().then(() => {
      if (alive) setStatus(adapter.getStatus());
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [adapter]);

  // Данные перечитываются, когда хранилище становится готовым (вход/выход).
  useEffect(() => {
    void loadAll(adapter);
  }, [adapter, status.ready, loadAll]);

  // Чужие изменения: другая вкладка или второй человек в облаке.
  useEffect(() => {
    if (!status.ready) return;
    const collections: CollectionName[] = ['wishes', 'moments', 'plans'];
    const offs = collections.map((collection) =>
      adapter.subscribe(collection, () => {
        void loadAll(adapter);
      }),
    );
    return () => offs.forEach((off) => off());
  }, [adapter, status.ready, loadAll]);

  const setStorageMode = useCallback((mode: StorageKind) => {
    writeStorageMode(mode);
    setStorageModeState(mode);
    setData(EMPTY);
    setAdapter(createAdapter(mode));
  }, []);

  const connect = useCallback(
    async (credentials?: Credentials) => {
      setError(null);
      try {
        await adapter.connect(credentials);
      } catch (cause) {
        setError(describe(cause));
        throw cause;
      }
    },
    [adapter],
  );

  const disconnect = useCallback(async () => {
    await adapter.disconnect();
    setData(EMPTY);
  }, [adapter]);

  const save = useCallback(
    async <K extends CollectionName>(collection: K, row: Row<K>) => {
      // Оптимистично показываем изменение, откатываем при ошибке.
      const previous = dataRef.current;
      setData((current) => ({
        ...current,
        [collection]: upsertRow(current[collection] as Row<K>[], row),
      }));
      try {
        const stored = await adapter.upsert(collection, row);
        setData((current) => ({
          ...current,
          [collection]: upsertRow(current[collection] as Row<K>[], stored),
        }));
        setError(null);
      } catch (cause) {
        setData(previous);
        setError(describe(cause));
      }
    },
    [adapter],
  );

  const remove = useCallback(
    async (collection: CollectionName, id: string) => {
      const previous = dataRef.current;
      setData((current) => ({
        ...current,
        [collection]: current[collection].filter((row) => row.id !== id),
      }));
      try {
        await adapter.remove(collection, id);
        setError(null);
      } catch (cause) {
        setData(previous);
        setError(describe(cause));
      }
    },
    [adapter],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      loading,
      error,
      clearError: () => setError(null),
      adapter,
      storageMode,
      status,
      setStorageMode,
      connect,
      disconnect,
      reload: () => loadAll(adapter),
      save,
      remove,
      exportAll: () => adapter.exportAll(),
      importAll: async (incoming: AppData) => {
        await adapter.importAll(migrate(incoming));
        await loadAll(adapter);
      },
    }),
    [
      data,
      loading,
      error,
      adapter,
      storageMode,
      status,
      setStorageMode,
      connect,
      disconnect,
      loadAll,
      save,
      remove,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore вызван вне StoreProvider');
  return value;
}

function upsertRow<T extends { id: string }>(rows: T[], row: T): T[] {
  const index = rows.findIndex((item) => item.id === row.id);
  if (index < 0) return [...rows, row];
  const next = rows.slice();
  next[index] = row;
  return next;
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Что-то пошло не так';
}
