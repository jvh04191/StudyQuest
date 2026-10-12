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
  { id: 'core', name: 'Tidal core', level: 1, color: '#38D6C6', color2: '#1B8C83' },
  { id: 'ember', name: 'Ember core', level: 4, color: '#E7B75F', color2: '#B5673A' },
  { id: 'aurora', name: 'Aurora core', level: 6, color: '#A9B4FF', color2: '#38D6C6' },
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
    totals: { reviews: 0, correct: 0, improvements: 0, sessions: 0, bossWins: 0 },
  };
}
