import { useState } from 'react';
import { writeSupabaseConfig } from '../../storage';

/**
 * Экран первой настройки: показывается, когда в сборке нет адреса и ключа
 * облака. На опубликованном сайте он не появляется — там ключи приходят из
 * секретов GitHub. Нужен, когда сайт запускают из исходников без .env.
 */
export function SetupScreen() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  const canSave = url.trim().length > 0 && anonKey.trim().length > 0;

  return (
    <div className="gate">
      <form
        className="card gate-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          writeSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
          // Перезагрузка проще любой другой передачи настроек: адаптер
          // создаётся один раз при старте и читает их сам.
          window.location.reload();
        }}
      >
        <div className="gate-brand">
          <div className="brand-mark">🤍</div>
          <div>
            <h1>Первая настройка</h1>
            <p className="page-sub">Сайту нужно знать, где лежат общие данные.</p>
          </div>
        </div>

        <p className="page-sub">
          Значения берутся в Supabase: <b>Project URL</b> — в разделе Settings → Data API,
          ключ — в Settings → API Keys. Подходит только ключ <code>sb_publishable_…</code>;
          ключ <code>sb_secret_…</code> сюда вставлять нельзя. Пошагово — в файле
          docs/SUPABASE.md.
        </p>

        <div className="field">
          <label htmlFor="setup-url">Project URL</label>
          <input
            id="setup-url"
            className="input"
            value={url}
            placeholder="https://xxxx.supabase.co"
            required
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="setup-key">Publishable key</label>
          <input
            id="setup-key"
            className="input"
            value={anonKey}
            placeholder="sb_publishable_…"
            required
            onChange={(event) => setAnonKey(event.target.value)}
          />
        </div>

        <button type="submit" className="btn" disabled={!canSave}>
          Сохранить и продолжить
        </button>
      </form>
    </div>
  );
}
