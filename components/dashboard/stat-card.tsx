"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { CountUp } from "@/components/dashboard/count-up"

export interface StatCardProps {
  label: string
  /** Numeric value; animates via count-up on scroll-in. */
  value: number
  /** Appended after the number, e.g. "%". */
  suffix?: string
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
 * KPI tile: label -> big tabular count-up number -> small delta/context line,
 * dezentes Line-Icon (not a filled green circle). Carries the landing's
 * cursor-tracking spotlight glow (.rv-spotlight) and a quiet shadow-lift on
 * hover. The mesh/reveal wrapper on the page staggers these in.
 */
export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  context,
  positive,
  accent,
  className,
}: StatCardProps) {
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty("--sx", `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty("--sy", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      onMouseMove={handleMove}
      className={cn(
        "rv-spotlight relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-shadow duration-150 ease-out hover:shadow-[0_1px_2px_rgba(12,26,22,.04),0_14px_32px_-14px_rgba(12,26,22,.14)]",
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
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-[18px] w-[18px] flex-none text-muted-foreground" strokeWidth={1.75} />
      </div>
      <CountUp
        value={value}
        suffix={suffix}
        className="mt-3 block text-3xl font-bold tracking-tight tabular-nums text-foreground"
      />
      {context && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            positive ? "text-[var(--rv-green-deep)]" : "text-muted-foreground",
          )}
        >
          {positive && <ArrowUp className="h-3 w-3" strokeWidth={2.5} />}
          <span className="tabular-nums">{context}</span>
        </div>
      )}
    </div>
  )
}
