import { router, usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Image, Pressable, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideInRight, SlideOutDown, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NovaOrb } from '@/components/art/NovaOrb';
import { NovaPanel } from '@/components/nova/NovaPanel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { haptic, useCalmMotion } from '@/lib/feedback';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font, layout, radius } from '@/theme/tokens';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/map', label: 'Map', icon: 'map' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/player', label: 'Player', icon: 'player' },
];

const focusRing = { outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle;

export function useLayoutMode() {
  const { width } = useWindowDimensions();
  return {
    width,
    rail: width >= layout.railBreak,
    docked: width >= layout.wideBreak,
  };
}

function isActive(path: string, href: string) {
  if (href === '/') return path === '/';
  return path.startsWith(href) || (href === '/library' && (path.startsWith('/deck') || path.startsWith('/create')));
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { rail, docked } = useLayoutMode();
  const insets = useSafeAreaInsets();
  const open = useNova((s) => s.open);
  const setOpen = useNova((s) => s.setOpen);
  const dockOpen = useStore((s) => s.prefs.novaDock);
  const setPrefs = useStore((s) => s.setPrefs);
  const setDockOpen = (v: boolean) => setPrefs({ novaDock: v });
  const calm = useCalmMotion();
  const focus = path.startsWith('/study') || path.startsWith('/rest');

  // On wide screens Nova lives beside the app: a request to open it docks the panel instead of a sheet.
  useEffect(() => {
    if (docked && open) {
      setPrefs({ novaDock: true });
      setOpen(false);
    }
  }, [docked, open, setOpen, setPrefs]);

  const showDock = docked && dockOpen;
  const toggleNova = () => {
    haptic('light');
    if (docked) setDockOpen(!dockOpen);
    else setOpen(!open);
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Image
        source={require('../../../assets/images/noise.png')}
        resizeMode="repeat"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.14 }}
      />
      </View>
      {rail && !focus && <Rail path={path} onNova={toggleNova} novaOn={docked ? dockOpen : open} topInset={insets.top} bottomInset={insets.bottom} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flex: 1 }}>{children}</View>
        {!rail && !focus && <TabBar path={path} bottomInset={insets.bottom} />}
      </View>
      {showDock && (
        <View
          style={{
            width: layout.novaWidth,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            backgroundColor: C.novaBg,
            borderLeftWidth: 1.5,
            borderLeftColor: '#E6D5B5',
          }}>
          <NovaPanel docked onClose={() => setDockOpen(false)} />
        </View>
      )}

      {/* Floating Nova button */}
      {!showDock && !open && !path.startsWith('/avatar') && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Nova, your study companion"
          onPress={toggleNova}
          hitSlop={8}
          style={({ focused, pressed }: { focused?: boolean; pressed: boolean }) => [
            {
              position: 'absolute',
              right: 16,
              bottom: rail ? 24 + insets.bottom : 104 + (focus ? insets.bottom - 40 : 0),
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: C.surface1,
              borderWidth: 1.5,
              borderColor: C.panelBorder,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: pressed ? `0 1px 0 ${C.panelShadow}` : `0 4px 0 ${C.panelShadow}, 0 8px 18px rgba(80,60,20,0.18)`,
              transform: [{ translateY: pressed ? 3 : 0 }],
            },
            focused && focusRing,
          ]}>
          <NovaFab />
        </Pressable>
      )}

      {/* Nova sheet: bottom sheet on phones, side sheet on tablets without room to dock */}
      {open && !docked && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Animated.View entering={calm ? undefined : FadeIn.duration(180)} exiting={calm ? undefined : FadeOut.duration(150)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Pressable accessibilityLabel="Close Nova" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: C.scrim }} />
          </Animated.View>
          <Animated.View
            entering={calm ? undefined : rail ? SlideInRight.duration(300) : SlideInDown.duration(300)}
            exiting={calm ? undefined : rail ? SlideOutRight.duration(200) : SlideOutDown.duration(220)}
            style={
              rail
                ? { position: 'absolute', right: 0, top: 0, bottom: 0, width: Math.min(420, layout.novaWidth + 40), paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: C.novaBg, borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl, overflow: 'hidden' }
                : { position: 'absolute', left: 0, right: 0, bottom: 0, height: '84%', paddingBottom: insets.bottom, backgroundColor: C.novaBg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' }
            }>
            {!rail && <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.lineStrong, marginTop: 8 }} />}
            <NovaPanel onClose={() => setOpen(false)} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function NovaFab() {
  const mood = useNova((s) => s.mood);
  const busy = useNova((s) => s.busy);
  const styleId = useStore((s) => s.player.novaStyle);
  return <NovaOrb size={40} mood={busy ? 'thinking' : mood} styleId={styleId} />;
}

function Rail({ path, onNova, novaOn, topInset, bottomInset }: { path: string; onNova: () => void; novaOn: boolean; topInset: number; bottomInset: number }) {
  const styleId = useStore((s) => s.player.novaStyle);
  return (
    <View
      style={{
        width: layout.railWidth,
        paddingTop: topInset + 18,
        paddingBottom: bottomInset + 18,
        alignItems: 'center',
        gap: 6,
        borderRightWidth: 1.5,
        borderColor: C.railBorder,
        backgroundColor: C.railBg,
      }}>
      <View
        accessibilityLabel="StudyQuest"
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: C.moss,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          boxShadow: `0 3px 0 ${C.mossShadow}, inset 0 1.5px 0 rgba(255,255,255,0.28)`,
        }}>
        <Text style={{ fontFamily: font.display, fontSize: 19, color: '#FFFFFF' }}>SQ</Text>
      </View>
      {NAV.map((n) => (
        <NavItem key={n.href} {...n} active={isActive(path, n.href)} vertical />
      ))}
      <View style={{ flex: 1 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={novaOn ? 'Hide Nova' : 'Show Nova'}
        accessibilityState={{ expanded: novaOn }}
        onPress={onNova}
        style={({ focused }: { pressed: boolean; focused?: boolean }) => [
          { alignItems: 'center', gap: 4, paddingVertical: 6, borderRadius: radius.md, width: 72 },
          focused && focusRing,
        ]}>
        <NovaOrb size={38} styleId={styleId} />
        <Text style={{ fontFamily: font.bodyBold, fontSize: 11.5, color: novaOn ? C.mossInk : C.navInactive }}>Nova</Text>
      </Pressable>
    </View>
  );
}

function TabBar({ path, bottomInset }: { path: string; bottomInset: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingBottom: bottomInset + 4,
        paddingTop: 8,
        paddingHorizontal: 6,
        borderTopWidth: 1.5,
        borderColor: C.railBorder,
        backgroundColor: C.railBg,
      }}>
      {NAV.map((n) => (
        <NavItem key={n.href} {...n} active={isActive(path, n.href)} />
      ))}
    </View>
  );
}

function NavItem({ href, label, icon, active, vertical }: { href: string; label: string; icon: IconName; active: boolean; vertical?: boolean }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptic('light');
        if (!active) router.navigate(href as never);
      }}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [
        {
          flex: vertical ? undefined : 1,
          width: vertical ? 72 : undefined,
          minHeight: 58,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          borderRadius: 16,
          backgroundColor: active ? C.mossSoft : 'transparent',
          borderWidth: 1.5,
          borderColor: active ? C.mossLine : 'transparent',
        },
        focused && focusRing,
      ]}>
      <Icon name={icon} size={24} color={active ? C.mossInk : C.navInactive} strokeWidth={active ? 2.1 : 1.9} />
      <Text style={{ fontFamily: active ? font.heavy : font.bodyBold, fontSize: 11.5, color: active ? C.mossInk : C.navInactive }}>{label}</Text>
    </Pressable>
  );
}
