import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { formatUpdated } from "../../components/UpdatedOn";
import { loadBridges } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/**
 * A build directory is not the same as a finished build — see podcast-series
 * for the full account. Name a page the build always produces.
 */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

describe("visible updated date", () => {
  /**
   * The whole reason this formats from the string parts. `new Date("2026-08-22")`
   * is UTC midnight, so any local formatting renders the 21st west of Greenwich
   * — and would then disagree with the dateModified emitted next to it.
   */
  it("reads the date written down, not one shifted by a timezone", () => {
    expect(formatUpdated("2026-08-22")).toBe("22 August 2026");
    expect(formatUpdated("2026-01-01")).toBe("1 January 2026");
    expect(formatUpdated("2026-12-31")).toBe("31 December 2026");
  });

  it("renders nothing rather than something wrong", () => {
    expect(formatUpdated("")).toBeNull();
    expect(formatUpdated("August 2026")).toBeNull();
    expect(formatUpdated("2026-13-01")).toBeNull();
    expect(formatUpdated("2026-00-01")).toBeNull();
  });

  it.runIf(built)("shows a date on every guide, agreeing with its dateModified", async () => {
    const missing: string[] = [];
    const disagreeing: string[] = [];

    for (const bridge of await loadBridges()) {
      const file = path.join(APP, `${bridge.slug}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");

      const time = /<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"[^>]*>([^<]+)<\/time>/i.exec(html);
      if (!time) {
        missing.push(bridge.slug);
        continue;
      }
      // The machine-readable date and the one a reader sees must be the same day.
      const updated = bridge.frontmatter.updated;
      if (!updated) {
        missing.push(`${bridge.slug}: no updated date in frontmatter`);
        continue;
      }
      if (time[1] !== updated.slice(0, 10)) {
        disagreeing.push(`${bridge.slug}: ${time[1]} vs ${updated}`);
      }
      if (time[2].trim() !== formatUpdated(updated)) {
        disagreeing.push(`${bridge.slug}: rendered "${time[2].trim()}"`);
      }
    }

    expect(missing).toEqual([]);
    expect(disagreeing).toEqual([]);
  });
});
