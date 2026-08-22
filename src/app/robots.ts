import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Site rules only. The AI-crawler policy lives at the edge.
 *
 * This used to carry a second group welcoming GPTBot, ClaudeBot,
 * PerplexityBot and Google-Extended. Cloudflare injects a managed block above
 * whatever this file emits, and that block disallows several of the same
 * agents — so the served robots.txt asserted both things at once, and which
 * one won came down to whether a given crawler merges conflicting groups or
 * takes the first match.
 *
 * The edge policy is the intended one: Content-Signal search=yes,
 * ai-train=no, use=reference. No training, real-time citation fine — which is
 * why ChatGPT-User and PerplexityBot are not blocked there and why llms.txt is
 * still worth publishing. Declaring nothing about AI agents here leaves that
 * policy stated in exactly one place, which is also the place that can be
 * changed without a deploy.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // "/search?" rather than "/search": the bare page now carries a
        // noindex, and a crawler has to be allowed to fetch it to ever see
        // that. The query form stays blocked because it is an unbounded space
        // of generated result pages.
        disallow: ["/api/", "/search?"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
