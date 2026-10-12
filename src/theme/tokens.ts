// StudyQuest design tokens.
// Concept: a night-sky observatory. Midnight ground, layered charcoal instrument panels,
// warm-white type, teal for "in motion / learning", gold reserved for mastery and rewards.

export const color = {
  bg: '#080C17',
  bgDeep: '#05080F',
  surface1: '#0F1420',
  surface2: '#151B29',
  surface3: '#1D2433',
  surface4: '#262E3F',
  line: 'rgba(206, 220, 255, 0.08)',
  lineStrong: 'rgba(206, 220, 255, 0.16)',
  text: '#F2EDE3',
  textMuted: '#A9A79F',
  textFaint: '#6E7281',
  teal: '#38D6C6',
  tealSoft: 'rgba(56, 214, 198, 0.14)',
  tealDeep: '#1B8C83',
  gold: '#E7B75F',
  goldSoft: 'rgba(231, 183, 95, 0.14)',
  goldDeep: '#A87C33',
  coral: '#EE8572',
  coralSoft: 'rgba(238, 133, 114, 0.14)',
  violet: '#8C9CFF',
  sage: '#5BC79A',
  scrim: 'rgba(3, 5, 10, 0.72)',
  onAccent: '#061412',
} as const;

export const subjectPalette = ['#5BC79A', '#8C9CFF', '#E89A7A', '#C79BEA', '#6CC3E8', '#D9C46A'];

export const font = {
  display: 'Unbounded_500Medium',
  displayBold: 'Unbounded_600SemiBold',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemi: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
} as const;

// Type scale (1.25 ratio, rounded)
export const size = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

export const layout = {
  railWidth: 84,
  novaWidth: 360,
  wideBreak: 1100, // persistent Nova panel
  railBreak: 700, // side rail instead of bottom tabs
  readable: 680,
};
