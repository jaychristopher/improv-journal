import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Site rules only. The AI-crawler policy lives at the edge.
 *
 * This used to carry a second group welcoming GPTBot, ClaudeBot,
 * PerplexityBot and Google-Extended, and Cloudflare at the time injected a
 * managed block above whatever this file emitted that disallowed several of
 * the same agents — so the served robots.txt asserted both things at once.
 * The injection is gone: on 2026-09-25 production served exactly this file
 * (SA-8.1). The edge policy is now the 403s alone — ClaudeBot and GPTBot,
 * the training crawlers, refused; OAI-SearchBot, PerplexityBot,
 * Google-Extended and the user-initiated agents served. That is the intended
 * policy: Content-Signal search=yes, ai-train=no, use=reference. No training,
 * real-time citation fine — which is why llms.txt is still worth publishing.
 * Declaring nothing about AI agents here leaves the policy stated in exactly
 * one place, which is also the place that can be changed without a deploy.
 *
 * No llms.txt line here, and not by oversight. SA-8.1 asked for one as cheap
 * insurance for discovery; the metadata route's type carries rules, sitemap
 * and host and nothing else, so the line would mean replacing this file with
 * a route handler for the sake of a comment in robots.txt. llms.txt is found
 * at its root path by convention, which is how the format is discovered, and
 * `npm run seo:crawlers` checks it is served.
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
