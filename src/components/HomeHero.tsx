import Link from "next/link";
import type { ReactNode } from "react";

import { HOME_DOORS } from "@/lib/home-doors";

/**
 * The homepage hero: who this is, what it does, and one place to start.
 *
 * Three things, in the order a reader needs them. The name and the tagline
 * answer Krug's first question and Nielsen's second guideline — what is this
 * — in the reader's language rather than the site's. The slot on the right
 * holds the one starting point (the beginner programme, or the reader's own
 * journey once there is one), in the place Nielsen's fourth guideline gives
 * the highest-priority task: "if you emphasize everything, nothing gets
 * focus." Under the tagline, two lines say who else this is for and link
 * where they should go — audience routes as the secondary navigation NN/g
 * allows, never the primary one.
 *
 * Until 2026-09-27 this was a viewport-high takeover whose two cards were
 * buttons: "What are you here for?" opened a modal that asked a second
 * question before offering a link. Measured that morning, the hero ended
 * exactly at the fold on a 390px phone with nothing peeking under it, the
 * topic directory began 3.2 screens down, and every answer the modal could
 * give — the guide clusters, the four levels — was already on the page
 * further down. The account, the sources and the ruling are in
 * docs/homepage-principles.md; the answers now sit on the page, in the
 * clusters grid and the level list, where a crawler and a reader meet them
 * the same way.
 *
 * A server component: nothing here needs the browser, so the hero ships as
 * html and no script. The slot's children carry their own interactivity.
 */
const HEADING_ID = "home-hero-title";

export function HomeHero({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-6 lg:pt-10">
      <section
        aria-labelledby={HEADING_ID}
        data-track="home-hero"
        className="bg-hero text-hero-foreground rounded-2xl px-6 py-8 sm:px-10 sm:py-12"
      >
        <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12">
          <div>
            <h1
              id={HEADING_ID}
              className="text-hero-foreground text-[2.5rem] leading-[0.95] font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Physics of
              <br />
              Connection
            </h1>
            <p className="text-hero-muted mt-4 max-w-md text-base leading-relaxed sm:text-lg">
              Learn the underlying mechanics of effective communication, discovered through the art
              of improv.
            </p>
            {/* Who else this is for, as links rather than a question: a reader
                who is neither, or both, loses nothing by scrolling past. */}
            <ul className="mt-6 grid max-w-md gap-2 text-sm leading-relaxed">
              {HOME_DOORS.map((door) => (
                <li key={door.id}>
                  <Link
                    href={door.href}
                    className="text-hero-foreground font-semibold underline underline-offset-4 hover:opacity-80"
                  >
                    {door.label}
                  </Link>
                  <span className="text-hero-muted"> {door.note}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* The slot inverts the page's tokens (globals.css, [data-hero-slot])
              so a card written in the page's own ramp reads on the panel. */}
          <div data-hero-slot className="mt-8 lg:mt-0">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
