import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { useStars } from '@/components/art/Art';
import { haptic, useCalmMotion } from '@/lib/feedback';
import { deckStateLabel, deckStats, type DeckStats } from '@/lib/srs';
import { useStore } from '@/store/useStore';
import type { Deck, DeckState } from '@/store/types';
import { color as C, font, radius } from '@/theme/tokens';

const VW = 1000;
const VH = 640;
const NODE_R = 17;

function arc(cx: number, cy: number, r: number, pct: number) {
  const p = Math.max(0.001, Math.min(0.999, pct));
  const a0 = -Math.PI / 2;
  const a1 = a0 + p * Math.PI * 2;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
}

function star4(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${cx + Math.cos(a) * rad} ${cy + Math.sin(a) * rad}`);
  }
  return `M${pts.join('L')}Z`;
}

export function ConstellationMap({
  height,
  onSelect,
  selectedId,
  showLegend = true,
  rounded = true,
}: {
  height: number;
  onSelect: (deckId: string) => void;
  selectedId?: string;
  showLegend?: boolean;
  rounded?: boolean;
}) {
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const cardStates = useStore((s) => s.cardStates);
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

  // On narrow screens the map keeps a readable scale and scrolls sideways.
  const narrow = w > 0 && w < 520;
  const scale = !w ? 0 : narrow ? height / VH : Math.min(w / VW, height / VH);
  const cw = narrow ? Math.max(w, Math.round(VW * scale + 24)) : w;
  const ox = (cw - VW * scale) / 2;
  const oy = (height - VH * scale) / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy + y * scale;

  useEffect(() => {
    if (!lit.length) return;
    const t = setTimeout(consumeLit, 2600);
    return () => clearTimeout(t);
  }, [lit, consumeLit]);

  const deckById = useMemo(() => Object.fromEntries(decks.map((d) => [d.id, d])), [decks]);
  const compact = scale < 0.62;

  return (
    <View>
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: rounded ? radius.xl : 0,
        overflow: 'hidden',
        backgroundColor: C.bgDeep,
        borderWidth: rounded ? 1 : 0,
        borderColor: C.line,
      }}>
      {w > 0 && (
        <ScrollView
          horizontal
          scrollEnabled={narrow}
          showsHorizontalScrollIndicator={narrow}
          style={{ width: w, height }}
          contentContainerStyle={{ width: cw, height }}>
          <AmbientSky width={cw} height={height} calm={calm} />
          <Image
            source={require('../../../assets/images/noise.png')}
            resizeMode="repeat"
            style={{ position: 'absolute', width: cw, height, opacity: 0.5 }}
          />
          <Svg width={cw} height={height} viewBox={`${-ox / scale} ${-oy / scale} ${cw / scale} ${height / scale}`} style={{ position: 'absolute' }}>
            <Defs>
              {subjects.map((s) => (
                <RadialGradient key={s.id} id={`rg-${s.id}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.2} />
                  <Stop offset="0.6" stopColor={s.color} stopOpacity={0.06} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </RadialGradient>
              ))}
              <RadialGradient id="gold-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={C.gold} stopOpacity={0.5} />
                <Stop offset="1" stopColor={C.gold} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {subjects.map((s) => (
              <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.art === 'generic' ? 170 : 250} fill={`url(#rg-${s.id})`} />
            ))}
            {decks.flatMap((d) =>
              d.links
                .filter((l) => deckById[l])
                .map((l) => {
                  const o = deckById[l];
                  const on = stats[d.id]?.state !== 'new' && stats[o.id]?.state !== 'new';
                  return (
                    <Line
                      key={`${d.id}-${l}`}
                      x1={d.x}
                      y1={d.y}
                      x2={o.x}
                      y2={o.y}
                      stroke={on ? C.teal : C.text}
                      strokeOpacity={on ? 0.5 : 0.14}
                      strokeWidth={on ? 1.8 : 1.2}
                      strokeDasharray={on ? undefined : '4 6'}
                    />
                  );
                }),
            )}
            {decks.map((d) => (
              <NodeGlyph key={d.id} deck={d} st={stats[d.id]} selected={selectedId === d.id} />
            ))}
          </Svg>

          {/* region labels */}
          {subjects.map((s) => (
            <Text
              key={s.id}
              style={{
                position: 'absolute',
                left: px(s.cx) - 120,
                width: 240,
                top: py(s.art === 'generic' ? Math.max(14, s.cy - 110) : s.cy - 240),
                textAlign: 'center',
                fontFamily: font.display,
                fontSize: compact ? 11 : 13,
                letterSpacing: 2,
                color: s.color,
                opacity: 0.85,
              }}>
              {s.name}
            </Text>
          ))}

          {/* animated halos for ready-to-review and newly lit nodes */}
          {decks.map((d) =>
            stats[d.id]?.state === 'review' ? (
              <Halo key={`h-${d.id}`} x={px(d.x)} y={py(d.y)} r={NODE_R * scale * 1.6} tint={C.gold} calm={calm} />
            ) : null,
          )}
          {lit.map((id) =>
            deckById[id] ? <Flash key={`f-${id}`} x={px(deckById[id].x)} y={py(deckById[id].y)} r={NODE_R * scale} calm={calm} /> : null,
          )}

          {/* labels + hit targets */}
          {decks.map((d) => {
            const st = stats[d.id];
            const size = Math.max(48, NODE_R * 2 * scale + 16);
            return (
              <Pressable
                key={`p-${d.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}. ${deckStateLabel[st.state]}. ${Math.round(st.mastery * 100)} percent mastery${st.due ? `, ${st.due} cards due` : ''}.`}
                onPress={() => {
                  haptic('light');
                  onSelect(d.id);
                }}
                style={({ focused, pressed }: { focused?: boolean; pressed: boolean }) => [
                  {
                    position: 'absolute',
                    left: px(d.x) - size / 2,
                    top: py(d.y) - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                  focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
                ]}
              />
            );
          })}
          {decks.map((d) => {
            const st = stats[d.id];
            return (
              <View
                key={`l-${d.id}`}
                pointerEvents="none"
                style={{ position: 'absolute', left: Math.max(2, Math.min(cw - 142, px(d.x) - 70)), top: py(d.y) + NODE_R * scale + 6, width: 140, alignItems: 'center' }}>
                <Text
                  numberOfLines={2}
                  style={{
                    textAlign: 'center',
                    fontFamily: font.bodySemi,
                    fontSize: compact ? 11 : 13,
                    lineHeight: compact ? 14 : 16,
                    color: st.state === 'new' ? C.textFaint : C.text,
                  }}>
                  {d.title}
                </Text>
                {st.due > 0 && !compact && (
                  <Text style={{ fontFamily: font.bodySemi, fontSize: 11, color: C.gold, marginTop: 2 }}>{st.due} due</Text>
                )}
              </View>
            );
          })}

        </ScrollView>
      )}
      {w > 0 && showLegend && !narrow && <Legend compact={compact} />}
    </View>
    {w > 0 && showLegend && narrow && (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <Legend compact={false} inline />
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, color: C.textFaint }}>Drag the map to explore</Text>
      </View>
    )}
    </View>
  );
}

function NodeGlyph({ deck, st, selected }: { deck: Deck; st: DeckStats; selected: boolean }) {
  const { x, y } = deck;
  const state: DeckState = st.state;
  return (
    <>
      {selected && <Circle cx={x} cy={y} r={NODE_R + 9} stroke={C.text} strokeOpacity={0.6} strokeWidth={1.5} fill="none" />}
      {state === 'mastered' ? (
        <>
          <Circle cx={x} cy={y} r={NODE_R * 2.2} fill="url(#gold-glow)" />
          <Path d={star4(x, y, NODE_R + 7, 6)} fill={C.gold} />
          <Circle cx={x} cy={y} r={3} fill="#FFF6DF" />
        </>
      ) : state === 'new' ? (
        <>
          <Circle cx={x} cy={y} r={NODE_R} fill={C.bgDeep} stroke={C.text} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="3 4" />
          <Circle cx={x} cy={y} r={2.5} fill={C.text} opacity={0.4} />
        </>
      ) : (
        <>
          <Circle cx={x} cy={y} r={NODE_R} fill={C.surface2} stroke={state === 'review' ? C.gold : C.teal} strokeOpacity={0.3} strokeWidth={3.5} />
          <Path d={arc(x, y, NODE_R, st.mastery)} stroke={state === 'review' ? C.gold : C.teal} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Circle cx={x} cy={y} r={5} fill={state === 'review' ? C.gold : C.teal} />
        </>
      )}
    </>
  );
}

function Halo({ x, y, r, tint, calm }: { x: number; y: number; r: number; tint: string; calm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (calm) {
      p.value = 0.4;
      return;
    }
    p.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [calm, p]);
  const a = useAnimatedStyle(() => ({
    opacity: calm ? 0.35 : 0.55 * (1 - p.value),
    transform: [{ scale: calm ? 1 : 0.7 + p.value * 0.6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 2, borderColor: tint },
        a,
      ]}
    />
  );
}

/** One-time illumination when a topic is first started. */
function Flash({ x, y, r, calm }: { x: number; y: number; r: number; calm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = calm ? withTiming(1, { duration: 1 }) : withDelay(350, withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [calm, p]);
  const a = useAnimatedStyle(() => ({ opacity: calm ? 0 : 1 - p.value, transform: [{ scale: 1 + p.value * 3 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r,
          backgroundColor: C.tealSoft, borderWidth: 2, borderColor: C.teal,
        },
        a,
      ]}
    />
  );
}

function AmbientSky({ width, height, calm }: { width: number; height: number; calm: boolean }) {
  const stars = useStars(110, width + 40, height, 5);
  const twinklers = useStars(10, width, height, 21);
  const drift = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    drift.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [calm, drift]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -drift.value * 24 }] }));
  return (
    <>
      <Animated.View style={[{ position: 'absolute', width: width + 40, height }, a]} pointerEvents="none">
        <Svg width={width + 40} height={height}>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.text} opacity={s.o * 0.8} />
          ))}
        </Svg>
      </Animated.View>
      {!calm && twinklers.map((s, i) => <Twinkle key={i} x={s.x} y={s.y} delay={i * 700} />)}
    </>
  );
}

function Twinkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const o = useSharedValue(0.1);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(0.9, { duration: 1600 }), withTiming(0.1, { duration: 2200 })), -1, false),
    );
  }, [delay, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFF7E6' }, a]}
    />
  );
}

function Legend({ compact, inline }: { compact: boolean; inline?: boolean }) {
  const items: { label: string; kind: DeckState }[] = [
    { label: 'Not started', kind: 'new' },
    { label: 'In progress', kind: 'progress' },
    { label: 'Ready to review', kind: 'review' },
    { label: 'Mastered', kind: 'mastered' },
  ];
  return (
    <View
      pointerEvents="none"
      style={
        inline
          ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }
          : {
              position: 'absolute',
              right: 12,
              top: 12,
              flexDirection: compact ? 'column' : 'row',
              gap: compact ? 6 : 14,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: radius.md,
              backgroundColor: 'rgba(5, 8, 15, 0.7)',
              borderWidth: 1,
              borderColor: C.line,
            }
      }>
      {items.map((it) => (
        <View key={it.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Svg width={14} height={14} viewBox="0 0 40 40">
            {it.kind === 'new' && <Circle cx={20} cy={20} r={14} stroke={C.text} strokeOpacity={0.45} strokeWidth={3} strokeDasharray="4 5" fill="none" />}
            {it.kind === 'progress' && (
              <>
                <Circle cx={20} cy={20} r={14} stroke={C.teal} strokeOpacity={0.3} strokeWidth={5} fill="none" />
                <Path d={arc(20, 20, 14, 0.6)} stroke={C.teal} strokeWidth={5} fill="none" />
              </>
            )}
            {it.kind === 'review' && <Circle cx={20} cy={20} r={14} stroke={C.gold} strokeWidth={5} fill="none" />}
            {it.kind === 'mastered' && <Path d={star4(20, 20, 19, 6)} fill={C.gold} />}
          </Svg>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, color: C.textMuted }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
