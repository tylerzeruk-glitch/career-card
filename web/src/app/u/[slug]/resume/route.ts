import { loadPublicCard } from '@/lib/public-card';
import { resumeFileName, resumePdf } from '@/lib/resume-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The shared card as a resume PDF, for anyone who can see the page. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const S = await loadPublicCard(slug);
  if (!S) return new Response('Not found', { status: 404 });
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app';
  const pdf = await resumePdf(S, slug, site);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resumeFileName(S.profile.name)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
