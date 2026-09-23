import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  audienceReaders,
  fallbackExerciseForLevels,
  guideDrillLevels,
  guidePathNote,
  targetOnEntryPath,
} from "../bridge-cta-fallback";
import { loadAtoms, loadBridges, loadPaths } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "stage-fright.html")) &&
  fs.existsSync(path.join(APP, "conversation-starters.html"));

/**
 * A guide says which path it belongs to twice: `entry_path`, which seven
 * modules read for the lesson hand-off tier, the audience hubs, the related
 * guides, the concept block and the CTA level check, and
 * `secondary_cta_target`, which one card on the page renders. On 2026-09-22
 * the two agreed on 33 of the 39 guides declaring both and disagreed on the
 * six April flagships, where the visible card sent the reader to Foundations
 * or a beginner lesson and the invisible field filed the guide under Systems
 * of Improv, Improv for Life or, for stage-fright, The Art of Ensemble — the
 * performer's last path, rank 6 — so the reader was offered a beginner path
 * by the card and judged a performer by everything derived (tracker entry
 * 285).
 *
 * The page now renders the entry path's audience beside the path card ("For
 * beginners.") and, where the card disagrees, says where the guide is filed
 * ("This guide is filed under The Art of Ensemble, for performers."), so a
 * wrong field is noticed by reading. This file holds the disagreements to a
 * named, dated, shrink-only list until the author resolves each, and measures
 * the notes the page adds.
 */

/**
 * Guides whose secondary CTA names a path other than the entry path, or a
 * lesson the entry path does not sequence, on 2026-09-22. Five, not the
 * tracker's six: what-is-improv's secondary is Building on Offers, a lesson
 * on its entry path Foundations, so by the page's rule it agrees and is
 * pinned separately below. Resolving one means changing the guide's
 * `entry_path` or `secondary_cta_target` — content, the author's call, since
 * the tier, the hubs and the level check all follow `entry_path`. The set may
 * shrink; it may not grow, and a resolved entry must be struck.
 */
const DISAGREEING_GUIDES = new Set([
  "active-listening", // physics-of-connection → beginner-foundations
  "how-to-be-funny", // systems-of-improv → building-on-offers, a Foundations lesson
  "how-to-be-less-awkward", // improv-for-life → beginner-foundations
  "how-to-stop-overthinking", // systems-of-improv → beginner-foundations
  "stage-fright", // the-art-of-ensemble (performer) → beginner-foundations
]);

interface GuidePathFields {
  slug: string;
  entryPath: string;
  secondary?: string;
  /** Whether the secondary target is the entry path or one of its lessons. */
  secondaryAgrees?: boolean;
  /** Whether the page shows a card whose target is a path. */
  hasPathCard: boolean;
  /** The note the page's path or lesson card carries, mirroring `withPathNote`. */
  note: string | null;
}

/**
 * Mirrors the page: a path card is a declared primary path, a secondary
 * path, or the entry-path fallback when no CTA is declared and the closer
 * names no drill. The note is the entry path's audience clause, or the
 * filed-under note when the card the reader sees points off the path.
 */
async function guidePathFields(): Promise<GuidePathFields[]> {
  const [bridges, paths, atoms] = await Promise.all([loadBridges(), loadPaths(), loadAtoms()]);
  expect(bridges.length).toBeGreaterThanOrEqual(70);
  expect(paths.length).toBeGreaterThanOrEqual(8);
  const byId = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter]));
  const tags = new Map(
    atoms
      .filter((a) => a.frontmatter.type === "exercise")
      .map((a) => [a.frontmatter.id, a.frontmatter.tags ?? []]),
  );

  return bridges.map((b) => {
    const fm = b.frontmatter;
    const entry = byId.get(fm.entry_path);
    expect(entry, `${b.slug}: entry_path ${fm.entry_path} is not a path`).toBeDefined();
    const secondary = fm.secondary_cta_target;
    const secondaryAgrees = secondary ? targetOnEntryPath(secondary, entry!) : undefined;

    const declaredPath = fm.primary_cta_type === "path" ? fm.primary_cta_target : undefined;
    const derivedDrill =
      !fm.primary_cta_type && !fm.primary_cta_target
        ? fallbackExerciseForLevels(b.content, tags, guideDrillLevels(entry!.audience))
        : null;
    const fallback = !fm.primary_cta_type && !derivedDrill;
    const secondaryIsPath = secondary ? byId.has(secondary) : false;
    const hasPathCard = Boolean(declaredPath) || secondaryIsPath || fallback;

    // The first card that carries a note, in page order: primary path,
    // fallback, then the secondary.
    let note: string | null = null;
    if (declaredPath) note = guidePathNote(entry!, targetOnEntryPath(declaredPath, entry!));
    else if (fallback) note = guidePathNote(entry!, true);
    if (!note && secondary && (secondaryIsPath || !secondaryAgrees)) {
      note = guidePathNote(entry!, secondaryAgrees ?? false);
    }

    return {
      slug: b.slug,
      entryPath: fm.entry_path,
      secondary,
      secondaryAgrees,
      hasPathCard,
      note,
    };
  });
}

describe("path card notes", () => {
  it("name the readers the way the level hubs do", () => {
    expect(audienceReaders(["beginner"])).toBe("beginners");
    expect(audienceReaders(["performer"])).toBe("performers");
    expect(audienceReaders(["beginner", "intermediate"])).toBe(
      "beginners and intermediate improvisers",
    );
    expect(audienceReaders([])).toBeNull();
    expect(audienceReaders(undefined)).toBeNull();
    expect(audienceReaders(["not-an-audience"])).toBeNull();
  });

  it("say who the guide is for, and where it is filed when the card disagrees", () => {
    const ensemble = {
      id: "the-art-of-ensemble",
      title: "The Art of Ensemble",
      audience: ["performer"],
      threads: ["playing-together-at-the-highest-level"],
    };
    expect(guidePathNote(ensemble, true)).toBe("For performers.");
    expect(guidePathNote(ensemble, false)).toBe(
      "This guide is filed under The Art of Ensemble, for performers.",
    );
    // A path with no audience still says where the guide is filed.
    expect(guidePathNote({ id: "x", title: "X" }, false)).toBe("This guide is filed under X.");
    expect(guidePathNote({ id: "x", title: "X" }, true)).toBeNull();
    // A target is on the path when it is the path or a lesson it sequences.
    expect(targetOnEntryPath("the-art-of-ensemble", ensemble)).toBe(true);
    expect(targetOnEntryPath("playing-together-at-the-highest-level", ensemble)).toBe(true);
    expect(targetOnEntryPath("beginner-foundations", ensemble)).toBe(false);
  });
});

describe("guide path fields over the corpus", () => {
  it("cover the population, so a changed selector cannot pass vacuously", async () => {
    const guides = await guidePathFields();
    expect(guides.length).toBeGreaterThanOrEqual(70);
    // 39 secondary CTAs on 2026-09-22; under, so a guide gaining or losing
    // one does not fail this, and a loader that stopped reading the field would.
    expect(guides.filter((g) => g.secondary).length).toBeGreaterThanOrEqual(35);
  });

  it("hold the disagreeing guides to the named list, shrink only", async () => {
    const guides = await guidePathFields();
    const disagreeing = guides.filter((g) => g.secondary && !g.secondaryAgrees);

    const unexpected = disagreeing
      .filter((g) => !DISAGREEING_GUIDES.has(g.slug))
      .map((g) => `${g.slug}: entry ${g.entryPath}, secondary ${g.secondary}`);
    const resolved = guides
      .filter((g) => DISAGREEING_GUIDES.has(g.slug) && (!g.secondary || g.secondaryAgrees))
      .map((g) => g.slug);
    expect(unexpected).toEqual([]);
    // A resolved disagreement must be struck from the list, so it only shrinks.
    expect(resolved).toEqual([]);
    expect(disagreeing.length).toBeLessThanOrEqual(DISAGREEING_GUIDES.size);
  });

  it("count what-is-improv as agreeing: its lesson is on its entry path", async () => {
    // The tracker's sixth, by the field strings; by the page's rule Building
    // on Offers is a Foundations lesson and the card and the field agree. If
    // the author moves either field this pins where it went.
    const guides = await guidePathFields();
    const guide = guides.find((g) => g.slug === "what-is-improv");
    expect(guide?.entryPath).toBe("beginner-foundations");
    expect(guide?.secondary).toBe("building-on-offers");
    expect(guide?.secondaryAgrees).toBe(true);
  });

  it("give every path card the audience clause", async () => {
    const guides = await guidePathFields();
    const withCard = guides.filter((g) => g.hasPathCard);
    // 66 of 78 on 2026-09-22: 37 secondary paths, 2 declared primary paths and 27
    // entry-path fallbacks (guides with no CTA and no closer drill). Under.
    expect(withCard.length).toBeGreaterThanOrEqual(60);
    const silent = withCard.filter((g) => !g.note).map((g) => g.slug);
    expect(silent).toEqual([]);
    // And most say "For <readers>." plainly: the 61 agreeing cards.
    const plain = withCard.filter((g) => g.note?.startsWith("For "));
    expect(plain.length).toBeGreaterThanOrEqual(55);
  });

  it("add the filed-under note on exactly the disagreeing guides", async () => {
    const guides = await guidePathFields();
    const noted = guides.filter((g) => g.note?.includes("filed under")).map((g) => g.slug);
    expect(noted.sort()).toEqual([...DISAGREEING_GUIDES].sort());
  });
});

describe("the built guide pages", () => {
  /** The "One more useful step" block, where the secondary card renders. */
  const nextStep = (html: string) => {
    const start = html.indexOf('data-track="guide-next-step"');
    expect(start).toBeGreaterThan(-1);
    return html.slice(start, start + 3000);
  };

  it.runIf(built)("say on /stage-fright that the guide is filed under The Art of Ensemble", () => {
    const html = fs.readFileSync(path.join(APP, "stage-fright.html"), "utf-8");
    const block = nextStep(html);
    expect(block).toContain('href="/paths/beginner-foundations"');
    expect(block).toContain("This guide is filed under The Art of Ensemble, for performers.");
  });

  it.runIf(built)("say on /conversation-starters who the path is for, and nothing else", () => {
    const html = fs.readFileSync(path.join(APP, "conversation-starters.html"), "utf-8");
    const block = nextStep(html);
    expect(block).toContain('href="/paths/improv-for-life"');
    expect(block).toContain("For beginners.");
    expect(block).not.toContain("filed under");
  });
});
