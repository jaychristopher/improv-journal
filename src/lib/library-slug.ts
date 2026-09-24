/**
 * The URL slug for a library entry, which is its atom id without `ref-`.
 *
 * `ref-` is a graph convention, not a word anybody searches for. It marks the
 * reference layer in `content/atoms/`, where every type shares one directory
 * and the prefix is how a reader scanning the folder can see what a file is.
 * In a URL it is noise in the most visible position — `/library/` already
 * says the page is a book — and it sits in front of the words that carry the
 * query, which on these pages are the title and the author.
 *
 * So the id keeps the prefix and the URL drops it. The old URLs redirect
 * permanently (redirects.ts): these are the best-ranking pages on the site
 * and several have been indexed for months.
 *
 * Kept free of imports on purpose. next.config.ts loads redirects.ts, which
 * cannot reach content.ts because that pulls in remark, so both sides of the
 * mapping have to be able to import this.
 */

const PREFIX = "ref-";

/** `ref-impro-johnstone` → `impro-johnstone`. Anything else is returned as is. */
export function librarySlug(id: string): string {
  return id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id;
}

/**
 * The inverse, for the route: `impro-johnstone` → `ref-impro-johnstone`.
 *
 * A slug that already carries the prefix is returned untouched, so a stale
 * internal link hitting the route directly still resolves to its atom rather
 * than 404ing on `ref-ref-…`.
 */
export function libraryIdFromSlug(slug: string): string {
  return slug.startsWith(PREFIX) ? slug : `${PREFIX}${slug}`;
}
