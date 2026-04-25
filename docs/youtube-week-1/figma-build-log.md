# Figma Build Log — Week 1 Keyframes

**Figma file:** https://www.figma.com/design/7sIjwdCjkyNHH2m7f1DS8a/Video
**Account:** Jay West (jay@cosm.agency, Cosm Agency Pro)
**MCP:** Figma remote MCP at https://mcp.figma.com/mcp (authenticated via /mcp)

## Page structure

| Page name | Page ID | Purpose |
|-----------|---------|---------|
| 📐 Brand System | `0:1` | Color tokens, base 1920×1080 template, swatch reference |
| 🧠 L1 Overthinking | `3:2` | All 10 keyframes for video 1 |
| 🤝 L23 Team Bonding | `3:3` | Empty — to build |
| 🎭 L31 Rules of Improv | `3:4` | Empty — to build |

## Brand variables (collection `Brand`, ID `VariableCollectionId:3:5`)

- `bg/slate-900` — `#0f172a` (gradient top)
- `bg/slate-800` — `#1e293b` (gradient middle)
- `bg/slate-700` — `#334155` (gradient bottom)
- `accent/red` — `#ef4444` (primary accent — danger/emphasis word)
- `accent/orange` — `#f97316` (secondary accent — flow state, glow)
- `fg/white` — `#ffffff`
- `fg/slate-300` — `#cbd5e1` (body text)
- `fg/slate-400` — `#94a3b8` (caption text)
- `fg/slate-500` — `#64748b` (de-emphasized text)
- `ok/green` — `#22c55e` (positive)

## L1 Overthinking — all 10 keyframes built

Layout: 5×2 grid, 1920×1080 each, 200px gap.

| Peak | Node ID | Position | Title |
|------|---------|----------|-------|
| 4 (anchor) | `5:2` | col 1, row 1 | BANDWIDTH PROBLEM diagram |
| 1 | `7:2` | col 2, row 1 | OVERTHINKING title card |
| 2 | `7:7` | col 3, row 1 | The simulation — 3 thought bubbles |
| 3 | `7:30` | col 4, row 1 | SAFE. DEAD. + blurred bubble |
| 5 | `7:43` | col 5, row 1 | INTERNAL COMPUTATION (overload) |
| 6 | (next ID) | col 1, row 2 | FORGET YOURSELF |
| 7 | (next ID) | col 2, row 2 | EXERCISE 1 — MIRRORING |
| 8 | (next ID) | col 3, row 2 | EXERCISE 2 — FIRST LINE DRILL |
| 9 | (next ID) | col 4, row 2 | EXERCISE 3 — LAST WORD RESPONSE |
| 10 | (next ID) | col 5, row 2 | REDIRECT YOUR ATTENTION (closing) |

## Build patterns established

- **Frame creation:** every keyframe is a 1920×1080 frame with the slate gradient background applied via `GRADIENT_LINEAR` fill. Vertical orientation: `gradientTransform: [[0, 1, 0], [-1, 0, 1]]`.
- **Watermark:** every frame has `physicsofconnection.com` at 22pt Inter Semi Bold, slate-400 @ 60% opacity, bottom-right.
- **Stick figures:** built from primitives (ellipse for head, vector lines for body/limbs). Helper takes `(parent, cx, baseY, scale, hex, opacity, mirror)`.
- **Speech bubbles:** rounded rectangle + triangle vector tail. Helper takes `(parent, x, y, w, h, fillHex, strokeHex, tailDir, opacity)`.
- **Arrows:** vector line + triangle head. Curved variant uses `Q` (quadratic bezier) — note SVG `T` reflective curve command is NOT supported by Figma's vectorPaths parser. Use explicit `Q` segments.
- **Text range fills:** `setRangeFills(start, end, [{type, color}])` for two-tone titles like "BANDWIDTH PROBLEM" (white + red).

## Plugin API gotchas hit

1. **`T` SVG command unsupported** in vectorPaths data — must convert to explicit `Q` segments.
2. **`getPluginData` not available** — use `getSharedPluginData(namespace, key)` instead.
3. **Cannot set `figma.currentPage` directly** — must use `await figma.setCurrentPageAsync(page)`.
4. **Inter font style** is `"Semi Bold"` (with space), not `"SemiBold"`.

## Next steps

1. Polish: review each L1 frame at 1:1, fix any minor alignment/spacing.
2. Build L23 keyframes (12 peaks) on the L23 page using the same patterns.
3. Build L31 keyframes (11 peaks) on the L31 page.
4. Once approved, export each frame as PNG (2x for retina) for import into DaVinci Resolve.
5. Tween/animate transitions per `keyframe-strategy.md` Part 3.

## L1 FINAL page (`🌟 L1 FINAL`)

After a 30-frame variant + critique round, the FINAL page contains the production-ready keyframes:

- **Headline font:** Playfair Display Black (committed; serif headlines per the keyframe-strategy spec)
- **Body / utility font:** Inter (Bold, Semi Bold, Regular)
- **Layout:** 5×2 grid in script order (peaks 1-5 row 1, peaks 6-10 row 2)
- **Pattern:** 7 of 10 finals lean Typographic, 2 stay Diagrammatic (Peak 4 anchor + Peak 5 continuation), 1 stays Metaphoric (Peak 3 EKG flat-line)

| Peak | Frame name | Refinement applied |
|------|------------|--------------------|
| 1 | `L1 · 01 · OVERTHINKING` | Serif "Overthinking?" + ghost ? + thin red underline accent |
| 2 | `L1 · 02 · The simulation` | Escalating questions with +0.1s/+0.2s/+0.4s timestamps, serif lead |
| 3 | `L1 · 03 · SAFE. DEAD.` | ECG monitor frame, green active beats → red flat-line, stacked Safe./Dead. in serif |
| 4 ⭐ | `L1 · 04 · BANDWIDTH PROBLEM (anchor)` | Chip with INTEGRATED gauge + italic "vs." between competing arrows |
| 5 | `L1 · 05 · Internal Computation` | "↳ SAME DIAGRAM. ONE BEAT LATER." continuity tag, red border, overloaded gauge |
| 6 | `L1 · 06 · Forget Yourself` | Keith Johnstone pull quote, italic open/close quotes, "not to try" highlighted red |
| 7 | `L1 · 07 · Mirroring` | Spec card: serif title + 2×2 fields (TIME/FORMAT/TARGETS/OUTPUT) + 4 numbered steps |
| 8 | `L1 · 08 · First Line Drill` | 1ST winner in serif + orange chip; 2ND/3RD greyed with strikethroughs |
| 9 | `L1 · 09 · Last Word Response` | Rule banner + THEM/YOU dialogue boxes with last-word/first-word red highlighting |
| 10 | `L1 · 10 · REDIRECT` | "Redirect." serif headline + URL bar + Bridge/Tool/Subscribe chip row |

**Cross-cutting refinements applied:**
- Variant tags (A/B/C corner badges) removed — they were scaffolding
- Stick figures retired in favor of typographic and diagrammatic compositions
- Watermark + safe-area discipline consistent across all 10
- Per-peak script-position badge added (`01 · the hook`, `02 · 0.4 sec inside the brain`, etc.) for editor reference
- Italic Playfair used for kicker captions (e.g., "you cannot mirror someone while thinking about your email")

## Reusable assets identified for cross-video reuse

- **CPU/chip diagram** (L1 Peak 4, 5) — reusable in any "bandwidth/cognitive load" video
- **Stick figure pair** (L1 Peak 6, 7, 9) — reusable in all P3 (Team Dynamics) videos
- **Speech bubble template** — universal
- **Exercise card layout** (L1 Peak 7, 8, 9) — reusable for L23 exercise cards
- **End-card with 3 boxes** (L1 Peak 10) — closing template for all videos
