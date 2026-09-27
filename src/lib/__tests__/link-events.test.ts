import { describe, expect, it } from "vitest";

import { outboundEvent } from "../link-events";

/**
 * The buy cards' Amazon buttons fired no event for six days after the click
 * listener landed, because it recorded internal links only (MZ-1.2,
 * 2026-09-27). This holds the shape of the event the listener now sends for
 * an outbound link: the block it sat in, the host, the destination stripped of
 * the Associates tag, and nothing for a link that is not a web address.
 */
describe("outboundEvent", () => {
  it("reads a tagged retail link into its block, host and untagged destination", () => {
    const event = outboundEvent(
      "https://www.amazon.com/dp/0130505188?tag=example-20",
      "buy-the-book",
      "/library/attention-and-effort-kahneman",
    );
    expect(event).toEqual({
      block: "buy-the-book",
      host: "www.amazon.com",
      href: "https://www.amazon.com/dp/0130505188",
      page: "/library/attention-and-effort-kahneman",
    });
  });

  it("keeps every other parameter, so a tagged search still says what was searched", () => {
    const event = outboundEvent(
      "https://www.amazon.com/s?k=Improv+Nerd&tag=example-20",
      "buy-the-book",
      "/library/carrane-improv-nerd",
    );
    expect(event?.href).toBe("https://www.amazon.com/s?k=Improv+Nerd");
  });

  it("is null for anything that is not a web address", () => {
    expect(outboundEvent("mailto:hello@example.com", "footer", "/")).toBeNull();
    expect(outboundEvent("tel:+10000000000", "footer", "/")).toBeNull();
    expect(outboundEvent("/library", "footer", "/")).toBeNull();
    expect(outboundEvent("#top", "footer", "/")).toBeNull();
  });
});
