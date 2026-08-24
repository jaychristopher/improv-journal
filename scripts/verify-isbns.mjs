#!/usr/bin/env node
/**
 * Check every reference ISBN against Open Library.
 *
 * cited-works already asserts that a reference's ISBN matches the ISBN in its
 * Amazon link. That is a consistency check, and consistency is exactly what
 * this class of error survives: ref-madson-improv-wisdom carried 0307341550 in
 * both places for months. The check digit was valid, the two fields agreed,
 * and the number belongs to Gillian Flynn's Sharp Objects — so the Book JSON-LD
 * identified the wrong work and the Amazon link sent readers to a thriller.
 *
 * Nothing internal can catch that. It needs an outside source, which means a
 * network call, which is why this is a script you run rather than a test that
 * runs itself. Run it after adding a reference, or when the library is touched.
 *
 *   node scripts/verify-isbns.mjs
 *
 * Exits non-zero if any ISBN resolves to a different book, or to nothing.
 */
import fs from "node:fs";
import path from "node:path";

const REF_DIR = path.join(process.cwd(), "content", "atoms");
const API = "https://openlibrary.org/api/books";

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function references() {
  return fs
    .readdirSync(REF_DIR)
    .filter((f) => f.startsWith("ref-") && f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(REF_DIR, f), "utf-8");
      const front = raw.split("\n---\n")[0];
      const isbn = /^\s+isbn:\s*"?([0-9Xx-]+)"?\s*$/m.exec(front)?.[1];
      const name = /^\s+name:\s*"(.*?)"\s*$/m.exec(front)?.[1] ?? "";
      return isbn ? { slug: f.slice(0, -3), isbn, name } : null;
    })
    .filter(Boolean);
}

const refs = references();
let bad = 0;

for (const ref of refs) {
  const url = `${API}?bibkeys=ISBN:${ref.isbn}&format=json&jscmd=data`;
  let record;
  try {
    const res = await fetch(url);
    record = (await res.json())[`ISBN:${ref.isbn}`];
  } catch (err) {
    console.log(`  ?  ${ref.slug}: lookup failed (${err.message})`);
    continue; // a network problem is not a data problem
  }

  if (!record) {
    console.log(`  !! ${ref.slug}: ${ref.isbn} is not in Open Library`);
    bad += 1;
    continue;
  }

  const theirs = `${record.title ?? ""} ${record.subtitle ?? ""}`.trim();
  const a = norm(ref.name);
  const b = norm(theirs);
  // Editions disagree about subtitles, so match on the leading run of either.
  if (a.slice(0, 18) && (b.includes(a.slice(0, 18)) || a.includes(b.slice(0, 18)))) continue;

  const authors = (record.authors ?? []).map((x) => x.name).join(", ");
  console.log(`  !! ${ref.slug}: ${ref.isbn}`);
  console.log(`       ours: ${ref.name}`);
  console.log(`       is:   ${theirs} — ${authors}`);
  bad += 1;
}

console.log(`\n  ${refs.length} ISBNs checked, ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);
