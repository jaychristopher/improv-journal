import type { NextConfig } from "next";

import {
  generateAtomRedirects,
  generateBridgeRedirects,
  generateHubRedirects,
  generateLibraryRedirects,
} from "./src/lib/redirects";

const nextConfig: NextConfig = {
  // Limit static generation concurrency to reduce memory usage on Vercel Hobby (8GB)
  experimental: {
    workerThreads: false,
  },
  async redirects() {
    return [
      ...generateAtomRedirects(),
      ...generateBridgeRedirects(),
      ...generateHubRedirects(),
      ...generateLibraryRedirects(),
    ];
  },
};

export default nextConfig;
