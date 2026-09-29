/**
 * Cards lean toward the light. With a pointer, one listener on a root element watches every card under it: as the
 * pointer moves over a card, the card gets four custom properties, a tilt (--rx, --ry) and the pointer's place on
 * it (--mx, --my), and the stylesheet does the rest: the inner face rotates with the tilt on top of the flip, a
 * soft glare follows the pointer, and on a foil card the gradients slide with it. Off the card the properties
 * reset and the card eases flat.
 *
 * Touch screens get no tilt: there is no pointer to follow, and driving it from the phone's motion sensors
 * would mean a permission prompt on iOS every visit. Nothing happens when motion is reduced either.
 *
 * The tilt stands down while a card is busy: turning over, flying into focus, popping in, or sliding along the
 * shelf. The lean and the flip share one transform, and the lean's quick transition would otherwise cut the
 * flip short (the faces swap at the flip's midpoint, so a card that turned in a tenth of a second showed
 * nothing for the rest). A busy card eases flat and is left alone until it has settled.
 */
const MAX_X = 10, MAX_Y = 13; // degrees of lean, top-to-bottom and side-to-side
const VARS = ['--rx', '--ry', '--mx', '--my', '--glare'];

export function attachTilt(root: HTMLElement): () => void {
  if (typeof window === 'undefined') return () => {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  return attachPointer(root);
}

const FLIP_MS = 700; // the flip's transition (.6s in card.css) plus a little slack
const MOVE_MS = 600; // longer than any transition that carries a card (the fly into focus is 420ms)

function attachPointer(root: HTMLElement): () => void {
  let cur: HTMLElement | null = null, raf = 0, last: PointerEvent | null = null;
  const clear = (el: HTMLElement) => { el.classList.remove('tilt'); for (const k of VARS) el.style.removeProperty(k); };
  // a card is left alone until this time; letting go of it now means its lean eases out along with whatever it is doing
  const busy = new WeakMap<HTMLElement, number>();
  const isBusy = (el: HTMLElement) => (busy.get(el) ?? 0) > performance.now();
  const hold = (el: HTMLElement, ms: number) => {
    busy.set(el, Math.max(busy.get(el) ?? 0, performance.now() + ms));
    if (el === cur) { clear(cur); cur = null; }
  };
  const cardsIn = (el: Element): HTMLElement[] => el.matches('.card') ? [el as HTMLElement] : Array.from(el.querySelectorAll<HTMLElement>('.card'));
  const paint = () => {
    raf = 0;
    if (!cur || !last) return;
    const r = cur.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.min(1, Math.max(0, (last.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (last.clientY - r.top) / r.height));
    cur.style.setProperty('--ry', ((x - 0.5) * 2 * MAX_Y).toFixed(2) + 'deg');
    cur.style.setProperty('--rx', ((0.5 - y) * 2 * MAX_X).toFixed(2) + 'deg');
    cur.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    cur.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    cur.style.setProperty('--glare', '1');
  };
  const onMove = (e: PointerEvent) => {
    const card = (e.target as Element | null)?.closest?.('.card') as HTMLElement | null;
    const hit = card && !card.classList.contains('under1') && !card.classList.contains('under2') && !isBusy(card) ? card : null;
    if (hit !== cur) { if (cur) clear(cur); cur = hit; if (cur) cur.classList.add('tilt'); }
    if (!cur) return;
    last = e;
    if (!raf) raf = requestAnimationFrame(paint);
  };
  const onLeave = () => { if (cur) clear(cur); cur = null; };
  // a press on a card is what turns it over or opens it: let go before the click lands so the flip starts flat
  const onDown = (e: PointerEvent) => { const card = (e.target as Element | null)?.closest?.('.card') as HTMLElement | null; if (card) hold(card, FLIP_MS); };
  // the flip itself (class "on" comes or goes), however it was triggered
  const flips = new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.target as HTMLElement;
      if (!el.classList?.contains('card')) continue;
      const was = /(?:^|\s)on(?:\s|$)/.test(m.oldValue ?? ''), is = el.classList.contains('on');
      if (was !== is) hold(el, FLIP_MS);
    }
  });
  flips.observe(root, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
  // a card being carried somewhere: the holder flying into focus, the shelf sliding, a stack spreading (the lean's own transition is on .inner and is not this)
  const onTransition = (e: TransitionEvent) => {
    const t = e.target as Element | null;
    if (!t || e.propertyName !== 'transform' || t.matches('.card .inner')) return;
    for (const c of cardsIn(t)) hold(c, MOVE_MS);
  };
  // the pop into focus
  const onAnimation = (e: AnimationEvent) => { const t = e.target as Element | null; if (t) for (const c of cardsIn(t)) hold(c, MOVE_MS); };
  root.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointerdown', onDown, { passive: true });
  root.addEventListener('transitionstart', onTransition);
  root.addEventListener('animationstart', onAnimation);
  return () => {
    root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave); root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('transitionstart', onTransition); root.removeEventListener('animationstart', onAnimation);
    flips.disconnect();
    if (cur) clear(cur); if (raf) cancelAnimationFrame(raf);
  };
}
