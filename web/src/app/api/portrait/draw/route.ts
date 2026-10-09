import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { prepareTake } from '@/lib/riso';
import { IMAGE_FIDELITY, IMAGE_MODEL, IMAGE_QUALITY, promptFor, type PortraitStyle } from '@/lib/riso-prompt';
import { spend } from '@/lib/quota';

export const runtime = 'nodejs';
export const maxDuration = 120; // Sunburst edits run longer than gpt-image-1 did

const BUCKET = 'portraits';
const MAX_PHOTO = 6 * 1024 * 1024;

/** The look each style is drawn after, sent beside the photo: George's riso print, Kramer's 90s card (assets/portrait-refs, traced in by next.config.ts). */
const styleRef = (style: PortraitStyle) => readFile(path.join(process.cwd(), 'assets/portrait-refs', style + '.png')).then((b) => new Blob([new Uint8Array(b)], { type: 'image/png' }));

/**
 * One take: the signed-in player's headshot goes to OpenAI's image model with the prompt for the asked
 * style (the riso house style, or the 90s look for the Chrome stock), the result is keyed, squared
 * and filled (src/lib/riso.ts) and stored under the player's takes folder, named for its style so the
 * pick route knows what to make of it. The browser asks for four of these at once. Needs OPENAI_API_KEY
 * on the server.
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
  const style: PortraitStyle = form?.get('style') === '90s' ? '90s' : 'riso';
  const pose = Math.max(0, Math.min(3, Number(form?.get('take')) || 0)); // which of the deal's four poses

  // the day's limit, counted in the database before the paid call (src/lib/quota.ts)
  const quota = await spend(sb, user.id, 'portrait');
  if (!quota.ok) return NextResponse.json({ error: quota.status === 429 ? 'cap' : 'quota', message: quota.status === 429 ? 'That is the limit for today. Deal again tomorrow.' : quota.message }, { status: quota.status });

  // takes are kept for a day (picking one does not clear them); older ones are tidied away here
  const folder = user.id + '/takes';
  const { data: existing } = await sb.storage.from(BUCKET).list(folder, { limit: 200 });
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const old = (existing || []).filter((o) => Date.parse(o.created_at || '') < cutoff);
  if (old.length) await sb.storage.from(BUCKET).remove(old.map((o) => folder + '/' + o.name));

  const ref = await styleRef(style).catch((e) => { console.error('style reference', e); return null; }); // without it, the prompt alone
  const call = async (fidelity: boolean) => {
    const fd = new FormData();
    fd.append('model', IMAGE_MODEL);
    if (ref) { fd.append('image[]', photo, 'photo.jpg'); fd.append('image[]', ref, 'style.png'); } else fd.append('image', photo, 'photo.jpg');
    fd.append('prompt', promptFor(style, pose, !!ref));
    fd.append('n', '1');
    fd.append('size', '1024x1024');
    fd.append('quality', IMAGE_QUALITY);
    if (fidelity) fd.append('input_fidelity', IMAGE_FIDELITY);
    return fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { authorization: 'Bearer ' + key }, body: fd });
  };
  let r = await call(!!IMAGE_FIDELITY);
  if (r.status === 400 && /input_fidelity/i.test(await r.clone().text())) r = await call(false); // a model without the knob
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('images/edits', r.status, text.slice(0, 500));
    // the model's own error text stays in the log: it can carry key hints or billing state
    const message = r.status === 400 ? 'The image model could not draw from that photo. Try a different one.' : 'The image model could not draw that. Try again in a moment.';
    return NextResponse.json({ error: 'model', message }, { status: 502 });
  }
  const out = (await r.json()) as { data?: { b64_json?: string }[] };
  const b64 = out.data?.[0]?.b64_json;
  if (!b64) return NextResponse.json({ error: 'model', message: 'The image model returned nothing.' }, { status: 502 });

  let take: Buffer;
  try { take = await prepareTake(Buffer.from(b64, 'base64')); } catch (e) { console.error(e); return NextResponse.json({ error: 'finish', message: 'Could not finish that take.' }, { status: 502 }); }
  const path = folder + '/' + (style === '90s' ? '90s-' : '') + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6) + '.png';
  const { error } = await sb.storage.from(BUCKET).upload(path, take, { contentType: 'image/png', cacheControl: '3600' });
  if (error) return NextResponse.json({ error: 'store', message: 'Could not save that take.' }, { status: 500 });
  return NextResponse.json({ path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, left: quota.left });
}
