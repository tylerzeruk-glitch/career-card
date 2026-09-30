import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { State } from '../types';
import { FRAMES, careerStats, codeFor, frameIndexFor, initials, looking, pairFor, roles, status, themeOf } from '../derived';
import { portraitFor } from '../avatar';
import { fitCompany, fitName, fitTitle } from '../fit';

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

function splitName(name: string) {
  const n = (name || '').trim(), i = n.lastIndexOf(' ');
  return i > 0 ? [n.slice(0, i), n.slice(i + 1)] : ['', n];
}


/** The Chrome front has no padding, so its container unit (cqw) is a share of the whole card width, not of the vintage card's padded content. */
const qc = (n: number) => Math.round((n * CW) / 100);
/** The Chrome frame: shares of the card where the printed frame's panel and plate sit, in px. */
const FR = { panelL: Math.round(CW * 0.082), panelT: Math.round(CH * 0.0875), panelW: Math.round(CW * 0.836), panelH: Math.round(CH * 0.684), bustH: Math.round(CH * 0.7114),
  plateL: Math.round(CW * 0.06), plateT: Math.round(CH * 0.786), plateW: Math.round(CW * 0.62), plateH: Math.round(CH * 0.064),
  roleL: Math.round(CW * 0.076), roleT: Math.round(CH * 0.866), roleW: Math.round(CW * 0.62), roleH: Math.round(CH * 0.081) };
/** The plates' top edge crosses the panel's bottom-right corner: the panel's content is clipped to it. */
const PANEL_CLIP = `polygon(0 0, 100% 0, 100% ${Math.round(FR.panelH * 0.923)}px, ${Math.round(FR.panelW * 0.178)}px 100%, 0 100%)`;
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

/** The name on the frame's red plate, which leans up to the right: first name small in gold, surname large in white. */
function ChromePlate({ name }: { name: string }) {
  const { fn, ln, scale } = fitName(name.replace(/,.*$/, ''));
  return (
    <div style={{ position: 'absolute', left: FR.plateL, top: FR.plateT, width: FR.plateW, height: FR.plateH, display: 'flex', alignItems: 'center', paddingLeft: qc(1), transform: turnAbout(-6, FR.plateW, FR.plateH, 0, FR.plateH / 2), whiteSpace: 'nowrap', overflow: 'hidden', ...DBG }}>
      {fn ? <div style={{ display: 'flex', fontFamily: LILITA, fontSize: qc(4.6 * scale), lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#ffe2a8', textShadow: '1px 1px 0 #1c1b18', marginRight: qc(1.8) }}>{fn}</div> : null}
      <div style={{ display: 'flex', fontFamily: LILITA, fontSize: qc(6.8 * scale), lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#fff', textShadow: '1.5px 1.5px 0 #1c1b18' }}>{ln}</div>
    </div>
  );
}

/** The position on the yellow plate under the name, abbreviated when it would not fit. */
function ChromeRole({ title, color }: { title: string; color: string }) {
  const { text, size } = fitTitle(title), k = 1, ring = [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]];
  const base = { position: 'absolute' as const, left: 0, top: 0, width: FR.roleW - qc(2), display: 'flex', fontFamily: LILITA, fontSize: qc(size), lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, overflow: 'hidden' as const };
  return (
    <div style={{ position: 'absolute', left: FR.roleL, top: FR.roleT, width: FR.roleW, height: FR.roleH, display: 'flex', transform: turnAbout(-5.8, FR.roleW, FR.roleH, 0, FR.roleH / 2), ...DBG }}>
      <div style={{ position: 'relative', display: 'flex', left: qc(2), top: Math.round((FR.roleH - qc(size)) / 2 - qc(1.2)), width: FR.roleW - qc(2), height: qc(size) }}>
        {[[0, 0], ...ring].map(([x, y], i) => <div key={'s' + i} style={{ ...base, left: 1.5 + x, top: 2 + y, color: '#1c1b18' }}>{text}</div>)}
        {ring.map(([x, y], i) => <div key={i} style={{ ...base, left: x, top: y, color: '#fff' }}>{text}</div>)}
        <div style={{ ...base, color }}>{text}</div>
      </div>
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

/** The Chrome role card: the photo in the frame's panel, the company as the maker's mark, the position on a navy tag, the name on the plate. */
function ChromeRoleFront({ S, r, site, rot }: { S: State; r: State['roles'][number]; site: string; rot: number }) {
  const p = S.profile;
  const av = portraitFor(S, p, r.company)?.src || '';
  const src = av ? (av.startsWith('/') ? site + av : av) : '';
  const ph = FR.bustH;
  return (
    <ChromeStock site={site} rot={rot} frame={FRAMES[frameIndexFor(S, r.company)].file + '.jpg'}>
      <div style={{ position: 'absolute', left: FR.panelL, top: FR.panelT, width: FR.panelW, height: ph, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', clipPath: BUST_CLIP }}>
        {src ? <div style={{ width: Math.round(ph * 0.97), height: Math.round(ph * 0.97), backgroundImage: `url(${src})`, backgroundSize: `${Math.round(ph * 0.97)}px ${Math.round(ph * 0.97)}px`, backgroundRepeat: 'no-repeat' }} />
          : <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qc(34), letterSpacing: '-0.02em', color: NAVY, marginBottom: qc(30) }}>{initials(p.name) || '?'}</div>}
      </div>
      <ChromeMark text={r.company} color={CREAM} />
      <ChromePlate name={p.name} />
      <ChromeRole title={r.title} color={NAVY} />
    </ChromeStock>
  );
}

/** The Chrome free-agent card: its own purple frame, what the player is open to in the middle of the panel, a line each. */
function ChromeFreeFront({ S, site, rot }: { S: State; site: string; rot: number }) {
  const p = S.profile, open = (p.targets || []).slice(0, 4);
  const longest = Math.max(1, ...(open.length ? open : ['Offers']).flatMap((t) => t.split(/\s+/)).map((w) => w.length));
  const innerW = FR.panelW - 2 * Math.round(FR.panelW * 0.06); // the panel's inner width, in px
  const ADV = 0.92; // an upper-case Lilita letter's advance, as a share of the size, as this renderer sets it
  const openSize = Math.min(7.5, Math.max(4.8, (innerW / CW) * 100 / (longest * ADV))); // cqw: that width over the longest word
  // each target on its own line, or broken into lines that fit, each line centred: the renderer is not trusted to wrap or centre text on its own
  const px = qc(openSize) * ADV, lines: string[] = [];
  for (const t of (open.length ? open : ['Offers'])) {
    let line = '';
    for (const w of t.split(/\s+/)) { const next = line ? line + ' ' + w : w; if (line && next.length * px > innerW) { lines.push(line); line = w; } else line = next; }
    if (line) lines.push(line);
  }
  return (
    <ChromeStock site={site} rot={rot} frame="chrome-free.jpg">
      <div style={{ position: 'absolute', left: FR.panelL, top: FR.panelT, width: FR.panelW, height: FR.panelH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8% 6% 16%', textAlign: 'center', color: NAVY, clipPath: PANEL_CLIP }}>
        <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qc(4.6), letterSpacing: '0.2em', textTransform: 'uppercase', color: RED, marginBottom: qc(3) }}>Open to</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: innerW, fontFamily: LILITA, fontSize: qc(openSize), lineHeight: 1.15, textTransform: 'uppercase' }}>{lines.map((t, i) => <div key={i} style={{ display: 'flex', justifyContent: 'center', width: innerW, whiteSpace: 'nowrap' }}>{t}</div>)}</div>
      </div>
      <ChromeMark text="Free agent" color={CREAM} />
      <ChromePlate name={p.name} />
      <ChromeRole title="Free agent" color={RED} />
    </ChromeStock>
  );
}

/** The vintage stock: shares of the whole card width (the printed front has no padding), as card.css measures it. */
const qv = (n: number) => Math.round((n * CW) / 100);
/** The vintage pennant's mask, fetched once per server, and each tint of it (the mask painted in one colour, card-sized) kept as a data URI. */
const penMasks: Record<string, Promise<Buffer>> = {}, penTints: Record<string, Promise<string>> = {};
function pennantTint(site: string, piece: 'pennant', color: string): Promise<string> {
  const key = piece + color;
  return (penTints[key] ||= (async () => {
    const mask = await (penMasks[piece] ||= fetch(site + '/frames/vintage-' + piece + '.png', { cache: 'force-cache' }).then(async (r) => { if (!r.ok) throw new Error('mask ' + piece + ' ' + r.status); return Buffer.from(await r.arrayBuffer()); }));
    const alpha = await sharp(mask).resize(CW, CH).ensureAlpha().extractChannel(3).png().toBuffer();
    const png = await sharp({ create: { width: CW, height: CH, channels: 3, background: color } }).joinChannel(alpha).png().toBuffer();
    return 'data:image/png;base64,' + png.toString('base64');
  })().catch((e) => { delete penTints[key]; throw e; }));
}
/** The printed stock, turned into the hand like the others, with the pennant painted in the team's colour; the star keeps its printed red. */
function VintageStock({ site, rot, tint, children }: { site: string; rot: number; tint: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, width: CW, height: CH, transformOrigin: `${CW / 2}px ${Math.round(CH * 1.15)}px`, transform: `rotate(${rot}deg)`, display: 'flex', borderRadius: qv(1.4), overflow: 'hidden', backgroundImage: `url(${site}/frames/vintage.jpg)`, backgroundSize: `${CW}px ${CH}px`, backgroundRepeat: 'no-repeat', boxShadow: '-5px 0 14px rgba(0,0,0,.18), 0 10px 26px rgba(0,0,0,.18)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tint} width={CW} height={CH} alt="" style={{ position: 'absolute', left: 0, top: 0 }} />
      {children}
    </div>
  );
}
/** The lettering on the vintage front: the team on the pennant, the code on the star, the name and the position on the paper below the frame. */
/** Text cut to a width by hand: inside a turned card the renderer misplaces an overflow clip, so nothing here overflows. `adv` is a letter's advance as a share of the size. */
function clip(text: string, width: number, size: number, adv: number) {
  const max = Math.floor(width / (size * adv));
  return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)).trimEnd() + '\u2026';
}
function VintageLettering({ team, code, name, role, roleColor }: { team: string; code: string; name: string; role: string; roleColor: string }) {
  const [fn, ln] = splitName(name);
  // the pennant's lettering shrinks to fit its band, to a floor, then is cut; spaces are unbreakable so the renderer never wraps it
  const teamSize = Math.max(qv(3.6), Math.min(qv(6.2), Math.floor(qv(38) / Math.max(1, team.length * 0.8))));
  const teamText = clip(team, qv(38), teamSize, 0.8).replace(/ /g, '\u00a0');
  return (
    <>
      <div style={{ position: 'absolute', left: qv(6.6), top: qv(1.8), width: qv(40), height: qv(10.6), display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', fontFamily: LILITA, fontSize: teamSize, lineHeight: 1, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#fff7e6', textShadow: '1px 1px 0 #1c1b18', whiteSpace: 'nowrap' }}>{teamText}</div>
      </div>
      <div style={{ position: 'absolute', left: qv(76.8), top: qv(82.3), width: qv(22), height: qv(22), display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: qv(1.6), fontFamily: BARLOW, fontSize: qv(6.2), letterSpacing: '0.04em', color: '#fff', textShadow: '0.6px 0.6px 0 rgba(0,0,0,.35)' }}>{code}</div>
      <div style={{ position: 'absolute', left: qv(7), top: qv(101), width: qv(86), display: 'flex', flexDirection: 'column' }}>
        {fn ? <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qv(5), letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b6559' }}>{fn}</div> : null}
        <div style={{ display: 'flex', fontFamily: LILITA, fontSize: qv(10), lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#1c1b18', whiteSpace: 'nowrap' }}>{clip(ln || name || 'Your name', qv(86), qv(10), 0.66)}</div>
      </div>
      <div style={{ position: 'absolute', left: qv(7), top: qv(119.5), width: qv(86), display: 'flex', fontFamily: BARLOW, fontSize: qv(5), lineHeight: 1.2, letterSpacing: '0.1em', textTransform: 'uppercase', color: roleColor, whiteSpace: 'nowrap' }}>{clip(role, qv(86), qv(5), 0.76).replace(/ /g, '\u00a0')}</div>
    </>
  );
}
function VintageRoleFront({ S, r, site, rot, tint }: { S: State; r: State['roles'][number]; site: string; rot: number; tint: string }) {
  const [a, b] = pairFor(S, r.company), p = S.profile;
  const av = portraitFor(S, p, r.company)?.src || '';
  const src = av ? (av.startsWith('/') ? site + av : av) : '';
  const win = { left: qv(6.5), top: qv(15.4), width: qv(87), height: qv(77.8) };
  return (
    <VintageStock site={site} rot={rot} tint={tint}>
      <div style={{ position: 'absolute', ...win, borderRadius: qv(4.6), background: a, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} width={Math.round(win.width * 1.06)} height={Math.round(win.width * 1.06)} alt="" style={{ position: 'absolute', left: -Math.round(win.width * 0.03), top: 0 }} />
          : <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qv(30), letterSpacing: '-0.02em', color: b }}>{initials(p.name) || '?'}</div>}
      </div>
      <VintageLettering team={r.company} code={r.code || codeFor(r.title)} name={p.name} role={r.title} roleColor={b} />
    </VintageStock>
  );
}
function VintageFreeFront({ S, site, rot, tint }: { S: State; site: string; rot: number; tint: string }) {
  const p = S.profile, open = (p.targets || []).slice(0, 3);
  const win = { left: qv(6.5), top: qv(15.4), width: qv(87), height: qv(77.8) };
  return (
    <VintageStock site={site} rot={rot} tint={tint}>
      <div style={{ position: 'absolute', ...win, borderRadius: qv(4.6), background: '#1f2a44', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${qv(6)}px ${qv(8)}px ${qv(14)}px`, textAlign: 'center', color: '#fbf6ea' }}>
        <div style={{ display: 'flex', fontFamily: BARLOW, fontSize: qv(4.6), letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginBottom: qv(3) }}>Open to</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: LILITA, fontSize: qv(6.8), lineHeight: 1.15, textTransform: 'uppercase' }}>{(open.length ? open : ['Offers']).map((t, i) => <div key={i} style={{ display: 'flex' }}>{t}</div>)}</div>
      </div>
      <VintageLettering team="Free agent" code="FA" name={p.name} role="Free agent" roleColor="#dc4432" />
    </VintageStock>
  );
}

/** Up to three cards: the most recent roles, and the free-agent card in the last slot when the player is on the market. */
export type ShareVariant = 'band' | 'button' | 'eyebrow';

export async function shareImage(S: State, site: string, slug?: string, variant: ShareVariant = 'band') {
  const rs = roles(S), st = status(S), free = st.free && looking(S), chrome = themeOf(S) === 'chrome';
  const p = S.profile, cs = careerStats(S);
  const roleCards = rs.slice(free ? -2 : -3);
  const n = roleCards.length + (free ? 1 : 0);
  const rots = n === 3 ? [-9, 1, 10] : n === 2 ? [-6, 6] : [1];
  const lefts = n === 3 ? [0, 0.575, 1.15] : n === 2 ? [0.2, 0.95] : [0.575];
  // the vintage stock's pennant, painted in each card's colour ahead of the render (the renderer has no masks or blend modes)
  const tints: string[] = chrome ? [] : await Promise.all([...roleCards.map((r) => pennantTint(site, 'pennant', pairFor(S, r.company)[1])), ...(free ? [pennantTint(site, 'pennant', '#dc4432')] : [])]);
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
          {roleCards.map((r, i) => <div key={r.id} style={{ position: 'absolute', left: Math.round(lefts[i] * CW), bottom: 0, width: CW, height: CH, display: 'flex' }}>{chrome ? <ChromeRoleFront S={S} r={r} site={site} rot={rots[i]} /> : <VintageRoleFront S={S} r={r} site={site} rot={rots[i]} tint={tints[i]} />}</div>)}
          {free ? <div style={{ position: 'absolute', left: Math.round(lefts[n - 1] * CW), bottom: 0, width: CW, height: CH, display: 'flex' }}>{chrome ? <ChromeFreeFront S={S} site={site} rot={rots[n - 1]} /> : <VintageFreeFront S={S} site={site} rot={rots[n - 1]} tint={tints[n - 1]} />}</div> : null}
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: await fonts(site) },
  );
}
