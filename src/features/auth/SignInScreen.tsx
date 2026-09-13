import { useState } from 'react';
import { useStore } from '../../data/store';

/**
 * Экран входа. Показывается вместо всего сайта, пока человек не вошёл:
 * без облака показывать всё равно нечего.
 */
export function SignInScreen() {
  const { connect, status } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);

  return (
    <div className="gate">
      <form
        className="card gate-card"
        onSubmit={(event) => {
          event.preventDefault();
          void connect({ email, password, signUp }).catch(() => undefined);
        }}
      >
        <div className="gate-brand">
          <div className="brand-mark">🤍</div>
          <div>
            <h1>Саша и Соня</h1>
            <p className="page-sub">Наш общий архив и планы.</p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            className="input"
            value={email}
            autoComplete="username"
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="auth-password">Пароль</label>
          <input
            id="auth-password"
            type="password"
            className="input"
            value={password}
            autoComplete={signUp ? 'new-password' : 'current-password'}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <label className="row" style={{ gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
          <input
            type="checkbox"
            checked={signUp}
            onChange={(event) => setSignUp(event.target.checked)}
          />
          Это первый вход, создать аккаунт
        </label>

        {status.error ? <div className="banner">{status.error}</div> : null}

        <button type="submit" className="btn" disabled={status.busy}>
          {status.busy ? 'Входим…' : signUp ? 'Создать аккаунт' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
