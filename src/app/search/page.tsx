"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import MiniSearch from "minisearch";
import { MiniGraph } from "@/components/MiniGraph";

const INDEX_URL = "/search-index.json";
const MINISEARCH_OPTS = {
  fields: ["title", "body", "tags"],
  storeFields: ["title", "url", "layer", "type", "docId", "links"],
};

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
  axiom: "why it's hard",
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
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const res = await fetch(INDEX_URL);
      const json = await res.text();
      const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTS);
      const hits = ms.search(q, {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 3 },
      });
      setResults(
        hits.map((h) => {
          let links: GraphLink[] | undefined;
          try {
            if (h.links) links = JSON.parse(h.links as string);
          } catch { /* no links */ }
          return {
            id: h.id,
            title: h.title as string,
            url: h.url as string,
            layer: h.layer as string,
            type: h.type as string,
            score: h.score,
            links,
          };
        })
      );
      setLoading(false);
    })();
  }, [q]);

  // Facet counts
  const layerCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.layer] = (acc[r.layer] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = activeLayer
    ? results.filter((r) => r.layer === activeLayer)
    : results;

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

  // Graph: show when top result has connections and results are focused
  const topResult = filtered[0];
  const showGraph =
    topResult?.links &&
    topResult.links.length >= 3 &&
    filtered.length <= 8;

  // Build a title/url lookup from all results for graph node resolution
  const resultLookup = useMemo(() => {
    const map = new Map<string, { title: string; url: string }>();
    for (const r of results) {
      // Use docId if available via the index
      map.set(r.title.toLowerCase().replace(/\s+/g, "-"), {
        title: r.title,
        url: r.url,
      });
    }
    return map;
  }, [results]);

  return (
    <div>
      {/* Facet pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveLayer(null)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            !activeLayer
              ? "border-foreground/40 text-foreground/80 bg-foreground/5"
              : "border-foreground/10 text-foreground/40 hover:border-foreground/20"
          }`}
        >
          All {results.length}
        </button>
        {Object.entries(layerCounts).map(([layer, count]) => (
          <button
            key={layer}
            onClick={() =>
              setActiveLayer(activeLayer === layer ? null : layer)
            }
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeLayer === layer
                ? "border-foreground/40 text-foreground/80 bg-foreground/5"
                : "border-foreground/10 text-foreground/40 hover:border-foreground/20"
            }`}
          >
            {LAYER_LABELS[layer] ?? layer} {count}
          </button>
        ))}
      </div>

      {/* Mini graph for focused queries */}
      {showGraph && topResult.links && (
        <MiniGraph
          centerTitle={topResult.title}
          centerUrl={topResult.url}
          links={topResult.links}
          resolvedLinks={resultLookup}
        />
      )}

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={r.url}
            className="block border border-foreground/10 rounded-lg bg-surface p-4 hover:border-foreground/30 transition-colors"
          >
            <h3 className="font-medium text-sm">{r.title}</h3>
            <span className="text-xs text-foreground/30 mt-0.5 block">
              {TYPE_LABELS[r.type] ?? r.type}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      </header>
      <Suspense
        fallback={
          <p className="text-foreground/40 text-sm">Loading...</p>
        }
      >
        <SearchResults />
      </Suspense>
    </main>
  );
}
