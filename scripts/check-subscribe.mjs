/**
 * Smoke-test the subscribe endpoint against a running server.
 *
 * node scripts/check-subscribe.mjs <base-url> [email]
 *
 * With no provider configured it expects 503 and an "unconfigured" reason —
 * the deliberate behaviour, because a form that thanks a reader and drops
 * the address is worse than no form. With a provider configured it expects
 * 202 for a new address, or 200 for one already on the list.
 */
const [base = "http://localhost:3000", email] = process.argv.slice(2);

async function post(body) {
  const response = await fetch(new URL("/api/subscribe", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

const cases = [
  ["a malformed address", { email: "nope", offer: "tonights-material" }, 400],
  ["an unknown offer", { email: "a@b.co", offer: "not-a-bucket" }, 400],
  [
    "a well-formed address",
    { email: email ?? "someone@example.com", offer: "tonights-material" },
    null,
  ],
];

let failed = 0;
let live = null;
let liveState = null;
for (const [name, body, expected] of cases) {
  const result = await post(body);
  const ok =
    expected === null ? [200, 202, 503].includes(result.status) : result.status === expected;
  if (expected === null) {
    live = result.status;
    liveState = result.body?.state ?? null;
  }
  if (!ok) failed += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${String(result.status).padEnd(4)} ${name}` +
      (result.body?.reason ? `  (${result.body.reason})` : ""),
  );
}

// Report what actually happened. The first version of this printed the 503
// advice even on a 202 — a summary that reads as a pass while telling you
// the wrong thing to do next.
console.log("");
if (failed > 0) {
  console.log(`${failed} case(s) wrong.`);
} else if (live === 503) {
  console.log("Correct, and inert: the function cannot see EMAILOCTOPUS_API_KEY");
  console.log("and EMAILOCTOPUS_LIST_ID. On Vercel those apply only to deployments");
  console.log("built after they are set, so redeploy.");
} else if (live === 200) {
  console.log("Already on the list (200). Nothing was created and nothing was sent.");
} else if (liveState === "subscribed") {
  console.log("MISCONFIGURED. The contact was created, but EmailOctopus subscribed");
  console.log("it outright rather than marking it pending — so no confirmation was");
  console.log("sent, and none is coming. Turn on double opt-in in the list settings.");
  console.log("Existing contacts keep the status they were created with, so delete");
  console.log("this one and run again to test the confirmation properly.");
} else {
  console.log("Accepted (202). EmailOctopus took the contact — which alone does");
  console.log("not prove the rest. In the dashboard, check that:");
  console.log("  1. the contact is PENDING, not subscribed  (double opt-in is on)");
  console.log("  2. a confirmation email arrived");
  console.log("  3. it carries the offer's tag, or no automation will ever fire");
}

// `exitCode` rather than `process.exit`: exiting while fetch still holds
// a socket trips a libuv assertion on Windows.
process.exitCode = failed === 0 ? 0 : 1;
