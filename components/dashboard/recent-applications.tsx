import Link from "next/link"
import { FileUp, Inbox as InboxIcon, UserPlus, Mails } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface RecentApplication {
  id: string
  candidateName: string
  photoUrl: string | null
  jobId: string | null
  jobTitle: string
  source: string
  matchScore: number | null
  timeAgo: string
}

// Source → chip meta (same vocabulary as the activity bell).
const sourceMeta: Record<string, { label: string; icon: typeof FileUp; className: string }> = {
  public_page: { label: "Public Page", icon: FileUp, className: "bg-[rgba(34,193,238,.12)] text-[var(--rv-cyan-deep)]" },
  email: { label: "E-Mail", icon: InboxIcon, className: "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]" },
  manual: { label: "Manuell", icon: UserPlus, className: "bg-[var(--muted)] text-muted-foreground" },
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-[var(--rv-green-deep)]"
  if (score >= 60) return "text-amber-600"
  return "text-destructive"
}

/**
 * The newest applications across all jobs — the same events the activity bell
 * shows, promoted onto the dashboard: who applied, for which job, via which
 * channel, with the match score once it exists. Rows link to the job.
 */
export function RecentApplications({ items }: { items: RecentApplication[] }) {
  return (
    <div className="flex h-full flex-col rounded-[24px] border border-black/[0.04] bg-card p-6 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center gap-2">
        <Mails className="h-4 w-4 text-[var(--rv-cyan-deep)]" strokeWidth={2} />
        <span className="text-[0.82rem] font-semibold text-foreground">Letzte Bewerbungen</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Mails className="h-9 w-9 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-foreground">Noch keine Bewerbungen</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Teile deinen Bewerbungslink, um loszulegen.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-1">
          {items.map((item) => {
            const meta = sourceMeta[item.source] ?? sourceMeta.manual
            return (
              <li key={item.id}>
                <Link
                  href={item.jobId ? `/jobs/${item.jobId}` : "/candidates"}
                  className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-[var(--muted)]/60"
                >
                  <Avatar className="h-9 w-9 flex-none">
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
                    <p className="truncate text-xs text-muted-foreground">
                      {item.jobTitle} · {item.timeAgo}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    {item.matchScore !== null && (
                      <span className={cn("text-sm font-bold tabular-nums", scoreColor(item.matchScore))}>
                        {item.matchScore}%
                      </span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-semibold", meta.className)}>
                      {meta.label}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
