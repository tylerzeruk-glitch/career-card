import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the PDF renderer carries its own layout engine and font parser; it runs from node_modules rather than the bundle
  // and the share picture's browser (lib/og/snap.ts) likewise, with the packed Chromium it unpacks at run time traced in beside it
  serverExternalPackages: ['@react-pdf/renderer', '@sparticuz/chromium', 'playwright-core'],
  outputFileTracingIncludes: { '/u/[slug]/og': ['./node_modules/@sparticuz/chromium/bin/**'] },
};

export default nextConfig;
