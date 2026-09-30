import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readFileSync } from 'fs';
import { careerStats, hydrate, roles, themeOf } from '@/lib/derived';
import { loadPublicPage } from '@/lib/public-card';
import { inStyle, publicStyle } from '@/lib/styles';
import { sampleState } from '@/lib/sample';
import { RoleCard } from '@/components/Cards';
import { Flag } from '@/components/Brand';
import './share-frame.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The share picture as a page: the player's three latest cards, drawn by the site's own components and card.css, fanned beside
 * their name. The share route photographs it in a headless browser (see lib/og/snap.ts), so the picture is the site itself
 * and never a second drawing of the cards to keep in step. `_example` is the example card; `_local` reads OG_STATE (a JSON card)
 * off Vercel, for checking the picture by hand.
 */
export default async function ShareFrame({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ style?: string }> }) {
  const { slug } = await params, asked = (await searchParams).style;
  const page = slug === '_example' ? { S: sampleState(), styles: null }
    : slug === '_local' && process.env.OG_STATE && !process.env.VERCEL ? { S: hydrate(JSON.parse(readFileSync(process.env.OG_STATE, 'utf8'))), styles: ['chrome'] }
    : await loadPublicPage(slug);
  if (!page) notFound();
  const S = inStyle(page.S, publicStyle(page.S, page.styles, asked)); // the same check as the page: ?style= only when the owner may use it
  const all = roles(S), cards = all.slice(-3), p = S.profile, cs = careerStats(S), style = themeOf(S);
  const fan = cards.length === 3 ? [[0, -9], [0.575, 1], [1.15, 10]] : cards.length === 2 ? [[0.2, -6], [0.95, 6]] : [[0.575, 1]];
  const stat = cs ? [[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']].map(([v, k]) => `${v} ${k}${v === 1 ? '' : 's'}`).join(' \u00b7 ') : '';
  const first = (p.name || '').trim().split(/\s+/)[0];
  const shown = slug.startsWith('_') ? '' : slug;
  return (
    <div className={'shareframe s-' + style}>
      <div className="left">
        <div className="mark"><Flag size={34} /><span>CareerCards</span></div>
        <div className="name">{p.name || 'Career'}</div>
        {p.headline ? <div className="sub">{p.headline}</div> : null}
        {stat ? <div className="stat">{stat}</div> : null}
      </div>
      <div className="hand">
        {cards.map((r, i) => (
          <div key={r.id} className="slot" style={{ left: `calc(var(--cw) * ${fan[i][0]})`, transform: `rotate(${fan[i][1]}deg)` }}>
            <RoleCard S={S} r={r} idx={all.indexOf(r)} total={all.length} />
          </div>
        ))}
      </div>
      <div className="band">
        <span className="cta">{first ? `View ${first}’s cards and make your own.` : 'View the cards and make your own.'}</span>
        <span className="url">{shown ? 'careercards.app/u/' + shown : 'careercards.app'}</span>
      </div>
    </div>
  );
}
