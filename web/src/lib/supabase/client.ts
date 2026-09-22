'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL, hasSupabase } from './env';

let client: ReturnType<typeof createBrowserClient> | null = null;
/** The browser client, or null when Supabase is not configured. */
export function supabaseBrowser() {
  if (!hasSupabase()) return null;
  return (client ||= createBrowserClient(SUPABASE_URL, SUPABASE_KEY));
}
