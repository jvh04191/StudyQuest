import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/art/Avatar';
import { goBackOr } from '@/components/map/TopicSheet';
import { Icon } from '@/components/ui/Icon';
import { Button, Field, T } from '@/components/ui/primitives';
import { CATEGORIES, randomLook, type Look, type Opt, type Section } from '@/lib/avatar';
import { haptic } from '@/lib/feedback';
import { useLevel } from '@/lib/hooks';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font, radius, size, space } from '@/theme/tokens';

export default function AvatarCreator() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const look = useStore((s) => s.player.look);
  const playerName = useStore((s) => s.player.name);
  const setLook = useStore((s) => s.setLook);
  const setPlayer = useStore((s) => s.setPlayer);
  const { level } = useLevel();
  const [tab, setTab] = useState(CATEGORIES[0].id);
  const [name, setName] = useState(playerName);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'player' }), [setContext]));

  const wide = width >= 860;
  const pad = width < 500 ? space.lg : space.xxl;
  const category = CATEGORIES.find((c) => c.id === tab) ?? CATEGORIES[0];
  const saveName = () => name.trim() && setPlayer({ name: name.trim() });

  const preview = (
    <View style={{ alignItems: 'center', gap: space.md, width: wide ? 280 : '100%' }}>
      <Avatar size={wide ? 240 : 180} look={look} label={`${playerName}'s avatar preview`} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          kind="secondary"
          small
          icon="refresh"
          label="Randomize"
          onPress={() => setLook(randomLook(level, look))}
        />
      </View>
      <Field
        label="Explorer name"
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        onSubmitEditing={saveName}
        maxLength={24}
        style={{ alignSelf: 'stretch' }}
      />
      <T v="caption" style={{ textAlign: 'center' }}>
        Items with a lock open up as you level up. You’re level {level}.
      </T>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: insets.top + space.md,
          paddingHorizontal: pad,
          paddingBottom: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          borderBottomWidth: 1,
          borderColor: C.line,
        }}>
        <Button kind="ghost" small icon="chevronLeft" label="Back" onPress={() => { saveName(); goBackOr('/'); }} />
        <T v="heading" style={{ flex: 1 }} accessibilityRole="header">Explorer creator</T>
        <Button small icon="check" label="Done" onPress={() => { saveName(); goBackOr('/'); }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: pad, paddingBottom: 120 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.xxl, alignItems: wide ? 'flex-start' : 'stretch', maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
          {preview}
          <View style={{ flex: 1, minWidth: 0, gap: space.xl }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((c) => {
                const on = c.id === tab;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      haptic('light');
                      setTab(c.id);
                    }}
                    style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                      {
                        height: 42,
                        paddingHorizontal: 16,
                        borderRadius: radius.pill,
                        justifyContent: 'center',
                        backgroundColor: on ? C.teal : C.surface2,
                        borderWidth: 1,
                        borderColor: on ? C.teal : C.line,
                      },
                      focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
                    ]}>
                    <Text style={{ fontFamily: font.bodySemi, fontSize: size.sm, color: on ? C.onAccent : C.text }}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {category.sections.map((sec) => (
              <SectionGrid key={sec.key} section={sec} look={look} level={level} onPick={(id) => setLook({ [sec.key]: id } as Partial<Look>)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Option previews hide the helmet and fancy frame so the detail being chosen is easy to see. */
function previewLook(look: Look, key: keyof Look, id: string): Look {
  const out: Look = { ...look, [key]: id };
  if (key !== 'frame') out.frame = 'plain';
  if (key !== 'headwear' && key !== 'visor' && out.headwear === 'helmet') out.headwear = 'none';
  return out;
}

function SectionGrid({ section, look, level, onPick }: { section: Section; look: Look; level: number; onPick: (id: string) => void }) {
  const current = look[section.key];
  return (
    <View style={{ gap: space.md }}>
      <T v="bodyStrong">{section.title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: section.swatch ? space.md : space.sm }}>
        {section.options.map((o) => (
          <OptionTile key={o.id} opt={o} swatch={!!section.swatch} selected={o.id === current} locked={(o.level ?? 1) > level} preview={previewLook(look, section.key, o.id)} onPick={() => onPick(o.id)} />
        ))}
      </View>
    </View>
  );
}

function OptionTile({ opt, swatch, selected, locked, preview, onPick }: { opt: Opt; swatch: boolean; selected: boolean; locked: boolean; preview: Look; onPick: () => void }) {
  const label = locked ? `${opt.name}, unlocks at level ${opt.level}` : opt.name;
  if (swatch) {
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled: locked }}
        disabled={locked}
        onPress={() => {
          haptic('light');
          onPick();
        }}
        style={({ focused }: { pressed: boolean; focused?: boolean }) => [
          { alignItems: 'center', gap: 4, width: 64, opacity: locked ? 0.45 : 1 },
          focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', borderRadius: 12 } as ViewStyle),
        ]}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            padding: 3,
            borderWidth: 2,
            borderColor: selected ? C.teal : 'transparent',
          }}>
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: opt.color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {opt.color2 ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: '50%', height: '100%', backgroundColor: opt.color2 }} /> : null}
            {locked && <Icon name="lock" size={16} color="#FFFFFF" />}
          </View>
        </View>
        <T v="caption" numberOfLines={1} style={{ color: selected ? C.text : C.textMuted, fontSize: 11 }}>
          {locked ? `Level ${opt.level}` : opt.name}
        </T>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: locked }}
      disabled={locked}
      onPress={() => {
        haptic('light');
        onPick();
      }}
      style={({ focused, pressed }: { pressed: boolean; focused?: boolean }) => [
        {
          width: 96,
          alignItems: 'center',
          gap: 4,
          paddingVertical: space.sm,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: selected ? C.teal : C.line,
          backgroundColor: selected ? C.surface3 : C.surface1,
          opacity: locked ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
      ]}>
      <Avatar size={68} look={preview} label={opt.name} />
      <T v="caption" numberOfLines={1} style={{ color: selected ? C.text : C.textMuted, textAlign: 'center', paddingHorizontal: 4 }}>
        {opt.name}
      </T>
      {locked && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icon name="lock" size={11} color={C.textFaint} />
          <T v="caption" style={{ color: C.textFaint, fontSize: 11 }}>Level {opt.level}</T>
        </View>
      )}
    </Pressable>
  );
}
