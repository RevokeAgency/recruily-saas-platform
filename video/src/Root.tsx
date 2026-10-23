import React from "react"
import { Composition, Folder } from "remotion"

import { DemoVideo } from "./components/DemoVideo"
import { DEMO_DURATION, DEMO_FPS } from "./config/demo-timing"
import { DURATION, FPS } from "./config/timing"
import { Launch } from "./Launch"
import { Showreel } from "./showreel/Showreel"
import { SR_DURATION, SR_FPS } from "./showreel/timing"
import { loadFonts } from "./lib/fonts"

loadFonts()

export const Root: React.FC = () => (
  <>
    {/* Haupt-Composition: Produkt-Demo mit 3D-UI */}
    <Composition
      id="RevetlyDemo"
      component={DemoVideo}
      durationInFrames={DEMO_DURATION * DEMO_FPS}
      fps={DEMO_FPS}
      width={1920}
      height={1080}
    />

    {/* Showreel, 20 s, 120 BPM: eine Zeitachse, drei Formate */}
    <Folder name="Showreel">
      <Composition id="Showreel-9x16" component={Showreel} durationInFrames={SR_DURATION * SR_FPS} fps={SR_FPS} width={1080} height={1920} />
      <Composition id="Showreel-1x1" component={Showreel} durationInFrames={SR_DURATION * SR_FPS} fps={SR_FPS} width={1080} height={1080} />
      <Composition id="Showreel-16x9" component={Showreel} durationInFrames={SR_DURATION * SR_FPS} fps={SR_FPS} width={1920} height={1080} />
    </Folder>

    {/* Launch-Video v2 (abgenommen) */}
    <Folder name="Launch-v2">
      <Composition id="Launch-16x9" component={Launch} durationInFrames={DURATION * FPS} fps={FPS} width={1920} height={1080} />
      <Composition id="Launch-1x1" component={Launch} durationInFrames={DURATION * FPS} fps={FPS} width={1080} height={1080} />
    </Folder>
  </>
)
