import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubjectArt } from '@/components/art/Art';
import { useLayoutMode } from '@/components/shell/AppShell';
import { Bar, Button, IconButton, Pill, T } from '@/components/ui/primitives';
import { useCalmMotion } from '@/lib/feedback';
import { deckStateLabel, deckStats } from '@/lib/srs';
import { relDue as relDueLabel } from '@/lib/util';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, radius, space } from '@/theme/tokens';

export function startQuest(
  kind: 'quest' | 'boss' | 'review' | 'missed',
  opts?: { deckIds?: string[]; subjectId?: string },
  navigate = true,
) {
  const s = useStore.getState();
  if (s.active && !s.active.recordId && s.active.results.length) s.abandonSession();
  const id = s.startSession(kind, opts);
  if (id && navigate) router.push('/study');
  return id;
}

/** Leave a full-screen flow and return to wherever it was opened from. */
export function goBackOr(href: '/' | '/library' | '/map') {
  if (router.canGoBack()) router.back();
  else router.replace(href);
}

export function TopicSheet({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const subject = useStore((s) => s.subjects.find((x) => x.id === deck?.subjectId));
  const cards = useStore((s) => s.cards);
  const states = useStore((s) => s.cardStates);
  const subjectSeen = useStore((s) => {
    if (!deck) return 0;
    const ids = new Set(s.decks.filter((d) => d.subjectId === deck.subjectId).map((d) => d.id));
    return Object.values(s.cards).filter((c) => ids.has(c.deckId) && s.cardStates[c.id]?.seen).length;
  });
  const { rail } = useLayoutMode();
  const insets = useSafeAreaInsets();
  const calm = useCalmMotion();
  if (!deck || !subject) return null;
  const st = deckStats(deck, cards, states);

  const askNova = () => {
    useNova.getState().setContext({ screen: 'deck', deckId: deck.id });
    useNova.getState().setOpen(true);
    onClose();
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: rail ? 'center' : 'flex-end', alignItems: 'center' }}>
      <Animated.View entering={calm ? undefined : FadeIn.duration(160)} exiting={calm ? undefined : FadeOut.duration(140)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Pressable accessibilityLabel="Close topic" onPress={onClose} style={{ flex: 1, backgroundColor: C.scrim }} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        entering={calm ? undefined : SlideInDown.springify().damping(20).stiffness(220)}
        exiting={calm ? undefined : SlideOutDown.duration(180)}
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: C.surface1,
          borderRadius: radius.xl,
          borderBottomLeftRadius: rail ? radius.xl : 0,
          borderBottomRightRadius: rail ? radius.xl : 0,
          borderWidth: 1,
          borderColor: C.lineStrong,
          padding: space.xl,
          paddingBottom: space.xl + (rail ? 0 : insets.bottom),
          gap: space.lg,
        }}>
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
          <SubjectArt art={subject.art} tint={subject.color} size={56} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T v="caption" style={{ color: subject.color }}>{subject.name}</T>
            <T v="title" style={{ fontSize: 24, lineHeight: 30 }}>{deck.title}</T>
          </View>
          <IconButton icon="close" label="Close" onPress={onClose} size={40} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Pill
            label={deckStateLabel[st.state]}
            tint={st.state === 'review' || st.state === 'mastered' ? C.gold : st.state === 'progress' ? C.teal : C.textMuted}
            bg={st.state === 'review' || st.state === 'mastered' ? C.goldSoft : st.state === 'progress' ? C.tealSoft : C.surface3}
          />
          {st.due > 0 && <Pill icon="clock" label={`${st.due} due now`} tint={C.gold} bg={C.goldSoft} />}
          {!st.due && st.nextDue && <Pill icon="clock" label={`Next review ${relDueLabel(st.nextDue)}`} />}
        </View>

        {deck.summary ? <T v="body" style={{ color: C.textMuted }}>{deck.summary}</T> : null}

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small">Mastery</T>
            <T v="small" style={{ color: C.text, fontVariant: ['tabular-nums'] }}>{Math.round(st.mastery * 100)}%</T>
          </View>
          <Bar value={st.mastery} tint={st.state === 'mastered' ? C.gold : C.teal} />
          <T v="caption">
            {st.counts.new} new · {st.counts.seen} seen · {st.counts.proven} proven · {st.counts.mastered} mastered
          </T>
        </View>

        <View style={{ gap: space.sm }}>
          <Button
            full
            icon="play"
            label={st.due ? `Start quest · review ${st.due}` : st.state === 'new' ? 'Start quest · learn this topic' : 'Start quest'}
            disabled={!st.total}
            onPress={() => {
              onClose();
              startQuest('quest', { deckIds: [deck.id] });
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              small
              icon="crown"
              label={`Boss battle · ${subject.name}`}
              disabled={subjectSeen < 4}
              onPress={() => {
                onClose();
                startQuest('boss', { subjectId: subject.id });
              }}
            />
            <Button kind="secondary" small icon="sparkle" label="Ask Nova" onPress={askNova} />
            <Button
              kind="ghost"
              small
              icon="cards"
              label="Open deck"
              onPress={() => {
                onClose();
                router.push(`/deck/${deck.id}`);
              }}
            />
          </View>
          {subjectSeen < 4 && <T v="caption">Boss battles open once you’ve studied 4 cards in {subject.name}.</T>}
        </View>
      </Animated.View>
    </View>
  );
}
