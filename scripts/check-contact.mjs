/**
 * Ask EmailOctopus what actually happened to a contact.
 *
 * node scripts/check-contact.mjs <email>
 *
 * Needs EMAILOCTOPUS_API_KEY and EMAILOCTOPUS_LIST_ID in the environment.
 * Put them in .env.local, which is gitignored, and run:
 *
 *   node --env-file=.env.local scripts/check-contact.mjs you@example.com
 *
 * The two things worth knowing after a signup, neither of which a 202 from
 * our own endpoint can tell you:
 *
 *   status PENDING     the list has double opt-in on and a confirmation was
 *                      sent — so if no mail arrived, look at spam, or at
 *                      whether the EmailOctopus account is cleared to send
 *   status SUBSCRIBED  double opt-in is OFF. No confirmation was ever sent,
 *                      and nothing was going to arrive
 *   tags               the automation trigger. An untagged contact is one no
 *                      sequence will ever pick up
 */
import { createHash } from "node:crypto";

const email = process.argv[2];
const key = process.env.EMAILOCTOPUS_API_KEY;
const list = process.env.EMAILOCTOPUS_LIST_ID;

if (!email || !key || !list) {
  console.log("usage: node --env-file=.env.local scripts/check-contact.mjs <email>");
  console.log("needs EMAILOCTOPUS_API_KEY and EMAILOCTOPUS_LIST_ID in the environment");
  process.exitCode = 1;
} else {
  // The API identifies a contact by its id or by an MD5 of the lowercased
  // address. The hash is the one we can compute without having stored
  // anything, which is the point — the site keeps no record of who signed up.
  const id = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  const url = `https://api.emailoctopus.com/lists/${list}/contacts/${id}`;

  const response = await fetch(url, { headers: { authorization: `Bearer ${key}` } });
  const body = await response.json().catch(() => null);

  if (response.status === 404) {
    console.log(`Not on the list. EmailOctopus has no contact for ${email}.`);
  } else if (!response.ok) {
    console.log(`HTTP ${response.status}`);
    console.log(JSON.stringify(body, null, 2));
  } else {
    const status = body?.status ?? body?.data?.status ?? "(no status field)";
    const tags = body?.tags ?? body?.data?.tags ?? [];
    console.log(`email   ${body?.email_address ?? body?.data?.email_address ?? email}`);
    console.log(`status  ${status}`);
    console.log(`tags    ${Array.isArray(tags) && tags.length ? tags.join(", ") : "(none)"}`);
    console.log("");
    if (String(status).toUpperCase() === "SUBSCRIBED") {
      console.log("Double opt-in is OFF for this list: the contact was subscribed");
      console.log("directly and no confirmation email was ever sent. Turn it on in");
      console.log("the list settings — the code relies on that setting rather than");
      console.log("sending a status of its own.");
    } else if (String(status).toUpperCase() === "PENDING") {
      console.log("Double opt-in is on and a confirmation was sent. If it has not");
      console.log("arrived, check spam, and check whether the EmailOctopus account");
      console.log("is cleared to send — a new account often is not.");
    }
    if (!Array.isArray(tags) || tags.length === 0) {
      console.log("");
      console.log("No tags. The tag is the automation trigger, so a contact without");
      console.log("one will never enter a sequence.");
    }
  }
}
