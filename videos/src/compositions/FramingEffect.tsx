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

// Peak timings synced to dead-air-compressed v2 audio. Audio: 368.87s.
// Anchors verified against docs/youtube-week-4/framing-effect-timings.json (SOP 11 audit).
export const FRAMING_EFFECT_PEAKS = [
  { id: "01-hook", durationInFrames: 368 }, // 0.24 - 12.50s
  { id: "02-stakes", durationInFrames: 899 }, // 12.50 - 42.46s
  { id: "03-openloop", durationInFrames: 350 }, // 42.46 - 54.12s
  { id: "04-tversky-kahneman", durationInFrames: 1489 }, // 54.12 - 103.76s
  { id: "05-lakoff", durationInFrames: 881 }, // 103.76 - 133.12s
  { id: "06-midpoint", durationInFrames: 552 }, // 133.12 - 151.52s
  { id: "07-move1-frame-first", durationInFrames: 1400 }, // 151.52 - 198.18s
  { id: "08-move2-vocabulary", durationInFrames: 1265 }, // 198.18 - 240.34s
  { id: "09-move3-ask", durationInFrames: 1148 }, // 240.34 - 278.61s
  { id: "10-anti-move", durationInFrames: 1458 }, // 278.61 - 327.22s
  { id: "11-close", durationInFrames: 1246 }, // 327.22 - 368.75s
];
export const FRAMING_EFFECT_DURATION = FRAMING_EFFECT_PEAKS.reduce(
  (s, p) => s + p.durationInFrames,
  0,
);

// =====================================================================
// Peak 1 · Hook (12.26s, 368f)
// "Stop arguing harder. Start framing better."
// Beat anchors (peak-relative):
//   0    "Stop" (audio 0.24s)
//   ~68  "framing" (audio 2.52s)
//   ~86  "better" (audio 3.14s)
const Peak1Hook: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={1} label="the hook" />

    {/* First line with strikethrough on "arguing harder" */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 320, textAlign: "center" }}>
      <Title
        size={92}
        color={colors.fg.slate500}
        style={{ position: "relative", display: "inline-block" }}
      >
        Stop arguing harder.
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

    {/* Second line — emphasized */}
    <FadeIn
      startFrame={68}
      style={{ position: "absolute", left: 0, right: 0, top: 530, textAlign: "center" }}
    >
      <Title size={148}>Start framing better.</Title>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 2 · Stakes (29.96s, 899f)
// "You're right. You have the facts...
//  That was your idea that didn't land in the meeting.
//  That was your point your partner brushed past at dinner.
//  That was the case you made — the right case — that bounced off your boss"
// Beat anchors (peak-relative):
//   0    "You're right" (12.50s abs)
//   ~19  "idea" (13.14s) — meeting reveal at ~70
//   ~70  "meeting" (14.82s)
//   ~147 "partner" (17.40s) — dinner at ~193
//   ~193 "dinner" (18.92s)
//   ~334 "bounced" (23.62s)
//   ~358 "boss" (24.44s)
const Peak2Stakes: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={2} label="your case bounced" />

    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center" }}>
      <Title size={66} color={colors.fg.slate300}>
        You have the facts.
      </Title>
    </FadeIn>

    {/* Three example stack — meeting / dinner / boss */}
    <FadeIn startFrame={70} style={{ position: "absolute", left: 240, top: 360 }}>
      <Caps tracking={6} size={22} color={colors.fg.slate500}>
        THE MEETING
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={48} color={colors.fg.slate300}>
          Your idea didn&apos;t land.
        </Title>
      </div>
    </FadeIn>

    <FadeIn startFrame={193} style={{ position: "absolute", left: 240, top: 510 }}>
      <Caps tracking={6} size={22} color={colors.fg.slate500}>
        THE DINNER
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={48} color={colors.fg.slate300}>
          Your point was brushed past.
        </Title>
      </div>
    </FadeIn>

    <FadeIn startFrame={334} style={{ position: "absolute", left: 240, top: 660 }}>
      <Caps tracking={6} size={22} color={colors.accent.red}>
        WITH YOUR BOSS
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={56} color={colors.accent.red}>
          Your right case bounced.
        </Title>
      </div>
    </FadeIn>

    {/* Diagnosis label */}
    <FadeIn
      startFrame={580}
      style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center" }}
    >
      <Kicker size={44} color={colors.accent.orange}>
        Not a content problem. An angle-of-approach problem.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 3 · Open loop + setup (11.66s, 350f)
// "Three moves improv performers train for sixty years.
//  Practical. Do-it-tomorrow. But first — the study that proves the angle matters."
// Beat anchors:
//   0    "Three" (42.46s)
//   ~11  "moves" (42.84s)
//   ~102 "years" (45.88s)
//   ~258 "study" (51.08s)
const Peak3OpenLoop: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={3} label="the promise" />

    {/* 3 MOVES — count animation */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 280, textAlign: "center" }}>
      <Caps tracking={10} size={32} color={colors.fg.slate400}>
        3 MOVES
      </Caps>
      <div style={{ marginTop: 24 }}>
        <Title size={180}>Three moves.</Title>
      </div>
    </FadeIn>

    {/* 60 years badge */}
    <FadeIn
      startFrame={102}
      style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center" }}
    >
      <Kicker size={48} color={colors.accent.orange}>
        Trained on the improv stage for 60 years.
      </Kicker>
    </FadeIn>

    {/* But first — the study */}
    <FadeIn
      startFrame={258}
      style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center" }}
    >
      <Caps tracking={8} size={26} color={colors.fg.slate400}>
        BUT FIRST · THE STUDY
      </Caps>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 4 · Tversky-Kahneman 1981 (49.64s, 1489f)
// The framing study — "same numbers / same outcomes / different angle → preferences reversed"
// Beat anchors (peak-relative):
//   46   "Amos" (55.66s) — name appears
//   58   "Tversky" (56.06s)
//   100  "Kahneman" (57.46s)
//   272  "identical" (63.20s) — same numbers begin
//   406  "lives" (67.66s)
//   426  "saved" (68.34s) — "lives saved" frame
//   516  "lost" (71.34s) — "lives lost" frame
//   567  "numbers" (73.02s) — "same numbers" recap
//   712  "preferences" (77.86s)
//   740  "reversed" (78.80s) — big reveal
//   1210 "signal" (94.46s) — "angle is part of the signal"
const Peak4Tversky: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={4} label="tversky · kahneman · 1981" />

    {/* Citation block */}
    <FadeIn
      startFrame={46}
      style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center" }}
    >
      <Caps tracking={8} size={26} color={colors.fg.slate400}>
        SCIENCE · 1981
      </Caps>
      <div style={{ marginTop: 16 }}>
        <Title size={72}>Tversky &amp; Kahneman</Title>
      </div>
    </FadeIn>

    {/* Same outcomes — different frames */}
    <FadeIn
      startFrame={272}
      style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center" }}
    >
      <Kicker size={44} color={colors.fg.slate300}>
        Identical outcomes. Two framings.
      </Kicker>
    </FadeIn>

    {/* Lives saved (left) vs Lives lost (right) split */}
    <FadeIn startFrame={426} style={{ position: "absolute", left: 200, top: 540 }}>
      <Caps tracking={6} size={26} color={colors.ok.green}>
        FRAME A
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={80} color={colors.ok.green}>
          Lives saved.
        </Title>
      </div>
    </FadeIn>

    <FadeIn
      startFrame={516}
      style={{ position: "absolute", right: 200, top: 540, textAlign: "right" }}
    >
      <Caps tracking={6} size={26} color={colors.accent.red}>
        FRAME B
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={80} color={colors.accent.red}>
          Lives lost.
        </Title>
      </div>
    </FadeIn>

    {/* "Same numbers" subtle reinforce */}
    <FadeInOut
      startFrame={567}
      visibleFrames={120}
      style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center" }}
    >
      <Caps tracking={10} size={28} color={colors.fg.slate400}>
        SAME NUMBERS · SAME OUTCOMES
      </Caps>
    </FadeInOut>

    {/* PREFERENCES REVERSED — the punch */}
    <FadeIn
      startFrame={740}
      style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center" }}
    >
      <Title size={120} color={colors.accent.orange}>
        Preferences reversed.
      </Title>
    </FadeIn>

    {/* Closing reframe: angle is signal */}
    <FadeIn
      startFrame={1210}
      style={{ position: "absolute", left: 0, right: 0, top: 980, textAlign: "center" }}
    >
      <Kicker size={36} color={colors.fg.slate300}>
        The angle isn&apos;t decoration. It&apos;s part of the signal.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 5 · Lakoff mechanism (29.36s, 881f)
// "George Lakoff... Don't Think of an Elephant... can't argue against a frame from inside the frame"
// Beat anchors (peak-relative):
//   10   "Lakoff" (104.10s)
//   124  "book" (107.90s)
//   158  "think" (109.02s)
//   173  "Elephant" (109.52s)
//   212  "Frames" (110.84s)
//   704  "provide" (127.24s) — the punch line
const Peak5Lakoff: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={5} label="lakoff · 2004" />

    <FadeIn
      startFrame={10}
      style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center" }}
    >
      <Caps tracking={8} size={26} color={colors.fg.slate400}>
        GEORGE LAKOFF
      </Caps>
    </FadeIn>

    {/* Book title cite — Don't Think of an Elephant */}
    <FadeIn
      startFrame={158}
      style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center" }}
    >
      <Kicker size={56} color={colors.accent.orange}>
        Don&apos;t Think of an Elephant.
      </Kicker>
    </FadeIn>

    {/* Try not to → elephant emoji-text */}
    <FadeIn
      startFrame={212}
      style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center" }}
    >
      <Title size={72} color={colors.fg.slate300}>
        Try not to.
      </Title>
      <div style={{ marginTop: 16 }}>
        <Caps tracking={8} size={26} color={colors.fg.slate400}>
          YOU CAN&apos;T.
        </Caps>
      </div>
    </FadeIn>

    {/* The punch — provide a different frame */}
    <FadeIn
      startFrame={704}
      style={{ position: "absolute", left: 0, right: 0, top: 780, textAlign: "center" }}
    >
      <Title size={88} color={colors.fg.white}>
        You can&apos;t argue against a frame
      </Title>
      <div style={{ marginTop: 16 }}>
        <Title size={88} color={colors.accent.orange}>
          from inside the frame.
        </Title>
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 6 · Midpoint reveal (18.40s, 552f)
// THE quotable line, isolated.
// "Most failed persuasion isn't a content failure. It's an angle-of-approach failure."
// Beat anchors (peak-relative):
//   0    "failed" (133.12s) — first half
//   ~150 (after pause) — second half lands
const Peak6Midpoint: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={6} label="the midpoint" />

    {/* First half (gray) */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center" }}>
      <Title size={84} color={colors.fg.slate400}>
        Most failed persuasion
      </Title>
      <div style={{ marginTop: 24 }}>
        <Title size={84} color={colors.fg.slate400}>
          isn&apos;t a content failure.
        </Title>
      </div>
    </FadeIn>

    {/* Second half — punch */}
    <FadeIn
      startFrame={150}
      style={{ position: "absolute", left: 0, right: 0, top: 660, textAlign: "center" }}
    >
      <Title size={108} color={colors.accent.orange}>
        It&apos;s an angle-of-approach failure.
      </Title>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 7 · Move 1 — Lead with the frame (46.66s, 1400f)
// "The most common mistake is stating the conclusion first...
//  Establish the frame first. 'What we're really negotiating here is retention, not salary'"
// Beat anchors:
//   0    "common" (151.52s) — body opener
//   557  "establish" (170.10s) — the move
//   778  "retention" (177.46s) — example
//   816  "salary" (178.72s)
const Peak7Move1: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={7} label="move 1 · frame first" />

    {/* MOVE 1 label */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center" }}>
      <Caps tracking={12} size={36} color={colors.accent.red}>
        MOVE 1
      </Caps>
      <div style={{ marginTop: 18 }}>
        <Title size={120}>Lead with the frame.</Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Kicker size={40} color={colors.fg.slate400}>
          not the conclusion.
        </Kicker>
      </div>
    </FadeIn>

    {/* The directive */}
    <FadeIn
      startFrame={557}
      style={{ position: "absolute", left: 0, right: 0, top: 600, textAlign: "center" }}
    >
      <Caps tracking={6} size={26} color={colors.fg.slate400}>
        DO THIS
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={56} color={colors.fg.slate300}>
          Establish the frame. Then let the conclusion land inside it.
        </Title>
      </div>
    </FadeIn>

    {/* Example dialogue */}
    <FadeIn
      startFrame={778}
      style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center" }}
    >
      <Title size={56} color={colors.accent.orange}>
        &quot;What we&apos;re really negotiating is retention.&quot;
      </Title>
      <div style={{ marginTop: 12 }}>
        <Caps tracking={6} size={24} color={colors.fg.slate500}>
          NOT &quot;salary.&quot;
        </Caps>
      </div>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 8 · Move 2 — Use their vocabulary (42.16s, 1265f)
// "Words carry frames. Their words carry their frames.
//  If your boss says 'compensation,' don't say 'salary.'
//  If your partner says 'time off,' don't say 'PTO.'"
// Beat anchors:
//   0    "Words" (198.18s)
//   16   "carry" (198.70s)
//   516  "compensation" (215.36s)
//   716  "PTO" (222.02s)
//   766  "customer" (223.70s)
//   902  "swaps" (228.24s)
const Peak8Move2: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={8} label="move 2 · their words" />

    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center" }}>
      <Caps tracking={12} size={36} color={colors.accent.red}>
        MOVE 2
      </Caps>
      <div style={{ marginTop: 18 }}>
        <Title size={120}>Use their vocabulary.</Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Kicker size={40} color={colors.fg.slate400}>
          words carry frames.
        </Kicker>
      </div>
    </FadeIn>

    {/* Word-pair swap examples */}
    <FadeIn startFrame={516} style={{ position: "absolute", left: 180, top: 620 }}>
      <Caps tracking={6} size={22} color={colors.fg.slate500}>
        BOSS SAYS
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={56} color={colors.ok.green}>
          compensation
        </Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Caps tracking={6} size={22} color={colors.fg.slate500}>
          NOT
        </Caps>
        <Title size={42} color={colors.fg.slate500} style={{ textDecoration: "line-through" }}>
          salary
        </Title>
      </div>
    </FadeIn>

    <FadeIn startFrame={716} style={{ position: "absolute", left: 720, top: 620 }}>
      <Caps tracking={6} size={22} color={colors.fg.slate500}>
        PARTNER SAYS
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={56} color={colors.ok.green}>
          time off
        </Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Caps tracking={6} size={22} color={colors.fg.slate500}>
          NOT
        </Caps>
        <Title size={42} color={colors.fg.slate500} style={{ textDecoration: "line-through" }}>
          PTO
        </Title>
      </div>
    </FadeIn>

    <FadeIn startFrame={766} style={{ position: "absolute", left: 1260, top: 620 }}>
      <Caps tracking={6} size={22} color={colors.fg.slate500}>
        CUSTOMER SAYS
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={56} color={colors.ok.green}>
          issue
        </Title>
      </div>
      <div style={{ marginTop: 12 }}>
        <Caps tracking={6} size={22} color={colors.fg.slate500}>
          NOT
        </Caps>
        <Title size={42} color={colors.fg.slate500} style={{ textDecoration: "line-through" }}>
          ticket
        </Title>
      </div>
    </FadeIn>

    {/* Closing rule */}
    <FadeIn
      startFrame={902}
      style={{ position: "absolute", left: 0, right: 0, top: 940, textAlign: "center" }}
    >
      <Kicker size={44} color={colors.accent.orange}>
        Small swaps. Structural effect.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 9 · Move 3 — Ask, don't assert (38.27s, 1148f)
// "A question lets the listener do the framing... Socrates was working this 2,400 years ago...
//  How would you handle this if it were a customer issue instead of a personnel one?"
// Beat anchors:
//   0    "question" (240.34s) — header
//   85   "assertion" (243.18s)
//   196  "Socrates" (246.86s)
//   880  "answers" (269.68s)
//   951  "resolves" (272.02s)
const Peak9Move3: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={9} label="move 3 · ask" />

    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center" }}>
      <Caps tracking={12} size={36} color={colors.accent.red}>
        MOVE 3
      </Caps>
      <div style={{ marginTop: 18 }}>
        <Title size={120}>Ask, don&apos;t assert.</Title>
      </div>
    </FadeIn>

    {/* Question vs assertion contrast */}
    <FadeIn startFrame={85} style={{ position: "absolute", left: 200, top: 480 }}>
      <Caps tracking={6} size={22} color={colors.ok.green}>
        QUESTION
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={52} color={colors.fg.slate300}>
          Lets them do the framing.
        </Title>
      </div>
    </FadeIn>

    <FadeIn
      startFrame={85}
      style={{ position: "absolute", right: 200, top: 480, textAlign: "right" }}
    >
      <Caps tracking={6} size={22} color={colors.accent.red}>
        ASSERTION
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={52} color={colors.fg.slate300}>
          Forces them to evaluate yours.
        </Title>
      </div>
    </FadeIn>

    {/* Socrates anchor */}
    <FadeIn
      startFrame={196}
      style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center" }}
    >
      <Kicker size={40} color={colors.accent.orange}>
        Socrates has been running this play for 2,400 years.
      </Kicker>
    </FadeIn>

    {/* Worked example — re-frame */}
    <FadeIn
      startFrame={880}
      style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
    >
      <Title size={48} color={colors.fg.slate300}>
        &quot;How would you handle this if it were a customer issue?&quot;
      </Title>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 10 · Anti-move + deeper-point intro (48.61s, 1458f)
// "Framing slides into spin the moment the angle hides something the listener would want to know...
//  Stay on the craft side... Communication doesn't transfer content intact. Meaning is constituted in reception."
// Beat anchors:
//   0    "anti-move" (278.61s, label)
//   45   "spin" (280.10s)
//   193  "honesty" (285.02s)
//   414  "craft" (292.41s)
//   484  "manipulation" (294.72s)
//   530  "line" (296.28s)
//   1168 "Meaning" (317.52s)
const Peak10AntiMove: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={10} label="anti-move · honesty" />

    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center" }}>
      <Caps tracking={12} size={32} color={colors.accent.red}>
        ANTI-MOVE
      </Caps>
      <div style={{ marginTop: 14 }}>
        <Title size={88}>Framing → spin</Title>
      </div>
    </FadeIn>

    {/* The honesty test */}
    <FadeIn
      startFrame={193}
      style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center" }}
    >
      <Caps tracking={6} size={24} color={colors.fg.slate400}>
        THE HONESTY TEST
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={56} color={colors.fg.slate300}>
          Would you be comfortable
        </Title>
        <Title size={56} color={colors.fg.slate300}>
          with them seeing the move?
        </Title>
      </div>
    </FadeIn>

    {/* Craft vs manipulation split */}
    <FadeIn startFrame={414} style={{ position: "absolute", left: 320, top: 770 }}>
      <Caps tracking={6} size={26} color={colors.ok.green}>
        YES
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={72} color={colors.ok.green}>
          Craft.
        </Title>
      </div>
    </FadeIn>

    <FadeIn
      startFrame={484}
      style={{ position: "absolute", right: 320, top: 770, textAlign: "right" }}
    >
      <Caps tracking={6} size={26} color={colors.accent.red}>
        NO
      </Caps>
      <div style={{ marginTop: 8 }}>
        <Title size={72} color={colors.accent.red}>
          Manipulation.
        </Title>
      </div>
    </FadeIn>

    {/* Transition to deeper point */}
    <FadeIn
      startFrame={1168}
      style={{ position: "absolute", left: 0, right: 0, top: 980, textAlign: "center" }}
    >
      <Kicker size={40} color={colors.accent.orange}>
        Meaning is constituted in reception.
      </Kicker>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Peak 11 · Close + CTA + callback (41.53s, 1246f)
// "Which means the choice isn't whether to frame. The choice is whether to frame deliberately, or by accident.
//  People who refuse to think about framing aren't avoiding it. They're framing badly.
//  Frame on purpose. Use their words. Ask the question. And when the frame itself is the issue — name it.
//  For the full breakdown — physicsofconnection.com/framing-effect.
//  Stop arguing harder. Start framing better."
// Beat anchors:
//   0    "choice" (327.22s)
//   186  "accident" (333.42s)
//   375  "badly" (339.74s)
//   434  "purpose" (341.70s)
const Peak11Close: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={11} label="frame on purpose" />

    {/* The choice — deliberately or by accident */}
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 180, textAlign: "center" }}>
      <Caps tracking={8} size={28} color={colors.fg.slate400}>
        THE CHOICE ISN&apos;T WHETHER
      </Caps>
      <div style={{ marginTop: 18 }}>
        <Title size={84}>Frame deliberately</Title>
        <div style={{ marginTop: 8 }}>
          <Title size={84} color={colors.accent.red}>
            or by accident.
          </Title>
        </div>
      </div>
    </FadeIn>

    {/* Recap of the 3 moves */}
    <FadeIn
      startFrame={434}
      style={{ position: "absolute", left: 0, right: 0, top: 620, textAlign: "center" }}
    >
      <Caps tracking={6} size={24} color={colors.fg.slate400}>
        FRAME ON PURPOSE
      </Caps>
      <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 80 }}>
        <Kicker size={36} color={colors.accent.orange}>
          Lead with the frame.
        </Kicker>
        <Kicker size={36} color={colors.accent.orange}>
          Use their words.
        </Kicker>
        <Kicker size={36} color={colors.accent.orange}>
          Ask the question.
        </Kicker>
      </div>
    </FadeIn>

    {/* CTA */}
    <FadeIn
      startFrame={750}
      style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center" }}
    >
      <Caps tracking={6} size={26} color={colors.fg.slate400}>
        FULL BREAKDOWN
      </Caps>
      <div style={{ marginTop: 12 }}>
        <Title size={64} color={colors.fg.white}>
          physicsofconnection.com/framing-effect
        </Title>
      </div>
    </FadeIn>

    {/* Closing callback — exact echo of opening */}
    <FadeIn
      startFrame={1050}
      style={{ position: "absolute", left: 0, right: 0, top: 1000, textAlign: "center" }}
    >
      <Title size={56} color={colors.accent.orange}>
        Stop arguing harder. Start framing better.
      </Title>
    </FadeIn>

    <Watermark />
  </BaseFrame>
);

// =====================================================================
// Main composition
export const FramingEffect: React.FC = () => (
  <>
    <Audio src={staticFile("audio/06-framing-effect.mp3")} />
    <Series>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[0].durationInFrames}>
        <Peak1Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[1].durationInFrames}>
        <Peak2Stakes />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[2].durationInFrames}>
        <Peak3OpenLoop />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[3].durationInFrames}>
        <Peak4Tversky />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[4].durationInFrames}>
        <Peak5Lakoff />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[5].durationInFrames}>
        <Peak6Midpoint />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[6].durationInFrames}>
        <Peak7Move1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[7].durationInFrames}>
        <Peak8Move2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[8].durationInFrames}>
        <Peak9Move3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[9].durationInFrames}>
        <Peak10AntiMove />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FRAMING_EFFECT_PEAKS[10].durationInFrames}>
        <Peak11Close />
      </Series.Sequence>
    </Series>
  </>
);
