import { gradeAnswer } from '@/server/ai';

export async function POST(request: Request) {
  try {
    const b = (await request.json()) as { question?: string; answer?: string; detail?: string; response?: string };
    if (!b.question || !b.answer || !b.response?.trim()) return Response.json({ error: 'Nothing to grade.' }, { status: 400 });
    return Response.json(await gradeAnswer({ question: b.question, answer: b.answer, detail: b.detail, response: b.response }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Grading failed.' }, { status: 502 });
  }
}
