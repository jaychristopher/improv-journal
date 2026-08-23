import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { AUTHOR_NAME } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The author a page claims in its markup must be one a reader can see.
 *
 * All 252 Article entities on this site named an author, gave it an @id of
 * /about#author and a url of /about, and no content page showed a reader who
 * wrote it. The name appeared in visible text on exactly one page — /about —
 * and /about had no inbound link from any page body, only from the footer.
 *
 * Structured data is meant to describe what is on the page. Asserting
 * authorship to a parser while hiding it from a person is the mismatch it is
 * specifically not supposed to have, and it wastes the claim: guidance on who
 * is responsible for a page is only worth something if the responsibility can
 * be followed somewhere.
 *
 * So the byline now sits next to the updated date on guides, threads and paths
 * — the authored prose — and links to /about with rel="author". Atoms are left
 * out on purpose: they are reference primitives and carry no date line either,
 * which is an existing distinction in the design rather than an oversight.
 */
describe("visible byline", () => {
  it.runIf(built)("appears on every guide and links to /about", async () => {
    const withoutByline: string[] = [];
    const withoutLink: string[] = [];
    let checked = 0;

    for (const bridge of await loadBridges()) {
      const file = path.join(APP, `${bridge.slug}.html`);
      if (!fs.existsSync(file)) continue;
      checked++;
      const html = fs.readFileSync(file, "utf-8");
      const open = html.indexOf("<main");
      const main = html
        .slice(open, html.indexOf("</main>", open))
        // The name is in the JSON-LD too, which sits inside main. Counting that
        // would make this pass on the exact state it exists to reject.
        .replace(/<script[\s\S]*?<\/script>/g, "");

      if (!main.includes(AUTHOR_NAME)) withoutByline.push(bridge.slug);
      if (!/href="\/about"/.test(main)) withoutLink.push(bridge.slug);
    }

    expect(checked).toBeGreaterThan(60);
    expect(withoutByline).toEqual([]);
    expect(withoutLink).toEqual([]);
  });

  it.runIf(built)("names the same author the structured data names", async () => {
    const disagreeing: string[] = [];
    let checked = 0;

    for (const bridge of await loadBridges()) {
      const file = path.join(APP, `${bridge.slug}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");

      for (const block of html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(block[1]);
        } catch {
          continue;
        }
        const walk = (node: unknown): void => {
          if (Array.isArray(node)) return node.forEach(walk);
          if (!node || typeof node !== "object") return;
          const obj = node as Record<string, unknown>;
          if (String(obj["@type"] ?? "").includes("Article")) {
            const author = obj.author as { name?: string } | undefined;
            checked++;
            if (author?.name !== AUTHOR_NAME) {
              disagreeing.push(`${bridge.slug}: schema says ${author?.name ?? "nothing"}`);
            }
          }
          if (obj["@graph"]) walk(obj["@graph"]);
        };
        walk(parsed);
      }
    }

    expect(checked).toBeGreaterThan(60);
    expect(disagreeing).toEqual([]);
  });
});
