import { useMemo, useState } from 'react';
import { MediaImage } from '../../components/MediaImage';
import { useProfile } from '../../data/profile';
import { useStore } from '../../data/store';
import {
  nowIso,
  otherPerson,
  PEOPLE,
  type PersonId,
  type WishItem,
} from '../../data/schema';
import { WishForm } from './WishForm';
import {
  linkLabel,
  PRIORITY_LABELS,
  sortWishes,
  visibleReservedBy,
  visibleStatus,
} from './wishHelpers';

export function WishlistPage() {
  const { person } = useProfile();
  const { wishes, loading } = useStore();
  const [tab, setTab] = useState<PersonId>(person);
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<WishItem | null>(null);
  const [creating, setCreating] = useState(false);

  const partner = otherPerson(person);
  const isOwnList = tab === person;

  const items = useMemo(() => {
    const forTab = wishes.filter((wish) => wish.owner === tab);
    const filtered = showDone
      ? forTab
      : forTab.filter((wish) => visibleStatus(wish, person) !== 'done');
    return sortWishes(filtered);
  }, [wishes, tab, showDone, person]);

  const doneCount = wishes.filter(
    (wish) => wish.owner === tab && visibleStatus(wish, person) === 'done',
  ).length;

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Вишлисты</h1>
          <p className="page-sub">
            {isOwnList
              ? `Твой список. ${PEOPLE[partner].name} видит его и может что-то взять на себя — тебе это не покажется.`
              : `Список ${PEOPLE[tab].genitive}. Нажми «Дарю это», чтобы забронировать, — ${PEOPLE[tab].name} не увидит.`}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setCreating(true)}>
          + Добавить
        </button>
      </div>

      <div className="row">
        <div className="person-switch" style={{ maxWidth: 320, flex: 1 }}>
          <button
            type="button"
            aria-pressed={tab === person}
            onClick={() => setTab(person)}
          >
            Мой список
          </button>
          <button
            type="button"
            aria-pressed={tab === partner}
            onClick={() => setTab(partner)}
          >
            Список {PEOPLE[partner].genitive}
          </button>
        </div>
        <span className="spacer" />
        {doneCount > 0 ? (
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => setShowDone((value) => !value)}
          >
            {showDone ? 'Скрыть подаренное' : `Показать подаренное (${doneCount})`}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="empty">Загружаем…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">✨</span>
          <div>
            {isOwnList
              ? 'Пока пусто. Добавь первое желание — так проще дарить друг другу правильные вещи.'
              : `В списке ${PEOPLE[tab].genitive} пока пусто.`}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setCreating(true)}>
            Добавить желание
          </button>
        </div>
      ) : (
        <div className="wish-grid">
          {items.map((wish) => (
            <WishCard key={wish.id} wish={wish} viewer={person} onEdit={() => setEditing(wish)} />
          ))}
        </div>
      )}

      {creating ? <WishForm owner={tab} wish={null} onClose={() => setCreating(false)} /> : null}
      {editing ? (
        <WishForm owner={editing.owner} wish={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function WishCard({
  wish,
  viewer,
  onEdit,
}: {
  wish: WishItem;
  viewer: PersonId;
  onEdit: () => void;
}) {
  const { save, remove } = useStore();
  const status = visibleStatus(wish, viewer);
  const reservedBy = visibleReservedBy(wish, viewer);
  const isOwn = wish.owner === viewer;
  const reservedByMe = wish.reservedBy === viewer;

  function patch(changes: Partial<WishItem>) {
    void save('wishes', { ...wish, ...changes, updatedAt: nowIso() });
  }

  return (
    <article className={`wish-card${status === 'done' ? ' is-done' : ''}`}>
      {wish.imageId ? (
        <div className="wish-image">
          <MediaImage mediaId={wish.imageId} alt={wish.title} />
        </div>
      ) : null}

      <div className="wish-body">
        <div className="row" style={{ gap: 6 }}>
          <span className={`tag${wish.priority === 'dream' ? ' tag-accent' : ''}`}>
            {PRIORITY_LABELS[wish.priority]}
          </span>
          {status === 'done' ? <span className="tag tag-success">Подарено</span> : null}
          {reservedBy ? (
            <span className="tag tag-accent">
              {reservedByMe ? 'Ты даришь' : `Дарит ${PEOPLE[reservedBy].name}`}
            </span>
          ) : null}
        </div>

        <h3>{wish.title}</h3>
        {wish.price ? <div className="wish-price">{wish.price}</div> : null}
        {wish.note ? <p className="wish-note">{wish.note}</p> : null}
        {wish.url ? (
          <a href={wish.url} target="_blank" rel="noreferrer noopener" className="wish-link">
            ↗ {linkLabel(wish.url)}
          </a>
        ) : null}

        <div className="wish-actions">
          {!isOwn && status !== 'done' ? (
            <button
              type="button"
              className={reservedByMe ? 'btn btn-ghost btn-sm' : 'btn btn-sm'}
              onClick={() =>
                patch(
                  reservedByMe
                    ? { status: 'open', reservedBy: null }
                    : { status: 'reserved', reservedBy: viewer },
                )
              }
              disabled={Boolean(wish.reservedBy) && !reservedByMe}
            >
              {reservedByMe ? 'Передумал дарить' : 'Дарю это'}
            </button>
          ) : null}

          {status === 'done' ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => patch({ status: 'open', reservedBy: null })}
            >
              Вернуть в список
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => patch({ status: 'done' })}
            >
              Уже подарено
            </button>
          )}

          <span className="spacer" />
          <button type="button" className="btn btn-quiet btn-sm" onClick={onEdit}>
            Править
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm(`Удалить «${wish.title}»?`)) void remove('wishes', wish.id);
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    </article>
  );
}
