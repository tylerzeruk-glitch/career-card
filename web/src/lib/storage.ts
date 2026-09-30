'use client';
import type { CloudCard, State, Visibility } from './types';
import { supabaseBrowser } from './supabase/client';
import { rowToCard, type CardRow } from './card-row';

export { LOCAL_KEY, loadLocal, saveLocal, clearLocal, type LocalDoc } from './local';

// ---------- account storage (browser side; the row shape lives in card-row.ts) ----------

export async function loadCloud(userId: string): Promise<CloudCard | null> {
  const sb = supabaseBrowser(); if (!sb) return null;
  const { data, error } = await sb.from('cards').select('slug,visibility,data,hunt,updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? rowToCard(data as CardRow) : null;
}

/** The card changed in the account since this page last read or wrote it (another device or tab): nothing was written. */
export class CardConflict extends Error {
  constructor() { super('The card was changed elsewhere.'); this.name = 'CardConflict'; }
}

/**
 * Write the card, but only over the version this page last saw (`seen`, its updated_at): a page left open on
 * another device must not put back what was changed since. No row seen yet makes one, and one made meanwhile
 * elsewhere is a conflict too. Returns the new updated_at, the version to write over next time.
 */
export async function saveCloud(userId: string, state: State, seen: string | null, meta?: { slug?: string | null; visibility?: Visibility }): Promise<string | null> {
  const sb = supabaseBrowser(); if (!sb) return null;
  // the career and its look go out with the public page; the job hunt and the app's own settings stay in the private column
  const { events, settings, ...career } = state;
  const row: Record<string, unknown> = { user_id: userId, data: { ...career, settings: { theme: settings.theme } }, hunt: { events, settings }, updated_at: new Date().toISOString() };
  if (meta && 'slug' in meta) row.slug = meta.slug || null;
  if (meta && meta.visibility) row.visibility = meta.visibility;
  if (seen) {
    const { data, error } = await sb.from('cards').update(row).eq('user_id', userId).eq('updated_at', seen).select('updated_at');
    if (error) throw error;
    if (!data || !data.length) throw new CardConflict();
    return (data[0] as { updated_at: string }).updated_at;
  }
  const { data, error } = await sb.from('cards').insert(row).select('updated_at').single();
  // the account's row made meanwhile (cards_pkey) is a conflict; a taken address (cards_slug_key) is just that
  if (error) { if (error.code === '23505' && /cards_pkey/.test(error.message)) throw new CardConflict(); throw error; }
  return (data as { updated_at: string }).updated_at;
}
