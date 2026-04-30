import React from "react";
import { Audio, Series, staticFile } from "remotion";

import { colors } from "../lib/design";
import {
  BaseFrame,
  Caps,
  Center,
  FadeIn,
  Kicker,
  PeakBadge,
  Title,
  Watermark,
} from "../lib/primitives";

// Peak timings (frames at 30fps). v2 audio duration: 283.04s = 8491 frames.
export const L1_PEAKS = [
  { id: "01-overthinking", durationInFrames: 9 * 30 }, // 0:00–0:09
  { id: "02-simulation", durationInFrames: 16 * 30 }, // 0:09–0:25
  { id: "03-safe-dead", durationInFrames: 8 * 30 }, // 0:25–0:33
  { id: "04-bandwidth", durationInFrames: 50 * 30 }, // 0:33–1:23 (anchor)
  { id: "05-internal", durationInFrames: 32 * 30 }, // 1:23–1:55
  { id: "06-forget-yourself", durationInFrames: 32 * 30 }, // 1:55–2:27
  { id: "07-mirroring", durationInFrames: 30 * 30 }, // 2:27–2:57
  { id: "08-first-line", durationInFrames: 28 * 30 }, // 2:57–3:25
  { id: "09-last-word", durationInFrames: 28 * 30 }, // 3:25–3:53
  { id: "10-redirect", durationInFrames: 50 * 30 }, // 3:53–4:43 (closing + CTA)
];

export const L1_DURATION = L1_PEAKS.reduce((s, p) => s + p.durationInFrames, 0);

// =====================================================================
// Peak 1 — OVERTHINKING title
// =====================================================================
const Peak1: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={1} label="the hook" />
    <Center>
      <div style={{ position: "relative" }}>
        {/* Ghost ? */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -180,
            transform: "translateX(-50%)",
            fontFamily: '"Playfair Display", serif',
            fontWeight: 900,
            fontSize: 1300,
            color: colors.accent.red,
            opacity: 0.13,
            lineHeight: 0.9,
            pointerEvents: "none",
          }}
        >
          ?
        </div>
        <FadeIn duration={20}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <Title size={224}>Overthinking</Title>
            <Title size={224} color={colors.accent.red} style={{ marginLeft: -8 }}>
              ?
            </Title>
          </div>
        </FadeIn>
      </div>
      <FadeIn startFrame={20} duration={18} style={{ marginTop: 60 }}>
        <Caps tracking={8} size={32} color={colors.fg.slate300}>
          {"in less than half a second"}
        </Caps>
      </FadeIn>
      <FadeIn startFrame={32} style={{ marginTop: 32 }}>
        <div style={{ width: 80, height: 3, background: colors.accent.red }} />
      </FadeIn>
    </Center>
    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 2 — Simulation (3 escalating questions)
// =====================================================================
const Peak2: React.FC = () => {
  const items = [
    {
      text: "What's the right thing to say?",
      size: 60,
      color: colors.fg.slate300,
      weight: 600,
      ts: "+0.1s",
    },
    { text: "How will this land?", size: 84, color: colors.fg.white, weight: 700, ts: "+0.2s" },
    { text: "What if I'm wrong?", size: 116, color: colors.accent.red, weight: 700, ts: "+0.4s" },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={2} label="0.4 sec inside the brain" />
      <FadeIn style={{ position: "absolute", left: 200, top: 140 }}>
        <Kicker color={colors.fg.slate300} size={56} style={{ fontStyle: "italic" }}>
          before you reply,
        </Kicker>
        <Kicker color={colors.fg.slate400} size={56} style={{ fontStyle: "italic" }}>
          your brain runs a simulation —
        </Kicker>
      </FadeIn>
      <div style={{ position: "absolute", left: 200, top: 340 }}>
        {items.map((item, i) => (
          <FadeIn key={i} startFrame={20 + i * 24} duration={20}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 60 }}>
              <div
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: 4,
                  color: colors.fg.slate500,
                  width: 140,
                }}
              >
                {item.ts}
              </div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontWeight: item.weight,
                  fontSize: item.size,
                  color: item.color,
                  marginLeft: 20,
                }}
              >
                {item.text}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn
        startFrame={120}
        style={{ position: "absolute", left: 0, right: 0, bottom: 140, textAlign: "center" }}
      >
        <Kicker size={40}>meanwhile, the moment is gone.</Kicker>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 3 — SAFE. DEAD. (EKG flat-line)
// =====================================================================
const Peak3: React.FC = () => {
  const W = 1920;
  const monX = 100,
    monY = 180,
    monW = W - 200,
    monH = 460;
  const baseY = monY + monH / 2;
  const startX = monX + 40,
    endX = monX + monW - 40;

  // Build the EKG path
  let path = `M ${startX} ${baseY}`;
  let cur = startX;
  for (let i = 0; i < 3; i++) {
    cur += 60;
    path += ` L ${cur} ${baseY}`;
    cur += 24;
    path += ` L ${cur} ${baseY - 130}`;
    cur += 18;
    path += ` L ${cur} ${baseY + 70}`;
    cur += 24;
    path += ` L ${cur} ${baseY}`;
    cur += 100;
    path += ` L ${cur} ${baseY}`;
  }
  cur += 50;
  path += ` L ${cur} ${baseY}`;
  cur += 18;
  path += ` L ${cur} ${baseY - 50}`;
  cur += 14;
  path += ` L ${cur} ${baseY + 24}`;
  cur += 18;
  path += ` L ${cur} ${baseY}`;
  const flatStart = cur;
  path += ` L ${endX} ${baseY}`;

  return (
    <BaseFrame>
      <PeakBadge num={3} label="what got delivered" />
      <FadeIn>
        <svg
          width={W}
          height={1080}
          style={{ position: "absolute", inset: 0 }}
          viewBox={`0 0 ${W} 1080`}
        >
          <rect
            x={monX}
            y={monY}
            width={monW}
            height={monH}
            rx={16}
            fill={colors.bg.slate900}
            stroke={colors.fg.slate600}
            strokeWidth={2}
          />
          <path
            d={path}
            stroke={colors.ok.green}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1={flatStart}
            y1={baseY}
            x2={endX}
            y2={baseY}
            stroke={colors.accent.red}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </svg>
      </FadeIn>
      <FadeIn
        startFrame={30}
        style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center" }}
      >
        <Title size={104} color={colors.fg.slate300}>
          Safe.
        </Title>
      </FadeIn>
      <FadeIn
        startFrame={50}
        style={{ position: "absolute", left: 0, right: 0, top: 870, textAlign: "center" }}
      >
        <Title size={104} color={colors.accent.red}>
          Dead.
        </Title>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 4 — BANDWIDTH PROBLEM (anchor)
// =====================================================================
const Peak4: React.FC = () => {
  const W = 1920;
  const chipW = 380,
    chipH = 280;
  const chipX = (W - chipW) / 2;
  const chipY = 360;
  const segs = Array.from({ length: 8 }, (_, i) => i);

  return (
    <BaseFrame>
      <PeakBadge num={4} label="the reframe" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center" }}>
        <Title size={132}>
          Bandwidth <span style={{ color: colors.accent.red }}>Problem.</span>
        </Title>
        <div style={{ marginTop: 20 }}>
          <Caps tracking={8} size={22}>
            {"OVERTHINKING IS NOT WILLPOWER. IT'S ALLOCATION."}
          </Caps>
        </div>
      </FadeIn>
      {/* Chip */}
      <FadeIn startFrame={20} style={{ position: "absolute", left: chipX, top: chipY }}>
        <div
          style={{
            width: chipW,
            height: chipH,
            background: colors.bg.slate800,
            borderRadius: 18,
            border: `4px solid ${colors.fg.slate300}`,
            position: "relative",
          }}
        >
          {/* Bandwidth label */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 28, textAlign: "center" }}>
            <Caps tracking={6} size={16} color={colors.fg.slate500}>
              BANDWIDTH
            </Caps>
          </div>
          {/* Inner die */}
          <div
            style={{
              position: "absolute",
              left: 36,
              top: 60,
              width: chipW - 72,
              height: chipH - 96,
              background: colors.bg.slate900,
              border: `2px solid ${colors.bg.slate700}`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {segs.map((i) => (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 32,
                  borderRadius: 4,
                  background: i < 4 ? colors.accent.red : colors.bg.slate700,
                }}
              />
            ))}
          </div>
          {/* LIMITED */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center" }}>
            <Caps tracking={6} size={14} color={colors.accent.orange}>
              LIMITED
            </Caps>
          </div>
        </div>
      </FadeIn>
      {/* Arrows + labels */}
      <FadeIn startFrame={36} style={{ position: "absolute", inset: 0 }}>
        <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <marker
              id="ah-red"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={colors.accent.red} />
            </marker>
            <marker
              id="ah-white"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={colors.fg.white} />
            </marker>
          </defs>
          <line
            x1={W / 2 - 30}
            y1={chipY + chipH + 24}
            x2={540}
            y2={880}
            stroke={colors.accent.red}
            strokeWidth={14}
            strokeLinecap="round"
            markerEnd="url(#ah-red)"
          />
          <line
            x1={W / 2 + 30}
            y1={chipY + chipH + 24}
            x2={1380}
            y2={880}
            stroke={colors.fg.white}
            strokeWidth={14}
            strokeLinecap="round"
            markerEnd="url(#ah-white)"
          />
        </svg>
      </FadeIn>
      <FadeIn
        startFrame={50}
        style={{ position: "absolute", left: 0, right: 0, top: 750, textAlign: "center" }}
      >
        <Kicker size={64} color={colors.fg.slate300} style={{ opacity: 0.4 }}>
          vs.
        </Kicker>
      </FadeIn>
      <FadeIn
        startFrame={60}
        style={{ position: "absolute", left: 540, top: 900, transform: "translateX(-50%)" }}
      >
        <Title size={64} color={colors.accent.red}>
          Planning
        </Title>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Caps tracking={2} size={22} color={colors.fg.slate400}>
            internal computation
          </Caps>
        </div>
      </FadeIn>
      <FadeIn
        startFrame={70}
        style={{ position: "absolute", left: 1380, top: 900, transform: "translateX(-50%)" }}
      >
        <Title size={64}>Receiving</Title>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Caps tracking={2} size={22} color={colors.fg.slate400}>
            the moment in front of you
          </Caps>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 5 — Internal Computation (overloaded continuation)
// =====================================================================
const Peak5: React.FC = () => {
  const W = 1920;
  const chipW = 380,
    chipH = 280;
  const chipX = (W - chipW) / 2;
  const chipY = 360;
  const segs = Array.from({ length: 8 }, (_, i) => i);
  return (
    <BaseFrame>
      <PeakBadge num={5} label="one beat later" />
      <FadeIn style={{ position: "absolute", left: 64, top: 96 }}>
        <Caps tracking={6} size={18} color={colors.accent.orange}>
          ↳ SAME DIAGRAM. ONE BEAT LATER.
        </Caps>
      </FadeIn>
      <FadeIn
        startFrame={10}
        style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center" }}
      >
        <Title size={116}>
          <span style={{ color: colors.accent.red }}>Internal</span> Computation.
        </Title>
        <div style={{ marginTop: 20 }}>
          <Caps tracking={8} size={22}>
            PLANNING DEVOURS THE BUDGET
          </Caps>
        </div>
      </FadeIn>
      <FadeIn startFrame={20} style={{ position: "absolute", left: chipX, top: chipY }}>
        <div
          style={{
            width: chipW,
            height: chipH,
            background: colors.bg.slate800,
            borderRadius: 18,
            border: `4px solid ${colors.accent.red}`,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: 28, textAlign: "center" }}>
            <Caps tracking={6} size={16} color={colors.accent.red}>
              BANDWIDTH
            </Caps>
          </div>
          <div
            style={{
              position: "absolute",
              left: 36,
              top: 60,
              width: chipW - 72,
              height: chipH - 96,
              background: colors.bg.slate900,
              border: `2px solid ${colors.accent.red}`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {segs.map((i) => (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 32,
                  borderRadius: 4,
                  background: i < 7 ? colors.accent.red : colors.bg.slate700,
                }}
              />
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center" }}>
            <Caps tracking={6} size={14} color={colors.accent.red}>
              OVERLOADED
            </Caps>
          </div>
        </div>
      </FadeIn>
      <FadeIn startFrame={36} style={{ position: "absolute", inset: 0 }}>
        <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <marker
              id="ah-red5"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={colors.accent.red} />
            </marker>
          </defs>
          <line
            x1={W / 2 - 30}
            y1={chipY + chipH + 24}
            x2={540}
            y2={880}
            stroke={colors.accent.red}
            strokeWidth={28}
            strokeLinecap="round"
            markerEnd="url(#ah-red5)"
          />
          <line
            x1={W / 2 + 30}
            y1={chipY + chipH + 24}
            x2={1380}
            y2={880}
            stroke={colors.fg.white}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.35}
          />
        </svg>
      </FadeIn>
      <FadeIn
        startFrame={50}
        style={{ position: "absolute", left: 540, top: 900, transform: "translateX(-50%)" }}
      >
        <Title size={76} color={colors.accent.red}>
          Planning
        </Title>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Caps tracking={2} size={22} color={colors.fg.slate300}>
            consuming the budget
          </Caps>
        </div>
      </FadeIn>
      <FadeIn
        startFrame={60}
        style={{ position: "absolute", left: 1380, top: 910, transform: "translateX(-50%)" }}
      >
        <Title size={56} color={colors.fg.slate400} style={{ opacity: 0.6 }}>
          Receiving
        </Title>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Caps tracking={2} size={22} color={colors.fg.slate500}>
            starved
          </Caps>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 6 — Forget Yourself (Johnstone quote)
// =====================================================================
const Peak6: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={6} label="the reframe" />
    <FadeIn style={{ position: "absolute", left: 140, top: 80 }}>
      <div
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 480,
          color: colors.accent.red,
          opacity: 0.6,
          lineHeight: 0.7,
        }}
      >
        “
      </div>
    </FadeIn>
    <FadeIn startFrame={16} style={{ position: "absolute", left: 320, top: 240 }}>
      <Title size={88} style={{ lineHeight: 1.25 }}>
        The decision
        <br />
        <span style={{ color: colors.accent.red }}>not to try</span>
        <br />
        and control the future
        <br />
        allows students
        <br />
        to be spontaneous.
      </Title>
    </FadeIn>
    <FadeIn startFrame={40} style={{ position: "absolute", left: 320, bottom: 180 }}>
      <div style={{ width: 60, height: 4, background: colors.accent.orange, marginBottom: 12 }} />
      <Title size={36} color={colors.accent.orange}>
        Keith Johnstone
      </Title>
      <div style={{ marginTop: 14 }}>
        <Caps tracking={4} size={22} color={colors.fg.slate400}>
          founder of modern improvisation
        </Caps>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 7 — Mirroring spec card
// =====================================================================
const Peak7: React.FC = () => {
  const fields = [
    { l: "TIME", v: "5 MIN" },
    { l: "FORMAT", v: "PAIRS" },
    { l: "FOCUS", v: "PRESENCE" },
    { l: "TRAINS", v: "ATTENTION" },
  ];
  const steps = [
    "Stand facing partner.",
    "One leads with slow movements.",
    "Switch leaders every 2 minutes.",
    "Final minute: no leader.",
  ];
  return (
    <BaseFrame>
      <PeakBadge num={7} label="exercise 1" />
      <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
        <Caps tracking={8} size={28} color={colors.accent.red}>
          EXERCISE 1
        </Caps>
      </FadeIn>
      <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
        <Title size={220}>Mirroring.</Title>
      </FadeIn>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 460,
          display: "grid",
          gridTemplateColumns: "380px 380px",
          gap: 16,
        }}
      >
        {fields.map((fi, i) => (
          <FadeIn key={i} startFrame={20 + i * 6}>
            <div
              style={{
                width: 380,
                height: 130,
                background: "rgba(15,23,42,0.55)",
                border: `1px solid ${colors.bg.slate700}`,
                borderRadius: 12,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Caps tracking={6} size={18} color={colors.fg.slate400}>
                {fi.l}
              </Caps>
              <div
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 50,
                  color: colors.accent.orange,
                  letterSpacing: 4,
                }}
              >
                {fi.v}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
      <div style={{ position: "absolute", left: 940, top: 420 }}>
        <Caps tracking={6} size={18}>
          INSTRUCTIONS
        </Caps>
        {steps.map((s, i) => (
          <FadeIn key={i} startFrame={50 + i * 8}>
            <div style={{ display: "flex", alignItems: "center", marginTop: i === 0 ? 30 : 18 }}>
              <Title size={56} color={colors.accent.red} style={{ width: 64 }}>
                {i + 1}
              </Title>
              <div
                style={{
                  fontFamily: "Inter",
                  fontWeight: 600,
                  fontSize: 26,
                  color: colors.fg.slate300,
                  marginLeft: 16,
                }}
              >
                {s}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn startFrame={90} style={{ position: "absolute", left: 100, right: 100, bottom: 70 }}>
        <div
          style={{
            height: 70,
            background: "rgba(239,68,68,0.12)",
            border: `1px solid ${colors.accent.red}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Kicker size={30} color={colors.accent.red}>
            you cannot mirror someone while thinking about your email.
          </Kicker>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 8 — First Line Drill (1ST/2ND/3RD ranking)
// =====================================================================
const Peak8: React.FC = () => {
  const ranks = [
    { num: "1ST", text: "Say it.", best: true, sub: "the unedited one." },
    { num: "2ND", text: "Wait, not that.", best: false, sub: "second-guess kicks in" },
    { num: "3RD", text: "Or maybe...", best: false, sub: "the moment is gone" },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={8} label="exercise 2" />
      <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
        <Caps tracking={8} size={28} color={colors.accent.red}>
          EXERCISE 2
        </Caps>
      </FadeIn>
      <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
        <Title size={156}>First Line Drill.</Title>
      </FadeIn>
      <div style={{ position: "absolute", left: 100, top: 410 }}>
        {ranks.map((r, i) => (
          <FadeIn key={i} startFrame={24 + i * 14}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 35 }}>
              <div
                style={{
                  width: 140,
                  height: 110,
                  background: r.best ? colors.accent.orange : colors.bg.slate800,
                  border: r.best ? "none" : `1px solid ${colors.bg.slate700}`,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 42,
                  letterSpacing: 4,
                  color: r.best ? colors.bg.slate900 : colors.fg.slate500,
                }}
              >
                {r.num}
              </div>
              <div style={{ marginLeft: 40, position: "relative" }}>
                <Title
                  size={r.best ? 88 : 60}
                  color={r.best ? colors.fg.white : colors.fg.slate500}
                  style={{
                    opacity: r.best ? 1 : 0.55,
                    fontFamily: r.best ? '"Playfair Display", serif' : "Inter",
                    fontWeight: r.best ? 900 : 400,
                  }}
                >
                  {r.text}
                </Title>
                {!r.best && (
                  <div
                    style={{
                      position: "absolute",
                      top: r.best ? 50 : 38,
                      left: -12,
                      width: "calc(100% + 24px)",
                      height: 4,
                      background: colors.accent.red,
                      opacity: 0.7,
                    }}
                  />
                )}
                <div style={{ marginTop: 6 }}>
                  <Caps tracking={4} size={18} color={colors.fg.slate600}>
                    {r.sub}
                  </Caps>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn startFrame={90} style={{ position: "absolute", left: 100, right: 100, bottom: 70 }}>
        <div
          style={{
            height: 70,
            background: "rgba(249,115,22,0.12)",
            border: `1px solid ${colors.accent.orange}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Kicker size={30}>your first idea is almost always better than your third.</Kicker>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 9 — Last Word Response
// =====================================================================
const Peak9: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={9} label="exercise 3" />
    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        EXERCISE 3
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
      <Title size={116}>Last Word Response.</Title>
    </FadeIn>
    <FadeIn startFrame={20} style={{ position: "absolute", left: 100, top: 320, right: 100 }}>
      <div
        style={{
          height: 90,
          background: "rgba(239,68,68,0.12)",
          border: `2px solid ${colors.accent.red}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Kicker size={36} color={colors.fg.white}>
          rule: first word of your reply = last word of theirs.
        </Kicker>
      </div>
    </FadeIn>
    <FadeIn startFrame={40} style={{ position: "absolute", left: 100, top: 470, right: 100 }}>
      <div
        style={{
          height: 150,
          background: colors.bg.slate800,
          borderRadius: 12,
          padding: "20px 30px",
        }}
      >
        <Caps tracking={4} size={22} color={colors.fg.slate400}>
          THEM:
        </Caps>
        <Title
          size={44}
          color={colors.fg.slate300}
          style={{ marginTop: 10, fontFamily: '"Playfair Display", serif', fontWeight: 900 }}
        >
          I keep second-guessing every email I{" "}
          <span style={{ color: colors.accent.red }}>send</span>.
        </Title>
      </div>
    </FadeIn>
    <FadeIn startFrame={64} style={{ position: "absolute", left: 100, top: 660, right: 100 }}>
      <div
        style={{
          height: 150,
          background: colors.bg.slate900,
          border: `2px solid ${colors.accent.red}`,
          borderRadius: 12,
          padding: "20px 30px",
        }}
      >
        <Caps tracking={4} size={22} color={colors.accent.red}>
          YOU:
        </Caps>
        <Title size={44} color={colors.fg.slate300} style={{ marginTop: 10 }}>
          <span style={{ color: colors.accent.red }}>Send</span> one without re-reading. See how it
          feels.
        </Title>
      </div>
    </FadeIn>
    <FadeIn startFrame={88} style={{ position: "absolute", left: 100, right: 100, bottom: 70 }}>
      <div
        style={{
          height: 70,
          background: "rgba(249,115,22,0.12)",
          border: `1px solid ${colors.accent.orange}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Kicker size={30}>forces you to hear the end of their sentence.</Kicker>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 10 — REDIRECT closing
// =====================================================================
const Peak10: React.FC = () => {
  const chips = [
    { label: "Bridge", color: colors.accent.red },
    { label: "Tool", color: colors.accent.orange },
    { label: "Subscribe", color: colors.ok.green },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={10} label="the closing" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center" }}>
        <Title size={320}>
          Redirect<span style={{ color: colors.accent.red }}>.</span>
        </Title>
      </FadeIn>
      <FadeIn
        startFrame={20}
        style={{ position: "absolute", left: 0, right: 0, top: 600, textAlign: "center" }}
      >
        <Kicker size={38} color={colors.fg.slate300}>
          your attention to the moment in front of you.
        </Kicker>
      </FadeIn>
      <FadeIn
        startFrame={36}
        style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center" }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "20px 60px",
            background: "rgba(15,23,42,0.6)",
            border: `3px solid ${colors.accent.orange}`,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 40,
              color: colors.accent.orange,
            }}
          >
            physicsofconnection.com/how-to-stop-overthinking
          </div>
        </div>
      </FadeIn>
      <FadeIn
        startFrame={50}
        style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
      >
        <div style={{ display: "inline-flex", gap: 24 }}>
          {chips.map((c, i) => (
            <div
              key={i}
              style={{
                width: 220,
                height: 64,
                border: `2px solid ${c.color}`,
                borderRadius: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: 4,
                color: c.color,
              }}
            >
              {c.label}
            </div>
          ))}
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const PEAK_COMPONENTS = [Peak1, Peak2, Peak3, Peak4, Peak5, Peak6, Peak7, Peak8, Peak9, Peak10];

export const L1Overthinking: React.FC = () => (
  <>
    <Audio src={staticFile("audio/01-how-to-stop-overthinking.mp3")} />
    <Series>
      {L1_PEAKS.map((peak, i) => {
        const Comp = PEAK_COMPONENTS[i];
        return (
          <Series.Sequence key={peak.id} durationInFrames={peak.durationInFrames}>
            <Comp />
          </Series.Sequence>
        );
      })}
    </Series>
  </>
);
