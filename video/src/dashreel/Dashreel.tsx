import React from "react"
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion"

import "../styles/app.css"
import { useClock, within } from "../lib/time"
import { Finish, Flash, LightCut, Stage } from "../showreel/kit"
import { Assemble } from "./scenes/Assemble"
import { Feature } from "./scenes/Feature"
import { Hook } from "./scenes/Hook"
import { Lockup } from "./scenes/Lockup"
import { Metric } from "./scenes/Metric"
import { DR_FPS, drSfx, HOOK, METRIC, SCENE, type SceneName } from "./timing"

const SCENES: [SceneName, React.FC][] = [
  ["hook", Hook],
  ["assemble", Assemble],
  ["top", () => <Feature card="top" dir={1} />],
  ["prio", () => <Feature card="prio" dir={-1} />],
  ["recent", () => <Feature card="recent" dir={1} />],
  ["metric", Metric],
  ["lockup", Lockup],
]

/**
 * Dashboard-Showreel, 20 s bei 120 BPM, aus der Dashboard-Vorschau. Eine Zeitachse
 * für 9:16, 1:1 und 16:9; Bühne, Schnitte und Typo kommen aus showreel/kit.
 */
export const Dashreel: React.FC = () => {
  const { t } = useClock()
  const cuts = [SCENE.assemble.from, SCENE.top.from, SCENE.prio.from, SCENE.recent.from, SCENE.metric.from]
  return (
    <AbsoluteFill className="rv-video" style={{ background: "#0C1A16" }}>
      <Stage energy={t < SCENE.assemble.from ? 0.55 : 1} />
      {SCENES.map(([name, Scene]) => (within(t, SCENE[name].from, SCENE[name].to) ? <Scene key={name} /> : null))}
      {cuts.map((at, i) => (
        <LightCut key={at} at={at} dir={i % 2 === 0 ? 1 : -1} />
      ))}
      <Flash at={HOOK.land} strength={0.25} />
      <Flash at={METRIC.slam} strength={0.6} />
      <Flash at={SCENE.lockup.from} strength={0.5} />
      <Finish />

      {/* Musik ist auf -1 dBFS normalisiert; Luft für die SFX darüber */}
      <Audio src={staticFile("showreel/dashboard/music.wav")} volume={0.85} />
      {drSfx().map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(c.at * DR_FPS))} durationInFrames={2 * DR_FPS} layout="none">
          <Audio src={staticFile(`sfx/${c.sound}.wav`)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
