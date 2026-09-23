'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { State } from '@/lib/types';
import { careerStats, roles, skillTally, status } from '@/lib/derived';
import { layoutDeck } from '@/lib/deck';
import { FreeCard, RoleCard } from './Cards';
import { ThemeToggle } from './ThemeToggle';
import { Flag } from './Landing';

/** The shareable page: cards you can flip, then the resume rows. Read-only, no job hunt. */
export function PublicCard({ S }: { S: State }) {
  const p = S.profile, rs = roles(S), cs = careerStats(S), st = status(S), skills = skillTally(S);
  const shelf = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const layout = useCallback(() => { if (shelf.current) layoutDeck(shelf.current, host.current, { ghost: false }); }, []);
  useLayoutEffect(layout);
  useEffect(() => { const el = shelf.current; if (!el || !('ResizeObserver' in window)) return; const ro = new ResizeObserver(layout); ro.observe(el); return () => ro.disconnect(); }, [layout]);
  const flip = (id: string) => setFlipped((f) => ({ ...f, [id]: !f[id] }));
  const stat = ([n, k]: [number, string]) => <span key={k}><b>{n}</b>{k}{n === 1 ? '' : 's'}</span>;

  return (
    <div className="pub" ref={host}>
      <header className="mast">
        <div>
          <div className="namerow">
            <h1>{p.name || 'Career'}</h1>
            {st.free && <span className="pill"><Flag size={14} />Free agent · open to offers</span>}
          </div>
          <div className="sub">{[p.headline, p.location].filter(Boolean).join(' · ')}</div>
          {cs && <div className="line">{([[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']] as [number, string][]).map(stat)}</div>}
        </div>
        <ThemeToggle />
      </header>
      <div className="k">Career</div>
      <div className="shelf" ref={shelf}>
        {rs.map((r, i) => <div key={r.id} className="slot"><RoleCard S={S} r={r} idx={i} total={rs.length} on={!!flipped[r.id]} onClick={() => flip(r.id)} /></div>)}
        {st.free && <div className="slot"><FreeCard S={S} share on={!!flipped.free} onClick={() => flip('free')} /></div>}
      </div>
      <div className="hint">Hover to lift a card; click to flip it.</div>
      <div className="fold">
        {(p.summary || skills.length > 0) && <section className="row"><h2>Scouting report</h2><div className="body">{p.summary && <p>{p.summary}</p>}{skills.length > 0 && <div className="tiles">{skills.map(([k]) => <span key={k}>{k}</span>)}</div>}</div></section>}
        {p.education.length > 0 && <section className="row"><h2>Farm system</h2><div className="body"><ul className="list">{p.education.map((e, i) => <li key={i}><span>{e.school}{e.degree ? ' · ' + e.degree : ''}</span><span className="m">{e.years}</span></li>)}</ul></div></section>}
        {p.certs.length > 0 && <section className="row"><h2>Award inserts</h2><div className="body"><ul className="list">{p.certs.map((c, i) => <li key={i}><span>{c.name}{c.issuer ? ' · ' + c.issuer : ''}</span><span className="m">{c.year}</span></li>)}</ul></div></section>}
        {(p.email || p.linkedin) && <section className="row"><h2>Contact</h2><div className="body"><ul className="list inline">{p.email && <li><a href={'mailto:' + p.email}>{p.email}</a></li>}{p.linkedin && <li><a href={p.linkedin} target="_blank" rel="noopener">LinkedIn</a></li>}</ul></div></section>}
      </div>
      <div className="foot">Made with <a href="/">CareerCards</a>.</div>
    </div>
  );
}
