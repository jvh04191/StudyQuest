export const uid = (p = '') =>
  p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const DAY = 86_400_000;

export function dayKey(t = Date.now()) {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function yesterdayKey(t = Date.now()) {
  return dayKey(t - DAY);
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = arr.slice();
  let s = seed ?? Math.floor(Math.random() * 1e9);
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/[^a-z0-9.:/+*-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lev(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Returns 'exact' | 'close' (typo-level) | 'wrong'. */
export function checkTyped(input: string, answers: string[]): 'exact' | 'close' | 'wrong' {
  const a = normalize(input);
  if (!a) return 'wrong';
  let best: 'close' | 'wrong' = 'wrong';
  for (const raw of answers) {
    const b = normalize(raw);
    if (!b) continue;
    if (a === b) return 'exact';
    const tol = b.length <= 4 ? 0 : b.length <= 8 ? 1 : 2;
    if (lev(a, b) <= tol) best = 'close';
  }
  return best;
}

export function plural(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`;
}

export function relDue(due: number, now = Date.now()) {
  const diff = due - now;
  if (diff <= 0) return 'now';
  const h = diff / 3_600_000;
  if (h < 1) return `in ${Math.max(1, Math.round(diff / 60_000))} min`;
  if (h < 24) return `in ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'tomorrow' : `in ${d} days`;
}
