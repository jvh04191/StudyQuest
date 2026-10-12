import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Avatar } from '@/components/art/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { haptic, useCalmMotion } from '@/lib/feedback';
import { deckStateLabel, deckStats, type DeckStats } from '@/lib/srs';
import { landName, landSoft } from '@/lib/world';
import { useStore } from '@/store/useStore';
import type { DeckState } from '@/store/types';
import { color as C, font } from '@/theme/tokens';

const VW = 1000;
const VH = 640;
const MIN_W = 720;
const NODE = 50;

/** Node look by state: [fill, ring, lip, ringStyle, icon, iconColor]. */
const NODE_STYLE: Record<DeckState, { bg: string; ring: string; lip: string; dashed?: boolean; icon: IconName; fg: string }> = {
  mastered: { bg: C.honeySoft, ring: C.honey, lip: C.honeyShadow, icon: 'star', fg: C.honeyShadow },
  review: { bg: C.surface1, ring: C.honey, lip: C.panelShadow, icon: 'clock', fg: C.honeyShadow },
  progress: { bg: C.mossSoft, ring: '#6E9B4E', lip: C.mossLine2, icon: 'bolt', fg: C.moss },
  new: { bg: '#F6EEDD', ring: '#C9B48C', lip: '#DCC79F', dashed: true, icon: 'sparkle', fg: C.textFaint },
};

export const MAP_LEGEND: { label: string; bg: string; ring: string }[] = [
  { label: 'Mastered', bg: C.honeySoft, ring: C.honey },
  { label: 'Ready', bg: C.surface1, ring: C.honey },
  { label: 'Learning', bg: C.mossSoft, ring: '#6E9B4E' },
  { label: 'Unexplored', bg: '#F6EEDD', ring: '#C9B48C' },
];

export function WorldMap({ onSelect, selectedId }: { onSelect: (deckId: string) => void; selectedId?: string }) {
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const cardStates = useStore((s) => s.cardStates);
  const player = useStore((s) => s.player);
  const lit = useStore((s) => s.lit);
  const consumeLit = useStore((s) => s.consumeLit);
  const calm = useCalmMotion();
  const [w, setW] = useState(0);

  const stats = useMemo(() => {
    const now = Date.now();
    const m: Record<string, DeckStats> = {};
    decks.forEach((d) => (m[d.id] = deckStats(d, cards, cardStates, now)));
    return m;
  }, [decks, cards, cardStates]);

  // The explorer stands at the deck to continue: most due, else most recently studied.
  const hereId = useMemo(() => {
    const byDue = [...decks].filter((d) => stats[d.id]?.due).sort((a, b) => stats[b.id].due - stats[a.id].due)[0];
    return (byDue ?? [...decks].sort((a, b) => (b.lastStudied ?? 0) - (a.lastStudied ?? 0))[0])?.id;
  }, [decks, stats]);

  useEffect(() => {
    if (!lit.length) return;
    const t = setTimeout(consumeLit, 2600);
    return () => clearTimeout(t);
  }, [lit, consumeLit]);

  const cw = Math.max(w, MIN_W);
  const ch = cw * (VH / VW);
  const scrolls = w > 0 && w < MIN_W;
  const deckById = useMemo(() => Object.fromEntries(decks.map((d) => [d.id, d])), [decks]);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 26, backgroundColor: '#EBDDBF', boxShadow: 'inset 0 0 0 2px #DCC79F, 0 5px 0 #D6BF95', overflow: 'hidden', marginBottom: 5 }}>
      {w > 0 && (
        <ScrollView horizontal scrollEnabled={scrolls} showsHorizontalScrollIndicator={false} style={{ width: w, height: ch }} contentContainerStyle={{ width: cw, height: ch }}>
          <Image source={require('../../../assets/images/noise.png')} resizeMode="repeat" style={{ position: 'absolute', width: cw, height: ch, opacity: 0.3 }} />
          <Svg width={cw} height={ch} viewBox={`0 0 ${VW} ${VH}`} style={{ position: 'absolute' }}>
            <Defs>
              {subjects.map((s) => (
                <RadialGradient key={s.id} id={`land-${s.id}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={landSoft(s.color)} stopOpacity={1} />
                  <Stop offset="0.55" stopColor={landSoft(s.color)} stopOpacity={0.75} />
                  <Stop offset="1" stopColor={landSoft(s.color)} stopOpacity={0} />
                </RadialGradient>
              ))}
            </Defs>
            {subjects.map((s, i) => (
              <Ellipse key={s.id} cx={s.cx} cy={s.cy} rx={s.art === 'generic' ? 210 : 310} ry={s.art === 'generic' ? 170 : 290} fill={`url(#land-${s.id})`} transform={`rotate(${i % 2 ? 8 : -6} ${s.cx} ${s.cy})`} />
            ))}
            {decks.flatMap((d) =>
              d.links
                .filter((l) => deckById[l])
                .map((l) => {
                  const o = deckById[l];
                  return (
                    <Path
                      key={`${d.id}-${l}`}
                      d={`M${d.x} ${d.y} Q ${(d.x + o.x) / 2 + 20} ${(d.y + o.y) / 2 - 24} ${o.x} ${o.y}`}
                      fill="none"
                      stroke="#B89B6E"
                      strokeWidth={3}
                      strokeDasharray="1 10"
                      strokeLinecap="round"
                    />
                  );
                }),
            )}
          </Svg>

          {/* land names: the first two sit in the top corners, others by their region */}
          {subjects.map((s, i) => {
            const side = i === 0 ? { left: '3.5%' } : i === 1 ? { right: '3.5%' } : { left: `${(s.cx / VW) * 100}%`, marginLeft: -100 };
            const align = i === 1 ? 'flex-end' : i === 0 ? 'flex-start' : 'center';
            return (
              <View
                key={s.id}
                pointerEvents="none"
                style={[{ position: 'absolute', top: i < 2 ? '5%' : `${(Math.max(30, s.cy - 150) / VH) * 100}%`, alignItems: align, width: i < 2 ? undefined : 200 }, side as ViewStyle]}>
                <Text style={{ fontFamily: font.display, fontSize: 22, color: C.mossInk }}>{landName(s, i)}</Text>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.textMuted }}>{s.name}</Text>
              </View>
            );
          })}

          {decks.map((d) => {
            const st = stats[d.id];
            const n = NODE_STYLE[st.state];
            const here = d.id === hereId;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}. ${deckStateLabel[st.state]}. ${Math.round(st.mastery * 100)} percent mastery${st.due ? `, ${st.due} cards due` : ''}.`}
                onPress={() => {
                  haptic('light');
                  onSelect(d.id);
                }}
                style={({ focused, pressed, hovered }: { focused?: boolean; pressed: boolean; hovered?: boolean }) => [
                  {
                    position: 'absolute',
                    left: `${(d.x / VW) * 100}%`,
                    top: `${(d.y / VH) * 100}%`,
                    width: 150,
                    marginLeft: -75,
                    marginTop: -NODE / 2 - 2,
                    alignItems: 'center',
                    gap: 5,
                    zIndex: selectedId === d.id || hovered ? 3 : 2,
                    transform: [{ translateY: pressed ? 2 : hovered ? -3 : 0 }],
                  },
                  focused && ({ outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
                ]}>
                <View
                  style={{
                    width: NODE,
                    height: NODE,
                    borderRadius: NODE / 2,
                    backgroundColor: n.bg,
                    borderWidth: 3,
                    borderColor: n.ring,
                    borderStyle: n.dashed ? 'dashed' : 'solid',
                    boxShadow: `0 4px 0 ${n.lip}${selectedId === d.id ? `, 0 0 0 5px rgba(78,125,67,0.35)` : ''}`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name={n.icon} size={22} color={n.fg} fill={st.state === 'mastered' ? C.honeyLight : undefined} strokeWidth={2} />
                  {st.due > 0 && (
                    <View style={{ position: 'absolute', top: -8, right: -10, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: C.berry, borderWidth: 2, borderColor: C.surface1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: font.pixelBold, fontSize: 12, lineHeight: 15, color: C.surface1 }}>{st.due}</Text>
                    </View>
                  )}
                  {here && <Floating><Avatar size={28} look={player.look} label="You are here" /></Floating>}
                  {lit.includes(d.id) && <Flash calm={calm} />}
                </View>
                <Text numberOfLines={2} style={{ fontFamily: font.bodyBold, fontSize: 11.5, lineHeight: 14, textAlign: 'center', color: C.text, backgroundColor: 'rgba(255,249,238,0.92)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 0 #DCC79F', maxWidth: 140 }}>
                  {d.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** The explorer marker bobs above the "continue" stop. */
function Floating({ children }: { children: React.ReactNode }) {
  const calm = useCalmMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    p.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [calm, p]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * 4 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: -34, left: '50%', marginLeft: -14, width: 28, height: 28, borderRadius: 14, boxShadow: `0 0 0 2px ${C.surface1}, 0 3px 6px rgba(0,0,0,0.25)`, overflow: 'hidden' }, a]}>
      {children}
    </Animated.View>
  );
}

/** One-time ripple when a topic is first started. */
function Flash({ calm }: { calm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = calm ? withTiming(1, { duration: 1 }) : withDelay(350, withSequence(withTiming(0, { duration: 1 }), withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })));
  }, [calm, p]);
  const a = useAnimatedStyle(() => ({ opacity: calm ? 0 : 1 - p.value, transform: [{ scale: 1 + p.value * 1.6 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: -3, top: -3, right: -3, bottom: -3, borderRadius: 30, backgroundColor: C.mossSoft, borderWidth: 2, borderColor: C.moss }, a]}
    />
  );
}
