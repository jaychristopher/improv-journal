import "./lib/fonts";

import React from "react";
import { Composition } from "remotion";

import { L1_DURATION, L1Overthinking } from "./compositions/L1";
import { L2_DURATION, L2HowToBeFunny } from "./compositions/L2";
import { L23_DURATION, L23TeamBonding } from "./compositions/L23";
import { L31_DURATION, L31RulesOfImprov } from "./compositions/L31";
import { FRAME } from "./lib/design";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="L1Overthinking"
        component={L1Overthinking}
        durationInFrames={L1_DURATION}
        fps={FRAME.fps}
        width={FRAME.width}
        height={FRAME.height}
      />
      <Composition
        id="L2HowToBeFunny"
        component={L2HowToBeFunny}
        durationInFrames={L2_DURATION}
        fps={FRAME.fps}
        width={FRAME.width}
        height={FRAME.height}
      />
      <Composition
        id="L23TeamBonding"
        component={L23TeamBonding}
        durationInFrames={L23_DURATION}
        fps={FRAME.fps}
        width={FRAME.width}
        height={FRAME.height}
      />
      <Composition
        id="L31RulesOfImprov"
        component={L31RulesOfImprov}
        durationInFrames={L31_DURATION}
        fps={FRAME.fps}
        width={FRAME.width}
        height={FRAME.height}
      />
    </>
  );
};
