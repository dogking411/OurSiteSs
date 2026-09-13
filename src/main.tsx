import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProfileProvider } from './data/profile';
import { StoreProvider } from './data/store';
import './styles/global.css';
import './styles/components.css';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой элемент #root');

createRoot(container).render(
  <StrictMode>
    <ProfileProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ProfileProvider>
  </StrictMode>,
);
