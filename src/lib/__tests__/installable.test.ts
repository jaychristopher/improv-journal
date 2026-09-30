import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BUILD = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(path.join(BUILD, "index.html"));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/**
 * The generator installs and keeps working with no signal.
 *
 * Three of the generators in the field are installable and this one was not,
 * though it is the one page on the site used standing up in a hall
 * (docs/improv-prompts-competitors.md, item 17). Three files carry it: the
 * manifest route, the worker in public/, and the two PNG icons a manifest
 * needs; the component registers the worker. Each is held here, and the
 * worker's own precache list is held to the two pages and nothing else, so
 * the site never quietly starts caching everything it serves.
 */
describe("the installable generator", () => {
  it("declares a manifest that opens on the tool page", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
      start_url: string;
      display: string;
      icons: { src: string; sizes: string }[];
    };
    expect(manifest.start_url).toBe("/tools/improv-prompt-generator");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map((i) => i.src)).toEqual(["/icon-192.png", "/icon-512.png"]);
  });

  it("ships the two icons as real PNGs of the declared size", () => {
    for (const size of [192, 512]) {
      const file = fs.readFileSync(path.join(ROOT, "public", `icon-${size}.png`));
      // PNG signature, then the IHDR width and height at bytes 16-23.
      expect(file.subarray(0, 8).toString("hex"), `icon-${size}`).toBe("89504e470d0a1a0a");
      expect(file.readUInt32BE(16), `icon-${size} width`).toBe(size);
      expect(file.readUInt32BE(20), `icon-${size} height`).toBe(size);
    }
  });

  it("keeps the worker to the two prompt pages and the immutable chunks", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain('"/improv-prompts"');
    expect(worker).toContain('"/tools/improv-prompt-generator"');
    expect(worker).toContain('startsWith("/_next/static/")');
    // Nothing outside the list is intercepted: the guard on scope creep.
    expect(worker).toContain("if (!PAGES.includes(url.pathname)) return;");
    expect(worker).toContain('request.method !== "GET"');
  });

  it("is registered by the generator, in production only", () => {
    const component = read("src/components/PromptGenerator.tsx");
    expect(component).toContain('navigator.serviceWorker.register("/sw.js")');
    expect(component).toContain('process.env.NODE_ENV !== "production"');
  });

  it.runIf(built)("links the manifest from the two prompt pages and from nowhere else", () => {
    // A sitewide manifest route would have put the link in every page's
    // payload; the concept layer's flight bytes have a ceiling that noticed
    // (85 bytes over, 2026-09-30). The link lives where the tool does.
    const link = /<link rel="manifest" href="\/manifest\.webmanifest"/;
    for (const page of ["tools/improv-prompt-generator.html", "improv-prompts.html"]) {
      expect(fs.readFileSync(path.join(BUILD, page), "utf8"), page).toMatch(link);
    }
    for (const page of [
      "index.html",
      "improv-games.html",
      "practice/techniques/status-dynamics.html",
    ]) {
      expect(fs.readFileSync(path.join(BUILD, page), "utf8"), page).not.toMatch(link);
    }
  });
});
