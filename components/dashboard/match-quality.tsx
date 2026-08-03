"use client"

import useSWR from "swr"
import { Target, TrendingUp, Info } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface QualityReport {
  decisions: number
  scored: number
  liftVsAvg: number | null
  liftVsLow: number | null
  inviteRateByBand: Record<"low" | "mid" | "high", { n: number; invited: number; rate: number | null }>
  interviewCorrelation: { n: number; r: number | null }
  weightsApplied: boolean
}

const pct = (r: number | null) => (r == null ? "–" : `${Math.round(r * 100)} %`)

/**
 * Match-Qualität: shows how well IMLRS scores predicted this tenant's OWN
 * decisions. Doubles as the visible proof that the feedback loop is working —
 * and as our own early warning for miscalibration.
 */
export function MatchQuality() {
  const { data } = useSWR<{ report: QualityReport | null }>("/api/matching/quality", fetcher)
  const r = data?.report
  if (!r || r.decisions < 5) return null // not enough signal to say anything honest

  const lift = r.liftVsLow ?? r.liftVsAvg
  const bands = r.inviteRateByBand

  return (
    <div className="rounded-[24px] border border-black/[0.04] bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(34,193,238,.12)]">
          <Target className="h-[17px] w-[17px] text-[var(--rv-cyan-deep)]" strokeWidth={2} />
        </span>
        <span className="text-[0.82rem] font-semibold text-foreground">Match-Qualität</span>
      </div>

      {lift != null && lift > 1 ? (
        <p className="mt-4 text-[2rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {lift.toFixed(1)}×
        </p>
      ) : (
        <p className="mt-4 text-[2rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {pct(bands.high.rate)}
        </p>
      )}
      <p className="mt-1.5 text-sm text-muted-foreground">
        {lift != null && lift > 1
          ? "häufiger eingeladen bei Score 80+ als bei unter 60"
          : "Einladungsquote bei Score 80+"}
      </p>

      <div className="mt-4 space-y-1.5 border-t border-[var(--app-line)] pt-3">
        {([
          ["80+", bands.high],
          ["60–79", bands.mid],
          ["< 60", bands.low],
        ] as const).map(([label, b]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-12 flex-none text-muted-foreground">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-[image:var(--rv-gradient)]"
                style={{ width: `${Math.round((b.rate ?? 0) * 100)}%` }}
              />
            </div>
            <span className="w-16 flex-none text-right tabular-nums text-muted-foreground">
              {pct(b.rate)} <span className="opacity-60">({b.n})</span>
            </span>
          </div>
        ))}
      </div>

      {r.interviewCorrelation.r != null && r.interviewCorrelation.n >= 5 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--rv-green-deep)]" />
          Übereinstimmung Score ↔ Interview-Ergebnis:{" "}
          <span className="font-medium text-foreground">
            {Math.round(r.interviewCorrelation.r * 100)} %
          </span>
        </p>
      )}

      {r.weightsApplied && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--rv-cyan-deep)]" />
          Gewichtung an deine Entscheidungen angepasst ({r.decisions} Entscheidungen ausgewertet).
        </p>
      )}
    </div>
  )
}
