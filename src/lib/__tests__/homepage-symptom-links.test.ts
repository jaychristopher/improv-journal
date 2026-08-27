import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HOMEPAGE_SYMPTOMS } from "../homepage-symptoms";

const APP = path.join(process.cwd(), ".next", "server", "app");
const HOME = path.join(APP, "index.html");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(HOME);

/** Body only: the nav and footer link plenty, and would mask the thing being asked. */
function homepageBody(): string {
  const html = fs.readFileSync(HOME, "utf-8");
  return html.split("</header>").pop()!.split("<footer")[0];
}

/**
 * The homepage symptom picker routes somewhere a crawler can follow.
 *
 * It was built as buttons calling router.push, and the recommendation panel
 * only existed once something had been selected. Nothing is selected until a
 * person clicks, so the server html contained no route out of that section at
 * all — five guides, five programs and five lessons reachable only by running
 * the page. On the highest-authority page on the site, and its primary entry
 * point.
 *
 * Every panel now renders and the unselected ones are hidden, so the links are
 * in the markup whether or not anybody clicks. Google follows links in hidden
 * content; it cannot follow a string in an onClick handler.
 *
 * Asserts hrefs specifically rather than that the slug appears somewhere in the
 * document. The slugs were always in the page — they sat in the flight payload,
 * which is exactly why a looser check would have passed while the section
 * pointed nowhere.
 */
describe("homepage symptom picker", () => {
  it.runIf(built)("renders a real link for every symptom destination", () => {
    const body = homepageBody();
    const missing: string[] = [];

    for (const symptom of HOMEPAGE_SYMPTOMS) {
      if (!body.includes(`href="/${symptom.bridgeSlug}"`)) {
        missing.push(`${symptom.id}: guide /${symptom.bridgeSlug}`);
      }
      if (!body.includes(`href="/threads/${symptom.threadId}"`)) {
        missing.push(`${symptom.id}: lesson /threads/${symptom.threadId}`);
      }
      if (!body.includes(`href="/paths/${symptom.pathId}"`)) {
        missing.push(`${symptom.id}: program /paths/${symptom.pathId}`);
      }
    }

    // The list itself, so an empty import fails here rather than passing on nothing.
    expect(HOMEPAGE_SYMPTOMS.length).toBeGreaterThanOrEqual(5);
    expect(missing).toEqual([]);
  });
});
