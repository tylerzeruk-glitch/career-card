/**
 * The portrait for the art box. A built-in avatar (the example career's 'george') has one PNG per team
 * colour pair, with the shirt recoloured to the frame colour, under /avatars. The single-file preview
 * carries them inline as window.__AVATARS__. A stored portrait (a URL) is used as is for now.
 */
import { frameIndexFor, pairIndexFor, themeOf } from './derived';
import type { Profile, State } from './types';

/** A drawn set: one stored PNG per team colour pair, the address carrying a {pair} slot. */
export const isSet = (avatar: string) => avatar.includes('{pair}');
/** A drawn 90s set: one stored PNG per frame colourway, the address carrying a {frame} slot. */
export const isBust90 = (avatar: string) => avatar.includes('{frame}');
/** A stored photo (fills the box) rather than a bust (a cut-out that sits on the box's colour): the built-ins and drawn portraits are busts. */
export const isPhoto = (avatar: string) => !isSet(avatar) && !isBust90(avatar) && /^(https?:|data:|blob:)/.test(avatar);

export function avatarSrc(avatar: string, pair: number): string {
  if (isSet(avatar)) return avatar.replace('{pair}', String(pair));
  if (isPhoto(avatar)) return avatar;
  const key = avatar + '-' + pair;
  return builtIn(key);
}

/** The 90s portrait for a frame colourway: a drawn set's PNG for it, a built-in's, or a stored photo as is. */
export function avatar90Src(avatar: string, frame: number): string {
  if (isBust90(avatar)) return avatar.replace('{frame}', String(frame));
  if (isPhoto(avatar)) return avatar;
  return builtIn(avatar + '-90s-' + frame);
}

function builtIn(key: string): string {
  const inline = typeof window !== 'undefined' ? (window as unknown as { __AVATARS__?: Record<string, string> }).__AVATARS__ : undefined;
  return inline?.[key] || '/avatars/' + key + '.webp'; // a PNG of each sits beside it for the share renderer, which cannot read WebP
}

/** What goes in the art box for this card: each stock its own portrait (Chrome `avatar90`, vintage `avatar`). `photo` means it fills the box. */
export function portraitFor(S: State, p: Profile, company: string): { src: string; photo: boolean } | null {
  if (themeOf(S) === 'chrome') {
    const a = p.avatar90 === undefined ? p.avatar : p.avatar90; // a card from before per-stock portraits: the vintage one stands in
    if (!a) return null;
    if (isSet(a)) return { src: avatarSrc(a, pairIndexFor(S, company)), photo: false };
    return { src: avatar90Src(a, frameIndexFor(S, company)), photo: isPhoto(a) };
  }
  if (p.avatar) return { src: avatarSrc(p.avatar, pairIndexFor(S, company)), photo: isPhoto(p.avatar) };
  return null;
}

/** The profile with the Chrome stock holding its own portrait, so a change to the vintage one stays there. */
export const ownChrome = (p: Profile): Profile => (p.avatar90 === undefined ? { ...p, avatar90: p.avatar ?? '', photo90: p.photo } : p);
