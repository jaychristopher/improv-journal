import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CourseJsonLd } from "@/components/CourseJsonLd";
import { SyllabusCheckmark, SyllabusProgress } from "@/components/SyllabusProgress";
import { WhatsNext } from "@/components/WhatsNext";
import {
  getAudioUrl,
  getPathBySlug,
  getPathTotalDuration,
  getThreadBySlug,
  getThreadDuration,
  loadPaths,
} from "@/lib/content";
import { getNextPath } from "@/lib/path-progression";

export async function generateStaticParams() {
  const paths = await loadPaths();
  return paths.map((p) => ({ slug: p.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pathData = await getPathBySlug(slug);
  if (!pathData) return {};
  return {
    title: pathData.frontmatter.title,
    description: pathData.frontmatter.description,
    alternates: { canonical: `/paths/${slug}` },
    openGraph: {
      title: pathData.frontmatter.title,
      description: pathData.frontmatter.description,
      url: `/paths/${slug}`,
      type: "article",
    },
  };
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathData = await getPathBySlug(slug);
  if (!pathData) notFound();

  const fm = pathData.frontmatter;
  const audioUrl = getAudioUrl("paths", slug);
  const threadIds = fm.threads ?? [];

  const threads = await Promise.all(
    threadIds.map(async (id) => {
      const thread = await getThreadBySlug(id);
      const duration = getThreadDuration(id);
      const desc = thread
        ? (thread.content
            .replace(/^---[\s\S]*?---\n*/m, "")
            .replace(/^#{1,6}\s+.*$/gm, "")
            .replace(/\*\*[^*]+\*\*/g, "")
            .trim()
            .split(/\n\n/)[0]
            ?.substring(0, 200) ?? "")
        : "";

      return thread
        ? { id, title: thread.frontmatter.title, desc, duration, found: true }
        : { id, title: id, desc: "", duration: null, found: false };
    }),
  );

  const totalDuration = getPathTotalDuration(threadIds);
  const firstAudience = fm.audience?.[0] ?? "beginner";
  const nextPath = getNextPath(slug);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <CourseJsonLd
        title={fm.title}
        description={fm.description}
        url={`/paths/${slug}`}
        audience={firstAudience}
        duration={totalDuration}
        threadCount={threads.length}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Learn", href: `/learn/${firstAudience}` },
          { label: fm.title },
        ]}
      />

      <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
        <header className="border-foreground/10 bg-surface rounded-xl border p-6">
          <span className="text-foreground/40 text-xs tracking-wider uppercase">course path</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
          <p className="text-foreground/60 mt-3">{fm.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {fm.audience.map((audience) => (
              <span
                key={audience}
                className="bg-foreground/5 text-foreground/50 rounded-full px-2 py-0.5 text-xs"
              >
                {audience}
              </span>
            ))}
            <span className="text-foreground/30 text-xs">
              {threads.length} threads{totalDuration ? ` · ${totalDuration}` : ""}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <section>
              <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Who this is for
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {fm.who_this_is_for.map((item) => (
                  <li key={item} className="text-foreground/70 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Before you start
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {fm.prerequisites.map((item) => (
                  <li key={item} className="text-foreground/70 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-6">
            <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
              What you&apos;ll get
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {fm.learning_objectives.map((objective) => (
                <li key={objective} className="text-foreground/70 text-sm">
                  {objective}
                </li>
              ))}
            </ul>
          </section>
        </header>

        <aside className="border-foreground/10 bg-foreground/[0.03] rounded-xl border p-6">
          <h2 className="text-lg font-semibold">How to use this path</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Estimated time
              </dt>
              <dd className="text-foreground/70 mt-1">{fm.estimated_time}</dd>
            </div>
            <div>
              <dt className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Practice cadence
              </dt>
              <dd className="text-foreground/70 mt-1">{fm.practice_cadence}</dd>
            </div>
            <div>
              <dt className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Finish with
              </dt>
              <dd className="text-foreground/70 mt-1">{fm.completion_outcome}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <SyllabusProgress pathId={slug} threadIds={threadIds} />
          </div>

          {audioUrl && (
            <div className="mt-6">
              <p className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                Listen
              </p>
              <AudioPlayer src={audioUrl} />
            </div>
          )}
        </aside>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Course syllabus</h2>
            <p className="text-foreground/50 mt-1 text-sm">
              Move in order. Each thread builds on the one before it.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {threads.map((thread, i) => (
            <Link
              key={thread.id}
              href={`/threads/${thread.id}`}
              className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-lg border p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground/30 text-xs font-medium">{i + 1}</span>
                    <SyllabusCheckmark threadId={thread.id} />
                  </div>
                  <h3 className="mt-0.5 font-semibold group-hover:underline">{thread.title}</h3>
                  {thread.desc && (
                    <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">{thread.desc}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {thread.duration && (
                    <span className="text-foreground/30 text-xs">{thread.duration}</span>
                  )}
                  <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {nextPath && (
        <WhatsNext
          variant="path-complete"
          nextPathTitle={nextPath.title}
          nextPathHref={`/paths/${nextPath.id}`}
        />
      )}
    </main>
  );
}
