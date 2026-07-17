"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { CountUp } from "@/components/app/count-up"

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
  /** Tint of the icon chip: green (default) or cyan. */
  tone?: "green" | "cyan"
  className?: string
}

/**
 * Big-number KPI tile: a small icon chip + label on top, an oversized friendly
 * number below, and a quiet delta/context line. White surface, generous
 * rounding, soft shadow — the modern-dashboard look. Keeps the count-up and
 * cursor spotlight from the previous tile.
 */
export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  context,
  positive,
  tone = "green",
  className,
}: StatCardProps) {
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty("--sx", `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty("--sy", `${e.clientY - rect.top}px`)
  }

  const chip =
    tone === "cyan"
      ? "bg-[rgba(34,193,238,.12)] text-[var(--rv-cyan-deep)]"
      : "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]"

  return (
    <div
      onMouseMove={handleMove}
      className={cn(
        "rv-spotlight group relative overflow-hidden rounded-[20px] border border-[var(--app-line)] bg-card p-5 shadow-[var(--app-shadow-card)] transition-shadow duration-150 ease-out hover:shadow-[0_2px_4px_rgba(12,26,22,.05),0_18px_40px_-18px_rgba(12,26,22,.16)]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-full", chip)}>
          <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
        </span>
        <span className="text-[0.78rem] font-medium text-muted-foreground">{label}</span>
      </div>

      <CountUp
        value={value}
        suffix={suffix}
        className="mt-4 block text-[2.6rem] font-bold leading-none tracking-tight tabular-nums text-foreground"
      />

      {context && (
        <div
          className={cn(
            "mt-2.5 flex items-center gap-1 text-xs",
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
