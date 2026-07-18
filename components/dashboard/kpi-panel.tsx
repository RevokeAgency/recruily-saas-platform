import { ArrowDownRight, ArrowUpRight, Gauge, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

export interface KpiData {
  /** Applications received in the last 7 days. */
  weekCount: number
  /** Applications in the 7 days before that (for the trend arrow). */
  prevWeekCount: number
  /** Invited / decided (scored + invited + rejected), 0–100; null when no data. */
  inviteRate: number | null
  /** Applications per active job; null when no active jobs. */
  perJob: number | null
  /** Ø days from application to interview invitation; null until measured. */
  timeToInterviewDays: number | null
  /** Source mix (absolute counts). */
  sources: { public_page: number; email: number; manual: number }
}

const sourceBar = [
  { key: "public_page" as const, label: "Public Page", className: "bg-[var(--rv-cyan)]" },
  { key: "email" as const, label: "E-Mail", className: "bg-[var(--rv-green)]" },
  { key: "manual" as const, label: "Manuell", className: "bg-[rgba(12,26,22,.25)]" },
]

/**
 * Recruiting-Kennzahlen: the numbers a recruiter steers by — weekly intake
 * with trend, invite conversion, load per job, time-to-interview, and where
 * applications come from (stacked source bar). All derived read-only.
 */
export function KpiPanel({ data }: { data: KpiData }) {
  const delta = data.weekCount - data.prevWeekCount
  const TrendIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus
  const trendClass = delta > 0 ? "text-[var(--rv-green-deep)]" : delta < 0 ? "text-destructive" : "text-muted-foreground"

  const rows = [
    {
      label: "Bewerbungen diese Woche",
      value: String(data.weekCount),
      sub: (
        <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendClass)}>
          <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {delta === 0 ? "wie Vorwoche" : `${delta > 0 ? "+" : ""}${delta} zur Vorwoche`}
        </span>
      ),
    },
    {
      label: "Einladungsquote",
      value: data.inviteRate !== null ? `${data.inviteRate}%` : "—",
      sub: <span className="text-xs text-muted-foreground">Eingeladen je entschiedener Bewerbung</span>,
    },
    {
      label: "Ø Bewerbungen pro Job",
      value: data.perJob !== null ? String(data.perJob) : "—",
      sub: <span className="text-xs text-muted-foreground">über alle aktiven Jobs</span>,
    },
    {
      label: "Ø Zeit bis Einladung",
      value:
        data.timeToInterviewDays !== null
          ? `${data.timeToInterviewDays} ${data.timeToInterviewDays === 1 ? "Tag" : "Tage"}`
          : "—",
      sub: (
        <span className="text-xs text-muted-foreground">
          {data.timeToInterviewDays !== null
            ? "von Bewerbung bis Interview-Einladung"
            : "wird ab der nächsten Einladung gemessen"}
        </span>
      ),
    },
  ]

  const totalSources = data.sources.public_page + data.sources.email + data.sources.manual

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-black/[0.04] bg-card p-6 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-[var(--rv-green-deep)]" strokeWidth={2} />
        <span className="text-[0.82rem] font-semibold text-foreground">Recruiting-Kennzahlen</span>
      </div>

      <ul className="mt-4 flex flex-1 flex-col justify-center divide-y divide-black/[0.04]">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{row.label}</p>
              {row.sub}
            </div>
            <span className="flex-none text-xl font-bold tabular-nums text-foreground">{row.value}</span>
          </li>
        ))}
      </ul>

      {totalSources > 0 && (
        <div className="mt-4">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Bewerbungsquellen">
            {sourceBar.map(({ key, className }) =>
              data.sources[key] > 0 ? (
                <span
                  key={key}
                  className={cn("rounded-full", className)}
                  style={{ flexGrow: data.sources[key], flexBasis: 0 }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {sourceBar.map(({ key, label, className }) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", className)} />
                {label}
                <span className="font-semibold tabular-nums text-foreground">{data.sources[key]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
