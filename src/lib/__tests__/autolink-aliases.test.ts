import { describe, expect, it } from "vitest";

import {
  autolinkInline,
  getAtomUrl,
  isAutolinkableAlias,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadThreads,
} from "../content";

/**
 * Multi-word aliases are autolink targets.
 *
 * Forty-five atoms can never be linked from prose by their title — the
 * generic one-word set and the length floor rule them out — and `aliases`,
 * the field for the other names a concept is taught under, was read by
 * search and schema.org and never by the linker, so "task saturation" stayed
 * plain on a page that linked "Pattern Break" (tracker entry 103,
 * 2026-09-20). Aliases of two or more words, eight characters or more, not
 * counting a leading article, now register at atom priority under the same
 * rules as a title: one link per page, never to the page itself.
 *
 * Asserts presence, not markup: a registration that silently stops would
 * otherwise pass on nothing, so the population of registered aliases is
 * guarded too.
 */
describe("alias autolinking", () => {
  it("registers the multi-word aliases and refuses the rest", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const registered: string[] = [];
    const excluded: string[] = [];
    for (const atom of atoms) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        (isAutolinkableAlias(alias) ? registered : excluded).push(alias);
      }
    }
    // 25 multi-word aliases on 2026-09-21 ("Task saturation", "Raising the
    // stakes", "Load-bearing belief"…), plus the five allowlisted one-word
    // ones from 2026-09-22; the floor is the guard, not a target.
    expect(registered.length).toBeGreaterThanOrEqual(10);
    expect(registered).toContain("Task saturation");
    // Single-word aliases stay hand-linked unless ONE_WORD_ALIAS_ALLOWLIST
    // opts them in (one-word-aliases.test.ts covers that list), and an
    // article plus one word is one word: "The game" is how every page about
    // a game refers to its own.
    expect(excluded).toContain("Denial");
    expect(excluded).toContain("Wipe");
    expect(excluded).toContain("The game");
    expect(registered).toContain("Escalation");
    expect(isAutolinkableAlias("the game")).toBe(false);
    expect(isAutolinkableAlias("denial")).toBe(false);
    expect(isAutolinkableAlias("A load-bearing belief")).toBe(true);
  });

  it("links cognitive-bandwidth where prose says task saturation", async () => {
    // No guide or lesson uses the phrase yet, so the pipeline is exercised on
    // a sentence of its own; the same interlinker renders every body.
    const html = await autolinkInline(
      "The failure mode here is task saturation, not a lack of ideas.",
      "/how-to-stop-overthinking",
    );
    expect(html).toContain('href="/how-it-works/cognitive-bandwidth"');
    expect(html).toMatch(/<a [^>]*>task saturation<\/a>/);
  });

  it("links heightening where prose says raising the stakes", async () => {
    const html = await autolinkInline("Scenes grow by raising the stakes each beat.");
    expect(html).toContain('href="/how-it-works/diagnosis/heightening"');
  });

  it("never links a page to itself through its own alias", async () => {
    const atoms = await loadAtoms();
    let checked = 0;
    for (const atom of atoms) {
      const aliases = (atom.frontmatter.aliases ?? []).filter(isAutolinkableAlias);
      if (aliases.length === 0) continue;
      checked += 1;
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      // The aliases guard makes every alias appear in its own body, so each
      // of these pages is a page the alias would link if self-links were
      // allowed.
      expect(atom.html, atom.frontmatter.id).not.toContain(`href="${url}"`);
    }
    expect(checked).toBeGreaterThanOrEqual(10);

    // And the inline pipeline, which the lesson frame renders through.
    const own = await autolinkInline(
      "Task saturation is the name for it.",
      "/how-it-works/cognitive-bandwidth",
    );
    expect(own).not.toContain("href=");
  });

  it("reaches real pages: an alias in a guide or lesson is a link there", async () => {
    const atoms = await loadAtoms();
    const byAlias = new Map<string, string>();
    for (const atom of atoms) {
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      for (const alias of atom.frontmatter.aliases ?? []) {
        if (isAutolinkableAlias(alias)) byAlias.set(alias.toLowerCase(), url);
      }
    }

    const docs = [
      ...(await loadBridges()),
      ...(await loadThreads()),
      ...(await loadPaths()),
      ...atoms,
    ];
    let linked = 0;
    for (const doc of docs) {
      for (const match of doc.html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
        if (byAlias.get(match[2].toLowerCase()) === match[1]) linked += 1;
      }
    }
    // 74 alias-anchored links across the corpus on 2026-09-21 ("one word at
    // a time" 13, "first line" 11, "group games" 10, "opening line" 8…).
    expect(linked).toBeGreaterThanOrEqual(40);
  });
});
