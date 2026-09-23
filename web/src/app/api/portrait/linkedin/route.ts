import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * The signed-in player's LinkedIn profile photo, fetched through the identity Supabase holds for them.
 * LinkedIn's OpenID Connect sign-in hands over a `picture` claim: a short-lived address on LinkedIn's
 * CDN, refreshed each time the player signs in (or links) with LinkedIn. It cannot be fetched from the
 * browser (no CORS), so this route copies the bytes across; the browser then treats them like a chosen file.
 */
export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: 'no-account' }, { status: 503 });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'signed-out' }, { status: 401 });
  const id = user.identities?.find((i) => i.provider === 'linkedin_oidc');
  if (!id) return NextResponse.json({ error: 'not-linked' }, { status: 404 });
  const data = (id.identity_data || {}) as Record<string, unknown>;
  const pic = [data.picture, data.avatar_url].find((v): v is string => typeof v === 'string' && v.startsWith('https://'));
  if (!pic) return NextResponse.json({ error: 'no-photo' }, { status: 404 });
  let host = '';
  try { host = new URL(pic).hostname; } catch { /* not a URL */ }
  if (!/(^|\.)licdn\.com$/.test(host)) return NextResponse.json({ error: 'no-photo' }, { status: 404 });
  const r = await fetch(pic, { cache: 'no-store' }).catch(() => null);
  if (!r || !r.ok || !r.body) return NextResponse.json({ error: 'expired' }, { status: 502 });
  const type = r.headers.get('content-type') || 'image/jpeg';
  if (!type.startsWith('image/')) return NextResponse.json({ error: 'expired' }, { status: 502 });
  return new NextResponse(r.body, { headers: { 'content-type': type, 'cache-control': 'private, no-store' } });
}
