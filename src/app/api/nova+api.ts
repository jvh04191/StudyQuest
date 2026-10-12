import { chat } from '@/server/ai';

interface NovaBody {
  action?: string;
  messages: { role: 'user' | 'nova'; text: string }[];
  context: {
    learnerLevel?: number;
    deck?: { title: string; summary?: string; mastery?: number; sourceKind?: string; sourceTitle?: string; sourceText?: string };
    card?: {
      front: string;
      back: string;
      detail?: string;
      hint?: string;
      source?: { page?: number; quote?: string };
      answerVisible: boolean;
      mode?: string;
    };
    mistakes?: { front: string; back: string }[];
  };
}

const SYSTEM = `You are Nova, the study companion inside StudyQuest, a learning app. You are warm, calm and precise, like a good tutor.

How to help:
- Keep replies short: usually under 120 words. A step-by-step walkthrough may run to about 220 words.
- Adapt to the learner. Start simple, use concrete examples, and build up.
- Give hints before answers. If the learner has not answered the current question yet (answerVisible is false), do not state the answer. Offer a hint or a guiding question instead, unless they explicitly ask you to reveal it.
- Ask one short follow-up question when it would help them check their understanding.
- Sources: when you use the learner's own material (deck notes, PDF passages, card source quotes), say so, for example "From your notes: …" or "Your PDF (p. 4) says …", and quote briefly. When you rely on general knowledge, label it "General knowledge:". If the material does not cover something, say that plainly. If you are unsure, say so rather than guessing. Never invent page numbers or quotes.
- Formatting: plain sentences, optional "- " bullet lines, and **bold** for key terms. No headings, tables or emoji.`;

function contextBlock(ctx: NovaBody['context']) {
  const parts: string[] = [];
  if (ctx.learnerLevel) parts.push(`Learner level in the app: ${ctx.learnerLevel}.`);
  if (ctx.deck) {
    parts.push(`Current deck: "${ctx.deck.title}"${ctx.deck.mastery != null ? ` (mastery ${Math.round(ctx.deck.mastery * 100)}%)` : ''}.`);
    if (ctx.deck.summary) parts.push(`Deck summary: ${ctx.deck.summary}`);
    if (ctx.deck.sourceText) {
      parts.push(
        `The learner's own material for this deck (${ctx.deck.sourceKind === 'pdf' ? 'from a PDF' : 'pasted notes'}${ctx.deck.sourceTitle ? `: ${ctx.deck.sourceTitle}` : ''}):\n<material>\n${ctx.deck.sourceText.slice(0, 12000)}\n</material>`,
      );
    }
  }
  if (ctx.card) {
    const c = ctx.card;
    parts.push(
      `Current card (${c.mode === 'flash' ? 'flashcard' : c.mode === 'typed' ? 'typed-answer question' : 'multiple-choice question'}):\nQuestion: ${c.front}\nAnswer: ${c.back}\n${c.detail ? `Explanation on the card: ${c.detail}\n` : ''}${c.hint ? `Saved hint: ${c.hint}\n` : ''}${c.source?.quote ? `Source passage${c.source.page ? ` (p. ${c.source.page})` : ''}: "${c.source.quote}"\n` : ''}answerVisible: ${c.answerVisible}`,
    );
  }
  if (ctx.mistakes?.length) {
    parts.push(`Recent mistakes:\n${ctx.mistakes.map((m) => `- ${m.front} → ${m.back}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

const ACTIONS: Record<string, string> = {
  simple: 'Explain the current concept simply, as if to a curious 12-year-old, then check understanding with one question.',
  hint: 'Give me a hint for the current question. Do not reveal the answer.',
  quiz: 'Quiz me with one question on this topic. Wait for my answer before explaining.',
  walk: 'Walk me through this step by step, checking in after the key step.',
  example: 'Give me one concrete, memorable real-world example of this concept.',
  missed: 'Help me practice what I missed recently. Start with the first mistake and ask me a question about it.',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NovaBody;
    const history = (body.messages ?? []).slice(-12).filter((m) => m.text?.trim());
    const ctx = contextBlock(body.context ?? {});
    const msgs: { role: 'user' | 'assistant'; content: string }[] = [];
    history.forEach((m) => {
      const role = m.role === 'nova' ? 'assistant' : 'user';
      if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += `\n\n${m.text}`;
      else msgs.push({ role, content: m.text });
    });
    if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(The learner opened Nova.)' });
    const last = msgs[msgs.length - 1];
    const actionText = body.action ? ACTIONS[body.action] : undefined;
    if (last.role === 'user') last.content = `${ctx ? `<context>\n${ctx}\n</context>\n\n` : ''}${last.content}${actionText ? `\n\n(${actionText})` : ''}`;
    else msgs.push({ role: 'user', content: `${ctx}\n\n${actionText ?? 'Continue.'}` });

    const reply = await chat(SYSTEM, msgs.map((m) => ({ role: m.role, text: m.content })), 700);
    return Response.json({ reply: reply || 'I could not form a reply. Try asking another way.' });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Nova could not reach the AI service.' }, { status: 502 });
  }
}
