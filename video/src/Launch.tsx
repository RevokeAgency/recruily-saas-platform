import React from "react"
import { AbsoluteFill } from "remotion"

import { Act1Hook } from "./acts/Act1Hook"
import { Act2Problem } from "./acts/Act2Problem"
import { Act3Ranking } from "./acts/Act3Ranking"
import { Act3Scan } from "./acts/Act3Scan"
import { Act4Payoff } from "./acts/Act4Payoff"
import { Soundtrack } from "./audio/Soundtrack"
import { Grade, Grain, Mesh, Vignette } from "./stage/Stage"

/**
 * Fünf Ebenen in jedem Bild, von unten nach oben:
 *   1 Mesh-Hintergrund
 *   2 Assets (Karten, Liste, Begründungskarte, Logo)
 *   3 Typo und Grafik (stecken in den Akten, liegen dort über den Assets)
 *   4 Color Grade
 *   5 Korn und Vignette
 * Jeder Akt blendet sich anhand von config/timing.ts selbst ein und aus.
 */
export const Launch: React.FC = () => (
  <AbsoluteFill>
    <Mesh />
    <Act1Hook />
    <Act2Problem />
    <Act3Scan />
    <Act3Ranking />
    <Act4Payoff />
    <Grade />
    <Grain />
    <Vignette />
    <Soundtrack />
  </AbsoluteFill>
)
