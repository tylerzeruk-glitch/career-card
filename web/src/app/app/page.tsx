import type { Metadata } from 'next';
import { CareerCardApp } from '@/components/CareerCardApp';
import { rowToCard } from '@/lib/card-row';
import { supabaseServer } from '@/lib/supabase/server';
import { stylesFor } from '@/lib/styles';
import type { AuthUser, CardTheme, CloudCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your cards', robots: { index: false, follow: true }, alternates: { canonical: '/app' } };

/**
 * The app. Signed in: the account's card, read on the server so there is no flash of local data. Signed out: the card
 * lives in this browser (the landing page's "Try it with an example" arrives here with ?example).
 */
export default async function App() {
  let user: AuthUser | null = null;
  let cloud: CloudCard | null = null;
  let styles: CardTheme[] = stylesFor(null); // no accounts at all (a local build): the older list, and with that unset every style
  const sb = await supabaseServer();
  if (sb) {
    const { data: { user: u } } = await sb.auth.getUser();
    if (u) {
      user = { id: u.id, email: u.email ?? null };
      const { data, error } = await sb.from('cards').select('slug,visibility,data,hunt,updated_at').eq('user_id', u.id).maybeSingle();
      // a failed read is not "no card yet": opening the app on an empty card would save it over the real one (see app/error.tsx)
      if (error) throw new Error('Could not read the card: ' + error.message);
      if (data) cloud = rowToCard(data);
      // the trial styles granted to this account; unreadable (the grants table not there yet) falls back to the older tester list
      const grants = await sb.from('style_access').select('style').eq('user_id', u.id);
      styles = stylesFor(grants.error ? null : (grants.data || []).map((g) => g.style as string), u.id);
    } else styles = stylesFor([]); // signed out: the open styles only
  }
  return <CareerCardApp user={user} cloud={cloud} styles={styles} />;
}
