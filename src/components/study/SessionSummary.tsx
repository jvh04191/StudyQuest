import { useMemo } from 'react';
import { View } from 'react-native';

import { goBackOr, startQuest } from '@/components/map/TopicSheet';
import { Icon } from '@/components/ui/Icon';
import { Button, Panel, T } from '@/components/ui/primitives';
import { useDeckStats } from '@/lib/hooks';
import { relDue } from '@/lib/util';
import { useNova } from '@/store/novaStore';
import type { SessionRecord } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, font, radius, space } from '@/theme/tokens';

export function SessionSummary({ record }: { record: SessionRecord }) {
  const cards = useStore((s) => s.cards);
  const decks = useStore((s) => s.decks);
  const stats = useDeckStats();
  const abandon = useStore((s) => s.abandonSession);
  const missed = record.missed.map((id) => cards[id]).filter(Boolean);
  const firstTries = record.answered;
  const acc = firstTries ? Math.round((record.firstTryCorrect / Math.max(1, firstTries)) * 100) : null;

  const next = useMemo(() => {
    const ds = decks.filter((d) => record.deckIds.includes(d.id));
    const due = ds.reduce((n, d) => n + stats[d.id].due, 0);
    const soonest = ds.map((d) => stats[d.id].nextDue).filter(Boolean).sort((a, b) => a! - b!)[0];
    return { due, soonest };
  }, [decks, stats, record.deckIds]);

  const leave = () => {
    abandon();
    goBackOr('/');
  };

  const tiles = [
    { label: 'First-try accuracy', value: acc == null ? '—' : `${acc}%` },
    { label: 'Cards reviewed', value: String(record.reviewed) },
    { label: 'Newly proven', value: String(record.provenNow) },
    { label: 'XP earned', value: `+${record.xpTotal}` },
  ];

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 6 }}>
        <T v="eyebrow" style={{ color: C.textFaint }}>{record.kind === 'boss' ? 'Boss battle' : 'Quest'} results</T>
        <T v="title" accessibilityRole="header">{record.title}</T>
        {record.kind === 'boss' && (
          <T v="body" style={{ color: record.bossWon ? C.gold : C.textMuted }}>
            {record.bossWon ? 'You beat the boss with at least 70% first-try accuracy.' : 'The boss needs 70% first-try accuracy. Review the missed concepts below and try again — there’s no penalty.'}
          </T>
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {tiles.map((t) => (
          <View key={t.label} style={{ flexGrow: 1, flexBasis: 140, padding: space.lg, borderRadius: 20, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, boxShadow: `0 4px 0 ${C.panelShadow}`, marginBottom: 4, gap: 4 }}>
            <T v="number" style={{ fontFamily: font.pixelBold, fontSize: 30, lineHeight: 34, color: t.label === 'XP earned' ? C.honeyShadow : C.text }}>{t.value}</T>
            <T v="caption">{t.label}</T>
          </View>
        ))}
      </View>

      <Panel style={{ gap: space.md }}>
        <T v="heading">Review next</T>
        {missed.length ? (
          <>
            <T v="small">You missed these. They’re scheduled to come back soon, and you can practice them now.</T>
            {missed.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: space.md, paddingVertical: 6, borderTopWidth: 1.5, borderColor: C.divider }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.coral, marginTop: 8 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bodyStrong">{c.front}</T>
                  <T v="small">{c.back}</T>
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button icon="refresh" label="Practice these now" onPress={() => startQuest('missed', undefined, false)} />
              <Button
                kind="secondary"
                icon="sparkle"
                label="Ask Nova about them"
                onPress={() => {
                  const n = useNova.getState();
                  n.setContext({ screen: 'study', deckId: record.deckIds[0] });
                  n.setOpen(true);
                  n.send('', 'missed');
                }}
              />
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="check" size={20} color={C.teal} />
            <T v="body">No missed concepts this time.</T>
          </View>
        )}
        <T v="small" style={{ fontFamily: font.bodyMedium }}>
          {next.due ? `${next.due} cards in this topic are still due now.` : next.soonest ? `Next review for this topic: ${relDue(next.soonest)}.` : 'Nothing else is scheduled for this topic yet.'}
        </T>
      </Panel>

      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button icon="check" label="Done" onPress={leave} />
        <Button
          kind="secondary"
          icon="play"
          label="Another quest"
          onPress={() => {
            if (record.kind === 'boss') {
              const sub = decks.find((d) => d.id === record.deckIds[0])?.subjectId;
              startQuest('boss', { subjectId: sub }, false);
            } else if (record.kind === 'quest') startQuest('quest', { deckIds: record.deckIds }, false);
            else startQuest(record.kind, undefined, false);
          }}
        />
      </View>
    </View>
  );
}
