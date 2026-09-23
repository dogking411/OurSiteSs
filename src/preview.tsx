/**
 * Стенд разработки: показывает экраны на выдуманных данных, не заходя в облако.
 *
 * Открывается по адресу /preview.html при запущенном `npm run dev`. В сборку
 * сайта не попадает — vite.config.ts собирает только index.html.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfileProvider, ThemeProvider } from './data/profile';
import { StoreContext, type StoreValue } from './data/store';
import { emptyPlan, type Moment, type Plan } from './data/schema';
import { PlansPage } from './features/plans/PlansPage';
import { MomentsPage } from './features/moments/MomentsPage';
import type { StorageAdapter } from './storage';
import './styles/global.css';
import './styles/components.css';

/** Однопиксельные картинки, чтобы проверить сетку фотографий и просмотрщик. */
const FAKE_PHOTO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
      '<rect width="600" height="400" fill="#6f8cff"/>' +
      '<text x="300" y="215" font-size="44" text-anchor="middle" fill="white">фото</text></svg>',
  );

const fakeAdapter = {
  getMediaUrl: async () => FAKE_PHOTO,
  releaseMedia: () => {},
  putMedia: async () => 'img_fake/photo.jpg',
  deleteMedia: async () => {},
} as unknown as StorageAdapter;

function plan(over: Partial<Plan>): Plan {
  return { ...emptyPlan('place', 'sasha', 'sasha'), ...over, id: over.id ?? Math.random().toString() };
}

const PLANS: Plan[] = [
  plan({
    kind: 'place',
    owner: 'sasha',
    title: 'Смотровая на Воробьёвых',
    address: 'Москва, Воробьёвы горы',
    note: 'Говорят, лучше всего на закате.',
    imageIds: ['a', 'b'],
  }),
  plan({
    kind: 'place',
    owner: 'sasha',
    title: 'Домик у озера',
    address: 'Тверская область',
    done: true,
    momentId: 'moment_1',
  }),
  plan({
    kind: 'watch',
    owner: 'sasha',
    title: 'Унесённые призраками',
    genre: 'аниме, сказка',
    note: 'Девочка попадает в мир духов и спасает родителей.',
    url: 'https://www.kinopoisk.ru/film/402/',
  }),
  plan({
    kind: 'food',
    owner: 'sasha',
    title: 'Том-ям',
    foodKind: 'cook',
    recipe: 'Паста том-ям, кокосовое молоко, креветки, грибы, лайм.',
    url: 'https://eda.ru',
  }),
  plan({
    kind: 'food',
    owner: 'sasha',
    title: 'Хачапури по-аджарски',
    foodKind: 'cafe',
    address: 'Москва, Никитская 12',
  }),
  plan({
    kind: 'food',
    owner: 'sasha',
    title: 'Пибимпап',
    foodKind: 'delivery',
    vendor: 'Kimchi To Go',
    url: 'https://example.com',
  }),
];

const MOMENTS: Moment[] = [
  {
    id: 'moment_1',
    title: 'Домик у озера',
    date: '2026-08-14',
    text: 'Три дня без связи и очень тихо.',
    place: 'Тверская область',
    tags: ['места'],
    imageIds: ['a'],
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
    createdBy: 'sasha',
  },
];

function Harness() {
  const [plans, setPlans] = useState(PLANS);
  const [moments, setMoments] = useState(MOMENTS);
  const [screen, setScreen] = useState<'plans' | 'moments'>('plans');

  const store: StoreValue = {
    wishes: [],
    plans,
    moments,
    loading: false,
    error: null,
    clearError: () => {},
    adapter: fakeAdapter,
    status: {
      initialized: true,
      ready: true,
      busy: false,
      signedIn: true,
      account: 'preview@example.com',
      person: 'sasha',
      error: null,
    },
    connect: async () => {},
    disconnect: async () => {},
    setPerson: async () => {},
    reload: async () => {},
    save: async (collection, row) => {
      const put = <T extends { id: string }>(rows: T[], next: T) =>
        rows.some((item) => item.id === next.id)
          ? rows.map((item) => (item.id === next.id ? next : item))
          : [...rows, next];
      if (collection === 'plans') setPlans((rows) => put(rows, row as Plan));
      if (collection === 'moments') setMoments((rows) => put(rows, row as Moment));
    },
    remove: async (collection, id) => {
      if (collection === 'plans') setPlans((rows) => rows.filter((row) => row.id !== id));
      if (collection === 'moments') setMoments((rows) => rows.filter((row) => row.id !== id));
    },
    exportAll: async () => ({ schemaVersion: 2, exportedAt: '', wishes: [], moments, plans }),
    importAll: async () => {},
  };

  return (
    <StoreContext.Provider value={store}>
      <ProfileProvider person="sasha">
        <div className="app">
          <aside className="sidebar">
            <nav className="nav">
              <button
                type="button"
                className="nav-link"
                aria-current={screen === 'plans' ? 'page' : undefined}
                onClick={() => setScreen('plans')}
              >
                Планы
              </button>
              <button
                type="button"
                className="nav-link"
                aria-current={screen === 'moments' ? 'page' : undefined}
                onClick={() => setScreen('moments')}
              >
                Моменты
              </button>
            </nav>
          </aside>
          <main className="main">{screen === 'plans' ? <PlansPage /> : <MomentsPage />}</main>
        </div>
      </ProfileProvider>
    </StoreContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Harness />
    </ThemeProvider>
  </StrictMode>,
);
