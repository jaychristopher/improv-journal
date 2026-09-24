import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AFFILIATE_DISCLOSURE, AFFILIATE_REL, editionUrl } from "../affiliate";
import { BOOK_EDITIONS, editionsFor } from "../book-editions";
import { bookVerdict } from "../book-verdict";
import { loadAtoms } from "../content";
import { librarySlug } from "../library-slug";

/**
 * The library entries became the site's first commercial surface on
 * 2026-09-24: they are its best-ranking pages, each one ends with a reader
 * deciding whether to buy a book, and eighteen of them already carried a bare
 * `amazon.com/dp/…` link that sent that traffic away untagged.
 *
 * What these guard is the part that is easy to get wrong quietly — an ASIN
 * that does not match the book, a disclosure that drifts out of the card, a
 * retail link creeping back onto a surface that is meant to route through the
 * entry.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

describe("the editions table", () => {
  it("names only reference atoms that exist", async () => {
    const atoms = await loadAtoms();
    const refs = new Set(
      atoms.filter((a) => a.frontmatter.type === "reference").map((a) => a.frontmatter.id),
    );
    expect(refs.size).toBeGreaterThanOrEqual(30);
    expect(Object.keys(BOOK_EDITIONS).filter((id) => !refs.has(id))).toEqual([]);
  });

  it("agrees with the ASIN each entry already published", async () => {
    // The print ASINs were harvested from the entries' own frontmatter, so
    // the two have to keep saying the same thing. An entry that changes its
    // Amazon link and leaves the table behind would sell the wrong book.
    const atoms = await loadAtoms();
    const mismatched: string[] = [];
    for (const atom of atoms) {
      const declared = (atom.frontmatter.external_links ?? [])
        .map((el) => /amazon\.com\/dp\/([0-9A-Za-z]+)/.exec(el.url)?.[1])
        .find(Boolean);
      if (!declared) continue;
      const print = editionsFor(atom.frontmatter.id).find((e) => e.kind === "print");
      if (print?.asin !== declared) {
        mismatched.push(`${atom.frontmatter.id}: table ${print?.asin} vs content ${declared}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it("gives every edition a plausible Amazon id and no duplicates", () => {
    const seen = new Map<string, string>();
    for (const [id, editions] of Object.entries(BOOK_EDITIONS)) {
      expect(editions.length, id).toBeGreaterThan(0);
      for (const edition of editions) {
        // ISBN-10 or a B0-prefixed ASIN; nothing else is a real listing id.
        expect(edition.asin, `${id} ${edition.kind}`).toMatch(/^([0-9]{9}[0-9X]|B[0-9A-Z]{9})$/);
        const previous = seen.get(edition.asin);
        expect(previous, `${edition.asin} is on both ${previous} and ${id}`).toBeUndefined();
        seen.set(edition.asin, id);
      }
      // One of each format at most, or the card renders two "Print" buttons.
      expect(new Set(editions.map((e) => e.kind)).size, id).toBe(editions.length);
    }
  });

  it("sends each format to the right store", () => {
    expect(editionUrl({ kind: "print", asin: "0130505188" })).toContain("amazon.com/dp/0130505188");
    expect(editionUrl({ kind: "audiobook", asin: "B0H5QTSPT9" })).toContain(
      "audible.com/pd/B0H5QTSPT9",
    );
  });
});

describe("the verdict on the card", () => {
  it("is the entry's own answer, on the entries that give one", async () => {
    const atoms = await loadAtoms();
    const refs = atoms.filter((a) => a.frontmatter.type === "reference");
    const withVerdict = refs.filter((a) => bookVerdict(a.content));
    // 23 of 32 carry a "Who it rewards" section on 2026-09-24. The floor is
    // under that: a parser that stopped matching would otherwise pass while
    // silently emptying every card.
    expect(withVerdict.length).toBeGreaterThanOrEqual(20);

    for (const atom of withVerdict) {
      const verdict = bookVerdict(atom.content)!;
      expect(verdict.length, atom.frontmatter.id).toBeGreaterThan(30);
      // Plain text: the card renders a string, so markup would show through.
      expect(verdict, atom.frontmatter.id).not.toMatch(/[*_`#]|\]\(/);
      expect(atom.content).toContain(verdict.slice(0, 40).replace(/\s+$/, ""));
    }
  });
});

describe("the built library pages", () => {
  it.runIf(built)("marks every retail link as paid, and discloses it", async () => {
    const atoms = await loadAtoms();
    const refs = atoms.filter((a) => a.frontmatter.type === "reference");
    const missing: string[] = [];

    for (const atom of refs) {
      const file = path.join(APP, "library", `${librarySlug(atom.frontmatter.id)}.html`);
      if (!fs.existsSync(file)) {
        missing.push(`${atom.frontmatter.id}: no page`);
        continue;
      }
      const html = fs.readFileSync(file, "utf8");
      // Every visible retail anchor carries the paid rel.
      for (const anchor of html.matchAll(
        /<a\b[^>]*href="(https:\/\/[^"]*(?:amazon|audible)[^"]*)"[^>]*>/g,
      )) {
        if (!anchor[0].includes(AFFILIATE_REL)) {
          missing.push(`${atom.frontmatter.id}: unmarked ${anchor[1]}`);
        }
      }
      // And the disclosure is on the page that carries them.
      if (html.includes('rel="' + AFFILIATE_REL + '"') && !html.includes(AFFILIATE_DISCLOSURE)) {
        missing.push(`${atom.frontmatter.id}: links with no disclosure`);
      }
    }
    expect(missing).toEqual([]);
  });

  it.runIf(built)("keeps retail links off the hub, which routes through the entry", () => {
    const hub = fs.readFileSync(path.join(APP, "library.html"), "utf8");
    // Guard the guard: the hub still lists the entries.
    expect(hub.split('href="/library/').length - 1).toBeGreaterThanOrEqual(30);
    const retail = [...hub.matchAll(/href="(https:\/\/[^"]*(?:amazon|audible)[^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(retail).toEqual([]);
  });
});
