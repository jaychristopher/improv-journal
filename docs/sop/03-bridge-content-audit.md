# SOP 03 · Bridge Content Audit

## Purpose

Confirm the supporting article (bridge) exists, is well-cited, and is in publishable shape before producing the video. The video drives traffic to the bridge; the bridge can't be a placeholder.

## Inputs

- Bridge slug from SOP 01 (e.g. `how-to-deal-with-rejection`)
- Channel plan reference for the bridge

## Outputs

A bullet block in the buildup doc with:
- Path to bridge file
- Status (`seed` / `draft` / `validated`)
- Title + description (used in description metadata later)
- Cited sources list (used in description metadata later)
- Any gaps that need filling

## Tools

- Read tool to inspect `content/bridges/<slug>.md`
- Glob to confirm presence

## Steps

1. **Confirm file exists** at `content/bridges/<slug>.md`.
2. **If missing:** STOP. Bridge needs to be written first. Bridge work is not a video-pipeline task — it's a separate workflow tracked in `docs/growth-100-steps.md`. Note the gap and either:
   - Write the bridge first (out-of-scope for this SOP)
   - Move to next-priority video that has a bridge
3. **If present:**
   - Read frontmatter — capture `title`, `description`, `target_keywords`, `status`, `entry_atoms`, `entry_path`, citations.
   - Read the body. Note: thesis points, named sources with years, worked examples, anti-pattern beats.
4. **Tabulate the cited sources.** Each citation needs: author(s), book/paper title, year. Re-use this list verbatim in:
   - Script v2 (audio inline citations)
   - Upload description (REFERENCES block)
5. **Identify the 3-5 strongest "anchor insights"** from the bridge that the script will be built on. Each must have a citable source. These are the load-bearing claims of the script.
6. **Bridge status check:**
   - `seed` — too thin, expand before video production
   - `draft` — usable for video, but should be promoted to `validated` after video ships
   - `validated` — ready to ship; bridge URL is upload-ready

## Quality bar

- Bridge exists; status ≥ `draft`
- 3-5 anchor insights identified with named sources
- Citations list compiled (used in 2 downstream SOPs)

## Common pitfalls

- **Skipping the audit and assuming the bridge is fine.** Sometimes the bridge is a one-line stub. The script will then over-reach; viewers click through to find a placeholder.
- **Missing year on citations.** "Keith Johnstone, Impro" is weaker than "Keith Johnstone, Impro (1979)". Years are citation magnetism.
- **Not capturing worked examples.** Bridges often have specific examples (the L2 "I don't hate my job" line, the L23 Zoom-call boss). Reuse these in the script.

## Estimated time

10-15 minutes. Mostly reading + note-taking.

## Lessons from prior production

- L2 bridge had Limb fMRI study cited with year (2008) and journal (PLoS ONE) — script reused this verbatim, became the citation-magnet midpoint.
- L4 bridge has rich material on anterior cingulate cortex and "fall, then figure out" already — when we get to L4 production, the script can lean heavily on this.
- L1 bridge was thinner than its peers; iter 3 had to do extra invention rather than synthesis.
