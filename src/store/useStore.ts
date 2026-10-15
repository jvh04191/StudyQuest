import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { buildSeed } from '@/data/seed';
import { CHEST_ITEMS, DEFAULT_LOOK, lockedReset, type Look } from '@/lib/avatar';
import { ACHIEVEMENTS, ACORNS_PER_QUEST, HEARTS_MAX, levelFromXp, newPlayer, REST_MS, SKIP_COST, unlocksAt, XP } from '@/lib/progression';
import { pickQuests, questProgress } from '@/lib/quests';
import { cardStatus, deckStats, freshState, isDue, modeFor, schedule, typedEligible } from '@/lib/srs';
import { DAY, dayKey, shuffle, uid, yesterdayKey } from '@/lib/util';
import { subjectPalette } from '@/theme/tokens';
import type {
  ActiveSession,
  Card,
  CardState,
  Daily,
  Deck,
  ID,
  ItemMode,
  ItemResult,
  Player,
  Prefs,
  QueueItem,
  SessionKind,
  SessionRecord,
  Subject,
  TestMode,
  XpLine,
} from './types';

export interface DraftCard {
  front: string;
  back: string;
  detail?: string;
  hint?: string;
  distractors?: string[];
  aliases?: string[];
  source?: Card['source'];
}

interface Data {
  subjects: Subject[];
  decks: Deck[];
  cards: Record<ID, Card>;
  cardStates: Record<ID, CardState>;
  player: Player;
  prefs: Prefs;
  daily: Daily;
  active: ActiveSession | null;
  history: SessionRecord[];
  lit: ID[];
}

export interface AnswerInput {
  correct: boolean;
  firstTry: boolean;
  usedHint: boolean;
  rating: 1 | 2 | 3 | 4;
}

interface Actions {
  ensureToday: () => void;
  /** Refill hearts when a rest has run out. Returns true if hearts were refilled. */
  tickHearts: () => boolean;
  /** Skip the rest according to the hearts setting. Returns false if not allowed (or too few acorns). */
  skipRest: () => boolean;
  /** Open a quest's treasure chest and apply the loot. */
  openChest: (recordId: ID) => void;
  startSession: (kind: SessionKind, opts?: { deckIds?: ID[]; subjectId?: ID; testMode?: TestMode; count?: number; minutes?: number }) => ID | null;
  answer: (input: AnswerInput) => ItemResult | null;
  finishSession: () => SessionRecord | null;
  abandonSession: () => void;
  markRewardSeen: (id: ID) => void;
  consumeLit: () => void;
  addSubject: (name: string) => Subject;
  addDeck: (input: { subjectId: ID; title: string; summary?: string; source: Deck['source']; cards: DraftCard[] }) => Deck;
  updateDeck: (id: ID, patch: Partial<Pick<Deck, 'title' | 'summary'>>) => void;
  deleteDeck: (id: ID) => void;
  deleteSubject: (id: ID) => void;
  addCards: (deckId: ID, cards: DraftCard[]) => void;
  updateCard: (id: ID, patch: Partial<DraftCard>) => void;
  setHardChoices: (choices: Record<ID, string[]>) => void;
  deleteCard: (id: ID) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setPlayer: (p: Partial<Pick<Player, 'name' | 'novaStyle'>>) => void;
  setLook: (p: Partial<Look>) => void;
  /** Back to level 1 with every card new. Keeps all subjects, decks and cards. */
  resetProgress: () => void;
  /** Remove everything and start over with the starter decks at level 1. */
  eraseEverything: () => void;
}

export type StoreState = Data & Actions;

function emptyDaily(date: string): Daily {
  return { date, quests: [], reviewed: 0, correct: 0, reviewedBySubject: {}, sessionsByDeck: {}, cardXp: {}, questsDone: [], bossWins: {} };
}

function initialData(withProgress = true): Data {
  const seed = buildSeed(Date.now(), withProgress);
  const data: Data = {
    ...seed,
    prefs: { sound: false, motion: 'system', dailyGoal: 20, novaDock: false, heartsMode: 'acorns', homeStyle: 'trail' },
    daily: emptyDaily(dayKey()),
    active: null,
    history: [],
    lit: [],
  };
  data.daily.quests = pickQuests(data);
  return data;
}

const MAP_W = 1000;
const MAP_H = 640;
const REGION_SLOTS = [
  { cx: 500, cy: 110 },
  { cx: 500, cy: 560 },
  { cx: 120, cy: 560 },
  { cx: 880, cy: 90 },
];

function placeDeck(subject: Subject, decks: Deck[]) {
  const mine = decks.filter((d) => d.subjectId === subject.id);
  const taken = decks.map((d) => ({ x: d.x, y: d.y }));
  for (let ring = 0; ring < 4; ring++) {
    const r = ring === 0 && mine.length === 0 ? 0 : 70 + ring * 55;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + ring * 0.6 + mine.length;
      const x = Math.round(subject.cx + Math.cos(a) * r);
      const y = Math.round(subject.cy + Math.sin(a) * r * 0.8);
      if (x < 50 || x > MAP_W - 50 || y < 50 || y > MAP_H - 50) continue;
      if (taken.every((t) => Math.hypot(t.x - x, t.y - y) > 80)) return { x, y };
      if (r === 0) break;
    }
  }
  return { x: subject.cx + 40, y: subject.cy + 40 };
}

function buildQueue(
  kind: SessionKind,
  deckIds: ID[],
  s: Data,
  now: number,
  test?: { mode?: TestMode; count?: number },
): QueueItem[] {
  const inDecks = (c: Card) => deckIds.includes(c.deckId);
  const all = Object.values(s.cards);
  const st = (c: Card) => s.cardStates[c.id];
  const optionsFor = (c: Card) => shuffle([c.back, ...c.distractors.filter(Boolean).slice(0, 3)]);
  const item = (c: Card, boss = false): QueueItem => {
    const mode = modeFor(c, st(c), boss);
    return { key: uid('q'), cardId: c.id, mode, options: mode === 'mc' ? optionsFor(c) : undefined };
  };

  if (kind === 'test') {
    // A practice test covers the whole deck in random order, asked the way the learner chose.
    const picked = shuffle(all.filter(inDecks)).slice(0, test?.count ?? 1000);
    const want = test?.mode ?? 'mixed';
    const others = all.filter(inDecks);
    const gapOf = (c: Card) => {
      const base = c.detail || '';
      const i = base.toLowerCase().indexOf(c.back.toLowerCase());
      return c.back.length >= 3 && i >= 0 ? `${base.slice(0, i)}_____${base.slice(i + c.back.length)}` : undefined;
    };
    const wrongFor = (c: Card) => {
      const pool = [...c.distractors.filter(Boolean), ...shuffle(others.filter((o) => o.id !== c.id).map((o) => o.back))].filter((x) => x.toLowerCase() !== c.back.toLowerCase());
      return pool.length ? (c.distractors.filter(Boolean).length ? shuffle(c.distractors.filter(Boolean))[0] : pool[0]) : undefined;
    };
    return picked.map((c, i) => {
      const hasChoices = c.distractors.filter(Boolean).length >= 2;
      const typed = typedEligible(c);
      const asTyped: ItemMode = typed ? 'typed' : hasChoices ? 'mc' : 'flash';
      const asChoice: ItemMode = hasChoices ? 'mc' : typed ? 'typed' : 'flash';
      const tf = (): QueueItem | undefined => {
        const wrong = wrongFor(c);
        if (!wrong) return undefined;
        const claimTrue = Math.random() < 0.5;
        return { key: uid('q'), cardId: c.id, mode: 'mc', options: ['True', 'False'], claim: claimTrue ? c.back : wrong, claimTrue };
      };
      const blank = (): QueueItem | undefined => {
        const gap = gapOf(c);
        return gap && typed ? { key: uid('q'), cardId: c.id, mode: 'typed', blank: gap } : undefined;
      };
      const plain = (m: ItemMode): QueueItem => ({ key: uid('q'), cardId: c.id, mode: m, options: m === 'mc' ? optionsFor(c) : undefined });
      switch (want) {
        case 'flash': return plain('flash');
        case 'typed': return plain(asTyped);
        case 'mc': return plain(asChoice);
        case 'tf': return tf() ?? plain(asChoice);
        case 'blank': return blank() ?? plain(asTyped);
        case 'free': return { key: uid('q'), cardId: c.id, mode: 'typed', free: true };
        default: {
          const cycle = [() => plain(asChoice), tf, () => plain(asTyped), blank][i % 4];
          return cycle() ?? plain(i % 2 === 0 ? asChoice : asTyped);
        }
      }
    });
  }

  if (kind === 'boss') {
    const pool = all.filter(inDecks);
    const seen = shuffle(pool.filter((c) => st(c)?.seen));
    const fresh = shuffle(pool.filter((c) => !st(c)?.seen));
    // Spread questions across topics.
    const picked: Card[] = [];
    const byDeck = new Map<ID, Card[]>();
    [...seen, ...fresh].forEach((c) => byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c]));
    while (picked.length < 8 && [...byDeck.values()].some((l) => l.length)) {
      for (const list of byDeck.values()) {
        const c = list.shift();
        if (c && picked.length < 8) picked.push(c);
      }
    }
    return picked.map((c) => {
      const mode = modeFor(c, st(c), true);
      const m = mode === 'flash' ? 'mc' : mode;
      return { key: uid('q'), cardId: c.id, mode: m, options: m === 'mc' ? optionsFor(c) : undefined };
    });
  }

  let chosen: Card[];
  if (kind === 'review') {
    chosen = all.filter((c) => isDue(st(c), now)).sort((a, b) => st(a)!.due - st(b)!.due).slice(0, 12);
  } else if (kind === 'missed') {
    const recentMissed = new Set(s.history.slice(0, 5).flatMap((h) => h.missed));
    chosen = all
      .filter((c) => recentMissed.has(c.id) || (st(c)?.lapses ?? 0) > 0)
      .sort((a, b) => (st(b)?.lapses ?? 0) - (st(a)?.lapses ?? 0))
      .slice(0, 10);
  } else {
    const pool = all.filter(inDecks);
    const due = pool.filter((c) => isDue(st(c), now)).sort((a, b) => st(a)!.due - st(b)!.due);
    const fresh = pool.filter((c) => !st(c)?.seen).slice(0, 5);
    const rest = pool
      .filter((c) => st(c)?.seen && !isDue(st(c), now))
      .sort((a, b) => st(a)!.due - st(b)!.due);
    chosen = [...due, ...fresh, ...rest].slice(0, 8);
  }

  const queue: QueueItem[] = chosen.map((c) => item(c));
  // After each new card is learned, add a quick check a few items later.
  const out: QueueItem[] = [];
  const pending: { at: number; item: QueueItem }[] = [];
  queue.forEach((q) => {
    out.push(q);
    if (q.mode === 'flash' && !st(s.cards[q.cardId])?.seen) {
      const c = s.cards[q.cardId];
      const hasChoices = c.distractors.filter(Boolean).length >= 2;
      pending.push({
        at: out.length + 2,
        item: { key: uid('q'), cardId: c.id, mode: hasChoices ? 'mc' : 'typed', retry: 'check', options: hasChoices ? optionsFor(c) : undefined },
      });
    }
    while (pending.length && pending[0].at <= out.length) out.push(pending.shift()!.item);
  });
  pending.forEach((p) => out.push(p.item));
  return out;
}

// AsyncStorage throws when rendered outside a browser on web (server rendering); fall back to no-op.
const safeStorage: StateStorage = {
  getItem: async (k) => {
    if (typeof window === 'undefined') return null;
    try {
      return await AsyncStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: async (k, v) => {
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.setItem(k, v);
    } catch {}
  },
  removeItem: async (k) => {
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.removeItem(k);
    } catch {}
  },
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      ensureToday: () => {
        const s = get();
        const today = dayKey();
        if (s.daily.date === today && s.daily.quests.length) return;
        const daily = emptyDaily(today);
        daily.quests = pickQuests(s);
        const player = { ...s.player };
        if (player.lastStudyDate && player.lastStudyDate !== today && player.lastStudyDate !== yesterdayKey()) {
          player.streak = 0;
        }
        set({ daily, player });
      },

      tickHearts: () => {
        const p = get().player;
        if (p.restEndsAt && Date.now() >= p.restEndsAt) {
          set({ player: { ...p, hearts: HEARTS_MAX, restEndsAt: undefined } });
          return true;
        }
        return false;
      },

      skipRest: () => {
        const s = get();
        const mode = s.prefs.heartsMode;
        if (mode === 'wait') return false;
        if (mode === 'acorns' && s.player.acorns < SKIP_COST) return false;
        const acorns = mode === 'acorns' ? s.player.acorns - SKIP_COST : s.player.acorns;
        set({ player: { ...s.player, acorns, hearts: HEARTS_MAX, restEndsAt: undefined } });
        return true;
      },

      openChest: (recordId) => {
        const s = get();
        const rec = s.history.find((h) => h.id === recordId);
        if (!rec || !rec.chest || rec.chestOpened) return;
        const player: Player = { ...s.player, found: [...s.player.found] };
        player.acorns += rec.chest.acorns;
        if (rec.chest.itemId && !player.found.includes(rec.chest.itemId)) player.found.push(rec.chest.itemId);
        set({ player, history: s.history.map((h) => (h.id === recordId ? { ...h, chestOpened: true } : h)) });
      },

      startSession: (kind, opts = {}) => {
        get().ensureToday();
        get().tickHearts();
        const s = get();
        const now = Date.now();
        let deckIds = opts.deckIds ?? [];
        let title = 'Quest';
        if (kind === 'boss' && opts.subjectId) {
          deckIds = s.decks.filter((d) => d.subjectId === opts.subjectId).map((d) => d.id);
          title = `Boss battle · ${s.subjects.find((x) => x.id === opts.subjectId)?.name ?? ''}`;
        } else if (kind === 'test') {
          title = deckIds.length === 1 ? `Test · ${s.decks.find((d) => d.id === deckIds[0])?.title ?? 'deck'}` : 'Practice test';
        } else if (kind === 'review') {
          deckIds = s.decks.map((d) => d.id);
          title = 'Daily review';
        } else if (kind === 'missed') {
          deckIds = s.decks.map((d) => d.id);
          title = 'Practice what you missed';
        } else {
          title = s.decks.find((d) => d.id === deckIds[0])?.title ?? 'Quest';
        }
        const queue = buildQueue(kind, deckIds, s, now, { mode: opts.testMode, count: opts.count });
        if (!queue.length) return null;
        const id = uid('s');
        set({
          active: {
            id, kind, title, deckIds, subjectId: opts.subjectId, queue, index: 0, results: [],
            xpEarned: 0, xpStart: s.player.xp, startedAt: now, testMode: kind === 'test' ? opts.testMode ?? 'mixed' : undefined,
            endsAt: kind === 'test' && opts.minutes ? now + opts.minutes * 60000 : undefined,
          },
        });
        return id;
      },

      answer: (input) => {
        const s = get();
        const a = s.active;
        if (!a || a.recordId) return null;
        const item = a.queue[a.index];
        if (!item) return null;
        const card = s.cards[item.cardId];
        if (!card) {
          set({ active: { ...a, index: a.index + 1 } });
          return null;
        }
        const now = Date.now();
        const today = dayKey(now);
        const prev = s.cardStates[card.id] ?? freshState(now);
        const wasDue = isDue(prev, now);
        const quiz = item.mode !== 'flash';
        const deck = s.decks.find((d) => d.id === card.deckId);
        const wasNewDeck = deck ? deckStats(deck, s.cards, s.cardStates, now).state === 'new' : false;

        // Scheduling
        let rating = input.rating;
        if (quiz && input.correct && (!input.firstTry || input.usedHint)) rating = Math.min(rating, 2) as 2;
        if (quiz && !input.correct) rating = 1;
        const proved = quiz && input.correct && input.firstTry && !input.usedHint && rating >= 3;
        let next: CardState;
        if (item.retry === 'retry' && (quiz ? !input.correct : rating === 1)) {
          // A failed replay is practice, not a fresh lapse: keep the schedule as it was.
          next = { ...prev, lastReviewed: now };
        } else if (item.retry === 'check' && input.correct) {
          // Already scheduled when the card was learned a moment ago; only record proof.
          next = { ...prev, demonstrated: prev.demonstrated || proved, lastReviewed: now };
        } else {
          next = schedule(prev, rating, proved, now);
        }

        // XP — each card can pay out once per day for learning and once for answering.
        const key = `${card.id}:${quiz ? 'q' : 'f'}`;
        const daily = { ...s.daily, cardXp: { ...s.daily.cardXp }, reviewedBySubject: { ...s.daily.reviewedBySubject } };
        const player: Player = { ...s.player, totals: { ...s.player.totals } };
        let xp = 0;
        let xpNote: string | undefined;
        const earns = !quiz || input.correct;
        if (earns && daily.cardXp[key]) {
          xpNote = 'Already earned today';
        } else if (earns) {
          xp = quiz ? (input.firstTry && !input.usedHint ? XP.correctFirst : XP.correctAfterHelp) : XP.flash;
          if (wasDue) xp += XP.dueBonus;
          daily.cardXp[key] = true;
          if (item.retry === 'retry') {
            player.totals.improvements += 1;
            xpNote = 'Comeback';
          } else if (wasDue) xpNote = 'Review on time';
        }

        // Daily counters and streak
        if (!item.retry) {
          daily.reviewed += 1;
          const sub = deck?.subjectId;
          if (sub) daily.reviewedBySubject[sub] = (daily.reviewedBySubject[sub] ?? 0) + 1;
        }
        if (quiz && input.correct) {
          daily.correct += 1;
          player.totals.correct += 1;
        }
        player.totals.reviews += 1;
        if (player.lastStudyDate !== today) {
          player.streak = player.lastStudyDate === yesterdayKey(now) ? player.streak + 1 : 1;
          player.lastStudyDate = today;
        }
        player.xp += xp;

        // Hearts: a wrong answer costs one; at zero the explorer has to rest.
        let heartLost = false;
        if (quiz && !input.correct && item.retry !== 'retry' && a.kind !== 'test' && s.prefs.heartsMode !== 'off' && player.hearts > 0) {
          player.hearts -= 1;
          heartLost = true;
          if (player.hearts === 0) player.restEndsAt = now + REST_MS;
        }

        const result: ItemResult = {
          cardId: card.id, deckId: card.deckId, mode: item.mode, correct: quiz ? input.correct : rating >= 3,
          firstTry: input.firstTry, usedHint: input.usedHint, rating, xp, xpNote, wasDue, retry: !!item.retry, proved, heartLost,
        };

        // Anything missed comes back in a later round as typed recall, and keeps coming back until it is answered right.
        const queue = a.queue.slice();
        const missed = quiz ? !input.correct : rating === 1;
        const alreadyRetried = queue.some((q, i) => i > a.index && q.cardId === card.id);
        if (missed && !alreadyRetried) {
          // Active recall either way: type short answers; for long ones, recall it, flip the card and rate yourself.
          const mode: ItemMode = typedEligible(card) ? 'typed' : 'flash';
          queue.splice(Math.min(a.index + 3, queue.length), 0, { key: uid('q'), cardId: card.id, mode, retry: 'retry', round: (item.round ?? 1) + 1 });
        }

        const decks = s.decks.map((d) => (d.id === card.deckId ? { ...d, lastStudied: now } : d));
        set({
          cardStates: { ...s.cardStates, [card.id]: next },
          daily,
          player,
          decks,
          lit: wasNewDeck && deck && !s.lit.includes(deck.id) ? [...s.lit, deck.id] : s.lit,
          active: { ...a, queue, index: a.index + 1, results: [...a.results, result], xpEarned: a.xpEarned + xp },
        });
        return result;
      },

      finishSession: () => {
        const s = get();
        const a = s.active;
        if (!a) return null;
        if (a.recordId) return s.history.find((h) => h.id === a.recordId) ?? null;
        const now = Date.now();
        const results = a.results;
        const quizzes = results.filter((r) => r.mode !== 'flash');
        const firstTryCorrect = quizzes.filter((r) => r.correct && r.firstTry && !r.retry).length;
        const firstTries = quizzes.filter((r) => !r.retry).length;
        const accuracy = firstTries ? firstTryCorrect / firstTries : results.length ? results.filter((r) => r.correct).length / results.length : 0;
        const itemXp = results.reduce((n, r) => n + r.xp, 0);
        const lines: XpLine[] = [];
        if (itemXp) lines.push({ label: 'Cards and questions', xp: itemXp });
        let bonus = 0;
        const player: Player = { ...s.player, totals: { ...s.player.totals }, achievements: { ...s.player.achievements } };
        const daily: Daily = { ...s.daily, sessionsByDeck: { ...s.daily.sessionsByDeck }, questsDone: [...s.daily.questsDone], bossWins: { ...s.daily.bossWins } };

        if (results.length >= 4 && itemXp > 0) {
          const b = XP.sessionBase + Math.round(accuracy * XP.sessionAccuracy);
          lines.push({ label: `Quest complete · ${Math.round(accuracy * 100)}% accuracy`, xp: b });
          bonus += b;
        }
        let bossWon: boolean | undefined;
        if (a.kind === 'boss') {
          bossWon = firstTries > 0 && accuracy >= 0.7;
          if (bossWon && a.subjectId && !daily.bossWins[a.subjectId]) {
            lines.push({ label: 'Boss defeated', xp: XP.boss });
            bonus += XP.boss;
            daily.bossWins[a.subjectId] = true;
          }
          if (bossWon) player.totals.bossWins += 1;
        }
        if (results.length) {
          player.totals.sessions += 1;
          a.deckIds.forEach((d) => {
            if (results.some((r) => r.deckId === d)) daily.sessionsByDeck[d] = (daily.sessionsByDeck[d] ?? 0) + 1;
          });
        }
        const wasAllDone = daily.quests.length > 0 && daily.quests.every((q) => daily.questsDone.includes(q.id));
        for (const q of daily.quests) {
          if (!daily.questsDone.includes(q.id) && questProgress(q, daily) >= q.goal) {
            daily.questsDone.push(q.id);
            lines.push({ label: `Daily quest · ${q.title}`, xp: XP.quest });
            bonus += XP.quest;
          }
        }
        player.xp += bonus;

        // Acorns and a treasure chest for a finished quest; a bigger chest when the daily trail is complete.
        const questDone = results.length >= 4 && itemXp > 0;
        const trailDone = !wasAllDone && daily.quests.length > 0 && daily.quests.every((q) => daily.questsDone.includes(q.id));
        const acorns = questDone ? ACORNS_PER_QUEST : 0;
        player.acorns += acorns;
        let chest: SessionRecord['chest'];
        if (questDone) {
          const unfound = CHEST_ITEMS.filter((i) => !player.found.includes(i.id));
          const item = unfound.length && Math.random() < 0.5 ? unfound[Math.floor(Math.random() * unfound.length)] : undefined;
          chest = { acorns: 10 + Math.floor(Math.random() * 16) + (trailDone ? 30 : 0), itemId: item?.id, trail: trailDone || undefined };
        }

        // Achievements
        const earned: string[] = [];
        const grant = (id: string, cond: boolean) => {
          if (cond && !player.achievements[id]) {
            player.achievements[id] = now;
            earned.push(id);
          }
        };
        const levelBefore = levelFromXp(a.xpStart);
        const levelAfter = levelFromXp(player.xp);
        grant('first-quest', player.totals.sessions >= 1);
        grant('flawless', firstTries >= 6 && firstTryCorrect === firstTries);
        grant('comeback', player.totals.improvements >= 5);
        grant('boss', !!bossWon);
        grant('streak-3', player.streak >= 3);
        grant(
          'cartographer',
          s.decks.some((d) => a.deckIds.includes(d.id) && deckStats(d, s.cards, s.cardStates, now).state === 'mastered'),
        );
        grant('level-5', levelAfter >= 5);
        const unlocks: string[] = [];
        for (let l = levelBefore + 1; l <= levelAfter; l++) unlocks.push(...unlocksAt(l));

        const record: SessionRecord = {
          id: a.id,
          kind: a.kind,
          title: a.title,
          deckIds: a.deckIds,
          finishedAt: now,
          answered: quizzes.length,
          correct: quizzes.filter((r) => r.correct).length,
          firstTryCorrect,
          reviewed: new Set(results.map((r) => r.cardId)).size,
          provenNow: new Set(results.filter((r) => r.proved).map((r) => r.cardId)).size,
          missed: [...new Set(results.filter((r) => !r.correct).map((r) => r.cardId))],
          xpLines: lines,
          xpTotal: itemXp + bonus,
          xpBefore: a.xpStart,
          xpAfter: player.xp,
          levelBefore,
          levelAfter,
          newAchievements: earned,
          newUnlocks: unlocks,
          bossWon,
          testMode: a.testMode,
          rewardSeen: false,
          acorns,
          chest,
        };
        set({
          player,
          daily,
          history: [record, ...s.history].slice(0, 40),
          active: { ...a, recordId: record.id },
        });
        return record;
      },

      abandonSession: () => {
        const a = get().active;
        if (a && a.results.length && !a.recordId) get().finishSession();
        set({ active: null });
      },

      markRewardSeen: (id) =>
        set((s) => ({ history: s.history.map((h) => (h.id === id ? { ...h, rewardSeen: true } : h)) })),

      consumeLit: () => set({ lit: [] }),

      addSubject: (name) => {
        const s = get();
        const used = new Set(s.subjects.map((x) => `${x.cx},${x.cy}`));
        const slot = REGION_SLOTS.find((p) => !used.has(`${p.cx},${p.cy}`)) ?? REGION_SLOTS[s.subjects.length % REGION_SLOTS.length];
        const subject: Subject = {
          id: uid('sub'),
          name: name.trim(),
          color: subjectPalette[s.subjects.length % subjectPalette.length],
          art: 'generic',
          cx: slot.cx,
          cy: slot.cy,
          createdAt: Date.now(),
        };
        set({ subjects: [...s.subjects, subject] });
        return subject;
      },

      addDeck: ({ subjectId, title, summary, source, cards }) => {
        const s = get();
        const subject = s.subjects.find((x) => x.id === subjectId)!;
        const pos = placeDeck(subject, s.decks);
        const siblings = s.decks.filter((d) => d.subjectId === subjectId);
        const nearest = siblings.sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y))[0];
        const deck: Deck = {
          id: uid('d'),
          subjectId,
          title: title.trim() || 'Untitled deck',
          summary,
          source,
          x: pos.x,
          y: pos.y,
          links: nearest ? [nearest.id] : [],
          createdAt: Date.now(),
        };
        const newCards: Record<ID, Card> = {};
        const newStates: Record<ID, CardState> = {};
        cards.forEach((c) => {
          const id = uid('c');
          newCards[id] = toCard(id, deck.id, c);
          newStates[id] = freshState();
        });
        const player = { ...s.player, achievements: { ...s.player.achievements } };
        if (!player.achievements.author) player.achievements.author = Date.now();
        set({
          decks: [...s.decks, deck],
          cards: { ...s.cards, ...newCards },
          cardStates: { ...s.cardStates, ...newStates },
          player,
        });
        return deck;
      },

      updateDeck: (id, patch) => set((s) => ({ decks: s.decks.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

      deleteDeck: (id) => set((s) => removeDecks(s, [id])),

      deleteSubject: (id) =>
        set((s) => {
          const ids = s.decks.filter((d) => d.subjectId === id).map((d) => d.id);
          const next = removeDecks(s, ids);
          const subjects = s.subjects.filter((x) => x.id !== id);
          const daily = next.daily ?? s.daily;
          return {
            ...next,
            subjects,
            daily: {
              ...daily,
              quests: pickQuests({ subjects, decks: next.decks ?? s.decks, cards: next.cards ?? s.cards, cardStates: next.cardStates ?? s.cardStates }),
            },
          };
        }),

      addCards: (deckId, drafts) =>
        set((s) => {
          const cards = { ...s.cards };
          const cardStates = { ...s.cardStates };
          drafts.forEach((c) => {
            const id = uid('c');
            cards[id] = toCard(id, deckId, c);
            cardStates[id] = freshState();
          });
          return { cards, cardStates };
        }),

      updateCard: (id, patch) =>
        set((s) => {
          const c = s.cards[id];
          if (!c) return {};
          return {
            cards: {
              ...s.cards,
              [id]: {
                ...c,
                ...patch,
                detail: patch.detail ?? c.detail,
                hint: patch.hint ?? c.hint,
                distractors: patch.distractors ?? c.distractors,
                aliases: patch.aliases ?? c.aliases,
              },
            },
          };
        }),

      setHardChoices: (choices) =>
        set((s) => {
          const cards = { ...s.cards };
          for (const [id, distractors] of Object.entries(choices)) {
            if (cards[id]) cards[id] = { ...cards[id], distractors, hardChoices: true };
          }
          return { cards };
        }),

      deleteCard: (id) =>
        set((s) => {
          const cards = { ...s.cards };
          const cardStates = { ...s.cardStates };
          delete cards[id];
          delete cardStates[id];
          return { cards, cardStates };
        }),

      setPrefs: (p) =>
        set((s) => ({
          prefs: { ...s.prefs, ...p },
          // Turning hearts off ends any rest in progress.
          player: p.heartsMode === 'off' ? { ...s.player, hearts: HEARTS_MAX, restEndsAt: undefined } : s.player,
        })),
      setPlayer: (p) => set((s) => ({ player: { ...s.player, ...p } })),
      setLook: (p) => set((s) => ({ player: { ...s.player, look: { ...s.player.look, ...p } } })),

      resetProgress: () =>
        set((s) => {
          const now = Date.now();
          const cardStates: Record<ID, CardState> = {};
          Object.keys(s.cards).forEach((id) => (cardStates[id] = freshState(now)));
          const player: Player = { ...newPlayer(), name: s.player.name, look: { ...s.player.look, ...lockedReset(s.player.look) } };
          const decks = s.decks.map((d) => ({ ...d, lastStudied: undefined }));
          const daily = emptyDaily(dayKey(now));
          daily.quests = pickQuests({ subjects: s.subjects, decks, cards: s.cards, cardStates });
          return { cardStates, player, decks, daily, active: null, history: [], lit: [] };
        }),

      eraseEverything: () =>
        set((s) => {
          const data = initialData(false);
          return { ...data, prefs: s.prefs, player: { ...data.player, name: s.player.name, look: { ...s.player.look, ...lockedReset(s.player.look) } } };
        }),
    }),
    {
      name: 'studyquest-v1',
      version: 3,
      migrate: (persisted, version) => {
        const st = persisted as Partial<Data> & { player?: Player & { visor?: string; frame?: string } };
        if (version < 3) {
          // Cozy redesign: hearts, acorns and chest finds.
          if (st.player) st.player = { ...st.player, hearts: HEARTS_MAX, acorns: 0, found: [] };
          if (st.prefs) st.prefs = { ...st.prefs, heartsMode: 'acorns', homeStyle: 'trail' };
          if (st.subjects) st.subjects = st.subjects.map((x, i) => ({ ...x, color: subjectPalette[i % subjectPalette.length] }));
          if (st.history) st.history = st.history.map((h) => ({ ...h, acorns: 0, rewardSeen: true }));
        }
        if (version < 2 && st.player) {
          const old = st.player;
          st.player = { ...old, look: { ...DEFAULT_LOOK, visor: old.visor ?? 'teal', frame: old.frame ?? 'plain' } };
          delete (st.player as { visor?: string }).visor;
          delete (st.player as { frame?: string }).frame;
          if (st.prefs) st.prefs = { ...st.prefs, novaDock: false };
          // Regenerate today's quest titles (spelling update).
          if (st.daily && st.subjects && st.decks && st.cards && st.cardStates) {
            st.daily = { ...st.daily, quests: pickQuests({ subjects: st.subjects, decks: st.decks, cards: st.cards, cardStates: st.cardStates }) };
          }
        }
        return st as Data;
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        subjects: s.subjects,
        decks: s.decks,
        cards: s.cards,
        cardStates: s.cardStates,
        player: s.player,
        prefs: s.prefs,
        daily: s.daily,
        active: s.active,
        history: s.history,
        lit: s.lit,
      }),
    },
  ),
);

/** Remove decks with their cards and review history, and repair anything that pointed at them. */
function removeDecks(s: Data, ids: ID[]): Partial<Data> {
  if (!ids.length) return {};
  const gone = new Set(ids);
  const cards = { ...s.cards };
  const cardStates = { ...s.cardStates };
  Object.values(s.cards).forEach((c) => {
    if (gone.has(c.deckId)) {
      delete cards[c.id];
      delete cardStates[c.id];
    }
  });
  const decks = s.decks.filter((d) => !gone.has(d.id)).map((d) => ({ ...d, links: d.links.filter((l) => !gone.has(l)) }));
  const questsBroken = s.daily.quests.some((q) => q.deckId && gone.has(q.deckId));
  return {
    decks,
    cards,
    cardStates,
    lit: s.lit.filter((l) => !gone.has(l)),
    active: s.active?.deckIds.some((d) => gone.has(d)) ? null : s.active,
    daily: questsBroken ? { ...s.daily, quests: pickQuests({ subjects: s.subjects, decks, cards, cardStates }) } : s.daily,
  };
}

function toCard(id: ID, deckId: ID, c: DraftCard): Card {
  return {
    id,
    deckId,
    front: c.front.trim(),
    back: c.back.trim(),
    detail: (c.detail ?? '').trim(),
    hint: (c.hint ?? '').trim(),
    distractors: (c.distractors ?? []).map((d) => d.trim()).filter(Boolean).slice(0, 3),
    aliases: (c.aliases ?? []).map((d) => d.trim()).filter(Boolean),
    source: c.source,
    createdAt: Date.now(),
  };
}

// Convenience selectors
export const statusOf = (s: StoreState, cardId: ID) => cardStatus(s.cardStates[cardId]);
export const ACH = ACHIEVEMENTS;
export { DAY };
