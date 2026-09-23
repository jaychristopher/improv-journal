/**
 * Where every declared `parent` sits relative to the pages this site has.
 *
 * `parent` is the broader term Ahrefs says Google ranks a page for when it
 * ranks it for a keyword at all, and it is the only field in the corpus that
 * names a topic *above* a page. One thing reads it today — the test that no 2
 * guides claim the same parent — and that test passes on data where it cannot
 * fail, because most parents are the declaring guide's own keyword (tracker
 * entry 99). Classifying the field says what it is actually recording.
 *
 * The 4 places a parent can sit, on 2026-09-22 (tracker entry 352): of 137
 * distinct parents, 86 are the keyword they are attached to, 6 are another
 * keyword on the same guide, 1 is a keyword on a different guide, and 44 are
 * head terms no page on the site claims.
 *
 * Unclaimed is a decision, not a defect. The parent is usually the head term
 * a page deliberately did not chase — `active-listening` targets "active
 * listening skills" and names "active listening" only as its parent — so the
 * reading that matters beside an unclaimed head is the child guide's own
 * `serp_verdict`: `authority` is somebody having looked at those results and
 * left them, and no verdict at all is nobody having looked. Nothing here
 * invents a figure: every number returned is either counted from the
 * frontmatter or copied out of it.
 *
 * A .mjs module and not .ts because scripts/seo-audit.mjs and
 * scripts/seeds.mjs both read it, and a .mjs script cannot import a .ts
 * module without a node flag neither npm script carries. src/lib/
 * route-pages.mjs and src/lib/content-history.mjs are the same arrangement,
 * and parent-topics.test.ts imports this the way llms-hubs.test.ts imports
 * those — one classification, so the report and the guard cannot disagree.
 */

/** Parents and keywords are compared as search terms, not as typed strings. */
const norm = (value) => String(value).trim().toLowerCase();

/**
 * Classify every `parent` declared by the guides.
 *
 * @param {{ id: string, keywords?: { keyword: string, parent?: string, traffic_potential?: number }[], verdict?: string | null }[]} guides
 *   One entry per guide: its id, its `target_keywords` as written, and its
 *   page-level `serp_verdict` (null where the results have not been looked
 *   at — absence is the correct state for an unchecked result).
 */
export function classifyKeywordParents(guides) {
  // Which guide claims each keyword. Ownership is by *any* declared keyword
  // and not just the primary, because both collisions the parent field was
  // added for arrived through a secondary. A keyword declared twice is the
  // collision report's business, so the first declarer wins here.
  const owner = new Map();
  for (const guide of guides) {
    for (const kw of guide.keywords ?? []) {
      const key = norm(kw.keyword);
      if (!owner.has(key)) owner.set(key, guide.id);
    }
  }

  const parents = new Map();
  let keywords = 0;
  let withParent = 0;
  for (const guide of guides) {
    for (const kw of guide.keywords ?? []) {
      keywords += 1;
      if (!kw.parent) continue;
      withParent += 1;
      const key = norm(kw.parent);
      const record = parents.get(key) ?? { parent: kw.parent, children: [] };
      record.children.push({
        guide: guide.id,
        keyword: kw.keyword,
        // Copied, never derived: a keyword with no traffic potential recorded
        // has none here either.
        trafficPotential: typeof kw.traffic_potential === "number" ? kw.traffic_potential : null,
        verdict: guide.verdict ?? null,
        self: key === norm(kw.keyword),
      });
      parents.set(key, record);
    }
  }

  const classified = [...parents.entries()].map(([key, record]) => {
    const claimedBy = owner.get(key) ?? null;
    // Order matters: a parent claimed by nobody is unclaimed however its
    // children declare it, and a parent whose claimant is not among the
    // guides declaring it is the cross-guide case even if some other guide
    // also names it as its own keyword's parent.
    let kind;
    if (!claimedBy) kind = "unclaimed";
    else if (!record.children.some((c) => c.guide === claimedBy)) kind = "otherGuide";
    else if (record.children.some((c) => c.self)) kind = "self";
    else kind = "sameGuide";

    const potentials = record.children
      .map((c) => c.trafficPotential)
      .filter((n) => typeof n === "number");
    return {
      ...record,
      claimedBy,
      kind,
      guides: [...new Set(record.children.map((c) => c.guide))],
      verdicts: [...new Set(record.children.map((c) => c.verdict))],
      // No verdict on any child is the state worth a person's time: the head
      // was not written off, nobody looked.
      unjudged: record.children.every((c) => !c.verdict),
      bestTrafficPotential: potentials.length ? Math.max(...potentials) : null,
    };
  });

  const of = (kind) => classified.filter((p) => p.kind === kind);
  return {
    guideCount: guides.length,
    keywords,
    withParent,
    distinct: classified.length,
    self: of("self"),
    sameGuide: of("sameGuide"),
    otherGuide: of("otherGuide"),
    // Sorted the way the decision is made: on traffic potential, which beats
    // volume, with the parent string breaking ties so the order is stable.
    unclaimed: of("unclaimed").sort(
      (a, b) =>
        (b.bestTrafficPotential ?? 0) - (a.bestTrafficPotential ?? 0) ||
        a.parent.localeCompare(b.parent),
    ),
    // The page hierarchy the field could draw, one entry per child keyword.
    crossGuideEdges: of("otherGuide").flatMap((p) =>
      p.children.map((c) => ({ from: c.guide, to: p.claimedBy, via: c.keyword, parent: p.parent })),
    ),
  };
}
