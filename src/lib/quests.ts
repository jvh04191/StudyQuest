import type { Card, CardState, Daily, Deck, QuestDef, Subject } from '@/store/types';
import { deckStats, isDue } from './srs';

interface Ctx {
  subjects: Subject[];
  decks: Deck[];
  cards: Record<string, Card>;
  cardStates: Record<string, CardState>;
}

export function pickQuests(ctx: Ctx, now = Date.now()): QuestDef[] {
  const quests: QuestDef[] = [];
  // 1. Review cards in the subject with the most due cards (or the most started cards).
  const dueBySubject: Record<string, number> = {};
  const deckSubject: Record<string, string> = {};
  ctx.decks.forEach((d) => (deckSubject[d.id] = d.subjectId));
  for (const c of Object.values(ctx.cards)) {
    const s = ctx.cardStates[c.id];
    const sub = deckSubject[c.deckId];
    if (!sub) continue;
    dueBySubject[sub] = (dueBySubject[sub] ?? 0) + (isDue(s, now) ? 2 : s?.seen ? 0.01 : 0);
  }
  const subj = [...ctx.subjects].sort((a, b) => (dueBySubject[b.id] ?? 0) - (dueBySubject[a.id] ?? 0))[0];
  if (subj) {
    quests.push({
      id: `review-${subj.id}`,
      kind: 'review-subject',
      title: `Review 10 ${subj.name.toLowerCase()} cards`,
      goal: 10,
      subjectId: subj.id,
    });
  }
  // 2. Practice the weakest started topic.
  const started = ctx.decks
    .map((d) => ({ d, st: deckStats(d, ctx.cards, ctx.cardStates, now) }))
    .filter((x) => x.st.total > 0 && x.st.state !== 'new' && x.st.state !== 'mastered')
    .sort((a, b) => a.st.mastery - b.st.mastery);
  const weak = started[0]?.d ?? ctx.decks.find((d) => deckStats(d, ctx.cards, ctx.cardStates, now).state === 'new');
  if (weak) {
    const sub = ctx.subjects.find((s) => s.id === weak.subjectId);
    quests.push({
      id: `weak-${weak.id}`,
      kind: 'weak-deck',
      title: `Practice your weakest ${sub ? sub.name.toLowerCase() + ' ' : ''}topic: ${weak.title}`,
      goal: 1,
      deckId: weak.id,
    });
  }
  quests.push({ id: 'correct-8', kind: 'correct', title: 'Answer 8 questions correctly', goal: 8 });
  return quests;
}

export function questProgress(q: QuestDef, daily: Daily) {
  if (q.kind === 'review-subject') return Math.min(q.goal, daily.reviewedBySubject[q.subjectId!] ?? 0);
  if (q.kind === 'weak-deck') return Math.min(q.goal, daily.sessionsByDeck[q.deckId!] ?? 0);
  return Math.min(q.goal, daily.correct);
}
