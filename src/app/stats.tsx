import { useMemo } from 'react';
import { View } from 'react-native';

import { goBackOr } from '@/components/map/TopicSheet';
import { Button, Panel, T } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

const DAY = 86400000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const dayName = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short' });

/** A row of vertical bars with a label under each. */
function Bars({ data, tint, max }: { data: { label: string; value: number; top?: string }[]; tint: string; max?: number }) {
  const m = Math.max(1, max ?? Math.max(...data.map((d) => d.value)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' }}>
          <T v="caption" style={{ fontSize: 11 }}>{d.top ?? (d.value ? String(d.value) : '')}</T>
          <View style={{ width: '100%', maxWidth: 34, height: Math.max(d.value ? 6 : 3, (d.value / m) * 78), borderRadius: 8, backgroundColor: d.value ? tint : C.bgDeep }} />
          <T v="caption" style={{ fontSize: 11 }}>{d.label}</T>
        </View>
      ))}
    </View>
  );
}

export default function Stats() {
  const history = useStore((s) => s.history);
  const states = useStore((s) => s.cardStates);
  const cards = useStore((s) => s.cards);
  const player = useStore((s) => s.player);

  const d = useMemo(() => {
    const today = startOfDay(Date.now());
    const days = Array.from({ length: 14 }, (_, i) => today - (13 - i) * DAY);
    const activity = days.map((t) => ({
      label: dayName(t).slice(0, 2),
      value: history.filter((h) => startOfDay(h.finishedAt) === t).reduce((n, h) => n + h.answered, 0),
    }));
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const t = today + i * DAY;
      const value = Object.values(states).filter((s) => s.seen && (i === 0 ? s.due < today + DAY : s.due >= t && s.due < t + DAY)).length;
      return { label: i === 0 ? 'Now' : dayName(t).slice(0, 2), value };
    });
    const recent = history.slice(0, 10).reverse().filter((h) => h.answered > 0);
    const accuracy = recent.map((h, i) => ({
      label: String(i + 1),
      value: Math.round((h.firstTryCorrect / Math.max(1, h.answered)) * 100),
      top: `${Math.round((h.firstTryCorrect / Math.max(1, h.answered)) * 100)}`,
    }));
    const tough = Object.entries(states)
      .filter(([id, s]) => s.lapses > 0 && cards[id])
      .sort((a, b) => b[1].lapses - a[1].lapses)
      .slice(0, 5)
      .map(([id, s]) => ({ card: cards[id], lapses: s.lapses }));
    const seen = Object.values(states).filter((s) => s.seen).length;
    const proven = Object.values(states).filter((s) => s.demonstrated).length;
    const tests = history.filter((h) => h.kind === 'test').slice(0, 5);
    return { activity, forecast, accuracy, tough, seen, proven, tests, total: Object.keys(cards).length, week: activity.slice(-7).reduce((n, a) => n + a.value, 0) };
  }, [history, states, cards]);

  const lifetime = player.totals.reviews ? Math.round((player.totals.correct / player.totals.reviews) * 100) : null;
  const tile = (label: string, value: string) => (
    <View style={{ flexGrow: 1, flexBasis: 140, padding: space.lg, borderRadius: 20, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, boxShadow: `0 4px 0 ${C.panelShadow}`, marginBottom: 4, gap: 4 }}>
      <T v="number" style={{ fontFamily: font.pixelBold, fontSize: 28, lineHeight: 32 }}>{value}</T>
      <T v="caption">{label}</T>
    </View>
  );

  return (
    <Screen maxWidth={820}>
      <Button kind="ghost" small icon="chevronLeft" label="Back" onPress={() => goBackOr('/')} />
      <View style={{ gap: 4 }}>
        <T v="eyebrow" style={{ color: C.textFaint }}>Your journey</T>
        <T v="title" accessibilityRole="header">Stats</T>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {tile('Day streak', String(player.streak))}
        {tile('Answers this week', String(d.week))}
        {tile('Lifetime accuracy', lifetime == null ? '—' : `${lifetime}%`)}
        {tile('Cards proven', `${d.proven}/${d.total}`)}
      </View>

      <Panel style={{ gap: space.md }}>
        <T v="heading">Last 14 days</T>
        <T v="small">Questions answered each day.</T>
        <Bars data={d.activity} tint={C.moss} />
      </Panel>

      <Panel style={{ gap: space.md }}>
        <T v="heading">Reviews coming up</T>
        <T v="small">Cards scheduled to come back. “Now” includes everything already due.</T>
        <Bars data={d.forecast} tint={C.honey} />
      </Panel>

      <Panel style={{ gap: space.md }}>
        <T v="heading">First-try accuracy</T>
        {d.accuracy.length ? (
          <>
            <T v="small">Your last {d.accuracy.length} session{d.accuracy.length === 1 ? '' : 's'}, oldest to newest (percent).</T>
            <Bars data={d.accuracy} tint={C.moss} max={100} />
          </>
        ) : (
          <T v="small">Finish a quest or test to see how you’re improving.</T>
        )}
      </Panel>

      {d.tests.length > 0 && (
        <Panel style={{ gap: space.sm }}>
          <T v="heading">Recent tests</T>
          {d.tests.map((h) => (
            <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 6, borderTopWidth: 1.5, borderColor: C.divider }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bodyStrong" numberOfLines={1}>{h.title}</T>
                <T v="caption">{new Date(h.finishedAt).toLocaleDateString()} · {h.testMode ?? 'mixed'}</T>
              </View>
              <T v="bodyStrong">{Math.round((h.firstTryCorrect / Math.max(1, h.answered)) * 100)}%</T>
            </View>
          ))}
        </Panel>
      )}

      <Panel style={{ gap: space.sm }}>
        <T v="heading">Trickiest cards</T>
        {d.tough.length ? (
          d.tough.map(({ card, lapses }) => (
            <View key={card.id} style={{ flexDirection: 'row', gap: space.md, paddingVertical: 6, borderTopWidth: 1.5, borderColor: C.divider }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bodyStrong">{card.front}</T>
                <T v="small">{card.back}</T>
              </View>
              <T v="caption">forgot {lapses}×</T>
            </View>
          ))
        ) : (
          <T v="small">No cards have slipped yet.</T>
        )}
      </Panel>
    </Screen>
  );
}
