'use client';
import type { CloudCard, State, Visibility } from './types';
import { hydrate } from './derived';
import { supabaseBrowser } from './supabase/client';

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

// ---------- account storage ----------
// The card is one row per user: the career in `data`, the job hunt in `hunt`.
// Only `data` is ever exposed to a public page.

type Row = { slug: string | null; visibility: Visibility; data: Partial<State> | null; hunt: { events?: State['events']; settings?: State['settings'] } | null; updated_at: string | null };

export function rowToCard(row: Row): CloudCard {
  const state = hydrate({ ...(row.data || {}), events: row.hunt?.events || [], settings: row.hunt?.settings } as Partial<State>);
  return { slug: row.slug, visibility: row.visibility || 'private', state, updatedAt: row.updated_at };
}

export async function loadCloud(userId: string): Promise<CloudCard | null> {
  const sb = supabaseBrowser(); if (!sb) return null;
  const { data, error } = await sb.from('cards').select('slug,visibility,data,hunt,updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? rowToCard(data as Row) : null;
}

export async function saveCloud(userId: string, state: State, meta?: { slug?: string | null; visibility?: Visibility }) {
  const sb = supabaseBrowser(); if (!sb) return;
  const { events, settings, ...career } = state;
  const row: Record<string, unknown> = { user_id: userId, data: career, hunt: { events, settings }, updated_at: new Date().toISOString() };
  if (meta && 'slug' in meta) row.slug = meta.slug || null;
  if (meta && meta.visibility) row.visibility = meta.visibility;
  const { error } = await sb.from('cards').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}
