import React from "react";
import { Audio, Series, staticFile } from "remotion";

import { colors } from "../lib/design";
import {
  BaseFrame,
  Caps,
  FadeIn,
  FadeInOut,
  Kicker,
  PeakBadge,
  Title,
  Watermark,
} from "../lib/primitives";

// Peak timings synced to dead-air-compressed v2 audio. Audio: 438.60s.
// See docs/youtube-week-1/peak-sync-audit.json.
export const L31_PEAKS = [
  { id: "01-search", durationInFrames: 396 }, // 0.18–13.38s
  { id: "02-list", durationInFrames: 310 }, // 13.38–23.72s
  { id: "03-yes-and-traditions", durationInFrames: 2383 }, // 23.72–103.14s
  { id: "04-empty-loaded", durationInFrames: 1438 }, // 103.14–151.08s
  { id: "05-five-traditions", durationInFrames: 1900 }, // 151.08–214.42s
  { id: "06-blocking", durationInFrames: 2398 }, // 214.42–294.34s
  { id: "07-del-close", durationInFrames: 1606 }, // 294.34–347.86s
  { id: "08-strip-away", durationInFrames: 208 }, // 347.86–354.80s
  { id: "09-reveal", durationInFrames: 917 }, // 354.80–385.38s
  { id: "10-training-wheels", durationInFrames: 384 }, // 385.38–398.18s
  { id: "11-closing", durationInFrames: 1218 }, // 398.18–438.78s (+5 rounding)
];
export const L31_DURATION = L31_PEAKS.reduce((s, p) => s + p.durationInFrames, 0);

const RULES = ["YES AND", "NO QUESTIONS", "PARTNER LOOK GOOD", "DON'T NEGATE", "NO MISTAKES"];

// Shared circle layout used by Peaks 8 and 9 (cinematic continuity)
const CIRCLE_CX = 1920 / 2;
const CIRCLE_CY = 1080 / 2 + 30;
const CIRCLE_R = 340;

const RuleCircle: React.FC<{ faded?: boolean }> = ({ faded = false }) => (
  <>
    {RULES.map((label, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const tx = CIRCLE_CX + Math.cos(angle) * CIRCLE_R;
      const ty = CIRCLE_CY + Math.sin(angle) * CIRCLE_R;
      const opacity = faded ? 0.55 : 1;
      return (
        <div
          key={label}
          style={{
            position: "absolute",
            left: tx,
            top: ty,
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            opacity,
          }}
        >
          <Title size={36} color={colors.accent.red}>
            {i + 1}
          </Title>
          <Caps tracking={4} size={22} color={colors.fg.slate300}>
            {label}
          </Caps>
        </div>
      );
    })}
    {/* arrows pointing inward */}
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {RULES.map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const startX = CIRCLE_CX + Math.cos(angle) * (CIRCLE_R - 60);
        const startY = CIRCLE_CY + Math.sin(angle) * (CIRCLE_R - 60);
        const endR = faded ? 220 : 100;
        const endX = CIRCLE_CX + Math.cos(angle) * endR;
        const endY = CIRCLE_CY + Math.sin(angle) * endR;
        return (
          <line
            key={i}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={colors.fg.slate600}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={faded ? 0.5 : 0.7}
          />
        );
      })}
    </svg>
  </>
);

// =====================================================================
const Peak1: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={1} label="the hook" />
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}>
      <Title size={124}>Search.</Title>
    </FadeIn>
    <FadeIn
      startFrame={16}
      style={{
        position: "absolute",
        left: 180,
        top: 460,
        right: 180,
        height: 140,
        borderRadius: 70,
        background: colors.fg.white,
        boxShadow: "8px 8px 0 rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        padding: "0 80px",
      }}
    >
      {/* Magnifying glass (svg) */}
      <svg width={72} height={72} style={{ marginRight: 40 }}>
        <circle cx={36} cy={36} r={28} stroke={colors.fg.slate400} strokeWidth={7} fill="none" />
        <line
          x1={56}
          y1={56}
          x2={70}
          y2={70}
          stroke={colors.fg.slate400}
          strokeWidth={7}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 900,
          fontSize: 80,
          color: colors.bg.slate900,
        }}
      >
        rules of improv
      </div>
      <div style={{ width: 5, height: 80, background: colors.bg.slate900, marginLeft: 16 }} />
    </FadeIn>
    <FadeIn
      startFrame={30}
      style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center" }}
    >
      <Kicker size={32}>millions search this every year. they all find the same five rules.</Kicker>
    </FadeIn>
    {/* Open-loop promise pill — honors v2 hook "I'll show you in seven minutes" */}
    <FadeIn
      startFrame={42}
      style={{ position: "absolute", left: 0, right: 0, top: 830, textAlign: "center" }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "16px 36px",
          background: colors.accent.red,
          borderRadius: 30,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 4,
          color: colors.fg.white,
        }}
      >
        IN 7 MIN: WHY HALF ARE WRONG
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak2: React.FC = () => {
  const rules = [
    "Say Yes And.",
    "Don't Ask Questions.",
    "Make Your Partner Look Good.",
    "Don't Negate.",
    "There Are No Mistakes.",
  ];
  return (
    <BaseFrame>
      <PeakBadge num={2} label="what they find" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center" }}>
        <Title size={88}>The standard list.</Title>
      </FadeIn>
      <div style={{ position: "absolute", left: 200, top: 280 }}>
        {rules.map((r, i) => (
          <FadeIn key={i} startFrame={20 + i * 10}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 30,
                position: "relative",
              }}
            >
              <Title size={72} color={colors.accent.red} style={{ width: 100 }}>
                {i + 1}.
              </Title>
              <div style={{ position: "relative" }}>
                <Title size={64} color={colors.fg.slate300}>
                  {r}
                </Title>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: -12,
                    width: "calc(100% + 24px)",
                    height: 5,
                    background: colors.accent.red,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn startFrame={80} style={{ position: "absolute", right: 200, top: 480 }}>
        <Kicker size={100} color={colors.accent.red} style={{ lineHeight: 1.1 }}>
          mostly
          <br />
          wrong.
        </Kicker>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const Peak3: React.FC = () => {
  const panels = [
    { name: "JOHNSTONE", interp: "be changed by\nwhat happens.", color: colors.accent.red },
    { name: "UCB", interp: "accept the offer,\nthen add to it.", color: colors.accent.orange },
    { name: "NAPIER", interp: "don't obsess.\ndo something.", color: colors.ok.green },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={3} label="rule 1" />
      {/* Beat anchors (peak starts at audio 23.72s):
            0     "Rule one. Yes, And."
            82    "What people think it means" -- common belief appears
            270   "Three different things" -- title shows complexity
            337   Johnstone tradition card
            570   Johnstone "be changed by what happens" interp visible
            664   UCB tradition card
            888   Napier tradition card
            1060  "wimpy, compliant, passionless"
            1167  "So which is it?" turn
            1265  "not about agreement" answer
            1958  "accept the shared reality" closing principle
      */}
      <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
        <Caps tracking={8} size={28} color={colors.accent.red}>
          RULE 1 · YES, AND
        </Caps>
      </FadeIn>

      {/* Common belief (fades out before three panels appear) */}
      <FadeInOut
        startFrame={82}
        visibleFrames={170}
        outDuration={20}
        style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
      >
        <Caps tracking={6} size={22} color={colors.fg.slate400}>
          WHAT PEOPLE THINK IT MEANS:
        </Caps>
        <div style={{ marginTop: 24 }}>
          <Kicker size={56} color={colors.fg.slate500}>
            agree with everything, add something.
          </Kicker>
        </div>
      </FadeInOut>

      {/* "Three different things" reveal */}
      <FadeIn
        startFrame={270}
        style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
      >
        <Title size={72}>
          Means <span style={{ color: colors.accent.red }}>three different things.</span>
        </Title>
      </FadeIn>

      {/* Three tradition panels — stagger by frame */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 360 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
          {panels.map((p, i) => {
            const startFrames = [337, 664, 888];
            return (
              <FadeIn key={p.name} startFrame={startFrames[i]} duration={16} rise={28}>
                <div
                  style={{
                    width: 540,
                    height: 540,
                    background: colors.bg.slate900,
                    border: `3px solid ${p.color}`,
                    borderRadius: 16,
                    padding: 50,
                    textAlign: "center",
                  }}
                >
                  <Caps tracking={6} size={36} color={p.color}>
                    {p.name}
                  </Caps>
                  <div
                    style={{ width: "60%", height: 2, background: p.color, margin: "30px auto" }}
                  />
                  <Kicker
                    size={40}
                    color={colors.fg.slate300}
                    style={{ lineHeight: 1.3, whiteSpace: "pre-line" }}
                  >
                    {p.interp}
                  </Kicker>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>

      {/* "So which is it?" turn — appears once all 3 panels are visible */}
      <FadeInOut
        startFrame={1167}
        visibleFrames={80}
        outDuration={16}
        style={{ position: "absolute", left: 0, right: 0, bottom: 130, textAlign: "center" }}
      >
        <Kicker size={48} color={colors.accent.orange} style={{ fontStyle: "italic" }}>
          so which is it?
        </Kicker>
      </FadeInOut>

      {/* Closing principle */}
      <FadeIn
        startFrame={1265}
        style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center" }}
      >
        <Kicker size={30} color={colors.fg.slate300}>
          same words. different traditions. different moves.
        </Kicker>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const Peak4: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={4} label="rule 2" />
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center" }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        RULE 2
      </Caps>
    </FadeIn>
    <FadeIn
      startFrame={10}
      style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
    >
      <Title size={200} color={colors.fg.slate600}>
        Empty.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={20}
      style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center" }}
    >
      <Kicker size={36} color={colors.fg.slate500}>
        {'"What do you do for a living?"'}
      </Kicker>
    </FadeIn>
    <FadeIn
      startFrame={32}
      style={{ position: "absolute", left: 0, right: 0, top: 530, textAlign: "center" }}
    >
      <Kicker size={64} color={colors.fg.slate400}>
        vs.
      </Kicker>
    </FadeIn>
    <FadeIn
      startFrame={44}
      style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center" }}
    >
      <Title size={200} color={colors.accent.red}>
        Loaded.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={60}
      style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
    >
      <Kicker size={36} color={colors.fg.white}>
        {'"Are you seriously wearing that to Dad\'s funeral?"'}
      </Kicker>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// Peak 5 — Rule 3: 5 traditions agree (63s). Cards appear together
// matching the "all five agree" collective statement, then sub-captions
// fade in as Johnstone / Close+Halpern / UCB are individually named.
//
// Audio anchors (peak starts at 151.08s):
//   0     "Rule three. Make your partner look good." -- header
//   121   "all five major improv traditions essentially agree" -- 5 cards in
//   319   "create conditions where your partner can succeed" -- principle kicker
//   457   "lowering your status" -- Johnstone caption
//   570   "Del Close and Charna Halpern" -- Close caption
//   767   "UCB game structure" -- UCB caption
//   1021  "doesn't mean avoiding conflict" -- anti-pattern callout
//   1724  "shared creation" -- final principle
const Peak5: React.FC = () => {
  const traditions: { name: string; caption: string; captionStart: number | null }[] = [
    { name: "Johnstone", caption: "lower your status", captionStart: 457 },
    { name: "Spolin", caption: "", captionStart: null },
    { name: "Close", caption: "ensemble responsibility", captionStart: 570 },
    { name: "UCB", caption: "set up the game", captionStart: 767 },
    { name: "Annoyance", caption: "", captionStart: null },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={5} label="rule 3" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center" }}>
        <Caps tracking={8} size={28} color={colors.accent.red}>
          RULE 3 · MAKE YOUR PARTNER LOOK GOOD
        </Caps>
      </FadeIn>

      {/* "Five major traditions agree" — appears at frame 121 with the cards */}
      <FadeIn
        startFrame={121}
        style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center" }}
      >
        <Title size={64}>Five major traditions agree.</Title>
      </FadeIn>

      <FadeIn startFrame={121} style={{ position: "absolute", left: 0, right: 0, top: 360 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          {traditions.map((t) => (
            <div
              key={t.name}
              style={{
                width: 320,
                height: 360,
                background: colors.bg.slate900,
                border: `2px solid ${colors.ok.green}`,
                borderRadius: 16,
                padding: 30,
                textAlign: "center",
                position: "relative",
              }}
            >
              <Title size={36}>{t.name}</Title>
              <div
                style={{
                  marginTop: 60,
                  height: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width={120} height={120} viewBox="0 0 120 120">
                  <polyline
                    points="20,60 50,90 100,30"
                    fill="none"
                    stroke={colors.ok.green}
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {/* Per-tradition caption (only on the 3 named ones) */}
              {t.captionStart !== null && (
                <FadeIn
                  startFrame={t.captionStart}
                  duration={14}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 24,
                    textAlign: "center",
                  }}
                >
                  <Caps tracking={4} size={16} color={colors.ok.green}>
                    {t.caption}
                  </Caps>
                </FadeIn>
              )}
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Principle kicker — appears at frame 319 ("create conditions for success") */}
      <FadeInOut
        startFrame={319}
        visibleFrames={680}
        outDuration={20}
        style={{ position: "absolute", left: 100, right: 100, top: 770 }}
      >
        <Kicker size={32} color={colors.fg.slate300} style={{ textAlign: "center" }}>
          create conditions where your partner can succeed.
        </Kicker>
      </FadeInOut>

      {/* Anti-pattern callout — frame 1021 */}
      <FadeInOut
        startFrame={1021}
        visibleFrames={620}
        outDuration={20}
        style={{ position: "absolute", left: 100, right: 100, top: 770, textAlign: "center" }}
      >
        <Caps tracking={4} size={20} color={colors.accent.orange}>
          DOES NOT MEAN:
        </Caps>
        <div style={{ marginTop: 12 }}>
          <Kicker size={28} color={colors.fg.slate400}>
            avoiding conflict, being agreeable, or suppressing yourself.
          </Kicker>
        </div>
      </FadeInOut>

      {/* Final principle — frame 1724 ("shared creation") */}
      <FadeIn startFrame={1724} style={{ position: "absolute", left: 100, right: 100, bottom: 80 }}>
        <div
          style={{
            height: 100,
            background: "rgba(34,197,94,0.18)",
            border: `2px solid ${colors.ok.green}`,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Title size={48} color={colors.ok.green}>
            your success and your partner&apos;s — same thing.
          </Title>
        </div>
      </FadeIn>

      <Watermark />
    </BaseFrame>
  );
};

// Peak 6 — Rule 4: Blocking taxonomy. 80 seconds. 5 named children appear
// one at a time as the audio names them.
//
// Audio anchors (peak starts at 214.42s):
//   0     "Rule four. Don't negate." -- header
//   128   "never say no" -- common interpretation
//   179   "oversimplified" reframe
//   767   "taxonomy" -- BLOCKING parent appears
//   989   "Wimping" -- child 1
//   1074  "canceling" -- child 2
//   1207  "bridging" -- child 3
//   1335  "hedging" -- child 4
//   1454  "pimping" -- child 5
//   1578  "Meanwhile" Napier counterpoint
//   1649  "fear of negation"
//   1927  "no tension, no stakes"
//   2102  "real principle" closer
const Peak6: React.FC = () => {
  const children = [
    { label: "Wimping", def: "soft refusal", startFrame: 989 },
    { label: "Canceling", def: "undo offer", startFrame: 1074 },
    { label: "Bridging", def: "delay action", startFrame: 1207 },
    { label: "Hedging", def: "vague reply", startFrame: 1335 },
    { label: "Pimping", def: "overload partner", startFrame: 1454 },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={6} label="rule 4" />

      {/* Header */}
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 100, textAlign: "center" }}>
        <Caps tracking={8} size={28} color={colors.accent.red}>
          {"RULE 4 · DON'T NEGATE"}
        </Caps>
      </FadeIn>

      {/* Common interpretation (gets struck through) */}
      <FadeInOut
        startFrame={128}
        visibleFrames={580}
        outDuration={20}
        style={{ position: "absolute", left: 0, right: 0, top: 220, textAlign: "center" }}
      >
        <Caps tracking={6} size={22} color={colors.fg.slate400}>
          WHAT PEOPLE THINK:
        </Caps>
        <div style={{ marginTop: 20, position: "relative", display: "inline-block" }}>
          <Title size={88} color={colors.fg.slate500} style={{ opacity: 0.7 }}>
            {'"Never say no."'}
          </Title>
        </div>
      </FadeInOut>

      {/* Strikethrough on "Never say no" once "oversimplified" hits */}
      <FadeInOut
        startFrame={179}
        visibleFrames={530}
        outDuration={20}
        style={{
          position: "absolute",
          left: "50%",
          top: 360,
          width: 600,
          height: 6,
          background: colors.accent.red,
          opacity: 0.85,
          transform: "translateX(-50%)",
        }}
      >
        <div />
      </FadeInOut>

      {/* "Oversimplified" callout */}
      <FadeInOut
        startFrame={210}
        visibleFrames={500}
        outDuration={20}
        style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center" }}
      >
        <Kicker size={48} color={colors.accent.red}>
          oversimplified.
        </Kicker>
      </FadeInOut>

      {/* BLOCKING parent appears at frame 767 (audio "taxonomy") */}
      <FadeIn
        startFrame={767}
        duration={16}
        style={{ position: "absolute", left: 0, right: 0, top: 200 }}
      >
        <div
          style={{
            width: 480,
            height: 110,
            background: colors.accent.red,
            borderRadius: 16,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Title size={56} style={{ letterSpacing: 4 }}>
            BLOCKING
          </Title>
        </div>
      </FadeIn>

      {/* Subhead: "= 5 named family members" */}
      <FadeIn
        startFrame={920}
        duration={14}
        style={{ position: "absolute", left: 0, right: 0, top: 340, textAlign: "center" }}
      >
        <Caps tracking={6} size={22} color={colors.fg.slate400}>
          5 NAMED FAMILY MEMBERS
        </Caps>
      </FadeIn>

      {/* 5 child cards — fade in one-by-one as named */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 460 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 30,
            paddingLeft: 30,
            paddingRight: 30,
          }}
        >
          {children.map((c) => (
            <FadeIn key={c.label} startFrame={c.startFrame} duration={14} rise={32}>
              <div
                style={{
                  width: 320,
                  height: 280,
                  background: colors.bg.slate800,
                  border: `2px solid ${colors.accent.orange}`,
                  borderRadius: 16,
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <Title size={36} color={colors.accent.orange}>
                  {c.label}
                </Title>
                <div
                  style={{
                    width: "60%",
                    margin: "20px auto",
                    height: 2,
                    background: colors.fg.slate600,
                  }}
                />
                <Kicker size={26} color={colors.fg.slate300}>
                  {c.def}
                </Kicker>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Napier counterpoint at frame 1578 — subtle bottom callout */}
      <FadeIn startFrame={1578} style={{ position: "absolute", left: 100, right: 100, top: 800 }}>
        <div
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${colors.fg.slate600}`,
            borderRadius: 12,
            padding: "20px 32px",
          }}
        >
          <Caps tracking={4} size={18} color={colors.accent.orange}>
            BUT NAPIER WARNS:
          </Caps>
          <div style={{ marginTop: 12 }}>
            <Kicker size={28} color={colors.fg.slate300}>
              fear of negation produces scenes with no tension and no stakes.
            </Kicker>
          </div>
        </div>
      </FadeIn>

      {/* Bottom kicker — closes the peak with "real principle" beat */}
      <FadeIn startFrame={2102} style={{ position: "absolute", left: 100, right: 100, bottom: 60 }}>
        <div
          style={{
            height: 90,
            background: "rgba(239,68,68,0.12)",
            border: `1px solid ${colors.accent.red}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Kicker size={32} color={colors.accent.red}>
            don&apos;t destroy the shared reality. conflict and refusal are necessary.
          </Kicker>
        </div>
      </FadeIn>

      <Watermark />
    </BaseFrame>
  );
};

const Peak7: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={7} label="rule 5" />
    <FadeIn style={{ position: "absolute", left: 100, top: 80 }}>
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
    <FadeIn startFrame={16} style={{ position: "absolute", left: 280, top: 240 }}>
      <Title size={116} style={{ lineHeight: 1.2 }}>
        Fall,
        <br />
        then figure out
        <br />
        what to do
        <br />
        on the way down.
      </Title>
    </FadeIn>
    <FadeIn startFrame={42} style={{ position: "absolute", left: 360, bottom: 200 }}>
      <div style={{ width: 60, height: 4, background: colors.accent.orange, marginBottom: 12 }} />
      <Title size={44} color={colors.accent.orange}>
        Del Close
      </Title>
      <div style={{ marginTop: 14 }}>
        <Caps tracking={4} size={22} color={colors.fg.slate400}>
          co-founder, ImprovOlympic
        </Caps>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak8: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={8} label="the setup" />
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 100, textAlign: "center" }}>
      <Title size={80}>Strip the rules away.</Title>
    </FadeIn>
    <RuleCircle faded={false} />
    {/* Empty center with ? */}
    <div
      style={{
        position: "absolute",
        left: CIRCLE_CX - 80,
        top: CIRCLE_CY - 80,
        width: 160,
        height: 160,
        borderRadius: "50%",
        border: `4px dashed ${colors.fg.slate400}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Title size={100} color={colors.fg.slate400}>
        ?
      </Title>
    </div>
    <FadeIn
      startFrame={30}
      style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center" }}
    >
      <Kicker size={36}>{"what's underneath all five?"}</Kicker>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak9: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={9} label="the reveal" />
    <RuleCircle faded={true} />
    {/* Center filled with answer */}
    <FadeIn duration={20}>
      <div
        style={{
          position: "absolute",
          left: CIRCLE_CX - 220,
          top: CIRCLE_CY - 220,
          width: 440,
          height: 440,
          borderRadius: "50%",
          background: colors.accent.red,
          border: `8px solid ${colors.accent.red}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Title size={64}>Get out</Title>
        <Title size={64}>of your head.</Title>
        <Kicker size={36} color={colors.bg.slate900} style={{ marginTop: 24 }}>
          and into the scene.
        </Kicker>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Bike: React.FC<{ x: number; color: string; tw?: boolean }> = ({ x, color, tw }) => (
  <div style={{ position: "absolute", left: x - 280, top: 380, width: 560, height: 360 }}>
    <svg width={560} height={360}>
      <circle cx={80} cy={200} r={88} stroke={color} strokeWidth={8} fill="none" />
      <circle cx={480} cy={200} r={88} stroke={color} strokeWidth={8} fill="none" />
      <line
        x1={80}
        y1={200}
        x2={480}
        y2={200}
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <line
        x1={280}
        y1={60}
        x2={80}
        y2={200}
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <line
        x1={280}
        y1={60}
        x2={480}
        y2={200}
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {tw && (
        <>
          <circle cx={20} cy={250} r={26} fill={colors.accent.red} />
          <circle cx={540} cy={250} r={26} fill={colors.accent.red} />
        </>
      )}
    </svg>
  </div>
);

const Peak10: React.FC = () => {
  return (
    <BaseFrame>
      <PeakBadge num={10} label="scaffolding" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center" }}>
        <Title size={88}>Training wheels.</Title>
      </FadeIn>
      <FadeIn startFrame={16}>
        <Bike x={540} color={colors.fg.slate300} tw />
      </FadeIn>
      <FadeIn startFrame={24}>
        <Bike x={1380} color={colors.ok.green} />
      </FadeIn>
      <FadeIn
        startFrame={36}
        style={{ position: "absolute", left: 540 - 200, top: 760, width: 400, textAlign: "center" }}
      >
        <Caps tracking={6} size={28} color={colors.accent.red}>
          WITH RULES
        </Caps>
        <div style={{ marginTop: 20 }}>
          <Kicker size={32} color={colors.fg.slate400}>
            (training)
          </Kicker>
        </div>
      </FadeIn>
      <FadeIn
        startFrame={36}
        style={{
          position: "absolute",
          left: 1380 - 200,
          top: 760,
          width: 400,
          textAlign: "center",
        }}
      >
        <Caps tracking={6} size={28} color={colors.ok.green}>
          BEYOND RULES
        </Caps>
        <div style={{ marginTop: 20 }}>
          <Kicker size={32} color={colors.fg.slate300}>
            (presence)
          </Kicker>
        </div>
      </FadeIn>
      <FadeIn
        startFrame={54}
        style={{ position: "absolute", left: 0, right: 0, bottom: 100, textAlign: "center" }}
      >
        <Kicker size={32}>the rules are scaffolding for one skill — being present.</Kicker>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const Peak11: React.FC = () => {
  const books = [
    { title: "Impro", author: "JOHNSTONE", color: colors.accent.red },
    { title: "Improvise", author: "NAPIER", color: colors.accent.orange },
    { title: "Truth in Comedy", author: "CLOSE & HALPERN", color: colors.ok.green },
  ];
  const chips = [
    { label: "Bridge", color: colors.accent.red },
    { label: "Tools", color: colors.accent.orange },
    { label: "Subscribe", color: colors.ok.green },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={11} label="the system" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center" }}>
        <Title size={96}>The full system.</Title>
      </FadeIn>
      <FadeIn
        startFrame={16}
        style={{ position: "absolute", left: 0, right: 0, top: 280, textAlign: "center" }}
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
            physicsofconnection.com/rules-of-improv
          </div>
        </div>
      </FadeIn>
      <FadeIn startFrame={32} style={{ position: "absolute", left: 0, right: 0, top: 480 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 80 }}>
          {books.map((b, i) => (
            <div
              key={i}
              style={{
                width: 200,
                height: 440,
                background: b.color,
                borderRadius: 6,
                position: "relative",
                padding: 30,
                boxShadow: "4px 4px 0 rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 12,
                  background: colors.bg.slate900,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: b.color,
                  opacity: 0.6,
                }}
              />
              <Title size={28} style={{ marginTop: 50 }}>
                {b.title}
              </Title>
              <div
                style={{
                  position: "absolute",
                  bottom: 30,
                  left: 30,
                  right: 30,
                  textAlign: "center",
                }}
              >
                <Caps tracking={4} size={14} color={colors.bg.slate900}>
                  {b.author}
                </Caps>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
      <FadeIn
        startFrame={48}
        style={{ position: "absolute", left: 0, right: 0, bottom: 50, textAlign: "center" }}
      >
        <div style={{ display: "inline-flex", gap: 24 }}>
          {chips.map((c, i) => (
            <div
              key={i}
              style={{
                width: 200,
                height: 60,
                border: `2px solid ${c.color}`,
                borderRadius: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 24,
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

const PEAKS = [Peak1, Peak2, Peak3, Peak4, Peak5, Peak6, Peak7, Peak8, Peak9, Peak10, Peak11];

export const L31RulesOfImprov: React.FC = () => (
  <>
    <Audio src={staticFile("audio/03-rules-of-improv.mp3")} />
    <Series>
      {L31_PEAKS.map((peak, i) => {
        const Comp = PEAKS[i];
        return (
          <Series.Sequence key={peak.id} durationInFrames={peak.durationInFrames}>
            <Comp />
          </Series.Sequence>
        );
      })}
    </Series>
  </>
);
