---
key: PF-1.3
type: task
summary: Run all three feeds through a podcast validator and fix what it finds
parent: "[[PF-1 Feed completeness]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: High
sequence: 3
executable: mixed
estimate: 30m
labels: [podcast, feed, qa]
blocked_by:
  - "[[PF-1.1 Add podcast-guid to all three feeds]]"
  - "[[PF-1.2 Add a copyright line to each channel]]"
blocks:
  - "[[PF-2.1 Submit to Apple Podcasts]]"
files: []
---

# PF-1.3 — Validate the feeds

Do this **after** PF-1.1 and PF-1.2 are deployed, and **before** submitting
anything. A rejected submission is slower to fix than a validation error.

## Run — agent half

Structural checks that need no browser:

```bash
B=https://www.physicsofconnection.com
for s in physics-of-connection improv-lab deep-cuts; do
  echo "== $s"
  curl -sS --max-time 30 "$B/listen/$s/feed.xml" -o /tmp/$s.xml
  for t in "itunes:owner" "itunes:email" "podcast:guid" "copyright" "itunes:category"            "itunes:explicit" "itunes:image" "itunes:type" "enclosure" "guid" "pubDate"; do
    printf "  %-18s %s
" "$t" "$(grep -c "<$t" /tmp/$s.xml)"
  done
  python -c "import xml.dom.minidom,sys; xml.dom.minidom.parse('/tmp/$s.xml'); print('  xml: well-formed')"
done
```

Every element count is at least 1, and each file parses.

## Run — human half

Paste each feed URL into **https://podba.se/validate/** or
**https://www.castfeedvalidator.com/**. These check things a grep cannot: enclosure
reachability, artwork dimensions and colour space, category validity against
Apple's list.

## Verify

No errors reported by the external validator. Warnings are acceptable if
recorded in `Outcome` with a reason.

## Acceptance criteria

- All three feeds parse as well-formed XML
- All three pass an external validator with no errors
- Any accepted warning is written down here

## Outcome

_Not started._
