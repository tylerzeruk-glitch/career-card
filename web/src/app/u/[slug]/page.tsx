import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicCard } from '@/components/PublicCard';
import { loadPublicCard as load } from '@/lib/public-card';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/u/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const S = await load(slug);
  if (!S) return { title: 'CareerCards' };
  const first = (S.profile.name || '').trim().split(/\s+/)[0];
  const title = (S.profile.name || 'Career') + ' · CareerCards', description = (first ? `View ${first}\u2019s cards and make your own.` : 'View the cards and make your own.') + (S.profile.headline ? ' ' + S.profile.headline + (S.profile.location ? ' · ' + S.profile.location : '') : '');
  // the picture comes from opengraph-image.tsx beside this file: their own cards
  return { title, description, robots: { index: false }, openGraph: { title, description, type: 'profile', siteName: 'CareerCards' }, twitter: { card: 'summary_large_image', title, description } };
}

/** Someone's card at its address. Shows the career, never the job hunt. */
export default async function Page({ params }: PageProps<'/u/[slug]'>) {
  const { slug } = await params;
  const S = await load(slug);
  if (!S) notFound();
  return <PublicCard S={S} slug={slug} />;
}
