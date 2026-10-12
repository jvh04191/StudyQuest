import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { haptic, sound, useCalmMotion } from '@/lib/feedback';
import { color as C, font, radius, size, space } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

const focusRing = { outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 3 } as ViewStyle;

/* ---------- Text ---------- */

type Variant = 'hero' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'eyebrow' | 'number';
const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: font.display, fontSize: size.hero, lineHeight: 40, color: C.text },
  title: { fontFamily: font.display, fontSize: size.xxl, lineHeight: 32, color: C.text },
  heading: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: C.text },
  subheading: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 23, color: C.text },
  body: { fontFamily: font.body, fontSize: size.md, lineHeight: 22, color: C.text },
  bodyStrong: { fontFamily: font.bodyBold, fontSize: size.md, lineHeight: 22, color: C.text },
  small: { fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: C.textMuted },
  caption: { fontFamily: font.bodyBold, fontSize: size.xs, lineHeight: 16, color: C.textMuted },
  eyebrow: { fontFamily: font.bodyBold, fontSize: 11, lineHeight: 14, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  number: { fontFamily: font.pixel, fontSize: size.md, color: C.text, fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[variants[v], style]} />;
}

/* ---------- Buttons ---------- */

type BtnKind = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'plum';
const btnBg: Record<BtnKind, string> = {
  primary: C.moss,
  gold: C.honey,
  secondary: C.surface1,
  ghost: 'transparent',
  danger: C.berry,
  plum: C.plum,
};
const btnLip: Record<BtnKind, string> = {
  primary: C.mossShadow,
  gold: C.honeyShadow,
  secondary: C.panelShadow,
  ghost: 'transparent',
  danger: C.berryShadow,
  plum: C.plumShadow,
};
const btnFg: Record<BtnKind, string> = {
  primary: '#FFFFFF',
  gold: '#4A2E05',
  secondary: C.text,
  ghost: C.textMuted,
  danger: '#FFFFFF',
  plum: C.onNight,
};

/** Chunky button: solid fill, 4px under-lip, presses down 3px. */
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
  const fg = btnFg[kind];
  const flat = kind === 'ghost';
  return (
    <View style={[{ alignSelf: full ? 'stretch' : 'flex-start', paddingBottom: flat ? 0 : 4, opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled, busy: !!busy }}
        disabled={disabled || busy}
        onPress={() => {
          haptic('light');
          sound('tap');
          onPress?.();
        }}
        style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
          {
            minHeight: small ? 44 : 54,
            paddingHorizontal: small ? 16 : 24,
            borderRadius: small ? 14 : 17,
            backgroundColor: btnBg[kind],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            borderWidth: kind === 'secondary' ? 1.5 : 0,
            borderColor: C.panelBorder,
          } as ViewStyle,
          flat
            ? undefined
            : {
                boxShadow: pressed
                  ? `0 1px 0 ${btnLip[kind]}`
                  : `0 4px 0 ${btnLip[kind]}, inset 0 1.5px 0 rgba(255,255,255,${kind === 'secondary' ? 0.5 : 0.28})`,
                transform: [{ translateY: pressed ? 3 : 0 }],
              },
          focused && focusRing,
        ]}>
        {icon && <Icon name={icon} size={small ? 18 : 21} color={fg} strokeWidth={2.1} />}
        <Text style={{ fontFamily: font.heavy, fontSize: small ? 14.5 : 16.5, color: fg }}>{busy ? 'Working…' : label}</Text>
        {iconRight && <Icon name={iconRight} size={small ? 18 : 21} color={fg} strokeWidth={2.1} />}
      </Pressable>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  size: s = 44,
  tint = C.text,
  bg = C.surface1,
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
          borderWidth: 1.5,
          borderColor: C.panelBorder,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: pressed ? `0 1px 0 ${C.panelShadow}` : `0 3px 0 ${C.panelShadow}`,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
        focused && focusRing,
        style,
      ]}>
      <Icon name={icon} size={Math.round(s * 0.48)} color={tint} strokeWidth={2.1} />
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
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        style,
        pressed && { transform: [{ translateY: 2 }], opacity: 0.94 },
        focused && focusRing,
      ]}>
      {children}
    </Pressable>
  );
}

/* ---------- Surfaces ---------- */

/** Parchment card: cream fill, 1.5px border, 4px drop. */
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
          borderRadius: radius.card,
          borderWidth: 1.5,
          borderColor: C.panelBorder,
          padding: space.lg,
          boxShadow: `0 4px 0 ${C.panelShadow}`,
          marginBottom: 4,
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
          paddingHorizontal: 11,
          height: 28,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      {icon && <Icon name={icon} size={14} color={tint} strokeWidth={2.2} />}
      <Text style={{ fontFamily: font.bodyBold, fontSize: size.xs, color: tint }}>{label}</Text>
    </View>
  );
}

/** HUD chip: icon + pixel-font number on a cream pill (streak, hearts, acorns). */
export function Chip({ icon, value, tint, bg = C.surface1, label }: { icon: IconName; value: string | number; tint: string; bg?: string; label?: string }) {
  return (
    <View
      accessibilityLabel={label ? `${label}: ${value}` : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: C.panelBorder,
        boxShadow: `0 2px 0 ${C.panelShadow}`,
      }}>
      <Icon name={icon} size={17} color={tint} fill={tint} strokeWidth={2} />
      <Text style={{ fontFamily: font.pixel, fontSize: 16, color: C.text }}>{value}</Text>
    </View>
  );
}

/* ---------- Progress ---------- */

export function Bar({
  value,
  tint = C.moss,
  height = 10,
  track = C.track,
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
        w.value = withTiming(target, { duration: 850, easing: Easing.out(Easing.cubic) });
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
      <Animated.View
        style={[{ height: '100%', borderRadius: height, backgroundColor: tint, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.3)' }, a]}
      />
    </View>
  );
}

/** Honey XP bar: chunky inset track with a gradient fill. */
export function XpBar({ pct, height = 14 }: { pct: number; height?: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height * 0.65, backgroundColor: C.track, padding: 2, boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.07)' }}>
      <LinearGradient
        colors={[C.honeyLight, C.honey]}
        style={{ height: '100%', width: `${Math.max(2, Math.min(1, pct) * 100)}%`, borderRadius: height * 0.5, boxShadow: 'inset 0 -2px 0 #C98A22' }}
      />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ring({
  value,
  size: s = 64,
  stroke = 6,
  tint = C.moss,
  track = C.track,
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
      {label && <T v="caption" style={{ fontSize: 13 }}>{label}</T>}
      <TextInput
        placeholderTextColor={C.textFaint}
        selectionColor={C.moss}
        {...rest}
        style={[
          {
            minHeight: rest.multiline ? 120 : 52,
            backgroundColor: C.surface1,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: C.panelBorder,
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
      style={{ flexDirection: 'row', backgroundColor: C.bgDeep, borderRadius: radius.pill, padding: 4, gap: 4, flexWrap: 'wrap' }}>
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
                minHeight: 42,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                backgroundColor: on ? C.surface1 : 'transparent',
                boxShadow: on ? `0 2px 0 ${C.panelShadow}` : undefined,
              },
              focused && focusRing,
            ]}>
            {o.icon && <Icon name={o.icon} size={16} color={on ? C.mossInk : C.textMuted} />}
            <Text style={{ fontFamily: font.bodyBold, fontSize: size.sm, color: on ? C.mossInk : C.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1.5, backgroundColor: C.divider }, style]} />;
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 32 }}>
      <T v="heading" accessibilityRole="header">{title}</T>
      {action}
    </View>
  );
}
