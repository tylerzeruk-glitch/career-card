const GAP = 22, MIN_STRIP = 48, GHOST_W = 48;

/**
 * Lay a shelf out as a deck: overlap the cards from the left just enough to
 * fit, never hiding more than leaves a 48px strip of each; fall back to
 * swiping when even that is not enough. Sets --ml on the shelf, and on
 * `host` the variables that line the group toggle and the resume rows up
 * with the deck (--deck-ml, --fold-ml, --fold-w).
 */
export function layoutDeck(el: HTMLElement, host: HTMLElement | null, opts: { ghost?: boolean } = {}) {
  const kids = [...el.children] as HTMLElement[];
  kids.forEach((k, i) => (k.style.zIndex = String(i + 1)));
  const items = kids.filter((k) => !k.classList.contains('empty-shelf') && !k.classList.contains('ghost'));
  const setVars = (v: Record<string, string>) => host && Object.entries(v).forEach(([k, val]) => (val ? host.style.setProperty(k, val) : host.style.removeProperty(k)));
  const clear = () => setVars({ '--deck-ml': '', '--deck-mr': '', '--fold-ml': '', '--fold-w': '' });
  if (items.length < 2) { el.style.setProperty('--ml', items.length ? GAP + 'px' : '0px'); el.classList.remove('scroll'); clear(); return; }
  const n = items.length, widths = items.map((k) => k.offsetWidth), sum = widths.reduce((a, b) => a + b, 0), cw = widths[0];
  const W = el.clientWidth - 12 - (opts.ghost === false ? 0 : GHOST_W + GAP), need = sum + GAP * (n - 1) - W;
  const ov = need <= 0 ? -GAP : Math.min(cw - MIN_STRIP, need / (n - 1));
  const scroll = need > 0 && need / (n - 1) > cw - MIN_STRIP;
  el.style.setProperty('--ml', -ov + 'px'); el.classList.toggle('scroll', scroll);
  requestAnimationFrame(() => {
    const first = items[0], last = items[n - 1];
    const left = first.offsetLeft, right = last.offsetLeft + last.offsetWidth;
    if (scroll) { clear(); return; }
    const dw = right - left, w = Math.min(dw, Math.max(560, Math.round(dw * 0.84)));
    setVars({ '--deck-ml': left + 'px', '--deck-mr': Math.max(0, el.clientWidth - right) + 'px', '--fold-ml': Math.round(left + (dw - w) / 2) + 'px', '--fold-w': w + 'px' });
  });
}
