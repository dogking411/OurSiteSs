import { useState } from 'react';
import { usePerson, useTheme } from '../../data/profile';
import { useStore } from '../../data/store';
import { migrate, PEOPLE } from '../../data/schema';

export function SettingsPage() {
  const person = usePerson();
  const { theme, setTheme } = useTheme();
  const { status, disconnect, exportAll, importAll } = useStore();

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Настройки</h1>
          <p className="page-sub">Кто сейчас смотрит и как выглядит сайт.</p>
        </div>
      </div>

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

      <section className="card">
        <h2>Аккаунт</h2>
        <p className="page-sub" style={{ margin: '6px 0 16px' }}>
          Данные лежат в общем облаке: что сохранил один, сразу видит второй.
        </p>
        <div className="row">
          <span className="tag tag-accent">Ты — {PEOPLE[person].name}</span>
          <span className="tag">{status.account}</span>
          <span className="spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void disconnect()}>
            Выйти
          </button>
        </div>
        <p className="page-sub" style={{ marginTop: 12 }}>
          Имя закреплено за аккаунтом, а не за устройством, поэтому переключателя нет: под
          своей почтой ты всегда Саша или всегда Соня. Сменить его можно только в панели
          Supabase — как, написано в docs/SUPABASE.md.
        </p>
      </section>

      <BackupSection exportAll={exportAll} importAll={importAll} />
    </div>
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
        Выгрузка в JSON — страховка на случай, если с облаком что-то случится, и способ
        однажды переехать на свой сервер. Картинки в файл не попадают.
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
