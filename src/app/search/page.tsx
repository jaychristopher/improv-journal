"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { MiniGraph } from "@/components/MiniGraph";
import { getSearchIndex, MINISEARCH_OPTIONS } from "@/lib/search-index";
import { normaliseDialect } from "@/lib/search-index-options.mjs";

const LAYER_LABELS: Record<string, string> = {
  guide: "Guides",
  atom: "How It Works & Practice",
  thread: "Threads",
  path: "Learning Paths",
  // The route pages — type hubs, topic and audience hubs, traditions, shows,
  // tools. Indexed since 2026-09-21; before that "improv games" could not
  // reach /improv-games.
  hub: "Hubs",
};

const TYPE_LABELS: Record<string, string> = {
  principle: "principle",
  technique: "technique",
  exercise: "exercise",
  definition: "concept",
  law: "why it's hard",
  antipattern: "failure mode",
  pattern: "pattern",
  framework: "framework",
  format: "format",
  insight: "insight",
  pedagogy: "teaching",
  reference: "reference",
  guide: "guide",
  thread: "thread",
  path: "path",
  hub: "hub",
};

interface GraphLink {
  id: string;
  relation: string;
}

/** A heading on the page, and the id it is anchored under. */
interface SectionAnchor {
  id: string;
  heading: string;
}

interface SearchResult {
  id: number;
  title: string;
  url: string;
  layer: string;
  type: string;
  score: number;
  links?: GraphLink[];
  /** The section this result matched on, when it matched on one. */
  section?: SectionAnchor;
}

/**
 * The section a result matched, if the match was in a section at all.
 *
 * Until 2026-09-22 the index held the first 500 characters of each page, so
 * every result was the page and the only place to send a reader was the top
 * of it. The `sections` field indexes every h2 and h3 with the sentence under
 * it, which is where the guides' 342 questions and their 42,497 words of
 * answer live, and the stored anchors say where each one is on the page. A
 * result that matched there can be sent to the answer instead (novel-insights
 * 337, which counted 0 internal links into any question anchor).
 *
 * MiniSearch's `match` metadata names the fields each matched term was found
 * in, but not which section inside the field, so the section is recovered by
 * asking which stored heading holds the most of those terms. Terms go through
 * `normaliseDialect` on the way in, as the index's own `processTerm` does, so
 * a heading spelt "theatre" is still reachable from a term folded to
 * "theater". A result whose section terms are all in the sentence and none in
 * a heading stays a whole-page result: there is no honest anchor to pick.
 */
function matchedSection(
  sections: SectionAnchor[],
  match: Record<string, string[]> | undefined,
): SectionAnchor | undefined {
  if (!sections.length || !match) return undefined;

  const terms = Object.entries(match)
    .filter(([, fields]) => fields.includes("sections"))
    .map(([term]) => term);
  if (!terms.length) return undefined;

  let best: SectionAnchor | undefined;
  let bestScore = 0;
  for (const section of sections) {
    const words = new Set(
      section.heading
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .map(normaliseDialect),
    );
    const score = terms.filter((term) => words.has(term)).length;
    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }

  return best;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setActiveLayer(null);

    if (!q) {
      setResults([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function runSearch() {
      setLoading(true);

      try {
        const ms = await getSearchIndex();
        const hits = ms.search(q, MINISEARCH_OPTIONS.searchOptions);

        if (cancelled) return;

        setResults(
          hits.map((hit) => {
            let links: GraphLink[] | undefined;

            try {
              if (hit.links) {
                links = JSON.parse(hit.links as string) as GraphLink[];
              }
            } catch {
              links = undefined;
            }

            return {
              id: hit.id,
              title: hit.title as string,
              url: hit.url as string,
              layer: hit.layer as string,
              type: hit.type as string,
              score: hit.score,
              links,
              section: matchedSection(
                (hit.sections as SectionAnchor[] | undefined) ?? [],
                hit.match as Record<string, string[]> | undefined,
              ),
            };
          }),
        );
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [q]);

  const layerCounts = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.layer] = (acc[result.layer] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = activeLayer ? results.filter((result) => result.layer === activeLayer) : results;

  const resultLookup = useMemo(() => {
    const map = new Map<string, { title: string; url: string }>();

    for (const result of results) {
      map.set(result.title.toLowerCase().replace(/\s+/g, "-"), {
        title: result.title,
        url: result.url,
      });
    }

    return map;
  }, [results]);

  if (!q) {
    return (
      <p className="text-foreground/40 text-sm">
        Type something to search across all concepts, guides, and paths.
      </p>
    );
  }

  if (loading) {
    return <p className="text-foreground/40 text-sm">Searching...</p>;
  }

  if (results.length === 0) {
    return (
      <p className="text-foreground/40 text-sm">
        No results for &ldquo;{q}&rdquo;. Try a different search.
      </p>
    );
  }

  const topResult = filtered[0];
  const showGraph = topResult?.links && topResult.links.length >= 3 && filtered.length <= 8;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveLayer(null)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            !activeLayer
              ? "border-foreground/40 bg-foreground/5 text-foreground/80"
              : "border-foreground/10 text-foreground/40 hover:border-foreground/20"
          }`}
        >
          All {results.length}
        </button>
        {Object.entries(layerCounts).map(([layer, count]) => (
          <button
            key={layer}
            onClick={() => setActiveLayer(activeLayer === layer ? null : layer)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              activeLayer === layer
                ? "border-foreground/40 bg-foreground/5 text-foreground/80"
                : "border-foreground/10 text-foreground/40 hover:border-foreground/20"
            }`}
          >
            {LAYER_LABELS[layer] ?? layer} {count}
          </button>
        ))}
      </div>

      {showGraph && topResult.links && (
        <div data-track="search-graph">
          <MiniGraph
            centerTitle={topResult.title}
            centerUrl={topResult.url}
            links={topResult.links}
            resolvedLinks={resultLookup}
          />
        </div>
      )}

      <div className="space-y-3" data-track="search-results">
        {filtered.map((result) => (
          <div
            key={result.id}
            data-section-hit={result.section ? result.section.id : undefined}
            className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-4 transition-colors"
          >
            <h3 className="text-sm font-medium">
              <Link
                href={result.section ? `${result.url}#${result.section.id}` : result.url}
                className="after:absolute after:inset-0"
              >
                {result.title}
              </Link>
            </h3>
            <span className="text-foreground/30 mt-0.5 block text-xs">
              {TYPE_LABELS[result.type] ?? result.type}
            </span>
            {result.section && (
              <span className="text-foreground/60 mt-1 block text-xs">
                {result.section.heading}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      </header>
      <Suspense fallback={<p className="text-foreground/40 text-sm">Loading...</p>}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
