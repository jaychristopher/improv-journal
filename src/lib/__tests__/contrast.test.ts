import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * WCAG contrast on the chrome and the hero tools.
 *
 * Measured in headless Chrome on 2026-09-23, against the painted backdrop
 * rather than the DOM ancestors — the nav floats over a hero that is its
 * sibling, so an ancestor walk reports the body colour and misses it. What it
 * found was that the dim states were fractions of the body colour, and the
 * whole ramp below /70 fails in both themes:
 *
 *   light #333 on #f0f0f0   /40 2.19  /50 2.73  /60 3.51  /70 4.61
 *   dark  #b0b0b0 on #0a0a0a /40 2.31  /50 3.01  /60 3.88  /70 4.88
 *
 * The nav's links and icons were /50 and /40 — 2.73:1 and 2.19:1, against 4.5
 * for text and 3 for an icon — and the hero buttons' only boundary was
 * `border-hero-foreground/15`, 1.47:1 against the 3 that 1.4.11 asks of the
 * edge that identifies a control.
 *
 * So the dim states are colours now (`--foreground-dim`, `--hero-subtle`,
 * `--border-ui`). This checks the arithmetic on those tokens, and that the
 * components that were fixed do not go back to the ramp.
 */
const ROOT = process.cwd();
const CSS = path.join(ROOT, "src", "app", "globals.css");

const srgb = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: number[]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Every `--token: #hex` in globals.css, by the block it is declared in. */
function tokens(): { root: Record<string, string>; dark: Record<string, string> } {
  const css = fs.readFileSync(CSS, "utf8");
  const block = (selector: string) => {
    const start = css.indexOf(selector + " {");
    expect(start, `${selector} block`).toBeGreaterThan(-1);
    const body = css.slice(start, css.indexOf("}", start));
    return Object.fromEntries(
      [...body.matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
    );
  };
  return { root: block(":root"), dark: block(":root.dark") };
}

/** AA: 4.5 for body text, 3 for an icon or the boundary of a control. */
const TEXT = 4.5;
const UI = 3;

describe("the palette's contrast", () => {
  it("passes AA for every dim state, in both themes", () => {
    const { root, dark } = tokens();
    // Guard the guard: a regex that stopped matching would pass vacuously.
    expect(Object.keys(root).length).toBeGreaterThanOrEqual(8);

    const light = (name: string) => rgb(root[name]);
    const night = (name: string) => rgb(dark[name] ?? root[name]);

    const cases: [string, number[], number[], number][] = [
      ["dim text, light", light("--foreground-dim"), light("--background"), TEXT],
      ["dim text, dark", night("--foreground-dim"), night("--background"), TEXT],
      ["body text, light", light("--foreground"), light("--background"), TEXT],
      ["body text, dark", night("--foreground"), night("--background"), TEXT],
      ["links, light", light("--link"), light("--background"), TEXT],
      ["links, dark", night("--link"), night("--background"), TEXT],
      ["control edge, light", light("--border-ui"), light("--background"), UI],
      ["control edge, dark", night("--border-ui"), night("--background"), UI],
      // The hero is the same dark panel in both themes.
      ["hero text", light("--hero-foreground"), light("--hero"), TEXT],
      ["hero muted", light("--hero-muted"), light("--hero"), TEXT],
      ["hero subtle", light("--hero-subtle"), light("--hero"), TEXT],
    ];

    const failing = cases
      .map(([name, fg, bg, need]) => ({ name, ratio: contrast(fg, bg), need }))
      .filter((c) => c.ratio < c.need)
      .map((c) => `${c.name}: ${c.ratio.toFixed(2)}:1, needs ${c.need}`);
    expect(failing).toEqual([]);
  });

  it("keeps the dim states off the opacity ramp where they were fixed", () => {
    // These are the files the 2026-09-23 audit covered. Everything below /70
    // fails for text, and the hero buttons have nothing but their edge to say
    // they are buttons, so that edge needs a colour rather than a hairline.
    //
    // Container edges are deliberately not checked. 1.4.11 asks about the
    // boundary that identifies a control, and the nav's bottom rule is a
    // divider while its dropdown is identified by its own fill and shadow —
    // both sit at `border-foreground/10` and are correct there.
    const files = [
      "src/components/Nav.tsx",
      "src/components/Footer.tsx",
      "src/components/ThemeToggle.tsx",
      "src/components/HomeHero.tsx",
      "src/components/GamePicker.tsx",
      "src/components/WouldYouRather.tsx",
      "src/components/PromptGenerator.tsx",
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      for (const match of source.matchAll(/(text|border)-(hero-)?foreground\/(\d+)\b/g)) {
        const [, kind, hero, pct] = match;
        if (kind === "text" && Number(pct) < 70) offenders.push(`${file}: ${match[0]}`);
        if (kind === "border" && hero && Number(pct) < 40) offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("still carries the sitewide debt the audit found, so it is not forgotten", () => {
    // The ramp is used far beyond the files above: `text-foreground/40` and
    // `/50` are the site's ordinary dim states and both fail. This counts
    // what is left rather than asserting zero, so the number has to come down
    // deliberately. 517 on 2026-09-23; 510 after the footer and the theme
    // toggle joined the guarded set on 2026-09-24.
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.name.endsWith(".tsx") ? [full] : [];
      });
    const remaining = walk(path.join(ROOT, "src")).reduce((total, file) => {
      const source = fs.readFileSync(file, "utf8");
      return (
        total +
        [...source.matchAll(/text-(?:hero-)?foreground\/(\d+)\b/g)].filter((m) => Number(m[1]) < 70)
          .length
      );
    }, 0);
    expect(remaining).toBeLessThanOrEqual(510);
  });
});
