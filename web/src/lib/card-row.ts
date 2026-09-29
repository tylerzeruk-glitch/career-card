import type { CloudCard, State, Visibility } from './types';
import { hydrate } from './derived';

// The card is one row per user: the career (and its look, settings.theme) in `data`, the job hunt and the
// app's settings in `hunt`. Only `data` is ever exposed to a public page. This module has no 'use client'
// so the server-rendered home page can call it too.

export type CardRow = { slug: string | null; visibility: Visibility; data: Partial<State> | null; hunt: { events?: State['events']; settings?: State['settings'] } | null; updated_at: string | null };

export function rowToCard(row: CardRow): CloudCard {
  const state = hydrate({ ...(row.data || {}), events: row.hunt?.events || [], settings: { ...(row.data?.settings || {}), ...(row.hunt?.settings || {}) } } as Partial<State>);
  return { slug: row.slug, visibility: row.visibility || 'private', state, updatedAt: row.updated_at };
}
