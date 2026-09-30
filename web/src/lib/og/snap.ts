import type { Browser } from 'playwright-core';
import sharp from 'sharp';

/**
 * A photograph of a page on this site, as the share picture: the page is laid out by the site's own components and CSS
 * in a real browser, so what unfurls is what the site shows. On Vercel the browser is the trimmed Chromium that
 * @sparticuz/chromium unpacks; elsewhere SNAP_CHROMIUM names one (local checks), and SNAP_FONTS names a folder holding a
 * copy of the Google Fonts stylesheet (fonts.css, pointing at its files) for machines that can't reach Google.
 * One browser is kept per warm server and reopened if it has gone.
 */
let browser: Promise<Browser> | null = null;
async function launch(): Promise<Browser> {
  const { chromium: pw } = await import('playwright-core');
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  }
  return pw.launch({ executablePath: process.env.SNAP_CHROMIUM || undefined, headless: true });
}
function open() {
  return (browser ||= launch().then((b) => { b.on('disconnected', () => { browser = null; }); return b; }).catch((e) => { browser = null; throw e; }));
}

/** The page at `url` photographed at `width` by `height`, drawn at twice the size and brought down for clean edges; PNG. */
export async function snap(url: string, width: number, height: number): Promise<Buffer> {
  const b = await open();
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  try {
    const page = await ctx.newPage();
    const local = process.env.SNAP_FONTS;
    if (local) {
      const { readFileSync } = await import('node:fs');
      await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: readFileSync(local + '/fonts.css', 'utf8').replace(/url\(file:\/\/[^)]*\/([^/)]+)\)/g, 'url(https://fonts.gstatic.com/local/$1)') }));
      await page.route('https://fonts.gstatic.com/local/*', (r) => r.fulfill({ contentType: 'font/woff2', body: readFileSync(local + '/' + r.request().url().split('/').pop()) }));
    }
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    if (!res || !res.ok()) throw new Error('share frame ' + (res ? res.status() : 'no response') + ' ' + url);
    // a page that loads is not enough: a sign-in wall (a protected preview) answers 200 too, so it must be this site's share frame
    if (new URL(page.url()).origin !== new URL(url).origin) throw new Error('share frame redirected to ' + page.url());
    await page.waitForSelector('.shareframe', { timeout: 3000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    });
    const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
    return await sharp(shot).resize(width, height).png().toBuffer();
  } finally {
    await ctx.close().catch(() => {});
  }
}
