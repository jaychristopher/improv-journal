import Link from "next/link";
import { notFound } from "next/navigation";

import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { getAudioUrl, getPathBySlug, getThreadBySlug, loadPaths } from "@/lib/content";

export async function generateStaticParams() {
  const paths = await loadPaths();
  return paths.map((p) => ({ slug: p.frontmatter.id }));
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathData = await getPathBySlug(slug);
  if (!pathData) notFound();

  const fm = pathData.frontmatter;
  const audioUrl = getAudioUrl("paths", slug);

  // Resolve thread references
  const threads = await Promise.all(
    (fm.threads ?? []).map(async (id) => {
      const thread = await getThreadBySlug(id);
      return thread
        ? { id, title: thread.frontmatter.title, html: thread.html, found: true }
        : { id, title: id, html: "", found: false };
    }),
  );

  const firstAudience = fm.audience?.[0] ?? "beginner";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Learn", href: `/learn/${firstAudience}` },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">path</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
        <p className="text-foreground/60 mt-2">{fm.description}</p>
        <div className="mt-3 flex gap-2">
          {fm.audience?.map((a) => (
            <span
              key={a}
              className="bg-foreground/5 text-foreground/50 rounded-full px-2 py-0.5 text-xs"
            >
              {a}
            </span>
          ))}
        </div>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert mb-12 max-w-none"
        dangerouslySetInnerHTML={{ __html: pathData.html }}
      />

      <div className="space-y-10">
        {threads.map((thread, i) => (
          <section
            key={thread.id}
            className="border-foreground/10 bg-surface rounded-lg border p-6"
          >
            <span className="text-foreground/30 text-xs">
              {i + 1} of {threads.length}
            </span>
            <h2 className="mt-1 text-xl font-semibold">
              <Link href={`/threads/${thread.id}`} className="hover:underline">
                {thread.title}
              </Link>
            </h2>
            {thread.found && (
              <div
                className="prose prose-neutral dark:prose-invert prose-sm mt-4 max-w-none"
                dangerouslySetInnerHTML={{ __html: thread.html }}
              />
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
