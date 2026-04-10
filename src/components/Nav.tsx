"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchInput } from "./SearchInput";

const MORE_ITEMS = [
  { href: "/paths", label: "Learning Paths" },
  { href: "/listen", label: "Listen" },
  { href: "/traditions", label: "Traditions" },
  { href: "/library", label: "Reading List" },
];

export function Nav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-foreground/10 px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-semibold text-sm tracking-tight">
          Physics of Connection
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/how-it-works"
            className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/practice"
            className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            Practice
          </Link>
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors flex items-center gap-1"
            >
              More
              <svg
                className={`w-3 h-3 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-20 bg-background border border-foreground/10 rounded-lg py-2 min-w-[160px] shadow-lg">
                  {MORE_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="block px-4 py-2 text-sm text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
          <SearchInput />
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-foreground/50 hover:text-foreground/80"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden mt-4 pb-2">
          {/* Search */}
          <div className="mb-4">
            <SearchInput />
          </div>
          {/* Primary — large */}
          <div className="space-y-1 mb-4">
            <Link
              href="/how-it-works"
              onClick={() => setMobileOpen(false)}
              className="block text-lg font-semibold text-foreground/70 hover:text-foreground/90 py-2"
            >
              How It Works
            </Link>
            <Link
              href="/practice"
              onClick={() => setMobileOpen(false)}
              className="block text-lg font-semibold text-foreground/70 hover:text-foreground/90 py-2"
            >
              Practice
            </Link>
          </div>
          {/* Secondary — smaller, de-emphasized */}
          <div className="space-y-1 border-t border-foreground/5 pt-3">
            <span className="sr-only">More</span>
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-foreground/40 hover:text-foreground/60 py-1.5"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
