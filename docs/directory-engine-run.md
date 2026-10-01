# The directory's daily read

This is what the scheduled run does. It is written for a Claude session with
this repository checked out and nothing else: there is no API key, no service
account and no secret. The reading is the session's own web search, and the
script does everything around it.

The archive is `/improv-near-you` — sixty US cities, each page listing the
improv theatres, schools and recurring shows a person could go to, each
linking out to its own site. Ten cities a day re-reads all sixty in about a
week.

## The run

Work on `main`, with a clean tree.

```bash
git checkout main && git pull --ff-only
```

**1. What is due.** The cycle is a cursor in `data/directory/engine-state.json`.

```bash
node scripts/directory-engine.mjs --plan 10 --out /tmp/improv-prompts
```

That prints the ten cities due now — slug, city, state, how many are listed
already — and writes one prompt file a city. Planning moves nothing: the
cursor advances only when a reading is imported, so a run that dies leaves
the same cities due tomorrow.

**2. Read each city.** For each city in the plan, read its prompt file and do
what it says: search the live web for the improv theatres, schools and
recurring shows there, open the sites you are going to list, and write the
reply as `/tmp/improv-replies/<slug>.json` in the JSON shape the prompt ends
with. The prompt is the authority on that shape; the fields the import
insists on are `name`, `url`, `kind`, `summary` (20 characters or more) and
`score` (0 to 100).

The rules that matter, all of them in the prompt too:

- **Never invent an organisation.** Precision over recall. A real theatre
  with a working site beats a name that sounds right.
- **`url` is the organisation's own website.** Never Yelp, Eventbrite,
  Meetup, Facebook, Instagram, Wikipedia or a ticket seller. The import
  rejects those anyway.
- **Re-verify what the archive already holds.** The prompt lists it. Say
  which have closed, with evidence, in `closed`.
- Leave out one-off events, festivals that have passed, and stand-up-only
  clubs.

A city you cannot research is a city you skip. Do not write a reply you are
not sure of, and do not stop the run over one city.

**3. Import.**

```bash
node scripts/directory-engine.mjs --seed /tmp/improv-replies
```

Every entry is checked, every website is fetched, the reading is merged with
what the city file holds (an entry unseen three runs running is dropped, one
reported closed goes at once), ranked, and written. The cursor advances past
the last city imported.

**4. Check before committing.**

```bash
npx vitest run directory
```

That is the data guard: the shape of every city file, the titles and
descriptions, the thin-city rule. If it fails, fix the replies or drop the
city that broke it and import again. Do not commit a failing archive, and do
not change the guard to make it pass.

**5. Commit and push.** Only `data/directory`.

```bash
git add data/directory
git commit -m "Directory: <the cities you read> (<today>)"
git push origin main
```

A push to `main` deploys (Vercel), so the pages are live within a few
minutes. If nothing changed, commit nothing and say so.

## What not to do

- Do not touch `src/`, `content/`, the city list, or the guards. If a guard
  fails, the reading is wrong, not the guard.
- Do not add a city to `data/directory/cities.json` as part of a daily run.
- Do not put a score, a rank or any account of the ranking on a page. The
  pages are a listing (the owner, 2026-10-01); the engine ranks, the reader
  is not told about it.
- Do not run `npm run seo:indexnow`. It reaches an external service and is
  only ever run when asked.

## If something is wrong

Leave the archive as it is and say what happened. A day missed costs nothing
— the same cities are due tomorrow, because the cursor only moves on a
successful import.

## The other commands

```bash
node scripts/directory-engine.mjs --prompt chicago        # one city's prompt
node scripts/directory-engine.mjs --cities chicago,austin --plan --out <dir>
node scripts/directory-engine.mjs --seed <dir> --no-advance  # a re-read that should not cost the cycle its place
node scripts/directory-engine.mjs --dry --cities chicago  # the fixture through the same merge, no network
```
