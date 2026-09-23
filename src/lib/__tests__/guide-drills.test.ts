import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getGuideConcepts, getGuideDrills } from "../guide-concepts";

/**
 * `entry_atoms` is the concept layer only (nine exercises across the corpus),
 * while 32 guides end on a drill card and the bodies backtick 140 drill
 * references, so "The ideas behind this guide" never showed the drill the
 * page recommends (tracker entry 194, 2026-09-21). The block now reads the
 * drills from the body.
 */
describe("guide drills", () => {
  it("lists the CTA drill first and only exercises", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    let withDrills = 0;
    let ctaChecked = 0;
    for (const b of bridges) {
      const drills = await getGuideDrills(b.slug);
      for (const d of drills) expect(d.type, `${b.slug}: ${d.id}`).toBe("exercise");
      expect(drills.length).toBeLessThanOrEqual(4);
      if (drills.length > 0) withDrills += 1;
      const fm = b.frontmatter;
      if (fm.primary_cta_type === "exercise" && fm.primary_cta_target) {
        ctaChecked += 1;
        expect(drills[0]?.id, b.slug).toBe(fm.primary_cta_target);
      }
    }
    // 46 guides backtick a drill without declaring one; the row exists for them.
    expect(withDrills).toBeGreaterThanOrEqual(40);
    expect(ctaChecked).toBeGreaterThanOrEqual(30);
  });

  it("does not duplicate a concept already declared", async () => {
    const bridges = await loadBridges();
    for (const b of bridges) {
      const concepts = new Set((await getGuideConcepts(b.slug)).map((c) => c.id));
      const drills = await getGuideDrills(b.slug);
      // A declared exercise may appear in both; that is the field's choice.
      // What must not happen is a non-exercise leaking into the drills row.
      for (const d of drills) if (concepts.has(d.id)) expect(d.type).toBe("exercise");
    }
  });
});
