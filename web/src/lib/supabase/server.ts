import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_KEY, SUPABASE_URL, hasSupabase } from './env';

/** A server-side client bound to the request's cookies, or null when Supabase is not configured. */
export async function supabaseServer() {
  if (!hasSupabase()) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(list) {
        try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* server components cannot set cookies; the proxy refreshes them */ }
      },
    },
  });
}
