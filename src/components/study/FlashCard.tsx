import { useEffect, useState } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Button, T } from '@/components/ui/primitives';
import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { intervalLabel, nextInterval } from '@/lib/srs';
import type { Card, CardState } from '@/store/types';
import { color as C, font, radius, space } from '@/theme/tokens';

export function FlashCard({
  card,
  state,
  onRate,
  onFlip,
  sourceLabel,
}: {
  card: Card;
  state: CardState;
  onRate: (r: 1 | 2 | 3 | 4) => void;
  onFlip: (shown: boolean) => void;
  sourceLabel?: string;
}) {
  const calm = useCalmMotion();
  const [shown, setShown] = useState(false);
  const rot = useSharedValue(0);

  const flip = () => {
    if (shown) return;
    haptic('light');
    sound('flip');
    setShown(true);
    onFlip(true);
    rot.value = calm ? 1 : withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        flip();
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) onRate(Number(e.key) as 1 | 2 | 3 | 4);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(rot.value, [0, 1], [0, 180])}deg` }],
    opacity: calm ? 1 - rot.value : rot.value < 0.5 ? 1 : 0,
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(rot.value, [0, 1], [-180, 0])}deg` }],
    opacity: calm ? rot.value : rot.value >= 0.5 ? 1 : 0,
  }));

  const face: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.xl,
    justifyContent: 'center',
    gap: space.md,
  };

  const ratings: { r: 1 | 2 | 3 | 4; label: string; kind: 'secondary' | 'primary' }[] = [
    { r: 1, label: 'Didn’t know', kind: 'secondary' },
    { r: 2, label: 'Hard', kind: 'secondary' },
    { r: 3, label: 'Got it', kind: 'primary' },
    { r: 4, label: 'Easy', kind: 'secondary' },
  ];

  return (
    <View style={{ gap: space.xl }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? `Answer: ${card.back}. ${card.detail}` : `Flashcard: ${card.front}. Tap to reveal the answer.`}
        onPress={flip}
        style={({ focused }: { pressed: boolean; focused?: boolean }) => [
          { height: 300, borderRadius: radius.xl },
          focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 4 } as ViewStyle),
        ]}>
        <Animated.View style={[face, { backgroundColor: C.surface2, borderColor: C.lineStrong }, front]}>
          <T v="caption" style={{ color: C.teal }}>New card · learn it</T>
          <T v="title" style={{ fontSize: 24, lineHeight: 33 }}>{card.front}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md }}>
            <Icon name="refresh" size={16} color={C.textMuted} />
            <T v="small">Tap the card to flip it</T>
          </View>
        </Animated.View>
        <Animated.View style={[face, { backgroundColor: '#132024', borderColor: 'rgba(56,214,198,0.35)' }, back]}>
          <T v="caption" style={{ color: C.teal }}>Answer</T>
          <T v="title" style={{ fontSize: 26, lineHeight: 34 }}>{card.back}</T>
          {card.detail ? <T v="body" style={{ color: C.textMuted }}>{card.detail}</T> : null}
          {sourceLabel ? <T v="caption">{sourceLabel}</T> : null}
        </Animated.View>
      </Pressable>

      {shown ? (
        <View style={{ gap: space.sm }}>
          <T v="small" style={{ textAlign: 'center' }}>How well did you know it?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
            {ratings.map((x) => (
              <View key={x.r} style={{ alignItems: 'center', gap: 4, flexGrow: 1, minWidth: 130 }}>
                <Button full kind={x.kind} label={x.label} onPress={() => onRate(x.r)} />
                <T v="caption" style={{ fontFamily: font.bodyMedium }}>Again in {intervalLabel(nextInterval(state, x.r))}</T>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Button icon="refresh" label="Show answer" onPress={flip} style={{ alignSelf: 'center' }} />
      )}
    </View>
  );
}
