'use client';
import { useEffect, useRef, useState } from 'react';
import type { State } from '@/lib/types';
import { sampleState } from '@/lib/sample';
import { FreeCard, RoleCard } from './Cards';
import { ThemeToggle } from './ThemeToggle';
import { TimelineView } from './Timeline';

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
  { n: '02', h: 'Detail', p: 'Pick team colors, write the highlights, say how each season ended. Group the pack by role or by team.' },
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
export function Landing({ tryHref = '/app?example', signInHref = '/login', onTry }: { tryHref?: string; signInHref?: string; onTry?: () => void }) {
  const [S] = useState(heroState);
  // one card at a time pops out of the hand, then flips; a second click flips it back and settles it
  const [out, setOut] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const later = (ms: number, fn: () => void) => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(fn, ms); };
  const flip = (id: string) => {
    if (out === id) { setFlipped({}); later(600, () => setOut(null)); return; }
    setFlipped({}); setOut(id); later(340, () => setFlipped({ [id]: true }));
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const cls = (id: string, i: number) => 'h' + i + (out === id ? ' out' : '');
  const tryProps = onTry ? { href: tryHref, onClick: (e: React.MouseEvent) => { e.preventDefault(); onTry(); } } : { href: tryHref };
  const hand = [S.roles[0], S.roles[2]]; // Marine Biologist at Acme, Latex Salesman at Vandelay

  return (
    <div className="landing">
      <header className="lbar">
        <a className="wordmark" href="/"><Flag /><span>CareerCards</span></a>
        <nav>
          <ThemeToggle />
          <a className="btn primary" href={signInHref}>Sign in</a>
        </nav>
      </header>

      <section className="hero">
        <div className="copy">
          <div className="eyebrow">The resume, reissued as a card set</div>
          <h1>Every role you&apos;ve played, on its own card.</h1>
          <p>Your career as a pack of cards. Team and position on the front. Seasons, highlights and skills on the back. Shareable at an address of your own.</p>
          <div className="cta">
            <a className="btn primary lg" href={signInHref}>Make your pack</a>
            <a className="btn lg" {...tryProps}>Try it with an example</a>
          </div>
          <div className="fine">Free. No account needed to try.<br />Sign in to keep your cards and make them shareable.</div>
        </div>
        <div className="handwrap">
          {out && <div className="hand-dim" onClick={() => flip(out)} aria-hidden="true" />}
          <div className="hand" aria-label="Example cards. Click one to pick it up and flip it.">
            {hand.map((r, i) => <RoleCard key={r.id} S={S} r={r} idx={S.roles.indexOf(r)} total={S.roles.length} on={!!flipped[r.id]} className={cls(r.id, i)} onClick={() => flip(r.id)} />)}
            <FreeCard S={S} share on={!!flipped.free} className={cls('free', 2)} onClick={() => flip('free')} />
          </div>
          <div className={'flipme' + (out ? ' off' : '')} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3" /><path d="M18.5 2v4h-4" /><path d="M21 12a9 9 0 0 1-15.5 6.3" /><path d="M5.5 22v-4h4" /></svg>
            Tap a card to flip it over
          </div>
        </div>
      </section>

      <section className="steps">
        {STEPS.map((s) => <div key={s.n} className="step"><span className="n">{s.n}</span><h2>{s.h}</h2><p>{s.p}</p></div>)}
      </section>

      <section className="hunt">
        <div>
          <div className="eyebrow">Between teams?</div>
          <h2>The free-agent card keeps the hunt on the same shelf.</h2>
          <p>While you&apos;re out of a contract, a blue card sits at the end of the pack with what you&apos;re open to. Switch to the Timeline view to log every application, interview and denial on one line you can pan and zoom, with the days since counted for you. None of it is ever on your public page.</p>
        </div>
        <div className="glossary">
          {GLOSSARY.map(([k, v]) => <div key={k}><b>{k}</b><span>{v}</span></div>)}
        </div>
      </section>

      <section className="peek">
        <div className="peek-head">
          <div>
            <div className="eyebrow">The timeline</div>
            <h2>The job hunt, on one line.</h2>
          </div>
          <p>Every application, interview, offer and denial in order, with the days counted since the last day of the last season. Drag to pan, pinch or scroll to zoom, hover for the details. This is George&apos;s hunt; yours is only ever visible to you.</p>
        </div>
        <TimelineView S={S} active />
      </section>

      <SiteFoot signInHref={signInHref} />
    </div>
  );
}

/** The footer every page ends on. `signInHref` null hides the sign-in link (signed in). */
export function SiteFoot({ signInHref = '/login' }: { signInHref?: string | null }) {
  return (
    <footer className="lfoot">
      <span><Flag size={14} /> CareerCards · © {new Date().getFullYear()}</span>
      <span>See something wrong? <a href="mailto:hello@careercards.app">Contact us</a>{signInHref && <> · <a href={signInHref}>Sign in</a></>}</span>
    </footer>
  );
}
