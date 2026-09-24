/**
 * Email capture: the provider adapter and the rules around it.
 *
 * The site had no email infrastructure of any kind before 2026-09-24 — no
 * provider, no form element anywhere in src/, no POST route, no database.
 * It does have a promise it cannot keep: journey.ts schedules reviews on a
 * [1, 3, 7, 21] day ladder and LessonCheckpoint renders a button that says
 * "Review tomorrow", while the whole record lives in localStorage, which
 * cannot ping anybody. Email is the only channel that can keep that.
 *
 * Two rules this module exists to enforce.
 *
 * **1. Never accept an address we cannot deliver to.** With no provider
 * configured the endpoint returns 503 and the form says so. The failure mode
 * it is written to prevent is the one that looks like success: a form that
 * thanks the reader and drops the address on the floor. At this traffic
 * every address is worth more than the form.
 *
 * **2. The offer is finite and says so.** `OFFERS` below are buckets, not a
 * newsletter. A newsletter is a recurring publishing obligation, and the
 * operator has about five hours a week against 77 of 78 guides still in
 * draft. Each bucket is a fixed number of emails that stops.
 */

/** Which offer an address is subscribing to. The context decides, not the reader. */
export type OfferId = "tonights-material" | "mondays-meeting" | "review-queue";

export interface Offer {
  id: OfferId;
  /** Where this bucket is offered, in the reader's terms. */
  headline: string;
  /** The exchange: what arrives, and when it stops. */
  promise: string;
  /** The button. A verb and the thing, never "Subscribe". */
  action: string;
  /** How many emails, so the promise can be checked against the sequence. */
  emails: number;
}

/**
 * The three buckets, in build order.
 *
 * They are three because the site serves three jobs and the split is already
 * encoded in the code rather than invented here: material for tonight (the
 * four tools), a group to fix (`SYMPTOMS` in game-picker.ts), and a practice
 * to keep up (`REVIEW_INTERVAL_DAYS` in journey.ts). Two would merge the
 * person collecting questions for a road trip with the person working
 * through stage fright; four and the copy goes generic.
 */
export const OFFERS: Record<OfferId, Offer> = {
  "tonights-material": {
    id: "tonights-material",
    headline: "Something to run tonight",
    // True on every surface it appears on. The first draft said "the prompts
    // you just generated", which is true beside a tool and false in the
    // footer of a page where nothing was generated; a capture that opens
    // with a small lie is not worth the address.
    promise:
      "Six short notes on the prompts, games and questions here — what each kind is training, and how to run it. Six emails, then it stops.",
    action: "Send me the six",
    emails: 6,
  },
  "mondays-meeting": {
    id: "mondays-meeting",
    headline: "Six things that go wrong in a meeting",
    promise:
      "The six failure modes and the five-minute drill that treats each one, with what to watch for. Then one drill a fortnight.",
    action: "Send me the six",
    emails: 6,
  },
  "review-queue": {
    id: "review-queue",
    headline: "We can only remind you in this browser",
    promise:
      "Tomorrow, then in three days, then a week, then three weeks — the ladder this site already uses. One thing each time. Then it stops.",
    action: "Remind me properly",
    emails: 4,
  },
};

/** The footer's generic ask, when no tool has told us anything about the reader. */
export const DEFAULT_OFFER: OfferId = "tonights-material";

/**
 * Whether a provider is configured.
 *
 * Server-side only, and deliberately not `NEXT_PUBLIC_`: an API key in the
 * browser bundle is a key anybody can read. The form asks the endpoint
 * rather than checking this itself.
 *
 * Both must be set. A key with no list id would post nowhere; a list id with
 * no key would 401 on every submission and read to the reader as "that did
 * not go through" rather than as "sign-up is not open".
 */
export function providerConfigured(): boolean {
  return Boolean(process.env.EMAILOCTOPUS_API_KEY && process.env.EMAILOCTOPUS_LIST_ID);
}

/**
 * A deliberately strict, deliberately simple address check.
 *
 * Not a full RFC 5322 parser — those accept things no provider will deliver
 * to, and the provider validates anyway. This is here to reject the obvious
 * before it costs an API call.
 */
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed);
}

export type SubscribeOutcome =
  /** Taken, and the provider is sending its confirmation. */
  | { ok: true; state: "pending" }
  /** Already on the list. Nothing was sent and nothing was changed. */
  | { ok: true; state: "already" }
  | { ok: false; reason: "invalid" | "unconfigured" | "failed" };

/**
 * Hand an address to the provider as a pending, unconfirmed subscriber.
 *
 * Double opt-in is not negotiable: it is what makes a list defensible under
 * GDPR Article 6, and it is the only thing that keeps a typo'd address off
 * the list. The provider sends the confirmation; this never sends mail
 * itself, which is why there is no mail library in the dependency tree.
 */
export async function subscribe(email: string, offer: OfferId): Promise<SubscribeOutcome> {
  if (!looksLikeEmail(email)) return { ok: false, reason: "invalid" };
  if (!providerConfigured()) return { ok: false, reason: "unconfigured" };

  // EmailOctopus API v2. v1.6 is legacy, and it put the key in the request
  // body; v2 is Bearer-authenticated on api.emailoctopus.com.
  const url = `https://api.emailoctopus.com/lists/${process.env.EMAILOCTOPUS_LIST_ID}/contacts`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.EMAILOCTOPUS_API_KEY}`,
      },
      body: JSON.stringify({
        email_address: email.trim().toLowerCase(),
        // The bucket travels as a tag, so one list carries every sequence
        // and each automation is triggered by its own tag rather than by a
        // list per offer.
        tags: [offer],
        // `status` is deliberately absent. A list configured for double
        // opt-in defaults a new contact to pending and sends the
        // confirmation itself, which keeps that policy in the one place it
        // is visible — the list's own settings — rather than in a string
        // here that could be changed without anyone noticing.
      }),
    });
    if (response.ok) return { ok: true, state: "pending" };
    // 409 MEMBER_EXISTS_WITH_EMAIL_ADDRESS: the address is already on the
    // list. From the reader's side that is success — they are subscribed —
    // and the first version of this returned 502, so anybody who submitted
    // twice was told it had failed.
    //
    // Deliberately not a PUT to upsert. `create-or-update` would also
    // resurrect a contact who had unsubscribed, which is the one mistake in
    // this file that could not be undone.
    if (response.status === 409) return { ok: true, state: "already" };
    return { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
