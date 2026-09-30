// The Vintage V2 stock's printed pieces, cut from the source frame (art/v2-frame.webp: cream paper, a yellow frame with
// a black keyline, a red pennant top-left and a red star bottom-right). Run from web/: node scripts/v2-frame.mjs
//   public/frames/v2.webp / v2.jpg   the whole card front: seamless paper the card's full height, the frame's pieces at the top
//   public/frames/v2-paper.webp      the paper alone, for the back
//   public/frames/v2-pennant.png     an alpha mask, card-sized, that a team colour is painted through (the alpha carries the ink's mottling)
//   public/frames/v2-star.png        an alpha mask of the whole printed star, keyline included, that the card draws the print through above the portrait
import sharp from 'sharp';
const SRC = 'art/v2-frame.webp', OUT = 'public/frames/';
const img = sharp(SRC); const { width: W, height: H } = await img.metadata();
const CH = Math.round(W * 1.4); // the card is 2.5 x 3.5
const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];

// the paper: the frame's empty window (clear of the star), mirrored tile by tile so it repeats without a seam, cut to the card
const win = { left: 100, top: 210, width: 980, height: 740 };
const tile = await sharp(SRC).extract(win).png().toBuffer();
const flips = [tile, await sharp(tile).flop().toBuffer(), await sharp(tile).flip().toBuffer(), await sharp(tile).flip().flop().toBuffer()];
const cols = Math.ceil(W / win.width), rows = Math.ceil(CH / win.height), lay = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) lay.push({ input: flips[(c % 2) + 2 * (r % 2)], left: c * win.width, top: r * win.height });
const paper = await sharp({ create: { width: cols * win.width, height: rows * win.height, channels: 3, background: '#ecdfc3' } })
  .composite(lay).extract({ left: 0, top: 0, width: W, height: CH }).png().toBuffer();
await sharp(paper).webp({ quality: 82 }).toFile(OUT + 'v2-paper.webp');

// the printed pieces: everything that is not paper, by its distance from the paper's colour, so edges stay soft
const PAPER = [236, 222, 190];
const pieces = Buffer.alloc(W * H * 4), pen = Buffer.alloc(W * CH * 4), star = Buffer.alloc(W * CH * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, [r, g, b] = px(i);
  const d = Math.hypot(r - PAPER[0], g - PAPER[1], b - PAPER[2]);
  const edge = x < 30 || x > W - 30 || y < 12 || y > H - 40; // the source's own paper edge, shaded darker, is not a piece
  const a = edge ? 0 : Math.max(0, Math.min(1, (d - 28) / 40));
  pieces.set([r, g, b, Math.round(a * 255)], i * 4);
  const red = r > 140 && g < 120 && b < 120 && r - g > 50, yellow = r > 190 && g > 160 && b < 120;
  if (red && y < 175) { const lum = (r * .3 + g * .59 + b * .11) / 255; pen.set([255, 255, 255, Math.round(255 * (0.78 + 0.22 * Math.min(1, lum / 0.45)))], i * 4); }
  // the star's mask is the whole printed star, keyline included (everything in its corner that is neither paper nor the yellow frame): the card draws the print through it, above the portrait
  if (y > 930 && x > 830 && !yellow && a > 0.5) star.set([255, 255, 255, Math.round(a * 255)], i * 4);
}
const piecesPng = await sharp(pieces, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
const front = await sharp(paper).composite([{ input: piecesPng, left: 0, top: 0 }]).png().toBuffer();
await sharp(front).webp({ quality: 86 }).toFile(OUT + 'v2.webp');
await sharp(front).jpeg({ quality: 88 }).toFile(OUT + 'v2.jpg');
for (const [name, buf] of [['v2-pennant', pen], ['v2-star', star]]) await sharp(buf, { raw: { width: W, height: CH, channels: 4 } }).blur(0.5).png({ compressionLevel: 9 }).toFile(OUT + name + '.png');
console.log('v2 stock:', W, 'x', CH, '(frame image', W, 'x', H + ')');
