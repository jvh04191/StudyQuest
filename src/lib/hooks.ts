import { useMemo } from 'react';

import { useStore } from '@/store/useStore';
import { levelProgress } from './progression';
import { deckStats, type DeckStats } from './srs';

export function useDeckStats() {
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const states = useStore((s) => s.cardStates);
  return useMemo(() => {
    const now = Date.now();
    const m: Record<string, DeckStats> = {};
    decks.forEach((d) => (m[d.id] = deckStats(d, cards, states, now)));
    return m;
  }, [decks, cards, states]);
}

export function useLevel() {
  const xp = useStore((s) => s.player.xp);
  return useMemo(() => ({ xp, ...levelProgress(xp) }), [xp]);
}
