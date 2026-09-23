import { getParentPath, loadPaths, loadThreads } from "@/lib/content";
import { definitionFromHtml } from "@/lib/glossary";
import type { Audience } from "@/lib/schema";

/**
 * How the lessons index is grouped.
 *
 * It used to group by tag — four hand-picked tag lists, first match wins.
 * That produced a group "Everything else (1)" holding `traditions-in-tension`,
 * the lesson nine flagship concept pages name as their primary, and filed
 * eight two-group lessons under whichever list was written first, so the
 * teacher's toolkit sat under "Fundamentals" and *The System Underneath* did
 * not sit under "The system". Grouping by path cannot drift that way: the
 * paths already say which lessons they sequence, the atom pages' context line
 * already picks a primary path per lesson, and a lesson on no path is listed
 * as exactly that.
 */
interface LessonEntry {
  id: string;
  title: string;
  url: string;
  lead: string;
  /** Other paths that sequence this lesson, besides the group it sits in. */
  alsoIn: { id: string; title: string; href: string }[];
}

interface LessonGroup {
  id: string;
  label: string;
  /** The path's page, absent for the standalone group. */
  href?: string;
  description: string;
  items: LessonEntry[];
}

export const STANDALONE_GROUP_ID = "standalone";
export const STANDALONE_LABEL = "Standalone";

/**
 * The ladder /paths draws: beginner, then the plateau, then teaching, then
 * the reference shelf, then the performer paths.
 */
const AUDIENCE_ORDER: Audience[] = ["beginner", "intermediate", "teacher", "advanced", "performer"];

const audienceRank = (audience: Audience[] | undefined) => {
  const ranks = (audience ?? []).map((a) => AUDIENCE_ORDER.indexOf(a)).filter((i) => i >= 0);
  return ranks.length ? Math.min(...ranks) : AUDIENCE_ORDER.length;
};

interface LessonsIndex {
  groups: LessonGroup[];
  /** Every lesson, in load order, for the collection markup. */
  entries: LessonEntry[];
  onAPath: number;
  standalone: number;
}

export async function buildLessonsIndex(): Promise<LessonsIndex> {
  const [threads, paths] = await Promise.all([loadThreads(), loadPaths()]);

  const orderedPaths = [...paths].sort(
    (a, b) =>
      audienceRank(a.frontmatter.audience) - audienceRank(b.frontmatter.audience) ||
      a.frontmatter.title.localeCompare(b.frontmatter.title),
  );

  const groups = new Map<string, LessonGroup>(
    orderedPaths.map((p) => [
      p.frontmatter.id,
      {
        id: p.frontmatter.id,
        label: p.frontmatter.title,
        href: `/paths/${p.frontmatter.id}`,
        description: p.frontmatter.description,
        items: [],
      },
    ]),
  );
  const standalone: LessonGroup = {
    id: STANDALONE_GROUP_ID,
    label: STANDALONE_LABEL,
    description:
      "Lessons no path sequences. Each one is read cold, in any order; the idea needed the room and no sequence has claimed it yet.",
    items: [],
  };

  const entries: LessonEntry[] = [];
  for (const thread of threads) {
    const id = thread.frontmatter.id;
    // The same rule the atom pages use for their context line, so the index
    // and the pages agree about which path a lesson belongs to first.
    const primary = await getParentPath(id);
    const containing = orderedPaths.filter((p) => p.frontmatter.threads?.includes(id));
    const entry: LessonEntry = {
      id,
      title: thread.frontmatter.title,
      url: `/threads/${id}`,
      lead: definitionFromHtml(thread.html, 220),
      alsoIn: containing
        .filter((p) => p.frontmatter.id !== primary?.frontmatter.id)
        .map((p) => ({
          id: p.frontmatter.id,
          title: p.frontmatter.title,
          href: `/paths/${p.frontmatter.id}`,
        })),
    };
    entries.push(entry);
    (primary ? groups.get(primary.frontmatter.id)! : standalone).items.push(entry);
  }

  // Within a path, lessons in the order the path sequences them.
  for (const p of orderedPaths) {
    const order = p.frontmatter.threads ?? [];
    groups.get(p.frontmatter.id)!.items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  standalone.items.sort((a, b) => a.title.localeCompare(b.title));

  const onAPath = entries.length - standalone.items.length;
  return {
    // A path every one of whose lessons is claimed first by another path is
    // still named in those lessons' "Also in" lines, so nothing is lost.
    groups: [...groups.values(), standalone].filter((g) => g.items.length > 0),
    entries,
    onAPath,
    standalone: standalone.items.length,
  };
}

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/** "twenty-one", "four", or the digits once the words run out. */
export function countWord(n: number): string {
  if (n < SMALL_NUMBERS.length) return SMALL_NUMBERS[n];
  if (n < 30) return `twenty-${SMALL_NUMBERS[n - 20]}`;
  return String(n);
}

/**
 * The second orienting paragraph, written from the data.
 *
 * It used to read "Most of these stand alone. A few sit inside a learning
 * path" over twenty-five lessons of which twenty-one sat in a path — the
 * inverse of the layer it introduced, and it had said so since the paths
 * absorbed the lessons in April. Generated, it cannot drift again.
 */
export function pathMembershipSentence({ onAPath, standalone }: LessonsIndex): string {
  const total = onAPath + standalone;
  const most = onAPath > standalone ? "Most" : "Some";
  const lead = `${most} of these — ${countWord(onAPath)} of the ${countWord(total)} — sit inside a learning path, which is a sequence built for a particular reader, and they are listed under the path that claims them first.`;
  if (standalone === 0) return lead;
  const tail =
    standalone === 1
      ? "One stands alone: it is here because the idea needed the room."
      : `${countWord(standalone)[0].toUpperCase()}${countWord(standalone).slice(1)} stand alone: they are here because the idea needed the room.`;
  return `${lead} ${tail}`;
}
