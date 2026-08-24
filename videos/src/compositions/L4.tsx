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

// Peak timings synced to dead-air-compressed v2 audio. Audio: 312.54s.
// Anchors verified against docs/youtube-week-3/L4-timings.json (SOP 11 audit).
export const L4_PEAKS = [
  { id: "01-hook", durationInFrames: 136 }, // 0.12 - 4.64s
  { id: "02-stuck", durationInFrames: 645 }, // 4.64 - 26.14s
  { id: "03-stakes", durationInFrames: 248 }, // 26.14 - 34.40s
  { id: "04-gap-openloop", durationInFrames: 931 }, // 34.40 - 65.44s
  { id: "05-fmri", durationInFrames: 1357 }, // 65.44 - 110.66s
  { id: "06-del-close", durationInFrames: 466 }, // 110.66 - 126.19s
  { id: "07-snl-io", durationInFrames: 605 }, // 126.19 - 146.34s
  { id: "08-move1-fail-faster", durationInFrames: 1352 }, // 146.34 - 191.42s
  { id: "09-move2-move-immediately", durationInFrames: 1049 }, // 191.42 - 226.40s
  { id: "10-move3-event-vs-meaning", durationInFrames: 970 }, // 226.40 - 258.74s
  { id: "11-close", durationInFrames: 1614 }, // 258.74 - 312.54s
];
export const L4_DURATION = L4_PEAKS.reduce((s, p) => s + p.durationInFrames, 0);

// =====================================================================
// Peak 1 · Hook (4.52s, 136f)
// "Rejection doesn't break you. The freeze does."
// Beat anchors (peak-relative):
//   0    "Rejection" (audio 0.12s)
//   ~75  "freeze does" (audio ~2.7s)
const Peak1Hook: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={1} label="the hook" />
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 320, textAlign: "center" }}>
      <Title
        size={92}
        color={colors.fg.slate500}
        style={{ position: "relative", display: "inline-block" }}
      >
        Rejection doesn&apos;t break you.
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: -12,
            width: "calc(100% + 24px)",
            height: 6,
            background: colors.accent.red,
            opacity: 0.85,
          }}
        />
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={75}
      style={{ position: "absolute", left: 0, right: 0, top: 530, textAlign: "center" }}
    >
      <Title size={148}>The freeze does.</Title>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 2 · You're stuck (21.5s, 645f)
// Beat anchors:
//   0    "You sent the email" (audio 4.64s)
//   78   "you made the pitch" (audio 7.24s)
//   145  "you asked the question" (audio ~9.5s)
//   177  "They said no" (audio 10.54s) ← red drop
//   386  "you're not applying" (audio 17.50s) ← freeze list
const Peak2Stuck: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={2} label="you're stuck" />
    <FadeIn style={{ position: "absolute", left: 200, top: 200 }}>
      <Title size={56} color={colors.fg.slate300}>
        You sent the email.
      </Title>
    </FadeIn>
    <FadeIn startFrame={78} style={{ position: "absolute", left: 200, top: 290 }}>
      <Title size={56} color={colors.fg.slate300}>
        You made the pitch.
      </Title>
    </FadeIn>
    <FadeIn startFrame={145} style={{ position: "absolute", left: 200, top: 380 }}>
      <Title size={56} color={colors.fg.slate300}>
        You asked the question.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={177}
      style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
    >
      <Title size={120} color={colors.accent.red}>
        They said no.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={386}
      style={{ position: "absolute", left: 0, right: 0, top: 760, textAlign: "center" }}
    >
      <Caps tracking={6} size={28} color={colors.fg.slate400}>
        NOW YOU&apos;RE NOT
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Kicker size={48} color={colors.fg.slate300}>
          applying. sending. moving.
        </Kicker>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 3 · Stakes — year that slips (8.26s, 248f)
// Beat anchors:
//   0    "Each freeze is a job" (audio 26.14s)
//   87   "a pitch you don't send" (audio 29.04s)
//   199  "a year that slips" (audio 32.78s)
const Peak3Stakes: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={3} label="the cost" />
    <Caps
      tracking={6}
      size={28}
      color={colors.accent.red}
      style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
    >
      EACH FREEZE COSTS:
    </Caps>
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center" }}>
      <Title size={68} color={colors.fg.slate300}>
        A job you don&apos;t apply to.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={87}
      style={{ position: "absolute", left: 0, right: 0, top: 410, textAlign: "center" }}
    >
      <Title size={68} color={colors.fg.slate300}>
        A pitch you don&apos;t send.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={199}
      style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center" }}
    >
      <Title size={132} color={colors.accent.red}>
        A year that slips.
      </Title>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 4 · Gap reveal + open loop (31.04s, 931f)
// Beat anchors:
//   0    "That gap" (audio 34.40s)
//   206  "the freeze" (audio 41.26s) ← label drops
//   316  "shorten the gap?" (audio 44.92s) ← question
//   391  "I wanna show you what improv" (audio 47.44s) ← improv promise
//   748  "three specific moves" (audio 59.32s)
const Peak4Gap: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={4} label="the gap" />

    {/* Diagram: REJECTION ←gap→ NEXT ACTION */}
    <FadeIn style={{ position: "absolute", left: 120, top: 280 }}>
      <Caps tracking={6} size={28} color={colors.fg.slate400}>
        REJECTION
      </Caps>
      <Title size={88}>{`"No."`}</Title>
    </FadeIn>
    <FadeIn style={{ position: "absolute", right: 120, top: 280, textAlign: "right" }}>
      <Caps tracking={6} size={28} color={colors.fg.slate400}>
        NEXT ACTION
      </Caps>
      <Title size={88}>{`?`}</Title>
    </FadeIn>
    <FadeIn
      style={{
        position: "absolute",
        left: 480,
        right: 480,
        top: 360,
        height: 8,
        background: colors.fg.slate600,
        opacity: 0.6,
      }}
    >
      {""}
    </FadeIn>

    {/* "THE FREEZE" label drops into the gap */}
    <FadeIn
      startFrame={206}
      style={{ position: "absolute", left: 0, right: 0, top: 430, textAlign: "center" }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "16px 40px",
          background: colors.accent.red,
          borderRadius: 12,
        }}
      >
        <Caps tracking={8} size={28} color={colors.fg.white}>
          THE FREEZE
        </Caps>
      </div>
    </FadeIn>

    {/* Question */}
    <FadeInOut
      startFrame={316}
      visibleFrames={70}
      style={{ position: "absolute", left: 0, right: 0, top: 580, textAlign: "center" }}
    >
      <Kicker size={56} color={colors.accent.orange}>
        How do you shorten the gap?
      </Kicker>
    </FadeInOut>

    {/* Improv promise */}
    <FadeIn
      startFrame={391}
      style={{ position: "absolute", left: 0, right: 0, top: 580, textAlign: "center" }}
    >
      <Title size={84}>Improv performers.</Title>
    </FadeIn>

    {/* Open loop pill */}
    <FadeIn
      startFrame={748}
      style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center" }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "16px 36px",
          background: colors.ok.green,
          borderRadius: 30,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 4,
          color: colors.bg.slate900,
        }}
      >
        3 MOVES YOU CAN BORROW TONIGHT
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 5 · fMRI mechanism (45.22s, 1357f)
// Beat anchors:
//   0     "But first" (audio 65.44s)
//   128   "In 2003" (audio 69.70s) ← study citation
//   298   "Eisenberger, Lieberman, Williams" (audio 75.36s)
//   588   "anterior cingulate cortex" (audio 85.04s) ← brain reveal
//   848   "broken arm and rejected pitch" (audio 93.72s)
//   1052  "just get over it" struck through (audio 100.51s)
//   1197  "Now what?" (audio 105.34s)
const Peak5FMRI: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={5} label="the science" />

    {/* Question */}
    <FadeInOut
      startFrame={0}
      visibleFrames={100}
      style={{ position: "absolute", left: 0, right: 0, top: 280, textAlign: "center" }}
    >
      <Title size={84}>Why does it hurt so much?</Title>
    </FadeInOut>

    {/* Citation block */}
    <FadeIn
      startFrame={128}
      style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
    >
      <Caps tracking={8} size={28} color={colors.accent.orange}>
        2003 · UCLA
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={56}>Eisenberger, Lieberman & Williams</Title>
      </div>
    </FadeIn>

    {/* fMRI / brain region label */}
    <FadeIn
      startFrame={588}
      style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center" }}
    >
      <Caps tracking={6} size={26} color={colors.fg.slate400}>
        WHAT LIT UP IN THE SCAN:
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={88} color={colors.accent.red}>
          Anterior cingulate cortex.
        </Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Kicker size={36} color={colors.fg.slate400}>
          (the same circuit that processes physical pain)
        </Kicker>
      </div>
    </FadeIn>

    {/* Side-by-side comparison */}
    <FadeIn
      startFrame={848}
      style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center" }}
    >
      <div style={{ display: "inline-flex", gap: 80, alignItems: "center" }}>
        <div>
          <Caps tracking={6} size={22} color={colors.fg.slate400}>
            BROKEN ARM
          </Caps>
        </div>
        <Title size={48} color={colors.fg.slate500}>
          =
        </Title>
        <div>
          <Caps tracking={6} size={22} color={colors.fg.slate400}>
            REJECTED PITCH
          </Caps>
        </div>
      </div>
    </FadeIn>

    {/* "Just get over it" struck through */}
    <FadeIn
      startFrame={1052}
      style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <Kicker size={42} color={colors.fg.slate500}>{`"just get over it"`}</Kicker>
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: -8,
            width: "calc(100% + 16px)",
            height: 4,
            background: colors.accent.red,
            opacity: 0.85,
          }}
        />
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 6 · Del Close + quote (15.53s, 466f) — MIDPOINT REVEAL
// Beat anchors:
//   0    "Del Close, godfather" (audio 110.66s)
//   119  "Tina Fey, Stephen Colbert, Amy Poehler" (audio 114.64s)
//   229  "had one line for it" (audio 118.28s)
//   275+ Quote begins (audio 119.84s)
const Peak6DelClose: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={6} label="del close" />

    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center" }}>
      <Caps tracking={8} size={26} color={colors.accent.orange}>
        1934 — 1999
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={132}>Del Close.</Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Kicker size={36} color={colors.fg.slate400}>
          godfather of long-form improv
        </Kicker>
      </div>
    </FadeIn>

    {/* Students reveal */}
    <FadeInOut
      startFrame={119}
      visibleFrames={90}
      style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
    >
      <Caps tracking={6} size={24} color={colors.fg.slate400}>
        HE TAUGHT
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={56} color={colors.fg.slate300}>
          Fey · Colbert · Poehler
        </Title>
      </div>
    </FadeInOut>

    {/* Quote intro */}
    <FadeInOut
      startFrame={229}
      visibleFrames={40}
      style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
    >
      <Caps tracking={8} size={28} color={colors.fg.slate400}>
        HAD ONE LINE FOR IT:
      </Caps>
    </FadeInOut>

    {/* The quote — midpoint reveal */}
    <FadeIn
      startFrame={275}
      style={{ position: "absolute", left: 100, right: 100, top: 580, textAlign: "center" }}
    >
      <Kicker size={64} color={colors.fg.white} style={{ lineHeight: 1.25 }}>
        “Fall, then figure out
        <br />
        what to do on the way down.”
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 7 · Worked example: SNL → iO (20.15s, 605f)
// Beat anchors:
//   0    "was fired from Saturday Night Live" (audio 126.19s)
//   194  "didn't write a memoir" (audio 132.67s)
//   276  "moved to Chicago, founded iO" (audio 135.41s)
//   374  "entire generation of comedy" (audio 138.68s)
//   484  "fall was real, figuring out happened in motion" (audio 142.32s)
const Peak7SNLtoIO: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={7} label="he lived it" />

    {/* 1975 fired */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        1975
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={108} color={colors.accent.red}>
          Fired from SNL.
        </Title>
      </div>
    </FadeIn>

    {/* Arrow / transition */}
    <FadeIn
      startFrame={276}
      style={{ position: "absolute", left: 0, right: 0, top: 480, textAlign: "center" }}
    >
      <Caps tracking={8} size={26} color={colors.fg.slate400}>
        ↓ MOVED TO CHICAGO
      </Caps>
    </FadeIn>

    {/* iO */}
    <FadeIn
      startFrame={374}
      style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center" }}
    >
      <Title size={108} color={colors.ok.green}>
        Founded iO.
      </Title>
      <div style={{ marginTop: 16 }}>
        <Kicker size={36} color={colors.fg.slate400}>
          trained an entire generation of comedy
        </Kicker>
      </div>
    </FadeIn>

    {/* Closing kicker */}
    <FadeIn
      startFrame={484}
      style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
    >
      <Kicker size={36} color={colors.fg.slate300}>
        the fall was real. the figuring out happened in motion.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 8 · Move 1 · Fail faster (45.08s, 1352f)
// Beat anchors:
//   0     "What did Del actually do? Three moves." (audio 146.34s)
//   145   "fail faster" (audio 151.19s) ← title
//   365   "deliberately" (audio 158.52s)
//   628   "predicts disaster. actual cost is discomfort" (audio 167.28s)
//   978   "Prolonged Exposure Therapy" (audio 178.94s)
//   1139  "Foa, Hembree & Rothbaum, 2007" (audio 184.30s)
const Peak8Move1: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={8} label="move 1" />

    {/* Question intro */}
    <FadeInOut
      startFrame={0}
      visibleFrames={130}
      style={{ position: "absolute", left: 0, right: 0, top: 320, textAlign: "center" }}
    >
      <Kicker size={64} color={colors.accent.orange}>
        What did Del actually do?
      </Kicker>
    </FadeInOut>

    {/* Big move title */}
    <FadeIn
      startFrame={145}
      style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
    >
      <Caps tracking={8} size={32} color={colors.accent.orange}>
        MOVE ONE
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={148}>Fail faster.</Title>
      </div>
    </FadeIn>

    {/* Action verbs */}
    <FadeIn
      startFrame={365}
      style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
    >
      <div style={{ display: "inline-flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>
        <Caps tracking={4} size={28} color={colors.fg.slate300}>
          SEND THE APPLICATION.
        </Caps>
        <Caps tracking={4} size={28} color={colors.fg.slate300}>
          MAKE THE OFFER.
        </Caps>
        <Caps tracking={4} size={28} color={colors.fg.slate300}>
          TAKE THE SWING.
        </Caps>
      </div>
    </FadeIn>

    {/* Predicted vs actual */}
    <FadeIn
      startFrame={628}
      style={{ position: "absolute", left: 0, right: 0, top: 660, textAlign: "center" }}
    >
      <div style={{ display: "inline-flex", gap: 100, alignItems: "center" }}>
        <div>
          <Caps tracking={6} size={22} color={colors.fg.slate400}>
            PREDICTED
          </Caps>
          <div style={{ marginTop: 8 }}>
            <Title size={56} color={colors.accent.red}>
              Disaster.
            </Title>
          </div>
        </div>
        <Title size={48} color={colors.fg.slate500}>
          →
        </Title>
        <div>
          <Caps tracking={6} size={22} color={colors.fg.slate400}>
            ACTUAL
          </Caps>
          <div style={{ marginTop: 8 }}>
            <Title size={56} color={colors.ok.green}>
              Discomfort.
            </Title>
          </div>
        </div>
      </div>
    </FadeIn>

    {/* Citation */}
    <FadeIn
      startFrame={978}
      style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center" }}
    >
      <Kicker size={28} color={colors.fg.slate400}>
        Prolonged Exposure Therapy · Foa, Hembree & Rothbaum (2007)
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 9 · Move 2 · Move immediately (34.98s, 1049f)
// Beat anchors:
//   0    "Two, move immediately" (audio 191.42s)
//   270  "Improv removes the gap by design" (audio 200.42s)
//   371  "next scene starts in 30 seconds" (audio 203.80s)
//   589  "next action as fast as possible" (audio 211.06s)
//   796  "next role, next pitch, next question" (audio 217.96s)
const Peak9Move2: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={9} label="move 2" />

    {/* Title */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}>
      <Caps tracking={8} size={32} color={colors.accent.orange}>
        MOVE TWO
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={148}>Move immediately.</Title>
      </div>
    </FadeIn>

    {/* Diagram: gap removed */}
    <FadeIn
      startFrame={270}
      style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
    >
      <div style={{ display: "inline-flex", gap: 60, alignItems: "center" }}>
        <Caps tracking={6} size={28} color={colors.accent.red}>
          REJECTION
        </Caps>
        <Title size={64} color={colors.ok.green}>
          →
        </Title>
        <Caps tracking={6} size={28} color={colors.ok.green}>
          NEXT
        </Caps>
      </div>
      <div style={{ marginTop: 20 }}>
        <Kicker size={32} color={colors.fg.slate400}>
          (no gap)
        </Kicker>
      </div>
    </FadeIn>

    {/* 30 seconds */}
    <FadeIn
      startFrame={371}
      style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center" }}
    >
      <Title size={92} color={colors.accent.orange}>
        30 seconds
      </Title>
      <div style={{ marginTop: 8 }}>
        <Kicker size={28} color={colors.fg.slate400}>
          between one rejection and the next attempt
        </Kicker>
      </div>
    </FadeIn>

    {/* Three "next" actions */}
    <FadeIn
      startFrame={796}
      style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center" }}
    >
      <Caps tracking={6} size={26} color={colors.fg.slate300}>
        NEXT ROLE · NEXT PITCH · NEXT QUESTION
      </Caps>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 10 · Move 3 · Event vs meaning (32.34s, 970f)
// Beat anchors:
//   0    "Three, separate the event from the meaning" (audio 226.40s)
//   110  "Your boss didn't like the proposal" (audio 230.08s)
//   225  "I'm not valued here" (audio 233.90s)
//   406  "event is a fact. meaning is a story" (audio 239.94s)
//   854  "failure is real. identity is optional" (audio 254.88s)
const Peak10Move3: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={10} label="move 3" />

    {/* Title */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center" }}>
      <Caps tracking={8} size={32} color={colors.accent.orange}>
        MOVE THREE
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={108}>Event vs meaning.</Title>
      </div>
    </FadeIn>

    {/* Event line */}
    <FadeIn startFrame={110} style={{ position: "absolute", left: 200, top: 460 }}>
      <Caps tracking={6} size={26} color={colors.fg.slate400}>
        EVENT
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={48} color={colors.fg.white}>
          Boss didn&apos;t like the proposal.
        </Title>
      </div>
    </FadeIn>

    {/* Meaning line */}
    <FadeIn startFrame={225} style={{ position: "absolute", left: 200, top: 620 }}>
      <Caps tracking={6} size={26} color={colors.accent.red}>
        MEANING (the story)
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={48} color={colors.accent.red}>{`"I'm not valued here."`}</Title>
      </div>
    </FadeIn>

    {/* Fact vs story */}
    <FadeIn
      startFrame={406}
      style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center" }}
    >
      <div style={{ display: "inline-flex", gap: 60, alignItems: "center" }}>
        <Caps tracking={6} size={32} color={colors.fg.slate300}>
          FACT
        </Caps>
        <Title size={36} color={colors.fg.slate500}>
          vs
        </Title>
        <Caps tracking={6} size={32} color={colors.accent.orange}>
          STORY
        </Caps>
      </div>
    </FadeIn>

    {/* Closing kicker */}
    <FadeIn
      startFrame={854}
      style={{ position: "absolute", left: 0, right: 0, top: 920, textAlign: "center" }}
    >
      <Kicker size={32} color={colors.fg.slate300}>
        failure: real. identity conclusion: optional.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 11 · Long-game + CTA + callback (53.80s, 1614f)
// Beat anchors:
//   0     "improvisers who reach the highest level" (audio 258.74s)
//   406   "courage as a practiced habit" (audio 272.28s)
//   643   "send the message you've been holding back" (audio 280.16s)
//   844   "do not freeze" (audio 286.87s)
//   999   "Fall, then figure out" (audio 292.04s) ← callback to midpoint
//   1066  "I unpacked the science" (audio 294.26s) ← CTA
//   1498  "Rejection isn't the problem. The freeze is." (audio 308.66s) ← HOOK CALLBACK
const Peak11Close: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={11} label="closing" />

    {/* Long-game wisdom */}
    <FadeInOut
      startFrame={0}
      visibleFrames={580}
      style={{ position: "absolute", left: 0, right: 0, top: 280, textAlign: "center" }}
    >
      <Caps tracking={6} size={28} color={colors.fg.slate400}>
        THE LONG GAME:
      </Caps>
      <div style={{ marginTop: 24 }}>
        <Title size={84}>Courage as a habit.</Title>
      </div>
      <div style={{ marginTop: 16 }}>
        <Kicker size={36} color={colors.fg.slate400}>
          built through hundreds of small failures
        </Kicker>
      </div>
    </FadeInOut>

    {/* Tonight call to action */}
    <FadeInOut
      startFrame={643}
      visibleFrames={300}
      style={{ position: "absolute", left: 0, right: 0, top: 280, textAlign: "center" }}
    >
      <Caps tracking={8} size={32} color={colors.accent.orange}>
        TONIGHT:
      </Caps>
      <div style={{ marginTop: 24 }}>
        <Title size={68}>Send the message.</Title>
      </div>
      <div style={{ marginTop: 16 }}>
        <Title size={68}>Take the swing.</Title>
      </div>
      <div style={{ marginTop: 16 }}>
        <Title size={68} color={colors.accent.red}>
          Do not freeze.
        </Title>
      </div>
    </FadeInOut>

    {/* Del Close callback */}
    <FadeInOut
      startFrame={999}
      visibleFrames={50}
      style={{ position: "absolute", left: 100, right: 100, top: 320, textAlign: "center" }}
    >
      <Kicker size={56} color={colors.fg.white} style={{ lineHeight: 1.3 }}>
        “Fall, then figure out
        <br />
        what to do on the way down.”
      </Kicker>
    </FadeInOut>

    {/* Bridge URL pill */}
    <FadeInOut
      startFrame={1066}
      visibleFrames={400}
      style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center" }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "20px 44px",
          background: colors.fg.white,
          borderRadius: 30,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 4,
          color: colors.bg.slate900,
        }}
      >
        physicsofconnection.com / how-to-deal-with-rejection
      </div>
    </FadeInOut>

    {/* Hook callback — final */}
    <FadeIn
      startFrame={1498}
      style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center" }}
    >
      <Title
        size={88}
        color={colors.fg.slate500}
        style={{ position: "relative", display: "inline-block" }}
      >
        Rejection isn&apos;t the problem.
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: -12,
            width: "calc(100% + 24px)",
            height: 6,
            background: colors.accent.red,
            opacity: 0.85,
          }}
        />
      </Title>
      <div style={{ marginTop: 32 }}>
        <Title size={132}>The freeze is.</Title>
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
const PEAKS = [
  Peak1Hook,
  Peak2Stuck,
  Peak3Stakes,
  Peak4Gap,
  Peak5FMRI,
  Peak6DelClose,
  Peak7SNLtoIO,
  Peak8Move1,
  Peak9Move2,
  Peak10Move3,
  Peak11Close,
];

export const L4HowToDealWithRejection: React.FC = () => (
  <>
    <Audio src={staticFile("audio/05-how-to-deal-with-rejection.mp3")} />
    <Series>
      {L4_PEAKS.map((peak, i) => {
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
