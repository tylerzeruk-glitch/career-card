'use client';
import { useEffect, useRef, useState } from 'react';
import type { CardTheme, State } from '@/lib/types';
import { roles, themeOf } from '@/lib/derived';
import { useCard } from './store';
import { FreeCard, RoleCard } from './Cards';

/** The looks on offer, in the order they are shown. */
export const THEMES: { key: CardTheme; name: string; note: string }[] = [
  { key: 'vintage', name: 'Vintage', note: 'Cream stock, a pennant and a starburst, like a card from the fifties.' },
  { key: 'v2', name: 'Vintage V2', note: 'The vintage card on a printed stock: cream paper, a yellow frame around the portrait, the team on a red pennant and the position on a star.' },
  { key: 'chrome', name: 'Chrome', note: 'A holographic border, a cream photo panel and the name on a red plate, like a card from a nineties pack. Hover a card to see the foil catch the light.' },
];

/**
 * Styles still being tried out are offered only to the accounts named in NEXT_PUBLIC_STYLE_TESTERS (user
 * ids, comma-separated); with the variable unset, every build offers every style. A saved pick is kept
 * whatever the list says, so a tester's public page and shared picture keep the look for everyone.
 */
const TRIAL: CardTheme[] = ['chrome', 'v2'];
const testers = (process.env.NEXT_PUBLIC_STYLE_TESTERS || '').split(',').map((s) => s.trim()).filter(Boolean);
export const offered = (userId: string | undefined, cur: CardTheme) => THEMES.filter((t) => !TRIAL.includes(t.key) || t.key === cur || !testers.length || (userId && testers.includes(userId)));

/**
 * The card style, picked from the header: a round button carrying a chip of the current stock opens a
 * popover with a miniature of the player's own first card in each look. The pick applies at once and is
 * saved with the card; it reaches every card, the public page and the picture behind a shared link.
 * With only one style on offer the button is not shown.
 */
export function StylePicker() {
  const { S, update, user } = useCard();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  const cur = themeOf(S), first = roles(S)[0], list = offered(user?.id, cur);
  const pick = (t: CardTheme) => { update((s) => ({ ...s, settings: { ...s.settings, theme: t } }), { keepSample: true }); setOpen(false); };
  if (list.length < 2) return null;
  return (
    <details className="menu stylepick" ref={ref} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className={'btn icon style ' + cur} aria-label={'Card style: ' + (THEMES.find((t) => t.key === cur)?.name || 'Vintage')} title="Card style"><span className="chip" aria-hidden="true"><i /></span></summary>
      <div className="pop">
        <div className="pop-h">Card style</div>
        <div className="swatches" role="radiogroup" aria-label="Card style">
          {list.map((t) => {
            const preview: State = { ...S, settings: { ...S.settings, theme: t.key } };
            return (
              <button key={t.key} type="button" role="radio" aria-checked={cur === t.key} className={'swatch' + (cur === t.key ? ' on' : '')} onClick={() => pick(t.key)} title={t.note}>
                <span className="thumb" aria-hidden="true">{first ? <RoleCard S={preview} r={first} idx={0} total={roles(S).length} /> : <FreeCard S={preview} share />}</span>
                <span className="lbl">{t.name}</span>
              </button>
            );
          })}
        </div>
        <div className="pop-f">{THEMES.find((t) => t.key === cur)?.note} Your page and the picture behind a shared link follow it.</div>
      </div>
    </details>
  );
}
