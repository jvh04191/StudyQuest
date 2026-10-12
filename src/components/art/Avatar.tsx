import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  BACKGROUND,
  DEFAULT_LOOK,
  EYE_COLOR,
  FRAME,
  HAIR_COLOR,
  OUTFIT_COLOR,
  pick,
  SKIN,
  VISOR,
  type Look,
} from '@/lib/avatar';

/** Lighten (f > 0) or darken (f < 0) a hex color. */
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f),
  );
  return `#${ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

const INK = '#1A1416';
const GOLD = '#E7B75F';
const METAL = '#C9CFDC';

function star4(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const HAIR_FRONT: Record<string, string> = {
  short: 'M32.5 46 C31 32 39 25.5 50 25.5 C61 25.5 69 32 67.5 46 C66 40 63 36 59 34.5 C55 37 46 37.5 40 35 C36 37.5 34 41 32.5 46 Z',
  buzz: 'M33.5 42 C34 31 41 27 50 27 C59 27 66 31 66.5 42 C63 36 57 33.5 50 33.5 C43 33.5 37 36 33.5 42 Z',
  side: 'M32.5 47 C30.5 31 39 24.5 51 24.5 C62 24.5 70 31 67.5 45 C65 38 61 34.5 56 33.5 C50 36.5 41 38 35 40.5 C34 42.5 33 44.5 32.5 47 Z',
  long: 'M32.5 50 C30 32 39 24.5 50 24.5 C61 24.5 70 32 67.5 50 C66 41 61 35 56 33 C51 37 43 38 37 36.5 C34.5 40 33 45 32.5 50 Z',
  spiky: 'M32.5 46 C32 38 34 33 36 31 L35 24 L41 28 L43 21 L48 27 L52 20 L55 27 L60 22 L61 29 L66 26 L65 33 C67 37 68 41 67.5 46 C64 39 58 35.5 50 35.5 C42 35.5 36 39 32.5 46 Z',
  mohawk: 'M45.5 19 C48 16.5 52 16.5 54.5 19 L56 36 C52 35 48 35 44 36 Z',
};

function HairBack({ style, color }: { style: string; color: string }) {
  switch (style) {
    case 'long':
      return <Path d="M30 44 C29 28 39 22 50 22 C61 22 71 28 70 44 L72 74 C66 73 62 69 61 63 L39 63 C38 69 34 73 28 74 Z" fill={color} />;
    case 'bob':
      return <Path d="M30 44 C29 28 39 22 50 22 C61 22 71 28 70 44 L70.5 60 C66 61.5 63 59.5 62 56 L38 56 C37 59.5 34 61.5 29.5 60 Z" fill={color} />;
    case 'afro':
      return <Circle cx={50} cy={40} r={24} fill={color} />;
    case 'bun':
      return <Circle cx={50} cy={21} r={7.5} fill={color} />;
    case 'pony':
      return <Path d="M62 32 C74 33 79 47 74 62 C72 68 68 70 66 68 C70 58 69 46 62 40 Z" fill={color} />;
    case 'braids':
      return (
        <G fill={color}>
          {[50, 55, 60, 65, 70].map((y) => (
            <G key={y}>
              <Ellipse cx={32} cy={y} rx={3.2} ry={3} />
              <Ellipse cx={68} cy={y} rx={3.2} ry={3} />
            </G>
          ))}
        </G>
      );
    default:
      return null;
  }
}

function HairFront({ style, color }: { style: string; color: string }) {
  if (style === 'none') return null;
  if (style === 'curly' || style === 'afro') {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI + (i / 8) * Math.PI;
      return { x: 50 + Math.cos(a) * 16.5, y: 41 + Math.sin(a) * 15 };
    });
    return (
      <G fill={color}>
        <Path d={HAIR_FRONT.buzz} />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={style === 'afro' ? 5 : 5.6} />
        ))}
      </G>
    );
  }
  if (style === 'mohawk') {
    return (
      <G>
        <Path d={HAIR_FRONT.buzz} fill={color} opacity={0.35} />
        <Path d={HAIR_FRONT.mohawk} fill={color} />
      </G>
    );
  }
  const d =
    style === 'long' || style === 'bob'
      ? HAIR_FRONT.long
      : style === 'braids' || style === 'bun' || style === 'pony'
        ? HAIR_FRONT.short
        : HAIR_FRONT[style] ?? HAIR_FRONT.short;
  return (
    <G>
      <Path d={d} fill={color} opacity={style === 'buzz' ? 0.75 : 1} />
      {style === 'side' && <Path d="M41 26.5 C43 30 44 33 44.5 36" stroke={shade(color, -0.35)} strokeWidth={0.9} fill="none" />}
    </G>
  );
}

function Eye({ x, kind, iris, side }: { x: number; kind: string; iris: string; side: 'l' | 'r' }) {
  const y = 47;
  const k = kind === 'wink' ? (side === 'r' ? 'happy' : 'round') : kind;
  switch (k) {
    case 'happy':
      return <Path d={`M${x - 2.8} ${y + 0.8} Q${x} ${y - 2.6} ${x + 2.8} ${y + 0.8}`} stroke={INK} strokeWidth={1.5} strokeLinecap="round" fill="none" />;
    case 'focused':
      return (
        <G>
          <Ellipse cx={x} cy={y + 0.4} rx={2.7} ry={1.7} fill={iris} />
          <Circle cx={x} cy={y + 0.4} r={1} fill={INK} />
          <Path d={`M${x - 3.3} ${y - 1.4} L${x + 3.3} ${y - 1.4}`} stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d={`M${x - 2.8} ${y} Q${x} ${y + 3.2} ${x + 2.8} ${y} Z`} fill={iris} />
          <Path d={`M${x - 3} ${y} L${x + 3} ${y}`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
        </G>
      );
    case 'wide':
      return (
        <G>
          <Ellipse cx={x} cy={y} rx={3.4} ry={3.8} fill="#FFFFFF" />
          <Circle cx={x} cy={y + 0.4} r={2.2} fill={iris} />
          <Circle cx={x} cy={y + 0.4} r={1.1} fill={INK} />
          <Circle cx={x + 0.9} cy={y - 0.6} r={0.7} fill="#FFFFFF" />
        </G>
      );
    case 'starry':
      return <Path d={star4(x, y, 3.4, 1.1)} fill={GOLD} />;
    default:
      return (
        <G>
          <Ellipse cx={x} cy={y} rx={2.4} ry={2.9} fill={iris} />
          <Circle cx={x} cy={y + 0.3} r={1.25} fill={INK} />
          <Circle cx={x + 0.8} cy={y - 0.9} r={0.75} fill="#FFFFFF" />
        </G>
      );
  }
}

function Brows({ kind, color }: { kind: string; color: string }) {
  if (kind === 'none') return null;
  const w = kind === 'bold' ? 2.4 : 1.4;
  const p = (d: string) => <Path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />;
  if (kind === 'raised')
    return (
      <G>
        {p('M39.8 40.5 Q43 37.4 46.2 39.8')}
        {p('M53.8 39.8 Q57 37.4 60.2 40.5')}
      </G>
    );
  if (kind === 'determined')
    return (
      <G>
        {p('M39.8 40.4 L46.2 42.2')}
        {p('M53.8 42.2 L60.2 40.4')}
      </G>
    );
  return (
    <G>
      {p('M39.8 42 Q43 40 46.2 41.6')}
      {p('M53.8 41.6 Q57 40 60.2 42')}
    </G>
  );
}

function Mouth({ kind, lip }: { kind: string; lip: string }) {
  switch (kind) {
    case 'grin':
      return <Path d="M44.5 55 Q50 62 55.5 55 Z" fill="#FFFFFF" stroke={lip} strokeWidth={1.3} strokeLinejoin="round" />;
    case 'neutral':
      return <Path d="M46 56.5 L54 56.5" stroke={lip} strokeWidth={1.5} strokeLinecap="round" />;
    case 'open':
      return (
        <G>
          <Ellipse cx={50} cy={57} rx={3.4} ry={3.2} fill="#4A1F24" />
          <Ellipse cx={50} cy={58.6} rx={2.2} ry={1.2} fill="#D96B78" />
        </G>
      );
    case 'smirk':
      return <Path d="M45.5 56.6 Q51 58.6 55 54.6" stroke={lip} strokeWidth={1.5} strokeLinecap="round" fill="none" />;
    case 'tongue':
      return (
        <G>
          <Path d="M45 55.5 Q50 60 55 55.5" stroke={lip} strokeWidth={1.5} strokeLinecap="round" fill="none" />
          <Path d="M48.6 57.6 Q50 61.5 51.6 57.6 Z" fill="#D96B78" />
        </G>
      );
    default:
      return <Path d="M45 55.5 Q50 59.8 55 55.5" stroke={lip} strokeWidth={1.5} strokeLinecap="round" fill="none" />;
  }
}

function Facial({ kind, color }: { kind: string; color: string }) {
  const mustache = 'M44.5 55.2 Q47 53.3 50 54.6 Q53 53.3 55.5 55.2 Q53 56.8 50 55.9 Q47 56.8 44.5 55.2 Z';
  switch (kind) {
    case 'stubble':
      return <Path d="M36.5 51 C38 61 44 65.5 50 65.5 C56 65.5 62 61 63.5 51 C61 57 56 60.5 50 60.5 C44 60.5 39 57 36.5 51 Z" fill={color} opacity={0.3} />;
    case 'mustache':
      return <Path d={mustache} fill={color} />;
    case 'goatee':
      return (
        <G fill={color}>
          <Path d={mustache} />
          <Path d="M46.5 60 Q50 62.5 53.5 60 Q52.5 65 50 65.6 Q47.5 65 46.5 60 Z" />
        </G>
      );
    case 'beard':
      return (
        <G fill={color}>
          <Path d="M33.5 46 C33 60 40 66.5 50 66.5 C60 66.5 67 60 66.5 46 C64.5 52 62 56 58 58.5 C55 57 52.5 56.4 50 56.4 C47.5 56.4 45 57 42 58.5 C38 56 35.5 52 33.5 46 Z" />
          <Path d={mustache} />
        </G>
      );
    default:
      return null;
  }
}

function FaceDetail({ kind, skin }: { kind: string; skin: string }) {
  switch (kind) {
    case 'blush':
      return (
        <G fill="#E77A86" opacity={0.38}>
          <Ellipse cx={40.5} cy={52.5} rx={3.2} ry={1.8} />
          <Ellipse cx={59.5} cy={52.5} rx={3.2} ry={1.8} />
        </G>
      );
    case 'freckles':
      return (
        <G fill={shade(skin, -0.35)}>
          {[
            [40, 51.5], [42.5, 52.8], [39, 53.6], [41.6, 54.6],
            [60, 51.5], [57.5, 52.8], [61, 53.6], [58.4, 54.6],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={0.55} />
          ))}
        </G>
      );
    case 'mole':
      return <Circle cx={57.5} cy={55.5} r={0.8} fill={shade(skin, -0.55)} />;
    case 'paint':
      return (
        <G>
          <Path d={star4(60.5, 52, 2.8, 0.9)} fill={GOLD} />
          <Circle cx={57} cy={54.6} r={0.7} fill="#38D6C6" />
          <Circle cx={63} cy={55} r={0.6} fill="#38D6C6" />
        </G>
      );
    default:
      return null;
  }
}

function Glasses({ kind, tint }: { kind: string; tint: string }) {
  const arms = (
    <G>
      <Line x1={37.5} y1={46} x2={33.5} y2={45.5} stroke={INK} strokeWidth={1.2} />
      <Line x1={62.5} y1={46} x2={66.5} y2={45.5} stroke={INK} strokeWidth={1.2} />
    </G>
  );
  switch (kind) {
    case 'round':
      return (
        <G>
          {arms}
          <Circle cx={43} cy={47} r={5.2} stroke={INK} strokeWidth={1.5} fill="#FFFFFF" fillOpacity={0.1} />
          <Circle cx={57} cy={47} r={5.2} stroke={INK} strokeWidth={1.5} fill="#FFFFFF" fillOpacity={0.1} />
          <Path d="M48.2 47 Q50 45.4 51.8 47" stroke={INK} strokeWidth={1.3} fill="none" />
        </G>
      );
    case 'square':
      return (
        <G>
          {arms}
          <Rect x={37.4} y={42.6} width={11} height={9} rx={2} stroke={INK} strokeWidth={1.6} fill="#FFFFFF" fillOpacity={0.1} />
          <Rect x={51.6} y={42.6} width={11} height={9} rx={2} stroke={INK} strokeWidth={1.6} fill="#FFFFFF" fillOpacity={0.1} />
          <Line x1={48.4} y1={46} x2={51.6} y2={46} stroke={INK} strokeWidth={1.3} />
        </G>
      );
    case 'cat':
      return (
        <G>
          {arms}
          <Path d="M36.6 43.2 Q43 41.2 48.6 44 Q48.4 51 43 51.6 Q37.6 51 36.6 43.2 Z" stroke={INK} strokeWidth={1.5} fill="#FFFFFF" fillOpacity={0.1} />
          <Path d="M63.4 43.2 Q57 41.2 51.4 44 Q51.6 51 57 51.6 Q62.4 51 63.4 43.2 Z" stroke={INK} strokeWidth={1.5} fill="#FFFFFF" fillOpacity={0.1} />
          <Path d="M48.6 45.6 Q50 44.6 51.4 45.6" stroke={INK} strokeWidth={1.2} fill="none" />
        </G>
      );
    case 'goggles':
      return (
        <G>
          <Path d="M31.5 46 L68.5 46" stroke="#2A2F3A" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={43} cy={47} r={6.3} fill={tint} fillOpacity={0.6} stroke={METAL} strokeWidth={2} />
          <Circle cx={57} cy={47} r={6.3} fill={tint} fillOpacity={0.6} stroke={METAL} strokeWidth={2} />
          <Path d="M40 44.5 Q41.5 43 43.5 42.8" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Path d="M54 44.5 Q55.5 43 57.5 42.8" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'shades':
      return (
        <G>
          {arms}
          <Rect x={37} y={43.2} width={11.6} height={8} rx={3.5} fill="#11131A" stroke={GOLD} strokeWidth={1.1} />
          <Rect x={51.4} y={43.2} width={11.6} height={8} rx={3.5} fill="#11131A" stroke={GOLD} strokeWidth={1.1} />
          <Line x1={48.6} y1={45.5} x2={51.4} y2={45.5} stroke={GOLD} strokeWidth={1.1} />
          <Path d={star4(41, 45.6, 1.6, 0.5)} fill="#FFFFFF" opacity={0.85} />
          <Path d={star4(55.4, 45.6, 1.6, 0.5)} fill="#FFFFFF" opacity={0.85} />
        </G>
      );
    case 'monocle':
      return (
        <G>
          <Circle cx={57} cy={47} r={5.4} stroke={GOLD} strokeWidth={1.6} fill="#FFFFFF" fillOpacity={0.12} />
          <Path d="M61.5 50 Q66 58 63 66" stroke={GOLD} strokeWidth={0.8} fill="none" />
        </G>
      );
    default:
      return null;
  }
}

function Headwear({ kind, tint, tint2, accent }: { kind: string; tint: string; tint2: string; accent: string }) {
  switch (kind) {
    case 'headset':
      return (
        <G>
          <Path d="M31 45 C31 25 69 25 69 45" stroke="#2A2F3A" strokeWidth={3.2} fill="none" />
          <Rect x={28.5} y={40} width={6.5} height={12} rx={3} fill="#2A2F3A" />
          <Rect x={65} y={40} width={6.5} height={12} rx={3} fill="#2A2F3A" />
          <Rect x={29.8} y={43} width={2} height={6} rx={1} fill={tint} />
          <Rect x={68.2} y={43} width={2} height={6} rx={1} fill={tint} />
          <Path d="M32 51.5 C34 58.5 40 60.5 45 59.5" stroke="#2A2F3A" strokeWidth={1.6} fill="none" />
          <Circle cx={45.6} cy={59.4} r={1.8} fill="#2A2F3A" />
        </G>
      );
    case 'beanie':
      return (
        <G>
          <Path d="M31.5 41 C31 27 40 21 50 21 C60 21 69 27 68.5 41 Z" fill={accent} />
          <Path d="M36 26 L36 40 M43 22.5 L43 40 M50 21 L50 40 M57 22.5 L57 40 M64 26 L64 40" stroke={shade(accent, -0.2)} strokeWidth={1} />
          <Rect x={30} y={37} width={40} height={7} rx={3.5} fill={shade(accent, -0.18)} />
          <Circle cx={50} cy={19} r={4.2} fill={shade(accent, 0.35)} />
        </G>
      );
    case 'cap':
      return (
        <G>
          <Path d="M32 40 C32 27 41 21.5 50 21.5 C59 21.5 68 27 68 40 Z" fill={accent} />
          <Path d="M50 37.5 L76 39.2 C77.5 42.5 72 44 65 43.2 L50 41 Z" fill={shade(accent, -0.25)} />
          <Circle cx={50} cy={22} r={1.5} fill={shade(accent, -0.25)} />
          <Path d={star4(42, 31, 3, 1)} fill={tint} />
        </G>
      );
    case 'toadstool':
      return (
        <G>
          <Path d="M29 40 C29 24 40 16 50 16 C60 16 71 24 71 40 C62 36.5 38 36.5 29 40 Z" fill="#C2503F" />
          <Path d="M29 40 C38 36.5 62 36.5 71 40 L70 42 C61 39 39 39 30 42 Z" fill="#F6E7C8" />
          <Circle cx={41} cy={27} r={3.2} fill="#FFF4DE" />
          <Circle cx={56} cy={23.5} r={2.6} fill="#FFF4DE" />
          <Circle cx={61.5} cy={32} r={2} fill="#FFF4DE" />
          <Circle cx={48} cy={33} r={1.7} fill="#FFF4DE" />
        </G>
      );
    case 'band':
      return <Path d="M32.5 37 C38 31.5 62 31.5 67.5 37 L67 41.5 C61 36.5 39 36.5 33 41.5 Z" fill={tint} />;
    case 'antenna':
      return (
        <G>
          <Path d="M32.5 37 C38 31.5 62 31.5 67.5 37 L67 41.5 C61 36.5 39 36.5 33 41.5 Z" fill="#2A2F3A" />
          <Line x1={59} y1={33.5} x2={65} y2={16.5} stroke="#2A2F3A" strokeWidth={1.6} />
          <Circle cx={65.4} cy={15.4} r={5.5} fill={tint} opacity={0.3} />
          <Circle cx={65.4} cy={15.4} r={3} fill={tint} />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path d="M36.5 31 L38.5 18.5 L44.5 26 L50 15 L55.5 26 L61.5 18.5 L63.5 31 Z" fill={GOLD} stroke="#A87C33" strokeWidth={0.8} />
          <Circle cx={50} cy={26.5} r={2} fill="#38D6C6" />
          <Circle cx={42} cy={28} r={1.3} fill="#EE8572" />
          <Circle cx={58} cy={28} r={1.3} fill="#8C9CFF" />
        </G>
      );
    default:
      return null;
  }
}

function Outfit({ kind, color, skin, tint }: { kind: string; color: string; skin: string; tint: string }) {
  const body = 'M14 100 C16 81 30 71 50 71 C70 71 84 81 86 100 Z';
  const lite = shade(color, 0.22);
  const dark = shade(color, -0.25);
  switch (kind) {
    case 'hoodie':
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M35 71.5 C37 63.5 63 63.5 65 71.5 C60 76.5 40 76.5 35 71.5 Z" fill={lite} />
          <Path d="M46 75 L45 87 M54 75 L55 87" stroke="#ECE6DA" strokeWidth={1.2} strokeLinecap="round" />
          <Rect x={37} y={91} width={26} height={9} rx={2} fill={dark} />
        </G>
      );
    case 'jacket':
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M43 71 L50 89 L57 71 Z" fill="#E6E1D6" />
          <Path d="M43 71 L50 89 L39 83 L38 74 Z" fill={dark} />
          <Path d="M57 71 L50 89 L61 83 L62 74 Z" fill={dark} />
          <Circle cx={50} cy={94} r={1.3} fill={dark} />
        </G>
      );
    case 'sweater':
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M41.5 71.5 C45 76.5 55 76.5 58.5 71.5" stroke={lite} strokeWidth={3.4} fill="none" />
          <Path d="M20 89 L26 86 L32 89 L38 86 L44 89 L50 86 L56 89 L62 86 L68 89 L74 86 L80 89" stroke={lite} strokeWidth={2.2} fill="none" />
        </G>
      );
    case 'lab':
      return (
        <G>
          <Path d={body} fill="#E9ECF2" />
          <Path d="M44 71 L50 85 L56 71 Z" fill={color} />
          <Path d="M44 71 L50 85 L41 92 M56 71 L50 85 L59 92" stroke="#B9BFCC" strokeWidth={1} fill="none" />
          <Rect x={60} y={86} width={9} height={7} rx={1} stroke="#B9BFCC" strokeWidth={1} fill="none" />
          <Line x1={62.5} y1={83.5} x2={62.5} y2={89} stroke={tint} strokeWidth={1.4} strokeLinecap="round" />
        </G>
      );
    case 'tee':
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M44 71 C45.5 75.5 54.5 75.5 56 71 Z" fill={skin} />
          <Path d="M27 86 L25 100 M73 86 L75 100" stroke={dark} strokeWidth={1} />
        </G>
      );
    case 'armor':
      return (
        <G>
          <Path d={body} fill="#3A4152" />
          <Path d="M36 76 C42 73 58 73 64 76 L62 96 C56 99 44 99 38 96 Z" fill={color} stroke={GOLD} strokeWidth={1.2} />
          <Path d={star4(50, 85, 4.5, 1.4)} fill={GOLD} />
          <Ellipse cx={23} cy={84} rx={8} ry={5.5} fill={color} stroke={GOLD} strokeWidth={1.2} transform="rotate(-25 23 84)" />
          <Ellipse cx={77} cy={84} rx={8} ry={5.5} fill={color} stroke={GOLD} strokeWidth={1.2} transform="rotate(25 77 84)" />
        </G>
      );
    case 'cape':
      return (
        <G>
          <Path d="M20 77 C11 88 9 100 9 100 L91 100 C91 100 89 88 80 77 Z" fill={color} />
          <Path d={body} fill="#2A2D34" />
          <Path d="M38 73 C44 78 56 78 62 73" stroke={GOLD} strokeWidth={1.4} fill="none" />
          <Circle cx={50} cy={77} r={2.6} fill={GOLD} />
        </G>
      );
    default:
      // flight suit
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M42 71 L50 79 L58 71" stroke={lite} strokeWidth={2} fill="none" strokeLinejoin="round" />
          <Line x1={50} y1={79} x2={50} y2={100} stroke={dark} strokeWidth={1.2} />
          <Path d="M21 88 L79 88" stroke={tint} strokeOpacity={0.75} strokeWidth={2.4} />
        </G>
      );
  }
}

function Accessory({ kind, tint }: { kind: string; tint: string }) {
  switch (kind) {
    case 'patch':
      return (
        <G>
          <Circle cx={63} cy={80} r={4.6} fill={tint} stroke="#F2EDE3" strokeWidth={0.8} />
          <Path d={star4(63, 80, 3, 1)} fill="#F2EDE3" />
        </G>
      );
    case 'scarf':
      return (
        <G fill="#C9574A">
          <Path d="M39.5 68.5 C44 74 56 74 60.5 68.5 L61.5 73.5 C56 79 44 79 38.5 73.5 Z" />
          <Path d="M54.5 75 L58.5 91 L54 90.5 L51.8 76.5 Z" />
        </G>
      );
    case 'pendant':
      return (
        <G>
          <Path d="M43 71.5 Q50 82 57 71.5" stroke={GOLD} strokeWidth={0.8} fill="none" />
          <Path d={star4(50, 81, 3.2, 1)} fill={GOLD} />
        </G>
      );
    case 'straps':
      return (
        <G stroke="#262A33" strokeWidth={4} strokeLinecap="round">
          <Line x1={35.5} y1={75} x2={38.5} y2={100} />
          <Line x1={64.5} y1={75} x2={61.5} y2={100} />
        </G>
      );
    case 'tie':
      return (
        <G fill={tint}>
          <Path d="M50 74 L44 70.5 L44 77.5 Z" />
          <Path d="M50 74 L56 70.5 L56 77.5 Z" />
          <Circle cx={50} cy={74} r={1.5} />
        </G>
      );
    case 'medal':
      return (
        <G>
          <Path d="M46.5 71 L50 81 L53.5 71" stroke="#1F8F86" strokeWidth={2.6} fill="none" />
          <Circle cx={50} cy={84} r={3.8} fill={GOLD} stroke="#A87C33" strokeWidth={0.8} />
          <Path d={star4(50, 84, 2.3, 0.8)} fill="#FFF3D6" />
        </G>
      );
    default:
      return null;
  }
}

export function Avatar({ size = 64, look = DEFAULT_LOOK, label }: { size?: number; look?: Look; label?: string }) {
  const raw = useId();
  const uid = `av${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const L = { ...DEFAULT_LOOK, ...look };
  const skin = pick(SKIN, L.skin).color!;
  const hair = pick(HAIR_COLOR, L.hairColor).color!;
  const iris = pick(EYE_COLOR, L.eyeColor).color!;
  const v = pick(VISOR, L.visor);
  const bg = pick(BACKGROUND, L.background);
  const frame = pick(FRAME, L.frame);
  const outfitColor = pick(OUTFIT_COLOR, L.outfitColor).color!;
  const lip = shade(skin, -0.45);
  const helmet = L.headwear === 'helmet';
  const hatHidesHair = L.headwear === 'beanie' || L.headwear === 'cap' || L.headwear === 'crown' || L.headwear === 'toadstool';
  const hairStyle = hatHidesHair && !['long', 'bob', 'pony', 'braids', 'afro'].includes(L.hair) ? 'none' : L.hair;

  return (
    <View accessibilityRole="image" accessibilityLabel={label ?? 'Explorer avatar'} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${uid}bg`} cx="50%" cy="38%" r="65%">
            <Stop offset="0" stopColor={bg.color} />
            <Stop offset="1" stopColor={bg.color2} />
          </RadialGradient>
          <LinearGradient id={`${uid}v`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={v.color} />
            <Stop offset="1" stopColor={v.color2 ?? v.color} />
          </LinearGradient>
          <ClipPath id={`${uid}clip`}>
            <Circle cx={50} cy={50} r={46} />
          </ClipPath>
        </Defs>
        <Circle cx={50} cy={50} r={46} fill={`url(#${uid}bg)`} />
        <G clipPath={`url(#${uid}clip)`}>
          {L.background === 'aurora' && <Path d="M4 40 C25 30 40 46 60 34 C75 26 88 30 96 26 L96 44 C80 46 70 40 56 50 C38 60 22 48 4 56 Z" fill="#38D6C6" opacity={0.18} />}
          {['night', 'violet', 'aurora', 'slate'].includes(L.background) && (
            <G fill="#FFFFFF">
              <Circle cx={18} cy={24} r={0.8} opacity={0.7} />
              <Circle cx={82} cy={20} r={0.6} opacity={0.6} />
              <Circle cx={86} cy={58} r={0.7} opacity={0.5} />
              <Circle cx={12} cy={60} r={0.5} opacity={0.5} />
            </G>
          )}
          <HairBack style={hairStyle} color={hair} />
          <Outfit kind={L.outfit} color={outfitColor} skin={skin} tint={v.color!} />
          <Rect x={44} y={58} width={12} height={15} rx={4} fill={shade(skin, -0.12)} />
          {L.outfit === 'tee' && <Path d="M44 71 C45.5 75.5 54.5 75.5 56 71 Z" fill={shade(skin, -0.12)} />}
          <Accessory kind={L.accessory} tint={v.color!} />
          <Circle cx={33.5} cy={48} r={4} fill={skin} />
          <Circle cx={66.5} cy={48} r={4} fill={skin} />
          <Ellipse cx={50} cy={46} rx={17} ry={19} fill={skin} />
          <FaceDetail kind={L.face} skin={skin} />
          <Facial kind={L.facial} color={hair} />
          <Brows kind={L.brows} color={L.hair === 'none' && L.facial === 'none' ? shade(skin, -0.5) : hair} />
          <Eye x={43} kind={L.eyes} iris={iris} side="l" />
          <Eye x={57} kind={L.eyes} iris={iris} side="r" />
          <Path d="M50 48.5 Q48.6 52 50.6 52.6" stroke={shade(skin, -0.28)} strokeWidth={1.1} fill="none" strokeLinecap="round" />
          <Mouth kind={L.mouth} lip={lip} />
          <HairFront style={hairStyle} color={hair} />
          <Glasses kind={L.glasses} tint={v.color!} />
          <Headwear kind={L.headwear} tint={v.color!} tint2={v.color2 ?? v.color!} accent={outfitColor === '#D9D2C2' ? '#46506A' : shade(outfitColor, 0.12)} />
          {helmet && (
            <G>
              <Circle cx={50} cy={45} r={27} fill={`url(#${uid}v)`} fillOpacity={0.16} stroke="#DDE3F0" strokeWidth={2.2} strokeOpacity={0.9} />
              <Path d="M32 33 C36 26.5 42.5 23 49 22.6" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.6} strokeLinecap="round" fill="none" />
              <Path d="M28 64 C33 72.5 67 72.5 72 64 L73.5 70 C67 78.5 33 78.5 26.5 70 Z" fill={METAL} />
              <Circle cx={71} cy={67} r={1.6} fill={v.color} />
            </G>
          )}
        </G>
        <Circle cx={50} cy={50} r={46} stroke={frame.color} strokeWidth={L.frame === 'plain' ? 2 : 3} fill="none" />
        {L.frame === 'orbit' && <Ellipse cx={50} cy={50} rx={49} ry={16} stroke={frame.color} strokeOpacity={0.6} strokeWidth={1.6} fill="none" transform="rotate(-24 50 50)" />}
        {L.frame === 'constellation' &&
          [20, 95, 160, 250, 320].map((a) => {
            const r = (a * Math.PI) / 180;
            return <Circle key={a} cx={50 + Math.cos(r) * 46} cy={50 + Math.sin(r) * 46} r={3.4} fill={frame.color} />;
          })}
        {L.frame === 'halo' && <Circle cx={50} cy={50} r={41} stroke={frame.color} strokeOpacity={0.4} strokeWidth={1} fill="none" strokeDasharray="2 4" />}
      </Svg>
    </View>
  );
}
