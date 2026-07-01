import { Progress } from "@/components/ui/progress"
import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"

export function QuotaProgress({
  used,
  total,
  className,
}: {
  used: number
  total: number
  className?: string
}) {
  const percentage = total > 0 ? (used / total) * 100 : 0
  const remaining = Math.max(total - used, 0)

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
            style={{ backgroundImage: "var(--rv-gradient)" }}
          >
            <Zap className="h-[18px] w-[18px] text-[#0C1A16]" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Matching-Kontingent</p>
            <p className="text-xs text-muted-foreground">Erneuert sich am 1. des Monats</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums text-foreground">{used}</span>
          <span className="text-sm text-muted-foreground tabular-nums">/{total}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={percentage} gradient />
        <p className="text-xs text-muted-foreground tabular-nums">
          Noch {remaining} von {total} Matches verfügbar
        </p>
      </div>
    </div>
  )
}
