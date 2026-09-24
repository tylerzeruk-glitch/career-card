import { shareImage, SHARE_SIZE } from '@/lib/og/share';
import { loadPublicCard } from '@/lib/public-card';
import { sampleState } from '@/lib/sample';

export const alt = 'A career as a card set';
export const size = SHARE_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

/** The share image for someone's page: their own cards. A page that is not shared gets the example's, same as the page 404s. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const S = await loadPublicCard(slug);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app';
  return shareImage(S || sampleState(), site, S ? slug : undefined);
}
