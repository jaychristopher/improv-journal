/**
 * Shared page inventory for the diagram tooling.
 *
 * Both diagram-coverage.mjs and diagram-priority.mjs need the same three
 * things — every page, how many diagrams it carries, and which pages were
 * declined on purpose — so they are derived once here rather than twice.
 */

import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const APP_DIR = path.join(process.cwd(), "src", "app");
const PROGRAM_DOC = path.join(process.cwd(), "docs", "image-program.md");

export function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

const toPosix = (file) => path.relative(process.cwd(), file).split(path.sep).join("/");

/** Markdown diagram references plus <Diagram> elements on JSX routes. */
export function countDiagrams(body) {
  const markdown = body.match(/!\[[^\]]*\]\(\/images\/[^)\s]+\.svg\)/g) ?? [];
  const jsx = body.match(/<Diagram\b/g) ?? [];
  return markdown.length + jsx.length;
}

/** `- \`group/slug\` — reason` lines under the doc's Declined heading. */
export function readDeclines() {
  if (!fs.existsSync(PROGRAM_DOC)) return new Map();
  const after = fs.readFileSync(PROGRAM_DOC, "utf8").split(/^#+ .*[Dd]eclined.*$/m)[1];
  if (!after) return new Map();
  const end = after.search(/^#+ /m);
  const section = end === -1 ? after : after.slice(0, end);
  return new Map(
    [...section.matchAll(/^[-*] `([^`]+)`\s*[—-]\s*(.+)$/gm)].map(([, key, why]) => [key, why.trim()]),
  );
}

export function readPages() {
  return [
    ...walk(CONTENT_DIR, ".md"),
    ...walk(APP_DIR, ".tsx").filter((file) => path.basename(file) === "page.tsx"),
  ].map((file) => {
    const rel = toPosix(file);
    const isContent = rel.startsWith("content/");
    const key = isContent
      ? rel.slice("content/".length).replace(/\.md$/, "")
      : rel.replace(/^src\/app\//, "/").replace(/\/?page\.tsx$/, "") || "/";
    return {
      file: rel,
      key,
      group: isContent ? rel.split("/")[1] : "route",
      slug: key.split("/").pop(),
      diagrams: countDiagrams(fs.readFileSync(file, "utf8")),
    };
  });
}
