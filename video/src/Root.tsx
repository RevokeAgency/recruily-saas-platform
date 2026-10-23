import React from "react"
import { Composition } from "remotion"

import { DURATION, FPS } from "./config/timeline"
import { Launch } from "./Launch"
import { loadFonts } from "./lib/fonts"

loadFonts()

export const Root: React.FC = () => (
  <>
    <Composition id="Launch-16x9" component={Launch} durationInFrames={DURATION * FPS} fps={FPS} width={1920} height={1080} />
    <Composition id="Launch-1x1" component={Launch} durationInFrames={DURATION * FPS} fps={FPS} width={1080} height={1080} />
  </>
)
