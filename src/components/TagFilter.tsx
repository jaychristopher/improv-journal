"use client";

import Link from "next/link";
import { useState } from "react";

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

  const filtered =
    activeTags.size === 0
      ? items
      : items.filter((item) => Array.from(activeTags).some((tag) => item.tags.includes(tag)));

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
                const count = items.filter((i) => i.tags.includes(ft.tag)).length;
                return (
                  <button
                    key={ft.tag}
                    onClick={() => toggleTag(ft.tag)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      isActive
                        ? "border-foreground/40 text-foreground/80 bg-foreground/5"
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
