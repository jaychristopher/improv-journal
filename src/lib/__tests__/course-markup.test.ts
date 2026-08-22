import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";

const BUILD = path.join(process.cwd(), ".next", "server", "app", "paths");
const built = fs.existsSync(BUILD);

function course(slug: string) {
  const html = fs.readFileSync(path.join(BUILD, `${slug}.html`), "utf-8");
  const blobs = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((m) => JSON.parse(m[1]));
  return blobs.find((b) => b["@type"] === "Course");
}

describe("course markup", () => {
  it.runIf(built)("every path publishes a Course", async () => {
    for (const p of await loadPaths()) {
      expect(course(p.frontmatter.id), p.frontmatter.id).toBeTruthy();
    }
  });

  it.runIf(built)("carries what Google reads for a course result", async () => {
    for (const p of await loadPaths()) {
      const c = course(p.frontmatter.id)!;
      expect(c.name).toBe(p.frontmatter.title);
      expect(c.description.length).toBeGreaterThan(0);
      expect(c.provider["@type"]).toBe("Organization");
      // hasCourseInstance with a courseMode is what makes it eligible at all.
      expect(c.hasCourseInstance["@type"]).toBe("CourseInstance");
      expect(c.hasCourseInstance.courseMode).toBe("Online");
    }
  });

  it.runIf(built)("publishes the objectives the path declares", async () => {
    for (const p of await loadPaths()) {
      const declared = p.frontmatter.learning_objectives ?? [];
      if (declared.length === 0) continue;
      expect(course(p.frontmatter.id)!.teaches, p.frontmatter.id).toEqual(declared);
    }
  });

  it.runIf(built)("publishes the lesson sequence as a syllabus", async () => {
    for (const p of await loadPaths()) {
      const c = course(p.frontmatter.id)!;
      const declared = p.frontmatter.threads ?? [];
      if (declared.length === 0) continue;

      expect(c.syllabusSections?.length, p.frontmatter.id).toBeGreaterThan(0);
      expect(c.hasPart?.length).toBe(c.syllabusSections.length);
      // Ordered, and each position matches its place in the sequence.
      const positions = c.syllabusSections.map((s: { position: number }) => s.position);
      expect(positions).toEqual(positions.map((_: number, i: number) => i + 1));
    }
  });

  it.runIf(built)("does not report lesson counts as academic credits", async () => {
    for (const p of await loadPaths()) {
      expect(course(p.frontmatter.id)!.numberOfCredits, p.frontmatter.id).toBeUndefined();
    }
  });
});
