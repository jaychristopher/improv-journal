import { SITE_NAME, SITE_URL } from "@/lib/seo";

interface CourseJsonLdProps {
  title: string;
  description: string;
  url: string;
  audience?: string;
  duration?: string | null;
  threadCount: number;
}

export function CourseJsonLd({
  title,
  description,
  url,
  audience,
  duration,
  threadCount,
}: CourseJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: title,
    description,
    url: `${SITE_URL}${url}`,
    provider: { "@type": "Organization", name: SITE_NAME },
    ...(audience && { audience: { "@type": "Audience", audienceType: audience } }),
    numberOfCredits: threadCount,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(duration && { courseWorkload: duration }),
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
