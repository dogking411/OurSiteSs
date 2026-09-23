import { useMemo, useState } from 'react';
import { MediaImage, usePhotoViewer } from '../../components/MediaImage';
import { usePerson } from '../../data/profile';
import { useStore } from '../../data/store';
import {
  nowIso,
  otherPerson,
  FOOD_KIND_LABELS,
  PEOPLE,
  PLAN_KINDS,
  PLAN_KIND_LABELS,
  type PersonId,
  type Plan,
  type PlanKind,
} from '../../data/schema';
import { PlanForm } from './PlanForm';
import { linkLabel, mapUrl, momentFromPlan, PLAN_TEXTS, sortPlans } from './planHelpers';

export function PlansPage() {
  const person = usePerson();
  const { plans, loading } = useStore();
  const [kind, setKind] = useState<PlanKind>('place');
  const [owner, setOwner] = useState<PersonId>(person);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const photos = usePhotoViewer();

  const partner = otherPerson(person);
  const texts = PLAN_TEXTS[kind];

  const items = useMemo(() => {
    const forTab = plans.filter((plan) => plan.kind === kind && plan.owner === owner);
    return sortPlans(showDone ? forTab : forTab.filter((plan) => !plan.done));
  }, [plans, kind, owner, showDone]);

  const doneCount = plans.filter(
    (plan) => plan.kind === kind && plan.owner === owner && plan.done,
  ).length;

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-group">
          <h1>Планы</h1>
          <p className="page-sub">Что мы хотим увидеть, посмотреть и попробовать.</p>
        </div>
        <button type="button" className="btn" onClick={() => setCreating(true)}>
          + Добавить
        </button>
      </div>

      <div className="person-switch plan-kinds">
        {PLAN_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
          >
            <span aria-hidden="true">{PLAN_KIND_LABELS[option].icon}</span>{' '}
            {PLAN_KIND_LABELS[option].tab}
          </button>
        ))}
      </div>

      <div className="row">
        <div className="person-switch" style={{ maxWidth: 320, flex: 1 }}>
          <button type="button" aria-pressed={owner === person} onClick={() => setOwner(person)}>
            От меня
          </button>
          <button type="button" aria-pressed={owner === partner} onClick={() => setOwner(partner)}>
            От {PEOPLE[partner].genitive}
          </button>
        </div>
        <span className="spacer" />
        {doneCount > 0 ? (
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => setShowDone((value) => !value)}
          >
            {showDone ? 'Скрыть' : `Показать «${texts.doneTag.toLowerCase()}» (${doneCount})`}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="empty">Загружаем…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji">{PLAN_KIND_LABELS[kind].icon}</span>
          <div>{texts.empty}</div>
          <button type="button" className="btn btn-ghost" onClick={() => setCreating(true)}>
            {texts.addButton}
          </button>
        </div>
      ) : (
        <div className="plan-grid">
          {items.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditing(plan)}
              onOpenPhoto={photos.open}
            />
          ))}
        </div>
      )}

      {photos.viewer}

      {creating ? (
        <PlanForm
          kind={kind}
          owner={owner}
          plan={null}
          author={person}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <PlanForm
          kind={editing.kind}
          owner={editing.owner}
          plan={editing}
          author={person}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  onOpenPhoto,
}: {
  plan: Plan;
  onEdit: () => void;
  onOpenPhoto: (mediaId: string, alt: string) => void;
}) {
  const person = usePerson();
  const { save, remove } = useStore();
  const texts = PLAN_TEXTS[plan.kind];

  /**
   * Отметка «сделано». Для места это ещё и запись в архив: сходили — значит
   * появился момент. Момент создаётся один раз: если отметку сняли и поставили
   * снова, архив не задваивается.
   */
  async function toggleDone() {
    if (plan.done) {
      await save('plans', { ...plan, done: false, doneAt: '', updatedAt: nowIso() });
      return;
    }

    let momentId = plan.momentId;
    if (plan.kind === 'place' && !momentId) {
      const moment = momentFromPlan(plan, person);
      await save('moments', moment);
      momentId = moment.id;
    }

    await save('plans', {
      ...plan,
      done: true,
      doneAt: nowIso(),
      momentId,
      updatedAt: nowIso(),
    });
  }

  return (
    <article className={`plan-card${plan.done ? ' is-done' : ''}`}>
      {plan.imageIds.length > 0 ? (
        <div className="plan-photos">
          {plan.imageIds.map((id) => (
            <MediaImage
              key={id}
              mediaId={id}
              alt={plan.title}
              onOpen={() => onOpenPhoto(id, plan.title)}
            />
          ))}
        </div>
      ) : null}

      <div className="plan-body">
        <div className="row" style={{ gap: 6 }}>
          {plan.kind === 'food' && plan.foodKind ? (
            <span className="tag tag-accent">{FOOD_KIND_LABELS[plan.foodKind]}</span>
          ) : null}
          {plan.kind === 'watch' && plan.genre ? <span className="tag">{plan.genre}</span> : null}
          {plan.done ? <span className="tag tag-success">{texts.doneTag}</span> : null}
          {plan.momentId ? <span className="tag">в архиве</span> : null}
        </div>

        <h3>{plan.title}</h3>

        {plan.address ? (
          <a
            className="plan-line"
            href={mapUrl(plan.address)}
            target="_blank"
            rel="noreferrer noopener"
          >
            📍 {plan.address}
          </a>
        ) : null}
        {plan.vendor ? <div className="plan-line">🛵 {plan.vendor}</div> : null}
        {plan.note ? <p className="plan-note">{plan.note}</p> : null}
        {plan.recipe ? (
          <details className="plan-recipe">
            <summary>Рецепт</summary>
            <p className="plan-note">{plan.recipe}</p>
          </details>
        ) : null}
        {plan.url ? (
          <a href={plan.url} target="_blank" rel="noreferrer noopener" className="plan-link">
            ↗ {linkLabel(plan.url)}
          </a>
        ) : null}

        <div className="plan-actions">
          <button
            type="button"
            className={plan.done ? 'btn btn-ghost btn-sm' : 'btn btn-sm'}
            onClick={() => void toggleDone()}
          >
            {plan.done ? texts.undo : texts.doneLabel}
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-quiet btn-sm" onClick={onEdit}>
            Править
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm(`Удалить «${plan.title}»?`)) void remove('plans', plan.id);
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    </article>
  );
}
