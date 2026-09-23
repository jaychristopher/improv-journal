import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadThreads } from "../content";

/**
 * The audio does not rescue what the page omits (tracker entry 299,
 * 2026-09-22). Of the guides' 455 declared entry atoms the body named 370
 * and the script 188, both 183, the script alone 5 and neither 80; of the
 * lessons' 183 the body named 117, the script 105, both 98, the script alone
 * 7 and neither 59. The "neither" set is the declaration a page makes in
 * frontmatter and states in no medium; it reaches a reader or a listener
 * only as a list. Held as ceilings that may only fall; the script-only count
 * is a reading, since a re-cut may raise it on purpose.
 *
 * Naming: the body counts a title mention or a backticked id (the id renders
 * as the linked title); a script counts a title mention (scripts carry no
 * backticks). Parentheticals in titles are dropped, as the tracker measured.
 */
const CEILINGS = { guides: 80, lessons: 59 };

function phrase(title: string): RegExp {
  const plain = title.replace(/\s*\([^)]*\)/g, "").trim();
  const escaped = plain
    .split("")
    .map((c) => (/[A-Za-z0-9 ]/.test(c) ? c : "\\" + c))
    .join("");
  return new RegExp("(?<![A-Za-z0-9])" + escaped + "(?![A-Za-z0-9])", "i");
}

function script(dir: string, id: string): string {
  const file = path.join(process.cwd(), "content", "scripts", dir, `${id}-tts.txt`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
}

describe("declared concepts named in neither the body nor the script", () => {
  it("stay under the ceilings recorded when the join was first read", async () => {
    const atoms = await loadAtoms();
    const titles = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.title]));
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const layers = [
      { key: "guides" as const, dir: "bridges", docs: await loadBridges() },
      { key: "lessons" as const, dir: "threads", docs: await loadThreads() },
    ];
    for (const layer of layers) {
      let declared = 0;
      let neither = 0;
      let scriptOnly = 0;
      for (const doc of layer.docs) {
        const fm = doc.frontmatter as { entry_atoms?: string[]; atoms?: string[]; id?: string };
        const ids = layer.key === "guides" ? (fm.entry_atoms ?? []) : (fm.atoms ?? []);
        const id = layer.key === "guides" ? (doc as { slug: string }).slug : (fm.id ?? "");
        const body = doc.content;
        const audio = script(layer.dir, id);
        for (const atomId of ids) {
          const title = titles.get(atomId);
          if (!title) continue;
          declared += 1;
          const inBody = phrase(title).test(body) || body.includes(`\`${atomId}\``);
          const inScript = audio !== "" && phrase(title).test(audio);
          if (!inBody && !inScript) neither += 1;
          if (inScript && !inBody) scriptOnly += 1;
        }
      }
      // Guard the guard: a broken scan would report nothing declared.
      expect(declared, layer.key).toBeGreaterThanOrEqual(layer.key === "guides" ? 400 : 150);
      expect(
        neither,
        `${layer.key}: ${neither} declared concepts named nowhere`,
      ).toBeLessThanOrEqual(CEILINGS[layer.key]);
      // The reading: 5 (guides) and 7 (lessons) on 2026-09-22.
      expect(scriptOnly, layer.key).toBeGreaterThanOrEqual(0);
    }
  });
});
