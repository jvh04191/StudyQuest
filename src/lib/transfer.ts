import type { Card } from '@/store/types';
import type { DraftCard } from '@/store/useStore';

/** Split delimited text into rows, honouring "quoted, fields" and doubled quotes. */
function rows(text: string, sep: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"' && cur === '') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) out.push(row);
  return out;
}

/**
 * Read cards from pasted Quizlet exports, Anki "Notes in Plain Text" exports or CSV.
 * Picks tab, then semicolon-free comma, as the separator; first column is the question, second the answer.
 * Optional third and fourth columns become the explanation and hint.
 */
export function parseImport(text: string): DraftCard[] {
  const clean = text
    .split('\n')
    .filter((l) => !l.startsWith('#')) // Anki header lines like "#separator:tab"
    .join('\n')
    .trim();
  if (!clean) return [];
  const sep = clean.includes('\t') ? '\t' : clean.split('\n').filter((l) => l.includes(',')).length >= clean.split('\n').length / 2 ? ',' : ' - ';
  let table: string[][];
  if (sep === ' - ') table = clean.split('\n').map((l) => { const i = l.indexOf(' - '); return i > 0 ? [l.slice(0, i), l.slice(i + 3)] : [l]; });
  else table = rows(clean, sep);
  const strip = (x?: string) => (x ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const out: DraftCard[] = [];
  for (const r of table) {
    const front = strip(r[0]);
    const back = strip(r[1]);
    if (!front || !back) continue;
    if (out.length === 0 && /^(front|term|question)$/i.test(front) && /^(back|definition|answer)$/i.test(back)) continue; // CSV header row
    out.push({ front, back, detail: strip(r[2]) || '', hint: strip(r[3]) || '' });
  }
  return out;
}

const q = (x: string) => `"${x.replace(/"/g, '""')}"`;

/** Tab-separated text that Quizlet ("Import") and Anki ("Import file") both accept. */
export function exportTabs(cards: Card[]): string {
  const one = (x: string) => x.replace(/[\t\r\n]+/g, ' ').trim();
  return cards.map((c) => `${one(c.front)}\t${one(c.back)}`).join('\n');
}

/** CSV with every field the app keeps, for spreadsheets. */
export function exportCsv(cards: Card[]): string {
  return ['front,back,explanation,hint', ...cards.map((c) => [c.front, c.back, c.detail, c.hint].map(q).join(','))].join('\n');
}
