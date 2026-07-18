import Link from "next/link"
import { Trophy } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface TopCandidate {
  id: string
  candidateName: string
  photoUrl: string | null
  jobId: string | null
  jobTitle: string
  matchScore: number
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

/**
 * The three strongest matches across all jobs — the people worth calling
 * first. Rank number, avatar, name/job, big score. Rows link to the job.
 */
export function TopCandidates({ items }: { items: TopCandidate[] }) {
  return (
    <div className="flex h-full flex-col rounded-[24px] border border-black/[0.04] bg-card p-6 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[var(--rv-green-deep)]" strokeWidth={2} />
        <span className="text-[0.82rem] font-semibold text-foreground">Top-Kandidaten</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Trophy className="h-9 w-9 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-foreground">Noch keine Bewertungen</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sobald Matches bewertet sind, stehen deine besten Kandidaten hier.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col justify-center gap-1">
          {items.map((item, i) => (
            <li key={item.id}>
              <Link
                href={item.jobId ? `/jobs/${item.jobId}` : "/candidates"}
                className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-[var(--muted)]/60"
              >
                <span className="w-5 flex-none text-center text-sm font-bold tabular-nums text-muted-foreground/60">
                  {i + 1}
                </span>
                <Avatar className="h-10 w-10 flex-none">
                  {item.photoUrl && (
                    <AvatarImage src={item.photoUrl} alt={item.candidateName} className="object-cover" />
                  )}
                  <AvatarFallback
                    className="text-[#0C1A16] text-xs font-semibold"
                    style={{ backgroundImage: "var(--rv-gradient)" }}
                  >
                    {initials(item.candidateName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.candidateName}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.jobTitle}</p>
                </div>
                <span className="flex-none text-xl font-bold tabular-nums text-[var(--rv-green-deep)]">
                  {item.matchScore}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
