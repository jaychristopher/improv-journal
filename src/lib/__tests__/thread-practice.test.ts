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

  it("finds linked exercises when a thread does not include direct drills", async () => {
    const recommendations = await getPracticeRecommendationsForThread("building-on-offers");

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some((item) => item.id === "yes-and-chain")).toBe(true);
  });

  it("returns an empty list for unknown threads", async () => {
    await expect(getPracticeRecommendationsForThread("not-a-real-thread")).resolves.toEqual([]);
  });
});
