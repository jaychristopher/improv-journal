import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The reading list must list every book on it.
 *
 * The hub renders TIERS, not the reference atoms, so an entry left out of a
 * tier exists as a page and appears nowhere on the collection that is supposed
 * to enumerate it — including in the ItemList the CollectionPage emits. Ten of
 * thirty-two were in that state, among them Stanislavski, Goffman and the
 * Improv Handbook, and nothing reported it.
 *
 * library-reachability deliberately ignores links from inside /library, so it
 * cannot see this. The two guards are complements: that one asks whether the
 * site refers to an entry, this one asks whether the shelf admits it exists.
 */
const HUB = path.join(process.cwd(), "src", "app", "library", "page.tsx");

describe("library hub", () => {
  it("lists every reference entry in a tier", () => {
    const refs = fs
      .readdirSync(path.join(process.cwd(), "content", "atoms"))
      .filter((f) => f.startsWith("ref-") && f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));

    expect(refs.length).toBeGreaterThan(20);

    const source = fs.readFileSync(HUB, "utf-8");
    const listed = new Set([...source.matchAll(/"(ref-[a-z0-9-]+)"/g)].map((m) => m[1]));

    const unlisted = refs.filter((ref) => !listed.has(ref));
    expect(unlisted).toEqual([]);
  });

  it("does not list an entry that has no page", () => {
    const source = fs.readFileSync(HUB, "utf-8");
    const listed = [...new Set([...source.matchAll(/"(ref-[a-z0-9-]+)"/g)].map((m) => m[1]))];

    const dangling = listed.filter(
      (ref) => !fs.existsSync(path.join(process.cwd(), "content", "atoms", `${ref}.md`)),
    );
    expect(dangling).toEqual([]);
  });
});
