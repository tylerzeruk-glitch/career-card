'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCard } from './store';
import { useUI } from './ui';
import { FreeCard, RoleCard, SummaryCard, UnderCard } from './Cards';
import { norm, pairFor, roles, runs, status } from '@/lib/derived';

import { layoutDeck } from '@/lib/deck';

/**
 * The shelf: cards overlap from the left just enough to fit the width, never
 * hiding more than leaves a 48px strip of each. Falls back to swiping when
 * even that is not enough. Also lines the group toggle and the resume rows
 * up with the deck by setting CSS variables on the scroller.
 */
export function Deck() {
  const { S, sampleMode, update } = useCard();
  const { openFocus, openDrawer, openImport, setView, timeline } = useUI();
  const shelf = useRef<HTMLDivElement>(null);
  const [openRuns, setOpenRuns] = useState<Set<string>>(() => new Set());
  const rs = roles(S), st = status(S), total = rs.length;

  const layout = useCallback(() => { const el = shelf.current; if (el) layoutDeck(el, el.closest<HTMLElement>('.scroller')); }, []);

  useLayoutEffect(layout);
  useEffect(() => {
    const el = shelf.current; if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(layout); ro.observe(el); return () => ro.disconnect();
  }, [layout]);

  const spread = (key: string) => setOpenRuns((s) => new Set(s).add(key));
  const restack = (key: string) => setOpenRuns((s) => { const n = new Set(s); n.delete(key); return n; });
  const spreadRuns = runs(S).filter((run) => run.roles.length > 1 && openRuns.has(norm(run.company)));
  const onTimeline = () => { setView('timeline'); setTimeout(() => timeline.current?.zoomFreeAgency(), 0); };

  if (!rs.length) {
    return (
      <div className="shelf" ref={shelf}>
        <div className="empty-shelf" style={{ width: '100%' }}>
          No roles on the shelf yet.<br />
          <button className="btn primary" onClick={() => openDrawer('role', { roleId: null })}>Add your first role</button>
          <button className="btn" onClick={() => openImport('linkedin')}>Import LinkedIn or a resume</button>
        </div>
      </div>
    );
  }

  const items: React.ReactNode[] = [];
  if (S.settings.group === 'team') {
    let i = 0;
    runs(S).forEach((run) => {
      const from = i + 1, to = i + run.roles.length, key = norm(run.company), [, b] = pairFor(S, run.company);
      if (run.roles.length === 1 || openRuns.has(key)) {
        run.roles.forEach((r) => {
          const k = i++;
          items.push(
            <div key={r.id} className={'slot' + (run.roles.length > 1 ? ' cont' : '')} style={{ '--b': b } as React.CSSProperties}>
              <RoleCard S={S} r={r} idx={k} total={total} onClick={() => openFocus(r.id)} />
            </div>,
          );
        });
      } else {
        const n = run.roles.length; i += n;
        items.push(
          <div key={'stack-' + key} className="stack" title={n + ' roles · click to spread'} onClick={() => spread(key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spread(key); } }}>
            <SummaryCard S={S} run={run} from={from} to={to} />
            {n > 1 && <UnderCard S={S} company={run.company} which={1} />}
            {n > 2 && <UnderCard S={S} company={run.company} which={2} />}
          </div>,
        );
      }
    });
  } else {
    rs.forEach((r, i) => items.push(<div key={r.id} className="slot"><RoleCard S={S} r={r} idx={i} total={total} onClick={() => openFocus(r.id)} /></div>));
  }
  // in Team view with a stack spread out, a slim tab after the last team gathers everything back up
  if (S.settings.group === 'team' && spreadRuns.length > 0) items.push(<button key="restack" className="ghost restack" title="Gather the spread cards back into their stacks" onClick={() => setOpenRuns(new Set())}><span className="disc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v5h-5" /></svg></span><span className="lbl">Restack</span></button>);
  if (st.free) items.push(<div key="free" className="slot"><FreeCard S={S} onClick={() => openFocus('free')} onTimeline={onTimeline} /></div>);
  items.push(<button key="ghost" className="ghost" title="Add a role" onClick={() => openDrawer('role', { roleId: null })}>+ Add a role</button>);

  const pick = (g: 'role' | 'team') => { setOpenRuns(new Set()); update((s) => ({ ...s, settings: { ...s.settings, group: g } }), { keepSample: true }); };

  return (
    <>
      <div className="shelf-head">
        {sampleMode && (
          <span className="note-inline"><span>Example career</span><button className="btn" onClick={() => { if (confirm('Clear the example career and start empty?')) { update(() => ({ profile: { name: '', headline: '', location: '', summary: '', targets: [], email: '', linkedin: '', education: [], certs: [], skills: [] }, roles: [], events: [], brand: {}, settings: S.settings })); openDrawer('profile'); } }}>Clear</button></span>
        )}
      </div>
      <div className="shelf" ref={shelf} onKeyDown={(e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const card = (e.target as HTMLElement).closest<HTMLElement>('.card[data-id]'); if (card) { e.preventDefault(); openFocus(card.dataset.id!); } }}>
        {items}
      </div>
      {/* the grouping switch: radio dots under the deck, lined up with the first card */}
      <div className="shelf-foot">
        <GroupToggle group={S.settings.group} onPick={pick} />
      </div>
    </>
  );
}

/** By role / By team as two radio dots; the pick is filled red like the dot on the free-agent pill. */
function GroupToggle({ group, onPick }: { group: 'role' | 'team'; onPick: (g: 'role' | 'team') => void }) {
  return (
    <div className="gt-wrap">
      <div className="gt-label" id="group-label">Display cards by</div>
      <div className="gt" id="group-toggle" role="radiogroup" aria-labelledby="group-label">
        {(['role', 'team'] as const).map((g) => (
          <button key={g} role="radio" aria-checked={group === g} className={group === g ? 'on' : ''} onClick={() => onPick(g)}><i aria-hidden="true" />{g === 'role' ? 'Role' : 'Team'}</button>
        ))}
      </div>
    </div>
  );
}
