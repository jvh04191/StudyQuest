import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Button, T } from '@/components/ui/primitives';
import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { checkTyped } from '@/lib/util';
import type { Card, QueueItem } from '@/store/types';
import type { AnswerInput } from '@/store/useStore';
import { color as C, font, radius, size, space } from '@/theme/tokens';

type Phase = 'asking' | 'wrong' | 'correct' | 'revealed';

export function QuizItem({
  card,
  item,
  onDone,
  onReveal,
  onAskNova,
  sourceLabel,
}: {
  card: Card;
  item: QueueItem;
  onDone: (a: AnswerInput) => void;
  onReveal: (visible: boolean) => void;
  onAskNova: () => void;
  sourceLabel?: string;
}) {
  const calm = useCalmMotion();
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
      if (!calm) shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 50 }));
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

  const kindLabel = item.retry === 'retry' ? 'Another try' : item.retry === 'check' ? 'Quick check' : typedMode ? 'Type the answer' : 'Choose one';

  return (
    <View style={{ gap: space.xl }}>
      <Animated.View style={[{ gap: space.md }, shakeA]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T v="caption" style={{ color: item.retry === 'retry' ? C.gold : C.teal }}>{kindLabel}</T>
          {attempt === 2 && phase === 'asking' && <T v="caption">· second attempt</T>}
        </View>
        <T v="title" style={{ fontSize: 24, lineHeight: 33 }} accessibilityRole="header">{card.front}</T>
      </Animated.View>

      {usedHint && card.hint ? (
        <Animated.View entering={calm ? undefined : FadeIn.duration(200)} style={{ flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, backgroundColor: C.goldSoft }}>
          <Icon name="bulb" size={20} color={C.gold} />
          <T v="body" style={{ flex: 1 }}>{card.hint}</T>
        </Animated.View>
      ) : null}

      {typedMode ? (
        <View style={{ gap: space.md }}>
          <TextInput
            ref={inputRef}
            value={typed}
            onChangeText={setTyped}
            editable={phase === 'asking'}
            autoFocus={Platform.OS === 'web'}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Your answer"
            placeholderTextColor={C.textFaint}
            selectionColor={C.teal}
            onSubmitEditing={submitTyped}
            returnKeyType="done"
            accessibilityLabel="Type your answer"
            style={{
              minHeight: 58,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: phase === 'correct' ? C.teal : phase === 'wrong' || phase === 'revealed' ? C.coral : C.lineStrong,
              backgroundColor: C.bgDeep,
              color: C.text,
              fontFamily: font.bodyMedium,
              fontSize: size.lg,
              paddingHorizontal: space.lg,
            }}
          />
          {phase === 'asking' && (
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button label="Check answer" icon="check" disabled={!typed.trim()} onPress={submitTyped} />
              {!usedHint && card.hint ? <Button kind="secondary" icon="bulb" label="Hint" onPress={() => setUsedHint(true)} /> : null}
            </View>
          )}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {options.map((o, i) => {
            const isAnswer = o === card.back;
            const out = eliminated.includes(o);
            const showRight = (phase === 'correct' || phase === 'revealed') && isAnswer;
            const showWrong = picked === o && !isAnswer;
            const border = showRight ? C.teal : showWrong ? C.coral : C.lineStrong;
            const bg = showRight ? C.tealSoft : showWrong ? C.coralSoft : C.surface2;
            return (
              <Pressable
                key={o}
                accessibilityRole="button"
                accessibilityLabel={`Option ${i + 1}: ${o}${out ? ', ruled out' : ''}`}
                accessibilityState={{ disabled: phase !== 'asking' || out, selected: picked === o }}
                disabled={phase !== 'asking' || out}
                onPress={() => pick(o)}
                style={({ pressed, focused, hovered }: { pressed: boolean; focused?: boolean; hovered?: boolean }) => [
                  {
                    minHeight: 58,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: border,
                    backgroundColor: hovered && phase === 'asking' && !out ? C.surface3 : bg,
                    opacity: out && !showWrong ? 0.38 : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                  focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
                ]}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                  {showRight ? (
                    <Icon name="check" size={16} color={C.teal} strokeWidth={2.4} />
                  ) : showWrong ? (
                    <Icon name="close" size={14} color={C.coral} strokeWidth={2.4} />
                  ) : (
                    <Text style={{ fontFamily: font.bodySemi, fontSize: 12, color: C.textMuted }}>{i + 1}</Text>
                  )}
                </View>
                <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: size.md, lineHeight: 22, color: C.text, textDecorationLine: out && !showWrong ? 'line-through' : 'none' }}>{o}</Text>
              </Pressable>
            );
          })}
          {phase === 'asking' && !usedHint && card.hint ? (
            <Button kind="ghost" small icon="bulb" label="Show a hint" onPress={() => setUsedHint(true)} style={{ marginTop: space.sm }} />
          ) : null}
        </View>
      )}

      {/* Feedback */}
      {phase === 'wrong' && (
        <Animated.View entering={calm ? undefined : FadeIn.duration(200)} style={{ gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: C.surface1, borderWidth: 1, borderColor: 'rgba(238,133,114,0.35)' }}>
          <T v="subheading">Not quite. Have another go.</T>
          <T v="body" style={{ color: C.textMuted }}>
            {typedMode ? `“${typed.trim()}” isn’t it.` : `“${picked}” isn’t the answer.`} {card.hint ? 'Here’s a hint to point you in the right direction.' : 'Think about what the question is really asking.'}
          </T>
          {card.hint ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="bulb" size={20} color={C.gold} />
              <T v="body" style={{ flex: 1 }}>{card.hint}</T>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button icon="refresh" label="Try again" onPress={tryAgain} />
            <Button kind="secondary" label="Show answer" onPress={() => setPhase('revealed')} />
            <Button kind="ghost" icon="sparkle" label="Ask Nova" onPress={onAskNova} />
          </View>
        </Animated.View>
      )}

      {(phase === 'correct' || phase === 'revealed') && (
        <Animated.View
          entering={calm ? undefined : FadeIn.duration(220)}
          style={{
            gap: space.md,
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: C.surface1,
            borderWidth: 1,
            borderColor: phase === 'correct' ? 'rgba(56,214,198,0.4)' : 'rgba(238,133,114,0.35)',
          }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name={phase === 'correct' ? 'check' : 'info'} size={22} color={phase === 'correct' ? C.teal : C.coral} strokeWidth={2.2} />
            <T v="subheading" style={{ flex: 1 }}>
              {phase === 'correct'
                ? attempt === 1 && !usedHint
                  ? 'Correct.'
                  : 'Correct — nice recovery.'
                : `The answer is ${card.back}.`}
            </T>
          </View>
          {closeMatch && <T v="small">Accepted. Watch the spelling: {card.back}</T>}
          {card.detail ? <T v="body" style={{ color: C.textMuted }}>{card.detail}</T> : null}
          {sourceLabel ? <T v="caption">{sourceLabel}</T> : null}
          {phase === 'revealed' && <T v="small">This concept will come back later in the quest so you can lock it in.</T>}

          {phase === 'correct' && attempt === 1 && !usedHint ? (
            <View style={{ gap: space.sm }}>
              <T v="small">How sure were you?</T>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button kind="secondary" label="Guessed" onPress={() => finish(2)} />
                <Button kind="secondary" label="Fairly sure" onPress={() => finish(3)} />
                <Button label="Certain" onPress={() => finish(4)} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button iconRight="arrowRight" label="Continue" onPress={() => (phase === 'correct' ? finish(2) : finish(1, false))} />
              {phase === 'revealed' && <Button kind="ghost" icon="sparkle" label="Ask Nova to explain" onPress={onAskNova} />}
              {phase === 'revealed' && typedMode && typed.trim() ? (
                <Button kind="ghost" label="I was right — count it" onPress={() => onDone({ correct: true, firstTry: false, usedHint: true, rating: 2 })} />
              ) : null}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}
