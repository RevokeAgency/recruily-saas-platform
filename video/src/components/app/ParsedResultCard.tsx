import React from "react"
import { Briefcase, MapPin, Sparkles, Target } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { glow, theme } from "../../config/theme"
import { mix } from "../../lib/time"

/**
 * Ergebnis nach der Analyse: Profilkopf wie im Schritt „Profil prüfen" der
 * App (Verlaufskopf mit Avatar), darunter die extrahierten Skills als Badges
 * und der Match-Score als Ring, der hochzählt.
 *
 *   skillP   0..1 je Skill (Auftritt)
 *   score    aktuell angezeigter Wert
 *   ring     0..1 Füllung des Rings
 *   stelleP  0..1 Zeile „Passt zu …"
 *   hero     0..1 Glow des Scores (Hero-Element in diesem Moment)
 */
export const ParsedResultCard: React.FC<{
  name: string
  initials: string
  role: string
  city: string
  years: number
  skills: readonly string[]
  skillP: number[]
  score: number
  target: number
  ring: number
  stelleP: number
  stelle: string
  hero: number
}> = ({ name, initials, role, city, years, skills, skillP, score, target, ring, stelleP, stelle, hero }) => {
  const size = 132
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <Card className="w-[620px] rounded-2xl overflow-hidden py-0 gap-0" style={{ boxShadow: "0 50px 100px -30px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.14)" }}>
      <CardContent className="p-0">
        {/* Kopf wie in der App: Verlauf, Avatar, Name, Position */}
        <div className="px-7 py-6" style={{ backgroundImage: "var(--rv-gradient)" }}>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-teal-600">{initials}</span>
            </div>
            <div className="text-[#0C1A16]">
              <div className="text-2xl font-bold">{name}</div>
              <div className="mt-1 flex items-center gap-3 text-sm font-medium opacity-80">
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{role}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{city}</span>
                <span>{years} Jahre Erfahrung</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-7 p-7">
          {/* Core Skills */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h3 className="font-semibold text-slate-900">Extrahierte Core Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => {
                const p = skillP[i] ?? 0
                return (
                  <span key={s} style={{ opacity: Math.min(1, p), transform: `translateY(${mix(p, 12, 0)}px) scale(${mix(p, 0.7, 1)})`, display: "inline-block" }}>
                    <Badge className="text-sm px-3 py-1">{s}</Badge>
                  </span>
                )
              })}
            </div>
            <div
              className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--muted)] px-3 py-2.5 text-sm"
              style={{ opacity: stelleP, transform: `translateY(${mix(stelleP, 10, 0)}px)` }}
            >
              <Target className="h-4 w-4 text-[var(--rv-green-deep)]" />
              <span className="text-muted-foreground">Passt zu:</span>
              <span className="font-semibold text-foreground">{stelle}</span>
            </div>
          </div>

          {/* Match-Score */}
          <div className="relative flex-none" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <defs>
                <linearGradient id="demo-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme.color.cyan} />
                  <stop offset="100%" stopColor={theme.color.green} />
                </linearGradient>
              </defs>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="url(#demo-ring)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (target / 100) * ring * circ}
                opacity={ring > 0.001 ? 1 : 0}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-[2.4rem] font-bold leading-none tracking-tight tabular-nums text-[var(--rv-green-deep)]"
                style={{ textShadow: hero > 0.01 ? glow(theme.color.green, hero * 0.6) : undefined }}
              >
                {score}%
              </span>
              <span className="mt-1 text-xs text-muted-foreground">Match</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
