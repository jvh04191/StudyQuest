import { useEffect, type ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { color as C, font, radius, size, space } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

/* ---------- Text ---------- */

type Variant = 'hero' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'number';
const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: font.display, fontSize: size.hero, lineHeight: 44, letterSpacing: -0.6, color: C.text },
  title: { fontFamily: font.display, fontSize: size.xxl, lineHeight: 36, letterSpacing: -0.4, color: C.text },
  heading: { fontFamily: font.display, fontSize: size.lg, lineHeight: 26, letterSpacing: -0.1, color: C.text },
  subheading: { fontFamily: font.bodySemi, fontSize: size.lg, lineHeight: 24, color: C.text },
  body: { fontFamily: font.body, fontSize: size.md, lineHeight: 24, color: C.text },
  bodyStrong: { fontFamily: font.bodySemi, fontSize: size.md, lineHeight: 22, color: C.text },
  small: { fontFamily: font.body, fontSize: size.sm, lineHeight: 20, color: C.textMuted },
  caption: { fontFamily: font.bodyMedium, fontSize: size.xs, lineHeight: 16, color: C.textMuted, letterSpacing: 0.2 },
  number: { fontFamily: font.displayBold, fontSize: size.md, color: C.text, fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[variants[v], style]} />;
}

/* ---------- Buttons ---------- */

type BtnKind = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
const btnBg: Record<BtnKind, string> = {
  primary: C.teal,
  gold: C.gold,
  secondary: C.surface3,
  ghost: 'transparent',
  danger: C.coralSoft,
};
const btnFg: Record<BtnKind, string> = {
  primary: C.onAccent,
  gold: '#1D1404',
  secondary: C.text,
  ghost: C.text,
  danger: C.coral,
};

export function Button({
  label,
  kind = 'primary',
  icon,
  iconRight,
  onPress,
  disabled,
  small,
  style,
  full,
  accessibilityLabel,
  busy,
}: {
  label: string;
  kind?: BtnKind;
  icon?: IconName;
  iconRight?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  small?: boolean;
  full?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const calm = useCalmMotion();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fg = btnFg[kind];
  return (
    <Animated.View style={[{ alignSelf: full ? 'stretch' : 'flex-start' }, a, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled, busy: !!busy }}
        disabled={disabled || busy}
        onPressIn={() => {
          if (!calm) scale.value = withTiming(0.96, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        onPress={() => {
          haptic('light');
          sound('tap');
          onPress?.();
        }}
        style={({ focused, hovered }: { pressed: boolean; focused?: boolean; hovered?: boolean }) => [
          {
            minHeight: small ? 40 : 52,
            paddingHorizontal: small ? space.md + 2 : space.xl,
            borderRadius: radius.pill,
            backgroundColor: btnBg[kind],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            opacity: disabled ? 0.4 : hovered ? 0.9 : 1,
            borderWidth: kind === 'ghost' ? 1 : 0,
            borderColor: C.lineStrong,
          },
          focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 3 } as ViewStyle),
        ]}>
        {icon && <Icon name={icon} size={small ? 18 : 20} color={fg} />}
        <Text style={{ fontFamily: font.bodyBold, fontSize: small ? size.sm : size.md, color: fg }}>{busy ? 'Working…' : label}</Text>
        {iconRight && <Icon name={iconRight} size={small ? 18 : 20} color={fg} />}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  size: s = 44,
  tint = C.text,
  bg = C.surface3,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  size?: number;
  tint?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
      hitSlop={6}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        {
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
        style,
      ]}>
      <Icon name={icon} size={Math.round(s * 0.48)} color={tint} />
    </Pressable>
  );
}

/** Generic pressable surface with tactile press + focus ring. */
export function Touchable({
  children,
  style,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={(e) => {
        haptic('light');
        rest.onPress?.(e);
      }}
      style={({ pressed, focused, hovered }: { pressed: boolean; focused?: boolean; hovered?: boolean }) => [
        style,
        hovered && { backgroundColor: C.surface3 },
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 },
        focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle),
      ]}>
      {children}
    </Pressable>
  );
}

/* ---------- Surfaces ---------- */

export function Panel({
  children,
  style,
  tone = 1,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 1 | 2 | 3;
}) {
  const bg = tone === 1 ? C.surface1 : tone === 2 ? C.surface2 : C.surface3;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.line,
          padding: space.lg,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Pill({
  label,
  tint = C.textMuted,
  bg = C.surface3,
  icon,
  style,
}: {
  label: string;
  tint?: string;
  bg?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      {icon && <Icon name={icon} size={14} color={tint} strokeWidth={2} />}
      <Text style={{ fontFamily: font.bodySemi, fontSize: size.xs, color: tint }}>{label}</Text>
    </View>
  );
}

/* ---------- Progress ---------- */

export function Bar({
  value,
  tint = C.teal,
  height = 8,
  track = C.surface3,
  delay = 0,
  style,
}: {
  value: number;
  tint?: string;
  height?: number;
  track?: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const calm = useCalmMotion();
  const w = useSharedValue(calm ? value : 0);
  useEffect(() => {
    const target = Math.max(0, Math.min(1, value));
    if (calm) w.value = target;
    else {
      const t = setTimeout(() => {
        w.value = withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) });
      }, delay);
      return () => clearTimeout(t);
    }
  }, [value, calm, delay, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: tint }, a]} />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ring({
  value,
  size: s = 64,
  stroke = 6,
  tint = C.teal,
  track = C.surface3,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tint?: string;
  track?: string;
  children?: ReactNode;
}) {
  const calm = useCalmMotion();
  const r = (s - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(calm ? value : 0);
  useEffect(() => {
    const v = Math.max(0, Math.min(1, value));
    p.value = calm ? v : withTiming(v, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [value, calm, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={s / 2} cy={s / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={s / 2}
          cy={s / 2}
          r={r}
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={props}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ---------- Forms ---------- */

export function Field({
  label,
  help,
  style,
  inputStyle,
  ...rest
}: TextInputProps & { label?: string; help?: string; inputStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && <T v="caption" style={{ color: C.textMuted }}>{label}</T>}
      <TextInput
        placeholderTextColor={C.textFaint}
        selectionColor={C.teal}
        {...rest}
        style={[
          {
            minHeight: rest.multiline ? 120 : 50,
            backgroundColor: C.bgDeep,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: C.lineStrong,
            paddingHorizontal: space.lg,
            paddingVertical: rest.multiline ? space.md : 0,
            color: C.text,
            fontFamily: font.body,
            fontSize: size.md,
            textAlignVertical: rest.multiline ? 'top' : 'center',
          },
          inputStyle,
        ]}
      />
      {help && <T v="caption" style={{ color: C.textFaint }}>{help}</T>}
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string; icon?: IconName }[];
  value: V;
  onChange: (v: V) => void;
  label?: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', backgroundColor: C.bgDeep, borderRadius: radius.pill, padding: 4, gap: 4, borderWidth: 1, borderColor: C.line, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptic('light');
              onChange(o.value);
            }}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [
              {
                flexGrow: 1,
                minHeight: 40,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                backgroundColor: on ? C.surface4 : 'transparent',
              },
              focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
            ]}>
            {o.icon && <Icon name={o.icon} size={16} color={on ? C.text : C.textMuted} />}
            <Text style={{ fontFamily: font.bodySemi, fontSize: size.sm, color: on ? C.text : C.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.line }, style]} />;
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 32 }}>
      <T v="heading" accessibilityRole="header">{title}</T>
      {action}
    </View>
  );
}
