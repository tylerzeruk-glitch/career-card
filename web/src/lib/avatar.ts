/**
 * The portrait for the art box. A built-in avatar (the example career's 'george') has one PNG per team
 * colour pair, with the shirt recoloured to the frame colour, under /avatars. The single-file preview
 * carries them inline as window.__AVATARS__. A stored portrait (a URL) is used as is for now.
 */
import { pairIndexFor, themeOf } from './derived';
import type { Profile, State } from './types';

/** A drawn set: one stored PNG per team colour pair, the address carrying a {pair} slot. */
export const isSet = (avatar: string) => avatar.includes('{pair}');
/** A drawn 90s portrait: one stored PNG, named for its style (see the pick route). */
export const isBust90 = (avatar: string) => /\/90s\.png(?:[?#]|$)/.test(avatar);
/** A stored photo (fills the box) rather than a bust (a cut-out that sits on the box's colour): the built-ins and drawn portraits are busts. */
export const isPhoto = (avatar: string) => !isSet(avatar) && !isBust90(avatar) && /^(https?:|data:|blob:)/.test(avatar);

export function avatarSrc(avatar: string, pair: number): string {
  if (isSet(avatar)) return avatar.replace('{pair}', String(pair));
  if (isPhoto(avatar)) return avatar;
  const key = avatar + '-' + pair;
  return builtIn(key);
}

/** The 90s portrait: a stored image as is, or a built-in's single PNG (it is not recoloured per team; the frame carries the colours). */
export function avatar90Src(avatar: string): string {
  return /^(https?:|data:|blob:)/.test(avatar) ? avatar : builtIn(avatar + '-90s');
}

function builtIn(key: string): string {
  const inline = typeof window !== 'undefined' ? (window as unknown as { __AVATARS__?: Record<string, string> }).__AVATARS__ : undefined;
  return inline?.[key] || '/avatars/' + key + '.png';
}

/** What goes in the art box for this card: on the Chrome 90s stock the 90s portrait when there is one, else the usual. `photo` means it fills the box. */
export function portraitFor(S: State, p: Profile, company: string): { src: string; photo: boolean } | null {
  if (themeOf(S) === 'chrome' && p.avatar90) return { src: avatar90Src(p.avatar90), photo: isPhoto(p.avatar90) };
  if (p.avatar) return { src: avatarSrc(p.avatar, pairIndexFor(S, company)), photo: isPhoto(p.avatar) };
  return null;
}
