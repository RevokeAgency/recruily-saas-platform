import { TrendingUp } from "lucide-react"

/**
 * Ø Match-Score as a friendly radial gauge — the dashboard's flagship metric.
 * A gradient ring (Revetly cyan → green) fills to the average score with the
 * number reading large in the middle. Presentation only.
 */
export function ScoreGauge({ score, scoredCount }: { score: number; scoredCount: number }) {
  const has = scoredCount > 0
  const size = 168
  const stroke = 14
  const r = (size - stroke) / 2
  const circ = r * 2 * Math.PI
  const pct = Math.max(0, Math.min(100, score))
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-black/[0.04] bg-card p-6 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <TrendingUp className="h-4 w-4 text-[var(--rv-green-deep)]" strokeWidth={2} />
        <span className="text-[0.82rem] font-semibold text-foreground">Ø Match-Score</span>
      </div>

      <div className="flex flex-1 items-center justify-center py-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <defs>
              <linearGradient id="rv-gauge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--rv-cyan)" />
                <stop offset="100%" stopColor="var(--rv-green)" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={stroke}
            />
            {has && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="url(#rv-gauge)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className="[transition:stroke-dashoffset_1s_ease-out]"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[2.6rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
              {has ? `${score}%` : "—"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {has ? "im Schnitt" : "keine Matches"}
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {has
          ? `über ${scoredCount} bewertete ${scoredCount === 1 ? "Match" : "Matches"}`
          : "Leg deinen ersten Job an und starte die Bewertung."}
      </p>
    </div>
  )
}
