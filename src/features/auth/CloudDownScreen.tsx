/**
 * Экран «облако недоступно».
 *
 * Показывается, когда проверка сессии закончилась ошибкой связи. Раньше в этом
 * случае сайт просто висел на «Загружаем…», и понять, что случилось, было
 * нельзя — особенно обидно, что самая частая причина чинится одной кнопкой в
 * панели Supabase.
 */
export function CloudDownScreen({ error }: { error: string }) {
  return (
    <div className="gate">
      <div className="card gate-card">
        <div className="gate-brand">
          <div className="brand-mark">🤍</div>
          <div>
            <h1>Облако не отвечает</h1>
            <p className="page-sub">Данные целы, но сайту до них не достучаться.</p>
          </div>
        </div>

        <div className="banner">{error}</div>

        <div className="row">
          <a
            className="btn btn-ghost"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer noopener"
          >
            Открыть панель Supabase
          </a>
          <span className="spacer" />
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    </div>
  );
}
