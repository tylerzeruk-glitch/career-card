'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser, CloudCard } from '@/lib/types';
import { careerStats, status } from '@/lib/derived';
import { CardProvider, useCard } from './store';
import { UICtx, useUI, type DrawerTab, type ImportTab, type TimelineApi, type UI } from './ui';
import { Deck } from './Deck';
import { Fold } from './Fold';
import { Focus } from './Focus';
import { Timeline } from './Timeline';
import { Drawer, type DrawerState } from './Drawer';
import { BackupDialog, HelpDialog, ImportDialog } from './dialogs';

export function CareerCardApp({ user, cloud }: { user: AuthUser | null; cloud: CloudCard | null }) {
  return (
    <CardProvider user={user} cloud={cloud}>
      <Shell />
    </CardProvider>
  );
}

function Shell() {
  const { S, update, flashMsg, migration, migrate } = useCard();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, tab: 'role', roleId: null, eventId: null, prefill: null, nonce: 0 });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [imp, setImp] = useState<{ open: boolean; tab: ImportTab }>({ open: false, tab: 'linkedin' });
  const [backup, setBackup] = useState(false);
  const [help, setHelp] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timeline = useRef<TimelineApi | null>(null);
  const view = S.settings.view === 'timeline' ? 'timeline' : 'cards';

  const setView = useCallback((v: 'cards' | 'timeline') => update((s) => ({ ...s, settings: { ...s.settings, view: v } }), { keepSample: true }), [update]);
  const openDrawer = useCallback<UI['openDrawer']>((tab: DrawerTab, opts) => setDrawer((d) => ({ open: true, tab, roleId: opts?.roleId ?? (tab === 'role' ? null : d.roleId), eventId: opts?.eventId ?? (tab === 'event' ? null : d.eventId), prefill: opts?.prefill ?? null, nonce: d.nonce + 1 })), []);
  const closeDrawer = useCallback(() => { setDrawer((d) => ({ ...d, open: false })); setSelectedId(null); (document.activeElement as HTMLElement | null)?.blur?.(); }, []);
  const openImport = useCallback((tab: ImportTab = 'linkedin') => setImp({ open: true, tab }), []);

  useEffect(() => { document.body.classList.toggle('drawer-open', drawer.open); }, [drawer.open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && drawer.open && !document.querySelector('dialog[open]')) closeDrawer(); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [drawer.open, closeDrawer]);

  const ui = useMemo<UI>(() => ({ view, setView, openDrawer, closeDrawer, openFocus: setFocusId, openImport, openBackup: () => setBackup(true), openHelp: () => setHelp(true), timeline, selectedId, setSelectedId }), [view, setView, openDrawer, closeDrawer, openImport, selectedId]);

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        <Header />
        {migration && (
          <div className="banner">
            <span>This browser has a card that isn&apos;t in your account yet. Bring it in?</span>
            <button className="btn primary sm" onClick={() => migrate(true)}>Bring it in</button>
            <button className="btn sm" onClick={() => migrate(false)}>Start empty</button>
          </div>
        )}
        <main className="stage">
          {flashMsg && <div className="overlay flash">{flashMsg}</div>}
          <section className="view" hidden={view !== 'cards'}>
            <div className="scroller">
              <Deck />
              <Fold />
            </div>
          </section>
          <section className="view" hidden={view !== 'timeline'}>
            <Timeline active={view === 'timeline'} />
          </section>
        </main>
        {focusId && <Focus id={focusId} onClose={() => setFocusId(null)} />}
        <Drawer d={drawer} />
        <ImportDialog open={imp.open} tab={imp.tab} onClose={() => setImp((i) => ({ ...i, open: false }))} />
        <BackupDialog open={backup} onClose={() => setBackup(false)} />
        <HelpDialog open={help} onClose={() => setHelp(false)} />
      </div>
    </UICtx.Provider>
  );
}

function Header() {
  const { S, user, sync, signOut } = useCard();
  const ui = useUI();
  const p = S.profile, st = status(S), cs = careerStats(S);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); }; document.addEventListener('click', onDoc); return () => document.removeEventListener('click', onDoc); }, []);
  const stat = ([n, k]: [number, string]) => <span key={k}><b>{n}</b>{k}{n === 1 ? '' : 's'}</span>;
  return (
    <header className="topbar">
      <div className="brand">
        <div>
          <div className="namerow">
            <h1>{p.name || 'CareerCards'}</h1>
            {st.free ? <span className="pill"><i />Free agent</span> : <span className="pill active"><i />Active · {st.current.company}</span>}
          </div>
          <div className="sub">{[p.headline, p.location].filter(Boolean).join(' · ')}</div>
          <div className="line">{cs ? ([[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']] as [number, string][]).map(stat) : null}</div>
        </div>
      </div>
      <div className="actions">
        <div className="toggle"><button className={ui.view === 'cards' ? 'on' : ''} onClick={() => ui.setView('cards')}>Cards</button><button className={ui.view === 'timeline' ? 'on' : ''} onClick={() => ui.setView('timeline')}>Timeline</button></div>
        <span style={{ width: 8 }} />
        <button className="btn primary" onClick={() => ui.openDrawer('role', { roleId: null })}>+ Add</button>
        <button className="btn" onClick={() => ui.openImport('linkedin')}>Import</button>
        <button className="btn" onClick={() => ui.openDrawer('profile')}>Profile</button>
        <button className="btn" onClick={() => ui.openDrawer('profile')}>Share</button>
        <details className="menu" ref={menuRef} open={menu} onToggle={(e) => setMenu((e.target as HTMLDetailsElement).open)}>
          <summary className="btn">···</summary>
          <div className="pop" onClick={() => setMenu(false)}>
            {user ? <div className="account" style={{ padding: '6px 10px' }}><span className={'sync ' + sync}><i />{sync === 'saving' ? 'Saving' : sync === 'error' ? 'Not saved' : 'Saved'}</span></div> : null}
            {user ? <div className="who" style={{ padding: '0 10px 6px', fontSize: 12, color: 'var(--muted)' }}>{user.email}</div> : null}
            <button className="btn" onClick={() => ui.openDrawer('log')}>Job-hunt log</button>
            <button className="btn" onClick={ui.openBackup}>Backup / restore</button>
            <button className="btn" onClick={ui.openHelp}>How this works</button>
            {user ? <button className="btn" onClick={signOut}>Sign out</button> : <a className="btn" href="/login">Sign in</a>}
          </div>
        </details>
      </div>
    </header>
  );
}

