---
key: PF-1.1
type: task
summary: Give each show a stable podcast:guid
parent: "[[PF-1 Feed completeness]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: High
sequence: 1
executable: agent
estimate: 45m
labels: [podcast, feed, podcasting20]
blocked_by: []
blocks:
  - "[[PF-1.3 Validate all three feeds]]"
files:
  - src/app/listen/[show]/feed.xml/route.ts
---

# PF-1.1 — Add podcast:guid

`podcast:guid` is the Podcasting 2.0 identifier that lets a directory recognise a
show as the same show after its feed URL changes. Podcast Index keys on it. All
three feeds are missing it.

It is not a random UUID. The spec requires **UUIDv5 over the feed URL with the
protocol and any trailing slash stripped**, using the namespace
`ead4c236-bf58-58c6-a2c6-a6b28d128cb6`. Generating it correctly matters —
a made-up UUID is worse than none, because it is stable and wrong.

## Run

Compute the three GUIDs first and keep them; they must never change again.

```bash
node -e '
const c = require("crypto");
const NS = "ead4c236-bf58-58c6-a2c6-a6b28d128cb6";
const uuid5 = (name) => {
  const nsBytes = Buffer.from(NS.replace(/-/g, ""), "hex");
  const h = c.createHash("sha1").update(Buffer.concat([nsBytes, Buffer.from(name)])).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const s = h.subarray(0, 16).toString("hex");
  return [s.slice(0,8), s.slice(8,12), s.slice(12,16), s.slice(16,20), s.slice(20,32)].join("-");
};
for (const s of ["physics-of-connection", "improv-lab", "deep-cuts"])
  console.log(s, uuid5("www.physicsofconnection.com/listen/" + s + "/feed.xml"));
'
```

Then in `src/app/listen/[show]/feed.xml/route.ts`:

1. Add the namespace to the opening `<rss>` element, alongside the existing
   `xmlns:itunes` and `xmlns:content`:
   `xmlns:podcast="https://podcastindex.org/namespace/1.0"`
2. Add a `SHOW_GUIDS: Record<string, string>` constant holding the three values,
   with a comment saying they are derived and must never be regenerated.
3. Emit `<podcast:guid>{SHOW_GUIDS[showSlug]}</podcast:guid>` in the channel,
   near `<itunes:owner>`.

## Verify

```bash
npm run build
node -e '
const fs = require("fs");
for (const s of ["physics-of-connection", "improv-lab", "deep-cuts"]) {
  const x = fs.readFileSync(".next/server/app/listen/" + s + "/feed.xml.body", "utf8");
  const m = /<podcast:guid>([^<]+)<\/podcast:guid>/.exec(x);
  console.log(s, m ? m[1] : "MISSING", /xmlns:podcast=/.test(x) ? "ns-ok" : "NS MISSING");
}'
```

All three print a UUID and `ns-ok`.

## Acceptance criteria

- Each feed has exactly one `podcast:guid`
- The `podcast` namespace is declared on `<rss>`
- The values match the UUIDv5 computation above, and a comment in the source says so

## Outcome

_Not started._
