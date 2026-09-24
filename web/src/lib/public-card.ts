import { hydrate } from './derived';
import { supabaseServer } from './supabase/server';
import type { State } from './types';

/** Someone's shared card by its address, or null when there is none, it is private, or Supabase is off. The career half only; events never leave the owner's row. */
export async function loadPublicCard(slug: string): Promise<State | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.rpc('public_card', { p_slug: slug });
  if (!data) return null;
  return hydrate({ ...(data as Partial<State>), events: [] });
}
