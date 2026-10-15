import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { accessLocked, accountOf, denied } from '@/server/guard';

/**
 * Saves each account's progress as one JSON file. The file name is a hash of the access code,
 * so the code itself is never written to disk. Point DATA_DIR at a persistent disk when hosting.
 */
const DIR = () => process.env.DATA_DIR || join(process.cwd(), '.data');
const MAX_BYTES = 8_000_000;

const fileFor = (request: Request) => join(DIR(), `${createHash('sha256').update(accountOf(request)).digest('hex').slice(0, 40)}.json`);

const off = () => Response.json({ error: 'Saving to the server is only available when the server has an ACCESS_CODE.' }, { status: 404 });

export async function GET(request: Request) {
  if (!accessLocked()) return off();
  const no = denied(request);
  if (no) return no;
  try {
    return new Response(await readFile(fileFor(request), 'utf8'), { headers: { 'content-type': 'application/json' } });
  } catch {
    return Response.json({ data: null, updatedAt: 0 });
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
    await mkdir(DIR(), { recursive: true });
    const file = fileFor(request);
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ data: body.data, updatedAt: body.updatedAt }));
    await rename(tmp, file);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'The server could not save your progress.' }, { status: 500 });
  }
}
