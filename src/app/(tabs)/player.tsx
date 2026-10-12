import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Avatar, Medal } from '@/components/art/Art';
import { NovaOrb } from '@/components/art/NovaOrb';
import { Icon } from '@/components/ui/Icon';
import { Button, Field, Panel, Segmented, T, XpBar } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { HEADWEAR, isLocked, OUTFIT_COLOR, type Look, type Opt } from '@/lib/avatar';
import { useDeckStats, useLevel } from '@/lib/hooks';
import { ACHIEVEMENTS, NOVA_STYLES } from '@/lib/progression';
import { levelTitle } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import type { HeartsMode } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

const HEARTS_OPTIONS: { id: HeartsMode; label: string; desc: string }[] = [
  { id: 'wait', label: 'Wait it out', desc: 'Classic 10-minute rest' },
  { id: 'acorns', label: 'Skip with acorns', desc: 'Spend 30 acorns to skip' },
  { id: 'free', label: 'Free skip', desc: 'Skip the wait anytime' },
  { id: 'off', label: 'Hearts off', desc: 'No hearts, no waiting' },
];

const HOME_OPTIONS = [
  { value: 'trail', label: 'Trail' },
  { value: 'board', label: 'Quest board' },
  { value: 'hearth', label: 'Hearth' },
] as const;

type Tab = 'hats' | 'cloaks' | 'nova';

/** One wardrobe tile: equipped, tap-to-wear, or locked (level number, or "Found in chests"). */
function Tile({ on, locked, lockLabel, name, onPress, children }: { on: boolean; locked: boolean; lockLabel?: string; name: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled: locked }}
      accessibilityLabel={locked ? `${name}, ${lockLabel}` : name}
      disabled={locked}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        {
          width: 100,
          alignItems: 'center',
          gap: 6,
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: on ? C.moss : C.panelBorder,
          backgroundColor: on ? C.mossSoft : C.surface1,
          boxShadow: `0 3px 0 ${on ? C.mossLine2 : C.panelShadow}`,
          opacity: locked ? 0.6 : 1,
          transform: [{ translateY: pressed && !locked ? 2 : 0 }],
          marginBottom: 3,
        },
        focused && ({ outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
      ]}>
      <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      <Text numberOfLines={1} style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: on ? C.mossInk : C.text }}>{name}</Text>
      {locked ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icon name="lock" size={11} color={C.textFaint} />
          <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: C.textFaint }}>{lockLabel}</Text>
        </View>
      ) : (
        <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: on ? C.moss : C.textFaint }}>{on ? 'Wearing' : 'Tap to wear'}</Text>
      )}
    </Pressable>
  );
}

export default function PlayerScreen() {
  const player = useStore((s) => s.player);
  const prefs = useStore((s) => s.prefs);
  const setPlayer = useStore((s) => s.setPlayer);
  const setPrefs = useStore((s) => s.setPrefs);
  const setLook = useStore((s) => s.setLook);
  const resetProgress = useStore((s) => s.resetProgress);
  const eraseEverything = useStore((s) => s.eraseEverything);
  const stats = useDeckStats();
  const lv = useLevel();
  const { width } = useWindowDimensions();
  const [name, setName] = useState(player.name);
  const [tab, setTab] = useState<Tab>('hats');
  const [confirmReset, setConfirmReset] = useState<null | 'progress' | 'all'>(null);
  const [done, setDone] = useState<string | null>(null);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'player' }), [setContext]));

  const totals = Object.values(stats).reduce(
    (a, s) => ({ proven: a.proven + s.counts.proven, mastered: a.mastered + s.counts.mastered, seen: a.seen + s.total - s.counts.new }),
    { proven: 0, mastered: 0, seen: 0 },
  );
  const wide = width >= 900;
  const look = player.look;
  const lockLabel = (o: Opt) => (o.chest ? 'Found in chests' : `Level ${o.level}`);
  const preview = (key: keyof Look, id: string): Look => ({ ...look, [key]: id });

  return (
    <Screen maxWidth={820}>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.xl, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'flex-end' }}>
            {/* pedestal */}
            <View style={{ position: 'absolute', bottom: 0, width: 150, height: 26, borderRadius: 75, backgroundColor: C.bgDeep, boxShadow: `0 4px 0 ${C.panelShadow}, inset 0 0 0 2px ${C.panelBorder}` }} />
            <View style={{ marginBottom: 6 }}>
              <Avatar size={140} look={look} label={`${player.name}'s avatar`} />
            </View>
          </View>
          <Button small kind="secondary" icon="edit" label="Full creator" onPress={() => router.push('/avatar')} />
        </View>
        <View style={{ flex: 1, gap: 10, alignSelf: 'stretch' }}>
          <Field
            label="Explorer name"
            value={name}
            onChangeText={setName}
            onBlur={() => name.trim() && setPlayer({ name: name.trim() })}
            onSubmitEditing={() => name.trim() && setPlayer({ name: name.trim() })}
            style={{ maxWidth: 360 }}
          />
          <Text style={{ fontFamily: font.display, fontSize: 26, color: C.text }}>
            Level {lv.level} <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: C.textMuted }}>· {levelTitle(lv.level)}</Text>
          </Text>
          <View style={{ maxWidth: 480, gap: 4 }}>
            <XpBar pct={lv.pct} />
            <Text style={{ fontFamily: font.pixelMed, fontSize: 13, color: C.textMuted }}>{lv.xp} XP total · {lv.toNext} to level {lv.level + 1}</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { label: 'Day streak', value: player.streak },
          { label: 'Quests', value: player.totals.sessions },
          { label: 'Cards seen', value: totals.seen },
          { label: 'Proven', value: totals.proven },
          { label: 'Mastered', value: totals.mastered },
          { label: 'Boss wins', value: player.totals.bossWins },
        ].map((t) => (
          <View key={t.label} style={{ flexGrow: 1, flexBasis: 100, padding: 14, borderRadius: 18, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, boxShadow: `0 3px 0 ${C.panelShadow}`, gap: 2, marginBottom: 3 }}>
            <Text style={{ fontFamily: font.pixelBold, fontSize: 28, lineHeight: 30, color: C.text }}>{t.value}</Text>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.textMuted }}>{t.label}</Text>
          </View>
        ))}
      </View>

      {/* wardrobe */}
      <Panel style={{ gap: space.lg }}>
        <T v="heading">Wardrobe</T>
        <Segmented<Tab>
          label="Wardrobe"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'hats', label: 'Hats' },
            { value: 'cloaks', label: 'Cloaks' },
            { value: 'nova', label: 'Nova glow' },
          ]}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tab === 'hats' &&
            HEADWEAR.map((o) => (
              <Tile key={o.id} name={o.name} on={look.headwear === o.id} locked={isLocked(o, lv.level, player.found)} lockLabel={lockLabel(o)} onPress={() => setLook({ headwear: o.id })}>
                <Avatar size={56} look={preview('headwear', o.id)} label={o.name} />
              </Tile>
            ))}
          {tab === 'cloaks' &&
            OUTFIT_COLOR.map((o) => (
              <Tile key={o.id} name={o.name} on={look.outfitColor === o.id} locked={isLocked(o, lv.level, player.found)} lockLabel={lockLabel(o)} onPress={() => setLook({ outfitColor: o.id })}>
                <Avatar size={56} look={preview('outfitColor', o.id)} label={o.name} />
              </Tile>
            ))}
          {tab === 'nova' &&
            NOVA_STYLES.map((o) => (
              <Tile key={o.id} name={o.name} on={player.novaStyle === o.id} locked={o.level > lv.level} lockLabel={`Level ${o.level}`} onPress={() => setPlayer({ novaStyle: o.id })}>
                <NovaOrb size={44} styleId={o.id} />
              </Tile>
            ))}
        </View>
        <T v="caption">More ways to dress your explorer live in the full creator.</T>
      </Panel>

      <Button kind="secondary" icon="target" label="View stats" onPress={() => router.push('/stats')} />

      <View style={{ gap: 12 }}>
        <T v="heading">Achievements</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ACHIEVEMENTS.map((a) => {
            const earned = !!player.achievements[a.id];
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.name}. ${a.desc}. ${earned ? 'Earned' : 'Not earned yet'}.`}
                style={{ width: wide ? '23%' : width >= 560 ? '31%' : '47%', flexGrow: 1, alignItems: 'center', gap: 6, padding: 14, borderRadius: 18, backgroundColor: earned ? C.surface1 : C.surface2, borderWidth: 1.5, borderColor: earned ? C.honey : C.panelBorder, boxShadow: `0 3px 0 ${earned ? '#D9B26A' : C.panelShadow}`, marginBottom: 3 }}>
                <Medal glyph={a.glyph} earned={earned} size={60} />
                <Text style={{ textAlign: 'center', fontFamily: font.bodyBold, fontSize: 14, color: earned ? C.text : C.textMuted }}>{a.name}</Text>
                <Text style={{ textAlign: 'center', fontFamily: font.body, fontSize: 12, lineHeight: 16, color: C.textMuted }}>{a.desc}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Panel style={{ gap: space.xl }}>
        <T v="heading">Settings</T>

        <View style={{ gap: space.sm }}>
          <T v="bodyStrong">Hearts & refills</T>
          <View style={{ gap: 8 }}>
            {HEARTS_OPTIONS.map((o) => {
              const on = prefs.heartsMode === o.id;
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setPrefs({ heartsMode: o.id })}
                  style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 15, borderWidth: 2, borderColor: on ? C.moss : C.panelBorder, backgroundColor: on ? C.mossSoft : C.surface1 },
                    focused && ({ outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
                  ]}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.moss : C.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.moss }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 14.5, color: C.text }}>{o.label}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 12.5, color: C.textMuted }}>{o.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <T v="bodyStrong">Home screen</T>
          <Segmented label="Home screen style" value={prefs.homeStyle} onChange={(v) => setPrefs({ homeStyle: v })} options={HOME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </View>
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
              <Icon name="check" size={18} color={C.moss} />
              <T v="small" style={{ color: C.text }}>{done}</T>
            </View>
          )}
          {confirmReset ? (
            <View style={{ gap: space.sm, padding: space.lg, borderRadius: 18, backgroundColor: C.berrySoft, borderWidth: 1.5, borderColor: C.berry }}>
              <T v="bodyStrong" style={{ color: C.berryInk }}>{confirmReset === 'progress' ? 'Reset all progress?' : 'Erase everything?'}</T>
              <T v="small" style={{ color: C.berryInk }}>
                {confirmReset === 'progress'
                  ? 'You go back to level 1 with 0 XP. Every card becomes new again, and achievements, streak, acorns, chest finds and quest history are cleared. Your subjects, decks and cards stay. This can’t be undone.'
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
