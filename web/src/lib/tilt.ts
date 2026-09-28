/**
 * Cards lean toward the light. With a pointer, one listener on a root element watches every card under it: as the
 * pointer moves over a card, the card gets four custom properties, a tilt (--rx, --ry) and the pointer's place on
 * it (--mx, --my), and the stylesheet does the rest: the inner face rotates with the tilt on top of the flip, a
 * soft glare follows the pointer, and on a foil card the gradients slide with it. Off the card the properties
 * reset and the card eases flat.
 *
 * On a phone there is no pointer to follow, so the phone's own tilt drives the same properties, set on the root so
 * every card on screen leans together like a hand of cards catching the light. iOS grants motion access only
 * after a tap, so it is asked for on the first tap in the app; a refusal is remembered for the session.
 * Nothing happens when motion is reduced.
 */
const MAX_X = 10, MAX_Y = 13; // degrees of lean, top-to-bottom and side-to-side
const VARS = ['--rx', '--ry', '--mx', '--my', '--glare'];

export function attachTilt(root: HTMLElement): () => void {
  if (typeof window === 'undefined') return () => {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) return attachPointer(root);
  return attachGyro(root);
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

const RANGE = 28; // degrees of phone tilt that reach the full lean
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function attachGyro(root: HTMLElement): () => void {
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!D) return () => {};
  let base: number | null = null, raf = 0, on = false, listening = false;
  const target = { rx: 0, ry: 0 }, cur = { rx: 0, ry: 0 };
  const paint = () => {
    raf = 0;
    cur.rx += (target.rx - cur.rx) * 0.16; cur.ry += (target.ry - cur.ry) * 0.16;
    root.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
    root.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
    root.style.setProperty('--mx', (50 + (cur.ry / MAX_Y) * 50).toFixed(1) + '%');
    root.style.setProperty('--my', (50 - (cur.rx / MAX_X) * 50).toFixed(1) + '%');
    root.style.setProperty('--glare', '1');
    if (Math.abs(target.rx - cur.rx) > 0.05 || Math.abs(target.ry - cur.ry) > 0.05) raf = requestAnimationFrame(paint);
  };
  const onOri = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // the resting angle drifts slowly toward however the phone is being held, so the cards settle flat again when it is still
    if (base == null) base = e.beta; else base += (e.beta - base) * 0.02;
    const landscape = Math.abs(window.orientation ?? 0) === 90 || (screen.orientation?.type || '').startsWith('landscape');
    const side = landscape ? e.beta - base : e.gamma, fore = landscape ? e.gamma : e.beta - base;
    target.ry = clamp(side, -RANGE, RANGE) / RANGE * MAX_Y;
    target.rx = -clamp(fore, -RANGE, RANGE) / RANGE * MAX_X;
    if (!on) { on = true; root.classList.add('gyro'); }
    if (!raf) raf = requestAnimationFrame(paint);
  };
  const start = () => { if (listening) return; listening = true; window.addEventListener('deviceorientation', onOri); };
  const ask = () => {
    root.removeEventListener('click', ask);
    D.requestPermission!().then((r) => { if (r === 'granted') start(); else try { sessionStorage.setItem('cc-gyro', 'no'); } catch {} }).catch(() => {});
  };
  if (typeof D.requestPermission === 'function') { // iOS: motion access follows a tap
    let refused = false; try { refused = sessionStorage.getItem('cc-gyro') === 'no'; } catch {}
    if (refused) return () => {};
    root.addEventListener('click', ask);
  } else start();
  return () => {
    root.removeEventListener('click', ask);
    if (listening) window.removeEventListener('deviceorientation', onOri);
    if (raf) cancelAnimationFrame(raf);
    root.classList.remove('gyro'); for (const k of VARS) root.style.removeProperty(k);
  };
}
