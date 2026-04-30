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

// Peak timings synced to L2 audio (post-compression). Audio: 346.80s.
// All anchors derived from ElevenLabs Scribe word timings.
// See docs/youtube-week-2/L2-timings.json + peak-sync-audit.json.
export const L2_PEAKS = [
  { id: "01-stop-trying", durationInFrames: 1481 }, // 0.16–49.52s · hook + reframe
  { id: "02-fmri", durationInFrames: 1680 }, // 49.52–105.52s · brain mechanism (citation magnet)
  { id: "03-honesty", durationInFrames: 1939 }, // 105.52–170.14s · Move 1 + Johnstone paradox (midpoint)
  { id: "04-specificity", durationInFrames: 1282 }, // 170.14–212.88s · Move 2
  { id: "05-pattern", durationInFrames: 1424 }, // 212.88–260.34s · Move 3
  { id: "06-antipattern", durationInFrames: 1052 }, // 260.34–295.42s · performing cleverness
  { id: "07-closing", durationInFrames: 1546 }, // 295.42–346.80s · recap + CTA + callback
];
export const L2_DURATION = L2_PEAKS.reduce((s, p) => s + p.durationInFrames, 0);

// =====================================================================
// Peak 1 — HOOK & REFRAME (49.36s)
// Internal beats:
//   0     "Stop trying" — title hook
//   62    "every article" — list of generic advice
//   766   "three moves" — open loop
//   1065  "four minutes" — time-bound promise badge
//   1115  "every minute you spend" — explicit stakes line
// =====================================================================
const Peak1: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={1} label="the hook" />

    {/* Hook headline */}
    <FadeIn
      duration={14}
      style={{ position: "absolute", left: 0, right: 0, top: 220, textAlign: "center" }}
    >
      <Title size={220}>
        Stop <span style={{ color: colors.accent.red }}>trying.</span>
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={20}
      style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center" }}
    >
      <Kicker size={48} color={colors.fg.slate300}>
        {"to be funny."}
      </Kicker>
    </FadeIn>

    {/* List of generic advice — fades in at frame 62, struck through over time */}
    <FadeInOut
      startFrame={62}
      visibleFrames={680}
      outDuration={20}
      style={{ position: "absolute", left: 200, right: 200, top: 660 }}
    >
      <Caps tracking={6} size={20} color={colors.fg.slate500}>
        EVERY ARTICLE TELLS YOU:
      </Caps>
      <div style={{ marginTop: 30 }}>
        {[
          "Master your timing.",
          "Use callbacks.",
          "Self-deprecate.",
          "Observe like a comedian.",
        ].map((s) => (
          <div key={s} style={{ position: "relative", marginTop: 14 }}>
            <Kicker size={32} color={colors.fg.slate500} style={{ fontStyle: "italic" }}>
              {s}
            </Kicker>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: -10,
                width: "calc(100% + 20px)",
                height: 3,
                background: colors.accent.red,
                opacity: 0.7,
              }}
            />
          </div>
        ))}
      </div>
    </FadeInOut>

    {/* Open loop tease at "three moves" */}
    <FadeIn
      startFrame={766}
      style={{ position: "absolute", left: 0, right: 0, top: 660, textAlign: "center" }}
    >
      <Title size={120}>
        3 moves. <span style={{ color: colors.accent.red }}>1 anti-move.</span>
      </Title>
    </FadeIn>

    {/* Time-bound promise badge */}
    <FadeIn
      startFrame={1065}
      style={{ position: "absolute", left: 0, right: 0, top: 830, textAlign: "center" }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "16px 40px",
          background: colors.accent.orange,
          borderRadius: 30,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 4,
          color: colors.bg.slate900,
        }}
      >
        IN 4 MINUTES
      </div>
    </FadeIn>

    {/* Explicit stakes */}
    <FadeIn
      startFrame={1115}
      style={{ position: "absolute", left: 0, right: 0, bottom: 100, textAlign: "center" }}
    >
      <Kicker size={32} color={colors.accent.red}>
        every minute you spend trying — the real funny moment is happening.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 2 — fMRI / Charles Limb (56.00s) — citation magnet
// Internal beats:
//   0     "in 2008" — attribution card appears
//   100   brain outline drops in
//   484   "dorsolateral" — DLPFC region labeled QUIET (greyed)
//   723   "lit up" — mPFC region labeled ACTIVE (red)
//   759   "translation" — callout
//   1068  "same idea" — bandwidth callback
// =====================================================================
const Peak2: React.FC = () => {
  const brainCY = 540;
  return (
    <BaseFrame>
      <PeakBadge num={2} label="the brain switch" />

      {/* Attribution card */}
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 100, textAlign: "center" }}>
        <Caps tracking={8} size={22} color={colors.fg.slate400}>
          CHARLES LIMB · 2008 · fMRI STUDY
        </Caps>
      </FadeIn>

      {/* Brain outline (simplified — two ovals representing the regions) */}
      <FadeIn
        startFrame={100}
        style={{ position: "absolute", left: 0, right: 0, top: 240, textAlign: "center" }}
      >
        <Title size={80} color={colors.fg.white}>
          When you improvise,
        </Title>
        <div style={{ marginTop: 24 }}>
          <Title size={80} color={colors.fg.slate300}>
            two brain regions <span style={{ color: colors.accent.red }}>flip.</span>
          </Title>
        </div>
      </FadeIn>

      {/* Two region cards — DLPFC (left, greyed/quiet) and mPFC (right, lit/active) */}
      <FadeIn startFrame={484} style={{ position: "absolute", left: 200, top: brainCY }}>
        <div
          style={{
            width: 680,
            height: 280,
            background: colors.bg.slate800,
            border: `4px solid ${colors.fg.slate600}`,
            borderRadius: 16,
            padding: 32,
          }}
        >
          <Caps tracking={6} size={20} color={colors.fg.slate400}>
            DLPFC
          </Caps>
          <Title size={56} color={colors.fg.slate300} style={{ marginTop: 12 }}>
            Self-monitor
          </Title>
          <div style={{ marginTop: 32 }}>
            <Caps tracking={8} size={28} color={colors.fg.slate500}>
              QUIET
            </Caps>
          </div>
        </div>
      </FadeIn>

      <FadeIn startFrame={723} style={{ position: "absolute", left: 1040, top: brainCY }}>
        <div
          style={{
            width: 680,
            height: 280,
            background: "rgba(239,68,68,0.18)",
            border: `4px solid ${colors.accent.red}`,
            borderRadius: 16,
            padding: 32,
          }}
        >
          <Caps tracking={6} size={20} color={colors.accent.red}>
            mPFC
          </Caps>
          <Title size={56} color={colors.fg.white} style={{ marginTop: 12 }}>
            Honest expression
          </Title>
          <div style={{ marginTop: 32 }}>
            <Caps tracking={8} size={28} color={colors.accent.red}>
              ACTIVE
            </Caps>
          </div>
        </div>
      </FadeIn>

      {/* Translation kicker */}
      <FadeIn
        startFrame={759}
        style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
      >
        <Kicker size={36}>the inner critic switches off so creativity can run.</Kicker>
      </FadeIn>

      {/* Bandwidth callback */}
      <FadeInOut
        startFrame={1068}
        visibleFrames={500}
        style={{ position: "absolute", left: 0, right: 0, top: 980, textAlign: "center" }}
      >
        <Caps tracking={6} size={18} color={colors.accent.orange}>
          ↳ SAME BANDWIDTH PROBLEM AS OVERTHINKING
        </Caps>
      </FadeInOut>

      <Watermark />
    </BaseFrame>
  );
};

// =====================================================================
// Peak 3 — MOVE 1: HONESTY (64.62s) — contains midpoint reveal
// Internal beats:
//   0     "move one" — header
//   483   email/job quote card
//   1193  "Keith Johnstone" attribution
//   1361  paradox quote (THE midpoint reveal — citation magnet)
//   1582  paradox interpretation
// =====================================================================
const Peak3: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={3} label="move 1" />

    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        MOVE 1
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
      <Title size={200}>Honesty.</Title>
    </FadeIn>
    <FadeIn startFrame={20} style={{ position: "absolute", left: 100, top: 380 }}>
      <Kicker size={42} color={colors.fg.slate400}>
        not jokes.
      </Kicker>
    </FadeIn>

    {/* Quote card — fades in when audio hits the line, stays through Johnstone setup */}
    <FadeInOut
      startFrame={483}
      visibleFrames={680}
      style={{ position: "absolute", left: 100, right: 100, top: 480 }}
    >
      <div
        style={{
          background: colors.bg.slate800,
          border: `2px solid ${colors.fg.slate600}`,
          borderRadius: 16,
          padding: "40px 60px",
        }}
      >
        <Caps tracking={6} size={18} color={colors.fg.slate400}>
          THE UNEXPECTEDLY TRUE BEAT:
        </Caps>
        <div
          style={{
            marginTop: 24,
            fontFamily: '"Playfair Display", serif',
            fontWeight: 900,
            fontSize: 56,
            color: colors.fg.white,
            lineHeight: 1.2,
          }}
        >
          {'"I don\'t hate my job. I hate that my job requires me to pretend I read the emails."'}
        </div>
      </div>
    </FadeInOut>

    {/* Johnstone paradox — the midpoint reveal, isolated for max weight */}
    <FadeIn
      startFrame={1193}
      style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center" }}
    >
      <Caps tracking={8} size={22} color={colors.accent.orange}>
        KEITH JOHNSTONE · 1979
      </Caps>
    </FadeIn>

    <FadeIn
      startFrame={1361}
      duration={20}
      style={{ position: "absolute", left: 0, right: 0, top: 480, textAlign: "center" }}
    >
      <div
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 320,
          color: colors.accent.red,
          opacity: 0.4,
          lineHeight: 0.7,
          marginBottom: -100,
        }}
      >
        “
      </div>
      <Title size={80}>
        The more obvious an improviser is,
        <br />
        the more <span style={{ color: colors.accent.red }}>original</span> he appears.
      </Title>
    </FadeIn>

    <FadeIn
      startFrame={1582}
      style={{ position: "absolute", left: 0, right: 0, bottom: 80, textAlign: "center" }}
    >
      <Kicker size={32}>
        first thought: connected to the moment. second thought: ego trying to be impressive.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 4 — MOVE 2: SPECIFICITY (42.74s)
// Internal beats:
//   0     "move two" — header
//   137   "My boss is annoying" — generic version (struck through)
//   137+  Zoom call quote — the specific version (right after)
//   1069  "be more specific" — kicker
// =====================================================================
const Peak4: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={4} label="move 2" />

    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        MOVE 2
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
      <Title size={200}>Specificity.</Title>
    </FadeIn>
    <FadeIn startFrame={20} style={{ position: "absolute", left: 100, top: 380 }}>
      <Kicker size={42} color={colors.fg.slate400}>
        not exaggeration.
      </Kicker>
    </FadeIn>

    {/* Generic version — struck through */}
    <FadeIn startFrame={137} style={{ position: "absolute", left: 100, right: 100, top: 510 }}>
      <Caps tracking={6} size={20} color={colors.fg.slate400}>
        ABSTRACT (NOT FUNNY):
      </Caps>
      <div style={{ marginTop: 24, position: "relative" }}>
        <Title size={64} color={colors.fg.slate500} style={{ opacity: 0.6 }}>
          {`"My boss is annoying."`}
        </Title>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: -10,
            width: "70%",
            height: 5,
            background: colors.accent.red,
            opacity: 0.7,
          }}
        />
      </div>
    </FadeIn>

    {/* Specific version — fades in shortly after */}
    <FadeIn startFrame={250} style={{ position: "absolute", left: 100, right: 100, top: 720 }}>
      <Caps tracking={6} size={20} color={colors.ok.green}>
        SPECIFIC (FUNNY):
      </Caps>
      <div
        style={{
          marginTop: 24,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 900,
          fontSize: 44,
          color: colors.fg.white,
          lineHeight: 1.25,
        }}
      >
        {`"My boss starts every Zoom call by saying 'Can everyone see my screen?' and waits 30 seconds for confirmation from each individual person."`}
      </div>
    </FadeIn>

    {/* Bottom kicker */}
    <FadeIn startFrame={1069} style={{ position: "absolute", left: 100, right: 100, bottom: 60 }}>
      <div
        style={{
          height: 70,
          background: "rgba(34,197,94,0.12)",
          border: `1px solid ${colors.ok.green}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Kicker size={30} color={colors.ok.green}>
          the precise detail reveals the absurdity that was already there.
        </Kicker>
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 5 — MOVE 3: PATTERN RECOGNITION (47.46s)
// Internal beats:
//   0     "move three" — header
//   215   "finding the game of the scene" — UCB attribution
//   485   "apologizes for" — apology pattern setup
//   636   "if they apologize for the weather... for being born" — escalation
//   1378  "you already use this skill" — closing kicker
// =====================================================================
const Peak5: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={5} label="move 3" />

    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        MOVE 3
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
      <Title size={156}>Pattern recognition.</Title>
    </FadeIn>
    <FadeIn startFrame={20} style={{ position: "absolute", left: 100, top: 350 }}>
      <Kicker size={42} color={colors.fg.slate400}>
        not joke construction.
      </Kicker>
    </FadeIn>

    {/* UCB attribution */}
    <FadeIn startFrame={215} style={{ position: "absolute", left: 100, top: 480 }}>
      <Caps tracking={6} size={20} color={colors.accent.orange}>
        {'UPRIGHT CITIZENS BRIGADE: "FIND THE GAME OF THE SCENE"'}
      </Caps>
    </FadeIn>

    {/* Pattern: apology escalation chain */}
    <FadeIn startFrame={485} style={{ position: "absolute", left: 100, top: 580 }}>
      <Title size={48} color={colors.fg.slate300}>
        {"Friend always apologizes for things that aren't their fault."}
      </Title>
    </FadeIn>

    <FadeInOut
      startFrame={636}
      visibleFrames={600}
      style={{ position: "absolute", left: 100, right: 100, top: 700 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 24 }}>
        <div
          style={{
            flex: 1,
            padding: "24px 32px",
            background: "rgba(15,23,42,0.55)",
            border: `2px solid ${colors.fg.slate600}`,
            borderRadius: 12,
          }}
        >
          <Caps tracking={4} size={18} color={colors.fg.slate400}>
            STEP 1
          </Caps>
          <Title size={36} style={{ marginTop: 8 }}>{`"Sorry the weather"`}</Title>
        </div>
        <Title size={56} color={colors.accent.orange}>
          →
        </Title>
        <div
          style={{
            flex: 1,
            padding: "24px 32px",
            background: "rgba(239,68,68,0.18)",
            border: `2px solid ${colors.accent.red}`,
            borderRadius: 12,
          }}
        >
          <Caps tracking={4} size={18} color={colors.accent.red}>
            STEP 2 (FUNNIER)
          </Caps>
          <Title size={36} style={{ marginTop: 8 }}>{`"Sorry for being born"`}</Title>
        </div>
      </div>
    </FadeInOut>

    {/* Closing kicker */}
    <FadeIn startFrame={1378} style={{ position: "absolute", left: 100, right: 100, bottom: 60 }}>
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
        <Kicker size={30}>
          you already use this skill at work — to solve problems instead of illuminate them.
        </Kicker>
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 6 — ANTIPATTERN: PERFORMING CLEVERNESS (35.08s)
// Internal beats:
//   0     "now the antipattern" — header in
//   200   "performing cleverness" — big label
//   359   "pre-composed zinger" — illustration
//   793   "with someone" — green
//   908   "at someone" — red
// =====================================================================
const Peak6: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={6} label="the antipattern" />

    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 100, textAlign: "center" }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        ⚠ THE ANTIPATTERN
      </Caps>
    </FadeIn>

    <FadeIn
      startFrame={200}
      duration={16}
      style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
    >
      <Title size={156}>
        Performing <span style={{ color: colors.accent.red }}>Cleverness.</span>
      </Title>
    </FadeIn>

    <FadeIn startFrame={359} style={{ position: "absolute", left: 100, right: 100, top: 480 }}>
      <Kicker size={36} color={colors.fg.slate400}>
        {"the person waiting for an opening to deliver their pre-composed zinger."}
      </Kicker>
    </FadeIn>

    {/* WITH vs AT contrast */}
    <FadeIn startFrame={793} style={{ position: "absolute", left: 100, top: 700, width: 800 }}>
      <div
        style={{
          background: "rgba(34,197,94,0.18)",
          border: `2px solid ${colors.ok.green}`,
          borderRadius: 16,
          padding: "30px 40px",
          textAlign: "center",
        }}
      >
        <Caps tracking={6} size={22} color={colors.ok.green}>
          FUNNY <em style={{ fontStyle: "normal", fontSize: 32, color: colors.ok.green }}>WITH</em>{" "}
          SOMEONE
        </Caps>
        <Title size={48} style={{ marginTop: 16 }} color={colors.fg.white}>
          builds connection
        </Title>
      </div>
    </FadeIn>

    <FadeIn startFrame={908} style={{ position: "absolute", right: 100, top: 700, width: 800 }}>
      <div
        style={{
          background: "rgba(239,68,68,0.18)",
          border: `2px solid ${colors.accent.red}`,
          borderRadius: 16,
          padding: "30px 40px",
          textAlign: "center",
        }}
      >
        <Caps tracking={6} size={22} color={colors.accent.red}>
          FUNNY <em style={{ fontStyle: "normal", fontSize: 32, color: colors.accent.red }}>AT</em>{" "}
          SOMEONE
        </Caps>
        <Title size={48} style={{ marginTop: 16 }} color={colors.fg.slate300}>
          interrupts it
        </Title>
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 7 — CLOSING (51.38s)
// Internal beats:
//   0     "three moves honesty" — recap card in
//   472   "censor" — insight callback
//   796   URL bar + book ref
//   1431  "Stop trying. Start noticing." — final callback
// =====================================================================
const Peak7: React.FC = () => {
  const moves = [
    { n: "1", label: "HONESTY" },
    { n: "2", label: "SPECIFICITY" },
    { n: "3", label: "PATTERN" },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={7} label="the closing" />

      {/* 3-move recap — exits before final callback enters at frame 1431 */}
      <FadeInOut
        startFrame={0}
        visibleFrames={1390}
        inDuration={14}
        outDuration={20}
        style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center" }}
      >
        <Title size={72} color={colors.fg.slate300}>
          three moves.
        </Title>
      </FadeInOut>
      <FadeInOut
        startFrame={20}
        visibleFrames={1380}
        inDuration={14}
        outDuration={20}
        style={{ position: "absolute", left: 0, right: 0, top: 280 }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
          {moves.map((m) => (
            <div
              key={m.label}
              style={{
                width: 380,
                height: 200,
                background: colors.bg.slate900,
                border: `2px solid ${colors.accent.orange}`,
                borderRadius: 16,
                padding: 24,
                textAlign: "center",
              }}
            >
              <Title size={56} color={colors.accent.orange}>
                {m.n}
              </Title>
              <div style={{ marginTop: 30 }}>
                <Caps tracking={4} size={26}>
                  {m.label}
                </Caps>
              </div>
            </div>
          ))}
        </div>
      </FadeInOut>

      <FadeInOut
        startFrame={120}
        visibleFrames={1290}
        inDuration={14}
        outDuration={20}
        style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
      >
        <Title size={56} color={colors.fg.slate300}>
          plus one anti-move:
        </Title>
        <div style={{ marginTop: 16 }}>
          <Title size={72} color={colors.accent.red}>
            stop performing.
          </Title>
        </div>
      </FadeInOut>

      {/* Censor insight */}
      <FadeInOut
        startFrame={472}
        visibleFrames={300}
        style={{ position: "absolute", left: 100, right: 100, top: 800 }}
      >
        <div
          style={{
            height: 100,
            background: "rgba(15,23,42,0.6)",
            border: `2px solid ${colors.fg.slate600}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 40px",
          }}
        >
          <Kicker size={30}>
            stop the censor that was suppressing the real, specific, weird thing you already
            noticed.
          </Kicker>
        </div>
      </FadeInOut>

      {/* URL bar */}
      <FadeInOut
        startFrame={796}
        visibleFrames={500}
        style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center" }}
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
              fontSize: 36,
              color: colors.accent.orange,
            }}
          >
            physicsofconnection.com/how-to-be-funny
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Caps tracking={4} size={20} color={colors.fg.slate400}>
            {'+ "TRUTH IN COMEDY" · CLOSE / HALPERN / JOHNSON · 1994'}
          </Caps>
        </div>
      </FadeInOut>

      {/* Final callback */}
      <FadeIn
        startFrame={1431}
        duration={16}
        style={{ position: "absolute", left: 0, right: 0, top: 600, textAlign: "center" }}
      >
        <Title size={120} color={colors.fg.white}>
          Stop trying.
        </Title>
        <div style={{ marginTop: 32 }}>
          <Title size={120} color={colors.accent.orange}>
            Start noticing.
          </Title>
        </div>
      </FadeIn>

      <Watermark />
    </BaseFrame>
  );
};

const PEAKS = [Peak1, Peak2, Peak3, Peak4, Peak5, Peak6, Peak7];

export const L2HowToBeFunny: React.FC = () => (
  <>
    <Audio src={staticFile("audio/04-how-to-be-funny.mp3")} />
    <Series>
      {L2_PEAKS.map((peak, i) => {
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
