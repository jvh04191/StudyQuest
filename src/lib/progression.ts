import { DEFAULT_LOOK, lookUnlocksAt } from '@/lib/avatar';
import type { Player } from '@/store/types';

// Level L begins at 50·L·(L−1) XP: 0, 100, 300, 600, 1000, 1500, 2100, 2800…
export const levelStart = (level: number) => 50 * level * (level - 1);

export function levelFromXp(xp: number) {
  let l = 1;
  while (levelStart(l + 1) <= xp) l++;
  return l;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const start = levelStart(level);
  const end = levelStart(level + 1);
  return { level, into: xp - start, span: end - start, pct: (xp - start) / (end - start), toNext: end - xp };
}

// XP rules. XP rewards effort and accuracy; mastery is tracked separately on cards.
export const HEARTS_MAX = 5;
export const REST_MS = 10 * 60 * 1000;
export const SKIP_COST = 30;
export const ACORNS_PER_QUEST = 20;

export const XP = {
  flash: 4,
  correctFirst: 10,
  correctAfterHelp: 6,
  dueBonus: 3,
  sessionBase: 15,
  sessionAccuracy: 25,
  boss: 40,
  quest: 25,
};

export interface Cosmetic {
  id: string;
  name: string;
  level: number;
  color: string;
  color2?: string;
}

export const NOVA_STYLES: Cosmetic[] = [
  { id: 'core', name: 'Tidal glow', level: 1, color: '#5FB8AE', color2: '#2F7F78' },
  { id: 'ember', name: 'Ember glow', level: 4, color: '#F0A845', color2: '#B5673A' },
  { id: 'aurora', name: 'Aurora glow', level: 6, color: '#A99BD1', color2: '#5C7FB8' },
];

export function unlocksAt(level: number) {
  return [
    ...lookUnlocksAt(level),
    ...NOVA_STYLES.filter((v) => v.level === level).map((v) => `${v.name} for Nova`),
  ];
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  glyph: 'flag' | 'target' | 'refresh' | 'crown' | 'flame' | 'star' | 'bolt' | 'pen';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-quest', name: 'First light', desc: 'Complete your first quest', glyph: 'flag' },
  { id: 'flawless', name: 'Clear sky', desc: 'Answer every question right in a quest of 6 or more', glyph: 'target' },
  { id: 'comeback', name: 'Course correction', desc: 'Get 5 missed concepts right on a later try', glyph: 'refresh' },
  { id: 'boss', name: 'Eclipse', desc: 'Win a boss battle', glyph: 'crown' },
  { id: 'streak-3', name: 'Three nights', desc: 'Study three days in a row', glyph: 'flame' },
  { id: 'cartographer', name: 'Cartographer', desc: 'Master a whole topic', glyph: 'star' },
  { id: 'level-5', name: 'Navigator', desc: 'Reach level 5', glyph: 'bolt' },
  { id: 'author', name: 'Star charter', desc: 'Create your own deck', glyph: 'pen' },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

export function newPlayer(): Player {
  return {
    name: 'Explorer',
    xp: 0,
    streak: 0,
    look: { ...DEFAULT_LOOK },
    novaStyle: 'core',
    achievements: {},
    hearts: HEARTS_MAX,
    acorns: 0,
    found: [],
    totals: { reviews: 0, correct: 0, improvements: 0, sessions: 0, bossWins: 0 },
  };
}
