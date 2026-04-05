import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string; // last crumb has no href (current page)
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="text-xs text-foreground/40 mb-8 flex flex-wrap items-center gap-1">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-foreground/60">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground/60">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
