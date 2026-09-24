'use client';
import { useCallback, useEffect, useState, type RefObject } from 'react';

/** The shelf's children that are cards or stacks: not the add-a-role tab, not the empty state. */
export const shelfItems = (el: HTMLElement) => ([...el.children] as HTMLElement[]).filter((k) => !k.classList.contains('ghost') && !k.classList.contains('empty-shelf'));

/** Scroll the shelf so an item sits in the middle, without moving the page. */
export function centerOn(el: HTMLElement, k: HTMLElement, smooth = true) {
  const left = k.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft - (el.clientWidth - k.offsetWidth) / 2;
  el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
}

/** On a phone the shelf is a swipe carousel, one card at a time; these dots say where you are and jump on tap. Hidden at wider widths (CSS). */
export function ShelfDots({ shelf, count }: { shelf: RefObject<HTMLDivElement | null>; count: number }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const el = shelf.current; if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect(), mid = r.left + r.width / 2;
      let best = 0, d = Infinity;
      shelfItems(el).forEach((k, i) => { const b = k.getBoundingClientRect(), dd = Math.abs(b.left + b.width / 2 - mid); if (dd < d) { d = dd; best = i; } });
      setCur(best);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [shelf, count]);
  const go = useCallback((i: number) => { const el = shelf.current; if (!el) return; const k = shelfItems(el)[i]; if (k) centerOn(el, k); }, [shelf]);
  if (count < 2) return null;
  return (
    <div className="shelf-dots" aria-label="Which card">
      {Array.from({ length: count }, (_, i) => <button key={i} type="button" className={i === cur ? 'on' : ''} aria-label={'Card ' + (i + 1) + ' of ' + count} aria-current={i === cur ? 'true' : undefined} onClick={() => go(i)} />)}
    </div>
  );
}
