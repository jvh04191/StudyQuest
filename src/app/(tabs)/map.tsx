import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { SubjectArt } from '@/components/art/Art';
import { MAP_LEGEND, WorldMap } from '@/components/map/WorldMap';
import { startQuest, TopicSheet } from '@/components/map/TopicSheet';
import { Button, T } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats } from '@/lib/hooks';
import { landName } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

export default function MapScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const stats = useDeckStats();
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'map' }), [setContext]));

  return (
    <View style={{ flex: 1 }}>
      <Screen maxWidth={920}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <View>
            <T v="eyebrow" style={{ color: C.textFaint }}>World map</T>
            <T v="title" accessibilityRole="header" style={{ marginTop: 4 }}>The Learning Lands</T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MAP_LEGEND.map((g) => (
              <View key={g.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: g.bg, borderWidth: 2, borderColor: g.ring }} />
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.textMuted }}>{g.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <WorldMap onSelect={setSelected} selectedId={selected ?? undefined} />
        {width < 720 && (
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12.5, color: C.textFaint, textAlign: 'center', marginTop: -10 }}>Swipe the map to explore · tap a stop to begin</Text>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {subjects.map((s, i) => {
            const ds = decks.filter((d) => d.subjectId === s.id);
            const seen = ds.reduce((n, d) => n + (stats[d.id].total - stats[d.id].counts.new), 0);
            return (
              <View
                key={s.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingRight: space.lg, borderRadius: 20, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, boxShadow: `0 4px 0 ${C.panelShadow}`, flexGrow: 1, flexBasis: 280, marginBottom: 4 }}>
                <SubjectArt art={s.art} tint={s.color} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bodyStrong" numberOfLines={1}>{landName(s, i)}</T>
                  <T v="caption">{s.name} · {ds.length} topics · {seen} cards studied</T>
                </View>
                <Button
                  small
                  kind="plum"
                  icon="crown"
                  label="Boss"
                  disabled={seen < 4}
                  accessibilityLabel={seen < 4 ? `Boss battle for ${s.name} opens after 4 studied cards` : `Start a boss battle for ${s.name}`}
                  onPress={() => startQuest('boss', { subjectId: s.id })}
                />
              </View>
            );
          })}
        </View>
      </Screen>
      {selected && <TopicSheet deckId={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}
