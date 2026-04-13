import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search across all concepts, exercises, guides, and paths in the improv knowledge base.",
  alternates: { canonical: "/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
