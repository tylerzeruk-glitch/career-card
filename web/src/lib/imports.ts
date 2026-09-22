import type { Cert, Education, Ev, Profile } from './types';
import { parseDate, parseMonth } from './dates';
import { uid } from './derived';

// ---------- CSV ----------
export function parseCSV(text: string, delim = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
}
export function csvObjects(text: string): Record<string, string>[] {
  const rows = parseCSV(text.replace(/^﻿/, ''));
  if (!rows.length) return [];
  let hi = 0;
  while (hi < rows.length - 1 && rows[hi].filter(Boolean).length < 2) hi++;
  const H = rows[hi].map((h) => h.trim());
  return rows.slice(hi + 1).map((r) => { const o: Record<string, string> = {}; H.forEach((h, i) => (o[h] = (r[i] || '').trim())); return o; });
}
export const pick = (o: Record<string, string>, ...names: string[]) => {
  for (const n of names) {
    const k = Object.keys(o).find((k) => k.toLowerCase() === n.toLowerCase());
    if (k && o[k]) return o[k];
  }
  return '';
};

// ---------- lazy libraries (browser only) ----------
const loaded: Record<string, Promise<void>> = {};
export function loadScript(url: string) {
  return (loaded[url] ||= new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.onload = () => res();
    s.onerror = () => { delete loaded[url]; rej(new Error('Could not load ' + url)); };
    document.head.appendChild(s);
  }));
}
export const LIB = {
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
};
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = () => window as any;

// ---------- import preview shapes ----------
export type RoleDraft = { company: string; title: string; start: string | null; end: string | null; location: string; bullets: string[]; skills: string[] };
export type CareerImport = {
  kind: 'career';
  roles: RoleDraft[];
  education: Education[];
  certs: Cert[];
  skills: string[];
  profile: Partial<Profile>;
  source: string;
};
export type EventsImport = { kind: 'events'; events: Ev[]; skipped: number; ok: boolean; source: string };
export type ImportData = CareerImport | EventsImport;

const splitBullets = (s: string) => s.split(/\n+/).map((x) => x.trim().replace(/^[-•·*]\s*/, '')).filter(Boolean);

// ---------- LinkedIn data export ----------
export async function readLinkedIn(files: File[]): Promise<CareerImport> {
  const texts: Record<string, string> = {};
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      await loadScript(LIB.jszip);
      const zip = await w().JSZip.loadAsync(await f.arrayBuffer());
      for (const name of Object.keys(zip.files)) {
        const base = name.split('/').pop() || '';
        if (/^(Positions|Education|Skills|Certifications|Profile)\.csv$/i.test(base)) texts[base.toLowerCase()] = await zip.files[name].async('string');
      }
    } else if (/\.csv$/i.test(f.name)) texts[f.name.toLowerCase()] = await f.text();
  }
  if (!texts['positions.csv'] && !Object.keys(texts).length) throw new Error('No Positions.csv found. Export the full archive from LinkedIn and drop the zip.');
  const roles: RoleDraft[] = (texts['positions.csv'] ? csvObjects(texts['positions.csv']) : [])
    .map((o) => ({ company: pick(o, 'Company Name', 'Company'), title: pick(o, 'Title'), start: parseMonth(pick(o, 'Started On', 'Start Date')), end: parseMonth(pick(o, 'Finished On', 'End Date')), location: pick(o, 'Location'), bullets: splitBullets(pick(o, 'Description')), skills: [] }))
    .filter((r) => r.company && r.title && r.start);
  const education: Education[] = (texts['education.csv'] ? csvObjects(texts['education.csv']) : [])
    .map((o) => ({ school: pick(o, 'School Name'), degree: [pick(o, 'Degree Name'), pick(o, 'Notes')].filter(Boolean)[0] || '', years: [pick(o, 'Start Date'), pick(o, 'End Date')].filter(Boolean).join(' – ') }))
    .filter((e) => e.school);
  const certs: Cert[] = (texts['certifications.csv'] ? csvObjects(texts['certifications.csv']) : [])
    .map((o) => ({ name: pick(o, 'Name'), issuer: pick(o, 'Authority'), year: (pick(o, 'Started On') || '').slice(-4) }))
    .filter((c) => c.name);
  const skills = (texts['skills.csv'] ? csvObjects(texts['skills.csv']) : []).map((o) => pick(o, 'Name')).filter(Boolean);
  const prof = texts['profile.csv'] ? csvObjects(texts['profile.csv'])[0] || {} : {};
  const profile = { name: [pick(prof, 'First Name'), pick(prof, 'Last Name')].filter(Boolean).join(' '), headline: pick(prof, 'Headline'), summary: pick(prof, 'Summary'), location: pick(prof, 'Geo Location') };
  return { kind: 'career', roles, education, certs, skills, profile, source: 'LinkedIn export' };
}

// ---------- resume ----------
export async function resumeText(f: File): Promise<string> {
  let text = '';
  if (/\.pdf$/i.test(f.name)) {
    await loadScript(LIB.pdf);
    const pdfjs = w().pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = LIB.pdfWorker;
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i); const c = await page.getTextContent();
      let last: number | null = null, line = ''; const lines: string[] = [];
      c.items.forEach((it: any) => { if (last != null && Math.abs(it.transform[5] - last) > 2) { lines.push(line); line = ''; } line += (line && !line.endsWith(' ') ? ' ' : '') + it.str; last = it.transform[5]; });
      lines.push(line); text += lines.join('\n') + '\n';
    }
  } else if (/\.docx$/i.test(f.name)) {
    await loadScript(LIB.mammoth);
    text = (await w().mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
  } else text = await f.text();
  text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 80) throw new Error('Not much text came out of that file. If it is a scanned PDF, try a Word or text version.');
  return text;
}

/** A date-pattern parser: finds "Mon YYYY – Mon YYYY" lines and takes the lines above as title and company. */
export function heuristicResume(text: string): CareerImport {
  const lines = text.split('\n').map((s) => s.trim());
  const dateRe = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\b(?:19|20)\d{2}\b)\s*(?:-|–|—|to)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\b(?:19|20)\d{2}\b|Present|Current|Now)/i;
  const roles: RoleDraft[] = []; let cur: RoleDraft | null = null;
  lines.forEach((l, i) => {
    const m = l.match(dateRe);
    if (m) {
      if (cur) roles.push(cur);
      const ctx = [l.replace(dateRe, '').replace(/[|,·–-]+\s*$/, '').trim(), lines[i - 1] || '', lines[i - 2] || ''].map((s) => s.trim()).filter((s) => s && !dateRe.test(s));
      cur = { company: ctx[1] || '', title: ctx[0] || '', start: parseMonth(m[1]), end: /present|current|now/i.test(m[2]) ? null : parseMonth(m[2]), location: '', bullets: [], skills: [] };
    } else if (cur && /^[-•·*]/.test(l)) cur.bullets.push(l.replace(/^[-•·*]\s*/, ''));
  });
  if (cur) roles.push(cur);
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [''])[0];
  const linkedin = (text.match(/linkedin\.com\/in\/[\w-]+/i) || [''])[0];
  const name = lines.find((l) => l && l.length < 40 && /^[A-Z][a-z]+(\s[A-Z][a-z'.-]+)+$/.test(l)) || '';
  return { kind: 'career', roles, education: [], certs: [], skills: [], profile: { name, email, linkedin: linkedin ? 'https://www.' + linkedin.replace(/^www\./, '') : '' }, source: 'Simple parser; check every row' };
}

// ---------- tracker spreadsheet ----------
export const FIELDS: [string, string, RegExp][] = [
  ['date', 'Date', /date applied|applied|^date$|^when/i], ['company', 'Company', /company|employer|org/i], ['title', 'Job title', /^job$|title|role|position/i],
  ['status', 'Status / Response', /response|status|stage|outcome|result/i], ['offer', 'Offer?', /^offer/i], ['salary', 'Salary', /salary|pay|comp/i],
  ['link', 'Link', /link|url|posting/i], ['notes', 'Notes', /note|comment|remark/i],
];
export type Sheet = { rows: unknown[][]; links: Record<string, string> };
export type Tracker = { sheets: Record<string, Sheet>; current: string };

export async function readTracker(f: File): Promise<Tracker> {
  if (/\.(csv|tsv)$/i.test(f.name)) {
    const sheets = { [f.name]: { rows: parseCSV(await f.text(), /\.tsv$/i.test(f.name) ? '\t' : ','), links: {} } };
    return { sheets, current: f.name };
  }
  await loadScript(LIB.xlsx);
  const XLSX = w().XLSX;
  const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
  const sheets: Record<string, Sheet> = {};
  wb.SheetNames.forEach((sn: string) => {
    const ws = wb.Sheets[sn]; if (!ws['!ref']) return;
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const links: Record<string, string> = {};
    Object.keys(ws).forEach((addr) => { if (addr[0] === '!') return; const c = ws[addr]; if (c && c.l && c.l.Target) { const rc = XLSX.utils.decode_cell(addr); links[rc.r + ':' + rc.c] = c.l.Target; } });
    if (rows.some((r) => r.some((v) => v !== ''))) sheets[sn] = { rows, links };
  });
  const names = Object.keys(sheets);
  if (!names.length) throw new Error('No rows found in that workbook.');
  return { sheets, current: names[0] };
}

/** Find the header row and guess a column for each field. */
export function guessMapping(sheet: Sheet) {
  const { rows } = sheet; let hi = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const strs = rows[i].filter((v) => typeof v === 'string' && v.trim()) as string[];
    if (strs.length >= 2 && strs.some((h) => FIELDS.some((f) => f[2].test(h)))) { hi = i; break; }
  }
  const headers = rows[hi].map((h) => String(h).trim());
  const used = new Set<number>();
  const guess = (re: RegExp) => { const i = headers.findIndex((h, i) => !used.has(i) && !!h && re.test(h)); if (i >= 0) used.add(i); return i; };
  const map: Record<string, number> = {};
  FIELDS.forEach(([k, , re]) => (map[k] = guess(re)));
  return { hi, headers, map };
}

export function trackerEvents(sheet: Sheet, hi: number, m: Record<string, number>): EventsImport {
  const { rows, links } = sheet; const out: Ev[] = []; let skipped = 0;
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]; const get = (k: string) => (m[k] >= 0 ? row[m[k]] : '');
    const date = parseDate(get('date'));
    const company = String(get('company') || '').trim(), title = String(get('title') || '').trim();
    if (!date) { if (company || title) skipped++; continue; }
    if (!company && !title) continue;
    let link = String(get('link') || '').trim(); const lk = links[r + ':' + m.link]; if (lk) link = lk;
    if (link && !/^https?:\/\//i.test(link)) link = /\.[a-z]{2,}/i.test(link) ? 'https://' + link : '';
    let status = String(get('status') || '').trim(); const offer = String(get('offer') || '').trim();
    if (offer && /^(y|yes|true|offer)/i.test(offer)) status = 'Offer';
    const ev: Ev = { id: uid(), date, type: 'application', company, title, salary: String(get('salary') || '').trim(), link, notes: String(get('notes') || '').trim() };
    if (status) ev.status = status;
    out.push(ev);
  }
  return { kind: 'events', events: out, skipped, ok: m.date >= 0 && (m.company >= 0 || m.title >= 0), source: 'Tracker' };
}
