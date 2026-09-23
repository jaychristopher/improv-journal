import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { GUIDE_CATEGORIES, orderedCategories } from "../guide-categories";
import {
  buildHomeDoors,
  CRAFT_CLUSTER,
  CRAFT_STAGES,
  type DoorOption,
  HOME_DOORS,
} from "../home-doors";
import { HOMEPAGE_SYMPTOMS } from "../homepage-symptoms";
import { getRecommendedPath } from "../path-recommendations";

/**
 * The homepage hero forks by audience, and both branches deal from tables
 * that belong to other pages. Nothing here is a taxonomy of its own, so the
 * failure mode is drift: a cluster added to /guides that no door offers, an
 * audience hub renamed, a path recommendation changed under it (2026-09-23).
 */
const LEARN = path.join(process.cwd(), "src", "app", "learn", "[audience]", "page.tsx");

async function clusterInputs() {
  const bridges = await loadBridges();
  const bySlug = new Set(bridges.map((b) => b.slug));
  return orderedCategories(bridges).map((cluster) => ({
    slug: cluster.slug,
    title: cluster.title,
    description: cluster.description,
    orientation: cluster.orientation,
    count: cluster.slugs.filter((slug) => bySlug.has(slug)).length,
  }));
}

/** Every answer both doors can give. */
function allOptions(doors: Record<string, DoorOption[]>): DoorOption[] {
  return [...doors.communication, ...doors.improv];
}

describe("the two doors", () => {
  it("offers a door for the reader the symptom quiz does not ask about", () => {
    expect(HOME_DOORS.map((d) => d.id)).toEqual(["communication", "improv"]);
    // Every question the page asked before this one was the quiz's, and each
    // of those is first-person about the reader's own experience — "I freeze
    // and overthink". None asks where somebody is with the form, so an
    // improviser had nothing to answer. The guard is that the quiz stays what
    // it is and that the craft door stays to cover what it does not.
    for (const symptom of HOMEPAGE_SYMPTOMS) {
      expect(symptom.label, symptom.id).toMatch(/\b(I|me|my)\b/);
      expect(symptom.label, symptom.id).not.toMatch(/\bstage\b|\bperform|\bclass|\blevel\b/i);
    }
    expect(HOME_DOORS.some((d) => d.id === "improv")).toBe(true);
  });

  it("puts every guide cluster behind exactly one of them", async () => {
    const clusters = await clusterInputs();
    expect(clusters.length).toBeGreaterThanOrEqual(4);
    const applied = buildHomeDoors(clusters).communication.map((o) => o.id);
    // The craft cluster is the improv door's; the rest are the applied
    // door's. A cluster in neither would be unreachable from the hero.
    expect(new Set(applied)).toEqual(
      new Set(clusters.filter((c) => c.slug !== CRAFT_CLUSTER).map((c) => c.slug)),
    );
    expect(GUIDE_CATEGORIES.some((c) => c.slug === CRAFT_CLUSTER)).toBe(true);
    expect(applied).not.toContain(CRAFT_CLUSTER);
    // Same order /guides puts them in, which is by reach.
    expect(applied).toEqual(clusters.filter((c) => c.slug !== CRAFT_CLUSTER).map((c) => c.slug));
  });

  it("names the audience hubs the way the route file titles them", () => {
    const source = fs.readFileSync(LEARN, "utf8");
    for (const stage of CRAFT_STAGES) {
      // Anchored on the audience key so a title moved between audiences
      // fails rather than matching somewhere else in the table.
      const start = source.indexOf(`    ${stage.audience}: {`);
      expect(start, `${stage.audience} is still an audience hub`).toBeGreaterThan(0);
      const block = source.slice(start, start + 400);
      expect(block, stage.audience).toContain(`title: "${stage.hubTitle}"`);
    }
  });

  it("hands over the path each audience is already recommended", async () => {
    const doors = buildHomeDoors(await clusterInputs());
    expect(doors.improv).toHaveLength(CRAFT_STAGES.length);
    for (const [i, stage] of CRAFT_STAGES.entries()) {
      const recommended = getRecommendedPath(stage.audience);
      expect(doors.improv[i].primary.href, stage.audience).toBe(`/paths/${recommended.id}`);
      // The rationale is the table's, not a second account written here.
      expect(doors.improv[i].rationale).toBe(recommended.rationale);
    }
  });

  it("sends every answer to two different pages that exist", async () => {
    const bridges = await loadBridges();
    const options = allOptions(buildHomeDoors(await clusterInputs()));
    expect(options.length).toBeGreaterThanOrEqual(7);

    const paths = new Set(
      fs
        .readdirSync(path.join(process.cwd(), "content", "paths"))
        .map((f) => f.replace(/\.md$/, "")),
    );
    const topics = new Set(GUIDE_CATEGORIES.map((c) => c.slug));
    const audiences = new Set(CRAFT_STAGES.map((s) => s.audience as string));

    for (const option of options) {
      expect(option.primary.href, option.id).not.toBe(option.secondary.href);
      for (const link of [option.primary, option.secondary]) {
        expect(link.label.length, `${option.id} ${link.href}`).toBeGreaterThan(0);
        const pathId = /^\/paths\/(.+)$/.exec(link.href)?.[1];
        const topic = /^\/topics\/(.+)$/.exec(link.href)?.[1];
        const audience = /^\/learn\/(.+)$/.exec(link.href)?.[1];
        if (pathId) expect(paths.has(pathId), link.href).toBe(true);
        else if (topic) expect(topics.has(topic), link.href).toBe(true);
        else if (audience) expect(audiences.has(audience), link.href).toBe(true);
        else throw new Error(`unrecognised destination: ${link.href}`);
      }
    }
    // Guard the guard: the counts on the applied answers are the cluster's
    // real membership, so an empty bridge load would not pass quietly.
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    for (const option of buildHomeDoors(await clusterInputs()).communication) {
      expect(Number(option.primary.kicker.split(" ")[0]), option.id).toBeGreaterThan(0);
    }
  });
});
