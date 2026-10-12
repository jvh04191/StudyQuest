import type { Look } from '@/lib/avatar';

export type ID = string;

export interface Subject {
  id: ID;
  name: string;
  color: string;
  art: 'biology' | 'astronomy' | 'generic';
  /** Region center in map space (1000 x 640). */
  cx: number;
  cy: number;
  createdAt: number;
}

export interface CardSource {
  page?: number;
  quote?: string;
}

export interface Card {
  id: ID;
  deckId: ID;
  front: string;
  back: string;
  detail: string;
  hint: string;
  distractors: string[];
  aliases: string[];
  source?: CardSource;
  createdAt: number;
}

export interface DeckSource {
  kind: 'notes' | 'pdf' | 'manual' | 'seed';
  title?: string;
  /** Pasted note text (trimmed) so Nova can quote it. */
  text?: string;
}

export interface Deck {
  id: ID;
  subjectId: ID;
  title: string;
  summary?: string;
  source: DeckSource;
  /** Node position in map space. */
  x: number;
  y: number;
  links: ID[];
  createdAt: number;
  lastStudied?: number;
}

export interface CardState {
  seen: boolean;
  reps: number;
  ease: number;
  interval: number; // days
  due: number; // ms timestamp
  lapses: number;
  /** Answered a question correctly, first try, without a hint, and not a guess. */
  demonstrated: boolean;
  lastReviewed?: number;
}

export type CardStatus = 'new' | 'seen' | 'proven' | 'mastered';
export type DeckState = 'new' | 'progress' | 'review' | 'mastered';

export type ItemMode = 'flash' | 'mc' | 'typed';
export type SessionKind = 'quest' | 'boss' | 'review' | 'missed';

export interface QueueItem {
  key: string;
  cardId: ID;
  mode: ItemMode;
  /** 'retry' = another chance after a miss; 'check' = quick test right after learning a new card. */
  retry?: 'retry' | 'check';
  options?: string[];
}

export interface ItemResult {
  cardId: ID;
  mode: ItemMode;
  correct: boolean;
  firstTry: boolean;
  usedHint: boolean;
  rating: 1 | 2 | 3 | 4;
  xp: number;
  xpNote?: string;
  wasDue: boolean;
  retry: boolean;
  proved: boolean;
  deckId: ID;
  heartLost?: boolean;
}

export interface ActiveSession {
  id: ID;
  kind: SessionKind;
  title: string;
  deckIds: ID[];
  subjectId?: ID;
  queue: QueueItem[];
  index: number;
  results: ItemResult[];
  xpEarned: number;
  xpStart: number;
  startedAt: number;
  recordId?: ID;
}

export interface XpLine {
  label: string;
  xp: number;
}

export interface SessionRecord {
  id: ID;
  kind: SessionKind;
  title: string;
  deckIds: ID[];
  finishedAt: number;
  answered: number;
  correct: number;
  firstTryCorrect: number;
  reviewed: number;
  provenNow: number;
  missed: ID[];
  xpLines: XpLine[];
  xpTotal: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  newAchievements: string[];
  newUnlocks: string[];
  bossWon?: boolean;
  rewardSeen: boolean;
  /** Acorns paid for finishing the quest. */
  acorns: number;
  /** Treasure chest earned by this quest (opened on the reward screen). */
  chest?: ChestLoot;
  chestOpened?: boolean;
}

export interface ChestLoot {
  /** Acorns in the pouch. */
  acorns: number;
  /** Cosmetic id from CHEST_ITEMS, if the chest held one. */
  itemId?: string;
  /** Bigger chest for finishing the last daily quest. */
  trail?: boolean;
}

export interface QuestDef {
  id: string;
  kind: 'review-subject' | 'weak-deck' | 'correct';
  title: string;
  goal: number;
  subjectId?: ID;
  deckId?: ID;
}

export interface Daily {
  date: string;
  quests: QuestDef[];
  reviewed: number;
  correct: number;
  reviewedBySubject: Record<ID, number>;
  sessionsByDeck: Record<ID, number>;
  cardXp: Record<ID, true>;
  questsDone: string[];
  bossWins: Record<ID, true>;
}

export interface Player {
  name: string;
  xp: number;
  streak: number;
  lastStudyDate?: string;
  look: Look;
  novaStyle: string;
  achievements: Record<string, number>;
  /** Hearts left (max 5). A wrong answer costs one. */
  hearts: number;
  /** When the rest ends and hearts refill (ms), while out of hearts. */
  restEndsAt?: number;
  acorns: number;
  /** Cosmetic ids found in treasure chests. */
  found: string[];
  totals: {
    reviews: number;
    correct: number;
    improvements: number;
    sessions: number;
    bossWins: number;
  };
}

export interface Prefs {
  /** Nova stays open beside the app (true) or tucked into a side tab (false). */
  novaDock: boolean;
  sound: boolean;
  motion: 'system' | 'reduce' | 'full';
  dailyGoal: number;
  /** At zero hearts: wait 10 min, skip for acorns, skip free, or play without hearts. */
  heartsMode: HeartsMode;
  /** Home hero: the daily-quest trail, a cork notice board, or a night campfire. */
  homeStyle: 'trail' | 'board' | 'hearth';
}

export type HeartsMode = 'wait' | 'acorns' | 'free' | 'off';
