import React from "react";
import { Audio, Series, staticFile } from "remotion";

import { colors } from "../lib/design";
import { BaseFrame, Caps, FadeIn, Kicker, PeakBadge, Title, Watermark } from "../lib/primitives";

// L23 v2 audio: 434.03s = 13021 frames at 30fps. Peak 10 was "vulnerability"; v2 swaps to "debrief"
// at peak 10 and adds "return weekly" at peak 11.
export const L23_PEAKS = [
  { id: "01-fails", durationInFrames: 14 * 30 }, // 0:00–0:14
  { id: "02-fun-trust", durationInFrames: 14 * 30 }, // 0:14–0:28
  { id: "03-art-form", durationInFrames: 30 * 30 }, // 0:28–0:58
  { id: "04-mirroring", durationInFrames: 60 * 30 }, // 0:58–1:58
  { id: "05-no-leader", durationInFrames: 18 * 30 }, // 1:58–2:16
  { id: "06-gift-giving", durationInFrames: 50 * 30 }, // 2:16–3:06
  { id: "07-yes-and", durationInFrames: 50 * 30 }, // 3:06–3:56
  { id: "08-one-word", durationInFrames: 40 * 30 }, // 3:56–4:36
  { id: "09-sequence", durationInFrames: 28 * 30 }, // 4:36–5:04
  { id: "10-debrief", durationInFrames: 35 * 30 }, // 5:04–5:39 (was vulnerability)
  { id: "11-return-weekly", durationInFrames: 30 * 30 }, // 5:39–6:09 (NEW, replaces vulnerability)
  { id: "12-teamwork", durationInFrames: 65 * 30 }, // 6:09–7:14 (closing + CTA)
];
export const L23_DURATION = L23_PEAKS.reduce((s, p) => s + p.durationInFrames, 0);

// =====================================================================
const Peak1: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={1} label="the hook" />
    <FadeIn style={{ position: "absolute", left: 200, top: 200 }}>
      <Caps tracking={8} size={36}>
        MOST
      </Caps>
      <Title size={156} style={{ marginTop: 20 }}>
        Team Bonding
      </Title>
      <Title size={220} color={colors.accent.red} style={{ marginTop: 12 }}>
        Fails.
      </Title>
    </FadeIn>
    <FadeIn startFrame={24} style={{ position: "absolute", left: 220, top: 720 }}>
      {["Escape rooms.", "Happy hours.", "Cooking classes.", "Bowling nights."].map((s, i) => (
        <div key={i} style={{ position: "relative", marginTop: i === 0 ? 0 : 24 }}>
          <Kicker size={40} color={colors.fg.slate500} style={{ fontStyle: "italic" }}>
            {s}
          </Kicker>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: -12,
              width: "calc(100% + 24px)",
              height: 3,
              background: colors.accent.red,
              opacity: 0.7,
            }}
          />
        </div>
      ))}
    </FadeIn>
    <FadeIn startFrame={40} style={{ position: "absolute", left: 1240, top: 720 }}>
      <Kicker
        size={44}
        color={colors.accent.orange}
        style={{ fontStyle: "italic", lineHeight: 1.3 }}
      >
        fine afternoon.
        <br />
        then Monday.
        <br />
        exactly as before.
      </Kicker>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak2: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={2} label="the diagnosis" />
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 240, textAlign: "center" }}>
      <Title size={200}>
        <span style={{ color: colors.accent.red }}>Fun</span> ≠ Trust.
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={20}
      style={{ position: "absolute", left: 0, right: 0, top: 480, textAlign: "center" }}
    >
      <div
        style={{ display: "inline-block", width: 600, height: 4, background: colors.fg.slate600 }}
      />
    </FadeIn>
    <FadeIn
      startFrame={28}
      style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center" }}
    >
      <Title size={144}>
        <span style={{ color: colors.ok.green }}>Vulnerability → Trust.</span>
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={48}
      style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center" }}
    >
      <Kicker size={40}>stop targeting fun. target vulnerability.</Kicker>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak3: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={3} label="why improvisers know" />
    <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 220, textAlign: "center" }}>
      <Caps tracking={8}>FOR IMPROV ENSEMBLES,</Caps>
    </FadeIn>
    <FadeIn
      startFrame={12}
      style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center" }}
    >
      <Title size={220} color={colors.accent.red}>
        Trust
      </Title>
    </FadeIn>
    <FadeIn
      startFrame={24}
      style={{ position: "absolute", left: 0, right: 0, top: 530, textAlign: "center" }}
    >
      <Title size={110}>= the art form.</Title>
    </FadeIn>
    <FadeIn
      startFrame={42}
      style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center" }}
    >
      <div style={{ display: "inline-flex", gap: 80, alignItems: "baseline" }}>
        {["EVERY NIGHT.", "IMMEDIATELY.", "UNFORGIVING."].map((tag, i) => (
          <Caps key={i} tracking={6} size={38} color={colors.accent.orange}>
            {tag}
          </Caps>
        ))}
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

// Reusable spec-card frame
const SpecCard: React.FC<{
  exNum: number;
  title: string;
  fields: Array<{ l: string; v: string }>;
  steps: string[];
  kicker: string;
}> = ({ exNum, title, fields, steps, kicker }) => (
  <BaseFrame>
    <PeakBadge num={exNum + 3} label={`exercise ${exNum}`} />
    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        EXERCISE {exNum}
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 100, top: 160 }}>
      <Title size={220}>{title}</Title>
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
                marginTop: 8,
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
          {kicker}
        </Kicker>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak4: React.FC = () => (
  <SpecCard
    exNum={1}
    title="Mirroring."
    fields={[
      { l: "TIME", v: "5 MIN" },
      { l: "FORMAT", v: "PAIRS" },
      { l: "FOCUS", v: "PRESENCE" },
      { l: "TRAINS", v: "ATTENTION" },
    ]}
    steps={[
      "Stand facing partner.",
      "One leads with slow movements.",
      "Switch leaders every 2 minutes.",
      "Final minute: no leader.",
    ]}
    kicker="you cannot mirror someone while thinking about your email."
  />
);

const Peak5: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={5} label="phase 3" />
    <FadeIn style={{ position: "absolute", left: 200, top: 200 }}>
      <Caps tracking={8} size={32}>
        PHASE 3
      </Caps>
    </FadeIn>
    <FadeIn startFrame={10} style={{ position: "absolute", left: 200, top: 250 }}>
      <Title size={320}>No</Title>
    </FadeIn>
    <FadeIn startFrame={26} style={{ position: "absolute", left: 200, top: 540 }}>
      <Title size={320} color={colors.accent.red}>
        Leader.
      </Title>
    </FadeIn>
    <FadeIn startFrame={42} style={{ position: "absolute", left: 200, top: 940 }}>
      <div
        style={{
          width: 400,
          height: 4,
          background: colors.fg.slate600,
          borderTop: `4px dashed ${colors.fg.slate600}`,
        }}
      />
    </FadeIn>
    <FadeIn startFrame={50} style={{ position: "absolute", right: 100, bottom: 200 }}>
      <Kicker size={32}>the third minute is where the bonding happens.</Kicker>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak6: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={6} label="exercise 2" />
    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        EXERCISE 2
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 420, top: 130 }}>
      <Title size={132}>Gift Giving.</Title>
    </FadeIn>
    {/* Mystery wrapped box */}
    <FadeIn
      startFrame={20}
      style={{ position: "absolute", left: "50%", top: 360, transform: "translateX(-50%)" }}
    >
      <div style={{ position: "relative", width: 460, height: 380 }}>
        {/* Bow */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -80,
            transform: "translateX(-50%)",
            display: "flex",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: colors.accent.red,
              border: `2px solid #fca5a5`,
            }}
          />
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: colors.accent.red,
              border: `2px solid #fca5a5`,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -60,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: colors.bg.slate900,
            transform: "translateX(-50%)",
          }}
        />
        {/* Box */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: colors.bg.slate900,
            border: `5px solid ${colors.fg.slate300}`,
            borderRadius: 16,
          }}
        />
        {/* Vertical ribbon */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 72,
            background: colors.accent.red,
            transform: "translateX(-50%)",
          }}
        />
        {/* Horizontal ribbon */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 72,
            background: colors.accent.red,
            transform: "translateY(-50%)",
          }}
        />
        {/* ? */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: '"Playfair Display", serif',
            fontWeight: 900,
            fontSize: 280,
            color: colors.fg.white,
            zIndex: 2,
          }}
        >
          ?
        </div>
      </div>
    </FadeIn>
    <FadeIn
      startFrame={40}
      style={{ position: "absolute", left: 0, right: 0, bottom: 130, textAlign: "center" }}
    >
      <Kicker size={36}>{"the receiver decides what's inside."}</Kicker>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak7: React.FC = () => (
  <BaseFrame>
    <PeakBadge num={7} label="exercise 3" />
    <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
      <Caps tracking={8} size={28} color={colors.accent.red}>
        EXERCISE 3
      </Caps>
    </FadeIn>
    <FadeIn startFrame={8} style={{ position: "absolute", left: 420, top: 130 }}>
      <Title size={200}>Yes, And.</Title>
    </FadeIn>
    <FadeIn startFrame={20} style={{ position: "absolute", left: 100, top: 440, width: 800 }}>
      <div
        style={{
          background: colors.bg.slate800,
          border: `2px solid ${colors.fg.slate600}`,
          borderRadius: 16,
          padding: "30px 40px",
          height: 320,
        }}
      >
        <Caps tracking={6} size={22}>
          WHAT MOST PEOPLE DO
        </Caps>
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <Title size={96} color={colors.accent.red}>
            Yes, but...
          </Title>
          <Caps tracking={2} size={24} color={colors.fg.slate400} style={{ marginTop: 30 }}>
            silently evaluating each idea
          </Caps>
        </div>
      </div>
    </FadeIn>
    <FadeIn startFrame={36} style={{ position: "absolute", right: 100, top: 440, width: 800 }}>
      <div
        style={{
          background: "rgba(34,197,94,0.18)",
          border: `2px solid ${colors.ok.green}`,
          borderRadius: 16,
          padding: "30px 40px",
          height: 320,
        }}
      >
        <Caps tracking={6} size={22} color={colors.ok.green}>
          WHAT THIS EXERCISE TRAINS
        </Caps>
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <Title size={96} color={colors.ok.green}>
            Yes, and...
          </Title>
          <Caps tracking={2} size={24} color={colors.fg.slate300} style={{ marginTop: 30 }}>
            building together
          </Caps>
        </div>
      </div>
    </FadeIn>
    <FadeIn startFrame={56} style={{ position: "absolute", left: 100, right: 100, bottom: 80 }}>
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
        <Kicker size={32} color={colors.ok.green}>
          trains acceptance before judgment.
        </Kicker>
      </div>
    </FadeIn>
    <Watermark />
  </BaseFrame>
);

const Peak8: React.FC = () => {
  const items = [
    { w: "We", spk: "A" },
    { w: "discovered", spk: "B" },
    { w: "an", spk: "A" },
    { w: "ancient", spk: "B" },
    { w: "library.", spk: "A" },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={8} label="exercise 4" />
      <FadeIn style={{ position: "absolute", left: 100, top: 130 }}>
        <Caps tracking={8} size={28} color={colors.accent.red}>
          EXERCISE 4
        </Caps>
      </FadeIn>
      <FadeIn startFrame={8} style={{ position: "absolute", left: 420, top: 140 }}>
        <Title size={124}>One-Word Scene.</Title>
      </FadeIn>
      <FadeIn startFrame={24} style={{ position: "absolute", left: 100, top: 380 }}>
        <div style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              width: 200,
              height: 80,
              background: colors.fg.slate400,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 22,
              color: colors.bg.slate900,
              letterSpacing: 4,
            }}
          >
            SPEAKER A
          </div>
          <div
            style={{
              width: 200,
              height: 80,
              background: colors.fg.white,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: 22,
              color: colors.bg.slate900,
              letterSpacing: 4,
            }}
          >
            SPEAKER B
          </div>
        </div>
      </FadeIn>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 540,
          display: "flex",
          flexWrap: "wrap",
          gap: "0 28px",
        }}
      >
        {items.map((it, i) => (
          <FadeIn key={i} startFrame={40 + i * 14}>
            <div style={{ position: "relative", paddingTop: 24 }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: 4,
                  color: it.spk === "A" ? colors.fg.slate400 : colors.fg.white,
                  opacity: 0.7,
                }}
              >
                {it.spk}
              </div>
              <Title size={88} color={it.spk === "A" ? colors.fg.slate400 : colors.fg.white}>
                {it.w}
              </Title>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn startFrame={120} style={{ position: "absolute", left: 100, right: 100, bottom: 60 }}>
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
          <Kicker size={32}>neither person controls it.</Kicker>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const Peak9: React.FC = () => {
  const cards = [
    { title: "Mirroring", sub: "ATTENTION" },
    { title: "Gift Giving", sub: "SURRENDER" },
    { title: "Yes And Chain", sub: "BUILDING" },
    { title: "One-Word Scene", sub: "SHARED CREATION" },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={9} label="the sequence" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center" }}>
        <Title size={96}>Run them in order.</Title>
      </FadeIn>
      <FadeIn startFrame={20} style={{ position: "absolute", left: 0, right: 0, top: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
          {cards.map((c, i) => (
            <React.Fragment key={i}>
              <div
                style={{
                  width: 320,
                  height: 380,
                  background: colors.bg.slate900,
                  border: `2px solid ${colors.fg.slate600}`,
                  borderRadius: 16,
                  position: "relative",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    background: colors.accent.red,
                    borderRadius: "50%",
                    margin: "20px auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Title size={56} color={colors.fg.white}>
                    {i + 1}
                  </Title>
                </div>
                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <Title size={32}>{c.title}</Title>
                </div>
                <div style={{ textAlign: "center", marginTop: 24 }}>
                  <Caps tracking={6} size={18} color={colors.accent.orange}>
                    {c.sub}
                  </Caps>
                </div>
              </div>
              {i < cards.length - 1 && (
                <div style={{ alignSelf: "center", color: colors.accent.orange, fontSize: 36 }}>
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </FadeIn>
      <FadeIn startFrame={50} style={{ position: "absolute", left: 100, right: 100, bottom: 100 }}>
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
          <Kicker size={30}>35 to 40 minutes total. the sequence builds.</Kicker>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// v2 Peak 10 — Debrief (was Peak 11 in v1, promoted to peak 10)
const Peak10: React.FC = () => {
  const items = [
    { num: "1", q: "What was hard about Mirroring?" },
    { num: "2", q: "What was easy?" },
    { num: "3", q: "Where do we Yes-And — and where do we Yes-But?" },
  ];
  return (
    <BaseFrame>
      <PeakBadge num={10} label="integration" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center" }}>
        <Title size={96}>5-Minute Debrief.</Title>
      </FadeIn>
      <div style={{ position: "absolute", left: 100, top: 320, right: 100 }}>
        {items.map((it, i) => (
          <FadeIn key={i} startFrame={20 + i * 12}>
            <div
              style={{
                height: 160,
                background: "rgba(15,23,42,0.5)",
                border: `2px solid ${colors.ok.green}`,
                borderRadius: 16,
                marginBottom: 40,
                padding: "16px 60px",
                display: "flex",
                alignItems: "center",
                gap: 60,
              }}
            >
              <Title size={96} color={colors.ok.green}>
                {it.num}
              </Title>
              <Title
                size={44}
                color={colors.fg.slate300}
                style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900 }}
              >
                {it.q}
              </Title>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn startFrame={70} style={{ position: "absolute", left: 100, right: 100, bottom: 60 }}>
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
            the bonding comes from what you do with the experience.
          </Kicker>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

// v2 Peak 11 — Return weekly (NEW; replaces v1 vulnerability thermometer)
const Peak11: React.FC = () => {
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const exercises = ["MIRRORING", "GIFT GIVING", "YES AND", "ONE-WORD"];
  const calLeft = 200;
  const calTop = 290;
  const cellW = 280;
  const cellH = 130;
  const gap = 20;
  return (
    <BaseFrame>
      <PeakBadge num={11} label="the habit" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center" }}>
        <Title size={96}>Return to it.</Title>
      </FadeIn>
      {/* Day headers */}
      <FadeIn startFrame={12} style={{ position: "absolute", left: 0, top: calTop }}>
        <div style={{ display: "flex", marginLeft: calLeft, gap }}>
          {days.map((d, i) => (
            <div
              key={d}
              style={{
                width: cellW,
                textAlign: "center",
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: 6,
                color: i === 0 ? colors.accent.orange : colors.fg.slate600,
              }}
            >
              {d}
            </div>
          ))}
        </div>
      </FadeIn>
      {/* 4 weeks of cells */}
      {[0, 1, 2, 3].map((week) => {
        const cy = calTop + 50 + week * (cellH + gap);
        return (
          <FadeIn
            key={week}
            startFrame={20 + week * 8}
            style={{ position: "absolute", left: 0, top: cy, width: 1920 }}
          >
            {/* Week label */}
            <div
              style={{
                position: "absolute",
                left: 100,
                top: cellH / 2 - 12,
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: 4,
                color: colors.fg.slate500,
              }}
            >
              WK {week + 1}
            </div>
            <div style={{ display: "flex", marginLeft: calLeft, gap }}>
              {days.map((_, d) => {
                if (d === 0) {
                  return (
                    <div
                      key={d}
                      style={{
                        width: cellW,
                        height: cellH,
                        borderRadius: 12,
                        background: "rgba(249,115,22,0.25)",
                        border: `2px solid ${colors.accent.orange}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: 24,
                          letterSpacing: 4,
                          color: colors.accent.orange,
                        }}
                      >
                        5 MIN
                      </div>
                      <Title size={22}>{exercises[week]}</Title>
                    </div>
                  );
                }
                return (
                  <div
                    key={d}
                    style={{
                      width: cellW,
                      height: cellH,
                      borderRadius: 12,
                      background: "rgba(15,23,42,0.55)",
                      border: `1px solid ${colors.bg.slate700}`,
                    }}
                  />
                );
              })}
            </div>
          </FadeIn>
        );
      })}
      <FadeIn startFrame={56} style={{ position: "absolute", left: 100, right: 100, bottom: 60 }}>
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
          <Kicker size={30}>{"the muscle is built in repetition, not a single session."}</Kicker>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const Peak12: React.FC = () => {
  const skills = ["MIRRORING", "GIFT GIVING", "YES AND", "ONE-WORD"];
  return (
    <BaseFrame>
      <PeakBadge num={12} label="the closing" />
      <FadeIn style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center" }}>
        <Title size={220} color={colors.accent.red}>
          Teamwork.
        </Title>
      </FadeIn>
      <FadeIn
        startFrame={20}
        style={{ position: "absolute", left: 0, right: 0, top: 410, textAlign: "center" }}
      >
        <Kicker size={56} color={colors.fg.slate300}>
          = these four skills.
        </Kicker>
      </FadeIn>
      <FadeIn startFrame={36} style={{ position: "absolute", left: 0, right: 0, top: 540 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          {skills.map((s, i) => (
            <div
              key={i}
              style={{
                width: 320,
                height: 180,
                background: colors.bg.slate900,
                border: `2px solid ${colors.accent.orange}`,
                borderRadius: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <Caps tracking={4} size={28} color={colors.accent.orange}>
                {i + 1}
              </Caps>
              <div style={{ marginTop: 50 }}>
                <Caps tracking={4} size={22}>
                  {s}
                </Caps>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
      <FadeIn
        startFrame={50}
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
            physicsofconnection.com/team-bonding-activities
          </div>
        </div>
      </FadeIn>
      <Watermark />
    </BaseFrame>
  );
};

const PEAKS = [
  Peak1,
  Peak2,
  Peak3,
  Peak4,
  Peak5,
  Peak6,
  Peak7,
  Peak8,
  Peak9,
  Peak10,
  Peak11,
  Peak12,
];

export const L23TeamBonding: React.FC = () => (
  <>
    <Audio src={staticFile("audio/02-team-building-activities.mp3")} />
    <Series>
      {L23_PEAKS.map((peak, i) => {
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
