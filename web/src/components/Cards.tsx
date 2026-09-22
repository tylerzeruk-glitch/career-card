'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Profile, Role, State } from '@/lib/types';
import { dur, fmt, fmtMonth, monthIndex, monthsBetween, nowYM, pad, yearOf, yrs } from '@/lib/dates';
import { codeFor, huntStats, initials, pairFor, runs, status, teamSize, type Run } from '@/lib/derived';

type Vars = CSSProperties & { '--a'?: string; '--b'?: string };
const vars = (a: string, b: string): Vars => ({ '--a': a, '--b': b });

/** The highlights list: scrolls inside the card, with a nudge at the bottom while there is more below. */
function Bullets({ items }: { items: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  const check = useCallback(() => { const el = ref.current; if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2); }, []);
  useEffect(() => { check(); const el = ref.current; if (!el || !('ResizeObserver' in window)) return; const ro = new ResizeObserver(check); ro.observe(el); return () => ro.disconnect(); }, [check, items]);
  return <div className={'bulwrap' + (more ? ' has-more' : '')}><ul className="bul" ref={ref} onScroll={check}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul><span className="more" aria-hidden="true" /></div>;
}

/** One role, front and back. `on` shows the back. */
export function RoleCard({ S, r, idx, total, on, className, onClick }: { S: State; r: Role; idx: number; total: number; on?: boolean; className?: string; onClick?: () => void }) {
  const [a, b] = pairFor(S, r.company);
  const p: Profile = S.profile;
  const run = runs(S).find((x) => x.roles.some((z) => z.id === r.id));
  const seasons = run ? run.roles : [r];
  const bullets = r.bullets || [], skills = (r.skills || []).slice(0, 8);
  return (
    <div className={'card' + (on ? ' on' : '') + (className ? ' ' + className : '')} style={vars(a, b)} data-id={r.id} tabIndex={0} role="button" aria-label={r.company + ', ' + r.title} onClick={onClick}>
      <div className="inner">
        <div className="face front">
          <div className="team" style={{ fontSize: teamSize(r.company) + 'cqw' }}>{r.company}</div>
          <span className="num">{pad(idx + 1)}</span>
          <div className="art"><span className="mono">{initials(p.name) || '?'}</span><span className="badge">{r.code || codeFor(r.title)}</span></div>
          <div className="who">{p.name || 'Your name'}</div>
          <div className="role">{r.title} · {yearOf(r.start)} – {yearOf(r.end)}</div>
        </div>
        <div className="face back">
          <div className="hdr"><div className="t">{r.company}</div><div className="s">{r.title}{r.location ? ' · ' + r.location : ''}</div></div>
          <table>
            <colgroup><col className="c1" /><col /><col className="c3" /></colgroup>
            <thead><tr><th>Season</th><th>Position</th><th className="n">Years</th></tr></thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.id} className={s.id === r.id ? 'cur' : ''}>
                  <td>{yearOf(s.start).slice(2)}–{s.end ? yearOf(s.end).slice(2) : 'now'}</td><td>{s.title}</td><td className="n">{yrs(monthsBetween(s.start, s.end))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bullets.length ? <Bullets items={bullets} /> : <div className="bul" style={{ color: '#6b6559', fontStyle: 'italic' }}>No highlights yet.</div>}
          {skills.length ? <div className="skills">{skills.map((x, i) => <span key={i}>{x}</span>)}</div> : null}
          <div className="foot"><span>{r.reason || (r.end ? 'Ended ' + fmtMonth(r.end) : 'Current')}</span><span>{pad(idx + 1)} of {pad(total)}</span></div>
        </div>
      </div>
    </div>
  );
}

/** The free-agent card. `share` hides everything about the hunt. */
export function FreeCard({ S, on, share, className, onClick, onTimeline }: { S: State; on?: boolean; share?: boolean; className?: string; onClick?: () => void; onTimeline?: () => void }) {
  const p = S.profile, st = status(S), h = huntStats(S);
  const open = (p.targets || []).length ? p.targets.join(' · ') : p.headline || 'New role';
  const since = st.free ? st.since : null;
  return (
    <div className={'card free' + (on ? ' on' : '') + (className ? ' ' + className : '')} style={vars('#dc4432', '#1f2a44')} data-id="free" tabIndex={0} role="button" aria-label="Free agent" onClick={onClick}>
      <div className="inner">
        <div className="face front">
          <div className="team" style={{ fontSize: teamSize('Free agent') + 'cqw' }}>Free agent</div>
          <span className="num" title="Free agent">FA</span>
          <div className="art"><div className="k">Open to</div><div className="open">{open}</div></div>
          <div className="who">{p.name || 'Your name'}</div>
          <div className="role">{share ? 'Available now' : since ? 'Since ' + fmt(since) : 'Unsigned'}</div>
        </div>
        <div className="face back">
          <div className="hdr"><div className="t">Free agency</div><div className="s">{share ? 'Open to offers' : since ? 'since ' + fmt(since) : ''}</div></div>
          {share ? (
            <ul className="bul">{(p.targets || []).length ? p.targets.map((t, i) => <li key={i}>{t}</li>) : <li>Open to the right role.</li>}</ul>
          ) : (
            <>
              <div className="figs"><div><b>{h.apps}</b><small>Applied</small></div><div><b>{h.interviews}</b><small>Interviews</small></div><div><b>{h.offers}</b><small>Offers</small></div></div>
              <div className="figs"><div><b>{h.open}</b><small>Open</small></div><div><b>{h.denials}</b><small>Denied</small></div><div><b>{h.sinceLast == null ? '–' : h.sinceLast + 'd'}</b><small>Since last</small></div></div>
              <div className="bul" style={{ flex: 0 }}><b>Open to:</b> {open}</div>
              <div className="go" onClick={(e) => { e.stopPropagation(); onTimeline?.(); }}>Open the timeline</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The top card of a team stack. */
export function SummaryCard({ S, run, from, to }: { S: State; run: Run; from: number; to: number }) {
  const [a, b] = pairFor(S, run.company);
  const first = run.roles[0], last = run.roles[run.roles.length - 1];
  return (
    <div className="card summary top" style={vars(a, b)} tabIndex={0} role="button" aria-label={run.company + ' stack'}>
      <div className="inner">
        <div className="face front">
          <div className="team" style={{ fontSize: teamSize(run.company) + 'cqw' }}>{run.company}</div>
          <span className="num">{pad(from)}–{pad(to)}</span>
          <div className="art"><span className="mono">{run.roles.length}<small>{run.roles.length === 1 ? 'role' : 'roles'}</small></span><span className="badge">{last.code || codeFor(last.title)}</span></div>
          <div className="who">{S.profile.name || 'Your name'}</div>
          <div className="role">{yearOf(first.start)} – {yearOf(last.end)} · {dur(monthIndex(last.end || nowYM()) - monthIndex(first.start) + 1)}</div>
        </div>
        <div className="face back" />
      </div>
    </div>
  );
}

export function UnderCard({ S, company, which }: { S: State; company: string; which: 1 | 2 }) {
  const [a, b] = pairFor(S, company);
  return <div className={'card under' + which} style={vars(a, b)}><div className="inner"><div className="face front" /></div></div>;
}
