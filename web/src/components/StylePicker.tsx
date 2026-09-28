'use client';
import { useEffect, useRef, useState } from 'react';
import type { CardTheme, State } from '@/lib/types';
import { roles, themeOf } from '@/lib/derived';
import { useCard } from './store';
import { FreeCard, RoleCard } from './Cards';

/** The looks on offer, in the order they are shown. */
export const THEMES: { key: CardTheme; name: string; note: string }[] = [
  { key: 'vintage', name: 'Vintage', note: 'Cream stock, a pennant and a starburst, like a card from the fifties.' },
  { key: 'chrome', name: 'Chrome 90s', note: 'Black metallic stock, a foil slash and a chrome nameplate. Hover a card to see the foil catch the light.' },
];

/**
 * The card style, picked from the header: a round button carrying a chip of the current stock opens a
 * popover with a miniature of the player's own first card in each look. The pick applies at once and is
 * saved with the card; it reaches every card, the public page and the picture behind a shared link.
 */
export function StylePicker() {
  const { S, update } = useCard();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  const cur = themeOf(S), first = roles(S)[0];
  const pick = (t: CardTheme) => { update((s) => ({ ...s, settings: { ...s.settings, theme: t } }), { keepSample: true }); setOpen(false); };
  return (
    <details className="menu stylepick" ref={ref} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className={'btn icon style ' + cur} aria-label={'Card style: ' + (THEMES.find((t) => t.key === cur)?.name || 'Vintage')} title="Card style"><span className="chip" aria-hidden="true"><i /></span></summary>
      <div className="pop">
        <div className="pop-h">Card style</div>
        <div className="swatches" role="radiogroup" aria-label="Card style">
          {THEMES.map((t) => {
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
