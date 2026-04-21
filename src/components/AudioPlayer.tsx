"use client";

import { track } from "@vercel/analytics";
import { useRef } from "react";

export function AudioPlayer({ src }: { src: string }) {
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
            track("audio_play", { page: window.location.pathname });
          }
        }}
      >
        <source src={src} type="audio/mpeg" />
      </audio>
    </div>
  );
}
