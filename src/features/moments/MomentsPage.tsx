import { useMemo, useState } from 'react';
import { MediaImage } from '../../components/MediaImage';
import { useStore } from '../../data/store';
import { PEOPLE, type Moment } from '../../data/schema';
import { MomentForm } from './MomentForm';

export function MomentsPage() {
  const { moments, loading, remove } = useStore();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Moment | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const moment of moments) for (const item of moment.tags) set.add(item);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [moments]);

  // Архив читается от свежего к старому — как лента воспоминаний.
  const items = useMemo(() => {
    const filtered = tag ? moments.filter((moment) => moment.tags.includes(tag)) : moments;
    return filtered.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [moments, tag]);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Моменты</h1>
          <p className="page-sub">Архив: что было, когда и как это выглядело.</p>
        </div>
        <button type="button" className="btn" onClick={() => setCreating(true)}>
          + Добавить
        </button>
      </div>

      {allTags.length > 0 ? (
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={`tag${tag === null ? ' tag-accent' : ''}`}
            onClick={() => setTag(null)}
          >
            Все
          </button>
          {allTags.map((item) => (
            <button
              key={item}
              type="button"
              className={`tag${tag === item ? ' tag-accent' : ''}`}
              onClick={() => setTag(item === tag ? null : item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="empty">Загружаем…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">📸</span>
          <div>Здесь пока пусто. Первый момент можно записать даже задним числом.</div>
          <button type="button" className="btn btn-ghost" onClick={() => setCreating(true)}>
            Добавить момент
          </button>
        </div>
      ) : (
        <div className="moment-list">
          {items.map((moment) => (
            <article key={moment.id} className="moment-card">
              <div className="moment-date">{formatDate(moment.date)}</div>
              <div className="moment-body">
                <h3>{moment.title}</h3>
                {moment.place ? <div className="page-sub">{moment.place}</div> : null}
                {moment.text ? <p className="moment-text">{moment.text}</p> : null}

                {moment.imageIds.length > 0 ? (
                  <div className="moment-photos">
                    {moment.imageIds.map((id) => (
                      <MediaImage key={id} mediaId={id} alt={moment.title} />
                    ))}
                  </div>
                ) : null}

                <div className="row" style={{ gap: 6 }}>
                  {moment.tags.map((item) => (
                    <span key={item} className="tag">
                      {item}
                    </span>
                  ))}
                  <span className="spacer" />
                  <span className="tag">записал(а) {PEOPLE[moment.createdBy].name}</span>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setEditing(moment)}
                  >
                    Править
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm(`Удалить «${moment.title}»?`)) void remove('moments', moment.id);
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating ? <MomentForm moment={null} onClose={() => setCreating(false)} /> : null}
      {editing ? <MomentForm moment={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
