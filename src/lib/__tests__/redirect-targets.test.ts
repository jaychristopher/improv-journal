import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { generateAtomRedirects, generateBridgeRedirects, generateHubRedirects } from "../redirects";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Every redirect lands on a page that exists.
 *
 * redirects.ts cannot import content.ts — content.ts pulls in remark, which is
 * ESM-only and breaks next.config loading — so it carries its own copy of the
 * atom-type-to-URL mapping, and says in a comment that the two are "kept in
 * sync manually". That is an accurate description of a hazard, not a
 * safeguard: when the copies drift, every old URL for the affected type
 * redirects to a 404, and nothing in the build fails.
 *
 * 284 redirects resolve today. This holds them to it, and covers the rest of
 * the shape too — a chain wastes a hop and dilutes the signal, and a loop is
 * unreachable.
 */
function builtUrls(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) {
        const rel = path
          .relative(APP, full)
          .split(path.sep)
          .join("/")
          .replace(/\.html$/, "");
        out.add(rel === "index" ? "/" : `/${rel}`);
      }
    }
  };
  walk(APP);
  return out;
}

const redirects = () => [
  ...generateAtomRedirects(),
  ...generateBridgeRedirects(),
  ...generateHubRedirects(),
];

describe("redirect targets", () => {
  it.runIf(built)("resolve to a built page", () => {
    const urls = builtUrls();
    const all = redirects();
    expect(all.length).toBeGreaterThan(200);

    const dead = all
      // Wildcard rules carry a :param through; check the prefix has real pages.
      .filter((r) =>
        r.destination.includes(":")
          ? ![...urls].some((u) => u.startsWith(r.destination.split(":")[0]))
          : !urls.has(r.destination.replace(/\/+$/, "") || "/"),
      )
      .map((r) => `${r.source} -> ${r.destination}`);

    expect(dead).toEqual([]);
  });

  it("never chain and never loop", () => {
    const all = redirects();
    const sources = new Set(all.map((r) => r.source));

    const chained = all
      .filter((r) => sources.has(r.destination))
      .map((r) => `${r.source} -> ${r.destination} -> …`);
    const looped = all.filter((r) => r.source === r.destination).map((r) => r.source);

    expect(chained).toEqual([]);
    expect(looped).toEqual([]);
  });
});
