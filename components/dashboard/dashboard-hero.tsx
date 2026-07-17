import Link from "next/link"
import { Briefcase, CheckCircle2, Plus, Upload, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CountUp } from "@/components/app/count-up"

export interface PipelineBreakdown {
  /** Bewertete Matches (scored/shortlisted). */
  scored: number
  /** Zum Interview eingeladen. */
  invited: number
  /** Neu / in Analyse / in Warteschlange. */
  waiting: number
  /** Abgesagt. */
  rejected: number
}

interface DashboardHeroProps {
  firstName?: string | null
  activeJobs: number
  totalCandidates: number
  scoredCount: number
  pipeline: PipelineBreakdown
}

// Segment styles for the pipeline meter — black pill, green pill, hatched
// track, outlined pill (the reference's segmented meter, in Revetly colours).
const segmentStyles = {
  scored: "bg-[var(--rv-ink)] text-white",
  invited: "bg-[var(--rv-green)] text-[#0C1A16]",
  waiting:
    "text-[var(--rv-ink-soft)] [background:repeating-linear-gradient(135deg,rgba(12,26,22,.12)_0_2px,rgba(12,26,22,.02)_2px_7px)]",
  rejected: "border border-[rgba(12,26,22,.16)] bg-white text-muted-foreground",
} as const

const segmentLabels = {
  scored: "Bewertet",
  invited: "Eingeladen",
  waiting: "Wartend",
  rejected: "Abgesagt",
} as const

/**
 * Dashboard hero in the reference layout: greeting left with the candidate
 * pipeline as a segmented pill meter beneath it; bare oversized numbers with
 * tiny icon+label on the right (no boxes) plus the two primary actions.
 * Presentation only — all numbers arrive as props from the RSC page.
 */
export function DashboardHero({
  firstName,
  activeJobs,
  totalCandidates,
  scoredCount,
  pipeline,
}: DashboardHeroProps) {
  const name = firstName?.trim()

  const bigStats = [
    { label: "Aktive Jobs", value: activeJobs, icon: Briefcase },
    { label: "Kandidaten", value: totalCandidates, icon: Users },
    { label: "Bewertet", value: scoredCount, icon: CheckCircle2 },
  ]

  const total =
    pipeline.scored + pipeline.invited + pipeline.waiting + pipeline.rejected
  const segments = (
    Object.keys(segmentLabels) as Array<keyof typeof segmentLabels>
  )
    .map((key) => ({ key, count: pipeline[key] }))
    .filter((s) => s.count > 0)

  return (
    <section className="rv-fade-up">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[2.5rem]">
            Willkommen zurück{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            Jobs, Kandidaten und erklärbare Matches an einem Ort.
          </p>
        </div>

        {/* Bare big numbers — no boxes, like the reference. */}
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4 lg:justify-end">
          {bigStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon
                className="mt-2 h-4 w-4 flex-none text-muted-foreground"
                strokeWidth={1.75}
              />
              <div>
                <CountUp
                  value={value}
                  className="block text-[2.6rem] font-bold leading-none tracking-tight tabular-nums text-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        {/* Candidate pipeline as a segmented pill meter. */}
        {total > 0 ? (
          <div className="flex min-w-0 flex-1 items-end gap-2 lg:max-w-2xl">
            {segments.map(({ key, count }) => {
              const pct = Math.round((count / total) * 100)
              return (
                <div
                  key={key}
                  className="min-w-[86px]"
                  style={{ flexGrow: count }}
                >
                  <p className="mb-1.5 truncate text-[0.72rem] font-medium text-muted-foreground">
                    {segmentLabels[key]}
                  </p>
                  <div
                    className={`flex h-9 items-center rounded-full px-3.5 text-[0.8rem] font-semibold tabular-nums ${segmentStyles[key]}`}
                    title={`${count} ${segmentLabels[key]}`}
                  >
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Kandidaten in der Pipeline — leg los.
          </p>
        )}

        <div className="flex flex-none flex-wrap items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-full border-[var(--app-line)] bg-white px-4"
          >
            <Link href="/candidates">
              <Upload className="mr-2 h-4 w-4" />
              Kandidaten hochladen
            </Link>
          </Button>
          <Button asChild className="h-10 rounded-full px-4">
            <Link href="/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              Neuen Job erstellen
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
