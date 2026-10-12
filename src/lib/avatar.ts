// Explorer avatar: every appearance choice, with optional level locks for premium items.

export interface Look {
  skin: string;
  hair: string;
  hairColor: string;
  eyes: string;
  eyeColor: string;
  brows: string;
  mouth: string;
  facial: string;
  face: string; // blush, freckles…
  glasses: string;
  headwear: string;
  visor: string; // tint for helmet glass and goggles
  outfit: string;
  outfitColor: string;
  accessory: string;
  background: string;
  frame: string;
}

export interface Opt {
  id: string;
  name: string;
  level?: number;
  color?: string;
  color2?: string;
}

export const SKIN: Opt[] = [
  { id: 's1', name: 'Porcelain', color: '#F6DCCB' },
  { id: 's2', name: 'Peach', color: '#EFC4A4' },
  { id: 's3', name: 'Sand', color: '#DDAA7F' },
  { id: 's4', name: 'Honey', color: '#C68C5B' },
  { id: 's5', name: 'Bronze', color: '#A86E44' },
  { id: 's6', name: 'Umber', color: '#875432' },
  { id: 's7', name: 'Cocoa', color: '#663D24' },
  { id: 's8', name: 'Ebony', color: '#46291A' },
  { id: 'sx1', name: 'Starlight', color: '#B9C4F2', level: 5 },
  { id: 'sx2', name: 'Seafoam', color: '#9FE0CF', level: 7 },
];

export const HAIR: Opt[] = [
  { id: 'none', name: 'Bald' },
  { id: 'buzz', name: 'Buzz cut' },
  { id: 'short', name: 'Short' },
  { id: 'side', name: 'Side part' },
  { id: 'curly', name: 'Curly' },
  { id: 'long', name: 'Long' },
  { id: 'bob', name: 'Bob' },
  { id: 'bun', name: 'Top bun' },
  { id: 'pony', name: 'Ponytail' },
  { id: 'afro', name: 'Afro' },
  { id: 'braids', name: 'Braids' },
  { id: 'spiky', name: 'Spiky' },
  { id: 'mohawk', name: 'Mohawk', level: 3 },
];

export const HAIR_COLOR: Opt[] = [
  { id: 'black', name: 'Black', color: '#1E1A1C' },
  { id: 'dark', name: 'Dark brown', color: '#3B2619' },
  { id: 'brown', name: 'Brown', color: '#6B4126' },
  { id: 'auburn', name: 'Auburn', color: '#8E3B22' },
  { id: 'ginger', name: 'Ginger', color: '#C3602B' },
  { id: 'blond', name: 'Blond', color: '#D9B36A' },
  { id: 'platinum', name: 'Platinum', color: '#E8E1D2' },
  { id: 'gray', name: 'Silver', color: '#9AA0AA' },
  { id: 'teal', name: 'Tide', color: '#2FB9AC', level: 2 },
  { id: 'violet', name: 'Nebula', color: '#7D6BE0', level: 3 },
  { id: 'rose', name: 'Rose', color: '#E07A9B', level: 4 },
  { id: 'gold', name: 'Solar gold', color: '#E7B75F', level: 6 },
];

export const EYES: Opt[] = [
  { id: 'round', name: 'Round' },
  { id: 'happy', name: 'Happy' },
  { id: 'focused', name: 'Focused' },
  { id: 'sleepy', name: 'Sleepy' },
  { id: 'wink', name: 'Wink' },
  { id: 'wide', name: 'Wide' },
  { id: 'starry', name: 'Starry', level: 6 },
];

export const EYE_COLOR: Opt[] = [
  { id: 'brown', name: 'Brown', color: '#4A2E1E' },
  { id: 'hazel', name: 'Hazel', color: '#7A5A2C' },
  { id: 'green', name: 'Green', color: '#3E7A4E' },
  { id: 'blue', name: 'Blue', color: '#3F6FB0' },
  { id: 'gray', name: 'Gray', color: '#5E6672' },
  { id: 'amber', name: 'Amber', color: '#B07A1E' },
  { id: 'cosmic', name: 'Cosmic', color: '#38D6C6', level: 5 },
];

export const BROWS: Opt[] = [
  { id: 'soft', name: 'Soft' },
  { id: 'bold', name: 'Bold' },
  { id: 'raised', name: 'Raised' },
  { id: 'determined', name: 'Determined' },
  { id: 'none', name: 'None' },
];

export const MOUTH: Opt[] = [
  { id: 'smile', name: 'Smile' },
  { id: 'grin', name: 'Grin' },
  { id: 'neutral', name: 'Calm' },
  { id: 'open', name: 'Excited' },
  { id: 'smirk', name: 'Smirk' },
  { id: 'tongue', name: 'Playful' },
];

export const FACIAL: Opt[] = [
  { id: 'none', name: 'None' },
  { id: 'stubble', name: 'Stubble' },
  { id: 'mustache', name: 'Mustache' },
  { id: 'goatee', name: 'Goatee' },
  { id: 'beard', name: 'Full beard' },
];

export const FACE: Opt[] = [
  { id: 'none', name: 'None' },
  { id: 'blush', name: 'Blush' },
  { id: 'freckles', name: 'Freckles' },
  { id: 'mole', name: 'Beauty mark' },
  { id: 'paint', name: 'Star paint', level: 4 },
];

export const GLASSES: Opt[] = [
  { id: 'none', name: 'None' },
  { id: 'round', name: 'Round' },
  { id: 'square', name: 'Square' },
  { id: 'cat', name: 'Cat-eye' },
  { id: 'goggles', name: 'Flight goggles', level: 2 },
  { id: 'shades', name: 'Star shades', level: 3 },
  { id: 'monocle', name: 'Monocle', level: 5 },
];

export const HEADWEAR: Opt[] = [
  { id: 'none', name: 'None' },
  { id: 'helmet', name: 'Space helmet' },
  { id: 'headset', name: 'Headset' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'cap', name: 'Cap' },
  { id: 'band', name: 'Headband' },
  { id: 'antenna', name: 'Antenna band', level: 4 },
  { id: 'crown', name: 'Star crown', level: 8 },
];

export const VISOR: Opt[] = [
  { id: 'teal', name: 'Tide', color: '#38D6C6' },
  { id: 'pearl', name: 'Pearl', color: '#E9E4F2', level: 2 },
  { id: 'gold', name: 'Gilded', color: '#E7B75F', level: 4 },
  { id: 'aurora', name: 'Aurora', color: '#8C9CFF', color2: '#38D6C6', level: 6 },
  { id: 'ember', name: 'Ember', color: '#EE8572', color2: '#E7B75F', level: 8 },
];

export const OUTFIT: Opt[] = [
  { id: 'suit', name: 'Flight suit' },
  { id: 'hoodie', name: 'Hoodie' },
  { id: 'jacket', name: 'Jacket' },
  { id: 'sweater', name: 'Sweater' },
  { id: 'lab', name: 'Lab coat' },
  { id: 'tee', name: 'T-shirt' },
  { id: 'armor', name: 'Star armor', level: 5 },
  { id: 'cape', name: 'Cloak', level: 7 },
];

export const OUTFIT_COLOR: Opt[] = [
  { id: 'navy', name: 'Navy', color: '#2B3A63' },
  { id: 'slate', name: 'Slate', color: '#46506A' },
  { id: 'teal', name: 'Teal', color: '#1F8F86' },
  { id: 'forest', name: 'Forest', color: '#2F6B4C' },
  { id: 'maroon', name: 'Maroon', color: '#7A2E3B' },
  { id: 'mustard', name: 'Mustard', color: '#B8892F' },
  { id: 'plum', name: 'Plum', color: '#5B3A78' },
  { id: 'charcoal', name: 'Charcoal', color: '#2A2D34' },
  { id: 'cream', name: 'Cream', color: '#D9D2C2' },
  { id: 'coral', name: 'Coral', color: '#D86D5A', level: 3 },
  { id: 'gold', name: 'Gilded', color: '#C99A45', level: 6 },
];

export const ACCESSORY: Opt[] = [
  { id: 'none', name: 'None' },
  { id: 'patch', name: 'Mission patch' },
  { id: 'scarf', name: 'Scarf' },
  { id: 'pendant', name: 'Star pendant' },
  { id: 'straps', name: 'Backpack' },
  { id: 'tie', name: 'Bow tie' },
  { id: 'medal', name: 'Honor medal', level: 4 },
];

export const BACKGROUND: Opt[] = [
  { id: 'night', name: 'Night', color: '#24304A', color2: '#111726' },
  { id: 'teal', name: 'Lagoon', color: '#1C5C59', color2: '#0C2120' },
  { id: 'violet', name: 'Nebula', color: '#3D3470', color2: '#15122A' },
  { id: 'forest', name: 'Canopy', color: '#2A5440', color2: '#0F1E17' },
  { id: 'rose', name: 'Dusk', color: '#6A3448', color2: '#1E0F15' },
  { id: 'slate', name: 'Steel', color: '#4A5263', color2: '#1A1D24' },
  { id: 'sun', name: 'Sunrise', color: '#A2683A', color2: '#2A1A0E', level: 3 },
  { id: 'aurora', name: 'Aurora', color: '#3E8C9A', color2: '#2A1E5C', level: 6 },
];

export const FRAME: Opt[] = [
  { id: 'plain', name: 'Plain', color: '#3A4458' },
  { id: 'orbit', name: 'Orbit', color: '#38D6C6', level: 3 },
  { id: 'constellation', name: 'Constellation', color: '#E7B75F', level: 5 },
  { id: 'halo', name: 'Halo', color: '#F2EDE3', level: 7 },
];

export const DEFAULT_LOOK: Look = {
  skin: 's3',
  hair: 'short',
  hairColor: 'dark',
  eyes: 'round',
  eyeColor: 'brown',
  brows: 'soft',
  mouth: 'smile',
  facial: 'none',
  face: 'none',
  glasses: 'none',
  headwear: 'helmet',
  visor: 'teal',
  outfit: 'suit',
  outfitColor: 'navy',
  accessory: 'patch',
  background: 'night',
  frame: 'plain',
};

export interface Section {
  key: keyof Look;
  title: string;
  options: Opt[];
  swatch?: boolean;
}

export interface Category {
  id: string;
  label: string;
  sections: Section[];
}

export const CATEGORIES: Category[] = [
  { id: 'skin', label: 'Skin', sections: [{ key: 'skin', title: 'Skin tone', options: SKIN, swatch: true }, { key: 'face', title: 'Face details', options: FACE }] },
  { id: 'hair', label: 'Hair', sections: [{ key: 'hair', title: 'Style', options: HAIR }, { key: 'hairColor', title: 'Color', options: HAIR_COLOR, swatch: true }] },
  {
    id: 'eyes',
    label: 'Eyes',
    sections: [
      { key: 'eyes', title: 'Eyes', options: EYES },
      { key: 'eyeColor', title: 'Eye color', options: EYE_COLOR, swatch: true },
      { key: 'brows', title: 'Eyebrows', options: BROWS },
    ],
  },
  { id: 'mouth', label: 'Mouth', sections: [{ key: 'mouth', title: 'Expression', options: MOUTH }, { key: 'facial', title: 'Facial hair', options: FACIAL }] },
  { id: 'eyewear', label: 'Eyewear', sections: [{ key: 'glasses', title: 'Glasses', options: GLASSES }] },
  {
    id: 'headwear',
    label: 'Headwear',
    sections: [
      { key: 'headwear', title: 'Headwear', options: HEADWEAR },
      { key: 'visor', title: 'Helmet and goggle tint', options: VISOR, swatch: true },
    ],
  },
  { id: 'outfit', label: 'Outfit', sections: [{ key: 'outfit', title: 'Outfit', options: OUTFIT }, { key: 'outfitColor', title: 'Color', options: OUTFIT_COLOR, swatch: true }] },
  { id: 'extras', label: 'Extras', sections: [{ key: 'accessory', title: 'Accessory', options: ACCESSORY }] },
  {
    id: 'scene',
    label: 'Background',
    sections: [
      { key: 'background', title: 'Background', options: BACKGROUND, swatch: true },
      { key: 'frame', title: 'Frame', options: FRAME },
    ],
  },
];

export const pick = (list: Opt[], id: string) => list.find((o) => o.id === id) ?? list[0];

/** Count of unlockable items that open at a level, for the level-up screen. */
export function lookUnlocksAt(level: number) {
  const all: [Opt[], string][] = [
    [SKIN, 'skin tone'],
    [HAIR, 'hairstyle'],
    [HAIR_COLOR, 'hair color'],
    [EYES, 'eyes'],
    [EYE_COLOR, 'eye color'],
    [FACE, 'face detail'],
    [GLASSES, 'eyewear'],
    [HEADWEAR, 'headwear'],
    [VISOR, 'visor tint'],
    [OUTFIT, 'outfit'],
    [OUTFIT_COLOR, 'outfit color'],
    [ACCESSORY, 'accessory'],
    [BACKGROUND, 'background'],
    [FRAME, 'frame'],
  ];
  return all.flatMap(([list, kind]) => list.filter((o) => o.level === level).map((o) => `${o.name} ${kind}`));
}

export function randomLook(level: number, prev: Look): Look {
  const r = (list: Opt[]) => {
    const ok = list.filter((o) => (o.level ?? 1) <= level);
    return ok[Math.floor(Math.random() * ok.length)].id;
  };
  return {
    ...prev,
    skin: r(SKIN.slice(0, 8)),
    hair: r(HAIR),
    hairColor: r(HAIR_COLOR),
    eyes: r(EYES),
    eyeColor: r(EYE_COLOR),
    brows: r(BROWS),
    mouth: r(MOUTH),
    facial: Math.random() < 0.7 ? 'none' : r(FACIAL),
    face: Math.random() < 0.5 ? 'none' : r(FACE),
    glasses: Math.random() < 0.6 ? 'none' : r(GLASSES),
    headwear: r(HEADWEAR),
    visor: r(VISOR),
    outfit: r(OUTFIT),
    outfitColor: r(OUTFIT_COLOR),
    accessory: r(ACCESSORY),
    background: r(BACKGROUND),
  };
}

const LOCKABLE: [keyof Look, Opt[]][] = [
  ['skin', SKIN],
  ['hair', HAIR],
  ['hairColor', HAIR_COLOR],
  ['eyes', EYES],
  ['eyeColor', EYE_COLOR],
  ['face', FACE],
  ['glasses', GLASSES],
  ['headwear', HEADWEAR],
  ['visor', VISOR],
  ['outfit', OUTFIT],
  ['outfitColor', OUTFIT_COLOR],
  ['accessory', ACCESSORY],
  ['background', BACKGROUND],
  ['frame', FRAME],
];

/** After a progress reset to level 1, swap any locked items back to the default. */
export function lockedReset(look: Look): Partial<Look> {
  const out: Partial<Look> = {};
  for (const [key, list] of LOCKABLE) {
    const o = list.find((x) => x.id === look[key]);
    if (o?.level && o.level > 1) (out as Record<string, string>)[key] = DEFAULT_LOOK[key];
  }
  return out;
}
