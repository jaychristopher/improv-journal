import { describe, expect, it } from "vitest";

import { getPracticeRecommendationsForThread } from "../content";

describe("thread practice recommendations", () => {
  it("surfaces direct exercise atoms before linked ones", async () => {
    const recommendations = await getPracticeRecommendationsForThread("quieting-the-planning-mind");

    expect(recommendations.map((item) => item.id)).toEqual([
      "mirroring",
      "one-word-scene",
      "blind-offer",
    ]);
    expect(recommendations.every((item) => item.source === "direct")).toBe(true);
  });

  /**
   * Until 2026-09-22 this expected mirroring, last-word-response and
   * gift-giving: the first three exercises reached by walking the lesson's
   * atoms in frontmatter order. Entry 270 then ranked neighbours by how many
   * of the lesson's atoms they share, which put One-Word Scene first: it
   * touches three of Building on Offers' atoms, and its own Trains line says
   * "warm-up" (tracker entry 297). The rank now reads the drill's purpose
   * before its edges: Yes-And Chain and Blind Offer both carry a Trains line
   * naming one of the lesson's atoms, so they lead, in shared-edge order
   * (Yes-And Chain touches three, Blind Offer two), and One-Word Scene, which
   * names none, follows on its edges. The purpose travels with each pick so
   * the row can say why. All three are beginner drills, the lesson's level.
   */
  it("finds linked exercises when a thread does not include direct drills", async () => {
    const recommendations = await getPracticeRecommendationsForThread("building-on-offers");

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((item) => item.source === "linked")).toBe(true);
    expect(recommendations.map((item) => item.id)).toEqual([
      "yes-and-chain",
      "blind-offer",
      "one-word-scene",
    ]);
    expect(recommendations.map((item) => item.purpose?.trains)).toEqual([true, true, false]);
    for (const item of recommendations) expect(item.purpose?.concept).toBeTruthy();
  });

  it("returns an empty list for unknown threads", async () => {
    await expect(getPracticeRecommendationsForThread("not-a-real-thread")).resolves.toEqual([]);
  });
});
