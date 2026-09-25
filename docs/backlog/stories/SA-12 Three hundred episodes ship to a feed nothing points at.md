---
key: SA-12
type: story
summary: Three directory-ready podcast feeds carrying 319 episodes are live on the domain, and no page on the site links to Apple, Spotify or any other podcast directory
epic: "[[Search alignment]]"
status: To Do
priority: Medium
labels: [seo, podcast, distribution, discovery]
tasks:
  - "[[SA-12.1 Get the three feeds into the directories, or record why not]]"
---

# SA-12 — Three hundred episodes, no shelf

The site publishes three podcasts and they are real. `/listen/physics-of-connection`
carries 78 episodes, `/listen/improv-lab` 173 and `/listen/deep-cuts` 68 — **319
in total**, each with an MP3 on R2, a duration, a transcript anchor on the guide
or atom it was made from, and `PodcastEpisode` structured data. The three feeds
return 200 and total about 900KB.

The feeds are directory-ready. They declare the iTunes namespace and the
Podcast Index namespace, an `atom:link rel="self"`, and every tag Apple requires
— author, categories, image, explicit, owner, language. Somebody built this
properly.

Nothing points at it. Across all 386 built pages there is not one link to Apple
Podcasts, Spotify, Pocket Casts, Overcast or the Podcast Index. The only such
links anywhere in the build are on `/library/carrane-improv-nerd` and the
library index, and they are about somebody else's podcast. A listener on the
show page can discover the feed only through a `<link rel="alternate">` in the
head; the episode pages do not carry even that.

Podcast discovery happens in directories. A compliant feed on your own domain
is a shelf in a locked room.
