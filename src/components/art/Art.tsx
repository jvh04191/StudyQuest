import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Icon, type IconName } from '@/components/ui/Icon';

export { Avatar } from './Avatar';
import { color as C } from '@/theme/tokens';

/* ---------- Medal ---------- */
export function Medal({ glyph, size = 72, earned = true, tint = C.honey }: { glyph: IconName; size?: number; earned?: boolean; tint?: string }) {
  const id = `md-${glyph}-${earned ? 1 : 0}`;
  return (
    <View style={{ width: size, height: size * 1.12, alignItems: 'center' }}>
      <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
        <Defs>
          <RadialGradient id={`${id}-f`} cx="40%" cy="30%" r="75%">
            <Stop offset="0" stopColor={earned ? '#FBD98A' : '#EFE5D0'} />
            <Stop offset="0.6" stopColor={earned ? tint : '#DCCFB3'} />
            <Stop offset="1" stopColor={earned ? C.honeyShadow : '#C9B98F'} />
          </RadialGradient>
        </Defs>
        {/* ribbon tails */}
        <Path d="M34 74 26 110l12-7 6 9 8-36z" fill={earned ? C.moss : '#CBBE9F'} />
        <Path d="M66 74l8 36-12-7-6 9-8-36z" fill={earned ? C.mossShadow : '#B9AB8A'} />
        {/* round badge */}
        <Circle cx={50} cy={46} r={42} fill={`url(#${id}-f)`} />
        <Circle cx={50} cy={46} r={33} fill={earned ? C.surface1 : '#F6EEDD'} opacity={0.92} />
        <Circle cx={50} cy={46} r={42} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2} fill="none" />
      </Svg>
      <View style={{ position: 'absolute', top: size * 0.26, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={earned ? glyph : 'lock'} size={size * 0.38} color={earned ? C.honeyShadow : C.textFaint} strokeWidth={2.2} />
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
            <Path d="M76 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={C.honey} />
          </G>
        )}
      </Svg>
    </View>
  );
}
