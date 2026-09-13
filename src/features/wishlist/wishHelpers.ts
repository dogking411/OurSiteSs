import type { PersonId, WishItem, WishPriority } from '../../data/schema';

export const PRIORITY_LABELS: Record<WishPriority, string> = {
  dream: 'Мечта',
  high: 'Очень хочу',
  normal: 'Хочу',
  low: 'Просто идея',
};

const PRIORITY_ORDER: Record<WishPriority, number> = {
  dream: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const PRIORITY_OPTIONS: WishPriority[] = ['dream', 'high', 'normal', 'low'];

/**
 * Сначала невыполненные, внутри — по важности, внутри — новое сверху.
 * Подаренное уезжает вниз, но не пропадает: это память, а не мусор.
 */
export function sortWishes(wishes: WishItem[]): WishItem[] {
  return wishes.slice().sort((a, b) => {
    const doneDiff = Number(a.status === 'done') - Number(b.status === 'done');
    if (doneDiff !== 0) return doneDiff;
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Что человек видит в своём списке.
 *
 * Владельцу не показываем, что желание кто-то уже взял на себя, — иначе сюрприза
 * не будет. Для него «зарезервировано» выглядит как обычное открытое желание.
 */
export function visibleStatus(wish: WishItem, viewer: PersonId): WishItem['status'] {
  if (wish.owner === viewer && wish.status === 'reserved') return 'open';
  return wish.status;
}

export function visibleReservedBy(wish: WishItem, viewer: PersonId): PersonId | null {
  if (wish.owner === viewer) return null;
  return wish.reservedBy;
}

/** Домен ссылки — короткая подпись вместо длинного URL. */
export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'ссылка';
  }
}
