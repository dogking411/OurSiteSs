import { useProfile } from '../data/profile';
import { useStore } from '../data/store';
import { otherPerson, PEOPLE } from '../data/schema';
import { Link } from '../lib/router';
import { visibleStatus } from './wishlist/wishHelpers';

export function HomePage() {
  const { person } = useProfile();
  const { wishes, moments, loading } = useStore();
  const partner = otherPerson(person);

  const partnerOpen = wishes.filter(
    (wish) => wish.owner === partner && wish.status === 'open',
  ).length;
  const myOpen = wishes.filter(
    (wish) => wish.owner === person && visibleStatus(wish, person) === 'open',
  ).length;
  const reservedByMe = wishes.filter((wish) => wish.reservedBy === person).length;

  const latest = moments.slice().sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Привет, {PEOPLE[person].name}</h1>
          <p className="page-sub">Наш общий архив и планы.</p>
        </div>
      </div>

      <div className="tile-grid">
        <Link to="wishes" className="tile">
          <div className="tile-value">{loading ? '—' : partnerOpen}</div>
          <div className="tile-label">
            {partnerOpen === 0
              ? `${PEOPLE[partner].name} пока ничего не хочет`
              : `желаний у ${PEOPLE[partner].genitive}`}
          </div>
        </Link>

        <Link to="wishes" className="tile">
          <div className="tile-value">{loading ? '—' : myOpen}</div>
          <div className="tile-label">твоих желаний в списке</div>
        </Link>

        <Link to="wishes" className="tile">
          <div className="tile-value">{loading ? '—' : reservedByMe}</div>
          <div className="tile-label">подарков ты уже присмотрел</div>
        </Link>

        <Link to="moments" className="tile">
          <div className="tile-value">{loading ? '—' : moments.length}</div>
          <div className="tile-label">моментов в архиве</div>
        </Link>
      </div>

      {latest ? (
        <section className="card">
          <div className="row">
            <h2>Последнее в архиве</h2>
            <span className="spacer" />
            <Link to="moments" className="btn btn-quiet btn-sm">
              Все моменты →
            </Link>
          </div>
          <h3 style={{ marginTop: 12 }}>{latest.title}</h3>
          <p className="page-sub">{latest.date}</p>
          {latest.text ? <p className="moment-text">{latest.text}</p> : null}
        </section>
      ) : (
        <div className="empty">
          <span className="empty-emoji">🤍</span>
          <div>Здесь появится то, что мы сохраним. Начать можно с вишлиста или с момента.</div>
          <div className="row">
            <Link to="wishes" className="btn">
              К вишлистам
            </Link>
            <Link to="moments" className="btn btn-ghost">
              Добавить момент
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
