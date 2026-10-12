import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Avatar, Medal } from '@/components/art/Art';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { CHEST_ITEMS } from '@/lib/avatar';
import { achievementById } from '@/lib/progression';
import { levelTitle } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import type { SessionRecord } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, font } from '@/theme/tokens';

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

const eyebrow = { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: C.textFaint } as const;

function StarShape({ size, filled }: { size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 16.4l-5.3 3.1 1.4-5.9-4.6-4 6.1-.5z"
        fill={filled ? C.honeyLight : C.bgDeep}
        stroke={filled ? C.honeyShadow : '#CDBB94'}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const CONFETTI = [C.honey, C.berry, C.moss, '#6D74B8', C.honeyLight, '#4F8FA8'];

function Confetti({ calm }: { calm: boolean }) {
  const { height } = useWindowDimensions();
  const pieces = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ x: (i * 37) % 100, w: 7 + (i % 3) * 3, h: 10 + (i % 4) * 3, c: CONFETTI[i % CONFETTI.length], d: 2200 + (i % 5) * 380, delay: (i % 7) * 140, r: (i * 53) % 360 })),
    [],
  );
  if (calm) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height + 40} />
      ))}
    </View>
  );
}

function Piece({ x, w, h, c, d, delay, r, fall }: { x: number; w: number; h: number; c: string; d: number; delay: number; r: number; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: d, easing: Easing.bezier(0.3, 0.6, 0.6, 1) }));
  }, [t, d, delay]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -20 + t.value * fall }, { rotate: `${r + t.value * 540}deg` }], opacity: t.value < 0.9 ? 1 : (1 - t.value) * 10 }));
  return <Animated.View style={[{ position: 'absolute', top: 0, left: `${x}%`, width: w, height: h, backgroundColor: c, borderRadius: 2 }, a]} />;
}

/** Slowly turning sunburst behind the chest and level medallion. */
function Rays({ size, calm, tint = 'rgba(233,169,59,0.35)' }: { size: number; calm: boolean; tint?: string }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    spin.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [calm, spin]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const wedges = 20;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, a]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="rayfade" cx="50%" cy="50%" r="50%">
            <Stop offset="0.2" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.95" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {Array.from({ length: wedges }, (_, i) => {
          const a0 = (i / wedges) * Math.PI * 2;
          const a1 = a0 + (Math.PI * 2) / wedges / 2;
          const p = (a: number) => `${50 + Math.cos(a) * 50} ${50 + Math.sin(a) * 50}`;
          return <Path key={i} d={`M50 50 L${p(a0)} L${p(a1)} Z`} fill={tint} />;
        })}
        <Rect x={0} y={0} width={100} height={100} fill="url(#rayfade)" opacity={0} />
      </Svg>
    </Animated.View>
  );
}

function ChestArt({ open, calm }: { open: boolean; calm: boolean }) {
  const wig = useSharedValue(0);
  const lid = useSharedValue(0);
  useEffect(() => {
    if (calm || open) {
      wig.value = 0;
      return;
    }
    wig.value = withRepeat(withSequence(withDelay(1400, withTiming(1, { duration: 80 })), withTiming(-1, { duration: 120 }), withTiming(1, { duration: 120 }), withTiming(0, { duration: 80 })), -1, false);
  }, [calm, open, wig]);
  useEffect(() => {
    lid.value = calm ? (open ? 1 : 0) : withSpring(open ? 1 : 0, { damping: 9, stiffness: 140 });
  }, [open, calm, lid]);
  const body = useAnimatedStyle(() => ({ transform: [{ rotate: `${wig.value * 4}deg` }] }));
  const lidA = useAnimatedStyle(() => ({ transform: [{ translateX: -70 }, { rotate: `${-lid.value * 28}deg` }, { translateX: 70 }, { translateY: -lid.value * 16 }] }));
  return (
    <Animated.View style={[{ width: 180, height: 150 }, body]}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: '#97602F', boxShadow: 'inset 0 0 0 5px #6E421E, 0 7px 0 #4F2F14' }} />
      <View style={{ position: 'absolute', left: '50%', bottom: 0, width: 26, height: 92, marginLeft: -13, backgroundColor: C.honey, boxShadow: `inset 0 0 0 3px ${C.honeyShadow}` }} />
      {open && <View style={{ position: 'absolute', left: 14, right: 14, top: 40, height: 22, borderRadius: 11, backgroundColor: C.honeyLight, opacity: 0.9 }} />}
      <Animated.View style={[{ position: 'absolute', left: -5, right: -5, top: 14, height: 58, borderTopLeftRadius: 48, borderTopRightRadius: 48, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#B07440', boxShadow: 'inset 0 0 0 5px #6E421E' }, lidA]}>
        <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 26, marginLeft: -13, backgroundColor: C.honey, boxShadow: `inset 0 0 0 3px ${C.honeyShadow}` }} />
      </Animated.View>
      {!open && <View style={{ position: 'absolute', left: '50%', top: 60, width: 30, height: 30, marginLeft: -15, borderRadius: 8, backgroundColor: C.honeyLight, boxShadow: `inset 0 0 0 3px ${C.honeyShadow}, 0 2px 0 #8A5A12` }} />}
    </Animated.View>
  );
}

/** Quest complete → treasure chest → level-up medallion. */
export function RewardSequence({ record, onDone }: { record: SessionRecord; onDone: () => void }) {
  const calm = useCalmMotion();
  const insets = useSafeAreaInsets();
  const player = useStore((s) => s.player);
  const openChest = useStore((s) => s.openChest);
  const setLook = useStore((s) => s.setLook);
  const levelUp = record.levelAfter > record.levelBefore;
  const hasChest = !!record.chest && !record.chestOpened;
  const steps = useMemo(() => ['reward', ...(hasChest ? ['chest'] : []), ...(levelUp ? ['level'] : [])] as ('reward' | 'chest' | 'level')[], []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const step = steps[i];
  const [open, setOpen] = useState(false);
  const [worn, setWorn] = useState(false);
  const xp = useCountUp(record.xpTotal, 1100, calm, 600);
  const enter = (d: number) => (calm ? undefined : FadeInDown.delay(d).duration(320));

  // Stars: first-try accuracy decides.
  const acc = record.answered ? record.firstTryCorrect / record.answered : 0.7;
  const stars = record.kind === 'boss' && !record.bossWon ? 1 : acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1;
  const title = record.kind === 'boss' ? (record.bossWon ? 'Boss defeated!' : 'Fog still lingers') : 'Quest complete!';

  useEffect(() => {
    sound('reward');
    haptic('success');
    useNova.getState().celebrate();
  }, []);

  const next = () => (i + 1 < steps.length ? (setI(i + 1), setOpen(false)) : onDone());
  const item = record.chest?.itemId ? CHEST_ITEMS.find((c) => c.id === record.chest!.itemId) : undefined;
  const lootLook = item ? { ...player.look, [item.key]: item.id } : player.look;
  const unlockLines = record.newUnlocks;

  const doOpen = () => {
    if (open) return;
    haptic('success');
    sound('reward');
    openChest(record.id);
    setOpen(true);
  };

  return (
    <Animated.View entering={calm ? undefined : FadeIn.duration(220)} accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
      <LinearGradient colors={['#FFF6DF', C.bg, C.bgDeep]} locations={[0, 0.6, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Confetti calm={calm} key={step} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40, paddingHorizontal: 24 }}>
        {step === 'reward' && (
          <>
            <Text style={eyebrow}>{record.title}</Text>
            <Animated.Text entering={calm ? undefined : ZoomIn.duration(500)} accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 34, lineHeight: 38, color: C.text, textAlign: 'center' }}>
              {title}
            </Animated.Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
              {[0, 1, 2].map((n) => (
                <Animated.View key={n} entering={calm ? undefined : ZoomIn.delay(300 + n * 180).duration(500)} style={{ transform: [{ translateY: n === 1 ? -10 : 0 }] }}>
                  <StarShape size={n === 1 ? 56 : 44} filled={n < stars} />
                </Animated.View>
              ))}
            </View>
            <Animated.View entering={enter(300)} style={{ width: '100%', maxWidth: 340, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 20, boxShadow: `0 4px 0 ${C.panelShadow}`, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 4 }}>
              {record.xpLines.map((l, n) => (
                <Animated.View key={l.label} entering={enter(400 + n * 120)} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: C.bgDeep }}>
                  <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 14.5, color: C.text }}>{l.label}</Text>
                  <Text style={{ fontFamily: font.pixelMed, fontSize: 15, color: C.honeyInk }}>+{l.xp}</Text>
                </Animated.View>
              ))}
              {record.xpTotal === 0 && <Text style={{ fontFamily: font.body, fontSize: 13.5, color: C.textMuted, paddingVertical: 8 }}>These cards already paid out XP today. Reviews still count toward mastery.</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 6 }} accessible accessibilityLabel={`${record.xpTotal} XP total`}>
                <Text style={{ fontFamily: font.heavy, fontSize: 15, color: C.text }}>Total</Text>
                <Text style={{ fontFamily: font.pixelBold, fontSize: 30, color: C.honeyShadow }}>+{xp} XP</Text>
              </View>
            </Animated.View>
            {record.acorns > 0 && (
              <Animated.View entering={enter(900)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.honeySoft }}>
                <Icon name="acorn" size={18} color={C.acorn} strokeWidth={2.1} />
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: C.honeyInk }}>+{record.acorns} acorns</Text>
              </Animated.View>
            )}
            {player.streak > 0 && (
              <Animated.View entering={enter(1000)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#FBE3CF' }}>
                <Icon name="flame" size={18} color={C.flame} fill={C.flame} strokeWidth={2} />
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: '#9A4A12' }}>{player.streak}-day streak!</Text>
              </Animated.View>
            )}
            {record.newAchievements.length > 0 && (
              <View style={{ alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Text style={[eyebrow, { color: C.honeyInk }]}>New achievement{record.newAchievements.length > 1 ? 's' : ''}</Text>
                <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {record.newAchievements.map((id, n) => {
                    const a = achievementById(id);
                    if (!a) return null;
                    return (
                      <Animated.View key={id} entering={calm ? undefined : ZoomIn.delay(1100 + n * 200).springify()} style={{ alignItems: 'center', gap: 6, width: 130 }}>
                        <Medal glyph={a.glyph} size={64} />
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: C.text, textAlign: 'center' }}>{a.name}</Text>
                        <Text style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, textAlign: 'center' }}>{a.desc}</Text>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            )}
            <Button
              style={{ marginTop: 4, alignSelf: 'center' }}
              icon={hasChest ? 'chest' : undefined}
              iconRight={hasChest ? undefined : 'arrowRight'}
              label={hasChest ? 'Open your chest' : levelUp ? 'Continue' : 'See results'}
              onPress={next}
            />
          </>
        )}

        {step === 'chest' && record.chest && (
          <>
            <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 28, lineHeight: 32, color: C.text }}>{open ? 'You found…' : record.chest.trail ? 'A big trail chest!' : 'A treasure chest!'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Open the treasure chest" disabled={open} onPress={doOpen}>
              <View style={{ width: 180, height: 150, marginTop: 36, marginBottom: 10, alignItems: 'center', justifyContent: 'center' }}>
                {open && <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}><Rays size={420} calm={calm} /></View>}
                <ChestArt open={open} calm={calm} />
              </View>
            </Pressable>
            {!open && <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: C.textMuted }}>Tap the chest to open it</Text>}
            {open && (
              <>
                <Animated.View entering={calm ? undefined : ZoomIn.delay(250).duration(500)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: C.surface1, borderWidth: 2, borderColor: C.honey, borderRadius: 20, boxShadow: '0 4px 0 #D9B26A', marginBottom: 4 }}>
                  <View style={{ width: 64, height: 64 }}>
                    {item ? (
                      <Avatar size={64} look={lootLook} label={item.name} />
                    ) : (
                      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.honeySoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="acorn" size={32} color={C.acorn} strokeWidth={2} />
                      </View>
                    )}
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.honeyShadow }}>{item ? item.rarity : 'Pouch of acorns'}</Text>
                    <Text style={{ fontFamily: font.display, fontSize: 19, color: C.text }}>{item ? item.name : `${record.chest.acorns} acorns`}</Text>
                    {item && <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: C.textMuted }}>+{record.chest.acorns} acorns</Text>}
                  </View>
                </Animated.View>
                <Animated.View entering={calm ? undefined : FadeInDown.delay(500).duration(400)} style={{ flexDirection: 'row', gap: 10 }}>
                  {item && (
                    <Button
                      kind="secondary"
                      label={worn ? 'Wearing it' : 'Wear it'}
                      disabled={worn}
                      onPress={() => {
                        setLook({ [item.key]: item.id });
                        setWorn(true);
                      }}
                    />
                  )}
                  <Button label={i + 1 < steps.length ? 'Continue' : 'See results'} iconRight="arrowRight" onPress={next} />
                </Animated.View>
              </>
            )}
          </>
        )}

        {step === 'level' && (
          <>
            <Animated.View entering={calm ? undefined : ZoomIn.duration(600)} style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }}>
              <Rays size={250} calm={calm} tint="rgba(233,169,59,0.3)" />
              <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: C.honey, alignItems: 'center', justifyContent: 'center', boxShadow: `0 7px 0 #8A5A12, inset 0 0 0 6px rgba(255,249,238,0.5)` }}>
                <Text style={{ fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.6, color: C.text }}>LEVEL</Text>
                <Text style={{ fontFamily: font.pixelBold, fontSize: 64, lineHeight: 66, color: C.text }}>{record.levelAfter}</Text>
              </View>
            </Animated.View>
            <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 30, lineHeight: 34, color: C.text }}>Level up!</Text>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: C.textMuted }}>You’re now a {levelTitle(record.levelAfter)}</Text>
            <View style={{ gap: 8, width: '100%', maxWidth: 320 }}>
              {(unlockLines.length ? unlockLines : ['More cosmetics unlock at upcoming levels']).map((u, n) => (
                <Animated.View key={u} entering={enter(500 + n * 150)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 16, boxShadow: `0 3px 0 ${C.panelShadow}`, marginBottom: 3 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.honeySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={unlockLines.length ? 'lock' : 'sparkle'} size={18} color={C.honeyInk} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 14.5, color: C.text }}>{u}</Text>
                    {unlockLines.length > 0 && <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.textMuted }}>Unlocked</Text>}
                  </View>
                </Animated.View>
              ))}
            </View>
            <Button label="Back to the village" onPress={next} style={{ alignSelf: 'center' }} />
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}
