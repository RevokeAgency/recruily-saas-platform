import React from "react"
import { AbsoluteFill } from "remotion"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DEMO_COPY } from "../../config/copy"
import { DEMO_CUES, HANDOFF, SCENE, sat } from "../../config/demo-timing"
import { theme } from "../../config/theme"
import { STAGGER } from "../../config/timing"
import { DEMO_UPLOAD, JOB } from "../../data/mock"
import { enter, mix, progress, springAt, useClock, within } from "../../lib/time"
import { AppShell } from "../app/AppShell"
import { ParsedResultCard } from "../app/ParsedResultCard"
import { PdfFile } from "../app/PdfFile"
import { UploadDropzone } from "../app/UploadDropzone"
import { Cursor } from "../motion/Cursor"
import { countUp } from "../motion/countUp"
import { KineticText } from "../motion/KineticText"
import { Tilt3D } from "../motion/Tilt3D"

/** Bildschirmpunkte der Drag-Bewegung (16:9), am Standbild ausgerichtet. */
const PATH = {
  from: { x: 1640, y: 900 },
  zone: { x: 1020, y: 560 },
  window: { x: 1020, y: 585, w: 1280, h: 760, scale: 1.0 },
}

/**
 * SZENE 2 — Smart CV Upload. Das App-Fenster kommt gekippt aus der Tiefe,
 * ein Lebenslauf wird in die echte Dropzone gezogen, eine Aura und der
 * Fortschritt zeigen die Analyse, dann springt die Ergebnis-Karte mit Skills
 * und Match-Score nach vorn.
 */
export const UploadScene: React.FC = () => {
  const { t, fps } = useClock()
  const S0 = SCENE.upload
  if (!within(t, S0 - HANDOFF, SCENE.scoring + 0.05)) return null
  const C = DEMO_CUES.upload
  const at = (o: number) => sat("upload", o)

  // Fenster: aus der Tiefe, dann ruhig schwebend
  const win = springAt(t, S0 - HANDOFF / 2, fps, { damping: 20, stiffness: 70, mass: 1.1 })
  const back = springAt(t, at(C.ergebnis), fps, theme.spring.smooth) // tritt hinter die Ergebnis-Karte
  const out = progress(t, SCENE.scoring - HANDOFF, SCENE.scoring, theme.ease.in)
  const drift = { x: Math.sin(t * 0.55) * 2.2, y: Math.cos(t * 0.45) * 1.4 }

  // Datei und Cursor
  const grab = springAt(t, at(C.datei), fps, theme.spring.snappy)
  const move = progress(t, at(C.datei + 0.25), at(C.hover), theme.ease.inOut)
  const drop = progress(t, at(C.drop), at(C.drop + 0.35), theme.ease.in)
  const arc = Math.sin(Math.PI * move) * -120
  const fx = mix(move, PATH.from.x, PATH.zone.x)
  const fy = mix(move, PATH.from.y, PATH.zone.y) + arc
  const hover = progress(t, at(C.hover - 0.2), at(C.hover + 0.1)) * (1 - drop)
  const cursorOut = progress(t, at(C.drop + 0.2), at(C.drop + 0.7), theme.ease.inOut)

  // Analyse
  const analysing = t >= at(C.drop + 0.12)
  const spin = (t - at(C.analyse)) * 420
  const prog = progress(t, at(C.analyse), at(C.ergebnis - 0.15), theme.ease.inOut)
  const steps = C.schritte.map((s) => progress(t, at(s), at(s + 0.3)))
  const aura = progress(t, at(C.analyse), at(C.analyse + 0.4)) * (1 - progress(t, at(C.ergebnis - 0.3), at(C.ergebnis + 0.1)))

  // Ergebnis
  const res = springAt(t, at(C.ergebnis), fps, theme.spring.logo)
  const score = countUp(t, at(C.score), fps, DEMO_UPLOAD.score)
  const ring = springAt(t, at(C.score), fps, { damping: 26, stiffness: 70, mass: 1 })
  const skillP = DEMO_UPLOAD.skills.map((_, i) => springAt(t, at(C.skills + i * STAGGER * 1.2), fps, theme.spring.snappy))
  const stelleP = springAt(t, at(C.stelle), fps, theme.spring.snappy)
  const hero = progress(t, at(C.score + 0.8), at(C.score + 1.3)) * (1 - progress(t, at(C.toast), at(C.toast + 0.4)))
  const toast = enter(t, fps, at(C.toast), SCENE.scoring - 0.2, { rise: 30 })

  const W = PATH.window
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateX(${mix(out, 0, -380)}px)` }}>
      {/* Captions */}
      <div style={{ position: "absolute", left: 120, top: 70 }}>
        <KineticText text={DEMO_COPY.upload1} start={at(C.caption1)} end={at(C.ergebnis - 0.1)} size={64} />
        <KineticText text={DEMO_COPY.upload2} start={at(C.caption2)} end={SCENE.scoring} size={64} />
      </div>

      {/* App-Fenster in 3D */}
      <div style={{ position: "absolute", left: W.x - W.w / 2, top: W.y - W.h / 2 }}>
        <Tilt3D
          rotateX={mix(win, 26, 9) + drift.y + mix(back, 0, 4) + mix(out, 0, 6)}
          rotateY={mix(win, -38, -13) + drift.x + mix(back, 0, -10) + mix(out, 0, -40)}
          rotateZ={mix(win, 6, 1.5)}
          scale={W.scale * mix(win, 0.72, 1) * mix(back, 1, 0.92)}
          y={mix(win, 220, 0)}
          sheen={0.8}
        >
          <div style={{ opacity: Math.min(1, win * 1.4) }}>
            <AppShell active="Kandidaten" width={W.w} height={W.h}>
              <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Zurück
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kandidat hinzufügen</h1>
                    <p className="text-slate-500">CV hochladen und zum Job hinzufügen</p>
                  </div>
                </div>
                <UploadDropzone hover={hover} analysing={analysing} spin={spin} progress={prog} steps={steps} aura={aura} />
              </div>
              {/* abdunkeln, wenn die Ergebnis-Karte vorn steht */}
              <div style={{ position: "absolute", inset: 0, background: theme.color.stage, opacity: back * 0.35, pointerEvents: "none" }} />
            </AppShell>
          </div>
        </Tilt3D>
      </div>

      {/* Datei, die hineingezogen wird */}
      {grab > 0.001 && drop < 1 && (
        <div
          style={{
            position: "absolute",
            left: fx - 115,
            top: fy - 140,
            opacity: Math.min(1, grab) * (1 - drop),
            transform: `rotate(${mix(move, 8, -3)}deg) scale(${mix(grab, 0.8, 1) * mix(drop, 1, 0.45) * mix(hover, 1, 0.92)})`,
          }}
        >
          <PdfFile name={DEMO_UPLOAD.file} initials={DEMO_UPLOAD.initials} fullName={DEMO_UPLOAD.name} />
        </div>
      )}
      {grab > 0.001 && cursorOut < 1 && (
        <Cursor
          x={fx + 40 + mix(cursorOut, 0, 160)}
          y={fy + 40 + mix(cursorOut, 0, 120)}
          press={t >= at(C.datei + 0.2) && t < at(C.drop) ? 1 : 0}
          opacity={Math.min(1, grab) * (1 - cursorOut)}
        />
      )}

      {/* Ergebnis-Karte springt nach vorn */}
      {res > 0.001 && (
        <div style={{ position: "absolute", left: 1190 - 310, top: 560 - 200 }}>
          <Tilt3D
            rotateX={mix(res, 18, 4) + Math.cos(t * 0.6) * 1.2}
            rotateY={mix(res, 30, -7) + Math.sin(t * 0.5) * 1.5}
            scale={mix(Math.min(res, 1.2), 0.6, 1.08)}
            y={mix(res, 90, 0)}
            sheen={0.6}
            radius={16}
          >
            <div style={{ opacity: Math.min(1, res * 1.6) }}>
              <ParsedResultCard
                name={DEMO_UPLOAD.name}
                initials={DEMO_UPLOAD.initials}
                role={DEMO_UPLOAD.role}
                city={DEMO_UPLOAD.city}
                years={DEMO_UPLOAD.years}
                skills={DEMO_UPLOAD.skills}
                skillP={skillP}
                score={score}
                target={DEMO_UPLOAD.score}
                ring={Math.min(1, ring)}
                stelleP={Math.min(1, stelleP)}
                stelle={JOB.short}
                hero={hero}
              />
            </div>
          </Tilt3D>
        </div>
      )}

      {/* Toast wie sonner in der App */}
      <div
        className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-[0_20px_40px_-12px_rgba(0,0,0,.5)]"
        style={{ position: "absolute", right: 90, bottom: 70, opacity: toast.opacity, transform: `translateY(${toast.y}px) scale(${toast.scale})` }}
      >
        <CheckCircle2 className="h-5 w-5 text-[var(--rv-green-deep)]" />
        <div>
          <p className="font-semibold text-foreground">Kandidat gespeichert</p>
          <p className="text-xs text-muted-foreground">Zur Stelle {JOB.short} hinzugefügt</p>
        </div>
      </div>
    </AbsoluteFill>
  )
}
