import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { useCalmMotion } from '@/lib/feedback';

/**
 * The Forgetting Fog: a brooding cloud with two honey-bright eyes.
 * `hits` increments each time it takes damage and makes it shake; `hp` (0–1) dims and shrinks it as it fades.
 */
export function FogBoss({ size = 120, hits = 0, hp = 1, defeated = false }: { size?: number; hits?: number; hp?: number; defeated?: boolean }) {
  const calm = useCalmMotion();
  const float = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (calm) return;
    float.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [calm, float]);

  useEffect(() => {
    if (!hits || calm) return;
    shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [hits, calm, shake]);

  const a = useAnimatedStyle(() => ({ transform: [{ translateY: (float.value - 0.5) * size * 0.08 }, { translateX: shake.value }] }));
  const S = size;
  const fade = defeated ? 0.25 : 0.55 + hp * 0.45;
  return (
    <Animated.View
      accessible
      accessibilityLabel={defeated ? 'The Forgetting Fog, defeated' : `The Forgetting Fog, ${Math.round(hp * 100)} percent strength`}
      style={[{ width: S * 1.5, height: S }, a]}>
      <View style={{ opacity: fade, transform: [{ scale: defeated ? 0.8 : 0.82 + hp * 0.18 }] }}>
        <Svg width={S * 1.5} height={S} viewBox="0 0 150 100">
          <Defs>
            <RadialGradient id="fog" cx="50%" cy="35%" r="75%">
              <Stop offset="0" stopColor="#8E7DB8" />
              <Stop offset="0.6" stopColor="#5E4C86" />
              <Stop offset="1" stopColor="#3B2F55" />
            </RadialGradient>
            <RadialGradient id="fogEye" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF4DE" />
              <Stop offset="0.45" stopColor="#F6CB6C" />
              <Stop offset="1" stopColor="#E9A93B" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* wispy body */}
          <Ellipse cx={75} cy={64} rx={62} ry={26} fill="url(#fog)" />
          <Circle cx={36} cy={52} r={24} fill="url(#fog)" />
          <Circle cx={62} cy={36} r={30} fill="url(#fog)" />
          <Circle cx={96} cy={40} r={26} fill="url(#fog)" />
          <Circle cx={118} cy={58} r={22} fill="url(#fog)" />
          <Path d="M20 78 Q40 90 60 80 T100 82 T132 76" stroke="#8E7DB8" strokeOpacity={0.5} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* eyes */}
          {defeated ? (
            <>
              <Path d="M54 50 L66 58 M66 50 L54 58" stroke="#FFF4DE" strokeWidth={4} strokeLinecap="round" />
              <Path d="M84 50 L96 58 M96 50 L84 58" stroke="#FFF4DE" strokeWidth={4} strokeLinecap="round" />
            </>
          ) : (
            <>
              <Circle cx={60} cy={52} r={12} fill="url(#fogEye)" />
              <Circle cx={90} cy={52} r={12} fill="url(#fogEye)" />
              <Ellipse cx={61} cy={53} rx={4} ry={6} fill="#221B36" />
              <Ellipse cx={91} cy={53} rx={4} ry={6} fill="#221B36" />
              <Path d="M50 40 L68 46 M100 40 L82 46" stroke="#221B36" strokeWidth={3.5} strokeLinecap="round" />
              <Path d="M66 70 Q75 64 84 70" stroke="#221B36" strokeWidth={3.5} strokeLinecap="round" fill="none" />
            </>
          )}
        </Svg>
      </View>
    </Animated.View>
  );
}
