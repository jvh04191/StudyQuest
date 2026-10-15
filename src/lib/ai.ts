import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useStore, type DraftCard } from '@/store/useStore';

/** The Expo dev server hosts the API routes; on device we call it by its host. */
function base() {
  if (Platform.OS === 'web') return '';
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : '';
}

async function post<T>(path: string, body: unknown, timeoutMs = 90000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-access-code': useStore.getState().prefs.accessCode ?? '' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status}).`);
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('The AI took too long to respond. Try again.');
    if (e instanceof TypeError) throw new Error('Could not reach the StudyQuest server. Make sure Expo is still running on your computer.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** Does the server ask for an access code, and where does it keep saved progress? */
export async function fetchServerInfo(): Promise<{ locked: boolean; saves: 'database' | 'file' | null }> {
  try {
    const res = await fetch(`${base()}/api/status`);
    const j = (await res.json()) as { locked?: boolean; saves?: 'database' | 'file' | null };
    return { locked: !!j.locked, saves: j.saves ?? null };
  } catch {
    return { locked: false, saves: null };
  }
}

export async function fetchAiStatus(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${base()}/api/status`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    const data = (await res.json()) as { ai?: boolean };
    return !!data.ai;
  } catch {
    return false;
  }
}

export interface GenResult {
  title: string;
  summary: string;
  cards: DraftCard[];
}

export function generateStudySet(body: {
  mode: 'notes' | 'pdf' | 'explanation';
  text?: string;
  pdfBase64?: string;
  fileName?: string;
  subject?: string;
  deckTitle?: string;
  count?: number | 'auto';
  part?: number;
  parts?: number;
}) {
  return post<GenResult>('/api/generate', body, 240000);
}

export interface PartsResult extends GenResult {
  /** Parts that failed after the first, so the deck is only partly made. */
  failedParts: number;
  lastError?: string;
}

/**
 * Make a deck in several shorter requests (so one slow or failed request doesn't lose everything).
 * The first part must succeed; if a later part fails, the cards made so far are kept.
 */
export async function generateInParts(
  body: Parameters<typeof generateStudySet>[0],
  parts: number,
  onProgress?: (done: number, total: number) => void,
): Promise<PartsResult> {
  const out: PartsResult = { title: '', summary: '', cards: [], failedParts: 0 };
  const seen = new Set<string>();
  for (let part = 1; part <= parts; part++) {
    onProgress?.(part - 1, parts);
    try {
      const res = await generateStudySet(parts > 1 ? { ...body, part, parts } : body);
      if (part === 1) {
        out.title = res.title;
        out.summary = res.summary;
      }
      for (const c of res.cards) {
        const k = c.front.trim().toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.cards.push(c);
      }
    } catch (e) {
      if (part === 1) throw e;
      out.failedParts++;
      out.lastError = e instanceof Error ? e.message : undefined;
    }
  }
  onProgress?.(parts, parts);
  return out;
}

export function hardenChoices(cards: { id: string; front: string; back: string }[]) {
  return post<{ choices: Record<string, string[]> }>('/api/harden', { cards }, 120000);
}

export function gradeAnswer(body: { question: string; answer: string; detail?: string; response: string }) {
  return post<{ verdict: 'correct' | 'partial' | 'wrong'; feedback: string }>('/api/grade', body, 60000);
}

export function fetchPage(url: string) {
  return post<{ title: string; text: string }>('/api/page', { url }, 30000);
}

export function askNova(body: unknown) {
  return post<{ reply: string }>('/api/nova', body);
}

/**
 * Rule-based extraction used when AI is off. Clearly labeled in the UI as not AI.
 * Turns "Term: definition", "Term - definition" and "X is Y." lines into cards.
 */
export function quickExtract(notes: string): DraftCard[] {
  const out: DraftCard[] = [];
  const seen = new Set<string>();
  const lines = notes
    .split(/\n+/)
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((l) => l.replace(/^[\s\-•*\d.)]+/, '').trim())
    .filter((l) => l.length > 8);
  for (const l of lines) {
    let m = l.match(/^([^:–—-]{2,60})\s*[:–—-]\s+(.{3,220})$/);
    if (m) {
      const term = m[1].trim();
      const def = m[2].trim().replace(/\.$/, '');
      if (!seen.has(term.toLowerCase())) {
        seen.add(term.toLowerCase());
        out.push({ front: `What is ${term}?`, back: def.length <= 60 ? def : def.slice(0, 57) + '…', detail: `${term}: ${def}.` });
      }
      continue;
    }
    m = l.match(/^(?:The |An? )?([A-Z][\w\s'-]{1,50}?)\s+(is|are|was|were)\s+(.{3,200}?)\.?$/);
    if (m) {
      const term = m[1].trim();
      const def = m[3].trim();
      if (!seen.has(term.toLowerCase())) {
        seen.add(term.toLowerCase());
        out.push({ front: `What ${m[2]} ${/^the /i.test(l) ? 'the ' : ''}${term}?`, back: def.length <= 60 ? def : def.slice(0, 57) + '…', detail: l });
      }
    }
  }
  return out.slice(0, 20);
}
