import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadAtoms, loadShows } from "../content";
import { libraryIdFromSlug } from "../library-slug";
import {
  citationCounts,
  dependencyOrder,
  forwardEdges,
  libraryPlayOrder,
  pathPlayOrder,
  requiresEdges,
  seasonForwardEdges,
  seasonTieOrder,
} from "../season-order";

/**
 * The Improv Lab is a serial the hub tells listeners to play in order, and
 * until 2026-09-22 the order was a table of contents by type — Principles,
 * Exercises, Techniques, Laws, Diagnosis, Formats, Vocabulary, alphabetical
 * inside — under which 242 of the 618 `requires` edges between its 173
 * episodes pointed at an episode that played later (200 in a later season,
 * 42 later in the same one), and 79 of the 142 episodes before the
 * Vocabulary season required a definition the listener had not heard
 * (tracker entry 303; the entry counted 241, one edge apart from this
 * module's dedupe of a declared-twice edge).
 *
 * Every one of the 5,040 season orders was scored on cross-season forward
 * edges with each season in `dependencyOrder`; Laws, Principles, Vocabulary,
 * Techniques, Diagnosis, Exercises, Formats is the minimum at 72 (tied only
 * with Exercises and Diagnosis swapped, which share no edge), and
 * `content/shows/improv-lab.md` lists the seasons in that order. The
 * residual inside seasons is 7: five principle-to-principle edges the
 * published principle order keeps against the graph, and one cycle each in
 * Techniques and Vocabulary. These tests hold the order to that measure.
 */
describe("season order — the Improv Lab", () => {
  const SEASON_LABELS = [
    "The Laws",
    "The Principles",
    "Vocabulary",
    "The Techniques",
    "Diagnosis",
    "The Exercises",
    "The Formats",
  ];

  async function playOrder() {
    const seasons = await getEpisodesForShow("improv-lab");
    const atoms = (await loadAtoms()).filter((a) => a.frontmatter.type !== "reference");
    const ids = seasons.map((s) => s.episodes.map((ep) => ep.href.split("/").pop()!));
    return { seasons, atoms, ids };
  }

  it("plays 173 episodes in seven seasons, dependency-first", async () => {
    const { seasons, ids } = await playOrder();
    // Guard the guard: 173 episodes on 2026-09-22, one per non-reference atom.
    expect(ids.flat().length).toBeGreaterThanOrEqual(173);
    expect(seasons.map((s) => s.label)).toEqual(SEASON_LABELS);
  });

  it("keeps forward requires edges under the dated ceiling", async () => {
    const { atoms, ids } = await playOrder();
    // Guard the guard: the count is meaningless if the edges vanished.
    expect(requiresEdges(atoms).length).toBeGreaterThanOrEqual(600);

    const measure = seasonForwardEdges(ids, atoms);
    // Ceiling set 2026-09-22 just above the measured 79 (cross-season 72,
    // within-season 7), down from 242. It may only fall: a new atom whose
    // edges run against the season order, or a season moved, fails here so
    // the order is re-measured rather than quietly worsened. Raise only with
    // a re-run of the permutation search recorded in the entry.
    expect(measure.total).toBeLessThanOrEqual(80);
    expect(measure.crossSeason).toBeLessThanOrEqual(73);
    // Inside a season the residual is what no order removes — the five
    // principle edges and two cycles.
    expect(measure.withinSeason).toBeLessThanOrEqual(7);
  });

  it("plays the definitions before most of what requires them", async () => {
    const { atoms, ids } = await playOrder();
    const definitions = new Set(
      atoms.filter((a) => a.frontmatter.type === "definition").map((a) => a.frontmatter.id),
    );
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));
    const flat = ids.flat();
    const vocabularyStarts = flat.findIndex((id) => definitions.has(id));
    expect(vocabularyStarts).toBeGreaterThan(0);
    const beforeVocabulary = flat.slice(0, vocabularyStarts);
    const needing = beforeVocabulary.filter((id) =>
      (byId.get(id)!.frontmatter.links ?? []).some(
        (l) => l.relation === "requires" && definitions.has(l.id),
      ),
    );
    // 79 of 142 before; 8 of 21 on 2026-09-22 (laws and principles that
    // name a term). Ceiling just above the measure.
    expect(beforeVocabulary.length).toBeLessThanOrEqual(22);
    expect(needing.length).toBeLessThanOrEqual(9);
  });

  it("opens each season on an episode that requires nothing in its season", async () => {
    const { seasons, atoms, ids } = await playOrder();
    for (const [i, season] of ids.entries()) {
      // The Principles season is held to the published principle order,
      // which starts on be-present whatever it requires (principle-order.ts).
      if (seasons[i].label === "The Principles") continue;
      const [first] = season;
      const inSeason = atoms.filter((a) => season.includes(a.frontmatter.id));
      const edges = requiresEdges(inSeason);
      const firstRequires = edges.filter((e) => e.from === first);
      // An opener inside a cycle requires its partner and nothing else could
      // go first; otherwise it requires nothing in its own season.
      const cyclic = firstRequires.some((e) =>
        edges.some((back) => back.from === e.to && back.to === first),
      );
      if (!cyclic) expect(firstRequires, seasons[i].label).toEqual([]);
    }
    expect(ids[0][0]).toBe("meaning-is-relational");
    expect(ids[1][0]).toBe("be-present");
  });
});

/**
 * Unit cases for the topological pass, on atoms small enough to reason
 * about by hand.
 */
describe("dependencyOrder", () => {
  type Atom = {
    frontmatter: {
      id: string;
      title: string;
      type: string;
      links?: { id: string; relation: "requires" | "enables" }[];
    };
  };
  const atom = (
    id: string,
    requires: string[] = [],
    type = "technique",
    title = id.toUpperCase(),
  ): Atom => ({
    frontmatter: {
      id,
      title,
      type,
      links: requires.map((r) => ({ id: r, relation: "requires" as const })),
    },
  });
  const ids = (atoms: Atom[]) => atoms.map((a) => a.frontmatter.id);

  it("is the tie order when nothing requires anything", () => {
    const atoms = [atom("c"), atom("a"), atom("b")];
    expect(ids(dependencyOrder(atoms))).toEqual(["a", "b", "c"]);
    expect(ids(seasonTieOrder(atoms))).toEqual(["a", "b", "c"]);
  });

  it("pulls a prerequisite up to just before the first atom that needs it", () => {
    // a requires z; z is alphabetically last. Nothing else moves.
    const atoms = [atom("a", ["z"]), atom("b"), atom("z")];
    expect(ids(dependencyOrder(atoms))).toEqual(["z", "a", "b"]);
    expect(forwardEdges(["a", "b", "z"], atoms)).toHaveLength(1);
    expect(forwardEdges(["z", "a", "b"], atoms)).toHaveLength(0);
  });

  it("pulls a chain of prerequisites up in order", () => {
    const atoms = [atom("a", ["b"]), atom("b", ["c"]), atom("c")];
    expect(ids(dependencyOrder(atoms))).toEqual(["c", "b", "a"]);
  });

  it("emits a cycle as one unit where its earliest member sits", () => {
    const atoms = [atom("a"), atom("b", ["d"]), atom("c"), atom("d", ["b"])];
    expect(ids(dependencyOrder(atoms))).toEqual(["a", "b", "d", "c"]);
    // The edge inside the cycle is the residual no order removes.
    expect(forwardEdges(["a", "b", "d", "c"], atoms)).toHaveLength(1);
  });

  it("ignores edges to atoms outside the list", () => {
    const atoms = [atom("b", ["outside"]), atom("a")];
    expect(ids(dependencyOrder(atoms))).toEqual(["a", "b"]);
    expect(requiresEdges(atoms)).toEqual([]);
  });

  it("keeps principles in their published order, whatever they require of each other", () => {
    const atoms = [
      atom("be-changeable", ["be-positive"], "principle"),
      atom("be-positive", [], "principle"),
      atom("be-present", [], "principle"),
    ];
    expect(ids(dependencyOrder(atoms))).toEqual(["be-present", "be-changeable", "be-positive"]);
    // ...and still counts the edge the order keeps.
    expect(forwardEdges(["be-present", "be-changeable", "be-positive"], atoms)).toHaveLength(1);
  });

  it("lets a non-principle be pulled before the principles that need it", () => {
    const atoms = [
      atom("be-present", ["presence"], "principle"),
      atom("presence", [], "definition"),
    ];
    expect(ids(dependencyOrder(atoms))).toEqual(["presence", "be-present"]);
  });

  it("counts forward edges by season", () => {
    const atoms = [atom("a", ["b", "c"]), atom("b"), atom("c", ["a"])];
    expect(seasonForwardEdges([["a", "b"], ["c"]], atoms)).toEqual({
      total: 2,
      crossSeason: 1,
      withinSeason: 1,
    });
  });
});

describe("pathPlayOrder and libraryPlayOrder", () => {
  it("orders paths by rank, then audience, then title", () => {
    const rank: Record<string, number> = { root: 0, mid: 1, end1: 2, end2: 2, off: 3 };
    const paths = [
      { frontmatter: { id: "off", title: "Off", audience: ["beginner"] } },
      { frontmatter: { id: "end2", title: "Performer end", audience: ["performer"] } },
      { frontmatter: { id: "end1", title: "Teacher end", audience: ["teacher"] } },
      { frontmatter: { id: "mid", title: "Mid", audience: ["beginner"] } },
      { frontmatter: { id: "root", title: "Root", audience: ["beginner"] } },
    ];
    expect(pathPlayOrder(paths, (id) => rank[id]).map((p) => p.frontmatter.id)).toEqual([
      "root",
      "mid",
      "end1",
      "end2",
      "off",
    ]);
  });

  it("orders the library by how many concepts cite each work", () => {
    const link = (id: string) => ({ id, relation: "extends" as const });
    const atoms = [
      { frontmatter: { id: "ref-a", title: "A", type: "reference", links: [link("ref-b")] } },
      { frontmatter: { id: "ref-b", title: "B", type: "reference" } },
      { frontmatter: { id: "ref-c", title: "C", type: "reference" } },
      { frontmatter: { id: "x", title: "X", type: "law", links: [link("ref-b"), link("ref-b")] } },
      { frontmatter: { id: "y", title: "Y", type: "law", links: [link("ref-b"), link("ref-c")] } },
    ];
    // A reference citing a reference does not count; a concept citing a work
    // twice counts once.
    expect(citationCounts(atoms).get("ref-b")).toBe(2);
    expect(citationCounts(atoms).get("ref-a")).toBeUndefined();
    const refs = atoms.filter((a) => a.frontmatter.type === "reference");
    expect(libraryPlayOrder(refs, atoms).map((a) => a.frontmatter.id)).toEqual([
      "ref-b",
      "ref-c",
      "ref-a",
    ]);
  });

  it("is what every show plays: no season is in load order by accident", async () => {
    // Guard the guard for the Deep Cuts seasons: the library opens on the
    // most-cited work, not the alphabet.
    const shows = await loadShows();
    expect(shows.length).toBeGreaterThanOrEqual(3);
    const deepCuts = await getEpisodesForShow("deep-cuts");
    const library = deepCuts.find((s) => s.label === "The Library");
    expect(library).toBeDefined();
    expect(library!.episodes.length).toBeGreaterThanOrEqual(30);
    const atoms = await loadAtoms();
    const counts = citationCounts(atoms);
    // The href ends in the library slug; the citation counts are keyed by
    // atom id, which still carries the `ref-` prefix.
    const played = library!.episodes.map(
      (ep) => counts.get(libraryIdFromSlug(ep.href.split("/").pop()!)) ?? 0,
    );
    for (let i = 1; i < played.length; i++) expect(played[i]).toBeLessThanOrEqual(played[i - 1]);
    expect(played[0]).toBeGreaterThanOrEqual(40);
  });
});
