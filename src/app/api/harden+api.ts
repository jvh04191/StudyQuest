import { hardenChoices } from '@/server/ai';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cards?: { id: string; front: string; back: string }[] };
    const cards = (body.cards ?? []).filter((c) => c?.id && c.front && c.back).slice(0, 25);
    if (!cards.length) return Response.json({ choices: {} });
    return Response.json({ choices: await hardenChoices(cards) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Could not make harder choices.' }, { status: 502 });
  }
}
