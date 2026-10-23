import React from "react"
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion"

import "../styles/app.css"
import { Soundtrack } from "../audio/Soundtrack"
import { demoSfx } from "../config/demo-timing"
import { Grade, Grain, Mesh, Vignette } from "../stage/Stage"
import { IntroScene } from "./scenes/IntroScene"
import { OutroScene } from "./scenes/OutroScene"
import { ScoringScene } from "./scenes/ScoringScene"
import { UploadScene } from "./scenes/UploadScene"

/**
 * Produkt-Demo (Composition "RevetlyDemo"), 30 s.
 *
 * Ebenen von unten nach oben: Mesh-Verlauf → Szenen (UI und Typo) →
 * HyperFrames-Overlay → Color Grade → Korn → Vignette.
 *
 * Der Overlay (public/hf/overlay.webm, transparent) kommt aus dem
 * HyperFrames-Projekt in video/hyperframes/: Headline-Slam im Intro,
 * Lichtschnitte an den Szenenwechseln, Score-Puls, Logo-Glanz. Er wird mit
 * `pnpm hf:render` aus denselben Zeiten (demo-timing.ts) erzeugt. Jede Szene blendet sich anhand von
 * config/demo-timing.ts selbst ein und aus; an den Übergängen überlappen sie.
 * `rv-video` schaltet CSS-Transitions der App-Klassen ab (styles/app.css).
 */
export const DemoVideo: React.FC = () => (
  <AbsoluteFill className="rv-video">
    <Mesh dimUntil={-1} />
    <IntroScene />
    <UploadScene />
    <ScoringScene />
    <OutroScene />
    {/* eigene absolute Ebene, sonst malt der Browser das Video unter die Szenen */}
    <AbsoluteFill>
      <OffthreadVideo src={staticFile("hf/overlay.webm")} transparent muted />
    </AbsoluteFill>
    <Grade />
    <Grain />
    <Vignette />
    <Soundtrack cues={demoSfx()} />
  </AbsoluteFill>
)
