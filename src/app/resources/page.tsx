import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Learning paths, guides, podcasts, reading lists, and the traditions that shaped improv.",
  alternates: { canonical: "/resources" },
};

const SECTIONS = [
  {
    href: "/paths",
    label: "Learning Paths",
    desc: "Structured guides for wherever you are — beginner through performer.",
  },
  {
    href: "/guides",
    label: "Guides",
    desc: "Practical guides for overthinking, stage fright, team dynamics, feedback, and more.",
  },
  {
    href: "/listen",
    label: "Listen",
    desc: "Podcast conversations exploring the physics of human connection through improv.",
  },
  {
    href: "/traditions",
    label: "Traditions",
    desc: "Five schools of thought — Johnstone, Spolin, Close, UCB, and Annoyance compared.",
  },
  {
    href: "/library",
    label: "Reading List",
    desc: "The books, podcasts, and research behind these ideas.",
  },
];

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]} />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-foreground/60 mt-2">
          Everything beyond the core system and practice — learning paths, guides, podcasts, reading
          lists, and the traditions that shaped improv.
        </p>
      </header>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
          >
            <h2 className="font-semibold">{s.label}</h2>
            <p className="text-foreground/50 mt-1 text-sm">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
