import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { NovaOrb } from '@/components/art/NovaOrb';
import { fmtClock, HeartsRow, useRestLeft } from '@/components/ui/Hearts';
import { Button } from '@/components/ui/primitives';
import { useCalmMotion } from '@/lib/feedback';
import { REST_MS, SKIP_COST } from '@/lib/progression';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font } from '@/theme/tokens';

const STARS = [
  [8, 8, 3], [20, 18, 2], [36, 6, 2], [52, 14, 3], [70, 7, 2], [88, 16, 3], [12, 34, 2], [80, 30, 2], [62, 26, 2], [28, 28, 2], [94, 40, 2],
];

/** Out of hearts: a campfire, a sleeping Nova, a 10:00 countdown. Hearts refill when the fire burns down. */
export default function Rest() {
  const insets = useSafeAreaInsets();
  const calm = useCalmMotion();
  const left = useRestLeft();
  const hearts = useStore((s) => s.player.hearts);
  const restEndsAt = useStore((s) => s.player.restEndsAt);
  const acorns = useStore((s) => s.player.acorns);
  const mode = useStore((s) => s.prefs.heartsMode);
  const skipRest = useStore((s) => s.skipRest);
  const active = useStore((s) => s.active);
  const styleId = useStore((s) => s.player.novaStyle);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'home' }), [setContext]));

  const flame = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    flame.value = withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [calm, flame]);
  const flameA = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.92 + flame.value * 0.16 }, { scaleX: 1.04 - flame.value * 0.08 }] }));

  const resting = !!restEndsAt && left > 0 && hearts <= 0;
  const resumable = !!active && !active.recordId && active.index < active.queue.length;
  const canSkip = mode === 'acorns' || mode === 'free';
  const enough = mode === 'free' || acorns >= SKIP_COST;
  const pct = restEndsAt ? 1 - left / REST_MS : 1;

  const line =
    mode === 'wait'
      ? 'Nova is tucking you in. Your hearts refill when the fire burns down.'
      : mode === 'acorns'
        ? `Rest by the fire, or spend ${SKIP_COST} acorns to skip the wait. You have ${acorns}.`
        : 'Rest by the fire, or skip the wait if you’re ready. Your missed cards are saved for a retry.';

  // Rested: hearts are back.
  if (!resting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28, backgroundColor: C.night }}>
        <LinearGradient colors={[C.night, C.night2]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <NovaOrb size={110} mood="happy" styleId={styleId} />
        <HeartsRow hearts={hearts} size={26} empty="rgba(255,244,222,0.3)" />
        <Text style={{ fontFamily: font.display, fontSize: 30, color: C.onNight, textAlign: 'center' }}>All rested!</Text>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 15, lineHeight: 22, color: '#E6D9F0', textAlign: 'center', maxWidth: 320 }}>Your hearts are full again. Ready to go back out?</Text>
        <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
          {resumable && <Button full kind="gold" icon="play" label="Back to your quest" onPress={() => router.replace('/study')} />}
          <Button full kind="plum" label={resumable ? 'Rest in the village' : 'Back home'} onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 28 }}>
      <LinearGradient colors={[C.night, C.night2, C.nightRest]} locations={[0, 0.55, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {STARS.map(([x, y, s], i) => (
        <View key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: s, height: s, borderRadius: s, backgroundColor: C.onNight, opacity: 0.7 }} />
      ))}

      {/* campfire */}
      <View style={{ width: 200, height: 170 }}>
        <Svg width={360} height={240} viewBox="-80 -40 360 240" style={{ position: 'absolute', left: -80, top: -40 }} pointerEvents="none">
          <Defs>
            <RadialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFAA50" stopOpacity={0.7} />
              <Stop offset="1" stopColor="#FFAA50" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={100} cy={160} rx={130} ry={60} fill="url(#fireGlow)" />
          <Path d="M52 152 L148 140" stroke="#6E421E" strokeWidth={14} strokeLinecap="round" />
          <Path d="M52 140 L148 152" stroke="#5A3618" strokeWidth={14} strokeLinecap="round" />
        </Svg>
        <Animated.View style={[{ position: 'absolute', left: 77, bottom: 20, width: 46, height: 64, transformOrigin: '50% 100%' }, flameA]}>
          <Svg width={46} height={64} viewBox="0 0 46 64">
            <Defs>
              <RadialGradient id="flame" cx="50%" cy="75%" r="70%">
                <Stop offset="0" stopColor="#FFE6A0" />
                <Stop offset="0.55" stopColor="#F08A3A" />
                <Stop offset="1" stopColor="#C9462E" />
              </RadialGradient>
            </Defs>
            <Path d="M23 2 C30 18 44 30 42 46 C41 58 33 62 23 62 C13 62 5 58 4 46 C2 32 16 22 23 2Z" fill="url(#flame)" />
          </Svg>
        </Animated.View>
        <View style={{ position: 'absolute', left: 4, bottom: 22, width: 62, height: 62 }}>
          <NovaOrb size={56} mood="sleepy" styleId={styleId} />
        </View>
      </View>

      <HeartsRow hearts={hearts} size={24} empty="rgba(255,244,222,0.3)" />
      <Text style={{ fontFamily: font.display, fontSize: 30, lineHeight: 34, color: C.onNight, textAlign: 'center' }}>Out of hearts</Text>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 15, lineHeight: 22, color: '#E6D9F0', textAlign: 'center', maxWidth: 320 }}>{line}</Text>
      <Text accessibilityLabel={`${fmtClock(left)} left`} style={{ fontFamily: font.pixelBold, fontSize: 58, lineHeight: 62, letterSpacing: 2, color: C.honeyLight, textShadowColor: '#8A4E1A', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 }}>
        {fmtClock(left)}
      </Text>
      <View style={{ width: 220, height: 10, borderRadius: 6, backgroundColor: '#1E1830', padding: 2 }}>
        <View style={{ height: '100%', width: `${Math.max(2, pct * 100)}%`, borderRadius: 4, backgroundColor: C.honeyLight }} />
      </View>

      <View style={{ width: '100%', maxWidth: 320, gap: 10, marginTop: 8 }}>
        {canSkip && (
          <Button
            full
            kind="gold"
            icon={mode === 'acorns' ? 'acorn' : 'bolt'}
            label={mode === 'acorns' ? `Skip wait · ${SKIP_COST} acorns` : 'Skip the wait'}
            disabled={!enough}
            onPress={() => {
              if (skipRest() && resumable) router.replace('/study');
            }}
          />
        )}
        <Button full kind="plum" label="Rest in the village" onPress={() => router.replace('/')} style={{ borderWidth: 2, borderColor: 'rgba(255,244,222,0.3)', borderRadius: 17 }} />
      </View>
    </View>
  );
}
