import { useEffect } from 'react';
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

export type NovaMood = 'idle' | 'thinking' | 'explaining' | 'celebrating';

export function NovaOrb({ size = 56, mood = 'idle', styleId = 'core' }: { size?: number; mood?: NovaMood; styleId?: string }) {
  const calm = useCalmMotion();
  const st = NOVA_STYLES.find((s) => s.id === styleId) ?? NOVA_STYLES[0];
  const c1 = st.color;
  const c2 = st.color2 ?? st.color;

  const float = useSharedValue(0);
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const blink = useSharedValue(1);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (calm) {
      [float, spin, pulse].forEach((v) => cancelAnimation(v));
      float.value = 0;
      pulse.value = mood === 'thinking' ? 0.6 : 0.3;
      return;
    }
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    const spinDur = mood === 'thinking' ? 1400 : mood === 'celebrating' ? 1800 : 9000;
    spin.value = 0;
    spin.value = withRepeat(withTiming(1, { duration: spinDur, easing: Easing.linear }), -1, false);
    const pulseDur = mood === 'explaining' ? 700 : mood === 'thinking' ? 900 : 2400;
    pulse.value = withRepeat(withTiming(1, { duration: pulseDur, easing: Easing.inOut(Easing.quad) }), -1, true);
    blink.value = withRepeat(
      withSequence(withDelay(3200, withTiming(0.1, { duration: 90 })), withTiming(1, { duration: 120 })),
      -1,
      false,
    );
  }, [calm, mood, float, spin, pulse, blink]);

  useEffect(() => {
    if (mood === 'celebrating' && !calm) {
      burst.value = 0;
      burst.value = withSequence(withSpring(1, { damping: 7, stiffness: 140 }), withDelay(900, withTiming(0, { duration: 400 })));
    }
  }, [mood, calm, burst]);

  const bodyA = useAnimatedStyle(() => ({
    transform: [
      { translateY: (float.value - 0.5) * size * 0.08 - burst.value * size * 0.08 },
      { scale: 1 + burst.value * 0.06 },
    ],
  }));
  const glowA = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.4, transform: [{ scale: 0.9 + pulse.value * 0.18 }] }));
  const spinA = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const eyesA = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const burstA = useAnimatedStyle(() => ({ opacity: burst.value, transform: [{ scale: 0.6 + burst.value * 0.7 }] }));

  const S = size;
  const gid = `ng-${styleId}`;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Nova, ${mood === 'thinking' ? 'thinking' : mood === 'celebrating' ? 'celebrating' : 'ready to help'}`}
      style={{ width: S, height: S }}>
      <Animated.View style={[{ position: 'absolute', width: S, height: S }, glowA]}>
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id={`${gid}-glow`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c1} stopOpacity={0.55} />
              <Stop offset="1" stopColor={c1} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={S / 2} cy={S / 2} r={S / 2} fill={`url(#${gid}-glow)`} />
        </Svg>
      </Animated.View>

      {/* celebration sparks */}
      <Animated.View style={[{ position: 'absolute', width: S, height: S }, burstA]} pointerEvents="none">
        <Svg width={S} height={S} viewBox="0 0 100 100">
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180;
            const x = 50 + Math.cos(r) * 44;
            const y = 50 + Math.sin(r) * 44;
            return (
              <Path
                key={a}
                d={`M${x} ${y - 5}L${x + 1.4} ${y - 1.4}L${x + 5} ${y}L${x + 1.4} ${y + 1.4}L${x} ${y + 5}L${x - 1.4} ${y + 1.4}L${x - 5} ${y}L${x - 1.4} ${y - 1.4}Z`}
                fill={a % 120 === 0 ? '#E7B75F' : c1}
              />
            );
          })}
        </Svg>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', width: S, height: S }, bodyA]}>
        {/* orbit: squash the plane, then spin inside it so the moon traces an ellipse */}
        <View style={{ position: 'absolute', width: S, height: S, transform: [{ rotate: '-16deg' }, { scaleY: 0.36 }] }}>
          <Animated.View style={[{ width: S, height: S }, spinA]}>
            <Svg width={S} height={S} viewBox="0 0 100 100">
              <Circle cx={50} cy={50} r={44} stroke={c1} strokeOpacity={0.35} strokeWidth={2.2} fill="none" />
              <Circle cx={94} cy={50} r={mood === 'thinking' ? 5 : 4} fill={c1} />
              {mood === 'thinking' && (
                <>
                  <Circle cx={6} cy={50} r={3.5} fill={c1} opacity={0.7} />
                  <Circle cx={50} cy={6} r={3} fill={c1} opacity={0.5} />
                </>
              )}
            </Svg>
          </Animated.View>
        </View>
        <Svg width={S} height={S} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={`${gid}-body`} cx="38%" cy="32%" r="70%">
              <Stop offset="0" stopColor="#F4FFFD" stopOpacity={0.95} />
              <Stop offset="0.28" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={27} fill={`url(#${gid}-body)`} />
          <Ellipse cx={41} cy={39} rx={7} ry={4} fill="#FFFFFF" opacity={0.35} />
        </Svg>
        <Animated.View style={[{ position: 'absolute', width: S, height: S }, eyesA]}>
          <Svg width={S} height={S} viewBox="0 0 100 100">
            {mood === 'celebrating' ? (
              <>
                <Path d="M38 53 Q42 47 46 53" stroke="#06201D" strokeWidth={3.4} fill="none" strokeLinecap="round" />
                <Path d="M54 53 Q58 47 62 53" stroke="#06201D" strokeWidth={3.4} fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <Ellipse cx={mood === 'thinking' ? 45 : 42} cy={mood === 'thinking' ? 47 : 51} rx={3.2} ry={4.6} fill="#06201D" />
                <Ellipse cx={mood === 'thinking' ? 61 : 58} cy={mood === 'thinking' ? 47 : 51} rx={3.2} ry={4.6} fill="#06201D" />
              </>
            )}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
