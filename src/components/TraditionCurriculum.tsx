import Link from "next/link";

import { Prose } from "@/components/Prose";
import {
  countLabel,
  type CurriculumEntry,
  type TraditionCurriculum as Curriculum,
} from "@/lib/tradition-curriculum";

/**
 * "Where the curriculum teaches it" on a tradition page.
 *
 * The five tradition pages listed a school's concepts, objections, books and
 * guides and no lesson or path, while the lessons and paths are the layer
 * with a direction: *The Game Beneath the Game* is UCB on 8 of 8 concepts,
 * *Advanced Game and Character* UCB on 14 of 23, and a reader climbing the
 * ladder changed school without being told there was one (tracker entry
 * 330, 2026-09-22). The list is the lessons and paths where this school
 * leads by the margin tradition-curriculum.ts sets, each with its count, so
 * the reader who knows the school can find the rung that teaches it.
 *
 * Renders nothing when the school leads nowhere; the Annoyance, a corrective
 * rather than a foundation, leads no lesson and no path today.
 */
export function TraditionCurriculum({
  curriculum,
  currentUrl,
}: {
  curriculum: Curriculum;
  currentUrl: string;
}) {
  const { lessons, paths } = curriculum;
  if (lessons.length === 0 && paths.length === 0) return null;
  return (
    <section className="mb-12" data-track="tradition-curriculum" data-derived="true">
      <h2 className="mb-1 text-lg font-semibold">
        Where the curriculum teaches it
        <span className="text-foreground/40 ml-2 font-normal">
          ({lessons.length + paths.length})
        </span>
      </h2>
      <Prose
        text="The lessons and paths where this school's concepts outnumber every other's: the count is how many of the lesson's or path's concepts cite its works."
        currentUrl={currentUrl}
        className="text-foreground/50 mb-4 text-sm"
      />
      {lessons.length > 0 && <EntryList label="Lessons" entries={lessons} />}
      {paths.length > 0 && <EntryList label="Paths" entries={paths} />}
    </section>
  );
}

function EntryList({ label, entries }: { label: string; entries: CurriculumEntry[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-foreground/30 mb-2 text-xs">
        {label} ({entries.length})
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={entry.href}
              className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
            >
              <span className="text-sm font-medium">{entry.title}</span>
              <span className="text-foreground/40 ml-2 text-xs">{countLabel(entry)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
