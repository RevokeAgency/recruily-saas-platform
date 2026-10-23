import React from "react"
import { CheckCircle2, Sparkles, Calendar } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { glow, theme } from "../../config/theme"
import { DEMO_UPLOAD, JOB } from "../../data/mock"
import { mix } from "../../lib/time"

/**
 * Detailansicht eines Kandidaten als Sheet von rechts, wie das Match-Modal
 * (components/jobs/detail/candidate-match-modal.tsx): Kopf, KI-Zusammenfassung,
 * „Warum dieser Kandidat passt", Einladen-Button. Klassen aus der App.
 *
 *   summaryP  0..1 Auftritt der Zusammenfassung
 *   marks     0..1 je hervorgehobener Stelle (Cyan-Marker zieht sich durch)
 *   active    Index der Stelle, die gerade leuchtet (-1 = keine)
 *   pitchP    0..1 je Grund
 *   invite    0..1 Hervorhebung des Buttons
 */
export const CandidateSheet: React.FC<{
  summaryP: number
  marks: number[]
  active: number
  pitchP: number[]
  invite: number
}> = ({ summaryP, marks, active, pitchP, invite }) => {
  const c = DEMO_UPLOAD
  // Zusammenfassung in normale Stellen und markierte Stellen zerlegen
  const parts: { text: string; mark: number }[] = []
  let rest: string = c.summary
  c.highlights.forEach((h, k) => {
    const idx = rest.indexOf(h)
    if (idx < 0) return
    parts.push({ text: rest.slice(0, idx), mark: -1 })
    parts.push({ text: h, mark: k })
    rest = rest.slice(idx + h.length)
  })
  parts.push({ text: rest, mark: -1 })

  return (
    <div className="flex h-full w-[600px] flex-col gap-5 rounded-[24px] bg-white p-7" style={{ boxShadow: "0 60px 120px -30px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.14)" }}>
      {/* Kopf */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-base font-semibold text-[#0C1A16]" style={{ backgroundImage: "var(--rv-gradient)" }}>
            {c.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground">{c.name}</h3>
          <p className="text-sm text-muted-foreground">
            {c.role} · {c.city} · {c.years} Jahre
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-[var(--rv-green-deep)] tabular-nums">{c.score}%</div>
          <p className="text-xs text-muted-foreground">Revetly Match</p>
        </div>
      </div>

      <div className="bg-[var(--muted)]/60 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Analysiert für</p>
        <p className="font-semibold text-foreground">{JOB.title}</p>
      </div>

      {/* KI-Zusammenfassung */}
      <div style={{ opacity: summaryP, transform: `translateY(${mix(summaryP, 24, 0)}px)` }}>
        <Card className="border-black/[0.06] py-0 gap-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h4 className="font-semibold text-sm text-foreground">KI-Zusammenfassung</h4>
            </div>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {parts.map((p, i) =>
                p.mark < 0 ? (
                  <span key={i}>{p.text}</span>
                ) : (
                  <span
                    key={i}
                    className="font-semibold text-foreground"
                    style={{
                      backgroundImage: "linear-gradient(90deg, rgba(34,193,238,.30), rgba(34,193,238,.22))",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "0 88%",
                      backgroundSize: `${(marks[p.mark] ?? 0) * 100}% 42%`,
                      boxDecorationBreak: "clone",
                      WebkitBoxDecorationBreak: "clone",
                      textShadow: active === p.mark ? glow(theme.color.cyan, 0.35) : undefined,
                    }}
                  >
                    {p.text}
                  </span>
                ),
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warum dieser Kandidat passt */}
      <Card className="border-teal-200 bg-teal-50/50 py-0 gap-0">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
            <h4 className="font-semibold text-sm text-teal-900">Warum dieser Kandidat passt</h4>
          </div>
          <ul className="space-y-2">
            {c.pitch.map((reason, idx) => {
              const p = pitchP[idx] ?? 0
              return (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-teal-800"
                  style={{ opacity: Math.min(1, p), transform: `translateX(${mix(p, -24, 0)}px)` }}
                >
                  <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
                  {reason}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-auto" style={{ transform: `scale(${1 + invite * 0.03})`, transformOrigin: "50% 50%" }}>
        <Button className="h-12 w-full rounded-xl text-base" style={{ boxShadow: invite > 0.01 ? glow(theme.color.green, invite * 0.7) : undefined }}>
          <Calendar className="h-4 w-4" />
          Zum Interview einladen
        </Button>
      </div>
    </div>
  )
}
