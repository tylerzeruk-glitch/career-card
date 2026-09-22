'use client';
import { useEffect, useState } from 'react';
import type { State } from '@/lib/types';
import { sampleState } from '@/lib/sample';
import { loadLocal } from '@/lib/storage';
import { FreeCard, RoleCard } from './Cards';

/** The red pennant, same path as the favicon. */
export function Flag({ size = 22 }: { size?: number }) {
  return (
    <svg className="flag" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M9.97 11.67 L12.69 22.18 L14.24 35.35 L19.68 32.04 L25.34 30.42 L29.54 30.27 L36.89 31.08 L41.38 30.20 L49.98 26.74 L60.50 21.08 L51.31 20.56 L41.38 18.80 L35.05 16.52 L26.15 12.18 L20.27 10.49 L14.83 10.27 Z M5.93 5.41 L3.94 6.59 L3.43 8.87 L5.05 10.78 L13.58 57.34 L14.31 58.37 L15.49 58.51 L16.45 57.92 L16.74 56.38 L8.28 10.64 L9.16 7.33 L7.91 5.71 Z" fill="currentColor" fillRule="nonzero" />
    </svg>
  );
}

/** The example career with fixed ids, so the server and the browser render the same cards. */
function heroState(): State {
  const s = sampleState();
  s.roles.forEach((r, i) => (r.id = 'hero-role-' + i));
  s.events.forEach((e, i) => (e.id = 'hero-ev-' + i));
  return s;
}

const STEPS = [
  { n: '01', h: 'Import', p: 'Drop in a resume PDF or a LinkedIn export. Claude reads it and deals the cards. You fix whatever it got wrong.' },
  { n: '02', h: 'Detail', p: 'Pick team colors, write the highlights, say how each season ended. Group the deck by role or by team.' },
  { n: '03', h: 'Share', p: 'Turn on your page at careercards.app/u/you. Only the career goes out. The job hunt stays with you.' },
];

const GLOSSARY: [string, string][] = [
  ['Season', 'one role at one team'],
  ['Scouting report', 'your summary and skills'],
  ['Farm system', 'where you studied'],
  ['Award inserts', 'certifications and honors'],
  ['Free agency', 'the job hunt, only visible to you'],
];

/**
 * The front door for a visitor who is not signed in. `onTry` swaps in for the
 * link when the page runs without a server (the single-file preview).
 */
export function Landing({ tryHref = '/app', signInHref = '/login', onTry }: { tryHref?: string; signInHref?: string; onTry?: () => void }) {
  const [S] = useState(heroState);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [resume, setResume] = useState(false);
  useEffect(() => { const l = loadLocal(); setResume(!!l && !l.sample && (l.state.roles.length > 0 || !!l.state.profile.name)); }, []);
  const flip = (id: string) => setFlipped((f) => ({ ...f, [id]: !f[id] }));
  const tryProps = onTry ? { href: tryHref, onClick: (e: React.MouseEvent) => { e.preventDefault(); onTry(); } } : { href: tryHref };
  const hand = [S.roles[0], S.roles[2]]; // Marine Biologist at Acme, Latex Salesman at Vandelay

  return (
    <div className="landing">
      <header className="lbar">
        <a className="wordmark" href="/"><Flag /><span>CareerCards</span></a>
        <nav>
          <a className="btn" {...tryProps}>Try it</a>
          <a className="btn primary" href={signInHref}>Sign in</a>
        </nav>
      </header>

      <section className="hero">
        <div className="copy">
          <div className="eyebrow">The resume, reissued as a card set</div>
          <h1>Every role you&apos;ve played, on its own card.</h1>
          <p>Your career as a deck of cards. Team and position on the front. Seasons, highlights and skills on the back. Shareable at an address of your own.</p>
          <div className="cta">
            <a className="btn primary lg" href={signInHref}>Make your deck</a>
            <a className="btn lg" {...tryProps}>Try it with an example</a>
          </div>
          <div className="fine">
            Free. No account needed to try. Sign in to keep your card across devices and give it a page.
            {resume && <> <a {...tryProps}>Continue with the card on this device →</a></>}
          </div>
        </div>
        <div className="hand" aria-label="Example cards. Click one to flip it.">
          {hand.map((r, i) => <RoleCard key={r.id} S={S} r={r} idx={S.roles.indexOf(r)} total={S.roles.length} on={!!flipped[r.id]} className={'h' + i} onClick={() => flip(r.id)} />)}
          <FreeCard S={S} share on={!!flipped.free} className="h2" onClick={() => flip('free')} />
        </div>
      </section>

      <section className="steps">
        {STEPS.map((s) => <div key={s.n} className="step"><span className="n">{s.n}</span><h2>{s.h}</h2><p>{s.p}</p></div>)}
      </section>

      <section className="hunt">
        <div>
          <div className="eyebrow">Between teams?</div>
          <h2>The free-agent card keeps the hunt on the same shelf.</h2>
          <p>While you&apos;re out of a contract, a red card sits at the end of the deck with what you&apos;re open to. Switch to the Timeline view to log every application, interview and denial on one line you can pan and zoom, with the days since counted for you. None of it is ever on your public page.</p>
        </div>
        <div className="glossary">
          {GLOSSARY.map(([k, v]) => <div key={k}><b>{k}</b><span>{v}</span></div>)}
        </div>
      </section>

      <footer className="lfoot">
        <span><Flag size={14} /> CareerCards</span>
        <span><a {...tryProps}>Try it</a> · <a href={signInHref}>Sign in</a></span>
      </footer>
    </div>
  );
}
