import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { useStore } from '@/store/useStore';

const CODE_KEY = 'studyquest-code';
const AT_KEY = 'studyquest-sync-at';
const DATA_KEYS = ['subjects', 'decks', 'cards', 'cardStates', 'player', 'prefs', 'daily', 'active', 'history', 'lit'] as const;

let code = '';

/** Where the API lives: same origin on web, the Expo dev server on a device. */
export function apiBase() {
  if (Platform.OS === 'web') return '';
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : '';
}

/** Headers every API call carries. Empty when no access code is set. */
export function authHeaders(): Record<string, string> {
  return code ? { 'x-access-code': code } : {};
}

type Phase = 'checking' | 'open' | 'locked' | 'ready';

interface AccessState {
  phase: Phase;
  error?: string;
  init: () => Promise<void>;
  submit: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** 'ok' = accepted, 'bad' = rejected, 'offline' = could not reach the server. */
async function verify(): Promise<'ok' | 'bad' | 'offline'> {
  try {
    const res = await fetch(`${apiBase()}/api/sync`, { headers: authHeaders() });
    if (res.status === 401) return 'bad';
    return res.ok ? 'ok' : 'offline';
  } catch {
    return 'offline';
  }
}

export const useAccess = create<AccessState>((set, get) => ({
  phase: 'checking',
  init: async () => {
    set({ phase: 'checking', error: undefined });
    let required = false;
    try {
      const res = await fetch(`${apiBase()}/api/status`);
      required = !!((await res.json()) as { codeRequired?: boolean }).codeRequired;
    } catch {
      // Unreachable server: carry on with whatever is saved on this device.
      required = !!(await AsyncStorage.getItem(CODE_KEY).catch(() => null));
    }
    if (!required) return set({ phase: 'open' });
    code = (await AsyncStorage.getItem(CODE_KEY).catch(() => null)) ?? '';
    if (!code) return set({ phase: 'locked' });
    const v = await verify();
    if (v === 'bad') {
      code = '';
      await AsyncStorage.removeItem(CODE_KEY).catch(() => {});
      return set({ phase: 'locked', error: 'That access code no longer works.' });
    }
    await startSync();
    set({ phase: 'ready' });
  },
  submit: async (entered) => {
    code = entered.trim();
    if (!code) return set({ error: 'Enter your access code.' });
    const v = await verify();
    if (v === 'bad') {
      code = '';
      return set({ error: 'Wrong access code.' });
    }
    if (v === 'offline') {
      code = '';
      return set({ error: 'Could not reach the server. Check your connection.' });
    }
    await AsyncStorage.setItem(CODE_KEY, code).catch(() => {});
    await startSync();
    set({ phase: 'ready', error: undefined });
  },
  signOut: async () => {
    code = '';
    await AsyncStorage.removeItem(CODE_KEY).catch(() => {});
    set({ phase: get().phase === 'open' ? 'open' : 'locked', error: undefined });
  },
}));

// ---- Cloud sync: last write wins, keyed on one access code ----

let syncing = false;
let applying = false;
let localAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function snapshot() {
  const s = useStore.getState();
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]]));
}

async function setLocalAt(at: number) {
  localAt = at;
  await AsyncStorage.setItem(AT_KEY, String(at)).catch(() => {});
}

async function pull(): Promise<void> {
  const res = await fetch(`${apiBase()}/api/sync`, { headers: authHeaders() });
  if (!res.ok) return;
  const { saved } = (await res.json()) as { saved: { state: Record<string, unknown>; updatedAt: number } | null };
  if (saved && saved.updatedAt > localAt) {
    applying = true;
    try {
      useStore.setState(saved.state as never);
    } finally {
      applying = false;
    }
    await setLocalAt(saved.updatedAt);
  } else if (!saved || saved.updatedAt < localAt) {
    await push();
  }
}

async function push(): Promise<void> {
  const at = localAt || Date.now();
  const res = await fetch(`${apiBase()}/api/sync`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ state: snapshot(), updatedAt: at }),
  });
  if (!res.ok) return;
  const data = (await res.json()) as { stale?: boolean };
  // Another device saved something newer in the meantime: take theirs.
  if (data.stale) await pull();
}

function schedulePush() {
  clearTimeout(timer);
  timer = setTimeout(() => push().catch(() => {}), 2000);
}

async function startSync() {
  if (syncing) return;
  syncing = true;
  localAt = Number((await AsyncStorage.getItem(AT_KEY).catch(() => null)) ?? 0) || 0;
  await pull().catch(() => {});
  useStore.subscribe(() => {
    if (applying) return;
    setLocalAt(Date.now());
    schedulePush();
  });
  const refresh = () => pull().catch(() => {});
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refresh());
  } else {
    AppState.addEventListener('change', (s) => s === 'active' && refresh());
  }
}
