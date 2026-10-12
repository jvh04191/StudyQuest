import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/art/Art';
import { NovaOrb } from '@/components/art/NovaOrb';
import { startQuest } from '@/components/map/TopicSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useRestLeft } from '@/components/ui/Hearts';
import { Bar, Button, Chip, T, Touchable, XpBar } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats, useLevel } from '@/lib/hooks';
import { questProgress } from '@/lib/quests';
import { landName, levelTitle } from '@/lib/world';
import { relDue } from '@/lib/util';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import type { QuestDef } from '@/store/types';
import { color as C, font, space } from '@/theme/tokens';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const eyebrow = { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' } as const;

function goQuest(q: QuestDef) {
  if (q.kind === 'weak-deck' && q.deckId) startQuest('quest', { deckIds: [q.deckId] });
  else if (q.kind === 'review-subject' && q.subjectId) {
    const deckIds = useStore.getState().decks.filter((d) => d.subjectId === q.subjectId).map((d) => d.id);
    startQuest('quest', { deckIds });
  } else startQuest('review') ?? startQuest('quest', { deckIds: useStore.getState().decks.slice(0, 1).map((d) => d.id) });
}

export default function Home() {
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'home' }), [setContext]));
  const homeStyle = useStore((s) => s.prefs.homeStyle);
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  return (
    <Screen maxWidth={780}>
      <Header />
      <PlayerStrip />
      <ContinueBanner />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0, alignSelf: 'stretch' }}>
          {homeStyle === 'board' ? <QuestBoard /> : homeStyle === 'hearth' ? <Hearth /> : <Trail />}
        </View>
        {wide && (
          <View style={{ flex: 1, minWidth: 0, gap: space.xl }}>
            <ReadyToReview />
            <Lands />
          </View>
        )}
      </View>
      {!wide && <ReadyToReview />}
      {!wide && <Lands />}
    </Screen>
  );
}

/* ---------- header ---------- */

function Header() {
  const player = useStore((s) => s.player);
  const mode = useStore((s) => s.prefs.heartsMode);
  const rest = useRestLeft();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <Text style={{ fontFamily: font.display, fontSize: 21, color: C.text }}>StudyQuest</Text>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        <Chip icon="flame" value={player.streak} tint={C.flame} label="Streak" />
        {mode !== 'off' && (
          <Touchable accessibilityLabel={rest ? 'Resting. Open rest' : `${player.hearts} hearts`} onPress={rest ? () => router.push('/rest') : undefined} disabled={!rest}>
            <Chip icon="heart" value={rest ? 'Rest' : player.hearts} tint={C.berry} label="Hearts" />
          </Touchable>
        )}
        <Chip icon="acorn" value={player.acorns} tint={C.acorn} label="Acorns" />
      </View>
    </View>
  );
}

/* ---------- player ---------- */

function PlayerStrip() {
  const player = useStore((s) => s.player);
  const lv = useLevel();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Touchable
        accessibilityLabel="Customize your explorer"
        onPress={() => router.push('/avatar')}
        style={{ width: 66, height: 66, borderRadius: 33, padding: 3, backgroundColor: C.surface1, boxShadow: `0 0 0 2px ${C.panelBorder}, 0 4px 0 2px ${C.panelShadow}` }}>
        <Avatar size={60} look={player.look} label={`${player.name}'s avatar`} />
      </Touchable>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <T v="caption" style={{ fontSize: 13 }}>{greeting()}, {player.name}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontFamily: font.display, fontSize: 24, color: C.text }}>
            Level {lv.level} <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: C.textMuted }}>· {levelTitle(lv.level)}</Text>
          </Text>
          <Text style={{ fontFamily: font.pixelMed, fontSize: 13, color: C.textMuted }}>{lv.into}/{lv.span} XP</Text>
        </View>
        <XpBar pct={lv.pct} />
      </View>
    </View>
  );
}

function useContinue() {
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
  const resumable = !!active && !active.recordId && active.index < active.queue.length;
  const st = target ? stats[target.id] : undefined;
  const line =
    resumable && active
      ? `${active.queue.length - active.index} questions left`
      : target && st
        ? st.due
          ? `${st.due} cards ready to review`
          : st.state === 'new'
            ? 'A new topic to explore'
            : 'Keep building mastery'
        : 'Create a deck to begin';
  const title = resumable && active ? active.title : target?.title ?? 'Start your adventure';
  const go = () => (resumable ? router.push('/study') : target && startQuest('quest', { deckIds: [target.id] }));
  return { title, line, go, resumable, can: !!target || resumable, totalDue };
}

function ContinueBanner() {
  const c = useContinue();
  const styleId = useStore((s) => s.player.novaStyle);
  return (
    <View style={{ borderRadius: 24, backgroundColor: C.moss, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', boxShadow: `0 5px 0 ${C.mossShadow}`, marginBottom: 5 }}>
      <LinearGradient colors={['rgba(255,226,160,0.30)', 'rgba(255,226,160,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.7 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text style={[eyebrow, { color: '#CFE3BE' }]}>{c.resumable ? 'Pick up where you left off' : 'Continue your quest'}</Text>
        <Text style={{ fontFamily: font.display, fontSize: 23, lineHeight: 26, color: '#FFF9EE' }}>{c.title}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 14, color: '#E3EED8' }}>{c.line}</Text>
        <Button kind="gold" icon="play" label={c.resumable ? 'Resume' : 'Start'} disabled={!c.can} onPress={c.go} style={{ marginTop: 10 }} />
      </View>
      <View style={{ width: 84, height: 84, marginRight: 4 }}>
        <NovaOrb size={72} mood="happy" styleId={styleId} />
      </View>
    </View>
  );
}

/* ---------- daily quest heroes ---------- */

function useQuests() {
  const daily = useStore((s) => s.daily);
  const subjects = useStore((s) => s.subjects);
  const rows = daily.quests.map((q) => {
    const p = questProgress(q, daily);
    const done = daily.questsDone.includes(q.id);
    const subj = subjects.find((s) => s.id === q.subjectId);
    const icon: IconName = done ? 'check' : q.kind === 'correct' ? 'target' : q.kind === 'weak-deck' ? 'bolt' : 'refresh';
    return { q, p, done, icon, subj, short: shortTitle(q), sub: q.title };
  });
  const allDone = rows.length > 0 && rows.every((r) => r.done);
  return { rows, allDone, left: rows.filter((r) => !r.done).length };
}

function shortTitle(q: QuestDef) {
  if (q.kind === 'review-subject') return `Review ${q.goal} cards`;
  if (q.kind === 'weak-deck') return 'Practice a weak spot';
  return `${q.goal} correct answers`;
}

function Trail() {
  const { rows, allDone, left } = useQuests();
  const firstOpen = rows.findIndex((r) => !r.done);
  return (
    <View style={{ backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 22, boxShadow: `0 4px 0 ${C.panelShadow}`, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <View>
          <Text style={[eyebrow, { color: C.textFaint }]}>Today’s trail</Text>
          <Text style={{ fontFamily: font.display, fontSize: 19, lineHeight: 23, marginTop: 3, color: C.text }}>
            {allDone ? 'Trail complete!' : `${left === 1 ? 'One stop' : left === 2 ? 'Two stops' : 'Three stops'} to a chest`}
          </Text>
        </View>
        <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.honeySoft }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.honeyInk }}>+25 XP each</Text>
        </View>
      </View>
      {rows.map((r, i) => {
        const active = i === firstOpen || (!r.done && r.p > 0);
        const node = r.done
          ? { bg: C.moss, ring: C.mossLine, shadow: C.mossShadow, fg: '#FFFFFF' }
          : active
            ? { bg: C.honeySoft, ring: C.honey, shadow: C.honeyShadow, fg: C.honeyInk }
            : { bg: C.surface1, ring: C.panelBorder, shadow: C.panelShadow, fg: C.navInactive };
        return (
          <Touchable
            key={r.q.id}
            accessibilityLabel={`${r.q.title}. ${r.p} of ${r.q.goal}.${r.done ? ' Complete.' : ''}`}
            onPress={r.done ? undefined : () => goQuest(r.q)}
            disabled={r.done}
            style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center', width: 44 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: node.bg, borderWidth: 3, borderColor: node.ring, boxShadow: `0 3px 0 ${node.shadow}`, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={r.icon} size={20} color={node.fg} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, minHeight: 14, borderLeftWidth: 3, borderStyle: 'dotted', borderColor: '#D3BE96', marginVertical: 3 }} />
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingTop: 3, paddingBottom: 16, gap: 7 }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20, color: r.done ? C.textMuted : C.text }}>{r.q.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bar value={r.p / r.q.goal} height={8} track={C.bgDeep} tint={r.done ? C.moss : C.honey} style={{ flex: 1 }} />
                <Text style={{ fontFamily: font.pixelMed, fontSize: 12.5, color: C.textMuted, minWidth: 32, textAlign: 'right' }}>{r.p}/{r.q.goal}</Text>
              </View>
            </View>
          </Touchable>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: allDone ? C.honey : '#D9C9A8', boxShadow: `0 3px 0 ${allDone ? C.honeyShadow : '#B8A57F'}`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chest" size={24} color={C.surface1} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: C.text }}>Treasure chest</Text>
          <Text style={{ fontFamily: font.body, fontSize: 12.5, color: C.textMuted }}>
            {allDone ? 'Claimed from your last quest' : 'Finish all stops for a bigger chest'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const PINS = [C.berry, C.honey, C.moss];
const ROTS = ['-2.4deg', '1.6deg', '-1deg'];

function QuestBoard() {
  const { rows, left } = useQuests();
  return (
    <View style={{ borderRadius: 22, padding: 18, paddingBottom: 22, backgroundColor: '#B98957', boxShadow: 'inset 0 0 0 7px #8E6438, inset 0 3px 14px rgba(0,0,0,0.28), 0 5px 0 #6E4A28', marginBottom: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', margin: 4, marginBottom: 16 }}>
        <Text style={{ fontFamily: font.display, fontSize: 20, color: '#FFF4DE' }}>Notice board</Text>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: '#FFF4DE', opacity: 0.9 }}>{left ? `${left} left today` : 'All done!'}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {rows.map((r, i) => (
          <Touchable
            key={r.q.id}
            accessibilityLabel={`${r.q.title}. ${r.p} of ${r.q.goal}.${r.done ? ' Complete.' : ''}`}
            onPress={r.done ? undefined : () => goQuest(r.q)}
            disabled={r.done}
            style={{ flexGrow: 1, flexBasis: 130, backgroundColor: '#FFF6DF', paddingTop: 20, paddingHorizontal: 14, paddingBottom: 14, borderRadius: 4, gap: 8, transform: [{ rotate: ROTS[i % 3] }], boxShadow: '0 8px 12px -6px rgba(40,20,0,0.45)' }}>
            <View style={{ position: 'absolute', top: 6, left: '50%', width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: PINS[i % 3], boxShadow: '0 2px 0 rgba(0,0,0,0.25)' }} />
            <Text style={{ fontFamily: font.display, fontSize: 16, lineHeight: 20, color: C.text }}>{r.short}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12.5, lineHeight: 17, color: C.textMuted }}>{r.sub}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.honeyInk }}>+25 XP</Text>
              <Text style={{ fontFamily: font.pixelMed, fontSize: 13, color: C.text }}>{r.p}/{r.q.goal}</Text>
            </View>
            {r.done && (
              <View style={{ position: 'absolute', right: 8, top: 26, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 2.5, borderColor: C.moss, borderRadius: 6, transform: [{ rotate: '-12deg' }] }}>
                <Text style={{ fontFamily: font.heavy, fontSize: 13, letterSpacing: 1, color: C.moss }}>DONE</Text>
              </View>
            )}
          </Touchable>
        ))}
      </View>
    </View>
  );
}

const STARS = [
  [8, 10, 3], [22, 24, 2], [40, 8, 2], [58, 18, 3], [76, 9, 2], [90, 26, 2], [14, 44, 2], [84, 48, 3], [30, 34, 2], [66, 38, 2],
];

function Hearth() {
  const c = useContinue();
  const { rows } = useQuests();
  const styleId = useStore((s) => s.player.novaStyle);
  const line = c.resumable ? 'Your quest is waiting right where you left it.' : c.totalDue ? `${c.totalDue} cards are ready. Shall we?` : 'All is quiet. A fine evening to learn something new.';
  return (
    <View style={{ gap: 14 }}>
      <View style={{ borderRadius: 26, minHeight: 300, overflow: 'hidden', paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 12, boxShadow: '0 5px 0 #1E1830', marginBottom: 5 }}>
        <LinearGradient colors={['#2B2340', '#45325A', '#A9573A']} locations={[0, 0.55, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {STARS.map(([x, y, s], i) => (
          <View key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: s, height: s, borderRadius: s, backgroundColor: C.onNight, opacity: 0.7 }} />
        ))}
        <LinearGradient colors={['rgba(255,176,90,0.75)', 'rgba(255,176,90,0)']} style={{ position: 'absolute', bottom: -60, left: '50%', marginLeft: -160, width: 320, height: 160, borderRadius: 160 }} />
        <Text style={[eyebrow, { color: '#E8D3F0' }]}>By the hearth</Text>
        <View style={{ width: 104, height: 104, marginVertical: 6 }}>
          <NovaOrb size={96} mood="happy" styleId={styleId} />
        </View>
        <View style={{ backgroundColor: C.surface1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, maxWidth: 300, boxShadow: '0 4px 0 rgba(0,0,0,0.25)' }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 15, lineHeight: 21, color: C.text, textAlign: 'center' }}>{line}</Text>
        </View>
        <Button kind="gold" icon="play" label={c.resumable ? 'Resume' : 'Start quest'} disabled={!c.can} onPress={c.go} style={{ alignSelf: 'center' }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {rows.map((r) => (
          <Touchable
            key={r.q.id}
            onPress={r.done ? undefined : () => goQuest(r.q)}
            disabled={r.done}
            accessibilityLabel={`${r.q.title}. ${r.p} of ${r.q.goal}`}
            style={{ flexGrow: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 14, boxShadow: `0 3px 0 ${C.panelShadow}` }}>
            <Icon name={r.icon} size={18} color={r.done ? C.moss : C.honeyInk} strokeWidth={2.2} />
            <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 13, lineHeight: 16, color: C.text }}>{r.short}</Text>
            <Text style={{ fontFamily: font.pixelMed, fontSize: 12, color: C.textMuted }}>{r.p}/{r.q.goal}</Text>
          </Touchable>
        ))}
      </View>
    </View>
  );
}

/* ---------- review + lands ---------- */

function ReadyToReview() {
  const decks = useStore((s) => s.decks);
  const subjects = useStore((s) => s.subjects);
  const stats = useDeckStats();
  const totalDue = Object.values(stats).reduce((n, s) => n + s.due, 0);
  const rows = decks
    .filter((d) => stats[d.id].due || stats[d.id].nextDue)
    .sort((a, b) => (stats[b.id].due - stats[a.id].due) || ((stats[a.id].nextDue ?? 0) - (stats[b.id].nextDue ?? 0)))
    .slice(0, 4);
  return (
    <View style={{ backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 22, boxShadow: `0 4px 0 ${C.panelShadow}`, paddingVertical: 6, overflow: 'hidden', marginBottom: 4 }}>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontFamily: font.display, fontSize: 18, color: C.text }}>Ready to review</Text>
        <Text style={{ fontFamily: font.pixelMed, fontSize: 13, color: C.textMuted }}>{totalDue} cards</Text>
      </View>
      {rows.length === 0 && (
        <View style={{ padding: 16, gap: 4, borderTopWidth: 1.5, borderColor: C.divider }}>
          <T v="bodyStrong">Nothing scheduled yet</T>
          <T v="small">Finish a quest and cards will return here when it’s the best time to review them.</T>
        </View>
      )}
      {rows.map((d) => {
        const st = stats[d.id];
        const si = subjects.findIndex((s) => s.id === d.subjectId);
        const sub = subjects[si];
        return (
          <Touchable
            key={d.id}
            accessibilityLabel={`${d.title}, ${st.due ? `${st.due} due now` : `next review ${relDue(st.nextDue!)}`}`}
            onPress={() => startQuest('quest', { deckIds: [d.id] })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1.5, borderColor: C.divider }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sub?.color ?? C.moss }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.bodyBold, fontSize: 15, color: C.text }}>{d.title}</Text>
              {sub && <Text style={{ fontFamily: font.body, fontSize: 12.5, color: C.textMuted }}>{landName(sub, si)}</Text>}
            </View>
            <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: st.due ? C.berrySoft : C.bgDeep }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: st.due ? C.berryInk : C.textMuted }}>{st.due ? `${st.due} due` : relDue(st.nextDue!)}</Text>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}

function Lands() {
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const stats = useDeckStats();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {subjects.map((s, i) => {
        const ds = decks.filter((d) => d.subjectId === s.id);
        const m = ds.length ? ds.reduce((n, d) => n + stats[d.id].mastery, 0) / ds.length : 0;
        const mastered = ds.filter((d) => stats[d.id].state === 'mastered').length;
        const pct = `${Math.round(m * 100)}%`;
        return (
          <Touchable
            key={s.id}
            accessibilityLabel={`${landName(s, i)}, ${s.name}, ${pct} mastery`}
            onPress={() => router.navigate('/map')}
            style={{ flexGrow: 1, flexBasis: 140, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 20, boxShadow: `0 4px 0 ${C.panelShadow}`, overflow: 'hidden', marginBottom: 4 }}>
            <View style={{ height: 8, backgroundColor: s.color }} />
            <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
              <Text style={{ fontFamily: font.display, fontSize: 16, color: C.text }}>{landName(s, i)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontFamily: font.pixelBold, fontSize: 26, lineHeight: 28, color: s.color }}>{pct}</Text>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.textMuted }}>{s.name}</Text>
              </View>
              <Bar value={m} height={7} tint={s.color} track={C.bgDeep} />
              <Text style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>{mastered}/{ds.length} topics mastered</Text>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}
