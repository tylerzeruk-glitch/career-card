'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthUser, CardTheme, CloudCard, State, Visibility } from '@/lib/types';
import { blank } from '@/lib/derived';
import { sampleState } from '@/lib/sample';
import { CardConflict, clearLocal, loadCloud, loadLocal, saveCloud, saveLocal } from '@/lib/storage';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isDataUrl, liftPortrait } from '@/lib/portrait';
import { Ctx, type Store, type SyncStatus } from './card-context';
export { useCard, type SyncStatus } from './card-context';

const isReal = (s: State) => s.roles.length > 0 || s.events.length > 0 || !!s.profile.name;
/** Every visit opens on the deck; the view is a choice for the session, not a saved preference. */
const onDeck = (s: State): State => (s.settings.view === 'cards' ? s : { ...s, settings: { ...s.settings, view: 'cards' } });
/** The landing page's "Try it with an example" arrives with ?example (the preview sets a flag instead). */
/**
 * A stored card that is still the untouched example (George, his roles, his summary and his hunt), whatever happened to
 * its portrait or stock: dealt afresh on the next visit rather than kept as this device's own. Anything the visitor
 * added or changed (an event, an import, an edited summary or role) makes it theirs, and it is kept.
 */
function looksLikeExample(s: State) {
  const g = sampleState();
  const roleKey = (x: State) => x.roles.map((r) => [r.company, r.title, r.start, r.end, (r.bullets || []).join('|')].join('~').toLowerCase()).sort().join('\n');
  const eventKey = (x: State) => x.events.map((e) => [e.date, e.type, e.company, e.title].join('~').toLowerCase()).sort().join('\n');
  const same = (a?: string, b?: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
  return same(s.profile.name, g.profile.name) && same(s.profile.summary, g.profile.summary) && roleKey(s) === roleKey(g) && eventKey(s) === eventKey(g);
}

const wantExample = () => {
  if (typeof window === 'undefined') return false;
  if ((window as unknown as { __EXAMPLE__?: boolean }).__EXAMPLE__) return true;
  if (new URLSearchParams(window.location.search).has('example')) { try { window.history.replaceState(null, '', window.location.pathname); } catch { /* ignore */ } return true; }
  return false;
};

export function CardProvider({ children, user, cloud, styles }: { children: ReactNode; user: AuthUser | null; cloud: CloudCard | null; styles: CardTheme[] }) {
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
  /** Each save's turn: a save that finds a newer one queued behind it leaves the writing to that one, so saves never land out of order. */
  const saveSeq = useRef(0);
  /** Writes to the account, one after another: a write waits for the one before it to land. */
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  /** A portrait made while signed out, lifted into storage once however many saves ask for it: data URL to stored URL. */
  const lifted = useRef(new Map<string, Promise<string>>());
  /** A card brought in from this browser: the browser copy is cleared once the account has it, not before. */
  const clearAfterSave = useRef(false);
  /** The account's version of the card this page last read or wrote (its updated_at): a save only writes over that one. */
  const seen = useRef<string | null>(cloud?.updatedAt ?? null);

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
    if (local && !local.sample && isReal(local.state) && !looksLikeExample(local.state)) { setS(onDeck(local.state)); setSample(false); wantExample(); }
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
      const turn = ++saveSeq.current;
      try {
        let s = S;
        const dataUrl = s.profile.avatar;
        if (isDataUrl(dataUrl)) { // made while signed out: into the account's storage first
          let up = lifted.current.get(dataUrl);
          if (!up) { up = liftPortrait(user.id, dataUrl); lifted.current.set(dataUrl, up); up.catch(() => lifted.current.delete(dataUrl)); }
          const url = await up;
          s = { ...s, profile: { ...s.profile, avatar: url, photo: url } };
          // swap in the stored address on whatever the card is now, not on the copy taken before the upload
          setS((prev) => (prev.profile.avatar === dataUrl ? { ...prev, profile: { ...prev.profile, avatar: url, photo: url } } : prev));
        }
        // one write at a time, and a write that a newer save has overtaken is skipped: the newer one carries a newer card
        const write = writes.current.then(async () => { if (turn === saveSeq.current) { const at = await saveCloud(user.id, s, seen.current); if (at) seen.current = at; } });
        writes.current = write.catch(() => undefined);
        await write;
        if (turn !== saveSeq.current) return;
        setSync('saved'); dirty.current = false;
        if (clearAfterSave.current) { clearAfterSave.current = false; clearLocal(); }
      } catch (e) {
        if (e instanceof CardConflict) { await takeNewer('This card was changed on another device, so this page now shows that version. Your last change here was not saved.'); return; }
        console.error(e); setSync('error'); flash('Could not save to your account. Your changes are still on this page.');
      }
    }, 700);
  }, [S, sampleMode, booted, user, flash]);

  /**
   * Show the account's newer card in place of this page's: after a save found the card changed elsewhere, or when the
   * page comes back into view with nothing unsaved. `msg` is said when it replaces something.
   */
  const takeNewer = useCallback(async (msg?: string) => {
    if (!user) return;
    try {
      const remote = await loadCloud(user.id);
      if (!remote || remote.updatedAt === seen.current) { if (msg) setSync('saved'); return; }
      if (!msg && dirty.current) return; // an edit made while this was loading: it saves, and a conflict then brings the newer card
      saveSeq.current++; // a save still queued carries this page's older card: let it lapse
      if (saveT.current) clearTimeout(saveT.current);
      dirty.current = false; seen.current = remote.updatedAt;
      setS(onDeck(remote.state)); setSlug(remote.slug); setVisibility(remote.visibility); setSync('saved');
      if (msg) flash(msg);
    } catch (e) { console.error(e); if (msg) { setSync('error'); flash('Could not save to your account. Your changes are still on this page.'); } }
  }, [user, flash]);

  // A page left open (another tab, a laptop from yesterday) catches up when it is looked at again, so it never saves an old card over a newer one.
  useEffect(() => {
    if (!user) return;
    const onShow = () => { if (document.visibilityState === 'visible' && !dirty.current) takeNewer(); };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [user, takeNewer]);

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
      // in line with the card's saves, over the version this page has
      const write = writes.current.then(async () => { const at = await saveCloud(user.id, S, seen.current, m); if (at) seen.current = at; });
      writes.current = write.catch(() => undefined);
      await write;
      if ('slug' in m) setSlug(m.slug || null);
      if (m.visibility) setVisibility(m.visibility);
      return null;
    } catch (e) {
      if (e instanceof CardConflict) { await takeNewer(); return 'This card was changed on another device and has been reloaded. Check it and save again.'; }
      const msg = (e as { message?: string })?.message || '';
      return /duplicate|unique/i.test(msg) ? 'That address is taken.' : /check/i.test(msg) ? 'Use 3 to 40 letters, numbers and dashes.' : 'Could not save that.';
    }
  }, [user, S, takeNewer]);

  const migrate = useCallback((bring: boolean) => {
    if (!migration) return;
    // brought in: the browser copy stays until the account has saved it (see the save effect); declined: it goes now
    if (bring) { dirty.current = true; clearAfterSave.current = true; setS(migration); flash('Brought your card into your account.'); }
    else clearLocal();
    setMigration(null);
  }, [migration, flash]);

  const signOut = useCallback(async () => {
    const sb = supabaseBrowser();
    if (sb) await sb.auth.signOut();
    window.location.href = '/';
  }, []);

  const value = useMemo<Store>(() => ({ S, sampleMode, user, styles, slug, visibility, sync, update, replace, reset, setMeta, migration, migrate, flash, flashMsg, signOut, loadExample }),
    [S, sampleMode, user, styles, slug, visibility, sync, update, replace, reset, setMeta, migration, migrate, flash, flashMsg, signOut, loadExample]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
