import { accessRequired, checkAccess, denied, loadSaved, storeSaved } from '@/server/access';

const MAX_BYTES = 4_000_000;

/** GET: the saved progress (or null). Also doubles as the access-code check. */
export async function GET(request: Request) {
  if (!checkAccess(request)) return denied();
  try {
    return Response.json({ saved: await loadSaved() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Could not read saved progress.' }, { status: 500 });
  }
}

/** PUT: replace saved progress when the sender's copy is newer. */
export async function PUT(request: Request) {
  if (!accessRequired()) return Response.json({ error: 'Cloud sync is off: set ACCESS_CODE on the server.' }, { status: 403 });
  if (!checkAccess(request)) return denied();
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return Response.json({ error: 'Saved progress is too large to sync.' }, { status: 413 });
    const body = JSON.parse(text) as { state?: unknown; updatedAt?: number };
    if (!body.state || typeof body.updatedAt !== 'number') return Response.json({ error: 'Bad sync payload.' }, { status: 400 });
    const current = await loadSaved();
    if (current && current.updatedAt > body.updatedAt) return Response.json({ saved: current, stale: true });
    await storeSaved({ state: body.state, updatedAt: body.updatedAt });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Could not save progress.' }, { status: 500 });
  }
}
