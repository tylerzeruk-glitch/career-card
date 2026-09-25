import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CareerCardApp } from '@/components/CareerCardApp';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Try it with an example career', robots: { index: false, follow: true }, alternates: { canonical: '/app' } };

/** The app without an account: the card lives in this browser. A signed-in visitor belongs at the front door. */
export default async function TryIt() {
  const sb = await supabaseServer();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) redirect('/');
  }
  return <CareerCardApp user={null} cloud={null} />;
}
