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
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const S = await loadPublicCard(slug);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app';
  const res = await shareImage(S || sampleState(), site, S ? slug : undefined);
  // The page links here with ?v= built from the deploy and the card's last save, so that address's picture never changes and the CDN
  // can keep it: every unfurl after the first is served without drawing. An address without it (an old link, a hand-typed one), or
  // the example shown for a card that isn't shared, is kept for an hour and refreshed in the background.
  const versioned = S && new URL(req.url).searchParams.has('v');
  res.headers.set('Cache-Control', versioned ? 'public, max-age=86400, s-maxage=31536000, immutable' : 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  return res;
}
