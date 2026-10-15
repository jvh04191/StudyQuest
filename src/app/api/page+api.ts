import { denied } from '@/server/guard';
/** Fetch a web page and return its readable text so it can be turned into cards. */
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i;

function toText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export async function POST(request: Request) {
  const no = denied(request);
  if (no) return no;
  try {
    const { url } = (await request.json()) as { url?: string };
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(url ?? '') ? url! : `https://${url}`);
    } catch {
      return Response.json({ error: 'That doesn’t look like a web address.' }, { status: 400 });
    }
    if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname)) return Response.json({ error: 'Only public web pages can be read.' }, { status: 400 });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(u, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 StudyQuest', accept: 'text/html,text/plain' } }).finally(() => clearTimeout(t));
    if (!res.ok) return Response.json({ error: `That page answered with an error (${res.status}).` }, { status: 502 });
    const type = res.headers.get('content-type') ?? '';
    if (!/text\/|html/i.test(type)) return Response.json({ error: 'That link isn’t a web page. PDFs can be added with the PDF tab.' }, { status: 415 });
    const raw = (await res.text()).slice(0, 2_000_000);
    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
    const text = /html/i.test(type) ? toText(raw) : raw;
    if (text.length < 80) return Response.json({ error: 'No readable text was found on that page. It may need a login or load its text with scripts.' }, { status: 422 });
    return Response.json({ title, text: text.slice(0, 60000) });
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'That page took too long to load.' : 'Could not load that page.';
    return Response.json({ error: msg }, { status: 502 });
  }
}
