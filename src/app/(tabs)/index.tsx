import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Avatar, SubjectArt } from '@/components/art/Art';
import { ConstellationMap } from '@/components/map/ConstellationMap';
import { startQuest, TopicSheet } from '@/components/map/TopicSheet';
import { Icon } from '@/components/ui/Icon';
import { Bar, Button, Panel, Pill, Ring, SectionHead, T, Touchable } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats, useLevel } from '@/lib/hooks';
import { questProgress } from '@/lib/quests';
import { relDue } from '@/lib/util';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font, radius, space } from '@/theme/tokens';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'home' }), [setContext]));

  const wide = width >= 900;
  const mapH = width < 700 ? 400 : Math.round(Math.min(460, Math.max(320, width * 0.42)));

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.xl, alignItems: wide ? 'center' : 'stretch' }}>
          <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
            <PlayerStrip />
          </View>
          <ContinueCard compactWidth={wide} />
        </View>
        <ConstellationMap height={mapH} onSelect={setSelected} selectedId={selected ?? undefined} />
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.xl }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <DailyQuests />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <UpcomingReviews />
          </View>
        </View>
        <RecentDecks />
        <ProgressOverview />
      </Screen>
      {selected && <TopicSheet deckId={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

function PlayerStrip() {
  const player = useStore((s) => s.player);
  const daily = useStore((s) => s.daily);
  const goal = useStore((s) => s.prefs.dailyGoal);
  const lv = useLevel();
  const { width } = useWindowDimensions();
  const narrow = width < 560;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' }}>
      <Touchable accessibilityLabel="Customize your explorer" onPress={() => router.push('/avatar')} style={{ borderRadius: 40 }}>
        <Avatar size={narrow ? 60 : 72} look={player.look} label={`${player.name}'s avatar`} />
      </Touchable>
      <View style={{ flex: 1, minWidth: 200, gap: 6 }}>
        <T v="small">{greeting()}, {player.name}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
          <T v="title" style={{ fontSize: narrow ? 22 : 28 }}>Level {lv.level}</T>
          <T v="small" style={{ fontVariant: ['tabular-nums'] }}>
            {lv.into} / {lv.span} XP
          </T>
        </View>
        <Bar value={lv.pct} tint={C.teal} height={8} style={{ maxWidth: 420 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${player.streak} day streak`}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
            <Icon name="flame" size={24} color={player.streak ? C.gold : C.textFaint} fill={player.streak ? C.goldSoft : undefined} />
          </View>
          <T v="caption">{player.streak} day streak</T>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`Daily goal: ${daily.reviewed} of ${goal} cards`}>
          <Ring value={daily.reviewed / goal} size={56} stroke={5} tint={daily.reviewed >= goal ? C.gold : C.teal}>
            <T v="number" style={{ fontSize: 13 }}>
              {Math.min(daily.reviewed, 999)}
            </T>
          </Ring>
          <T v="caption">of {goal} today</T>
        </View>
      </View>
    </View>
  );
}

function ContinueCard({ compactWidth }: { compactWidth: boolean }) {
  const decks = useStore((s) => s.decks);
  const active = useStore((s) => s.active);
  const stats = useDeckStats();
  const totalDue = Object.values(stats).reduce((n, s) => n + s.due, 0);

  const target = useMemo(() => {
    const byDue = [...decks].filter((d) => stats[d.id]?.due).sort((a, b) => stats[b.id].due - stats[a.id].due)[0];
    if (byDue) return byDue;
    const inProgress = [...decks]
      .filter((d) => stats[d.id]?.state === 'progress')
      .sort((a, b) => (b.lastStudied ?? 0) - (a.lastStudied ?? 0))[0];
    return inProgress ?? decks.find((d) => stats[d.id]?.state === 'new') ?? decks[0];
  }, [decks, stats]);

  const resumable = active && !active.recordId && active.index < active.queue.length;
  const st = target ? stats[target.id] : undefined;
  const line = resumable
    ? `${active.title} · ${active.queue.length - active.index} left`
    : target && st
      ? st.due
        ? `${target.title} · ${st.due} cards ready to review`
        : st.state === 'new'
          ? `${target.title} · new topic`
          : `${target.title} · keep building mastery`
      : 'Create a deck to begin';

  return (
    <View
      style={[
        {
          backgroundColor: C.surface1,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.lineStrong,
          padding: space.lg,
          gap: space.md,
        },
        compactWidth ? { width: 340 } : null,
      ]}>
      <View style={{ gap: 2 }}>
        <T v="heading">Continue your quest</T>
        <T v="small" numberOfLines={1}>{line}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button
          icon="play"
          label={resumable ? 'Resume' : 'Start quest'}
          disabled={!target && !resumable}
          onPress={() => (resumable ? router.push('/study') : target && startQuest('quest', { deckIds: [target.id] }))}
        />
        {!resumable && totalDue > (st?.due ?? 0) && (
          <Button kind="secondary" icon="refresh" label={`All due · ${totalDue}`} onPress={() => startQuest('review')} />
        )}
      </View>
    </View>
  );
}

function DailyQuests() {
  const daily = useStore((s) => s.daily);
  const subjects = useStore((s) => s.subjects);
  return (
    <View style={{ gap: space.md }}>
      <SectionHead title="Daily quests" action={<T v="caption">+25 XP each</T>} />
      <Panel style={{ padding: 0 }}>
        {daily.quests.map((q, i) => {
          const p = questProgress(q, daily);
          const done = daily.questsDone.includes(q.id);
          const complete = p >= q.goal;
          const go = () => {
            if (q.kind === 'weak-deck' && q.deckId) startQuest('quest', { deckIds: [q.deckId] });
            else if (q.kind === 'review-subject' && q.subjectId) {
              const deckIds = useStore.getState().decks.filter((d) => d.subjectId === q.subjectId).map((d) => d.id);
              startQuest('quest', { deckIds });
            } else startQuest('review') ?? startQuest('quest', { deckIds: useStore.getState().decks.slice(0, 1).map((d) => d.id) });
          };
          const subj = subjects.find((s) => s.id === q.subjectId);
          return (
            <Touchable
              key={q.id}
              accessibilityLabel={`${q.title}. ${p} of ${q.goal}.${done ? ' Complete.' : ''}`}
              onPress={done ? undefined : go}
              disabled={done}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                padding: space.lg,
                borderTopWidth: i ? 1 : 0,
                borderColor: C.line,
                borderRadius: i === 0 ? radius.lg : 0,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? C.goldSoft : C.surface3,
                }}>
                <Icon
                  name={done ? 'check' : q.kind === 'correct' ? 'target' : q.kind === 'weak-deck' ? 'bolt' : 'refresh'}
                  size={18}
                  color={done ? C.gold : subj?.color ?? C.teal}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <T v="bodyStrong" style={{ color: done ? C.textMuted : C.text }}>{q.title}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Bar value={p / q.goal} height={5} tint={done || complete ? C.gold : C.teal} style={{ flex: 1 }} />
                  <T v="caption" style={{ fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' }}>
                    {p}/{q.goal}
                  </T>
                </View>
                {complete && !done && <T v="caption" style={{ color: C.gold }}>Complete — reward arrives when you finish your quest</T>}
              </View>
              {!done && <Icon name="chevronRight" size={18} color={C.textFaint} />}
            </Touchable>
          );
        })}
      </Panel>
    </View>
  );
}

function UpcomingReviews() {
  const decks = useStore((s) => s.decks);
  const stats = useDeckStats();
  const rows = decks
    .filter((d) => stats[d.id].due || stats[d.id].nextDue)
    .sort((a, b) => (stats[b.id].due - stats[a.id].due) || ((stats[a.id].nextDue ?? 0) - (stats[b.id].nextDue ?? 0)))
    .slice(0, 4);
  return (
    <View style={{ gap: space.md }}>
      <SectionHead title="Upcoming reviews" />
      <Panel style={{ padding: 0 }}>
        {rows.length === 0 && (
          <View style={{ padding: space.lg, gap: 4 }}>
            <T v="bodyStrong">Nothing scheduled yet</T>
            <T v="small">Finish a quest and cards will return here when it’s the best time to review them.</T>
          </View>
        )}
        {rows.map((d, i) => {
          const st = stats[d.id];
          return (
            <Touchable
              key={d.id}
              accessibilityLabel={`${d.title}, ${st.due ? `${st.due} due now` : `next review ${relDue(st.nextDue!)}`}`}
              onPress={() => startQuest('quest', { deckIds: [d.id] })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <Icon name="clock" size={18} color={st.due ? C.gold : C.textFaint} />
              <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{d.title}</T>
              {st.due ? <Pill label={`${st.due} due now`} tint={C.gold} bg={C.goldSoft} /> : <T v="small">{relDue(st.nextDue!)}</T>}
            </Touchable>
          );
        })}
      </Panel>
    </View>
  );
}

function RecentDecks() {
  const decks = useStore((s) => s.decks);
  const subjects = useStore((s) => s.subjects);
  const stats = useDeckStats();
  const recent = [...decks].sort((a, b) => (b.lastStudied ?? b.createdAt / 1e3) - (a.lastStudied ?? a.createdAt / 1e3)).slice(0, 4);
  const { width } = useWindowDimensions();
  const cols = width >= 1000 ? 4 : width >= 560 ? 2 : 1;
  return (
    <View style={{ gap: space.md }}>
      <SectionHead title="Recent decks" action={<Button kind="ghost" small label="Library" iconRight="chevronRight" onPress={() => router.navigate('/library')} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {recent.map((d) => {
          const st = stats[d.id];
          const sub = subjects.find((s) => s.id === d.subjectId);
          return (
            <Touchable
              key={d.id}
              accessibilityLabel={`${d.title}, ${Math.round(st.mastery * 100)} percent mastery`}
              onPress={() => router.push(`/deck/${d.id}`)}
              style={{
                width: cols === 1 ? '100%' : `${100 / cols - 2}%` as `${number}%`,
                flexGrow: 1,
                backgroundColor: C.surface1,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: C.line,
                padding: space.lg,
                gap: space.md,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                {sub && <SubjectArt art={sub.art} tint={sub.color} size={36} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bodyStrong" numberOfLines={1}>{d.title}</T>
                  <T v="caption">{st.total} cards</T>
                </View>
              </View>
              <Bar value={st.mastery} height={5} tint={st.state === 'mastered' ? C.gold : C.teal} />
              <T v="caption">{Math.round(st.mastery * 100)}% mastery{st.due ? ` · ${st.due} due` : ''}</T>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

function ProgressOverview() {
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const states = useStore((s) => s.cardStates);
  const stats = useDeckStats();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const attention = useMemo(() => {
    const lapsesByDeck: Record<string, number> = {};
    Object.values(cards).forEach((c) => {
      const l = states[c.id]?.lapses ?? 0;
      if (l) lapsesByDeck[c.deckId] = (lapsesByDeck[c.deckId] ?? 0) + 1;
    });
    return decks
      .filter((d) => stats[d.id].state !== 'new' && stats[d.id].state !== 'mastered')
      .map((d) => ({ d, lapses: lapsesByDeck[d.id] ?? 0, mastery: stats[d.id].mastery }))
      .sort((a, b) => b.lapses - a.lapses || a.mastery - b.mastery)
      .slice(0, 3);
  }, [cards, states, decks, stats]);

  return (
    <View style={{ gap: space.md }}>
      <SectionHead title="Learning progress" />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.md }}>
        <Panel style={{ flex: 1, gap: space.lg }}>
          {subjects.map((s) => {
            const ds = decks.filter((d) => d.subjectId === s.id);
            const m = ds.length ? ds.reduce((n, d) => n + stats[d.id].mastery, 0) / ds.length : 0;
            const mastered = ds.filter((d) => stats[d.id].state === 'mastered').length;
            return (
              <View key={s.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <T v="bodyStrong">{s.name}</T>
                  <T v="small" style={{ fontVariant: ['tabular-nums'] }}>
                    {Math.round(m * 100)}% · {mastered}/{ds.length} topics mastered
                  </T>
                </View>
                <Bar value={m} tint={s.color} height={6} />
              </View>
            );
          })}
        </Panel>
        <Panel style={{ flex: 1, gap: space.md }}>
          <T v="bodyStrong">Needs attention</T>
          {attention.length === 0 && <T v="small">No weak spots right now. Start a new topic to keep exploring.</T>}
          {attention.map(({ d, lapses, mastery }) => (
            <Touchable
              key={d.id}
              accessibilityLabel={`Practice ${d.title}`}
              onPress={() => startQuest('quest', { deckIds: [d.id] })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, borderRadius: radius.sm }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lapses ? C.coral : C.gold }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bodyStrong" numberOfLines={1}>{d.title}</T>
                <T v="caption">
                  {lapses ? `${lapses} concept${lapses > 1 ? 's' : ''} missed before · ` : ''}
                  {Math.round(mastery * 100)}% mastery
                </T>
              </View>
              <T v="small" style={{ color: C.teal, fontFamily: font.bodySemi }}>Practice</T>
            </Touchable>
          ))}
        </Panel>
      </View>
    </View>
  );
}
