import type { Card, CardState, CardStatus, Deck, DeckState, ItemMode } from '@/store/types';
import { DAY } from './util';

export const freshState = (now = Date.now()): CardState => ({
  seen: false,
  reps: 0,
  ease: 2.5,
  interval: 0,
  due: now,
  lapses: 0,
  demonstrated: false,
});

/** Next interval in days for a rating, without mutating. */
export function nextInterval(s: CardState, rating: 1 | 2 | 3 | 4): number {
  if (rating === 1) return 0;
  if (s.reps === 0) return rating === 4 ? 3 : 1;
  if (s.reps === 1) return rating === 2 ? 2 : rating === 3 ? 4 : 6;
  const base = Math.max(1, s.interval);
  const mult = rating === 2 ? 1.2 : rating === 3 ? s.ease : s.ease * 1.3;
  return Math.max(base + 1, Math.round(base * mult));
}

export function schedule(
  s: CardState,
  rating: 1 | 2 | 3 | 4,
  demonstratedNow: boolean,
  now = Date.now(),
): CardState {
  const next: CardState = { ...s, seen: true, lastReviewed: now };
  if (rating === 1) {
    next.lapses += 1;
    next.reps = 0;
    next.interval = 0;
    next.ease = Math.max(1.3, s.ease - 0.2);
    next.due = now + 10 * 60_000;
    return next;
  }
  next.interval = nextInterval(s, rating);
  next.reps = s.reps + 1;
  if (rating === 2) next.ease = Math.max(1.3, s.ease - 0.15);
  if (rating === 4) next.ease = s.ease + 0.15;
  next.due = now + next.interval * DAY;
  if (demonstratedNow) next.demonstrated = true;
  return next;
}

export function intervalLabel(days: number) {
  if (days <= 0) return '10 min';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  return `${Math.round(days / 30)} mo`;
}

export function cardStatus(s?: CardState): CardStatus {
  if (!s || !s.seen) return 'new';
  if (s.demonstrated && s.interval >= 7) return 'mastered';
  if (s.demonstrated) return 'proven';
  return 'seen';
}

export const statusLabel: Record<CardStatus, string> = {
  new: 'New',
  seen: 'Seen',
  proven: 'Proven',
  mastered: 'Mastered',
};

const weight: Record<CardStatus, number> = { new: 0, seen: 0.25, proven: 0.6, mastered: 1 };

export function isDue(s: CardState | undefined, now = Date.now()) {
  return !!s && s.seen && s.due <= now;
}

export interface DeckStats {
  total: number;
  counts: Record<CardStatus, number>;
  due: number;
  mastery: number; // 0..1
  state: DeckState;
  nextDue?: number;
}

export function deckStats(
  deck: Deck,
  cards: Record<string, Card>,
  states: Record<string, CardState>,
  now = Date.now(),
): DeckStats {
  const counts: Record<CardStatus, number> = { new: 0, seen: 0, proven: 0, mastered: 0 };
  let due = 0;
  let w = 0;
  let total = 0;
  let nextDue: number | undefined;
  for (const c of Object.values(cards)) {
    if (c.deckId !== deck.id) continue;
    total++;
    const s = states[c.id];
    const st = cardStatus(s);
    counts[st]++;
    w += weight[st];
    if (isDue(s, now)) due++;
    else if (s?.seen && (nextDue === undefined || s.due < nextDue)) nextDue = s.due;
  }
  const mastery = total ? w / total : 0;
  let state: DeckState = 'new';
  if (total && counts.new < total) state = 'progress';
  if (due > 0) state = 'review';
  else if (total && counts.mastered / total >= 0.8) state = 'mastered';
  return { total, counts, due, mastery, state, nextDue };
}

export const deckStateLabel: Record<DeckState, string> = {
  new: 'Not started',
  progress: 'In progress',
  review: 'Ready to review',
  mastered: 'Mastered',
};

export function typedEligible(card: Card) {
  return card.back.length <= 32 && card.back.split(' ').length <= 4;
}

/** Choose how a card is asked, based on what the learner has shown so far. */
export function modeFor(card: Card, s: CardState | undefined, boss = false): ItemMode {
  const st = cardStatus(s);
  const hasChoices = card.distractors.filter(Boolean).length >= 2;
  if (!boss && st === 'new') return 'flash';
  if (st === 'proven' || st === 'mastered') {
    if (typedEligible(card)) return 'typed';
    return hasChoices ? 'mc' : 'flash';
  }
  if (hasChoices) return 'mc';
  return typedEligible(card) ? 'typed' : 'flash';
}
