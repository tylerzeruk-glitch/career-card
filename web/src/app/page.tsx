import { CareerCardApp } from '@/components/CareerCardApp';
import { Landing } from '@/components/Landing';
import { rowToCard } from '@/lib/card-row';
import { supabaseServer } from '@/lib/supabase/server';
import type { AuthUser, CloudCard } from '@/lib/types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: { absolute: 'CareerCards · Your career as a pack of trading cards' }, alternates: { canonical: '/' } };

/** What the front door is, for search engines: the site and the free web app behind it. */
const SITE_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': 'https://careercards.app/#site', url: 'https://careercards.app/', name: 'CareerCards', description: 'Turn your resume into a pack of trading cards: one card per role, a shareable career page, a resume PDF, and a private job search tracker.' },
    { '@type': 'SoftwareApplication', '@id': 'https://careercards.app/#app', name: 'CareerCards', url: 'https://careercards.app/', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description: 'Every role you have played, on its own card. Import a LinkedIn export or a resume, share the set at your own address, download it as a PDF, and keep the job hunt on a private timeline.' },
  ],
};

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
  if (!user) return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} /><Landing /></>;
  return <CareerCardApp user={user} cloud={cloud} />;
}
