import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { Briefcase, Clock } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export interface RecentJob {
  id: string
  title: string
  company: string
  status: "active" | "draft" | "archived"
  candidates: number
  topScore: number
  createdAt: string
}

// Dezente Badges statt Vollgrün: "active" nutzt das green-wash-Default aus
// components/ui/badge.tsx, "draft"/"archived" die neutral-Variante.
const statusConfig = {
  active: { label: "Aktiv", variant: "default" as const },
  draft: { label: "Entwurf", variant: "neutral" as const },
  archived: { label: "Archiviert", variant: "outline" as const },
}

export function RecentActivity({ jobs, className }: { jobs: RecentJob[]; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6 shadow-card", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Letzte Aktivitäten</h2>
      </div>
      <div>
        <div className="space-y-1">
          {jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Noch keine Jobs"
              description="Lege deinen ersten Job an, um Kandidaten zu sammeln und zu matchen."
              actionLabel="Ersten Job anlegen"
              actionHref="/jobs/new"
            />
          ) : (
            jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group -mx-2 flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-[var(--app-green-wash)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {job.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {job.company} · {job.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant={statusConfig[job.status].variant}>
                    {statusConfig[job.status].label}
                  </Badge>
                  {job.status === "active" && (
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-foreground">{job.candidates} Kandidaten</p>
                      <p className="text-xs text-muted-foreground">Top: {job.topScore}%</p>
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
