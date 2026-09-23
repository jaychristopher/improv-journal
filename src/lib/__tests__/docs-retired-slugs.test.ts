import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { generateHubRedirects } from "../redirects";

/**
 * The outreach drafts under docs/ name site URLs that go to readers off the
 * site. When two guides were consolidated on 2026-08-22 the retired slug
 * stayed in the r/leadership draft and the playbook for a month, alive only
 * through the redirect (tracker entry 213, 2026-09-21). A rename must reach
 * the drafts, so the retired slugs the redirect table knows about may not
 * appear in the outreach documents.
 */
const OUTREACH = ["docs/reddit-drafts", "docs/linkedin-drafts", "docs/reddit-playbook.md"];

function walk(p: string): string[] {
  const full = path.join(process.cwd(), p);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(full, f));
}

describe("outreach drafts", () => {
  it("name no slug the redirect table has retired", () => {
    const retired = generateHubRedirects()
      .map((r) => r.source)
      .filter((s) => !s.includes(":") && !s.startsWith("/system") && !s.startsWith("/concepts"));
    expect(retired.length).toBeGreaterThanOrEqual(4);
    const files = OUTREACH.flatMap(walk);
    expect(files.length).toBeGreaterThanOrEqual(8);
    const offenders: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf-8");
      for (const slug of retired) {
        if (text.includes(slug + " ") || text.includes(slug + "\n") || text.includes(slug + ")")) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${slug}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
