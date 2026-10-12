import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Avatar, Medal } from '@/components/art/Art';
import { NovaOrb } from '@/components/art/NovaOrb';
import { Icon } from '@/components/ui/Icon';
import { Bar, Button, Field, Panel, Segmented, T } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats, useLevel } from '@/lib/hooks';
import { ACHIEVEMENTS, NOVA_STYLES, type Cosmetic } from '@/lib/progression';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, radius, space } from '@/theme/tokens';

function CosmeticRow({
  title,
  items,
  value,
  level,
  onPick,
  render,
}: {
  title: string;
  items: Cosmetic[];
  value: string;
  level: number;
  onPick: (id: string) => void;
  render: (c: Cosmetic) => React.ReactNode;
}) {
  return (
    <View style={{ gap: space.md }}>
      <T v="bodyStrong">{title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {items.map((c) => {
          const locked = c.level > level;
          const on = c.id === value;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: locked }}
              accessibilityLabel={locked ? `${c.name}, unlocks at level ${c.level}` : c.name}
              disabled={locked}
              onPress={() => onPick(c.id)}
              style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                {
                  width: 104,
                  alignItems: 'center',
                  gap: 6,
                  padding: space.md,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: on ? C.teal : C.line,
                  backgroundColor: on ? C.surface3 : C.surface2,
                  opacity: locked ? 0.5 : 1,
                },
                focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
              ]}>
              {render(c)}
              <T v="caption" style={{ color: on ? C.text : C.textMuted, textAlign: 'center' }}>{c.name}</T>
              {locked && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="lock" size={12} color={C.textFaint} />
                  <T v="caption" style={{ color: C.textFaint }}>Level {c.level}</T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function PlayerScreen() {
  const player = useStore((s) => s.player);
  const prefs = useStore((s) => s.prefs);
  const setPlayer = useStore((s) => s.setPlayer);
  const setPrefs = useStore((s) => s.setPrefs);
  const resetProgress = useStore((s) => s.resetProgress);
  const eraseEverything = useStore((s) => s.eraseEverything);
  const stats = useDeckStats();
  const lv = useLevel();
  const { width } = useWindowDimensions();
  const [name, setName] = useState(player.name);
  const [confirmReset, setConfirmReset] = useState<null | 'progress' | 'all'>(null);
  const [done, setDone] = useState<string | null>(null);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'player' }), [setContext]));

  const totals = Object.values(stats).reduce(
    (a, s) => ({ proven: a.proven + s.counts.proven, mastered: a.mastered + s.counts.mastered, seen: a.seen + s.total - s.counts.new }),
    { proven: 0, mastered: 0, seen: 0 },
  );
  const wide = width >= 900;

  return (
    <Screen maxWidth={960}>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.xl, alignItems: wide ? 'center' : 'flex-start' }}>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Avatar size={150} look={player.look} label={`${player.name}'s avatar`} />
          <Button small kind="secondary" icon="edit" label="Customize explorer" onPress={() => router.push('/avatar')} />
        </View>
        <View style={{ flex: 1, gap: space.md, alignSelf: 'stretch' }}>
          <Field
            label="Explorer name"
            value={name}
            onChangeText={setName}
            onBlur={() => name.trim() && setPlayer({ name: name.trim() })}
            onSubmitEditing={() => name.trim() && setPlayer({ name: name.trim() })}
            style={{ maxWidth: 360 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
            <T v="title">Level {lv.level}</T>
            <T v="small">{lv.xp} XP total · {lv.toNext} to level {lv.level + 1}</T>
          </View>
          <Bar value={lv.pct} style={{ maxWidth: 480 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {[
          { label: 'Day streak', value: player.streak },
          { label: 'Quests completed', value: player.totals.sessions },
          { label: 'Cards seen', value: totals.seen },
          { label: 'Proven', value: totals.proven },
          { label: 'Mastered', value: totals.mastered },
        ].map((t) => (
          <View key={t.label} style={{ flexGrow: 1, flexBasis: 110, padding: space.lg, borderRadius: radius.lg, backgroundColor: C.surface1, borderWidth: 1, borderColor: C.line, gap: 2 }}>
            <T v="title" style={{ fontVariant: ['tabular-nums'] }}>{t.value}</T>
            <T v="caption">{t.label}</T>
          </View>
        ))}
      </View>

      <Panel style={{ gap: space.xl }}>
        <T v="heading">Nova</T>
        <CosmeticRow title="Nova’s look" items={NOVA_STYLES} value={player.novaStyle} level={lv.level} onPick={(id) => setPlayer({ novaStyle: id })} render={(c) => <NovaOrb size={56} styleId={c.id} />} />
      </Panel>

      <View style={{ gap: space.md }}>
        <T v="heading">Achievements</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {ACHIEVEMENTS.map((a) => {
            const earned = !!player.achievements[a.id];
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.name}. ${a.desc}. ${earned ? 'Earned' : 'Not earned yet'}.`}
                style={{ width: wide ? '23%' : width >= 560 ? '31%' : '47%', flexGrow: 1, alignItems: 'center', gap: 6, padding: space.lg, borderRadius: radius.lg, backgroundColor: C.surface1, borderWidth: 1, borderColor: earned ? 'rgba(231,183,95,0.3)' : C.line }}>
                <Medal glyph={a.glyph} earned={earned} size={64} />
                <T v="bodyStrong" style={{ textAlign: 'center', color: earned ? C.text : C.textMuted }}>{a.name}</T>
                <T v="caption" style={{ textAlign: 'center' }}>{a.desc}</T>
              </View>
            );
          })}
        </View>
      </View>

      <Panel style={{ gap: space.xl }}>
        <T v="heading">Settings</T>
        <View style={{ gap: space.sm }}>
          <T v="bodyStrong">Sound effects</T>
          <Segmented
            label="Sound effects"
            value={prefs.sound ? 'on' : 'off'}
            onChange={(v) => setPrefs({ sound: v === 'on' })}
            options={[
              { value: 'off', label: 'Off', icon: 'soundOff' },
              { value: 'on', label: 'On', icon: 'soundOn' },
            ]}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <T v="bodyStrong">Motion</T>
          <Segmented
            label="Motion"
            value={prefs.motion}
            onChange={(v) => setPrefs({ motion: v })}
            options={[
              { value: 'system', label: 'Match device' },
              { value: 'reduce', label: 'Reduced' },
              { value: 'full', label: 'Full' },
            ]}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <T v="bodyStrong">Daily goal</T>
          <Segmented
            label="Daily goal"
            value={String(prefs.dailyGoal) as '10' | '20' | '30' | '50'}
            onChange={(v) => setPrefs({ dailyGoal: Number(v) })}
            options={[
              { value: '10', label: '10 cards' },
              { value: '20', label: '20 cards' },
              { value: '30', label: '30 cards' },
              { value: '50', label: '50 cards' },
            ]}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <T v="bodyStrong">Start over</T>
          {done && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="check" size={18} color={C.teal} />
              <T v="small" style={{ color: C.text }}>{done}</T>
            </View>
          )}
          {confirmReset ? (
            <View style={{ gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: C.surface2, borderLeftWidth: 3, borderColor: C.coral }}>
              <T v="bodyStrong">{confirmReset === 'progress' ? 'Reset all progress?' : 'Erase everything?'}</T>
              <T v="small" style={{ color: C.text }}>
                {confirmReset === 'progress'
                  ? 'You go back to level 1 with 0 XP. Every card becomes new again, and achievements, streak and quest history are cleared. Your subjects, decks and cards stay. This can’t be undone.'
                  : 'This deletes all your subjects, decks and cards, and all progress, then restores the starter Biology and Astronomy decks at level 1. Your name and avatar stay. This can’t be undone.'}
              </T>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button
                  kind="danger"
                  icon="refresh"
                  label={confirmReset === 'progress' ? 'Reset progress' : 'Erase everything'}
                  onPress={() => {
                    if (confirmReset === 'progress') resetProgress();
                    else eraseEverything();
                    useNova.getState().clear();
                    setName(useStore.getState().player.name);
                    setDone(confirmReset === 'progress' ? 'Progress reset. You’re back at level 1.' : 'Everything erased. Starter decks restored.');
                    setConfirmReset(null);
                  }}
                />
                <Button kind="secondary" label="Cancel" onPress={() => setConfirmReset(null)} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button kind="ghost" small icon="refresh" label="Reset all progress" onPress={() => { setDone(null); setConfirmReset('progress'); }} />
              <Button kind="ghost" small icon="trash" label="Erase everything" onPress={() => { setDone(null); setConfirmReset('all'); }} />
            </View>
          )}
        </View>
      </Panel>
    </Screen>
  );
}
