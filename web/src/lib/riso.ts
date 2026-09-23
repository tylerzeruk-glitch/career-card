/**
 * Server-side finishing for a riso portrait, the same steps the example's George went through:
 * key the cream background out, square the bust up bottom-anchored with everything under the arc
 * filled with the shirt, then recolour the slate shirt to each team's frame colour. Pixel work on raw
 * RGBA; sharp decodes and encodes.
 */
import sharp from 'sharp';
import { PAIRS } from './derived';

type Raw = { data: Uint8Array; w: number; h: number };
type RGB = [number, number, number];

const CREAM_TOL = 40;   // distance from the border colour that still counts as background (the print's grain included)
const EDGE_FULL = 72;   // distance at which an edge pixel counts as fully foreground
const EDGE_NONE = 12;   // ... and below which it is background
const EDGE_REACH = 2;   // how far in from the background the edge treatment goes, px
const KEY_BAND = 10;    // border band the background colour is read from
const TAKE_SIDE = 1024; // a stored take keeps the model's full size
const SET_SIDE = 600;   // one card portrait, crisp on a retina card in the focus view

async function decode(png: Buffer): Promise<Raw> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), w: info.width, h: info.height };
}
/** Never upscaled; a few inks and a flat shirt take a palette PNG well, at a fraction of the size. */
function encode(r: Raw, side: number): Promise<Buffer> {
  const out = Math.min(side, r.w);
  return sharp(Buffer.from(r.data.buffer, r.data.byteOffset, r.data.byteLength), { raw: { width: r.w, height: r.h, channels: 4 } })
    .resize(out, out, { kernel: 'lanczos3', fit: 'fill' }).png({ compressionLevel: 9, palette: true, quality: 90, dither: 0.2 }).toBuffer();
}

const median = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const clip = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Hue in degrees, saturation and value 0..1. */
function hsv(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx / 255];
}
/** The slate shirt's own colour: blue hue, some saturation, not too dark (used to read the shirt colour). */
const isSlate = (r: number, g: number, b: number) => { const [h, s, v] = hsv(r, g, b); return h >= 190 && h <= 250 && s > 0.137 && v > 0.275; };
/** Fabric to recolour: anything that is not the warm skin tint, the black ink or paper-white highlights, and is grey or blue-grey. */
const isFabric = (r: number, g: number, b: number) => {
  const [h, s, v] = hsv(r, g, b);
  const skin = h >= 6 && h <= 64 && s > 0.176, ink = v < 0.227, paper = v > 0.894;
  return !skin && !ink && !paper && (s <= 0.275 || (h >= 170 && h <= 270));
};

/** Cream background to alpha: the background colour is the border's median; only background that touches the border goes, so cream inside the drawing stays. Soft edge. */
function keyOut(r: Raw): Raw {
  const { data, w, h } = r;
  let opaque = true;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) { opaque = false; break; }
  if (opaque) {
    const ch: number[][] = [[], [], []];
    const take = (x: number, y: number) => { const i = (y * w + x) * 4; ch[0].push(data[i]); ch[1].push(data[i + 1]); ch[2].push(data[i + 2]); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (y < KEY_BAND || y >= h - KEY_BAND || x < KEY_BAND || x >= w - KEY_BAND) take(x, y);
    const bg: RGB = [median(ch[0]), median(ch[1]), median(ch[2])];
    const dist = new Float32Array(w * h), near = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
      dist[p] = Math.sqrt(dr * dr + dg * dg + db * db); near[p] = dist[p] <= CREAM_TOL ? 1 : 0;
    }
    // flood from the border through near-background pixels
    const isBg = new Uint8Array(w * h); const stack: number[] = [];
    const push = (p: number) => { if (near[p] && !isBg[p]) { isBg[p] = 1; stack.push(p); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) { const p = stack.pop()!; const x = p % w, y = (p - x) / w; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w); }
    // the edge: pixels a step or two in from the background are part cream; give them that much transparency and take the cream out of their colour
    let ring = isBg;
    for (let k = 0; k < EDGE_REACH; k++) {
      const next = new Uint8Array(ring);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (ring[p]) continue; if ((x > 0 && ring[p - 1]) || (x < w - 1 && ring[p + 1]) || (y > 0 && ring[p - w]) || (y < h - 1 && ring[p + w])) next[p] = 1; }
      ring = next;
    }
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (isBg[p]) { data[i + 3] = 0; continue; }
      if (!ring[p]) continue;
      const a = clip((dist[p] - EDGE_NONE) / (EDGE_FULL - EDGE_NONE), 0, 1);
      if (a <= 0) { data[i + 3] = 0; continue; }
      for (let c = 0; c < 3; c++) data[i + c] = clip(Math.round((data[i + c] - (1 - a) * bg[c]) / a), 0, 255);
      data[i + 3] = Math.round(a * 255);
    }
  }
  // keep the bust alone: the largest connected shape; specks of print grain and stray marks go
  {
    const seen = new Int32Array(w * h).fill(-1); const sizes: number[] = []; const stack: number[] = [];
    for (let s = 0; s < w * h; s++) {
      if (seen[s] >= 0 || data[s * 4 + 3] === 0) continue;
      const id = sizes.length; let n = 0; seen[s] = id; stack.push(s);
      while (stack.length) {
        const p = stack.pop()!; n++; const x = p % w, y = (p - x) / w;
        const go = (q: number) => { if (seen[q] < 0 && data[q * 4 + 3] > 0) { seen[q] = id; stack.push(q); } };
        if (x > 0) go(p - 1); if (x < w - 1) go(p + 1); if (y > 0) go(p - w); if (y < h - 1) go(p + w);
      }
      sizes.push(n);
    }
    let big = 0; sizes.forEach((n, i) => { if (n > sizes[big]) big = i; });
    for (let p = 0; p < w * h; p++) if (seen[p] >= 0 && seen[p] !== big) data[p * 4 + 3] = 0;
  }
  // trim to the bust
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error('Nothing left after keying out the background.');
  const tw = x1 - x0 + 1, th = y1 - y0 + 1, out = new Uint8Array(tw * th * 4);
  for (let y = 0; y < th; y++) out.set(data.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + tw) * 4), y * tw * 4);
  return { data: out, w: tw, h: th };
}

/** The keyed bust on a square canvas, bottom-anchored and centred, with everything under the arc filled with the shirt so it has a flat bottom. */
function squareAndFill(r: Raw): { canvas: Raw; shirt: RGB } {
  const { data, w, h } = r, side = Math.max(w, h), ox = (side - w) >> 1, oy = side - h;
  const c = new Uint8Array(side * side * 4);
  for (let y = 0; y < h; y++) c.set(data.subarray(y * w * 4, (y + 1) * w * 4), ((y + oy) * side + ox) * 4);
  const A = (x: number, y: number) => c[(y * side + x) * 4 + 3];
  // the shirt colour: the median slate pixel in the lower third, else the median of the bust's lowest rows (whatever it wears)
  const ch: number[][] = [[], [], []], low: number[][] = [[], [], []];
  for (let y = side - Math.floor(h / 3); y < side; y++) for (let x = 0; x < side; x++) {
    const i = (y * side + x) * 4; if (c[i + 3] <= 200) continue;
    if (y >= side - Math.max(4, Math.floor(h * 0.06))) { low[0].push(c[i]); low[1].push(c[i + 1]); low[2].push(c[i + 2]); }
    if (isSlate(c[i], c[i + 1], c[i + 2])) { ch[0].push(c[i]); ch[1].push(c[i + 1]); ch[2].push(c[i + 2]); }
  }
  const src = ch[0].length > 50 ? ch : low;
  const shirt: RGB = [median(src[0]), median(src[1]), median(src[2])];
  // under the arc: per column from the lowest opaque pixel; outside the bust from the arc's ends
  const lowest = (x: number) => { for (let y = side - 1; y >= 0; y--) if (A(x, y) > 0) return y; return -1; };
  let x0 = -1, x1 = -1; for (let x = 0; x < side; x++) if (lowest(x) >= 0) { if (x0 < 0) x0 = x; x1 = x; }
  // the shoulders run out to both edges: outside the bust the fill starts at the height of the arc's ends
  const edge = Math.min(lowest(x0), lowest(x1));
  for (let x = 0; x < side; x++) {
    const inside = x >= x0 && x <= x1;
    const from = inside ? Math.max(lowest(x) - 5, 0) : edge; // a few px up, over the arc's own outline
    for (let y = from; y < side; y++) { const i = (y * side + x) * 4; c[i] = shirt[0]; c[i + 1] = shirt[1]; c[i + 2] = shirt[2]; c[i + 3] = 255; }
  }
  return { canvas: { data: c, w: side, h: side }, shirt };
}

/** Slate shirt pixels take the team's frame colour, keeping the print's light and dark variation. */
function recolor(r: Raw, shirt: RGB, frame: string): Raw {
  const out = new Uint8Array(r.data), t = hex(frame), sm = Math.max((shirt[0] + shirt[1] + shirt[2]) / 3, 1);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0 || !isFabric(out[i], out[i + 1], out[i + 2])) continue;
    const k = clip((out[i] + out[i + 1] + out[i + 2]) / 3 / sm, 0.55, 1.35);
    out[i] = clip(Math.round(t[0] * k), 0, 255); out[i + 1] = clip(Math.round(t[1] * k), 0, 255); out[i + 2] = clip(Math.round(t[2] * k), 0, 255);
  }
  return { data: out, w: r.w, h: r.h };
}

/** A take as the model returned it (cream background) to a stored take: keyed, squared, filled, in its own slate shirt. */
export async function prepareTake(png: Buffer): Promise<Buffer> {
  const { canvas } = squareAndFill(keyOut(await decode(png)));
  return encode(canvas, TAKE_SIDE);
}

/** A stored take to the card set: one PNG per team colour pair, in PAIRS order. */
export async function teamSet(takePng: Buffer): Promise<Buffer[]> {
  const r = await decode(takePng);
  const { canvas, shirt } = squareAndFill(r); // already squared; this re-reads the shirt colour and is a no-op on the fill
  return Promise.all(PAIRS.map(([, frame]) => encode(recolor(canvas, shirt, frame), SET_SIDE)));
}
