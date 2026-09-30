/**
 * The card kept in this browser (signed out, or before bringing it into an account). Apart from the account storage in
 * storage.ts so that pages which only need this (the landing page) don't load the Supabase client.
 */
import type { State } from './types';
import { hydrate } from './derived';

export const LOCAL_KEY = 'careercard.v1';

export type LocalDoc = { state: State; sample: boolean } | null;

/** What this browser has, if anything. */
export function loadLocal(): LocalDoc {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !Array.isArray(o.roles)) return null;
    return { state: hydrate(o), sample: !!o.sample };
  } catch { return null; }
}
export function saveLocal(state: State, sample: boolean) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...state, sample, savedAt: new Date().toISOString() })); } catch { /* private mode, full, or blocked */ }
}
export function clearLocal() {
  try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
}
