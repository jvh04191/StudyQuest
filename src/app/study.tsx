import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOut, FadeOutUp, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FogBoss } from '@/components/art/FogBoss';
import { NovaOrb } from '@/components/art/NovaOrb';
import { goBackOr } from '@/components/map/TopicSheet';
import { FlashCard } from '@/components/study/FlashCard';
import { QuizItem } from '@/components/study/QuizItem';
import { RewardSequence } from '@/components/study/RewardSequence';
import { SessionSummary } from '@/components/study/SessionSummary';
import { HeartsRow } from '@/components/ui/Hearts';
import { Icon } from '@/components/ui/Icon';
import { Bar, Button, IconButton, Panel, T } from '@/components/ui/primitives';
import { useCalmMotion } from '@/lib/feedback';
import { freshState } from '@/lib/srs';
import { useDock } from '@/store/dock';
import { useNova } from '@/store/novaStore';
import type { Card, ItemResult } from '@/store/types';
import { useStore, type AnswerInput } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

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
  const hearts = useStore((s) => s.player.hearts);
  const restEndsAt = useStore((s) => s.player.restEndsAt);
  const heartsMode = useStore((s) => s.prefs.heartsMode);
  const answer = useStore((s) => s.answer);
  const finishSession = useStore((s) => s.finishSession);
  const abandonSession = useStore((s) => s.abandonSession);
  const markRewardSeen = useStore((s) => s.markRewardSeen);
  const setNova = useNova((s) => s.setContext);
  const openNova = useNova((s) => s.setOpen);
  const dock = useDock((s) => s.node);
  const [revealed, setRevealed] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [lastXp, setLastXp] = useState<ItemResult | null>(null);
  const [hits, setHits] = useState(0);
  const [penalty, setPenalty] = useState(0);

  const item = active && !active.recordId ? active.queue[active.index] : undefined;
  const card = item ? cards[item.cardId] : undefined;
  const deck = card ? decks.find((d) => d.id === card.deckId) : undefined;
  const record = active?.recordId ? history.find((h) => h.id === active.recordId) : undefined;
  const position = active ? `Question ${Math.min(active.index + 1, active.queue.length)} of ${active.queue.length}` : '';
  const boss = active?.kind === 'boss';

  // Boss HP: each distinct card answered right deals an equal share of damage.
  const bossTotal = active ? Math.max(1, new Set(active.queue.map((q) => q.cardId)).size) : 1;
  const bossHits = active ? new Set(active.results.filter((r) => r.correct).map((r) => r.cardId)).size : 0;
  const hp = Math.max(0, 1 - bossHits / bossTotal);

  // Finish automatically when the queue is complete.
  useEffect(() => {
    if (active && !active.recordId && active.index >= active.queue.length) finishSession();
  }, [active, finishSession]);

  // Timed exam: end the test when the clock runs out.
  const [now, setNow] = useState(Date.now());
  const endsAt = active && !active.recordId ? active.endsAt : undefined;
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [endsAt]);
  const timeLeft = endsAt ? Math.max(0, endsAt - now) : null;
  useEffect(() => {
    if (timeLeft !== 0) return;
    if (useStore.getState().active?.results.length) finishSession();
    else {
      abandonSession();
      goBackOr('/');
    }
  }, [timeLeft, finishSession, abandonSession]);

  // Out of hearts: go and rest by the fire. The quest stays saved.
  useEffect(() => {
    if (active && !active.recordId && heartsMode !== 'off' && hearts <= 0 && restEndsAt) router.replace('/rest');
  }, [active, hearts, restEndsAt, heartsMode]);

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
    if (r) {
      setLastXp(r);
      if (r.heartLost) setPenalty((n) => n + 1);
      if (boss && r.correct) setHits((n) => n + 1);
    }
  };

  const xpPulse = useSharedValue(1);
  useEffect(() => {
    if (lastXp?.xp && !calm) xpPulse.value = withSequence(withTiming(1.18, { duration: 120 }), withTiming(1, { duration: 200 }));
  }, [lastXp, calm, xpPulse]);
  const xpA = useAnimatedStyle(() => ({ transform: [{ scale: xpPulse.value }] }));

  const progress = useMemo(() => {
    if (!active) return 0;
    return Math.min(1, active.index / Math.max(1, active.queue.length));
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
          <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center' }}>
            <SessionSummary record={record} />
          </View>
        </ScrollView>
        {!record.rewardSeen && <RewardSequence record={record} onDone={() => markRewardSeen(record.id)} />}
      </View>
    );
  }

  const st = card ? states[card.id] ?? freshState() : freshState();
  const ink = boss ? C.onNight : C.text;
  const muted = boss ? C.onNightMuted : C.textMuted;

  return (
    <View style={{ flex: 1 }}>
      {boss && <LinearGradient colors={[C.night, C.night2]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}

      {/* HUD */}
      <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton icon="close" label="Leave quest" onPress={() => setConfirmLeave(true)} size={42} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Bar value={progress} height={14} tint={C.moss} track={boss ? 'rgba(255,244,222,0.18)' : C.track} />
          </View>
          {heartsMode !== 'off' && (
            <View>
              <HeartsRow hearts={hearts} size={20} empty={boss ? 'rgba(255,244,222,0.3)' : C.lineStrong} />
              {penalty > 0 && !calm && (
                <Animated.Text
                  key={penalty}
                  entering={FadeIn.duration(100)}
                  exiting={FadeOutUp.duration(900)}
                  style={{ position: 'absolute', right: 0, top: 22, fontFamily: font.pixelBold, fontSize: 16, color: C.berry }}>
                  -1
                </Animated.Text>
              )}
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 12.5, color: muted }}>
            {boss ? 'Boss battle' : active.title} · {position}
          </Text>
          {timeLeft != null && (
            <View accessible accessibilityLabel={`${Math.ceil(timeLeft / 1000)} seconds left`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: timeLeft < 60000 ? C.berrySoft : C.bgDeep }}>
              <Icon name="clock" size={14} color={timeLeft < 60000 ? C.berryInk : C.textMuted} />
              <Text style={{ fontFamily: font.pixelBold, fontSize: 14, color: timeLeft < 60000 ? C.berryInk : C.text }}>{Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}</Text>
            </View>
          )}
          <Animated.View
            accessible
            accessibilityLabel={`${active.xpEarned} XP earned this quest`}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: C.honeySoft }, xpA]}>
            <Icon name="bolt" size={14} color={C.honeyInk} fill={C.honeyInk} />
            <Text style={{ fontFamily: font.pixelBold, fontSize: 14, color: C.honeyInk }}>{active.xpEarned}</Text>
          </Animated.View>
        </View>
        {boss && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <FogBoss size={96} hits={hits} hp={hp} />
            <View style={{ width: '100%', maxWidth: 360, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: font.display, fontSize: 14, color: C.onNight }}>The Forgetting Fog</Text>
                <Text style={{ fontFamily: font.pixelMed, fontSize: 13, color: C.onNightMuted }}>{Math.round(hp * 100)} HP</Text>
              </View>
              <Bar value={hp} height={12} tint={C.berry} track="rgba(255,244,222,0.18)" />
            </View>
          </View>
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 40 }}>
        <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: space.lg }}>
          {/* fixed-height slot so the question doesn't jump when the XP note appears */}
          <View style={{ height: 20 }}>
          {lastXp && (lastXp.xp > 0 || lastXp.xpNote || !lastXp.correct) && (
            <Animated.View key={`${active.index}`} entering={calm ? undefined : FadeIn.duration(200)} exiting={calm ? undefined : FadeOut.duration(200)} style={{ minHeight: 20 }}>
              {lastXp.xp > 0 ? (
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: boss ? C.honeyLight : C.honeyInk }}>
                  +{lastXp.xp} XP{lastXp.xpNote ? ` · ${lastXp.xpNote}` : ''}
                </Text>
              ) : lastXp.xpNote ? (
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: muted }}>{lastXp.xpNote} — mastery still counts</Text>
              ) : (
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: muted }}>Missed concepts come back later in the quest</Text>
              )}
            </Animated.View>
          )}
          </View>
          {item && card ? (
            <Animated.View key={item.key} entering={calm ? undefined : FadeInRight.duration(240)}>
              {item.mode === 'flash' ? (
                <FlashCard
                  card={card}
                  state={st}
                  night={boss}
                  onFlip={onReveal}
                  onRate={(r) => commit({ correct: r >= 3, firstTry: true, usedHint: false, rating: r })}
                  sourceLabel={sourceLabel(card, deck?.source)}
                />
              ) : (
                <QuizItem
                  card={card}
                  item={item}
                  night={boss}
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
            <Text style={{ fontFamily: font.body, fontSize: 15, color: ink }}>Wrapping up…</Text>
          )}
        </View>
      </ScrollView>

      {/* feedback panel pinned to the bottom */}
      {dock}

      {confirmLeave && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <Panel style={{ maxWidth: 420, width: '100%', gap: space.md, padding: space.xl }} tone={1}>
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
      {Platform.OS === 'web' && !dock && (
        <View style={{ position: 'absolute', left: 0, bottom: insets.bottom + 10, paddingHorizontal: space.lg }} pointerEvents="none">
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: boss ? C.onNightMuted : C.textFaint }}>
            {item?.mode === 'flash' ? 'Space to flip · 1–4 to rate' : item?.mode === 'mc' ? 'Keys 1–4 to choose' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
