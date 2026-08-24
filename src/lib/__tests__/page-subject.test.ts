import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * A declared subject is a claim about identity, so it has to be well formed.
 *
 * `about` with `sameAs` tells a search engine this page is about *that* entity,
 * the one the authority record describes. A wrong or invented URL does not
 * degrade gracefully — it asserts the page is about somebody else. So the
 * fields are checked rather than trusted, and a subject may be declared with
 * no sameAs at all, which is the right move when no authority record is known.
 */
const ALLOWED_TYPES = ["Person", "Organization", "CreativeWork"];

/** Records that actually disambiguate an entity. */
const AUTHORITY = /^https:\/\/(en\.wikipedia\.org\/wiki\/|www\.wikidata\.org\/wiki\/Q\d+)/;

describe("declared page subjects", () => {
  it("uses a known type and a non-empty name", async () => {
    for (const bridge of await loadBridges()) {
      const subject = bridge.frontmatter.subject;
      if (!subject) continue;

      expect(ALLOWED_TYPES, bridge.slug).toContain(subject.type);
      expect(subject.name.trim(), bridge.slug).toBe(subject.name);
      expect(subject.name.length, bridge.slug).toBeGreaterThan(0);
    }
  });

  it("points sameAs at authority records, absolute and https", async () => {
    for (const bridge of await loadBridges()) {
      for (const url of bridge.frontmatter.subject?.sameAs ?? []) {
        expect(url, `${bridge.slug} sameAs`).toMatch(AUTHORITY);
      }
    }
  });

  it("names the subject in the page's own title", async () => {
    // A page whose title never says the name is not about that entity, whatever
    // the markup claims.
    for (const bridge of await loadBridges()) {
      const subject = bridge.frontmatter.subject;
      if (!subject) continue;

      expect(
        bridge.frontmatter.title.toLowerCase(),
        `${bridge.slug} title should name ${subject.name}`,
      ).toContain(subject.name.toLowerCase());
    }
  });
});
