import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  GENERIC_ONE_WORD_ATOM_TITLES,
  getAtomUrl,
  getDeclaredEntryAtomTargets,
  loadAtoms,
  loadBridges,
  loadThreads,
} from "../content";

/**
 * A guide links the one-word entry atoms it declares.
 *
 * Weighted by the demand the guides declare, ten atoms are the graph's front
 * doors, and six of them — Offers, Trust, Blocking, Vulnerability,
 * Commitment, Status — have one-word titles the prose linker declines by
 * rule: under nine letters, or in GENERIC_ONE_WORD_ATOM_TITLES because
 * "status" on an arbitrary page is as often the ordinary word (tracker entry
 * 282, 2026-09-22). So the highest-demand guides named their own entrances
 * in prose without a link. The exception is per document: on a guide that
 * lists the atom in `entry_atoms`, the title links, because the declaration
 * is the disambiguation the generic rule lacks. Atoms and lessons get
 * nothing from it.
 *
 * The exception's link has a signature the ordinary linker cannot produce:
 * anchor text equal to a declined one-word title, the linker's `title`
 * attribute, on a guide declaring the atom. This reads that signature from
 * the rendered corpus, so a registration that silently stopped fails on a
 * count and not on markup. Every occurrence was read on 2026-09-22: the
 * titles double as verbs ("somebody offers two options"), and a verb-object
 * lookahead in the matcher declines those; what landed was the concept in
 * every case. Backticked ids keep their slot — a page the author already
 * linked by hand or backtick gains nothing — so the counts here are pages
 * whose body had no link to its own entrance at all.
 */

type Target = { id: string; title: string; url: string };

/** One-word titles the corpus-wide rule declines: short, or generic. */
function isDeclinedOneWordTitle(title: string, type: string): boolean {
  const normalized = title.trim();
  if (normalized.split(/\s+/).length !== 1) return false;
  const key = normalized.toLowerCase();
  if (GENERIC_ONE_WORD_ATOM_TITLES.has(key)) return true;
  return normalized.length < (type === "definition" ? 12 : 9);
}

async function declinedAtoms(): Promise<Map<string, Target>> {
  const atoms = await loadAtoms();
  expect(atoms.length).toBeGreaterThanOrEqual(200);
  const out = new Map<string, Target>();
  for (const atom of atoms) {
    const { id, title, type } = atom.frontmatter;
    if (!isDeclinedOneWordTitle(title, type)) continue;
    out.set(id, { id, title, url: getAtomUrl({ id, type }) });
  }
  return out;
}

/** Anchors carrying the exception's signature for one declared, declined atom. */
function exceptionLinks(html: string, target: Target): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a href="([^"]+)" title="([^"]*)">([^<]+)<\/a>/g)) {
    if (m[1] !== target.url || m[2] !== target.title) continue;
    if (m[3].toLowerCase() !== target.title.toLowerCase()) continue;
    out.push(m[3]);
  }
  return out;
}

// Guides linking a declared one-word atom by title, measured 2026-09-22
// after the verb guard and with backticked ids keeping their slot: offers 6,
// ensemble 6, commitment 6, trust 4, warm-up 4, spontaneity 4, discovery 3,
// blocking 2, status 2, signal 2, presence 1, vulnerability 1 (41 in all, of
// which 40 are pages that had no body link to the atom before and one, the
// conflict guide's status, moved earlier on its page to where the title is
// written, from where the alias "status transaction" used to link). Floors
// sit just under the counts so a stopped registration fails and a rewritten
// paragraph does not; the atoms measured at one are held by the total,
// since "just under one" asserts nothing.
const LINK_FLOORS: Record<string, number> = {
  blocking: 1,
  status: 1,
  commitment: 5,
  discovery: 2,
  ensemble: 5,
  offers: 5,
  signal: 1,
  spontaneity: 3,
  trust: 3,
  "warm-up": 3,
};
const TOTAL_FLOOR = 37;

describe("declared entry atoms link by title on the guide that declares them", () => {
  it("guards the population: guides, and the declared one-word atoms the rule declines", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const declined = await declinedAtoms();
    const declared = new Set<string>();
    for (const bridge of bridges) {
      for (const id of bridge.frontmatter.entry_atoms ?? []) {
        if (declined.has(id)) declared.add(id);
      }
    }
    // 36 atoms carry a declined one-word title and 20 of them are declared by
    // a guide (2026-09-22); the six front doors are among the 20.
    expect(declared.size).toBeGreaterThanOrEqual(5);
    for (const id of ["offers", "trust", "blocking", "vulnerability", "commitment", "status"]) {
      expect(declared.has(id), `${id} is declared by a guide and declined by the rule`).toBe(true);
    }

    // The builder registers exactly the declared, declined titles, and not a
    // title the registry links already, nor one the page backticks.
    const targets = getDeclaredEntryAtomTargets(["offers", "trust", "active-listening"]);
    expect(targets.map((t) => t.phrase).sort()).toEqual(["Offers", "Trust"]);
    expect(
      getDeclaredEntryAtomTargets(["offers", "trust"], "a `trust` id").map((t) => t.phrase),
    ).toEqual(["Offers"]);
    expect(getDeclaredEntryAtomTargets([])).toEqual([]);
    expect(getDeclaredEntryAtomTargets(["not-an-atom"])).toEqual([]);
  });

  it("links each declared one-word atom from guide prose, per atom, above the dated floors", async () => {
    const declined = await declinedAtoms();
    const bridges = await loadBridges();

    const counts = new Map<string, number>();
    const anchors: string[] = [];
    for (const bridge of bridges) {
      for (const id of bridge.frontmatter.entry_atoms ?? []) {
        const target = declined.get(id);
        if (!target) continue;
        const links = exceptionLinks(bridge.html, target);
        // Once per page: the second mention stays plain.
        expect(
          links.length,
          `${bridge.slug} links ${id} at most once by title`,
        ).toBeLessThanOrEqual(1);
        if (links.length === 0) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
        anchors.push(links[0]);
        // The anchor is the word as the sentence wrote it, so the graph gains
        // a link in the reader's own sentence, not another card.
        expect(
          bridge.content.includes(links[0]),
          `${bridge.slug}: "${links[0]}" is in the source`,
        ).toBe(true);
      }
    }

    let total = 0;
    for (const count of counts.values()) total += count;
    for (const [id, floor] of Object.entries(LINK_FLOORS)) {
      expect(counts.get(id) ?? 0, id).toBeGreaterThanOrEqual(floor);
    }
    expect(total).toBeGreaterThanOrEqual(TOTAL_FLOOR);
    expect(anchors.length).toBe(total);
  });

  it("never links a declined title on an atom page or a lesson: the exception is guide-only", async () => {
    const declined = await declinedAtoms();
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    expect(threads.length).toBeGreaterThanOrEqual(20);

    // A lesson composes these atoms the way a guide declares them; the
    // exception still does not reach it.
    let composed = 0;
    for (const thread of threads) {
      for (const id of thread.frontmatter.atoms) {
        const target = declined.get(id);
        if (!target) continue;
        composed += 1;
        expect(exceptionLinks(thread.html, target), `${thread.slug} links ${id} by title`).toEqual(
          [],
        );
      }
    }
    expect(composed).toBeGreaterThanOrEqual(20);

    for (const atom of atoms) {
      for (const target of declined.values()) {
        expect(
          exceptionLinks(atom.html, target),
          `${atom.slug} links ${target.id} by title`,
        ).toEqual([]);
      }
    }
  });

  it("never links an atom to its own page", async () => {
    const declined = await declinedAtoms();
    let own = 0;
    for (const atom of await loadAtoms()) {
      const target = declined.get(atom.frontmatter.id);
      if (!target) continue;
      own += 1;
      expect(atom.html, atom.slug).not.toContain(`href="${target.url}"`);
    }
    expect(own).toBeGreaterThanOrEqual(20);
  });
});

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "what-is-improv.html"));

describe("the built guide carries the link in its article", () => {
  /**
   * `what-is-improv` declares `offers` and its prose says "Performers build
   * a scene together in real time out of offers" — a mention the rule
   * declined before the exception. (`conversation-starters`, the entry's
   * example, backticks `offers` at its first mention, so the author's link
   * keeps that slot and its only other "offers" is the verb.)
   */
  it.runIf(built)("/what-is-improv links offers from the article prose", async () => {
    const bridge = (await loadBridges()).find((b) => b.slug === "what-is-improv");
    expect(bridge?.frontmatter.entry_atoms, "what-is-improv declares offers").toContain("offers");

    const html = fs.readFileSync(path.join(APP, "what-is-improv.html"), "utf8");
    const article = /<article[^>]*data-track="body"[^>]*>([\s\S]*?)<\/article>/.exec(html);
    expect(article, "the article body is rendered with data-track=body").not.toBeNull();
    const anchors = [...article![1].matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].filter(
      (m) => m[1] === "/practice/vocabulary/offers",
    );
    expect(anchors.map((m) => m[2])).toEqual(["offers"]);
  });
});
