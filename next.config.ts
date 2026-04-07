import type { NextConfig } from "next";
import {
  generateAtomRedirects,
  generateBridgeRedirects,
  generateHubRedirects,
} from "./src/lib/redirects";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...generateAtomRedirects(),
      ...generateBridgeRedirects(),
      ...generateHubRedirects(),
    ];
  },
};

export default nextConfig;
