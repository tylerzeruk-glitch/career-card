import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { single, teamSet } from '@/lib/riso';
import { PAIRS } from '@/lib/derived';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'portraits';

/**
 * The chosen take becomes the card portrait under the player's folder: a riso take becomes the set, one PNG per
 * team colour pair (the address returned carries a {pair} slot); a 90s take (named 90s-…) becomes the one
 * 90s.png. The takes stay for a day, since they are the daily count.
 */
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: 'no-account' }, { status: 503 });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'signed-out' }, { status: 401 });
  const { path } = ((await req.json().catch(() => ({}))) as { path?: string });
  const folder = user.id + '/takes/';
  if (!path || !path.startsWith(folder) || path.includes('..')) return NextResponse.json({ error: 'bad-path' }, { status: 400 });

  const { data: blob, error: dl } = await sb.storage.from(BUCKET).download(path);
  if (dl || !blob) return NextResponse.json({ error: 'gone', message: 'That take is gone. Deal again.' }, { status: 404 });
  const take = Buffer.from(await blob.arrayBuffer());
  if (path.slice(folder.length).startsWith('90s-')) {
    let png: Buffer;
    try { png = await single(take); } catch (e) { console.error(e); return NextResponse.json({ error: 'finish', message: 'Could not finish that take.' }, { status: 502 }); }
    const { error } = await sb.storage.from(BUCKET).upload(user.id + '/90s.png', png, { contentType: 'image/png', cacheControl: '31536000', upsert: true });
    if (error) return NextResponse.json({ error: 'store', message: 'Could not save the portrait.' }, { status: 500 });
    return NextResponse.json({ avatar: sb.storage.from(BUCKET).getPublicUrl(user.id + '/90s.png').data.publicUrl + '?v=' + Date.now() });
  }
  let set: Buffer[];
  try { set = await teamSet(take); } catch (e) { console.error(e); return NextResponse.json({ error: 'finish', message: 'Could not finish that take.' }, { status: 502 }); }
  const results = await Promise.all(set.map((png, i) => sb.storage.from(BUCKET).upload(user.id + '/riso-' + i + '.png', png, { contentType: 'image/png', cacheControl: '31536000', upsert: true })));
  if (results.some((r) => r.error)) return NextResponse.json({ error: 'store', message: 'Could not save the set.' }, { status: 500 });
  const base = sb.storage.from(BUCKET).getPublicUrl(user.id + '/riso-0.png').data.publicUrl;
  return NextResponse.json({ avatar: base.replace('riso-0.png', 'riso-{pair}.png') + '?v=' + Date.now(), pairs: PAIRS.length });
}
