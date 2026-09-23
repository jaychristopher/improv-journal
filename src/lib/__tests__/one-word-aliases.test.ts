import { describe, expect, it } from "vitest";

import {
  getAtomUrl,
  isAllowlistedOneWordAlias,
  isAutolinkableAlias,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadSources,
  loadThreads,
  ONE_WORD_ALIAS_ALLOWLIST,
} from "../content";

/**
 * One-word aliases link where the corpus opts them in.
 *
 * Ninety-four percent of the anchors into a concept page were its exact
 * title, and the aliases that could have varied them were the ones the
 * linker's two-word rule declined: the prose said self-monitoring in 28
 * documents, hedging in 26, acceptance in 23, escalation in 20 and backline
 * in 18, and linked none of them, while site search resolved *hedging* to
 * Wimping on every query (tracker entry 266, 2026-09-22). The rule was tuned
 * on "The game", which is every game page's own game, and that case is still
 * right — so the fix is per alias: ONE_WORD_ALIAS_ALLOWLIST names the words
 * that are the concept wherever this corpus uses them, and the rest stay
 * declined.
 *
 * The list was admitted on a reading of every occurrence, not on length.
 * "Impulse" (27 documents) was tried and dropped: six of its links were the
 * ordinary word — "book a holiday on impulse" on a questions page linked
 * Spontaneity — so a word is only here while its occurrences are about the
 * concept. A new candidate needs the same reading before it is added.
 *
 * Asserts presence, not markup: a registration that silently stopped would
 * otherwise pass on nothing, so the declared population, the per-alias link
 * counts and the declined set are all guarded.
 */

const DECLINED_ONE_WORD_ALIASES = ["Game", "Wipe", "Denial", "POV"];

// Links measured on 2026-09-22 across atoms, bridges, threads, paths and
// sources: acceptance 23, hedging 26, self-monitoring 23, backline 15,
// escalation 15 (102 in all). Floors sit just under those counts so a stopped
// registration fails and a rewritten paragraph does not.
const LINK_FLOORS: Record<string, number> = {
  acceptance: 18,
  backline: 12,
  escalation: 12,
  hedging: 20,
  "self-monitoring": 18,
};

type Doc = { content: string; html: string; slug: string };

async function loadCorpus(): Promise<Doc[]> {
  const [atoms, bridges, threads, paths, sources] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
    loadSources(),
  ]);
  return [...atoms, ...bridges, ...threads, ...paths, ...sources];
}

function anchorsIn(html: string) {
  return [...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => ({
    href: m[1],
    text: m[2],
  }));
}

describe("one-word alias autolinking", () => {
  it("guards the alias population and maps each allowlisted word to one atom", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const declared = new Map<string, string[]>();
    let slots = 0;
    for (const atom of atoms) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        slots += 1;
        const key = alias.toLowerCase();
        declared.set(key, [...(declared.get(key) ?? []), atom.frontmatter.id]);
      }
    }
    // 43 alias slots on 33 atoms on 2026-09-22.
    expect(slots).toBeGreaterThanOrEqual(30);

    expect(ONE_WORD_ALIAS_ALLOWLIST.size).toBeGreaterThanOrEqual(5);
    for (const alias of ONE_WORD_ALIAS_ALLOWLIST) {
      // Lowercase, one word: the list is keyed by what the prose says, and
      // a two-word entry would be admitted by the ordinary rule anyway.
      expect(alias, alias).toBe(alias.toLowerCase());
      expect(alias.split(/\s+/), alias).toHaveLength(1);
      // Declared by exactly one atom, so the link has one possible target.
      // ("Denial" is declared twice, on blocking and blocking-taxonomy, and
      // that is one of the reasons it stays declined.)
      expect(declared.get(alias), alias).toHaveLength(1);
      expect(isAutolinkableAlias(alias)).toBe(true);
      expect(isAllowlistedOneWordAlias(alias.toUpperCase())).toBe(true);
    }

    expect(ONE_WORD_ALIAS_ALLOWLIST.has("acceptance")).toBe(true);
    expect(ONE_WORD_ALIAS_ALLOWLIST.has("hedging")).toBe(true);
    expect(ONE_WORD_ALIAS_ALLOWLIST.has("self-monitoring")).toBe(true);
    expect(ONE_WORD_ALIAS_ALLOWLIST.has("impulse")).toBe(false);
  });

  it("links every allowlisted alias across the rendered corpus, as the prose wrote it", async () => {
    const atoms = await loadAtoms();
    const targets = new Map<string, { id: string; title: string; url: string }>();
    for (const atom of atoms) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        if (!isAllowlistedOneWordAlias(alias)) continue;
        targets.set(alias.toLowerCase(), {
          id: atom.frontmatter.id,
          title: atom.frontmatter.title,
          url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
        });
      }
    }
    expect([...targets.keys()].sort()).toEqual([...ONE_WORD_ALIAS_ALLOWLIST].sort());

    const docs = await loadCorpus();
    expect(docs.length).toBeGreaterThanOrEqual(300);

    const counts = new Map<string, number>();
    let verbatim = 0;
    for (const doc of docs) {
      for (const { href, text } of anchorsIn(doc.html)) {
        const target = targets.get(text.toLowerCase());
        if (!target || target.url !== href) continue;
        counts.set(text.toLowerCase(), (counts.get(text.toLowerCase()) ?? 0) + 1);
        // The anchor is the word as the sentence wrote it — "hedging", not
        // "Wimping" — so the link graph gains a synonym, not another title.
        expect(text.toLowerCase(), `${doc.slug}: ${text}`).not.toBe(target.title.toLowerCase());
        if (doc.content.includes(text)) verbatim += 1;
      }
    }

    let total = 0;
    for (const [alias, floor] of Object.entries(LINK_FLOORS)) {
      const count = counts.get(alias) ?? 0;
      expect(count, alias).toBeGreaterThanOrEqual(floor);
      total += count;
    }
    expect(Object.keys(LINK_FLOORS).sort()).toEqual([...ONE_WORD_ALIAS_ALLOWLIST].sort());
    // The anchor text is taken from the sentence, so it is in the source
    // markdown with the same casing; anything else would mean the linker
    // had started substituting its own label.
    expect(verbatim).toBe(total);
    expect(total).toBeGreaterThanOrEqual(80);
  });

  it("never links an allowlisted alias to the page it is on", async () => {
    const atoms = await loadAtoms();
    let checked = 0;
    for (const atom of atoms) {
      const own = (atom.frontmatter.aliases ?? []).filter(isAllowlistedOneWordAlias);
      if (own.length === 0) continue;
      checked += 1;
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      // The aliases guard makes every alias appear in its own body, so this
      // is exactly the page a self-link would land on.
      const self = anchorsIn(atom.html).filter(
        (a) => a.href === url && own.some((alias) => alias.toLowerCase() === a.text.toLowerCase()),
      );
      expect(self, atom.frontmatter.id).toEqual([]);
    }
    expect(checked).toBe(ONE_WORD_ALIAS_ALLOWLIST.size);
  });

  it("still declines Game, Wipe, Denial and POV", async () => {
    const atoms = await loadAtoms();
    const declinedUrls = new Map<string, Set<string>>();
    for (const atom of atoms) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        if (!DECLINED_ONE_WORD_ALIASES.some((d) => d.toLowerCase() === alias.toLowerCase())) {
          continue;
        }
        expect(isAutolinkableAlias(alias), alias).toBe(false);
        expect(isAllowlistedOneWordAlias(alias), alias).toBe(false);
        const key = alias.toLowerCase();
        declinedUrls.set(key, declinedUrls.get(key) ?? new Set());
        declinedUrls
          .get(key)
          ?.add(getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }));
      }
    }
    // All four are still declared, or the check would be vacuous.
    expect([...declinedUrls.keys()].sort()).toEqual(["denial", "game", "pov", "wipe"]);

    const docs = await loadCorpus();
    const leaked: string[] = [];
    for (const doc of docs) {
      for (const { href, text } of anchorsIn(doc.html)) {
        const urls = declinedUrls.get(text.toLowerCase());
        if (urls?.has(href)) leaked.push(`${doc.slug}: ${text} -> ${href}`);
      }
    }
    // "the game" is every game page's own game; a wipe is a gesture and a
    // denial an ordinary refusal more often than they are the concept.
    expect(leaked).toEqual([]);
  });
});
