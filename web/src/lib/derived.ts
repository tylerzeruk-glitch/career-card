import type { Ev, EventType, Role, State } from './types';
import { dayNum, isoFromDay, monthEndDay, monthIndex, nowYM, todayISO } from './dates';

export const TYPES: Record<EventType, { label: string; dir: 1 | -1; color: string }> = {
  layoff: { label: 'Layoff', dir: 1, color: '--c-ms' },
  milestone: { label: 'Milestone', dir: 1, color: '--c-ms' },
  application: { label: 'Application', dir: 1, color: '--c-app' },
  interview: { label: 'Interview', dir: 1, color: '--c-int' },
  offer: { label: 'Offer', dir: 1, color: '--c-off' },
  denial: { label: 'Denial', dir: -1, color: '--c-den' },
  withdrawn: { label: 'Withdrawn', dir: -1, color: '--c-wd' },
};
export const STATUS_LABEL: Record<string, string> = {
  application: 'Applied',
  interview: 'Interviewing',
  offer: 'Offer',
  denial: 'Denied',
  withdrawn: 'Withdrawn',
};
/** Team colour pairs: [art, ink]. Validated for contrast in both themes. */
export const PAIRS: [string, string][] = [
  ['#e8a13a', '#1f2a44'], ['#f4c7a1', '#7a2e1f'], ['#9fd0c7', '#0f4c45'], ['#f6b8c8', '#4a1942'], ['#c9d7f2', '#1b3a6b'],
  ['#f5e08a', '#3b3b2f'], ['#f0a58f', '#1c1b18'], ['#bfe0e3', '#254e70'], ['#d7c4f0', '#3a2a6b'], ['#cde3a5', '#2f5d2a'],
];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase();
export const initials = (s: string | null | undefined) =>
  (s || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
export const codeFor = (title: string | null | undefined) => {
  const w = (title || '').replace(/[^A-Za-z ]/g, '').split(/\s+/).filter((x) => x && !/^(of|and|the|for|to|a|an|in|at)$/i.test(x));
  return (w.length >= 2 ? w.map((x) => x[0]).join('') : (w[0] || '').slice(0, 3)).slice(0, 3).toUpperCase();
};
export const teamSize = (name: string | null | undefined) =>
  Math.max(7, Math.min(15, Math.floor(105 / Math.max(4, (name || '').length))));

export function hashIdx(s: string) {
  let h = 0;
  for (const c of norm(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % PAIRS.length;
}
export function pairIndexFor(S: Pick<State, 'brand'>, company: string): number {
  const k = norm(company);
  const i = S.brand[k] != null ? S.brand[k] : hashIdx(k);
  return PAIRS[i] ? i : 0;
}
export function pairFor(S: Pick<State, 'brand'>, company: string): [string, string] {
  return PAIRS[pairIndexFor(S, company)];
}

export const blank = (): State => ({
  profile: { name: '', headline: '', location: '', summary: '', targets: [], email: '', linkedin: '', education: [], certs: [], skills: [] },
  roles: [],
  events: [],
  brand: {},
  settings: { group: 'role', view: 'cards' },
});

/** Merge a loaded document over a blank one so old saves keep working. */
export function hydrate(o: Partial<State> | null | undefined): State {
  const b = blank();
  if (!o || !Array.isArray(o.roles)) return b;
  return {
    ...b,
    ...o,
    profile: { ...b.profile, ...(o.profile || {}) },
    settings: { ...b.settings, ...(o.settings || {}) },
    brand: o.brand || {},
    events: Array.isArray(o.events) ? o.events : [],
  };
}

export const roles = (S: State) => S.roles.slice().sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
export const sortedEvents = (S: State) => S.events.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export function layoffDate(S: State) {
  const l = S.events.filter((e) => e.type === 'layoff').sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  return l ? l.date : null;
}

export type Status =
  | { free: false; current: Role }
  | { free: true; since: string | null; days: number | null; last?: Role };

export function status(S: State): Status {
  const rs = roles(S);
  const cur = rs.filter((r) => !r.end);
  if (cur.length) return { free: false, current: cur[cur.length - 1] };
  if (!rs.length) return { free: true, since: layoffDate(S), days: null };
  const lo = layoffDate(S);
  const last = rs[rs.length - 1];
  const since = lo || isoFromDay(monthEndDay(last.end!));
  return { free: true, since, days: dayNum(todayISO()) - dayNum(since), last };
}

export type Run = { company: string; roles: Role[] };
/** Consecutive roles at the same company. */
export function runs(S: State): Run[] {
  const out: Run[] = [];
  roles(S).forEach((r) => {
    const last = out[out.length - 1];
    if (last && norm(last.company) === norm(r.company)) last.roles.push(r);
    else out.push({ company: r.company, roles: [r] });
  });
  return out;
}

export function careerStats(S: State) {
  const rs = roles(S);
  if (!rs.length) return null;
  const months = new Set<number>();
  rs.forEach((r) => {
    const a = monthIndex(r.start), b = monthIndex(r.end || nowYM());
    for (let m = a; m <= b; m++) months.add(m);
  });
  const companies = new Set(rs.map((r) => norm(r.company)));
  const tenures = runs(S).map((x) => ({
    company: x.company,
    months: monthIndex(x.roles[x.roles.length - 1].end || nowYM()) - monthIndex(x.roles[0].start) + 1,
  }));
  const longest = tenures.sort((a, b) => b.months - a.months)[0];
  return { seasons: Math.round(months.size / 12), teams: companies.size, positions: rs.length, longest };
}

export type AppStatus = { key: string; label: string; from?: Ev | null; needs?: boolean };
/** Where an application stands, from the events that followed it (or its imported status text). */
export function statusOf(S: State, app: Ev): AppStatus {
  const co = norm(app.company);
  if (!co) return { key: 'application', label: 'Applied', from: null };
  const sameCo = S.events.filter((e) => e.type === 'application' && norm(e.company) === co);
  const matchTitle = sameCo.length > 1;
  const follow = S.events
    .filter(
      (e) =>
        e.id !== app.id &&
        !['application', 'layoff', 'milestone'].includes(e.type) &&
        norm(e.company) === co &&
        (!matchTitle || norm(e.title) === norm(app.title) || !e.title) &&
        e.date >= app.date,
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (follow.length) {
    const f = follow[0];
    return { key: f.type, label: STATUS_LABEL[f.type], from: f };
  }
  const s = norm(app.status);
  if (s) {
    if (/deni|reject|closed|no /.test(s)) return { key: 'denial', label: 'Denied', needs: true };
    if (/interview|screen|phone/.test(s)) return { key: 'interview', label: 'Interviewing', needs: true };
    if (/offer/.test(s) && !/no offer/.test(s)) return { key: 'offer', label: 'Offer', needs: true };
    if (/withdr/.test(s)) return { key: 'withdrawn', label: 'Withdrawn', needs: true };
    return { key: 'application', label: app.status! };
  }
  return { key: 'application', label: 'Applied' };
}

export function huntStats(S: State) {
  const apps = S.events.filter((e) => e.type === 'application');
  const sts = apps.map((a) => statusOf(S, a));
  const count = (k: string) => sts.filter((s) => s.key === k).length;
  const last = sortedEvents(S).filter((e) => e.date <= todayISO()).pop();
  return {
    apps: apps.length,
    open: apps.length - count('denial') - count('withdrawn'),
    interviews: S.events.filter((e) => e.type === 'interview').length,
    active: count('interview'),
    offers: S.events.filter((e) => e.type === 'offer').length,
    denials: count('denial'),
    responded: sts.filter((s) => s.key !== 'application').length,
    sinceLast: last ? dayNum(todayISO()) - dayNum(last.date) : null,
  };
}

/** Skills across all roles, most repeated first. */
export function skillTally(S: State, limit = 18): [string, number][] {
  // an explicit list on the profile wins; otherwise tally what the roles say
  const own = (S.profile.skills || []).map((s) => s.trim()).filter(Boolean);
  if (own.length) return own.map((s) => [s, 1]);
  const c: Record<string, number> = {};
  S.roles.forEach((r) => (r.skills || []).forEach((s) => { const k = s.trim(); if (k) c[k] = (c[k] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** A slug for the public URL, from a name. */
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Everything a public page may show: the career without the job hunt. */
export function careerOnly(S: State) {
  const { profile, roles: rs, brand } = S;
  return { profile, roles: rs, brand };
}
