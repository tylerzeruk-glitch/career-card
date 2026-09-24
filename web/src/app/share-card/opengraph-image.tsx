import { shareImage, SHARE_SIZE, type ShareVariant } from '@/lib/og/share';
import { sampleState } from '@/lib/sample';

export const alt = 'CareerCards: the resume, reissued as a card set';
export const size = SHARE_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

/** The example's share image, drawn the same way a player's is: the reference for the renderer. */
export default async function Image() {
  return shareImage(sampleState(), process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app', undefined, (process.env.OG_VARIANT as ShareVariant) || undefined);
}
