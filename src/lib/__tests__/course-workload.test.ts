import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { isoDuration } from "../../components/CourseJsonLd";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const ISO_DURATION = /^PT(?:\d+H)?(?:\d+M)?$/;

/**
 * courseWorkload has to be ISO 8601, not the string a reader sees.
 *
 * All eleven paths were emitting "30 min", which is what the page displays and
 * not something a parser can read, so the property was present and unusable.
 * The tell was two lines below it: repeatFrequency already used P1D and P1W
 * correctly, so the format was known for the schedule and missed for the
 * workload.
 *
 * Worth guarding rather than fixing once, because the failure is invisible —
 * the markup validates as an object, the field is there, and nothing anywhere
 * says the value is unreadable.
 */
describe("course workload", () => {
  it("converts human durations to ISO 8601", () => {
    expect(isoDuration("30 min")).toBe("PT30M");
    expect(isoDuration("1 hr 5 min")).toBe("PT1H5M");
    expect(isoDuration("2 hours")).toBe("PT2H");
    expect(isoDuration("about 90 minutes across a week")).toBe("PT90M");
  });

  it("returns null rather than guessing", () => {
    // An absent property is a gap; an unparseable one is a claim that fails.
    expect(isoDuration("a while")).toBeNull();
    expect(isoDuration("")).toBeNull();
    expect(isoDuration(null)).toBeNull();
    expect(isoDuration("0 min")).toBeNull();
  });

  it.runIf(built)("emits only parseable durations on every course page", () => {
    const dir = path.join(APP, "paths");
    const offenders: string[] = [];
    let checked = 0;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
      const html = fs.readFileSync(path.join(dir, file), "utf-8").replace(/&quot;/g, '"');
      for (const block of html.matchAll(
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      )) {
        const parsed = JSON.parse(block[1]);
        const nodes = parsed["@graph"] ?? [parsed];
        for (const node of nodes) {
          if (node["@type"] !== "Course") continue;
          const workload = node.hasCourseInstance?.courseWorkload;
          if (workload === undefined) continue; // omitted on purpose is fine
          checked++;
          if (!ISO_DURATION.test(workload)) {
            offenders.push(`${file}: courseWorkload "${workload}" is not ISO 8601`);
          }
        }
      }
    }

    expect(checked).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });
});
