import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { colors, gradientBg } from "./design";

export const BaseFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={gradientBg}>{children}</AbsoluteFill>
);

export const Watermark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 64,
      bottom: 56,
      color: colors.fg.slate400,
      opacity: 0.6,
      fontSize: 22,
      fontFamily: "Inter",
      fontWeight: 600,
      letterSpacing: 0.4,
    }}
  >
    physicsofconnection.com
  </div>
);

export const PeakBadge: React.FC<{ num: number; label: string }> = ({ num, label }) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      top: 56,
      color: colors.fg.slate400,
      opacity: 0.55,
      fontSize: 18,
      fontFamily: "Inter",
      fontWeight: 700,
      letterSpacing: 6,
    }}
  >
    {String(num).padStart(2, "0")} · {label}
  </div>
);

// Fade-in helper using interpolate with optional spring entrance
export const FadeIn: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  duration?: number;
  rise?: number;
  style?: React.CSSProperties;
}> = ({ children, startFrame = 0, duration = 18, rise = 24, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [startFrame, startFrame + duration], [rise, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ ...style, opacity, transform: `translateY(${translateY}px)` }}>{children}</div>
  );
};

// Standard peak title (serif headline)
export const Title: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, size = 156, color = colors.fg.white, style }) => (
  <div
    style={{
      fontFamily: '"Playfair Display", serif',
      fontWeight: 900,
      fontSize: size,
      color,
      lineHeight: 1.05,
      ...style,
    }}
  >
    {children}
  </div>
);

// Italic kicker (serif italic)
export const Kicker: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, color = colors.accent.orange, size = 32, style }) => (
  <div
    style={{
      fontFamily: '"Playfair Display", serif',
      fontStyle: "italic",
      fontWeight: 400,
      fontSize: size,
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

// Small-caps label (Inter)
export const Caps: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  tracking?: number;
  style?: React.CSSProperties;
}> = ({ children, color = colors.fg.slate400, size = 24, tracking = 8, style }) => (
  <div
    style={{
      fontFamily: "Inter",
      fontWeight: 700,
      fontSize: size,
      color,
      letterSpacing: tracking,
      ...style,
    }}
  >
    {children}
  </div>
);

// Centered absolute helper
export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </div>
);
