import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Icon, type IconName } from '@/components/ui/Icon';

export { Avatar } from './Avatar';
import { color as C } from '@/theme/tokens';

/* ---------- Medal ---------- */
export function Medal({ glyph, size = 72, earned = true, tint = C.gold }: { glyph: IconName; size?: number; earned?: boolean; tint?: string }) {
  const id = `md-${glyph}-${earned ? 1 : 0}`;
  const rim = earned ? tint : '#3A4354';
  return (
    <View style={{ width: size, height: size * 1.12, alignItems: 'center' }}>
      <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
        <Defs>
          <LinearGradient id={`${id}-r`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={earned ? '#FFF1CF' : '#4B5468'} />
            <Stop offset="0.45" stopColor={rim} />
            <Stop offset="1" stopColor={earned ? '#7A5420' : '#262D3B'} />
          </LinearGradient>
          <RadialGradient id={`${id}-f`} cx="50%" cy="35%" r="65%">
            <Stop offset="0" stopColor={earned ? '#2A2416' : '#1A1F2A'} />
            <Stop offset="1" stopColor={earned ? '#14110A' : '#11151D'} />
          </RadialGradient>
        </Defs>
        {/* ribbon tails */}
        <Path d="M34 74 26 110l12-7 6 9 8-36z" fill={earned ? '#1B8C83' : '#2A3140'} />
        <Path d="M66 74l8 36-12-7-6 9-8-36z" fill={earned ? '#1B8C83' : '#2A3140'} />
        {/* hexagonal medal */}
        <Path d="M50 4 88 26v44L50 92 12 70V26z" fill={`url(#${id}-r)`} />
        <Path d="M50 13 80 30.5v35L50 83 20 65.5v-35z" fill={`url(#${id}-f)`} />
        <Path d="M50 13 80 30.5" stroke="#FFFFFF" strokeOpacity={earned ? 0.35 : 0.08} strokeWidth={1.2} />
      </Svg>
      <View style={{ position: 'absolute', top: size * 0.3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={earned ? glyph : 'lock'} size={size * 0.34} color={earned ? tint : '#5A6276'} strokeWidth={2} />
      </View>
    </View>
  );
}

/* ---------- Subject illustrations ---------- */
export function SubjectArt({ art, tint, size = 56 }: { art: 'biology' | 'astronomy' | 'generic'; tint: string; size?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`sa-${art}`} cx="50%" cy="45%" r="55%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.28} />
            <Stop offset="1" stopColor={tint} stopOpacity={0.04} />
          </RadialGradient>
        </Defs>
        <Rect x={2} y={2} width={96} height={96} rx={28} fill={`url(#sa-${art})`} stroke={tint} strokeOpacity={0.3} />
        {art === 'biology' && (
          <G>
            <Path d="M50 18c18 0 32 13 32 31 0 20-15 33-33 33S18 69 18 51c0-18 14-33 32-33z" fill="none" stroke={tint} strokeWidth={3} />
            <Circle cx={54} cy={48} r={11} fill={tint} fillOpacity={0.35} stroke={tint} strokeWidth={2.5} />
            <Circle cx={56} cy={46} r={4} fill={tint} />
            <Ellipse cx={33} cy={60} rx={7} ry={4} fill="none" stroke={tint} strokeWidth={2.2} transform="rotate(-25 33 60)" />
            <Path d="M30 60h6" stroke={tint} strokeWidth={1.6} />
            <Circle cx={66} cy={67} r={3} fill={tint} fillOpacity={0.8} />
            <Circle cx={36} cy={36} r={2.5} fill={tint} fillOpacity={0.8} />
            <Circle cx={70} cy={33} r={2} fill={tint} fillOpacity={0.6} />
          </G>
        )}
        {art === 'astronomy' && (
          <G>
            <Circle cx={50} cy={52} r={18} fill={tint} fillOpacity={0.3} stroke={tint} strokeWidth={3} />
            <Ellipse cx={50} cy={52} rx={34} ry={10} fill="none" stroke={tint} strokeWidth={3} transform="rotate(-18 50 52)" />
            <Path d="M33 47c6-3 14-4 22-2" stroke={tint} strokeOpacity={0.6} strokeWidth={2} fill="none" />
            <Circle cx={22} cy={24} r={2.4} fill={tint} />
            <Circle cx={78} cy={20} r={1.8} fill={tint} />
            <Circle cx={80} cy={78} r={2.2} fill={tint} />
          </G>
        )}
        {art === 'generic' && (
          <G>
            <Path d="M24 66 40 40l16 14 20-26" fill="none" stroke={tint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={24} cy={66} r={5} fill={tint} />
            <Circle cx={40} cy={40} r={5} fill={tint} />
            <Circle cx={56} cy={54} r={5} fill={tint} />
            <Path d="M76 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={C.gold} />
          </G>
        )}
      </Svg>
    </View>
  );
}

/* ---------- Starfield (static; ambient twinkle handled by the map) ---------- */
export function useStars(count: number, w: number, h: number, seed = 3) {
  return useMemo(() => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => ({ x: rnd() * w, y: rnd() * h, r: rnd() * 1.3 + 0.3, o: rnd() * 0.5 + 0.15 }));
  }, [count, w, h, seed]);
}

export function Starfield({ width, height, count = 90 }: { width: number; height: number; count?: number }) {
  const stars = useStars(count, width, height, 11);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
      {stars.map((st, i) => (
        <Circle key={i} cx={st.x} cy={st.y} r={st.r} fill={C.text} opacity={st.o} />
      ))}
    </Svg>
  );
}
