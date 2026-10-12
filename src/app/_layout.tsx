import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import { PixelifySans_500Medium, PixelifySans_600SemiBold, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
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
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: C.surface1, text: C.text, primary: C.moss, border: C.panelBorder },
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
    YoungSerif_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    PixelifySans_500Medium,
    PixelifySans_600SemiBold,
    PixelifySans_700Bold,
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
        <StatusBar style="dark" />
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
