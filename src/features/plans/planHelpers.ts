import { newId, nowIso, today, type Moment, type PersonId, type Plan, type PlanKind } from '../../data/schema';

/**
 * Момент архива по посещённому месту.
 *
 * Отметили «были» — значит это уже не план, а воспоминание. Фотографии момент
 * берёт те же самые: они остаются и в плане, копировать файлы незачем.
 */
export function momentFromPlan(plan: Plan, author: PersonId): Moment {
  const now = nowIso();
  return {
    id: newId('moment'),
    title: plan.title,
    date: today(),
    text: plan.note,
    place: plan.address,
    tags: ['места'],
    imageIds: plan.imageIds,
    createdAt: now,
    updatedAt: now,
    createdBy: author,
  };
}

/** Подписи под видом плана: заголовок пустого экрана и кнопка «сделано». */
export const PLAN_TEXTS: Record<
  PlanKind,
  { empty: string; doneLabel: string; doneTag: string; undo: string; addButton: string }
> = {
  place: {
    empty: 'Пока ни одного места. Добавь то, куда хочется съездить или зайти.',
    doneLabel: 'Были',
    doneTag: 'Были',
    undo: 'Ещё не были',
    addButton: 'Добавить место',
  },
  watch: {
    empty: 'Список пуст. Добавь фильм, сериал или что угодно ещё.',
    doneLabel: 'Посмотрели',
    doneTag: 'Посмотрели',
    undo: 'Ещё не смотрели',
    addButton: 'Добавить в список',
  },
  food: {
    empty: 'Пока пусто. Добавь то, что хочется попробовать.',
    doneLabel: 'Попробовали',
    doneTag: 'Попробовали',
    undo: 'Ещё не пробовали',
    addButton: 'Добавить блюдо',
  },
};

/**
 * Приводит подраздел к общему виду.
 *
 * Без этого «Парк», «парк» и «парк » разъехались бы на три разные метки и
 * засорили фильтр. Нижний регистр выбран намеренно: подразделы — это типы
 * («парк», «кино»), а не имена собственные.
 */
export function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().slice(0, 24);
}

/** Подразделы, которые реально используются, — из них и состоит фильтр. */
export function collectCategories(plans: Plan[], kind: PlanKind): string[] {
  const seen = new Set<string>();
  for (const plan of plans) {
    if (plan.kind === kind && plan.category) seen.add(plan.category);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'ru'));
}

/** Невыполненное сверху, внутри — новое первым. */
export function sortPlans(plans: Plan[]): Plan[] {
  return plans.slice().sort((a, b) => {
    const doneDiff = Number(a.done) - Number(b.done);
    if (doneDiff !== 0) return doneDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Ссылка на карту по адресу — чтобы не искать место вручную. */
export function mapUrl(address: string): string {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
}

export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'ссылка';
  }
}
