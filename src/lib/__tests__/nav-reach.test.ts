import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUBS } from "../hubs";

/**
 * The nav is the one element on every page. It carried nine concept hubs
 * and a single "Guides" item, and omitted the lessons hub, the level ladder,
 * the drill picker and the topic hubs, which were reachable from the footer
 * or the homepage body only (tracker entry 222, 2026-09-21). Every reader
 * surface below must be one nav click from everywhere.
 */
const REQUIRED = [
  "/guides",
  "/topics/communication",
  "/paths",
  "/threads",
  "/learn/beginner",
  "/tools/exercise-picker/beginner",
  "/tools/improv-prompt-generator",
  "/listen",
  "/library",
  "/practice/vocabulary",
  "/improv-games",
];

describe("nav reach", () => {
  it("links every reader-facing hub from the shared navigation", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src", "components", "Nav.tsx"), "utf-8");
    // A hub item is written as `hubLink(HUBS.threads)` since the names moved
    // into the HUBS table (tracker entry 264, 2026-09-22); the items that are
    // not hubs still carry a literal href. Both count.
    const hrefs = [
      ...[...src.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]),
      ...[...src.matchAll(/HUBS\.(\w+)/g)].map((m) => HUBS[m[1] as keyof typeof HUBS].href),
    ];
    expect(hrefs.length).toBeGreaterThanOrEqual(15);
    for (const href of REQUIRED) expect(hrefs, href).toContain(href);
  });
});
