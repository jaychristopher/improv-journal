# Atom SEO Validation — `shaping-shared-reality` batch

**Run date:** 2026-05-14
**Atoms scanned:** 4 (`model-of-their-model`, `belief-as-architecture`, `rigid-core-malleable-edge`, `framing-as-angle-of-approach`)
**Method:** SOP A-02 first run — 20 candidate keywords (4 exact titles + 16 paraphrase candidates), single `keywords-explorer-overview` batch (US)
**API cost:** 636 units

---

## Headline finding

**All 4 editorial atom titles return 0 volume.** Atom titles are confirmed as internal taxonomy, not SEO targets. This isn't a failure — it matches the project's design: atoms are the substrate, bridges are the SEO surface.

**But:** every atom body cites at least one high-volume academic term. The bodies are SEO-rich even though the titles aren't. This surfaces the atoms for term-based searches via body content without forcing the title to compromise.

The highest-leverage finding is **`framing-effect` (3,400 vol, KD 30) as a candidate bridge keyword**, since it's a clean academic anchor for `framing-as-angle-of-approach` content. SOP A-06 work, deferred.

---

## Per-atom decisions

### 1. `model-of-their-model` (insight)

| Candidate | Vol | KD | Parent topic | Notes |
|---|---:|---:|---|---|
| model of their model | 0 | — | — | Editorial title — confirmed internal taxonomy |
| theory of mind | 24,000 | 50 | theory of mind psychology (3,100) | Academic anchor cited in atom body; too high KD + too broad |
| mentalizing | 500 | 12 | mentalization (1,100) | Clinical/psych term — too narrow |
| second order thinking | 700 | 2 | second order thinking | Low KD, close fit — but business-context coded |

**Decision: KEEP title, no alias, no bridge recommendation.**

The atom is squarely about epistemic humility regarding theory of mind. "Theory of mind" is the academic cousin but it's a 24K-vol / KD-50 term dominated by Wikipedia and university psych pages — not winnable without significant authority. "Mentalizing" is too clinical. "Second order thinking" overlaps but means something different in mainstream usage (consequences-of-consequences in decision-making).

Atom stays internal-taxonomy. If a future video targets a "how to understand what someone else is thinking" keyword cluster, this atom becomes a source — but the atom title doesn't move.

### 2. `belief-as-architecture` (law)

| Candidate | Vol | KD | Parent topic | Notes |
|---|---:|---:|---|---|
| belief as architecture | 0 | — | — | Editorial title — confirmed internal taxonomy |
| cognitive dissonance | **213,000** | 58 | what is cognitive dissonance (15K) | Massive — but covers a different mechanism (the *experience*, not the *structural reason*) |
| identity protective cognition | 200 | null | — | **Exact academic match for what atom cites (Kahan)** — tiny volume |
| core beliefs psychology | 40 | 8 | core belief (900) | Low volume, but parent has 900 vol — possible content niche |
| why people defend their beliefs | 0 | — | — | No measurable volume — language people don't search in |

**Decision: KEEP title, no alias. Flag `cognitive dissonance` and `core beliefs` as candidate bridge keywords for downstream SOP A-06.**

The atom cites Kahan's "identity-protective cognition" as its strongest empirical foundation — that's the precise term but only 200 vol. The atom's surrounding context overlaps with "cognitive dissonance" (213K vol — colossal) but the mechanisms differ enough that aliasing would mislead. If a bridge gets written targeting "cognitive dissonance" or "why people don't change their minds," this atom is the primary citation source.

### 3. `rigid-core-malleable-edge` (pattern)

| Candidate | Vol | KD | Parent topic | Notes |
|---|---:|---:|---|---|
| rigid core malleable edge | 0 | — | — | Editorial title — confirmed internal taxonomy |
| overton window | 24,000 | 53 | overton window (23K) | High volume but politics-coded; misrepresents atom's scope |
| core beliefs psychology | 40 | 8 | core belief (900) | Same niche-bridge candidate as #2 |
| core beliefs vs peripheral beliefs | 0 | — | — | Not in Ahrefs DB |
| central peripheral beliefs | 0 | — | — | Not in Ahrefs DB |
| how to change someone's beliefs | 0 | — | — | Zero volume — language not in active search |

**Decision: KEEP title, no alias, no bridge recommendation.**

"Overton window" is the closest high-volume cousin but it's politically coded — a viewer arriving from "Overton window" expects political discourse content, not improv-perspective belief-change mechanics. The atom describes a more general pattern; aliasing would misrepresent both directions.

Notable: "core beliefs vs peripheral beliefs" — a near-perfect semantic match for the pattern — has zero measurable volume. The vocabulary the atom uses is precise but not in popular circulation. The atom remains internal taxonomy.

### 4. `framing-as-angle-of-approach` (principle)

| Candidate | Vol | KD | Parent topic | Notes |
|---|---:|---:|---|---|
| framing as angle of approach | 0 | — | — | Editorial title — confirmed internal taxonomy |
| **framing effect** | **3,400** | **30** | framing effect (3,400) | **Strong match — atom literally cites Tversky-Kahneman 1981 framing study** |
| framing psychology | 3,100 | 43 | framing effect (3,400) | Same parent, higher KD |
| cognitive framing | 60 | 22 | framing effect (3,300) | Low volume |
| how to frame a conversation | 0 | — | — | Zero volume |
| how to reframe an argument | not in DB | — | — | No data |

**Decision: KEEP title (`framing-as-angle-of-approach` carries the project's distinctive frame). RECOMMEND bridge creation at `content/bridges/framing-effect.md` targeting `framing-effect` (3,400 vol, KD 30) with this atom as primary citation source.**

The atom *literally cites* the framing effect study (Tversky & Kahneman 1981) as its foundational empirical hook. A bridge targeting "framing effect" would be on-topic, well-grounded, and at KD 30 with 3,400 volume it's a winnable target — much more reachable than the Carnegie-dominated "influence" cluster (see `docs/concepts/shaping-shared-reality-buildup.md` for that failure).

This is the only one of 4 atoms where the SEO finding suggests downstream production work. Routes to SOP A-06 (bridge creation) when capacity permits.

---

## Cross-atom patterns

1. **Editorial titles → 0 vol, every time.** Atom titles in this project consistently fail SEO discoverability. This is structural: atoms are precision-named for the graph's internal taxonomy, not for search behavior. Treat 0-vol on an atom title as confirmation that the architecture is working, not as a failure mode.
2. **Body citations carry the SEO weight.** Each atom cites academic terms (theory of mind, cognitive dissonance, Overton window, framing effect) that are 3,400-213,000 vol. The atoms surface for these searches via body content even without title alignment. This means the *current* atoms are more SEO-discoverable than their 0-vol titles suggest — the discoverability is just at the term-citation layer, not the title-match layer.
3. **The high-vol academic cousin is usually too broad to alias.** Three of four atoms have a 20K+ vol academic cousin, but in each case the cousin's scope is either broader (theory of mind), differently-mechanism (cognitive dissonance), or context-coded (Overton window = political). Aliasing would mislead the searcher. Only `framing-effect` had clean enough overlap to recommend.
4. **The mid-vol direct-match keywords are mostly bridge candidates, not atom aliases.** `framing-effect` (3,400 vol) and `core-beliefs` (40 vol direct / 900 parent) are bridge-shaped, not atom-shaped. A-02 doesn't create bridges — it flags them for A-06.

## API cost

- 1 call, 12 returned + 8 zero/null = 20 candidates scanned
- 636 units total
- Per-atom average: ~160 units
- Cheaper than the SERP intent failure on "how to influence people" (928 units for one keyword)

## Recommendations summary

| Atom | Title decision | Alias | Bridge candidate (→ A-06) |
|---|---|---|---|
| model-of-their-model | Keep | None | None |
| belief-as-architecture | Keep | None | `cognitive dissonance` (213K vol, KD 58) — high competition; or `core beliefs` (40 vol direct, 900 parent) — niche |
| rigid-core-malleable-edge | Keep | None | None — pattern is broader than any direct-match cousin |
| framing-as-angle-of-approach | Keep | None | **`framing-effect`** (3,400 vol, KD 30) — strongest recommendation |

**Net SEO opportunity from this batch: one bridge candidate** (`framing-effect`). All four atoms confirmed as internal taxonomy. No renames or aliases recommended.
