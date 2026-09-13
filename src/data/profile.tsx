import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PERSON_IDS, type PersonId } from './schema';

export type ThemeMode = 'dark' | 'light';

const PERSON_KEY = 'sau:person';
const THEME_KEY = 'sau:theme';

interface ProfileValue {
  /** Кто сейчас пользуется сайтом. Влияет на оформление и на дефолты форм. */
  person: PersonId;
  setPerson: (person: PersonId) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ProfileContext = createContext<ProfileValue | null>(null);

/**
 * Профиль намеренно хранится локально, а не в общей базе: это настройка
 * устройства («кто за этим экраном»), а не общие данные. Иначе переключение у
 * одного меняло бы интерфейс у другого.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [person, setPersonState] = useState<PersonId>(() => {
    const saved = localStorage.getItem(PERSON_KEY);
    return PERSON_IDS.includes(saved as PersonId) ? (saved as PersonId) : 'sasha';
  });
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.person = person;
    document.documentElement.dataset.theme = theme;
  }, [person, theme]);

  const setPerson = useCallback((next: PersonId) => {
    localStorage.setItem(PERSON_KEY, next);
    setPersonState(next);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }, []);

  const value = useMemo<ProfileValue>(
    () => ({ person, setPerson, theme, setTheme }),
    [person, setPerson, theme, setTheme],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile вызван вне ProfileProvider');
  return value;
}
