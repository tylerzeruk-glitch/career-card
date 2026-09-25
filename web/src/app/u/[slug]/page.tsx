import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicCard } from '@/components/PublicCard';
import { loadPublicPage as load } from '@/lib/public-card';
import { careerStats, roles } from '@/lib/derived';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/u/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return { title: 'CareerCards' };
  const S = page.S, first = (S.profile.name || '').trim().split(/\s+/)[0];
  const title = (S.profile.name || 'Career') + ' · CareerCards', description = (first ? `View ${first}\u2019s cards and make your own.` : 'View the cards and make your own.') + (S.profile.headline ? ' ' + S.profile.headline + (S.profile.location ? ' · ' + S.profile.location : '') : '');
  // the picture comes from opengraph-image.tsx beside this file: their own cards. Only a page its owner made public is indexed; unlisted is reachable by link alone.
  return { title: { absolute: title }, description, robots: { index: page.visibility === 'public', follow: true }, alternates: { canonical: '/u/' + slug }, openGraph: { title, description, type: 'profile', siteName: 'CareerCards', url: 'https://careercards.app/u/' + slug }, twitter: { card: 'summary_large_image', title, description } };
}

/** Someone's card at its address. Shows the career, never the job hunt. */
export default async function Page({ params }: PageProps<'/u/[slug]'>) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();
  const S = page.S, p = S.profile, rs = roles(S), cs = careerStats(S), current = rs.find((r) => !r.end);
  const person = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: 'https://careercards.app/u/' + slug,
    mainEntity: {
      '@type': 'Person',
      name: p.name || undefined,
      jobTitle: p.headline || current?.title || undefined,
      address: p.location ? { '@type': 'PostalAddress', addressLocality: p.location } : undefined,
      worksFor: current?.company ? { '@type': 'Organization', name: current.company } : undefined,
      sameAs: p.linkedin && p.linkedin !== '#' ? [p.linkedin] : undefined,
      url: 'https://careercards.app/u/' + slug,
      description: p.summary || (cs ? `${cs.seasons} seasons, ${cs.teams} teams, ${cs.positions} positions.` : undefined),
    },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} /><PublicCard S={S} slug={slug} /></>;
}
