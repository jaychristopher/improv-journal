/**
 * The other names a concept answers to, shown under its entry on a hub.
 *
 * Aliases are emitted as schema.org alternateName on the concept's own page,
 * which helps a crawler and does nothing for somebody scanning an alphabetised
 * hub for a word the hub never prints. Showing them is the point.
 *
 * This exists as a component because the listing markup does not: the glossary
 * renders a description list, TagFilter renders cards, and the diagnosis hub
 * renders three separate blocks of its own. Aliases were added to the first
 * two on separate occasions and the third was missed both times.
 */
export function AlsoCalled({ aliases }: { aliases?: string[] }) {
  if (!aliases || aliases.length === 0) return null;

  return (
    <span className="text-foreground/35 mt-1 block text-xs">Also called {aliases.join(", ")}.</span>
  );
}
