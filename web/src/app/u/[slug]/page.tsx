import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicCard } from '@/components/PublicCard';
import { cache } from 'react';
import { loadPublicPage } from '@/lib/public-card';
import { jsonLd } from '@/lib/json-ld';
import { careerStats, roles } from '@/lib/derived';

export const dynamic = 'force-dynamic';

/** One read per request: the metadata and the page both ask for the card. */
const load = cache(loadPublicPage);

export async function generateMetadata({ params }: PageProps<'/u/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return { title: 'CareerCards' };
  const S = page.S, first = (S.profile.name || '').trim().split(/\s+/)[0];
  const title = (S.profile.name || 'Career') + ' · CareerCards', description = first ? `View ${first}\u2019s cards and make your own.` : 'View the cards and make your own.';
  // the picture comes from og/route.tsx beside this file: their own cards. Its address carries the deploy and the card's last save, so it
  // changes whenever the picture would, and the picture can be cached for as long as the address stands. Only a page its owner made
  // public is indexed; unlisted is reachable by link alone.
  const saved = page.updatedAt ? Date.parse(page.updatedAt) : NaN;
  const v = (process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 8) + (Number.isFinite(saved) ? '-' + saved.toString(36) : '');
  const image = { url: 'https://careercards.app/u/' + slug + '/og?v=' + v, width: 1200, height: 630, alt: 'A career as a card set' };
  return { title: { absolute: title }, description, robots: { index: page.visibility === 'public', follow: true }, alternates: { canonical: '/u/' + slug }, openGraph: { title, description, type: 'profile', siteName: 'CareerCards', url: 'https://careercards.app/u/' + slug, images: [image] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
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
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(person) }} /><PublicCard S={S} slug={slug} /></>;
}
