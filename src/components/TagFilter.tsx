"use client";

import { useState } from "react";
import Link from "next/link";

interface FilterableItem {
  id: string;
  title: string;
  href: string;
  tags: string[];
  preview?: string;
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

export function TagFilter({
  items,
  filterGroups,
  showPreview = true,
}: TagFilterProps) {
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
      : items.filter((item) =>
          Array.from(activeTags).some((tag) => item.tags.includes(tag))
        );

  return (
    <div>
      {/* Filter groups */}
      <div className="space-y-3 mb-6">
        {filterGroups.map((group) => {
          const visibleTags = group.tags.filter(
            (ft) => items.some((i) => i.tags.includes(ft.tag))
          );
          if (visibleTags.length === 0) return null;
          return (
            <div key={group.label} className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-foreground/30 w-14 shrink-0">
                {group.label}
              </span>
              {visibleTags.map((ft) => {
                const isActive = activeTags.has(ft.tag);
                const count = items.filter((i) =>
                  i.tags.includes(ft.tag)
                ).length;
                return (
                  <button
                    key={ft.tag}
                    onClick={() => toggleTag(ft.tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      isActive
                        ? "border-foreground/40 text-foreground/80 bg-foreground/5"
                        : "border-foreground/10 text-foreground/40 hover:border-foreground/20"
                    }`}
                  >
                    {ft.label}
                    <span className="ml-1 text-foreground/30">{count}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
        {activeTags.size > 0 && (
          <button
            onClick={() => setActiveTags(new Set())}
            className="text-xs px-3 py-1 text-foreground/40 hover:text-foreground/60"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block border border-foreground/10 rounded-lg bg-surface p-4 hover:border-foreground/30 transition-colors"
          >
            <h3 className="font-medium text-sm">{item.title}</h3>
            {showPreview && item.preview && (
              <p className="text-xs text-foreground/40 mt-1 line-clamp-2">
                {item.preview}
              </p>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-foreground/30 py-4">
            No matches. Try different filters.
          </p>
        )}
      </div>

      {activeTags.size > 0 && (
        <p className="text-xs text-foreground/30 mt-4">
          Showing {filtered.length} of {items.length}
        </p>
      )}
    </div>
  );
}
