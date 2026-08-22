import { describe, expect, it } from "vitest";

import {
  AUTHOR_ID,
  AUTHOR_NAME,
  AUTHOR_PATH,
  authorRef,
  ORGANIZATION_ID,
  publisherRef,
  SITE_URL,
} from "../seo";

describe("author and publisher entities", () => {
  it("anchors the author @id to the about page", () => {
    expect(AUTHOR_PATH).toBe("/about");
    expect(AUTHOR_ID).toBe(`${SITE_URL}/about#author`);
  });

  it("gives the author a resolvable url, not a bare name", () => {
    const ref = authorRef();
    expect(ref["@type"]).toBe("Person");
    expect(ref["@id"]).toBe(AUTHOR_ID);
    expect(ref.name).toBe(AUTHOR_NAME);
    expect(ref.url).toBe(`${SITE_URL}${AUTHOR_PATH}`);
  });

  it("gives the publisher a stable @id", () => {
    const ref = publisherRef();
    expect(ref["@type"]).toBe("Organization");
    expect(ref["@id"]).toBe(ORGANIZATION_ID);
    expect(ref.url).toBe(SITE_URL);
  });

  it("keeps author and organization ids distinct", () => {
    expect(AUTHOR_ID).not.toBe(ORGANIZATION_ID);
  });

  it("builds absolute ids, so they resolve from any page", () => {
    for (const id of [AUTHOR_ID, ORGANIZATION_ID]) {
      expect(id.startsWith("https://")).toBe(true);
    }
  });
});
