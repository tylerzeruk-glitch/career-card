'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthUser, CloudCard, State, Visibility } from '@/lib/types';
import { blank } from '@/lib/derived';
import { sampleState } from '@/lib/sample';
import { clearLocal, loadLocal, saveCloud, saveLocal } from '@/lib/storage';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isDataUrl, liftPortrait } from '@/lib/portrait';

export type SyncStatus = 'local' | 'saved' | 'saving' | 'error';

type Store = {
  S: State;
  sampleMode: boolean;
  user: AuthUser | null;
  slug: string | null;
  visibility: Visibility;
  sync: SyncStatus;
  /** Replace the document (and leave sample mode). */
  update: (fn: (s: State) => State, opts?: { keepSample?: boolean }) => void;
  /** Replace the whole document wholesale (import, restore, migrate). */
  replace: (s: State, sample?: boolean) => void;
  reset: () => void;
  setMeta: (m: { slug?: string | null; visibility?: Visibility }) => Promise<string | null>;
  /** Local data that could be brought into a freshly signed-in account. */
  migration: State | null;
  migrate: (bring: boolean) => void;
  flash: (msg: string) => void;
  flashMsg: string | null;
  signOut: () => Promise<void>;
  /** Deal the example career again (local mode). */
  loadExample: () => void;
};

const Ctx = createContext<Store | null>(null);
export const useCard = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCard outside CardProvider');
  return c;
};

const isReal = (s: State) => s.roles.length > 0 || s.events.length > 0 || !!s.profile.name;
/** Every visit opens on the deck; the view is a choice for the session, not a saved preference. */
const onDeck = (s: State): State => (s.settings.view === 'cards' ? s : { ...s, settings: { ...s.settings, view: 'cards' } });
/** The landing page's "Try it with an example" arrives with ?example (the preview sets a flag instead). */
const wantExample = () => {
  if (typeof window === 'undefined') return false;
  if ((window as unknown as { __EXAMPLE__?: boolean }).__EXAMPLE__) return true;
  if (new URLSearchParams(window.location.search).has('example')) { try { window.history.replaceState(null, '', window.location.pathname); } catch { /* ignore */ } return true; }
  return false;
};

export function CardProvider({ children, user, cloud }: { children: ReactNode; user: AuthUser | null; cloud: CloudCard | null }) {
  // Start from what the server knew (the account's card), else from this browser, else the sample.
  const [S, setS] = useState<State>(() => onDeck(cloud ? cloud.state : blank()));
  const [sampleMode, setSample] = useState(false);
  const [booted, setBooted] = useState(!!cloud);
  const [slug, setSlug] = useState<string | null>(cloud?.slug ?? null);
  const [visibility, setVisibility] = useState<Visibility>(cloud?.visibility ?? 'private');
  const [sync, setSync] = useState<SyncStatus>(user ? 'saved' : 'local');
  const [migration, setMigration] = useState<State | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const flashT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flash = useCallback((msg: string) => {
    setFlashMsg(msg);
    if (flashT.current) clearTimeout(flashT.current);
    flashT.current = setTimeout(() => setFlashMsg(null), 5000);
  }, []);

  // Local mode boot (runs in the browser only, so localStorage is available).
  useEffect(() => {
    if (cloud) {
      // Signed in with a card already: nothing local to consider.
      return;
    }
    const local = loadLocal();
    if (user) {
      // Signed in, no card yet. Offer to bring in what this browser has, if it is real.
      if (local && !local.sample && isReal(local.state)) setMigration(onDeck(local.state));
      else { setS(blank()); }
      setBooted(true);
      return;
    }
    // asked for the example: deal it unless this browser holds a real card of its own
    const fresh = () => { setS(onDeck({ ...sampleState(), settings: local?.state.settings ?? sampleState().settings })); setSample(true); };
    if (local && !local.sample && isReal(local.state)) { setS(onDeck(local.state)); setSample(false); if (wantExample()) flash('This device has a card of its own. The example is under ··· → Load the example.'); }
    else fresh();
    setBooted(true);
  }, [user, cloud, flash]);

  // Persist on every change after boot: locally, or to the account (debounced).
  useEffect(() => {
    if (!booted) return;
    if (!user) { saveLocal(S, sampleMode); return; }
    if (!dirty.current) return;
    setSync('saving');
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(async () => {
      try {
        let s = S;
        if (isDataUrl(s.profile.avatar)) { // made while signed out: into the account's storage first
          const url = await liftPortrait(user.id, s.profile.avatar);
          s = { ...s, profile: { ...s.profile, avatar: url, photo: url } };
          setS(s);
        }
        await saveCloud(user.id, s);
        setSync('saved'); dirty.current = false;
      } catch (e) { console.error(e); setSync('error'); flash('Could not save to your account. Your changes are still on this page.'); }
    }, 700);
  }, [S, sampleMode, booted, user, flash]);

  const update = useCallback<Store['update']>((fn, opts) => {
    dirty.current = true;
    setS((prev) => fn(prev));
    if (!opts?.keepSample) setSample(false);
  }, []);
  const replace = useCallback<Store['replace']>((s, sample = false) => { dirty.current = true; setS(s); setSample(sample); }, []);
  const reset = useCallback(() => { dirty.current = true; setS(blank()); setSample(false); }, []);
  const loadExample = useCallback(() => { if (isReal(S) && !sampleMode && !confirm('Replace the card on this device with the example career?')) return; dirty.current = true; setS(sampleState()); setSample(true); }, [S, sampleMode]);

  const setMeta = useCallback<Store['setMeta']>(async (m) => {
    if (!user) return 'Sign in to publish a page.';
    try {
      await saveCloud(user.id, S, m);
      if ('slug' in m) setSlug(m.slug || null);
      if (m.visibility) setVisibility(m.visibility);
      return null;
    } catch (e) {
      const msg = (e as { message?: string })?.message || '';
      return /duplicate|unique/i.test(msg) ? 'That address is taken.' : /check/i.test(msg) ? 'Use 3 to 40 letters, numbers and dashes.' : 'Could not save that.';
    }
  }, [user, S]);

  const migrate = useCallback((bring: boolean) => {
    if (!migration) return;
    if (bring) { dirty.current = true; setS(migration); flash('Brought your card into your account.'); }
    clearLocal();
    setMigration(null);
  }, [migration, flash]);

  const signOut = useCallback(async () => {
    const sb = supabaseBrowser();
    if (sb) await sb.auth.signOut();
    window.location.href = '/';
  }, []);

  const value = useMemo<Store>(() => ({ S, sampleMode, user, slug, visibility, sync, update, replace, reset, setMeta, migration, migrate, flash, flashMsg, signOut, loadExample }),
    [S, sampleMode, user, slug, visibility, sync, update, replace, reset, setMeta, migration, migrate, flash, flashMsg, signOut, loadExample]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
