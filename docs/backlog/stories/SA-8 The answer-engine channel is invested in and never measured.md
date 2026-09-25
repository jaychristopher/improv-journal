---
key: SA-8
type: story
summary: 88KB of llms.txt ships on every deploy and six answer and live-fetch agents are deliberately allowed, but nothing in the repo or the Ahrefs account can say whether the site has ever been cited
epic: "[[Search alignment]]"
status: To Do
priority: Medium
labels: [seo, ai-search, llms-txt, measurement]
tasks:
  - "[[SA-8.1 Make the answer-engine channel readable]]"
---

# SA-8 — Invested in, never measured

The site has a deliberate and well-argued position on AI crawlers. `robots.ts`
declares nothing about them on purpose, because the policy lives at the edge as
a Content-Signal of `search=yes, ai-train=no, use=reference`, and stating it in
one place beats stating it in two that can disagree. `prebuild` regenerates
`llms.txt` on every deploy — 88,302 bytes of it — because, in the file's own
words, "no training, real-time citation fine … is why llms.txt is still worth
publishing."

Production agrees with the intent. Of eleven agents checked, only ClaudeBot and
GPTBot are refused, and both are training crawlers. OAI-SearchBot,
PerplexityBot, Google-Extended, ChatGPT-User, Claude-User and Perplexity-User
all receive 200 on both `/` and `/llms.txt`.

So the channel is open, the asset is built, and the cost is paid on every
deploy. What does not exist anywhere — not in the repo, not in the audit, not in
the Ahrefs account — is a single number saying whether any of it has ever been
read or cited. Every other channel on this site is measured to two decimal
places. This one is not measured at all.
