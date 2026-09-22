import { CareerCardApp } from '@/components/CareerCardApp';
import { rowToCard } from '@/lib/storage';
import { supabaseServer } from '@/lib/supabase/server';
import type { AuthUser, CloudCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** The app. When signed in, the account's card is rendered on the server so there is no flash of local data. */
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
  return <CareerCardApp user={user} cloud={cloud} />;
}
