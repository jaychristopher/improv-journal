/**
 * Smoke-test the subscribe endpoint against a running server.
 *
 * node scripts/check-subscribe.mjs <base-url> [email]
 *
 * With no provider configured it expects 503 and an "unconfigured" reason —
 * the deliberate behaviour, because a form that thanks a reader and drops
 * the address is worse than no form. With a provider configured and a real
 * address it expects 202 and a confirmation mail to arrive.
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
for (const [name, body, expected] of cases) {
  const result = await post(body);
  const ok = expected === null ? [202, 503].includes(result.status) : result.status === expected;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${String(result.status).padEnd(4)} ${name}` +
      (result.body?.reason ? `  (${result.body.reason})` : ""),
  );
}

console.log(
  failed === 0
    ? "\nThe endpoint answers correctly. 503 with 'unconfigured' means the keys are not set yet."
    : `\n${failed} case(s) wrong.`,
);
// `exitCode` rather than `process.exit`: exiting while fetch still holds
// a socket trips a libuv assertion on Windows.
process.exitCode = failed === 0 ? 0 : 1;
