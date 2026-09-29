import { shareImage } from '@/lib/og/share';
import { loadPublicCard } from '@/lib/public-card';
import { sampleState } from '@/lib/sample';

export const dynamic = 'force-dynamic';

/**
 * The share image for someone's page: their own cards. A page that is not shared gets the example's, same as
 * the page 404s. A route of its own rather than the opengraph-image convention so the page can give unfurlers
 * an address that changes with every deploy (see generateMetadata): they cache by address, and a fixed one
 * kept an old drawing on show after the renderer changed.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const S = await loadPublicCard(slug);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app';
  return shareImage(S || sampleState(), site, S ? slug : undefined);
}
