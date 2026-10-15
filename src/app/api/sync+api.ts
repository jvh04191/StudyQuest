import { createHash } from 'node:crypto';

import { accessLocked, accountOf, denied } from '@/server/guard';
import { store } from '@/server/store';

/**
 * Saves each account's progress. The storage key is a hash of the access code, so the code itself is never stored.
 * See server/store.ts for where the data goes (a free Upstash database if configured, otherwise files).
 */
const MAX_BYTES = 8_000_000;

const accountKey = (request: Request) => createHash('sha256').update(accountOf(request)).digest('hex').slice(0, 40);

const off = () => Response.json({ error: 'Saving to the server is only available when the server has an ACCESS_CODE.' }, { status: 404 });

export async function GET(request: Request) {
  if (!accessLocked()) return off();
  const no = denied(request);
  if (no) return no;
  try {
    const which = new URL(request.url).searchParams.get('version') === 'prev' ? 'prev' : 'cur';
    return Response.json((await store.read(accountKey(request), which)) ?? { data: null, updatedAt: 0 });
  } catch {
    return Response.json({ error: 'The server could not read your saved progress.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!accessLocked()) return off();
  const no = denied(request);
  if (no) return no;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return Response.json({ error: 'Your saved data is too large to sync.' }, { status: 413 });
    const body = JSON.parse(text) as { data?: unknown; updatedAt?: number };
    if (!body.data || typeof body.data !== 'object' || typeof body.updatedAt !== 'number') return Response.json({ error: 'Bad save.' }, { status: 400 });
    await store.write(accountKey(request), { data: body.data, updatedAt: body.updatedAt });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'The server could not save your progress.' }, { status: 500 });
  }
}
