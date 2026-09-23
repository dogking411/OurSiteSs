import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { MediaImage } from '../../components/MediaImage';
import { useStore } from '../../data/store';
import {
  emptyPlan,
  nowIso,
  FOOD_KINDS,
  FOOD_KIND_LABELS,
  PEOPLE,
  PLAN_KIND_LABELS,
  type FoodKind,
  type PersonId,
  type Plan,
  type PlanKind,
} from '../../data/schema';
import { collectCategories, normalizeCategory } from './planHelpers';

/**
 * Создание и правка плана.
 *
 * Поля показываются по виду плана: у места адрес и фотографии, у «посмотреть»
 * жанр и ссылка, у еды набор полей зависит ещё и от того, идём мы в кафе,
 * заказываем или готовим сами.
 */
export function PlanForm({
  kind,
  owner,
  plan,
  author,
  onClose,
}: {
  kind: PlanKind;
  owner: PersonId;
  plan: Plan | null;
  author: PersonId;
  onClose: () => void;
}) {
  const { save, adapter, plans } = useStore();
  const [draft, setDraft] = useState<Plan>(() => plan ?? emptyPlan(kind, owner, author));
  // Подсказки берём из того, что уже заведено, — отдельного списка нет.
  const usedCategories = collectCategories(plans, 'place');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSave = draft.title.trim().length > 0 && !busy && !uploading;
  const patch = (changes: Partial<Plan>) => setDraft((current) => ({ ...current, ...changes }));

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const ids = await Promise.all(
        Array.from(files).map((file) => adapter.putMedia(file, file.name)),
      );
      patch({ imageIds: [...draft.imageIds, ...ids] });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSave) return;
    setBusy(true);
    await save('plans', { ...draft, title: draft.title.trim(), updatedAt: nowIso() });
    setBusy(false);
    onClose();
  }

  return (
    <Modal
      title={plan ? 'Правим план' : `${PLAN_KIND_LABELS[kind].one} — от ${PEOPLE[owner].genitive}`}
      onClose={onClose}
      footer={
        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn" onClick={handleSubmit} disabled={!canSave}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="plan-title">Название</label>
        <input
          id="plan-title"
          className="input"
          value={draft.title}
          autoFocus
          placeholder={
            kind === 'place'
              ? 'Смотровая площадка'
              : kind === 'watch'
                ? 'Название фильма или сериала'
                : 'Том-ям'
          }
          onChange={(event) => patch({ title: event.target.value })}
        />
      </div>

      {kind === 'place' ? (
        <>
          <CategoryField
            value={draft.category}
            suggestions={usedCategories}
            onChange={(category) => patch({ category })}
          />
          <div className="field">
            <label htmlFor="plan-address">Адрес</label>
            <input
              id="plan-address"
              className="input"
              value={draft.address}
              placeholder="Город, улица, дом"
              onChange={(event) => patch({ address: event.target.value })}
            />
          </div>
        </>
      ) : null}

      {kind === 'watch' ? (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="plan-genre">Жанр</label>
            <input
              id="plan-genre"
              className="input"
              value={draft.genre}
              placeholder="Комедия, документалка"
              onChange={(event) => patch({ genre: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="plan-url">Ссылка</label>
            <input
              id="plan-url"
              className="input"
              value={draft.url}
              placeholder="https://…"
              onChange={(event) => patch({ url: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {kind === 'food' ? (
        <>
          <div className="field">
            <label>Как будем есть</label>
            <div className="person-switch">
              {FOOD_KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={draft.foodKind === option}
                  onClick={() => patch({ foodKind: option })}
                >
                  {FOOD_KIND_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {draft.foodKind === 'cafe' ? (
            <div className="field">
              <label htmlFor="plan-address">Адрес заведения</label>
              <input
                id="plan-address"
                className="input"
                value={draft.address}
                placeholder="Город, улица, дом"
                onChange={(event) => patch({ address: event.target.value })}
              />
            </div>
          ) : null}

          {draft.foodKind === 'delivery' ? (
            <div className="grid-2">
              <div className="field">
                <label htmlFor="plan-vendor">Где заказать</label>
                <input
                  id="plan-vendor"
                  className="input"
                  value={draft.vendor}
                  placeholder="Название доставки"
                  onChange={(event) => patch({ vendor: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="plan-url">Ссылка</label>
                <input
                  id="plan-url"
                  className="input"
                  value={draft.url}
                  placeholder="https://…"
                  onChange={(event) => patch({ url: event.target.value })}
                />
              </div>
            </div>
          ) : null}

          {draft.foodKind === 'cook' ? (
            <>
              <div className="field">
                <label htmlFor="plan-recipe">Рецепт</label>
                <textarea
                  id="plan-recipe"
                  className="textarea"
                  value={draft.recipe}
                  placeholder="Что нужно и что с этим делать"
                  onChange={(event) => patch({ recipe: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="plan-url">Ссылка на рецепт</label>
                <input
                  id="plan-url"
                  className="input"
                  value={draft.url}
                  placeholder="https://…"
                  onChange={(event) => patch({ url: event.target.value })}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}

      <div className="field">
        <label htmlFor="plan-note">{kind === 'watch' ? 'О чём' : 'Примечание'}</label>
        <textarea
          id="plan-note"
          className="textarea"
          value={draft.note}
          placeholder={
            kind === 'watch' ? 'Коротко о сюжете и почему хочется' : 'Чем приглянулось'
          }
          onChange={(event) => patch({ note: event.target.value })}
        />
      </div>

      <div className="field">
        <label>Фотографии</label>
        <div className="row">
          {draft.imageIds.map((id) => (
            <div key={id} className="thumb-wrap">
              <MediaImage mediaId={id} alt="" className="thumb" />
              <button
                type="button"
                className="thumb-remove"
                aria-label="Убрать фото"
                onClick={() => {
                  patch({ imageIds: draft.imageIds.filter((item) => item !== id) });
                  void adapter.deleteMedia(id).catch(() => undefined);
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <label className="btn btn-ghost btn-sm">
            {uploading ? 'Загружаем…' : '+ Фото'}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Выбор подраздела: кнопки с уже использованными и поле для нового.
 *
 * Список подразделов нигде не хранится, поэтому и управлять им негде: чтобы
 * завести новый, достаточно вписать его здесь, а чтобы избавиться от лишнего —
 * убрать у последнего места, где он стоял.
 */
function CategoryField({
  value,
  suggestions,
  onChange,
}: {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="plan-category">Тип места</label>
      {suggestions.length > 0 ? (
        <div className="row" style={{ gap: 6 }}>
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              className={`tag${value === option ? ' tag-accent' : ''}`}
              onClick={() => onChange(value === option ? '' : option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      <input
        id="plan-category"
        className="input"
        value={value}
        placeholder="парк, галерея, кино, театр, лепка…"
        onChange={(event) => onChange(normalizeCategory(event.target.value))}
      />
    </div>
  );
}

/** Подпись выбранного способа поесть — используется и в карточке. */
export function foodKindLabel(kind: FoodKind | null): string {
  return kind ? FOOD_KIND_LABELS[kind] : '';
}
