import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from "@/lib/seo";

interface CourseJsonLdProps {
  title: string;
  description: string;
  url: string;
  audience?: string;
  duration?: string | null;
  /** Ordered lessons, which become the published syllabus. */
  lessons: { id: string; title: string }[];
  /** What the path says a reader will be able to do afterwards. */
  teaches?: string[];
  prerequisites?: string[];
  lengthInDays?: number;
  cadence?: string;
}

/**
 * Course markup for a learning path.
 *
 * The paths already describe themselves as courses — objectives,
 * prerequisites, an ordered sequence of lessons, a length and a cadence — and
 * almost none of that reached the markup, which carried a name, a description
 * and a lesson count filed under numberOfCredits, a property that means
 * academic credit rather than "how many lessons".
 *
 * Course is one of the few rich result types Google still actively supports,
 * and the properties it reads are exactly the ones the frontmatter already
 * declares.
 */
export function CourseJsonLd({
  title,
  description,
  url,
  audience,
  duration,
  lessons,
  teaches,
  prerequisites,
  lengthInDays,
  cadence,
}: CourseJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${SITE_URL}${url}#course`,
    name: title,
    description,
    url: `${SITE_URL}${url}`,
    provider: { "@type": "Organization", "@id": ORGANIZATION_ID, name: SITE_NAME },
    inLanguage: "en-US",
    isAccessibleForFree: true,
    ...(audience && {
      audience: { "@type": "Audience", audienceType: audience },
      educationalLevel: audience,
    }),
    ...(teaches && teaches.length > 0 && { teaches }),
    ...(prerequisites && prerequisites.length > 0 && { coursePrerequisites: prerequisites }),
    ...(lessons.length > 0 && {
      hasPart: lessons.map((lesson, i) => ({
        "@type": "LearningResource",
        position: i + 1,
        name: lesson.title,
        url: `${SITE_URL}/threads/${lesson.id}`,
      })),
      syllabusSections: lessons.map((lesson, i) => ({
        "@type": "Syllabus",
        position: i + 1,
        name: lesson.title,
        url: `${SITE_URL}/threads/${lesson.id}`,
      })),
    }),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(duration && { courseWorkload: duration }),
      ...(lengthInDays && {
        courseSchedule: {
          "@type": "Schedule",
          repeatCount: lengthInDays,
          ...(cadence === "daily" && { repeatFrequency: "P1D" }),
          ...(cadence === "weekly" && { repeatFrequency: "P1W" }),
        },
      }),
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
