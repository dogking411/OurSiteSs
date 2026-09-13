import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProfileProvider, ThemeProvider } from './data/profile';
import { StoreProvider, useStore } from './data/store';
import { ChoosePersonScreen } from './features/auth/ChoosePersonScreen';
import { SetupScreen } from './features/auth/SetupScreen';
import { SignInScreen } from './features/auth/SignInScreen';
import { isCloudConfigured } from './storage';
import './styles/global.css';
import './styles/components.css';

/**
 * Состояния запуска, по порядку:
 *   нет ключей облака      -> экран первой настройки;
 *   сессия ещё проверяется -> ожидание (иначе мигнёт форма входа, хотя вход есть);
 *   не вошли               -> экран входа;
 *   аккаунт без имени      -> одноразовый вопрос «кто ты»;
 *   всё готово             -> сайт.
 */
function Root() {
  const { status } = useStore();

  if (!status.initialized) {
    return <div className="gate">Загружаем…</div>;
  }
  if (!status.signedIn) {
    return <SignInScreen />;
  }
  if (!status.person) {
    return <ChoosePersonScreen />;
  }
  return (
    <ProfileProvider person={status.person}>
      <App />
    </ProfileProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой элемент #root');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      {isCloudConfigured() ? (
        <StoreProvider>
          <Root />
        </StoreProvider>
      ) : (
        <SetupScreen />
      )}
    </ThemeProvider>
  </StrictMode>,
);
