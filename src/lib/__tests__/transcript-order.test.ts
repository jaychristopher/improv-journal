import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The transcript fold rendered inside the player card, under the H1, so on
 * all 319 pages that carry one the transcript preceded the article in DOM
 * order, and on 149 of them it was most of the text in main — 69% of a
 * lesson page's, 57% of a path's, 52% of a concept's. The first thousand
 * words a crawler met on a beginner lesson were two hosts talking about the
 * subject rather than the lesson (tracker entry 260, 2026-09-21). The fold
 * is now a section of its own after the prose and before the connections,
 * and the player links down to it.
 *
 * Presence, not markup: the failure modes are a route that mounts the fold
 * back inside the player, and a player that loses its anchor.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** The five routes that render a transcript, and the layer each passes. */
const ROUTES: Record<string, string> = {
  "src/components/AtomDetail.tsx": "atoms",
  "src/app/[slug]/page.tsx": "bridges",
  "src/app/threads/[slug]/page.tsx": "threads",
  "src/app/library/[slug]/page.tsx": "atoms",
  "src/app/paths/[slug]/page.tsx": "paths",
};

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

describe("transcript order", () => {
  it("mounts the fold after the article on every route, outside the player", () => {
    for (const [file, layer] of Object.entries(ROUTES)) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf-8");
      const article = src.indexOf("<article");
      // By pattern, not literal: on the concept page the fold takes a fifth
      // prop (the region wrapper draws its separator, tracker entry 317), so
      // prettier puts `layer` on the line after `<Transcript`.
      const fold = src.search(new RegExp(`<Transcript\\s+layer="${layer}"`));
      expect(article, `${file}: article`).toBeGreaterThan(-1);
      expect(fold, `${file}: fold`).toBeGreaterThan(article);
      // The player is self-closing now: the fold is no longer its child.
      expect(src, file).not.toMatch(/<AudioPlayer[^>]*>\s*<Transcript/);
      expect(src, file).toContain(`transcriptHref={transcriptHref("${layer}"`);
    }
  });

  it("gives the player an anchor down to the fold", () => {
    const player = fs.readFileSync(path.join(ROOT, "src/components/AudioPlayer.tsx"), "utf-8");
    expect(player).toContain("transcriptHref");
    expect(player).toContain("Read the transcript");
    const fold = fs.readFileSync(path.join(ROOT, "src/components/Transcript.tsx"), "utf-8");
    expect(fold).toContain('TRANSCRIPT_ANCHOR = "transcript"');
    expect(fold).toContain("id={TRANSCRIPT_ANCHOR}");
    expect(fold).toContain("data-transcript");
  });

  it.runIf(built)("puts the article before the fold on every built page that has one", () => {
    const withFold = walk(APP).filter((file) =>
      fs.readFileSync(file, "utf-8").includes("data-transcript"),
    );
    // 319 pages carried a fold on 2026-09-21.
    expect(withFold.length).toBeGreaterThanOrEqual(300);

    const wrong: string[] = [];
    const unlinked: string[] = [];
    for (const file of withFold) {
      const html = fs.readFileSync(file, "utf-8");
      const article = html.indexOf("<article");
      const fold = html.indexOf("data-transcript");
      if (article < 0 || fold < article) wrong.push(path.relative(APP, file));
      if (!html.includes('href="#transcript"') || !html.includes('id="transcript"')) {
        unlinked.push(path.relative(APP, file));
      }
    }
    expect(wrong, "pages whose transcript fold precedes the article").toEqual([]);
    expect(unlinked, "pages whose player does not link to the fold").toEqual([]);
  });
});
