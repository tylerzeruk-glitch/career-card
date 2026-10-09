import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the PDF renderer carries its own layout engine and font parser; it runs from node_modules rather than the bundle
  // and the share picture's browser (lib/og/snap.ts) likewise, with the packed Chromium it unpacks at run time traced in beside it
  serverExternalPackages: ['@react-pdf/renderer', '@sparticuz/chromium', 'playwright-core'],
  // the portrait drawer reads its style references (George, Kramer) from assets/portrait-refs at run time
  outputFileTracingIncludes: { '/u/*/og': ['./node_modules/@sparticuz/chromium/bin/**', './node_modules/playwright-core/**'], '/api/portrait/draw': ['./assets/portrait-refs/**'] },
};

export default nextConfig;
