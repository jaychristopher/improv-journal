import { describe, expect, it } from "vitest";

import { getEpisodesForShow } from "../content";

describe("episode durations", () => {
  it("physics-of-connection episodes have duration strings", async () => {
    const seasons = await getEpisodesForShow("physics-of-connection");
    for (const season of seasons) {
      for (const ep of season.episodes) {
        expect(ep.duration, `${ep.title} missing duration`).toMatch(/^\d+:\d{2}$/);
      }
    }
  });

  it("improv-lab episodes have duration strings", async () => {
    const seasons = await getEpisodesForShow("improv-lab");
    for (const season of seasons) {
      for (const ep of season.episodes) {
        expect(ep.duration, `${ep.title} missing duration`).toMatch(/^\d+:\d{2}$/);
      }
    }
  });

  it("durations are reasonable (30s - 15min)", async () => {
    const seasons = await getEpisodesForShow("physics-of-connection");
    for (const season of seasons) {
      for (const ep of season.episodes) {
        const [mins, secs] = ep.duration!.split(":").map(Number);
        const totalSecs = mins * 60 + secs;
        expect(totalSecs).toBeGreaterThan(30);
        expect(totalSecs).toBeLessThan(900);
      }
    }
  });
});
