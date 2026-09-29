import { shareImage, SHARE_SIZE, type ShareVariant } from '@/lib/og/share';
import { sampleState } from '@/lib/sample';
import { hydrate } from '@/lib/derived';
import type { CardTheme } from '@/lib/types';
import { readFileSync } from 'node:fs';

export const alt = 'CareerCards: the resume, reissued as a card set';
export const size = SHARE_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

/** The example's share image, drawn the same way a player's is: the reference for the renderer. OG_THEME picks the card style when checking the renderer locally; OG_STATE names a JSON card to draw instead of the example. */
export default async function Image() {
  const S = process.env.OG_STATE ? hydrate(JSON.parse(readFileSync(process.env.OG_STATE, 'utf8'))) : sampleState();
  if (process.env.OG_THEME) S.settings = { ...S.settings, theme: process.env.OG_THEME as CardTheme };
  return shareImage(S, process.env.NEXT_PUBLIC_SITE_URL || 'https://careercards.app', undefined, (process.env.OG_VARIANT as ShareVariant) || undefined);
}
