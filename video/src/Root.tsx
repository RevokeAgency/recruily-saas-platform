import React from "react"
import { Composition, Folder } from "remotion"

import { DemoVideo } from "./components/DemoVideo"
import { DEMO_DURATION, DEMO_FPS } from "./config/demo-timing"
import { DURATION, FPS } from "./config/timing"
import { Launch } from "./Launch"
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

    {/* Launch-Video v2 (abgenommen) */}
    <Folder name="Launch-v2">
      <Composition id="Launch-16x9" component={Launch} durationInFrames={DURATION * FPS} fps={FPS} width={1920} height={1080} />
      <Composition id="Launch-1x1" component={Launch} durationInFrames={DURATION * FPS} fps={FPS} width={1080} height={1080} />
    </Folder>
  </>
)
