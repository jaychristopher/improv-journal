"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/analytics";

type WhatsNextVariant =
  | { variant: "next-thread"; title: string; href: string }
  | { variant: "path-complete"; nextPathTitle: string; nextPathHref: string }
  | { variant: "next-atom"; title: string; href: string }
  | { variant: "back-to-thread"; threadTitle: string; threadHref: string }
  | { variant: "bridge-funnel"; pathTitle: string; href: string };

export function WhatsNext(props: WhatsNextVariant) {
  let label: string;
  let title: string;
  let href: string;

  switch (props.variant) {
    case "next-thread":
      label = "Next";
      title = props.title;
      href = props.href;
      break;
    case "path-complete":
      label = "Journey complete! Next";
      title = props.nextPathTitle;
      href = props.nextPathHref;
      break;
    case "next-atom":
      label = "Continue reading";
      title = props.title;
      href = props.href;
      break;
    case "back-to-thread":
      label = "Back to";
      title = props.threadTitle;
      href = props.threadHref;
      break;
    case "bridge-funnel":
      label = "Go deeper — start from the beginning";
      title = props.pathTitle;
      href = props.href;
      break;
  }

  return (
    <Link
      href={href}
      onClick={() => {
        if (props.variant === "bridge-funnel") {
          trackEvent("bridge_cta_clicked", {
            bridge: window.location.pathname.replace(/^\//, ""),
            target: title,
          });
        }
      }}
      className="border-foreground/10 bg-surface hover:border-foreground/30 group mt-8 block rounded-lg border p-6 transition-colors"
    >
      <span className="text-foreground/40 text-xs tracking-wider uppercase">{label}</span>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-foreground/30 transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </div>
    </Link>
  );
}
