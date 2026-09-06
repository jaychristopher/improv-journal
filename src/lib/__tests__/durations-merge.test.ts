import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// @ts-expect-error - .mjs build script, no types
import { mergeDurations, preservedKeys } from "../../../scripts/generate-durations.mjs";

/**
 * The manifest survives a machine that does not have the MP3s.
 *
 * durations.json is the only evidence a production build has that a page's
 * audio exists — the MP3s are gitignored and served from R2. The generator
 * used to write it from scratch out of whatever happened to be on disk, so
 * running it after a cleanup that removed 179 local files would have dropped
 * those 179 entries and silently un-published the pages, with a green test
 * suite either side of it.
 *
 * These assert the merge rule rather than the measurement, because the rule is
 * the half that can lose published audio.
 */
describe("durations manifest merge", () => {
  const existing = {
    "/audio/atoms/kept.mp3": { seconds: 100, formatted: "1:40", size: 1600000 },
    "/audio/bridges/remeasured.mp3": { seconds: 200, formatted: "3:20", size: 3200000 },
  };
  const measured = {
    "/audio/bridges/remeasured.mp3": { seconds: 222, formatted: "3:42", size: 3552000 },
    "/audio/threads/new.mp3": { seconds: 300, formatted: "5:00", size: 4800000 },
  };

  it("keeps entries whose file is not on this machine", () => {
    const merged = mergeDurations(existing, measured);
    expect(merged["/audio/atoms/kept.mp3"]).toEqual(existing["/audio/atoms/kept.mp3"]);
  });

  it("prefers a fresh measurement over the stored one", () => {
    const merged = mergeDurations(existing, measured);
    expect(merged["/audio/bridges/remeasured.mp3"].seconds).toBe(222);
  });

  it("adds newly generated audio", () => {
    expect(mergeDurations(existing, measured)["/audio/threads/new.mp3"].seconds).toBe(300);
  });

  it("loses nothing when nothing is measurable", () => {
    // The cleanup case: every MP3 gone from disk, manifest untouched.
    expect(mergeDurations(existing, {})).toEqual(existing);
  });

  it("drops absent entries only when asked to prune", () => {
    const pruned = mergeDurations(existing, measured, { prune: true });
    expect(pruned["/audio/atoms/kept.mp3"]).toBeUndefined();
    expect(Object.keys(pruned).sort()).toEqual(Object.keys(measured).sort());
  });

  it("names what only the manifest is holding up", () => {
    expect(preservedKeys(existing, measured)).toEqual(["/audio/atoms/kept.mp3"]);
  });

  /**
   * Guard the guard: the real manifest is the thing being protected, so a
   * merge that silently started returning nothing would fail here rather than
   * pass on an empty fixture.
   */
  it("covers every published page in the real manifest", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "audio", "durations.json"), "utf-8"),
    );
    expect(Object.keys(manifest).length).toBeGreaterThanOrEqual(319);
    expect(Object.keys(mergeDurations(manifest, {})).length).toBe(Object.keys(manifest).length);
  });
});
