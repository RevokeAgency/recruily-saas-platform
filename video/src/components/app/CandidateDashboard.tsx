import React from "react"
import { ChevronRight, TrendingUp, Trophy, Users } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { glow, theme } from "../../config/theme"
import { DEMO_LIST, DEMO_STATS, JOB } from "../../data/mock"
import { mix } from "../../lib/time"

const STAT_ICONS = [Users, TrendingUp, Trophy]

/** Score-Farbe wie getScoreColor in candidates-tab.tsx */
function scoreClass(score: number) {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

/**
 * Stellenseite mit Kennzahlen und Kandidatenliste.
 *   - Kennzahlen: Klassen aus components/dashboard/stat-card.tsx (die App
 *     zählt per IntersectionObserver hoch, hier zählt `stats` frame-genau)
 *   - Liste: Listenansicht aus components/jobs/detail/candidates-tab.tsx
 *
 *   rowP       0..1 je Zeile (Auftritt)
 *   stats      angezeigte Werte der Kennzahlen
 *   statP      0..1 je Kennzahl
 *   highlight  0..1 Hervorhebung der ersten Zeile (Hero-Glow)
 */
export const CandidateDashboard: React.FC<{
  rowP: number[]
  stats: number[]
  statP: number[]
  highlight: number
}> = ({ rowP, stats, statP, highlight }) => (
  <div className="px-8 pt-6">
    <div className="flex items-end justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Stellenangebote</p>
        <h1 className="mt-1 text-[1.9rem] font-bold tracking-tight text-foreground">{JOB.title}</h1>
      </div>
      <span className="inline-flex items-center rounded-full border border-[rgba(22,199,124,.4)] bg-[var(--app-green-wash)] px-3 py-1 text-xs font-semibold text-[var(--rv-green-deep)]">
        Aktiv
      </span>
    </div>

    {/* Kennzahlen */}
    <div className="mt-5 grid grid-cols-3 gap-4">
      {DEMO_STATS.map((s, i) => {
        const Icon = STAT_ICONS[i]
        const p = statP[i] ?? 0
        const chip = i === 1 ? "bg-[rgba(34,193,238,.12)] text-[var(--rv-cyan-deep)]" : "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]"
        return (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-[20px] border border-[var(--app-line)] bg-card p-5 shadow-[var(--app-shadow-card)]"
            style={{ opacity: Math.min(1, p), transform: `translateY(${mix(p, 24, 0)}px) scale(${mix(p, 0.96, 1)})` }}
          >
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${chip}`}>
                <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
              </span>
              <span className="text-[0.78rem] font-medium text-muted-foreground">{s.label}</span>
            </div>
            <span className="mt-4 block text-[2.6rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
              {stats[i] ?? 0}
              {s.suffix}
            </span>
          </div>
        )
      })}
    </div>

    {/* Kandidatenliste */}
    <Card className="mt-5 overflow-hidden rounded-xl border border-border py-0 gap-0">
      <ul className="divide-y divide-border">
        {DEMO_LIST.map((c, k) => {
          const p = rowP[k] ?? 0
          const hl = k === 0 ? highlight : 0
          return (
            <li
              key={c.name}
              style={{
                opacity: Math.min(1, p),
                transform: `translateX(${mix(p, -40, 0)}px)`,
                position: "relative",
                zIndex: k === 0 ? 2 : 1,
              }}
            >
              <div
                className="flex w-full items-center gap-4 px-5 py-3 text-left"
                style={{
                  background: hl > 0.01 ? `rgba(241,246,244,${hl})` : undefined,
                  boxShadow: hl > 0.01 ? `inset 3px 0 0 ${theme.color.green}, ${glow(theme.color.cyan, hl * 0.5)}` : undefined,
                }}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="text-sm font-semibold text-[#0C1A16]" style={{ backgroundImage: "var(--rv-gradient)" }}>
                    {c.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 grid grid-cols-[1.4fr_1fr_0.8fr] items-center gap-4">
                  <p className="flex items-center gap-2 truncate font-semibold text-foreground">
                    <span
                      className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        k === 0 ? "bg-[image:var(--rv-gradient)] text-[#0C1A16]" : "bg-[var(--muted)] text-muted-foreground"
                      }`}
                    >
                      {k + 1}
                    </span>
                    <span className="truncate">{c.name}</span>
                    {k === 0 && (
                      <span className="inline-flex items-center rounded-full bg-[rgba(34,193,238,.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--rv-cyan-deep)]">
                        Neu
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{c.city}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.years} Jahre</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-[rgba(22,199,124,.4)] bg-[var(--app-green-wash)] px-2 py-0.5 text-[11px] font-semibold text-[var(--rv-green-deep)]">
                  {c.status}
                </span>
                <div className="flex w-24 flex-shrink-0 items-center justify-end gap-2">
                  <span className={`text-lg font-bold tabular-nums ${scoreClass(c.score)}`}>{c.score}%</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  </div>
)
