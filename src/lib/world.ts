// Cozy-RPG flavour: titles for levels and names for the "lands" (subjects) on the map.
import type { Subject } from '@/store/types';
import { subjectPalette, subjectSoft } from '@/theme/tokens';

const TITLES = ['Seedling', 'Wanderer', 'Apprentice', 'Lantern-bearer', 'Pathfinder', 'Ranger', 'Warden', 'Keeper', 'Sage', 'Grove Sage'];
export const levelTitle = (level: number) => TITLES[Math.min(level, TITLES.length) - 1] ?? 'Explorer';

const LANDS = ['Mossy Grove', 'Stargazer Hill', 'Rainfall Vale', 'Amber Meadow', 'Hollow Cove', 'Fernlight Ridge'];

/** Land name for a subject: its theme if it has one, otherwise by position. */
export function landName(subject: Subject, index: number) {
  if (subject.art === 'biology') return 'Mossy Grove';
  if (subject.art === 'astronomy') return 'Stargazer Hill';
  const generic = LANDS.slice(2);
  return generic[Math.max(0, index - 2) % generic.length] ?? generic[index % generic.length];
}

/** Soft tint that goes with a land colour. */
export function landSoft(color: string) {
  const i = subjectPalette.indexOf(color);
  return i >= 0 ? subjectSoft[i] : '#F0E4CC';
}
