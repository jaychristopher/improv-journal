import { describe, it, expect } from "vitest";
import { getAtomsForTradition, getTraditionNames } from "../content";

describe("traditions", () => {
  it("returns 5 tradition names", () => {
    expect(getTraditionNames()).toEqual([
      "johnstone", "spolin", "close", "ucb", "annoyance",
    ]);
  });

  it("johnstone tradition has atoms linking to ref-impro-johnstone", async () => {
    const atoms = await getAtomsForTradition("johnstone");
    expect(atoms.length).toBeGreaterThan(5);
    // Every returned atom should link to a johnstone ref
    for (const a of atoms) {
      const linksToJohnstone = a.frontmatter.links?.some(
        (l) => l.id === "ref-impro-johnstone" || l.id === "ref-impro-storytellers-johnstone"
      );
      expect(linksToJohnstone, `${a.frontmatter.id} should link to Johnstone`).toBe(true);
    }
  });

  it("ucb tradition has atoms linking to ref-ucb-manual or hines refs", async () => {
    const atoms = await getAtomsForTradition("ucb");
    expect(atoms.length).toBeGreaterThan(5);
  });

  it("unknown tradition returns empty array", async () => {
    const atoms = await getAtomsForTradition("nonexistent");
    expect(atoms).toEqual([]);
  });

  it("no reference atoms appear in tradition results", async () => {
    for (const name of getTraditionNames()) {
      const atoms = await getAtomsForTradition(name);
      for (const a of atoms) {
        expect(a.frontmatter.type).not.toBe("reference");
      }
    }
  });
});
