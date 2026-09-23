import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildGraph } from "../content";
import type { GraphEdge, GraphNode } from "../schema";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const GRAPH_BODY = path.join(APP, "api", "graph.body");

/**
 * The built payload is only evidence while it is newer than the content it
 * describes. The standing build in this tree predates the guide layer landing
 * in the graph, so an ungated `it.runIf(built)` case would read a payload with
 * no bridge node in it and fail on a change that is correct. Newest mtime under
 * content/ against the payload's own is the cheapest honest gate.
 */
function newestContentMtime(dir: string): number {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const at = entry.isDirectory() ? newestContentMtime(full) : fs.statSync(full).mtimeMs;
    if (at > newest) newest = at;
  }
  return newest;
}

const bodyIsFresh =
  built &&
  fs.existsSync(GRAPH_BODY) &&
  fs.statSync(GRAPH_BODY).mtimeMs > newestContentMtime(path.join(process.cwd(), "content"));

const graph = await buildGraph();

const countBy = <T>(items: T[], key: (item: T) => string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
};

const byLayer = countBy(graph.nodes, (n: GraphNode) => n.layer);
const byRelation = countBy(graph.edges, (e: GraphEdge) => e.relation);

/**
 * `/api/graph` is the only machine-readable statement of the whole corpus the
 * site publishes, and for most of its life it described four fifths of one:
 * 242 nodes and 2,679 edges with no guide in them, because `GraphNode.layer`
 * was written before the guide layer existed and was never widened
 * (novel-insights 354). The payload said the corpus was 242 documents when it
 * was 320.
 *
 * Nothing tested it at all — no test imported `buildGraph` before this file —
 * so the absence was invisible and the counts were nobody's reading. What
 * follows are dated readings with floors under them, because the failure mode
 * here is a loader or a selector silently returning less, not the corpus
 * growing.
 */
describe("/api/graph", () => {
  it("publishes every layer, guides included", () => {
    // Reading 2026-09-22: source 1, atom 205, bridge 78, thread 25, path 11,
    // 320 nodes. The bridge count is the point of the change; the others are
    // held so a broken loader cannot pass by returning nothing.
    expect(byLayer.source).toBeGreaterThanOrEqual(1);
    expect(byLayer.atom).toBeGreaterThanOrEqual(200);
    expect(byLayer.bridge).toBeGreaterThanOrEqual(75);
    expect(byLayer.thread).toBeGreaterThanOrEqual(24);
    expect(byLayer.path).toBeGreaterThanOrEqual(11);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(315);
  });

  it("keeps the declared and the derived guide edges apart", () => {
    // Reading 2026-09-22: declares 455, mentions 891, enters 78. Of the 891,
    // 436 are links no guide declared — written by the prose autolinker at
    // render time, which is why reading frontmatter misses most of them.
    //
    // `declares` is `entry_atoms` — what a guide says it is built to enter
    // from. `mentions` is `getBridgeAtomIndex` — the union of that declaration
    // and what the rendered html actually links. The second is a strict
    // superset of the first today, and the comment on `getBridgeAtomIndex` is
    // explicit that the two answer different questions, so one merged relation
    // would be a claim about the corpus that is not true rather than a tidier
    // payload. The gap is asserted as well as the counts: if the two ever
    // match, one of them has stopped being computed.
    expect(byRelation.declares).toBeGreaterThanOrEqual(450);
    expect(byRelation.mentions).toBeGreaterThanOrEqual(880);
    expect(byRelation.enters).toBeGreaterThanOrEqual(75);
    expect(byRelation.mentions).toBeGreaterThan(byRelation.declares);
  });

  it("marks the derived edges and only those", () => {
    // A consumer that wants the corpus as its authors stated it filters on
    // this flag, which is only meaningful if nothing else carries it. Both
    // directions asserted, not just that the flag appears somewhere.
    const derived = graph.edges.filter((e: GraphEdge) => e.derived);
    expect(derived.length).toBeGreaterThanOrEqual(880);
    expect(derived.every((e: GraphEdge) => e.relation === "mentions")).toBe(true);
    expect(graph.edges.filter((e: GraphEdge) => e.relation === "mentions" && !e.derived)).toEqual(
      [],
    );
  });

  it("keeps the relations the 4 original layers contributed", () => {
    // Reading 2026-09-22: extends 795, requires 618, illustrates 509,
    // contrasts 257, enables 256, composes 183, sequences 39,
    // extracted_from 22 — 2,679 edges before the guide layer joined.
    // Held so the guide work cannot be credited with edges it did not add,
    // and so a dropped atom relation surfaces here rather than nowhere.
    expect(byRelation.extends).toBeGreaterThanOrEqual(790);
    expect(byRelation.requires).toBeGreaterThanOrEqual(610);
    expect(byRelation.illustrates).toBeGreaterThanOrEqual(500);
    expect(byRelation.contrasts).toBeGreaterThanOrEqual(250);
    expect(byRelation.enables).toBeGreaterThanOrEqual(250);
    expect(byRelation.composes).toBeGreaterThanOrEqual(180);
    expect(byRelation.sequences).toBeGreaterThanOrEqual(39);
    expect(byRelation.extracted_from).toBeGreaterThanOrEqual(22);
  });

  it("has no dangling edge in either direction", () => {
    // Not a floor. This held at 0 before the guide layer was added, and the
    // payload is worthless to a consumer if it stops holding: an edge pointing
    // at an id the payload does not carry cannot be resolved by anyone
    // downstream. Guide edges are emitted unfiltered, exactly like the atom
    // links, so a mistyped `entry_atoms` or `entry_path` fails here rather
    // than shipping.
    const ids = new Set(graph.nodes.map((n: GraphNode) => n.id));
    const dangling = graph.edges.filter((e: GraphEdge) => !ids.has(e.source) || !ids.has(e.target));
    expect(dangling.map((e) => `${e.source} -${e.relation}-> ${e.target}`)).toEqual([]);
    // Reading 2026-09-22: 4,103 edges, 2,679 of them from the 4 original
    // layers. Guards the assertion above, which a payload carrying no edges at
    // all would otherwise satisfy.
    expect(graph.edges.length).toBeGreaterThanOrEqual(4090);
  });

  it("gives every node a unique id, bar the 1 collision that predates this", () => {
    // A ceiling, not a floor, and the debt is real.
    //
    // 2 guide slugs are also atom ids — `active-listening` and `viewpoints`
    // are each a concept page and a guide about that concept — so keying a
    // guide node on its bare slug would have merged those pairs and silently
    // re-pointed their edges at whichever node won. Guide ids carry a prefix
    // for that reason, and the guide layer adds no collision of its own.
    //
    // `diagnosing-scene-failure` is both an atom id and a thread id and has
    // collided since before the guide layer joined the graph, so the payload
    // has never had unique ids: 242 nodes and 241 ids. Renaming either
    // document changes a published URL, so it is recorded here rather than
    // fixed in passing (2026-09-22). An edge naming it resolves to whichever
    // node a consumer indexed last.
    const ids = graph.nodes.map((n: GraphNode) => n.id);
    const occurrences = countBy(ids, (id: string) => id);
    const duplicates = Object.keys(occurrences)
      .filter((id) => occurrences[id] > 1)
      .sort();
    expect(duplicates).toEqual(["diagnosing-scene-failure"]);
    expect(ids.length).toBeGreaterThanOrEqual(315);

    const bridges = graph.nodes.filter((n: GraphNode) => n.layer === "bridge");
    expect(bridges.length).toBeGreaterThanOrEqual(75);
    expect(bridges.every((n: GraphNode) => n.id.startsWith("bridge:"))).toBe(true);
    expect(bridges.every((n: GraphNode) => n.title.length > 0)).toBe(true);
    // The prefix has to actually separate the layers, which the assertion
    // above does not prove on its own.
    const others = new Set(
      graph.nodes.filter((n: GraphNode) => n.layer !== "bridge").map((n: GraphNode) => n.id),
    );
    expect(bridges.filter((n: GraphNode) => others.has(n.id))).toEqual([]);
  });

  it("agrees with its own meta", () => {
    // `meta` is what a consumer reads instead of counting, so the two have to
    // be the same statement. The old payload carried no bridge count at all,
    // which is how it could claim a 242-document corpus without contradicting
    // itself anywhere.
    expect(graph.meta.sourceCount).toBe(byLayer.source);
    expect(graph.meta.atomCount).toBe(byLayer.atom);
    expect(graph.meta.bridgeCount).toBe(byLayer.bridge);
    expect(graph.meta.threadCount).toBe(byLayer.thread);
    expect(graph.meta.pathCount).toBe(byLayer.path);
    expect(
      graph.meta.sourceCount +
        graph.meta.atomCount +
        graph.meta.bridgeCount +
        graph.meta.threadCount +
        graph.meta.pathCount,
    ).toBe(graph.nodes.length);
    // Reading 2026-09-22: 320 documents, where the payload used to say 242.
    expect(graph.nodes.length).toBeGreaterThanOrEqual(315);
  });

  it("stamps a build time, and a commit only when one was given", () => {
    // `builtAt` changes on every build and says nothing about whether the
    // content moved, so `commit` is what lets a consumer tell two payloads
    // apart. It comes from VERCEL_GIT_COMMIT_SHA or GITHUB_SHA and is absent
    // on a local build — absent rather than guessed, so this asserts the shape
    // of a present value instead of demanding one.
    expect(Number.isNaN(Date.parse(graph.meta.builtAt))).toBe(false);
    if (graph.meta.commit !== undefined) {
      expect(graph.meta.commit).toMatch(/^[0-9a-f]{7,40}$/);
    }
  });

  it.runIf(bodyIsFresh)("ships what buildGraph produces", () => {
    // The route is force-static, so the payload on disk is the one a reader
    // gets. Skipped whenever the build is older than content/, which is the
    // usual state of this tree: a stale body is not evidence about current
    // content, and asserting against one fails correct changes.
    const payload = JSON.parse(fs.readFileSync(GRAPH_BODY, "utf-8"));
    expect(payload.nodes.length).toBe(graph.nodes.length);
    expect(payload.edges.length).toBe(graph.edges.length);
    expect(payload.meta.bridgeCount).toBe(graph.meta.bridgeCount);
  });
});
