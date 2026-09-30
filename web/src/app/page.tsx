import { redirect } from 'next/navigation';
import { Landing } from '@/components/Landing';
import { supabaseServer } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { jsonLd } from '@/lib/json-ld';

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
 * The front door. A signed-in visitor goes straight to their cards at /app; this page never renders the app, so a
 * signed-out visitor downloads the landing page alone, without the app's code or the account client.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sb = await supabaseServer();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      // carry the query along (an older sign-in link may still arrive here with ?portrait=linkedin)
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(await searchParams)) for (const x of [v].flat()) if (x != null) q.append(k, x);
      redirect('/app' + (q.size ? '?' + q : ''));
    }
  }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(SITE_LD) }} /><Landing /></>;
}
