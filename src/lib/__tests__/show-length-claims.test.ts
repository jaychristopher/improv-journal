import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadShows } from "../content";

/**
 * A show's copy may state how long an episode is. The manifest records how
 * long each one actually is. Improv Lab promised "three minutes" from its
 * first commit (2026-04-07) while every one of its 205 episodes ran over
 * four and a half, median six (tracker entry 193, 2026-09-21). Any stated
 * minute count must sit within a quarter of the measured median.
 */
const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function statedMinutes(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\b(\d+|[a-z]+)[- ]minutes?\b/gi)) {
    const n = Number(m[1]) || WORDS[m[1].toLowerCase()];
    if (n) out.push(n);
  }
  return out;
}

function toSeconds(formatted: string | undefined): number | null {
  if (!formatted) return null;
  const [m, s] = formatted.split(":").map(Number);
  return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null;
}

describe("show length claims", () => {
  it("state a length within a quarter of the measured median", async () => {
    const shows = await loadShows();
    expect(shows.length).toBe(3);
    const hub = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "listen", "page.tsx"),
      "utf-8",
    );
    let claims = 0;
    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      const secs = seasons
        .flatMap((s) => s.episodes)
        .map((e) => toSeconds(e.duration))
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);
      expect(secs.length, show.frontmatter.id).toBeGreaterThan(10);
      const median = secs[Math.floor(secs.length / 2)] / 60;
      const copy = `${show.frontmatter.description} ${show.content}`;
      // The hub blurb for this show: the object literal whose id matches.
      const blurb =
        hub.match(new RegExp(`id: "${show.frontmatter.id}"[\s\S]*?body: "([^"]*)"`))?.[1] ?? "";
      for (const stated of [...statedMinutes(copy), ...statedMinutes(blurb)]) {
        claims += 1;
        expect(
          Math.abs(stated - median) / median,
          `${show.frontmatter.id} says ${stated} min, median is ${median.toFixed(1)}`,
        ).toBeLessThanOrEqual(0.25);
      }
    }
    // The corpus makes at least one such claim; the guard fails if the
    // extractor stops finding it.
    expect(claims).toBeGreaterThanOrEqual(2);
  });
});
