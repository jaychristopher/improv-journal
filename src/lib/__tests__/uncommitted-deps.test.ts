import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * No committed file may import a module git does not track.
 *
 * novel-insights 346. The working tree is two sites. On 2026-09-22 a walk of
 * `src/` found 447 source files, 204 of them untracked, and 155 import sites
 * in *committed* files reaching 65 untracked modules — `src/components/Prose.tsx`
 * (which committed hub pages import), `src/lib/status-distribution.ts` (which
 * committed routes import), `src/app/about/atom-types.ts`. 5 of the 121
 * committed test files import a module that exists only on this disk.
 *
 * What that means is not "there is uncommitted work" — that is the normal
 * state here, and this test must never punish it. It means the repository's
 * last commit does not describe a state the code can be returned to: a fresh
 * clone, a `git checkout .`, or a Vercel build from `main` produces a tree
 * that does not compile, because the committed half's imports point at files
 * no commit carries. The failure mode is silent until someone clones.
 *
 * So ALLOWANCE below is a dated allowance, not a ceiling anyone should work
 * up to. It records what was true on 2026-09-22 and asserts only that the
 * number does not *grow*. The right way to satisfy it is a commit — every
 * module landed removes its import sites from the count and the allowance
 * drops for free. Lowering the constant after a commit is the intended edit;
 * raising it is not, and if a change genuinely needs to, say why and date it
 * here the way the rest of this suite does.
 *
 * The second case is a reading rather than a law: the untracked modules that
 * no untracked module imports — the leaves a first commit could carry on its
 * own. It prints them and asserts nothing about how many there are, because
 * that number moves with every file written tonight and is useful as a fact,
 * not as a threshold.
 */

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

/** The extensions the bundler and vitest actually load out of `src/`. */
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", ".jsx"];

/**
 * Tried in order against a specifier that carries no extension. `@/lib/hubs`
 * is a file, `@/lib/hubs/index.ts` would also be legal, and `.mjs` is here
 * because the search-index and route-page modules are written as ESM scripts
 * the build and the pages share.
 */
const RESOLUTION_CANDIDATES = [
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".jsx",
  "/index.ts",
  "/index.tsx",
  "/index.mjs",
];

/**
 * Import sites in committed files reaching an untracked module. 155 across 65
 * modules when this was written on 2026-09-22; 0 since 2026-09-23, when the
 * night's work was committed and the debt this guard existed to name went
 * away. Debt, not budget: see the header. A commit shrinks it; nothing else
 * should, and at 0 any new module a committed file imports fails here until
 * it is committed too.
 */
const ALLOWANCE = 0;

/**
 * Guard the guard. A resolver that silently stops resolving, or a walk that
 * returns nothing, would report 0 offenders and pass — which is the exact
 * shape of the bug this file exists to catch. 447 source files and 243
 * committed ones on 2026-09-22; the floors sit well under both so ordinary
 * churn does not trip them.
 */
const MIN_SOURCE_FILES = 300;
const MIN_COMMITTED_FILES = 100;

/** Specifiers in `from "…"`, `import "…"`, `import("…")` and `require("…")`. */
const SPECIFIER = /(?:from\s*|import\s*|require\(\s*|import\(\s*)["']([^"']+)["']/g;

function posix(p: string): string {
  return p.split(path.sep).join("/");
}

function gitAvailable(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/** Paths under `src/`, relative to the repository root, in posix form. */
function walkSource(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(full, out);
    else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      out.push(posix(path.relative(ROOT, full)));
    }
  }
  return out;
}

function trackedSource(): Set<string> {
  const listed = execFileSync("git", ["ls-files", "src"], {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return new Set(listed.split("\n").filter(Boolean));
}

function specifiersOf(file: string): string[] {
  const text = fs.readFileSync(path.join(ROOT, file), "utf-8");
  const found: string[] = [];
  let match: RegExpExecArray | null;
  SPECIFIER.lastIndex = 0;
  while ((match = SPECIFIER.exec(text)) !== null) found.push(match[1]);
  return found;
}

type Resolution =
  | { kind: "external" }
  | { kind: "outside" }
  | { kind: "missing"; target: string }
  | { kind: "file"; target: string };

/**
 * `@/x` is `src/x` (the tsconfig and vitest alias), `./x` and `../x` resolve
 * against the importing file. Node builtins and bare package names are not
 * ours to check, and a path that leaves `src/` — `scripts/`, a stylesheet —
 * is outside what this file measures.
 */
function resolveSpecifier(specifier: string, from: string, onDisk: Set<string>): Resolution {
  let base: string;
  if (specifier.startsWith("@/")) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  } else return { kind: "external" };

  if (!base.startsWith("src/")) return { kind: "outside" };
  if (onDisk.has(base)) return { kind: "file", target: base };
  for (const candidate of RESOLUTION_CANDIDATES) {
    if (onDisk.has(base + candidate)) return { kind: "file", target: base + candidate };
  }
  /** TypeScript lets an ESM specifier say `.js` where the file on disk is `.ts`. */
  const stripped = base.replace(/\.(js|mjs|jsx)$/, "");
  if (stripped !== base) {
    for (const candidate of RESOLUTION_CANDIDATES) {
      if (onDisk.has(stripped + candidate)) return { kind: "file", target: stripped + candidate };
    }
  }
  /** A stylesheet or asset is a legitimate non-module import; only flag code. */
  if (/\.(css|scss|json|svg|png|jpe?g|webp|woff2?)$/.test(base)) return { kind: "outside" };
  return { kind: "missing", target: base };
}

interface Survey {
  sourceFiles: string[];
  committed: string[];
  untracked: string[];
  /** Untracked module → the committed files that import it. */
  needed: Map<string, string[]>;
  importSites: number;
  /** Untracked modules imported by at least one other untracked module. */
  importedByUntracked: Set<string>;
  /** Specifiers naming something under `src/` that no file on disk provides. */
  unresolvable: string[];
}

function survey(): Survey {
  const sourceFiles = walkSource(SRC);
  const onDisk = new Set(sourceFiles);
  const tracked = trackedSource();
  const committed = sourceFiles.filter((f) => tracked.has(f));
  const untracked = sourceFiles.filter((f) => !tracked.has(f));

  const needed = new Map<string, string[]>();
  const importedByUntracked = new Set<string>();
  const unresolvable: string[] = [];
  let importSites = 0;

  for (const file of sourceFiles) {
    const isCommitted = tracked.has(file);
    for (const specifier of specifiersOf(file)) {
      const resolved = resolveSpecifier(specifier, file, onDisk);
      if (resolved.kind === "external" || resolved.kind === "outside") continue;
      if (resolved.kind === "missing") {
        unresolvable.push(`${file} → ${specifier}`);
        continue;
      }
      if (tracked.has(resolved.target)) continue;
      if (isCommitted) {
        importSites += 1;
        const importers = needed.get(resolved.target) ?? [];
        importers.push(file);
        needed.set(resolved.target, importers);
      } else {
        importedByUntracked.add(resolved.target);
      }
    }
  }

  return {
    sourceFiles,
    committed,
    untracked,
    needed,
    importSites,
    importedByUntracked,
    unresolvable,
  };
}

const HAVE_GIT = gitAvailable();

describe("committed files against the untracked tree", () => {
  it.runIf(HAVE_GIT)("resolves specifiers rather than giving up on them", () => {
    const { sourceFiles, committed, unresolvable } = survey();

    /** Vacuity guards: an empty walk or an empty `git ls-files` proves nothing. */
    expect(sourceFiles.length).toBeGreaterThanOrEqual(MIN_SOURCE_FILES);
    expect(committed.length).toBeGreaterThanOrEqual(MIN_COMMITTED_FILES);

    /**
     * Every `@/` or relative specifier naming a path under `src/` must land on
     * a file. One that does not is either a broken import or a resolver that
     * has stopped understanding how this repository spells things — and the
     * second would quietly deflate the count below.
     */
    expect(
      unresolvable,
      `specifiers under src/ that resolve to nothing:\n${unresolvable.join("\n")}`,
    ).toEqual([]);
  });

  it.runIf(HAVE_GIT)("imports nothing git does not track, beyond the dated allowance", () => {
    const { needed, importSites, committed, sourceFiles } = survey();

    expect(sourceFiles.length).toBeGreaterThanOrEqual(MIN_SOURCE_FILES);
    expect(committed.length).toBeGreaterThanOrEqual(MIN_COMMITTED_FILES);

    /** Heaviest first: the module the most committed files cannot do without. */
    const byWeight = [...needed.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );
    const report = byWeight
      .map(([target, importers]) => `  ${target} ← ${importers.length} committed file(s)`)
      .join("\n");

    const committedTests = committed.filter((f) => /\.test\.tsx?$/.test(f));
    const affectedTests = new Set(
      byWeight.flatMap(([, importers]) => importers.filter((f) => /\.test\.tsx?$/.test(f))),
    );

    expect(
      importSites,
      [
        `${importSites} import sites in committed files reach ${needed.size} untracked modules`,
        `(allowance ${ALLOWANCE}, measured 2026-09-22). ${affectedTests.size} of`,
        `${committedTests.length} committed tests are among them.`,
        "",
        "A clone of this repository would not compile without these files:",
        report,
        "",
        "If this grew because new work arrived, that is the point — commit the",
        "modules and lower ALLOWANCE. Do not raise it to make this pass.",
      ].join("\n"),
    ).toBeLessThanOrEqual(ALLOWANCE);
  });

  it.runIf(HAVE_GIT)("reads out the cut points a first commit could carry", () => {
    const { needed, importedByUntracked, sourceFiles } = survey();

    expect(sourceFiles.length).toBeGreaterThanOrEqual(MIN_SOURCE_FILES);

    /**
     * novel-insights 346's third bullet: a leaf is an untracked module that a
     * committed file needs and that no *other* untracked module imports, so it
     * can be committed with its importers and nothing else. 11 of them on
     * 2026-09-22. A reading, not a law — the set changes with every file
     * written, and `console.warn` is the channel eslint's `no-console` leaves
     * open for it.
     */
    const cutPoints = [...needed.keys()].filter((m) => !importedByUntracked.has(m)).sort();
    const SHOWN = 6;
    console.warn(
      [
        `cut points on 2026-09-22: ${cutPoints.length} of ${needed.size} modules are leaves.`,
        ...cutPoints.slice(0, SHOWN).map((m) => `  ${m}`),
        cutPoints.length > SHOWN ? `  … and ${cutPoints.length - SHOWN} more` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    /** Structural, not numeric: a leaf is by construction a module committed code needs. */
    for (const target of cutPoints) expect(needed.has(target)).toBe(true);
  });
});
