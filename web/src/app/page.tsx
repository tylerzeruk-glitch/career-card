import { CareerCardApp } from '@/components/CareerCardApp';
import { Landing } from '@/components/Landing';
import { rowToCard } from '@/lib/card-row';
import { supabaseServer } from '@/lib/supabase/server';
import type { AuthUser, CloudCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Signed in: the account's card, rendered on the server so there is no flash
 * of local data. Signed out: the front door; the app itself is at /app.
 */
export default async function Home() {
  let user: AuthUser | null = null;
  let cloud: CloudCard | null = null;
  const sb = await supabaseServer();
  if (sb) {
    const { data: { user: u } } = await sb.auth.getUser();
    if (u) {
      user = { id: u.id, email: u.email ?? null };
      const { data } = await sb.from('cards').select('slug,visibility,data,hunt,updated_at').eq('user_id', u.id).maybeSingle();
      if (data) cloud = rowToCard(data);
    }
  }
  if (!user) return <Landing />;
  return <CareerCardApp user={user} cloud={cloud} />;
}
