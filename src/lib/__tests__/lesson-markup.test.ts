import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getAllPathsForThread, loadThreads } from "../content";
import { SITE_URL } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
const BUILD = path.join(APP, "threads");
/**
 * A build directory is not the same as a finished build.
 *
 * This suite reads rendered output, and the check was `existsSync` on the
 * directory. During a rebuild the directory exists while the files inside it
 * are still being written, so the guard passed and the read threw ENOENT —
 * failing on a race rather than on anything true. It presented as a timeout,
 * which sent me to vitest.config first; it was not.
 *
 * Naming a page the build always produces makes the guard mean what it says,
 * so this skips cleanly instead of erroring. content-feed already checked a
 * specific file this way, which is why it never broke.
 */
const built = fs.existsSync(BUILD) && fs.existsSync(path.join(APP, "index.html"));

function lesson(slug: string) {
  const html = fs.readFileSync(path.join(BUILD, `${slug}.html`), "utf-8");
  const blobs = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((m) => JSON.parse(m[1]));
  return blobs.find((b) => Array.isArray(b["@type"]) && b["@type"].includes("LearningResource"));
}

describe("lesson markup", () => {
  it.runIf(built)("types every thread as a lesson, not just an article", async () => {
    for (const t of await loadThreads()) {
      const l = lesson(t.frontmatter.id);
      expect(l, t.frontmatter.id).toBeTruthy();
      expect(l["@type"]).toContain("Article");
      expect(l["@type"]).toContain("LearningResource");
      expect(l.learningResourceType).toBe("Lesson");
    }
  });

  it.runIf(built)("publishes the goal and takeaway a lesson declares", async () => {
    for (const t of await loadThreads()) {
      const declared = [t.frontmatter.lesson_goal, t.frontmatter.key_takeaway].filter(Boolean);
      if (declared.length === 0) continue;
      expect(lesson(t.frontmatter.id).teaches, t.frontmatter.id).toEqual(declared);
    }
  });

  it.runIf(built)("names the concepts the lesson composes", async () => {
    for (const t of await loadThreads()) {
      const declared = t.frontmatter.atoms ?? [];
      if (declared.length === 0) continue;
      const about = lesson(t.frontmatter.id).about ?? [];
      expect(about.length, t.frontmatter.id).toBe(declared.length);
      for (const item of about) expect(item.url.startsWith(SITE_URL)).toBe(true);
    }
  });

  it.runIf(built)("declares the courses that sequence it", async () => {
    for (const t of await loadThreads()) {
      const paths = await getAllPathsForThread(t.frontmatter.id);
      const isPartOf = lesson(t.frontmatter.id).isPartOf ?? [];
      expect(isPartOf.length, t.frontmatter.id).toBe(paths.length);

      // Each reference must match the @id the path's own Course markup uses.
      for (const p of paths) {
        const expected = `${SITE_URL}/paths/${p.frontmatter.id}#course`;
        expect(isPartOf.some((c: { "@id": string }) => c["@id"] === expected)).toBe(true);
      }
    }
  });

  it.runIf(built)("converts lesson length to an ISO duration", async () => {
    for (const t of await loadThreads()) {
      const minutes = t.frontmatter.estimated_minutes;
      const l = lesson(t.frontmatter.id);
      if (minutes) expect(l.timeRequired).toBe(`PT${minutes}M`);
      else expect(l.timeRequired).toBeUndefined();
    }
  });
});
