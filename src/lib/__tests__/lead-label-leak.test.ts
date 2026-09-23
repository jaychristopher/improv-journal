import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { atomPageDescription, extractDescription } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * No structured-data description begins with the page's own bold label.
 *
 * Concept atoms open with a bold label — "**Alias:**" on the nine principles,
 * "**Trains:**" on 24 exercises — that belongs on the page and not in a
 * description. The markdown extractor had dropped it since stripLeadLabel, but
 * the two HTML extractors had not, so every principle page told a crawler its
 * definition was "Alias: Act before you're ready" and 24 exercises led with
 * "Trains:". The meta tag on the same pages was already clean, which is what
 * made it easy to miss.
 *
 * The two labels need opposite handling and that is the part worth guarding.
 * "Alias:" glosses the same concept, so the sentence after it is kept.
 * "Trains: Be Changeable" and "Technique for: Be Simple" name a *different*
 * concept, so keeping the sentence would define the wrong thing — Emotion
 * Switch was described as Be Changeable. Those paragraphs are skipped instead.
 *
 * The third form is the one this file could not see. The three recovery
 * patterns open with a *plain* label — "Recovery: Decay is how to recover
 * when…" — and because it was never bold it was a label only to a reader. The
 * built meta descriptions on those three pages began "Recovery: Decay is how
 * to recover", the only content pages on the site whose snippet started with a
 * label (tracker entry 146). The bold regex passed them through, and this
 * test, checking the bold form, passed with them. The built check now names
 * that label too, and the source-level check below asserts the derived text
 * directly so the guard does not depend on a fresh build.
 */
describe("lead labels", () => {
  it.runIf(built)("never open a structured-data description", () => {
    const offenders: string[] = [];
    let checked = 0;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const html = fs.readFileSync(full, "utf8");
        for (const match of html.matchAll(/"description":"([^"]*)"/g)) {
          checked += 1;
          // "Recovery:" is only a leak when a sentence follows it. The
          // PodcastEpisode entity on the same page uses the title — "Recovery:
          // Decay", nothing after — as its description, and that is the title
          // doing its job, not the label escaping the stripper.
          if (/^(Alias|Trains|[A-Za-z ]+ for):|^Recovery: \S+\s/.test(match[1])) {
            offenders.push(`${full.replace(APP, "")}: "${match[1].slice(0, 40)}…"`);
          }
        }
      }
    };
    walk(APP);

    // A changed extractor would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(300);
    expect([...new Set(offenders)]).toEqual([]);
  });

  /**
   * The plain form, checked at the source so it holds without a build.
   *
   * The shape the stripper removes is one to three capitalised words and a
   * colon at the very start of the body. Matching that shape against every
   * derived description — not only the three that leaked — is what catches
   * the next atom that opens the same way.
   */
  it("never open a derived atom description in their plain form", async () => {
    const atoms = await loadAtoms();
    const derived = atoms.filter((a) => !a.frontmatter.description?.trim());
    // Guard the guard: a changed loader or a corpus that grew hand-written
    // descriptions everywhere would otherwise make this pass on nothing.
    expect(derived.length).toBeGreaterThanOrEqual(180);

    const plainLabel = /^[A-Z][A-Za-z'’-]*(?: [A-Z][A-Za-z'’-]*){0,2}:\s/;
    const offenders = derived
      .map((a) => ({ id: a.frontmatter.id, desc: atomPageDescription(a) }))
      .filter(({ desc }) => plainLabel.test(desc))
      .map(({ id, desc }) => `${id}: "${desc.slice(0, 40)}…"`);
    expect(offenders).toEqual([]);

    // The three that leaked, by name, so the assertion above cannot be
    // satisfied by the regex drifting away from the shape it is meant to see.
    for (const id of ["decay-recovery", "fracture-recovery", "latency-recovery"]) {
      const atom = atoms.find((a) => a.frontmatter.id === id);
      expect(atom, id).toBeDefined();
      const desc = atomPageDescription(atom!);
      expect(desc, id).not.toMatch(/^Recovery:/);
      // The sentence after the label names the concept, so it should survive.
      expect(desc, id).toMatch(/^(Decay|Fracture|Latency) is how to recover/);
    }
  });

  /**
   * The negative control. "Yes, And: The First Rule of Improv is the most
   * widely known shorthand…" is a sentence whose subject happens to end in a
   * colon, and the comma inside the subject is what keeps it out of the
   * stripper's reach. yes-and ships a written description so the page is not
   * affected either way; the derived text is checked here precisely because
   * nothing else would notice the stripper eating the opening of a sentence.
   */
  it("leave a comma-bearing opening such as 'Yes, And:' alone", async () => {
    const atoms = await loadAtoms();
    const yesAnd = atoms.find((a) => a.frontmatter.id === "yes-and");
    expect(yesAnd).toBeDefined();
    expect(extractDescription(yesAnd!.content)).toMatch(/^Yes, And: The First Rule of Improv/);
  });
});
