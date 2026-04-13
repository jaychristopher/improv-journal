"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SearchInput } from "./SearchInput";

interface NavSection {
  href: string;
  label: string;
  children: { href: string; label: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    href: "/how-it-works",
    label: "How It Works",
    children: [
      { href: "/how-it-works", label: "Overview" },
      { href: "/how-it-works/principles", label: "Principles" },
      { href: "/how-it-works/diagnosis", label: "Diagnosis" },
    ],
  },
  {
    href: "/practice",
    label: "Practice",
    children: [
      { href: "/improv-games", label: "Improv Games" },
      { href: "/practice/exercises", label: "Exercises" },
      { href: "/practice/techniques", label: "Techniques" },
      { href: "/practice/formats", label: "Formats" },
      { href: "/practice/vocabulary", label: "Vocabulary" },
    ],
  },
  {
    href: "/resources",
    label: "Resources",
    children: [
      { href: "/paths", label: "Learning Paths" },
      { href: "/guides", label: "Guides" },
      { href: "/listen", label: "Listen" },
      { href: "/traditions", label: "Traditions" },
      { href: "/library", label: "Reading List" },
    ],
  },
];

function NavDropdown({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-foreground/50 hover:text-foreground/80 flex cursor-pointer items-center gap-1 text-sm transition-colors"
      >
        {section.label}
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="bg-surface border-foreground/10 absolute top-full left-0 z-20 mt-2 min-w-[160px] rounded-lg border py-2 shadow-lg">
          {section.children.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5 block cursor-pointer px-4 py-2 text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav className="border-foreground/10 relative z-50 border-b px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Physics of Connection
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 sm:flex">
          {NAV_SECTIONS.map((section) => (
            <NavDropdown key={section.href} section={section} />
          ))}
          <SearchInput />
        </div>

        {/* Mobile: search + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <SearchInput />
          <button
            className="text-foreground/50 hover:text-foreground/80 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu — full viewport overlay */}
      {mobileOpen && (
        <div className="bg-background fixed inset-0 top-[49px] z-40 overflow-y-auto px-6 pt-8 pb-12 sm:hidden">
          {NAV_SECTIONS.map((section) => (
            <div key={section.href} className="mb-8">
              <Link
                href={section.href}
                onClick={() => setMobileOpen(false)}
                className="text-foreground/80 block text-2xl font-semibold"
              >
                {section.label}
              </Link>
              <div className="mt-2 space-y-2 pl-4">
                {section.children.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-foreground/50 hover:text-foreground/70 block text-lg"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
