import React from "react"
import { FileUp, Loader2, Sparkles, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { theme } from "../../config/theme"
import { mix } from "../../lib/time"

/**
 * Upload-Bereich aus app/(app)/candidates/new/page.tsx (UploadSection),
 * Klassen 1:1 übernommen, mit den echten Card- und Badge-Komponenten.
 * Statt Hover/CSS-Animation steuern Props den Zustand Bild für Bild:
 *
 *   hover     Datei schwebt über der Zone (Rand wird grün)
 *   analysing Analyse läuft (Spinner dreht über `spin`, Aura, Fortschritt)
 *   progress  0..1 Fortschrittsbalken
 *   steps     erledigte Analyse-Schritte 0..1 je Schritt
 *   aura      0..1 Stärke der leuchtenden Aura (das Hero-Element der Szene)
 */
export const ANALYSE_STEPS = ["Kontaktdaten", "Berufserfahrung", "Skills", "Abgleich mit der Stelle"]

export const UploadDropzone: React.FC<{
  hover: number
  analysing: boolean
  spin: number
  progress: number
  steps: number[]
  aura: number
}> = ({ hover, analysing, spin, progress, steps, aura }) => (
  <div className="space-y-6">
    <div style={{ position: "relative" }}>
      {/* Aura: drehender Verlaufsring um die Zone */}
      {aura > 0.001 && (
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: 30,
            padding: 5,
            background: `conic-gradient(from ${spin * 1.4}deg, rgba(34,193,238,0) 0deg, ${theme.color.cyan} 70deg, ${theme.color.green} 140deg, rgba(22,199,124,0) 220deg, rgba(34,193,238,0) 360deg)`,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            opacity: aura,
            filter: `drop-shadow(0 0 ${26 * aura}px rgba(34,193,238,.8)) drop-shadow(0 0 ${60 * aura}px rgba(34,193,238,.35))`,
          }}
        />
      )}
      <Card
        className={`border-2 border-dashed rounded-2xl overflow-hidden py-0 ${hover > 0.5 || analysing ? "border-teal-400" : "border-slate-200"}`}
        style={{ background: hover > 0.01 && !analysing ? `rgba(234,251,243,${0.9 * hover})` : undefined }}
      >
        <CardContent className="p-0">
          {analysing ? (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-teal-600" style={{ transform: `rotate(${spin}deg)` }} />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-teal-500" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-6">KI analysiert CV...</p>
              <p className="text-sm text-slate-500 mt-2">Extrahiere Fähigkeiten, Erfahrung und Profil</p>

              {/* Fortschritt */}
              <div className="mt-6 w-[420px]">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundImage: "var(--rv-gradient)" }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                  {ANALYSE_STEPS.map((s, i) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 text-sm"
                      style={{ opacity: mix(steps[i] ?? 0, 0.35, 1), transform: `translateY(${mix(steps[i] ?? 0, 4, 0)}px)` }}
                    >
                      {(steps[i] ?? 0) > 0.5 ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border-2 border-slate-200" />
                      )}
                      <span className="text-slate-700 font-medium">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mb-6" style={{ transform: `scale(${1 + hover * 0.1})` }}>
                <FileUp className="h-10 w-10 text-teal-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">CV hochladen</p>
              <p className="text-sm text-slate-500 mt-2">PDF oder DOCX Datei hierher ziehen oder klicken</p>
              <div className="flex items-center gap-2 mt-4">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">.pdf</Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">.docx</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Info-Box wie in der App */}
    <Card className="bg-teal-50 border-teal-200 rounded-2xl py-0">
      <CardContent className="p-5 flex items-start gap-4">
        <Sparkles className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-teal-900">Automatische CV-Analyse</p>
          <p className="text-sm text-teal-700 mt-1">
            Unsere KI extrahiert automatisch alle relevanten Informationen aus dem CV: Kontaktdaten, Skills,
            Berufserfahrung und erstellt ein professionelles Profil.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
)
