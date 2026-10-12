import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';

export function Screen({
  children,
  maxWidth = 780,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  maxWidth?: number;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pad = width < 500 ? space.lg : space.xxl;
  const inner = (
    <View style={[{ width: '100%', maxWidth, alignSelf: 'center', gap: space.xl }, contentStyle]}>{children}</View>
  );
  if (!scroll) {
    return <View style={{ flex: 1, paddingTop: insets.top + space.lg, paddingHorizontal: pad }}>{inner}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingBottom: 120, paddingHorizontal: pad }}
      keyboardShouldPersistTaps="handled">
      {inner}
    </ScrollView>
  );
}
