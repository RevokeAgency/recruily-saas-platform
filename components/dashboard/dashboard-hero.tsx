import Link from "next/link"
import { Plus, Upload, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CountUp } from "@/components/app/count-up"

interface DashboardHeroProps {
  avgMatchScore: number
  matchesUsed: number
}

/**
 * Signature element of the dashboard overhaul: a dark, brand-gradient hero band
 * carrying the Revetly landing DNA (animated mesh-glow backdrop, gradient
 * flagship number) into the product surface. Greeting + primary actions live on
 * the left; the flagship Ø Match-Score sits on the right as a glass stat panel.
 * Presentation only — all numbers arrive as plain props from the RSC page.
 */
export function DashboardHero({ avgMatchScore, matchesUsed }: DashboardHeroProps) {
  const hasMatches = matchesUsed > 0

  return (
    <section className="rv-fade-up relative overflow-hidden rounded-[24px] bg-[var(--rv-ink)] p-8 lg:p-10">
      <div className="rv-patternbg" data-pattern="mesh" style={{ animationDuration: "44s" }} aria-hidden="true" />

      <div className="relative z-[1] grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: greeting + actions */}
        <div>
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/45">
            Übersicht
          </span>
          <h1 className="mt-2 text-[1.9rem] font-bold leading-[1.1] tracking-tight text-white lg:text-[2.15rem]">
            Willkommen zurück
          </h1>
          <p className="mt-2.5 max-w-md text-[0.95rem] leading-relaxed text-white/60">
            Deine Recruiting-Übersicht auf einen Blick — Jobs, Kandidaten und
            erklärbare Matches an einem Ort.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/jobs/new">
                <Plus className="mr-2 h-4 w-4" />
                Neuen Job erstellen
              </Link>
            </Button>
            <Link
              href="/candidates"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-white/15 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-sm transition-[background-color,border-color] duration-150 ease-out hover:bg-white/[0.16] active:scale-[0.98]"
            >
              <Upload className="mr-2 h-4 w-4" />
              Kandidaten hochladen
            </Link>
          </div>
        </div>

        {/* Right: flagship Ø Match-Score */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-white/55">
            <TrendingUp className="h-4 w-4 text-[var(--rv-green)]" strokeWidth={2} />
            <span className="text-[0.78rem] font-semibold uppercase tracking-[0.08em]">
              Ø Match-Score
            </span>
          </div>

          {hasMatches ? (
            <>
              <CountUp
                value={avgMatchScore}
                suffix="%"
                className="mt-3 block bg-[image:var(--rv-gradient)] bg-clip-text text-5xl font-bold tracking-tight tabular-nums text-transparent"
              />
              <p className="mt-2 text-[0.82rem] leading-relaxed text-white/45">
                im Schnitt über alle bewerteten Matches
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 text-5xl font-bold tracking-tight text-white/30">—</div>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-white/45">
                Noch keine Matches — leg deinen ersten Job an und starte.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
