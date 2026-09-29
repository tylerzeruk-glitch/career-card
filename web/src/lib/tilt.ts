/**
 * Cards lean toward the light. With a pointer, one listener on a root element watches every card under it: as the
 * pointer moves over a card, the card gets four custom properties, a tilt (--rx, --ry) and the pointer's place on
 * it (--mx, --my), and the stylesheet does the rest: the inner face rotates with the tilt on top of the flip, a
 * soft glare follows the pointer, and on a foil card the gradients slide with it. Off the card the properties
 * reset and the card eases flat.
 *
 * Touch screens get no tilt: there is no pointer to follow, and driving it from the phone's motion sensors
 * would mean a permission prompt on iOS every visit. Nothing happens when motion is reduced either.
 */
const MAX_X = 10, MAX_Y = 13; // degrees of lean, top-to-bottom and side-to-side
const VARS = ['--rx', '--ry', '--mx', '--my', '--glare'];

export function attachTilt(root: HTMLElement): () => void {
  if (typeof window === 'undefined') return () => {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  return attachPointer(root);
}

function attachPointer(root: HTMLElement): () => void {
  let cur: HTMLElement | null = null, raf = 0, last: PointerEvent | null = null;
  const clear = (el: HTMLElement) => { el.classList.remove('tilt'); for (const k of VARS) el.style.removeProperty(k); };
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
    const hit = card && !card.classList.contains('under1') && !card.classList.contains('under2') ? card : null;
    if (hit !== cur) { if (cur) clear(cur); cur = hit; if (cur) cur.classList.add('tilt'); }
    if (!cur) return;
    last = e;
    if (!raf) raf = requestAnimationFrame(paint);
  };
  const onLeave = () => { if (cur) clear(cur); cur = null; };
  root.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerleave', onLeave);
  return () => { root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerleave', onLeave); if (cur) clear(cur); if (raf) cancelAnimationFrame(raf); };
}
