"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { getSearchIndex, hasSearchIndex } from "@/lib/search-index";

interface QuickResult {
  title: string;
  url: string;
}

export function SearchInput() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    requestIdRef.current += 1;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIdx(-1);
    setLoading(false);
  }, []);

  const suggest = useCallback(async (value: string, requestId: number) => {
    if (value.length < 2) {
      if (requestId === requestIdRef.current) {
        setResults([]);
      }
      return;
    }

    try {
      const ms = await getSearchIndex();
      if (requestId !== requestIdRef.current) return;

      const suggestions = ms.autoSuggest(value, {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 3 },
      });

      setResults(
        suggestions.slice(0, 6).map((suggestion) => ({
          title: suggestion.suggestion,
          url: `/search?q=${encodeURIComponent(suggestion.suggestion)}`,
        })),
      );
    } catch {
      if (requestId === requestIdRef.current) {
        setResults([]);
      }
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIdx(-1);

      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void suggest(value, requestId);
      }, 150);
    },
    [suggest],
  );

  const navigate = useCallback(
    (url: string, source: "suggestion" | "query") => {
      const normalizedQuery = query.trim();
      if (normalizedQuery) {
        trackEvent("search_submitted", {
          destination: url,
          query: normalizedQuery,
          source,
        });
      }

      close();
      router.push(url);
    },
    [close, query, router],
  );

  const open = useCallback(
    async (source: "button" | "shortcut") => {
      if (!isOpen) {
        trackEvent("search_opened", { source });
      }

      setIsOpen(true);
      focusInput();

      if (hasSearchIndex()) return;

      setLoading(true);
      try {
        await getSearchIndex();
      } finally {
        setLoading(false);
        focusInput();
      }
    },
    [focusInput, isOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIdx >= 0 && results[selectedIdx]) {
          navigate(results[selectedIdx].url, "suggestion");
        } else if (query.trim()) {
          navigate(`/search?q=${encodeURIComponent(query.trim())}`, "query");
        }
      }
    },
    [close, navigate, query, results, selectedIdx],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          void open("shortcut");
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close, isOpen, open]);

  return (
    <>
      <button
        onClick={() => void open("button")}
        className="text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
        aria-label="Search (Ctrl+K)"
        title="Search (Ctrl+K)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-background/80 fixed inset-0 z-50 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-6 pt-20">
            <div className="mb-3 flex justify-end">
              <button
                onClick={close}
                className="text-foreground/40 hover:text-foreground/60 flex h-8 w-8 items-center justify-center rounded-lg"
                aria-label="Close search"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search concepts, exercises, guides..."
              className="bg-surface border-foreground/10 text-foreground/80 placeholder:text-foreground/30 focus:border-foreground/30 w-full rounded-xl border px-5 py-4 text-xl transition-colors focus:outline-none"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-suggestions"
              aria-autocomplete="list"
            />

            {query.length === 0 && !loading && (
              <p className="text-foreground/30 mt-3 px-1 text-xs">
                Type to search. Press Esc to close.
              </p>
            )}

            {loading && <p className="text-foreground/30 mt-4 px-1 text-sm">Loading search...</p>}

            {results.length > 0 && (
              <div id="search-suggestions" role="listbox" className="mt-4 space-y-1">
                {results.map((result, i) => (
                  <button
                    key={result.title}
                    onClick={() => navigate(result.url, "suggestion")}
                    className={`flex w-full items-center gap-3 rounded-lg px-5 py-3 text-left transition-colors ${
                      i === selectedIdx
                        ? "bg-surface text-foreground/90"
                        : "text-foreground/60 hover:bg-surface hover:text-foreground/80"
                    }`}
                  >
                    <svg
                      className="text-foreground/20 h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-lg">{result.title}</span>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !loading && results.length === 0 && (
              <p className="text-foreground/30 mt-4 px-1 text-sm">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
