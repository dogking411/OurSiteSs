import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PersonId } from './schema';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'sau:theme';

interface ThemeValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const PersonContext = createContext<PersonId | null>(null);

/**
 * Тема — настройка устройства: на телефоне может быть тёмная, на ноутбуке
 * светлая. Поэтому она и хранится в браузере, в отличие от личности.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeValue>(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Личность приходит из аккаунта и дальше по приложению считается неизменной:
 * переключателя «я сегодня Соня» нет и не должно быть. Провайдер только
 * раздаёт её вниз и красит интерфейс в нужный цвет.
 */
export function ProfileProvider({ person, children }: { person: PersonId; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.person = person;
  }, [person]);

  return <PersonContext.Provider value={person}>{children}</PersonContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme вызван вне ThemeProvider');
  return value;
}

/** Кто сейчас пользуется сайтом. Доступно только внутри ProfileProvider. */
export function usePerson(): PersonId {
  const value = useContext(PersonContext);
  if (!value) throw new Error('usePerson вызван вне ProfileProvider');
  return value;
}
