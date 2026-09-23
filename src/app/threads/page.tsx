import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { HUBS, hubSelfCrumb } from "@/lib/hubs";
import { pageTitle } from "@/lib/seo";

import { buildLessonsIndex, pathMembershipSentence } from "./lessons-index";

export const THREADS_URL = HUBS.threads.href;

export const metadata: Metadata = {
  title: pageTitle(`${HUBS.threads.h1}: The Ideas Worked Through in Full`),
  description:
    "Longer pieces that take the atoms and follow one argument all the way — scene anatomy, the plateau, and the physics under an ordinary room.",
  alternates: { canonical: THREADS_URL },
};

const ORIENTATION_LEAD =
  "Atoms name one thing each. Lessons are where several of them get put together and followed until the argument finishes — longer, and meant to be read rather than referred to.";

export default async function ThreadsPage() {
  const index = await buildLessonsIndex();
  const { groups, entries } = index;
  const orientation = [ORIENTATION_LEAD, pathMembershipSentence(index)];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name={HUBS.threads.h1}
        description="Longer pieces that take the atoms and follow an argument all the way."
        url={THREADS_URL}
        items={entries.map((e) => ({ name: e.title, url: e.url }))}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, hubSelfCrumb(HUBS.threads)]} />

      <header className="mb-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{HUBS.threads.h1}</h1>
        {orientation.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-3 last:mb-0">
            {paragraph}
          </p>
        ))}
      </header>

      {groups.map((group) => (
        <section key={group.id} className="mb-12 last:mb-0" data-track="essay-list">
          <h2 className="text-foreground/40 mb-1 text-xs font-semibold tracking-wider uppercase">
            {group.href ? (
              <Link href={group.href} className="hover:text-foreground/70 hover:underline">
                {group.label}
              </Link>
            ) : (
              group.label
            )}{" "}
            ({group.items.length})
          </h2>
          <p className="text-foreground/50 mb-4 text-sm">{group.description}</p>
          <dl className="space-y-6">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="border-foreground/10 border-b pb-6 last:border-b-0 last:pb-0"
              >
                <dt>
                  <Link href={item.url} className="text-lg font-semibold hover:underline">
                    {item.title}
                  </Link>
                </dt>
                <dd className="text-foreground/60 mt-1 text-sm">{item.lead}</dd>
                {/* A lesson sequenced by more than one path is listed once, under
                    the path the atom pages name as its primary, and says where
                    else it sits — rather than being filed under whichever path
                    happened to load first and silently absent from the rest. */}
                {item.alsoIn.length > 0 && (
                  <dd className="text-foreground/40 mt-1 text-xs">
                    Also in{" "}
                    {item.alsoIn.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && (i === item.alsoIn.length - 1 ? " and " : ", ")}
                        <Link href={p.href} className="hover:underline">
                          {p.title}
                        </Link>
                      </span>
                    ))}
                    .
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
