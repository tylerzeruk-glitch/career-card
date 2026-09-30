import type { Metadata } from 'next';
import { CareerCardApp } from '@/components/CareerCardApp';
import { rowToCard } from '@/lib/card-row';
import { supabaseServer } from '@/lib/supabase/server';
import type { AuthUser, CloudCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your cards', robots: { index: false, follow: true }, alternates: { canonical: '/app' } };

/**
 * The app. Signed in: the account's card, read on the server so there is no flash of local data. Signed out: the card
 * lives in this browser (the landing page's "Try it with an example" arrives here with ?example).
 */
export default async function App() {
  let user: AuthUser | null = null;
  let cloud: CloudCard | null = null;
  const sb = await supabaseServer();
  if (sb) {
    const { data: { user: u } } = await sb.auth.getUser();
    if (u) {
      user = { id: u.id, email: u.email ?? null };
      const { data, error } = await sb.from('cards').select('slug,visibility,data,hunt,updated_at').eq('user_id', u.id).maybeSingle();
      // a failed read is not "no card yet": opening the app on an empty card would save it over the real one (see app/error.tsx)
      if (error) throw new Error('Could not read the card: ' + error.message);
      if (data) cloud = rowToCard(data);
    }
  }
  return <CareerCardApp user={user} cloud={cloud} />;
}
