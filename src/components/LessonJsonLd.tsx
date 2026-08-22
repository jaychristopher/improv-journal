import { authorRef, publisherRef, SITE_URL } from "@/lib/seo";

export interface LessonConcept {
  name: string;
  url: string;
}

/**
 * LearningResource markup for a thread.
 *
 * A thread is a lesson, and each one says so in its frontmatter — a goal, a
 * key takeaway, the mistake people make, how many reps, how long it takes, the
 * concepts it covers, and which course sequences it. All of that was declared
 * and none of it was published: the pages emitted a nine-property Article,
 * indistinguishable from any other page on the site.
 *
 * Typed as both Article and LearningResource so the page keeps its article
 * semantics while also stating what it teaches and where it belongs.
 */
export function LessonJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  teaches,
  minutes,
  difficulty,
  concepts,
  partOfCourses,
}: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  /** What the lesson sets out to convey, from its goal and key takeaway. */
  teaches?: string[];
  minutes?: number;
  difficulty?: string;
  concepts?: LessonConcept[];
  /** Paths that sequence this lesson, referenced by their Course @id. */
  partOfCourses?: string[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": ["Article", "LearningResource"],
    "@id": `${SITE_URL}${url}#lesson`,
    headline: title,
    name: title,
    description,
    url: `${SITE_URL}${url}`,
    learningResourceType: "Lesson",
    inLanguage: "en-US",
    isAccessibleForFree: true,
    author: authorRef(),
    publisher: publisherRef(),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(teaches && teaches.length > 0 && { teaches }),
    ...(minutes && { timeRequired: `PT${minutes}M` }),
    ...(difficulty && { educationalLevel: difficulty }),
    ...(concepts &&
      concepts.length > 0 && {
        about: concepts.map((c) => ({
          "@type": "DefinedTerm",
          name: c.name,
          url: `${SITE_URL}${c.url}`,
        })),
      }),
    ...(partOfCourses &&
      partOfCourses.length > 0 && {
        isPartOf: partOfCourses.map((courseUrl) => ({
          "@type": "Course",
          "@id": `${SITE_URL}${courseUrl}#course`,
          url: `${SITE_URL}${courseUrl}`,
        })),
      }),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
