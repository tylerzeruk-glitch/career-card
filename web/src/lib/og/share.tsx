import { ImageResponse } from 'next/og';
import type { State } from '../types';
import { careerStats, codeFor, initials, looking, pairFor, pairIndexFor, roles, status } from '../derived';
import { avatarSrc, isPhoto } from '../avatar';

/**
 * The share image for a player's page: name, headline and a hand of their three most recent cards,
 * drawn for the Open Graph renderer (flex and absolute positioning only; no grid, no container
 * queries, so the card front is rebuilt here in pixels rather than from card.css). 1200 x 630.
 */
export const SHARE_SIZE = { width: 1200, height: 630 };

const CW = 236, CH = Math.round(CW * 1.4); // one card, 2.5 : 3.5
const q = (n: number) => Math.round((n * CW) / 100); // the card's cqw, in px

/** The site's three faces, served from public/fonts and kept once per server. */
let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[]> | null = null;
function fonts(site: string) {
  return (fontCache ||= (async () => {
    const load = (f: string) => fetch(site + '/fonts/' + f, { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error('font ' + f + ' ' + r.status); return r.arrayBuffer(); });
    const [lilita, barlow, caslon] = await Promise.all([load('lilita-one.woff'), load('barlow-condensed-700.woff'), load('libre-caslon.woff')]);
    return fontList(lilita, barlow, caslon);
  })().catch((e) => { fontCache = null; throw e; }));
}
function fontList(lilita: ArrayBuffer, barlow: ArrayBuffer, caslon: ArrayBuffer) {
  return [
    { name: 'Lilita One', data: lilita, weight: 400 as const, style: 'normal' as const },
    { name: 'Barlow Condensed', data: barlow, weight: 700 as const, style: 'normal' as const },
    { name: 'Libre Caslon Text', data: caslon, weight: 400 as const, style: 'normal' as const },
  ];
}

const FLAG = 'M9.97 11.67 L12.69 22.18 L14.24 35.35 L19.68 32.04 L25.34 30.42 L29.54 30.27 L36.89 31.08 L41.38 30.20 L49.98 26.74 L60.50 21.08 L51.31 20.56 L41.38 18.80 L35.05 16.52 L26.15 12.18 L20.27 10.49 L14.83 10.27 Z M5.93 5.41 L3.94 6.59 L3.43 8.87 L5.05 10.78 L13.58 57.34 L14.31 58.37 L15.49 58.51 L16.45 57.92 L16.74 56.38 L8.28 10.64 L9.16 7.33 L7.91 5.71 Z';
const STAR = '50.0,0.0 60.6,10.4 75.0,6.7 79.0,21.0 93.3,25.0 89.6,39.4 100.0,50.0 89.6,60.6 93.3,75.0 79.0,79.0 75.0,93.3 60.6,89.6 50.0,100.0 39.4,89.6 25.0,93.3 21.0,79.0 6.7,75.0 10.4,60.6 0.0,50.0 10.4,39.4 6.7,25.0 21.0,21.0 25.0,6.7 39.4,10.4';

const BARLOW = 'Barlow Condensed', LILITA = 'Lilita One', CASLON = 'Libre Caslon Text';

/** The team pennant: a swallowtail strip hanging off the art box's top-left corner. */
function Pennant({ text, a, b, wide }: { text: string; a: string; b: string; wide?: boolean }) {
  const h = q(12.5), w = Math.min(q(80), Math.round(text.length * q(7.2) * 0.74) + q(16)), tail = q(5.5);
  return (
    <div style={{ position: 'absolute', left: -2, bottom: '100%', width: w, height: h, display: 'flex' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={`M0 ${q(5)} Q0 0 ${q(5)} 0 L${w} 0 L${w - tail} ${h / 2} L${w} ${h} L0 ${h} Z`} fill={wide ? '#dc4432' : b} />
      </svg>
      <div style={{ position: 'absolute', left: q(4.6), top: 0, width: w - q(4.6) - q(10), height: h, display: 'flex', alignItems: 'center', fontFamily: LILITA, fontSize: q(7.2), letterSpacing: '0.03em', textTransform: 'uppercase', color: wide ? '#fbf6ea' : a, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</div>
    </div>
  );
}

function Badge({ code, right }: { code: string; right?: boolean }) {
  const s = q(25);
  return (
    <div style={{ position: 'absolute', width: s, height: s, [right ? 'right' : 'left']: -q(5), [right ? 'top' : 'bottom']: -q(7), display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${right ? 12 : -12}deg)` }}>
      <svg width={s} height={s} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}><polygon points={STAR} fill="#dc4432" /></svg>
      <div style={{ position: 'relative', display: 'flex', fontFamily: BARLOW, fontSize: q(6.2), letterSpacing: '0.04em', color: '#fff' }}>{code}</div>
    </div>
  );
}

function Who({ name, fn, ln }: { name: string; fn: string; ln: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
      {fn ? <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: q(5), letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6559' }}>{fn}</div> : null}
      <div style={{ display: 'flex', fontFamily: LILITA, fontSize: q(10), letterSpacing: '0.02em', textTransform: 'uppercase', color: '#1c1b18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{ln || name || 'Your name'}</div>
    </div>
  );
}

function splitName(name: string) {
  const n = (name || '').trim(), i = n.lastIndexOf(' ');
  return i > 0 ? [n.slice(0, i), n.slice(i + 1)] : ['', n];
}

function RoleFront({ S, r, idx, site, rot }: { S: State; r: State['roles'][number]; idx: number; site: string; rot: number }) {
  const [a, b] = pairFor(S, r.company), p = S.profile, [fn, ln] = splitName(p.name);
  const av = p.avatar ? avatarSrc(p.avatar, pairIndexFor(S, r.company)) : '';
  const src = av ? (av.startsWith('/') ? site + av : av) : '';
  const photo = !!p.avatar && isPhoto(p.avatar);
  return (
    <div style={{ position: 'absolute', bottom: 0, width: CW, height: CH, transformOrigin: '50% 115%', transform: `rotate(${rot}deg)`, display: 'flex', flexDirection: 'column', background: '#fbf6ea', borderRadius: 12, border: '2px solid #fffaf0', boxShadow: '-5px 0 14px rgba(0,0,0,.16), 0 10px 26px rgba(0,0,0,.16)', padding: `${Math.round(CW * 0.18)}px ${Math.round(CW * 0.065)}px ${Math.round(CW * 0.06)}px`, color: '#1c1b18' }}>
      <div style={{ position: 'absolute', top: q(3.2), right: q(5), width: q(11), height: q(11), borderRadius: 999, border: '2px solid #dc4432', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CASLON, fontSize: q(5.2), color: '#dc4432' }}>{'#' + (idx + 1)}</div>
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: Math.round(CH * 0.52), marginBottom: q(12), borderRadius: q(5), borderTopLeftRadius: 0, background: a, border: `2px solid ${b}`, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
        <Pennant text={r.company} a={a} b={b} />
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: q(5), borderTopLeftRadius: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {src ? <img src={src} width={CW - 2 * Math.round(CW * 0.065) - 4} height={photo ? Math.round(CH * 0.52) - 4 : undefined} style={{ objectFit: photo ? 'cover' : 'contain', objectPosition: 'bottom' }} alt="" />
            : <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: q(34), letterSpacing: '-0.02em', color: b, marginBottom: q(4) }}>{initials(p.name) || '?'}</div>}
        </div>
        <Badge code={r.code || codeFor(r.title)} />
      </div>
      <Who name={p.name} fn={fn} ln={ln} />
      <div style={{ display: 'flex', marginTop: q(1.4), fontFamily: BARLOW, fontSize: q(5), letterSpacing: '0.1em', textTransform: 'uppercase', color: b, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{r.title}</div>
    </div>
  );
}

function FreeFront({ S, rot }: { S: State; rot: number }) {
  const p = S.profile, [fn, ln] = splitName(p.name), open = (p.targets || []).slice(0, 3).join(' · ');
  return (
    <div style={{ position: 'absolute', bottom: 0, width: CW, height: CH, transformOrigin: '50% 115%', transform: `rotate(${rot}deg)`, display: 'flex', flexDirection: 'column', background: '#1f2a44', borderRadius: 12, border: '2px solid #3a466a', boxShadow: '-5px 0 14px rgba(0,0,0,.16), 0 10px 26px rgba(0,0,0,.16)', padding: `${Math.round(CW * 0.18)}px ${Math.round(CW * 0.065)}px ${Math.round(CW * 0.06)}px`, color: '#fbf6ea' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', height: Math.round(CH * 0.52), marginBottom: q(12), borderRadius: q(5), borderTopLeftRadius: 0, background: 'rgba(255,255,255,.07)', border: '2px solid rgba(255,255,255,.35)', alignItems: 'center', justifyContent: 'center', padding: '6%', textAlign: 'center' }}>
        <Pennant text="Free agent" a="#fbf6ea" b="#dc4432" wide />
        <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: q(4.6), letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginBottom: q(3) }}>Open to</div>
        <div style={{ display: 'flex', fontFamily: LILITA, fontSize: q(7.5), lineHeight: 1.15, textTransform: 'uppercase', textAlign: 'center' }}>{open || 'Offers'}</div>
        <Badge code="FA" right />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
        {fn ? <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: q(5), letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c9c2b2' }}>{fn}</div> : null}
        <div style={{ display: 'flex', fontFamily: LILITA, fontSize: q(10), letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{ln || 'Your name'}</div>
      </div>
      <div style={{ display: 'flex', marginTop: q(1.4), fontFamily: BARLOW, fontSize: q(5), letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc4432' }}>Free agent</div>
    </div>
  );
}

/** Up to three cards: the most recent roles, and the free-agent card in the last slot when the player is on the market. */
export type ShareVariant = 'band' | 'button' | 'eyebrow';

export async function shareImage(S: State, site: string, slug?: string, variant: ShareVariant = 'band') {
  const rs = roles(S), st = status(S), free = st.free && looking(S);
  const p = S.profile, cs = careerStats(S);
  const roleCards = rs.slice(free ? -2 : -3);
  const n = roleCards.length + (free ? 1 : 0);
  const rots = n === 3 ? [-9, 1, 10] : n === 2 ? [-6, 6] : [1];
  const lefts = n === 3 ? [0, 0.575, 1.15] : n === 2 ? [0.2, 0.95] : [0.575];
  const handW = Math.round(CW * 2.15), handH = CH + 40;
  const stat = cs ? [[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']].map(([v, k]) => `${v} ${k}${v === 1 ? '' : 's'}`).join('  ·  ') : '';
  const sub = p.headline || '';
  const first = (p.name || '').trim().split(/\s+/)[0];
  const cta = first ? `View ${first}\u2019s cards and make your own.` : 'View the cards and make your own.';
  const firstIdx = roleCards[0] ? Math.max(0, rs.indexOf(roleCards[0])) : 0;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f2eee5', color: '#1c1b18', padding: '0 64px', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 1200 - 128 - handW - 24, justifyContent: 'center', marginBottom: variant === 'button' ? 0 : 70 }}>
          {variant === 'eyebrow'
            ? <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: 19, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#dc4432', marginBottom: 18 }}>{first ? `View ${first}\u2019s cards · Make your own` : 'View the cards · Make your own'}</div>
            : <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
                <svg width="34" height="34" viewBox="0 0 64 64"><path d={FLAG} fill="#dc4432" /></svg>
                <div style={{ display: 'flex', marginLeft: 8, fontFamily: LILITA, fontSize: 30, letterSpacing: '0.02em' }}>CareerCards</div>
              </div>}
          {free ? <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', background: '#dc4432', color: '#fff', fontFamily: BARLOW, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 4, transform: 'rotate(-2deg)', marginBottom: 16 }}><svg width="16" height="16" viewBox="0 0 64 64"><path d={FLAG} fill="#fff" /></svg><span style={{ marginLeft: 8 }}>Free agent · open to offers</span></div> : null}
          <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: 62, lineHeight: 0.98, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 14 }}>{p.name || 'Career'}</div>
          {sub ? <div style={{ display: 'flex', fontFamily: CASLON, fontSize: 30, lineHeight: 1.35, color: '#55524a' }}>{sub}</div> : null}
          {stat ? <div style={{ display: 'flex', marginTop: 18, fontFamily: BARLOW, fontSize: 23, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6559' }}>{stat}</div> : null}
          {variant === 'button' ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', marginTop: 34, background: '#1c1b18', color: '#f2eee5', fontFamily: BARLOW, fontSize: 22, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '13px 22px', borderRadius: 8, whiteSpace: 'nowrap' }}>{first ? `View ${first}\u2019s cards \u2192` : 'View the cards \u2192'}</div>
            <div style={{ display: 'flex', marginTop: 14, fontFamily: CASLON, fontSize: 21, color: '#55524a', whiteSpace: 'nowrap' }}>Then make your own at <span style={{ color: '#dc4432', marginLeft: 6 }}>careercards.app</span></div>
          </div> : null}
        </div>
        {variant === 'band' ? <div style={{ position: 'absolute', left: 64, right: 64, bottom: 40, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: '2px solid #dcd6c8', paddingTop: 18 }}>
          <div style={{ display: 'flex', fontFamily: CASLON, fontSize: 25, color: '#1c1b18' }}>{cta}</div>
          <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: 19, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#dc4432' }}>{slug ? 'careercards.app/u/' + slug : 'careercards.app'}</div>
        </div> : null}
        {variant === 'eyebrow' ? <div style={{ position: 'absolute', left: 64, bottom: 44, display: 'flex', alignItems: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 64 64"><path d={FLAG} fill="#dc4432" /></svg>
          <div style={{ display: 'flex', marginLeft: 7, fontFamily: LILITA, fontSize: 24, letterSpacing: '0.02em' }}>CareerCards</div>
          <div style={{ display: 'flex', marginLeft: 16, fontFamily: BARLOW, fontSize: 19, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a867b' }}>{slug ? 'careercards.app/u/' + slug : 'careercards.app'}</div>
        </div> : null}
        <div style={{ position: 'relative', display: 'flex', width: handW, height: handH, marginRight: 8, marginBottom: variant === 'button' ? 0 : 70 }}>
          {roleCards.map((r, i) => <div key={r.id} style={{ position: 'absolute', left: Math.round(lefts[i] * CW), bottom: 0, width: CW, height: CH, display: 'flex' }}><RoleFront S={S} r={r} idx={firstIdx + i} site={site} rot={rots[i]} /></div>)}
          {free ? <div style={{ position: 'absolute', left: Math.round(lefts[n - 1] * CW), bottom: 0, width: CW, height: CH, display: 'flex' }}><FreeFront S={S} rot={rots[n - 1]} /></div> : null}
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: await fonts(site) },
  );
}
