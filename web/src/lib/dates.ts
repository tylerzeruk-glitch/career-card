export const pad = (n: number) => String(n).padStart(2, '0');
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const isoOf = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayISO = () => isoOf(new Date());
export const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d || 1) / 86400000);
};
export const isoFromDay = (n: number) => {
  const d = new Date(n * 86400000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
};
export const fmt = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
};
export const fmtShort = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d;
};
export const fmtMonth = (ym: string | null | undefined) => {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + y;
};
export const yearOf = (ym: string | null | undefined) => (ym ? ym.slice(0, 4) : 'Now');
export const monthIndex = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};
export const nowYM = () => todayISO().slice(0, 7);
export const monthsBetween = (a: string, b: string | null | undefined) =>
  Math.max(1, monthIndex(b || nowYM()) - monthIndex(a) + 1);
export const durShort = (m: number) => (m >= 12 ? Math.floor(m / 12) + 'y' + (m % 12 ? ' ' + (m % 12) + 'm' : '') : m + 'm');
/** Years to one decimal for the card table; months when under a year. */
export const yrs = (m: number) => (m >= 12 ? (Math.round((m / 12) * 10) / 10).toString().replace(/\.0$/, '') : m + ' mo');
export const dur = (months: number) =>
  months >= 12
    ? (Math.round((months / 12) * 10) / 10).toString().replace(/\.0$/, '') + ' yr' + (months >= 24 ? 's' : '')
    : months + ' mo';
export const monthEndDay = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return Math.round(Date.UTC(y, m, 1) / 86400000);
};

/** Any spreadsheet-ish date value to YYYY-MM-DD, or null. */
export function parseDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : isoOf(v);
  if (typeof v === 'number') {
    if (v < 20000 || v > 80000) return null;
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return y + '-' + pad(+m[1]) + '-' + pad(+m[2]);
  }
  const t = Date.parse(s);
  if (!isNaN(t)) return isoOf(new Date(t));
  return null;
}

/** "Jan 2021", "2021-03", "03/2021", "2021", "Present" to YYYY-MM (null means present / unknown). */
export function parseMonth(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || /present|current|now/i.test(s)) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad(+m[2]);
  m = s.match(/^(\d{1,2})[\/.](\d{4})$/);
  if (m) return m[2] + '-' + pad(+m[1]);
  m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);
  if (m) {
    const i = MONTHS.findIndex((x) => x.toLowerCase() === m![1].slice(0, 3).toLowerCase());
    if (i >= 0) return m[2] + '-' + pad(i + 1);
  }
  m = s.match(/^(\d{4})$/);
  if (m) return m[1] + '-01';
  const d = parseDate(s);
  return d ? d.slice(0, 7) : null;
}
