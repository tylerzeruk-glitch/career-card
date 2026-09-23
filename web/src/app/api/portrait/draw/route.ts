import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { prepareTake } from '@/lib/riso';
import { HOUSE_PROMPT, IMAGE_MODEL, IMAGE_QUALITY, TAKES_PER_DAY } from '@/lib/riso-prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'portraits';
const MAX_PHOTO = 6 * 1024 * 1024;

/**
 * One take: the signed-in player's headshot goes to OpenAI's image model with the house prompt, the
 * result is keyed, squared and filled (src/lib/riso.ts) and stored under the player's takes folder.
 * The browser asks for four of these at once. Needs OPENAI_API_KEY on the server.
 */
export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: 'no-key', message: 'Drawing is not switched on yet.' }, { status: 503 });
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: 'no-account' }, { status: 503 });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'signed-out', message: 'Sign in to draw a portrait.' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const photo = form?.get('photo');
  if (!(photo instanceof File) || !photo.size) return NextResponse.json({ error: 'no-photo', message: 'Add a photo first.' }, { status: 400 });
  if (photo.size > MAX_PHOTO) return NextResponse.json({ error: 'too-big', message: 'That photo is too large.' }, { status: 413 });

  // the daily limit: takes stored today
  const folder = user.id + '/takes';
  const { data: existing } = await sb.storage.from(BUCKET).list(folder, { limit: 200 });
  const today = new Date().toISOString().slice(0, 10);
  const madeToday = (existing || []).filter((o) => (o.created_at || '').slice(0, 10) === today).length;
  if (madeToday >= TAKES_PER_DAY) return NextResponse.json({ error: 'cap', message: 'That is the limit for today. Deal again tomorrow.' }, { status: 429 });

  const call = async (fidelity: boolean) => {
    const fd = new FormData();
    fd.append('model', IMAGE_MODEL);
    fd.append('image', photo, 'photo.jpg');
    fd.append('prompt', HOUSE_PROMPT);
    fd.append('n', '1');
    fd.append('size', '1024x1024');
    fd.append('quality', IMAGE_QUALITY);
    if (fidelity) fd.append('input_fidelity', 'high');
    return fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { authorization: 'Bearer ' + key }, body: fd });
  };
  let r = await call(true);
  if (r.status === 400 && /input_fidelity/i.test(await r.clone().text())) r = await call(false); // a model without the knob
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('images/edits', r.status, text.slice(0, 500));
    let message = 'The image model could not draw that.';
    try { message = JSON.parse(text).error?.message?.slice(0, 200) || message; } catch { /* not JSON */ }
    return NextResponse.json({ error: 'model', message }, { status: 502 });
  }
  const out = (await r.json()) as { data?: { b64_json?: string }[] };
  const b64 = out.data?.[0]?.b64_json;
  if (!b64) return NextResponse.json({ error: 'model', message: 'The image model returned nothing.' }, { status: 502 });

  let take: Buffer;
  try { take = await prepareTake(Buffer.from(b64, 'base64')); } catch (e) { console.error(e); return NextResponse.json({ error: 'finish', message: 'Could not finish that take.' }, { status: 502 }); }
  const path = folder + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6) + '.png';
  const { error } = await sb.storage.from(BUCKET).upload(path, take, { contentType: 'image/png', cacheControl: '3600' });
  if (error) return NextResponse.json({ error: 'store', message: 'Could not save that take.' }, { status: 500 });
  return NextResponse.json({ path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, left: TAKES_PER_DAY - madeToday - 1 });
}
