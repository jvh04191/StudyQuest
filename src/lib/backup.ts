import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import { snapshot } from '@/lib/sync';
import { useStore } from '@/store/useStore';

/** A whole-progress backup the learner can keep anywhere. Never contains the access code. */
export interface Backup {
  app: 'studyquest';
  version: number;
  exportedAt: number;
  data: Record<string, unknown>;
}

const VERSION = 3; // matches the store's persist version

export function makeBackup(): Backup {
  return { app: 'studyquest', version: VERSION, exportedAt: Date.now(), data: snapshot() };
}

/** Parse and sanity-check backup text. Throws a friendly error if it isn't a StudyQuest backup. */
export function parseBackup(text: string): Backup {
  let b: Partial<Backup>;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error('That isn’t a StudyQuest backup file.');
  }
  const d = b.data as Record<string, unknown> | undefined;
  if (b.app !== 'studyquest' || !d || typeof d !== 'object') throw new Error('That isn’t a StudyQuest backup file.');
  if ((b.version ?? 0) > VERSION) throw new Error('That backup comes from a newer version of StudyQuest. Update this app first.');
  if (!Array.isArray(d.decks) || !d.cards || typeof d.cards !== 'object' || !d.player || typeof d.player !== 'object') throw new Error('That backup is missing parts of your progress.');
  return b as Backup;
}

/** What a backup holds, in plain words. */
export function describeBackup(b: Backup) {
  const d = b.data as { decks?: unknown[]; cards?: Record<string, unknown>; player?: { xp?: number; streak?: number } };
  return `${new Date(b.exportedAt).toLocaleString()} · ${d.decks?.length ?? 0} decks, ${Object.keys(d.cards ?? {}).length} cards, ${d.player?.xp ?? 0} XP`;
}

/** Replace this device's progress with the backup. The access code stays as it is. */
export function applyBackup(b: Backup) {
  const local = useStore.getState();
  const { prefs, ...rest } = b.data as { prefs?: object } & Record<string, unknown>;
  useStore.setState({ ...rest, prefs: { ...local.prefs, ...(prefs ?? {}), accessCode: local.prefs.accessCode }, active: null } as never);
}

/** Save the backup: a file download on the web, the share sheet (Save to Files, Notes, AirDrop…) in the app. */
export async function exportBackup(): Promise<string> {
  const json = JSON.stringify(makeBackup());
  const name = `studyquest-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return `Saved ${name} to your downloads.`;
  }
  await Share.share({ title: name, message: json });
  return 'Choose where to keep it, for example Save to Files.';
}

/** Let the learner pick a backup file. Returns null if they cancel. */
export async function pickBackup(): Promise<Backup | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
  if (r.canceled) return null;
  const a = r.assets[0];
  const text = Platform.OS === 'web' && a.file ? await a.file.text() : await new File(a.uri).text();
  return parseBackup(text);
}
