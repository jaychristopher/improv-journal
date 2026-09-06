"use client";

import Link from "next/link";
import { useState } from "react";

import { countFor, itemMatches, selectionsFor } from "@/lib/facets";

interface FilterableItem {
  id: string;
  title: string;
  href: string;
  tags: string[];
  preview?: string;
  /**
   * Rendered above the preview, unclamped. The games hub needs the rules
   * readable in the list itself — a searcher looking for improv games wants
   * something they can run, not thirty links to click through.
   */
  rules?: string;
  /**
   * Other names the concept is taught under. Shown because an alias that lives
   * only in the page's JSON-LD does not help somebody scanning this list for a
   * word the list never prints.
   */
  aliases?: string[];
}

interface FilterGroup {
  label: string;
  tags: { label: string; tag: string }[];
}

interface TagFilterProps {
  items: FilterableItem[];
  filterGroups: FilterGroup[];
  showPreview?: boolean;
}

export function TagFilter({ items, filterGroups, showPreview = true }: TagFilterProps) {
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  // Semantics live in @/lib/facets so they can be tested; see the note there
  // for why OR-inside / AND-across is not what this used to do.
  const selections = selectionsFor(filterGroups, activeTags);
  const filtered =
    selections.length === 0 ? items : items.filter((item) => itemMatches(item.tags, selections));

  return (
    <div>
      {/* Filter groups */}
      <div className="mb-6 space-y-3">
        {filterGroups.map((group) => {
          const visibleTags = group.tags.filter((ft) => items.some((i) => i.tags.includes(ft.tag)));
          if (visibleTags.length === 0) return null;
          return (
            <div key={group.label} className="flex flex-wrap items-center gap-2">
              <span className="text-foreground/30 w-14 shrink-0 text-xs">{group.label}</span>
              {visibleTags.map((ft) => {
                const isActive = activeTags.has(ft.tag);
                /*
                 * The count this tag would actually produce, given everything
                 * else already chosen — its own group ignored, so the numbers
                 * inside a group stay comparable. It used to be the total
                 * across all items, which promised results the filter would not
                 * deliver: "Game 9" next to an active Beginner that yields none.
                 *
                 * That matters more here than the arithmetic suggests. Under
                 * AND, 56% of level-and-area pairs on the exercises hub have no
                 * members at all, so honest counts are what keep a correct
                 * filter from feeling broken — a zero is visible before it is
                 * clicked rather than after.
                 */
                const groupIndex = selections.findIndex((chosen) =>
                  group.tags.some((t) => t.tag === chosen[0]),
                );
                const count = countFor(items, ft.tag, selections, groupIndex);
                const unavailable = count === 0 && !isActive;
                return (
                  <button
                    key={ft.tag}
                    onClick={() => toggleTag(ft.tag)}
                    disabled={unavailable}
                    aria-pressed={isActive}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      isActive
                        ? "border-foreground/40 text-foreground/80 bg-foreground/5"
                        : unavailable
                          ? "border-foreground/5 text-foreground/20 cursor-not-allowed"
                          : "border-foreground/10 text-foreground/40 hover:border-foreground/20"
                    }`}
                  >
                    {ft.label}
                    <span className="text-foreground/30 ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
        {activeTags.size > 0 && (
          <button
            onClick={() => setActiveTags(new Set())}
            className="text-foreground/40 hover:text-foreground/60 px-3 py-1 text-xs"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-4 transition-colors"
          >
            <h3 className="text-sm font-medium">
              <Link href={item.href} className="after:absolute after:inset-0">
                {item.title}
              </Link>
            </h3>
            {item.rules && <p className="text-foreground/70 mt-2 text-sm">{item.rules}</p>}
            {showPreview && item.preview && (
              <p className="text-foreground/40 mt-2 line-clamp-2 text-xs">{item.preview}</p>
            )}
            {item.aliases && item.aliases.length > 0 && (
              <p className="text-foreground/35 mt-1 text-xs">
                Also called {item.aliases.join(", ")}.
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-foreground/30 py-4 text-sm">No matches. Try different filters.</p>
        )}
      </div>

      {activeTags.size > 0 && (
        <p className="text-foreground/30 mt-4 text-xs">
          Showing {filtered.length} of {items.length}
        </p>
      )}
    </div>
  );
}
