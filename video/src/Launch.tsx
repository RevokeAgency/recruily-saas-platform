import React from "react"
import { AbsoluteFill } from "remotion"

import { Background } from "./scenes/Background"
import { CardField } from "./scenes/CardField"
import { Captions } from "./scenes/Captions"
import { Outro } from "./scenes/Outro"
import { Ranking } from "./scenes/Ranking"
import { Soundtrack } from "./scenes/Soundtrack"
import { Sweep } from "./scenes/Sweep"

/**
 * Das ganze Video. Die Ebenen laufen durchgehend, jede blendet sich selbst
 * anhand von config/timeline.ts ein und aus. So können die Karten aus
 * Szene 1 ohne Schnitt bis in die Rangliste in Szene 5 wandern.
 */
export const Launch: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <CardField />
    <Ranking />
    <Sweep />
    <Captions />
    <Outro />
    <Soundtrack />
  </AbsoluteFill>
)
