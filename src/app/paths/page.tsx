import Link from "next/link";
import { loadPaths } from "@/lib/content";

export default async function PathsIndexPage() {
  const paths = await loadPaths();

  // Group by audience
  const byAudience = new Map<string, typeof paths>();
  for (const p of paths) {
    for (const aud of p.frontmatter.audience ?? []) {
      if (!byAudience.has(aud)) byAudience.set(aud, []);
      byAudience.get(aud)!.push(p);
    }
  }

  const audienceOrder = ["beginner", "intermediate", "teacher", "performer", "advanced"];
  const audienceLabels: Record<string, string> = {
    beginner: "Just starting",
    intermediate: "Breaking through a plateau",
    teacher: "Learning to teach",
    performer: "Pushing toward mastery",
    advanced: "Research and reference",
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">journeys</span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Learning Paths</h1>
        <p className="text-foreground/60 mt-2">
          Curated journeys through the knowledge graph. Pick your level.
        </p>
      </header>

      {audienceOrder.map((aud) => {
        const audPaths = byAudience.get(aud);
        if (!audPaths || audPaths.length === 0) return null;
        return (
          <section key={aud} className="mb-10">
            <h2 className="text-lg font-semibold mb-1 capitalize">{audienceLabels[aud] ?? aud}</h2>
            <div className="space-y-3 mt-3">
              {audPaths.map((p) => (
                <Link
                  key={p.frontmatter.id}
                  href={`/paths/${p.frontmatter.id}`}
                  className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
                >
                  <h3 className="font-medium">{p.frontmatter.title}</h3>
                  <p className="text-sm text-foreground/50 mt-1">{p.frontmatter.description}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
