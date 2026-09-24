import { NextResponse } from "next/server";

import { type OfferId, OFFERS, subscribe } from "@/lib/subscribe";

/**
 * The site's first POST endpoint.
 *
 * Every other route handler here is `force-static` by choice — the feeds and
 * the graph are build-time artefacts. This one is not: it takes a body. The
 * app was never a static export (there is no `output: "export"` in
 * next.config.ts, and the redirects() function would be incompatible with
 * one), so a dynamic handler is simply available.
 *
 * It answers 503 when no provider is configured, rather than 200. A capture
 * form that thanks the reader and drops the address is worse than no form,
 * and at 31 organic clicks a quarter every address matters more than the
 * appearance of working.
 */
export const dynamic = "force-dynamic";

/** A cap, so the endpoint cannot be used to spray a provider's API. */
const MAX_BODY_BYTES = 1_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  let body: { email?: unknown; offer?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const offer = typeof body.offer === "string" ? body.offer : "";
  if (!(offer in OFFERS)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await subscribe(email, offer as OfferId);
  // 202 for a new contact the provider is confirming; 200 for one already
  // on the list, where nothing was created and nothing was sent.
  if (result.ok) {
    return NextResponse.json(result, { status: result.state === "pending" ? 202 : 200 });
  }

  const status = result.reason === "invalid" ? 400 : result.reason === "unconfigured" ? 503 : 502;
  return NextResponse.json(result, { status });
}
