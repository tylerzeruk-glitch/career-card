'use client';
import { useEffect, useRef } from 'react';
import { useCard } from './store';
import { useUI, type TimelineApi } from './ui';
import type { Ev, State } from '@/lib/types';
import { MONTHS, dayNum, dur, fmt, fmtMonth, fmtShort, monthEndDay, monthsBetween, todayISO } from '@/lib/dates';
import { TYPES, norm, pairFor, roles, sortedEvents, status, statusOf } from '@/lib/derived';

const PAD = 28;
const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** Label widths, measured in the label's real face (uppercase condensed, tracked) so labels never collide; a rough guess on the server. */
let ctx: CanvasRenderingContext2D | null | undefined;
const COND = '"Barlow Condensed","Arial Narrow",sans-serif';
const textW = (s: string, size: number, weight = 700, track = 0.06) => {
  if (ctx === undefined) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (!ctx) return s.length * size * 0.58 + 6;
  ctx.font = `${weight} ${size}px ${COND}`;
  return ctx.measureText(s.toUpperCase()).width + Math.max(0, s.length - 1) * size * track + 6;
};

type View = { start: number; ppd: number; init: boolean };

/** The app's timeline: wired to the document, the drawer and the focus view. */
export function Timeline({ active }: { active: boolean }) {
  const { S } = useCard();
  const { openDrawer, openFocus, timeline, selectedId, setSelectedId } = useUI();
  return <TimelineView S={S} active={active} api={timeline} selectedId={selectedId} onEvent={(id) => { setSelectedId(id); openDrawer('event', { eventId: id }); }} onSpan={openFocus} />;
}

type Api = { current: TimelineApi | null };

/**
 * The pan/zoom timeline. The SVG is built as markup (it is a drawing, not a
 * form) and events are delegated from the container. `onEvent` / `onSpan`
 * take a click on an event or a role span; without them the timeline is a
 * read-only exhibit (the landing page).
 */
export function TimelineView({ S, active, api, selectedId = null, onEvent, onSpan }: { S: State; active: boolean; api?: Api; selectedId?: string | null; onEvent?: (id: string) => void; onSpan?: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ start: 0, ppd: 8, init: false });
  const stateRef = useRef(S); stateRef.current = S;
  const selRef = useRef(selectedId); selRef.current = selectedId;
  const raf = useRef(0);
  const drag = useRef({ dragging: false, moved: false });

  // ----- geometry -----
  const dataRange = (st: State) => {
    const days: number[] = [];
    roles(st).forEach((r) => { days.push(dayNum(r.start + '-01')); days.push(r.end ? monthEndDay(r.end) : dayNum(todayISO())); });
    sortedEvents(st).forEach((e) => days.push(dayNum(e.date)));
    days.push(dayNum(todayISO()));
    return { d0: Math.min(...days), d1: Math.max(...days) };
  };
  const innerW = () => Math.max(200, (host.current?.clientWidth || 800) - PAD * 2);
  const minPpd = () => { const r = dataRange(stateRef.current); return Math.max(0.03, innerW() / (r.d1 - r.d0 + 120)); };
  const clampView = () => {
    const v = view.current, r = dataRange(stateRef.current);
    v.ppd = Math.min(90, Math.max(minPpd(), v.ppd));
    const span = innerW() / v.ppd, lo = r.d0 - span * 0.85, hi = r.d1 - span * 0.15;
    v.start = Math.min(Math.max(v.start, lo), Math.max(lo, hi));
  };
  const fitRange = (d0: number, d1: number) => { const v = view.current, len = Math.max(7, d1 - d0); v.ppd = Math.min(90, innerW() / (len * 1.14)); v.start = d0 - len * 0.04; clampView(); };
  const fitCareer = () => { const r = dataRange(stateRef.current); fitRange(r.d0, r.d1); };
  /** The opening view: the last four months (ten weeks on a phone), today three quarters of the way across, so the hunt is what you see first. */
  const fitRecent = () => { const v = view.current, t = dayNum(todayISO()), days = innerW() < 480 ? 75 : 120; v.ppd = Math.min(90, Math.max(minPpd(), innerW() / days)); v.start = t - days * 0.76; clampView(); };
  const zoomFreeAgency = () => { const st = status(stateRef.current), t = dayNum(todayISO()); if (st.free && st.since) fitRange(dayNum(st.since) - 3, t + 3); else fitRange(t - 90, t + 7); schedule(); };
  const centerOn = (day: number) => { const v = view.current; v.start = day - innerW() / v.ppd / 2; clampView(); };
  const zoomAt = (f: number, px: number) => { const v = view.current; const day = v.start + (px - PAD) / v.ppd; v.ppd = Math.min(90, Math.max(minPpd(), v.ppd * f)); v.start = day - (px - PAD) / v.ppd; clampView(); };
  const schedule = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; render(); }); };

  // ----- drawing -----
  const render = () => {
    const el = host.current; if (!el || el.hidden) return;
    const st = stateRef.current, ev = sortedEvents(st), rs = roles(st);
    const old = el.querySelector('svg');
    if (!rs.length && !ev.length) { old?.remove(); return; }
    clampView();
    const v = view.current, W = el.clientWidth, H = el.clientHeight, X = (day: number) => PAD + (day - v.start) * v.ppd;
    const today = todayISO(), td = dayNum(today);
    // label tiers grow with the height: two at the minimum height, up to four on a tall view
    const baseY = Math.round(H * 0.62), TIER = 32, BASE_UP = 44, BASE_DN = 38;
    const upTiers = Math.max(2, Math.min(4, Math.floor((baseY - 70 - BASE_UP) / TIER))), dnTiers = Math.max(2, Math.min(4, Math.floor((H - baseY - 60 - BASE_DN) / TIER)));
    const visLo = v.start - 60 / v.ppd, visHi = v.start + (W - PAD) / v.ppd + 60 / v.ppd;
    const parts: string[] = ['<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(135)"><rect width="3" height="8" fill="rgba(220,68,50,.18)"/></pattern></defs>'];
    // axis
    const yearPx = 365 * v.ppd, monthPx = 30 * v.ppd;
    const firstMonth = new Date(Math.max(visLo, 0) * 86400000); firstMonth.setUTCDate(1); let firstLabel = true;
    for (let m = firstMonth; ; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
      const day = Math.round(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1) / 86400000); if (day > visHi) break;
      const x = X(day), isJan = m.getUTCMonth() === 0;
      if (monthPx >= 8 || isJan) parts.push(`<line x1="${x}" x2="${x}" y1="${baseY - (isJan ? 7 : 4)}" y2="${baseY + (isJan ? 7 : 4)}" stroke="var(--line)" stroke-width="${isJan ? 1.5 : 1}"/>`);
      const showLabel = monthPx >= 44 || (monthPx >= 15 && m.getUTCMonth() % 3 === 0) || (isJan && (yearPx >= 34 || m.getUTCFullYear() % 5 === 0));
      if (showLabel && x > -60) { const txt = monthPx >= 15 ? MONTHS[m.getUTCMonth()] + (firstLabel || isJan || monthPx < 44 ? ' ' + m.getUTCFullYear() : '') : String(m.getUTCFullYear()); parts.push(`<text class="month" x="${x + 5}" y="${baseY + 21}">${txt}</text>`); firstLabel = false; }
      if (v.ppd >= 12) for (let w = 7; w < 28; w += 7) { const wd = day + w; if (wd > visHi) break; parts.push(`<line x1="${X(wd)}" x2="${X(wd)}" y1="${baseY - 3}" y2="${baseY + 3}" stroke="var(--muted)" stroke-width="1"/>`); }
    }
    // free agency zone
    const s = status(st);
    if (s.free && s.since) { const x0 = X(dayNum(s.since)), x1 = X(td); parts.push(`<rect x="${x0}" y="14" width="${Math.max(0, x1 - x0)}" height="${H - 28}" fill="url(#hatch)"/><line x1="${x0}" x2="${x0}" y1="14" y2="${H - 14}" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="3 4"/>`); if (x1 - x0 > 70) parts.push(`<text class="lbl2" x="${x0 + 6}" y="26" style="fill:var(--red);font-weight:700;letter-spacing:.14em;text-transform:uppercase">Free agency</text>`); }
    parts.push(`<line x1="0" x2="${W}" y1="${baseY}" y2="${baseY}" stroke="var(--line)" stroke-width="1.5"/>`);
    if (td >= visLo && td <= visHi) { const tx = X(td); parts.push(`<line class="today" x1="${tx}" x2="${tx}" y1="34" y2="${H - 30}"/><text class="todaytxt" x="${tx}" y="26" text-anchor="middle">Today</text>`); }
    // spans in lanes
    const lanes: number[] = []; const spans: { role: State['roles'][0]; a: number; b: number; lane: number }[] = [];
    rs.forEach((role) => { const a = dayNum(role.start + '-01'), b = role.end ? monthEndDay(role.end) : td; let lane = 0; while (lanes[lane] != null && lanes[lane] > a) lane++; lanes[lane] = b; spans.push({ role, a, b, lane }); });
    const SPAN_H = 16, SPAN_TOP = v.ppd >= 0.6 ? baseY - BASE_UP - upTiers * TIER - 10 : baseY - 36;
    spans.forEach((sp) => {
      if (sp.b < visLo || sp.a > visHi) return;
      const x0 = X(sp.a), x1 = X(sp.b), y = SPAN_TOP - sp.lane * (SPAN_H + 4), [, b] = pairFor(st, sp.role.company), w = Math.max(2, x1 - x0);
      const label = `${sp.role.company} · ${sp.role.title}`; const show = w > textW(label, 11) + 8 ? label : w > textW(sp.role.company, 11) + 8 ? sp.role.company : '';
      parts.push(`<g class="sp" data-id="${sp.role.id}"><rect x="${x0}" y="${y}" width="${w}" height="${SPAN_H}" rx="3" fill="${b}"/>${show ? `<text class="span-lbl" x="${x0 + 6}" y="${y + 12}">${esc(show)}</text>` : ''}</g>`);
    });
    // events
    const byDay: Record<number, Ev[]> = {}; ev.forEach((e) => { const d = dayNum(e.date); if (d >= visLo - 30 && d <= visHi + 30) (byDay[d] ||= []).push(e); });
    const placed: { e: Ev; x: number }[] = [];
    Object.keys(byDay).forEach((d) => { const list = byDay[+d], n = list.length; list.forEach((e, i) => placed.push({ e, x: X(+d) + (n > 1 ? (i - (n - 1) / 2) * Math.min(7, Math.max(3, v.ppd * 0.7)) : 0) })); });
    placed.sort((a, b) => a.x - b.x);
    const occ = { up: Array.from({ length: upTiers }, () => -1e9), dn: Array.from({ length: dnTiers }, () => -1e9) }; const out: string[] = [];
    placed.forEach((p) => {
      const e = p.e, t = TYPES[e.type] || TYPES.milestone, up = t.dir > 0, isMs = e.type === 'layoff' || e.type === 'milestone';
      const l1 = isMs ? e.title || t.label : e.company || e.title || t.label; const l2 = isMs ? '' : e.type === 'application' ? e.title || '' : t.label;
      const w = Math.max(textW(l1, isMs ? 12.5 : 12, 700, isMs ? 0.08 : 0.06), l2 ? textW(l2, 10.5, 600, 0.08) : 0); const tiers = up ? occ.up : occ.dn; let tier = -1;
      for (let i = 0; i < tiers.length; i++) if (tiers[i] < p.x - w / 2 - 8) { tier = i; break; }
      const showLabel = tier >= 0 && v.ppd > 0.6; if (tier < 0) tier = 0; else tiers[tier] = p.x + w / 2;
      const len = (up ? BASE_UP : BASE_DN) + tier * TIER + (e.type === 'layoff' ? TIER * 0.4 : 0); const yEnd = up ? baseY - len : baseY + len; const col = `var(${t.color})`;
      const hot = selRef.current === e.id;
      let head = '';
      if (e.type === 'interview') head = `<circle cx="${p.x}" cy="${yEnd}" r="4" fill="var(--paper)" stroke="${col}" stroke-width="2"/>`;
      else if (e.type === 'offer') head = `<path d="M${p.x} ${yEnd - 5.5} l5.5 5.5 l-5.5 5.5 l-5.5 -5.5z" fill="${col}"/>`;
      else if (e.type === 'layoff') head = `<path d="M${p.x} ${yEnd} l13 4.5 l-13 4.5z" fill="${col}"/>`;
      else head = `<circle cx="${p.x}" cy="${yEnd}" r="3" fill="${col}"/>`;
      let text = '';
      if (showLabel) { const lx = p.x, cls = 'lbl' + (isMs ? ' ms' : ''); if (up) { const y = yEnd - 9; text = l2 ? `<text class="${cls}" x="${lx}" y="${y - 13}" text-anchor="middle">${esc(l1)}</text><text class="lbl2" x="${lx}" y="${y}" text-anchor="middle">${esc(l2)}</text>` : `<text class="${cls}" x="${lx}" y="${y}" text-anchor="middle">${esc(l1)}</text>`; } else { const y = yEnd + 16; text = `<text class="${cls}" x="${lx}" y="${y}" text-anchor="middle">${esc(l1)}</text>` + (l2 ? `<text class="lbl2" x="${lx}" y="${y + 13}" text-anchor="middle">${esc(l2)}</text>` : ''); } }
      out.push(`<g class="ev${hot ? ' hot' : ''}" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(fmt(e.date) + ' ' + t.label + ' ' + l1)}"><line class="tick" x1="${p.x}" x2="${p.x}" y1="${baseY}" y2="${yEnd}" stroke="${col}" stroke-width="${e.type === 'layoff' ? 3 : 2}" stroke-linecap="round"/>${head}${text}<rect class="hit" x="${p.x - 9}" y="${Math.min(baseY, yEnd) - 6}" width="18" height="${Math.abs(baseY - yEnd) + 12}"/></g>`);
    });
    const markup = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Career timeline">${parts.join('')}${out.join('')}</svg>`;
    if (old) old.outerHTML = markup; else el.insertAdjacentHTML('afterbegin', markup);
  };

  // ----- tooltip -----
  const moveTip = (ev: { clientX: number; clientY: number }) => { const t = tip.current; if (!t) return; const x = Math.min(ev.clientX + 14, window.innerWidth - 300), y = ev.clientY + 16; t.style.left = x + 'px'; t.style.top = (y + 120 > window.innerHeight ? ev.clientY - t.offsetHeight - 12 : y) + 'px'; };
  const hideTip = () => { if (tip.current) tip.current.hidden = true; };
  const showTip = (id: string, ev: { clientX: number; clientY: number }) => {
    const st = stateRef.current, e = st.events.find((x) => x.id === id); const t = tip.current; if (!e || !t) return;
    const ty = TYPES[e.type];
    let body = `<div class="m">${fmt(e.date)} · ${ty.label}</div><b>${esc(e.company || e.title || ty.label)}</b>`; if (e.company && e.title) body += `<div>${esc(e.title)}</div>`;
    if (e.type === 'application') { const s = statusOf(st, e); body += `<div class="m">Status: ${esc(s.label)}${s.from ? ' (' + fmtShort(s.from.date) + ')' : ''}</div>`; }
    if (e.salary) body += `<div class="m">${esc(e.salary)}</div>`; if (e.notes) body += `<div style="margin-top:4px">${esc(e.notes)}</div>`;
    const s = status(st); if (s.free && s.since && e.type !== 'layoff') body += `<div class="m">Day ${dayNum(e.date) - dayNum(s.since)} of free agency</div>`;
    t.innerHTML = body; t.hidden = false; moveTip(ev);
  };
  const showSpanTip = (id: string, ev: { clientX: number; clientY: number }) => {
    const r = stateRef.current.roles.find((x) => x.id === id); const t = tip.current; if (!r || !t) return;
    t.innerHTML = `<div class="m">${fmtMonth(r.start)} – ${fmtMonth(r.end)} · ${dur(monthsBetween(r.start, r.end))}</div><b>${esc(r.company)}</b><div>${esc(r.title)}</div>${r.reason ? `<div class="m">${esc(r.reason)}</div>` : ''}`;
    t.hidden = false; moveTip(ev);
  };

  // ----- wiring -----
  useEffect(() => { if (!api) return; api.current = { fitCareer: () => { fitCareer(); schedule(); }, zoomFreeAgency }; return () => { api.current = null; }; }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) { if (!view.current.init) { fitRecent(); view.current.init = true; } schedule(); } }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = host.current; if (!el) return;
    const pts = new Map<number, { x: number; y: number }>(); let lastX = 0, pinchDist = 0, pinchMid = 0;
    const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('.overlay')) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture(e.pointerId); if (pts.size === 1) { drag.current.dragging = true; drag.current.moved = false; lastX = e.clientX; el.classList.add('drag'); hideTip(); } if (pts.size === 2) { const [a, b] = [...pts.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); pinchMid = (a.x + b.x) / 2; } };
    const onMove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) { const g = (e.target as HTMLElement).closest<HTMLElement>('.ev,.sp'); if (g && !drag.current.dragging) { if (g.classList.contains('ev')) showTip(g.dataset.id!, e); else showSpanTip(g.dataset.id!, e); } else if (!g) hideTip(); return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const r = el.getBoundingClientRect();
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mid = (a.x + b.x) / 2; if (pinchDist > 0) { zoomAt(d / pinchDist, mid - r.left); view.current.start -= (mid - pinchMid) / view.current.ppd; } pinchDist = d; pinchMid = mid; drag.current.moved = true; schedule(); return; }
      if (!drag.current.dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; if (dx) { if (Math.abs(dx) > 2) drag.current.moved = true; view.current.start -= dx / view.current.ppd; schedule(); }
    };
    const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinchDist = 0; if (pts.size === 0) { drag.current.dragging = false; el.classList.remove('drag'); setTimeout(() => { drag.current.moved = false; }, 0); } };
    const onWheel = (e: WheelEvent) => { const r = el.getBoundingClientRect(); if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left); schedule(); return; } const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0); if (dx) { e.preventDefault(); view.current.start += dx / view.current.ppd; schedule(); } };
    const onDbl = (e: MouseEvent) => { const r = el.getBoundingClientRect(); zoomAt(1.6, e.clientX - r.left); schedule(); };
    const onKey = (e: KeyboardEvent) => { if (e.target !== el) return; if (e.key === 'ArrowLeft') { view.current.start -= 40 / view.current.ppd; schedule(); } if (e.key === 'ArrowRight') { view.current.start += 40 / view.current.ppd; schedule(); } if (e.key === '+' || e.key === '=') { zoomAt(1.4, el.clientWidth / 2); schedule(); } if (e.key === '-') { zoomAt(1 / 1.4, el.clientWidth / 2); schedule(); } };
    const onClick = (e: MouseEvent) => { if (drag.current.moved) return; const g = (e.target as HTMLElement).closest<HTMLElement>('.ev,.sp'); if (!g) return; if (g.classList.contains('ev')) { if (onEvent) { hideTip(); onEvent(g.dataset.id!); } } else if (onSpan) { hideTip(); onSpan(g.dataset.id!); } };
    const onLeave = () => hideTip();
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false }); el.addEventListener('dblclick', onDbl); el.addEventListener('keydown', onKey); el.addEventListener('click', onClick); el.addEventListener('pointerleave', onLeave);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => schedule()) : null; ro?.observe(el);
    return () => { el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel); el.removeEventListener('dblclick', onDbl); el.removeEventListener('keydown', onKey); el.removeEventListener('click', onClick); el.removeEventListener('pointerleave', onLeave); ro?.disconnect(); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="tl" id="tl" ref={host} tabIndex={0} aria-label="Career timeline" hidden={!active}>
        <div className="overlay legend">
          <span><i className="bar" style={{ background: 'var(--navy)' }} />Team</span>
          <span><i className="bar" style={{ background: 'repeating-linear-gradient(135deg,rgba(220,68,50,.35) 0 3px,transparent 3px 6px)' }} />Free agency</span>
          <span><i style={{ background: 'var(--c-app)' }} />Application</span>
          <span><i style={{ background: 'var(--c-int)' }} />Interview</span>
          <span><i style={{ background: 'var(--c-off)' }} />Offer</span>
          <span><i className="down" style={{ background: 'var(--c-den)' }} />Denial</span>
        </div>
        <div className="overlay zoom">
          <button className="btn sm" onClick={() => { fitRecent(); schedule(); }}>Recent</button>
          <button className="btn sm" onClick={zoomFreeAgency}>Free agency</button>
          <button className="btn sm" onClick={() => { fitCareer(); schedule(); }}>Career</button>
          <button className="btn icon" title="Zoom out" onClick={() => { zoomAt(1 / 1.4, (host.current?.clientWidth || 800) / 2); schedule(); }}>−</button>
          <button className="btn icon" title="Zoom in" onClick={() => { zoomAt(1.4, (host.current?.clientWidth || 800) / 2); schedule(); }}>+</button>
          <button className="btn sm" onClick={() => { centerOn(dayNum(todayISO())); schedule(); }}>Today</button>
        </div>
      </div>
      <div className="tip" ref={tip} hidden />
    </>
  );
}
