export function AudioPlayer({ src }: { src: string }) {
  return (
    <div className="border border-foreground/10 rounded-lg bg-surface p-4 mb-8 bg-foreground/[0.02]">
      <p className="text-xs text-foreground/40 mb-2">
        Listen to this conversation
      </p>
      <audio controls preload="none" className="w-full">
        <source src={src} type="audio/mpeg" />
      </audio>
    </div>
  );
}
