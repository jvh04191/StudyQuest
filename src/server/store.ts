import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Where each account's saved progress lives.
 * - With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set (a free Upstash Redis database) saves survive
 *   restarts and redeploys on any host. Large saves are split into chunks to fit Upstash's request limit.
 * - Otherwise saves are JSON files in DATA_DIR (default ./.data), which only last as long as the disk does.
 * Either way the previous save is kept (at most one per hour) so a bad overwrite can be undone.
 */
export interface Saved {
  data: unknown;
  updatedAt: number;
}

export interface Store {
  read(account: string, which?: 'cur' | 'prev'): Promise<Saved | null>;
  write(account: string, saved: Saved): Promise<void>;
}

const HOUR = 3_600_000;
// Each chunk is JSON-escaped twice on its way out, so keep it small enough that even quote-heavy text stays under 1 MB.
const CHUNK = 150_000;

/* ---------------- files ---------------- */

const dir = () => process.env.DATA_DIR || join(process.cwd(), '.data');

const fileStore: Store = {
  async read(account, which = 'cur') {
    try {
      return JSON.parse(await readFile(join(dir(), which === 'prev' ? `${account}.prev.json` : `${account}.json`), 'utf8')) as Saved;
    } catch {
      return null;
    }
  },
  async write(account, saved) {
    await mkdir(dir(), { recursive: true });
    const file = join(dir(), `${account}.json`);
    const old = await fileStore.read(account);
    if (old && saved.updatedAt - old.updatedAt > HOUR) await rename(file, join(dir(), `${account}.prev.json`)).catch(() => {});
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(saved));
    await rename(tmp, file);
  },
};

/* ---------------- Upstash Redis (REST) ---------------- */

type Cmd = (string | number)[];
interface Meta {
  id: string;
  n: number;
  updatedAt: number;
}

async function redis(cmds: Cmd[]): Promise<unknown[]> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`Database error ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const bad = out.find((o) => o.error);
  if (bad) throw new Error(bad.error);
  return out.map((o) => o.result);
}

const chunkKeys = (account: string, m: Meta) => Array.from({ length: m.n }, (_, i) => `sq:${account}:${m.id}:${i}`);
const parseMeta = (v: unknown): Meta | null => {
  try {
    return typeof v === 'string' ? (JSON.parse(v) as Meta) : null;
  } catch {
    return null;
  }
};

const upstashStore: Store = {
  async read(account, which = 'cur') {
    const [raw] = await redis([['GET', `sq:${account}:${which}`]]);
    const meta = parseMeta(raw);
    if (!meta) return null;
    const parts = await redis(chunkKeys(account, meta).map((k) => ['GET', k]));
    if (parts.some((p) => typeof p !== 'string')) return null;
    return { data: JSON.parse((parts as string[]).join('')), updatedAt: meta.updatedAt };
  },
  async write(account, saved) {
    const text = JSON.stringify(saved.data);
    const id = Math.random().toString(36).slice(2, 10);
    const pieces: string[] = [];
    for (let i = 0; i < text.length; i += CHUNK) pieces.push(text.slice(i, i + CHUNK));
    if (!pieces.length) pieces.push('{}');
    const meta: Meta = { id, n: pieces.length, updatedAt: saved.updatedAt };
    const [rawCur, rawPrev] = await redis([['GET', `sq:${account}:cur`], ['GET', `sq:${account}:prev`]]);
    const cur = parseMeta(rawCur);
    const prev = parseMeta(rawPrev);

    // 1. write the new chunks, 2. switch the pointer, 3. only then delete what is no longer needed
    for (let i = 0; i < pieces.length; i++) await redis([['SET', `sq:${account}:${id}:${i}`, pieces[i]]]);
    const keepAsPrev = !!cur && saved.updatedAt - cur.updatedAt > HOUR;
    const switchCmds: Cmd[] = [['SET', `sq:${account}:cur`, JSON.stringify(meta)]];
    if (keepAsPrev) switchCmds.push(['SET', `sq:${account}:prev`, JSON.stringify(cur)]);
    await redis(switchCmds);

    const stale: string[] = [];
    if (cur && !keepAsPrev) stale.push(...chunkKeys(account, cur));
    if (cur && keepAsPrev && prev) stale.push(...chunkKeys(account, prev));
    if (stale.length) await redis([['DEL', ...stale]]).catch(() => {});
  },
};

export const store: Store = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? upstashStore : fileStore;
export const storeKind = () => (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'database' : 'file');
