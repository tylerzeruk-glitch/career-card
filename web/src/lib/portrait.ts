'use client';
import { supabaseBrowser } from './supabase/client';
import type { PortraitStyle } from './riso-prompt';
import type { Profile } from './types';

/** The stored headshot: a centre square, this many pixels a side. */
export const PORTRAIT_SIDE = 640;
/** Smaller when it lives in this browser only (as a data URL inside the local card). */
export const LOCAL_SIDE = 448;

const BUCKET = 'portraits';
/** Each photo gets a name of its own, so a new one for one card stock never rewrites the file another stock shows. */
const newPath = (userId: string) => userId + '/photo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';

function decode(src: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(src), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file is not an image this browser can read.')); };
    img.src = url;
  });
}

/** Crop the centre square out of a photo and scale it to at most `side` pixels, as a JPEG. The browser applies the camera's orientation. */
export async function squarePhoto(src: Blob, side: number): Promise<Blob> {
  const img = await decode(src);
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) throw new Error('That file is not an image this browser can read.');
  const s = Math.min(w, h), out = Math.min(side, s);
  const c = document.createElement('canvas'); c.width = out; c.height = out;
  const ctx = c.getContext('2d'); if (!ctx) throw new Error('Could not draw the photo.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out, out); // under any transparency
  ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, out, out);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not save the photo.'))), 'image/jpeg', 0.88));
}

export const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

/** Put the photo in the account's folder and return its address. */
export async function storePortrait(userId: string, photo: Blob): Promise<string> {
  const sb = supabaseBrowser(); if (!sb) throw new Error('Not connected to your account.');
  const at = newPath(userId);
  const { error } = await sb.storage.from(BUCKET).upload(at, photo, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(at).data.publicUrl;
}

/**
 * Stored files the card no longer uses: of the `old` addresses, the player's photos that `now` (the profile
 * after the change) does not refer to, and a drawn set when it is named. A file is orphaned at worst.
 */
export async function dropUnused(userId: string, old: (string | undefined)[], now: Profile, set?: PortraitStyle) {
  const sb = supabaseBrowser(); if (!sb) return;
  const used = new Set([now.avatar, now.photo, now.avatar90, now.photo90].filter(Boolean).map((a) => a!.split('?')[0]));
  const photos = old.filter((a): a is string => !!a && !used.has(a.split('?')[0]))
    .map((a) => /\/object\/public\/portraits\/([^?]+)/.exec(a)?.[1]).filter((at): at is string => !!at && at.startsWith(userId + '/photo'));
  const drawn = set === 'riso' ? Array.from({ length: 10 }, (_, i) => userId + '/riso-' + i + '.png') : set === '90s' ? Array.from({ length: 6 }, (_, i) => userId + '/90s-' + i + '.png') : [];
  if (photos.length || drawn.length) await sb.storage.from(BUCKET).remove([...photos, ...drawn]);
}

export type Take = { path: string; url: string };
type Fail = { error?: string; message?: string };

/** One take from the image model in the given style, via the server (`take`, 0–3, picks its pose). Throws with a message the picker can show. */
export async function drawTake(photo: Blob, style: PortraitStyle, take: number): Promise<Take & { left: number }> {
  const fd = new FormData(); fd.append('photo', photo, 'photo.jpg'); fd.append('style', style); fd.append('take', String(take));
  const r = await fetch('/api/portrait/draw', { method: 'POST', body: fd });
  const body = (await r.json().catch(() => ({}))) as (Take & { left: number }) | Fail;
  if (!r.ok) throw Object.assign(new Error((body as Fail).message || 'Could not draw that.'), { code: (body as Fail).error });
  return body as Take & { left: number };
}

/** The chosen take becomes the card portrait (the set, or the one 90s PNG); returns the avatar address to save. */
export async function pickTake(path: string): Promise<string> {
  const r = await fetch('/api/portrait/pick', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }) });
  const body = (await r.json().catch(() => ({}))) as { avatar?: string } & Fail;
  if (!r.ok || !body.avatar) throw new Error(body.message || 'Could not save that take.');
  return body.avatar;
}

/** The stored photo as bytes, for the draw route. */
export async function photoBlob(photo: string): Promise<Blob> {
  const r = await fetch(photo); if (!r.ok) throw new Error('Could not read your photo.');
  return r.blob();
}

/** A portrait kept as a data URL (made while signed out) moves into the account's folder on the first save there. */
export async function liftPortrait(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  return storePortrait(userId, blob);
}

export const isDataUrl = (s: string | undefined): s is string => !!s && s.startsWith('data:');
