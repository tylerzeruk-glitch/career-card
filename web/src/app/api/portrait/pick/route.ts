import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { teamSet } from '@/lib/riso';
import { PAIRS } from '@/lib/derived';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'portraits';

/** The chosen take becomes the card set: one PNG per team colour pair under the player's folder. The takes are cleared. Returns the avatar address with a {pair} slot. */
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
  let set: Buffer[];
  try { set = await teamSet(Buffer.from(await blob.arrayBuffer())); } catch (e) { console.error(e); return NextResponse.json({ error: 'finish', message: 'Could not finish that take.' }, { status: 502 }); }
  const results = await Promise.all(set.map((png, i) => sb.storage.from(BUCKET).upload(user.id + '/riso-' + i + '.png', png, { contentType: 'image/png', cacheControl: '31536000', upsert: true })));
  if (results.some((r) => r.error)) return NextResponse.json({ error: 'store', message: 'Could not save the set.' }, { status: 500 });
  const { data: takes } = await sb.storage.from(BUCKET).list(user.id + '/takes', { limit: 200 });
  if (takes?.length) await sb.storage.from(BUCKET).remove(takes.map((t) => folder + t.name));
  const base = sb.storage.from(BUCKET).getPublicUrl(user.id + '/riso-0.png').data.publicUrl;
  return NextResponse.json({ avatar: base.replace('riso-0.png', 'riso-{pair}.png') + '?v=' + Date.now(), pairs: PAIRS.length });
}
