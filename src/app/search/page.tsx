"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { MiniGraph } from "@/components/MiniGraph";
import { getSearchIndex } from "@/lib/search-index";

const LAYER_LABELS: Record<string, string> = {
  guide: "Guides",
  atom: "How It Works & Practice",
  thread: "Threads",
  path: "Learning Paths",
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
};

interface GraphLink {
  id: string;
  relation: string;
}

interface SearchResult {
  id: number;
  title: string;
  url: string;
  layer: string;
  type: string;
  score: number;
  links?: GraphLink[];
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
        const hits = ms.search(q, {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 3 },
        });

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
        <MiniGraph
          centerTitle={topResult.title}
          centerUrl={topResult.url}
          links={topResult.links}
          resolvedLinks={resultLookup}
        />
      )}

      <div className="space-y-3">
        {filtered.map((result) => (
          <Link
            key={result.id}
            href={result.url}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
          >
            <h3 className="text-sm font-medium">{result.title}</h3>
            <span className="text-foreground/30 mt-0.5 block text-xs">
              {TYPE_LABELS[result.type] ?? result.type}
            </span>
          </Link>
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
