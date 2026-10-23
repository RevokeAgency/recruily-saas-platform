import React from "react"
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion"

import "../styles/app.css"
import { within, useClock } from "../lib/time"
import { Finish, Flash, LightCut, Stage } from "./kit"
import { Assemble } from "./scenes/Assemble"
import { Compare } from "./scenes/Compare"
import { Hook } from "./scenes/Hook"
import { Interview } from "./scenes/Interview"
import { Lockup } from "./scenes/Lockup"
import { Metric } from "./scenes/Metric"
import { Score } from "./scenes/Score"
import { HOOK, METRIC, SCENE, SR_FPS, srSfx, type SceneName } from "./timing"

const SCENES: [SceneName, React.FC][] = [
  ["hook", Hook],
  ["assemble", Assemble],
  ["compare", Compare],
  ["score", Score],
  ["interview", Interview],
  ["metric", Metric],
  ["lockup", Lockup],
]

/**
 * Showreel, 20 s bei 120 BPM. Eine Zeitachse für 9:16, 1:1 und 16:9;
 * jede Szene wählt ihr Layout aus dem Seitenverhältnis (kit.useFmt).
 */
export const Showreel: React.FC = () => {
  const { t } = useClock()
  const cuts = [SCENE.assemble.from, SCENE.compare.from, SCENE.score.from, SCENE.interview.from, SCENE.metric.from]
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
      <Audio src={staticFile("showreel/music.wav")} volume={0.85} />
      {srSfx().map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(c.at * SR_FPS))} durationInFrames={2 * SR_FPS} layout="none">
          <Audio src={staticFile(`sfx/${c.sound}.wav`)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
