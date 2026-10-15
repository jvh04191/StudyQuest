import { denied } from '@/server/guard';
import { makeStudySet } from '@/server/ai';

interface GenBody {
  mode: 'notes' | 'pdf' | 'explanation';
  text?: string;
  pdfBase64?: string;
  fileName?: string;
  subject?: string;
  deckTitle?: string;
  /** A number of cards, or 'auto' to cover everything in the material. */
  count?: number | 'auto';
}

export async function POST(request: Request) {
  const no = denied(request);
  if (no) return no;
  try {
    const body = (await request.json()) as GenBody;
    const auto = body.count === 'auto' || body.count == null;
    const count = auto ? 60 : Math.max(3, Math.min(60, Number(body.count)));
    let text: string | undefined;
    if (body.mode === 'pdf') {
      if (!body.pdfBase64) return Response.json({ error: 'No PDF data was received.' }, { status: 400 });
      if (body.pdfBase64.length > 30_000_000) return Response.json({ error: 'That PDF is too large. Try one under 20 MB.' }, { status: 413 });
    } else {
      text = (body.text ?? '').trim();
      if (text.length < 40) return Response.json({ error: 'Add a bit more material — at least a few sentences.' }, { status: 400 });
      text = text.slice(0, 60000);
    }
    const howMany = auto
      ? 'Create one flashcard for every distinct question, term or key fact in it (up to 60). If the material is a list of questions, such as a quiz, worksheet or study guide, make exactly one card per question and keep every question.'
      : `Create ${count} flashcards (fewer only if the material truly has less to cover). If the material is a list of questions, make one card per question.`;
    const instructions = `${howMany}\nMaterial: this ${body.mode === 'pdf' ? 'PDF' : body.mode === 'explanation' ? 'explanation' : 'set of notes'}${body.subject ? `, subject "${body.subject}"` : ''}${body.deckTitle ? `, deck "${body.deckTitle}"` : ''}.
Rules:
- Use only facts stated in the material.
- Avoid near-duplicate cards.
- Make the 3 wrong answers on each card very hard to tell from the right one: same wording style and length, each a believable near-miss or common misconception.
- Each source_quote must be copied exactly from the material.${body.mode === 'pdf' ? ' Include source_page for every card.' : ''}`;
    const input = await makeStudySet({ text, pdfBase64: body.mode === 'pdf' ? body.pdfBase64 : undefined, instructions });
    if (!input?.cards?.length) return Response.json({ error: 'The AI did not return any cards. Try different material.' }, { status: 502 });
    const cards = input.cards.map((c) => ({
      front: String(c.front ?? ''),
      back: String(c.back ?? ''),
      detail: String(c.detail ?? ''),
      hint: String(c.hint ?? ''),
      distractors: Array.isArray(c.distractors) ? c.distractors.map(String).slice(0, 3) : [],
      aliases: Array.isArray(c.aliases) ? c.aliases.map(String) : [],
      source:
        c.source_page || c.source_quote
          ? { page: typeof c.source_page === 'number' ? c.source_page : undefined, quote: c.source_quote ? String(c.source_quote) : undefined }
          : undefined,
    }));
    return Response.json({ title: input.title ?? '', summary: input.summary ?? '', cards: cards.filter((c) => c.front && c.back) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Card generation failed.' }, { status: 502 });
  }
}
