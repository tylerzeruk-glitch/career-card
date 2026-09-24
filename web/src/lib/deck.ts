import { centerOn, shelfItems } from '@/components/ShelfDots';

const GAP = 22, MIN_STRIP = 48;
export const PHONE = '(max-width: 700px)';

/**
 * Lay a shelf out as a deck: overlap the cards from the left just enough to
 * fit, never hiding more than leaves a 48px strip of each; fall back to
 * swiping when even that is not enough. Sets --ml on the shelf, and on
 * `host` the variables that line the group toggle and the resume rows up
 * with the deck's left edge and width (--deck-ml, --fold-ml, --fold-w).
 */
export function layoutDeck(el: HTMLElement, host: HTMLElement | null, opts: { ghost?: boolean } = {}) {
  const kids = [...el.children] as HTMLElement[];
  kids.forEach((k, i) => (k.style.zIndex = String(i + 1)));
  const items = kids.filter((k) => !k.classList.contains('empty-shelf') && !k.classList.contains('ghost'));
  const setVars = (v: Record<string, string>) => host && Object.entries(v).forEach(([k, val]) => (val ? host.style.setProperty(k, val) : host.style.removeProperty(k)));
  const clear = () => setVars({ '--deck-ml': '', '--fold-ml': '', '--fold-w': '' });
  // a phone: a swipe carousel instead of a deck (styles under .shelf.swipe), parked on the newest card the first time
  if (typeof window !== 'undefined' && window.matchMedia(PHONE).matches) {
    el.classList.add('swipe'); el.classList.remove('scroll'); el.style.setProperty('--ml', GAP + 'px'); clear();
    if (!el.dataset.parked && items.length) { el.dataset.parked = '1'; const cards = shelfItems(el); centerOn(el, cards[cards.length - 1], false); }
    return;
  }
  el.classList.remove('swipe');
  if (items.length < 2) { el.style.setProperty('--ml', items.length ? GAP + 'px' : '0px'); el.classList.remove('scroll'); clear(); return; }
  const n = items.length, widths = items.map((k) => k.offsetWidth), sum = widths.reduce((a, b) => a + b, 0), cw = widths[0];
  // the slim tabs (Add a role, Restack) take their real width plus their left margin
  const tabs = kids.filter((k) => k.classList.contains('ghost')).reduce((a, k) => a + k.offsetWidth + (parseFloat(getComputedStyle(k).marginLeft) || GAP), 0);
  const W = el.clientWidth - 12 - tabs, need = sum + GAP * (n - 1) - W;
  const ov = need <= 0 ? -GAP : Math.min(cw - MIN_STRIP, need / (n - 1));
  const scroll = need > 0 && need / (n - 1) > cw - MIN_STRIP;
  el.style.setProperty('--ml', -ov + 'px'); el.classList.toggle('scroll', scroll);
  requestAnimationFrame(() => {
    if (scroll || !host) { clear(); return; }
    // measured against the host's content box, which is what the rows' margin-left is relative to
    const first = items[0].getBoundingClientRect(), last = items[n - 1].getBoundingClientRect(), hr = host.getBoundingClientRect();
    const left = Math.round(first.left - hr.left - (parseFloat(getComputedStyle(host).paddingLeft) || 0)), dw = Math.round(last.right - first.left);
    // the resume rows sit under the deck, flush with its left edge and as wide as it is
    setVars({ '--deck-ml': left + 'px', '--fold-ml': left + 'px', '--fold-w': dw + 'px' });
  });
}
