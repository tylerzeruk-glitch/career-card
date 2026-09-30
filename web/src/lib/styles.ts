import type { CardTheme, State } from './types';
import { themeOf } from './derived';

/** The looks on offer, in the order they are shown. */
export const THEMES: { key: CardTheme; name: string; note: string }[] = [
  { key: 'vintage', name: 'Vintage', note: 'Cream paper, a yellow frame around the portrait, the team on a pennant and the position on a red star, like a card from the sixties.' },
  { key: 'chrome', name: 'Chrome', note: 'A holographic border, a cream photo panel and the name on a red plate, like a card from a nineties pack. Hover a card to see the foil catch the light.' },
];
const KEYS = THEMES.map((t) => t.key);

/**
 * Styles held back: an account may use one only when it is granted it (a row in style_access, made by the project
 * owner, never by the app, e.g. after a purchase). Every other style is open to everyone. Vintage and Chrome are both
 * open; a style added later can be listed here to keep it behind the grant.
 */
export const TRIAL: CardTheme[] = [];

export const isStyle = (v: unknown): v is CardTheme => typeof v === 'string' && (KEYS as string[]).includes(v);

/**
 * The styles an account may use, from its grants. `granted` is null when the grants could not be read (the table not
 * there yet): then the older tester list in NEXT_PUBLIC_STYLE_TESTERS decides, and with that unset every style is open.
 */
export function stylesFor(granted: readonly string[] | null, userId?: string | null): CardTheme[] {
  if (granted) return KEYS.filter((k) => !TRIAL.includes(k) || granted.includes(k));
  const testers = (process.env.NEXT_PUBLIC_STYLE_TESTERS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return KEYS.filter((k) => !TRIAL.includes(k) || !testers.length || (!!userId && testers.includes(userId)));
}

/**
 * The style a public page, its share frame and its picture are drawn in: the one the link asks for (?style=) when the
 * card's owner may use it, else the owner's saved style when they may use that, else vintage. Checked against the
 * owner, never the visitor: anyone may look at a Chrome link, but a link can't put a card in a style its owner hasn't
 * got. `granted` null (the grants not readable yet) trusts the saved style, as before, and opens no other trial style.
 */
export function publicStyle(S: State, granted: readonly string[] | null, asked?: string | null): CardTheme {
  const saved = themeOf(S);
  const may = (k: CardTheme) => !TRIAL.includes(k) || (granted ? granted.includes(k) : k === saved);
  if (isStyle(asked) && may(asked)) return asked;
  return may(saved) ? saved : 'vintage';
}

/** The card drawn in another style: the same card with only its look changed. */
export const inStyle = (S: State, style: CardTheme): State => (themeOf(S) === style ? S : { ...S, settings: { ...S.settings, theme: style } });
