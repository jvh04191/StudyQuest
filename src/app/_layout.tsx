import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { Unbounded_500Medium, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from '@/components/shell/AppShell';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: C.surface1, text: C.text, primary: C.teal, border: C.line },
};

function useHydrated() {
  // `persist` is absent during server rendering on web.
  const [ok, setOk] = useState(() => useStore.persist?.hasHydrated() ?? false);
  useEffect(() => {
    const api = useStore.persist;
    if (!api) {
      setOk(true);
      return;
    }
    const unsub = api.onFinishHydration(() => setOk(true));
    if (api.hasHydrated()) setOk(true);
    return unsub;
  }, []);
  return ok;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Unbounded_500Medium,
    Unbounded_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (!ready) return;
    useStore.getState().ensureToday();
    useNova.getState().checkAi();
    SplashScreen.hideAsync().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') useStore.getState().ensureToday();
    });
    return () => sub.remove();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <AppShell>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'fade',
              animationDuration: 180,
            }}
          />
        </AppShell>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
