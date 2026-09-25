import { hydrate } from './derived';
import { supabaseServer } from './supabase/server';
import type { State, Visibility } from './types';

export type PublicPage = { S: State; visibility: Visibility; updatedAt: string | null };

/**
 * Someone's shared card by its address, with how it is shared, or null when there is none, it is private, or
 * Supabase is off. The career half only; events never leave the owner's row. The read returns either the new
 * shape ({ data, visibility, updated_at }) or, until the function is replaced, the bare career document.
 */
export async function loadPublicPage(slug: string): Promise<PublicPage | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.rpc('public_card', { p_slug: slug });
  if (!data) return null;
  const row = data as { data?: Partial<State>; visibility?: Visibility; updated_at?: string } & Partial<State>;
  const doc = row.data && !Array.isArray(row.roles) ? row.data : (row as Partial<State>);
  if (!doc || !Array.isArray(doc.roles)) return null;
  return { S: hydrate({ ...doc, events: [] }), visibility: row.visibility === 'public' ? 'public' : 'unlisted', updatedAt: row.updated_at || null };
}

/** The card alone, for the share image and the resume. */
export async function loadPublicCard(slug: string): Promise<State | null> {
  return (await loadPublicPage(slug))?.S ?? null;
}

/** Every public card's address, for the sitemap. Empty when Supabase is off or the function is not there yet. */
export async function publicSlugs(): Promise<{ slug: string; updatedAt: string | null }[]> {
  const sb = await supabaseServer();
  if (!sb) return [];
  const { data, error } = await sb.rpc('public_slugs');
  if (error || !Array.isArray(data)) return [];
  return (data as { slug: string; updated_at: string | null }[]).map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
}
