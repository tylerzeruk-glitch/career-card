// Bundle the client side of the app into one HTML file (local mode, sample career), for previews and
// artifact comments. Usage: node scripts/artifact.mjs [out.html]
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'careercards-preview.html';
const res = await build({
  entryPoints: ['scripts/artifact-entry.tsx'], bundle: true, minify: true, write: false, format: 'iife', target: 'es2020',
  jsx: 'automatic', tsconfig: 'tsconfig.json', logLevel: 'error',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""',
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '""', 'process.env.NEXT_PUBLIC_SITE_URL': '""',
  },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/app/globals.css', 'utf8') + '\n' + readFileSync('src/styles/card.css', 'utf8');
const icon = 'data:image/svg+xml;utf8,' + encodeURIComponent(readFileSync('src/app/icon.svg', 'utf8'));
const fonts = 'https://fonts.googleapis.com/css2?family=Righteous&family=Lilita+One&family=Barlow+Condensed:wght@500;600;700&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap';
const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>CareerCards</title>
<link rel="icon" href="${icon}">
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + ' KB');
