---
key: SA-1
type: story
summary: Readers search in words the corpus does not put where search can see them
epic: "[[Search alignment]]"
status: Done
priority: High
labels: [seo, metadata, aliases]
tasks:
  - "[[SA-1.1 Say the reader's words in the snippet, not only in the body]]"
  - "[[SA-1.2 Decide whether the thread layer competes for search at all]]"
  - "[[SA-1.3 The atom layer receives one anchor string and nothing measures it]]"
---

# SA-1 — One vocabulary, several dialects

Each idea on this site has one name, chosen deliberately and used consistently —
that consistency is what makes the graph work. Readers arriving from search do
not share it. They come with the phrasing of whichever book, class or article
they met the idea in.

Where the body already carries both dialects and only the metadata carries one,
the page ranks and is not clicked. That is the cheapest traffic on the site to
win, because the ranking is already paid for.

The line this story does not cross: the fix is to say what the page already
means in the words a reader used, never to add a meaning the page does not
have. An alias that is not in the body is a lie the alias guard already catches.

A second shape of the same fault turned up on 2026-09-25 and is tracked as
SA-1.2. The thread and path layers — 36 pages, ~2,300 rendered words each,
around a thousand inbound internal links — carry titles that lead with an image
rather than a term, and have never been surfaced once. There the question comes
before the fix: a layer can legitimately choose not to compete, and saying so is
a better outcome than retitling 25 lessons toward terms the site has not checked
for demand or collision.

A third shape, found 2026-09-25 and tracked as SA-1.3, is the sharpest evidence
the story has. Anchor text is the site's own statement of what a page is about,
and 212 atom pages take a median 0.938 of their inbound anchors as one string —
where the promoted guides were deliberately rebuilt down from 0.961 to 0.450.
The internal link graph asserts exactly one name per concept, so that is the
only name the site has any signal for. The mechanism to vary it already exists
and reaches 16% of the layer.
