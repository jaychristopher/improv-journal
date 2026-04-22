import { describe, expect, it } from "vitest";

import { getAtomBySlug, getPathBySlug, getThreadBySlug, loadBridges } from "../content";
import { HOMEPAGE_SYMPTOMS } from "../homepage-symptoms";

describe("bridge funnel metadata", () => {
  it("homepage symptom guides resolve to a real primary CTA", async () => {
    const bridges = await loadBridges();
    expect(HOMEPAGE_SYMPTOMS.length).toBeGreaterThanOrEqual(5);

    for (const symptom of HOMEPAGE_SYMPTOMS) {
      const bridge = bridges.find((candidate) => candidate.slug === symptom.bridgeSlug);
      expect(bridge, `missing bridge ${symptom.bridgeSlug}`).toBeDefined();

      const fm = bridge!.frontmatter;
      expect(
        fm.primary_problem?.trim().length,
        `${symptom.bridgeSlug} missing primary_problem`,
      ).toBeGreaterThan(0);
      expect(fm.primary_cta_type, `${symptom.bridgeSlug} missing primary_cta_type`).toBeDefined();
      expect(
        fm.primary_cta_target?.trim().length,
        `${symptom.bridgeSlug} missing primary_cta_target`,
      ).toBeGreaterThan(0);

      if (fm.primary_cta_type === "path") {
        expect(
          await getPathBySlug(fm.primary_cta_target!),
          `${symptom.bridgeSlug} points to a missing path ${fm.primary_cta_target}`,
        ).toBeDefined();
      } else if (fm.primary_cta_type === "thread") {
        expect(
          await getThreadBySlug(fm.primary_cta_target!),
          `${symptom.bridgeSlug} points to a missing thread ${fm.primary_cta_target}`,
        ).toBeDefined();
      } else if (fm.primary_cta_type === "exercise") {
        const atom = await getAtomBySlug(fm.primary_cta_target!);
        expect(
          atom,
          `${symptom.bridgeSlug} points to a missing exercise ${fm.primary_cta_target}`,
        ).toBeDefined();
        expect(atom?.frontmatter.type).toBe("exercise");
      } else if (fm.primary_cta_type === "challenge") {
        expect.fail(`${symptom.bridgeSlug} should not use challenge CTAs yet`);
      }

      if (fm.secondary_cta_target) {
        const path = await getPathBySlug(fm.secondary_cta_target);
        const thread = await getThreadBySlug(fm.secondary_cta_target);
        const atom = await getAtomBySlug(fm.secondary_cta_target);

        expect(
          path || thread || atom,
          `${symptom.bridgeSlug} points to a missing secondary target ${fm.secondary_cta_target}`,
        ).toBeTruthy();
      }
    }
  });
});
