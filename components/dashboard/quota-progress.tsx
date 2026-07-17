import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Matching quota as a segmented meter — echoes the modern-dashboard segmented
 * progress. Ten segments fill left-to-right with the brand gradient; the big
 * used/limit number sits top-right. Presentation only.
 */
export function QuotaProgress({
  used,
  total,
  className,
}: {
  used: number
  total: number
  className?: string
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const remaining = Math.max(total - used, 0)
  const segments = 10
  const filled = Math.round((pct / 100) * segments)
  const low = total > 0 && remaining / total <= 0.2
  const exhausted = total > 0 && remaining <= 0

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[22px] border border-[var(--app-line)] bg-card p-6 shadow-[var(--app-shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
            style={{ backgroundImage: "var(--rv-gradient)" }}
          >
            <Zap className="h-[17px] w-[17px] text-[#0C1A16]" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[0.82rem] font-semibold text-foreground">Matching-Kontingent</p>
            <p className="text-xs text-muted-foreground">Erneuert am 1. des Monats</p>
          </div>
        </div>
        <div className="text-right leading-none">
          <span className="text-[1.4rem] font-bold tabular-nums text-foreground">{used}</span>
          <span className="text-sm text-muted-foreground tabular-nums">/{total}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-4">
        <span className="text-[2.6rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
          {remaining}
        </span>
        <span className="mt-1 text-xs text-muted-foreground tabular-nums">
          {exhausted ? "keine Matches übrig" : `von ${total} Matches übrig`}
        </span>
      </div>

      <div>
        <div className="flex gap-1.5" role="img" aria-label={`${used} von ${total} Matches verbraucht`}>
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 flex-1 rounded-full transition-colors duration-300",
                i < filled
                  ? exhausted
                    ? "bg-red-500"
                    : low
                      ? "bg-amber-500"
                      : "bg-[image:var(--rv-gradient)]"
                  : "bg-[var(--muted)]",
              )}
            />
          ))}
        </div>
        {(low || exhausted) && (
          <p className={cn("mt-3 text-xs", exhausted ? "text-red-600" : "text-amber-600")}>
            {exhausted
              ? "Kontingent aufgebraucht — Upgrade für weitere Matches."
              : "Kontingent läuft zur Neige."}
          </p>
        )}
      </div>
    </div>
  )
}
