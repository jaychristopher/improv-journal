// Shared design tokens — match the Figma FINAL pages exactly.

export const colors = {
  bg: {
    slate900: "#0f172a",
    slate800: "#1e293b",
    slate700: "#334155",
  },
  accent: {
    red: "#ef4444",
    orange: "#f97316",
  },
  fg: {
    white: "#ffffff",
    slate300: "#cbd5e1",
    slate400: "#94a3b8",
    slate500: "#64748b",
    slate600: "#475569",
  },
  ok: {
    green: "#22c55e",
  },
} as const;

export const gradientBg = {
  background: `linear-gradient(180deg, ${colors.bg.slate900} 0%, ${colors.bg.slate800} 50%, ${colors.bg.slate700} 100%)`,
};

// Frame dimensions match Figma exports
export const FRAME = {
  width: 1920,
  height: 1080,
  fps: 30,
};
