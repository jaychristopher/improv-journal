/**
 * The event for a click on an outbound link inside a tracked block.
 *
 * The delegated listener in providers.tsx recorded internal links only, so a
 * click on a library entry's buy button — the one click on the site that can
 * earn money — fired nothing (docs/monetization.md, 2026-09-27). This reads
 * an external `http(s)` link into the properties the event carries: the
 * block, the host, and the destination with its `tag` parameter removed, so
 * the same click reads the same before and after the Associates tag is set.
 *
 * Null for anything that is not a web address — `mailto:`, `tel:`, a relative
 * path the listener already handles — so the listener has one question to
 * ask.
 */
export function outboundEvent(
  href: string,
  block: string,
  page: string,
): { block: string; host: string; href: string; page: string } | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  url.searchParams.delete("tag");
  return { block, host: url.hostname, href: url.toString(), page };
}
