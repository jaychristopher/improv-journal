import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { AFFILIATE_PARTICIPATION } from "@/lib/affiliate";
import { ogImages, pageTitle, SITE_NAME } from "@/lib/seo";

/**
 * What this site collects, written from what the code actually does.
 *
 * Every claim below is checkable against a file, and privacy-page.test.ts
 * holds the page against them: PostHog is initialised in providers.tsx,
 * Vercel Analytics and Speed Insights are mounted in layout.tsx, the journey
 * record is localStorage in journey.ts, the Amazon links are tagged in
 * affiliate.ts, and the only address the site ever takes is the one the
 * email capture asks for.
 *
 * The page exists because the site started asking for email addresses on
 * 2026-09-24 and there was no notice of any kind — while three analytics
 * scripts had been running on every page since long before that.
 */
const TITLE = "Privacy";
const DESCRIPTION =
  "What this site collects, who it goes to, and how to get rid of it. Written from what the code does.";

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_US",
    title: TITLE,
    description: DESCRIPTION,
    url: "/privacy",
    type: "website",
    images: ogImages(TITLE),
  },
};

/** Set on Vercel. Without it the page says there is no contact route yet. */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: TITLE }]} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
        <p className="text-foreground-dim mt-3 text-sm leading-relaxed">
          Short, and specific. This describes what the site actually does rather than what a
          template says a site might do.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-foreground-strong mb-2 text-lg font-semibold">
            If you give us your email address
          </h2>
          <p className="text-foreground/80">
            It is used to send you the specific sequence you asked for, and nothing else. Each one
            is a fixed number of emails and then it stops — the form tells you how many before you
            type anything. You will be asked to confirm by clicking a link; until you do, the
            address is not on any list. Every email has an unsubscribe link, and unsubscribing
            removes the address rather than pausing it.
          </p>
          <p className="text-foreground/80 mt-3">
            We do not sell, rent, or share addresses, and there is no third party we pass them to
            beyond the email provider that delivers the messages.
          </p>
        </section>

        <section>
          <h2 className="text-foreground-strong mb-2 text-lg font-semibold">Analytics</h2>
          <p className="text-foreground/80">
            Every page loads PostHog, Vercel Analytics and Vercel Speed Insights. They record which
            pages are opened, which links and tools are used, and how quickly pages render. Session
            recording and surveys are switched off in the PostHog configuration, and automatic
            capture of every click is off as well — the events are named ones the site asks for
            explicitly.
          </p>
          <p className="text-foreground/80 mt-3">
            None of this is tied to an email address or to any account, because there are no
            accounts.
          </p>
        </section>

        <section>
          <h2 className="text-foreground-strong mb-2 text-lg font-semibold">
            What stays in your browser
          </h2>
          <p className="text-foreground/80">
            Your reading progress — which lesson you are on, which you have marked shaky, when a
            review is due, which prompts and games you have already been dealt — is kept in your
            browser&rsquo;s local storage. It is never sent anywhere. It is also why the site can
            only remind you on the device you used: clearing your browser data erases it, and it
            does not follow you to a phone.
          </p>
        </section>

        <section>
          <h2 className="text-foreground-strong mb-2 text-lg font-semibold">Affiliate links</h2>
          <p className="text-foreground/80">
            {AFFILIATE_PARTICIPATION} The buy links on{" "}
            <Link href="/library" className="underline underline-offset-2">
              library entries
            </Link>{" "}
            carry a tag that tells Amazon the visit came from here. Amazon sees the visit; we see
            only the totals they report. It costs you nothing extra, and it does not affect what
            those pages say — several of them recommend against buying the book.
          </p>
        </section>

        <section>
          <h2 className="text-foreground-strong mb-2 text-lg font-semibold">
            Getting rid of your data
          </h2>
          <p className="text-foreground/80">
            Unsubscribe from any email to remove the address. Clear your browser data for this site
            to erase the reading record.{" "}
            {CONTACT ? (
              <>
                For anything else, or to ask what is held about you, write to{" "}
                <a href={`mailto:${CONTACT}`} className="underline underline-offset-2">
                  {CONTACT}
                </a>
                .
              </>
            ) : null}
          </p>
        </section>
      </div>
    </main>
  );
}
