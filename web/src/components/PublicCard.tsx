'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { State } from '@/lib/types';
import { careerStats, roles, skillTally, status } from '@/lib/derived';
import { layoutDeck } from '@/lib/deck';
import { FreeCard, RoleCard } from './Cards';
import { ShelfDots } from './ShelfDots';
import { FocusView } from './Focus';
import { ThemeToggle } from './ThemeToggle';
import { Flag, SiteFoot } from './Landing';

/** The download button fetches the PDF itself, so it can say what is happening while the server sets the sheet (a second or two), then hands the file to the browser. */
function ResumeButton({ href, name }: { href: string; name: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const go = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (state === 'busy') { e.preventDefault(); return; }
    if (!('fetch' in window) || !('URL' in window)) return; // the plain link does the job
    e.preventDefault();
    setState('busy');
    try {
      const r = await fetch(href, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const m = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') || '');
      const file = m ? m[1] : (name || 'career').trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') + '-resume.pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setState('done'); setTimeout(() => setState('idle'), 4000);
    } catch { setState('error'); setTimeout(() => setState('idle'), 5000); }
  };
  return (
    <a className={'btn outline dl' + (state === 'busy' ? ' busy' : '')} href={href} download onClick={go} aria-live="polite" aria-busy={state === 'busy'}>
      {state === 'busy' ? <><span className="ring" aria-hidden="true" />Preparing your resume…</>
        : state === 'done' ? <><CheckIcon />Downloaded</>
        : state === 'error' ? <><DownloadIcon />Couldn\u2019t build it. Try again</>
        : <><DownloadIcon />Download as a resume (PDF)</>}
    </a>
  );
}

const CheckIcon = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>;
const DownloadIcon = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>;

/** The shareable page: cards you can flip, then the resume rows. Read-only, no job hunt. */
/** `resumeHref` overrides where the download goes (the single-file preview points it at the site). */
export function PublicCard({ S, slug, resumeHref }: { S: State; slug: string; resumeHref?: string }) {
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
      <ShelfDots shelf={shelf} count={rs.length + (st.free ? 1 : 0)} />
      <div className={'flipme' + (touched ? ' off' : '')} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3" /><path d="M18.5 2v4h-4" /><path d="M21 12a9 9 0 0 1-15.5 6.3" /><path d="M5.5 22v-4h4" /></svg>
        Tap a card to flip it over
      </div>
      <div className="fold">
        {(p.summary || skills.length > 0) && <section className="row"><h2>Scouting report</h2><div className="body">{p.summary && <p>{p.summary}</p>}{skills.length > 0 && <div className="tiles">{skills.map(([k]) => <span key={k}>{k}</span>)}</div>}</div></section>}
        {p.education.length > 0 && <section className="row"><h2>Farm system</h2><div className="body"><ul className="list">{p.education.map((e, i) => <li key={i}><span>{e.school}{e.degree ? ' · ' + e.degree : ''}</span><span className="m">{e.years}</span></li>)}</ul></div></section>}
        {p.certs.length > 0 && <section className="row"><h2>Award inserts</h2><div className="body"><ul className="list">{p.certs.map((c, i) => <li key={i}><span>{c.name}{c.issuer ? ' · ' + c.issuer : ''}</span><span className="m">{c.year}</span></li>)}</ul></div></section>}
        <section className="row"><h2>Stat sheet</h2><div className="body"><ResumeButton href={resumeHref || '/u/' + slug + '/resume'} name={p.name} /><span className="hint">The same rows as this page, on one sheet.</span></div></section>
        {(p.email || p.linkedin) && <section className="row"><h2>Contact</h2><div className="body"><ul className="list inline">{p.email && <li><a href={'mailto:' + p.email}>{p.email}</a></li>}{p.linkedin && <li><a href={p.linkedin} target={p.linkedin === '#' ? undefined : '_blank'} rel="noopener" title={p.linkedin === '#' ? 'Example only' : undefined} onClick={p.linkedin === '#' ? (e) => e.preventDefault() : undefined}>LinkedIn</a></li>}</ul></div></section>}
      </div>
      <SiteFoot signInHref="/login" contact={false} />
      {focusId && <FocusView S={S} id={focusId} share onClose={() => setFocusId(null)} />}
    </div>
  );
}
