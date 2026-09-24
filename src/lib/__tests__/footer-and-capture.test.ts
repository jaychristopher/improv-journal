import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AFFILIATE_PARTICIPATION } from "../affiliate";
import { looksLikeEmail, OFFERS, providerConfigured, subscribe } from "../subscribe";

/**
 * The footer, after the 2026-09-24 rebuild, and the email capture it now
 * carries.
 *
 * The footer was 46 links on 387 pages: 15 of the 19 hub links duplicated a
 * nav link higher in the same document, "Overview" was the largest internal
 * anchor on the site across three different destinations, and "Popular
 * Guides" was 27 entries ranked by Ahrefs traffic potential on a site that
 * took 31 organic clicks in 90 days. On a phone it ran to 2,585px.
 *
 * These guard the shape it must keep, and the one rule the capture exists to
 * enforce: never take an address we cannot deliver to.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const footerSource = () =>
  fs.readFileSync(path.join(ROOT, "src", "components", "Footer.tsx"), "utf8");

/**
 * The same file with its comments removed.
 *
 * The header explains at length what the rebuild took out and why, so a
 * naive search for the removed strings finds the account of their removal.
 */
const footerCode = () =>
  footerSource()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** The footer of a built page, without the scripts. */
function footerHtml(file: string): string {
  const html = fs.readFileSync(file, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  const start = html.indexOf("<footer");
  expect(start, `${file} has a footer`).toBeGreaterThan(-1);
  return html.slice(start);
}

describe("the footer's shape", () => {
  it("caps its own guide list rather than trusting the content", () => {
    // MAX_PROMOTED in top-guides.ts is 32, so the column's length used to be
    // a property of the content: a guide clearing the promotion floor made
    // the footer taller and no layout knew. The cap lives here now.
    expect(footerSource()).toMatch(/const FOOTER_GUIDES = 6;/);
  });

  it("does not reintroduce the anchors the rebuild removed", () => {
    const source = footerCode();
    // "Overview" described none of its three destinations and was the
    // largest internal anchor on the site.
    expect(source).not.toMatch(/>\s*Overview\s*</);
    // "Popular" is a claim about readership the site cannot support.
    expect(source).not.toMatch(/Popular Guides/);
    // The hub table is the nav's job now; the footer duplicated 15 of 19.
    // It still imports HUBS to tell a hub from a concept page — the anchor
    // form depends on that — but renders none of them.
    expect(source).not.toMatch(/hubLink\(/);
    expect(source).not.toMatch(/HUBS\.\w+\.href/);
  });

  it("carries the Associates participation statement, which the buy cards do not", () => {
    // A different obligation from the FTC proximity disclosure: that one is
    // per-link and lives in the card, and only 32 of the built pages have a
    // card at all.
    expect(AFFILIATE_PARTICIPATION).toMatch(/Amazon Associate/);
    expect(footerSource()).toContain("AFFILIATE_PARTICIPATION");
  });

  it.runIf(built)("renders few links, no headings, and the form outside the nav", () => {
    const pages = ["index.html", path.join("library", "impro-johnstone.html"), "improv-games.html"];
    for (const page of pages) {
      const file = path.join(APP, page);
      if (!fs.existsSync(file)) continue;
      const footer = footerHtml(file);

      // 46 before. The cap is well above 11 so the guard survives a legal
      // link being added, and well below the old count.
      const links = footer.match(/<a\b/g)?.length ?? 0;
      expect(links, `${page} footer links`).toBeGreaterThanOrEqual(8);
      expect(links, `${page} footer links`).toBeLessThanOrEqual(16);

      // Four navigational h2s used to sit at the same rank as the article's
      // own sections in every screen reader's heading list.
      expect(footer.match(/<h2\b/g) ?? [], `${page} footer headings`).toEqual([]);

      // A subscription form is not navigation.
      expect(footer, `${page} has the capture`).toContain('data-track="footer-email"');
      const nav = footer.slice(footer.indexOf("<nav"), footer.indexOf("</nav>"));
      expect(nav.includes("<form"), `${page} form inside nav`).toBe(false);
    }
  });

  it.runIf(built)("shows different guides on different pages", () => {
    // Six of the promoted set per page, rotated by pathname. The point is
    // that a promoted guide's anchor profile stops being one phrase repeated
    // on every page, so two unrelated pages must not agree completely.
    const a = footerHtml(path.join(APP, "index.html"));
    const b = footerHtml(path.join(APP, "improv-games.html"));
    const hrefs = (html: string) =>
      [...html.matchAll(/href="\/([a-z0-9-]+)"/g)].map((m) => m[1]).join(",");
    expect(hrefs(a)).not.toBe("");
    expect(hrefs(a)).not.toBe(hrefs(b));
  });
});

describe("the email capture", () => {
  it("promises a finite sequence, and names the number", () => {
    for (const offer of Object.values(OFFERS)) {
      expect(offer.emails, offer.id).toBeGreaterThan(0);
      // Every bucket has to say it stops. A newsletter is a recurring
      // publishing obligation; these are not that, and the copy is the
      // only thing holding the line.
      expect(offer.promise, offer.id).toMatch(/stops|fortnight/);
      // "Subscribe" is not an offer.
      expect(offer.action.toLowerCase(), offer.id).not.toContain("subscribe");
    }
  });

  it("refuses an address it cannot deliver to", async () => {
    // The failure mode this exists to prevent is the one that looks like
    // success: a form that thanks the reader and drops the address.
    expect(providerConfigured()).toBe(false);
    const result = await subscribe("someone@example.com", "tonights-material");
    expect(result).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("rejects the obvious before it costs an API call", () => {
    for (const bad of ["", "nope", "a@b", "no spaces@example.com", "@example.com", "x@y."]) {
      expect(looksLikeEmail(bad), bad).toBe(false);
    }
    for (const good of ["a@b.co", "first.last+tag@example.co.uk"]) {
      expect(looksLikeEmail(good), good).toBe(true);
    }
  });

  it.runIf(built)("tells a reader what happened, in text", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "src", "components", "EmailCapture.tsx"),
      "utf8",
    );
    // A label, not a placeholder: a placeholder vanishes on the first
    // keystroke and takes the only instruction with it.
    expect(source).toMatch(/<label htmlFor=\{fieldId\}/);
    expect(source).toContain('autoComplete="email"');
    // The status region is in the DOM before it has anything to say, or the
    // announcement is not reliably made.
    expect(source).toMatch(/role="status"/);
    expect(source).toMatch(/aria-describedby=\{statusId\}/);
    // And the unconfigured case says the address was not kept.
    expect(source).toMatch(/not kept your address/);
  });
});
