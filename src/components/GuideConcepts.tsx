import Link from "next/link";

import type { GuideConcept } from "@/lib/guide-concepts";

/**
 * The concept pages a guide is built on.
 *
 * Gives each guide an explicit route down into the principles and techniques
 * it rests on, completing a link graph that previously only pointed upward
 * from atom to guide.
 */
export function GuideConcepts({ concepts }: { concepts: GuideConcept[] }) {
  if (concepts.length === 0) return null;

  return (
    <nav aria-labelledby="guide-concepts-heading">
      <h2
        id="guide-concepts-heading"
        className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase"
      >
        The ideas behind this guide
      </h2>
      <ul className="space-y-2">
        {concepts.map((concept) => (
          <li key={concept.id}>
            <Link
              href={concept.url}
              className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
            >
              <span className="block text-sm font-medium">{concept.title}</span>
              <span className="text-foreground/60 mt-1 block text-xs">{concept.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
