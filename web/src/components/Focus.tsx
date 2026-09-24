'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCard } from './store';
import { useUI } from './ui';
import { FreeCard, RoleCard } from './Cards';
import { roles, status } from '@/lib/derived';
import type { State } from '@/lib/types';

const FLY_MS = 420, POP_MS = 250;

/** The app's focus: wired to the document and the drawer. */
export function Focus({ id, onClose }: { id: string; onClose: () => void }) {
  const { S } = useCard();
  const { openDrawer, setView, timeline } = useUI();
  return (
    <FocusView S={S} id={id} onClose={onClose}
      onEdit={(cur) => (cur === 'free' ? openDrawer('profile') : openDrawer('role', { roleId: cur }))}
      onTimeline={() => { onClose(); setView('timeline'); setTimeout(() => timeline.current?.zoomFreeAgency(), 0); }} />
  );
}

/**
 * One card, large, back side up. Opens by flying out of its place in the deck, then turns over. Arrow keys move along
 * the deck. `share` is the public page: no editing, and the free-agent card hides the hunt.
 */
export function FocusView({ S, id, onClose, share, onEdit, onTimeline }: { S: State; id: string; onClose: () => void; share?: boolean; onEdit?: (cur: string) => void; onTimeline?: () => void }) {
  const rs = roles(S);
  const list = rs.map((r) => r.id).concat(status(S).free ? ['free'] : []);
  const [idx, setIdx] = useState(Math.max(0, list.indexOf(id)));
  const [on, setOn] = useState(false);
  const [pop, setPop] = useState(false);
  const first = useRef(true);
  const holder = useRef<HTMLDivElement>(null);
  const cur = list[idx];

  // First open: fly from the deck card's spot to the centre, land, then turn over.
  // Moving along the deck: a quick pop, then turn over. Reduced motion: straight to the back.
  useLayoutEffect(() => {
    setOn(false); setPop(false);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setOn(true); return; }
    const el = holder.current;
    const src = first.current ? document.querySelector<HTMLElement>(`.shelf .card[data-id="${cur}"]`) : null;
    first.current = false;
    let wait = POP_MS;
    if (el && src) {
      const s = src.getBoundingClientRect(), d = el.getBoundingClientRect();
      if (s.width && d.width) {
        el.style.transition = 'none';
        el.style.transform = `translate(${s.left + s.width / 2 - (d.left + d.width / 2)}px, ${s.top + s.height / 2 - (d.top + d.height / 2)}px) scale(${s.width / d.width})`;
        void el.offsetWidth; // commit the start position before animating away from it
        el.style.transition = `transform ${FLY_MS}ms cubic-bezier(.2,.7,.2,1)`;
        el.style.transform = 'translate(0,0) scale(1)';
        wait = FLY_MS + 40;
      }
    } else setPop(true);
    const t = setTimeout(() => setOn(true), wait);
    return () => clearTimeout(t);
  }, [cur]);

  // The deck card this one stands for is lifted out of the deck while the big one is up (re-applied after edits re-render the deck).
  useEffect(() => {
    const deckCard = document.querySelector<HTMLElement>(`.shelf .card[data-id="${cur}"]`);
    if (!deckCard) return;
    deckCard.style.visibility = 'hidden';
    return () => { deckCard.style.visibility = ''; };
  }, [cur, S]);

  // The role was deleted from the drawer, or the list shrank under us: nothing left to show.
  useEffect(() => { if (!cur || (cur !== 'free' && !rs.some((r) => r.id === cur))) onClose(); }, [cur, rs, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While the drawer is open the keys belong to the form; Escape closes the drawer (handled by the shell), not the card.
      if (document.body.classList.contains('drawer-open')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(list.length - 1, i + 1));
      else if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).closest('#focus-card')) { e.preventDefault(); setOn((o) => !o); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [list.length, onClose]);

  if (!cur) return null;
  const role = rs.find((r) => r.id === cur);
  return (
    <div className="focus" id="focus" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="nav" title="Previous" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>‹</button>
      <div className="column">
        <div className="hint">Click the card to turn it over · ← → to move · Esc to close</div>
        <div id="focus-card" className={pop ? 'pop' : ''} key={cur} ref={holder}>
          {cur === 'free' ? (
            <FreeCard S={S} on={on} share={share} onClick={() => setOn(!on)} onTimeline={onTimeline} />
          ) : role ? (
            <RoleCard S={S} r={role} idx={rs.indexOf(role)} total={rs.length} on={on} onClick={() => setOn(!on)} />
          ) : null}
        </div>
        <div className="bar">
          <button className="fbtn" title="Turn the card over" aria-label="Turn the card over" onClick={() => setOn(!on)}><FlipIcon /></button>
          {onEdit && <button className="fbtn" title={cur !== 'free' ? 'Edit this role' : 'Edit profile'} aria-label={cur !== 'free' ? 'Edit this role' : 'Edit profile'} onClick={() => onEdit(cur)}><PencilIcon /></button>}
          <button className="fbtn" title="Close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </div>
      </div>
      <button className="nav" title="Next" disabled={idx === list.length - 1} onClick={() => setIdx(idx + 1)}>›</button>
    </div>
  );
}

/** Two arrows chasing each other: turn the card over. */
function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}
function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 13.5-5.8" /><path d="M17.5 2.5v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.5 5.8" /><path d="M6.5 21.5v-4h4" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M13.5 8.5l3 3" />
    </svg>
  );
}
