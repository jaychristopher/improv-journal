import { notFound } from "next/navigation";
import Link from "next/link";
import { loadPaths, getPathBySlug, getThreadBySlug, getAudioUrl } from "@/lib/content";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";

export async function generateStaticParams() {
  const paths = await loadPaths();
  return paths.map((p) => ({ slug: p.frontmatter.id }));
}

export default async function PathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
    })
  );

  const firstAudience = fm.audience?.[0] ?? "beginner";

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Learn", href: `/learn/${firstAudience}` },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          path
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
        <p className="text-foreground/60 mt-2">{fm.description}</p>
        <div className="mt-3 flex gap-2">
          {fm.audience?.map((a) => (
            <span
              key={a}
              className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/50"
            >
              {a}
            </span>
          ))}
        </div>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: pathData.html }}
      />

      <div className="space-y-10">
        {threads.map((thread, i) => (
          <section
            key={thread.id}
            className="border border-foreground/10 rounded-lg p-6"
          >
            <span className="text-xs text-foreground/30">
              {i + 1} of {threads.length}
            </span>
            <h2 className="text-xl font-semibold mt-1">
              <Link
                href={`/threads/${thread.id}`}
                className="hover:underline"
              >
                {thread.title}
              </Link>
            </h2>
            {thread.found && (
              <div
                className="prose prose-neutral dark:prose-invert prose-sm max-w-none mt-4"
                dangerouslySetInnerHTML={{ __html: thread.html }}
              />
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
