import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { useCalmMotion } from '@/lib/feedback';
import { NOVA_STYLES } from '@/lib/progression';

export type NovaMood = 'idle' | 'thinking' | 'explaining' | 'celebrating' | 'happy' | 'sleepy';

/**
 * Nova, the lantern sprite: a glowing leaf-capped egg with soft cheeks.
 * Floats ±6%, glow pulses, blinks. Moods: celebrating = happy arcs, sleepy = closed eyes.
 */
export function NovaOrb({ size = 56, mood = 'idle', styleId = 'core' }: { size?: number; mood?: NovaMood; styleId?: string }) {
  const calm = useCalmMotion();
  const st = NOVA_STYLES.find((s) => s.id === styleId) ?? NOVA_STYLES[0];
  const c1 = st.color;
  const c2 = st.color2 ?? st.color;

  const float = useSharedValue(0);
  const pulse = useSharedValue(0);
  const blink = useSharedValue(1);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (calm || mood === 'sleepy') {
      [float, pulse].forEach((v) => cancelAnimation(v));
      float.value = 0.5;
      pulse.value = mood === 'thinking' ? 0.6 : 0.3;
      return;
    }
    float.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
    const pulseDur = mood === 'explaining' ? 1400 : mood === 'thinking' ? 1000 : 2800;
    pulse.value = withRepeat(withTiming(1, { duration: pulseDur, easing: Easing.inOut(Easing.quad) }), -1, true);
    blink.value = withRepeat(
      withSequence(withDelay(3600, withTiming(0.1, { duration: 90 })), withTiming(1, { duration: 120 })),
      -1,
      false,
    );
  }, [calm, mood, float, pulse, blink]);

  useEffect(() => {
    if (mood === 'celebrating' && !calm) {
      burst.value = 0;
      burst.value = withSequence(withSpring(1, { damping: 7, stiffness: 140 }), withDelay(900, withTiming(0, { duration: 400 })));
    }
  }, [mood, calm, burst]);

  const S = size;
  const bodyA = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * S * 0.12 - burst.value * S * 0.08 }, { scale: 1 + burst.value * 0.06 }],
  }));
  const glowA = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.value * 0.45, transform: [{ scale: 0.95 + pulse.value * 0.12 }] }));
  const eyesA = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const burstA = useAnimatedStyle(() => ({ opacity: burst.value, transform: [{ scale: 0.6 + burst.value * 0.7 }] }));

  const gid = `ng-${styleId}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const eyeInk = '#2B2340';
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Nova, ${mood === 'thinking' ? 'thinking' : mood === 'celebrating' ? 'celebrating' : mood === 'sleepy' ? 'sleeping' : 'ready to help'}`}
      style={{ width: S, height: S }}>
      {/* glow */}
      <Animated.View style={[{ position: 'absolute', left: -S * 0.22, top: -S * 0.22, width: S * 1.44, height: S * 1.44 }, glowA]} pointerEvents="none">
        <Svg width={S * 1.44} height={S * 1.44}>
          <Defs>
            <RadialGradient id={`${gid}-glow`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c1} stopOpacity={0.6} />
              <Stop offset="0.62" stopColor={c1} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={S * 0.72} cy={S * 0.72} r={S * 0.72} fill={`url(#${gid}-glow)`} />
        </Svg>
      </Animated.View>

      {/* celebration sparkles */}
      <Animated.View style={[{ position: 'absolute', width: S, height: S }, burstA]} pointerEvents="none">
        <Svg width={S} height={S} viewBox="0 0 100 100">
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180;
            const x = 50 + Math.cos(r) * 46;
            const y = 50 + Math.sin(r) * 46;
            return (
              <Path
                key={a}
                d={`M${x} ${y - 5}L${x + 1.4} ${y - 1.4}L${x + 5} ${y}L${x + 1.4} ${y + 1.4}L${x} ${y + 5}L${x - 1.4} ${y + 1.4}L${x - 5} ${y}L${x - 1.4} ${y - 1.4}Z`}
                fill={a % 120 === 0 ? '#F6CB6C' : c1}
              />
            );
          })}
        </Svg>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', width: S, height: S }, bodyA]}>
        <Svg width={S} height={S} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={`${gid}-body`} cx="36%" cy="28%" r="80%">
              <Stop offset="0" stopColor="#FFFBEA" />
              <Stop offset="0.5" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </RadialGradient>
          </Defs>
          {/* leaves */}
          <Path d="M34 15 C34 5 45 1 54 3 C54 12 46 17 34 15Z" fill="#7FAE5C" />
          <Path d="M50 14 C52 6 62 3 70 7 C68 15 60 18 50 14Z" fill="#5E8F4C" />
          {/* body */}
          <Path
            d="M50 14 C74 14 87 38 87 60 C87 80 71 92 50 92 C29 92 13 80 13 60 C13 38 26 14 50 14Z"
            fill={`url(#${gid}-body)`}
          />
          <Path d="M20 76 C28 88 44 91 54 91 C40 93 24 88 20 76Z" fill="#000" opacity={0.08} />
          {/* cheeks */}
          <Ellipse cx={30} cy={66} rx={6.5} ry={3.5} fill="#FF826E" opacity={0.5} />
          <Ellipse cx={70} cy={66} rx={6.5} ry={3.5} fill="#FF826E" opacity={0.5} />
        </Svg>
        <Animated.View style={[{ position: 'absolute', width: S, height: S }, mood === 'celebrating' || mood === 'happy' || mood === 'sleepy' ? undefined : eyesA]}>
          <Svg width={S} height={S} viewBox="0 0 100 100">
            {mood === 'celebrating' || mood === 'happy' ? (
              <>
                <Path d="M33 56 Q39 47 45 56" stroke={eyeInk} strokeWidth={3.4} fill="none" strokeLinecap="round" />
                <Path d="M55 56 Q61 47 67 56" stroke={eyeInk} strokeWidth={3.4} fill="none" strokeLinecap="round" />
              </>
            ) : mood === 'sleepy' ? (
              <>
                <Path d="M33 56 Q39 61 45 56" stroke={eyeInk} strokeWidth={3.4} fill="none" strokeLinecap="round" />
                <Path d="M55 56 Q61 61 67 56" stroke={eyeInk} strokeWidth={3.4} fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <Ellipse cx={mood === 'thinking' ? 40 : 39} cy={mood === 'thinking' ? 52 : 56} rx={4.5} ry={6.5} fill={eyeInk} />
                <Ellipse cx={mood === 'thinking' ? 62 : 61} cy={mood === 'thinking' ? 52 : 56} rx={4.5} ry={6.5} fill={eyeInk} />
                <Circle cx={mood === 'thinking' ? 41.5 : 40.5} cy={mood === 'thinking' ? 49.5 : 53.5} r={1.3} fill="#fff" opacity={0.85} />
                <Circle cx={mood === 'thinking' ? 63.5 : 62.5} cy={mood === 'thinking' ? 49.5 : 53.5} r={1.3} fill="#fff" opacity={0.85} />
              </>
            )}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
