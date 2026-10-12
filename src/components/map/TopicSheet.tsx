import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubjectArt } from '@/components/art/Art';
import { useLayoutMode } from '@/components/shell/AppShell';
import { Bar, Button, IconButton, Pill, T } from '@/components/ui/primitives';
import { useCalmMotion } from '@/lib/feedback';
import { deckStateLabel, deckStats } from '@/lib/srs';
import { relDue as relDueLabel } from '@/lib/util';
import { landName } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import type { TestMode } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

/** True when the explorer is out of hearts and must rest before another quest. */
export function isResting() {
  const s = useStore.getState();
  s.tickHearts();
  const p = useStore.getState().player;
  return useStore.getState().prefs.heartsMode !== 'off' && p.hearts <= 0 && !!p.restEndsAt;
}

export function startQuest(
  kind: 'quest' | 'boss' | 'review' | 'missed' | 'test',
  opts?: { deckIds?: string[]; subjectId?: string; testMode?: TestMode; count?: number; minutes?: number },
  navigate = true,
) {
  if (isResting()) {
    if (navigate) router.push('/rest');
    return null;
  }
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
  const subjectIndex = useStore((s) => s.subjects.findIndex((x) => x.id === deck?.subjectId));
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

  const stat = (label: string, value: string | number, tint?: string) => (
    <View style={{ flex: 1, backgroundColor: C.bgDeep, borderRadius: 14, paddingVertical: 10, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontFamily: font.pixelBold, fontSize: 22, color: tint ?? C.text }}>{value}</Text>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: C.textMuted }}>{label}</Text>
    </View>
  );

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: rail ? 'center' : 'flex-end', alignItems: 'center' }}>
      <Animated.View entering={calm ? undefined : FadeIn.duration(160)} exiting={calm ? undefined : FadeOut.duration(140)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Pressable accessibilityLabel="Close topic" onPress={onClose} style={{ flex: 1, backgroundColor: C.scrim }} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        entering={calm ? undefined : SlideInDown.duration(300)}
        exiting={calm ? undefined : SlideOutDown.duration(180)}
        style={{
          width: '100%',
          maxWidth: 500,
          backgroundColor: C.surface1,
          borderRadius: 28,
          borderBottomLeftRadius: rail ? 28 : 0,
          borderBottomRightRadius: rail ? 28 : 0,
          borderWidth: 1.5,
          borderColor: C.panelBorder,
          padding: space.xl,
          paddingBottom: space.xl + (rail ? 0 : insets.bottom),
          gap: space.lg,
        }}>
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
          <SubjectArt art={subject.art} tint={subject.color} size={56} />
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.bgDeep }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: subject.color }} />
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.textMuted }}>{landName(subject, subjectIndex)} · {subject.name}</Text>
            </View>
            <T v="title" style={{ fontSize: 24, lineHeight: 29 }}>{deck.title}</T>
          </View>
          <IconButton icon="close" label="Close" onPress={onClose} size={40} />
        </View>

        {deck.summary ? <T v="body" style={{ color: C.textMuted }}>{deck.summary}</T> : null}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stat('Cards', st.total)}
          {stat('Mastery', `${Math.round(st.mastery * 100)}%`, st.state === 'mastered' ? C.honeyShadow : C.moss)}
          {stat('Due', st.due, st.due ? C.berry : undefined)}
        </View>

        <View style={{ gap: 8 }}>
          <Bar value={st.mastery} height={12} tint={st.state === 'mastered' ? C.honey : C.moss} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill label={deckStateLabel[st.state]} tint={st.state === 'review' || st.state === 'mastered' ? C.honeyInk : st.state === 'progress' ? C.mossInk : C.textMuted} bg={st.state === 'review' || st.state === 'mastered' ? C.honeySoft : st.state === 'progress' ? C.mossSoft : C.bgDeep} />
            {!st.due && st.nextDue ? <Pill icon="clock" label={`Next review ${relDueLabel(st.nextDue)}`} /> : null}
            <T v="caption">{st.counts.new} new · {st.counts.seen} seen · {st.counts.proven} proven · {st.counts.mastered} mastered</T>
          </View>
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
          <Button
            full
            kind="plum"
            icon="crown"
            label="Boss battle: The Forgetting Fog"
            disabled={subjectSeen < 4}
            onPress={() => {
              onClose();
              startQuest('boss', { subjectId: subject.id });
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
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
          {subjectSeen < 4 && <T v="caption">The fog gathers once you’ve studied 4 cards in {subject.name}.</T>}
        </View>
      </Animated.View>
    </View>
  );
}
