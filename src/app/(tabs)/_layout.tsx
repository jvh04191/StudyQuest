import { Tabs } from 'expo-router';

// The app draws its own rail / tab bar (see AppShell), so the built-in bar is hidden.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' }, animation: 'fade' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="player" />
    </Tabs>
  );
}
