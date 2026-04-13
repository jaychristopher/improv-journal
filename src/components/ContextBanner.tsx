import Link from "next/link";

interface ContextBannerProps {
  threadTitle: string;
  threadHref: string;
  pathTitle: string;
  pathHref: string;
  alsoIn?: { title: string; href: string }[];
}

export function ContextBanner({
  threadTitle,
  threadHref,
  pathTitle,
  pathHref,
  alsoIn,
}: ContextBannerProps) {
  return (
    <div className="text-foreground/40 mb-4 text-xs">
      <span>Part of </span>
      <Link href={threadHref} className="text-foreground/60 hover:underline">
        {threadTitle}
      </Link>
      <span> in </span>
      <Link href={pathHref} className="text-foreground/60 hover:underline">
        {pathTitle}
      </Link>
      {alsoIn && alsoIn.length > 0 && (
        <span className="text-foreground/30">
          {" "}
          · Also in:{" "}
          {alsoIn.map((p, i) => (
            <span key={p.href}>
              {i > 0 && ", "}
              <Link href={p.href} className="hover:underline">
                {p.title}
              </Link>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
