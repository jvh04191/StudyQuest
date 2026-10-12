import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { NovaOrb } from '@/components/art/NovaOrb';
import { Icon } from '@/components/ui/Icon';
import { Button, T } from '@/components/ui/primitives';
import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { checkTyped } from '@/lib/util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDock } from '@/store/dock';
import type { Card, QueueItem } from '@/store/types';
import type { AnswerInput } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { color as C, font, radius, space } from '@/theme/tokens';

type Phase = 'asking' | 'wrong' | 'correct' | 'revealed';

const KEYS = ['A', 'B', 'C', 'D'];

export function QuizItem({
  card,
  item,
  onDone,
  onReveal,
  onAskNova,
  sourceLabel,
  night,
}: {
  card: Card;
  item: QueueItem;
  onDone: (a: AnswerInput) => void;
  onReveal: (visible: boolean) => void;
  onAskNova: () => void;
  sourceLabel?: string;
  /** Boss battles are set at night: the question text turns cream. */
  night?: boolean;
}) {
  const calm = useCalmMotion();
  const setDock = useDock((s) => s.set);
  const bottomInset = useSafeAreaInsets().bottom;
  const novaStyle = useStore((s) => s.player.novaStyle);
  const [phase, setPhase] = useState<Phase>('asking');
  const [attempt, setAttempt] = useState(1);
  const [usedHint, setUsedHint] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [closeMatch, setCloseMatch] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeA = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const options = item.options ?? [];
  const typedMode = item.mode === 'typed';
  const answers = [card.back, ...card.aliases];
  const ink = night ? C.onNight : C.text;
  const muted = night ? C.onNightMuted : C.textMuted;

  useEffect(() => {
    onReveal(phase === 'correct' || phase === 'revealed');
  }, [phase, onReveal]);

  const judge = (ok: boolean, close = false) => {
    if (ok) {
      sound('correct');
      haptic('success');
      setCloseMatch(close);
      setPhase('correct');
    } else {
      sound('wrong');
      haptic('warning');
      if (!calm) shake.value = withSequence(withTiming(-9, { duration: 60 }), withTiming(9, { duration: 80 }), withTiming(-5, { duration: 70 }), withTiming(0, { duration: 60 }));
      if (attempt >= 2) setPhase('revealed');
      else setPhase('wrong');
    }
  };

  const pick = (o: string) => {
    if (phase !== 'asking') return;
    setPicked(o);
    const ok = o === card.back;
    if (!ok) setEliminated((e) => [...e, o]);
    judge(ok);
  };

  const submitTyped = () => {
    if (phase !== 'asking' || !typed.trim()) return;
    const v = checkTyped(typed, answers);
    judge(v !== 'wrong', v === 'close');
  };

  const tryAgain = () => {
    setAttempt(2);
    setPicked(null);
    setTyped('');
    setPhase('asking');
    if (!usedHint && card.hint) setUsedHint(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const finish = (rating: 1 | 2 | 3 | 4, correct = phase === 'correct') =>
    onDone({ correct, firstTry: attempt === 1, usedHint, rating });

  // Keyboard support on web: 1–4 choose, Enter continues.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const n = Number(e.key);
      if (phase === 'asking' && !typedMode && n >= 1 && n <= options.length) {
        const o = options[n - 1];
        if (!eliminated.includes(o)) pick(o);
      } else if (phase === 'correct' && attempt === 1 && !usedHint && n >= 1 && n <= 3) finish((n + 1) as 2 | 3 | 4);
      else if (e.key === 'Enter' && phase === 'correct' && (attempt > 1 || usedHint)) finish(2);
      else if (e.key === 'Enter' && phase === 'revealed') finish(1, false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  /* ---------- feedback panel, pinned to the bottom of the quest screen ---------- */
  const good = phase === 'correct';
  const tone = good
    ? { bg: C.mossSoft, border: C.mossLine, ink: C.mossInk, iconBg: C.moss }
    : { bg: C.berrySoft, border: C.berry, ink: C.berryInk, iconBg: C.berry };
  const feedback =
    phase === 'asking' ? null : (
      <Animated.View
        entering={calm ? undefined : FadeIn.duration(220)}
        style={{ backgroundColor: tone.bg, borderTopWidth: 2, borderColor: tone.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(bottomInset, 14) + 8 }}>
        <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Animated.View entering={calm ? undefined : ZoomIn.duration(320)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tone.iconBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={good ? 'check' : phase === 'wrong' ? 'refresh' : 'close'} size={19} color="#FFFFFF" strokeWidth={2.8} />
            </Animated.View>
            <Text style={{ flex: 1, fontFamily: font.display, fontSize: 19, lineHeight: 24, color: tone.ink }}>
              {phase === 'correct'
                ? attempt === 1 && !usedHint
                  ? 'Correct!'
                  : 'Correct — nice recovery!'
                : phase === 'wrong'
                  ? 'Not quite. Have another go.'
                  : `The answer is ${card.back}`}
            </Text>
          </View>

          {phase === 'wrong' ? (
            <>
              <Text style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: tone.ink }}>
                {typedMode ? `“${typed.trim()}” isn’t it.` : `“${picked}” isn’t the answer.`} {card.hint ? card.hint : 'Think about what the question is really asking.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button kind="danger" icon="refresh" label="Try again" onPress={tryAgain} />
                <Button kind="secondary" label="Show answer" onPress={() => setPhase('revealed')} />
                <Button kind="ghost" icon="sparkle" label="Ask Nova" onPress={onAskNova} />
              </View>
            </>
          ) : (
            <>
              {closeMatch && <Text style={{ fontFamily: font.bodyBold, fontSize: 13.5, color: tone.ink }}>Accepted. Watch the spelling: {card.back}</Text>}
              {card.detail ? <Text style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: tone.ink }}>{card.detail}</Text> : null}
              {sourceLabel ? <T v="caption" style={{ color: tone.ink, opacity: 0.8 }}>{sourceLabel}</T> : null}
              {phase === 'revealed' && <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: tone.ink }}>This one will come back later in the quest so you can lock it in.</Text>}

              {phase === 'correct' && attempt === 1 && !usedHint ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: tone.ink }}>How sure were you?</Text>
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    <Button small kind="secondary" label="Guessed" onPress={() => finish(2)} style={{ flex: 1 }} full />
                    <Button small kind="secondary" label="Fairly sure" onPress={() => finish(3)} style={{ flex: 1 }} full />
                    <Button small label="Certain" onPress={() => finish(4)} style={{ flex: 1 }} full />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  <Button
                    full
                    kind={good ? 'primary' : 'danger'}
                    iconRight="arrowRight"
                    label="Continue"
                    onPress={() => (phase === 'correct' ? finish(2) : finish(1, false))}
                    style={{ flexGrow: 1 }}
                  />
                  {phase === 'revealed' && <Button kind="ghost" icon="sparkle" label="Ask Nova to explain" onPress={onAskNova} />}
                  {phase === 'revealed' && typedMode && typed.trim() ? (
                    <Button kind="ghost" label="I was right — count it" onPress={() => onDone({ correct: true, firstTry: false, usedHint: true, rating: 2 })} />
                  ) : null}
                </View>
              )}
            </>
          )}
        </View>
      </Animated.View>
    );

  useEffect(() => {
    setDock(feedback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, attempt, usedHint, picked, closeMatch, card.id]);
  useEffect(() => () => setDock(null), [setDock]);

  const kindLabel = item.retry === 'retry' ? 'Another try' : item.retry === 'check' ? 'Quick check' : typedMode ? 'Type the answer' : 'Multiple choice';

  return (
    <View style={{ gap: space.lg }}>
      <Animated.View style={[{ gap: 14 }, shakeA]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: night ? 'rgba(255,244,222,0.14)' : C.mossSoft }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: night ? C.onNight : C.mossInk }}>{kindLabel}</Text>
          </View>
          {attempt === 2 && phase === 'asking' && (
            <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.honeySoft }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: C.honeyInk }}>Second try</Text>
            </View>
          )}
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 25, lineHeight: 32, color: ink }}>{card.front}</Text>
      </Animated.View>

      {typedMode ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            ref={inputRef}
            value={typed}
            onChangeText={setTyped}
            editable={phase === 'asking'}
            autoFocus={Platform.OS === 'web'}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Type your answer"
            placeholderTextColor={C.textFaint}
            selectionColor={C.moss}
            onSubmitEditing={submitTyped}
            returnKeyType="done"
            accessibilityLabel="Type your answer"
            style={{
              flex: 1,
              minWidth: 0,
              height: 56,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: phase === 'correct' ? C.moss : phase === 'wrong' || phase === 'revealed' ? C.berry : C.panelBorder,
              backgroundColor: C.surface1,
              boxShadow: 'inset 0 3px 0 rgba(0,0,0,0.04)',
              color: C.text,
              fontFamily: font.bodyBold,
              fontSize: 17,
              paddingHorizontal: 16,
            }}
          />
          {phase === 'asking' && <Button label="Check" disabled={!typed.trim()} onPress={submitTyped} style={{ height: 60 }} />}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {options.map((o, i) => {
            const isAnswer = o === card.back;
            const out = eliminated.includes(o);
            const showRight = (phase === 'correct' || phase === 'revealed') && isAnswer;
            const showWrong = picked === o && !isAnswer;
            const locked = phase !== 'asking' || out;
            const skin = showRight
              ? { bg: C.mossSoft, border: C.mossLine2, lip: C.mossLine2, key: C.moss, keyFg: '#FFFFFF' }
              : showWrong
                ? { bg: C.berrySoft, border: C.berry, lip: '#E8B3A9', key: C.berry, keyFg: '#FFFFFF' }
                : { bg: C.surface1, border: C.panelBorder, lip: C.panelShadow, key: C.surface3, keyFg: C.textMuted };
            const dim = (phase !== 'asking' && !showRight && !showWrong) || (out && !showWrong);
            return (
              <Pressable
                key={o}
                accessibilityRole="button"
                accessibilityLabel={`Option ${KEYS[i] ?? i + 1}: ${o}${out ? ', ruled out' : ''}`}
                accessibilityState={{ disabled: locked, selected: picked === o }}
                disabled={locked}
                onPress={() => pick(o)}
                style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
                  {
                    minHeight: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: skin.border,
                    backgroundColor: skin.bg,
                    boxShadow: pressed && !locked ? `0 1px 0 ${skin.lip}` : `0 4px 0 ${skin.lip}`,
                    opacity: dim ? 0.55 : 1,
                    transform: [{ translateY: pressed && !locked ? 3 : 0 }],
                    marginBottom: 4,
                  },
                  focused && ({ outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
                ]}>
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: skin.key, alignItems: 'center', justifyContent: 'center' }}>
                  {showRight ? (
                    <Icon name="check" size={17} color={skin.keyFg} strokeWidth={3} />
                  ) : showWrong ? (
                    <Icon name="close" size={15} color={skin.keyFg} strokeWidth={3} />
                  ) : (
                    <Text style={{ fontFamily: font.pixelBold, fontSize: 14, color: skin.keyFg }}>{KEYS[i] ?? i + 1}</Text>
                  )}
                </View>
                <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 16, lineHeight: 21, color: C.text, textDecorationLine: out && !showWrong ? 'line-through' : 'none' }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {phase === 'asking' && !usedHint && card.hint ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setUsedHint(true)}
          style={({ pressed }: { pressed: boolean }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 42,
            paddingHorizontal: 14,
            borderRadius: 13,
            backgroundColor: night ? 'rgba(255,244,222,0.12)' : C.honeySoft,
            borderWidth: 1.5,
            borderColor: night ? 'rgba(255,244,222,0.25)' : '#EFD08A',
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon name="bulb" size={18} color={night ? C.honeyLight : C.honeyInk} strokeWidth={2.1} />
          <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: night ? C.onNight : C.text }}>Ask Nova for a hint</Text>
        </Pressable>
      ) : null}

      {usedHint && card.hint ? (
        <Animated.View entering={calm ? undefined : ZoomIn.duration(350)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ width: 40, height: 40 }}>
            <NovaOrb size={36} styleId={novaStyle} mood="explaining" />
          </View>
          <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderTopLeftRadius: 4, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: C.honeySoft }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14.5, lineHeight: 21, color: '#5A3D0E' }}>{card.hint}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
