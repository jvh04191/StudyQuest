import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NovaOrb } from '@/components/art/NovaOrb';
import { goBackOr } from '@/components/map/TopicSheet';
import { FlashCard } from '@/components/study/FlashCard';
import { QuizItem } from '@/components/study/QuizItem';
import { RewardSequence } from '@/components/study/RewardSequence';
import { SessionSummary } from '@/components/study/SessionSummary';
import { Icon } from '@/components/ui/Icon';
import { Button, IconButton, Panel, T } from '@/components/ui/primitives';
import { useCalmMotion } from '@/lib/feedback';
import { freshState } from '@/lib/srs';
import { useNova } from '@/store/novaStore';
import type { Card, ItemResult } from '@/store/types';
import { useStore, type AnswerInput } from '@/store/useStore';
import { color as C, font, layout, radius, size, space } from '@/theme/tokens';

function sourceLabel(card: Card, deckSource?: { kind: string; title?: string }) {
  if (card.source?.page) return `Source: ${deckSource?.title ?? 'your PDF'}, page ${card.source.page}`;
  if (card.source?.quote) return `From your ${deckSource?.kind === 'pdf' ? 'PDF' : 'notes'}: “${card.source.quote}”`;
  return undefined;
}

export default function Study() {
  const insets = useSafeAreaInsets();
  const calm = useCalmMotion();
  const active = useStore((s) => s.active);
  const cards = useStore((s) => s.cards);
  const states = useStore((s) => s.cardStates);
  const decks = useStore((s) => s.decks);
  const history = useStore((s) => s.history);
  const answer = useStore((s) => s.answer);
  const finishSession = useStore((s) => s.finishSession);
  const abandonSession = useStore((s) => s.abandonSession);
  const markRewardSeen = useStore((s) => s.markRewardSeen);
  const setNova = useNova((s) => s.setContext);
  const openNova = useNova((s) => s.setOpen);
  const [revealed, setRevealed] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [lastXp, setLastXp] = useState<ItemResult | null>(null);

  const item = active && !active.recordId ? active.queue[active.index] : undefined;
  const card = item ? cards[item.cardId] : undefined;
  const deck = card ? decks.find((d) => d.id === card.deckId) : undefined;
  const record = active?.recordId ? history.find((h) => h.id === active.recordId) : undefined;
  const position = active ? `Question ${Math.min(active.index + 1, active.queue.length)} of ${active.queue.length}` : '';

  // Finish automatically when the queue is complete.
  useEffect(() => {
    if (active && !active.recordId && active.index >= active.queue.length) finishSession();
  }, [active, finishSession]);

  // Tell Nova what the learner is looking at.
  useFocusEffect(
    useCallback(() => {
      setNova({
        screen: 'study',
        deckId: card?.deckId ?? active?.deckIds[0],
        cardId: card?.id,
        mode: item?.mode,
        answerVisible: revealed,
        position,
      });
    }, [setNova, card?.deckId, card?.id, item?.mode, revealed, position, active?.deckIds]),
  );

  useEffect(() => setRevealed(false), [item?.key]);
  const onReveal = useCallback((v: boolean) => setRevealed(v), []);

  const commit = (input: AnswerInput) => {
    const r = answer(input);
    if (r) setLastXp(r);
  };

  const xpPulse = useSharedValue(1);
  useEffect(() => {
    if (lastXp?.xp && !calm) xpPulse.value = withSequence(withTiming(1.18, { duration: 120 }), withTiming(1, { duration: 200 }));
  }, [lastXp, calm, xpPulse]);
  const xpA = useAnimatedStyle(() => ({ transform: [{ scale: xpPulse.value }] }));

  const segments = useMemo(() => {
    if (!active) return [];
    return active.queue.map((q, i) => {
      const r = i < active.results.length ? active.results[i] : undefined;
      return { key: q.key, state: r ? (r.correct ? 'right' : 'miss') : i === active.index ? 'now' : 'todo' };
    });
  }, [active]);

  if (!active) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }}>
        <NovaOrb size={80} />
        <T v="title" style={{ textAlign: 'center' }}>No quest in progress</T>
        <T v="body" style={{ textAlign: 'center', color: C.textMuted, maxWidth: 420 }}>
          Pick a topic on the map or a deck in your library to start one.
        </T>
        <Button icon="map" label="Back" onPress={() => goBackOr('/')} />
      </View>
    );
  }

  // Finished: reward sequence first, then summary.
  if (record) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xxl, paddingBottom: 120, paddingHorizontal: space.xl }}>
          <View style={{ width: '100%', maxWidth: layout.readable, alignSelf: 'center' }}>
            <SessionSummary record={record} />
          </View>
        </ScrollView>
        {!record.rewardSeen && <RewardSequence record={record} onDone={() => markRewardSeen(record.id)} />}
      </View>
    );
  }

  const st = card ? states[card.id] ?? freshState() : freshState();

  return (
    <View style={{ flex: 1 }}>
      {/* Quest bar */}
      <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md, borderBottomWidth: 1, borderColor: C.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconButton icon="close" label="Leave quest" onPress={() => setConfirmLeave(true)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="bodyStrong" numberOfLines={1}>{active.title}</T>
            <T v="caption">{position}</T>
          </View>
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: C.goldSoft }, xpA]} accessible accessibilityLabel={`${active.xpEarned} XP earned this quest`}>
            <Icon name="bolt" size={16} color={C.gold} fill={C.gold} />
            <T v="number" style={{ color: C.gold, fontSize: 14 }}>{active.xpEarned}</T>
          </Animated.View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden>
          {segments.map((s) => (
            <View
              key={s.key}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                backgroundColor: s.state === 'right' ? C.teal : s.state === 'miss' ? C.coral : s.state === 'now' ? C.text : C.surface3,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, paddingBottom: 140 }}>
        <View style={{ width: '100%', maxWidth: layout.readable, alignSelf: 'center', gap: space.lg }}>
          {lastXp && (
            <Animated.View key={`${active.index}`} entering={calm ? undefined : FadeIn.duration(200)} exiting={calm ? undefined : FadeOut.duration(200)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 22 }}>
              {lastXp.xp > 0 ? (
                <T v="small" style={{ color: C.gold, fontFamily: font.bodySemi }}>
                  +{lastXp.xp} XP{lastXp.xpNote ? ` · ${lastXp.xpNote}` : ''}
                </T>
              ) : lastXp.xpNote ? (
                <T v="small">{lastXp.xpNote} — mastery still counts</T>
              ) : !lastXp.correct ? (
                <T v="small">Missed concepts come back later in the quest</T>
              ) : null}
            </Animated.View>
          )}
          {item && card ? (
            <Animated.View key={item.key} entering={calm ? undefined : FadeInRight.duration(240)}>
              {item.mode === 'flash' ? (
                <FlashCard card={card} state={st} onFlip={onReveal} onRate={(r) => commit({ correct: r >= 3, firstTry: true, usedHint: false, rating: r })} sourceLabel={sourceLabel(card, deck?.source)} />
              ) : (
                <QuizItem
                  card={card}
                  item={item}
                  onReveal={onReveal}
                  onDone={commit}
                  sourceLabel={sourceLabel(card, deck?.source)}
                  onAskNova={() => {
                    openNova(true);
                    useNova.getState().send('', revealed ? 'simple' : 'hint');
                  }}
                />
              )}
            </Animated.View>
          ) : (
            <T v="body">Wrapping up…</T>
          )}
        </View>
      </ScrollView>

      {confirmLeave && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <Panel style={{ maxWidth: 420, width: '100%', gap: space.md, padding: space.xl }} tone={2}>
            <T v="heading">Leave this quest?</T>
            <T v="body" style={{ color: C.textMuted }}>
              {active.results.length
                ? `Your ${active.results.length} answered card${active.results.length > 1 ? 's are' : ' is'} saved and the XP you earned stays. You’ll skip the rest of the queue.`
                : 'Nothing has been answered yet, so nothing changes.'}
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button label="Keep studying" onPress={() => setConfirmLeave(false)} />
              <Button
                kind="danger"
                label="Leave quest"
                onPress={() => {
                  setConfirmLeave(false);
                  abandonSession();
                  goBackOr('/');
                }}
              />
            </View>
          </Panel>
        </View>
      )}
      {Platform.OS === 'web' && (
        <View style={{ position: 'absolute', left: 0, bottom: insets.bottom + 18, paddingHorizontal: space.lg }} pointerEvents="none">
          <T v="caption" style={{ fontSize: size.xs, color: C.textFaint }}>
            {item?.mode === 'flash' ? 'Space to flip · 1–4 to rate' : item?.mode === 'mc' ? 'Keys 1–4 to choose' : ''}
          </T>
        </View>
      )}
    </View>
  );
}
