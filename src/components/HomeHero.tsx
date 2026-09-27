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
 *
 * The hook (round 3, 2026-09-27, from the PostHog record): 84% of the
 * homepage's views since June were the first page of the visit and 89%
 * arrived with no referrer — a link shared somewhere, not a search — and
 * the median visit never scrolled. So the line that used to open the
 * column below ("What makes some conversations magic…", the one the April
 * audit found lands for the life-seeker) is the hero's own now, under the
 * tagline, where the two in three who never scroll will read it; the
 * column starts with the finder.
 *
 * Order (round 2, 2026-09-27): on a phone the slot follows the tagline and
 * the audience lines come after it, so the one starting point is whole on
 * the first screen and the fold cuts through the lines under it. Before,
 * the lines sat between the tagline and the card and pushed the card's
 * button to the last row of the screen. On a wide screen the grid puts the
 * name, the tagline and the lines in the first column and the slot beside
 * them, spanning both rows.
 */
const HEADING_ID = "home-hero-title";

export function HomeHero({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-6 lg:pt-10">
      <section
        data-hero-panel
        aria-labelledby={HEADING_ID}
        data-track="home-hero"
        className="bg-hero text-hero-foreground rounded-2xl px-6 py-8 sm:px-10 sm:py-12"
      >
        <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-12">
          <div className="lg:col-start-1 lg:row-start-1">
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
            <p className="text-hero-foreground mt-4 max-w-md text-sm leading-relaxed sm:text-base">
              What makes some conversations magic and others fall flat? There are real reasons, and
              they are learnable: improv performers have been studying them on stage for 60 years.
            </p>
          </div>
          {/* The slot inverts the page's tokens (globals.css, [data-hero-slot])
              so a card written in the page's own ramp reads on the panel. */}
          <div data-hero-slot className="mt-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
            {children}
          </div>
          {/* Who else this is for, as links rather than a question: a reader
              who is neither, or both, loses nothing by scrolling past. The
              improvisers' line jumps to the level list on this page, which
              is the answer for all four levels; a hub would be right for
              one of them. */}
          <div className="lg:col-start-1 lg:row-start-2">
            <ul className="mt-6 grid max-w-md gap-2 text-sm leading-relaxed lg:mt-4">
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
        </div>
      </section>
    </div>
  );
}
