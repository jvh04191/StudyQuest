/// <reference types="node" />
import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** When ACCESS_CODE is unset (local dev), the API stays open and cloud sync is off. */
export function accessRequired() {
  return !!process.env.ACCESS_CODE;
}

const digest = (s: string) => createHash('sha256').update(s).digest();

export function checkAccess(request: Request): boolean {
  const expected = process.env.ACCESS_CODE;
  if (!expected) return true;
  const given = request.headers.get('x-access-code') ?? '';
  return timingSafeEqual(digest(given), digest(expected));
}

export function denied() {
  return Response.json({ error: 'Wrong or missing access code.' }, { status: 401 });
}

export interface Saved {
  state: unknown;
  updatedAt: number;
}

// Storage: Upstash Redis over REST (free tier, works on any host), with a local file fallback for dev.
const KEY = 'studyquest:state';
const FILE = process.env.SYNC_FILE ?? '.data/state.json';

function upstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export async function loadSaved(): Promise<Saved | null> {
  const up = upstash();
  if (up) {
    const res = await fetch(`${up.url}/get/${KEY}`, { headers: { authorization: `Bearer ${up.token}` } });
    if (!res.ok) throw new Error(`Storage read failed (${res.status}).`);
    const { result } = (await res.json()) as { result: string | null };
    return result ? (JSON.parse(result) as Saved) : null;
  }
  try {
    return JSON.parse(await readFile(FILE, 'utf8')) as Saved;
  } catch {
    return null;
  }
}

export async function storeSaved(saved: Saved): Promise<void> {
  const body = JSON.stringify(saved);
  const up = upstash();
  if (up) {
    // The value goes in the request body so large saves don't hit URL length limits.
    const res = await fetch(`${up.url}/set/${KEY}`, { method: 'POST', headers: { authorization: `Bearer ${up.token}` }, body });
    if (!res.ok) throw new Error(`Storage write failed (${res.status}).`);
    return;
  }
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, body);
}
