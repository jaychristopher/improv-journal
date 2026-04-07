import Link from "next/link";

const NAV_ITEMS = [
  { href: "/system", label: "System" },
  { href: "/practice", label: "Practice" },
  { href: "/paths", label: "Paths" },
  { href: "/traditions", label: "Traditions" },
  { href: "/listen", label: "Listen" },
  { href: "/library", label: "Library" },
];

export function Nav() {
  return (
    <nav className="border-b border-foreground/10 px-6 py-3">
      <div className="max-w-3xl mx-auto flex items-center gap-6">
        <Link
          href="/"
          className="font-semibold text-sm tracking-tight"
        >
          Improv Journal
        </Link>
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
