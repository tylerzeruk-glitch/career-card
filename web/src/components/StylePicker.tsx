'use client';
import { useEffect, useRef, useState } from 'react';
import type { CardTheme, State } from '@/lib/types';
import { roles, themeOf } from '@/lib/derived';
import { useCard } from './card-context';
import { THEMES } from '@/lib/styles';
import { FreeCard, RoleCard } from './Cards';

/** The styles offered to this account: those it may use (see lib/styles.ts), and the one it has, whatever the grants now say. */
export const offered = (styles: CardTheme[], cur: CardTheme) => THEMES.filter((t) => styles.includes(t.key) || t.key === cur);

/**
 * The card style, picked from the header: a round button carrying a chip of the current stock opens a
 * popover with a miniature of the player's own first card in each look. Pointing at a look describes it below;
 * a click applies it at once and saves it with the card; it reaches every card, the public page and the picture behind a shared link.
 * With only one style on offer the button is not shown.
 */
export function StylePicker() {
  const { S, update, styles } = useCard();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<CardTheme | null>(null); // the style under the pointer or focus, previewed below until clicked
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (!open) setShown(null); }, [open]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  const cur = themeOf(S), first = roles(S)[0], list = offered(styles, cur);
  const pick = (t: CardTheme) => { update((s) => ({ ...s, settings: { ...s.settings, theme: t } }), { keepSample: true }); setOpen(false); };
  if (list.length < 2) return null;
  const show = shown || cur;
  return (
    <details className="menu stylepick" ref={ref} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className={'btn icon style ' + cur} aria-label={'Card style: ' + (THEMES.find((t) => t.key === cur)?.name || 'Vintage')} title="Card style"><span className="chip" aria-hidden="true" /></summary>
      <div className="pop">
        <div className="pop-h">Card style</div>
        <div className="swatches" role="radiogroup" aria-label="Card style" onMouseLeave={() => setShown(null)}>
          {list.map((t) => {
            const preview: State = { ...S, settings: { ...S.settings, theme: t.key } };
            return (
              <button key={t.key} type="button" role="radio" aria-checked={cur === t.key} className={'swatch' + (cur === t.key ? ' on' : '')} onClick={() => pick(t.key)}
                onMouseEnter={() => setShown(t.key)} onFocus={() => setShown(t.key)} onBlur={() => setShown(null)}>
                <span className="thumb" aria-hidden="true">{first ? <RoleCard S={preview} r={first} idx={0} total={roles(S).length} /> : <FreeCard S={preview} share />}</span>
                <span className="lbl">{t.name}</span>
              </button>
            );
          })}
        </div>
        <div className="pop-f" aria-live="polite">{THEMES.find((t) => t.key === show)?.note} Your page shows it, unless a link you share asks for another.</div>
      </div>
    </details>
  );
}
