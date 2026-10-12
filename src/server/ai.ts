// Server-only AI helper, used exclusively by the +api route files.
// API keys are read here from .env and never reach the app bundle.
//
// Provider choice:
//   AI_PROVIDER=gemini     → Google Gemini (GEMINI_API_KEY, optional GEMINI_MODEL)
//   AI_PROVIDER=anthropic  → Claude (ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL)
//   AI_PROVIDER=groq       → Groq, free tier (GROQ_API_KEY, optional GROQ_MODEL). No PDF reading.
//   unset                  → whichever key is present (Claude first if both are)

export type Provider = 'anthropic' | 'gemini' | 'groq';

export function provider(): Provider {
  const p = (process.env.AI_PROVIDER || '').toLowerCase();
  if (p === 'gemini' || p === 'google') return 'gemini';
  if (p === 'anthropic' || p === 'claude') return 'anthropic';
  if (p === 'groq') return 'groq';
  if (!process.env.ANTHROPIC_API_KEY && process.env.GEMINI_API_KEY) return 'gemini';
  if (!process.env.ANTHROPIC_API_KEY && process.env.GROQ_API_KEY) return 'groq';
  return 'anthropic';
}

const KEY_NAME: Record<Provider, string> = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY' };

export function aiConfigured() {
  return !!process.env[KEY_NAME[provider()]];
}

export function modelName() {
  const p = provider();
  if (p === 'gemini') return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  if (p === 'groq') return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
}

function requireKey() {
  const name = KEY_NAME[provider()];
  const key = process.env[name];
  if (!key) throw new Error(`AI is not configured. Add ${name} to the .env file and restart Expo.`);
  return key;
}

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Brand = 'Gemini' | 'Claude' | 'Groq';

async function send(provider: Brand, url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (e) {
    // Shown in the terminal running Expo so the real network error isn't hidden.
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    console.warn(`[ai] request to ${provider} failed:`, (e as Error).message, cause?.code ?? cause?.message ?? '');
    throw new AiError(`Couldn't reach ${provider}. Check that the computer running Expo is online, then try again.`, 0);
  }
}

/** Status codes that usually clear up on their own: rate limits and busy servers. */
const TRANSIENT = new Set([429, 500, 502, 503, 504, 529]);

class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function friendly(provider: Brand, status: number, raw?: string) {
  const r = (raw ?? '').toLowerCase();
  if (status === 429 || r.includes('quota') || r.includes('rate limit') || r.includes('resource_exhausted')) {
    return `${provider} says your API key hit its usage limit. Free keys only allow a certain number of requests per minute and per day. Wait a minute and try again, or check your usage in ${provider === 'Gemini' ? 'Google AI Studio' : provider === 'Groq' ? 'the Groq console' : 'the Anthropic Console'}.`;
  }
  if (status === 503 || status === 529 || r.includes('overloaded') || r.includes('high demand') || r.includes('unavailable')) {
    return `${provider}'s servers are busy right now (this comes from ${provider === 'Gemini' ? 'Google' : provider === 'Groq' ? 'Groq' : 'Anthropic'}, not StudyQuest). StudyQuest already retried a few times. Try again in a minute.`;
  }
  if (status === 400 && r.includes('api key')) return `${provider} didn't accept the API key. Check the key in your .env file.`;
  if (status === 401 || status === 403) return `${provider} didn't accept the API key. Check the key in your .env file.`;
  if (status === 404) return `${provider} couldn't find the model "${modelName()}". Check the model name in your .env file.`;
  return raw ? `${provider} error: ${raw}` : `${provider} error (${status}).`;
}

/* ---------------- Claude ---------------- */

async function claude(body: Record<string, unknown>) {
  let last: AiError | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(attempt === 1 ? 1500 : 4000);
    const res = await send('Claude', `${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': requireKey(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelName(), ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      content?: { type: string; text?: string; input?: unknown }[];
      error?: { message?: string };
    };
    if (res.ok) return data.content ?? [];
    last = new AiError(friendly('Claude', res.status, data.error?.message), res.status);
    if (!TRANSIENT.has(res.status)) break;
  }
  throw last!;
}

/* ---------------- Gemini ---------------- */

/** Main model first, then backups to use when the main one is busy. */
function geminiModels() {
  const fallbacks = String(process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.7-flash')
    .split(',')
    .map((m: string) => m.trim())
    .filter(Boolean);
  return [...new Set([modelName(), ...fallbacks])];
}

async function gemini(body: Record<string, unknown>) {
  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  let last: AiError | undefined;
  for (const [mi, model] of geminiModels().entries()) {
    for (let attempt = 0; attempt < (mi === 0 ? 3 : 2); attempt++) {
      if (attempt) await sleep(attempt === 1 ? 1500 : 4000);
      const res = await send('Gemini', `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': requireKey() },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
        error?: { message?: string };
      };
      if (res.ok) {
        if (data.promptFeedback?.blockReason) throw new AiError(`Gemini declined this request (${data.promptFeedback.blockReason}).`, 400);
        return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
      }
      last = new AiError(friendly('Gemini', res.status, data.error?.message), res.status);
      // A per-day quota won't clear by retrying: stop now (and don't burn more of it) instead of waiting out the timeout.
      if (res.status === 429 && /per ?day|retry in d+h/i.test(data.error?.message ?? '')) {
        if (mi === 0 && geminiModels().length > 1) break;
        throw last;
      }
      // A backup model that doesn't exist for this key: move on quietly.
      if (res.status === 404 && mi > 0) break;
      if (!TRANSIENT.has(res.status)) {
        if (mi === 0) throw last;
        break;
      }
      // Rate limits apply to the whole key, so switching models rarely helps; keep retrying the same one.
    }
  }
  throw last!;
}

/* ---------------- Groq (OpenAI-compatible) ---------------- */

async function groq(body: Record<string, unknown>) {
  const base = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  let last: AiError | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(attempt === 1 ? 1500 : 4000);
    const res = await send('Groq', `${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${requireKey()}` },
      // gpt-oss models "think" first; keep that short so replies are quick and fit the token budget.
      body: JSON.stringify({ model: modelName(), ...(modelName().startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}), ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (res.ok) return (data.choices?.[0]?.message?.content ?? '').trim();
    last = new AiError(friendly('Groq', res.status, data.error?.message), res.status);
    // A long Retry-After means a per-day limit; waiting a few seconds won't help.
    const wait = Number(res.headers.get('retry-after') ?? 0);
    if (res.status === 429 && wait > 20) throw last;
    if (!TRANSIENT.has(res.status)) break;
  }
  throw last!;
}

/* ---------------- Shared operations ---------------- */

/** Multi-turn chat. Turns must alternate and start with the user. */
export async function chat(system: string, turns: Turn[], maxTokens = 700): Promise<string> {
  if (provider() === 'gemini') {
    return gemini({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })),
      generationConfig: { maxOutputTokens: maxTokens },
    });
  }
  if (provider() === 'groq') {
    return groq({
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...turns.map((t) => ({ role: t.role, content: t.text }))],
    });
  }
  const content = await claude({
    system,
    max_tokens: maxTokens,
    messages: turns.map((t) => ({ role: t.role, content: t.text })),
  });
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n')
    .trim();
}

export interface RawStudySet {
  title?: string;
  summary?: string;
  cards?: Record<string, unknown>[];
}

const CARD_FIELDS = {
  front: { type: 'string', description: 'One clear question.' },
  back: { type: 'string', description: 'The answer, as short as possible (ideally 1–5 words).' },
  detail: { type: 'string', description: 'One or two sentences explaining why the answer is right.' },
  hint: { type: 'string', description: 'A nudge toward the answer that does not give it away.' },
  distractors: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 plausible wrong answers of the same kind and length as the answer.' },
  aliases: { type: 'array', items: { type: 'string' }, description: 'Other acceptable spellings or forms of the answer.' },
  source_page: { type: 'integer', description: 'PDF page number the fact comes from, if known.' },
  source_quote: { type: 'string', description: 'A short exact quote (under 25 words) from the material that supports the answer.' },
};

const SET_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short deck title, 2–5 words.' },
    summary: { type: 'string', description: 'A concise 2–3 sentence summary of the material.' },
    cards: { type: 'array', items: { type: 'object', properties: CARD_FIELDS, required: ['front', 'back', 'detail', 'hint', 'distractors'] } },
  },
  required: ['title', 'summary', 'cards'],
};

function parseJson(text: string): RawStudySet {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('The AI returned cards in an unreadable format. Try again.');
  }
}

/** Build a study set from text or a PDF (base64). */
export async function makeStudySet(input: { text?: string; pdfBase64?: string; instructions: string }): Promise<RawStudySet> {
  const system = 'You turn study material into accurate, well-made flashcards and summaries.';
  if (provider() === 'gemini') {
    const parts: unknown[] = [];
    if (input.pdfBase64) parts.push({ inlineData: { mimeType: 'application/pdf', data: input.pdfBase64 } });
    if (input.text) parts.push({ text: `<material>\n${input.text}\n</material>` });
    parts.push({
      text: `${input.instructions}\n\nReply with only a JSON object matching this JSON Schema, with no other text:\n${JSON.stringify(SET_SCHEMA)}`,
    });
    const out = await gemini({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 16000, responseMimeType: 'application/json' },
    });
    return parseJson(out);
  }
  if (provider() === 'groq') {
    if (input.pdfBase64) throw new Error("Groq can't read PDFs directly. Paste the text from your PDF as notes instead, or switch AI_PROVIDER to gemini or anthropic in .env.");
    const out = await groq({
      max_tokens: 4000, // free tier allows ~8,000 tokens/minute in total, so keep input + output under that
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `<material>
${(input.text ?? '').slice(0, 14000)}
</material>

${input.instructions}

Reply with only a JSON object matching this JSON Schema, with no other text:
${JSON.stringify(SET_SCHEMA)}`,
        },
      ],
    });
    return parseJson(out);
  }
  const content: unknown[] = [];
  if (input.pdfBase64) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdfBase64 } });
  if (input.text) content.push({ type: 'text', text: `<material>\n${input.text}\n</material>` });
  content.push({ type: 'text', text: `${input.instructions}\n- Call save_study_set once with the result.` });
  const out = await claude({
    system,
    max_tokens: 12000,
    messages: [{ role: 'user', content }],
    tools: [{ name: 'save_study_set', description: 'Save a study set built from the learner material.', input_schema: SET_SCHEMA }],
    tool_choice: { type: 'tool', name: 'save_study_set' },
  });
  return ((out.find((c) => c.type === 'tool_use')?.input as RawStudySet) ?? {}) as RawStudySet;
}
