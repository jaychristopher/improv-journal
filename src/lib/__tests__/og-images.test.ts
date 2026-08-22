import { describe, expect, it } from "vitest";

import { ogImages } from "../seo";

describe("ogImages", () => {
  it("returns a single correctly sized card", () => {
    const [image] = ogImages("How to Be Witty");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.alt).toBe("How to Be Witty");
  });

  it("passes the title through to the og route", () => {
    const [image] = ogImages("How to Be Witty");
    const params = new URLSearchParams(image.url.split("?")[1]);
    expect(image.url.startsWith("/og?")).toBe(true);
    expect(params.get("title")).toBe("How to Be Witty");
    expect(params.get("eyebrow")).toBeNull();
  });

  it("includes the section label when given one", () => {
    const [image] = ogImages("Justification", "Glossary");
    const params = new URLSearchParams(image.url.split("?")[1]);
    expect(params.get("title")).toBe("Justification");
    expect(params.get("eyebrow")).toBe("Glossary");
  });

  it("escapes titles containing url-significant characters", () => {
    const title = "Yes, And? 100% & counting / improv";
    const [image] = ogImages(title);
    const params = new URLSearchParams(image.url.split("?")[1]);
    expect(params.get("title")).toBe(title);
  });
});
