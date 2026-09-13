import { useState } from 'react';
import { useProfile } from '../../data/profile';
import { useStore } from '../../data/store';
import { migrate, PEOPLE, PERSON_IDS } from '../../data/schema';
import {
  isConfigFromEnv,
  readSupabaseConfig,
  writeSupabaseConfig,
  type StorageKind,
} from '../../storage';

export function SettingsPage() {
  const { person, setPerson, theme, setTheme } = useProfile();
  const { storageMode, setStorageMode, status, connect, disconnect, adapter, exportAll, importAll } =
    useStore();

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Настройки</h1>
          <p className="page-sub">Кто сейчас смотрит, как выглядит сайт и где лежат данные.</p>
        </div>
      </div>

      <section className="card">
        <h2>Кто ты</h2>
        <p className="page-sub" style={{ margin: '6px 0 16px' }}>
          От этого зависят цвета и то, чей вишлист открывается первым. Настройка живёт на
          этом устройстве — у второго ничего не переключится.
        </p>
        <div className="person-switch" style={{ maxWidth: 320 }}>
          {PERSON_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={person === id}
              onClick={() => setPerson(id)}
            >
              {PEOPLE[id].name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Оформление</h2>
        <p className="page-sub" style={{ margin: '6px 0 16px' }}>
          Тема тоже привязана к устройству.
        </p>
        <div className="person-switch" style={{ maxWidth: 320 }}>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
            Тёмная
          </button>
          <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
            Светлая
          </button>
        </div>
      </section>

      <StorageSection
        storageMode={storageMode}
        setStorageMode={setStorageMode}
        status={status}
        connect={connect}
        disconnect={disconnect}
        adapterLabel={adapter.label}
      />

      <BackupSection exportAll={exportAll} importAll={importAll} />
    </div>
  );
}

function StorageSection({
  storageMode,
  setStorageMode,
  status,
  connect,
  disconnect,
  adapterLabel,
}: {
  storageMode: StorageKind;
  setStorageMode: (mode: StorageKind) => void;
  status: ReturnType<typeof useStore>['status'];
  connect: ReturnType<typeof useStore>['connect'];
  disconnect: ReturnType<typeof useStore>['disconnect'];
  adapterLabel: string;
}) {
  const envConfigured = isConfigFromEnv();
  const saved = readSupabaseConfig();
  const [url, setUrl] = useState(saved?.url ?? '');
  const [anonKey, setAnonKey] = useState(saved?.anonKey ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const configured = Boolean(saved);

  return (
    <section className="card">
      <h2>Где хранятся данные</h2>
      <p className="page-sub" style={{ margin: '6px 0 16px' }}>
        Сейчас: {adapterLabel}
        {status.account ? ` · ${status.account}` : ''}
      </p>

      <div className="person-switch" style={{ maxWidth: 420 }}>
        <button
          type="button"
          aria-pressed={storageMode === 'local'}
          onClick={() => setStorageMode('local')}
        >
          Этот браузер
        </button>
        <button
          type="button"
          aria-pressed={storageMode === 'supabase'}
          onClick={() => setStorageMode('supabase')}
        >
          Общее облако
        </button>
      </div>

      {storageMode === 'local' ? (
        <p className="page-sub" style={{ marginTop: 16 }}>
          Данные лежат только в этом браузере и никуда не уходят. Между твоим телефоном и
          Сониным ноутбуком ничего не синхронизируется — для этого нужно облако.
        </p>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {envConfigured ? (
            <p className="page-sub">Адрес и ключ заданы при сборке сайта.</p>
          ) : (
            <>
              <p className="page-sub">
                Подключение к Supabase. Как завести проект — в файле docs/SUPABASE.md.
              </p>
              <div className="field">
                <label htmlFor="sb-url">Project URL</label>
                <input
                  id="sb-url"
                  className="input"
                  value={url}
                  placeholder="https://xxxx.supabase.co"
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="sb-key">Anon key</label>
                <input
                  id="sb-key"
                  className="input"
                  value={anonKey}
                  placeholder="eyJhbGciOi…"
                  onChange={(event) => setAnonKey(event.target.value)}
                />
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    writeSupabaseConfig(url && anonKey ? { url: url.trim(), anonKey: anonKey.trim() } : null);
                    setSavedNotice(true);
                    // Пересоздаём адаптер с новыми ключами.
                    setStorageMode('supabase');
                  }}
                >
                  Сохранить ключи
                </button>
                {savedNotice ? <span className="tag tag-success">Сохранено</span> : null}
              </div>
            </>
          )}

          {configured || envConfigured ? (
            status.signedIn ? (
              <div className="row">
                <span className="tag tag-success">Вход выполнен: {status.account}</span>
                <span className="spacer" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void disconnect()}>
                  Выйти
                </button>
              </div>
            ) : (
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  void connect({ email, password, signUp }).catch(() => undefined);
                }}
              >
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="sb-email">Email</label>
                    <input
                      id="sb-email"
                      type="email"
                      className="input"
                      value={email}
                      autoComplete="username"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sb-password">Пароль</label>
                    <input
                      id="sb-password"
                      type="password"
                      className="input"
                      value={password}
                      autoComplete="current-password"
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </div>
                <div className="row">
                  <label className="row" style={{ gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
                    <input
                      type="checkbox"
                      checked={signUp}
                      onChange={(event) => setSignUp(event.target.checked)}
                    />
                    Это первый вход, создать аккаунт
                  </label>
                  <span className="spacer" />
                  <button type="submit" className="btn" disabled={status.busy}>
                    {status.busy ? 'Входим…' : signUp ? 'Создать аккаунт' : 'Войти'}
                  </button>
                </div>
                {status.error ? <div className="banner">{status.error}</div> : null}
              </form>
            )
          ) : null}
        </div>
      )}
    </section>
  );
}

function BackupSection({
  exportAll,
  importAll,
}: {
  exportAll: ReturnType<typeof useStore>['exportAll'];
  importAll: ReturnType<typeof useStore>['importAll'];
}) {
  const [notice, setNotice] = useState<string | null>(null);

  async function handleExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sasha-i-sonya-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      await importAll(migrate(parsed));
      setNotice('Данные загружены');
    } catch {
      setNotice('Не получилось прочитать файл');
    }
  }

  return (
    <section className="card">
      <h2>Резервная копия</h2>
      <p className="page-sub" style={{ margin: '6px 0 16px' }}>
        Выгрузка в JSON — она же способ перенести данные между локальным режимом и облаком,
        а потом и на свой сервер. Картинки в файл не попадают.
      </p>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => void handleExport()}>
          Выгрузить JSON
        </button>
        <label className="btn btn-ghost">
          Загрузить из файла
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => void handleImport(event.target.files?.[0])}
          />
        </label>
        {notice ? <span className="tag">{notice}</span> : null}
      </div>
    </section>
  );
}
