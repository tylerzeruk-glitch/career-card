import type { MetadataRoute } from 'next';

/** Crawlers may read everything a visitor can; the API, the auth callback and the share-image page are not pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/share-card'] },
    sitemap: 'https://careercards.app/sitemap.xml',
  };
}
