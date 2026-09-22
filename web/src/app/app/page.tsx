import { redirect } from 'next/navigation';
import { CareerCardApp } from '@/components/CareerCardApp';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** The app without an account: the card lives in this browser. A signed-in visitor belongs at the front door. */
export default async function TryIt() {
  const sb = await supabaseServer();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) redirect('/');
  }
  return <CareerCardApp user={null} cloud={null} />;
}
