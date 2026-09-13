import { useState } from 'react';
import { useStore } from '../../data/store';
import { PEOPLE, PERSON_IDS, type PersonId } from '../../data/schema';

/**
 * Одноразовый вопрос «кто ты» для нового аккаунта.
 *
 * Дальше личность берётся из аккаунта и не переключается: она определяет, чей
 * вишлист «мой», кто записал момент и кто кому готовит подарок. Тумблер в
 * интерфейсе рушил бы весь этот смысл.
 *
 * Ошиблись — поменять можно в панели Supabase, см. docs/SUPABASE.md.
 */
export function ChoosePersonScreen() {
  const { setPerson, status } = useStore();
  const [choice, setChoice] = useState<PersonId | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="gate">
      <div className="card gate-card">
        <div className="gate-brand">
          <div className="brand-mark">🤍</div>
          <div>
            <h1>Кто ты?</h1>
            <p className="page-sub">Спрашиваем один раз — дальше сайт будет знать сам.</p>
          </div>
        </div>

        <p className="page-sub">
          Выбор закрепится за аккаунтом <b>{status.account}</b> и будет одинаковым на всех
          устройствах. Поменять его потом можно только через панель Supabase, так что выбирай
          внимательно.
        </p>

        <div className="person-switch">
          {PERSON_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={choice === id}
              onClick={() => setChoice(id)}
            >
              {PEOPLE[id].name}
            </button>
          ))}
        </div>

        {status.error ? <div className="banner">{status.error}</div> : null}

        <button
          type="button"
          className="btn"
          disabled={!choice || busy}
          onClick={() => {
            if (!choice) return;
            setBusy(true);
            void setPerson(choice).finally(() => setBusy(false));
          }}
        >
          {busy ? 'Сохраняем…' : choice ? `Я ${PEOPLE[choice].name}` : 'Выбери имя'}
        </button>
      </div>
    </div>
  );
}
