# The directory's scheduled runs

The archive is `/improv-near-you` — sixty US cities, each page listing the
improv theatres, schools and recurring shows a person could go to, each
linking out to its own site.

Two jobs keep it true, because the two things that go wrong go wrong at
different speeds (the owner, 2026-10-01):

| Job | When | What it costs |
| --- | --- | --- |
| **The reading** | 1st and 15th, ten cities | a session of web research |
| **The link check** | weekly | one command, no searches |

An improv theatre opens, closes or moves on the order of a year, so reading
ten cities twice a month — every city re-read **quarterly** — is as often as
the research is worth doing. A website, though, goes dark the day the venue
does, and a link that 404s is the worst thing this archive can show somebody
deciding where to turn up. That check is one fetch an entry, so it runs every
week and costs nothing to speak of.

Both run as cloud scheduled Claude sessions with this repository checked out.
There is no API key and no secret: the reading is the session's own web
search, and the script does everything around it.

---

## The reading

Work on `main`, with a clean tree: `git checkout main && git pull --ff-only`

**1. What is due.** The cycle is a cursor in `data/directory/engine-state.json`.

```bash
node scripts/directory-engine.mjs --plan 10 --out /tmp/improv-prompts
```

That prints the ten cities due now — slug, city, state, how many are listed
already — and writes one prompt file a city. Planning moves nothing: the
cursor advances only when a reading is imported, so a run that dies leaves
the same cities due next time.

**2. Read each city.** For each city in the plan, read its prompt file and do
what it says: search the live web for the improv theatres, schools and
recurring shows there, and write the reply as
`/tmp/improv-replies/<slug>.json` in the JSON shape the prompt ends with. The
prompt is the authority on that shape; the fields the import insists on are
`name`, `url`, `kind`, `summary` (20 characters or more) and `score` (0 to
100).

The rules that matter:

- **Never invent an organisation.** Precision over recall. A real theatre
  with a working site beats a name that sounds right.
- **`url` is the organisation's own website.** Never Yelp, Eventbrite,
  Meetup, Facebook, Instagram, Wikipedia or a ticket seller. The import
  rejects those anyway.
- **Re-verify what the archive already holds, first.** The prompt lists it.
  Confirming the known entries is worth more than finding new ones: a
  listing that has quietly closed or moved is the failure a reader feels.
  Report closures in `closed`, with evidence.
- Leave out one-off events, festivals that have passed, and stand-up-only
  clubs.

**Spend the search budget evenly.** A session has a few hundred searches
across everything it does, including any subagents. Ten cities is about
twenty searches each. A run that spends it all on the first three cities
leaves the last seven thin, which is how a good entry gets left out of a
reading. If the budget is running down, stop discovering and spend what is
left confirming what the archive already lists.

A thin reading is not dangerous on its own — an entry missing from one
reading keeps its place and is only dropped after three — but it wastes the
quarter. A city you cannot research at all is a city you skip; do not write a
reply you are not sure of, and do not stop the run over one city.

Opening each site yourself is good when you can. If web fetching is blocked
in the sandbox, say so in your summary and rely on search results: the
import fetches every URL anyway and refuses to list one that does not answer.

**3. Import.**

```bash
node scripts/directory-engine.mjs --seed /tmp/improv-replies
```

Every entry is checked, every website is fetched, the reading is merged with
what the city file holds (an entry unseen three readings running is dropped,
one reported closed goes at once), ranked, and written. The cursor advances
past the last city imported.

**4. Check before committing.**

```bash
npm ci            # the container may have no node_modules
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

---

## The link check

No research, no searches, no judgement — one command:

```bash
git checkout main && git pull --ff-only
node scripts/directory-engine.mjs --check
```

It fetches every listed website across all sixty cities and reports what it
found. Any HTTP answer counts as alive, including a 403 from a site that
refuses robots; only a domain that will not connect three times over counts
as dead. An entry that fails two checks running is marked `unseen`, which
keeps it in the data and takes it off the page; if its site answers again it
comes straight back.

If anything changed, commit `data/directory` and push:

```bash
git add data/directory
git commit -m "Link check: <what changed> (<today>)"
git push origin main
```

Most weeks nothing changes and there is nothing to commit. Say so and stop.

---

## What not to do

- Do not touch `src/`, `content/`, the city list, or the guards. If a guard
  fails, the reading is wrong, not the guard.
- Do not add a city to `data/directory/cities.json` as part of a scheduled
  run. (If one is ever added, `node scripts/build-us-map.mjs` has to run too,
  or the hub's map guard fails.)
- Do not put a score, a rank or any account of the ranking on a page. The
  pages are a listing (the owner, 2026-10-01); the engine ranks, the reader
  is not told about it.
- Do not run `npm run seo:indexnow`. It reaches an external service and is
  only ever run when asked.

## If something is wrong

Leave the archive as it is and say what happened. A missed run costs nothing:
the cursor only moves on a successful import, so the same cities are due next
time.

**If `git push` is refused with a 403**, the Claude GitHub App does not have
access to this repository. That is not something a run can fix — report it
and stop. The owner restores it at
<https://github.com/apps/claude/installations/select_target> or by
reconnecting GitHub in claude.ai settings.

## The other commands

```bash
node scripts/directory-engine.mjs --prompt chicago            # one city's prompt
node scripts/directory-engine.mjs --cities chicago,austin --plan --out <dir>
node scripts/directory-engine.mjs --seed <dir> --no-advance   # a re-read that should not cost the cycle its place
node scripts/directory-engine.mjs --dry --cities chicago      # the fixture through the same merge, no network
```
