import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { glob } from "glob";

describe("link audit", () => {
  it("no TSX file contains /atoms/ href (old URL pattern)", async () => {
    const srcDir = path.join(process.cwd(), "src");
    const files = await glob("**/*.tsx", { cwd: srcDir });

    for (const file of files) {
      const content = fs.readFileSync(path.join(srcDir, file), "utf-8");
      const hasOldAtomLink = content.includes('"/atoms/') || content.includes("'/atoms/") || content.includes("`/atoms/");
      expect(hasOldAtomLink, `${file} still contains /atoms/ link`).toBe(false);
    }
  });

  it("no TSX file contains /guides/ href (old URL pattern)", async () => {
    const srcDir = path.join(process.cwd(), "src");
    const files = await glob("**/*.tsx", { cwd: srcDir });

    for (const file of files) {
      const content = fs.readFileSync(path.join(srcDir, file), "utf-8");
      const hasOldGuideLink = content.includes('"/guides/') || content.includes("'/guides/") || content.includes("`/guides/");
      expect(hasOldGuideLink, `${file} still contains /guides/ link`).toBe(false);
    }
  });

  it("no TSX file contains /concepts/ href (old URL pattern)", async () => {
    const srcDir = path.join(process.cwd(), "src");
    const files = await glob("**/*.tsx", { cwd: srcDir });

    for (const file of files) {
      const content = fs.readFileSync(path.join(srcDir, file), "utf-8");
      const hasOldConceptLink = content.includes('"/concepts/') || content.includes("'/concepts/") || content.includes("`/concepts/");
      expect(hasOldConceptLink, `${file} still contains /concepts/ link`).toBe(false);
    }
  });
});
