import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Button, T } from '@/components/ui/primitives';
import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { intervalLabel, nextInterval } from '@/lib/srs';
import type { Card, CardState } from '@/store/types';
import { color as C, font, space } from '@/theme/tokens';

export function FlashCard({
  card,
  state,
  onRate,
  onFlip,
  sourceLabel,
  night,
}: {
  card: Card;
  state: CardState;
  onRate: (r: 1 | 2 | 3 | 4) => void;
  onFlip: (shown: boolean) => void;
  sourceLabel?: string;
  night?: boolean;
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
    rot.value = calm ? withTiming(1, { duration: 1 }) : withSpring(1, { damping: 14, stiffness: 120, mass: 0.9 });
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
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    justifyContent: 'center',
    gap: 10,
  };

  const ratings: { r: 1 | 2 | 3 | 4; label: string; kind: 'secondary' | 'primary' | 'gold' }[] = [
    { r: 1, label: 'Still learning', kind: 'secondary' },
    { r: 2, label: 'Hard', kind: 'secondary' },
    { r: 3, label: 'Got it', kind: 'primary' },
    { r: 4, label: 'Easy', kind: 'gold' },
  ];

  return (
    <View style={{ gap: space.xl }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? `Answer: ${card.back}. ${card.detail}` : `Flashcard: ${card.front}. Tap to reveal the answer.`}
        onPress={flip}
        style={({ focused }: { pressed: boolean; focused?: boolean }) => [
          { minHeight: 270, borderRadius: 24, marginBottom: 6 },
          focused && ({ outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 4 } as ViewStyle),
        ]}>
        <Animated.View style={[face, { backgroundColor: C.surface1, borderColor: C.panelBorder, boxShadow: `0 6px 0 ${C.panelShadow}`, alignItems: 'center', textAlign: 'center' } as ViewStyle, front]}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.moss }}>New card · learn it</Text>
          <Text style={{ fontFamily: font.display, fontSize: 25, lineHeight: 32, color: C.text, textAlign: 'center' }}>{card.front}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Icon name="cards" size={18} color={C.textMuted} />
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: C.textMuted }}>Recall the answer, then tap to flip</Text>
          </View>
        </Animated.View>
        <Animated.View style={[face, { backgroundColor: C.mossSoft, borderColor: C.mossLine, boxShadow: `0 6px 0 ${C.mossLine2}` }, back]}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.moss }}>Answer</Text>
          <Text style={{ fontFamily: font.display, fontSize: 25, lineHeight: 30, color: C.mossInk }}>{card.back}</Text>
          {card.detail ? <Text style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: '#3E5A35' }}>{card.detail}</Text> : null}
          {sourceLabel ? <T v="caption" style={{ color: '#3E5A35' }}>{sourceLabel}</T> : null}
        </Animated.View>
      </Pressable>

      {shown ? (
        <View style={{ gap: space.sm }}>
          <Text style={{ textAlign: 'center', fontFamily: font.bodyBold, fontSize: 13.5, color: night ? C.onNightMuted : C.textMuted }}>How well did you know it?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {ratings.map((x) => (
              <View key={x.r} style={{ alignItems: 'center', gap: 2, flexGrow: 1, flexBasis: 120 }}>
                <Button full kind={x.kind} label={x.label} onPress={() => onRate(x.r)} />
                <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: night ? C.onNightMuted : C.textFaint }}>Again in {intervalLabel(nextInterval(state, x.r))}</Text>
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
