'use client';
import { supabaseBrowser } from './supabase/client';

/** The stored headshot: a centre square, this many pixels a side. */
export const PORTRAIT_SIDE = 640;
/** Smaller when it lives in this browser only (as a data URL inside the local card). */
export const LOCAL_SIDE = 448;

const BUCKET = 'portraits';
const path = (userId: string) => userId + '/photo.jpg';

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

/** Put the photo in the account's folder and return its address (with a cache-busting version, since the file name never changes). */
export async function storePortrait(userId: string, photo: Blob): Promise<string> {
  const sb = supabaseBrowser(); if (!sb) throw new Error('Not connected to your account.');
  const { error } = await sb.storage.from(BUCKET).upload(path(userId), photo, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path(userId)).data.publicUrl + '?v=' + Date.now();
}

export async function dropPortrait(userId: string) {
  const sb = supabaseBrowser(); if (!sb) return;
  await sb.storage.from(BUCKET).remove([path(userId)]);
}

/** A portrait kept as a data URL (made while signed out) moves into the account's folder on the first save there. */
export async function liftPortrait(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  return storePortrait(userId, blob);
}

export const isDataUrl = (s: string | undefined): s is string => !!s && s.startsWith('data:');
