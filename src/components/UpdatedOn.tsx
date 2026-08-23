/**
 * A visible last-updated date.
 *
 * Every guide already carried `dateModified` in its structured data and showed
 * the reader nothing. That is the wrong way round for these results in
 * particular: the pages this site competes with rank with titles ending "in
 * 2026" and "Best in 2026", because a list of questions is judged largely on
 * whether it is current. A machine-readable date settles nothing for somebody
 * deciding, in about a second, whether to scroll or go back.
 *
 * The date is built from its parts rather than passed through `new Date`.
 * "2026-08-22" parses as UTC midnight, so formatting it in local time renders
 * the 21st for every reader west of Greenwich — a silent off-by-one that would
 * also disagree with the dateModified emitted alongside it.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatUpdated(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  const dayNumber = Number(day);
  if (dayNumber < 1 || dayNumber > 31) return null;
  return `${dayNumber} ${MONTHS[monthIndex]} ${year}`;
}

export function UpdatedOn({ date, className }: { date?: string; className?: string }) {
  if (!date) return null;
  const formatted = formatUpdated(date);
  if (!formatted) return null;

  return (
    <p className={className}>
      Updated <time dateTime={date.slice(0, 10)}>{formatted}</time>
    </p>
  );
}
