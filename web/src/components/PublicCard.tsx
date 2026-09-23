'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { State } from '@/lib/types';
import { careerStats, roles, skillTally, status } from '@/lib/derived';
import { layoutDeck } from '@/lib/deck';
import { FreeCard, RoleCard } from './Cards';
import { FocusView } from './Focus';
import { ThemeToggle } from './ThemeToggle';
import { Flag, SiteFoot } from './Landing';

/** The shareable page: cards you can flip, then the resume rows. Read-only, no job hunt. */
export function PublicCard({ S }: { S: State }) {
  const p = S.profile, rs = roles(S), cs = careerStats(S), st = status(S), skills = skillTally(S);
  const shelf = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const layout = useCallback(() => { if (shelf.current) layoutDeck(shelf.current, host.current, { ghost: false }); }, []);
  useLayoutEffect(layout);
  useEffect(() => { const el = shelf.current; if (!el || !('ResizeObserver' in window)) return; const ro = new ResizeObserver(layout); ro.observe(el); return () => ro.disconnect(); }, [layout]);
  const flip = (id: string) => { setTouched(true); setFocusId(id); };
  const stat = ([n, k]: [number, string]) => <span key={k}><b>{n}</b>{k}{n === 1 ? '' : 's'}</span>;

  return (
    <div className="pub" ref={host}>
      <header className="lbar">
        <a className="wordmark" href="/"><Flag /><span>CareerCards</span></a>
        <nav>
          <ThemeToggle />
          <a className="btn primary" href="/">Make your own pack</a>
        </nav>
      </header>
      <div className="brand mast">
        <div>
          <div className="namerow">
            <h1>{p.name || 'Career'}</h1>
            {st.free && <span className="pill"><Flag size={14} />Free agent · open to offers</span>}
          </div>
          <div className="sub">{[p.headline, p.location].filter(Boolean).join(' · ')}</div>
          {cs && <div className="line">{([[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']] as [number, string][]).map(stat)}</div>}
        </div>
      </div>
      <div className="shelf" ref={shelf}>
        {rs.map((r, i) => <div key={r.id} className="slot"><RoleCard S={S} r={r} idx={i} total={rs.length} onClick={() => flip(r.id)} /></div>)}
        {st.free && <div className="slot"><FreeCard S={S} share onClick={() => flip('free')} /></div>}
      </div>
      <div className={'flipme' + (touched ? ' off' : '')} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3" /><path d="M18.5 2v4h-4" /><path d="M21 12a9 9 0 0 1-15.5 6.3" /><path d="M5.5 22v-4h4" /></svg>
        Tap a card to flip it over
      </div>
      <div className="fold">
        {(p.summary || skills.length > 0) && <section className="row"><h2>Scouting report</h2><div className="body">{p.summary && <p>{p.summary}</p>}{skills.length > 0 && <div className="tiles">{skills.map(([k]) => <span key={k}>{k}</span>)}</div>}</div></section>}
        {p.education.length > 0 && <section className="row"><h2>Farm system</h2><div className="body"><ul className="list">{p.education.map((e, i) => <li key={i}><span>{e.school}{e.degree ? ' · ' + e.degree : ''}</span><span className="m">{e.years}</span></li>)}</ul></div></section>}
        {p.certs.length > 0 && <section className="row"><h2>Award inserts</h2><div className="body"><ul className="list">{p.certs.map((c, i) => <li key={i}><span>{c.name}{c.issuer ? ' · ' + c.issuer : ''}</span><span className="m">{c.year}</span></li>)}</ul></div></section>}
        {(p.email || p.linkedin) && <section className="row"><h2>Contact</h2><div className="body"><ul className="list inline">{p.email && <li><a href={'mailto:' + p.email}>{p.email}</a></li>}{p.linkedin && <li><a href={p.linkedin} target={p.linkedin === '#' ? undefined : '_blank'} rel="noopener" title={p.linkedin === '#' ? 'Example only' : undefined} onClick={p.linkedin === '#' ? (e) => e.preventDefault() : undefined}>LinkedIn</a></li>}</ul></div></section>}
      </div>
      <SiteFoot signInHref="/login" />
      {focusId && <FocusView S={S} id={focusId} share onClose={() => setFocusId(null)} />}
    </div>
  );
}
