import type { CSSProperties } from 'react';
import { Flag, SiteFoot } from '@/components/Brand';
import { fitCompany, fitName, fitTitle } from '@/lib/fit';

/**
 * 404: a card that isn't in the set. Cosmo Kramer, no. 404, for a team that was never a company, on the Chrome
 * stock (the teal frame, his 90s portrait in public/avatars/kramer-90s.webp), with a back you can read by hovering.
 * The front is built as RoleCard builds a Chrome card, with the same fitting for the team, the name and the position.
 */
const NAME = fitName('Cosmo Kramer'), TITLE = fitTitle('Not in this set');

export default function NotFound() {
  const vars = { '--a': '#e8a13a', '--b': '#1f2a44' } as CSSProperties; // PAIRS[0], whose frame is the teal one (f0)
  return (
    <div className="landing nf" data-style="chrome">
      <header className="lbar">
        <a className="wordmark" href="/"><Flag /><span>CareerCards</span></a>
        <nav><a className="btn primary" href="/">Make your own pack</a></nav>
      </header>
      <main className="nf-main">
        <div className="nf-card">
          <div className="card t-chrome f0" style={vars} aria-label="Cosmo Kramer, number 404, not in this set">
            <div className="inner">
              <div className="face front">
                <span className="num wide" style={{ fontSize: '3.5cqw' }}>#404</span>{/* three figures: smaller than a card number ever needs */}
                <div className="art">
                  <div className="team" style={{ fontSize: fitCompany('Kramerica') + 'cqw' }}>Kramerica</div>
                  <span className="pic"><img src="/avatars/kramer-90s.webp" alt="" decoding="async" /></span>
                  <span className="badge">LOST</span>
                </div>
                <div className="who" style={{ '--ns': NAME.scale.toFixed(3) } as CSSProperties}><span className="fn">{NAME.fn}</span> <span className="ln">{NAME.ln}</span></div>
                <div className="role" style={{ '--rs': TITLE.size.toFixed(2) } as CSSProperties}><span className="ttl">{TITLE.text}</span></div>
              </div>
              <div className="face back">
                <div className="hdr"><div className="t">Kramerica</div><div className="s">Page not found · Apt. 5B</div></div>
                <table>
                  <colgroup><col className="c1" /><col /><col className="c3" /></colgroup>
                  <thead><tr><th>Season</th><th>Position</th><th className="n">Years</th></tr></thead>
                  <tbody>
                    <tr className="cur"><td>404</td><td>Wherever you were headed</td><td className="n">0.0</td></tr>
                  </tbody>
                </table>
                <div className="bulwrap"><ul className="bul">
                  <li>Swore he had the card.</li>
                  <li>Swore he put it back.</li>
                  <li>Checked the address twice. Not here.</li>
                  <li>Left the door open on the way out.</li>
                </ul></div>
                <div className="skills"><span>Entrances</span><span>Hot tubs</span><span>Coffee table books</span><span>Butter shaving</span></div>
                <div className="foot"><span>Unaccounted for</span><span>#404 of ∞</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="nf-copy">
          <div className="eyebrow">Error 404</div>
          <h1>This card isn&apos;t in the set.</h1>
          <p>The address you followed doesn&apos;t match anything in the pack. It may have been moved, made private, or never printed. Kramer says he had it, which is not reassuring.</p>
          <div className="cta">
            <a className="btn primary" href="/">Back to the front</a>
            <a className="btn" href="/app">Open the deck</a>
          </div>
          <div className="nf-hint">Hover the card to read the back.</div>
        </div>
      </main>
      <SiteFoot />
    </div>
  );
}
