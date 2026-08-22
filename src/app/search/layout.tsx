import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search across all concepts, exercises, guides, and paths in the improv knowledge base.",
  alternates: { canonical: "/search" },
  /**
   * An internal search page is a results template, not a document. It rendered
   * two words of content, had no inbound link anywhere on the site, and was the
   * only indexable page missing from the sitemap — while still being indexable,
   * which is how a URL ends up listed with no useful snippet behind it.
   */
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
