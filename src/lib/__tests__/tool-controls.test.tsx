// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ACTION_CLASS,
  CHOICE_CLASS,
  QUIET_CLASS,
  ToolAction,
  ToolChoice,
  ToolQuiet,
} from "@/components/ToolControls";

/**
 * The standard for a hero tool's controls, held in one place (ToolControls,
 * 2026-09-27). Four tools had four sets of option buttons that agreed on
 * hover and on nothing else, and keyboard focus was invisible on the dark
 * panel in the light theme. What this holds: every state is declared on
 * every class set, the four tools use the shared controls rather than their
 * own, and the hero panels set the ring colour the page's ring cannot show.
 */
const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8");

const TOOLS = [
  "src/components/WouldYouRather.tsx",
  "src/components/PromptGenerator.tsx",
  "src/components/TwentyOneQuestions.tsx",
  "src/components/GamePicker.tsx",
];

describe("the tool controls", () => {
  afterEach(cleanup);

  it("declare hover, active, selected and disabled on every choice, and hover and active on every action", () => {
    for (const [palette, cls] of Object.entries(CHOICE_CLASS)) {
      for (const state of ["hover:", "active:", "aria-pressed:", "disabled:"]) {
        expect(cls, `${palette} choice ${state}`).toContain(state);
      }
      expect(cls, `${palette} choice cursor`).toContain("cursor-pointer");
    }
    for (const [kind, cls] of Object.entries(ACTION_CLASS)) {
      for (const state of ["hover:", "active:", "disabled:"]) {
        expect(cls, `${kind} action ${state}`).toContain(state);
      }
    }
    for (const state of ["hover:", "active:", "disabled:"]) expect(QUIET_CLASS).toContain(state);
    // The ring is the site's, never suppressed here.
    for (const cls of [
      ...Object.values(CHOICE_CLASS),
      ...Object.values(ACTION_CLASS),
      QUIET_CLASS,
    ]) {
      expect(cls).not.toContain("outline-none");
    }
  });

  it("render buttons that carry the palette and say when they are pressed", () => {
    render(
      <>
        <ToolChoice palette="hero" selected>
          Friends
        </ToolChoice>
        <ToolChoice palette="page" data-side="left">
          Left
        </ToolChoice>
        <ToolAction>Next</ToolAction>
        <ToolAction kind="secondary">Copy</ToolAction>
        <ToolQuiet>Change the room</ToolQuiet>
      </>,
    );
    const hero = screen.getByRole("button", { name: "Friends" });
    expect(hero.getAttribute("aria-pressed")).toBe("true");
    expect(hero.getAttribute("type")).toBe("button");
    expect(hero.className).toContain("border-hero-foreground/40");
    // A choice that only navigates carries no pressed state at all.
    const side = screen.getByRole("button", { name: "Left" });
    expect(side.hasAttribute("aria-pressed")).toBe(false);
    expect(side.getAttribute("data-side")).toBe("left");
    expect(side.className).toContain("border-border-ui");
    expect(screen.getByRole("button", { name: "Next" }).className).toContain("bg-foreground");
    expect(screen.getByRole("button", { name: "Copy" }).className).toContain("border-border-ui");
    expect(screen.getByRole("button", { name: "Change the room" }).className).toContain(
      "underline",
    );
  });

  it("are what the four tools use, with no option button of their own", () => {
    for (const file of TOOLS) {
      const src = read(file);
      // A pattern, not the literal: the untracked-dependency guard reads any
      // `from "…"` in a source file as an import to resolve.
      expect(src, file).toMatch(/from ["']\.\/ToolControls["']/);
      // The class string every tool used to write for a hero option, and the
      // dialog one: if either is back, a tool has grown its own states again.
      expect(src, file).not.toContain("border-hero-foreground/40 bg-hero-foreground/[0.08]");
      expect(src, file).not.toContain(
        "border-border-ui bg-foreground/[0.03] hover:border-foreground-strong",
      );
    }
  });

  it("have a ring that shows on the hero panel", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/--focus-ring:\s*var\(--foreground-strong\)/);
    expect(css).toMatch(/\[data-hero-panel\]\s*\{\s*--focus-ring:\s*var\(--hero-foreground\)/);
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--focus-ring\)/);
    for (const file of ["src/components/HeroTakeover.tsx", "src/components/HomeHero.tsx"]) {
      expect(read(file), file).toContain("data-hero-panel");
    }
  });
});
