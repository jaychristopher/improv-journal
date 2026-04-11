import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
  return (
    <footer className="border-foreground/10 mt-auto border-t px-6 py-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <span className="text-foreground/30 text-xs">Physics of Connection</span>
        <ThemeToggle />
      </div>
    </footer>
  );
}
