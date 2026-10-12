import Svg, { Circle, Path } from 'react-native-svg';

import { color as C } from '@/theme/tokens';

// Hand-drawn 24px line icons, 1.75 stroke, round joins.
const PATHS = {
  home: ['M4 11.5 12 5l8 6.5', 'M6.5 10v9h11v-9', 'M10 19v-4.5h4V19'],
  library: ['M5 4.5h3.5v15H5z', 'M10.5 4.5H14v15h-3.5z', 'M16 5.6l3.3-.9 3 14.4-3.3.8z'],
  map: ['M5 17l4.5-6 5 3 4.5-8', 'M5 17h0', 'M9.5 11h0', 'M14.5 14h0', 'M19 6h0'],
  player: ['M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  play: ['M8 5.5v13l10.5-6.5z'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  chevronRight: ['M9.5 6l6 6-6 6'],
  chevronLeft: ['M14.5 6l-6 6 6 6'],
  chevronDown: ['M6 9.5l6 6 6-6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  bolt: ['M13 3.5 6 13.5h5.5l-1 7 7-10H12z'],
  flame: ['M12 20.5c3.6 0 6-2.4 6-5.8 0-4.2-4-6.2-4.7-10.2-2.8 1.8-4.1 4.4-3.8 6.8-1-.4-1.8-1.3-2.1-2.4C6.2 10.4 6 12.4 6 14.7c0 3.4 2.4 5.8 6 5.8z'],
  target: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12h0'],
  clock: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 8v4.5l3 1.8'],
  edit: ['M14.5 5.5l4 4L9 19H5v-4z', 'M12.5 7.5l4 4'],
  trash: ['M5 7h14', 'M9.5 7V5h5v2', 'M7 7l1 12.5h8L17 7'],
  upload: ['M12 15V5', 'M8 8.5 12 4.5l4 4', 'M5 15v4h14v-4'],
  doc: ['M7 3.5h7l4 4V20.5H7z', 'M14 3.5v4h4', 'M9.5 12h5', 'M9.5 15.5h5'],
  soundOn: ['M5 9.5h3l4.5-4v13L8 14.5H5z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a7.5 7.5 0 0 1 0 11'],
  soundOff: ['M5 9.5h3l4.5-4v13L8 14.5H5z', 'M16 9.5l5 5', 'M21 9.5l-5 5'],
  crown: ['M4.5 17.5 3.5 8l5 3.5L12 5l3.5 6.5 5-3.5-1 9.5z', 'M5 20h14'],
  send: ['M4.5 12 19.5 5l-4 14.5-3.5-6z', 'M12 13.5l7.5-8.5'],
  bulb: ['M9.5 17.5h5', 'M10 20.5h4', 'M12 3.5a5.5 5.5 0 0 0-3.4 9.8c.6.5.9 1.2.9 2V15.5h5v-.2c0-.8.3-1.5.9-2A5.5 5.5 0 0 0 12 3.5z'],
  refresh: ['M19 8.5A7.5 7.5 0 0 0 5.5 9', 'M19 4.5v4h-4', 'M5 15.5A7.5 7.5 0 0 0 18.5 15', 'M5 19.5v-4h4'],
  star: ['M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 16.4l-5.3 3.1 1.4-5.9-4.6-4 6.1-.5z'],
  flag: ['M6 20.5v-16', 'M6 4.5h11l-2.5 4 2.5 4H6'],
  pen: ['M4.5 19.5l1-4.5L16 4.5l3.5 3.5L9 18.5z', 'M13.5 7l3.5 3.5'],
  sparkle: ['M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5z', 'M18.5 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z'],
  layers: ['M12 4.5 20 9l-8 4.5L4 9z', 'M4 13l8 4.5 8-4.5'],
  cards: ['M7.5 6.5h11v13h-11z', 'M5 4.5h11'],
  arrowRight: ['M5 12h14', 'M13.5 6.5 19 12l-5.5 5.5'],
  arrowUp: ['M12 19V5', 'M6.5 10.5 12 5l5.5 5.5'],
  lock: ['M6.5 11h11v9h-11z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  dots: [],
  moon: ['M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z'],
  shield: ['M12 3.5 19 6v6c0 4.2-3 7.3-7 8.5-4-1.2-7-4.3-7-8.5V6z'],
  info: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 11v5', 'M12 8h0'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  color = C.text,
  strokeWidth = 1.75,
  fill,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'map' && (
        <>
          <Circle cx={5} cy={17} r={1.8} fill={color} />
          <Circle cx={9.5} cy={11} r={1.8} fill={color} />
          <Circle cx={14.5} cy={14} r={1.8} fill={color} />
          <Circle cx={19} cy={6} r={1.8} fill={color} />
        </>
      )}
      {name === 'dots' && (
        <>
          <Circle cx={6} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={18} cy={12} r={1.6} fill={color} />
        </>
      )}
      {PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill && i === 0 ? fill : 'none'}
        />
      ))}
    </Svg>
  );
}
