import { ageNormalisedRank, byRank } from "./atom-rank";
import type { AtomFrontmatter } from "./schema";

/**
 * A failure a principle addresses: an antipattern joined to it by a
 * `contrasts` edge, declared from either end.
 */
export interface PrincipleFailure {
  id: string;
  title: string;
  /** How many atoms link to the antipattern, per month since it was written — the rank when a principle has several. */
  rank: number;
}

/**
 * The map the principles hub prescribes and did not draw.
 *
 * The hub's closing advice is "Name the failure the last show actually had,
 * take the one principle that addresses it, and spend the whole session on
 * that." The graph holds that pairing as `contrasts` edges between the nine
 * principle atoms and the antipattern atoms, and until 2026-09-21 the hub
 * rendered the instruction and not the map (tracker entry 155). Each
 * principle's failures are read here so the hub can list them as links.
 *
 * `contrasts` is the one symmetric relation, so an edge counts whichever
 * atom declared it. That is what closes the entry's two gaps: blocking and
 * overcomplication contrast no principle from their own side, but
 * be-positive and be-simple contrast them, and framing-as-angle-of-approach
 * is contrasted by no antipattern but itself contrasts bulldozing. Read one
 * way the map has two holes on each side; read both ways every principle
 * has a failure and every antipattern a principle. Only antipatterns count —
 * a principle also contrasts definitions and techniques, and those are not
 * failures. A principle with no antipattern pair gets an empty list and the
 * hub renders nothing for it; declaring the missing edge is content
 * authoring, not this module's job, and inventing one here would put a
 * claim on the page the atoms do not make.
 *
 * Within a principle the failures are ordered by how much the graph leans on
 * the antipattern for its age — in-degree per month since `created`
 * (`ageNormalisedRank`, entry 307) — descending, then title, the rank the
 * sidebar's inbound groups use: the failure the rest of the graph cites
 * most is the one to name first. Raw in-degree was the rule until
 * 2026-09-22; nine of the ten antipatterns are March and April atoms, so
 * the two rules mostly agree here, and the one August failure, wimping,
 * is where they part.
 */
export function principleFailures(
  atoms: readonly { frontmatter: AtomFrontmatter }[],
): Map<string, PrincipleFailure[]> {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const rank = ageNormalisedRank(atoms);

  const result = new Map<string, Map<string, PrincipleFailure>>();
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");
  for (const p of principles) result.set(p.frontmatter.id, new Map());

  const pair = (principleId: string, antipatternId: string) => {
    const principle = byId.get(principleId);
    const antipattern = byId.get(antipatternId);
    if (principle?.type !== "principle" || antipattern?.type !== "antipattern") return;
    result.get(principleId)?.set(antipatternId, {
      id: antipattern.id,
      title: antipattern.title,
      rank: rank.get(antipattern.id) ?? 0,
    });
  };

  for (const atom of atoms) {
    const fm = atom.frontmatter;
    for (const link of fm.links ?? []) {
      if (link.relation !== "contrasts") continue;
      if (fm.type === "principle") pair(fm.id, link.id);
      else if (fm.type === "antipattern") pair(link.id, fm.id);
    }
  }

  const ordered = new Map<string, PrincipleFailure[]>();
  for (const [id, failures] of result) {
    ordered.set(id, [...failures.values()].sort(byRank(rank)));
  }
  return ordered;
}
