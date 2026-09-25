import type { MetadataRoute } from 'next';
import { publicSlugs } from '@/lib/public-card';

export const dynamic = 'force-dynamic';

/** The front door and every card set whose owner made it public. Unlisted pages are reachable by link only and stay out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = 'https://careercards.app';
  const pages = await publicSlugs();
  return [
    { url: site + '/', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...pages.map((p) => ({ url: `${site}/u/${p.slug}`, lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
