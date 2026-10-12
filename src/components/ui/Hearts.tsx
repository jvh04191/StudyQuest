import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { HEARTS_MAX } from '@/lib/progression';
import { useStore } from '@/store/useStore';
import { color as C } from '@/theme/tokens';
import { Icon } from './Icon';

/** Row of hearts for the quest HUD. Empty hearts are drawn as outlines. */
export function HeartsRow({ hearts, size = 20, empty = C.lineStrong, full = C.berry }: { hearts: number; size?: number; empty?: string; full?: string }) {
  return (
    <View accessible accessibilityLabel={`${hearts} of ${HEARTS_MAX} hearts`} style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: HEARTS_MAX }, (_, i) => (
        <Icon key={i} name="heart" size={size} color={i < hearts ? full : empty} fill={i < hearts ? full : undefined} strokeWidth={2} />
      ))}
    </View>
  );
}

/** Milliseconds left in the current rest (0 when not resting). Re-renders each second and refills hearts when it ends. */
export function useRestLeft() {
  const restEndsAt = useStore((s) => s.player.restEndsAt);
  const tick = useStore((s) => s.tickHearts);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!restEndsAt) return;
    setNow(Date.now());
    const t = setInterval(() => {
      setNow(Date.now());
      tick();
    }, 500);
    return () => clearInterval(t);
  }, [restEndsAt, tick]);
  return restEndsAt ? Math.max(0, restEndsAt - now) : 0;
}

export const fmtClock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
