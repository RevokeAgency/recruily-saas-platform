import Link from "next/link"
import { Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

interface DashboardGreetingProps {
  firstName?: string | null
}

// Light greeting that opens the dashboard — big friendly title on the neutral
// canvas + the two primary actions. Presentation only.
export function DashboardHero({ firstName }: DashboardGreetingProps) {
  const name = firstName?.trim()

  return (
    <section className="rv-fade-up flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]">
          Übersicht
        </span>
        <h1 className="mt-1.5 text-[2rem] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[2.4rem]">
          Willkommen zurück{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
          Deine Recruiting-Übersicht auf einen Blick — Jobs, Kandidaten und
          erklärbare Matches an einem Ort.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
    </section>
  )
}
