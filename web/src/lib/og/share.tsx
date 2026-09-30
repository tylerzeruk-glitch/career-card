import { ImageResponse } from 'next/og';
import sharp, { type OverlayOptions } from 'sharp';
import type { State } from '../types';
import { FRAMES, careerStats, frameIndexFor, initials, pairFor, roles, themeOf } from '../derived';
import { portraitFor } from '../avatar';
import { fitCompany, fitName } from '../fit';
import { SUPABASE_URL } from '../supabase/env';

/**
 * The share image for a player's page: name, headline and a hand of their three most recent cards,
 * drawn for the Open Graph renderer (flex and absolute positioning only; no grid, no container
 * queries, so the card front is rebuilt here in pixels rather than from card.css). 1200 x 630.
 */
export const SHARE_SIZE = { width: 1200, height: 630 };

const CW = 236, CH = Math.round(CW * 1.4); // one card, 2.5 : 3.5

/** The site's three faces, served from public/fonts and kept once per server. */
let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[]> | null = null;
function fonts(site: string) {
  return (fontCache ||= (async () => {
    const load = (f: string) => fetch(site + '/fonts/' + f, { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error('font ' + f + ' ' + r.status); return r.arrayBuffer(); });
    const [lilita, barlow, caslon, anton, oswald] = await Promise.all([load('lilita-one.woff'), load('barlow-condensed-700.woff'), load('libre-caslon.woff'), load('anton.ttf'), load('oswald-700.ttf')]);
    return fontList(lilita, barlow, caslon, anton, oswald);
  })().catch((e) => { fontCache = null; throw e; }));
}
function fontList(lilita: ArrayBuffer, barlow: ArrayBuffer, caslon: ArrayBuffer, anton: ArrayBuffer, oswald: ArrayBuffer) {
  return [
    { name: 'Lilita One', data: lilita, weight: 400 as const, style: 'normal' as const },
    { name: 'Barlow Condensed', data: barlow, weight: 700 as const, style: 'normal' as const },
    { name: 'Libre Caslon Text', data: caslon, weight: 400 as const, style: 'normal' as const },
    { name: 'Anton', data: anton, weight: 400 as const, style: 'normal' as const },
    { name: 'Oswald', data: oswald, weight: 700 as const, style: 'normal' as const },
  ];
}

const FLAG = 'M9.97 11.67 L12.69 22.18 L14.24 35.35 L19.68 32.04 L25.34 30.42 L29.54 30.27 L36.89 31.08 L41.38 30.20 L49.98 26.74 L60.50 21.08 L51.31 20.56 L41.38 18.80 L35.05 16.52 L26.15 12.18 L20.27 10.49 L14.83 10.27 Z M5.93 5.41 L3.94 6.59 L3.43 8.87 L5.05 10.78 L13.58 57.34 L14.31 58.37 L15.49 58.51 L16.45 57.92 L16.74 56.38 L8.28 10.64 L9.16 7.33 L7.91 5.71 Z';
const BARLOW = 'Barlow Condensed', LILITA = 'Lilita One', CASLON = 'Libre Caslon Text';

/**
 * A portrait the renderer may fetch: the site's own built-ins, an inline image, or a file in the project's portraits
 * bucket. The address comes from the card owner, and the renderer fetches it on the server for anyone who asks for the
 * picture, so anything else (another host, an internal address) is not fetched and the card shows initials instead.
 */
function trustedPortrait(src: string, site: string): string {
  if (!src) return '';
  if (src.startsWith('/') && !src.startsWith('//')) return site + src.replace(/^(\/avatars\/[\w-]+)\.webp$/, '$1.png'); // the renderer reads PNG, not the site's WebP
  if (src.startsWith('data:image/')) return src;
  const bucket = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/portraits/' : '';
  return bucket && src.startsWith(bucket) && !src.includes('..') ? src : '';
}

function splitName(name: string) {
  const n = (name || '').trim(), i = n.lastIndexOf(' ');
  return i > 0 ? [n.slice(0, i), n.slice(i + 1)] : ['', n];
}


/** The Chrome front has no padding, so its container unit (cqw) is a share of the whole card width, not of the vintage card's padded content. */
const qc = (n: number) => Math.round((n * CW) / 100);
/** The Chrome frame: shares of the card where the printed frame's panel and plate sit, in px. */
const FR = { panelL: Math.round(CW * 0.082), panelT: Math.round(CH * 0.0875), panelW: Math.round(CW * 0.836), panelH: Math.round(CH * 0.684), bustH: Math.round(CH * 0.7114),
  roleL: Math.round(CW * 0.076), roleT: Math.round(CH * 0.866), roleW: Math.round(CW * 0.62), roleH: Math.round(CH * 0.081) };
/* the bust's box reaches down to the printed plate and ball and is cut along them, as .card.t-chrome .art .pic in card.css (same measurements) */
const BUST_CLIP = `polygon(${Math.round(FR.panelW * 0.0000)}px ${Math.round(FR.bustH * 0.0000)}px,${Math.round(FR.panelW * 1.0000)}px ${Math.round(FR.bustH * 0.0000)}px,${Math.round(FR.panelW * 1.0000)}px ${Math.round(FR.bustH * 0.9370)}px,${Math.round(FR.panelW * 0.9730)}px ${Math.round(FR.bustH * 0.9270)}px,${Math.round(FR.panelW * 0.9450)}px ${Math.round(FR.bustH * 0.9230)}px,${Math.round(FR.panelW * 0.9160)}px ${Math.round(FR.bustH * 0.9230)}px,${Math.round(FR.panelW * 0.8880)}px ${Math.round(FR.bustH * 0.9270)}px,${Math.round(FR.panelW * 0.8610)}px ${Math.round(FR.bustH * 0.9360)}px,${Math.round(FR.panelW * 0.8370)}px ${Math.round(FR.bustH * 0.9490)}px,${Math.round(FR.panelW * 0.8160)}px ${Math.round(FR.bustH * 0.9660)}px,${Math.round(FR.panelW * 0.8000)}px ${Math.round(FR.bustH * 0.9860)}px,${Math.round(FR.panelW * 0.7900)}px ${Math.round(FR.bustH * 0.9020)}px,${Math.round(FR.panelW * 0.0000)}px ${Math.round(FR.bustH * 0.9720)}px)`;
const NAVY = '#173a8a', RED = '#e5322d', CREAM = '#fbf3d8';
/**
 * The renderer turns a box about its centre whatever transform-origin says. The site turns its plates about a
 * point of their own (the left end, or the bottom-left corner), so the same turn is written here as a shift of
 * the centre to where that pivot would carry it, then the turn about the centre.
 */
function turnAbout(deg: number, w: number, h: number, ox: number, oy: number) {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t), vx = w / 2 - ox, vy = h / 2 - oy;
  return `translate(${(vx * c - vy * sn - vx).toFixed(1)}px, ${(vx * sn + vy * c - vy).toFixed(1)}px) rotate(${deg}deg)`;
}
const DBG = process.env.OG_DEBUG ? { background: 'rgba(0,255,0,.45)', outline: '1px solid #0f0' } : {};

/** The company as the maker's mark over the frame's top-left corner: cream letters, a black keyline and a red offset, built from layered copies. */
function ChromeMark({ text, color }: { text: string; color: string }) {
  const size = qc(fitCompany(text)), w = Math.round(CW * 0.76), k = 1.3, ring = [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]];
  const base = { position: 'absolute' as const, left: 0, top: 0, width: w, display: 'flex', fontFamily: LILITA, fontSize: size, lineHeight: 1, letterSpacing: '0.01em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const };
  return (
    <div style={{ position: 'absolute', left: Math.round(CW * 0.063), top: Math.round(CH * 0.05), width: w, height: size + 8, display: 'flex', transform: turnAbout(-4, w, size + 8, 0, size + 8) + ' skewX(-10deg)' }}>
      {[[0, 0], ...ring].map(([x, y], i) => <div key={'s' + i} style={{ ...base, left: 2.6 + x, top: 3 + y, color: RED }}>{text}</div>)}
      {ring.map(([x, y], i) => <div key={i} style={{ ...base, left: x, top: y, color: '#1c1b2a' }}>{text}</div>)}
      <div style={{ ...base, color }}>{text}</div>
    </div>
  );
}

/**
 * The name on the frame's big yellow plate (the site's position plate, turned up to the right about its left end): first name small,
 * surname large, navy with a white keyline and a dark drop as .card.t-chrome .role. The share card carries no position, and the
 * yellow plate left blank read as a missing line, so the name takes it and the thin plate above stays as trim.
 */
function ChromePlate({ name }: { name: string }) {
  const { fn, ln, scale } = fitName(name.replace(/,.*$/, ''), 54, 0.6, 0.64, 0.66, 5.4, 8);
  const key = '1px 0 0 #fff,-1px 0 0 #fff,0 1px 0 #fff,0 -1px 0 #fff,1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,2px 2px 0 #1c1b18';
  const type = { display: 'flex', fontFamily: LILITA, lineHeight: 1, letterSpacing: '0.03em', textTransform: 'uppercase' as const, color: NAVY, textShadow: key };
  return (
    <div style={{ position: 'absolute', left: FR.roleL, top: FR.roleT, width: FR.roleW, height: FR.roleH, display: 'flex', alignItems: 'center', paddingLeft: qc(2), transform: turnAbout(-5.8, FR.roleW, FR.roleH, 0, FR.roleH / 2), whiteSpace: 'nowrap', overflow: 'hidden', ...DBG }}>
      {fn ? <div style={{ ...type, fontSize: qc(5.4 * scale), marginRight: qc(1.8) }}>{fn}</div> : null}
      <div style={{ ...type, fontSize: qc(8 * scale) }}>{ln}</div>
    </div>
  );
}


/** The Chrome card stock: the printed frame, rotated into the hand like the others; */
function ChromeStock({ site, rot, frame = 'chrome.jpg', children }: { site: string; rot: number; frame?: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, width: CW, height: CH, transformOrigin: `${CW / 2}px ${Math.round(CH * 1.15)}px`, transform: `rotate(${rot}deg)`, display: 'flex', backgroundImage: `url(${site}/frames/${frame})`, backgroundSize: `${CW}px ${CH}px`, backgroundRepeat: 'no-repeat', boxShadow: '-5px 0 14px rgba(0,0,0,.25), 0 10px 26px rgba(0,0,0,.25)' }}>
      {children}
    </div>
  );
}

/** The Chrome role card: the photo in the frame's panel, the company as the maker's mark, the name on the yellow plate. */
function ChromeRoleFront({ S, r, site, rot }: { S: State; r: State['roles'][number]; site: string; rot: number }) {
  const p = S.profile;
  const av = portraitFor(S, p, r.company)?.src || '';
  const src = trustedPortrait(av, site);
  const ph = FR.bustH;
  return (
    <ChromeStock site={site} rot={rot} frame={FRAMES[frameIndexFor(S, r.company)].file + '.jpg'}>
      <div style={{ position: 'absolute', left: FR.panelL, top: FR.panelT, width: FR.panelW, height: ph, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', clipPath: BUST_CLIP }}>
        {src ? <div style={{ width: Math.round(ph * 0.97), height: Math.round(ph * 0.97), backgroundImage: `url(${src})`, backgroundSize: `${Math.round(ph * 0.97)}px ${Math.round(ph * 0.97)}px`, backgroundRepeat: 'no-repeat' }} />
          : <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qc(34), letterSpacing: '-0.02em', color: NAVY, marginBottom: qc(30) }}>{initials(p.name) || '?'}</div>}
      </div>
      <ChromeMark text={r.company} color={CREAM} />
      <ChromePlate name={p.name} />
    </ChromeStock>
  );
}


/** The vintage stock: shares of the whole card width (the printed front has no padding), as card.css measures it. */
const qv = (n: number) => Math.round((n * CW) / 100);
/** The vintage print and its masks, fetched once per server, and each finished front (colours plus portrait) kept as a data URI. */
const vintageParts: Record<string, Promise<Buffer>> = {}, vintageFronts: Record<string, Promise<{ src: string; drawn: boolean }>> = {};
const fetchPart = (url: string) => fetch(url, { cache: 'force-cache' }).then(async (r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return Buffer.from(await r.arrayBuffer()); });
const part = (site: string, file: string) => (vintageParts[file] ||= fetchPart(site + '/frames/' + file).catch((e) => { delete vintageParts[file]; throw e; }));
/**
 * One vintage front as a single picture, built with sharp: the print, the window in the team's light colour, the portrait in the
 * window, the printed star back over the portrait, and the pennant in the team's dark colour. The renderer only letters it. Layers
 * stacked in the renderer clip unevenly on a turned card (the printed red showed past the team's colour), so none are left to it.
 * `drawn` is false when the portrait can't be had; the card then shows initials in the window.
 */
function vintageFront(site: string, light: string, dark: string, portrait: string): Promise<{ src: string; drawn: boolean }> {
  const key = [light, dark, portrait].join('|');
  return (vintageFronts[key] ||= (async () => {
    const W = CW * 2, H = CH * 2, u = W / 100; // twice the card's size for a crisp turn; u is one cqw
    const [print, pen, star] = await Promise.all([part(site, 'vintage.jpg'), part(site, 'vintage-pennant.png'), part(site, 'vintage-star.png')]);
    const base = await sharp(print).resize(W, H).png().toBuffer();
    const win = { left: Math.round(6.5 * u), top: Math.round(15.4 * u), width: Math.round(87 * u), height: Math.round(77.8 * u), r: Math.round(4.6 * u) };
    const round = Buffer.from(`<svg width="${win.width}" height="${win.height}"><rect width="${win.width}" height="${win.height}" rx="${win.r}" ry="${win.r}"/></svg>`);
    // the window: the light colour, the portrait a little wider than the window and hung from its top, rounded to the frame's inner curve
    let drawn = false;
    const layers: OverlayOptions[] = [];
    if (portrait) {
      try {
        const size = Math.round(win.width * 1.06);
        const face = await sharp(await fetchPart(portrait)).resize(size, size)
          .extract({ left: Math.round(win.width * 0.03), top: 0, width: win.width, height: Math.min(size, win.height) }).png().toBuffer();
        layers.push({ input: face, left: 0, top: 0 });
        drawn = true;
      } catch (e) { console.error('share portrait', e); }
    }
    const pane = await sharp({ create: { width: win.width, height: win.height, channels: 4, background: light } })
      .composite([...layers, { input: round, blend: 'dest-in' }]).png().toBuffer();
    const tint = async (mask: Buffer, color: string | null) => {
      const shape = await sharp(mask).resize(W, H).ensureAlpha().png().toBuffer();
      const fill = color ? sharp({ create: { width: W, height: H, channels: 4, background: color } }) : sharp(base).ensureAlpha();
      return fill.composite([{ input: shape, blend: 'dest-in' }]).png().toBuffer(); // the fill kept only where the mask is
    };
    const front = await sharp(base).composite([
      { input: pane, left: win.left, top: win.top },
      { input: await tint(star, null) }, // the star as printed, back over the portrait's corner
      { input: await tint(pen, dark) },
    ]).jpeg({ quality: 88 }).toBuffer();
    return { src: 'data:image/jpeg;base64,' + front.toString('base64'), drawn };
  })().catch((e) => { delete vintageFronts[key]; throw e; }));
}
/** The printed stock, its pennant already in the team's colour (see vintageFront), turned into the hand like the others; the star keeps its printed red. */
function VintageStock({ rot, front, children }: { rot: number; front: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, width: CW, height: CH, transformOrigin: `${CW / 2}px ${Math.round(CH * 1.15)}px`, transform: `rotate(${rot}deg)`, display: 'flex', borderRadius: qv(1.4), overflow: 'hidden', backgroundImage: `url(${front})`, backgroundSize: `${CW}px ${CH}px`, backgroundRepeat: 'no-repeat', boxShadow: '-5px 0 14px rgba(0,0,0,.18), 0 10px 26px rgba(0,0,0,.18)' }}>
      {children}
    </div>
  );
}
/** Text cut to a width by hand: inside a turned card the renderer misplaces an overflow clip, so nothing here overflows. `adv` is a letter's advance as a share of the size. */
function clip(text: string, width: number, size: number, adv: number) {
  const max = Math.floor(width / (size * adv));
  return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)).trimEnd() + '\u2026';
}
/** The lettering on the vintage front: the team on the pennant and the name on the paper below the frame, nothing else. */
function VintageLettering({ team, name }: { team: string; name: string }) {
  const [fn, ln] = splitName(name);
  // the pennant's lettering shrinks to fit its band, to a floor, then is cut; spaces are unbreakable so the renderer never wraps it
  const teamSize = Math.max(qv(3.6), Math.min(qv(6.2), Math.floor(qv(38) / Math.max(1, team.length * 0.8))));
  const teamText = clip(team, qv(38), teamSize, 0.8).replace(/ /g, '\u00a0');
  return (
    <>
      <div style={{ position: 'absolute', left: qv(6.6), top: qv(1.8), width: qv(40), height: qv(10.6), display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', fontFamily: LILITA, fontSize: teamSize, lineHeight: 1, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#fff7e6', textShadow: '1px 1px 0 #1c1b18', whiteSpace: 'nowrap' }}>{teamText}</div>
      </div>
      <div style={{ position: 'absolute', left: qv(7), top: qv(108), width: qv(86), display: 'flex', flexDirection: 'column' }}>
        {fn ? <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qv(5.4), lineHeight: 1.1, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6559' }}>{clip(fn, qv(86), qv(5.4), 0.62)}</div> : null}
        <div style={{ display: 'flex', fontFamily: LILITA, fontSize: qv(11), lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#1c1b18', whiteSpace: 'nowrap' }}>{clip(ln || name || 'Your name', qv(86), qv(11), 0.66)}</div>
      </div>
    </>
  );
}
function VintageRoleFront({ S, r, rot, front }: { S: State; r: State['roles'][number]; rot: number; front: { src: string; drawn: boolean } }) {
  const b = pairFor(S, r.company)[1], p = S.profile;
  return (
    <VintageStock rot={rot} front={front.src}>
      {front.drawn ? null : <div style={{ position: 'absolute', left: qv(6.5), top: qv(15.4), width: qv(87), height: qv(77.8), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BARLOW, fontSize: qv(30), letterSpacing: '-0.02em', color: b }}>{initials(p.name) || '?'}</div>}
      <VintageLettering team={r.company} name={p.name} />
    </VintageStock>
  );
}

export type ShareVariant = 'band' | 'button' | 'eyebrow';

/** The picture behind a shared link: the player's name and numbers beside a hand of up to three of their most recent cards,
 * each lettered with the team and the name only, over the portrait, so nothing on a card depends on fitting long text. */
export async function shareImage(S: State, site: string, slug?: string, variant: ShareVariant = 'band') {
  const rs = roles(S), chrome = themeOf(S) === 'chrome';
  const p = S.profile, cs = careerStats(S);
  const roleCards = rs.slice(-3); // up to three, the most recent; the free-agent card stays on the page
  const n = roleCards.length;
  const rots = n === 3 ? [-9, 1, 10] : n === 2 ? [-6, 6] : [1];
  const lefts = n === 3 ? [0, 0.575, 1.15] : n === 2 ? [0.2, 0.95] : [0.575];
  // the vintage stock's pennant, painted in each card's colour ahead of the render (the renderer has no masks or blend modes)
  // the vintage fronts, each baked into one picture (see vintageFront): the team's colours and the portrait for that team
  const fronts = chrome ? [] : await Promise.all(roleCards.map((r) => { const [a, b] = pairFor(S, r.company); return vintageFront(site, a, b, trustedPortrait(portraitFor(S, S.profile, r.company)?.src || '', site)); }));
  const handW = Math.round(CW * 2.15), handH = CH + 40;
  const stat = cs ? [[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']].map(([v, k]) => `${v} ${k}${v === 1 ? '' : 's'}`).join('  ·  ') : '';
  const sub = p.headline || '';
  const first = (p.name || '').trim().split(/\s+/)[0];
  const cta = first ? `View ${first}\u2019s cards and make your own.` : 'View the cards and make your own.';
  // the page around the cards follows the stock, as the site does: vintage's cream and ink, or Chrome's white paper with the foil washed across it, navy and gold
  const T = chrome
    ? { bg: 'linear-gradient(115deg, #fff2f2 0%, #fff8e6 18%, #f0fff2 36%, #eaf7ff 54%, #f5eeff 72%, #fff0f8 90%, #fff2f2 100%)', ink: '#1c1b2a', ink2: '#4a4a5c', muted: '#8a8a9c', red: '#e5322d', accent: '#173a8a', accentInk: '#fff', accentShadow: '3px 3px 0 #f2c230', rule: '#19b2a8', cond: 'Oswald' }
    : { bg: '#f2eee5', ink: '#1c1b18', ink2: '#55524a', muted: '#6b6559', red: '#dc4432', accent: '#1c1b18', accentInk: '#f2eee5', accentShadow: 'none', rule: '#dcd6c8', cond: BARLOW };
  const nameStyle = chrome
    ? { fontFamily: LILITA, fontSize: 64, lineHeight: 1, letterSpacing: '0.01em', color: T.red, textShadow: '4px 4px 0 #1c1b2a', transform: 'skewX(-8deg)', marginBottom: 16, marginLeft: 6 } // the site's name plate: red plate lettering leaning, throwing black
    : { fontFamily: BARLOW, fontSize: 62, lineHeight: 0.98, letterSpacing: '0.02em', textTransform: 'uppercase' as const, marginBottom: 14 };
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: T.bg, color: T.ink, padding: '0 64px', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 1200 - 128 - handW - 24, justifyContent: 'center', marginBottom: variant === 'button' ? 0 : 70 }}>
          {variant === 'eyebrow'
            ? <div style={{ display: 'flex', fontFamily: T.cond, fontSize: 19, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.red, marginBottom: 18 }}>{first ? `View ${first}\u2019s cards · Make your own` : 'View the cards · Make your own'}</div>
            : <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
                <svg width="34" height="34" viewBox="0 0 64 64"><path d={FLAG} fill={T.red} /></svg>
                <div style={{ display: 'flex', marginLeft: 8, fontFamily: LILITA, fontSize: 30, letterSpacing: '0.02em', color: chrome ? T.accent : T.ink }}>CareerCards</div>
              </div>}
          <div style={{ display: 'flex', ...nameStyle }}>{p.name || 'Career'}</div>
          {sub ? <div style={{ display: 'flex', fontFamily: CASLON, fontSize: 30, lineHeight: 1.35, color: T.ink2 }}>{sub}</div> : null}
          {stat ? <div style={{ display: 'flex', marginTop: 18, fontFamily: T.cond, fontSize: 23, letterSpacing: '0.14em', textTransform: 'uppercase', color: chrome ? T.accent : T.muted }}>{stat}</div> : null}
          {variant === 'button' ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', marginTop: 34, background: T.accent, color: T.accentInk, boxShadow: T.accentShadow, fontFamily: T.cond, fontSize: 22, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '13px 22px', borderRadius: chrome ? 6 : 8, whiteSpace: 'nowrap' }}>{first ? `View ${first}\u2019s cards \u2192` : 'View the cards \u2192'}</div>
            <div style={{ display: 'flex', marginTop: 14, fontFamily: CASLON, fontSize: 21, color: T.ink2, whiteSpace: 'nowrap' }}>Then make your own at <span style={{ color: chrome ? T.accent : T.red, marginLeft: 6 }}>careercards.app</span></div>
          </div> : null}
        </div>
        {variant === 'band' ? <div style={{ position: 'absolute', left: 64, right: 64, bottom: 40, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: `2px solid ${T.rule}`, paddingTop: 18 }}>
          <div style={{ display: 'flex', fontFamily: CASLON, fontSize: 25, color: T.ink }}>{cta}</div>
          <div style={{ display: 'flex', fontFamily: T.cond, fontSize: 19, letterSpacing: '0.12em', textTransform: 'uppercase', color: chrome ? T.accent : T.red, textShadow: chrome ? '1.5px 1.5px 0 #f2c230' : 'none' }}>{slug ? 'careercards.app/u/' + slug : 'careercards.app'}</div>
        </div> : null}
        {variant === 'eyebrow' ? <div style={{ position: 'absolute', left: 64, bottom: 44, display: 'flex', alignItems: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 64 64"><path d={FLAG} fill={T.red} /></svg>
          <div style={{ display: 'flex', marginLeft: 7, fontFamily: LILITA, fontSize: 24, letterSpacing: '0.02em', color: chrome ? T.accent : T.ink }}>CareerCards</div>
          <div style={{ display: 'flex', marginLeft: 16, fontFamily: T.cond, fontSize: 19, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>{slug ? 'careercards.app/u/' + slug : 'careercards.app'}</div>
        </div> : null}
        <div style={{ position: 'relative', display: 'flex', width: handW, height: handH, marginRight: 8, marginBottom: variant === 'button' ? 0 : 70 }}>
          {roleCards.map((r, i) => <div key={r.id} style={{ position: 'absolute', left: Math.round(lefts[i] * CW), bottom: 0, width: CW, height: CH, display: 'flex' }}>{chrome ? <ChromeRoleFront S={S} r={r} site={site} rot={rots[i]} /> : <VintageRoleFront S={S} r={r} rot={rots[i]} front={fronts[i]} />}</div>)}
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: await fonts(site) },
  );
}
