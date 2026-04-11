export function AudioPlayer({ src }: { src: string }) {
  return (
    <div className="border-foreground/10 bg-surface bg-foreground/[0.02] mb-8 rounded-lg border p-4">
      <p className="text-foreground/40 mb-2 text-xs">Listen to this conversation</p>
      <audio controls preload="none" className="w-full">
        <source src={src} type="audio/mpeg" />
      </audio>
    </div>
  );
}
