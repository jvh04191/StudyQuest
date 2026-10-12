import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useStore } from '@/store/useStore';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  flip: require('../../assets/sounds/flip.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  reward: require('../../assets/sounds/reward.wav'),
};
export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Sound is off by default; turned on in Player → Settings. */
export function sound(name: SoundName) {
  if (!useStore.getState().prefs.sound) return;
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = 0.6;
      players[name] = p;
    }
    p.seekTo(0);
    p.play();
  } catch {
    // Sound is decorative; ignore playback failures.
  }
}

export function haptic(kind: 'light' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

/** True when motion should be minimised (system setting or the in-app preference). */
export function useCalmMotion() {
  const system = useReducedMotion();
  const pref = useStore((s) => s.prefs.motion);
  return pref === 'reduce' || (pref === 'system' && system);
}
