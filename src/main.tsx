import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProfileProvider } from './data/profile';
import { StoreProvider, useStore } from './data/store';
import { SetupScreen } from './features/auth/SetupScreen';
import { SignInScreen } from './features/auth/SignInScreen';
import { isCloudConfigured } from './storage';
import './styles/global.css';
import './styles/components.css';

/**
 * Три состояния запуска:
 *   нет ключей облака  -> экран первой настройки;
 *   ключи есть, входа нет -> экран входа;
 *   вошли -> сам сайт.
 */
function Root() {
  const { status } = useStore();
  if (status.busy && !status.signedIn) return <div className="gate">Загружаем…</div>;
  return status.signedIn ? <App /> : <SignInScreen />;
}

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой элемент #root');

createRoot(container).render(
  <StrictMode>
    <ProfileProvider>
      {isCloudConfigured() ? (
        <StoreProvider>
          <Root />
        </StoreProvider>
      ) : (
        <SetupScreen />
      )}
    </ProfileProvider>
  </StrictMode>,
);
