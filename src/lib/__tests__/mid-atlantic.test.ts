import { describe, expect, it } from "vitest";

import { PROMPT_BANK } from "../prompt-bank";

/**
 * The bank reads on both sides of the Atlantic.
 *
 * Three quarters of the volume on the terms the prompt pages target is the
 * United States (CLAUDE.md), and a teacher in Ohio who draws "Two colleagues
 * stuck in a lift" has to translate before the scene can start. On
 * 2026-09-30 the owner had forty-five prompts rewritten for exactly that
 * (commit 744aeda2): a lift became floors, a lorry a long-haul driver, a
 * caravan a rented camper, a fiver the taxi. The rule then lived in a memory
 * note and a scratchpad scan, so the next eighty rows (PG-1) could have
 * brought the words back and nothing would have said so. This does.
 *
 * The list is the words that were rewritten plus the ones the same reading
 * would have flagged in a school room (tuck shop, form tutor, dinner lady).
 * It is deliberately narrow: words both sides use — kettle, ferry, pier,
 * referee, bookshop — are not on it, and the nine rows the scan flagged and
 * the owner kept (the referee, the ferry crossing, the pier, the hospice
 * garden, the bookshop, the kettle that boils, the laundromat at two, the
 * singer who is always flat, the teacher's reference) pass because their
 * words are not island words, not because they are excused. Add a word here
 * when it has been rewritten, not when it merely sounds British.
 */
const ISLAND = [
  "lift",
  "lorry",
  "lorries",
  "fiver",
  "tenner",
  "quid",
  "jumper",
  "caravan",
  "car boot",
  "allotment",
  "pub quiz",
  "launderette",
  "mum",
  "queue",
  "queues",
  "queued",
  "queueing",
  "queuing",
  "headteacher",
  "head teacher",
  "postman",
  "lodger",
  "landlady",
  "towpath",
  "motorway",
  "marquee",
  "removers",
  "new starter",
  "fancy dress",
  "on holiday",
  "chemist",
  "flatmate",
  "flatmates",
  "tenancy",
  "rambler",
  "ramblers",
  "caretaker",
  "garden centre",
  "village hall",
  "tram",
  "boot of the car",
  "petrol",
  "primary school",
  "busker",
  "wet market",
  "lifeboat",
  "tuck shop",
  "form tutor",
  "dinner lady",
  "prefect",
  "year seven",
  "year eight",
  "year nine",
  "bin bag",
  "the bins",
];

const pattern = new RegExp(`\\b(${ISLAND.map((w) => w.replace(/ /g, "\\s+")).join("|")})\\b`, "i");

describe("the bank's wording", () => {
  it("guards the guard: the pattern catches the words that were rewritten", () => {
    // A broken regex would pass an empty list of offenders; these are three of
    // the forty-five texts that were rewritten, quoted as they were.
    for (const text of [
      "Two colleagues stuck in a lift",
      "You still owe me a fiver.",
      "The queue at a passport office",
    ]) {
      expect(pattern.test(text), text).toBe(true);
    }
    expect(PROMPT_BANK.length).toBeGreaterThanOrEqual(560);
  });

  it("uses no word that only one side of the Atlantic would say", () => {
    const offenders = PROMPT_BANK.filter(
      (p) => pattern.test(p.text) || pattern.test(p.coach ?? ""),
    ).map((p) => p.text);
    expect(offenders).toEqual([]);
  });
});
