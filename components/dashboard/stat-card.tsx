import type { LucideIcon } from "lucide-react"
import { ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** Small line under the value, e.g. "+3 diese Woche" or "von 50 verfügbar". */
  context?: string
  /** Renders a small green up-arrow in front of the context line when true. */
  positive?: boolean
  /** Optional 2px brand-gradient accent along the top edge. */
  accent?: boolean
  className?: string
}

/**
 * KPI tile per DASHBOARD_AUTH_REDESIGN.md §4: label -> big tabular number ->
 * small delta/context line, dezentes Line-Icon (not a filled green circle),
 * quiet shadow-lift on hover instead of translate/rotate.
 */
export function StatCard({ label, value, icon: Icon, context, positive, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-shadow duration-150 ease-out hover:shadow-[0_1px_2px_rgba(12,26,22,.04),0_14px_32px_-14px_rgba(12,26,22,.14)]",
        className,
      )}
    >
      {accent && (
        <span
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ backgroundImage: "var(--rv-gradient)" }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </span>
        <Icon className="h-[18px] w-[18px] flex-none text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
      {context && (
        <div className={cn("mt-2 flex items-center gap-1 text-xs", positive ? "text-[var(--rv-green-deep)]" : "text-muted-foreground")}>
          {positive && <ArrowUp className="h-3 w-3" strokeWidth={2.5} />}
          <span className="tabular-nums">{context}</span>
        </div>
      )}
    </div>
  )
}
