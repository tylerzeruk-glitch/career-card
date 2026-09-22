'use client';
import { useEffect, useState } from 'react';
import { useCard } from './store';
import { useUI } from './ui';
import { FreeCard, RoleCard } from './Cards';
import { roles, status } from '@/lib/derived';

/** One card, large, back side up. Arrow keys move along the deck. */
export function Focus({ id, onClose }: { id: string; onClose: () => void }) {
  const { S } = useCard();
  const { openDrawer, setView, timeline } = useUI();
  const rs = roles(S);
  const list = rs.map((r) => r.id).concat(status(S).free ? ['free'] : []);
  const [idx, setIdx] = useState(Math.max(0, list.indexOf(id)));
  const [on, setOn] = useState(false);
  const cur = list[idx];

  // pop in showing the front, then turn to the back so the details are what you land on
  useEffect(() => {
    setOn(false);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { setOn(true); return; }
    const t = setTimeout(() => setOn(true), 160);
    return () => clearTimeout(t);
  }, [cur]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      <div className="hint">Click the card to turn it over · ← → to move · Esc to close</div>
      <button className="nav" title="Previous" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>‹</button>
      <div id="focus-card" key={cur}>
        {cur === 'free' ? (
          <FreeCard S={S} on={on} onClick={() => setOn(!on)} onTimeline={() => { onClose(); setView('timeline'); setTimeout(() => timeline.current?.zoomFreeAgency(), 0); }} />
        ) : role ? (
          <RoleCard S={S} r={role} idx={rs.indexOf(role)} total={rs.length} on={on} onClick={() => setOn(!on)} />
        ) : null}
      </div>
      <button className="nav" title="Next" disabled={idx === list.length - 1} onClick={() => setIdx(idx + 1)}>›</button>
      <button className="btn icon close nav" title="Close" onClick={onClose}>×</button>
      <div className="bar">
        <button className="btn" onClick={() => setOn(!on)}>Flip</button>
        {cur !== 'free' && <button className="btn" onClick={() => { onClose(); openDrawer('role', { roleId: cur }); }}>Edit</button>}
      </div>
    </div>
  );
}
