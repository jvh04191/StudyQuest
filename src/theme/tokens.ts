// StudyQuest design tokens.
// Concept: a cozy RPG world. Warm parchment ground, moss-green primary, honey for XP and rewards,
// berry for hearts and mistakes. Chunky "press-down" buttons, Young Serif display, Nunito UI, Pixelify HUD numbers.
// Legacy key names (teal, gold, coral, surfaceN) are kept so older screens inherit the new palette.

export const color = {
  // ground
  bg: '#F3E9D6',
  bgDeep: '#EADCC2', // deeper parchment: inputs, wells
  track: '#E6D6B8',
  // panels
  surface1: '#FFF9EE',
  surface2: '#F8EEDA',
  surface3: '#F0E4CC',
  surface4: '#E6D6B8',
  panelBorder: '#E6D5B5',
  panelShadow: '#E0CDA8',
  divider: '#F0E4CC',
  railBg: '#EEE1C6',
  railBorder: '#E2CFAC',
  novaBg: '#FBF3E3',
  line: '#E6D5B5',
  lineStrong: '#D8C49C',
  // ink
  text: '#33291C',
  textMuted: '#7A6A52',
  textFaint: '#A8977A',
  navInactive: '#8F7F66',
  // moss (primary)
  moss: '#4E7D43',
  mossShadow: '#365A2F',
  mossSoft: '#E2ECD2',
  mossLine: '#BFD3A6',
  mossLine2: '#A9C28D',
  mossInk: '#2E4A27',
  // honey (xp, rewards)
  honey: '#E9A93B',
  honeyShadow: '#B77A1C',
  honeySoft: '#F8E6BF',
  honeyInk: '#8A5A12',
  honeyLight: '#F6CB6C',
  // berry (hearts, errors)
  berry: '#D65A4A',
  berryShadow: '#A23E31',
  berrySoft: '#F7DCD5',
  berryInk: '#6E2A21',
  flame: '#E9772E',
  acorn: '#9A6233',
  // night scenes (boss, rest)
  night: '#221B36',
  night2: '#3B2F55',
  nightRest: '#6B3F3A',
  plum: '#3B2F55',
  plumShadow: '#221B36',
  onNight: '#FFF4DE',
  onNightMuted: '#C9BEDD',
  // legacy aliases
  teal: '#4E7D43',
  tealSoft: '#E2ECD2',
  tealDeep: '#365A2F',
  gold: '#E9A93B',
  goldSoft: '#F8E6BF',
  goldDeep: '#B77A1C',
  coral: '#D65A4A',
  coralSoft: '#F7DCD5',
  violet: '#6D74B8',
  sage: '#5E8F4C',
  scrim: 'rgba(34, 27, 54, 0.55)',
  onAccent: '#FFF9EE',
} as const;

// Land colours: Mossy Grove, Stargazer Hill, Rainfall Vale, then extras.
export const subjectPalette = ['#5E8F4C', '#6D74B8', '#4F8FA8', '#C98A5A', '#A5689E', '#B59A3C'];
export const subjectSoft = ['#E2ECD2', '#E4E3F3', '#DCEBF0', '#F3E3D3', '#EEDCEB', '#F4EBC9'];

export const font = {
  display: 'YoungSerif_400Regular',
  displayBold: 'YoungSerif_400Regular',
  body: 'Nunito_600SemiBold',
  bodyMedium: 'Nunito_600SemiBold',
  bodySemi: 'Nunito_700Bold',
  bodyBold: 'Nunito_800ExtraBold',
  heavy: 'Nunito_900Black',
  pixel: 'PixelifySans_600SemiBold',
  pixelMed: 'PixelifySans_500Medium',
  pixelBold: 'PixelifySans_700Bold',
} as const;

// Type scale
export const size = {
  xs: 12,
  sm: 14,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 15, lg: 20, xl: 28, pill: 999, card: 22, map: 26 } as const;

/** Solid "press-down" depth: the 4px under-shadow colour for a fill. */
export const lip = {
  moss: color.mossShadow,
  honey: color.honeyShadow,
  berry: color.berryShadow,
  plum: color.plumShadow,
  panel: color.panelShadow,
  neutral: color.panelShadow,
} as const;

export const layout = {
  railWidth: 92,
  novaWidth: 340,
  wideBreak: 1000, // persistent Nova panel
  railBreak: 700, // side rail instead of bottom tabs
  readable: 780,
};
