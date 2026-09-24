import { sampleState } from '@/lib/sample';
import { resumeFileName, resumePdf } from '@/lib/resume-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The example career as a resume PDF, so the download can be seen without an account. */
export async function GET() {
  const S = sampleState();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app';
  const pdf = await resumePdf(S, 'george', site);
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${resumeFileName(S.profile.name)}"`, 'Cache-Control': 'no-store' },
  });
}
