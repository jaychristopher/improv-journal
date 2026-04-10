"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MiniSearch from "minisearch";

const INDEX_URL = "/search-index.json";
const MINISEARCH_OPTS = {
  fields: ["title", "body", "tags"],
  storeFields: ["title", "url", "layer", "type", "docId", "links"],
};

let cachedIndex: MiniSearch | null = null;

async function getIndex(): Promise<MiniSearch> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(INDEX_URL);
  const json = await res.text();
  cachedIndex = MiniSearch.loadJSON(json, MINISEARCH_OPTS);
  return cachedIndex;
}

export function SearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const suggest = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const ms = await getIndex();
      const results = ms.autoSuggest(q, {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 3 },
      });
      setSuggestions(results.slice(0, 5).map((r) => r.suggestion));
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => suggest(value), 150);
  };

  const navigate = (q: string) => {
    setOpen(false);
    setSuggestions([]);
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSuggestions([]);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        navigate(suggestions[selectedIdx]);
      } else {
        navigate(query);
      }
    }
  };

  const handleFocus = async () => {
    setOpen(true);
    if (!cachedIndex) {
      setLoading(true);
      await getIndex();
      setLoading(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.parentElement?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="w-32 sm:w-40 text-sm bg-transparent border border-foreground/10 rounded-lg px-3 py-1.5 text-foreground/70 placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30 transition-colors"
        aria-label="Search"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />

      {/* Suggestions dropdown */}
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-foreground/10 rounded-lg py-1 min-w-[200px] shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-foreground/30">
              Loading search...
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                navigate(s);
              }}
              className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                i === selectedIdx
                  ? "bg-foreground/5 text-foreground/80"
                  : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
