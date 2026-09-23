import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Click depth from the homepage over links inside <main> only: the chrome
 * nav reaches everything, so it hides structure. On 2026-09-21 the lessons
 * hub was three body clicks from home and the exercise picker's levels three
 * and its facets four, while every guide, atom and path was within two
 * (tracker entry 218). The homepage now links the lessons hub, the picker
 * and the level ladder in its own body.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

function bodyLinks(html: string): string[] {
  const main = html.includes("<main") ? html.split("<main")[1].split("<footer")[0] : "";
  return [...main.matchAll(/<a [^>]*href="(\/[^"#?]*)"/g)].map(
    (m) => m[1].replace(/\/$/, "") || "/",
  );
}

describe("body click depth", () => {
  it.runIf(built)("keeps the content indexes within two body clicks of home", () => {
    const pages = new Map<string, string>();
    for (const file of walk(APP)) {
      let url =
        "/" +
        path
          .relative(APP, file)
          .split(path.sep)
          .join("/")
          .replace(/\.html$/, "");
      if (url === "/index") url = "/";
      pages.set(url, fs.readFileSync(file, "utf-8"));
    }
    expect(pages.size).toBeGreaterThanOrEqual(300);

    const dist = new Map<string, number>([["/", 0]]);
    const queue = ["/"];
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of bodyLinks(pages.get(u)!)) {
        if (pages.has(v) && !dist.has(v)) {
          dist.set(v, dist.get(u)! + 1);
          queue.push(v);
        }
      }
    }

    expect(dist.get("/threads")).toBeLessThanOrEqual(1);
    expect(dist.get("/tools/exercise-picker/beginner")).toBeLessThanOrEqual(1);
    expect(dist.get("/learn/beginner")).toBeLessThanOrEqual(1);
    const lessons = [...pages.keys()].filter((u) => u.startsWith("/threads/"));
    expect(lessons.length).toBeGreaterThanOrEqual(20);
    for (const u of lessons) expect(dist.get(u), u).toBeLessThanOrEqual(2);
    const facets = [...pages.keys()].filter((u) =>
      /^\/tools\/exercise-picker\/[a-z]+\/[a-z]+$/.test(u),
    );
    expect(facets.length).toBeGreaterThanOrEqual(10);
    for (const u of facets) expect(dist.get(u), u).toBeLessThanOrEqual(3);
  });
});
