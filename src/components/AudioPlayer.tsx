"use client";

import { type ReactNode, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

/**
 * `children` sits inside the card under the controls. The pages passed the
 * reading's transcript fold here until 2026-09-21, which put a thousand
 * words of two-host conversation before the article on every page (tracker
 * entry 260); the fold now renders below the prose as `<Transcript>`, and
 * `transcriptHref` is the anchor that takes a listener down to it.
 */
export function AudioPlayer({
  src,
  transcriptHref,
  children,
}: {
  src: string;
  /** Anchor of the page's transcript section, when it has one. */
  transcriptHref?: string;
  children?: ReactNode;
}) {
  const tracked = useRef(false);

  return (
    <div className="border-foreground/10 bg-surface bg-foreground/[0.02] mb-8 rounded-lg border p-4">
      <p className="text-foreground/40 mb-2 text-xs">Listen to this conversation</p>
      <audio
        controls
        preload="none"
        className="w-full"
        onPlay={() => {
          if (!tracked.current) {
            tracked.current = true;
            trackEvent("audio_play", { page: window.location.pathname });
          }
        }}
      >
        <source src={src} type="audio/mpeg" />
      </audio>
      {transcriptHref && (
        <p className="mt-2 text-xs">
          <a href={transcriptHref} className="text-foreground/50 hover:text-foreground/70">
            Read the transcript &darr;
          </a>
        </p>
      )}
      {children}
    </div>
  );
}
