import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { useStore } from '@/store/useStore';

/**
 * Keeps progress on the server (when it has an ACCESS_CODE) so it follows you between devices.
 * Newest save wins. A device that has never synced adopts the server copy unless its own progress is further along.
 */
interface SyncState {
  status: 'off' | 'syncing' | 'saved' | 'error';
  at?: number;
  message?: string;
}
export const useSync = create<SyncState>(() => ({ status: 'off' }));

const META = 'studyquest-sync';
const base = () => (Platform.OS === 'web' ? '' : Constants.expoConfig?.hostUri ? `http://${Constants.expoConfig.hostUri}` : '');

let started = false;
let applying = false;
let lastAt = 0; // time of the newest save this device has seen (pushed or pulled)
let timer: ReturnType<typeof setTimeout> | undefined;
let busy = false;

const header = () => ({ 'content-type': 'application/json', 'x-access-code': useStore.getState().prefs.accessCode ?? '' });

export function snapshot() {
  const s = useStore.getState();
  const { accessCode: _code, ...prefs } = s.prefs;
  return JSON.parse(
    JSON.stringify({ subjects: s.subjects, decks: s.decks, cards: s.cards, cardStates: s.cardStates, player: s.player, prefs, daily: s.daily, history: s.history, lit: s.lit }),
  );
}

const remember = (at: number) => {
  lastAt = at;
  AsyncStorage.setItem(META, JSON.stringify({ at })).catch(() => {});
};

async function push() {
  const code = useStore.getState().prefs.accessCode;
  if (!code || busy) return;
  busy = true;
  useSync.setState({ status: 'syncing' });
  try {
    const at = Date.now();
    const res = await fetch(`${base()}/api/sync`, { method: 'PUT', headers: header(), body: JSON.stringify({ data: snapshot(), updatedAt: at }) });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save.');
    remember(at);
    useSync.setState({ status: 'saved', at, message: undefined });
  } catch (e) {
    useSync.setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not save.' });
  } finally {
    busy = false;
  }
}

function schedulePush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, 2500);
}

/** Fetch the server copy and adopt it if it is newer. Returns whether this device's copy was replaced. */
export async function pull(): Promise<boolean> {
  const code = useStore.getState().prefs.accessCode;
  if (!code) {
    useSync.setState({ status: 'off' });
    return false;
  }
  useSync.setState({ status: 'syncing' });
  try {
    const res = await fetch(`${base()}/api/sync`, { headers: header() });
    if (res.status === 404) {
      useSync.setState({ status: 'off' });
      return false;
    }
    const body = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown> | null; updatedAt?: number; error?: string };
    if (!res.ok) throw new Error(body.error ?? 'Could not reach the server.');
    const remote = body.data;
    const remoteAt = body.updatedAt ?? 0;
    if (!remote) {
      await push(); // nothing on the server yet: save this device's progress
      return false;
    }
    const local = useStore.getState();
    const neverSynced = lastAt === 0;
    const remoteXp = (remote.player as { xp?: number } | undefined)?.xp ?? 0;
    const adopt = neverSynced ? remoteXp >= local.player.xp : remoteAt > lastAt;
    if (adopt) {
      applying = true;
      const { prefs, ...rest } = remote;
      useStore.setState({ ...rest, prefs: { ...local.prefs, ...(prefs as object), accessCode: local.prefs.accessCode }, active: null } as never);
      applying = false;
      remember(remoteAt);
      useSync.setState({ status: 'saved', at: remoteAt, message: undefined });
      return true;
    }
    if (neverSynced || remoteAt < lastAt) await push();
    else useSync.setState({ status: 'saved', at: remoteAt, message: undefined });
    return false;
  } catch (e) {
    applying = false;
    useSync.setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not reach the server.' });
    return false;
  }
}

/** The server's previous save (kept at most once an hour), as a backup the learner can restore. */
export async function fetchEarlierSave() {
  const res = await fetch(`${base()}/api/sync?version=prev`, { headers: header() });
  const j = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown> | null; updatedAt?: number; error?: string };
  if (!res.ok) throw new Error(j.error ?? 'Could not reach the server.');
  if (!j.data) return null;
  return { app: 'studyquest' as const, version: 3, exportedAt: j.updatedAt ?? 0, data: j.data };
}

/** Call once after the store has loaded from this device. */
export async function startSync() {
  if (started) return;
  started = true;
  try {
    const raw = await AsyncStorage.getItem(META);
    if (raw) lastAt = (JSON.parse(raw) as { at?: number }).at ?? 0;
  } catch {}
  let code = useStore.getState().prefs.accessCode;
  useStore.subscribe((s, prev) => {
    if (applying) return;
    if (s.prefs.accessCode !== code) {
      code = s.prefs.accessCode;
      lastAt = 0;
      if (code) pull();
      else useSync.setState({ status: 'off' });
      return;
    }
    const changed =
      s.cards !== prev.cards || s.decks !== prev.decks || s.cardStates !== prev.cardStates || s.player !== prev.player || s.history !== prev.history || s.subjects !== prev.subjects || s.daily !== prev.daily || s.prefs !== prev.prefs;
    if (changed && s.prefs.accessCode) schedulePush();
  });
  AppState.addEventListener('change', (st) => {
    if (st === 'active') pull();
  });
  setInterval(() => {
    if (useStore.getState().prefs.accessCode) pull();
  }, 90000);
  if (code) pull();
}
