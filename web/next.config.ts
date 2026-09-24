import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the PDF renderer carries its own layout engine and font parser; it runs from node_modules rather than the bundle
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
