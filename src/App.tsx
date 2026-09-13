import { useProfile } from './data/profile';
import { useStore } from './data/store';
import { otherPerson, PEOPLE, PERSON_IDS } from './data/schema';
import { Link, useRoute } from './lib/router';
import { HomePage } from './features/HomePage';
import { WishlistPage } from './features/wishlist/WishlistPage';
import { MomentsPage } from './features/moments/MomentsPage';
import { PlansPage } from './features/plans/PlansPage';
import { StatsPage } from './features/stats/StatsPage';
import { SettingsPage } from './features/settings/SettingsPage';

const NAV = [
  { route: 'home', icon: '🏠', label: 'Главная' },
  { route: 'wishes', icon: '🎁', label: 'Вишлисты' },
  { route: 'moments', icon: '📸', label: 'Моменты' },
  { route: 'plans', icon: '🗓️', label: 'Планы' },
  { route: 'stats', icon: '📊', label: 'Статистика' },
  { route: 'settings', icon: '⚙️', label: 'Настройки' },
] as const;

export function App() {
  const route = useRoute();
  const { person, setPerson } = useProfile();
  const { wishes, error, clearError } = useStore();
  const partner = otherPerson(person);

  const partnerWishes = wishes.filter(
    (wish) => wish.owner === partner && wish.status === 'open',
  ).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🤍</div>
          <div>
            <div className="brand-title">Саша и Соня</div>
            <div className="brand-sub">архив и планы</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.route}
              to={item.route}
              className="nav-link"
              aria-current={route === item.route ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.route === 'wishes' && partnerWishes > 0 ? (
                <span className="nav-badge">{partnerWishes}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="person-switch" role="group" aria-label="Кто смотрит">
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
        </div>
      </aside>

      <main className="main">
        {error ? (
          <div className="banner" style={{ marginBottom: 16 }}>
            <span>{error}</span>
            <span className="spacer" />
            <button type="button" className="btn btn-quiet btn-sm" onClick={clearError}>
              Скрыть
            </button>
          </div>
        ) : null}
        <Page route={route} />
      </main>
    </div>
  );
}

function Page({ route }: { route: string }) {
  switch (route) {
    case 'wishes':
      return <WishlistPage />;
    case 'moments':
      return <MomentsPage />;
    case 'plans':
      return <PlansPage />;
    case 'stats':
      return <StatsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <HomePage />;
  }
}
