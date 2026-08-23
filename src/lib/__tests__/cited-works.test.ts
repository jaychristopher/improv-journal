import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

const ISBN10 = /^[0-9]{9}[0-9X]$/;

async function references() {
  const atoms = await loadAtoms();
  return atoms.filter((a) => a.frontmatter.type === "reference");
}

describe("cited work metadata", () => {
  it("every library reference declares its cited work", async () => {
    const missing = (await references())
      .filter((a) => !a.frontmatter.work)
      .map((a) => a.frontmatter.id);

    expect(missing).toEqual([]);
  });

  it("declares a schema.org type, a name, and at least one author", async () => {
    for (const atom of await references()) {
      const work = atom.frontmatter.work!;
      expect(["Book", "Blog", "PodcastSeries", "ScholarlyArticle"]).toContain(work.type);
      expect(work.name.length).toBeGreaterThan(0);
      expect(work.authors.length).toBeGreaterThan(0);
      for (const author of work.authors) expect(author.trim()).toBe(author);
    }
  });

  it("uses well-formed ISBN-10s that match the linked Amazon edition", async () => {
    for (const atom of await references()) {
      const work = atom.frontmatter.work!;
      if (!work.isbn) continue;

      expect(work.isbn, `${atom.frontmatter.id} isbn`).toMatch(ISBN10);

      const amazon = (atom.frontmatter.external_links ?? []).find((l) =>
        l.url.includes("amazon.com/dp/"),
      );
      if (amazon) {
        expect(amazon.url, `${atom.frontmatter.id} isbn matches amazon dp`).toContain(work.isbn);
      }
    }
  });

  it("only claims an ISBN for books", async () => {
    for (const atom of await references()) {
      const work = atom.frontmatter.work!;
      if (work.isbn) expect(work.type, atom.frontmatter.id).toBe("Book");
    }
  });

  it("only claims a periodical or DOI for journal articles", async () => {
    for (const atom of await references()) {
      const work = atom.frontmatter.work!;
      if (work.periodical) {
        expect(work.type, `${atom.frontmatter.id} periodical`).toBe("ScholarlyArticle");
      }
      if (work.doi) {
        expect(work.type, `${atom.frontmatter.id} doi`).toBe("ScholarlyArticle");
      }
    }
  });

  it("gives every journal article a periodical and a bare, well-formed DOI", async () => {
    for (const atom of await references()) {
      const work = atom.frontmatter.work!;
      if (work.type !== "ScholarlyArticle") continue;

      // Without the journal the entry cannot be resolved to the real article,
      // which is the whole reason these pages rank.
      expect(work.periodical?.length, `${atom.frontmatter.id} periodical`).toBeGreaterThan(0);

      // Bare, because CitedWorkJsonLd builds the doi.org URL from it.
      expect(work.doi, `${atom.frontmatter.id} doi`).toMatch(/^10\.[0-9]{4,9}\/\S+$/);
    }
  });

  it("uses a four-digit publication year where one is claimed", async () => {
    for (const atom of await references()) {
      const published = atom.frontmatter.work!.published;
      if (published) expect(published, atom.frontmatter.id).toMatch(/^[0-9]{4}$/);
    }
  });
});
