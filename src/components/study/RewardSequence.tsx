import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Medal } from '@/components/art/Art';
import { NovaOrb } from '@/components/art/NovaOrb';
import { Button, T } from '@/components/ui/primitives';
import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { achievementById, levelProgress } from '@/lib/progression';
import { useNova } from '@/store/novaStore';
import type { SessionRecord } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, font, radius, space } from '@/theme/tokens';

function useCountUp(target: number, duration: number, calm: boolean, delay = 0) {
  const [v, setV] = useState(calm ? target : 0);
  useEffect(() => {
    if (calm) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, calm, delay]);
  return v;
}

export function RewardSequence({ record, onDone }: { record: SessionRecord; onDone: () => void }) {
  const calm = useCalmMotion();
  const insets = useSafeAreaInsets();
  const novaStyle = useStore((s) => s.player.novaStyle);
  const levelUp = record.levelAfter > record.levelBefore;
  const before = levelProgress(record.xpBefore);
  const after = levelProgress(record.xpAfter);
  const xp = useCountUp(record.xpTotal, 1100, calm, 250);

  const bar = useSharedValue(calm ? (levelUp ? after.pct : after.pct) : before.pct);
  const [shownLevel, setShownLevel] = useState(calm ? record.levelAfter : record.levelBefore);
  const burst = useSharedValue(0);

  useEffect(() => {
    sound('reward');
    haptic('success');
    useNova.getState().celebrate();
    if (calm) return;
    if (levelUp) {
      bar.value = withDelay(500, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
      const t = setTimeout(() => {
        setShownLevel(record.levelAfter);
        bar.value = 0;
        bar.value = withTiming(after.pct, { duration: 700, easing: Easing.out(Easing.cubic) });
        burst.value = withSequence(withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 600 }));
        haptic('success');
      }, 1450);
      return () => clearTimeout(t);
    }
    bar.value = withDelay(500, withTiming(after.pct, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const barA = useAnimatedStyle(() => ({ width: `${Math.max(0.02, bar.value) * 100}%` }));
  const burstA = useAnimatedStyle(() => ({ opacity: burst.value, transform: [{ scale: 0.6 + burst.value * 1.2 }] }));
  const levelScale = useSharedValue(1);
  useEffect(() => {
    if (!calm && shownLevel !== record.levelBefore) levelScale.value = withSequence(withSpring(1.25, { damping: 6 }), withSpring(1));
  }, [shownLevel]); // eslint-disable-line react-hooks/exhaustive-deps
  const levelA = useAnimatedStyle(() => ({ transform: [{ scale: levelScale.value }] }));

  const enter = (d: number) => (calm ? undefined : FadeInDown.delay(d).duration(320));
  const title =
    record.kind === 'boss'
      ? record.bossWon
        ? 'Boss defeated'
        : 'Boss battle complete'
      : 'Quest complete';

  return (
    <Animated.View
      entering={calm ? undefined : FadeIn.duration(220)}
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,8,15,0.96)' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xxxl, paddingHorizontal: space.xl, gap: space.xl }}>
        <Animated.View entering={calm ? undefined : ZoomIn.duration(400)}>
          <NovaOrb size={120} mood="celebrating" styleId={novaStyle} />
        </Animated.View>
        <Animated.View entering={enter(100)} style={{ alignItems: 'center', gap: space.sm }}>
          <T v="hero" style={{ textAlign: 'center' }} accessibilityRole="header">{title}</T>
          <T v="small" style={{ textAlign: 'center' }}>{record.title}</T>
        </Animated.View>

        <Animated.View entering={enter(200)} style={{ alignItems: 'center' }} accessible accessibilityLabel={`${record.xpTotal} XP earned`}>
          <T v="hero" style={{ fontSize: 56, lineHeight: 64, color: C.gold, fontVariant: ['tabular-nums'] }}>+{xp}</T>
          <T v="caption" style={{ color: C.gold }}>XP earned</T>
        </Animated.View>

        <Animated.View entering={enter(300)} style={{ width: '100%', maxWidth: 440, gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Animated.View style={levelA}>
              <T v="heading">Level {shownLevel}</T>
            </Animated.View>
            <T v="small" style={{ fontVariant: ['tabular-nums'] }}>{after.toNext} XP to level {record.levelAfter + 1}</T>
          </View>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: C.surface3, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', borderRadius: 6, backgroundColor: C.teal }, barA]} />
          </View>
          {levelUp && (
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', alignSelf: 'center', top: -40 }, burstA]}>
              <Svg width={120} height={120}>
                <Circle cx={60} cy={60} r={50} stroke={C.gold} strokeWidth={3} fill="none" />
                <Circle cx={60} cy={60} r={36} stroke={C.teal} strokeWidth={2} fill="none" />
              </Svg>
            </Animated.View>
          )}
        </Animated.View>

        {levelUp && (
          <Animated.View
            entering={calm ? undefined : FadeInDown.delay(1600).duration(360)}
            style={{ width: '100%', maxWidth: 440, padding: space.lg, borderRadius: radius.lg, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: 'rgba(231,183,95,0.4)', gap: 6 }}>
            <T v="subheading" style={{ color: C.gold }}>Level {record.levelAfter} reached</T>
            {record.newUnlocks.length ? (
              record.newUnlocks.map((u) => (
                <T key={u} v="body">Unlocked: {u}</T>
              ))
            ) : (
              <T v="body">Keep going — new cosmetics unlock at upcoming levels.</T>
            )}
          </Animated.View>
        )}

        <Animated.View entering={enter(400)} style={{ width: '100%', maxWidth: 440, gap: 6 }}>
          {record.xpLines.map((l) => (
            <View key={l.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <T v="small" style={{ flex: 1 }}>{l.label}</T>
              <T v="small" style={{ color: C.text, fontFamily: font.bodySemi, fontVariant: ['tabular-nums'] }}>+{l.xp}</T>
            </View>
          ))}
          {record.xpTotal === 0 && <T v="small">These cards already paid out XP today. Reviews still count toward mastery.</T>}
        </Animated.View>

        {record.newAchievements.length > 0 && (
          <View style={{ alignItems: 'center', gap: space.md }}>
            <T v="caption" style={{ color: C.gold }}>New achievement{record.newAchievements.length > 1 ? 's' : ''}</T>
            <View style={{ flexDirection: 'row', gap: space.xl, flexWrap: 'wrap', justifyContent: 'center' }}>
              {record.newAchievements.map((id, i) => {
                const a = achievementById(id);
                if (!a) return null;
                return (
                  <Animated.View key={id} entering={calm ? undefined : ZoomIn.delay(levelUp ? 2000 + i * 200 : 700 + i * 200).springify()} style={{ alignItems: 'center', gap: 6, width: 140 }}>
                    <Medal glyph={a.glyph} size={72} />
                    <T v="bodyStrong" style={{ textAlign: 'center' }}>{a.name}</T>
                    <T v="caption" style={{ textAlign: 'center' }}>{a.desc}</T>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

        <Button label="See results" iconRight="arrowRight" onPress={onDone} style={{ marginTop: space.md }} />
      </ScrollView>
    </Animated.View>
  );
}
