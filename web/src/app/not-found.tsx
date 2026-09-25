import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CSSProperties } from 'react';
import { Flag, SiteFoot } from '@/components/Landing';

/**
 * 404: a card that isn't in the set. Cosmo Kramer, no. 404, for a team that was never a company, with a
 * back you can read by hovering. A drawn portrait goes in public/avatars/kramer.png when there is one;
 * until then the art box carries his monogram like any card without a portrait.
 */
const KRAMER = existsSync(join(process.cwd(), 'public', 'avatars', 'kramer.png'));

export default function NotFound() {
  const vars = { '--a': '#f5e08a', '--b': '#3b3b2f' } as CSSProperties; // PAIRS[5], the pair the portrait was recolored for
  return (
    <div className="landing nf">
      <header className="lbar">
        <a className="wordmark" href="/"><Flag /><span>CareerCards</span></a>
        <nav><a className="btn primary" href="/">Make your own pack</a></nav>
      </header>
      <main className="nf-main">
        <div className="nf-card">
          <div className="card" style={vars} aria-label="Cosmo Kramer, number 404, not in this set">
            <div className="inner">
              <div className="face front">
                <span className="num wide">#404</span>
                <div className="art">
                  <div className="team" style={{ fontSize: '7.8cqw' }}>Kramerica</div>
                  {KRAMER ? <span className="pic"><img src="/avatars/kramer.png" alt="" /></span> : <span className="mono">CK</span>}
                  <span className="badge">LOST</span>
                </div>
                <div className="who"><span className="fn">Cosmo</span> <span className="ln">Kramer</span></div>
                <div className="role"><span className="ttl">Not in this set</span></div>
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
                <ul className="bul">
                  <li>Swore he had the card. Swore he put it back.</li>
                  <li>Checked the address twice. It is not here.</li>
                  <li>Left the door open on the way out.</li>
                </ul>
                <div className="skills"><span>Entrances</span><span>Hot tubs</span><span>Bro</span></div>
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
