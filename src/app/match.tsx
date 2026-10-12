import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { goBackOr } from '@/components/map/TopicSheet';
import { Button, Panel, T } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

interface Tile {
  key: string;
  cardId: string;
  text: string;
}

const shuffle = <T,>(a: T[]) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

/** Match game: pair each question with its answer as fast as you can. A wrong pair adds a 2 second penalty. */
export default function Match() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useStore((s) => s.decks.find((d) => d.id === id));
  const allCards = useStore((s) => s.cards);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Tile | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [now, setNow] = useState(Date.now());
  const start = useRef(Date.now());
  const [finished, setFinished] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);

  const tiles = useMemo(() => {
    const pool = shuffle(Object.values(allCards).filter((c) => c.deckId === id)).slice(0, 6);
    return shuffle(
      pool.flatMap((c): Tile[] => [
        { key: `${c.id}:q`, cardId: c.id, text: c.front },
        { key: `${c.id}:a`, cardId: c.id, text: c.back },
      ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, round]);

  useEffect(() => {
    start.current = Date.now();
    setDone(new Set());
    setPicked(null);
    setMisses(0);
    setFinished(null);
  }, [round]);

  useEffect(() => {
    if (finished != null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [finished]);

  const pick = useCallback(
    (t: Tile) => {
      if (done.has(t.cardId) || finished != null) return;
      if (!picked) return setPicked(t);
      if (picked.key === t.key) return setPicked(null);
      if (picked.cardId === t.cardId) {
        const next = new Set(done).add(t.cardId);
        setDone(next);
        setPicked(null);
        if (next.size * 2 === tiles.length) {
          const secs = (Date.now() - start.current) / 1000 + misses * 2;
          setFinished(secs);
          setBest((b) => (b == null || secs < b ? secs : b));
        }
      } else {
        setMisses((m) => m + 1);
        setWrong([picked.key, t.key]);
        setPicked(null);
        setTimeout(() => setWrong([]), 450);
      }
    },
    [done, picked, tiles.length, misses, finished],
  );

  if (!deck) return null;
  const secs = finished ?? (now - start.current) / 1000 + misses * 2;
  const enough = tiles.length >= 6;

  return (
    <Screen maxWidth={820}>
      <Button kind="ghost" small icon="chevronLeft" label="Back" onPress={() => goBackOr('/library')} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="eyebrow" style={{ color: C.textFaint }}>Match game</T>
          <T v="title" accessibilityRole="header" numberOfLines={2}>{deck.title}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: font.pixelBold, fontSize: 30, color: C.text }}>{secs.toFixed(1)}s</Text>
          {misses > 0 && <T v="caption">+{misses * 2}s for {misses} miss{misses === 1 ? '' : 'es'}</T>}
        </View>
      </View>

      {!enough ? (
        <Panel>
          <T v="body">This deck needs at least 3 cards to play a match game.</T>
        </Panel>
      ) : (
        <>
          <T v="small">Tap a question, then its answer. Wrong pairs add 2 seconds.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {tiles.map((t) => {
              const gone = done.has(t.cardId);
              const sel = picked?.key === t.key;
              const bad = wrong.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="button"
                  accessibilityLabel={t.text}
                  accessibilityState={{ selected: sel, disabled: gone }}
                  onPress={() => pick(t)}
                  style={{
                    flexGrow: 1,
                    flexBasis: 150,
                    minHeight: 84,
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 2,
                    justifyContent: 'center',
                    opacity: gone ? 0.25 : 1,
                    borderColor: bad ? C.berry : sel ? C.moss : C.panelBorder,
                    backgroundColor: bad ? C.coralSoft : sel ? C.mossSoft : C.surface1,
                    boxShadow: gone ? undefined : `0 3px 0 ${bad ? C.berry : sel ? C.mossLine2 : C.panelShadow}`,
                    marginBottom: 3,
                  }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 14.5, lineHeight: 19, color: C.text, textAlign: 'center' }}>{t.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {finished != null && (
        <Panel style={{ gap: space.md, alignItems: 'center' }}>
          <T v="heading">Matched them all in {finished.toFixed(1)}s</T>
          {best != null && <T v="small">{best === finished ? 'New best this visit!' : `Best this visit: ${best.toFixed(1)}s`}</T>}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button icon="refresh" label="Play again" onPress={() => setRound((r) => r + 1)} />
            <Button kind="secondary" label="Done" onPress={() => goBackOr('/library')} />
          </View>
        </Panel>
      )}
    </Screen>
  );
}
