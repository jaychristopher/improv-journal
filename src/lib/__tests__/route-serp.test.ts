import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { ROUTE_KEYWORDS, ROUTE_SERP } from "../route-keywords";

/**
 * The five school pages are measured, and the reading lives where a route
 * page's keywords already live.
 *
 * They are `page.tsx` routes with no frontmatter, so no audit had ever counted
 * them, while two of them sat on the softest terms twelve audit firings had
 * found — "io theater chicago" at difficulty 1 with 1,700 of potential,
 * "annoyance theatre" at 0 (SA-11.1). Read on 2026-09-25, every one of the
 * five is a navigational or biographical page: the theatre's own site with
 * sitelinks, Wikipedia, the socials and the listings. The potential belongs
 * to the theatres' homepages. Recording that is the outcome, and this keeps
 * it recorded on the shape the guides and atoms use (`SerpReading`).
 */
const TRADITION_ROUTES = [
  "/traditions/johnstone",
  "/traditions/spolin",
  "/traditions/close",
  "/traditions/ucb",
  "/traditions/annoyance",
];

describe("route pages' results-page readings", () => {
  it("records a reading for every tradition route, on the shared fields", () => {
    expect(Object.keys(ROUTE_SERP).length).toBeGreaterThanOrEqual(5);
    for (const route of TRADITION_ROUTES) {
      const reading = ROUTE_SERP[route];
      expect(reading, route).toBeDefined();
      expect(reading.serp_query, route).toBeTruthy();
      expect(reading.serp_checked, route).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(reading.serp_verdict, route).toBeDefined();
      expect(reading.serp_min_dr, route).toBe(Math.min(...(reading.serp_top10_dr ?? [])));
      expect(reading.serp_audience, route).toBeTruthy();
    }
    // Every reading names a route the register knows, or a tradition.
    for (const route of Object.keys(ROUTE_SERP)) {
      expect(TRADITION_ROUTES.includes(route) || route in ROUTE_KEYWORDS, route).toBe(true);
    }
  });

  it("reads the largest hub, and keeps every floor equal to its lowest result", () => {
    // /improv-games holds the site's biggest term and had no reading until
    // 2026-09-28, when matching terms for it found "improv games for adults"
    // (250 a month, difficulty 0, potential 450) registered nowhere, five
    // months after the April research listed it for this hub. The floor is a
    // DR 22 blog at 8 on 84 visits; Reddit takes 63% of the page.
    expect(ROUTE_SERP["/improv-games"]?.serp_query).toBe("improv games");
    expect(ROUTE_KEYWORDS["/improv-games"].map((k) => k.keyword)).toContain(
      "improv games for adults",
    );
    for (const [route, reading] of Object.entries(ROUTE_SERP)) {
      if (reading.serp_top10_dr?.length) {
        expect(reading.serp_min_dr, route).toBe(Math.min(...reading.serp_top10_dr));
      }
    }
  });

  it("registers a keyword only where the page's own title says it", () => {
    // The H1 rule keyword-collisions.test.ts applies to hubs: a route that
    // registers a term claims it in its title. iO's page is "iO and the
    // Harold" and the term is "io theater chicago", so it registers nothing
    // and records the reading alone (see ROUTE_SERP).
    expect(ROUTE_KEYWORDS["/traditions/close"]).toBeUndefined();
    expect(ROUTE_KEYWORDS["/traditions/spolin"]).toBeUndefined();
    expect(ROUTE_KEYWORDS["/traditions/johnstone"]?.[0]?.keyword).toBe("keith johnstone");
    expect(ROUTE_KEYWORDS["/traditions/annoyance"]?.[0]?.keyword).toBe("annoyance theatre");
    expect(ROUTE_KEYWORDS["/traditions/ucb"]?.map((k) => k.keyword)).toContain(
      "upright citizens brigade",
    );
  });

  it("hands Spolin to the guide, and copies nothing it does not check", async () => {
    // Two pages about one person. The guide is longer, better linked and
    // carries the keyword metadata; the route page is the school's and part
    // of a five-page set. The guide owns the entity; the route page says so
    // and registers no keyword, and its reading is the guide's, so the two
    // cannot drift apart.
    const spolin = ROUTE_SERP["/traditions/spolin"];
    expect(spolin.search_owner).toBe("viola-spolin");
    const guide = (await loadBridges()).find((b) => b.slug === spolin.search_owner);
    expect(guide).toBeDefined();
    expect(spolin.serp_top10_dr).toEqual(guide!.frontmatter.serp_top10_dr);
    expect(spolin.serp_verdict).toBe(guide!.frontmatter.serp_verdict);
    expect(spolin.serp_checked).toBe(guide!.frontmatter.serp_checked);
    // The Close pair stays two pages: one is the school, one is the man, and
    // their results pages share no competitor.
    expect(ROUTE_SERP["/traditions/close"].search_owner).toBeUndefined();
  });
});
