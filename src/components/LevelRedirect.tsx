import Link from "next/link";

type Level = "beginner" | "intermediate" | "performer" | "teacher" | "advanced";

interface LevelRedirectProps {
  /** The audience level of the current page's content */
  level: Level;
  /** Where this component appears — adjusts the messaging */
  context: "path" | "bridge";
}

const REDIRECTS: Record<
  Level,
  { up?: { label: string; href: string }; down?: { label: string; href: string } }
> = {
  beginner: {
    up: {
      label: "Already comfortable with improv? Try the Self-Coaching Toolkit",
      href: "/paths/self-coaching-toolkit",
    },
  },
  intermediate: {
    down: {
      label: "New to improv? Start with Foundations",
      href: "/paths/beginner-foundations",
    },
    up: {
      label: "Ready for mastery? Explore performer paths",
      href: "/learn/performer",
    },
  },
  performer: {
    down: {
      label: "Need to solidify the basics? Try the Self-Coaching Toolkit",
      href: "/paths/self-coaching-toolkit",
    },
  },
  teacher: {
    down: {
      label: "Looking to improve your own improv? Start with Foundations",
      href: "/paths/beginner-foundations",
    },
  },
  advanced: {
    down: {
      label: "Looking for practical help? Try the Self-Coaching Toolkit",
      href: "/paths/self-coaching-toolkit",
    },
  },
};

const BRIDGE_REDIRECTS: Record<string, { label: string; href: string }[]> = {
  beginner: [{ label: "Not an improviser? Browse guides by topic", href: "/guides" }],
  intermediate: [{ label: "Not an improviser? Browse guides by topic", href: "/guides" }],
  performer: [{ label: "Not an improviser? Browse guides by topic", href: "/guides" }],
};

export function LevelRedirect({ level, context }: LevelRedirectProps) {
  if (context === "bridge") {
    const hints = BRIDGE_REDIRECTS[level];
    if (!hints || hints.length === 0) return null;
    return (
      <div className="text-foreground/30 mt-4 space-y-1 text-xs">
        {hints.map((hint) => (
          <p key={hint.href}>
            <Link href={hint.href} className="hover:text-foreground/50 underline decoration-dotted">
              {hint.label}
            </Link>
          </p>
        ))}
      </div>
    );
  }

  const redirect = REDIRECTS[level];
  if (!redirect) return null;

  const hints = [redirect.down, redirect.up].filter(Boolean);
  if (hints.length === 0) return null;

  return (
    <div className="text-foreground/30 border-foreground/5 mt-6 space-y-1 border-t pt-4 text-xs">
      {hints.map((hint) => (
        <p key={hint!.href}>
          <Link href={hint!.href} className="hover:text-foreground/50 underline decoration-dotted">
            {hint!.label}
          </Link>
        </p>
      ))}
    </div>
  );
}
