import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubjectArt } from '@/components/art/Art';
import { ConstellationMap } from '@/components/map/ConstellationMap';
import { startQuest, TopicSheet } from '@/components/map/TopicSheet';
import { Button, T } from '@/components/ui/primitives';
import { useDeckStats } from '@/lib/hooks';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, radius, space } from '@/theme/tokens';

export default function MapScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const stats = useDeckStats();
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'map' }), [setContext]));
  const pad = width < 500 ? space.lg : space.xxl;
  const mapH = Math.max(320, height - insets.top - (width >= 700 ? 210 : 290));

  return (
    <View style={{ flex: 1, paddingTop: insets.top + space.xl, paddingHorizontal: pad, gap: space.lg }}>
      <View style={{ gap: 4 }}>
        <T v="title" accessibilityRole="header">Learning map</T>
        <T v="small">Each region is a subject. Topics light up as you learn them and turn gold once mastered. Tap a star to study it.</T>
      </View>
      <ConstellationMap height={mapH} onSelect={setSelected} selectedId={selected ?? undefined} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {subjects.map((s) => {
          const ds = decks.filter((d) => d.subjectId === s.id);
          const seen = ds.reduce((n, d) => n + (stats[d.id].total - stats[d.id].counts.new), 0);
          return (
            <View
              key={s.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingRight: space.lg, borderRadius: radius.lg, backgroundColor: C.surface1, borderWidth: 1, borderColor: C.line, flexGrow: 1 }}>
              <SubjectArt art={s.art} tint={s.color} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bodyStrong">{s.name}</T>
                <T v="caption">{ds.length} topics · {seen} cards studied</T>
              </View>
              <Button
                small
                kind="secondary"
                icon="crown"
                label="Boss battle"
                disabled={seen < 4}
                accessibilityLabel={seen < 4 ? `Boss battle for ${s.name} opens after 4 studied cards` : `Start a boss battle for ${s.name}`}
                onPress={() => startQuest('boss', { subjectId: s.id })}
              />
            </View>
          );
        })}
      </View>
      {selected && <TopicSheet deckId={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}
